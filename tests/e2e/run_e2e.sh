#!/usr/bin/env bash

##
# E2E Test Runner for Task Master
# Runs end-to-end tests for CLI workflows
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Log file
LOG_FILE="$SCRIPT_DIR/e2e-test.log"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Parse arguments
ANALYZE_LOG=false
if [ "$1" = "--analyze-log" ]; then
    ANALYZE_LOG=true
fi

# Analyze log file if requested
if [ "$ANALYZE_LOG" = true ]; then
    if [ ! -f "$LOG_FILE" ]; then
        log_error "Log file not found: $LOG_FILE"
        exit 1
    fi

    log_info "Analyzing E2E test log..."
    echo ""
    echo "=== E2E Test Summary ==="
    grep -E "\[(INFO|WARN|ERROR)\]" "$LOG_FILE" | tail -n 50
    echo ""
    echo "=== Test Results ==="
    grep -E "(PASS|FAIL|Test Files|Tests)" "$LOG_FILE" | tail -n 20
    exit 0
fi

# Clear previous log
> "$LOG_FILE"

log_info "Starting E2E test suite..."
log_info "Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# Check if built CLI exists
if [ ! -f "dist/task-master.js" ]; then
    log_warn "CLI not built yet, building..."
    npm run build 2>&1 | tee -a "$LOG_FILE"
fi

# Verify CLI is executable
if [ ! -f "dist/task-master.js" ]; then
    log_error "Build failed - dist/task-master.js not found"
    exit 1
fi

log_info "CLI build verified"

# Check for required environment variables
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$PERPLEXITY_API_KEY" ]; then
    log_warn "No API keys found in environment"
    log_warn "Some E2E tests may be skipped"
fi

# Run E2E tests with Vitest
log_info "Running E2E tests..."
echo ""

# Use vitest to run e2e tests
npm run test -- tests/e2e 2>&1 | tee -a "$LOG_FILE"

TEST_EXIT_CODE=${PIPESTATUS[0]}

echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_info "✅ All E2E tests passed!"
    exit 0
else
    log_error "❌ Some E2E tests failed (exit code: $TEST_EXIT_CODE)"
    log_info "Run 'npm run test:e2e-report' to analyze test log"
    exit $TEST_EXIT_CODE
fi
