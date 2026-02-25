/**
 * Git Operations — S-008: Audience branch creation & listing
 *
 * Provides git branch operations for the lens-work lifecycle:
 * audience branch creation, branch listing, and branch topology helpers.
 *
 * Note: This module shells out to git CLI. Tests use mocking/stubs
 * to avoid actual git operations.
 *
 * @module lib/gitops
 */

'use strict';

const { execSync } = require('node:child_process');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default audiences for full track */
const DEFAULT_AUDIENCES = Object.freeze(['small', 'medium', 'large']);

/** Default git remote */
const DEFAULT_REMOTE = 'origin';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class GitOpsError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GitOpsError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Git helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Execute a git command synchronously.
 *
 * @param {string} cmd - git sub-command (e.g. 'branch my-branch')
 * @param {object} [opts]
 * @param {string} [opts.cwd] - Working directory
 * @param {Function} [opts.execFn] - Override for testing
 * @returns {string} stdout trimmed
 */
function _git(cmd, opts = {}) {
  const execFn = opts.execFn || execSync;
  const cwd = opts.cwd || process.cwd();

  try {
    return execFn(`git ${cmd}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    throw new GitOpsError(
      `Git command failed: git ${cmd}\n${err.stderr || err.message}`,
      'GIT_COMMAND_FAILED',
      { command: `git ${cmd}`, stderr: err.stderr, exitCode: err.status },
    );
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Check if a branch exists locally.
 *
 * @param {string} branchName
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {boolean}
 */
function branchExists(branchName, opts = {}) {
  try {
    _git(`rev-parse --verify refs/heads/${branchName}`, opts);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a local git branch (idempotent – skips if exists).
 *
 * @param {string} branchName
 * @param {object} [opts]
 * @param {string} [opts.baseBranch] - Branch to create from (default: current HEAD)
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ created: boolean, branchName: string }}
 */
function createBranch(branchName, opts = {}) {
  if (branchExists(branchName, opts)) {
    return { created: false, branchName };
  }

  if (opts.baseBranch) {
    _git(`branch ${branchName} ${opts.baseBranch}`, opts);
  } else {
    _git(`branch ${branchName}`, opts);
  }

  return { created: true, branchName };
}

/**
 * Push a branch to a remote.
 *
 * @param {string} branchName
 * @param {object} [opts]
 * @param {string} [opts.remote] - Remote name (default: 'origin')
 * @param {boolean} [opts.setUpstream] - Whether to set upstream tracking (default: true)
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ pushed: boolean, branchName: string, remote: string }}
 */
function pushBranch(branchName, opts = {}) {
  const remote = opts.remote || DEFAULT_REMOTE;
  const setUpstream = opts.setUpstream !== false;

  const upstreamFlag = setUpstream ? '-u ' : '';
  _git(`push ${upstreamFlag}${remote} ${branchName}`, opts);

  return { pushed: true, branchName, remote };
}

/**
 * Create audience branches for an initiative.
 *
 * Creates {initiativeRoot}-{audience} branches for each audience in the list.
 * Optionally pushes them to remote. Idempotent—existing branches are skipped.
 *
 * @param {string} initiativeRoot - The initiative root branch name
 * @param {object} [opts]
 * @param {string[]} [opts.audiences] - Audiences to create (default: small, medium, large)
 * @param {boolean} [opts.push] - Whether to push branches (default: false)
 * @param {string} [opts.remote] - Git remote (default: 'origin')
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ branches: Array<{name: string, created: boolean, pushed: boolean}>, initiativeRoot: string }}
 */
function createAudienceBranches(initiativeRoot, opts = {}) {
  const audiences = opts.audiences || [...DEFAULT_AUDIENCES];
  const shouldPush = opts.push || false;

  if (!initiativeRoot || typeof initiativeRoot !== 'string') {
    throw new GitOpsError(
      'initiativeRoot must be a non-empty string',
      'INVALID_INITIATIVE_ROOT',
      { initiativeRoot },
    );
  }

  const results = [];

  for (const audience of audiences) {
    const branchName = `${initiativeRoot}-${audience}`;
    const { created } = createBranch(branchName, {
      baseBranch: initiativeRoot,
      cwd: opts.cwd,
      execFn: opts.execFn,
    });

    let pushed = false;
    if (shouldPush && created) {
      pushBranch(branchName, {
        remote: opts.remote,
        cwd: opts.cwd,
        execFn: opts.execFn,
      });
      pushed = true;
    }

    results.push({ name: branchName, created, pushed });
  }

  return { branches: results, initiativeRoot };
}

/**
 * List branches matching a pattern.
 *
 * @param {string} [pattern] - Glob pattern for filtering (e.g. 'lens-*')
 * @param {object} [opts]
 * @param {boolean} [opts.remote] - List remote branches instead of local
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {string[]} Array of branch names (trimmed, without leading whitespace or markers)
 */
function listBranches(pattern, opts = {}) {
  const remoteFlag = opts.remote ? '-r' : '';
  const listArg = pattern ? `--list "${pattern}"` : '';
  const cmd = `branch ${remoteFlag} ${listArg}`.replace(/\s+/g, ' ').trim();

  let output;
  try {
    output = _git(cmd, opts);
  } catch {
    return [];
  }

  if (!output) return [];

  return output
    .split('\n')
    .map((line) => line.replace(/^\*?\s+/, '').trim())
    .filter(Boolean);
}

/**
 * Get the current branch name.
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {string}
 */
function getCurrentBranch(opts = {}) {
  return _git('branch --show-current', opts);
}

/**
 * Validate branch topology for an initiative.
 *
 * Checks that root + audience branches exist. Returns a report of
 * expected branches and whether each exists.
 *
 * @param {string} initiativeRoot
 * @param {object} [opts]
 * @param {string[]} [opts.audiences]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ valid: boolean, branches: Array<{name: string, exists: boolean}> }}
 */
function validateTopology(initiativeRoot, opts = {}) {
  const audiences = opts.audiences || [...DEFAULT_AUDIENCES];

  const expected = [
    initiativeRoot,
    ...audiences.map((a) => `${initiativeRoot}-${a}`),
  ];

  const branches = expected.map((name) => ({
    name,
    exists: branchExists(name, opts),
  }));

  return {
    valid: branches.every((b) => b.exists),
    branches,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
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
  // Internal (exposed for testing)
  _git,
};
