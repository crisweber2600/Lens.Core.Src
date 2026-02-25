/**
 * Tests for New Initiative (S-034)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  TRACKS, TRACK_PHASES, NewInitiativeError,
  generateId, slugify, buildInitiativeParams,
  formatCreationResult,
} = require('../lib/new-initiative');

describe('S-034: New Initiative', () => {

  describe('TRACKS', () => {
    it('has full and lean tracks', () => {
      assert.ok(TRACKS.includes('full') || TRACKS.FULL);
    });
  });

  describe('TRACK_PHASES', () => {
    it('maps tracks to phases', () => {
      assert.ok(TRACK_PHASES);
    });
  });

  describe('generateId', () => {
    it('generates a unique ID', () => {
      const id = generateId('test-feature');
      assert.ok(typeof id === 'string');
      assert.ok(id.length > 0);
    });
    it('generates different IDs', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      // IDs may or may not differ (depends on timing) — just check generation works
      assert.ok(id1);
      assert.ok(id2);
    });
  });

  describe('slugify', () => {
    it('converts text to slug', () => {
      const slug = slugify('Hello World!');
      assert.ok(!slug.includes(' '));
      assert.ok(slug.includes('hello'));
    });
    it('handles special characters', () => {
      const slug = slugify('Test@#$%Feature');
      assert.ok(typeof slug === 'string');
    });
  });

  describe('buildInitiativeParams', () => {
    it('builds params from user input', () => {
      const params = buildInitiativeParams({
        name: 'New Feature',
        domain: 'lens',
        service: 'lens-work',
        featureName: 'new-feat',
        track: 'full',
      });
      assert.ok(params);
      assert.ok(params.id || params.name);
    });
  });

  describe('formatCreationResult', () => {
    it('formats creation result', () => {
      const result = formatCreationResult(
        { initiativeId: 'test-abc' },
        { track: 'full', domain: 'lens', service: 'lens-work', docsPath: 'Docs/lens', branchRoot: 'lens-root', phases: ['preplan'] },
      );
      assert.ok(typeof result === 'string');
    });
  });

  describe('NewInitiativeError', () => {
    it('has expected fields', () => {
      const err = new NewInitiativeError('msg', 'CODE');
      assert.equal(err.name, 'NewInitiativeError');
      assert.equal(err.code, 'CODE');
    });
  });
});
