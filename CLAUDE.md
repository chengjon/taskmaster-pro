# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Project Overview

Task Master AI is a monorepo-based task management system designed for AI-driven development. It's built with TypeScript and uses a domain-driven architecture with strict separation between business logic and presentation layers.

## Monorepo Structure

This is a Turborepo-managed monorepo with npm workspaces:

```
claude-task-master/
├── apps/                       # Applications
│   ├── cli/                   # CLI application (@tm/cli)
│   ├── mcp/                   # MCP server (@tm/mcp)
│   ├── docs/                  # Mintlify documentation site
│   └── extension/             # VS Code extension (future)
├── packages/                   # Shared packages
│   ├── tm-core/               # Core business logic (@tm/core) - CRITICAL
│   ├── tm-bridge/             # Legacy bridge (@tm/bridge)
│   ├── build-config/          # Shared build configuration
│   ├── claude-code-plugin/    # Claude Code plugin
│   └── ai-sdk-provider-grok-cli/ # AI SDK provider for Grok
├── scripts/                   # Legacy scripts (being migrated to tm-core)
└── src/                       # Shared utilities and refactored code
```

## Critical Architecture Rule: Business Logic Separation

**ALL business logic MUST live in `@tm/core` (packages/tm-core/), NOT in presentation layers.**

### The @tm/core Package

`@tm/core` is the single source of truth for all business logic. It provides a unified facade (`TmCore`) that exposes domain-specific APIs:

- **`tasks`** - Task management (TasksDomain)
- **`auth`** - Authentication (AuthDomain)
- **`workflow`** - Workflow orchestration (WorkflowDomain)
- **`git`** - Git operations (GitDomain)
- **`config`** - Configuration management (ConfigDomain)
- **`integration`** - External integrations (IntegrationDomain)

**Example usage:**
```typescript
import { createTmCore } from '@tm/core';

const tmCore = await createTmCore({ projectPath: process.cwd() });
const tasks = await tmCore.tasks.list();
await tmCore.tasks.setStatus('1', 'done');
```

### Presentation Layers (Thin Wrappers Only)

- **`@tm/cli`** (apps/cli/) - CLI commands that call tm-core methods and format output
- **`@tm/mcp`** (apps/mcp/) - MCP tools that call tm-core methods and return MCP responses
- **`apps/extension`** - VS Code extension (future)

**What presentation layers should do:**
- Parse CLI arguments or MCP tool parameters
- Call the appropriate tm-core domain method
- Format and display the response

**What presentation layers should NEVER do:**
- Parse task IDs (use `tmCore.tasks.get(taskId)`)
- Validate data (validation lives in tm-core)
- Transform data (transformations live in tm-core)
- Duplicate logic across CLI and MCP

### Migration Status

The codebase is actively being migrated from legacy `scripts/` to the new `@tm/core` architecture. When working on features:

1. **New features**: Implement in `@tm/core` first, then expose via presentation layers
2. **Bug fixes**: If the code is in `scripts/`, consider migrating it to `@tm/core` first
3. **Refactoring**: Prioritize moving logic from `scripts/` → `packages/tm-core/src/modules/`

## Development Commands

### Building

```bash
# Build all packages and apps (uses Turbo and tsdown)
npm run build

# Build in development/watch mode
npm run dev
npm run turbo:dev  # Turbo parallel watch mode

# Build only the build-config package (prerequisite)
npm run build:build-config

# Typecheck without building
npm run turbo:typecheck
```

### Testing

```bash
# Run all tests (uses Jest with ES modules)
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests

# Run tests in watch mode
npm run test:watch

# Run only failed tests
npm run test:fails

# Generate coverage report
npm run test:coverage
npm run test:ci           # CI mode with coverage
```

**Important Test Execution Details:**
- All test commands use `node --experimental-vm-modules` for ESM support
- Tests use Jest with `ts-jest` for TypeScript transformation
- Test files must use `.ts` extension, NOT `.js`

### Code Quality

```bash
# Format code with Biome
npm run format
npm run format-check

# Check dependency consistency across workspaces
npm run deps:check
npm run deps:fix
```

### MCP Development

```bash
# Run MCP server locally
npm run mcp-server

# Inspect MCP server with official inspector
npm run inspector
```

## Test File Placement Guidelines

### Preferred: Co-located Tests

Place tests alongside source files whenever possible:

- **Package unit tests**: `packages/<package-name>/src/<module>/<file>.spec.ts`
- **App unit tests**: `apps/<app-name>/src/<module>/<file>.spec.ts`
- **Package integration tests**: `packages/<package-name>/tests/integration/<module>/<file>.test.ts`
- **App integration tests**: `apps/<app-name>/tests/integration/<module>/<file>.test.ts`

