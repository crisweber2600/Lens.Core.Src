/**
 * Tests for Preconditions (S-025)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PHASE_ORDER, PHASE_AUDIENCE_MAP, PHASE_PREREQUISITES,
  PreconditionError, getPreviousPhase, getPhaseAudience,
  validatePreconditions, formatPreconditionErrors,
} = require('../lib/preconditions');

describe('S-025: Preconditions', () => {

  describe('Constants', () => {
    it('PHASE_ORDER has 5 phases', () => {
      assert.equal(PHASE_ORDER.length, 5);
    });
    it('PHASE_AUDIENCE_MAP maps phases to audiences', () => {
      assert.ok(PHASE_AUDIENCE_MAP.preplan);
    });
    it('PHASE_PREREQUISITES is defined', () => {
      assert.ok(PHASE_PREREQUISITES);
    });
  });

  describe('getPreviousPhase', () => {
    it('returns null for preplan', () => {
      const prev = getPreviousPhase('preplan');
      assert.equal(prev, null);
    });
    it('returns preplan for businessplan', () => {
      const prev = getPreviousPhase('businessplan');
      assert.equal(prev, 'preplan');
    });
  });

  describe('getPhaseAudience', () => {
    it('returns audience for preplan', () => {
      const aud = getPhaseAudience('preplan');
      assert.equal(aud, 'small');
    });
  });

  describe('validatePreconditions', () => {
    it('validates first phase with minimal state', () => {
      const result = validatePreconditions({
        projectRoot: process.cwd(),
        phase: 'preplan',
        stateData: { current_phase: null },
        initConfig: { id: 'test', track: 'full' },
      });
      assert.ok(result);
      assert.ok(typeof result.valid === 'boolean');
    });
    it('returns errors for invalid phase', () => {
      const result = validatePreconditions({
        projectRoot: process.cwd(),
        phase: 'nonexistent',
        stateData: {},
        initConfig: { id: 'test' },
      });
      assert.ok(!result.valid);
    });
  });

  describe('formatPreconditionErrors', () => {
    it('formats errors into readable text', () => {
      const result = formatPreconditionErrors([{ message: 'Error 1', action: 'Fix it' }]);
      assert.ok(typeof result === 'string');
      assert.ok(result.includes('Error 1'));
    });
  });

  describe('PreconditionError', () => {
    it('has expected fields', () => {
      const err = new PreconditionError('msg', 'CODE');
      assert.equal(err.name, 'PreconditionError');
      assert.equal(err.code, 'CODE');
    });
  });
});
