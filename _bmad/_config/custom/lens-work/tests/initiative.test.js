'use strict';

/**
 * Tests for S-004: Initiative config CRUD
 *
 * Run: node --test tests/initiative.test.js
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');

const {
  createInitiative,
  readInitiative,
  updateInitiative,
  listInitiatives,
  validateInitiative,
  resolveInitiativePath,
  InitiativeError,
  VALID_LAYERS,
  CANONICAL_TRACKS,
  PROTECTED_FIELDS,
  UPDATABLE_FIELDS,
} = require('../lib/initiative');

// ─── Helpers ────────────────────────────────────────────────────────────────

let tmpDir;
const moduleRoot = path.resolve(__dirname, '..');

function makeTmpDir() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-init-test-'));
  return tmpDir;
}

function cleanTmpDir() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Standard create input for a feature-level initiative */
function makeCreateInput(overrides = {}) {
  return {
    initiative_id: 'test-abc123',
    name: 'Test Initiative',
    layer: 'feature',
    domain: 'TestDomain',
    domain_prefix: 'test',
    track: 'full',
    target_repos: ['test-repo'],
    initiative_root: 'lens-test-test-abc123',
    question_mode: 'interactive',
    ...overrides,
  };
}

/** Write a v2 initiative config directly (for read/update tests) */
function writeInitiativeFile(projectRoot, id, config) {
  const filePath = path.join(projectRoot, '_bmad-output/lens-work/initiatives', `${id}.yaml`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, yaml.dump(config, { lineWidth: -1 }), 'utf8');
  return filePath;
}

