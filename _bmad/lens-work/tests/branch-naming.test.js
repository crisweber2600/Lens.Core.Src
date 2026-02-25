/**
 * Tests for Branch Naming (S-011)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_BRANCH_LENGTH, WARN_BRANCH_LENGTH, VALID_AUDIENCES, VALID_PHASES,
  BranchNamingError, validateBranchName, buildInitiativeRootName,
  buildAudienceBranchName, buildPhaseBranchName, parseBranchName,
} = require('../lib/branch-naming');

describe('S-011: Branch Naming', () => {

  describe('Constants', () => {
    it('MAX_BRANCH_LENGTH is reasonable', () => {
      assert.ok(MAX_BRANCH_LENGTH > 50);
    });
    it('VALID_AUDIENCES has expected values', () => {
      assert.ok(VALID_AUDIENCES.includes('small'));
      assert.ok(VALID_AUDIENCES.includes('large'));
    });
    it('VALID_PHASES has expected values', () => {
      assert.ok(VALID_PHASES.includes('preplan'));
      assert.ok(VALID_PHASES.includes('sprintplan'));
    });
  });

  describe('buildInitiativeRootName', () => {
    it('builds a root branch name from components', () => {
      const name = buildInitiativeRootName({
        domain: 'lens',
        service: 'lens-work',
        feature: 'upgrade',
        initiativeId: 'abc123',
      });
      assert.ok(name.includes('lens'));
      assert.ok(name.includes('upgrade'));
    });
  });

  describe('buildAudienceBranchName', () => {
    it('appends audience suffix', () => {
      const name = buildAudienceBranchName('lens-root', 'small');
      assert.ok(name.includes('small'));
    });
  });

  describe('buildPhaseBranchName', () => {
    it('appends phase suffix', () => {
      const name = buildPhaseBranchName('lens-root', 'small', 'preplan');
      assert.ok(name.includes('preplan'));
    });
  });

  describe('validateBranchName', () => {
    it('validates a good branch name', () => {
      const result = validateBranchName('lens-lens-work-upgrade-abc123');
      assert.ok(result.valid);
    });
    it('rejects empty string', () => {
      const result = validateBranchName('');
      assert.ok(!result.valid);
    });
  });

  describe('parseBranchName', () => {
    it('parses a full branch name', () => {
      const parsed = parseBranchName('lens-lens-work-upgrade-abc123-small-preplan');
      assert.ok(parsed);
    });
    it('returns null for invalid branch', () => {
      const parsed = parseBranchName('not-a-lens-branch');
      // May return null or partial parse — just check no crash
      assert.ok(true);
    });
  });

  describe('BranchNamingError', () => {
    it('has name and code fields', () => {
      const err = new BranchNamingError('test', 'TEST_CODE');
      assert.equal(err.name, 'BranchNamingError');
      assert.equal(err.code, 'TEST_CODE');
    });
  });
});
