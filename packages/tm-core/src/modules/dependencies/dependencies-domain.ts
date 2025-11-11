/**
 * @fileoverview Dependencies Domain - Business logic for dependency management
 * Migrated from scripts/modules/dependency-manager.js
 */

import type { Task } from '../../common/types/index.js';
import type { IStorage } from '../../common/interfaces/storage.interface.js';
import type {
	ValidationResult,
	FindDependenciesOptions
} from './types/dependency-validation.types.js';
import { DependencyValidator } from './services/dependency-validator.service.js';
import {
	ERROR_CODES,
	TaskMasterError
} from '../../common/errors/task-master-error.js';

/**
 * DependenciesDomain handles all dependency-related business logic
 *
 * Responsibilities:
 * - Validate task dependencies
 * - Detect circular dependencies
 * - Fix invalid dependencies
 * - Manage cross-tag dependencies
 *
 * @example
 * ```typescript
 * const tmCore = await createTmCore({ projectPath: process.cwd() });
 *
 * // Validate dependencies
 * const result = await tmCore.dependencies.validate();
 * if (!result.valid) {
 *   console.log('Found issues:', result.issues);
 * }
 *
 * // Fix invalid dependencies
 * const fixed = await tmCore.dependencies.fix();
 * console.log(`Fixed ${fixed.removedCount} invalid dependencies`);
 * ```
 */
export class DependenciesDomain {
	private readonly validator: DependencyValidator;

	constructor(private readonly storage: IStorage) {
		this.validator = new DependencyValidator();
	}

	/**
	 * Validate all task dependencies
	 *
	 * Checks for:
	 * - Self-dependencies (task depends on itself)
	 * - Missing dependencies (depends on non-existent task)
	 * - Circular dependencies (A → B → C → A)
	 *
	 * @param tag - Optional tag to validate
	 * @returns Validation result with issues
	 *
	 * @example
	 * ```typescript
	 * const result = await tmCore.dependencies.validate();
	 * if (!result.valid) {
	 *   for (const issue of result.issues) {
	 *     console.log(`${issue.type}: ${issue.message}`);
	 *   }
	 * }
	 * ```
	 */
	async validate(tag?: string): Promise<ValidationResult> {
		try {
			const tasks = await this.storage.loadTasks(tag);
			return this.validator.validate(tasks);
		} catch (error) {
			throw new TaskMasterError(
				'Failed to validate dependencies',
				ERROR_CODES.DEPENDENCY_ERROR,
				{ operation: 'validate', tag },
				error as Error
			);
		}
	}

	/**
	 * Fix invalid dependencies
	 *
	 * Removes:
	 * - Self-dependencies
	 * - Dependencies to non-existent tasks
	 * - Duplicate dependencies
	 *
	 * Note: Does NOT fix circular dependencies (they require manual intervention)
	 *
	 * @param tag - Optional tag to fix
	 * @returns Information about what was fixed
	 *
	 * @example
	 * ```typescript
	 * const result = await tmCore.dependencies.fix();
	 * console.log(`Removed ${result.removedCount} invalid dependencies`);
	 * ```
	 */
	async fix(
		tag?: string
	): Promise<{ removedCount: number; duplicatesRemoved: number }> {
		try {
			const tasks = await this.storage.loadTasks(tag);

			// Remove duplicates
			const duplicatesRemoved = this.validator.removeDuplicates(tasks);

			// Remove invalid dependencies
			const invalidRemoved = this.validator.removeInvalid(tasks);

			// Save the cleaned tasks
			if (duplicatesRemoved > 0 || invalidRemoved > 0) {
				await this.storage.saveTasks(tasks, tag);
			}

			return {
				removedCount: invalidRemoved,
				duplicatesRemoved
			};
		} catch (error) {
			throw new TaskMasterError(
				'Failed to fix dependencies',
				ERROR_CODES.DEPENDENCY_ERROR,
				{ operation: 'fix', tag },
				error as Error
			);
		}
	}

