/**
 * @fileoverview Dependency validation service
 * Handles validation of task dependencies including circular dependency detection
 */

import type { Task } from '../../../common/types/index.js';
import type {
	DependencyIssue,
	ValidationResult
} from '../types/dependency-validation.types.js';

/**
 * DependencyValidator handles all dependency validation logic
 * Migrated from scripts/modules/dependency-manager.js
 */
export class DependencyValidator {
	/**
	 * Validate all task dependencies
	 * @param tasks - Array of all tasks
	 * @returns Validation result with issues
	 */
	validate(tasks: Task[]): ValidationResult {
		const issues: DependencyIssue[] = [];

		// Check each task's dependencies
		for (const task of tasks) {
			// Check task-level dependencies
			if (task.dependencies && task.dependencies.length > 0) {
				let hasSelfDependency = false;

				for (const depId of task.dependencies) {
					// Check for self-dependencies
					if (String(depId) === String(task.id)) {
						issues.push({
							type: 'self',
							taskId: String(task.id),
							message: `Task ${task.id} depends on itself`
						});
						hasSelfDependency = true;
						continue;
					}

					// Check if dependency exists
					if (!this.taskExists(tasks, depId)) {
						issues.push({
							type: 'missing',
							taskId: String(task.id),
							dependencyId: String(depId),
							message: `Task ${task.id} depends on non-existent task ${depId}`
						});
					}
				}

				// Check for circular dependencies (skip if already has self-dependency)
				// Self-dependency is a special case of circular dependency, no need to report both
				if (!hasSelfDependency && this.isCircularDependency(tasks, String(task.id))) {
					issues.push({
						type: 'circular',
						taskId: String(task.id),
						message: `Task ${task.id} is part of a circular dependency chain`
					});
				}
			}

			// Check subtask dependencies if they exist
			// This runs regardless of whether the parent task has dependencies
			if (task.subtasks && task.subtasks.length > 0) {
				for (const subtask of task.subtasks) {
					if (!subtask.dependencies || subtask.dependencies.length === 0) {
						continue;
					}

					const fullSubtaskId = `${task.id}.${subtask.id}`;

					for (const depId of subtask.dependencies) {
						// Check for self-dependencies in subtasks
						if (
							String(depId) === String(fullSubtaskId) ||
							(typeof depId === 'number' && depId === subtask.id)
						) {
							issues.push({
								type: 'self',
								taskId: fullSubtaskId,
								message: `Subtask ${fullSubtaskId} depends on itself`
							});
							continue;
						}

						// Check if dependency exists
						if (!this.taskExists(tasks, depId, task.id)) {
							issues.push({
								type: 'missing',
								taskId: fullSubtaskId,
								dependencyId: String(depId),
								message: `Subtask ${fullSubtaskId} depends on non-existent task ${depId}`
							});
						}
					}

					// Check for circular dependencies in subtasks
					if (this.isCircularDependency(tasks, fullSubtaskId)) {
						issues.push({
							type: 'circular',
							taskId: fullSubtaskId,
							message: `Subtask ${fullSubtaskId} is part of a circular dependency chain`
						});
					}
				}
			}
		}

		return {
			valid: issues.length === 0,
			issues
		};
	}

	/**
	 * Check if a task or subtask exists
	 * @param tasks - Array of all tasks
	 * @param taskId - Task ID to check (supports dot notation for subtasks)
	 * @param parentTaskId - Parent task ID if checking a subtask
	 * @returns Whether the task exists
	 */
	private taskExists(
		tasks: Task[],
		taskId: string | number,
		parentTaskId?: string | number
	): boolean {
		const taskIdStr = String(taskId);

		// Check for subtask (contains dot)
		if (taskIdStr.includes('.')) {
			const [parentId, subtaskId] = taskIdStr.split('.');
			const parentTask = tasks.find(
				(t) => String(t.id) === parentId || t.id === parseInt(parentId, 10)
			);

			if (!parentTask || !parentTask.subtasks) {
				return false;
			}

			return parentTask.subtasks.some(
				(st) => String(st.id) === subtaskId || st.id === parseInt(subtaskId, 10)
			);
		}

		// If we have a parent task ID, this is a relative subtask reference
		if (parentTaskId !== undefined) {
			const parentTask = tasks.find(
				(t) => String(t.id) === String(parentTaskId)
			);
			if (parentTask && parentTask.subtasks) {
				return parentTask.subtasks.some(
					(st) => String(st.id) === taskIdStr || st.id === parseInt(taskIdStr, 10)
				);
			}
		}

		// Regular task - check by ID
		const taskIdNum = parseInt(taskIdStr, 10);
		return tasks.some(
			(t) => t.id === taskIdNum || String(t.id) === taskIdStr
		);
	}

