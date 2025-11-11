/**
 * @fileoverview Integration tests for TasksDomain
 * Tests task operations with real file system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTmCore, type TmCore, type Task } from '../../src/index.js';

describe('TasksDomain Integration', () => {
	let tmpDir: string;
	let tmCore: TmCore;

	// Sample tasks data
	const initialTasks: Task[] = [
		{
			id: '1',
			title: 'Setup project',
			description: 'Initialize the project structure',
			status: 'done',
			priority: 'high',
			dependencies: [],
			details: 'Create all necessary directories and config files',
			testStrategy: 'Manual verification',
			subtasks: [
				{
					id: 1,
					title: 'Create directories',
					description: 'Create project directories',
					status: 'done',
					dependencies: [],
					details: 'Create src, tests, docs directories',
					testStrategy: 'Check directories exist'
				},
				{
					id: 2,
					title: 'Initialize package.json',
					description: 'Create package.json file',
					status: 'done',
					dependencies: [],
					details: 'Run npm init',
					testStrategy: 'Verify package.json exists'
				}
			],
			tags: ['setup', 'infrastructure']
		},
		{
			id: '2',
			title: 'Implement core features',
			description: 'Build the main functionality',
			status: 'in-progress',
			priority: 'high',
			dependencies: ['1'],
			details: 'Implement all core business logic',
			testStrategy: 'Unit tests for all features',
			subtasks: [],
			tags: ['feature', 'core'],
			assignee: 'developer1'
		},
		{
			id: '3',
			title: 'Write documentation',
			description: 'Create user and developer docs',
			status: 'pending',
			priority: 'medium',
			dependencies: ['2'],
			details: 'Write comprehensive documentation',
			testStrategy: 'Review by team',
			subtasks: [],
			tags: ['documentation']
		},
		{
			id: '4',
			title: 'Performance optimization',
			description: 'Optimize for speed and efficiency',
			status: 'blocked',
			priority: 'low',
			dependencies: ['2'],
			details: 'Profile and optimize bottlenecks',
			testStrategy: 'Performance benchmarks',
			subtasks: [],
			assignee: 'developer2'
		},
		{
			id: '5',
			title: 'Security audit',
			description: 'Review security vulnerabilities',
			status: 'deferred',
			priority: 'critical',
			dependencies: [],
			details: 'Complete security assessment',
			testStrategy: 'Security scanning tools',
			subtasks: [],
			tags: ['security', 'audit']
		}
	];

	beforeEach(async () => {
		// Create temporary directory for test
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tm-core-tasks-test-'));

		// Create .taskmaster/tasks directory
		const tasksDir = path.join(tmpDir, '.taskmaster', 'tasks');
		await fs.mkdir(tasksDir, { recursive: true });

		// Write tasks.json with proper structure (legacy format with 'default' tag)
		const tasksFile = path.join(tasksDir, 'tasks.json');
		const tasksData = {
			default: {
				tasks: initialTasks,
				metadata: {
					version: '1.0.0',
					lastModified: new Date().toISOString(),
					taskCount: initialTasks.length,
					completedCount: 1,
					tags: ['default']
				}
			}
		};
		await fs.writeFile(tasksFile, JSON.stringify(tasksData, null, 2));

		// Create TmCore instance
		tmCore = await createTmCore({ projectPath: tmpDir });
	});

	afterEach(async () => {
		// Remove temp directory
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe('list', () => {
		it('should list all tasks', async () => {
			const result = await tmCore.tasks.list({ tag: 'default' });

			expect(result.tasks).toHaveLength(5);
			expect(result.total).toBe(5);
			expect(result.filtered).toBe(5);
			expect(result.tag).toBe('default');
		});

		it('should include subtasks by default', async () => {
			const result = await tmCore.tasks.list({ tag: 'default' });
			const setupTask = result.tasks.find((t) => t.id === '1');

			expect(setupTask?.subtasks).toHaveLength(2);
			expect(setupTask?.subtasks?.[0].title).toBe('Create directories');
		});

		it('should exclude subtasks when requested', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				includeSubtasks: false
			});
			const setupTask = result.tasks.find((t) => t.id === '1');

			expect(setupTask?.subtasks).toHaveLength(0);
		});
	});

	describe('filtering', () => {
		it('should filter by single status', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				filter: { status: 'done' }
			});

			expect(result.filtered).toBe(1);
			expect(result.tasks[0].id).toBe('1');
		});

		it('should filter by multiple statuses', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				filter: { status: ['done', 'in-progress'] }
			});

			expect(result.filtered).toBe(2);
			const ids = result.tasks.map((t) => t.id);
			expect(ids).toContain('1');
			expect(ids).toContain('2');
		});

		it('should filter by priority', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				filter: { priority: 'high' }
			});

			expect(result.filtered).toBe(2);
		});

		it('should filter by tags', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				filter: { tags: ['setup'] }
			});

			expect(result.filtered).toBe(1);
			expect(result.tasks[0].id).toBe('1');
		});

		it('should filter by assignee', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				filter: { assignee: 'developer1' }
			});

			expect(result.filtered).toBe(1);
			expect(result.tasks[0].id).toBe('2');
		});

		it('should filter by search term', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				filter: { search: 'documentation' }
			});

			expect(result.filtered).toBe(1);
			expect(result.tasks[0].id).toBe('3');
		});

		it('should filter by hasSubtasks', async () => {
			const withSubtasks = await tmCore.tasks.list({
				tag: 'default',
				filter: { hasSubtasks: true }
			});

			expect(withSubtasks.filtered).toBe(1);
			expect(withSubtasks.tasks[0].id).toBe('1');

			const withoutSubtasks = await tmCore.tasks.list({
				tag: 'default',
				filter: { hasSubtasks: false }
			});

			expect(withoutSubtasks.filtered).toBe(4);
		});

		it('should handle combined filters', async () => {
			const result = await tmCore.tasks.list({
				tag: 'default',
				filter: {
					priority: ['high', 'critical'],
					status: ['pending', 'deferred']
				}
			});

			expect(result.filtered).toBe(1);
			expect(result.tasks[0].id).toBe('5'); // Critical priority, deferred status
		});
	});

	describe('get', () => {
		it('should get task by ID', async () => {
			const result = await tmCore.tasks.get('2', 'default');

			expect(result.task).not.toBeNull();
			expect(result.isSubtask).toBe(false);
			if (!result.isSubtask && result.task) {
				expect(result.task.title).toBe('Implement core features');
			}
		});

		it('should get subtask by dotted ID', async () => {
			const result = await tmCore.tasks.get('1.1', 'default');

			expect(result.task).not.toBeNull();
			expect(result.isSubtask).toBe(true);
			if (result.isSubtask && result.task) {
				expect(result.task.title).toBe('Create directories');
			}
		});

		it('should return null for non-existent task', async () => {
			const result = await tmCore.tasks.get('999', 'default');

			expect(result.task).toBeNull();
			expect(result.isSubtask).toBe(false);
		});

		it('should return null for non-existent subtask', async () => {
			const result = await tmCore.tasks.get('1.999', 'default');

			expect(result.task).toBeNull();
			expect(result.isSubtask).toBe(true);
		});
	});

	describe('getByStatus', () => {
		it('should get tasks by single status', async () => {
			const pending = await tmCore.tasks.getByStatus('pending', 'default');

			expect(pending).toHaveLength(1);
			expect(pending[0].id).toBe('3');
		});

		it('should get tasks by multiple statuses', async () => {
			const multiple = await tmCore.tasks.getByStatus(
				['done', 'blocked'],
				'default'
			);

			expect(multiple).toHaveLength(2);
			const ids = multiple.map((t) => t.id);
			expect(ids).toContain('1');
			expect(ids).toContain('4');
		});
	});

	describe('getStats', () => {
		it('should get task statistics', async () => {
			const stats = await tmCore.tasks.getStats('default');

			expect(stats.total).toBe(5);
			expect(stats.byStatus.done).toBe(1);
			expect(stats.byStatus['in-progress']).toBe(1);
			expect(stats.byStatus.pending).toBe(1);
			expect(stats.byStatus.blocked).toBe(1);
			expect(stats.byStatus.deferred).toBe(1);
			expect(stats.byStatus.cancelled).toBe(0);
			expect(stats.byStatus.review).toBe(0);
			expect(stats.withSubtasks).toBe(1);
			expect(stats.blocked).toBe(1);
		});
	});

	describe('update', () => {
		it('should update task properties', async () => {
			await tmCore.tasks.update('2', { priority: 'critical' }, 'default');

			const result = await tmCore.tasks.get('2', 'default');
			if (!result.isSubtask && result.task) {
				expect(result.task.priority).toBe('critical');
			}
		});

		it('should persist updates to file system', async () => {
			await tmCore.tasks.update(
				'3',
				{ status: 'in-progress', assignee: 'developer3' },
				'default'
			);

			// Read directly from file
			const tasksFile = await fs.readFile(
				path.join(tmpDir, '.taskmaster', 'tasks', 'tasks.json'),
				'utf-8'
			);
			const tasksData = JSON.parse(tasksFile);
			const task3 = tasksData.default.tasks.find((t: Task) => t.id === '3');

			expect(task3.status).toBe('in-progress');
			expect(task3.assignee).toBe('developer3');
		});
	});

	describe('updateStatus', () => {
		it('should update task status', async () => {
			const result = await tmCore.tasks.updateStatus('3', 'done', 'default');

			expect(result.success).toBe(true);
			expect(result.oldStatus).toBe('pending');
			expect(result.newStatus).toBe('done');
			expect(result.taskId).toBe('3');
		});

		it('should update subtask status', async () => {
			const result = await tmCore.tasks.updateStatus(
				'1.1',
				'in-progress',
				'default'
			);

			expect(result.success).toBe(true);
			expect(result.oldStatus).toBe('done');
			expect(result.newStatus).toBe('in-progress');
			expect(result.taskId).toBe('1.1');
		});

		it('should persist status updates to file system', async () => {
			await tmCore.tasks.updateStatus('4', 'in-progress', 'default');

			// Read directly from file
			const tasksFile = await fs.readFile(
				path.join(tmpDir, '.taskmaster', 'tasks', 'tasks.json'),
				'utf-8'
			);
			const tasksData = JSON.parse(tasksFile);
			const task4 = tasksData.default.tasks.find((t: Task) => t.id === '4');

			expect(task4.status).toBe('in-progress');
		});
	});

	describe('getNext', () => {
		it('should get next available task', async () => {
			const next = await tmCore.tasks.getNext('default');

			expect(next).not.toBeNull();
			// Task 2 is in-progress with dependencies satisfied (Task 1 is done)
			// getNext() returns in-progress tasks, so Task 2 should be returned
			if (next) {
				expect(String(next.id)).toBe('2');
			}
		});

		it('should return null when no tasks are available', async () => {
			// Mark all tasks as done
			await tmCore.tasks.updateStatus('2', 'done', 'default');
			await tmCore.tasks.updateStatus('3', 'done', 'default');
			await tmCore.tasks.updateStatus('4', 'done', 'default');
			await tmCore.tasks.updateStatus('5', 'done', 'default');

			const next = await tmCore.tasks.getNext('default');

			expect(next).toBeNull();
		});
	});

	describe('getStorageType', () => {
		it('should return file storage type', () => {
			const storageType = tmCore.tasks.getStorageType();

			expect(storageType).toBe('file');
		});
	});

	describe('multi-tag support', () => {
		beforeEach(async () => {
			// Create tasks for a different tag
			const featureTasks: Task[] = [
				{
					id: 'feature-1',
					title: 'Feature task',
					description: 'Task for feature branch',
					status: 'pending',
					priority: 'medium',
					dependencies: [],
					details: 'Feature implementation',
					testStrategy: 'Unit tests',
					subtasks: []
				}
			];

			const tasksFile = path.join(tmpDir, '.taskmaster', 'tasks', 'tasks.json');
			const content = await fs.readFile(tasksFile, 'utf-8');
			const data = JSON.parse(content);

			// Add feature tag
			data['feature-branch'] = {
				tasks: featureTasks,
				metadata: {
					version: '1.0.0',
					lastModified: new Date().toISOString(),
					taskCount: 1,
					completedCount: 0,
					tags: ['feature-branch']
				}
			};

			await fs.writeFile(tasksFile, JSON.stringify(data, null, 2));
		});

		it('should list tasks for specific tag', async () => {
			const result = await tmCore.tasks.list({ tag: 'feature-branch' });

			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].id).toBe('feature-1');
			expect(result.tag).toBe('feature-branch');
		});

		it('should get task from specific tag', async () => {
			const result = await tmCore.tasks.get('feature-1', 'feature-branch');

			expect(result.task).not.toBeNull();
			if (!result.isSubtask && result.task) {
				expect(result.task.title).toBe('Feature task');
			}
		});

		it('should update task in specific tag', async () => {
			await tmCore.tasks.update(
				'feature-1',
				{ status: 'in-progress' },
				'feature-branch'
			);

			const result = await tmCore.tasks.get('feature-1', 'feature-branch');
			if (!result.isSubtask && result.task) {
				expect(result.task.status).toBe('in-progress');
			}
		});
	});
});
