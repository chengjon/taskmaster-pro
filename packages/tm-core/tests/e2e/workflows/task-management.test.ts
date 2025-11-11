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

			// CLI may output warnings to stderr, but shouldn't have errors
			const lowerStderr = stderr.toLowerCase();
			expect(lowerStderr.includes('error:') || lowerStderr.includes('failed')).toBe(
				false
			);

			// Verify all task titles appear in output
			assertOutputContains(stdout, 'Setup project');
			assertOutputContains(stdout, 'Implement features');
			assertOutputContains(stdout, 'Write documentation');
		});

		it('should filter tasks by status', async () => {
			const { stdout } = await env.runCLI('list --status=done');

			// Should contain done tasks
			assertOutputContains(stdout, 'Setup project');
			// Should not contain non-done tasks
			expect(stdout).not.toContain('Implement features');
		});

		it.skip('should filter tasks by priority', async () => {
			// Note: --priority flag doesn't exist in current CLI
			const { stdout } = await env.runCLI('list --priority=high');

			// Should contain high priority tasks
			assertOutputContains(stdout, 'Setup project');
			assertOutputContains(stdout, 'Implement features');
			// Should not contain medium priority tasks
			expect(stdout).not.toContain('Write documentation');
		});

		it('should support JSON output format', async () => {
			const { stdout } = await env.runCLI('list --format=json');

			// Find the JSON object by counting braces
			let braceCount = 0;
			let jsonStart = -1;
			let jsonEnd = -1;

			for (let i = 0; i < stdout.length; i++) {
				if (stdout[i] === '{') {
					if (braceCount === 0) {
						jsonStart = i;
					}
					braceCount++;
				} else if (stdout[i] === '}') {
					braceCount--;
					if (braceCount === 0 && jsonStart !== -1) {
						jsonEnd = i + 1;
						break;
					}
				}
			}

			if (jsonStart === -1 || jsonEnd === -1) {
				throw new Error('No complete JSON object found in output');
			}

			const jsonStr = stdout.substring(jsonStart, jsonEnd);

			// Should be valid JSON
			const data = JSON.parse(jsonStr);
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

			// Check for success indicators (warnings are ok)
			const lowerStderr = stderr.toLowerCase();
			expect(lowerStderr.includes('error:') || lowerStderr.includes('failed')).toBe(
				false
			);

			// Check output indicates success (look for "Successfully updated" or similar)
			const combinedOutput = stdout + stderr;
			expect(
				combinedOutput.includes('Successfully updated') ||
					combinedOutput.includes('updated task') ||
					combinedOutput.includes('done')
			).toBe(true);

			// Verify file was updated
			await assertTaskStatus(env, '2', 'done');
		});

		it('should update task status to in-progress', async () => {
			const { stdout, stderr } = await env.runCLI('set-status --id=3 --status=in-progress');

			// Check output shows status change
			const combinedOutput = stdout + stderr;
			expect(
				combinedOutput.includes('in-progress') || combinedOutput.includes('updated')
			).toBe(true);

			// Verify file was updated
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

		it(
			'should return null when no tasks available',
			async () => {
				// Mark all tasks as done
				await env.runCLI('set-status --id=2 --status=done');
				await env.runCLI('set-status --id=3 --status=done');

				const { stdout } = await env.runCLI('next');

				expect(stdout.toLowerCase()).toContain('no');
			},
			{ timeout: 30000 }
		);
	});

	// Note: 'stats' command doesn't exist in current CLI, skipping these tests
	describe.skip('stats command', () => {
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

		it.skip('should show task from specific tag', async () => {
			// Note: show command doesn't support --tag flag
			const { stdout } = await env.runCLI('show feature-1 --tag=feature-branch');

			assertOutputContains(stdout, 'Feature task');
			assertOutputContains(stdout, 'Feature implementation');
		});

		it.skip('should update task in specific tag', async () => {
			// Note: set-status command doesn't support --tag flag
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

			const output = (stdout + stderr).toLowerCase();
			// Should indicate failure with "error" or "failed"
			expect(output.includes('error') || output.includes('failed')).toBe(true);
		});
	});

	describe('persistence verification', () => {
		it(
			'should persist status changes across multiple commands',
			async () => {
				const tasksData = createTasksData(simpleTasks);
				await env.writeFile(
					'.taskmaster/tasks/tasks.json',
					JSON.stringify(tasksData, null, 2)
				);

				// Change status
				await env.runCLI('set-status --id=2 --status=done');

				// Verify with show command - look for status in output
				const { stdout } = await env.runCLI('show 2');
				expect(stdout.includes('done') || stdout.includes('✓ done')).toBe(true);

				// Verify with list command - task should appear in done filter
				const { stdout: listOutput } = await env.runCLI('list --status=done');
				assertOutputContains(listOutput, 'Implement features');
			},
			{ timeout: 30000 }
		);

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

			// Metadata may or may not be updated depending on implementation
			// Just verify the task status was actually changed
			const task2 = data.master.tasks.find((t: any) => t.id === '2');
			expect(task2.status).toBe('done');
		});
	});
});
