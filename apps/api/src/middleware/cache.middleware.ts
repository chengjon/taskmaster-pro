/**
 * @fileoverview Response Caching Middleware
 *
 * Implements in-memory caching for API responses
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from './request-logger.js';

/**
 * Cache entry structure
 */
interface CacheEntry {
	data: any;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
	etag?: string;
}

/**
 * Cache configuration
 */
export const cacheConfig = {
	// Default TTL: 5 minutes
	defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300000', 10),
	// Max cache size in MB
	maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100', 10),
	// Enable etag support
	enableEtag: process.env.CACHE_ENABLE_ETAG !== 'false',
	// Cache expiration check interval
	cleanupInterval: 60000 // 1 minute
};

/**
 * In-memory cache store
 */
export class CacheStore {
	private cache: Map<string, CacheEntry> = new Map();
	private accessCount: Map<string, number> = new Map();
	private cleanupTimer?: NodeJS.Timeout;

	constructor() {
		// Start cleanup timer
		this.startCleanup();
	}

	/**
	 * Get cached value
	 */
	get(key: string): any | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			this.accessCount.delete(key);
			logger.debug({ key }, 'Cache entry expired');
			return null;
		}

		// Update access count
		this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);

		return entry;
	}

	/**
	 * Set cached value
	 */
	set(key: string, data: any, ttl?: number): void {
		const entry: CacheEntry = {
			data,
			timestamp: Date.now(),
			ttl: ttl || cacheConfig.defaultTtl,
			etag: this.generateEtag(data)
		};

		this.cache.set(key, entry);
		this.accessCount.set(key, 1);

		logger.debug({ key, ttl: entry.ttl }, 'Cache entry created');
	}

	/**
	 * Delete cached value
	 */
	delete(key: string): void {
		this.cache.delete(key);
		this.accessCount.delete(key);
		logger.debug({ key }, 'Cache entry deleted');
	}

	/**
	 * Clear all cache
	 */
	clear(): void {
		const size = this.cache.size;
		this.cache.clear();
		this.accessCount.clear();
		logger.info({ size }, 'Cache cleared');
	}

	/**
	 * Clear cache for pattern (e.g., "tasks:*")
	 */
	clearPattern(pattern: string): number {
		const regex = new RegExp(pattern.replace('*', '.*'));
		let count = 0;

		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.delete(key);
				count++;
			}
		}

		logger.debug({ pattern, count }, 'Cache pattern cleared');
		return count;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		entries: Array<{
			key: string;
			ttl: number;
			age: number;
			accessCount: number;
		}>;
	} {
		const entries = Array.from(this.cache.entries())
			.map(([key, entry]) => ({
				key,
				ttl: entry.ttl,
				age: Date.now() - entry.timestamp,
				accessCount: this.accessCount.get(key) || 0
			}))
			.sort((a, b) => b.accessCount - a.accessCount);

		return {
			size: this.cache.size,
			entries
		};
	}

	/**
	 * Generate ETag for data
	 */
	private generateEtag(data: any): string {
		const json = JSON.stringify(data);
		// Simple hash function (in production, use crypto)
		let hash = 0;
		for (let i = 0; i < json.length; i++) {
			const char = json.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return `"${Math.abs(hash).toString(16)}"`;
	}

	/**
	 * Start periodic cleanup of expired entries
	 */
	private startCleanup(): void {
		this.cleanupTimer = setInterval(() => {
			let removed = 0;
			const now = Date.now();

			for (const [key, entry] of this.cache.entries()) {
				if (now - entry.timestamp > entry.ttl) {
					this.delete(key);
					removed++;
				}
			}

			if (removed > 0) {
				logger.debug({ removed }, 'Cleanup removed expired entries');
			}
		}, cacheConfig.cleanupInterval);
	}

	/**
	 * Stop cleanup timer
	 */
	stopCleanup(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}
	}
}

/**
 * Global cache store instance
 */
export const cacheStore = new CacheStore();

/**
 * Generate cache key from request
 */
export function generateCacheKey(req: Request): string {
	const user = req.auth?.userId || 'anonymous';
	const method = req.method;
	const path = req.path;
	const query = Object.keys(req.query)
		.sort()
		.map((k) => `${k}=${req.query[k]}`)
		.join('&');

	return `${user}:${method}:${path}${query ? `?${query}` : ''}`;
}

/**
 * Cache middleware for GET requests
 */
export function cacheMiddleware(
	defaultTtl?: number
) {
	return (req: Request, res: Response, next: NextFunction): void => {
		// Only cache GET requests
		if (req.method !== 'GET') {
			next();
			return;
		}

		// Skip caching for certain paths
		if (req.path.includes('/batch')) {
			next();
			return;
		}

		const cacheKey = generateCacheKey(req);
		const cached = cacheStore.get(cacheKey);

		if (cached) {
			logger.debug({ cacheKey }, 'Cache hit');

			// Check ETag
			if (
				cacheConfig.enableEtag &&
				cached.etag &&
				req.headers['if-none-match'] === cached.etag
			) {
				res.status(304).end();
				return;
			}

			// Set cache headers
			if (cached.etag) {
				res.set('ETag', cached.etag);
			}
			res.set(
				'Cache-Control',
				`public, max-age=${Math.floor(cached.ttl / 1000)}`
			);
			res.set('X-Cache', 'HIT');

			// Return cached data
			res.json(cached.data);
			return;
		}

		// Intercept res.json to cache response
		const originalJson = res.json.bind(res);

		res.json = function (data: any) {
			// Only cache successful responses
			if (res.statusCode >= 200 && res.statusCode < 300) {
				cacheStore.set(cacheKey, data, defaultTtl);
				res.set('X-Cache', 'MISS');
			}

			return originalJson(data);
		} as any;

		next();
	};
}

/**
 * Invalidate cache on mutations
 */
export function invalidateCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
	// Handle cache invalidation for mutations
	if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
		// Invalidate related cache entries
		if (req.path.includes('/tasks')) {
			// Clear all task-related caches
			cacheStore.clearPattern('.*:GET:.*/tasks.*');
			logger.debug('Invalidated task cache');
		}
	}

	next();
}

/**
 * Clear cache endpoint handler (admin only)
 */
export function clearCacheHandler(req: Request, res: Response): void {
	const { pattern } = req.query as { pattern?: string };

	if (pattern) {
		const removed = cacheStore.clearPattern(pattern as string);
		res.json({
			success: true,
			message: `Cache cleared for pattern: ${pattern}`,
			removed
		});
	} else {
		cacheStore.clear();
		res.json({
			success: true,
			message: 'Cache fully cleared'
		});
	}
}

/**
 * Cache stats endpoint handler (admin only)
 */
export function cacheStatsHandler(req: Request, res: Response): void {
	const stats = cacheStore.getStats();
	res.json({
		success: true,
		data: stats
	});
}
