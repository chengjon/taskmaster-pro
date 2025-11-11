/**
 * @fileoverview AI Domain Facade
 * Central point for AI provider management and operations
 *
 * The AI Domain is responsible for:
 * - Managing AI provider initialization and lifecycle
 * - Providing unified interface across multiple providers
 * - Handling provider configuration and API key resolution
 * - Managing model switching and fallback logic
 */

import type { ConfigManager } from '../config/managers/config-manager.js';
import { ProviderFactory } from './services/provider-factory.js';
import type { AIProviderConfig } from './interfaces/provider.interface.js';

/**
 * AI Domain - Unified API for AI provider operations
 */
export class AIDomain {
	private providerFactory: ProviderFactory;

	constructor(configManager: ConfigManager) {
		this.providerFactory = new ProviderFactory(configManager);
	}

	/**
	 * Get a configured AI provider instance
	 * @param providerName - Name of the provider (e.g., 'anthropic', 'openai')
	 * @returns Initialized provider instance
	 */
	async getProvider(providerName: string) {
		return await this.providerFactory.createProvider(providerName);
	}

	/**
	 * Get the primary configured provider
	 * @returns Primary provider instance
	 */
	async getPrimaryProvider() {
		return await this.providerFactory.getPrimaryProvider();
	}

	/**
	 * Get a fallback provider if primary fails
	 * @returns Fallback provider instance
	 */
	async getFallbackProvider() {
		return await this.providerFactory.getFallbackProvider();
	}

	/**
	 * List all available providers
	 * @returns Array of available provider names
	 */
	listAvailableProviders(): string[] {
		return this.providerFactory.listAvailableProviders();
	}

	/**
	 * Check if a provider is available and properly configured
	 * @param providerName - Name of the provider
	 * @returns True if provider is available and configured
	 */
	isProviderAvailable(providerName: string): boolean {
		return this.providerFactory.isProviderAvailable(providerName);
	}
}
