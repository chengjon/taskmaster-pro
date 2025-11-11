/**
 * @fileoverview AI Domain Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIDomain } from './ai-domain.js';
import { ProviderFactory } from './services/provider-factory.js';
import { MockAIProvider } from './services/__mocks__/mock-provider.js';
import type { ConfigManager } from '../config/managers/config-manager.js';

describe('AIDomain', () => {
	let aiDomain: AIDomain;
	let mockConfigManager: ConfigManager;

	beforeEach(() => {
		// Create a minimal mock ConfigManager
		mockConfigManager = {
			get: vi.fn().mockResolvedValue(undefined),
			set: vi.fn(),
			validate: vi.fn()
		} as unknown as ConfigManager;

		aiDomain = new AIDomain(mockConfigManager);
	});

	describe('initialization', () => {
		it('should create AI domain with config manager', () => {
			expect(aiDomain).toBeDefined();
		});

		it('should have provider factory instance', () => {
			expect(aiDomain['providerFactory']).toBeDefined();
		});
	});

	describe('provider management', () => {
		it('should list available providers', () => {
			const providers = aiDomain.listAvailableProviders();
			expect(Array.isArray(providers)).toBe(true);
		});

		it('should check if provider is available', () => {
			const isAvailable = aiDomain.isProviderAvailable('mock');
			expect(typeof isAvailable).toBe('boolean');
		});
	});

	describe('error handling', () => {
		it('should throw error for unknown provider', async () => {
			await expect(aiDomain.getProvider('unknown-provider')).rejects.toThrow(
				'Unknown provider'
			);
		});
	});
});
