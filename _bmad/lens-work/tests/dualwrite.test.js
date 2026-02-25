/**
 * Tests for Dual-Write Contract Enforcement (S-005)
 *
 * Tests atomic dual-write, rollback, verification, and guard functions.
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
  DualWriteError,
  resolveInitiativeConfigPath,
  dualWrite,
  verifyConsistency,
  classifyUpdates,
  assertNoDualWriteViolation,
} = require('../lib/dualwrite');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dualwrite-test-'));
}

/** Create state.yaml in temp root */
function writeState(root, state, relPath) {
  const statePath = path.resolve(root, relPath || '_bmad-output/lens-work/state.yaml');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const header = '# v2 — Lifecycle Contract personal state\n';
  fs.writeFileSync(statePath, header + yaml.dump(state, { lineWidth: -1, noRefs: true, sortKeys: false }), 'utf8');
  return statePath;
}

/** Create initiative config in temp root */
function writeConfig(root, initiativeId, config) {
  const configPath = path.resolve(root, '_bmad-output/lens-work/initiatives', `${initiativeId}.yaml`);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, yaml.dump(config, { lineWidth: -1, noRefs: true, sortKeys: false }), 'utf8');
  return configPath;
}

/** Load YAML file */
function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

/** Create valid state + config pair */
function makeStatePair(initiativeId = 'test-init') {
  const state = {
    lifecycle_version: 2,
    active_initiative: initiativeId,
    current_phase: 'preplan',
    active_track: 'full',
    workflow_status: 'idle',
    phase_status: {
      preplan: null,
      businessplan: null,
      techplan: null,
      devproposal: null,
      sprintplan: null,
    },
    audience_status: {
      small_to_medium: null,
      medium_to_large: null,
      large_to_base: null,
    },
    created_at: '2026-01-01T00:00:00Z',
    last_activity: '2026-01-01T00:00:00Z',
  };

  const config = {
    lifecycle_version: 2,
    id: initiativeId,
    name: 'Test Initiative',
    layer: 'feature',
    track: 'full',
    initiative_root: 'test-root',
    current_phase: 'preplan',
    phase_status: {
      preplan: null,
      businessplan: null,
      techplan: null,
      devproposal: null,
      sprintplan: null,
    },
    active_phases: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'],
    audiences: ['small', 'medium', 'large', 'base'],
    created_at: '2026-01-01T00:00:00Z',
    last_activity: '2026-01-01T00:00:00Z',
  };

  return { state, config };
}

// ---------------------------------------------------------------------------
// SHARED_FIELDS constant
// ---------------------------------------------------------------------------

describe('SHARED_FIELDS', () => {
  it('is frozen', () => {
    assert.ok(Object.isFrozen(SHARED_FIELDS));
  });

  it('contains phase_status and current_phase', () => {
    assert.ok(SHARED_FIELDS.includes('phase_status'));
    assert.ok(SHARED_FIELDS.includes('current_phase'));
  });
});

// ---------------------------------------------------------------------------
// resolveInitiativeConfigPath
// ---------------------------------------------------------------------------

describe('resolveInitiativeConfigPath', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpRoot(); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it('finds flat feature file', () => {
    writeConfig(tmpRoot, 'my-init', { id: 'my-init' });
    const p = resolveInitiativeConfigPath(tmpRoot, 'my-init');
    assert.ok(p);
    assert.ok(p.endsWith('my-init.yaml'));
  });

  it('finds nested Service.yaml', () => {
    const configPath = path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/my-init/Service.yaml');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, 'id: my-init\n', 'utf8');
    const p = resolveInitiativeConfigPath(tmpRoot, 'my-init');
    assert.ok(p);
    assert.ok(p.endsWith('Service.yaml'));
  });

  it('finds nested Domain.yaml', () => {
    const configPath = path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/my-init/Domain.yaml');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, 'id: my-init\n', 'utf8');
    const p = resolveInitiativeConfigPath(tmpRoot, 'my-init');
    assert.ok(p);
    assert.ok(p.endsWith('Domain.yaml'));
  });

  it('returns null when not found', () => {
    const p = resolveInitiativeConfigPath(tmpRoot, 'nonexistent');
    assert.equal(p, null);
  });
});

