/**
 * Tests for Reconstruct (S-037)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  ReconstructError, discoverBranches, parseInitiativeFromBranch,
  scanGitLog, scanArtifactFrontmatter, reconstructState, writeRecoveryFile,
} = require('../lib/reconstruct');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-recon-'));
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('S-037: Reconstruct', () => {

  beforeEach(() => setup());
  afterEach(() => cleanup());

  describe('parseInitiativeFromBranch', () => {
    it('parses initiative ID from branch name', () => {
      const id = parseInitiativeFromBranch('lens-lens-work-upgrade-abc123-small');
      assert.ok(id);
      assert.ok(id.includes('lens'));
    });
    it('returns null for non-lens branch', () => {
      const id = parseInitiativeFromBranch('main');
      assert.equal(id, null);
    });
  });

  describe('discoverBranches', () => {
    it('returns array with stub exec', () => {
      const branches = discoverBranches({ execFn: () => '' });
      assert.ok(Array.isArray(branches));
    });
  });

  describe('scanGitLog', () => {
    it('returns array with stub exec', () => {
      const commits = scanGitLog({ execFn: () => '' });
      assert.ok(Array.isArray(commits));
    });
  });

  describe('scanArtifactFrontmatter', () => {
    it('scans empty directory', () => {
      const results = scanArtifactFrontmatter(tmpDir);
      assert.ok(Array.isArray(results));
      assert.equal(results.length, 0);
    });
  });

  describe('reconstructState', () => {
    it('reconstructs from stub data', () => {
      const result = reconstructState(tmpDir, { execFn: () => '' });
      assert.ok(result.reconstructedState);
      assert.ok(result.reconstructedState.reconstructed);
    });
  });

  describe('writeRecoveryFile', () => {
    it('writes recovery file', () => {
      const recoveryPath = writeRecoveryFile(tmpDir, { test: true });
      assert.ok(fs.existsSync(recoveryPath));
    });
  });

  describe('ReconstructError', () => {
    it('has expected fields', () => {
      const err = new ReconstructError('msg', 'CODE');
      assert.equal(err.name, 'ReconstructError');
      assert.equal(err.code, 'CODE');
    });
  });
});
