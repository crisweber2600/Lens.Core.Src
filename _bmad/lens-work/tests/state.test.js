'use strict';

/**
 * Tests for S-003: state.yaml read/write with v2 schema
 *
 * Run: node tests/state.test.js
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  readState,
  writeState,
  initState,
  validateState,
  StateError,
  CANONICAL_PHASES,
  VALID_CURRENT_PHASES,
  CANONICAL_TRACKS,
  VALID_WORKFLOW_STATUSES,
  VALID_PHASE_STATUS_VALUES,
  VALID_AUDIENCE_STATUS_VALUES,
} = require('../lib/state');

// ─── Helpers ────────────────────────────────────────────────────────────────

const yaml = require('js-yaml');

let tmpDir;

function makeTmpDir() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-state-test-'));
  return tmpDir;
}

function cleanTmpDir() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Create a valid v2 state object for testing */
function makeValidState(overrides = {}) {
  return {
    lifecycle_version: 2,
    lens_contract_version: '2.0',
    active_initiative: 'test-abc123',
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
    checklist: {
      current_gate: null,
      items: [],
      gate_ready: false,
      gate_ready_pct: 0,
    },
    background_errors: [],
    created_at: '2026-02-24T00:00:00.000Z',
    last_activity: '2026-02-24T00:00:00.000Z',
    user: {
      name: 'Test User',
      email: 'test@example.com',
    },
    ...overrides,
  };
}

/** Write a state YAML file to the temp directory */
function writeStateFile(projectRoot, state, relativePath = '_bmad-output/lens-work/state.yaml') {
  const filePath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const yamlStr = yaml.dump(state, { lineWidth: -1, noRefs: true });
  fs.writeFileSync(filePath, yamlStr, 'utf8');
  return filePath;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('validateState', () => {
  it('accepts a valid v2 state', () => {
    const state = makeValidState();
    const result = validateState(state);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects null input', () => {
    const result = validateState(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('non-null object'));
  });

  it('rejects v1 lifecycle_version', () => {
    const state = makeValidState({ lifecycle_version: 1 });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Legacy v1')));
  });

  it('rejects missing lifecycle_version', () => {
    const state = makeValidState({ lifecycle_version: null });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Legacy v1')));
  });

  it('rejects unknown lifecycle_version', () => {
    const state = makeValidState({ lifecycle_version: 99 });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Unknown lifecycle_version')));
  });

  it('detects missing required fields', () => {
    const state = { lifecycle_version: 2 };
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('active_initiative')));
    assert.ok(result.errors.some(e => e.includes('phase_status')));
  });

  it('rejects invalid current_phase', () => {
    const state = makeValidState({ current_phase: 'p1' });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid phase name: 'p1'")));
    assert.ok(result.errors.some(e => e.includes('Legacy numbered phases')));
  });

  it('accepts null current_phase', () => {
    const state = makeValidState({ current_phase: null });
    const result = validateState(state);
    assert.equal(result.valid, true);
  });

  it('accepts dev as current_phase', () => {
    const state = makeValidState({ current_phase: 'dev' });
    const result = validateState(state);
    assert.equal(result.valid, true);
  });

  it('rejects invalid active_track', () => {
    const state = makeValidState({ active_track: 'waterfall' });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid track: 'waterfall'")));
  });

  it('rejects invalid workflow_status', () => {
    const state = makeValidState({ workflow_status: 'paused' });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid workflow_status: 'paused'")));
  });

  it('rejects invalid phase_status key', () => {
    const state = makeValidState({
      phase_status: {
        preplan: null,
        businessplan: null,
        techplan: null,
        devproposal: null,
        sprintplan: null,
        p1: 'passed', // Invalid key
      },
    });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid phase_status key: 'p1'")));
  });

  it('rejects invalid phase_status value', () => {
    const state = makeValidState({
      phase_status: {
        preplan: 'done', // Invalid value
        businessplan: null,
        techplan: null,
        devproposal: null,
        sprintplan: null,
      },
    });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid phase_status value for preplan: 'done'")));
  });

  it('rejects missing audience_status key', () => {
    const state = makeValidState({
      audience_status: {
        small_to_medium: null,
        // missing medium_to_large and large_to_base
      },
    });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('medium_to_large')));
    assert.ok(result.errors.some(e => e.includes('large_to_base')));
  });

  it('rejects invalid audience_status value', () => {
    const state = makeValidState({
      audience_status: {
        small_to_medium: 'approved', // Invalid value
        medium_to_large: null,
        large_to_base: null,
      },
    });
    const result = validateState(state);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid audience_status value for small_to_medium")));
  });

  it('accepts all valid phase_status values', () => {
    for (const value of VALID_PHASE_STATUS_VALUES) {
      const state = makeValidState({
        phase_status: {
          preplan: value,
          businessplan: null,
          techplan: null,
          devproposal: null,
          sprintplan: null,
        },
      });
      const result = validateState(state);
      assert.equal(result.valid, true, `Should accept phase_status value: ${value}`);
    }
  });

  it('accepts all canonical tracks', () => {
    for (const track of CANONICAL_TRACKS) {
      const state = makeValidState({ active_track: track });
      const result = validateState(state);
      assert.equal(result.valid, true, `Should accept track: ${track}`);
    }
  });
});

