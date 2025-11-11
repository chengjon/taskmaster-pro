/**
 * @fileoverview Test Environment Utilities for E2E Tests
 * Provides isolated temporary directories and CLI execution helpers
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Test environment interface
 * Provides isolated temporary directory and helper methods for E2E tests
 */
export interface TestEnvironment {
	/** Temporary directory path */
	tmpDir: string;
	/** .taskmaster directory path */
	taskmasterDir: string;
	/** tasks.json file path */
	tasksFile: string;
	/** config.json file path */
	configFile: string;
	/** Cleanup function to remove temporary directory */
	cleanup: () => Promise<void>;
	/** Execute CLI command in test environment */
	runCLI: (command: string) => Promise<{ stdout: string; stderr: string }>;
	/** Write file relative to tmpDir */
	writeFile: (relativePath: string, content: string) => Promise<void>;
	/** Read file relative to tmpDir */
	readFile: (relativePath: string) => Promise<string>;
	/** Check if file exists relative to tmpDir */
	fileExists: (relativePath: string) => Promise<boolean>;
}

/**
 * Create an isolated test environment
 * @param prefix - Prefix for temporary directory name
 * @returns TestEnvironment instance
 */
export async function createTestEnvironment(
	prefix = 'tm-e2e-test-'
): Promise<TestEnvironment> {
	// Create temporary directory
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

	// Create .taskmaster directory structure
	const taskmasterDir = path.join(tmpDir, '.taskmaster');
	const tasksDir = path.join(taskmasterDir, 'tasks');
	const tasksFile = path.join(tasksDir, 'tasks.json');
	const configFile = path.join(taskmasterDir, 'config.json');

	await fs.mkdir(tasksDir, { recursive: true });

	// Initialize with minimal tasks.json structure
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

	/**
	 * Execute CLI command in test environment
	 */
	const runCLI = async (command: string) => {
		// Find the CLI entry point (built dist file at repository root)
		const cliPath = path.resolve(__dirname, '../../../../../dist/task-master.js');
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
			// Return output even on error (for error testing)
			return {
				stdout: error.stdout || '',
				stderr: error.stderr || error.message || ''
			};
		}
	};

	/**
	 * Cleanup function
	 */
	const cleanup = async () => {
		try {
			await fs.rm(tmpDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore cleanup errors
			console.warn(`Failed to cleanup ${tmpDir}:`, error);
		}
	};

	/**
	 * Write file helper
	 */
	const writeFile = async (relativePath: string, content: string) => {
		const fullPath = path.join(tmpDir, relativePath);
		const dir = path.dirname(fullPath);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(fullPath, content, 'utf-8');
	};

	/**
	 * Read file helper
	 */
	const readFile = async (relativePath: string): Promise<string> => {
		const fullPath = path.join(tmpDir, relativePath);
		return await fs.readFile(fullPath, 'utf-8');
	};

	/**
	 * Check file existence helper
	 */
	const fileExists = async (relativePath: string): Promise<boolean> => {
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
 * @param output - Raw CLI output string
 * @returns Parsed output object
 */
export function parseCLIOutput(output: string): {
	lines: string[];
	hasError: boolean;
	errorMessage?: string;
} {
	const lines = output
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const hasError = lines.some(
		(line) =>
			line.toLowerCase().includes('error') ||
			line.toLowerCase().includes('failed')
	);

	const errorMessage = hasError
		? lines.find(
				(line) =>
					line.toLowerCase().includes('error') ||
					line.toLowerCase().includes('failed')
			)
		: undefined;

	return {
		lines,
		hasError,
		errorMessage
	};
}

/**
 * Wait for a condition to be true
 * @param condition - Function that returns boolean
 * @param timeout - Maximum wait time in milliseconds
 * @param interval - Check interval in milliseconds
 * @returns Promise that resolves when condition is true
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeout = 5000,
	interval = 100
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
