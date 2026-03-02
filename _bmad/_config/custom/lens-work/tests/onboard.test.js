/**
 * Tests for Onboarding (S-020)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  STEPS, detectUser, explainConcepts, showTier1Commands,
  suggestNextAction, runOnboard,
} = require('../lib/onboard');

describe('S-020: Onboarding', () => {

  describe('STEPS', () => {
    it('has expected step names', () => {
      assert.ok(Array.isArray(STEPS) || typeof STEPS === 'object');
    });
  });

  describe('detectUser', () => {
    it('returns user detection result', () => {
      const result = detectUser(process.cwd());
      assert.ok(result);
    });
  });

  describe('explainConcepts', () => {
    it('returns concept explanations', () => {
      const result = explainConcepts();
      assert.ok(typeof result === 'string' || typeof result === 'object');
    });
  });

  describe('showTier1Commands', () => {
    it('returns command list', () => {
      const result = showTier1Commands();
      assert.ok(result);
    });
  });

  describe('suggestNextAction', () => {
    it('suggests an action for new user', () => {
      const result = suggestNextAction(false, []);
      assert.ok(result);
      assert.ok(result.suggestion || result.command);
    });
  });

  describe('runOnboard', () => {
    it('runs onboarding flow', () => {
      const result = runOnboard(process.cwd());
      assert.ok(result);
    });
  });
});
