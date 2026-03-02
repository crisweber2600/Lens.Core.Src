/**
 * Tests for Dogfood (S-038)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  DogfoodError, createSandbox, simulateLifecycle,
  generateReport, runDogfood,
} = require('../lib/dogfood');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-dogfood-'));
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('S-038: Dogfood', () => {

  beforeEach(() => setup());
  afterEach(() => cleanup());

  describe('createSandbox', () => {
    it('creates sandbox directory', () => {
      const { sandboxRoot, cleanup: clean } = createSandbox(tmpDir);
      assert.ok(fs.existsSync(sandboxRoot));
      clean();
    });
  });

  describe('simulateLifecycle', () => {
    it('runs simulated lifecycle in sandbox', () => {
      const { sandboxRoot, cleanup: clean } = createSandbox(tmpDir);
      const result = simulateLifecycle(sandboxRoot);
      assert.ok(result);
      assert.ok(Array.isArray(result.phases));
      assert.ok(result.phases.length === 5);
      clean();
    });
  });

  describe('generateReport', () => {
    it('generates markdown report', () => {
      const report = generateReport({
        success: true,
        phases: [{ phase: 'preplan', started: true, completed: true, error: null }],
        errors: [],
      });
      assert.ok(report.includes('Dogfood'));
      assert.ok(report.includes('PASS'));
    });
  });

  describe('runDogfood', () => {
    it('runs full dogfood cycle', () => {
      const result = runDogfood(tmpDir);
      assert.ok(typeof result.success === 'boolean');
      assert.ok(typeof result.report === 'string');
    });
  });

  describe('DogfoodError', () => {
    it('has expected fields', () => {
      const err = new DogfoodError('msg', 'CODE');
      assert.equal(err.name, 'DogfoodError');
      assert.equal(err.code, 'CODE');
    });
  });
});
