#!/usr/bin/env bash
# Test stubs for setup-control-repo.sh
# Tests focus on pure functions that don't require git or filesystem side effects.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_UNDER_TEST="$SCRIPT_DIR/../setup-control-repo.sh"

PASS=0
FAIL=0

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  PASS: $label"
    ((PASS++))
  else
    echo "  FAIL: $label — expected '$expected', got '$actual'"
    ((FAIL++))
  fi
}

echo "=== test-setup-control-repo.sh ==="

# TODO: Refactor setup-control-repo.sh to support sourcing helper functions.
echo "  SKIP: clone_or_pull — requires script refactor to source functions"
echo "  SKIP: ensure_gitignore_entries — requires script refactor to source functions"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
