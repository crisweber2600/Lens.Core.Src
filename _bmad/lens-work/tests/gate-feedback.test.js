/**
 * Tests for Gate Feedback (S-028)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  formatMissingPRMerge, formatMissingArtifact, formatConstitutionViolation,
  formatStateDrift, formatPromotionRequired, formatPreconditionFeedback,
  formatGateCheckFeedback, getActionForCheck,
} = require('../lib/gate-feedback');

describe('S-028: Gate Feedback', () => {

  describe('formatMissingPRMerge', () => {
    it('formats missing PR merge feedback', () => {
      const result = formatMissingPRMerge('preplan', 'pr-123');
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });
  });

  describe('formatMissingArtifact', () => {
    it('formats missing artifact feedback', () => {
      const result = formatMissingArtifact('preplan', 'product-brief');
      assert.ok(typeof result === 'string');
    });
  });

  describe('formatConstitutionViolation', () => {
    it('formats constitution violation', () => {
      const result = formatConstitutionViolation('preplan', 'Rule X violated', ['allowed1']);
      assert.ok(typeof result === 'string');
    });
  });

  describe('formatStateDrift', () => {
    it('formats state drift feedback', () => {
      const result = formatStateDrift('preplan', [{ field: 'current_phase', stateValue: 'preplan', configValue: 'businessplan' }]);
      assert.ok(typeof result === 'string');
    });
  });

  describe('formatPromotionRequired', () => {
    it('formats promotion required feedback', () => {
      const result = formatPromotionRequired('small', 'medium');
      assert.ok(typeof result === 'string');
    });
  });

  describe('formatPreconditionFeedback', () => {
    it('formats precondition feedback', () => {
      const result = formatPreconditionFeedback('preplan', ['Error 1']);
      assert.ok(typeof result === 'string');
    });
  });

  describe('formatGateCheckFeedback', () => {
    it('formats gate check feedback for passing gate', () => {
      const result = formatGateCheckFeedback('preplan', {
        passed: true,
        results: [],
      });
      assert.ok(typeof result === 'string');
    });
  });

  describe('getActionForCheck', () => {
    it('returns action for a check type', () => {
      const result = getActionForCheck('missing_artifact');
      assert.ok(typeof result === 'string');
    });
  });
});
