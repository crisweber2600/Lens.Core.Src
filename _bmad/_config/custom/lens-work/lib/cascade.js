/**
 * Cascade Merge — S-012
 *
 * Implements cascade merge for audience promotion: before promoting
 * to a larger audience, ensure all smaller audiences have been merged up.
 *
 * Chain: small → medium → large → base
 *
 * @module lib/cascade
 */

'use strict';

const branchNaming = require('./branch-naming');
const pr = require('./pr');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Audience promotion order (smallest to largest, including base) */
const AUDIENCE_ORDER = Object.freeze(['small', 'medium', 'large', 'base']);

/** Promotion paths: each entry is { from, to } */
const PROMOTION_PATHS = Object.freeze([
  { from: 'small', to: 'medium' },
  { from: 'medium', to: 'large' },
  { from: 'large', to: 'base' },
]);

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class CascadeError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CascadeError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if branch A has new commits not in branch B.
 *
 * @param {string} branchA
 * @param {string} branchB
 * @param {object} [opts]
 * @param {Function} [opts.execFn]
 * @param {string} [opts.cwd]
 * @returns {boolean}
 */
function hasNewCommits(branchA, branchB, opts = {}) {
  const gitops = require('./gitops');
  try {
    const output = gitops._git(`rev-list ${branchB}..${branchA} --count`, opts);
    return parseInt(output, 10) > 0;
  } catch {
    return false;
  }
}

/**
 * Check if branch A has merge conflicts with branch B.
 *
 * @param {string} branchA
 * @param {string} branchB
 * @param {object} [opts]
 * @returns {{ hasConflicts: boolean, files: string[] }}
 */
function checkConflicts(branchA, branchB, opts = {}) {
  const gitops = require('./gitops');
  try {
    // Use merge-tree to check without actually merging
    const mergeBase = gitops._git(`merge-base ${branchA} ${branchB}`, opts);
    const output = gitops._git(`merge-tree ${mergeBase} ${branchA} ${branchB}`, opts);

    // If merge-tree output contains conflict markers, there are conflicts
    const hasConflicts = output.includes('<<<<<<<') || output.includes('changed in both');
    const conflictFiles = [];

    if (hasConflicts) {
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/^(?:changed in both|added in both)\s+(.+)/);
        if (match) conflictFiles.push(match[1]);
      }
    }

    return { hasConflicts, files: conflictFiles };
  } catch {
    return { hasConflicts: false, files: [] };
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Determine which cascade steps are needed before a target promotion.
 *
 * E.g., promoting medium→large requires checking small→medium first.
 *
 * @param {string} targetAudience - Target audience (medium | large)
 * @returns {Array<{ from: string, to: string }>} Steps needed
 */
function getCascadeSteps(targetAudience) {
  const targetIdx = AUDIENCE_ORDER.indexOf(targetAudience);
  if (targetIdx <= 0) return []; // small has no prerequisites

  const steps = [];
  for (let i = 0; i < targetIdx; i++) {
    steps.push({
      from: AUDIENCE_ORDER[i],
      to: AUDIENCE_ORDER[i + 1],
    });
  }
  return steps;
}

/**
 * Analyze cascade status for a promotion target.
 *
 * Checks each cascade step to see if intermediate promotions are needed.
 *
 * @param {string} initiativeRoot
 * @param {string} targetAudience - Where we want to promote to
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ needsCascade: boolean, steps: Array<{ from: string, to: string, needed: boolean, hasConflicts: boolean }> }}
 */
function analyzeCascade(initiativeRoot, targetAudience, opts = {}) {
  const cascadeSteps = getCascadeSteps(targetAudience);
  const steps = [];
  let needsCascade = false;

  for (const step of cascadeSteps) {
    const fromBranch = branchNaming.buildAudienceBranchName(initiativeRoot, step.from);
    const toBranch = branchNaming.buildAudienceBranchName(initiativeRoot, step.to);

    const needed = hasNewCommits(fromBranch, toBranch, opts);
    const conflicts = needed ? checkConflicts(fromBranch, toBranch, opts) : { hasConflicts: false, files: [] };

    if (needed) needsCascade = true;

    steps.push({
      from: step.from,
      to: step.to,
      needed,
      hasConflicts: conflicts.hasConflicts,
      conflictFiles: conflicts.files,
    });
  }

  return { needsCascade, steps };
}

/**
 * Execute a cascade merge by creating PRs for each missing step.
 *
 * @param {string} initiativeRoot
 * @param {string} targetAudience
 * @param {string} initiativeId
 * @param {object} [opts]
 * @param {Function} [opts.mcpCreatePR]
 * @param {string} [opts.repoOwner]
 * @param {string} [opts.repoName]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {Promise<{ cascadeNeeded: boolean, prs: Array<{ from: string, to: string, result: object }>, conflicts: Array<{ from: string, to: string, files: string[] }> }>}
 */
async function executeCascade(initiativeRoot, targetAudience, initiativeId, opts = {}) {
  const analysis = analyzeCascade(initiativeRoot, targetAudience, opts);

  if (!analysis.needsCascade) {
    return { cascadeNeeded: false, prs: [], conflicts: [] };
  }

  const prs = [];
  const conflicts = [];

  for (const step of analysis.steps) {
    if (!step.needed) continue;

    if (step.hasConflicts) {
      conflicts.push({
        from: step.from,
        to: step.to,
        files: step.conflictFiles || [],
      });
      continue;
    }

    const result = await pr.createPromotionPR({
      initiativeRoot,
      fromAudience: step.from,
      toAudience: step.to,
      initiativeId,
    }, opts);

    prs.push({ from: step.from, to: step.to, result });
  }

  return { cascadeNeeded: true, prs, conflicts };
}

/**
 * Validate that all prerequisite promotions are complete before allowing target.
 *
 * @param {string} initiativeRoot
 * @param {string} targetAudience
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ ready: boolean, blockingSteps: Array<{ from: string, to: string }> }}
 */
function validateCascadeReady(initiativeRoot, targetAudience, opts = {}) {
  const analysis = analyzeCascade(initiativeRoot, targetAudience, opts);

  const blockingSteps = analysis.steps.filter((s) => s.needed);

  return {
    ready: blockingSteps.length === 0,
    blockingSteps: blockingSteps.map((s) => ({ from: s.from, to: s.to })),
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  AUDIENCE_ORDER,
  PROMOTION_PATHS,
  CascadeError,
  hasNewCommits,
  checkConflicts,
  getCascadeSteps,
  analyzeCascade,
  executeCascade,
  validateCascadeReady,
};
