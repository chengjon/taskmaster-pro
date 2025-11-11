# E2E Testing Framework

## Overview

This directory contains the End-to-End (E2E) testing framework for Task Master CLI. E2E tests validate complete user workflows by executing real CLI commands in isolated test environments.

## Directory Structure

```
tests/e2e/
├── workflows/          # E2E test files for CLI workflows
├── utils/             # Test utilities and helpers
│   ├── test-environment.ts  # Test environment setup
│   ├── assertions.ts        # Domain-specific assertions
│   └── index.ts            # Exports
├── fixtures/          # Sample data and configurations
│   └── sample-tasks.ts     # Pre-defined task structures
├── run_e2e.sh        # Bash script to run E2E tests
└── README.md         # This file
```

## Key Concepts

### Test Environment

Each E2E test runs in an isolated temporary directory with:
- `.taskmaster/` directory structure
- `tasks.json` with initial data
- Isolated file system for safety
- Automatic cleanup after tests

### CLI Execution

Tests execute real CLI commands via `runCLI()`:
```typescript
const { stdout, stderr } = await env.runCLI('list --status=pending');
```

### Assertions

Domain-specific assertions validate:
- Task existence and properties
- Task status changes
- Dependencies between tasks
- Configuration values
- File contents
- CLI output

## Writing E2E Tests

### Basic Test Structure

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, type TestEnvironment } from '../utils';
import { assertTaskExists, assertTaskStatus } from '../utils';
import { simpleTasks, createTasksData } from '../fixtures/sample-tasks';

describe('Task Management Workflow', () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    // Create isolated test environment
    env = await createTestEnvironment();

    // Setup initial tasks
    const tasksData = createTasksData(simpleTasks);
    await env.writeFile(
      '.taskmaster/tasks/tasks.json',
      JSON.stringify(tasksData, null, 2)
    );
  });

  afterEach(async () => {
    // Cleanup test environment
    await env.cleanup();
  });

  it('should list all tasks', async () => {
    const { stdout } = await env.runCLI('list');

    expect(stdout).toContain('Setup project');
    expect(stdout).toContain('Implement features');
  });

  it('should update task status', async () => {
    await env.runCLI('set-status --id=2 --status=done');

    // Verify task status changed
    await assertTaskStatus(env, '2', 'done');
  });
});
```

### Using Test Fixtures

Pre-defined task structures are available in `fixtures/sample-tasks.ts`:

```typescript
import {
  simpleTasks,        // 3 tasks with basic dependencies
  complexTasks,       // 5 tasks with subtasks and complex deps
  statusVarietyTasks, // Tasks with all status types
  createTasksData     // Helper to create tasks.json structure
} from '../fixtures/sample-tasks';

// Use in tests
const tasksData = createTasksData(complexTasks, 'my-feature');
await env.writeFile('.taskmaster/tasks/tasks.json', JSON.stringify(tasksData, null, 2));
```

### Assertion Helpers

```typescript
// Task assertions
await assertTaskExists(env, '1');
await assertTaskStatus(env, '2', 'done');
await assertTaskProperties(env, '3', { priority: 'high', status: 'pending' });
await assertTaskCount(env, 5);

// Subtask assertions
await assertSubtaskExists(env, '1', 1);

// Dependency assertions
await assertDependencyExists(env, '3', '2');

// File assertions
await assertFileContains(env, '.taskmaster/config.json', '"version"');

// Configuration assertions
await assertConfigValue(env, 'models.main.provider', 'anthropic');

// CLI output assertions
assertOutputContains(stdout, 'Task created successfully');
assertCommandSuccess(stderr);
```

### File Operations

```typescript
// Write files
await env.writeFile('.env', 'ANTHROPIC_API_KEY=test');
await env.writeFile('docs/prd.txt', samplePRD);

// Read files
const content = await env.readFile('.taskmaster/tasks/tasks.json');
const tasks = JSON.parse(content);

// Check file existence
if (await env.fileExists('.taskmaster/config.json')) {
  // File exists
}
```

## Running E2E Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific E2E Test File
```bash
npm test -- tests/e2e/workflows/task-management.test.ts
```

### Analyze Test Results
```bash
npm run test:e2e-report
```

### With Verbose Output
```bash
npm test -- tests/e2e --reporter=verbose
```

## Test Coverage Goals

E2E tests should cover:

### Core Workflows
- [x] Project initialization (`init`)
- [ ] Task listing and filtering (`list`)
- [ ] Task status updates (`set-status`)
- [ ] Task creation (`add-task`)
- [ ] Task expansion (`expand`)
- [ ] Dependency management (`add-dependency`, `remove-dependency`)

### Complex Workflows
- [ ] PRD parsing → task generation → expansion
- [ ] Task updates → dependency validation → status changes
- [ ] Multi-tag operations (create, switch, move)
- [ ] Configuration changes → persistence verification

### Error Scenarios
- [ ] Invalid task IDs
- [ ] Circular dependencies
- [ ] Missing API keys (graceful degradation)
- [ ] Invalid configuration values

## Best Practices

### 1. Isolation
Each test must be completely isolated:
- Use separate `TestEnvironment` per test
- Never share state between tests
- Always cleanup in `afterEach`

### 2. Real CLI Commands
Always execute real CLI commands:
```typescript
// ✅ CORRECT - Real CLI execution
await env.runCLI('set-status --id=1 --status=done');

// ❌ WRONG - Direct API calls (use integration tests instead)
await tmCore.tasks.updateStatus('1', 'done');
```

### 3. Verify Side Effects
Check both CLI output AND file system changes:
```typescript
const { stdout } = await env.runCLI('add-task --title="New Task"');
assertOutputContains(stdout, 'Task created');

// Also verify file was updated
await assertTaskExists(env, '1');
```

### 4. Use Fixtures
Prefer fixtures over inline data:
```typescript
// ✅ CORRECT - Use fixture
const tasksData = createTasksData(complexTasks);

// ❌ WRONG - Inline data (hard to maintain)
const tasksData = { master: { tasks: [...], metadata: {...} } };
```

### 5. Meaningful Test Names
```typescript
// ✅ CORRECT - Describes full workflow
it('should update task status and verify persistence', async () => {

// ❌ WRONG - Too vague
it('should work', async () => {
```

## Integration with CI/CD

E2E tests are designed to run in CI environments:
- No interactive prompts
- Graceful handling of missing API keys
- Clear exit codes (0 = success, non-zero = failure)
- Detailed logging to `e2e-test.log`

## Troubleshooting

### Tests Fail Locally But Pass in CI
- Check file permissions on Linux/macOS
- Verify CLI is built (`npm run build`)
- Check for environment variable differences

### CLI Command Times Out
- Increase timeout in vitest.config.ts
- Check if CLI is stuck waiting for input
- Verify command syntax is correct

### File Not Found Errors
- Use `env.fileExists()` to verify files before reading
- Check relative paths (always relative to `env.tmpDir`)
- Ensure files are written before reading

### Assertion Failures
- Read actual file contents for debugging:
  ```typescript
  console.log(await env.readFile('.taskmaster/tasks/tasks.json'));
  ```
- Check CLI stderr for error messages
- Verify test fixtures match expected structure

## Future Enhancements

- [ ] Add screenshot/log capture on test failure
- [ ] Parallel test execution with isolated ports
- [ ] Performance benchmarking for CLI commands
- [ ] Visual regression testing for terminal output
- [ ] Integration with MCP server testing
