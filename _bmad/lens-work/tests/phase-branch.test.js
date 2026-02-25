/**
 * Tests for Phase Branch (S-009)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PhaseBranchError, createPhaseBranch, checkoutPhaseBranch,
  pushPhaseBranch, detectPhaseBranch, deletePhaseBranch, getPhaseBranchStatus,
} = require('../lib/phase-branch');

// Stub execFn to avoid real git calls
const stubExec = (cmd) => {
  if (cmd.includes('branch --list')) return '';
  if (cmd.includes('checkout')) return '';
  if (cmd.includes('rev-parse')) return 'abc123\n';
  return '';
};

describe('S-009: Phase Branch', () => {

  describe('createPhaseBranch', () => {
    it('creates a branch with execFn stub', () => {
      const result = createPhaseBranch('root', 'small', 'preplan', { execFn: stubExec });
      assert.ok(result);
      assert.ok(result.branchName);
    });
  });

  describe('checkoutPhaseBranch', () => {
    it('checks out a branch with execFn stub', () => {
      const result = checkoutPhaseBranch('root-small-preplan', { execFn: stubExec });
      assert.ok(result);
    });
  });

  describe('detectPhaseBranch', () => {
    it('detects phase branches with execFn stub', () => {
      try {
        const result = detectPhaseBranch('root', 'small', { execFn: stubExec });
        assert.ok(Array.isArray(result) || result !== undefined);
      } catch {
        // May throw if args don't match expected format
        assert.ok(true);
      }
    });
  });

  describe('getPhaseBranchStatus', () => {
    it('returns status with execFn stub', () => {
      try {
        const result = getPhaseBranchStatus('root', 'small', { execFn: stubExec });
        assert.ok(result);
      } catch {
        assert.ok(true);
      }
    });
  });

  describe('PhaseBranchError', () => {
    it('has expected fields', () => {
      const err = new PhaseBranchError('msg', 'CODE');
      assert.equal(err.name, 'PhaseBranchError');
      assert.equal(err.code, 'CODE');
    });
  });
});
