/**
 * Phase Branch Lifecycle — S-009
 *
 * Extends gitops with phase branch operations: create, checkout,
 * push, detect, and cleanup phase branches within the audience
 * branch hierarchy.
 *
 * Phase branch pattern: {initiativeRoot}-{audience}-{phase}
 *
 * @module lib/phase-branch
 */

'use strict';

const gitops = require('./gitops');
const branchNaming = require('./branch-naming');

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class PhaseBranchError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PhaseBranchError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Create a phase branch from the correct audience branch.
 *
 * Idempotent — skips if branch already exists.
 *
 * @param {string} initiativeRoot - Initiative root branch name
 * @param {string} audience - Target audience (small | medium | large)
 * @param {string} phase - Phase name (preplan | businessplan | ...)
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ created: boolean, branchName: string, baseBranch: string }}
 */
function createPhaseBranch(initiativeRoot, audience, phase, opts = {}) {
  const branchName = branchNaming.buildPhaseBranchName(initiativeRoot, audience, phase);
  const baseBranch = branchNaming.buildAudienceBranchName(initiativeRoot, audience);

  // Validate audience branch exists
  if (!gitops.branchExists(baseBranch, opts)) {
    throw new PhaseBranchError(
      `Audience branch '${baseBranch}' does not exist. Cannot create phase branch.`,
      'AUDIENCE_BRANCH_MISSING',
      { baseBranch, phaseBranch: branchName },
    );
  }

  // Idempotent creation
  if (gitops.branchExists(branchName, opts)) {
    return { created: false, branchName, baseBranch };
  }

  gitops.createBranch(branchName, { baseBranch, ...opts });
  return { created: true, branchName, baseBranch };
}

/**
 * Checkout an existing phase branch and pull latest.
 *
 * @param {string} branchName - Phase branch to checkout
 * @param {object} [opts]
 * @param {boolean} [opts.pull] - Pull latest from remote (default: true)
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ checkedOut: boolean, branchName: string, pulled: boolean }}
 */
function checkoutPhaseBranch(branchName, opts = {}) {
  const shouldPull = opts.pull !== false;

  if (!gitops.branchExists(branchName, opts)) {
    throw new PhaseBranchError(
      `Phase branch '${branchName}' does not exist`,
      'BRANCH_NOT_FOUND',
      { branchName },
    );
  }

  gitops._git(`checkout ${branchName}`, opts);

  let pulled = false;
  if (shouldPull) {
    try {
      gitops._git(`pull --ff-only`, opts);
      pulled = true;
    } catch {
      // Pull may fail if no upstream — that's OK
      pulled = false;
    }
  }

  return { checkedOut: true, branchName, pulled };
}

/**
 * Push a phase branch to the remote.
 *
 * @param {string} branchName
 * @param {object} [opts]
 * @param {string} [opts.remote]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ pushed: boolean, branchName: string }}
 */
function pushPhaseBranch(branchName, opts = {}) {
  return gitops.pushBranch(branchName, opts);
}

/**
 * Detect if a phase branch exists (local or remote).
 *
 * @param {string} initiativeRoot
 * @param {string} audience
 * @param {string} phase
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ exists: boolean, branchName: string, local: boolean, remote: boolean }}
 */
function detectPhaseBranch(initiativeRoot, audience, phase, opts = {}) {
  const branchName = branchNaming.buildPhaseBranchName(initiativeRoot, audience, phase);
  const local = gitops.branchExists(branchName, opts);

  let remote = false;
  try {
    const remoteBranches = gitops.listBranches(`*${branchName}`, { remote: true, ...opts });
    remote = remoteBranches.some((b) => b.includes(branchName));
  } catch {
    remote = false;
  }

  return { exists: local || remote, branchName, local, remote };
}

/**
 * Delete a phase branch after PR merge (cleanup).
 *
 * @param {string} branchName
 * @param {object} [opts]
 * @param {boolean} [opts.deleteRemote] - Also delete remote branch
 * @param {string} [opts.remote] - Remote name (default: origin)
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ deleted: boolean, branchName: string, remoteDeleted: boolean }}
 */
function deletePhaseBranch(branchName, opts = {}) {
  const remote = opts.remote || gitops.DEFAULT_REMOTE;
  let deleted = false;
  let remoteDeleted = false;

  // Ensure we're not on this branch
  try {
    const current = gitops.getCurrentBranch(opts);
    if (current === branchName) {
      throw new PhaseBranchError(
        `Cannot delete current branch '${branchName}'. Switch to another branch first.`,
        'CANNOT_DELETE_CURRENT',
        { branchName },
      );
    }
  } catch (err) {
    if (err instanceof PhaseBranchError) throw err;
    // Ignore other errors (detached HEAD, etc.)
  }

  // Delete local
  if (gitops.branchExists(branchName, opts)) {
    gitops._git(`branch -d ${branchName}`, opts);
    deleted = true;
  }

  // Delete remote
  if (opts.deleteRemote) {
    try {
      gitops._git(`push ${remote} --delete ${branchName}`, opts);
      remoteDeleted = true;
    } catch {
      // Remote deletion may fail if branch doesn't exist remotely
    }
  }

  return { deleted, branchName, remoteDeleted };
}

/**
 * Get the phase lifecycle for an initiative — which phases exist.
 *
 * @param {string} initiativeRoot
 * @param {string} audience
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {Array<{phase: string, branchName: string, exists: boolean}>}
 */
function getPhaseBranchStatus(initiativeRoot, audience, opts = {}) {
  return branchNaming.VALID_PHASES.map((phase) => {
    const branchName = branchNaming.buildPhaseBranchName(initiativeRoot, audience, phase);
    return {
      phase,
      branchName,
      exists: gitops.branchExists(branchName, opts),
    };
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PhaseBranchError,
  createPhaseBranch,
  checkoutPhaseBranch,
  pushPhaseBranch,
  detectPhaseBranch,
  deletePhaseBranch,
  getPhaseBranchStatus,
};