	/**
	 * Check if a task has circular dependencies
	 * @param tasks - Array of all tasks
	 * @param taskId - Task ID to check
	 * @param chain - Dependency chain (used for recursion)
	 * @returns Whether there is a circular dependency
	 */
	private isCircularDependency(
		tasks: Task[],
		taskId: string,
		chain: string[] = []
	): boolean {
		// If this task is already in the chain, we have a circular dependency
		if (chain.includes(taskId)) {
			return true;
		}

		// Find the task
		let task: Task | undefined;
		let parentIdForSubtask: string | null = null;

		if (taskId.includes('.')) {
			// Handle subtask
			const [parentId, subtaskId] = taskId.split('.');
			parentIdForSubtask = parentId;
			const parentTask = tasks.find(
				(t) => String(t.id) === parentId || t.id === parseInt(parentId, 10)
			);

			if (parentTask && parentTask.subtasks) {
				const subtask = parentTask.subtasks.find(
					(st) => String(st.id) === subtaskId || st.id === parseInt(subtaskId, 10)
				);
				if (subtask) {
					// Create a task-like object for validation
					task = subtask as unknown as Task;
				}
			}
		} else {
			// Regular task
			const taskIdNum = parseInt(taskId, 10);
			task = tasks.find(
				(t) => t.id === taskIdNum || String(t.id) === taskId
			);
		}

		if (!task) {
			return false; // Task doesn't exist, can't create circular dependency
		}

		// No dependencies, can't create circular dependency
		if (!task.dependencies || task.dependencies.length === 0) {
			return false;
		}

		// Check each dependency recursively
		const newChain = [...chain, taskId];
		return task.dependencies.some((depId) => {
			let normalizedDepId = String(depId);

			// Normalize relative subtask dependencies
			if (typeof depId === 'number' && parentIdForSubtask !== null) {
				// If the current task is a subtask AND the dependency is a number,
				// assume it refers to a sibling subtask
				normalizedDepId = `${parentIdForSubtask}.${depId}`;
			}

			return this.isCircularDependency(tasks, normalizedDepId, newChain);
		});
	}

	/**
	 * Remove duplicate dependencies from all tasks
	 * @param tasks - Array of tasks to clean
	 * @returns Number of duplicates removed
	 */
	removeDuplicates(tasks: Task[]): number {
		let removedCount = 0;

		for (const task of tasks) {
			if (task.dependencies && task.dependencies.length > 0) {
				const originalLength = task.dependencies.length;
				task.dependencies = [...new Set(task.dependencies)];
				removedCount += originalLength - task.dependencies.length;
			}

			// Clean subtask dependencies
			if (task.subtasks && task.subtasks.length > 0) {
				for (const subtask of task.subtasks) {
					if (subtask.dependencies && subtask.dependencies.length > 0) {
						const originalLength = subtask.dependencies.length;
						subtask.dependencies = [...new Set(subtask.dependencies)];
						removedCount += originalLength - subtask.dependencies.length;
					}
				}
			}
		}

		return removedCount;
	}

	/**
	 * Remove invalid dependencies from all tasks
	 * @param tasks - Array of tasks to clean
	 * @returns Number of invalid dependencies removed
	 */
	removeInvalid(tasks: Task[]): number {
		let removedCount = 0;

		for (const task of tasks) {
			if (task.dependencies && task.dependencies.length > 0) {
				const originalLength = task.dependencies.length;

				// Remove self-dependencies and non-existent dependencies
				task.dependencies = task.dependencies.filter((depId) => {
					// Remove self-dependency
					if (String(depId) === String(task.id)) {
						removedCount++;
						return false;
					}

					// Remove non-existent dependency
					if (!this.taskExists(tasks, depId)) {
						removedCount++;
						return false;
					}

					return true;
				});
			}

			// Clean subtask dependencies
			if (task.subtasks && task.subtasks.length > 0) {
				for (const subtask of task.subtasks) {
					if (subtask.dependencies && subtask.dependencies.length > 0) {
						const fullSubtaskId = `${task.id}.${subtask.id}`;

						subtask.dependencies = subtask.dependencies.filter((depId) => {
							// Remove self-dependency
							if (
								String(depId) === fullSubtaskId ||
								(typeof depId === 'number' && depId === subtask.id)
							) {
								removedCount++;
								return false;
							}

							// Remove non-existent dependency
							if (!this.taskExists(tasks, depId, task.id)) {
								removedCount++;
								return false;
							}

							return true;
						});
					}
				}
			}
		}

		return removedCount;
	}
}
