/**
 * Tests for Phase Gate Validation (S-015)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  GATE_RESULT, GateError, validateTrack, validateArtifacts,
  validateReviewers, runGateCheck,
} = require('../lib/gates');

describe('S-015: Phase Gate Validation', () => {

  describe('GATE_RESULT', () => {
    it('has PASS and BLOCK', () => {
      assert.ok(GATE_RESULT.PASS);
      assert.ok(GATE_RESULT.BLOCK);
    });
    it('is frozen', () => {
      assert.throws(() => { GATE_RESULT.CUSTOM = 'x'; });
    });
  });

  describe('validateTrack', () => {
    it('validates full track', () => {
      const result = validateTrack('full', 'preplan');
      assert.ok(result);
    });
  });

  describe('validateArtifacts', () => {
    it('returns validation result', () => {
      const result = validateArtifacts('preplan', { artifacts: {} });
      assert.ok(typeof result === 'object');
    });
  });

  describe('validateReviewers', () => {
    it('returns reviewer validation', () => {
      const result = validateReviewers('preplan', {});
      assert.ok(typeof result === 'object');
    });
  });

  describe('runGateCheck', () => {
    it('runs full gate check', () => {
      const result = runGateCheck({
        phase: 'preplan',
        track: 'full',
        initConfig: { id: 'test', track: 'full' },
        stateData: { current_phase: 'preplan' },
        resolved: {},
      });
      assert.ok(result);
      assert.ok(typeof result.passed === 'boolean' || result.result || result.outcome);
    });
  });

  describe('GateError', () => {
    it('has expected fields', () => {
      const err = new GateError('msg', 'CODE');
      assert.equal(err.name, 'GateError');
      assert.equal(err.code, 'CODE');
    });
  });
});
