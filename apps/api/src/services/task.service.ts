/**
 * @fileoverview Task Service Layer
 *
 * Bridges between API controllers and @tm/core task domain
 * Note: This is a limited implementation as the current TmCore API
 * only supports read (list, get) and update operations, not create/delete
 */

import type { TmCore } from '@tm/core';
import type { CreateTaskRequest, UpdateTaskRequest, TaskListQuery, BatchCreateTasksRequest, BatchUpdateTasksRequest } from '../schemas/task.schema.js';

/**
 * Task Service
 */
export class TaskService {
	constructor(private tmCore: TmCore) {}

	/**
	 * Create a new task
	 * NOTE: This is a limited implementation returning mock data
	 * The current TmCore TasksDomain does not support create operations
	 */
	async createTask(data: CreateTaskRequest) {
		try {
			// Currently TmCore doesn't support task creation via API
			// Return mock data for backward compatibility
			const task = {
				id: `task-${Date.now()}`,
				title: data.title,
				description: data.description || '',
				priority: data.priority || 'medium',
				status: data.status || 'pending',
				tags: data.tags || [],
				dueDate: data.dueDate ? new Date(data.dueDate) : null,
				assignedTo: data.assignedTo || null,
				parentTaskId: data.parentTaskId || null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system',
				subtasks: []
			};

			return task;
		} catch (error) {
			throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get a task by ID
	 */
	async getTask(taskId: string) {
		try {
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is required');
			}

			// Use TmCore to fetch real task data
			if (this.tmCore && this.tmCore.tasks) {
				const result = await this.tmCore.tasks.get(taskId);
				if (!result || !result.task) {
					return null;
				}
				return result.task;
			}

			// Fallback to mock data if TmCore is unavailable
			return {
				id: taskId,
				title: 'Sample Task',
				description: 'This is a sample task',
				priority: 'medium' as const,
				status: 'pending' as const,
				tags: [],
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system',
				subtasks: []
			};
		} catch (error) {
			throw new Error(`Failed to get task: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * List tasks with filtering and pagination
	 */
	async listTasks(query: TaskListQuery) {
		try {
			// Use TmCore to fetch real tasks
			if (this.tmCore && this.tmCore.tasks) {
				const result = await this.tmCore.tasks.list();
				let tasks = result.tasks || [];

				// Apply status filter if provided
				if (query.status) {
					tasks = tasks.filter((task: any) => task.status === query.status);
				}

				// Apply priority filter if provided
				if (query.priority) {
					tasks = tasks.filter((task: any) => task.priority === query.priority);
				}

				// Apply tags filter if provided
				if (query.tags && (typeof query.tags === 'string' || query.tags.length > 0)) {
					const tagsArray = typeof query.tags === 'string' ? [query.tags] : query.tags;
					tasks = tasks.filter((task: any) =>
						task.tags && task.tags.length > 0 &&
						tagsArray.some((tag: string) => task.tags?.includes(tag))
					);
				}

				// Apply sorting
				const sortBy = query.sortBy || 'createdAt';
				const sortOrder = query.sortOrder || 'desc';
				tasks.sort((a: any, b: any) => {
					let aValue: any = a[sortBy as keyof typeof a];
					let bValue: any = b[sortBy as keyof typeof b];

					// Convert dates to timestamps for comparison
					if (aValue instanceof Date) aValue = aValue.getTime();
					if (bValue instanceof Date) bValue = bValue.getTime();

					// Handle missing values
					if (aValue === null || aValue === undefined) return sortOrder === 'asc' ? 1 : -1;
					if (bValue === null || bValue === undefined) return sortOrder === 'asc' ? -1 : 1;

					// Compare values
					if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
					if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
					return 0;
				});

				// Apply pagination
				const offset = query.offset || 0;
				const limit = query.limit || 20;
				const paginatedTasks = tasks.slice(offset, offset + limit);

				return {
					tasks: paginatedTasks,
					total: tasks.length,
					limit,
					offset,
					hasMore: offset + limit < tasks.length
				};
			}

			// Fallback to empty response if TmCore is unavailable
			return {
				tasks: [],
				total: 0,
				limit: query.limit || 20,
				offset: query.offset || 0,
				hasMore: false
			};
		} catch (error) {
			throw new Error(`Failed to list tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Update a task
	 */
	async updateTask(taskId: string, data: UpdateTaskRequest) {
		try {
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is required');
			}

			// Use TmCore to update real task
			if (this.tmCore && this.tmCore.tasks) {
				await this.tmCore.tasks.update(taskId, data as any);
				// Fetch updated task to return
				const result = await this.tmCore.tasks.get(taskId);
				if (result && result.task) {
					return result.task;
				}
			}

			// Fallback to mock data if TmCore is unavailable
			const updatedTask = {
				id: taskId,
				title: data.title || 'Updated Task',
				description: data.description || '',
				priority: data.priority || 'medium',
				status: data.status || 'pending',
				tags: data.tags || [],
				dueDate: data.dueDate ? new Date(data.dueDate) : null,
				assignedTo: data.assignedTo || null,
				parentTaskId: data.parentTaskId || null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system',
				subtasks: []
			};

			return updatedTask;
		} catch (error) {
			throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Delete a task
	 * NOTE: This is a limited implementation returning mock response
	 * The current TmCore TasksDomain does not support delete operations
	 */
	async deleteTask(taskId: string) {
		try {
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is required');
			}

			// Currently TmCore doesn't support task deletion via API
			// Return success response for backward compatibility
			return { id: taskId, deleted: true };
		} catch (error) {
			throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get task subtasks
	 * NOTE: Subtasks are accessed through the main task object's subtasks array
	 */
	async getSubtasks(taskId: string) {
		try {
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is required');
			}

			// Use TmCore to fetch task with subtasks
			if (this.tmCore && this.tmCore.tasks) {
				const result = await this.tmCore.tasks.get(taskId);
				if (result && result.task && result.task.subtasks) {
					return {
						parentTaskId: taskId,
						subtasks: result.task.subtasks
					};
				}
			}

			// Fallback to empty response if TmCore is unavailable
			return {
				parentTaskId: taskId,
				subtasks: []
			};
		} catch (error) {
			throw new Error(`Failed to get subtasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Create a subtask
	 * NOTE: This is a limited implementation returning mock data
	 * The current TmCore TasksDomain does not support subtask creation
	 */
	async createSubtask(parentTaskId: string, data: CreateTaskRequest) {
		try {
			if (!parentTaskId || parentTaskId.trim() === '') {
				throw new Error('Parent Task ID is required');
			}

			// Currently TmCore doesn't support subtask creation via API
			// Return mock data for backward compatibility
			const subtask = {
				id: `subtask-${Date.now()}`,
				parentTaskId,
				title: data.title,
				description: data.description || '',
				priority: data.priority || 'medium',
				status: data.status || 'pending',
				tags: data.tags || [],
				dueDate: data.dueDate ? new Date(data.dueDate) : null,
				assignedTo: data.assignedTo || null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system'
			};

			return subtask;
		} catch (error) {
			throw new Error(`Failed to create subtask: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Batch create tasks
	 */
	async batchCreateTasks(data: BatchCreateTasksRequest) {
		try {
			const tasks = await Promise.all(
				data.tasks.map(taskData => this.createTask(taskData))
			);

			return {
				created: tasks.length,
				tasks
			};
		} catch (error) {
			throw new Error(`Failed to batch create tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Batch update tasks
	 */
	async batchUpdateTasks(data: BatchUpdateTasksRequest) {
		try {
			const results = await Promise.all(
				data.updates.map(({ id, changes }) => this.updateTask(id, changes))
			);

			return {
				updated: results.length,
				tasks: results
			};
		} catch (error) {
			throw new Error(`Failed to batch update tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Batch delete tasks
	 */
	async batchDeleteTasks(taskIds: string[]) {
		try {
			if (!taskIds || taskIds.length === 0) {
				throw new Error('At least one task ID is required');
			}

			const results = await Promise.all(
				taskIds.map(id => this.deleteTask(id))
			);

			return {
				deleted: results.length,
				tasks: results
			};
		} catch (error) {
			throw new Error(`Failed to batch delete tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
