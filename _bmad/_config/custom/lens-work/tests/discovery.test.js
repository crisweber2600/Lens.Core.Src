/**
 * Tests for Initiative Discovery Scan (S-018)
 *
 * Tests scanning, orphan detection, status derivation, and formatting.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const yaml = require('js-yaml');

const {
  INITIATIVES_BASE,
  LAYER_PRECEDENCE,
  DiscoveryError,
  scanInitiatives,
  detectOrphans,
  formatSummary,
  isActive,
  safeLoadYaml,
  _deriveStatus,
} = require('../lib/discovery');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-test-'));
}

function cleanUp(root) {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
}

function writeState(root, state) {
  const statePath = path.resolve(root, '_bmad-output/lens-work/state.yaml');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, yaml.dump(state, { lineWidth: -1, noRefs: true }), 'utf8');
  return statePath;
}

function writeInitiative(root, id, config) {
  const configPath = path.resolve(root, '_bmad-output/lens-work/initiatives', `${id}.yaml`);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, yaml.dump(config, { lineWidth: -1, noRefs: true }), 'utf8');
  return configPath;
}

function writeNestedInitiative(root, id, filename, config) {
  const configPath = path.resolve(root, '_bmad-output/lens-work/initiatives', id, filename);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, yaml.dump(config, { lineWidth: -1, noRefs: true }), 'utf8');
  return configPath;
}

function makeFullConfig(id, layer = 'feature', overrides = {}) {
  return {
    id,
    name: id.split('-')[0],
    layer,
    domain: 'Test',
    domain_prefix: 'test',
    track: 'full',
    initiative_root: `test-${id}`,
    active_phases: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'],
    phase_status: {
      preplan: 'complete',
      businessplan: 'in_progress',
      techplan: null,
      devproposal: null,
      sprintplan: null,
    },
    current_phase: 'businessplan',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S-018: Initiative Discovery Scan', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
  });

  afterEach(() => {
    cleanUp(tmpRoot);
  });

  // ── Constants ─────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('LAYER_PRECEDENCE has correct order', () => {
      assert.deepEqual([...LAYER_PRECEDENCE], ['domain', 'service', 'feature', 'repo']);
    });

    it('LAYER_PRECEDENCE is frozen', () => {
      assert.throws(() => { LAYER_PRECEDENCE.push('test'); });
    });
  });

  // ── safeLoadYaml ──────────────────────────────────────────────────────

  describe('safeLoadYaml', () => {
    it('loads valid YAML', () => {
      const filePath = path.join(tmpRoot, 'test.yaml');
      fs.writeFileSync(filePath, 'key: value\n', 'utf8');
      const result = safeLoadYaml(filePath);
      assert.deepEqual(result, { key: 'value' });
    });

    it('returns null on invalid YAML', () => {
      const filePath = path.join(tmpRoot, 'bad.yaml');
      fs.writeFileSync(filePath, '{{{{bad', 'utf8');
      const result = safeLoadYaml(filePath);
      assert.equal(result, null);
    });

    it('returns null on missing file', () => {
      const result = safeLoadYaml(path.join(tmpRoot, 'missing.yaml'));
      assert.equal(result, null);
    });
  });

  // ── isActive ──────────────────────────────────────────────────────────

  describe('isActive', () => {
    it('returns true for initiative with in_progress phases', () => {
      assert.equal(isActive(makeFullConfig('test')), true);
    });

    it('returns true for initiative in dev phase', () => {
      const config = makeFullConfig('test', 'feature', {
        current_phase: 'dev',
        phase_status: {
          preplan: 'complete',
          businessplan: 'complete',
          techplan: 'complete',
          devproposal: 'complete',
          sprintplan: 'complete',
        },
      });
      assert.equal(isActive(config), true);
    });

    it('returns false for fully complete initiative', () => {
      const config = makeFullConfig('test', 'feature', {
        current_phase: null,
        phase_status: {
          preplan: 'complete',
          businessplan: 'complete',
          techplan: 'complete',
          devproposal: 'complete',
          sprintplan: 'complete',
        },
      });
      assert.equal(isActive(config), false);
    });

    it('returns false for null config', () => {
      assert.equal(isActive(null), false);
    });
  });

  // ── _deriveStatus ─────────────────────────────────────────────────────

  describe('_deriveStatus', () => {
    it('returns "active" for active initiative', () => {
      const config = makeFullConfig('active-1');
      assert.equal(_deriveStatus(config, 'active-1'), 'active');
    });

    it('returns "complete" when all phases complete', () => {
      const config = makeFullConfig('done', 'feature', {
        phase_status: {
          preplan: 'complete',
          businessplan: 'complete',
          techplan: 'complete',
          devproposal: 'passed',
          sprintplan: 'complete',
        },
      });
      assert.equal(_deriveStatus(config, 'other'), 'complete');
    });

    it('returns "blocked" when any phase is blocked', () => {
      const config = makeFullConfig('blocked', 'feature', {
        phase_status: { preplan: 'complete', businessplan: 'blocked' },
      });
      assert.equal(_deriveStatus(config, 'other'), 'blocked');
    });

    it('returns "in_progress" when phases are mid-work', () => {
      const config = makeFullConfig('wip', 'feature', {
        phase_status: { preplan: 'complete', businessplan: 'in_progress' },
      });
      assert.equal(_deriveStatus(config, 'other'), 'in_progress');
    });

    it('returns "unknown" for missing phase_status', () => {
      assert.equal(_deriveStatus({ id: 'test' }, 'other'), 'unknown');
    });
  });

  // ── scanInitiatives ───────────────────────────────────────────────────

  describe('scanInitiatives', () => {
    it('scans flat initiative files', () => {
      writeState(tmpRoot, { active_initiative: 'init-a' });
      writeInitiative(tmpRoot, 'init-a', makeFullConfig('init-a'));
      writeInitiative(tmpRoot, 'init-b', makeFullConfig('init-b', 'service'));

      const results = scanInitiatives(tmpRoot);
      assert.equal(results.length, 2);
      const ids = results.map((r) => r.id);
      assert.ok(ids.includes('init-a'));
      assert.ok(ids.includes('init-b'));
    });

    it('scans nested Service.yaml files', () => {
      writeNestedInitiative(tmpRoot, 'nested-svc', 'Service.yaml',
        makeFullConfig('nested-svc', 'service'),
      );

      const results = scanInitiatives(tmpRoot);
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'nested-svc');
    });

    it('scans nested Domain.yaml files', () => {
      writeNestedInitiative(tmpRoot, 'nested-dom', 'Domain.yaml',
        makeFullConfig('nested-dom', 'domain'),
      );

      const results = scanInitiatives(tmpRoot);
      assert.equal(results.length, 1);
      assert.equal(results[0].layer, 'domain');
    });

    it('returns empty array when no initiatives directory', () => {
      const results = scanInitiatives(tmpRoot);
      assert.deepEqual(results, []);
    });

    it('skips configs without id field', () => {
      writeInitiative(tmpRoot, 'no-id', { name: 'test' });
      const results = scanInitiatives(tmpRoot);
      assert.equal(results.length, 0);
    });

    it('filters by layer', () => {
      writeInitiative(tmpRoot, 'init-a', makeFullConfig('init-a', 'feature'));
      writeInitiative(tmpRoot, 'init-b', makeFullConfig('init-b', 'service'));

      const results = scanInitiatives(tmpRoot, { filterLayer: 'service' });
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'init-b');
    });

    it('filters by track', () => {
      writeInitiative(tmpRoot, 'init-a', makeFullConfig('init-a', 'feature', { track: 'full' }));
      writeInitiative(tmpRoot, 'init-b', makeFullConfig('init-b', 'feature', { track: 'hotfix' }));

      const results = scanInitiatives(tmpRoot, { filterTrack: 'hotfix' });
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'init-b');
    });

    it('filters activeOnly', () => {
      writeInitiative(tmpRoot, 'active', makeFullConfig('active'));
      writeInitiative(tmpRoot, 'done', makeFullConfig('done', 'feature', {
        current_phase: null,
        phase_status: {
          preplan: 'complete', businessplan: 'complete',
          techplan: 'complete', devproposal: 'complete', sprintplan: 'complete',
        },
      }));

      const results = scanInitiatives(tmpRoot, { activeOnly: true });
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'active');
    });

    it('sorts by layer precedence', () => {
      writeInitiative(tmpRoot, 'feat', makeFullConfig('feat', 'feature'));
      writeInitiative(tmpRoot, 'dom', makeFullConfig('dom', 'domain'));
      writeInitiative(tmpRoot, 'svc', makeFullConfig('svc', 'service'));

      const results = scanInitiatives(tmpRoot);
      assert.equal(results[0].layer, 'domain');
      assert.equal(results[1].layer, 'service');
      assert.equal(results[2].layer, 'feature');
    });

    it('marks active initiative from state', () => {
      writeState(tmpRoot, { active_initiative: 'init-a' });
      writeInitiative(tmpRoot, 'init-a', makeFullConfig('init-a'));

      const results = scanInitiatives(tmpRoot);
      assert.equal(results[0].status, 'active');
    });
  });

  // ── detectOrphans ─────────────────────────────────────────────────────

  describe('detectOrphans', () => {
    it('detects missing config for state-referenced initiative', () => {
      writeState(tmpRoot, { active_initiative: 'ghost-init' });
      // Create initiatives dir but no ghost-init config
      const dir = path.resolve(tmpRoot, '_bmad-output/lens-work/initiatives');
      fs.mkdirSync(dir, { recursive: true });

      const { missingConfigs } = detectOrphans(tmpRoot);
      assert.ok(missingConfigs.includes('ghost-init'));
    });

    it('returns empty when everything is consistent', () => {
      writeState(tmpRoot, { active_initiative: 'init-a' });
      writeInitiative(tmpRoot, 'init-a', makeFullConfig('init-a'));

      const { orphanConfigs, missingConfigs } = detectOrphans(tmpRoot);
      assert.equal(missingConfigs.length, 0);
      assert.equal(orphanConfigs.length, 0);
    });

    it('flags not_started configs as potential orphans', () => {
      writeState(tmpRoot, { active_initiative: 'active' });
      writeInitiative(tmpRoot, 'active', makeFullConfig('active'));
      writeInitiative(tmpRoot, 'orphan', makeFullConfig('orphan', 'feature', {
        phase_status: {
          preplan: null, businessplan: null,
          techplan: null, devproposal: null, sprintplan: null,
        },
        current_phase: null,
      }));

      const { orphanConfigs } = detectOrphans(tmpRoot);
      assert.ok(orphanConfigs.some((o) => o.id === 'orphan'));
    });

    it('handles missing state file', () => {
      writeInitiative(tmpRoot, 'init-a', makeFullConfig('init-a'));

      const { orphanConfigs, missingConfigs } = detectOrphans(tmpRoot);
      // No state = no active reference, all non-complete are potential orphans
      assert.equal(missingConfigs.length, 0);
    });
  });

  // ── formatSummary ─────────────────────────────────────────────────────

  describe('formatSummary', () => {
    it('formats empty initiative list', () => {
      const output = formatSummary(tmpRoot);
      assert.ok(output.includes('No initiatives found'));
    });

    it('formats initiative list with active marker', () => {
      writeState(tmpRoot, { active_initiative: 'init-a' });
      writeInitiative(tmpRoot, 'init-a', makeFullConfig('init-a'));
      writeInitiative(tmpRoot, 'init-b', makeFullConfig('init-b', 'service'));

      const output = formatSummary(tmpRoot);
      assert.ok(output.includes('init-a'));
      assert.ok(output.includes('init-b'));
      assert.ok(output.includes('★'));
      assert.ok(output.includes('2 initiative'));
    });
  });
});
