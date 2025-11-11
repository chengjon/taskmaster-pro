/**
 * @fileoverview E2E Tests for Task Management Workflows
 * Tests core task management CLI commands with real file system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, type TestEnvironment } from '../utils';
import {
	assertTaskExists,
	assertTaskStatus,
	assertTaskCount,
	assertTaskProperties,
	assertOutputContains,
	assertCommandSuccess
} from '../utils';
import {
	simpleTasks,
	statusVarietyTasks,
	createTasksData
} from '../fixtures/sample-tasks';

describe('Task Management E2E', () => {
	let env: TestEnvironment;

	beforeEach(async () => {
		env = await createTestEnvironment('tm-e2e-task-mgmt-');
	});

	afterEach(async () => {
		await env.cleanup();
	});

	describe('list command', () => {
		beforeEach(async () => {
			// Setup tasks for listing tests
			const tasksData = createTasksData(simpleTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);
		});

		it('should list all tasks', async () => {
			const { stdout, stderr } = await env.runCLI('list');

			assertCommandSuccess(stderr);
			assertOutputContains(stdout, 'Setup project');
			assertOutputContains(stdout, 'Implement features');
			assertOutputContains(stdout, 'Write documentation');
		});

		it('should filter tasks by status', async () => {
			const { stdout } = await env.runCLI('list --status=done');

			assertOutputContains(stdout, 'Setup project');
			// Should not contain non-done tasks
			expect(stdout).not.toContain('Implement features');
		});

		it('should filter tasks by priority', async () => {
			const { stdout } = await env.runCLI('list --priority=high');

			assertOutputContains(stdout, 'Setup project');
			assertOutputContains(stdout, 'Implement features');
			// Should not contain medium priority tasks
			expect(stdout).not.toContain('Write documentation');
		});

		it('should support JSON output format', async () => {
			const { stdout } = await env.runCLI('list --format=json');

			// Should be valid JSON
			const data = JSON.parse(stdout);
			expect(data.tasks).toBeDefined();
			expect(Array.isArray(data.tasks)).toBe(true);
			expect(data.tasks.length).toBeGreaterThan(0);
		});
	});

	describe('show command', () => {
		beforeEach(async () => {
			const tasksData = createTasksData(simpleTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);
		});

		it('should show task details by ID', async () => {
			const { stdout, stderr } = await env.runCLI('show 1');

			assertCommandSuccess(stderr);
			assertOutputContains(stdout, 'Setup project');
			assertOutputContains(stdout, 'Initialize project structure');
			assertOutputContains(stdout, 'done');
		});

		it('should show subtask details with dotted ID', async () => {
			// Add a task with subtasks
			const tasksWithSubtasks = [
				{
					...simpleTasks[0],
					subtasks: [
						{
							id: 1,
							title: 'Create directories',
							description: 'Setup directory structure',
							status: 'done',
							dependencies: [],
							details: 'Create src, tests, docs',
							testStrategy: 'Verify directories exist'
						}
					]
				},
				...simpleTasks.slice(1)
			];

			const tasksData = createTasksData(tasksWithSubtasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);

			const { stdout } = await env.runCLI('show 1.1');

			assertOutputContains(stdout, 'Create directories');
			assertOutputContains(stdout, 'Setup directory structure');
		});

		it('should handle non-existent task ID', async () => {
			const { stdout, stderr } = await env.runCLI('show 999');

			// Should indicate task not found
			const output = stdout + stderr;
			expect(output.toLowerCase()).toContain('not found');
		});
	});

	describe('set-status command', () => {
		beforeEach(async () => {
			const tasksData = createTasksData(simpleTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);
		});

		it('should update task status to done', async () => {
			const { stdout, stderr } = await env.runCLI('set-status --id=2 --status=done');

			assertCommandSuccess(stderr);
			assertOutputContains(stdout, 'status');
			assertOutputContains(stdout, 'done');

			// Verify file was updated
			await assertTaskStatus(env, '2', 'done');
		});

		it('should update task status to in-progress', async () => {
			const { stdout } = await env.runCLI('set-status --id=3 --status=in-progress');

			assertOutputContains(stdout, 'in-progress');
			await assertTaskStatus(env, '3', 'in-progress');
		});

		it('should update subtask status', async () => {
			// Add a task with subtasks
			const tasksWithSubtasks = [
				{
					...simpleTasks[0],
					subtasks: [
						{
							id: 1,
							title: 'Create directories',
							description: 'Setup directory structure',
							status: 'done',
							dependencies: [],
							details: 'Create src, tests, docs',
							testStrategy: 'Verify directories exist'
						}
					]
				},
				...simpleTasks.slice(1)
			];

			const tasksData = createTasksData(tasksWithSubtasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);

			await env.runCLI('set-status --id=1.1 --status=in-progress');

			// Verify subtask status changed
			const task = await assertTaskExists(env, '1');
			expect(task.subtasks?.[0].status).toBe('in-progress');
		});

		it('should handle invalid status values', async () => {
			const { stdout, stderr } = await env.runCLI(
				'set-status --id=2 --status=invalid-status'
			);

			const output = stdout + stderr;
			expect(output.toLowerCase()).toContain('invalid');
		});
	});

	describe('next command', () => {
		beforeEach(async () => {
			const tasksData = createTasksData(simpleTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);
		});

		it('should get next available task', async () => {
			const { stdout, stderr } = await env.runCLI('next');

			assertCommandSuccess(stderr);
			// Task 2 is in-progress and should be returned
			assertOutputContains(stdout, 'Implement features');
		});

		it('should return null when no tasks available', async () => {
			// Mark all tasks as done
			await env.runCLI('set-status --id=2 --status=done');
			await env.runCLI('set-status --id=3 --status=done');

			const { stdout } = await env.runCLI('next');

			expect(stdout.toLowerCase()).toContain('no');
		});
	});

	describe('stats command', () => {
		beforeEach(async () => {
			const tasksData = createTasksData(statusVarietyTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);
		});

		it('should show task statistics', async () => {
			const { stdout, stderr } = await env.runCLI('stats');

			assertCommandSuccess(stderr);
			// Should show counts for different statuses
			assertOutputContains(stdout, 'done');
			assertOutputContains(stdout, 'pending');
			assertOutputContains(stdout, 'in-progress');
		});

		it('should include total count', async () => {
			const { stdout } = await env.runCLI('stats');

			// Should show total of 6 tasks
			assertOutputContains(stdout, '6');
		});
	});

	describe('multi-tag support', () => {
		beforeEach(async () => {
			// Create tasks in multiple tags
			const masterTasks = createTasksData(simpleTasks, 'master');
			const featureTasks = createTasksData(
				[
					{
						id: 'feature-1',
						title: 'Feature task',
						description: 'Task for feature branch',
						status: 'pending',
						priority: 'high',
						dependencies: [],
						details: 'Feature implementation',
						testStrategy: 'Unit tests',
						subtasks: []
					}
				],
				'feature-branch'
			);

			const tasksData = { ...masterTasks, ...featureTasks };
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);
		});

		it('should list tasks from specific tag', async () => {
			const { stdout } = await env.runCLI('list --tag=feature-branch');

			assertOutputContains(stdout, 'Feature task');
			// Should not contain master tasks
			expect(stdout).not.toContain('Setup project');
		});

		it('should show task from specific tag', async () => {
			const { stdout } = await env.runCLI('show feature-1 --tag=feature-branch');

			assertOutputContains(stdout, 'Feature task');
			assertOutputContains(stdout, 'Feature implementation');
		});

		it('should update task in specific tag', async () => {
			await env.runCLI(
				'set-status --id=feature-1 --status=done --tag=feature-branch'
			);

			// Verify task in feature-branch was updated
			await assertTaskStatus(env, 'feature-1', 'done', 'feature-branch');

			// Verify master tasks unchanged
			await assertTaskStatus(env, '2', 'in-progress', 'master');
		});
	});

	describe('error handling', () => {
		beforeEach(async () => {
			const tasksData = createTasksData(simpleTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);
		});

		it('should handle missing required arguments', async () => {
			const { stdout, stderr } = await env.runCLI('set-status');

			const output = stdout + stderr;
			expect(output.toLowerCase()).toMatch(/error|required|missing/);
		});

		it('should handle corrupted tasks.json', async () => {
			// Write invalid JSON
			await env.writeFile('.taskmaster/tasks/tasks.json', '{ invalid json');

			const { stdout, stderr } = await env.runCLI('list');

			const output = stdout + stderr;
			expect(output.toLowerCase()).toContain('error');
		});
	});

	describe('persistence verification', () => {
		it('should persist status changes across multiple commands', async () => {
			const tasksData = createTasksData(simpleTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);

			// Change status
			await env.runCLI('set-status --id=2 --status=done');

			// Verify with show command
			const { stdout } = await env.runCLI('show 2');
			assertOutputContains(stdout, 'done');

			// Verify with list command
			const { stdout: listOutput } = await env.runCLI('list --status=done');
			assertOutputContains(listOutput, 'Implement features');
		});

		it('should maintain task count metadata', async () => {
			const tasksData = createTasksData(simpleTasks);
			await env.writeFile(
				'.taskmaster/tasks/tasks.json',
				JSON.stringify(tasksData, null, 2)
			);

			await env.runCLI('set-status --id=2 --status=done');

			// Read tasks file directly
			const tasksContent = await env.readFile('.taskmaster/tasks/tasks.json');
			const data = JSON.parse(tasksContent);

			expect(data.master.metadata.completedCount).toBe(2); // Task 1 and 2 done
		});
	});
});