/** Create a minimal valid initiative config */
function makeValidConfig(overrides = {}) {
  return {
    lifecycle_version: 2,
    id: 'test-abc123',
    name: 'Test Initiative',
    layer: 'feature',
    domain: 'TestDomain',
    domain_prefix: 'test',
    track: 'full',
    target_repos: ['test-repo'],
    initiative_root: 'lens-test-test-abc123',
    active_phases: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'],
    audiences: ['small', 'medium', 'large', 'base'],
    phase_status: {
      preplan: null,
      businessplan: null,
      techplan: null,
      devproposal: null,
      sprintplan: null,
    },
    current_phase: null,
    question_mode: 'interactive',
    scope: 'feature',
    coupling: 'none',
    constitution_mode: 'advisory',
    created_at: '2026-02-24T00:00:00Z',
    last_activity: '2026-02-24T00:00:00Z',
    docs: { path: null, domain: 'test', service: null, repo: null },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('resolveInitiativePath', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  it('resolves feature layer to flat file', () => {
    const p = resolveInitiativePath(tmpDir, 'my-init', 'feature');
    assert.ok(p.endsWith('my-init.yaml'));
    assert.ok(!p.includes('Domain'));
  });

  it('resolves repo layer to flat file', () => {
    const p = resolveInitiativePath(tmpDir, 'my-init', 'repo');
    assert.ok(p.endsWith('my-init.yaml'));
  });

  it('resolves domain layer to nested Domain.yaml', () => {
    const p = resolveInitiativePath(tmpDir, 'my-init', 'domain', { domain_prefix: 'mydom' });
    assert.ok(p.endsWith('Domain.yaml'));
    assert.ok(p.includes('mydom'));
  });

  it('resolves service layer to nested Service.yaml', () => {
    const p = resolveInitiativePath(tmpDir, 'my-init', 'service', {
      domain_prefix: 'mydom',
      service_prefix: 'mysvc',
    });
    assert.ok(p.endsWith('Service.yaml'));
    assert.ok(p.includes('mysvc'));
  });

  it('throws for invalid layer', () => {
    assert.throws(
      () => resolveInitiativePath(tmpDir, 'my-init', 'invalid'),
      (err) => {
        assert.ok(err instanceof InitiativeError);
        assert.equal(err.code, 'INVALID_LAYER');
        return true;
      }
    );
  });
});

describe('validateInitiative', () => {
  it('accepts a valid v2 config', () => {
    const config = makeValidConfig();
    const result = validateInitiative(config);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects null input', () => {
    const result = validateInitiative(null);
    assert.equal(result.valid, false);
  });

  it('rejects v1 lifecycle_version', () => {
    const config = makeValidConfig({ lifecycle_version: 1 });
    const result = validateInitiative(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Legacy v1')));
  });

  it('detects missing required fields', () => {
    const config = { lifecycle_version: 2 };
    const result = validateInitiative(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("'id'")));
    assert.ok(result.errors.some(e => e.includes("'name'")));
  });

  it('rejects invalid track', () => {
    const config = makeValidConfig({ track: 'waterfall' });
    const result = validateInitiative(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid track: 'waterfall'")));
  });

  it('rejects invalid layer', () => {
    const config = makeValidConfig({ layer: 'module' });
    const result = validateInitiative(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid layer: 'module'")));
  });

  it('detects phase_status missing active phase key', () => {
    const config = makeValidConfig({
      active_phases: ['preplan', 'businessplan'],
      phase_status: { preplan: null }, // missing businessplan
    });
    const result = validateInitiative(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("'businessplan'")));
  });

  it('rejects invalid phase_status value', () => {
    const config = makeValidConfig({
      phase_status: {
        preplan: 'done',
        businessplan: null,
        techplan: null,
        devproposal: null,
        sprintplan: null,
      },
    });
    const result = validateInitiative(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes("Invalid phase_status value for preplan")));
  });
});

describe('createInitiative', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  it('creates a feature-level initiative', () => {
    const input = makeCreateInput();
    const config = createInitiative(tmpDir, moduleRoot, input);

    assert.equal(config.lifecycle_version, 2);
    assert.equal(config.id, 'test-abc123');
    assert.equal(config.name, 'Test Initiative');
    assert.equal(config.layer, 'feature');
    assert.equal(config.track, 'full');
    assert.deepEqual(config.active_phases, ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan']);
    assert.equal(config.current_phase, null);
    assert.ok(config._resolvedPath);
  });

  it('creates config file on disk', () => {
    const input = makeCreateInput();
    const config = createInitiative(tmpDir, moduleRoot, input);

    assert.ok(fs.existsSync(config._resolvedPath));
    const parsed = yaml.load(fs.readFileSync(config._resolvedPath, 'utf8'));
    assert.equal(parsed.id, 'test-abc123');
  });

  it('stores feature-level initiatives flat (not nested)', () => {
    const input = makeCreateInput();
    const config = createInitiative(tmpDir, moduleRoot, input);

    assert.ok(config._resolvedPath.endsWith('test-abc123.yaml'));
    assert.ok(!config._resolvedPath.includes('Domain'));
    assert.ok(!config._resolvedPath.includes('Service'));
  });

  it('throws when initiative already exists', () => {
    const input = makeCreateInput();
    createInitiative(tmpDir, moduleRoot, input);

    assert.throws(
      () => createInitiative(tmpDir, moduleRoot, input),
      (err) => {
        assert.ok(err instanceof InitiativeError);
        assert.equal(err.code, 'INITIATIVE_EXISTS');
        return true;
      }
    );
  });

  it('throws on missing required fields', () => {
    assert.throws(
      () => createInitiative(tmpDir, moduleRoot, { initiative_id: 'x' }),
      (err) => {
        assert.ok(err instanceof InitiativeError);
        assert.equal(err.code, 'MISSING_FIELD');
        return true;
      }
    );
  });

  it('throws on invalid track', () => {
    const input = makeCreateInput({ track: 'waterfall' });
    assert.throws(
      () => createInitiative(tmpDir, moduleRoot, input),
      (err) => {
        assert.equal(err.code, 'INVALID_TRACK');
        return true;
      }
    );
  });

  it('initializes phase_status from track phases', () => {
    const input = makeCreateInput({ track: 'hotfix' });
    const config = createInitiative(tmpDir, moduleRoot, input);

    assert.deepEqual(config.active_phases, ['techplan']);
    assert.deepEqual(Object.keys(config.phase_status), ['techplan']);
    assert.equal(config.phase_status.techplan, null);
  });

  it('sets timestamps on creation', () => {
    const input = makeCreateInput();
    const config = createInitiative(tmpDir, moduleRoot, input);

    assert.ok(config.created_at);
    assert.ok(config.last_activity);
  });

  it('derives audiences from track', () => {
    const input = makeCreateInput({ track: 'spike' });
    const config = createInitiative(tmpDir, moduleRoot, input);

    assert.deepEqual(config.audiences, ['small']);
  });
});

describe('readInitiative', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  it('reads feature-level initiative', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    const result = readInitiative(tmpDir, 'test-abc123');
    assert.equal(result.id, 'test-abc123');
    assert.equal(result.layer, 'feature');
    assert.ok(result._resolvedPath);
  });

  it('auto-detects layer', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    const result = readInitiative(tmpDir, 'test-abc123');
    assert.equal(result._resolvedLayer, 'feature');
  });

  it('throws INITIATIVE_NOT_FOUND when missing', () => {
    assert.throws(
      () => readInitiative(tmpDir, 'nonexistent'),
      (err) => {
        assert.ok(err instanceof InitiativeError);
        assert.equal(err.code, 'INITIATIVE_NOT_FOUND');
        return true;
      }
    );
  });

  it('throws for v1 config', () => {
    const config = makeValidConfig({ lifecycle_version: 1 });
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    assert.throws(
      () => readInitiative(tmpDir, 'test-abc123'),
      (err) => {
        assert.equal(err.code, 'INITIATIVE_VALIDATION_ERROR');
        assert.ok(err.details.errors.some(e => e.includes('Legacy v1')));
        return true;
      }
    );
  });

  it('throws on ID mismatch', () => {
    const config = makeValidConfig({ id: 'different-id' });
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    assert.throws(
      () => readInitiative(tmpDir, 'test-abc123', { layer: 'feature' }),
      (err) => {
        assert.equal(err.code, 'INITIATIVE_ID_MISMATCH');
        return true;
      }
    );
  });

  it('reads all v2 fields', () => {
    const config = makeValidConfig({
      current_phase: 'techplan',
      phase_status: {
        preplan: 'complete',
        businessplan: 'complete',
        techplan: 'in_progress',
        devproposal: null,
        sprintplan: null,
      },
    });
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    const result = readInitiative(tmpDir, 'test-abc123');
    assert.equal(result.current_phase, 'techplan');
    assert.equal(result.phase_status.preplan, 'complete');
    assert.equal(result.phase_status.techplan, 'in_progress');
  });
});

