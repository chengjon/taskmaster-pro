/**
 * @fileoverview Task Priority Constants
 *
 * Defines all possible task priority levels and validation functions
 */

export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task priority options
 * Defines possible task priorities:
 * - high: Critical tasks that need immediate attention
 * - medium: Standard priority tasks (default)
 * - low: Tasks that can be deferred or are nice-to-have
 */
export const TASK_PRIORITY_OPTIONS: TaskPriority[] = ['high', 'medium', 'low'];

/**
 * Default task priority
 */
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium';

/**
 * Check if a given priority is valid
 */
export function isValidTaskPriority(
	priority: unknown
): priority is TaskPriority {
	if (typeof priority !== 'string') return false;
	return TASK_PRIORITY_OPTIONS.includes(
		priority.toLowerCase() as TaskPriority
	);
}

/**
 * Normalize a priority value to lowercase
 */
export function normalizeTaskPriority(priority: unknown): TaskPriority | null {
	if (typeof priority !== 'string') return null;
	const normalized = priority.toLowerCase() as TaskPriority;
	return isValidTaskPriority(normalized) ? normalized : null;
}

/**
 * Get priority rank for comparison (higher number = higher priority)
 */
export function getPriorityRank(priority: TaskPriority): number {
	const ranks: Record<TaskPriority, number> = {
		high: 3,
		medium: 2,
		low: 1
	};
	return ranks[priority];
}
