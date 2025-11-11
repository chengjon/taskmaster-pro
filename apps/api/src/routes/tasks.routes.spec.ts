/**
 * @fileoverview Task Routes Integration Tests
 *
 * Tests for task management endpoints using Supertest
 */

import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { createApp } from '../app.js';
import type { Express } from 'express';

// Generate valid JWT token for testing
function generateTestToken() {
	const payload = {
		sub: 'test-user-123',
		email: 'test@example.com',
		role: 'user'
	};
	const secret = process.env.SUPABASE_JWT_SECRET || 'dev-secret-key';
	const token = sign(payload, secret, {
		algorithm: 'HS256',
		issuer: 'supabase',
		audience: 'authenticated',
		expiresIn: '1h'
	});
	return token;
}

describe('Task Routes - Integration Tests', () => {
	let app: Express;
	let testToken: string;

	beforeAll(() => {
		// Create app without tmCore (uses mock data)
		app = createApp();
		testToken = generateTestToken();
	});

	describe('POST /api/v1/tasks - Create Task', () => {
		it('should create a new task with valid data', async () => {
			const newTask = {
				title: 'Test Task',
				description: 'This is a test task',
				priority: 'high',
				status: 'pending'
			};

			const response = await request(app)
				.post('/api/v1/tasks')
				.set('Authorization', `Bearer ${testToken}`)
				.send(newTask);

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toBeDefined();
			expect(response.body.data.title).toBe(newTask.title);
			expect(response.body.data.priority).toBe(newTask.priority);
		});

		it('should return 400 when title is missing', async () => {
			const invalidTask = {
				description: 'Missing title',
				priority: 'medium'
			};

			const response = await request(app)
				.post('/api/v1/tasks')
				.set('Authorization', `Bearer ${testToken}`)
				.send(invalidTask);

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});

		it('should return 400 when title is empty string', async () => {
			const invalidTask = {
				title: '',
				description: 'Empty title'
			};

			const response = await request(app)
				.post('/api/v1/tasks')
				.set('Authorization', `Bearer ${testToken}`)
				.send(invalidTask);

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});

		it('should set default values for optional fields', async () => {
			const minimalTask = {
				title: 'Minimal Task'
			};

			const response = await request(app)
				.post('/api/v1/tasks')
				.set('Authorization', `Bearer ${testToken}`)
				.send(minimalTask);

			expect(response.status).toBe(201);
			expect(response.body.data.priority).toBe('medium');
			expect(response.body.data.status).toBe('pending');
			expect(response.body.data.tags).toEqual([]);
		});

		it('should require authentication', async () => {
			const newTask = { title: 'Test Task' };

			const response = await request(app)
				.post('/api/v1/tasks')
				.send(newTask);

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('GET /api/v1/tasks - List Tasks', () => {
		it('should return empty task list with pagination info', async () => {
			const response = await request(app)
				.get('/api/v1/tasks')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toBeDefined();
			expect(response.body.data.tasks).toEqual([]);
			expect(response.body.data.total).toBeDefined();
			expect(response.body.data.limit).toBeDefined();
			expect(response.body.data.offset).toBeDefined();
		});

		it('should support pagination with limit and offset', async () => {
			const response = await request(app)
				.get('/api/v1/tasks?limit=50&offset=10')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data.limit).toBe(50);
			expect(response.body.data.offset).toBe(10);
		});

		it('should filter by status', async () => {
			const response = await request(app)
				.get('/api/v1/tasks?status=in-progress')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should filter by priority', async () => {
			const response = await request(app)
				.get('/api/v1/tasks?priority=high')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should support sorting by different fields', async () => {
			const response = await request(app)
				.get('/api/v1/tasks?sortBy=dueDate&sortOrder=asc')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should require authentication', async () => {
			const response = await request(app).get('/api/v1/tasks');

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('GET /api/v1/tasks/:id - Get Task', () => {
		it('should return a task by ID', async () => {
			const response = await request(app)
				.get('/api/v1/tasks/task-123')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toBeDefined();
			expect(response.body.data.id).toBe('task-123');
		});

		it('should require authentication', async () => {
			const response = await request(app).get('/api/v1/tasks/task-123');

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('PATCH /api/v1/tasks/:id - Update Task', () => {
		it('should update a task with valid data', async () => {
			const updates = {
				title: 'Updated Task Title',
				status: 'in-progress'
			};

			const response = await request(app)
				.patch('/api/v1/tasks/task-123')
				.set('Authorization', `Bearer ${testToken}`)
				.send(updates);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toBeDefined();
		});

		it('should allow partial updates', async () => {
			const updates = { priority: 'high' };

			const response = await request(app)
				.patch('/api/v1/tasks/task-123')
				.set('Authorization', `Bearer ${testToken}`)
				.send(updates);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should require authentication', async () => {
			const response = await request(app)
				.patch('/api/v1/tasks/task-123')
				.send({ title: 'Updated' });

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('DELETE /api/v1/tasks/:id - Delete Task', () => {
		it('should delete a task by ID', async () => {
			const response = await request(app)
				.delete('/api/v1/tasks/task-123')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.deleted).toBe(true);
		});

		it('should require authentication', async () => {
			const response = await request(app).delete('/api/v1/tasks/task-123');

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('GET /api/v1/tasks/:id/subtasks - Get Subtasks', () => {
		it('should return subtasks of a task', async () => {
			const response = await request(app)
				.get('/api/v1/tasks/task-123/subtasks')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.parentTaskId).toBe('task-123');
			expect(response.body.data.subtasks).toBeDefined();
		});

		it('should require authentication', async () => {
			const response = await request(app).get('/api/v1/tasks/task-123/subtasks');

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('POST /api/v1/tasks/:id/subtasks - Create Subtask', () => {
		it('should create a subtask', async () => {
			const subtaskData = {
				title: 'Subtask 1',
				priority: 'medium'
			};

			const response = await request(app)
				.post('/api/v1/tasks/task-123/subtasks')
				.set('Authorization', `Bearer ${testToken}`)
				.send(subtaskData);

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data.parentTaskId).toBe('task-123');
		});

		it('should require authentication', async () => {
			const response = await request(app)
				.post('/api/v1/tasks/task-123/subtasks')
				.send({ title: 'Subtask' });

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('POST /api/v1/tasks/batch/create - Batch Create Tasks', () => {
		it('should create multiple tasks at once', async () => {
			const batchData = {
				tasks: [
					{ title: 'Task 1' },
					{ title: 'Task 2', priority: 'high' },
					{ title: 'Task 3', status: 'done' }
				]
			};

			const response = await request(app)
				.post('/api/v1/tasks/batch/create')
				.set('Authorization', `Bearer ${testToken}`)
				.send(batchData);

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data.created).toBe(3);
			expect(response.body.data.tasks).toHaveLength(3);
		});

		it('should reject empty batch', async () => {
			const invalidBatch = { tasks: [] };

			const response = await request(app)
				.post('/api/v1/tasks/batch/create')
				.set('Authorization', `Bearer ${testToken}`)
				.send(invalidBatch);

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});

		it('should require authentication', async () => {
			const response = await request(app)
				.post('/api/v1/tasks/batch/create')
				.send({ tasks: [{ title: 'Task' }] });

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('PATCH /api/v1/tasks/batch/update - Batch Update Tasks', () => {
		it('should update multiple tasks at once', async () => {
			const batchData = {
				updates: [
					{ id: 'task-1', changes: { status: 'done' } },
					{ id: 'task-2', changes: { priority: 'high' } }
				]
			};

			const response = await request(app)
				.patch('/api/v1/tasks/batch/update')
				.set('Authorization', `Bearer ${testToken}`)
				.send(batchData);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.updated).toBe(2);
		});

		it('should require authentication', async () => {
			const response = await request(app)
				.patch('/api/v1/tasks/batch/update')
				.send({
					updates: [{ id: 'task-1', changes: { status: 'done' } }]
				});

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('DELETE /api/v1/tasks/batch/delete - Batch Delete Tasks', () => {
		it('should delete multiple tasks at once', async () => {
			const batchData = {
				taskIds: ['task-1', 'task-2', 'task-3']
			};

			const response = await request(app)
				.delete('/api/v1/tasks/batch/delete')
				.set('Authorization', `Bearer ${testToken}`)
				.send(batchData);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.deleted).toBe(3);
		});

		it('should require authentication', async () => {
			const response = await request(app)
				.delete('/api/v1/tasks/batch/delete')
				.send({ taskIds: ['task-1'] });

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});

	describe('404 Handling', () => {
		it('should return 404 for non-existent routes', async () => {
			const response = await request(app)
				.get('/api/v1/nonexistent')
				.set('Authorization', `Bearer ${testToken}`);

			expect(response.status).toBe(404);
			expect(response.body.success).toBe(false);
		});
	});

	describe('Authentication', () => {
		it('should reject requests without Authorization header', async () => {
			const response = await request(app).get('/api/v1/tasks');

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toBeDefined();
		});

		it('should reject requests with invalid Bearer token format', async () => {
			const response = await request(app)
				.get('/api/v1/tasks')
				.set('Authorization', 'InvalidFormat token');

			expect(response.status).toBe(401);
			expect(response.body.success).toBe(false);
		});
	});
});
