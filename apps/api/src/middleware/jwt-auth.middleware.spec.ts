/**
 * @fileoverview JWT Authentication Middleware Tests
 *
 * Tests for JWT verification and authentication middleware
 */

import { describe, it, expect, vi } from 'vitest';
import { sign } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import {
	jwtAuthMiddleware,
	optionalJwtAuthMiddleware,
	verifyJwtToken,
	decodeJwtToken,
	extractBearerToken,
	jwtConfig,
	requireRole
} from './jwt-auth.middleware.js';

// Mock response helpers
function createMockResponse(): Partial<Response> {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		end: vi.fn().mockReturnThis()
	};
}

function createMockRequest(overrides = {}): Partial<Request> {
	return {
		headers: {},
		auth: undefined,
		...overrides
	};
}

// Test data
const testSecret = 'test-secret-key';
const validPayload = {
	sub: 'user-123',
	email: 'user@example.com',
	email_verified: true,
	iat: Math.floor(Date.now() / 1000),
	exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
	project_id: 'proj-123',
	account_id: 'acc-123',
	role: 'admin'
};

describe('JWT Authentication Middleware', () => {
	describe('extractBearerToken', () => {
		it('should extract bearer token from Authorization header', () => {
			const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
			const token = extractBearerToken(authHeader);
			expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
		});

		it('should return null for missing Authorization header', () => {
			const token = extractBearerToken(undefined);
			expect(token).toBeNull();
		});

		it('should return null for non-Bearer token', () => {
			const authHeader = 'Basic dXNlcjpwYXNz';
			const token = extractBearerToken(authHeader);
			expect(token).toBeNull();
		});

		it('should return null for empty Authorization header', () => {
			const token = extractBearerToken('');
			expect(token).toBeNull();
		});
	});

	describe('verifyJwtToken', () => {
		it('should verify and decode a valid JWT token', () => {
			const token = sign(validPayload, testSecret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const payload = verifyJwtToken(token, testSecret);
			expect(payload).toBeDefined();
			expect(payload?.sub).toBe('user-123');
			expect(payload?.email).toBe('user@example.com');
			expect(payload?.role).toBe('admin');
		});

		it('should return null for invalid token', () => {
			const payload = verifyJwtToken('invalid-token', testSecret);
			expect(payload).toBeNull();
		});

		it('should return null for expired token', () => {
			const expiredPayload = {
				...validPayload,
				exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
			};
			const token = sign(expiredPayload, testSecret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const payload = verifyJwtToken(token, testSecret);
			expect(payload).toBeNull();
		});

		it('should use default secret from config if not provided', () => {
			const token = sign(validPayload, jwtConfig.secret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const payload = verifyJwtToken(token);
			expect(payload).toBeDefined();
			expect(payload?.sub).toBe('user-123');
		});

		it('should return null for wrong secret', () => {
			const token = sign(validPayload, 'wrong-secret', {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const payload = verifyJwtToken(token, testSecret);
			expect(payload).toBeNull();
		});
	});

	describe('decodeJwtToken', () => {
		it('should decode JWT without verification', () => {
			const token = sign(validPayload, testSecret, {
				algorithm: 'HS256'
			});

			const payload = decodeJwtToken(token);
			expect(payload).toBeDefined();
			expect(payload?.sub).toBe('user-123');
		});

		it('should return null for invalid token format', () => {
			const payload = decodeJwtToken('not-a-token');
			expect(payload).toBeNull();
		});
	});

	describe('jwtAuthMiddleware', () => {
		it('should attach auth context for valid token', () => {
			// Override environment for this test
			const originalSecret = process.env.SUPABASE_JWT_SECRET;
			process.env.SUPABASE_JWT_SECRET = testSecret;

			const token = sign(validPayload, testSecret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const req = createMockRequest({
				headers: { authorization: `Bearer ${token}` }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			jwtAuthMiddleware(req, res, next);

			expect(req.auth).toBeDefined();
			expect(req.auth?.userId).toBe('user-123');
			expect(req.auth?.email).toBe('user@example.com');
			expect(req.auth?.role).toBe('admin');
			expect(next).toHaveBeenCalled();

			// Restore
			if (originalSecret) {
				process.env.SUPABASE_JWT_SECRET = originalSecret;
			} else {
				delete process.env.SUPABASE_JWT_SECRET;
			}
		});

		it('should return 401 for missing Authorization header', () => {
			const req = createMockRequest({
				headers: {}
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			jwtAuthMiddleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it('should return 401 for invalid token', () => {
			const req = createMockRequest({
				headers: { authorization: 'Bearer invalid-token' }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			jwtAuthMiddleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it('should return 401 for missing sub claim', () => {
			const payloadWithoutSub = {
				...validPayload,
				sub: undefined
			};
			const token = sign(payloadWithoutSub, testSecret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const req = createMockRequest({
				headers: { authorization: `Bearer ${token}` }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			jwtAuthMiddleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('optionalJwtAuthMiddleware', () => {
		it('should attach auth context for valid token', () => {
			// Override environment for this test
			const originalSecret = process.env.SUPABASE_JWT_SECRET;
			process.env.SUPABASE_JWT_SECRET = testSecret;

			const token = sign(validPayload, testSecret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const req = createMockRequest({
				headers: { authorization: `Bearer ${token}` }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			optionalJwtAuthMiddleware(req, res, next);

			expect(req.auth).toBeDefined();
			expect(next).toHaveBeenCalled();

			// Restore
			if (originalSecret) {
				process.env.SUPABASE_JWT_SECRET = originalSecret;
			} else {
				delete process.env.SUPABASE_JWT_SECRET;
			}
		});

		it('should continue without auth for missing Authorization header', () => {
			const req = createMockRequest({
				headers: {}
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			optionalJwtAuthMiddleware(req, res, next);

			expect(req.auth).toBeUndefined();
			expect(next).toHaveBeenCalled();
		});

		it('should continue without auth for invalid token', () => {
			const req = createMockRequest({
				headers: { authorization: 'Bearer invalid-token' }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			optionalJwtAuthMiddleware(req, res, next);

			expect(req.auth).toBeUndefined();
			expect(next).toHaveBeenCalled();
		});
	});

	describe('requireRole', () => {
		it('should allow request with matching role', () => {
			const middleware = requireRole('admin');
			const req = createMockRequest({
				auth: { role: 'admin', userId: 'user-123' }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('should reject request with non-matching role', () => {
			const middleware = requireRole('admin');
			const req = createMockRequest({
				auth: { role: 'user', userId: 'user-123' }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it('should use default role if not provided', () => {
			const middleware = requireRole('admin');
			const req = createMockRequest({
				auth: { userId: 'user-123' }
			}) as Request;
			const res = createMockResponse() as Response;
			const next = vi.fn();

			middleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('JWT Payload Extraction', () => {
		it('should extract all payload fields correctly', () => {
			const token = sign(validPayload, testSecret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const payload = verifyJwtToken(token, testSecret);

			expect(payload?.sub).toBe('user-123');
			expect(payload?.email).toBe('user@example.com');
			expect(payload?.email_verified).toBe(true);
			expect(payload?.project_id).toBe('proj-123');
			expect(payload?.account_id).toBe('acc-123');
			expect(payload?.role).toBe('admin');
		});

		it('should handle optional payload fields', () => {
			const minimalPayload = {
				sub: 'user-123',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600
			};

			const token = sign(minimalPayload, testSecret, {
				algorithm: 'HS256',
				issuer: 'supabase',
				audience: 'authenticated'
			});

			const payload = verifyJwtToken(token, testSecret);

			expect(payload?.sub).toBe('user-123');
			expect(payload?.email).toBeUndefined();
			expect(payload?.role).toBeUndefined();
		});
	});
});
