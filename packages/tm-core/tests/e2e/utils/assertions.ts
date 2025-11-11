/**
 * @fileoverview Domain-Specific Assertions for E2E Tests
 * Provides expressive assertions for task, config, and file validation
 */

import type { TestEnvironment } from './test-environment.js';

/**
 * Task interface (minimal for assertions)
 */
interface Task {
	id: string;
	title: string;
	description: string;
	status: string;
	priority: string;
	dependencies: string[];
	details: string;
	testStrategy: string;
	subtasks?: Task[];
}

/**
 * Assert that a task exists in the tasks file
 * @param env - Test environment
 * @param taskId - Task ID to check
 * @param tag - Tag context (default: 'master')
 * @returns The found task
 */
export async function assertTaskExists(
	env: TestEnvironment,
	taskId: string,
	tag = 'master'
): Promise<Task> {
	const tasksContent = await env.readFile('.taskmaster/tasks/tasks.json');
	const tasksData = JSON.parse(tasksContent);

	if (!tasksData[tag]) {
		throw new Error(`Tag '${tag}' not found in tasks.json`);
	}

	// Convert taskId to string for comparison (handles both string and number IDs)
	const task = tasksData[tag].tasks.find((t: Task) => String(t.id) === String(taskId));

	if (!task) {
		throw new Error(
			`Task '${taskId}' not found in tag '${tag}'. Available tasks: ${tasksData[tag].tasks.map((t: Task) => t.id).join(', ')}`
		);
	}

	return task;
}

/**
 * Assert that a task has expected status
 * @param env - Test environment
 * @param taskId - Task ID to check
 * @param expectedStatus - Expected status value
 * @param tag - Tag context (default: 'master')
 */
export async function assertTaskStatus(
	env: TestEnvironment,
	taskId: string,
	expectedStatus: string,
	tag = 'master'
): Promise<void> {
	const task = await assertTaskExists(env, taskId, tag);

	if (task.status !== expectedStatus) {
		throw new Error(
			`Task '${taskId}' has status '${task.status}', expected '${expectedStatus}'`
		);
	}
}

/**
 * Assert that a task has expected properties
 * @param env - Test environment
 * @param taskId - Task ID to check
 * @param expectedProps - Object with expected property values
 * @param tag - Tag context (default: 'master')
 */
export async function assertTaskProperties(
	env: TestEnvironment,
	taskId: string,
	expectedProps: Partial<Task>,
	tag = 'master'
): Promise<void> {
	const task = await assertTaskExists(env, taskId, tag);

	for (const [key, expectedValue] of Object.entries(expectedProps)) {
		const actualValue = (task as any)[key];
		if (actualValue !== expectedValue) {
			throw new Error(
				`Task '${taskId}' property '${key}' is '${actualValue}', expected '${expectedValue}'`
			);
		}
	}
}

/**
 * Assert task count in a tag
 * @param env - Test environment
 * @param expectedCount - Expected number of tasks
 * @param tag - Tag context (default: 'master')
 */
export async function assertTaskCount(
	env: TestEnvironment,
	expectedCount: number,
	tag = 'master'
): Promise<void> {
	const tasksContent = await env.readFile('.taskmaster/tasks/tasks.json');
	const tasksData = JSON.parse(tasksContent);

	if (!tasksData[tag]) {
		throw new Error(`Tag '${tag}' not found in tasks.json`);
	}

	const actualCount = tasksData[tag].tasks.length;

	if (actualCount !== expectedCount) {
		throw new Error(
			`Tag '${tag}' has ${actualCount} tasks, expected ${expectedCount}`
		);
	}
}

/**
 * Assert that a subtask exists
 * @param env - Test environment
 * @param taskId - Parent task ID
 * @param subtaskId - Subtask ID (numeric)
 * @param tag - Tag context (default: 'master')
 * @returns The found subtask
 */