describe('readState', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  it('reads a valid state file', () => {
    const expected = makeValidState();
    writeStateFile(tmpDir, expected);

    const state = readState(tmpDir);
    assert.equal(state.lifecycle_version, 2);
    assert.equal(state.active_initiative, 'test-abc123');
    assert.equal(state.current_phase, 'preplan');
    assert.equal(state.active_track, 'full');
    assert.ok(state._resolvedPath);
  });

  it('throws STATE_NOT_FOUND when file missing', () => {
    assert.throws(
      () => readState(tmpDir),
      (err) => {
        assert.ok(err instanceof StateError);
        assert.equal(err.code, 'STATE_NOT_FOUND');
        return true;
      }
    );
  });

  it('throws STATE_VALIDATION_ERROR for v1 state', () => {
    const v1State = makeValidState({ lifecycle_version: 1 });
    writeStateFile(tmpDir, v1State);

    assert.throws(
      () => readState(tmpDir),
      (err) => {
        assert.ok(err instanceof StateError);
        assert.equal(err.code, 'STATE_VALIDATION_ERROR');
        assert.ok(err.details.errors.some(e => e.includes('Legacy v1')));
        return true;
      }
    );
  });

  it('throws STATE_PARSE_ERROR for invalid YAML', () => {
    const filePath = path.join(tmpDir, '_bmad-output/lens-work/state.yaml');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{{{{invalid yaml!!!!', 'utf8');

    assert.throws(
      () => readState(tmpDir),
      (err) => {
        assert.ok(err instanceof StateError);
        assert.equal(err.code, 'STATE_PARSE_ERROR');
        return true;
      }
    );
  });

  it('reads all v2 fields correctly', () => {
    const expected = makeValidState({
      current_phase: 'techplan',
      active_track: 'feature',
      workflow_status: 'running',
      phase_status: {
        preplan: 'complete',
        businessplan: 'in_progress',
        techplan: null,
        devproposal: null,
        sprintplan: null,
      },
      audience_status: {
        small_to_medium: 'passed',
        medium_to_large: null,
        large_to_base: null,
      },
    });
    writeStateFile(tmpDir, expected);

    const state = readState(tmpDir);
    assert.equal(state.current_phase, 'techplan');
    assert.equal(state.active_track, 'feature');
    assert.equal(state.workflow_status, 'running');
    assert.equal(state.phase_status.preplan, 'complete');
    assert.equal(state.phase_status.businessplan, 'in_progress');
    assert.equal(state.audience_status.small_to_medium, 'passed');
  });
});

describe('writeState', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  it('writes a valid state file', () => {
    const state = makeValidState();
    const statePath = path.join(tmpDir, '_bmad-output/lens-work/state.yaml');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });

    const result = writeState(tmpDir, state);
    assert.equal(result.written, true);

    // Verify file was written
    assert.ok(fs.existsSync(statePath));

    // Verify content is valid YAML
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = yaml.load(raw);
    assert.equal(parsed.lifecycle_version, 2);
    assert.equal(parsed.active_initiative, 'test-abc123');
  });

  it('updates last_activity timestamp', () => {
    const state = makeValidState({ last_activity: '2020-01-01T00:00:00Z' });
    const statePath = path.join(tmpDir, '_bmad-output/lens-work/state.yaml');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });

    writeState(tmpDir, state);

    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = yaml.load(raw);
    assert.notEqual(parsed.last_activity, '2020-01-01T00:00:00Z');
  });

  it('rejects writing invalid state', () => {
    const invalidState = makeValidState({ lifecycle_version: 1 });
    assert.throws(
      () => writeState(tmpDir, invalidState),
      (err) => {
        assert.ok(err instanceof StateError);
        assert.equal(err.code, 'STATE_WRITE_VALIDATION_ERROR');
        return true;
      }
    );
  });

  it('creates directories if needed', () => {
    const state = makeValidState();
    const result = writeState(tmpDir, state);
    assert.equal(result.written, true);
  });

  it('preserves all fields through write-read cycle', () => {
    const state = makeValidState({
      current_phase: 'devproposal',
      active_track: 'tech-change',
      workflow_status: 'error',
      phase_status: {
        preplan: 'complete',
        businessplan: 'complete',
        techplan: 'passed',
        devproposal: 'in_progress',
        sprintplan: null,
      },
      audience_status: {
        small_to_medium: 'passed',
        medium_to_large: 'blocked',
        large_to_base: null,
      },
    });

    writeState(tmpDir, state);
    const readBack = readState(tmpDir);

    assert.equal(readBack.current_phase, 'devproposal');
    assert.equal(readBack.active_track, 'tech-change');
    assert.equal(readBack.workflow_status, 'error');
    assert.equal(readBack.phase_status.preplan, 'complete');
    assert.equal(readBack.phase_status.devproposal, 'in_progress');
    assert.equal(readBack.audience_status.medium_to_large, 'blocked');
  });

  it('performs dual-write when changedFields includes phase_status', () => {
    // Set up initiative config
    const initPath = path.join(tmpDir, '_bmad-output/lens-work/initiatives/test-abc123.yaml');
    fs.mkdirSync(path.dirname(initPath), { recursive: true });
    const initConfig = {
      lifecycle_version: 2,
      id: 'test-abc123',
      phase_status: { preplan: null, businessplan: null, techplan: null, devproposal: null, sprintplan: null },
      current_phase: null,
    };
    fs.writeFileSync(initPath, yaml.dump(initConfig), 'utf8');

    // Write state with phase_status change
    const state = makeValidState({
      phase_status: {
        preplan: 'complete',
        businessplan: null,
        techplan: null,
        devproposal: null,
        sprintplan: null,
      },
    });

    const result = writeState(tmpDir, state, { changedFields: ['phase_status'] });
    assert.equal(result.dualWritePerformed, true);

    // Verify initiative config was updated
    const updatedConfig = yaml.load(fs.readFileSync(initPath, 'utf8'));
    assert.equal(updatedConfig.phase_status.preplan, 'complete');
  });
});

