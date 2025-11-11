/**
 * @fileoverview Sample Task Fixtures for E2E Tests
 * Provides pre-defined task structures for common test scenarios
 */

/**
 * Task interface
 */
export interface Task {
	id: string;
	title: string;
	description: string;
	status: string;
	priority: string;
	dependencies: string[];
	details: string;
	testStrategy: string;
	subtasks: Task[];
}

/**
 * Simple tasks - 3 basic tasks with minimal dependencies
 * Suitable for basic workflow tests
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
 * Complex tasks - 5 tasks with subtasks and dependencies
 * Suitable for complex workflow tests
 */
export const complexTasks: Task[] = [
	{
		id: '1',
		title: 'Backend development',
		description: 'Build backend services',
		status: 'done',
		priority: 'high',
		dependencies: [],
		details: 'Create API endpoints and database schema',
		testStrategy: 'API tests',
		subtasks: [
			{
				id: '1',
				title: 'Setup database',
				description: 'Initialize database',
				status: 'done',
				priority: 'high',
				dependencies: [],
				details: 'Create tables and indexes',
				testStrategy: 'Database tests',
				subtasks: []
			},
			{
				id: '2',
				title: 'Create API endpoints',
				description: 'Build REST API',
				status: 'done',
				priority: 'high',
				dependencies: ['1.1'],
				details: 'Implement CRUD operations',
				testStrategy: 'Integration tests',
				subtasks: []
			}
		]
	},
	{
		id: '2',
		title: 'Frontend development',
		description: 'Build user interface',
		status: 'in-progress',
		priority: 'high',
		dependencies: ['1'],
		details: 'Create React components',
		testStrategy: 'Component tests',
		subtasks: [
			{
				id: '1',
				title: 'Setup React',
				description: 'Initialize React app',
				status: 'done',
				priority: 'high',
				dependencies: [],
				details: 'Configure build tools',
				testStrategy: 'Build verification',
				subtasks: []
			}
		]
	},
	{
		id: '3',
		title: 'Integration testing',
		description: 'Test complete system',
		status: 'pending',
		priority: 'medium',
		dependencies: ['2'],
		details: 'E2E tests with Cypress',
		testStrategy: 'E2E tests',
		subtasks: []
	},
	{
		id: '4',
		title: 'Deployment setup',
		description: 'Configure CI/CD',
		status: 'pending',
		priority: 'medium',
		dependencies: ['2', '3'],
		details: 'Setup GitHub Actions',
		testStrategy: 'Deployment verification',
		subtasks: []
	},
	{
		id: '5',
		title: 'Documentation',
		description: 'Write documentation',
		status: 'pending',
		priority: 'low',
		dependencies: ['4'],
		details: 'API docs and user guide',
		testStrategy: 'Doc review',
		subtasks: []
	}
];

/**
 * Status variety tasks - 6 tasks with all different statuses
 * Suitable for status filtering and transition tests
 */
export const statusVarietyTasks: Task[] = [
	{
		id: '1',
		title: 'Done task',
		description: 'Completed task',
		status: 'done',
		priority: 'high',
		dependencies: [],
		details: 'This task is complete',
		testStrategy: 'Verified',
		subtasks: []
	},
	{
		id: '2',
		title: 'In-progress task',
		description: 'Currently working',
		status: 'in-progress',
		priority: 'high',
		dependencies: ['1'],
		details: 'Work in progress',
		testStrategy: 'Ongoing',
		subtasks: []
	},
	{
		id: '3',
		title: 'Pending task',
		description: 'Ready to start',
		status: 'pending',
		priority: 'medium',
		dependencies: ['1'],
		details: 'Not started yet',
		testStrategy: 'To be tested',
		subtasks: []
	},
	{
		id: '4',
		title: 'Blocked task',
		description: 'Waiting on dependency',
		status: 'blocked',
		priority: 'high',
		dependencies: ['2'],
		details: 'Blocked by task 2',
		testStrategy: 'Wait for unblock',
		subtasks: []
	},
	{
		id: '5',
		title: 'Deferred task',
		description: 'Postponed',
		status: 'deferred',
		priority: 'low',
		dependencies: [],
		details: 'Not urgent',
		testStrategy: 'Deferred',
		subtasks: []
	},
	{
		id: '6',
		title: 'Cancelled task',
		description: 'No longer needed',
		status: 'cancelled',
		priority: 'low',
		dependencies: [],
		details: 'Cancelled due to changed requirements',
		testStrategy: 'N/A',
		subtasks: []
	}
];

/**
 * Create tasks.json data structure
 * @param tasks - Array of tasks
 * @param tag - Tag name (default: 'master')
 * @returns tasks.json compatible object
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
export const samplePRD = `# Project Requirements Document

## Overview
Build a task management system with CLI and web interface.

## Features
1. Task creation and management
2. Dependency tracking
3. Status updates
4. Tag-based organization

## Technical Requirements
- TypeScript codebase
- SQLite database
- React frontend
- Node.js backend

## Testing Strategy
- Unit tests for all modules
- Integration tests for API
- E2E tests for workflows
`;

/**
 * Sample configuration for config tests
 */
export const sampleConfig = {
	version: '1.0.0',
	aiProvider: 'anthropic',
	models: {
		main: {
			provider: 'anthropic',
			id: 'claude-3-5-sonnet-20241022'
		}
	},
	storage: {
		type: 'auto'
	}
};
