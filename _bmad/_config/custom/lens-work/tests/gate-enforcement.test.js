/**
 * Tests for Gate Enforcement (S-040)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  ENFORCEMENT_OUTCOMES, PHASE_ARTIFACTS, GateEnforcementError,
  checkArtifacts, checkPreconditions, checkConstitution,
  enforce, buildFeedback,
} = require('../lib/gate-enforcement');

describe('S-040: Gate Enforcement', () => {

  describe('ENFORCEMENT_OUTCOMES', () => {
    it('has PASS and FAIL', () => {
      assert.equal(ENFORCEMENT_OUTCOMES.PASS, 'pass');
      assert.equal(ENFORCEMENT_OUTCOMES.FAIL, 'fail');
    });
  });

  describe('PHASE_ARTIFACTS', () => {
    it('maps phases to required artifacts', () => {
      assert.ok(Array.isArray(PHASE_ARTIFACTS.preplan));
      assert.ok(PHASE_ARTIFACTS.preplan.includes('product-brief'));
    });
  });

  describe('checkArtifacts', () => {
    it('checks artifact existence', () => {
      const result = checkArtifacts(process.cwd(), 'preplan', { id: 'test' });
      assert.ok(typeof result.pass === 'boolean');
      assert.ok(Array.isArray(result.missing));
    });
  });

  describe('checkPreconditions', () => {
    it('checks phase preconditions', () => {
      const result = checkPreconditions(process.cwd(), 'preplan', { current_phase: null }, { id: 'test', track: 'full' });
      assert.ok(typeof result.pass === 'boolean');
    });
  });

  describe('checkConstitution', () => {
    it('checks constitution constraints', () => {
      const result = checkConstitution(process.cwd(), 'preplan', { id: 'test' });
      assert.ok(typeof result.pass === 'boolean');
    });
  });

  describe('enforce', () => {
    it('runs full enforcement', () => {
      const result = enforce({
        projectRoot: process.cwd(),
        phase: 'preplan',
        stateData: { current_phase: null },
        initConfig: { id: 'test', track: 'full' },
      }, { record: false });
      assert.ok(result.outcome === 'pass' || result.outcome === 'fail');
      assert.ok(typeof result.feedback === 'string');
    });
  });

  describe('buildFeedback', () => {
    it('builds pass feedback', () => {
      const result = buildFeedback('preplan', 'pass',
        { pass: true, missing: [], present: ['product-brief'] },
        { pass: true, errors: [] },
        { pass: true, violations: [] },
      );
      assert.ok(result.includes('PASSED'));
    });
    it('builds fail feedback', () => {
      const result = buildFeedback('preplan', 'fail',
        { pass: false, missing: ['product-brief'], present: [] },
        { pass: true, errors: [] },
        { pass: true, violations: [] },
      );
      assert.ok(result.includes('FAILED'));
    });
  });

  describe('GateEnforcementError', () => {
    it('has expected fields', () => {
      const err = new GateEnforcementError('msg', 'CODE');
      assert.equal(err.name, 'GateEnforcementError');
      assert.equal(err.code, 'CODE');
    });
  });
});
