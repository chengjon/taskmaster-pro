/**
 * @fileoverview File operations with atomic writes and locking
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { constants } from 'node:fs';
import type { FileStorageData } from './format-handler.js';

/**
 * Handles atomic file operations with cross-process locking mechanism
 */
export class FileOperations {
	private fileLocks: Map<string, Promise<void>> = new Map();
	private lockWaitMs = 100; // Wait 100ms between lock checks
	private lockTimeoutMs = 30000; // 30 second timeout for lock acquisition

	/**
	 * Read and parse JSON file
	 */
	async readJson(filePath: string): Promise<any> {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			return JSON.parse(content);
		} catch (error: any) {
			if (error.code === 'ENOENT') {
				throw error; // Re-throw ENOENT for caller to handle
			}
			if (error instanceof SyntaxError) {
				throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
			}
			throw new Error(`Failed to read file ${filePath}: ${error.message}`);
		}
	}

	/**
	 * Acquire cross-process file lock with stale lock detection and cleanup
	 */
	private async acquireFileLock(filePath: string): Promise<void> {
		const lockFile = `${filePath}.lock`;
		const startTime = Date.now();
		const staleTimeout = 60000; // 60s - consider locks older than this as stale

		while (Date.now() - startTime < this.lockTimeoutMs) {
			try {
				// Try to create lock file exclusively (fails if exists)
				const fd = await fs.open(lockFile, 'wx');
				await fd.close();
				return; // Lock acquired
			} catch (error: any) {
				if (error.code === 'EEXIST') {
					// Lock file exists, check if it's stale
					try {
						const stats = await fs.stat(lockFile);
						const lockAge = Date.now() - stats.mtimeMs;

						// If lock is too old (likely process crashed), clean it up
						if (lockAge > staleTimeout) {
							try {
								await fs.unlink(lockFile);
								// Continue to retry acquiring the lock
								continue;
							} catch {
								// If cleanup fails, just wait and retry
								await new Promise((resolve) => setTimeout(resolve, this.lockWaitMs));
								continue;
							}
						}
					} catch {
						// If stat fails, just wait and retry
						await new Promise((resolve) => setTimeout(resolve, this.lockWaitMs));
						continue;
					}

					// Lock file exists and is not stale, wait and retry
					await new Promise((resolve) => setTimeout(resolve, this.lockWaitMs));
					continue;
				}
				throw error;
			}
		}

		throw new Error(`Failed to acquire lock for ${filePath} after ${this.lockTimeoutMs}ms`);
	}

	/**
	 * Release cross-process file lock with graceful error handling
	 */
	private async releaseFileLock(filePath: string): Promise<void> {
		const lockFile = `${filePath}.lock`;
		try {
			await fs.unlink(lockFile);
		} catch (error: any) {
			// Lock file may have been deleted, that's fine
			if (error.code === 'ENOENT') {
				return;
			}

			// For other errors (permission denied, etc.), log but don't throw
			// This ensures the process continues running even if cleanup fails
			// The stale lock cleanup in acquireFileLock will handle it later
		}
	}

	/**
	 * Write JSON file with atomic operation and cross-process locking
	 */
	async writeJson(
		filePath: string,
		data: FileStorageData | any
	): Promise<void> {
		// Use in-process file locking to prevent concurrent writes within same process
		const lockKey = filePath;
		const existingLock = this.fileLocks.get(lockKey);

		if (existingLock) {
			await existingLock;
		}

		const lockPromise = (async () => {
			// Acquire cross-process lock
			await this.acquireFileLock(filePath);

			try {
				await this.performAtomicWrite(filePath, data);
			} finally {
				// Release cross-process lock
				await this.releaseFileLock(filePath);
			}
		})();

		this.fileLocks.set(lockKey, lockPromise);

		try {
			await lockPromise;
		} finally {
			this.fileLocks.delete(lockKey);
		}
	}

	/**
	 * Perform atomic write operation using temporary file
	 */
	private async performAtomicWrite(filePath: string, data: any): Promise<void> {
		const tempPath = `${filePath}.tmp`;

		try {
			// Write to temp file first
			const content = JSON.stringify(data, null, 2);
			await fs.writeFile(tempPath, content, 'utf-8');

			// Atomic rename
			await fs.rename(tempPath, filePath);
		} catch (error: any) {
			// Clean up temp file if it exists
			try {
				await fs.unlink(tempPath);
			} catch {
				// Ignore cleanup errors
			}

			throw new Error(`Failed to write file ${filePath}: ${error.message}`);
		}
	}

	/**
	 * Check if file exists
	 */
	async exists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath, constants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get file stats
	 */
	async getStats(filePath: string) {
		return fs.stat(filePath);
	}

	/**
	 * Read directory contents
	 */
	async readDir(dirPath: string): Promise<string[]> {
		return fs.readdir(dirPath);
	}

	/**
	 * Create directory recursively
	 */
	async ensureDir(dirPath: string): Promise<void> {
		try {
			await fs.mkdir(dirPath, { recursive: true });
		} catch (error: any) {
			throw new Error(
				`Failed to create directory ${dirPath}: ${error.message}`
			);
		}
	}

	/**
	 * Delete file
	 */
	async deleteFile(filePath: string): Promise<void> {
		try {
			await fs.unlink(filePath);
		} catch (error: any) {
			if (error.code !== 'ENOENT') {
				throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
			}
		}
	}

	/**
	 * Rename/move file
	 */
	async moveFile(oldPath: string, newPath: string): Promise<void> {
		try {
			await fs.rename(oldPath, newPath);
		} catch (error: any) {
			throw new Error(
				`Failed to move file from ${oldPath} to ${newPath}: ${error.message}`
			);
		}
	}

	/**
	 * Copy file
	 */
	async copyFile(srcPath: string, destPath: string): Promise<void> {
		try {
			await fs.copyFile(srcPath, destPath);
		} catch (error: any) {
			throw new Error(
				`Failed to copy file from ${srcPath} to ${destPath}: ${error.message}`
			);
		}
	}

	/**
	 * Clean up all pending file operations
	 */
	async cleanup(): Promise<void> {
		const locks = Array.from(this.fileLocks.values());
		if (locks.length > 0) {
			await Promise.all(locks);
		}
		this.fileLocks.clear();
	}
}