export async function assertSubtaskExists(
	env: TestEnvironment,
	taskId: string,
	subtaskId: number,
	tag = 'master'
): Promise<Task> {
	const task = await assertTaskExists(env, taskId, tag);

	if (!task.subtasks || task.subtasks.length === 0) {
		throw new Error(`Task '${taskId}' has no subtasks`);
	}

	const subtask = task.subtasks.find((st) => st.id === String(subtaskId));

	if (!subtask) {
		throw new Error(
			`Subtask '${subtaskId}' not found in task '${taskId}'. Available subtasks: ${task.subtasks.map((st) => st.id).join(', ')}`
		);
	}

	return subtask;
}

/**
 * Assert that a dependency exists between tasks
 * @param env - Test environment
 * @param taskId - Task ID that should have the dependency
 * @param dependencyId - ID of the task it depends on
 * @param tag - Tag context (default: 'master')
 */
export async function assertDependencyExists(
	env: TestEnvironment,
	taskId: string,
	dependencyId: string,
	tag = 'master'
): Promise<void> {
	const task = await assertTaskExists(env, taskId, tag);

	if (!task.dependencies || task.dependencies.length === 0) {
		throw new Error(`Task '${taskId}' has no dependencies`);
	}

	// Convert both to strings for comparison
	const depExists = task.dependencies.some((dep) => String(dep) === String(dependencyId));
	if (!depExists) {
		throw new Error(
			`Task '${taskId}' does not depend on '${dependencyId}'. Current dependencies: ${task.dependencies.join(', ')}`
		);
	}
}

/**
 * Assert that a file contains expected text
 * @param env - Test environment
 * @param relativePath - File path relative to tmpDir
 * @param expectedText - Text that should be in the file
 */
export async function assertFileContains(
	env: TestEnvironment,
	relativePath: string,
	expectedText: string
): Promise<void> {
	const content = await env.readFile(relativePath);

	if (!content.includes(expectedText)) {
		throw new Error(
			`File '${relativePath}' does not contain '${expectedText}'`
		);
	}
}

/**
 * Assert that CLI output contains expected text
 * @param output - CLI output string
 * @param expectedText - Text that should be in output
 */
export function assertOutputContains(
	output: string,
	expectedText: string
): void {
	if (!output.includes(expectedText)) {
		throw new Error(
			`CLI output does not contain '${expectedText}'.\nActual output:\n${output}`
		);
	}
}

/**
 * Assert that command succeeded (no error in stderr)
 * Warnings are allowed, only actual errors cause failure
 * @param stderr - CLI stderr output
 */
export function assertCommandSuccess(stderr: string): void {
	const lowerStderr = stderr.toLowerCase();
	// Check for actual errors, but ignore warning messages
	if (lowerStderr.includes('error:') || lowerStderr.includes('failed')) {
		// Make sure it's not just "error" in a warning message
		const lines = stderr.split('\n');
		const hasActualError = lines.some(
			(line) =>
				(line.toLowerCase().includes('error:') ||
					line.toLowerCase().includes('failed')) &&
				!line.toLowerCase().includes('[warn]') &&
				!line.toLowerCase().includes('warning:')
		);
		if (hasActualError) {
			throw new Error(`Command failed with error:\n${stderr}`);
		}
	}
}

/**
 * Assert that a config value matches expected value
 * @param env - Test environment
 * @param configPath - Dot-notation path to config value (e.g., 'models.main.provider')
 * @param expectedValue - Expected config value
 */
export async function assertConfigValue(
	env: TestEnvironment,
	configPath: string,
	expectedValue: any
): Promise<void> {
	const configContent = await env.readFile('.taskmaster/config.json');
	const config = JSON.parse(configContent);

	const pathParts = configPath.split('.');
	let value = config;

	for (const part of pathParts) {
		if (value && typeof value === 'object' && part in value) {
			value = value[part];
		} else {
			throw new Error(`Config path '${configPath}' not found`);
		}
	}

	if (value !== expectedValue) {
		throw new Error(
			`Config value at '${configPath}' is '${value}', expected '${expectedValue}'`
		);
	}
}
