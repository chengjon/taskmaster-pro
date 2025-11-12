/**
 * @fileoverview Express Application Configuration
 *
 * Sets up the Express app with middleware and routes
 */

import express, { type Express } from 'express';
import cors from 'cors';
import type { TmCore } from '@tm/core';
import {
	authMiddleware,
	optionalAuthMiddleware
} from './middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLoggerMiddleware } from './middleware/request-logger.js';
import { jwtAuthMiddleware, optionalJwtAuthMiddleware } from './middleware/jwt-auth.middleware.js';
import {
	globalRateLimiter,
	authRateLimiter,
	writeRateLimiter,
	readRateLimiter
} from './middleware/rate-limit.middleware.js';
import { cacheMiddleware, invalidateCacheMiddleware } from './middleware/cache.middleware.js';
import { setupSwaggerUI } from './middleware/swagger.js';
import { createTaskRouter } from './routes/tasks.routes.js';

/**
 * Create and configure Express application
 */
export function createApp(tmCore?: TmCore): Express {
	const app = express();

	// === Global Middleware ===

	// CORS
	app.use(
		cors({
			origin: process.env.CORS_ORIGIN || '*',
			credentials: true,
			optionsSuccessStatus: 200
		})
	);

	// Body parsing
	app.use(express.json({ limit: '10mb' }));
	app.use(express.urlencoded({ limit: '10mb', extended: true }));

	// Request logging
	app.use(requestLoggerMiddleware);

	// Rate limiting (skip health checks)
	app.use((req, res, next) => {
		if (req.path.includes('/health')) {
			return next();
		}
		globalRateLimiter(req, res, next);
	});

	// Cache middleware for GET requests (before routes)
	app.use(cacheMiddleware());

	// === Documentation ===

	// Setup Swagger UI (must come before route handlers)
	setupSwaggerUI(app);

	// === Routes ===

	// Health check routes (no auth required)
	app.get('/api/v1/health', (req, res) => {
		res.json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			version: '1.0.0',
			uptime: process.uptime()
		});
	});

	app.get('/api/v1/health/ready', (req, res) => {
		res.json({
			ready: true,
			timestamp: new Date().toISOString()
		});
	});

	app.get('/api/v1/health/live', (req, res) => {
		res.json({
			alive: true,
			timestamp: new Date().toISOString()
		});
	});

	// Public routes (optional JWT auth)
	app.use('/api/v1/public', optionalJwtAuthMiddleware);

	// Protected routes (require JWT auth) - MUST come before route handlers
	app.use('/api/v1/tasks', (req, res, next) => {
		// Use JWT auth for protected task endpoints
		jwtAuthMiddleware(req, res, next);
	});

	// Read operation rate limiting (GET requests)
	app.use('/api/v1/tasks', readRateLimiter);

	// Write operation rate limiting and cache invalidation
	app.use('/api/v1/tasks', invalidateCacheMiddleware);

	// Task management routes
	// In development/testing, routes work even without tmCore (uses mock data)
	const mockTmCore = tmCore || ({} as any);
	app.use('/api/v1/tasks', createTaskRouter(mockTmCore));

	// === Error Handling ===

	// 404 handler (must be after all routes)
	app.use(notFoundHandler);

	// Global error handler (must be last)
	app.use(errorHandler);

	return app;
}

/**
 * Application configuration from environment
 */
export const appConfig = {
	port: parseInt(process.env.PORT || '3000', 10),
	nodeEnv: process.env.NODE_ENV || 'development',
	isDevelopment: process.env.NODE_ENV !== 'production',
	corsOrigin: process.env.CORS_ORIGIN || '*',
	logLevel: process.env.LOG_LEVEL || 'info'
};
