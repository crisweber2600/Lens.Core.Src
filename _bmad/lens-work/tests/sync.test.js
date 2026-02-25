/**
 * Tests for Sync (S-035)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const { SyncError, detectDrift, fullDivergenceCheck, repairDrift } = require('../lib/sync');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-sync-'));
  const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
  const initDir = path.join(lensDir, 'initiatives');
  fs.mkdirSync(initDir, { recursive: true });

  fs.writeFileSync(path.join(lensDir, 'state.yaml'), yaml.dump({
    lifecycle_version: 2,
    lens_contract_version: '2.0',
    active_initiative: 'test-init',
    current_phase: 'preplan',
    active_track: 'full',
    workflow_status: 'idle',
    phase_status: { preplan: 'complete', businessplan: null, techplan: null, devproposal: null, sprintplan: null },
    audience_status: { small_to_medium: null, medium_to_large: null, large_to_base: null },
  }));

  fs.writeFileSync(path.join(initDir, 'test-init.yaml'), yaml.dump({
    id: 'test-init',
    name: 'Test',
    lifecycle_version: 2,
    layer: 'feature',
    domain: 'lens',
    domain_prefix: 'lens-lens-work',
    track: 'full',
    initiative_root: 'lens-lens-work-test-init',
    active_phases: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'],
    current_phase: 'preplan',
    phase_status: { preplan: 'complete', businessplan: null, techplan: null, devproposal: null, sprintplan: null },
  }));

  fs.writeFileSync(path.join(lensDir, 'event-log.jsonl'), '', 'utf8');
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('S-035: Sync', () => {

  beforeEach(() => setup());
  afterEach(() => cleanup());

  describe('detectDrift', () => {
    it('detects no drift when synced', () => {
      const result = detectDrift(tmpDir, 'test-init');
      assert.ok(result.clean);
      assert.equal(result.drifts.length, 0);
    });
    it('detects drift when phase_status differs', () => {
      // Introduce drift
      const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
      const stateData = yaml.load(fs.readFileSync(path.join(lensDir, 'state.yaml'), 'utf8'));
      stateData.phase_status.preplan = 'in_progress'; // Different from initiative
      fs.writeFileSync(path.join(lensDir, 'state.yaml'), yaml.dump(stateData));

      const result = detectDrift(tmpDir, 'test-init');
      assert.ok(!result.clean);
      assert.ok(result.drifts.length > 0);
    });
  });

  describe('fullDivergenceCheck', () => {
    it('returns combined analysis', () => {
      const result = fullDivergenceCheck(tmpDir, 'test-init');
      assert.ok(result.analysis);
      assert.ok(result.drifts);
    });
  });

  describe('repairDrift', () => {
    it('repairs nothing when clean', () => {
      const result = repairDrift(tmpDir, 'test-init');
      assert.equal(result.repaired, 0);
    });
  });

  describe('SyncError', () => {
    it('has expected fields', () => {
      const err = new SyncError('msg', 'CODE');
      assert.equal(err.name, 'SyncError');
      assert.equal(err.code, 'CODE');
    });
  });
});
