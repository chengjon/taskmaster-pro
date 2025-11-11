/**
 * @fileoverview AI Provider Interfaces
 * Type definitions for AI provider implementations
 */

/**
 * Configuration for an AI provider
 */
export interface AIProviderConfig {
	name: string;
	apiKey?: string;
	baseUrl?: string;
	models?: {
		primary?: string;
		fallback?: string;
		research?: string;
	};
	options?: Record<string, unknown>;
}

/**
 * Options for text generation
 */
export interface GenerateTextOptions {
	modelId: string;
	prompt: string;
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
	abortSignal?: AbortSignal;
}

/**
 * Response from text generation
 */
export interface GenerateTextResponse {
	text: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * Options for streaming text generation
 */
export interface StreamTextOptions extends GenerateTextOptions {
	onChunk?: (chunk: string) => void;
}

/**
 * Options for object generation (structured output)
 */
export interface GenerateObjectOptions<T = unknown> {
	modelId: string;
	prompt: string;
	schema: T;
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
	abortSignal?: AbortSignal;
}

/**
 * Response from object generation
 */
export interface GenerateObjectResponse<T = unknown> {
	object: T;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * Base interface for AI providers
 */
export interface IAIProvider {
	name: string;

	/**
	 * Get the required API key environment variable name
	 */
	getRequiredApiKeyName(): string;

	/**
	 * Initialize the provider with given configuration
	 */
	initialize(config: AIProviderConfig): Promise<void>;

	/**
	 * Generate text from a prompt
	 */
	generateText(options: GenerateTextOptions): Promise<GenerateTextResponse>;

	/**
	 * Stream text generation
	 */
	streamText(options: StreamTextOptions): Promise<AsyncGenerator<string>>;

	/**
	 * Generate structured object
	 */
	generateObject<T = unknown>(
		options: GenerateObjectOptions<T>
	): Promise<GenerateObjectResponse<T>>;

	/**
	 * Check if provider is properly configured
	 */
	isConfigured(): boolean;
}