describe('initState', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  const moduleRoot = path.resolve(__dirname, '..');

  it('creates state from template', () => {
    const state = initState(tmpDir, moduleRoot, {
      userName: 'Test User',
      userEmail: 'test@test.com',
    });

    assert.equal(state.lifecycle_version, 2);
    assert.equal(state.user.name, 'Test User');
    assert.equal(state.user.email, 'test@test.com');
    assert.ok(state.created_at);
    assert.ok(state.last_activity);
  });

  it('throws when state file already exists', () => {
    // Create existing state file
    const state = makeValidState();
    writeStateFile(tmpDir, state);

    assert.throws(
      () => initState(tmpDir, moduleRoot),
      (err) => {
        assert.ok(err instanceof StateError);
        assert.equal(err.code, 'STATE_ALREADY_EXISTS');
        return true;
      }
    );
  });

  it('creates state file on disk', () => {
    initState(tmpDir, moduleRoot, {
      userName: 'Test User',
      userEmail: 'test@test.com',
    });

    const statePath = path.join(tmpDir, '_bmad-output/lens-work/state.yaml');
    assert.ok(fs.existsSync(statePath));

    // Verify it can be read back
    const state = readState(tmpDir);
    assert.equal(state.lifecycle_version, 2);
  });

  it('matches template schema', () => {
    const state = initState(tmpDir, moduleRoot, {
      userName: 'Test',
      userEmail: 'test@test.com',
    });

    // Verify all template fields are present
    assert.ok('lifecycle_version' in state);
    assert.ok('active_initiative' in state);
    assert.ok('current_phase' in state);
    assert.ok('active_track' in state);
    assert.ok('workflow_status' in state);
    assert.ok('phase_status' in state);
    assert.ok('audience_status' in state);
    assert.ok('checklist' in state);
    assert.ok('background_errors' in state);
  });
});

describe('Integration: real state.yaml', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');

  it('validates the actual project state.yaml (if exists)', () => {
    const statePath = path.join(projectRoot, '_bmad-output/lens-work/state.yaml');
    if (!fs.existsSync(statePath)) {
      console.log('  ⏭ Skipped — no state.yaml in project root');
      return;
    }

    // Should not throw
    const state = readState(projectRoot);
    assert.equal(state.lifecycle_version, 2);
    assert.ok(state.active_initiative);
    console.log(`  ✅ Real state.yaml valid — initiative: ${state.active_initiative}, phase: ${state.current_phase}`);
  });
});
