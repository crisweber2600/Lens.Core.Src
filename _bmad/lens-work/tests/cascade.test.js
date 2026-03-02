/**
 * Tests for Cascade Merge (S-012)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  AUDIENCE_ORDER, PROMOTION_PATHS, CascadeError,
  hasNewCommits, checkConflicts, getCascadeSteps,
  analyzeCascade, validateCascadeReady,
} = require('../lib/cascade');

const stubExec = (cmd) => {
  if (cmd.includes('rev-list')) return '';
  if (cmd.includes('merge-tree')) return '';
  if (cmd.includes('merge-base')) return 'abc123';
  return '';
};

describe('S-012: Cascade Merge', () => {

  describe('Constants', () => {
    it('AUDIENCE_ORDER has expected values', () => {
      assert.ok(AUDIENCE_ORDER.includes('small'));
      assert.ok(AUDIENCE_ORDER.includes('large'));
    });
    it('PROMOTION_PATHS is defined', () => {
      assert.ok(PROMOTION_PATHS);
    });
  });

  describe('getCascadeSteps', () => {
    it('returns steps for small→base cascade', () => {
      const steps = getCascadeSteps('small');
      assert.ok(Array.isArray(steps));
    });
  });

  describe('hasNewCommits', () => {
    it('returns boolean with stubExec', () => {
      const result = hasNewCommits('branch1', 'branch2', { execFn: stubExec });
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('checkConflicts', () => {
    it('returns conflict check result', () => {
      const result = checkConflicts('branch1', 'branch2', { execFn: stubExec });
      assert.ok(result !== undefined);
    });
  });

  describe('analyzeCascade', () => {
    it('analyzes cascade from audience', () => {
      const result = analyzeCascade('test-root', 'small', { execFn: stubExec });
      assert.ok(result);
    });
  });

  describe('validateCascadeReady', () => {
    it('validates cascade readiness', () => {
      const result = validateCascadeReady('test-root', 'small', { execFn: stubExec });
      assert.ok(typeof result === 'object');
    });
  });

  describe('CascadeError', () => {
    it('has expected fields', () => {
      const err = new CascadeError('msg', 'CODE');
      assert.equal(err.name, 'CascadeError');
      assert.equal(err.code, 'CODE');
    });
  });
});
