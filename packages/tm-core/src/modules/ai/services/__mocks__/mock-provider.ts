/**
 * @fileoverview Mock AI Provider for Testing
 * Used in unit tests to simulate provider behavior
 */

import type {
	IAIProvider,
	AIProviderConfig,
	GenerateTextOptions,
	GenerateTextResponse,
	GenerateObjectOptions,
	GenerateObjectResponse,
	StreamTextOptions
} from '../../interfaces/provider.interface.js';

/**
 * Mock provider for testing
 */
export class MockAIProvider implements IAIProvider {
	name = 'Mock';
	private _configured = false;

	getRequiredApiKeyName(): string {
		return 'MOCK_API_KEY';
	}

	async initialize(config: AIProviderConfig): Promise<void> {
		if (!config.apiKey) {
			throw new Error('Mock provider requires API key');
		}
		this._configured = true;
	}

	async generateText(
		options: GenerateTextOptions
	): Promise<GenerateTextResponse> {
		return {
			text: `Mock response for: ${options.prompt}`,
			usage: {
				promptTokens: 10,
				completionTokens: 10,
				totalTokens: 20
			}
		};
	}

	async *streamText(
		options: StreamTextOptions
	): AsyncGenerator<string> {
		yield 'Mock ';
		yield 'streaming ';
		yield 'response';
	}

	async generateObject<T = unknown>(
		options: GenerateObjectOptions<T>
	): Promise<GenerateObjectResponse<T>> {
		return {
			object: { success: true } as T,
			usage: {
				promptTokens: 10,
				completionTokens: 10,
				totalTokens: 20
			}
		};
	}

	isConfigured(): boolean {
		return this._configured;
	}
}