	/**
	 * Add a dependency relationship between two tasks
	 *
	 * @param taskId - Task that will depend on another
	 * @param dependsOn - Task that will be depended upon
	 * @param tag - Optional tag context
	 *
	 * @example
	 * ```typescript
	 * // Task 2 depends on Task 1
	 * await tmCore.dependencies.add('2', '1');
	 *
	 * // Subtask depends on another subtask
	 * await tmCore.dependencies.add('2.1', '1.3');
	 * ```
	 */
	async add(
		taskId: string,
		dependsOn: string,
		tag?: string
	): Promise<void> {
		try {
			const tasks = await this.storage.loadTasks(tag);

			// Find the task
			const task = this.findTask(tasks, taskId);
			if (!task) {
				throw new TaskMasterError(
					`Task ${taskId} not found`,
					ERROR_CODES.TASK_NOT_FOUND,
					{ taskId, tag }
				);
			}

			// Verify dependency exists
			const depTask = this.findTask(tasks, dependsOn);
			if (!depTask) {
				throw new TaskMasterError(
					`Dependency task ${dependsOn} not found`,
					ERROR_CODES.TASK_NOT_FOUND,
					{ dependsOn, tag }
				);
			}

			// Initialize dependencies array if needed
			if (!task.dependencies) {
				task.dependencies = [];
			}

			// Check for self-dependency
			if (String(taskId) === String(dependsOn)) {
				throw new TaskMasterError(
					'Cannot create self-dependency',
					ERROR_CODES.DEPENDENCY_ERROR,
					{ taskId, dependsOn }
				);
			}

			// Check for duplicate
			if (task.dependencies.some((d) => String(d) === String(dependsOn))) {
				throw new TaskMasterError(
					`Task ${taskId} already depends on ${dependsOn}`,
					ERROR_CODES.DEPENDENCY_ERROR,
					{ taskId, dependsOn }
				);
			}

			// Add the dependency
			task.dependencies.push(dependsOn);

			// Check if this creates a circular dependency
			if (this.validator['isCircularDependency'](tasks, taskId)) {
				// Rollback
				task.dependencies.pop();
				throw new TaskMasterError(
					'Cannot add dependency: would create circular dependency',
					ERROR_CODES.DEPENDENCY_ERROR,
					{ taskId, dependsOn }
				);
			}

			// Save
			await this.storage.saveTasks(tasks, tag);
		} catch (error) {
			if (error instanceof TaskMasterError) {
				throw error;
			}
			throw new TaskMasterError(
				'Failed to add dependency',
				ERROR_CODES.DEPENDENCY_ERROR,
				{ operation: 'add', taskId, dependsOn, tag },
				error as Error
			);
		}
	}

	/**
	 * Remove a dependency relationship
	 *
	 * @param taskId - Task to remove dependency from
	 * @param dependsOn - Dependency to remove
	 * @param tag - Optional tag context
	 *
	 * @example
	 * ```typescript
	 * // Remove dependency from Task 2 to Task 1
	 * await tmCore.dependencies.remove('2', '1');
	 * ```
	 */
	async remove(
		taskId: string,
		dependsOn: string,
		tag?: string
	): Promise<void> {
		try {
			const tasks = await this.storage.loadTasks(tag);

			// Find the task
			const task = this.findTask(tasks, taskId);
			if (!task) {
				throw new TaskMasterError(
					`Task ${taskId} not found`,
					ERROR_CODES.TASK_NOT_FOUND,
					{ taskId, tag }
				);
			}

			// If task has no dependencies, nothing to remove (graceful handling)
			if (!task.dependencies || task.dependencies.length === 0) {
				return; // No-op: nothing to remove
			}

			const initialLength = task.dependencies.length;
			task.dependencies = task.dependencies.filter(
				(d) => String(d) !== String(dependsOn)
			);

			// If dependency wasn't found, still graceful (no error)
			if (task.dependencies.length === initialLength) {
				return; // No-op: dependency not found, but that's okay
			}

			// Save
			await this.storage.saveTasks(tasks, tag);
		} catch (error) {
			if (error instanceof TaskMasterError) {
				throw error;
			}
			throw new TaskMasterError(
				'Failed to remove dependency',
				ERROR_CODES.DEPENDENCY_ERROR,
				{ operation: 'remove', taskId, dependsOn, tag },
				error as Error
			);
		}
	}

