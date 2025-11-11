/**
 * @fileoverview Task Priority Constants Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
	TASK_PRIORITY_OPTIONS,
	DEFAULT_TASK_PRIORITY,
	isValidTaskPriority,
	normalizeTaskPriority,
	getPriorityRank,
	type TaskPriority
} from './task-priority.js';

describe('Task Priority Constants', () => {
	describe('TASK_PRIORITY_OPTIONS', () => {
		it('should contain all expected priorities', () => {
			expect(TASK_PRIORITY_OPTIONS).toEqual(['high', 'medium', 'low']);
		});

		it('should have correct length', () => {
			expect(TASK_PRIORITY_OPTIONS).toHaveLength(3);
		});
	});

	describe('DEFAULT_TASK_PRIORITY', () => {
		it('should be medium', () => {
			expect(DEFAULT_TASK_PRIORITY).toBe('medium');
		});

		it('should be a valid priority', () => {
			expect(isValidTaskPriority(DEFAULT_TASK_PRIORITY)).toBe(true);
		});
	});

	describe('isValidTaskPriority', () => {
		it('should return true for valid priorities', () => {
			const validPriorities: TaskPriority[] = ['high', 'medium', 'low'];

			validPriorities.forEach((priority) => {
				expect(isValidTaskPriority(priority)).toBe(true);
			});
		});

		it('should accept case-insensitive input', () => {
			expect(isValidTaskPriority('HIGH')).toBe(true);
			expect(isValidTaskPriority('High')).toBe(true);
			expect(isValidTaskPriority('MEDIUM')).toBe(true);
			expect(isValidTaskPriority('LOW')).toBe(true);
		});

		it('should return false for invalid priorities', () => {
			expect(isValidTaskPriority('critical')).toBe(false);
			expect(isValidTaskPriority('')).toBe(false);
			expect(isValidTaskPriority(null)).toBe(false);
			expect(isValidTaskPriority(undefined)).toBe(false);
			expect(isValidTaskPriority(123)).toBe(false);
		});
	});

	describe('normalizeTaskPriority', () => {
		it('should return normalized priority for valid input', () => {
			expect(normalizeTaskPriority('high')).toBe('high');
			expect(normalizeTaskPriority('MEDIUM')).toBe('medium');
			expect(normalizeTaskPriority('Low')).toBe('low');
		});

		it('should return null for invalid input', () => {
			expect(normalizeTaskPriority('invalid')).toBeNull();
			expect(normalizeTaskPriority(null)).toBeNull();
			expect(normalizeTaskPriority(undefined)).toBeNull();
			expect(normalizeTaskPriority(123)).toBeNull();
		});
	});

	describe('getPriorityRank', () => {
		it('should return correct rank for each priority', () => {
			expect(getPriorityRank('high')).toBe(3);
			expect(getPriorityRank('medium')).toBe(2);
			expect(getPriorityRank('low')).toBe(1);
		});

		it('should allow priority comparison', () => {
			const high = getPriorityRank('high');
			const medium = getPriorityRank('medium');
			const low = getPriorityRank('low');

			expect(high).toBeGreaterThan(medium);
			expect(medium).toBeGreaterThan(low);
		});
	});
});
