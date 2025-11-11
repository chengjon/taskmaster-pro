/**
 * @fileoverview Unified API Response Formatter
 *
 * Provides consistent response format across all API endpoints
 */

import type { Response } from 'express';

export interface ApiSuccessResponse<T = any> {
	success: true;
	data: T;
	timestamp: string;
	version: string;
}

export interface ApiErrorDetail {
	code: string;
	message: string;
	details?: Record<string, any>;
	path?: string;
}

export interface ApiErrorResponse {
	success: false;
	error: ApiErrorDetail;
	timestamp: string;
	requestId?: string;
}

const API_VERSION = '1.0.0';

/**
 * Send a success response
 */
export function sendSuccess<T>(
	res: Response,
	data: T,
	statusCode: number = 200
): Response {
	const response: ApiSuccessResponse<T> = {
		success: true,
		data,
		timestamp: new Date().toISOString(),
		version: API_VERSION
	};

	return res.status(statusCode).json(response);
}

/**
 * Send an error response
 */
export function sendError(
	res: Response,
	code: string,
	message: string,
	statusCode: number = 400,
	details?: Record<string, any>,
	requestId?: string
): Response {
	const response: ApiErrorResponse = {
		success: false,
		error: {
			code,
			message,
			...(details && { details })
		},
		timestamp: new Date().toISOString(),
		...(requestId && { requestId })
	};

	return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(res: Response, data: T): Response {
	return sendSuccess(res, data, 201);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): Response {
	return res.status(204).send();
}

/**
 * Send a bad request error (400)
 */
export function sendBadRequest(
	res: Response,
	message: string,
	details?: Record<string, any>
): Response {
	return sendError(res, 'BAD_REQUEST', message, 400, details);
}

/**
 * Send an unauthorized error (401)
 */
export function sendUnauthorized(
	res: Response,
	message: string = 'Unauthorized'
): Response {
	return sendError(res, 'UNAUTHORIZED', message, 401);
}

/**
 * Send a forbidden error (403)
 */
export function sendForbidden(
	res: Response,
	message: string = 'Forbidden'
): Response {
	return sendError(res, 'FORBIDDEN', message, 403);
}

/**
 * Send a not found error (404)
 */
export function sendNotFound(
	res: Response,
	resource: string = 'Resource'
): Response {
	return sendError(
		res,
		'NOT_FOUND',
		`${resource} not found`,
		404
	);
}

/**
 * Send a conflict error (409)
 */
export function sendConflict(
	res: Response,
	message: string = 'Conflict'
): Response {
	return sendError(res, 'CONFLICT', message, 409);
}

/**
 * Send a server error (500)
 */
export function sendServerError(
	res: Response,
	message: string = 'Internal Server Error',
	requestId?: string
): Response {
	return sendError(
		res,
		'INTERNAL_SERVER_ERROR',
		message,
		500,
		undefined,
		requestId
	);
}

/**
 * Send a service unavailable error (503)
 */
export function sendServiceUnavailable(
	res: Response,
	message: string = 'Service Unavailable'
): Response {
	return sendError(res, 'SERVICE_UNAVAILABLE', message, 503);
}
