# Script Tests

Unit tests for lens-work shell scripts. Each test file corresponds to a script in the parent directory.

## Running Tests

```bash
# Run all tests
for t in test-*.sh; do bash "$t"; done

# Run a specific test
bash test-create-pr.sh
```

## Test Files

| Test | Script Under Test |
|------|-------------------|
| `test-create-pr.sh` | `../create-pr.sh` |
| `test-install.sh` | `../install.sh` |
| `test-promote-branch.sh` | `../promote-branch.sh` |
| `test-setup-control-repo.sh` | `../setup-control-repo.sh` |
| `test-store-github-pat.sh` | `../store-github-pat.sh` |
| `test-preflight.sh` | `../preflight.sh` |
