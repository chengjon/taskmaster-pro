/**
 * @fileoverview E2E Test Assertion Helpers
 * Provides domain-specific assertions for E2E testing
 */

import type { Task } from '../../../packages/tm-core/src/types/task.js';
import type { TestEnvironment } from './test-environment.js';

/**
 * Assert that a task exists in tasks.json
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

	const task = tasksData[tag].tasks.find((t: Task) => t.id === taskId);

	if (!task) {
		throw new Error(
			`Task '${taskId}' not found in tag '${tag}'. Available tasks: ${tasksData[tag].tasks.map((t: Task) => t.id).join(', ')}`
		);
	}

	return task;
}

/**
 * Assert that a task has a specific status
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
 * Assert that a task has specific properties
 */
export async function assertTaskProperties(
	env: TestEnvironment,
	taskId: string,
	expectedProps: Partial<Task>,
	tag = 'master'
): Promise<void> {
	const task = await assertTaskExists(env, taskId, tag);

	for (const [key, value] of Object.entries(expectedProps)) {
		const actualValue = (task as any)[key];
		if (JSON.stringify(actualValue) !== JSON.stringify(value)) {
			throw new Error(
				`Task '${taskId}' property '${key}' is ${JSON.stringify(actualValue)}, expected ${JSON.stringify(value)}`
			);
		}
	}
}

/**
 * Assert that a subtask exists
 */
export async function assertSubtaskExists(
	env: TestEnvironment,
	taskId: string,
	subtaskId: number,
	tag = 'master'
): Promise<any> {
	const task = await assertTaskExists(env, taskId, tag);

	if (!task.subtasks || task.subtasks.length === 0) {
		throw new Error(`Task '${taskId}' has no subtasks`);
	}

	const subtask = task.subtasks.find((st) => st.id === subtaskId);

	if (!subtask) {
		throw new Error(
			`Subtask '${taskId}.${subtaskId}' not found. Available subtasks: ${task.subtasks.map((st) => st.id).join(', ')}`
		);
	}

	return subtask;
}

/**
 * Assert task count in a tag
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
			`Expected ${expectedCount} tasks in tag '${tag}', found ${actualCount}`
		);
	}
}

/**
 * Assert that a dependency exists between two tasks
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

	if (!task.dependencies.includes(dependencyId)) {
		throw new Error(
			`Task '${taskId}' does not depend on '${dependencyId}'. Current dependencies: ${task.dependencies.join(', ')}`
		);
	}
}

/**
 * Assert that a file contains specific content
 */
export async function assertFileContains(
	env: TestEnvironment,
	filePath: string,
	expectedContent: string
): Promise<void> {
	const content = await env.readFile(filePath);

	if (!content.includes(expectedContent)) {
		throw new Error(
			`File '${filePath}' does not contain expected content: "${expectedContent}"`
		);
	}
}

/**
 * Assert that CLI output contains specific text
 */
export function assertOutputContains(
	output: string,
	expectedText: string
): void {
	if (!output.includes(expectedText)) {
		throw new Error(
			`CLI output does not contain expected text: "${expectedText}"\nActual output: ${output.substring(0, 200)}...`
		);
	}
}

/**
 * Assert that CLI command succeeded (no error in stderr)
 */
export function assertCommandSuccess(stderr: string): void {
	const lowerStderr = stderr.toLowerCase();
	if (lowerStderr.includes('error') || lowerStderr.includes('failed')) {
		throw new Error(`Command failed with error: ${stderr}`);
	}
}

/**
 * Assert that a configuration value is set
 */
export async function assertConfigValue(
	env: TestEnvironment,
	key: string,
	expectedValue: any
): Promise<void> {
	const configExists = await env.fileExists('.taskmaster/config.json');

	if (!configExists) {
		throw new Error('config.json does not exist');
	}

	const configContent = await env.readFile('.taskmaster/config.json');
	const config = JSON.parse(configContent);

	// Support nested keys like "models.main.provider"
	const keys = key.split('.');
	let value: any = config;

	for (const k of keys) {
		if (value === null || value === undefined) {
			throw new Error(`Config key '${key}' not found (stopped at '${k}')`);
		}
		value = value[k];
	}

	if (JSON.stringify(value) !== JSON.stringify(expectedValue)) {
		throw new Error(
			`Config key '${key}' is ${JSON.stringify(value)}, expected ${JSON.stringify(expectedValue)}`
		);
	}
}
