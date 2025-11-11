/**
 * @fileoverview E2E Test Environment Setup
 * Provides utilities for creating isolated test environments with real file system
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface TestEnvironment {
	/** Temporary directory path for this test */
	tmpDir: string;
	/** Path to .taskmaster directory */
	taskmasterDir: string;
	/** Path to tasks.json file */
	tasksFile: string;
	/** Path to config.json file */
	configFile: string;
	/** Clean up the test environment */
	cleanup: () => Promise<void>;
	/** Execute a CLI command in the test environment */
	runCLI: (command: string) => Promise<{ stdout: string; stderr: string }>;
	/** Write a file to the test environment */
	writeFile: (relativePath: string, content: string) => Promise<void>;
	/** Read a file from the test environment */
	readFile: (relativePath: string) => Promise<string>;
	/** Check if a file exists in the test environment */
	fileExists: (relativePath: string) => Promise<boolean>;
}

/**
 * Creates an isolated test environment with temporary directory
 */
export async function createTestEnvironment(
	prefix = 'tm-e2e-test-'
): Promise<TestEnvironment> {
	// Create temporary directory
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

	// Setup paths
	const taskmasterDir = path.join(tmpDir, '.taskmaster');
	const tasksDir = path.join(taskmasterDir, 'tasks');
	const tasksFile = path.join(tasksDir, 'tasks.json');
	const configFile = path.join(taskmasterDir, 'config.json');

	// Create .taskmaster structure
	await fs.mkdir(tasksDir, { recursive: true });

	// Create minimal tasks.json
	const initialTasksData = {
		master: {
			tasks: [],
			metadata: {
				version: '1.0.0',
				lastModified: new Date().toISOString(),
				taskCount: 0,
				completedCount: 0,
				tags: ['master']
			}
		}
	};
	await fs.writeFile(tasksFile, JSON.stringify(initialTasksData, null, 2));

	// Helper functions
	const cleanup = async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	};

	const runCLI = async (command: string) => {
		const cliPath = path.resolve(__dirname, '../../../dist/task-master.js');
		const fullCommand = `node ${cliPath} ${command}`;

		try {
			const { stdout, stderr } = await execAsync(fullCommand, {
				cwd: tmpDir,
				env: {
					...process.env,
					NODE_ENV: 'test'
				}
			});
			return { stdout, stderr };
		} catch (error: any) {
			return {
				stdout: error.stdout || '',
				stderr: error.stderr || error.message || ''
			};
		}
	};

	const writeFile = async (relativePath: string, content: string) => {
		const fullPath = path.join(tmpDir, relativePath);
		const dir = path.dirname(fullPath);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(fullPath, content);
	};

	const readFile = async (relativePath: string) => {
		const fullPath = path.join(tmpDir, relativePath);
		return await fs.readFile(fullPath, 'utf-8');
	};

	const fileExists = async (relativePath: string) => {
		const fullPath = path.join(tmpDir, relativePath);
		try {
			await fs.access(fullPath);
			return true;
		} catch {
			return false;
		}
	};

	return {
		tmpDir,
		taskmasterDir,
		tasksFile,
		configFile,
		cleanup,
		runCLI,
		writeFile,
		readFile,
		fileExists
	};
}

/**
 * Parse CLI output into structured format
 */
export function parseCLIOutput(output: string): {
	lines: string[];
	hasError: boolean;
	json: any | null;
} {
	const lines = output.split('\n').filter((line) => line.trim());
	const hasError = output.toLowerCase().includes('error');

	// Try to parse JSON output
	let json = null;
	try {
		// Look for JSON blocks in output
		const jsonMatch = output.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			json = JSON.parse(jsonMatch[0]);
		}
	} catch {
		// Not JSON output, that's fine
	}

	return { lines, hasError, json };
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
	condition: () => Promise<boolean>,
	options: {
		timeout?: number;
		interval?: number;
		message?: string;
	} = {}
): Promise<void> {
	const { timeout = 5000, interval = 100, message = 'Condition not met' } =
		options;

	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error(`${message} (timeout: ${timeout}ms)`);
}
