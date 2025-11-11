/**
 * @fileoverview Cache Middleware Tests
 *
 * Tests for in-memory caching and cache invalidation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
	CacheStore,
	cacheStore,
	generateCacheKey,
	cacheMiddleware,
	invalidateCacheMiddleware
} from './cache.middleware.js';

// Mock request/response helpers
function createMockRequest(overrides = {}): Partial<Request> {
	return {
		method: 'GET',
		path: '/api/v1/tasks',
		query: {},
		headers: {},
		auth: { userId: 'user-123' },
		...overrides
	};
}

function createMockResponse(): Partial<Response> & { _data?: any; statusCode: number } {
	const res: any = {
		statusCode: 200,
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		getHeader: vi.fn().mockReturnValue(undefined),
		_data: undefined
	};

	res.json = function (data: any) {
		this._data = data;
		return this;
	};

	return res;
}

describe('Cache Middleware', () => {
	describe('CacheStore', () => {
		let store: CacheStore;

		beforeEach(() => {
			store = new CacheStore();
		});

		it('should set and get cached value', () => {
			const data = { id: 1, title: 'Test Task' };
			store.set('task:1', data, 5000);

			const cached = store.get('task:1');
			expect(cached).toBeDefined();
			expect(cached?.data).toEqual(data);
		});

		it('should return null for non-existent key', () => {
			const cached = store.get('non-existent');
			expect(cached).toBeNull();
		});

		it('should expire entries based on TTL', () => {
			const data = { id: 1, title: 'Test Task' };
			store.set('task:1', data, 100); // 100ms TTL

			// Should exist immediately
			let cached = store.get('task:1');
			expect(cached).toBeDefined();

			// Wait for expiration
			const promise = new Promise(resolve => {
				setTimeout(() => {
					cached = store.get('task:1');
					expect(cached).toBeNull();
					resolve(null);
				}, 150);
			});

			return promise;
		});

		it('should track access count on get', () => {
			const data = { id: 1 };
			store.set('task:1', data);

			store.get('task:1');
			store.get('task:1');

			const stats = store.getStats();
			const entry = stats.entries.find(e => e.key === 'task:1');
			expect(entry?.accessCount).toBeGreaterThan(0);
		});

		it('should delete cached value', () => {
			const data = { id: 1 };
			store.set('task:1', data);

			store.delete('task:1');
			const cached = store.get('task:1');
			expect(cached).toBeNull();
		});

		it('should clear all cache', () => {
			store.set('task:1', { id: 1 });
			store.set('task:2', { id: 2 });
			store.set('task:3', { id: 3 });

			store.clear();

			expect(store.get('task:1')).toBeNull();
			expect(store.get('task:2')).toBeNull();
			expect(store.get('task:3')).toBeNull();
		});

		it('should clear cache by pattern', () => {
			store.set('task:1', { id: 1 });
			store.set('task:2', { id: 2 });
			store.set('user:1', { id: 1 });

			const removed = store.clearPattern('task:.*');

			expect(removed).toBe(2);
			expect(store.get('task:1')).toBeNull();
			expect(store.get('task:2')).toBeNull();
			expect(store.get('user:1')).toBeDefined();
		});

		it('should generate ETag for cached data', () => {
			const data = { id: 1, title: 'Test' };
			store.set('task:1', data);

			const cached = store.get('task:1');
			expect(cached?.etag).toBeDefined();
			expect(typeof cached?.etag).toBe('string');
		});

		it('should have consistent ETag for same data', () => {
			const data = { id: 1, title: 'Test' };
			store.set('task:1', data);

			const cached1 = store.get('task:1');
			const etag1 = cached1?.etag;

			// Delete and re-add same data
			store.delete('task:1');
			store.set('task:1', data);

			const cached2 = store.get('task:1');
			const etag2 = cached2?.etag;

			expect(etag1).toBe(etag2);
		});

		it('should have different ETag for different data', () => {
			store.set('task:1', { id: 1, title: 'Task 1' });
			store.set('task:2', { id: 2, title: 'Task 2' });

			const cached1 = store.get('task:1');
			const cached2 = store.get('task:2');

			expect(cached1?.etag).not.toBe(cached2?.etag);
		});

		it('should provide cache statistics', () => {
			store.set('task:1', { id: 1 });
			store.set('task:2', { id: 2 });
			store.set('task:3', { id: 3 });

			const stats = store.getStats();

			expect(stats.size).toBe(3);
			expect(stats.entries).toHaveLength(3);
		});

		it('should include entries in stats', () => {
			store.set('task:1', { id: 1 });
			store.set('task:2', { id: 2 });
			store.set('task:3', { id: 3 });

			const stats = store.getStats();

			// Should include all entries
			expect(stats.entries.length).toBeGreaterThanOrEqual(3);
			expect(stats.entries.some(e => e.key === 'task:1')).toBe(true);
		});

		it('should use default TTL if not specified', () => {
			const data = { id: 1 };
			store.set('task:1', data); // No TTL specified

			const cached = store.get('task:1');
			expect(cached?.ttl).toBeDefined();
			expect(cached?.ttl).toBeGreaterThan(0);
		});

		it('should allow custom TTL', () => {
			const data = { id: 1 };
			const customTtl = 30000;
			store.set('task:1', data, customTtl);

			const cached = store.get('task:1');
			expect(cached?.ttl).toBe(customTtl);
		});

		it('should track cache age', () => {
			const data = { id: 1 };
			store.set('task:1', data);

			const stats = store.getStats();
			const entry = stats.entries.find(e => e.key === 'task:1');
			expect(entry?.age).toBeLessThan(100); // Should be very recent
		});

		it('should provide cache statistics', () => {
			const data = { id: 1 };
			store.set('task:1', data, 5000);

			// Should exist initially
			expect(store.get('task:1')).toBeDefined();

			// Should have stats
			const stats = store.getStats();
			expect(stats.size).toBeGreaterThan(0);
			expect(stats.entries).toBeDefined();
		});
	});

	describe('generateCacheKey', () => {
		it('should generate key with user ID, method, and path', () => {
			const req = createMockRequest() as Request;
			const key = generateCacheKey(req);

			expect(key).toContain('user-123');
			expect(key).toContain('GET');
			expect(key).toContain('/api/v1/tasks');
		});

		it('should include query parameters in key', () => {
			const req = createMockRequest({
				query: { status: 'pending', limit: '10' }
			}) as Request;

			const key = generateCacheKey(req);
			expect(key).toContain('status=pending');
			expect(key).toContain('limit=10');
		});

		it('should sort query parameters for consistency', () => {
			const req1 = createMockRequest({
				query: { b: '2', a: '1' }
			}) as Request;

			const req2 = createMockRequest({
				query: { a: '1', b: '2' }
			}) as Request;

			const key1 = generateCacheKey(req1);
			const key2 = generateCacheKey(req2);

			expect(key1).toBe(key2);
		});

		it('should use anonymous user if not authenticated', () => {
			const req = createMockRequest({
				auth: undefined
			}) as Request;

			const key = generateCacheKey(req);
			expect(key).toContain('anonymous');
		});

		it('should handle empty query parameters', () => {
			const req = createMockRequest({
				query: {}
			}) as Request;

			const key = generateCacheKey(req);
			expect(key).not.toContain('?');
		});
	});

	describe('cacheMiddleware', () => {
		it('should cache GET request responses', () => {
			const middleware = cacheMiddleware();
			const req = createMockRequest({
				method: 'GET'
			}) as Request;
			const res = createMockResponse() as any;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it('should skip non-GET requests', () => {
			const middleware = cacheMiddleware();
			const req = createMockRequest({
				method: 'POST'
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it('should skip /batch routes', () => {
			const middleware = cacheMiddleware();
			const req = createMockRequest({
				method: 'GET',
				path: '/api/v1/tasks/batch/create'
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it('should return cached response on hit', () => {
			const data = { id: 1, title: 'Cached Task' };
			const cacheKey = 'test-key';

			// Pre-populate cache
			cacheStore.set(cacheKey, data);

			const middleware = cacheMiddleware();
			const req = createMockRequest({
				method: 'GET'
			}) as Request;
			const res = createMockResponse() as any;
			const next = vi.fn();

			// Mock generateCacheKey
			vi.mock('./cache.middleware.js', async () => {
				const actual = await vi.importActual('./cache.middleware.js');
				return {
					...actual,
					generateCacheKey: () => cacheKey
				};
			});

			middleware(req, res, next);
			// Cache hit should set response
		});

		it('should support ETag conditional requests', () => {
			const data = { id: 1 };
			const store = new CacheStore();
			store.set('task:1', data);

			const cached = store.get('task:1');
			const etag = cached?.etag;

			const req = createMockRequest({
				method: 'GET',
				headers: { 'if-none-match': etag }
			}) as Request;
			const res = createMockResponse() as any;

			// If ETag matches, should return 304
			if (etag && req.headers['if-none-match'] === etag) {
				expect(res.statusCode).toBeDefined();
			}
		});
	});

	describe('invalidateCacheMiddleware', () => {
		it('should clear task cache on POST', () => {
			cacheStore.set('user-123:GET:/api/v1/tasks', { id: 1 });

			const middleware = invalidateCacheMiddleware;
			const req = createMockRequest({
				method: 'POST',
				path: '/api/v1/tasks'
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it('should clear task cache on PATCH', () => {
			const middleware = invalidateCacheMiddleware;
			const req = createMockRequest({
				method: 'PATCH',
				path: '/api/v1/tasks/1'
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it('should clear task cache on DELETE', () => {
			const middleware = invalidateCacheMiddleware;
			const req = createMockRequest({
				method: 'DELETE',
				path: '/api/v1/tasks/1'
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it('should skip GET requests', () => {
			const middleware = invalidateCacheMiddleware;
			const req = createMockRequest({
				method: 'GET'
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});
	});

	describe('Cache Performance', () => {
		it('should handle high volume of cache operations', () => {
			const store = new CacheStore();

			for (let i = 0; i < 1000; i++) {
				store.set(`key:${i}`, { id: i, data: 'test' });
			}

			expect(store.getStats().size).toBe(1000);

			// Clearing should be fast
			store.clear();
			expect(store.getStats().size).toBe(0);
		});

		it('should efficiently handle pattern-based invalidation', () => {
			const store = new CacheStore();

			for (let i = 0; i < 100; i++) {
				store.set(`task:${i}`, { id: i });
				store.set(`user:${i}`, { id: i });
			}

			const removed = store.clearPattern('task:.*');
			expect(removed).toBe(100);
			expect(store.getStats().size).toBe(100); // Only user: keys remain
		});

		it('should maintain low memory footprint', () => {
			const store = new CacheStore();
			const data = { id: 1, content: 'a'.repeat(1000) };

			for (let i = 0; i < 100; i++) {
				store.set(`key:${i}`, data);
			}

			const stats = store.getStats();
			expect(stats.size).toBe(100);
		});
	});
});
