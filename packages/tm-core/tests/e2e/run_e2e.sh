#!/usr/bin/env bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$SCRIPT_DIR/e2e-test.log"

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_section() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n" | tee -a "$LOG_FILE"
}

# Initialize log file
echo "E2E Test Run - $(date)" > "$LOG_FILE"
echo "================================" >> "$LOG_FILE"

cd "$PROJECT_ROOT"

log_section "Environment Check"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js."
    exit 1
fi

log_info "Node.js version: $(node --version)"
log_info "npm version: $(npm --version)"

# Check if built CLI exists
log_section "Build Verification"

if [ ! -f "dist/task-master.js" ]; then
    log_warn "CLI not built yet, building..."
    npm run build 2>&1 | tee -a "$LOG_FILE"
else
    log_info "CLI already built at dist/task-master.js"
fi

# Check for API keys (optional for E2E tests that don't use AI)
log_section "API Key Check"

if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
    log_warn "No AI API keys found. Tests requiring AI will be skipped."
else
    log_info "API keys configured"
fi

# Run E2E tests with Vitest
log_section "Running E2E Tests"

log_info "Starting E2E test suite..."
npm run test -- tests/e2e 2>&1 | tee -a "$LOG_FILE"

TEST_EXIT_CODE=${PIPESTATUS[0]}

log_section "Test Results"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_info "✅ All E2E tests passed!"
    exit 0
else
    log_error "❌ Some E2E tests failed (exit code: $TEST_EXIT_CODE)"
    log_info "Check $LOG_FILE for details"
    log_info "Run 'npm run test:e2e-report' to analyze test log"
    exit $TEST_EXIT_CODE
fi
