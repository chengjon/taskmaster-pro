/**
 * @fileoverview Express Application Configuration
 *
 * Sets up the Express app with middleware and routes
 */

import express, { type Express } from 'express';
import cors from 'cors';
import {
	authMiddleware,
	optionalAuthMiddleware
} from './middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLoggerMiddleware } from './middleware/request-logger.js';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
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

	// Public routes (optional auth)
	app.use('/api/v1/public', optionalAuthMiddleware);

	// Protected routes (require auth)
	app.use('/api/v1', authMiddleware);

	// Placeholder for actual routes
	// These will be populated in Phase 1.2
	app.get('/api/v1/tasks', (req, res) => {
		res.json({
			success: true,
			data: [],
			message: 'Tasks API - Coming soon in Phase 1.2'
		});
	});

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
