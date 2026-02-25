/**
 * Tests for Artifact Path Resolution (S-017)
 *
 * Tests path resolution, existence checks, loading, and listing.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  DOCS_DIR,
  KNOWN_ARTIFACTS,
  ArtifactError,
  buildDocsRelativePath,
  resolveArtifactPath,
  artifactExists,
  loadArtifact,
  listArtifacts,
  checkKnownArtifacts,
} = require('../lib/artifacts');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-test-'));
}

function cleanUp(root) {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
}

/** Create a config mimicking real initiative data */
function makeInitConfig(overrides = {}) {
  return {
    id: 'upgrade-cjki9q',
    name: 'upgrade',
    layer: 'feature',
    domain: 'Lens',
    domain_prefix: 'lens',
    service: 'lens-work',
    service_prefix: 'lens-work',
    docs: {
      root: 'docs',
      domain: 'lens',
      service: 'lens-work',
      repo: '',
      feature: 'upgrade',
      path: 'docs/lens/lens-work/feature/upgrade',
    },
    ...overrides,
  };
}

/** Write a file at a given path relative to root */
function writeFile(root, relPath, content = '# Test artifact\n') {
  const abs = path.resolve(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S-017: Artifact Path Resolution', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
  });

  afterEach(() => {
    cleanUp(tmpRoot);
  });

  // ── Constants ─────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('DOCS_DIR is "Docs"', () => {
      assert.equal(DOCS_DIR, 'Docs');
    });

    it('KNOWN_ARTIFACTS is frozen', () => {
      assert.throws(() => { KNOWN_ARTIFACTS.push('test'); });
    });

    it('KNOWN_ARTIFACTS includes core artifact types', () => {
      assert.ok(KNOWN_ARTIFACTS.includes('prd'));
      assert.ok(KNOWN_ARTIFACTS.includes('architecture'));
      assert.ok(KNOWN_ARTIFACTS.includes('product-brief'));
    });
  });

  // ── ArtifactError ─────────────────────────────────────────────────────

  describe('ArtifactError', () => {
    it('has correct name, code, and details', () => {
      const err = new ArtifactError('test', 'TEST', { k: 'v' });
      assert.equal(err.name, 'ArtifactError');
      assert.equal(err.code, 'TEST');
      assert.deepEqual(err.details, { k: 'v' });
    });
  });

  // ── buildDocsRelativePath ─────────────────────────────────────────────

  describe('buildDocsRelativePath', () => {
    it('uses docs.path from config when available', () => {
      const config = makeInitConfig();
      const result = buildDocsRelativePath(config);
      // docs.path is "docs/lens/lens-work/feature/upgrade"
      // Should normalize to "Docs/lens/lens-work/feature/upgrade"
      assert.equal(result, 'Docs/lens/lens-work/feature/upgrade');
    });

    it('builds from components when docs.path is absent', () => {
      const config = makeInitConfig({ docs: undefined });
      const result = buildDocsRelativePath(config);
      assert.equal(result, 'Docs/lens/lens-work/feature/upgrade');
    });

    it('handles missing domain/service gracefully', () => {
      const config = { name: 'test', domain_prefix: '', service_prefix: '' };
      const result = buildDocsRelativePath(config);
      assert.equal(result, 'Docs/feature/test');
    });

    it('respects docsDir override', () => {
      const config = makeInitConfig();
      const result = buildDocsRelativePath(config, { docsDir: 'docs' });
      assert.equal(result, 'docs/lens/lens-work/feature/upgrade');
    });
  });

  // ── resolveArtifactPath ───────────────────────────────────────────────

  describe('resolveArtifactPath', () => {
    it('resolves absolute path for an artifact', () => {
      const config = makeInitConfig();
      const result = resolveArtifactPath(tmpRoot, config, 'prd');
      assert.ok(path.isAbsolute(result));
      assert.ok(result.endsWith('prd.md'));
      assert.ok(result.includes('lens'));
    });

    it('appends .md extension by default', () => {
      const config = makeInitConfig();
      const result = resolveArtifactPath(tmpRoot, config, 'architecture');
      assert.ok(result.endsWith('architecture.md'));
    });

    it('does not double-add extension', () => {
      const config = makeInitConfig();
      const result = resolveArtifactPath(tmpRoot, config, 'architecture.md');
      assert.ok(result.endsWith('architecture.md'));
      assert.ok(!result.endsWith('.md.md'));
    });

    it('respects custom extension', () => {
      const config = makeInitConfig();
      const result = resolveArtifactPath(tmpRoot, config, 'data', { extension: '.yaml' });
      assert.ok(result.endsWith('data.yaml'));
    });

    it('throws on invalid projectRoot', () => {
      assert.throws(
        () => resolveArtifactPath('', makeInitConfig(), 'prd'),
        (err) => err instanceof ArtifactError && err.code === 'INVALID_PROJECT_ROOT',
      );
    });

    it('throws on invalid initConfig', () => {
      assert.throws(
        () => resolveArtifactPath(tmpRoot, null, 'prd'),
        (err) => err instanceof ArtifactError && err.code === 'INVALID_INIT_CONFIG',
      );
    });

    it('throws on invalid artifact', () => {
      assert.throws(
        () => resolveArtifactPath(tmpRoot, makeInitConfig(), ''),
        (err) => err instanceof ArtifactError && err.code === 'INVALID_ARTIFACT',
      );
    });
  });

  // ── artifactExists ────────────────────────────────────────────────────

  describe('artifactExists', () => {
    it('returns true when artifact file exists', () => {
      const config = makeInitConfig();
      const relPath = buildDocsRelativePath(config);
      writeFile(tmpRoot, `${relPath}/prd.md`, '# PRD');

      assert.equal(artifactExists(tmpRoot, config, 'prd'), true);
    });

    it('returns false when artifact does not exist', () => {
      const config = makeInitConfig();
      assert.equal(artifactExists(tmpRoot, config, 'prd'), false);
    });

    it('returns false on invalid inputs (no throw)', () => {
      assert.equal(artifactExists('', null, ''), false);
    });
  });

  // ── loadArtifact ──────────────────────────────────────────────────────

  describe('loadArtifact', () => {
    it('loads artifact content', () => {
      const config = makeInitConfig();
      const relPath = buildDocsRelativePath(config);
      writeFile(tmpRoot, `${relPath}/prd.md`, '# Product Requirements\nContent here.');

      const content = loadArtifact(tmpRoot, config, 'prd');
      assert.ok(content.includes('Product Requirements'));
      assert.ok(content.includes('Content here.'));
    });

    it('throws ArtifactError when not found', () => {
      const config = makeInitConfig();
      assert.throws(
        () => loadArtifact(tmpRoot, config, 'nonexistent'),
        (err) => err instanceof ArtifactError && err.code === 'ARTIFACT_NOT_FOUND',
      );
    });
  });

  // ── listArtifacts ─────────────────────────────────────────────────────

  describe('listArtifacts', () => {
    it('lists all .md files in docs directory', () => {
      const config = makeInitConfig();
      const relPath = buildDocsRelativePath(config);
      writeFile(tmpRoot, `${relPath}/prd.md`);
      writeFile(tmpRoot, `${relPath}/architecture.md`);
      writeFile(tmpRoot, `${relPath}/notes.txt`); // should be excluded

      const result = listArtifacts(tmpRoot, config);
      assert.equal(result.length, 2);
      const names = result.map((a) => a.name).sort();
      assert.deepEqual(names, ['architecture', 'prd']);
      result.forEach((a) => assert.equal(a.exists, true));
    });

    it('returns empty array when directory does not exist', () => {
      const config = makeInitConfig();
      const result = listArtifacts(tmpRoot, config);
      assert.deepEqual(result, []);
    });

    it('filters by custom extension', () => {
      const config = makeInitConfig();
      const relPath = buildDocsRelativePath(config);
      writeFile(tmpRoot, `${relPath}/data.yaml`, 'key: value');
      writeFile(tmpRoot, `${relPath}/prd.md`);

      const result = listArtifacts(tmpRoot, config, { extension: '.yaml' });
      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'data');
    });
  });

  // ── checkKnownArtifacts ───────────────────────────────────────────────

  describe('checkKnownArtifacts', () => {
    it('checks all known artifacts', () => {
      const config = makeInitConfig();
      const result = checkKnownArtifacts(tmpRoot, config);
      assert.equal(result.length, KNOWN_ARTIFACTS.length);
      result.forEach((r) => {
        assert.ok(KNOWN_ARTIFACTS.includes(r.artifact));
        assert.equal(r.exists, false); // nothing written
        assert.ok(r.path);
      });
    });

    it('detects existing known artifacts', () => {
      const config = makeInitConfig();
      const relPath = buildDocsRelativePath(config);
      writeFile(tmpRoot, `${relPath}/prd.md`);
      writeFile(tmpRoot, `${relPath}/architecture.md`);

      const result = checkKnownArtifacts(tmpRoot, config);
      const prd = result.find((r) => r.artifact === 'prd');
      const arch = result.find((r) => r.artifact === 'architecture');
      const brief = result.find((r) => r.artifact === 'product-brief');

      assert.equal(prd.exists, true);
      assert.equal(arch.exists, true);
      assert.equal(brief.exists, false);
    });
  });
});
