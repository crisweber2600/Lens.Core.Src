/**
 * Tests for Git Operations (S-008)
 *
 * Uses a mock execFn to avoid actual git operations.
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_AUDIENCES,
  DEFAULT_REMOTE,
  GitOpsError,
  branchExists,
  createBranch,
  pushBranch,
  createAudienceBranches,
  listBranches,
  getCurrentBranch,
  validateTopology,
  _git,
} = require('../lib/gitops');

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock exec function that tracks calls and returns canned responses.
 *
 * @param {object} [responses] - Map of git command substrings → response strings
 * @param {string[]} [failOn] - Array of git command substrings that should throw
 * @returns {{ execFn: Function, calls: string[] }}
 */
function createMockExec(responses = {}, failOn = []) {
  const calls = [];

  const execFn = (cmd, opts) => {
    calls.push(cmd);

    for (const pattern of failOn) {
      if (cmd.includes(pattern)) {
        const err = new Error(`mock fail: ${cmd}`);
        err.stderr = `fatal: ${pattern} failed`;
        err.status = 128;
        throw err;
      }
    }

    for (const [pattern, response] of Object.entries(responses)) {
      if (cmd.includes(pattern)) {
        return response;
      }
    }

    return '';
  };

  return { execFn, calls };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S-008: Git Operations (gitops)', () => {

  // ── Constants ─────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('DEFAULT_AUDIENCES contains small, medium, large', () => {
      assert.deepEqual([...DEFAULT_AUDIENCES], ['small', 'medium', 'large']);
    });

    it('DEFAULT_AUDIENCES is frozen', () => {
      assert.throws(() => { DEFAULT_AUDIENCES.push('test'); });
    });

    it('DEFAULT_REMOTE is origin', () => {
      assert.equal(DEFAULT_REMOTE, 'origin');
    });
  });

  // ── GitOpsError ───────────────────────────────────────────────────────

  describe('GitOpsError', () => {
    it('has correct name and code', () => {
      const err = new GitOpsError('test', 'TEST_CODE', { detail: 1 });
      assert.equal(err.name, 'GitOpsError');
      assert.equal(err.code, 'TEST_CODE');
      assert.equal(err.message, 'test');
      assert.deepEqual(err.details, { detail: 1 });
    });

    it('is an instance of Error', () => {
      const err = new GitOpsError('test', 'CODE');
      assert.ok(err instanceof Error);
    });
  });

  // ── _git ──────────────────────────────────────────────────────────────

  describe('_git', () => {
    it('calls execFn with git prefix', () => {
      const { execFn, calls } = createMockExec({ 'git status': 'clean' });
      _git('status', { execFn });
      assert.equal(calls.length, 1);
      assert.ok(calls[0].startsWith('git status'));
    });

    it('throws GitOpsError on exec failure', () => {
      const { execFn } = createMockExec({}, ['status']);
      assert.throws(
        () => _git('status', { execFn }),
        (err) => err instanceof GitOpsError && err.code === 'GIT_COMMAND_FAILED',
      );
    });

    it('trims output', () => {
      const { execFn } = createMockExec({ 'git branch': '  main\n' });
      const result = _git('branch --show-current', { execFn });
      assert.equal(result, 'main');
    });
  });

  // ── branchExists ──────────────────────────────────────────────────────

  describe('branchExists', () => {
    it('returns true when branch exists', () => {
      const { execFn } = createMockExec({ 'rev-parse': 'abc123' });
      assert.equal(branchExists('main', { execFn }), true);
    });

    it('returns false when branch does not exist', () => {
      const { execFn } = createMockExec({}, ['rev-parse']);
      assert.equal(branchExists('nonexistent', { execFn }), false);
    });
  });

  // ── createBranch ──────────────────────────────────────────────────────

  describe('createBranch', () => {
    it('creates branch when it does not exist', () => {
      const { execFn, calls } = createMockExec({}, ['rev-parse']);
      const result = createBranch('new-branch', { execFn });
      assert.equal(result.created, true);
      assert.equal(result.branchName, 'new-branch');
      assert.ok(calls.some((c) => c.includes('git branch new-branch')));
    });

    it('skips creation when branch already exists', () => {
      const { execFn, calls } = createMockExec({ 'rev-parse': 'abc123' });
      const result = createBranch('existing-branch', { execFn });
      assert.equal(result.created, false);
      assert.equal(result.branchName, 'existing-branch');
      // Should only call rev-parse, not branch creation
      assert.ok(!calls.some((c) => c.includes('git branch existing-branch')));
    });

    it('creates branch from a specific base', () => {
      const { execFn, calls } = createMockExec({}, ['rev-parse']);
      createBranch('new-branch', { baseBranch: 'main', execFn });
      assert.ok(calls.some((c) => c.includes('git branch new-branch main')));
    });
  });

  // ── pushBranch ────────────────────────────────────────────────────────

  describe('pushBranch', () => {
    it('pushes to default remote with upstream', () => {
      const { execFn, calls } = createMockExec({});
      const result = pushBranch('my-branch', { execFn });
      assert.equal(result.pushed, true);
      assert.equal(result.branchName, 'my-branch');
      assert.equal(result.remote, 'origin');
      assert.ok(calls.some((c) => c.includes('push -u origin my-branch')));
    });

    it('pushes to custom remote', () => {
      const { execFn, calls } = createMockExec({});
      pushBranch('my-branch', { remote: 'upstream', execFn });
      assert.ok(calls.some((c) => c.includes('push -u upstream my-branch')));
    });

    it('pushes without upstream flag when disabled', () => {
      const { execFn, calls } = createMockExec({});
      pushBranch('my-branch', { setUpstream: false, execFn });
      assert.ok(calls.some((c) => c.includes('push origin my-branch') && !c.includes('-u')));
    });

    it('throws GitOpsError on push failure', () => {
      const { execFn } = createMockExec({}, ['push']);
      assert.throws(
        () => pushBranch('my-branch', { execFn }),
        (err) => err instanceof GitOpsError,
      );
    });
  });

  // ── createAudienceBranches ────────────────────────────────────────────

  describe('createAudienceBranches', () => {
    it('creates audience branches for default audiences', () => {
      const { execFn, calls } = createMockExec({}, ['rev-parse']);
      const result = createAudienceBranches('lens-my-init', { execFn });

      assert.equal(result.initiativeRoot, 'lens-my-init');
      assert.equal(result.branches.length, 3);
      assert.deepEqual(
        result.branches.map((b) => b.name),
        ['lens-my-init-small', 'lens-my-init-medium', 'lens-my-init-large'],
      );
      result.branches.forEach((b) => {
        assert.equal(b.created, true);
        assert.equal(b.pushed, false);
      });
    });

    it('creates audience branches with custom audiences', () => {
      const { execFn } = createMockExec({}, ['rev-parse']);
      const result = createAudienceBranches('root', {
        audiences: ['alpha', 'beta'],
        execFn,
      });

      assert.equal(result.branches.length, 2);
      assert.deepEqual(
        result.branches.map((b) => b.name),
        ['root-alpha', 'root-beta'],
      );
    });

    it('pushes branches when push=true and branch is new', () => {
      const { execFn, calls } = createMockExec({}, ['rev-parse']);
      const result = createAudienceBranches('lens-init', {
        push: true,
        execFn,
      });

      result.branches.forEach((b) => {
        assert.equal(b.pushed, true);
      });
      // Check push commands were issued
      const pushCalls = calls.filter((c) => c.includes('push'));
      assert.equal(pushCalls.length, 3);
    });

    it('skips existing branches (idempotent)', () => {
      // Make small exist but not medium/large
      const { execFn } = createMockExec(
        { 'refs/heads/root-small': 'abc' },
        ['refs/heads/root-medium', 'refs/heads/root-large'],
      );
      const result = createAudienceBranches('root', { execFn });

      const small = result.branches.find((b) => b.name === 'root-small');
      const medium = result.branches.find((b) => b.name === 'root-medium');
      assert.equal(small.created, false);
      assert.equal(medium.created, true);
    });

    it('throws on invalid initiativeRoot', () => {
      assert.throws(
        () => createAudienceBranches('', {}),
        (err) => err instanceof GitOpsError && err.code === 'INVALID_INITIATIVE_ROOT',
      );

      assert.throws(
        () => createAudienceBranches(null, {}),
        (err) => err instanceof GitOpsError && err.code === 'INVALID_INITIATIVE_ROOT',
      );
    });
  });

  // ── listBranches ──────────────────────────────────────────────────────

  describe('listBranches', () => {
    it('lists branches and trims markers', () => {
      const { execFn } = createMockExec({
        'git branch': '  main\n* feature/test\n  develop\n',
      });
      const result = listBranches(undefined, { execFn });
      assert.deepEqual(result, ['main', 'feature/test', 'develop']);
    });

    it('returns empty array on error', () => {
      const { execFn } = createMockExec({}, ['branch']);
      const result = listBranches(undefined, { execFn });
      assert.deepEqual(result, []);
    });

    it('returns empty array on empty output', () => {
      const { execFn } = createMockExec({ 'git branch': '' });
      const result = listBranches(undefined, { execFn });
      assert.deepEqual(result, []);
    });

    it('passes pattern to git branch --list', () => {
      const { execFn, calls } = createMockExec({ 'git branch': 'lens-a\nlens-b\n' });
      listBranches('lens-*', { execFn });
      assert.ok(calls.some((c) => c.includes('--list')));
    });
  });

  // ── getCurrentBranch ──────────────────────────────────────────────────

  describe('getCurrentBranch', () => {
    it('returns current branch name', () => {
      const { execFn } = createMockExec({ '--show-current': 'feature/sprint-1' });
      const result = getCurrentBranch({ execFn });
      assert.equal(result, 'feature/sprint-1');
    });
  });

  // ── validateTopology ──────────────────────────────────────────────────

  describe('validateTopology', () => {
    it('returns valid when all branches exist', () => {
      const { execFn } = createMockExec({ 'rev-parse': 'abc' });
      const result = validateTopology('lens-init', { execFn });
      assert.equal(result.valid, true);
      assert.equal(result.branches.length, 4); // root + 3 audiences
      result.branches.forEach((b) => assert.equal(b.exists, true));
    });

    it('returns invalid when some branches missing', () => {
      // root exists, audiences don't
      const { execFn } = createMockExec(
        { 'refs/heads/lens-init': 'abc' },
        ['refs/heads/lens-init-small', 'refs/heads/lens-init-medium', 'refs/heads/lens-init-large'],
      );
      const result = validateTopology('lens-init', { execFn });
      assert.equal(result.valid, false);
      const root = result.branches.find((b) => b.name === 'lens-init');
      assert.equal(root.exists, true);
      const small = result.branches.find((b) => b.name === 'lens-init-small');
      assert.equal(small.exists, false);
    });

    it('uses custom audiences', () => {
      const { execFn } = createMockExec({ 'rev-parse': 'abc' });
      const result = validateTopology('root', {
        audiences: ['alpha'],
        execFn,
      });
      assert.equal(result.branches.length, 2); // root + alpha
      assert.deepEqual(
        result.branches.map((b) => b.name),
        ['root', 'root-alpha'],
      );
    });
  });
});
