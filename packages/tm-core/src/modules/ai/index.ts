/**
 * @fileoverview Barrel export for AI module
 */

// Domain facade
export { AIDomain } from './ai-domain.js';

// Interfaces
export type { IAIProvider, AIProviderConfig } from './interfaces/provider.interface.js';

// Services
export { ProviderFactory } from './services/provider-factory.js';

// Providers
export * from './providers/index.js';
