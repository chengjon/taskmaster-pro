/**
 * @fileoverview Task Controller
 *
 * Handles task HTTP requests and delegates to TaskService
 */

import type { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service.js';
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../utils/response.js';
import {
	createTaskSchema,
	updateTaskSchema,
	taskListQuerySchema,
	batchCreateTasksSchema,
	batchUpdateTasksSchema,
	taskIdParamSchema
} from '../schemas/task.schema.js';
import type { TmCore } from '@tm/core';

/**
 * Task Controller
 */
export class TaskController {
	private taskService: TaskService;

	constructor(tmCore: TmCore) {
		this.taskService = new TaskService(tmCore);
	}

	/**
	 * POST /api/v1/tasks - Create a new task
	 */
	async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const validatedData = createTaskSchema.parse(req.body);
			const task = await this.taskService.createTask(validatedData);

			sendSuccess(res, task, 201);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/v1/tasks - List tasks with filtering and pagination
	 */
	async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const validatedQuery = taskListQuerySchema.parse(req.query);
			const result = await this.taskService.listTasks(validatedQuery);

			sendSuccess(res, result);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/v1/tasks/:id - Get a specific task
	 */
	async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { id } = taskIdParamSchema.parse(req.params);
			const task = await this.taskService.getTask(id);

			if (!task) {
				sendNotFound(res, 'Task not found');
				return;
			}

			sendSuccess(res, task);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PATCH /api/v1/tasks/:id - Update a task
	 */
	async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { id } = taskIdParamSchema.parse(req.params);
			const validatedData = updateTaskSchema.parse(req.body);

			const task = await this.taskService.updateTask(id, validatedData);

			sendSuccess(res, task);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * DELETE /api/v1/tasks/:id - Delete a task
	 */
	async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { id } = taskIdParamSchema.parse(req.params);
			const result = await this.taskService.deleteTask(id);

			sendSuccess(res, result);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/v1/tasks/:id/subtasks - Get subtasks of a task
	 */
	async getSubtasks(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { id } = taskIdParamSchema.parse(req.params);
			const result = await this.taskService.getSubtasks(id);

			sendSuccess(res, result);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * POST /api/v1/tasks/:id/subtasks - Create a subtask
	 */
	async createSubtask(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { id } = taskIdParamSchema.parse(req.params);
			const validatedData = createTaskSchema.parse(req.body);

			const subtask = await this.taskService.createSubtask(id, validatedData);

			sendSuccess(res, subtask, 201);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * POST /api/v1/tasks/batch/create - Batch create tasks
	 */
	async batchCreateTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const validatedData = batchCreateTasksSchema.parse(req.body);
			const result = await this.taskService.batchCreateTasks(validatedData);

			sendSuccess(res, result, 201);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PATCH /api/v1/tasks/batch/update - Batch update tasks
	 */
	async batchUpdateTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const validatedData = batchUpdateTasksSchema.parse(req.body);
			const result = await this.taskService.batchUpdateTasks(validatedData);

			sendSuccess(res, result);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * DELETE /api/v1/tasks/batch/delete - Batch delete tasks
	 */
	async batchDeleteTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { taskIds } = req.body as { taskIds: string[] };

			if (!Array.isArray(taskIds) || taskIds.length === 0) {
				sendError(
					res,
					'INVALID_REQUEST',
					'taskIds array is required and must not be empty',
					400
				);
				return;
			}

			const result = await this.taskService.batchDeleteTasks(taskIds);

			sendSuccess(res, result);
		} catch (error) {
			next(error);
		}
	}
}
