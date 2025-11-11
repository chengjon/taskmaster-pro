/**
 * @fileoverview Provider Factory
 * Responsible for creating and managing AI provider instances
 */

import type { ConfigManager } from '../../config/managers/config-manager.js';
import type { AIProviderConfig, IAIProvider } from '../interfaces/provider.interface.js';

/**
 * Factory for creating AI provider instances
 * Manages provider registration, instantiation, and lifecycle
 */
export class ProviderFactory {
	private configManager: ConfigManager;
	private providerCache: Map<string, IAIProvider> = new Map();
	private availableProviders: Map<string, new () => IAIProvider> = new Map();

	constructor(configManager: ConfigManager) {
		this.configManager = configManager;
		this.registerDefaultProviders();
	}

	/**
	 * Register default providers
	 * Will be replaced with actual provider imports during migration
	 */
	private registerDefaultProviders(): void {
		// This will be populated during Task 1.3 (AI Provider Migration)
		// Placeholder for now
	}

	/**
	 * Register a provider implementation
	 */
	registerProvider(
		name: string,
		providerClass: new () => IAIProvider
	): void {
		this.availableProviders.set(name.toLowerCase(), providerClass);
	}

	/**
	 * Create a provider instance
	 */
	async createProvider(providerName: string): Promise<IAIProvider> {
		const lowerName = providerName.toLowerCase();

		// Check cache first
		if (this.providerCache.has(lowerName)) {
			return this.providerCache.get(lowerName)!;
		}

		// Get provider class
		const ProviderClass = this.availableProviders.get(lowerName);
		if (!ProviderClass) {
			throw new Error(`Unknown provider: ${providerName}`);
		}

		// Create and initialize provider
		const provider = new ProviderClass();
		const config = await this.getProviderConfig(providerName);
		await provider.initialize(config);

		// Cache it
		this.providerCache.set(lowerName, provider);

		return provider;
	}

	/**
	 * Get the primary configured provider
	 */
	async getPrimaryProvider(): Promise<IAIProvider> {
		const primaryName = await this.configManager.get('aiProvider.primary');
		if (!primaryName) {
			throw new Error('No primary AI provider configured');
		}
		return this.createProvider(primaryName);
	}

	/**
	 * Get a fallback provider
	 */
	async getFallbackProvider(): Promise<IAIProvider> {
		const fallbackName = await this.configManager.get('aiProvider.fallback');
		if (!fallbackName) {
			// If no fallback configured, use primary
			return this.getPrimaryProvider();
		}
		return this.createProvider(fallbackName);
	}

	/**
	 * List available providers
	 */
	listAvailableProviders(): string[] {
		return Array.from(this.availableProviders.keys());
	}

	/**
	 * Check if a provider is available and configured
	 */
	isProviderAvailable(providerName: string): boolean {
		return this.availableProviders.has(providerName.toLowerCase());
	}

	/**
	 * Get provider configuration
	 */
	private async getProviderConfig(
		providerName: string
	): Promise<AIProviderConfig> {
		const lowerName = providerName.toLowerCase();
		const apiKey = process.env[`${lowerName.toUpperCase()}_API_KEY`];

		return {
			name: providerName,
			apiKey,
			options: await this.configManager.get(`aiProvider.${lowerName}`)
		};
	}
}
