/**
 * @fileoverview Task Request and Response Validation Schemas
 *
 * Zod schemas for validating task-related requests
 */

import { z } from 'zod';

/**
 * Create task request schema
 */
export const createTaskSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
	description: z.string().optional(),
	priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
	status: z.enum(['pending', 'in-progress', 'done', 'review', 'deferred', 'cancelled'])
		.optional()
		.default('pending'),
	parentTaskId: z.string().optional(),
	tags: z.array(z.string()).optional().default([]),
	dueDate: z.string().datetime().optional(),
	assignedTo: z.string().optional()
});

export type CreateTaskRequest = z.infer<typeof createTaskSchema>;

/**
 * Update task request schema (all fields optional)
 */
export const updateTaskSchema = createTaskSchema.partial();

export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;

/**
 * Task list query parameters schema
 */
export const taskListQuerySchema = z.object({
	status: z.enum(['pending', 'in-progress', 'done', 'review', 'deferred', 'cancelled'])
		.optional(),
	priority: z.enum(['high', 'medium', 'low']).optional(),
	tags: z.union([z.string(), z.array(z.string())]).optional(),
	limit: z.coerce.number().int().positive().max(100).optional().default(20),
	offset: z.coerce.number().int().nonnegative().optional().default(0),
	sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority']).optional().default('createdAt'),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

/**
 * Batch create tasks request schema
 */
export const batchCreateTasksSchema = z.object({
	tasks: z.array(createTaskSchema).min(1, 'At least one task is required').max(100, 'Cannot create more than 100 tasks at once')
});

export type BatchCreateTasksRequest = z.infer<typeof batchCreateTasksSchema>;

/**
 * Batch update tasks request schema
 */
export const batchUpdateTasksSchema = z.object({
	updates: z.array(z.object({
		id: z.string().min(1, 'Task ID is required'),
		changes: updateTaskSchema
	})).min(1, 'At least one task update is required').max(100, 'Cannot update more than 100 tasks at once')
});

export type BatchUpdateTasksRequest = z.infer<typeof batchUpdateTasksSchema>;

/**
 * Task ID parameter schema
 */
export const taskIdParamSchema = z.object({
	id: z.string().min(1, 'Task ID is required')
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
