/**
 * Tests for State Divergence Detection (S-007)
 *
 * Tests divergence detection, preflight checks, and report formatting.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const yaml = require('js-yaml');

const {
  SHARED_FIELDS,
  SEVERITY,
  DivergenceError,
  detectDivergence,
  preflightCheck,
  formatReport,
  deepEqual,
  resolveConfigPath,
} = require('../lib/divergence');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'divergence-test-'));
}

function writeState(root, state) {
  const statePath = path.resolve(root, '_bmad-output/lens-work/state.yaml');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const header = '# v2 — Lifecycle Contract personal state\n';
  fs.writeFileSync(statePath, header + yaml.dump(state, { lineWidth: -1, noRefs: true, sortKeys: false }), 'utf8');
  return statePath;
}

function writeConfig(root, initiativeId, config) {
  const configPath = path.resolve(root, '_bmad-output/lens-work/initiatives', `${initiativeId}.yaml`);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, yaml.dump(config, { lineWidth: -1, noRefs: true, sortKeys: false }), 'utf8');
  return configPath;
}

function makeConsistentPair(initiativeId = 'test-init') {
  const phaseStatus = {
    preplan: 'complete',
    businessplan: 'complete',
    techplan: 'in_progress',
    devproposal: null,
    sprintplan: null,
  };

  const state = {
    lifecycle_version: 2,
    active_initiative: initiativeId,
    current_phase: 'techplan',
    active_track: 'full',
    workflow_status: 'idle',
    phase_status: { ...phaseStatus },
    audience_status: { small_to_medium: null, medium_to_large: null, large_to_base: null },
  };

  const config = {
    lifecycle_version: 2,
    id: initiativeId,
    name: 'test',
    layer: 'feature',
    domain: 'Test',
    domain_prefix: 'test',
    track: 'full',
    initiative_root: `test-${initiativeId}`,
    active_phases: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'],
    phase_status: { ...phaseStatus },
    current_phase: 'techplan',
  };

  return { state, config };
}

function cleanUp(root) {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S-007: State Divergence Detection', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
  });

  afterEach(() => {
    cleanUp(tmpRoot);
  });

  // ── deepEqual ───────────────────────────────────────────────────────────

  describe('deepEqual', () => {
    it('returns true for identical primitives', () => {
      assert.equal(deepEqual('hello', 'hello'), true);
      assert.equal(deepEqual(42, 42), true);
      assert.equal(deepEqual(null, null), true);
      assert.equal(deepEqual(true, true), true);
    });

    it('returns false for different primitives', () => {
      assert.equal(deepEqual('hello', 'world'), false);
      assert.equal(deepEqual(42, 43), false);
      assert.equal(deepEqual(null, 'null'), false);
      assert.equal(deepEqual(true, false), false);
    });

    it('returns true for identical objects', () => {
      const a = { preplan: 'complete', businessplan: 'in_progress' };
      const b = { preplan: 'complete', businessplan: 'in_progress' };
      assert.equal(deepEqual(a, b), true);
    });

    it('returns true for objects with different key order', () => {
      const a = { businessplan: 'in_progress', preplan: 'complete' };
      const b = { preplan: 'complete', businessplan: 'in_progress' };
      assert.equal(deepEqual(a, b), true);
    });

    it('returns false for objects with different values', () => {
      const a = { preplan: 'complete', businessplan: 'in_progress' };
      const b = { preplan: 'complete', businessplan: 'complete' };
      assert.equal(deepEqual(a, b), false);
    });

    it('returns false for objects with different key count', () => {
      const a = { preplan: 'complete' };
      const b = { preplan: 'complete', businessplan: 'in_progress' };
      assert.equal(deepEqual(a, b), false);
    });

    it('returns false for null vs object', () => {
      assert.equal(deepEqual(null, {}), false);
      assert.equal(deepEqual({}, null), false);
    });

    it('handles nested objects', () => {
      const a = { outer: { inner: 'value' } };
      const b = { outer: { inner: 'value' } };
      assert.equal(deepEqual(a, b), true);
    });
  });

  // ── resolveConfigPath ──────────────────────────────────────────────────

  describe('resolveConfigPath', () => {
    it('finds flat initiative config', () => {
      writeConfig(tmpRoot, 'my-init', { id: 'my-init' });
      const result = resolveConfigPath(tmpRoot, 'my-init');
      assert.ok(result);
      assert.ok(result.endsWith('my-init.yaml'));
    });

    it('finds nested Service.yaml', () => {
      const dir = path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/my-init');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'Service.yaml'), 'id: my-init', 'utf8');
      const result = resolveConfigPath(tmpRoot, 'my-init');
      assert.ok(result);
      assert.ok(result.endsWith('Service.yaml'));
    });

    it('finds nested Domain.yaml', () => {
      const dir = path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/my-init');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'Domain.yaml'), 'id: my-init', 'utf8');
      const result = resolveConfigPath(tmpRoot, 'my-init');
      assert.ok(result);
      assert.ok(result.endsWith('Domain.yaml'));
    });

    it('returns null when config not found', () => {
      const result = resolveConfigPath(tmpRoot, 'nonexistent');
      assert.equal(result, null);
    });
  });

  // ── detectDivergence ──────────────────────────────────────────────────

  describe('detectDivergence', () => {
    it('returns no divergence when fields match', () => {
      const { state, config } = makeConsistentPair('test-init');
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'test-init', config);

      const report = detectDivergence(tmpRoot);
      assert.equal(report.divergent, false);
      assert.equal(report.severity, SEVERITY.NONE);
      assert.equal(report.initiative, 'test-init');
      assert.ok(report.statePath);
      assert.ok(report.configPath);
      assert.equal(report.fields.length, SHARED_FIELDS.length);
      report.fields.forEach((f) => assert.equal(f.match, true));
    });

    it('detects divergence on current_phase', () => {
      const { state, config } = makeConsistentPair('test-init');
      state.current_phase = 'businessplan';
      config.current_phase = 'techplan';
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'test-init', config);

      const report = detectDivergence(tmpRoot);
      assert.equal(report.divergent, true);
      assert.equal(report.severity, SEVERITY.CRITICAL);
      const phaseField = report.fields.find((f) => f.field === 'current_phase');
      assert.equal(phaseField.match, false);
      assert.equal(phaseField.stateValue, 'businessplan');
      assert.equal(phaseField.initValue, 'techplan');
    });

    it('detects divergence on phase_status', () => {
      const { state, config } = makeConsistentPair('test-init');
      state.phase_status.techplan = 'in_progress';
      config.phase_status.techplan = 'complete';
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'test-init', config);

      const report = detectDivergence(tmpRoot);
      assert.equal(report.divergent, true);
      assert.equal(report.severity, SEVERITY.CRITICAL);
      const statusField = report.fields.find((f) => f.field === 'phase_status');
      assert.equal(statusField.match, false);
    });

    it('returns no divergence when no active initiative', () => {
      const state = {
        lifecycle_version: 2,
        active_initiative: null,
        current_phase: null,
        active_track: null,
        workflow_status: 'idle',
        phase_status: {},
        audience_status: { small_to_medium: null, medium_to_large: null, large_to_base: null },
      };
      writeState(tmpRoot, state);

      const report = detectDivergence(tmpRoot);
      assert.equal(report.divergent, false);
      assert.equal(report.severity, SEVERITY.NONE);
      assert.equal(report.initiative, null);
      assert.equal(report.fields.length, 0);
    });

    it('returns critical divergence when config is missing', () => {
      const state = {
        lifecycle_version: 2,
        active_initiative: 'ghost-init',
        current_phase: 'preplan',
        active_track: 'full',
        workflow_status: 'idle',
        phase_status: { preplan: 'in_progress' },
        audience_status: { small_to_medium: null, medium_to_large: null, large_to_base: null },
      };
      writeState(tmpRoot, state);

      const report = detectDivergence(tmpRoot);
      assert.equal(report.divergent, true);
      assert.equal(report.severity, SEVERITY.CRITICAL);
      assert.ok(report.error);
      assert.equal(report.configPath, null);
    });

    it('throws DivergenceError when state file missing', () => {
      assert.throws(
        () => detectDivergence(tmpRoot),
        (err) => err instanceof DivergenceError && err.code === 'STATE_NOT_FOUND',
      );
    });

    it('throws DivergenceError when config is unparseable', () => {
      const state = {
        lifecycle_version: 2,
        active_initiative: 'bad-config',
        current_phase: 'preplan',
        active_track: 'full',
        workflow_status: 'idle',
        phase_status: {},
        audience_status: { small_to_medium: null, medium_to_large: null, large_to_base: null },
      };
      writeState(tmpRoot, state);

      const configPath = path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/bad-config.yaml');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, '{{{{invalid yaml!!!!', 'utf8');

      assert.throws(
        () => detectDivergence(tmpRoot),
        (err) => err instanceof DivergenceError && err.code === 'CONFIG_PARSE_ERROR',
      );
    });

    it('accepts initiativeId override via options', () => {
      const { state, config } = makeConsistentPair('override-init');
      state.active_initiative = 'something-else';
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'override-init', config);

      const report = detectDivergence(tmpRoot, { initiativeId: 'override-init' });
      assert.equal(report.initiative, 'override-init');
      assert.equal(report.divergent, false);
    });

    it('handles null values in shared fields gracefully', () => {
      const { state, config } = makeConsistentPair('test-init');
      state.current_phase = null;
      config.current_phase = null;
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'test-init', config);

      const report = detectDivergence(tmpRoot);
      const phaseField = report.fields.find((f) => f.field === 'current_phase');
      assert.equal(phaseField.match, true);
    });

    it('treats missing field in config as null', () => {
      const { state, config } = makeConsistentPair('test-init');
      delete config.current_phase;
      state.current_phase = null;
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'test-init', config);

      const report = detectDivergence(tmpRoot);
      const phaseField = report.fields.find((f) => f.field === 'current_phase');
      assert.equal(phaseField.match, true);
    });
  });

  // ── preflightCheck ────────────────────────────────────────────────────

  describe('preflightCheck', () => {
    it('returns ok when consistent', () => {
      const { state, config } = makeConsistentPair('test-init');
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'test-init', config);

      const result = preflightCheck(tmpRoot);
      assert.equal(result.ok, true);
      assert.ok(result.report);
      assert.equal(result.report.divergent, false);
    });

    it('throws DivergenceError when divergent', () => {
      const { state, config } = makeConsistentPair('test-init');
      state.current_phase = 'businessplan';
      config.current_phase = 'techplan';
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'test-init', config);

      assert.throws(
        () => preflightCheck(tmpRoot),
        (err) => {
          assert.ok(err instanceof DivergenceError);
          assert.equal(err.code, 'DIVERGENCE_DETECTED');
          assert.ok(err.details.fields);
          assert.equal(err.details.severity, SEVERITY.CRITICAL);
          return true;
        },
      );
    });

    it('throws when config missing for active initiative', () => {
      const state = {
        lifecycle_version: 2,
        active_initiative: 'missing-init',
        current_phase: 'preplan',
        active_track: 'full',
        workflow_status: 'idle',
        phase_status: { preplan: 'in_progress' },
        audience_status: { small_to_medium: null, medium_to_large: null, large_to_base: null },
      };
      writeState(tmpRoot, state);

      assert.throws(
        () => preflightCheck(tmpRoot),
        (err) => err instanceof DivergenceError && err.code === 'DIVERGENCE_DETECTED',
      );
    });

    it('succeeds when no active initiative', () => {
      const state = {
        lifecycle_version: 2,
        active_initiative: null,
        current_phase: null,
        active_track: null,
        workflow_status: 'idle',
        phase_status: {},
        audience_status: { small_to_medium: null, medium_to_large: null, large_to_base: null },
      };
      writeState(tmpRoot, state);

      const result = preflightCheck(tmpRoot);
      assert.equal(result.ok, true);
    });

    it('passes options through to detectDivergence', () => {
      const { state, config } = makeConsistentPair('override-init');
      state.active_initiative = 'wrong';
      writeState(tmpRoot, state);
      writeConfig(tmpRoot, 'override-init', config);

      const result = preflightCheck(tmpRoot, { initiativeId: 'override-init' });
      assert.equal(result.ok, true);
    });
  });

  // ── formatReport ──────────────────────────────────────────────────────

  describe('formatReport', () => {
    it('formats consistent report', () => {
      const report = {
        divergent: false,
        severity: SEVERITY.NONE,
        fields: [],
        initiative: 'test-init',
        statePath: '/some/path',
        configPath: '/some/config',
      };
      const output = formatReport(report);
      assert.ok(output.includes('✅'));
      assert.ok(output.includes('test-init'));
    });

    it('formats report when no initiative', () => {
      const report = {
        divergent: false,
        severity: SEVERITY.NONE,
        fields: [],
        initiative: null,
        statePath: '/some/path',
        configPath: null,
      };
      const output = formatReport(report);
      assert.ok(output.includes('✅'));
      assert.ok(output.includes('No active initiative'));
    });

    it('formats divergent report with field details', () => {
      const report = {
        divergent: true,
        severity: SEVERITY.CRITICAL,
        fields: [
          { field: 'current_phase', stateValue: 'preplan', initValue: 'techplan', match: false },
          { field: 'phase_status', stateValue: { preplan: 'complete' }, initValue: { preplan: 'in_progress' }, match: false },
        ],
        initiative: 'test-init',
        statePath: '/some/path',
        configPath: '/some/config',
      };
      const output = formatReport(report);
      assert.ok(output.includes('❌'));
      assert.ok(output.includes('test-init'));
      assert.ok(output.includes('current_phase'));
      assert.ok(output.includes('phase_status'));
      assert.ok(output.includes('/fix'));
    });

    it('includes error message when present', () => {
      const report = {
        divergent: true,
        severity: SEVERITY.CRITICAL,
        fields: [],
        initiative: 'test-init',
        statePath: '/some/path',
        configPath: null,
        error: 'Config not found',
      };
      const output = formatReport(report);
      assert.ok(output.includes('Config not found'));
    });
  });

  // ── Constants ─────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('SHARED_FIELDS includes phase_status and current_phase', () => {
      assert.ok(SHARED_FIELDS.includes('phase_status'));
      assert.ok(SHARED_FIELDS.includes('current_phase'));
    });

    it('SHARED_FIELDS is frozen', () => {
      assert.throws(() => { SHARED_FIELDS.push('test'); });
    });

    it('SEVERITY has expected values', () => {
      assert.equal(SEVERITY.NONE, 'none');
      assert.equal(SEVERITY.WARNING, 'warning');
      assert.equal(SEVERITY.CRITICAL, 'critical');
    });

    it('SEVERITY is frozen', () => {
      assert.throws(() => { SEVERITY.CUSTOM = 'custom'; });
    });
  });
});
