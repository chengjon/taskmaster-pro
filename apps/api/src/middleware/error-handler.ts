/**
 * @fileoverview Global Error Handler Middleware
 *
 * Catches and formats all errors in a consistent way
 */

import type { Request, Response, NextFunction } from 'express';
import { sendServerError, sendBadRequest } from '../utils/response.js';
import { logger } from './request-logger.js';

/**
 * Custom error with status code
 */
export class ApiError extends Error {
	constructor(
		message: string,
		public statusCode: number = 400,
		public code: string = 'API_ERROR',
		public details?: Record<string, any>
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * Validation error
 */
export class ValidationError extends ApiError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 400, 'VALIDATION_ERROR', details);
		this.name = 'ValidationError';
	}
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
	constructor(resource: string = 'Resource') {
		super(`${resource} not found`, 404, 'NOT_FOUND');
		this.name = 'NotFoundError';
	}
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends ApiError {
	constructor(message: string = 'Unauthorized') {
		super(message, 401, 'UNAUTHORIZED');
		this.name = 'UnauthorizedError';
	}
}

/**
 * Conflict error
 */
export class ConflictError extends ApiError {
	constructor(message: string) {
		super(message, 409, 'CONFLICT');
		this.name = 'ConflictError';
	}
}

/**
 * Global error handler middleware
 * Should be mounted last in the middleware chain
 */
export function errorHandler(
	error: Error,
	req: Request,
	res: Response,
	_next: NextFunction
): void {
	const requestId = req.headers['x-request-id'] as string;

	// Log error
	if (error instanceof ApiError) {
		logger.warn(
			{
				error: error.message,
				code: error.code,
				statusCode: error.statusCode,
				path: req.path,
				method: req.method,
				requestId
			},
			'API Error'
		);
	} else {
		logger.error(
			{
				error: error.message,
				stack: error.stack,
				path: req.path,
				method: req.method,
				requestId
			},
			'Unhandled Error'
		);
	}

	// Handle known error types
	if (error instanceof ApiError) {
		res.status(error.statusCode).json({
			success: false,
			error: {
				code: error.code,
				message: error.message,
				...(error.details && { details: error.details })
			},
			timestamp: new Date().toISOString(),
			requestId
		});
		return;
	}

	// Handle Zod validation errors
	if (error.name === 'ZodError') {
		const details = (error as any).errors.reduce(
			(acc: Record<string, any>, err: any) => {
				acc[err.path.join('.')] = err.message;
				return acc;
			},
			{}
		);

		res.status(400).json({
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Validation failed',
				details
			},
			timestamp: new Date().toISOString(),
			requestId
		});
		return;
	}

	// Handle unknown errors
	sendServerError(res, 'Internal Server Error', requestId);
}

/**
 * 404 handler - should be mounted last (after all routes)
 */
export function notFoundHandler(
	req: Request,
	res: Response
): void {
	res.status(404).json({
		success: false,
		error: {
			code: 'NOT_FOUND',
			message: `Route ${req.method} ${req.path} not found`
		},
		timestamp: new Date().toISOString()
	});
}
