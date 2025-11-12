/**
 * @fileoverview File Watcher Service
 *
 * Monitors file system changes and emits events for cache invalidation
 */

import fs from 'fs';
import { EventEmitter } from 'events';
import { getLogger } from '../../common/logger/factory.js';

/**
 * File change event
 */
export interface FileChangeEvent {
	timestamp: number;
	filePath: string;
	eventType: 'change' | 'rename';
}

/**
 * File watcher service with debounce support
 */
export class FileWatcher extends EventEmitter {
	private watcher: fs.FSWatcher | null = null;
	private debounceTimer: NodeJS.Timeout | null = null;
	private lastChangeTime = 0;
	private minChangeInterval = 100; // Minimum milliseconds between emitted events
	private logger = getLogger('FileWatcher');

	constructor(
		private filePath: string,
		private debounceMs: number = 300
	) {
		super();
		this.setMaxListeners(10);
	}

	/**
	 * Start watching the file
	 */
	start(): void {
		if (this.watcher) {
			this.logger.warn('FileWatcher already started', { filePath: this.filePath });
			return;
		}

		try {
			this.watcher = fs.watch(this.filePath, (eventType, filename) => {
				// Skip internal temp files
				if (filename && (filename.includes('.tmp') || filename.startsWith('.'))) {
					return;
				}

				// Debounce rapid file changes
				if (this.debounceTimer) {
					clearTimeout(this.debounceTimer);
				}

				this.debounceTimer = setTimeout(() => {
					const now = Date.now();

					// Prevent emission spam
					if (now - this.lastChangeTime > this.minChangeInterval) {
						this.lastChangeTime = now;

						this.emit('change', {
							timestamp: now,
							filePath: this.filePath,
							eventType: eventType as 'change' | 'rename'
						} as FileChangeEvent);

						this.logger.debug(
							'File changed detected',
							{ filePath: this.filePath, eventType }
						);
					}
				}, this.debounceMs);
			});

			this.emit('started');
			this.logger.info('FileWatcher started', { filePath: this.filePath });
		} catch (error) {
			this.logger.error(
				'FileWatcher start failed',
				{ filePath: this.filePath, error: String(error) }
			);
			this.emit('error', error);
		}
	}

	/**
	 * Stop watching the file
	 */
	stop(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}

		this.emit('stopped');
		this.logger.info('FileWatcher stopped', { filePath: this.filePath });
	}

	/**
	 * Check if watcher is active
	 */
	isWatching(): boolean {
		return this.watcher !== null;
	}

	/**
	 * Destroy the watcher
	 */
	destroy(): void {
		this.stop();
		this.removeAllListeners();
	}
}

/**
 * Global file watcher instance for tasks.json
 */
let globalTasksWatcher: FileWatcher | null = null;

/**
 * Initialize global tasks file watcher
 */
export function initializeTasksWatcher(tasksFilePath: string): FileWatcher {
	if (globalTasksWatcher) {
		globalTasksWatcher.destroy();
	}

	globalTasksWatcher = new FileWatcher(tasksFilePath, 300);
	globalTasksWatcher.start();

	return globalTasksWatcher;
}

/**
 * Get the global tasks watcher
 */
export function getTasksWatcher(): FileWatcher | null {
	return globalTasksWatcher;
}

/**
 * Destroy the global tasks watcher
 */
export function destroyTasksWatcher(): void {
	if (globalTasksWatcher) {
		globalTasksWatcher.destroy();
		globalTasksWatcher = null;
	}
}