// ---------------------------------------------------------------------------
// dualWrite
// ---------------------------------------------------------------------------

describe('dualWrite', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpRoot(); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it('updates phase_status in both files', () => {
    const { state, config } = makeStatePair();
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const result = dualWrite(tmpRoot, 'test-init', {
      phase_status: { preplan: 'passed' },
    });

    assert.equal(result.success, true);
    assert.ok(result.stateUpdated);
    assert.ok(result.configUpdated);

    // Verify both files updated
    const newState = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/state.yaml'));
    const newConfig = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/test-init.yaml'));

    assert.equal(newState.phase_status.preplan, 'passed');
    assert.equal(newConfig.phase_status.preplan, 'passed');
  });

  it('updates current_phase in both files', () => {
    const { state, config } = makeStatePair();
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    dualWrite(tmpRoot, 'test-init', { current_phase: 'businessplan' });

    const newState = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/state.yaml'));
    const newConfig = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/test-init.yaml'));

    assert.equal(newState.current_phase, 'businessplan');
    assert.equal(newConfig.current_phase, 'businessplan');
  });

  it('updates both fields simultaneously', () => {
    const { state, config } = makeStatePair();
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const result = dualWrite(tmpRoot, 'test-init', {
      current_phase: 'techplan',
      phase_status: { preplan: 'passed', businessplan: 'passed' },
    });

    assert.equal(result.changedFields.length, 2);
    assert.ok(result.changedFields.includes('current_phase'));
    assert.ok(result.changedFields.includes('phase_status'));

    const newState = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/state.yaml'));
    assert.equal(newState.current_phase, 'techplan');
    assert.equal(newState.phase_status.preplan, 'passed');
    assert.equal(newState.phase_status.businessplan, 'passed');
  });

  it('ensures both files are identical after mutation', () => {
    const { state, config } = makeStatePair();
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    dualWrite(tmpRoot, 'test-init', {
      current_phase: 'devproposal',
      phase_status: { preplan: 'passed', businessplan: 'passed', techplan: 'passed' },
    });

    const { consistent, divergences } = verifyConsistency(tmpRoot, 'test-init');
    assert.equal(consistent, true);
    assert.equal(divergences.length, 0);
  });

  it('preserves non-shared fields in both files', () => {
    const { state, config } = makeStatePair();
    state.workflow_status = 'running';
    config.track = 'full';
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    dualWrite(tmpRoot, 'test-init', { current_phase: 'businessplan' });

    const newState = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/state.yaml'));
    const newConfig = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/test-init.yaml'));

    assert.equal(newState.workflow_status, 'running');
    assert.equal(newConfig.track, 'full');
  });

  it('no-ops when updates contain no shared fields', () => {
    const { state, config } = makeStatePair();
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const result = dualWrite(tmpRoot, 'test-init', { workflow_status: 'running' });
    assert.equal(result.success, true);
    assert.equal(result.stateUpdated, false);
    assert.equal(result.configUpdated, false);
    assert.equal(result.changedFields.length, 0);
  });

  it('throws when state file is missing', () => {
    writeConfig(tmpRoot, 'test-init', makeStatePair().config);

    assert.throws(
      () => dualWrite(tmpRoot, 'test-init', { current_phase: 'businessplan' }),
      (err) => err.code === 'STATE_NOT_FOUND',
    );
  });

  it('throws when initiative config is missing', () => {
    writeState(tmpRoot, makeStatePair().state);

    assert.throws(
      () => dualWrite(tmpRoot, 'nonexistent', { current_phase: 'businessplan' }),
      (err) => err.code === 'INITIATIVE_NOT_FOUND',
    );
  });

  it('throws for non-v2 state', () => {
    writeState(tmpRoot, { ...makeStatePair().state, lifecycle_version: 1 });
    writeConfig(tmpRoot, 'test-init', makeStatePair().config);

    assert.throws(
      () => dualWrite(tmpRoot, 'test-init', { current_phase: 'x' }),
      (err) => err.code === 'INVALID_STATE_VERSION',
    );
  });

  it('throws for non-v2 config', () => {
    writeState(tmpRoot, makeStatePair().state);
    writeConfig(tmpRoot, 'test-init', { ...makeStatePair().config, lifecycle_version: 1 });

    assert.throws(
      () => dualWrite(tmpRoot, 'test-init', { current_phase: 'x' }),
      (err) => err.code === 'INVALID_CONFIG_VERSION',
    );
  });

  it('rolls back on write failure (simulated via readonly)', () => {
    const { state, config } = makeStatePair();
    const statePath = writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    // Snapshot original values
    const originalState = loadYaml(statePath);
    const originalPhase = originalState.current_phase;

    // Make config readonly to force failure on second write
    const configPath = resolveInitiativeConfigPath(tmpRoot, 'test-init');
    fs.chmodSync(configPath, 0o444);

    try {
      dualWrite(tmpRoot, 'test-init', { current_phase: 'businessplan' });
      // On Windows, chmod may not enforce readonly — allow success
    } catch (err) {
      // On Unix-like systems, should get WRITE_FAILED_ROLLED_BACK
      assert.equal(err.code, 'WRITE_FAILED_ROLLED_BACK');

      // State should be rolled back to original
      const rolledBackState = loadYaml(statePath);
      assert.equal(rolledBackState.current_phase, originalPhase);
    } finally {
      // Restore write permissions for cleanup
      try { fs.chmodSync(configPath, 0o644); } catch { /* ignore */ }
    }
  });

  it('updates last_activity timestamps', () => {
    const { state, config } = makeStatePair();
    const before = new Date().toISOString();
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    dualWrite(tmpRoot, 'test-init', { current_phase: 'businessplan' });

    const newState = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/state.yaml'));
    const newConfig = loadYaml(path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives/test-init.yaml'));

    assert.ok(newState.last_activity >= before);
    assert.ok(newConfig.last_activity >= before);
  });
});