### Fallback: Centralized Tests

Use centralized location only when co-location isn't feasible:

- **Isolated unit tests**: `tests/unit/packages/<package-name>/`
- **E2E tests**: `tests/e2e/`

### Test File Naming

- **Unit tests**: `*.spec.ts` (e.g., `task-manager.spec.ts`)
- **Integration tests**: `*.test.ts` (e.g., `task-api.test.ts`)
- **Always use `.ts` extension**, never `.js`

## Synchronous Test Pattern

**NEVER use async/await in test functions unless testing actual asynchronous operations.**

```typescript
// ✅ CORRECT - Synchronous imports and test
import { MyClass } from '../src/my-class.js';

it('should verify behavior', () => {
  expect(new MyClass().property).toBe(value);
});

// ❌ INCORRECT - Unnecessary async
it('should verify behavior', async () => {
  const { MyClass } = await import('../src/my-class.js');
  expect(new MyClass().property).toBe(value);
});
```

## When to Write Tests

**ALWAYS write tests for:**
- Bug fixes (regression prevention)
- Business logic (calculations, validations, transformations)
- Edge cases (boundaries, errors, null/undefined)
- Public APIs (methods other code depends on)
- Integration points (database, file system, external APIs)

**SKIP tests for:**
- Simple getters/setters
- Trivial pass-through functions
- Pure configuration objects
- Code that just delegates to tested functions

**Bug Fix Workflow:**
1. Encounter a bug
2. Write a failing test that reproduces it
3. Fix the bug
4. Verify test now passes
5. Commit both fix and test together

## Build System

### tsdown Configuration

The project uses `tsdown` (powered by esbuild) for fast builds:

- **Config**: `tsdown.config.ts`
- **Entry points**:
  - `task-master`: `scripts/dev.js` (CLI)
  - `mcp-server`: `mcp-server/server.js` (MCP)
- **Output**: `dist/` directory
- **Bundling**: Bundles `@tm/*` workspace packages, keeps npm dependencies external
- **Environment variables**: Build-time injection for `TM_PUBLIC_*` vars

### TypeScript Configuration

- **Root config**: `tsconfig.json`
- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **Path aliases**: All packages use `@tm/<package>` imports
- **Strict mode**: Enabled

Example path aliases:
```typescript
import { createTmCore } from '@tm/core';
import { TasksDomain } from '@tm/core/modules/tasks';
```

## Package.json Scripts Explained

### Main Build Scripts
- `build` - Production build (builds build-config first, then runs tsdown)
- `dev` - Watch mode for development
- `turbo:build` / `turbo:dev` - Turborepo parallel builds

### Test Scripts
- `test` - Run all tests with Jest + ESM support
- `test:unit` - Only unit tests (path pattern: `unit`)
- `test:integration` - Only integration tests (path pattern: `integration`)
- `test:watch` - Interactive watch mode
- `test:fails` - Re-run only failed tests
- `test:coverage` - Generate coverage report
- `test:ci` - CI mode with coverage
- `test:e2e` - Run end-to-end tests (bash script)

### Release Management
- `changeset` - Create a changeset (required for most PRs)
- `release` - Publish packages (maintainers only)
- `publish-packages` - Full release pipeline

## Working with Changesets

When making changes that affect users, create a changeset:

```bash
npm run changeset
```

**Choose the appropriate bump type:**
- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes, docs, performance improvements

**Changeset summary tips:**
- Write user-facing descriptions (goes in CHANGELOG.md)
- Focus on WHAT changed for users, not HOW it was implemented
- Example: "Add support for custom Ollama models" (not "Implement model validation class")

## Documentation Guidelines

- **Documentation site**: `apps/docs/` (Mintlify-powered)
- **Public URL**: https://docs.task-master.dev
- **DO NOT** create docs in `docs/` directory
- **DO NOT** reference local file paths in user-facing docs

## Important File Patterns

### Files to Never Manually Edit

- `.taskmaster/tasks/tasks.json` - Use CLI/MCP commands instead
- `.taskmaster/config.json` - Use `TAMP models` command
- `package-lock.json` - Auto-managed by npm

### Configuration Files

- `.env.example` - Template for API keys (copy to `.env`)
- `biome.json` - Code formatter configuration (tabs, single quotes)
- `jest.config.js` - Test runner configuration
- `turbo.json` - Turborepo task pipeline
- `.manypkg.json` - Workspace dependency validation

## TypeScript Path Resolution

The project uses TypeScript path aliases for clean imports:

