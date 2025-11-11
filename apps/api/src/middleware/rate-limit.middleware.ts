/**
 * @fileoverview Rate Limiting Middleware
 *
 * Implements rate limiting to protect the API from abuse
 */

import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { logger } from './request-logger.js';

/**
 * Rate limit configuration
 */
export const rateLimitConfig = {
	// Default window: 15 minutes
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
	// Default limit: 100 requests per window
	max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
	// Skip successful requests (only count errors)
	skipSuccessfulRequests: false,
	// Skip failed requests
	skipFailedRequests: false,
	// Message to send when limit exceeded
	message: 'Too many requests, please try again later'
};

/**
 * Key generator for rate limiting
 * Uses user ID if available, otherwise IP address
 */
function keyGenerator(req: Request): string {
	// Prefer user ID for authenticated requests
	if (req.auth?.userId) {
		return `user:${req.auth.userId}`;
	}
	// Fall back to IP address for unauthenticated requests
	const ip =
		(req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
		req.socket.remoteAddress ||
		'unknown';
	return `ip:${ip}`;
}

/**
 * Handler for rate limit exceeded
 */
function rateLimitHandler(req: any, res: any): void {
	const key = keyGenerator(req);
	logger.warn(
		{
			key,
			limit: rateLimitConfig.max,
			window: `${rateLimitConfig.windowMs / 1000}s`
		},
		'Rate limit exceeded'
	);

	res.status(429).json({
		success: false,
		error: {
			code: 'RATE_LIMIT_EXCEEDED',
			message: 'Too many requests, please try again later',
			retryAfter: res.getHeader('Retry-After') || '60'
		},
		timestamp: new Date().toISOString()
	});
}

/**
 * Global rate limiter for all routes
 */
export const globalRateLimiter = rateLimit({
	windowMs: rateLimitConfig.windowMs,
	max: rateLimitConfig.max,
	keyGenerator,
	skip: (req) => {
		// Skip health check endpoints
		return req.path.includes('/health');
	},
	handler: rateLimitHandler,
	standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
	legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * More restrictive for login/registration attempts
 */
export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 requests per window
	keyGenerator,
	handler: rateLimitHandler,
	skipSuccessfulRequests: true, // Only count failed attempts
	message: 'Too many authentication attempts, please try again later'
});

/**
 * Moderate rate limiter for write operations
 */
export const writeRateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 30, // 30 requests per window
	keyGenerator,
	handler: rateLimitHandler,
	skip: (req) => {
		// Only apply to POST, PATCH, DELETE
		return !['POST', 'PATCH', 'DELETE'].includes(req.method);
	}
});

/**
 * Loose rate limiter for read operations
 */
export const readRateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 100, // 100 requests per window
	keyGenerator,
	handler: rateLimitHandler,
	skip: (req) => {
		// Only apply to GET
		return req.method !== 'GET';
	}
});

/**
 * Custom in-memory rate limiter for advanced use cases
 */
export class TokenBucketRateLimiter {
	private buckets: Map<
		string,
		{
			tokens: number;
			lastRefill: number;
		}
	> = new Map();

	private maxTokens: number;
	private refillRate: number; // tokens per second
	private refillInterval: number; // milliseconds

	constructor(
		maxTokens: number = 100,
		tokensPerSecond: number = 10,
		refillInterval: number = 1000
	) {
		this.maxTokens = maxTokens;
		this.refillRate = (tokensPerSecond * refillInterval) / 1000;
		this.refillInterval = refillInterval;
	}

	/**
	 * Check if request should be allowed
	 */
	allow(key: string, tokensRequired: number = 1): boolean {
		const now = Date.now();
		let bucket = this.buckets.get(key);

		// Create new bucket if doesn't exist
		if (!bucket) {
			bucket = {
				tokens: this.maxTokens,
				lastRefill: now
			};
			this.buckets.set(key, bucket);
		}

		// Refill tokens based on time elapsed
		const timePassed = now - bucket.lastRefill;
		const tokensToAdd = (timePassed / this.refillInterval) * this.refillRate;

		if (tokensToAdd > 0) {
			bucket.tokens = Math.min(
				this.maxTokens,
				bucket.tokens + tokensToAdd
			);
			bucket.lastRefill = now;
		}

		// Check if enough tokens available
		if (bucket.tokens >= tokensRequired) {
			bucket.tokens -= tokensRequired;
			return true;
		}

		return false;
	}

	/**
	 * Get remaining tokens for a key
	 */
	getRemaining(key: string): number {
		const bucket = this.buckets.get(key);
		if (!bucket) {
			return this.maxTokens;
		}

		const now = Date.now();
		const timePassed = now - bucket.lastRefill;
		const tokensToAdd = (timePassed / this.refillInterval) * this.refillRate;
		const tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);

		return Math.floor(tokens);
	}

	/**
	 * Reset a specific key
	 */
	reset(key: string): void {
		this.buckets.delete(key);
	}

	/**
	 * Clear all buckets (useful for cleanup)
	 */
	clear(): void {
		this.buckets.clear();
	}

	/**
	 * Get stats for monitoring
	 */
	getStats(): {
		totalBuckets: number;
		bucketStats: Array<{
			key: string;
			tokens: number;
			lastRefill: number;
		}>;
	} {
		return {
			totalBuckets: this.buckets.size,
			bucketStats: Array.from(this.buckets.entries()).map(([key, bucket]) => ({
				key,
				tokens: bucket.tokens,
				lastRefill: bucket.lastRefill
			}))
		};
	}
}

/**
 * Export default token bucket for API endpoint limiting
 */
export const apiTokenBucket = new TokenBucketRateLimiter(
	100, // max tokens
	10, // tokens per second
	1000 // refill interval (1 second)
);
