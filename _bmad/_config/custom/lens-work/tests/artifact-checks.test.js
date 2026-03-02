/**
 * Tests for Artifact Checks (S-022)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkPhaseArtifacts, extractRequiredArtifacts,
  extractDirectoryArtifacts, updateChecklistWithArtifacts,
  formatArtifactReport,
} = require('../lib/artifact-checks');

describe('S-022: Artifact Checks', () => {

  describe('extractRequiredArtifacts', () => {
    it('returns required artifacts for a phase', () => {
      const result = extractRequiredArtifacts('preplan');
      assert.ok(Array.isArray(result));
    });
  });

  describe('checkPhaseArtifacts', () => {
    it('checks artifacts against requirements', () => {
      const result = checkPhaseArtifacts(process.cwd(), {
        id: 'test',
        domain: 'lens',
        service: 'lens-work',
        feature: 'test',
      }, 'preplan');
      assert.ok(result);
      assert.ok(typeof result.pass === 'boolean' || result.missing !== undefined);
    });
  });

  describe('formatArtifactReport', () => {
    it('formats artifact report', () => {
      const result = formatArtifactReport([
        { artifact: 'product-brief', path: 'Docs/product-brief.md', exists: true },
      ]);
      assert.ok(typeof result === 'string');
    });
  });

  describe('updateChecklistWithArtifacts', () => {
    it('updates checklist items', () => {
      const checklistObj = { items: [{ id: 'artifact-product-brief', type: 'artifact', text: 'product-brief', status: 'pending', required: true }] };
      const checkResults = [{ artifact: 'product-brief', exists: true }];
      const result = updateChecklistWithArtifacts(checklistObj, checkResults);
      assert.ok(result);
    });
  });
});
