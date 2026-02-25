/**
 * Tests for Initiative Switching (S-019)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const {
  SwitchError, listAvailableInitiatives, switchInitiative, formatSwitchResult,
} = require('../lib/switch');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-switch-test-'));
  const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
  const initDir = path.join(lensDir, 'initiatives');
  fs.mkdirSync(initDir, { recursive: true });

  // Create state
  fs.writeFileSync(path.join(lensDir, 'state.yaml'), yaml.dump({
    lifecycle_version: 2,
    active_initiative: 'init-a',
    current_phase: 'preplan',
  }));

  // Create two initiatives
  fs.writeFileSync(path.join(initDir, 'init-a.yaml'), yaml.dump({
    id: 'init-a', name: 'Initiative A', track: 'full',
  }));
  fs.writeFileSync(path.join(initDir, 'init-b.yaml'), yaml.dump({
    id: 'init-b', name: 'Initiative B', track: 'full',
  }));
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('S-019: Initiative Switching', () => {

  beforeEach(() => setup());
  afterEach(() => cleanup());

  describe('listAvailableInitiatives', () => {
    it('lists all initiatives', () => {
      const result = listAvailableInitiatives(tmpDir);
      assert.ok(result);
      assert.ok(result.initiatives);
      assert.ok(Array.isArray(result.initiatives));
    });
  });

  describe('switchInitiative', () => {
    it('switches to a different initiative', () => {
      const result = switchInitiative(tmpDir, 'init-b');
      assert.ok(result);
    });
  });

  describe('formatSwitchResult', () => {
    it('formats switch result', () => {
      const result = switchInitiative(tmpDir, 'init-b');
      const formatted = formatSwitchResult(result);
      assert.ok(typeof formatted === 'string');
    });
  });

  describe('SwitchError', () => {
    it('has expected fields', () => {
      const err = new SwitchError('msg', 'CODE');
      assert.equal(err.name, 'SwitchError');
      assert.equal(err.code, 'CODE');
    });
  });
});
