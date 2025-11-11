/**
 * @fileoverview Sample Task Fixtures for E2E Testing
 * Provides pre-defined task structures for common test scenarios
 */

import type { Task } from '../../../packages/tm-core/src/types/task.js';

/**
 * Simple task list with 3 tasks and basic dependencies
 */
export const simpleTasks: Task[] = [
	{
		id: '1',
		title: 'Setup project',
		description: 'Initialize project structure',
		status: 'done',
		priority: 'high',
		dependencies: [],
		details: 'Create directories and configuration files',
		testStrategy: 'Manual verification of file structure',
		subtasks: []
	},
	{
		id: '2',
		title: 'Implement features',
		description: 'Build core functionality',
		status: 'in-progress',
		priority: 'high',
		dependencies: ['1'],
		details: 'Implement business logic and APIs',
		testStrategy: 'Unit tests and integration tests',
		subtasks: []
	},
	{
		id: '3',
		title: 'Write documentation',
		description: 'Create user documentation',
		status: 'pending',
		priority: 'medium',
		dependencies: ['2'],
		details: 'Write README, API docs, and user guide',
		testStrategy: 'Documentation review',
		subtasks: []
	}
];

/**
 * Complex task hierarchy with subtasks and multiple dependencies
 */
export const complexTasks: Task[] = [
	{
		id: '1',
		title: 'Project initialization',
		description: 'Setup development environment',
		status: 'done',
		priority: 'high',
		dependencies: [],
		details: 'Configure tooling and dependencies',
		testStrategy: 'Verify all tools installed correctly',
		subtasks: [
			{
				id: 1,
				title: 'Install Node.js',
				description: 'Setup Node.js environment',
				status: 'done',
				dependencies: [],
				details: 'Install Node.js v20.x',
				testStrategy: 'Run node --version'
			},
			{
				id: 2,
				title: 'Configure package.json',
				description: 'Setup package configuration',
				status: 'done',
				dependencies: [],
				details: 'Create package.json with dependencies',
				testStrategy: 'Verify package.json structure'
			}
		]
	},
	{
		id: '2',
		title: 'Backend development',
		description: 'Build API server',
		status: 'in-progress',
		priority: 'critical',
		dependencies: ['1'],
		details: 'Implement REST API endpoints',
		testStrategy: 'API integration tests',
		subtasks: [
			{
				id: 1,
				title: 'Database schema',
				description: 'Design database tables',
				status: 'done',
				dependencies: [],
				details: 'Create migration scripts',
				testStrategy: 'Verify schema in database'
			},
			{
				id: 2,
				title: 'API endpoints',
				description: 'Implement CRUD endpoints',
				status: 'in-progress',
				dependencies: [],
				details: 'Create Express routes',
				testStrategy: 'Postman tests'
			}
		]
	},
	{
		id: '3',
		title: 'Frontend development',
		description: 'Build user interface',
		status: 'pending',
		priority: 'high',
		dependencies: ['2'],
		details: 'Create React components',
		testStrategy: 'Component tests with React Testing Library',
		subtasks: []
	},
	{
		id: '4',
		title: 'Testing & QA',
		description: 'Quality assurance testing',
		status: 'pending',
		priority: 'medium',
		dependencies: ['2', '3'],
		details: 'End-to-end testing and bug fixes',
		testStrategy: 'Automated E2E tests with Playwright',
		subtasks: []
	},
	{
		id: '5',
		title: 'Deployment',
		description: 'Deploy to production',
		status: 'deferred',
		priority: 'low',
		dependencies: ['4'],
		details: 'Setup CI/CD pipeline and deploy',
		testStrategy: 'Smoke tests on production',
		subtasks: []
	}
];

/**
 * Tasks with various status types for filtering tests
 */
export const statusVarietyTasks: Task[] = [
	{
		id: '1',
		title: 'Completed task',
		description: 'This is done',
		status: 'done',
		priority: 'high',
		dependencies: [],
		details: 'Finished work',
		testStrategy: 'Verified',
		subtasks: []
	},
	{
		id: '2',
		title: 'In progress task',
		description: 'Currently working',
		status: 'in-progress',
		priority: 'high',
		dependencies: [],
		details: 'Active development',
		testStrategy: 'Ongoing testing',
		subtasks: []
	},
	{
		id: '3',
		title: 'Pending task',
		description: 'Not started yet',
		status: 'pending',
		priority: 'medium',
		dependencies: [],
		details: 'Waiting to start',
		testStrategy: 'Future testing',
		subtasks: []
	},
	{
		id: '4',
		title: 'Blocked task',
		description: 'Waiting on external factor',
		status: 'blocked',
		priority: 'high',
		dependencies: [],
		details: 'Blocked by third party',
		testStrategy: 'Testing when unblocked',
		subtasks: []
	},
	{
		id: '5',
		title: 'Deferred task',
		description: 'Postponed to later',
		status: 'deferred',
		priority: 'low',
		dependencies: [],
		details: 'Low priority, deferred',
		testStrategy: 'Testing later',
		subtasks: []
	},
	{
		id: '6',
		title: 'Cancelled task',
		description: 'No longer needed',
		status: 'cancelled',
		priority: 'low',
		dependencies: [],
		details: 'Requirements changed',
		testStrategy: 'Not applicable',
		subtasks: []
	}
];

/**
 * Create a tasks.json structure with a specific tag
 */
export function createTasksData(tasks: Task[], tag = 'master') {
	return {
		[tag]: {
			tasks,
			metadata: {
				version: '1.0.0',
				lastModified: new Date().toISOString(),
				taskCount: tasks.length,
				completedCount: tasks.filter((t) => t.status === 'done').length,
				tags: [tag]
			}
		}
	};
}

/**
 * Sample PRD content for parse-prd tests
 */
export const samplePRD = `# Sample Project Requirements

## Overview
Build a task management CLI tool for developers.

## Core Features

### Feature 1: Task Management
- Users should be able to create, list, update, and delete tasks
- Tasks should have status, priority, and dependencies
- Support for subtasks and task hierarchies

### Feature 2: Configuration
- Configurable AI models for task generation
- Support for multiple API providers (OpenAI, Anthropic, etc.)
- Persistent configuration across sessions

### Feature 3: Task Dependencies
- Tasks can depend on other tasks
- Automatic dependency validation
- Prevent circular dependencies

## Technical Requirements

### Architecture
- TypeScript codebase with strict type checking
- Domain-driven design with clear separation of concerns
- Comprehensive test coverage (unit, integration, E2E)

### Testing
- Unit tests for all business logic
- Integration tests for domain interactions
- End-to-end tests for CLI workflows

### Documentation
- API documentation with TypeDoc
- User guide with examples
- Contributing guidelines for developers
`;

/**
 * Sample config.json content
 */
export const sampleConfig = {
	version: '1.0.0',
	storage: {
		type: 'file',
		file: {
			tasksPath: '.taskmaster/tasks/tasks.json',
			configPath: '.taskmaster/config.json'
		}
	},
	models: {
		main: {
			provider: 'anthropic',
			name: 'claude-3-5-sonnet-20241022'
		},
		research: {
			provider: 'perplexity',
			name: 'llama-3.1-sonar-large-128k-online'
		},
		fallback: {
			provider: 'openai',
			name: 'gpt-4o-mini'
		}
	},
	activeTag: 'master',
	custom: {}
};
