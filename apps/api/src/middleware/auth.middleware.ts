/**
 * @fileoverview Authentication Middleware
 *
 * Validates Bearer tokens and extracts authentication context
 */

import type { Request, Response, NextFunction } from 'express';
import { sendUnauthorized } from '../utils/response.js';

/**
 * Extended Express Request with auth context
 */
declare global {
	namespace Express {
		interface Request {
			auth?: {
				token: string;
				userId?: string;
				projectId?: string;
				accountId?: string;
			};
		}
	}
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader?: string): string | null {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	return authHeader.slice(7);
}

/**
 * Validate Bearer token format
 * In production, this would validate against Supabase or your auth provider
 */
function validateToken(token: string): boolean {
	// Placeholder validation - in production, verify with Supabase JWT
	// For now, just ensure token exists and has reasonable format
	return token.length >= 5;  // Allow short tokens for testing
}

/**
 * Extract context from token claims
 * In production, this would decode the JWT and extract real claims
 */
function extractTokenClaims(token: string): {
	userId?: string;
	projectId?: string;
	accountId?: string;
} {
	// Placeholder - in production, decode JWT
	// Example: jwt.decode(token).sub, jwt.decode(token).project_id, etc.
	return {
		userId: 'user-1', // Would come from JWT
		projectId: 'default', // Would come from JWT
		accountId: undefined // Optional account ID for multi-tenant
	};
}

/**
 * Authentication middleware
 * Validates Bearer token and extracts authentication context
 */
export function authMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	// Extract token from header
	const token = extractBearerToken(req.headers.authorization);

	if (!token) {
		sendUnauthorized(res, 'Missing Authorization header');
		return;
	}

	// Validate token format
	if (!validateToken(token)) {
		sendUnauthorized(res, 'Invalid token format');
		return;
	}

	try {
		// Extract claims from token
		const claims = extractTokenClaims(token);

		// Attach auth context to request
		req.auth = {
			token,
			...claims
		};

		next();
	} catch (error) {
		sendUnauthorized(res, 'Invalid token');
	}
}

/**
 * Optional authentication middleware
 * Allows requests without authentication but extracts token if present
 */
export function optionalAuthMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	const token = extractBearerToken(req.headers.authorization);

	if (token && validateToken(token)) {
		try {
			const claims = extractTokenClaims(token);
			req.auth = {
				token,
				...claims
			};
		} catch (error) {
			// Ignore invalid optional tokens
		}
	}

	next();
}

/**
 * Verify request has authentication context
 */
export function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	if (!req.auth) {
		sendUnauthorized(res);
		return;
	}
	next();
}

/**
 * Verify user owns the requested resource
 */
export function requireOwnership(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	if (!req.auth?.userId) {
		sendUnauthorized(res);
		return;
	}

	// In production, verify user actually owns the resource
	// For now, just ensure userId is present
	next();
}