```typescript
// Workspace packages
import { createTmCore } from '@tm/core';
import { TasksDomain } from '@tm/core/modules/tasks';
import { CLI } from '@tm/cli';

// Within packages, use relative imports for internal modules
import { TaskManager } from './task-manager.js';
import type { Task } from '../types/task.js';
```

**Note**: When importing TypeScript files, use `.js` extension in import paths (TypeScript convention for ESM).

## MCP Server Development

The MCP server (`apps/mcp/`) provides tools for AI editors to interact with Task Master:

- **Tools location**: `apps/mcp/src/tools/`
- **Shared utilities**: `apps/mcp/src/shared/`
- **Tool implementation**: Each tool calls `@tm/core` methods
- **Testing**: Use `npm run inspector` to test tools with MCP Inspector

## Legacy Code Migration

The `scripts/` directory contains legacy code being migrated to `@tm/core`. When working with this code:

1. **Identify** if the function belongs to a domain (tasks, config, git, etc.)
2. **Create** the equivalent method in the appropriate domain class in `@tm/core`
3. **Update** CLI and MCP to use the new tm-core method
4. **Test** the new implementation
5. **Remove** the legacy script code

## Common Gotchas

### Import Extensions
Always use `.js` extensions in TypeScript imports for ESM compatibility:
```typescript
import { foo } from './bar.js';  // ✅ Correct
import { foo } from './bar';     // ❌ Wrong
```

### Test File Extensions
Test files must use `.ts` extension:
```typescript
// ✅ Correct
task-manager.spec.ts
task-api.test.ts

// ❌ Wrong
task-manager.spec.js
task-api.test.js
```

### Async Tests
Only use async when actually testing async operations:
```typescript
// ✅ Correct - testing async operation
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ❌ Wrong - synchronous operation doesn't need async
it('should parse ID', async () => {
  expect(parseId('1.2')).toEqual({ taskId: 1, subtaskId: 2 });
});
```

### Business Logic Location
Never put business logic in CLI or MCP layers:
```typescript
// ❌ WRONG - Logic in CLI
async function handleShowTask(id: string) {
  const parts = id.split('.');
  const taskId = parseInt(parts[0]);
  // ... more parsing logic
}

// ✅ CORRECT - Logic in tm-core
const task = await tmCore.tasks.get(id);  // tm-core handles parsing
```

## Running Single Tests

To run a specific test file or pattern:

```bash
# Run specific test file
npm test -- path/to/test.spec.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should parse task IDs"

# Run tests in a specific package
npm test -- packages/tm-core

# Run with coverage for specific files
npm test -- --coverage --collectCoverageFrom="packages/tm-core/src/**/*.ts"
```

## Environment Variables

### Required for Testing
Copy `.env.example` to `.env` and add at least one API key:
- `ANTHROPIC_API_KEY` - For Claude models (recommended)
- `PERPLEXITY_API_KEY` - For research features (recommended)
- `OPENAI_API_KEY` - For GPT models
- `GOOGLE_API_KEY` - For Gemini models

### Build-time Variables
Variables prefixed with `TM_PUBLIC_*` are injected at build time:
- `TM_PUBLIC_VERSION` - Auto-injected from package.json

## Code Style

- **Formatter**: Biome (tabs, single quotes, 80 char line width)
- **Linting**: Biome linter (currently only enabled for extension app)
- **Pre-commit**: Format code before committing
- **Imports**: Use path aliases for workspace packages, relative for internal modules

## Contributing Workflow

1. **Branch**: Always create PRs against `next` branch, not `main`
2. **Test**: Run `npm test` locally before pushing
3. **Format**: Run `npm run format` before committing
4. **Changeset**: Create changeset for user-facing changes
5. **Build**: Ensure `npm run build` succeeds
6. **Review**: Self-review your changes before requesting review

## Common Development Tasks

### Adding a new command
1. Implement business logic in `@tm/core` domain
2. Create CLI command in `apps/cli/src/commands/`
3. Create MCP tool in `apps/mcp/src/tools/`
4. Add tests in respective test directories
5. Create changeset

### Fixing a bug
1. Write failing test that reproduces the bug
2. Fix the bug (preferably in `@tm/core`)
3. Verify test passes
4. Create changeset
5. Commit fix and test together

### Migrating legacy code
1. Identify the domain it belongs to (tasks, config, git, etc.)
2. Implement in appropriate `@tm/core` domain class
3. Add tests in `packages/tm-core/src/<domain>/*.spec.ts`
4. Update CLI to use new tm-core method
5. Update MCP to use new tm-core method
6. Remove legacy code
7. Create changeset
