/**
 * @fileoverview Dependency validation types
 */

/**
 * Types of dependency validation issues
 */
export type DependencyIssueType = 'self' | 'missing' | 'circular';

/**
 * A dependency validation issue
 */
export interface DependencyIssue {
	/** Type of issue */
	type: DependencyIssueType;
	/** ID of task with the issue */
	taskId: string;
	/** ID of problematic dependency (for missing dependencies) */
	dependencyId?: string;
	/** Human-readable message */
	message: string;
}

/**
 * Result of dependency validation
 */
export interface ValidationResult {
	/** Whether all dependencies are valid */
	valid: boolean;
	/** Array of validation issues found */
	issues: DependencyIssue[];
}

/**
 * Cross-tag dependency information
 */
export interface CrossTagDependency {
	/** Task ID in source tag */
	taskId: string;
	/** Dependency ID in target tag */
	dependencyId: string;
	/** Source tag name */
	sourceTag: string;
	/** Target tag name */
	targetTag: string;
}

/**
 * Options for finding dependencies
 */
export interface FindDependenciesOptions {
	/** Include cross-tag dependencies */
	includeCrossTags?: boolean;
	/** Maximum recursion depth */
	maxDepth?: number;
	/** Tags to search in */
	tags?: string[];
}
