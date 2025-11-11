/**
 * @fileoverview Task Master Pro REST API Server
 *
 * Main entry point for the API server
 */

import { createApp, appConfig } from './app.js';
import { logger } from './middleware/request-logger.js';

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

		// Graceful shutdown
		process.on('SIGTERM', () => {
			logger.info('SIGTERM received, shutting down gracefully');
			server.close(() => {
				logger.info('Server closed');
				process.exit(0);
			});
		});

		process.on('SIGINT', () => {
			logger.info('SIGINT received, shutting down gracefully');
			server.close(() => {
				logger.info('Server closed');
				process.exit(0);
			});
		});

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
