/**
 * @fileoverview Task Status Constants
 *
 * Defines all possible task status values and validation functions
 */

export type TaskStatus =
	| 'pending'
	| 'done'
	| 'in-progress'
	| 'review'
	| 'deferred'
	| 'cancelled';

/**
 * Task status options list
 * Defines possible task statuses:
 * - pending: Task waiting to start
 * - done: Task completed
 * - in-progress: Task in progress
 * - review: Task completed and waiting for review
 * - deferred: Task postponed or paused
 * - cancelled: Task cancelled and will not be completed
 */
export const TASK_STATUS_OPTIONS: TaskStatus[] = [
	'pending',
	'done',
	'in-progress',
	'review',
	'deferred',
	'cancelled'
];

/**
 * Check if a given status is a valid task status
 */
export function isValidTaskStatus(status: unknown): status is TaskStatus {
	return TASK_STATUS_OPTIONS.includes(status as TaskStatus);
}

/**
 * Normalize a status value
 */
export function normalizeTaskStatus(status: unknown): TaskStatus | null {
	if (typeof status !== 'string') return null;
	return isValidTaskStatus(status) ? status : null;
}