	/**
	 * Get all tasks that a given task depends on
	 *
	 * @param taskId - Task to get dependencies for
	 * @param tag - Optional tag context
	 * @returns Array of task IDs that this task depends on
	 *
	 * @example
	 * ```typescript
	 * const deps = await tmCore.dependencies.getDependencies('5');
	 * console.log('Task 5 depends on:', deps); // ['1', '2', '3']
	 * ```
	 */
	async getDependencies(taskId: string, tag?: string): Promise<string[]> {
		try {
			const tasks = await this.storage.loadTasks(tag);
			const task = this.findTask(tasks, taskId);

			if (!task) {
				throw new TaskMasterError(
					`Task ${taskId} not found`,
					ERROR_CODES.TASK_NOT_FOUND,
					{ taskId, tag }
				);
			}

			return (task.dependencies || []).map(String);
		} catch (error) {
			if (error instanceof TaskMasterError) {
				throw error;
			}
			throw new TaskMasterError(
				'Failed to get dependencies',
				ERROR_CODES.DEPENDENCY_ERROR,
				{ operation: 'getDependencies', taskId, tag },
				error as Error
			);
		}
	}

	/**
	 * Get all tasks that depend on a given task
	 *
	 * @param taskId - Task to find dependents for
	 * @param tag - Optional tag context
	 * @returns Array of task IDs that depend on this task
	 *
	 * @example
	 * ```typescript
	 * const dependents = await tmCore.dependencies.getDependents('1');
	 * console.log('Tasks depending on Task 1:', dependents); // ['2', '3', '5']
	 * ```
	 */
	async getDependents(taskId: string, tag?: string): Promise<string[]> {
		try {
			const tasks = await this.storage.loadTasks(tag);
			const dependents: string[] = [];

			for (const task of tasks) {
				if (
					task.dependencies &&
					task.dependencies.some((d) => String(d) === String(taskId))
				) {
					dependents.push(String(task.id));
				}

				// Check subtasks
				if (task.subtasks && task.subtasks.length > 0) {
					for (const subtask of task.subtasks) {
						if (
							subtask.dependencies &&
							subtask.dependencies.some((d) => String(d) === String(taskId))
						) {
							dependents.push(`${task.id}.${subtask.id}`);
						}
					}
				}
			}

			return dependents;
		} catch (error) {
			throw new TaskMasterError(
				'Failed to get dependents',
				ERROR_CODES.DEPENDENCY_ERROR,
				{ operation: 'getDependents', taskId, tag },
				error as Error
			);
		}
	}

	/**
	 * Find a task or subtask by ID
	 */
	private findTask(tasks: Task[], taskId: string): Task | undefined {
		if (taskId.includes('.')) {
			// Subtask
			const [parentId, subtaskId] = taskId.split('.');
			const parent = tasks.find(
				(t) => String(t.id) === parentId || t.id === parseInt(parentId, 10)
			);
			if (parent && parent.subtasks) {
				return parent.subtasks.find(
					(st) =>
						String(st.id) === subtaskId || st.id === parseInt(subtaskId, 10)
				) as unknown as Task;
			}
		} else {
			// Regular task
			const taskIdNum = parseInt(taskId, 10);
			return tasks.find(
				(t) => t.id === taskIdNum || String(t.id) === taskId
			);
		}
		return undefined;
	}
}
