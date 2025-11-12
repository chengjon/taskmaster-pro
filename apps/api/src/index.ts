/**
 * @fileoverview Task Master Pro REST API Server
 *
 * Main entry point for the API server
 */

import path from 'path';
import { createApp, appConfig } from './app.js';
import { logger } from './middleware/request-logger.js';
import { cacheStore } from './middleware/cache.middleware.js';

/**
 * Start the API server
 */
async function startServer(): Promise<void> {
	try {
		// Initialize TmCore (optional for Phase 1.2)
		// In Phase 1.3, this will be fully integrated
		let tmCore: any = undefined;

		try {
			// Try to import and create TmCore if available
			const { createTmCore } = await import('@tm/core');
			tmCore = await createTmCore({ projectPath: process.cwd() });
			logger.info('TmCore initialized successfully');
		} catch (error) {
			logger.warn('TmCore initialization failed, running in limited mode');
			// Continue with undefined tmCore - controllers will use mock data
		}

		// Initialize FileWatcher for tasks.json to keep cache coherent with CLI changes
		// This fixes Issue #2: Cache incoherence between CLI and API
		let destroyWatcher: (() => void) | null = null;
		try {
			const { initializeTasksWatcher, destroyTasksWatcher } = await import('@tm/core');
			const tasksFilePath = path.join(process.cwd(), '.taskmaster/tasks/tasks.json');
			const watcher = initializeTasksWatcher(tasksFilePath);

			// Store destroy function for graceful shutdown
			destroyWatcher = destroyTasksWatcher;

			// Listen for file changes and invalidate cache
			watcher.on('change', () => {
				// Clear all task-related caches when file changes
				const cleared = cacheStore.clearPattern('.*:GET:.*/tasks.*');
				logger.info(
					{ cleared, reason: 'tasks.json file changed' },
					'Cache invalidated due to external file modification'
				);
			});

			// Handle watcher errors
			watcher.on('error', (error) => {
				logger.warn(
					{ error: error instanceof Error ? error.message : String(error) },
					'FileWatcher error occurred'
				);
			});

			logger.info('FileWatcher initialized for cache coherence');
		} catch (error) {
			logger.warn(
				{ error: error instanceof Error ? error.message : String(error) },
				'FileWatcher initialization failed, cache may become stale from CLI changes'
			);
		}

		// Create Express app with optional tmCore
		const app = createApp(tmCore);

		// Start listening
		const server = app.listen(appConfig.port, () => {
			logger.info(
				{
					port: appConfig.port,
					nodeEnv: appConfig.nodeEnv,
					timestamp: new Date().toISOString(),
					tmCoreReady: !!tmCore
				},
				`Task Master Pro API Server started`
			);
		});

		// Graceful shutdown helper
		const gracefulShutdown = (signal: string) => {
			logger.info(`${signal} received, shutting down gracefully`);

			// Destroy FileWatcher to clean up file descriptors
			// This fixes the file descriptor leak issue
			if (destroyWatcher) {
				try {
					destroyWatcher();
					logger.info('FileWatcher cleaned up successfully');
				} catch (error) {
					logger.warn(
						{ error: error instanceof Error ? error.message : String(error) },
						'Error cleaning up FileWatcher'
					);
				}
			}

			server.close(() => {
				logger.info('Server closed');
				process.exit(0);
			});
		};

		// Graceful shutdown handlers
		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));

		// Handle uncaught exceptions
		process.on('uncaughtException', (error) => {
			logger.error(
				{ error: error.message, stack: error.stack },
				'Uncaught Exception'
			);
			process.exit(1);
		});

		// Handle unhandled promise rejections
		process.on('unhandledRejection', (reason, promise) => {
			logger.error(
				{ reason, promise: String(promise) },
				'Unhandled Rejection'
			);
			process.exit(1);
		});
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			'Failed to start server'
		);
		process.exit(1);
	}
}

// Start the server
startServer();
