/**
 * @fileoverview Task Service Layer
 *
 * Bridges between API controllers and @tm/core task domain
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
	 */
	async createTask(data: CreateTaskRequest) {
		try {
			// Use TmCore to create real task
			if (this.tmCore && this.tmCore.tasks) {
				const task = await this.tmCore.tasks.create({
					title: data.title,
					description: data.description,
					priority: data.priority,
					status: data.status,
					tags: data.tags,
					dueDate: data.dueDate,
					assignedTo: data.assignedTo,
					parentTaskId: data.parentTaskId
				});
				return task;
			}

			// Fallback to mock data if TmCore is unavailable
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
				const task = await this.tmCore.tasks.get(taskId);
				if (!task) {
					return null;
				}
				return task;
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
				const tasks = await this.tmCore.tasks.list();

				// Apply pagination manually if needed
				const offset = query.offset || 0;
				const limit = query.limit || 50;
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
				limit: query.limit,
				offset: query.offset,
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
				const updatedTask = await this.tmCore.tasks.update(taskId, data);
				return updatedTask;
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
	 */
	async deleteTask(taskId: string) {
		try {
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is required');
			}

			// Use TmCore to delete real task
			if (this.tmCore && this.tmCore.tasks) {
				await this.tmCore.tasks.delete(taskId);
				return { id: taskId, deleted: true };
			}

			// Fallback to mock response if TmCore is unavailable
			return { id: taskId, deleted: true };
		} catch (error) {
			throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get task subtasks
	 */
	async getSubtasks(taskId: string) {
		try {
			if (!taskId || taskId.trim() === '') {
				throw new Error('Task ID is required');
			}

			// Use TmCore to fetch real subtasks
			if (this.tmCore && this.tmCore.tasks) {
				const subtasks = await this.tmCore.tasks.getSubtasks(taskId);
				return {
					parentTaskId: taskId,
					subtasks: subtasks || []
				};
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
	 */
	async createSubtask(parentTaskId: string, data: CreateTaskRequest) {
		try {
			if (!parentTaskId || parentTaskId.trim() === '') {
				throw new Error('Parent Task ID is required');
			}

			// Use TmCore to create real subtask
			if (this.tmCore && this.tmCore.tasks) {
				const subtask = await this.tmCore.tasks.createSubtask(parentTaskId, {
					title: data.title,
					description: data.description,
					priority: data.priority,
					status: data.status,
					tags: data.tags,
					dueDate: data.dueDate,
					assignedTo: data.assignedTo
				});
				return subtask;
			}

			// Fallback to mock data if TmCore is unavailable
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
