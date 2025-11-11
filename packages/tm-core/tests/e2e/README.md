# E2E Testing Framework

This directory contains the End-to-End (E2E) testing framework for Task Master CLI. The framework provides utilities, fixtures, and patterns for testing complete user workflows with real CLI command execution.

## Directory Structure

```
tests/e2e/
├── workflows/                 # E2E test files
│   ├── task-management.test.ts
│   └── dependency-management.test.ts
├── utils/                     # Test utilities
│   ├── test-environment.ts   # Environment setup
│   ├── assertions.ts         # Assertion helpers
│   └── index.ts              # Exports
├── fixtures/                  # Test data
│   └── sample-tasks.ts       # Pre-defined task structures
├── run_e2e.sh                # Test runner script
└── README.md                 # This file
```

## Framework Components

### 1. Test Environment (`utils/test-environment.ts`)

Provides isolated temporary directories for each test:

```typescript
import { createTestEnvironment } from '../utils';

const env = await createTestEnvironment('my-test-');

// Execute CLI commands
const { stdout, stderr } = await env.runCLI('list --status=pending');

// File operations
await env.writeFile('.taskmaster/tasks/tasks.json', JSON.stringify(data));
const content = await env.readFile('.taskmaster/tasks/tasks.json');
const exists = await env.fileExists('README.md');

// Cleanup
await env.cleanup();
```

### 2. Domain-Specific Assertions (`utils/assertions.ts`)

Expressive assertions for validating tasks, dependencies, and configuration:

```typescript
import {
  assertTaskExists,
  assertTaskStatus,
  assertDependencyExists,
  assertOutputContains
} from '../utils';

// Task assertions
const task = await assertTaskExists(env, '1');
await assertTaskStatus(env, '2', 'done');
await assertTaskProperties(env, '3', { priority: 'high', status: 'pending' });
await assertTaskCount(env, 5);

// Dependency assertions
await assertDependencyExists(env, '3', '2');

// CLI output assertions
assertOutputContains(stdout, 'Task created successfully');
assertCommandSuccess(stderr);

// Config assertions
await assertConfigValue(env, 'models.main.provider', 'anthropic');
```

### 3. Test Fixtures (`fixtures/sample-tasks.ts`)

Pre-defined task structures for common scenarios:

```typescript
import { simpleTasks, complexTasks, statusVarietyTasks, createTasksData } from '../fixtures/sample-tasks';

// Use fixtures
const tasksData = createTasksData(simpleTasks);
await env.writeFile('.taskmaster/tasks/tasks.json', JSON.stringify(tasksData, null, 2));
```

**Available Fixtures:**
- `simpleTasks` - 3 basic tasks with dependencies
- `complexTasks` - 5 tasks with subtasks
- `statusVarietyTasks` - 6 tasks covering all statuses

## Writing E2E Tests

### Standard Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, type TestEnvironment } from '../utils';
import {
  assertTaskExists,
  assertTaskStatus,
  assertCommandSuccess,
  assertOutputContains
} from '../utils';
import { simpleTasks, createTasksData } from '../fixtures/sample-tasks';

describe('Task Management Workflow', () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    // Create isolated environment
    env = await createTestEnvironment();

    // Setup initial data
    const tasksData = createTasksData(simpleTasks);
    await env.writeFile(
      '.taskmaster/tasks/tasks.json',
      JSON.stringify(tasksData, null, 2)
    );
  });

  afterEach(async () => {
    // Cleanup
    await env.cleanup();
  });

  it('should update task status via CLI', async () => {
    // Execute CLI command
    const { stdout, stderr } = await env.runCLI('set-status --id=2 --status=done');

    // Assert CLI output
    assertCommandSuccess(stderr);
    assertOutputContains(stdout, 'Task status updated');

    // Assert file system changes
    await assertTaskStatus(env, '2', 'done');
  });
});
```

### Key Testing Principles

1. **Complete Isolation**: Each test runs in a separate temporary directory
2. **Real CLI Execution**: Tests execute actual CLI commands (no mocking)
3. **Dual Verification**: Check both CLI output and file system changes
4. **Fixture Usage**: Use pre-defined fixtures instead of inline data

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npm test -- tests/e2e/workflows/task-management.test.ts
```

### Run With Verbose Output

```bash
npm test -- tests/e2e --reporter=verbose
```

