/**
 * @fileoverview Task Status Constants Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
	TASK_STATUS_OPTIONS,
	isValidTaskStatus,
	normalizeTaskStatus,
	type TaskStatus
} from './task-status.js';

describe('Task Status Constants', () => {
	describe('TASK_STATUS_OPTIONS', () => {
		it('should contain all expected statuses', () => {
			expect(TASK_STATUS_OPTIONS).toEqual([
				'pending',
				'done',
				'in-progress',
				'review',
				'deferred',
				'cancelled'
			]);
		});

		it('should have correct length', () => {
			expect(TASK_STATUS_OPTIONS).toHaveLength(6);
		});
	});

	describe('isValidTaskStatus', () => {
		it('should return true for valid statuses', () => {
			const validStatuses: TaskStatus[] = [
				'pending',
				'done',
				'in-progress',
				'review',
				'deferred',
				'cancelled'
			];

			validStatuses.forEach((status) => {
				expect(isValidTaskStatus(status)).toBe(true);
			});
		});

		it('should return false for invalid statuses', () => {
			expect(isValidTaskStatus('invalid')).toBe(false);
			expect(isValidTaskStatus('')).toBe(false);
			expect(isValidTaskStatus(null)).toBe(false);
			expect(isValidTaskStatus(undefined)).toBe(false);
			expect(isValidTaskStatus(123)).toBe(false);
		});

		it('should be case-sensitive', () => {
			expect(isValidTaskStatus('PENDING')).toBe(false);
			expect(isValidTaskStatus('Pending')).toBe(false);
		});
	});

	describe('normalizeTaskStatus', () => {
		it('should return status if valid', () => {
			expect(normalizeTaskStatus('pending')).toBe('pending');
			expect(normalizeTaskStatus('done')).toBe('done');
		});

		it('should return null for invalid input', () => {
			expect(normalizeTaskStatus('invalid')).toBeNull();
			expect(normalizeTaskStatus(null)).toBeNull();
			expect(normalizeTaskStatus(undefined)).toBeNull();
			expect(normalizeTaskStatus(123)).toBeNull();
			expect(normalizeTaskStatus({})).toBeNull();
		});

		it('should return null for empty string', () => {
			expect(normalizeTaskStatus('')).toBeNull();
		});
	});
});
