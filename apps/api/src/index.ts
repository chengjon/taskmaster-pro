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
		// Create Express app
		const app = createApp();

		// Start listening
		const server = app.listen(appConfig.port, () => {
			logger.info(
				{
					port: appConfig.port,
					nodeEnv: appConfig.nodeEnv,
					timestamp: new Date().toISOString()
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
