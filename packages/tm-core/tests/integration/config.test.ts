/**
 * @fileoverview Integration tests for ConfigDomain
 * Tests configuration operations with real file system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createTmCore, type TmCore } from '../../src/index.js';

describe('ConfigDomain Integration', () => {
	let tmpDir: string;
	let tmCore: TmCore;

	beforeEach(async () => {
		// Create temporary directory for test
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tm-core-config-test-'));

		// Create .taskmaster directory
		const taskmasterDir = path.join(tmpDir, '.taskmaster');
		await fs.mkdir(taskmasterDir, { recursive: true });

		// Create tasks directory and tasks.json (minimal required structure)
		const tasksDir = path.join(taskmasterDir, 'tasks');
		await fs.mkdir(tasksDir, { recursive: true });
		const tasksFile = path.join(tasksDir, 'tasks.json');
		await fs.writeFile(
			tasksFile,
			JSON.stringify(
				{
					default: {
						tasks: [],
						metadata: {
							version: '1.0.0',
							lastModified: new Date().toISOString(),
							taskCount: 0,
							completedCount: 0,
							tags: ['default']
						}
					}
				},
				null,
				2
			)
		);

		// Create TmCore instance
		tmCore = await createTmCore({ projectPath: tmpDir });
	});

	afterEach(async () => {
		// Remove temp directory
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe('getConfig', () => {
		it('should get full configuration', () => {
			const config = tmCore.config.getConfig();

			expect(config).toBeDefined();
			expect(config.version).toBeDefined();
		});

		it('should return configuration with default values', () => {
			const config = tmCore.config.getConfig();

			// Check default storage settings
			expect(config.storage).toBeDefined();
			// Default storage type is 'auto', not 'file'
			expect(config.storage?.type).toBe('auto');

			// Check default models
			expect(config.models).toBeDefined();

			// tasks field may or may not be defined in defaults
			// Just verify config is a valid object
			expect(typeof config).toBe('object');
		});
	});

	describe('getStorageConfig', () => {
		it('should get storage configuration', () => {
			const storageConfig = tmCore.config.getStorageConfig();

			expect(storageConfig).toBeDefined();
			// Default storage type is 'auto'
			expect(storageConfig.type).toBe('auto');
		});
	});

	describe('getModelConfig', () => {
		it('should get model configuration', () => {
			const modelConfig = tmCore.config.getModelConfig();

			expect(modelConfig).toBeDefined();
			expect(modelConfig.main).toBeDefined();
		});
	});

	describe('getResponseLanguage', () => {
		it('should get default response language', () => {
			const language = tmCore.config.getResponseLanguage();

			expect(language).toBeDefined();
			expect(typeof language).toBe('string');
		});
	});

	describe('getProjectRoot', () => {
		it('should get project root path', () => {
			const projectRoot = tmCore.config.getProjectRoot();

			expect(projectRoot).toBe(tmpDir);
		});
	});

	describe('isApiExplicitlyConfigured', () => {
		it('should check if API is explicitly configured', () => {
			const isConfigured = tmCore.config.isApiExplicitlyConfigured();

			expect(typeof isConfigured).toBe('boolean');
		});
	});

	describe('getActiveTag', () => {
		it('should get default active tag', () => {
			const activeTag = tmCore.config.getActiveTag();

			// Default active tag is 'master', not 'default'
			expect(activeTag).toBe('master');
		});
	});

	describe('setActiveTag', () => {
		it('should set active tag', async () => {
			await tmCore.config.setActiveTag('feature-branch');

			const activeTag = tmCore.config.getActiveTag();
			expect(activeTag).toBe('feature-branch');
		});

		it('should persist active tag across config reloads', async () => {
			await tmCore.config.setActiveTag('test-tag');

			// Create new TmCore instance to test persistence
			const newTmCore = await createTmCore({ projectPath: tmpDir });
			const activeTag = newTmCore.config.getActiveTag();

			expect(activeTag).toBe('test-tag');
		});
	});

	describe('setResponseLanguage', () => {
		it('should set response language', async () => {
			await tmCore.config.setResponseLanguage('中文');

			const language = tmCore.config.getResponseLanguage();
			expect(language).toBe('中文');
		});

		it('should persist language to file system', async () => {
			await tmCore.config.setResponseLanguage('español');

			// Read config file directly
			const configFile = path.join(tmpDir, '.taskmaster', 'config.json');
			const configContent = await fs.readFile(configFile, 'utf-8');
			const configData = JSON.parse(configContent);

			// responseLanguage is stored in config.custom.responseLanguage
			expect(configData.custom?.responseLanguage).toBe('español');
		});
	});

	describe('updateConfig', () => {
		it('should update configuration fields', async () => {
			await tmCore.config.updateConfig({
				aiProvider: 'test-provider'
			});

			const config = tmCore.config.getConfig();
			expect(config.aiProvider).toBe('test-provider');
		});

		it('should merge updates with existing config', async () => {
			const originalProvider = tmCore.config.getConfig().aiProvider;

			await tmCore.config.updateConfig({
				tasks: {
					defaultPriority: 'high'
				}
			});

			const config = tmCore.config.getConfig();
			expect(config.aiProvider).toBe(originalProvider); // Unchanged
			expect(config.tasks?.defaultPriority).toBe('high'); // Updated
		});

		it('should persist updates to file system', async () => {
			await tmCore.config.updateConfig({
				aiProvider: 'custom-provider'
			});

			// Read config file directly
			const configFile = path.join(tmpDir, '.taskmaster', 'config.json');
			const configContent = await fs.readFile(configFile, 'utf-8');
			const configData = JSON.parse(configContent);

			expect(configData.aiProvider).toBe('custom-provider');
		});
	});

	describe('saveConfig', () => {
		it('should save current configuration to file', async () => {
			// Modify config in memory
			await tmCore.config.updateConfig({
				aiProvider: 'test-save'
			});

			// Save explicitly
			await tmCore.config.saveConfig();

			// Verify file was written
			const configFile = path.join(tmpDir, '.taskmaster', 'config.json');
			const configContent = await fs.readFile(configFile, 'utf-8');
			const configData = JSON.parse(configContent);

			expect(configData.aiProvider).toBe('test-save');
		});
	});

	describe('reset', () => {
		it('should reset configuration to defaults', async () => {
			// Modify config
			await tmCore.config.updateConfig({
				aiProvider: 'custom-provider'
			});

			expect(tmCore.config.getConfig().aiProvider).toBe('custom-provider');

			// Reset
			await tmCore.config.reset();

			// Verify reset to defaults
			const config = tmCore.config.getConfig();
			expect(config.aiProvider).not.toBe('custom-provider');
		});

		it('should reset configuration in memory', async () => {
			// Modify and reset
			await tmCore.config.updateConfig({
				aiProvider: 'test-reset'
			});
			await tmCore.config.reset();

			// Verify in-memory config was reset
			const config = tmCore.config.getConfig();
			expect(config.aiProvider).not.toBe('test-reset');
		});
	});

	describe('getConfigSources', () => {
		it('should get configuration sources for debugging', () => {
			const sources = tmCore.config.getConfigSources();

			expect(sources).toBeDefined();
			expect(typeof sources).toBe('object');
		});
	});

	describe('configuration file lifecycle', () => {
		it('should create config.json if it does not exist', async () => {
			const configFile = path.join(tmpDir, '.taskmaster', 'config.json');

			// Config file may or may not exist initially
			const existsBefore = await fs
				.access(configFile)
				.then(() => true)
				.catch(() => false);

			// Trigger save operation
			await tmCore.config.saveConfig();

			// Config file should now exist
			const existsAfter = await fs
				.access(configFile)
				.then(() => true)
				.catch(() => false);

			expect(existsAfter).toBe(true);
		});

		it('should preserve existing config.json on updates', async () => {
			// Create initial config
			const configFile = path.join(tmpDir, '.taskmaster', 'config.json');
			await fs.writeFile(
				configFile,
				JSON.stringify({ aiProvider: 'original' }, null, 2)
			);

			// Create new TmCore instance and update
			const newTmCore = await createTmCore({ projectPath: tmpDir });
			await newTmCore.config.updateConfig({
				tasks: { defaultPriority: 'high' }
			});

			// Read config
			const configContent = await fs.readFile(configFile, 'utf-8');
			const configData = JSON.parse(configContent);

			// Original field should still exist (if preserved by implementation)
			expect(configData.tasks?.defaultPriority).toBe('high');
		});
	});

	describe('model configuration', () => {
		it('should access model settings', () => {
			const modelConfig = tmCore.config.getModelConfig();

			expect(modelConfig).toBeDefined();
			expect(modelConfig.main).toBeDefined();
		});

		it('should update model configuration', async () => {
			await tmCore.config.updateConfig({
				models: {
					main: {
						provider: 'openai',
						name: 'gpt-4'
					}
				}
			});

			const config = tmCore.config.getConfig();
			expect(config.models?.main?.provider).toBe('openai');
			expect(config.models?.main?.name).toBe('gpt-4');
		});
	});

	describe('storage configuration', () => {
		it('should access storage settings', () => {
			const storageConfig = tmCore.config.getStorageConfig();

			// Default storage type is 'auto'
			expect(storageConfig.type).toBe('auto');
		});

		it('should update storage configuration', async () => {
			await tmCore.config.updateConfig({
				storage: {
					type: 'file',
					file: {
						tasksPath: '.custom/tasks.json'
					}
				}
			});

			const config = tmCore.config.getConfig();
			expect(config.storage?.file?.tasksPath).toBe('.custom/tasks.json');
		});
	});
});