### Run Tests in Watch Mode

```bash
npm test -- tests/e2e --watch
```

### Analyze Test Results

```bash
# View test log
cat tests/e2e/e2e-test.log

# Run with custom reporter
npm run test:e2e-report
```

## Test Coverage

### Currently Implemented

**Task Management Workflows:**
- ✅ List tasks with filters
- ✅ Show task details
- ✅ Update task status
- ✅ Get next available task
- ✅ View task statistics
- ✅ Multi-tag support

**Dependency Management Workflows:**
- ✅ Add dependencies
- ✅ Remove dependencies
- ✅ Validate dependencies
- ✅ Fix dependency issues
- ✅ Prevent circular dependencies

### Future Test Coverage

**Planned Workflows:**
- Task creation (add-task, expand)
- Task updates (update-task, update-subtask)
- PRD parsing (parse-prd)
- Tag operations (add-tag, move tasks)
- Configuration management (models, config)

## Best Practices

### DO

✅ **Use fixtures** for test data
```typescript
const tasksData = createTasksData(complexTasks);
```

✅ **Verify both output and file system**
```typescript
assertOutputContains(stdout, 'success');
await assertTaskStatus(env, '1', 'done');
```

✅ **Test error scenarios**
```typescript
it('should handle missing task gracefully', async () => {
  const { stdout, stderr } = await env.runCLI('show 999');
  expect(stdout + stderr).toContain('not found');
});
```

✅ **Clean up in afterEach**
```typescript
afterEach(async () => {
  await env.cleanup();
});
```

### DON'T

❌ **Don't hardcode file paths**
```typescript
// BAD
const content = await fs.readFile('/tmp/tasks.json');

// GOOD
const content = await env.readFile('.taskmaster/tasks/tasks.json');
```

❌ **Don't share state between tests**
```typescript
// BAD - Global variable
let sharedEnv: TestEnvironment;

// GOOD - Fresh environment per test
let env: TestEnvironment;
beforeEach(async () => {
  env = await createTestEnvironment();
});
```

❌ **Don't mock CLI execution**
```typescript
// BAD - Mocking defeats E2E purpose
jest.mock('../cli');

// GOOD - Real CLI execution
const { stdout } = await env.runCLI('list');
```

## Troubleshooting

### Tests Failing Due to Missing CLI Build

```bash
# Build the CLI first
npm run build

# Then run E2E tests
npm run test:e2e
```

### Tests Timing Out

E2E tests may take longer than unit tests due to real CLI execution:

```typescript
// Increase timeout for specific test
it('should complete long operation', async () => {
  // ...
}, 10000); // 10 second timeout
```

### File Permission Errors

Ensure the test runner script is executable:

```bash
chmod +x tests/e2e/run_e2e.sh
```

### Temporary Directory Not Cleaned Up

If tests crash, temporary directories may persist:

```bash
# Clean up manually
rm -rf /tmp/tm-e2e-test-*
```

## Integration with CI/CD

The E2E tests are designed to run in CI environments:

```yaml
# GitHub Actions example
- name: Build CLI
  run: npm run build

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    NODE_ENV: test
```

## Performance Considerations

- Each test creates an isolated temporary directory (~1-5ms)
- CLI execution via child_process adds overhead (~10-50ms per command)
- E2E tests are slower than unit/integration tests
- Expected test duration: ~100-200ms per test
- Full E2E suite: ~5-10 seconds

## Debugging Tests

### Enable Detailed Logging

```typescript
it('should debug CLI output', async () => {
  const { stdout, stderr } = await env.runCLI('list');
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
});
```

### Inspect Temporary Directory

```typescript
it('should inspect test files', async () => {
  console.log('Test directory:', env.tmpDir);

  // Pause to inspect manually (remove before committing)
  await new Promise(resolve => setTimeout(resolve, 60000));
});
```

### Check Test Log File

```bash
tail -f tests/e2e/e2e-test.log
```

## Contributing

When adding new E2E tests:

1. Create test file in `workflows/` directory
2. Follow the standard test pattern
3. Use existing fixtures when possible
4. Add new fixtures to `fixtures/sample-tasks.ts` if needed
5. Ensure tests clean up properly
6. Add test coverage to this README

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Node.js child_process](https://nodejs.org/api/child_process.html)
- [Task Master CLI Documentation](../../README.md)
