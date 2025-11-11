/**
 * @fileoverview Request Logger Middleware
 *
 * Logs all incoming requests and responses using Pino
 */

import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';

/**
 * Create Pino logger instance
 */
export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true,
			ignore: 'pid,hostname',
			singleLine: false
		}
	}
});

/**
 * Request logger middleware
 * Logs all incoming requests and timing information
 */
export function requestLoggerMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	// Generate request ID if not present
	const requestId =
		(req.headers['x-request-id'] as string) ||
		`req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	// Attach request ID to response headers
	res.setHeader('x-request-id', requestId);
	req.headers['x-request-id'] = requestId;

	// Record start time
	const startTime = Date.now();

	// Log incoming request
	logger.info(
		{
			requestId,
			method: req.method,
			path: req.path,
			query: req.query,
			ip: req.ip,
			userAgent: req.headers['user-agent']
		},
		'Incoming request'
	);

	// Capture original res.json/res.send to log response
	const originalJson = res.json.bind(res);
	const originalSend = res.send.bind(res);

	res.json = function (body: any) {
		logResponse(req, res, startTime, requestId);
		return originalJson(body);
	};

	res.send = function (body: any) {
		logResponse(req, res, startTime, requestId);
		return originalSend(body);
	};

	next();
}

/**
 * Log response details
 */
function logResponse(
	req: Request,
	res: Response,
	startTime: number,
	requestId: string
): void {
	const duration = Date.now() - startTime;

	const logLevel = res.statusCode >= 500 ? 'error' : 'info';

	logger[logLevel as keyof typeof logger](
		{
			requestId,
			method: req.method,
			path: req.path,
			statusCode: res.statusCode,
			duration: `${duration}ms`,
			contentLength: res.get('content-length')
		},
		'Response sent'
	);
}

/**
 * Export logger for use in other modules
 */
export default logger;
