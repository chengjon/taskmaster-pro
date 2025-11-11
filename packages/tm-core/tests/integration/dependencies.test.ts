/**
 * @fileoverview Integration tests for DependenciesDomain
 * Tests the dependencies domain with real file system operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTmCore, type TmCore, type Task } from '../../src/index.js';

describe('DependenciesDomain Integration', () => {
	let tmpDir: string;
	let tmCore: TmCore;

	// Sample tasks data
	const initialTasks: Task[] = [
		{
			id: '1',
			title: 'Task 1',
			description: 'First task',
			status: 'pending',
			priority: 'medium',
			dependencies: [],
			details: 'Implementation details',
			testStrategy: 'Unit tests',
			subtasks: []
		},
		{
			id: '2',
			title: 'Task 2',
			description: 'Second task',
			status: 'pending',
			priority: 'medium',
			dependencies: [],
			details: 'Implementation details',
			testStrategy: 'Unit tests',
			subtasks: []
		},
		{
			id: '3',
			title: 'Task 3',
			description: 'Third task',
			status: 'pending',
			priority: 'medium',
			dependencies: [],
			details: 'Implementation details',
			testStrategy: 'Unit tests',
			subtasks: []
		}
	];

	beforeEach(async () => {
		// Create temporary directory for test
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tm-core-deps-test-'));

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
					completedCount: 0,
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

	// Helper function to modify tasks.json directly
	async function modifyTasksFile(
		modifier: (tasks: Task[]) => Task[]
	): Promise<void> {
		const tasksFile = path.join(tmpDir, '.taskmaster', 'tasks', 'tasks.json');
		const content = await fs.readFile(tasksFile, 'utf-8');
		const data = JSON.parse(content);
		// Modify the tasks array within the default tag's structure
		data.default.tasks = modifier(data.default.tasks);
		// Update metadata
		data.default.metadata.lastModified = new Date().toISOString();
		data.default.metadata.taskCount = data.default.tasks.length;
		await fs.writeFile(tasksFile, JSON.stringify(data, null, 2));
	}

	describe('validate', () => {
		it('should validate tasks with no dependencies', async () => {
			const result = await tmCore.dependencies.validate('default');

			expect(result.valid).toBe(true);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect self-dependencies', async () => {
			// Manually add self-dependency via file modification
			await modifyTasksFile((tasks) => {
				tasks[0].dependencies = ['1'];
				return tasks;
			});

			const result = await tmCore.dependencies.validate('default');

			expect(result.valid).toBe(false);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].type).toBe('self');
			expect(result.issues[0].taskId).toBe('1');
		});

		it('should detect missing dependencies', async () => {
			// Add dependency to non-existent task
			await modifyTasksFile((tasks) => {
				tasks[0].dependencies = ['999'];
				return tasks;
			});

			const result = await tmCore.dependencies.validate('default');

			expect(result.valid).toBe(false);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].type).toBe('missing');
			expect(result.issues[0].dependencyId).toBe('999');
		});

		it('should detect circular dependencies', async () => {
			// Create circular dependency: 1 -> 2 -> 1
			await modifyTasksFile((tasks) => {
				tasks[0].dependencies = ['2'];
				tasks[1].dependencies = ['1'];
				return tasks;
			});

			const result = await tmCore.dependencies.validate('default');

			expect(result.valid).toBe(false);
			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.issues.some((issue) => issue.type === 'circular')).toBe(
				true
			);
		});

		it('should validate subtask dependencies', async () => {
			// Add task with subtasks
			await modifyTasksFile((tasks) => {
				tasks[0].subtasks = [
					{
						id: 1,
						title: 'Subtask 1.1',
						description: 'First subtask',
						status: 'pending',
						dependencies: ['999'], // Invalid dependency
						details: '',
						testStrategy: ''
					}
				];
				return tasks;
			});

			const result = await tmCore.dependencies.validate('default');

			expect(result.valid).toBe(false);
			expect(result.issues.some((issue) => issue.taskId === '1.1')).toBe(true);
		});
	});

	describe('add', () => {
		it('should add a dependency between two tasks', async () => {
			await tmCore.dependencies.add('2', '1', 'default');

			const deps = await tmCore.dependencies.getDependencies('2', 'default');
			expect(deps).toContain('1');
		});

		it('should prevent self-dependencies', async () => {
			await expect(tmCore.dependencies.add('1', '1', 'default')).rejects.toThrow(
				'self-dependency'
			);
		});

		it('should prevent circular dependencies', async () => {
			// First add 1 -> 2
			await tmCore.dependencies.add('1', '2', 'default');

			// Try to add 2 -> 1 (would create circular dependency)
			await expect(tmCore.dependencies.add('2', '1', 'default')).rejects.toThrow(
				'circular dependency'
			);
		});

		it('should persist dependencies to file system', async () => {
			await tmCore.dependencies.add('3', '1', 'default');
			await tmCore.dependencies.add('3', '2', 'default');

			// Read directly from file
			const tasksFile = await fs.readFile(
				path.join(tmpDir, '.taskmaster', 'tasks', 'tasks.json'),
				'utf-8'
			);
			const tasksData = JSON.parse(tasksFile);
			const task3 = tasksData.default.tasks.find((t: Task) => t.id === '3');

			expect(task3.dependencies).toEqual(['1', '2']);
		});

		it('should handle complex dependency chains', async () => {
			// Create chain: 3 -> 2 -> 1
			await tmCore.dependencies.add('2', '1', 'default');
			await tmCore.dependencies.add('3', '2', 'default');

			const deps2 = await tmCore.dependencies.getDependencies('2', 'default');
			const deps3 = await tmCore.dependencies.getDependencies('3', 'default');

			expect(deps2).toEqual(['1']);
			expect(deps3).toEqual(['2']);

			// Verify circular prevention still works
			await expect(tmCore.dependencies.add('1', '3', 'default')).rejects.toThrow(
				'circular dependency'
			);
		});
	});

	describe('remove', () => {
		it('should remove a dependency', async () => {
			// Add dependency first
			await tmCore.dependencies.add('2', '1', 'default');
			expect(await tmCore.dependencies.getDependencies('2', 'default')).toContain('1');

			// Remove it
			await tmCore.dependencies.remove('2', '1', 'default');
			expect(await tmCore.dependencies.getDependencies('2', 'default')).not.toContain('1');
		});

		it('should persist removal to file system', async () => {
			await tmCore.dependencies.add('2', '1', 'default');
			await tmCore.dependencies.remove('2', '1', 'default');

			// Read directly from file
			const tasksFile = await fs.readFile(
				path.join(tmpDir, '.taskmaster', 'tasks', 'tasks.json'),
				'utf-8'
			);
			const tasksData = JSON.parse(tasksFile);
			const task2 = tasksData.default.tasks.find((t: Task) => t.id === '2');

			expect(task2.dependencies || []).not.toContain('1');
		});

		it('should handle removing non-existent dependency gracefully', async () => {
			// Should not throw error
			await expect(
				tmCore.dependencies.remove('2', '999', 'default')
			).resolves.not.toThrow();
		});
	});

	describe('getDependencies', () => {
		it('should return empty array for task with no dependencies', async () => {
			const deps = await tmCore.dependencies.getDependencies('1', 'default');
			expect(deps).toEqual([]);
		});

		it('should return all dependencies for a task', async () => {
			await tmCore.dependencies.add('3', '1', 'default');
			await tmCore.dependencies.add('3', '2', 'default');

			const deps = await tmCore.dependencies.getDependencies('3', 'default');
			expect(deps).toHaveLength(2);
			expect(deps).toContain('1');
			expect(deps).toContain('2');
		});

		it('should handle subtask dependencies', async () => {
			// Add task with subtask
			await modifyTasksFile((tasks) => {
				tasks[0].subtasks = [
					{
						id: 1,
						title: 'Subtask 1.1',
						description: 'First subtask',
						status: 'pending',
						dependencies: ['2', '3'],
						details: '',
						testStrategy: ''
					}
				];
				return tasks;
			});

			const deps = await tmCore.dependencies.getDependencies('1.1', 'default');
			expect(deps).toEqual(['2', '3']);
		});
	});

	describe('getDependents', () => {
		it('should return empty array for task with no dependents', async () => {
			const dependents = await tmCore.dependencies.getDependents('3', 'default');
			expect(dependents).toEqual([]);
		});

		it('should return all tasks that depend on a given task', async () => {
			await tmCore.dependencies.add('2', '1', 'default');
			await tmCore.dependencies.add('3', '1', 'default');

			const dependents = await tmCore.dependencies.getDependents('1', 'default');
			expect(dependents).toHaveLength(2);
			expect(dependents).toContain('2');
			expect(dependents).toContain('3');
		});

		it('should find dependents across the dependency tree', async () => {
			// Create chain: 3 -> 2 -> 1
			await tmCore.dependencies.add('2', '1', 'default');
			await tmCore.dependencies.add('3', '2', 'default');

			const dependents1 = await tmCore.dependencies.getDependents('1', 'default');
			const dependents2 = await tmCore.dependencies.getDependents('2', 'default');

			expect(dependents1).toContain('2');
			expect(dependents2).toContain('3');
		});
	});

	describe('fix', () => {
		it('should remove self-dependencies', async () => {
			await modifyTasksFile((tasks) => {
				tasks[0].dependencies = ['1']; // Self-dependency
				return tasks;
			});

			const result = await tmCore.dependencies.fix('default');

			expect(result.removedCount).toBeGreaterThan(0);

			const validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(true);
		});

		it('should remove missing dependencies', async () => {
			await modifyTasksFile((tasks) => {
				tasks[0].dependencies = ['999', '888']; // Non-existent tasks
				return tasks;
			});

			const result = await tmCore.dependencies.fix('default');

			expect(result.removedCount).toBe(2);

			const validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(true);
		});

		it('should remove duplicate dependencies', async () => {
			await modifyTasksFile((tasks) => {
				tasks[1].dependencies = ['1', '1', '1']; // Duplicates
				return tasks;
			});

			const result = await tmCore.dependencies.fix('default');

			expect(result.duplicatesRemoved).toBe(2);

			const deps = await tmCore.dependencies.getDependencies('2', 'default');
			expect(deps).toEqual(['1']);
		});

		it('should fix multiple issues at once', async () => {
			await modifyTasksFile((tasks) => {
				tasks[0].dependencies = ['1', '999']; // Self + missing
				tasks[1].dependencies = ['1', '1', '888']; // Duplicate + missing
				return tasks;
			});

			const result = await tmCore.dependencies.fix('default');

			expect(result.removedCount).toBeGreaterThan(0);
			expect(result.duplicatesRemoved).toBeGreaterThan(0);

			const validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(true);
		});

		it('should persist fixes to file system', async () => {
			await modifyTasksFile((tasks) => {
				tasks[0].dependencies = ['1', '999']; // Self + missing
				return tasks;
			});

			await tmCore.dependencies.fix('default');

			// Read directly from file
			const tasksFile = await fs.readFile(
				path.join(tmpDir, '.taskmaster', 'tasks', 'tasks.json'),
				'utf-8'
			);
			const tasksData = JSON.parse(tasksFile);
			const task1 = tasksData.default.tasks.find((t: Task) => t.id === '1');

			expect(task1.dependencies || []).toHaveLength(0);
		});
	});

	describe('real-world scenarios', () => {
		it('should handle complex task hierarchy with subtasks', async () => {
			// Create complex task structure
			await modifyTasksFile((tasks) => {
				tasks[0].subtasks = [
					{
						id: 1,
						title: 'Subtask 1.1',
						description: 'First subtask',
						status: 'pending',
						dependencies: [],
						details: '',
						testStrategy: ''
					},
					{
						id: 2,
						title: 'Subtask 1.2',
						description: 'Second subtask',
						status: 'pending',
						dependencies: ['1'], // Depends on parent's subtask 1
						details: '',
						testStrategy: ''
					}
				];
				return tasks;
			});

			// Add dependency to task 2
			await tmCore.dependencies.add('2', '1', 'default');

			const validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(true);

			const deps = await tmCore.dependencies.getDependencies('2', 'default');
			expect(deps).toContain('1');
		});

		it('should handle workflow: add, validate, remove, validate', async () => {
			// Add valid dependencies
			await tmCore.dependencies.add('3', '1', 'default');
			await tmCore.dependencies.add('3', '2', 'default');

			let validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(true);

			// Manually corrupt data
			await modifyTasksFile((tasks) => {
				if (!tasks[2].dependencies) tasks[2].dependencies = [];
				tasks[2].dependencies.push('999'); // Add invalid dependency
				return tasks;
			});

			validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(false);
			expect(validation.issues).toHaveLength(1);

			// Fix issues
			await tmCore.dependencies.fix('default');

			validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(true);
		});

		it('should prevent creating dependency chains that would block all tasks', async () => {
			// Try to create: 1 -> 2, 2 -> 3, 3 -> 1 (circular)
			await tmCore.dependencies.add('1', '2', 'default');
			await tmCore.dependencies.add('2', '3', 'default');

			// This should fail
			await expect(tmCore.dependencies.add('3', '1', 'default')).rejects.toThrow(
				'circular dependency'
			);

			// Verify we can still work with valid dependencies
			const validation = await tmCore.dependencies.validate('default');
			expect(validation.valid).toBe(true);

			const deps1 = await tmCore.dependencies.getDependencies('1', 'default');
			const deps2 = await tmCore.dependencies.getDependencies('2', 'default');
			expect(deps1).toEqual(['2']);
			expect(deps2).toEqual(['3']);
		});
	});
});
