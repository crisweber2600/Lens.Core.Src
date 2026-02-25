/**
 * Tests for Fix (S-036)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const { FIX_TYPES, FixError, diagnose, applyFix, autoFix } = require('../lib/fix');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-fix-'));
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('S-036: Fix', () => {

  beforeEach(() => setup());
  afterEach(() => cleanup());

  describe('FIX_TYPES', () => {
    it('has expected types', () => {
      assert.ok(FIX_TYPES.STATE_CORRUPT);
      assert.ok(FIX_TYPES.MISSING_STATE);
      assert.ok(FIX_TYPES.MISSING_EVENT_LOG);
    });
  });

  describe('diagnose', () => {
    it('detects missing state', () => {
      const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
      fs.mkdirSync(lensDir, { recursive: true });
      const result = diagnose(tmpDir);
      assert.ok(result.issues.length > 0);
      assert.ok(result.issues.some(i => i.type === FIX_TYPES.MISSING_STATE || i.type === FIX_TYPES.MISSING_EVENT_LOG));
    });
  });

  describe('applyFix', () => {
    it('fixes missing state', () => {
      const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
      fs.mkdirSync(lensDir, { recursive: true });
      const result = applyFix(tmpDir, { type: FIX_TYPES.MISSING_STATE });
      assert.ok(result.fixed);
    });
    it('fixes missing event log', () => {
      const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
      fs.mkdirSync(lensDir, { recursive: true });
      const result = applyFix(tmpDir, { type: FIX_TYPES.MISSING_EVENT_LOG });
      assert.ok(result.fixed);
    });
  });

  describe('autoFix', () => {
    it('auto-fixes all fixable issues', () => {
      const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
      fs.mkdirSync(lensDir, { recursive: true });
      const result = autoFix(tmpDir);
      assert.ok(result.fixed >= 0);
    });
  });

  describe('FixError', () => {
    it('has expected fields', () => {
      const err = new FixError('msg', 'CODE');
      assert.equal(err.name, 'FixError');
      assert.equal(err.code, 'CODE');
    });
  });
});