describe('updateInitiative', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  it('updates current_phase', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    const { config: updated, changedFields } = updateInitiative(
      tmpDir, 'test-abc123',
      { current_phase: 'businessplan' }
    );

    assert.equal(updated.current_phase, 'businessplan');
    assert.ok(changedFields.includes('current_phase'));
  });

  it('updates phase_status with partial merge', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    const { config: updated } = updateInitiative(
      tmpDir, 'test-abc123',
      { phase_status: { preplan: 'complete' } }
    );

    assert.equal(updated.phase_status.preplan, 'complete');
    assert.equal(updated.phase_status.businessplan, null); // Untouched
  });

  it('persists changes to disk', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    updateInitiative(tmpDir, 'test-abc123', { current_phase: 'devproposal' });

    // Read back from disk
    const onDisk = readInitiative(tmpDir, 'test-abc123');
    assert.equal(onDisk.current_phase, 'devproposal');
  });

  it('throws on protected field', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    assert.throws(
      () => updateInitiative(tmpDir, 'test-abc123', { id: 'new-id' }),
      (err) => {
        assert.equal(err.code, 'PROTECTED_FIELD');
        return true;
      }
    );
  });

  it('throws on unknown field', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    assert.throws(
      () => updateInitiative(tmpDir, 'test-abc123', { foo: 'bar' }),
      (err) => {
        assert.equal(err.code, 'UNKNOWN_FIELD');
        return true;
      }
    );
  });

  it('throws on inactive phase in phase_status update', () => {
    const config = makeValidConfig({
      track: 'hotfix',
      active_phases: ['techplan'],
      phase_status: { techplan: null },
    });
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    assert.throws(
      () => updateInitiative(tmpDir, 'test-abc123', {
        phase_status: { preplan: 'complete' },
      }),
      (err) => {
        assert.equal(err.code, 'INACTIVE_PHASE');
        return true;
      }
    );
  });

  it('throws on invalid phase_status value', () => {
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    assert.throws(
      () => updateInitiative(tmpDir, 'test-abc123', {
        phase_status: { preplan: 'done' },
      }),
      (err) => {
        assert.equal(err.code, 'INVALID_PHASE_VALUE');
        return true;
      }
    );
  });

  it('updates last_activity timestamp', () => {
    const config = makeValidConfig({ last_activity: '2020-01-01T00:00:00Z' });
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    const { config: updated } = updateInitiative(
      tmpDir, 'test-abc123',
      { question_mode: 'batch' }
    );

    assert.notEqual(updated.last_activity, '2020-01-01T00:00:00Z');
  });

  it('performs dual-write to state.yaml', () => {
    // Set up state.yaml with matching initiative
    const statePath = path.join(tmpDir, '_bmad-output/lens-work/state.yaml');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    const state = {
      lifecycle_version: 2,
      active_initiative: 'test-abc123',
      current_phase: null,
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
    };
    fs.writeFileSync(statePath, yaml.dump(state), 'utf8');

    // Set up initiative config
    const config = makeValidConfig();
    writeInitiativeFile(tmpDir, 'test-abc123', config);

    // Update initiative
    updateInitiative(tmpDir, 'test-abc123', {
      current_phase: 'businessplan',
      phase_status: { preplan: 'complete' },
    });

    // Verify state.yaml was dual-written
    const updatedState = yaml.load(fs.readFileSync(statePath, 'utf8'));
    assert.equal(updatedState.current_phase, 'businessplan');
    assert.equal(updatedState.phase_status.preplan, 'complete');
  });
});