// ---------------------------------------------------------------------------
// verifyConsistency
// ---------------------------------------------------------------------------

describe('verifyConsistency', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpRoot(); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it('reports consistent when fields match', () => {
    const { state, config } = makeStatePair();
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const { consistent, divergences } = verifyConsistency(tmpRoot, 'test-init');
    assert.equal(consistent, true);
    assert.equal(divergences.length, 0);
  });

  it('detects current_phase divergence', () => {
    const { state, config } = makeStatePair();
    state.current_phase = 'businessplan';
    config.current_phase = 'preplan'; // mismatch!
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const { consistent, divergences } = verifyConsistency(tmpRoot, 'test-init');
    assert.equal(consistent, false);
    assert.equal(divergences.length, 1);
    assert.equal(divergences[0].field, 'current_phase');
    assert.equal(divergences[0].stateValue, 'businessplan');
    assert.equal(divergences[0].configValue, 'preplan');
  });

  it('detects phase_status divergence', () => {
    const { state, config } = makeStatePair();
    state.phase_status.preplan = 'passed';
    config.phase_status.preplan = null; // mismatch!
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const { consistent, divergences } = verifyConsistency(tmpRoot, 'test-init');
    assert.equal(consistent, false);
    assert.ok(divergences.some(d => d.field === 'phase_status.preplan'));
  });

  it('detects multiple divergences', () => {
    const { state, config } = makeStatePair();
    state.current_phase = 'techplan';
    config.current_phase = 'preplan';
    state.phase_status.preplan = 'passed';
    config.phase_status.preplan = null;
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const { consistent, divergences } = verifyConsistency(tmpRoot, 'test-init');
    assert.equal(consistent, false);
    assert.ok(divergences.length >= 2);
  });

  it('skips check when initiative is not active', () => {
    const { state, config } = makeStatePair();
    state.active_initiative = 'other-init'; // different from config ID
    state.current_phase = 'techplan';
    config.current_phase = 'preplan';
    writeState(tmpRoot, state);
    writeConfig(tmpRoot, 'test-init', config);

    const { consistent, note } = verifyConsistency(tmpRoot, 'test-init');
    assert.equal(consistent, true);
    assert.ok(note);
  });

  it('handles missing state gracefully', () => {
    const { consistent } = verifyConsistency(tmpRoot, 'test-init');
    assert.equal(consistent, true);
  });

  it('handles missing config gracefully', () => {
    writeState(tmpRoot, makeStatePair().state);
    const { consistent } = verifyConsistency(tmpRoot, 'test-init');
    // No config found — returns consistent=true since we can't compare
    assert.equal(consistent, true);
  });
});

