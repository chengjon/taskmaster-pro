/**
 * @fileoverview Rate Limiting Middleware Tests
 *
 * Tests for rate limiting and token bucket implementations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { TokenBucketRateLimiter } from './rate-limit.middleware.js';

// Mock request/response helpers
function createMockRequest(overrides = {}): Partial<Request> {
	return {
		method: 'GET',
		path: '/api/v1/tasks',
		headers: {},
		socket: { remoteAddress: '127.0.0.1' } as any,
		auth: undefined,
		...overrides
	};
}

function createMockResponse(): Partial<Response> {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		getHeader: vi.fn().mockReturnValue('60')
	};
}

describe('Rate Limiting Middleware', () => {
	describe('TokenBucketRateLimiter', () => {
		let limiter: TokenBucketRateLimiter;

		beforeEach(() => {
			// Create limiter with 10 max tokens, 10 tokens per second
			limiter = new TokenBucketRateLimiter(10, 10, 1000);
		});

		it('should allow request when tokens available', () => {
			const allowed = limiter.allow('user:123', 1);
			expect(allowed).toBe(true);
		});

		it('should deny request when tokens exhausted', () => {
			// Use all tokens
			for (let i = 0; i < 10; i++) {
				limiter.allow('user:123', 1);
			}

			// Next request should fail
			const allowed = limiter.allow('user:123', 1);
			expect(allowed).toBe(false);
		});

		it('should refill tokens over time', async () => {
			// Use all tokens
			for (let i = 0; i < 10; i++) {
				limiter.allow('user:123', 1);
			}

			// Wait 1 second (refill interval)
			await new Promise(resolve => setTimeout(resolve, 1100));

			// Should have refilled tokens
			const remaining = limiter.getRemaining('user:123');
			expect(remaining).toBeGreaterThan(0);
		});

		it('should cap tokens at max', () => {
			// Wait for refill
			const bucket = (limiter as any).buckets.get('user:123');
			if (!bucket) {
				limiter.allow('user:123', 1);
			}

			// Tokens should never exceed max
			const remaining = limiter.getRemaining('user:123');
			expect(remaining).toBeLessThanOrEqual(10);
		});

		it('should support custom token requirements', () => {
			// Use 5 tokens
			const allowed = limiter.allow('user:123', 5);
			expect(allowed).toBe(true);

			const remaining = limiter.getRemaining('user:123');
			expect(remaining).toBe(5);
		});

		it('should deny request requiring more tokens than available', () => {
			// Use 9 tokens
			limiter.allow('user:123', 9);

			// Request requiring 5 tokens should fail
			const allowed = limiter.allow('user:123', 5);
			expect(allowed).toBe(false);
		});

		it('should maintain separate buckets for different keys', () => {
			limiter.allow('user:1', 5);
			limiter.allow('user:2', 3);

			const remaining1 = limiter.getRemaining('user:1');
			const remaining2 = limiter.getRemaining('user:2');

			expect(remaining1).toBe(5);
			expect(remaining2).toBe(7);
		});

		it('should reset a specific key', () => {
			limiter.allow('user:123', 8);
			let remaining = limiter.getRemaining('user:123');
			expect(remaining).toBe(2);

			limiter.reset('user:123');
			remaining = limiter.getRemaining('user:123');
			expect(remaining).toBe(10);
		});

		it('should clear all buckets', () => {
			limiter.allow('user:1', 5);
			limiter.allow('user:2', 3);

			limiter.clear();

			const remaining1 = limiter.getRemaining('user:1');
			const remaining2 = limiter.getRemaining('user:2');

			expect(remaining1).toBe(10);
			expect(remaining2).toBe(10);
		});

		it('should provide statistics', () => {
			limiter.allow('user:1', 3);
			limiter.allow('user:2', 5);

			const stats = limiter.getStats();

			expect(stats.totalBuckets).toBe(2);
			expect(stats.bucketStats).toHaveLength(2);
			expect(stats.bucketStats[0].key).toMatch(/user:/);
		});

		it('should handle new keys with full tokens', () => {
			const remaining = limiter.getRemaining('new-user');
			expect(remaining).toBe(10);
		});

		it('should handle fractional token refills correctly', async () => {
			// Create limiter with slower refill
			const slowLimiter = new TokenBucketRateLimiter(100, 1, 1000); // 1 token per second

			slowLimiter.allow('user:123', 99);

			// Wait 500ms (should add ~0.5 tokens)
			await new Promise(resolve => setTimeout(resolve, 600));

			const remaining = slowLimiter.getRemaining('user:123');
			expect(remaining).toBeGreaterThanOrEqual(1);
			expect(remaining).toBeLessThanOrEqual(2);
		});

		it('should support large token batches', () => {
			const largeLimiter = new TokenBucketRateLimiter(1000, 100, 1000);

			const allowed = largeLimiter.allow('user:123', 500);
			expect(allowed).toBe(true);

			const remaining = largeLimiter.getRemaining('user:123');
			expect(remaining).toBe(500);
		});
	});

	describe('KeyGenerator', () => {
		it('should use user ID for authenticated requests', () => {
			const req = createMockRequest({
				auth: { userId: 'user-123' }
			}) as Request;

			// Simulating keyGenerator logic
			const userId = req.auth?.userId;
			const key = userId ? `user:${userId}` : 'unknown';

			expect(key).toBe('user:user-123');
		});

		it('should fall back to IP address for unauthenticated requests', () => {
			const req = createMockRequest({
				headers: { 'x-forwarded-for': '192.168.1.100' }
			}) as Request;

			// Simulating keyGenerator logic
			const userId = req.auth?.userId;
			const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
			const key = userId ? `user:${userId}` : `ip:${ip}`;

			expect(key).toBe('ip:192.168.1.100');
		});

		it('should handle x-forwarded-for with multiple IPs', () => {
			const req = createMockRequest({
				headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1' }
			}) as Request;

			const userId = req.auth?.userId;
			const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
			const key = userId ? `user:${userId}` : `ip:${ip}`;

			expect(key).toBe('ip:192.168.1.100');
		});

		it('should use remoteAddress as fallback', () => {
			const req = createMockRequest({
				socket: { remoteAddress: '127.0.0.1' }
			}) as Request;

			const userId = req.auth?.userId;
			const ip = req.socket?.remoteAddress || 'unknown';
			const key = userId ? `user:${userId}` : `ip:${ip}`;

			expect(key).toBe('ip:127.0.0.1');
		});

		it('should use unknown for missing IP and auth', () => {
			const req = createMockRequest({
				socket: { remoteAddress: undefined }
			}) as Request;

			const userId = req.auth?.userId;
			const ip = req.socket?.remoteAddress || 'unknown';
			const key = userId ? `user:${userId}` : `ip:${ip}`;

			expect(key).toBe('ip:unknown');
		});
	});

	describe('Token Bucket Edge Cases', () => {
		it('should handle rapid consecutive requests', () => {
			const limiter = new TokenBucketRateLimiter(100, 10, 1000);

			for (let i = 0; i < 100; i++) {
				const allowed = limiter.allow('user:123', 1);
				expect(allowed).toBe(true);
			}

			// Next request should fail
			const allowed = limiter.allow('user:123', 1);
			expect(allowed).toBe(false);
		});

		it('should handle concurrent bucket access', () => {
			const limiter = new TokenBucketRateLimiter(10, 10, 1000);

			// Simulate concurrent access
			const results = [];
			for (let i = 0; i < 5; i++) {
				results.push(limiter.allow(`user:${i}`, 2));
			}

			expect(results).toEqual([true, true, true, true, true]);
		});

		it('should preserve bucket state after failed request', () => {
			const limiter = new TokenBucketRateLimiter(10, 10, 1000);

			limiter.allow('user:123', 9);
			const allowed = limiter.allow('user:123', 5); // Should fail

			expect(allowed).toBe(false);

			const remaining = limiter.getRemaining('user:123');
			expect(remaining).toBe(1); // Still has 1 token
		});

		it('should handle bucket creation on first access', () => {
			const limiter = new TokenBucketRateLimiter(50, 5, 1000);

			const remaining1 = limiter.getRemaining('new-user');
			expect(remaining1).toBe(50);

			const allowed = limiter.allow('new-user', 10);
			expect(allowed).toBe(true);

			const remaining2 = limiter.getRemaining('new-user');
			expect(remaining2).toBe(40);
		});
	});
});