describe('listInitiatives', () => {
  beforeEach(() => makeTmpDir());
  afterEach(() => cleanTmpDir());

  it('returns empty array when no initiatives', () => {
    const result = listInitiatives(tmpDir);
    assert.deepEqual(result, []);
  });

  it('lists feature-level initiatives', () => {
    writeInitiativeFile(tmpDir, 'init-a', makeValidConfig({ id: 'init-a', name: 'Alpha' }));
    writeInitiativeFile(tmpDir, 'init-b', makeValidConfig({ id: 'init-b', name: 'Beta' }));

    const result = listInitiatives(tmpDir);
    assert.equal(result.length, 2);
    assert.ok(result.some(i => i.id === 'init-a'));
    assert.ok(result.some(i => i.id === 'init-b'));
  });

  it('filters by layer', () => {
    writeInitiativeFile(tmpDir, 'init-a', makeValidConfig({ id: 'init-a', layer: 'feature' }));

    const result = listInitiatives(tmpDir, { layer: 'domain' });
    assert.equal(result.length, 0);
  });

  it('filters by track', () => {
    writeInitiativeFile(tmpDir, 'init-a', makeValidConfig({ id: 'init-a', track: 'full' }));
    writeInitiativeFile(tmpDir, 'init-b', makeValidConfig({ id: 'init-b', track: 'hotfix' }));

    const result = listInitiatives(tmpDir, { track: 'hotfix' });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'init-b');
  });

  it('returns summary objects', () => {
    writeInitiativeFile(tmpDir, 'init-a', makeValidConfig({ id: 'init-a', name: 'Alpha', current_phase: 'techplan' }));

    const result = listInitiatives(tmpDir);
    assert.equal(result[0].id, 'init-a');
    assert.equal(result[0].name, 'Alpha');
    assert.equal(result[0].current_phase, 'techplan');
    assert.ok(result[0].path);
  });

  it('skips v1 configs', () => {
    writeInitiativeFile(tmpDir, 'init-v1', { lifecycle_version: 1, id: 'init-v1' });
    writeInitiativeFile(tmpDir, 'init-v2', makeValidConfig({ id: 'init-v2' }));

    const result = listInitiatives(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'init-v2');
  });
});

describe('Integration: real initiative config', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');

  it('reads the actual project initiative config (if exists)', () => {
    const initPath = path.join(projectRoot, '_bmad-output/lens-work/initiatives/upgrade-cjki9q.yaml');
    if (!fs.existsSync(initPath)) {
      console.log('  ⏭ Skipped — no upgrade-cjki9q initiative in project');
      return;
    }

    const config = readInitiative(projectRoot, 'upgrade-cjki9q');
    assert.equal(config.lifecycle_version, 2);
    assert.equal(config.id, 'upgrade-cjki9q');
    assert.equal(config.track, 'full');
    console.log(`  ✅ Real initiative valid — ${config.name}, phase: ${config.current_phase}`);
  });

  it('lists all initiatives in the project', () => {
    const basePath = path.join(projectRoot, '_bmad-output/lens-work/initiatives');
    if (!fs.existsSync(basePath)) {
      console.log('  ⏭ Skipped — no initiatives directory');
      return;
    }

    const initiatives = listInitiatives(projectRoot);
    console.log(`  ✅ Found ${initiatives.length} initiative(s): ${initiatives.map(i => i.id).join(', ')}`);
    assert.ok(initiatives.length >= 0);
  });
});