// ---------------------------------------------------------------------------
// classifyUpdates
// ---------------------------------------------------------------------------

describe('classifyUpdates', () => {
  it('classifies shared fields', () => {
    const { sharedFields, nonSharedFields } = classifyUpdates({
      current_phase: 'businessplan',
      workflow_status: 'running',
      phase_status: { preplan: 'passed' },
    });
    assert.deepEqual(sharedFields, ['current_phase', 'phase_status']);
    assert.deepEqual(nonSharedFields, ['workflow_status']);
  });

  it('returns empty shared for non-shared-only updates', () => {
    const { sharedFields } = classifyUpdates({ workflow_status: 'idle' });
    assert.equal(sharedFields.length, 0);
  });
});

// ---------------------------------------------------------------------------
// assertNoDualWriteViolation
// ---------------------------------------------------------------------------

describe('assertNoDualWriteViolation', () => {
  it('allows non-shared fields', () => {
    assert.doesNotThrow(() => assertNoDualWriteViolation(['workflow_status', 'last_activity']));
  });

  it('throws for shared field phase_status', () => {
    assert.throws(
      () => assertNoDualWriteViolation(['workflow_status', 'phase_status']),
      (err) => err.code === 'DUAL_WRITE_VIOLATION',
    );
  });

  it('throws for shared field current_phase', () => {
    assert.throws(
      () => assertNoDualWriteViolation(['current_phase']),
      (err) => err.code === 'DUAL_WRITE_VIOLATION',
    );
  });

  it('reports all violating fields', () => {
    try {
      assertNoDualWriteViolation(['current_phase', 'phase_status', 'other']);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.equal(err.details.violations.length, 2);
      assert.ok(err.details.violations.includes('current_phase'));
      assert.ok(err.details.violations.includes('phase_status'));
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: real files
// ---------------------------------------------------------------------------

describe('integration: real state+config', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

  it('can verify consistency of real initiative (if exists)', () => {
    const statePath = path.resolve(projectRoot, '_bmad-output/lens-work/state.yaml');
    if (!fs.existsSync(statePath)) return;

    const state = yaml.load(fs.readFileSync(statePath, 'utf8'));
    if (!state?.active_initiative) return;

    const { consistent, divergences } = verifyConsistency(projectRoot, state.active_initiative);
    // Report but don't fail — real state may be legitimately diverged
    if (!consistent) {
      console.log(`  ⚠️ Divergences found: ${JSON.stringify(divergences)}`);
    }
  });
});

// ---------------------------------------------------------------------------
// DualWriteError
// ---------------------------------------------------------------------------

describe('DualWriteError', () => {
  it('extends Error', () => {
    const err = new DualWriteError('test', 'TEST_CODE', { x: 1 });
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'DualWriteError');
    assert.equal(err.code, 'TEST_CODE');
    assert.equal(err.details.x, 1);
  });
});
