/**
 * @fileoverview TaskService Unit Tests
 *
 * Comprehensive tests for task service operations with TmCore integration
 */

import { jest } from '@jest/globals';
import { TaskService } from '../../../../../apps/api/src/services/task.service.js';

describe('TaskService', () => {
	let taskService;
	let mockTmCore;

	beforeEach(() => {
		// Clear mocks before each test
		jest.clearAllMocks();

		// Create mock TmCore instance
		mockTmCore = {
			tasks: {
				create: jest.fn(),
				get: jest.fn(),
				list: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
				getSubtasks: jest.fn(),
				createSubtask: jest.fn()
			}
		};

		taskService = new TaskService(mockTmCore);
	});

	describe('createTask()', () => {
		it('should create a task using TmCore when available', async () => {
			const createRequest = {
				title: 'Test Task',
				description: 'Test Description',
				priority: 'high',
				status: 'pending'
			};

			const mockTask = {
				id: 'task-1',
				...createRequest,
				tags: [],
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'user-1',
				subtasks: []
			};

			mockTmCore.tasks.create.mockResolvedValue(mockTask);

			const result = await taskService.createTask(createRequest);

			expect(mockTmCore.tasks.create).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Test Task',
					description: 'Test Description',
					priority: 'high',
					status: 'pending'
				})
			);
			expect(result).toEqual(mockTask);
		});

		it('should return fallback task when TmCore is unavailable', async () => {
			const taskServiceWithoutCore = new TaskService(null);

			const createRequest = {
				title: 'Test Task',
				description: 'Test Description',
				priority: 'high',
				status: 'pending'
			};

			const result = await taskServiceWithoutCore.createTask(createRequest);

			expect(result).toMatchObject({
				id: expect.stringMatching(/^task-/),
				title: 'Test Task',
				description: 'Test Description',
				priority: 'high',
				status: 'pending',
				tags: [],
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdBy: 'system',
				subtasks: []
			});
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it('should throw error when TmCore create fails', async () => {
			const createRequest = {
				title: 'Test Task'
			};

			mockTmCore.tasks.create.mockRejectedValue(new Error('Database error'));

			await expect(taskService.createTask(createRequest)).rejects.toThrow(
				'Failed to create task: Database error'
			);
		});
	});

	describe('getTask()', () => {
		it('should get a task by ID using TmCore', async () => {
			const mockTask = {
				id: 'task-1',
				title: 'Test Task',
				status: 'pending',
				priority: 'high',
				tags: [],
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system',
				subtasks: []
			};

			mockTmCore.tasks.get.mockResolvedValue(mockTask);

			const result = await taskService.getTask('task-1');

			expect(mockTmCore.tasks.get).toHaveBeenCalledWith('task-1');
			expect(result).toEqual(mockTask);
		});

		it('should return null when task does not exist', async () => {
			mockTmCore.tasks.get.mockResolvedValue(null);

			const result = await taskService.getTask('nonexistent');

			expect(result).toBeNull();
		});

		it('should throw error when taskId is empty', async () => {
			await expect(taskService.getTask('')).rejects.toThrow(
				'Task ID is required'
			);
			await expect(taskService.getTask('   ')).rejects.toThrow(
				'Task ID is required'
			);
		});

		it('should return fallback task when TmCore is unavailable', async () => {
			const taskServiceWithoutCore = new TaskService(null);

			const result = await taskServiceWithoutCore.getTask('task-1');

			expect(result).toMatchObject({
				id: 'task-1',
				title: 'Sample Task',
				status: 'pending',
				priority: 'medium',
				tags: [],
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdBy: 'system',
				subtasks: []
			});
		});
	});

	describe('listTasks()', () => {
		const mockTasks = [
			{
				id: 'task-1',
				title: 'Done Task 1',
				status: 'done',
				priority: 'high',
				tags: ['backend'],
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01'),
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdBy: 'user-1',
				subtasks: []
			},
			{
				id: 'task-2',
				title: 'Pending Task 2',
				status: 'pending',
				priority: 'high',
				tags: ['frontend', 'urgent'],
				createdAt: new Date('2025-01-02'),
				updatedAt: new Date('2025-01-02'),
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdBy: 'user-1',
				subtasks: []
			},
			{
				id: 'task-3',
				title: 'Pending Task 3',
				status: 'pending',
				priority: 'low',
				tags: ['backend'],
				createdAt: new Date('2025-01-03'),
				updatedAt: new Date('2025-01-03'),
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdBy: 'user-1',
				subtasks: []
			},
			{
				id: 'task-4',
				title: 'Done Task 4',
				status: 'done',
				priority: 'medium',
				tags: [],
				createdAt: new Date('2025-01-04'),
				updatedAt: new Date('2025-01-04'),
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdBy: 'user-1',
				subtasks: []
			}
		];

		beforeEach(() => {
			mockTmCore.tasks.list.mockResolvedValue(mockTasks);
		});

		it('should return all tasks with pagination', async () => {
			const query = {
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks).toHaveLength(4);
			expect(result.total).toBe(4);
			expect(result.limit).toBe(20);
			expect(result.offset).toBe(0);
			expect(result.hasMore).toBe(false);
		});

		it('should filter tasks by status', async () => {
			const query = {
				status: 'pending',
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks).toHaveLength(2);
			expect(result.total).toBe(2);
			expect(result.tasks.every(t => t.status === 'pending')).toBe(true);
		});

		it('should filter tasks by priority', async () => {
			const query = {
				priority: 'high',
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks).toHaveLength(2);
			expect(result.tasks.every(t => t.priority === 'high')).toBe(true);
		});

		it('should filter tasks by single tag (string)', async () => {
			const query = {
				tags: 'backend',
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks).toHaveLength(2);
			expect(result.tasks.every(t => t.tags.includes('backend'))).toBe(true);
		});

		it('should filter tasks by multiple tags (array)', async () => {
			const query = {
				tags: ['backend', 'frontend'],
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks).toHaveLength(3);
			expect(
				result.tasks.every(t =>
					t.tags.some(tag => ['backend', 'frontend'].includes(tag))
				)
			).toBe(true);
		});

		it('should sort by createdAt descending (default)', async () => {
			const query = {
				sortBy: 'createdAt',
				sortOrder: 'desc',
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks[0].id).toBe('task-4');
			expect(result.tasks[1].id).toBe('task-3');
			expect(result.tasks[2].id).toBe('task-2');
			expect(result.tasks[3].id).toBe('task-1');
		});

		it('should sort by createdAt ascending', async () => {
			const query = {
				sortBy: 'createdAt',
				sortOrder: 'asc',
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks[0].id).toBe('task-1');
			expect(result.tasks[1].id).toBe('task-2');
			expect(result.tasks[2].id).toBe('task-3');
			expect(result.tasks[3].id).toBe('task-4');
		});

		it('should combine filter and sorting', async () => {
			const query = {
				status: 'pending',
				sortBy: 'priority',
				sortOrder: 'asc',
				limit: 20,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks.every(t => t.status === 'pending')).toBe(true);
			expect(result.tasks).toHaveLength(2);
			// High should come before Low in ascending order
			const priorities = result.tasks.map(t => t.priority);
			expect(priorities[0]).toBe('high');
			expect(priorities[1]).toBe('low');
		});

		it('should apply pagination', async () => {
			const query = {
				limit: 2,
				offset: 0
			};

			const result = await taskService.listTasks(query);

			expect(result.tasks).toHaveLength(2);
			expect(result.total).toBe(4);
			expect(result.hasMore).toBe(true);

			const query2 = {
				limit: 2,
				offset: 2
			};

			const result2 = await taskService.listTasks(query2);

			expect(result2.tasks).toHaveLength(2);
			expect(result2.hasMore).toBe(false);
		});

		it('should return empty list when TmCore is unavailable', async () => {
			const taskServiceWithoutCore = new TaskService(null);

			const query = {
				limit: 20,
				offset: 0
			};

			const result = await taskServiceWithoutCore.listTasks(query);

			expect(result.tasks).toHaveLength(0);
			expect(result.total).toBe(0);
			expect(result.hasMore).toBe(false);
		});

		it('should throw error when list operation fails', async () => {
			mockTmCore.tasks.list.mockRejectedValue(new Error('DB error'));

			const query = {
				limit: 20,
				offset: 0
			};

			await expect(taskService.listTasks(query)).rejects.toThrow(
				'Failed to list tasks: DB error'
			);
		});
	});

	describe('updateTask()', () => {
		it('should update a task using TmCore', async () => {
			const updateRequest = {
				title: 'Updated Title',
				status: 'done'
			};

			const mockUpdatedTask = {
				id: 'task-1',
				...updateRequest,
				description: 'Original description',
				priority: 'high',
				tags: [],
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system',
				subtasks: []
			};

			mockTmCore.tasks.update.mockResolvedValue(mockUpdatedTask);

			const result = await taskService.updateTask('task-1', updateRequest);

			expect(mockTmCore.tasks.update).toHaveBeenCalledWith('task-1', updateRequest);
			expect(result).toEqual(mockUpdatedTask);
		});

		it('should throw error when taskId is empty', async () => {
			const updateRequest = { title: 'Updated' };

			await expect(
				taskService.updateTask('', updateRequest)
			).rejects.toThrow('Task ID is required');
		});

		it('should return fallback updated task when TmCore is unavailable', async () => {
			const taskServiceWithoutCore = new TaskService(null);

			const updateRequest = {
				title: 'Updated Task',
				status: 'done'
			};

			const result = await taskServiceWithoutCore.updateTask('task-1', updateRequest);

			expect(result).toMatchObject({
				id: 'task-1',
				title: 'Updated Task',
				status: 'done'
			});
		});
	});

	describe('deleteTask()', () => {
		it('should delete a task using TmCore', async () => {
			mockTmCore.tasks.delete.mockResolvedValue(undefined);

			const result = await taskService.deleteTask('task-1');

			expect(mockTmCore.tasks.delete).toHaveBeenCalledWith('task-1');
			expect(result).toEqual({ id: 'task-1', deleted: true });
		});

		it('should throw error when taskId is empty', async () => {
			await expect(taskService.deleteTask('')).rejects.toThrow(
				'Task ID is required'
			);
		});

		it('should return success when TmCore is unavailable', async () => {
			const taskServiceWithoutCore = new TaskService(null);

			const result = await taskServiceWithoutCore.deleteTask('task-1');

			expect(result).toEqual({ id: 'task-1', deleted: true });
		});
	});

	describe('getSubtasks()', () => {
		it('should get subtasks for a parent task', async () => {
			const mockSubtasks = [
				{
					id: 'task-1.1',
					title: 'Subtask 1',
					parentTaskId: 'task-1',
					status: 'pending',
					priority: 'medium',
					tags: [],
					dueDate: null,
					assignedTo: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					createdBy: 'system'
				}
			];

			mockTmCore.tasks.getSubtasks.mockResolvedValue(mockSubtasks);

			const result = await taskService.getSubtasks('task-1');

			expect(mockTmCore.tasks.getSubtasks).toHaveBeenCalledWith('task-1');
			expect(result).toEqual({
				parentTaskId: 'task-1',
				subtasks: mockSubtasks
			});
		});

		it('should return empty subtasks when none exist', async () => {
			mockTmCore.tasks.getSubtasks.mockResolvedValue([]);

			const result = await taskService.getSubtasks('task-1');

			expect(result).toEqual({
				parentTaskId: 'task-1',
				subtasks: []
			});
		});

		it('should throw error when parentTaskId is empty', async () => {
			await expect(taskService.getSubtasks('')).rejects.toThrow(
				'Task ID is required'
			);
		});

		it('should return empty subtasks when TmCore is unavailable', async () => {
			const taskServiceWithoutCore = new TaskService(null);

			const result = await taskServiceWithoutCore.getSubtasks('task-1');

			expect(result).toEqual({
				parentTaskId: 'task-1',
				subtasks: []
			});
		});
	});

	describe('createSubtask()', () => {
		it('should create a subtask using TmCore', async () => {
			const createRequest = {
				title: 'Subtask Title',
				description: 'Subtask Description',
				priority: 'high'
			};

			const mockSubtask = {
				id: 'task-1.1',
				parentTaskId: 'task-1',
				...createRequest,
				status: 'pending',
				tags: [],
				dueDate: null,
				assignedTo: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system'
			};

			mockTmCore.tasks.createSubtask.mockResolvedValue(mockSubtask);

			const result = await taskService.createSubtask('task-1', createRequest);

			expect(mockTmCore.tasks.createSubtask).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining(createRequest)
			);
			expect(result).toEqual(mockSubtask);
		});

		it('should throw error when parentTaskId is empty', async () => {
			const createRequest = { title: 'Subtask' };

			await expect(
				taskService.createSubtask('', createRequest)
			).rejects.toThrow('Parent Task ID is required');
		});

		it('should return fallback subtask when TmCore is unavailable', async () => {
			const taskServiceWithoutCore = new TaskService(null);

			const createRequest = {
				title: 'Subtask Title',
				description: 'Description'
			};

			const result = await taskServiceWithoutCore.createSubtask(
				'task-1',
				createRequest
			);

			expect(result).toMatchObject({
				id: expect.stringMatching(/^subtask-/),
				parentTaskId: 'task-1',
				title: 'Subtask Title',
				description: 'Description',
				status: 'pending',
				priority: 'medium'
			});
		});
	});

	describe('batchCreateTasks()', () => {
		it('should create multiple tasks', async () => {
			const createRequests = {
				tasks: [
					{ title: 'Task 1', priority: 'high' },
					{ title: 'Task 2', priority: 'low' }
				]
			};

			const mockTasks = createRequests.tasks.map((task, idx) => ({
				id: `task-${idx + 1}`,
				...task,
				status: 'pending',
				tags: [],
				dueDate: null,
				assignedTo: null,
				parentTaskId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'system',
				subtasks: []
			}));

			mockTmCore.tasks.create
				.mockResolvedValueOnce(mockTasks[0])
				.mockResolvedValueOnce(mockTasks[1]);

			const result = await taskService.batchCreateTasks(createRequests);

			expect(result.created).toBe(2);
			expect(result.tasks).toHaveLength(2);
			expect(mockTmCore.tasks.create).toHaveBeenCalledTimes(2);
		});
	});

	describe('batchUpdateTasks()', () => {
		it('should update multiple tasks', async () => {
			const updateRequest = {
				updates: [
					{ id: 'task-1', changes: { status: 'done' } },
					{ id: 'task-2', changes: { priority: 'high' } }
				]
			};

			const mockUpdatedTasks = [
				{ id: 'task-1', status: 'done', priority: 'medium' },
				{ id: 'task-2', status: 'pending', priority: 'high' }
			];

			mockTmCore.tasks.update
				.mockResolvedValueOnce(mockUpdatedTasks[0])
				.mockResolvedValueOnce(mockUpdatedTasks[1]);

			const result = await taskService.batchUpdateTasks(updateRequest);

			expect(result.updated).toBe(2);
			expect(result.tasks).toHaveLength(2);
			expect(mockTmCore.tasks.update).toHaveBeenCalledTimes(2);
		});
	});

	describe('batchDeleteTasks()', () => {
		it('should delete multiple tasks', async () => {
			const taskIds = ['task-1', 'task-2', 'task-3'];

			mockTmCore.tasks.delete.mockResolvedValue(undefined);

			const result = await taskService.batchDeleteTasks(taskIds);

			expect(result.deleted).toBe(3);
			expect(result.tasks).toHaveLength(3);
			expect(mockTmCore.tasks.delete).toHaveBeenCalledTimes(3);
		});

		it('should throw error when taskIds is empty', async () => {
			await expect(taskService.batchDeleteTasks([])).rejects.toThrow(
				'At least one task ID is required'
			);
		});
	});
});
