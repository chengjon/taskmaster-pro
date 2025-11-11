/**
 * @fileoverview Task Routes
 *
 * Express router for task management endpoints
 */

import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import type { TmCore } from '@tm/core';

/**
 * Create task router
 */
export function createTaskRouter(tmCore: TmCore): Router {
	const router = Router();
	const controller = new TaskController(tmCore);

	/**
	 * NOTE: Route order matters in Express!
	 * More specific routes MUST come before less specific wildcard routes
	 * e.g., /batch/create must come before /:id
	 */

	/**
	 * Batch Operation Routes (MUST come first before /:id routes)
	 */

	// Batch create tasks
	router.post('/batch/create', (req, res, next) => controller.batchCreateTasks(req, res, next));

	// Batch update tasks
	router.patch('/batch/update', (req, res, next) => controller.batchUpdateTasks(req, res, next));

	// Batch delete tasks
	router.delete('/batch/delete', (req, res, next) => controller.batchDeleteTasks(req, res, next));

	/**
	 * Task CRUD Routes
	 */

	// Create a new task
	router.post('/', (req, res, next) => controller.createTask(req, res, next));

	// List tasks with filtering and pagination
	router.get('/', (req, res, next) => controller.listTasks(req, res, next));

	/**
	 * Subtask Routes (MUST come before /:id routes)
	 */

	// Get subtasks of a task
	router.get('/:id/subtasks', (req, res, next) => controller.getSubtasks(req, res, next));

	// Create a subtask
	router.post('/:id/subtasks', (req, res, next) => controller.createSubtask(req, res, next));

	/**
	 * ID-based Routes (MUST come last as they use :id wildcard)
	 */

	// Get a specific task
	router.get('/:id', (req, res, next) => controller.getTask(req, res, next));

	// Update a task
	router.patch('/:id', (req, res, next) => controller.updateTask(req, res, next));

	// Delete a task
	router.delete('/:id', (req, res, next) => controller.deleteTask(req, res, next));

	return router;
}
