#!/usr/bin/env bash
# Test stubs for install.sh
# Tests focus on pure functions that don't require filesystem side effects.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_UNDER_TEST="$SCRIPT_DIR/../install.sh"

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

echo "=== test-install.sh ==="

# TODO: Refactor install.sh to support sourcing helper functions.
echo "  SKIP: ensure_dir — requires script refactor to source functions"
echo "  SKIP: write_file — requires script refactor to source functions"
echo "  SKIP: gh_stub_prompt — requires script refactor to source functions"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
