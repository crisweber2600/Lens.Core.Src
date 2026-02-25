/**
 * Precondition Validation Chain — S-025
 *
 * Validates all preconditions before dispatching a phase command:
 * - Previous phase must be complete (PR merged)
 * - Required artifacts from prior phases must exist
 * - Constitution must permit the track/action
 *
 * Returns structured errors per UX gate feedback contract.
 *
 * @module lib/preconditions
 */

'use strict';

const state = require('./state');
const artifacts = require('./artifacts');
const gates = require('./gates');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Phase execution order */
const PHASE_ORDER = Object.freeze([
  'preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan',
]);

/** Phase → audience mapping (v2: all phases execute at small per architecture §3.2.2) */
const PHASE_AUDIENCE_MAP = Object.freeze({
  preplan: 'small',
  businessplan: 'small',
  techplan: 'small',
  devproposal: 'small',
  sprintplan: 'small',
});

/** Artifacts required to be complete before each phase */
const PHASE_PREREQUISITES = Object.freeze({
  preplan: [],
  businessplan: ['product-brief'],
  techplan: ['product-brief', 'prd'],
  devproposal: ['product-brief', 'prd', 'architecture', 'tech-decisions'],
  sprintplan: ['product-brief', 'prd', 'architecture', 'tech-decisions', 'epics'],
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class PreconditionError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PreconditionError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Get the previous phase in the execution order.
 *
 * @param {string} phase
 * @returns {string|null}
 */
function getPreviousPhase(phase) {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx <= 0) return null;
  return PHASE_ORDER[idx - 1];
}

/**
 * Get the audience for a given phase.
 *
 * @param {string} phase
 * @returns {string}
 */
function getPhaseAudience(phase) {
  return PHASE_AUDIENCE_MAP[phase] || 'small';
}

/**
 * Run the full precondition validation chain for a phase.
 *
 * @param {object} params
 * @param {string} params.projectRoot - Absolute path to project root
 * @param {string} params.phase - Phase to validate preconditions for
 * @param {object} params.stateData - Current state.yaml data
 * @param {object} params.initConfig - Initiative config
 * @param {object} [params.resolved] - Resolved constitution governance
 * @returns {{ valid: boolean, errors: Array<{check: string, message: string, action: string}> }}
 */
function validatePreconditions(params) {
  const errors = [];
  const { phase, stateData, initConfig, resolved } = params;

  // 1. Check phase is valid
  if (!PHASE_ORDER.includes(phase)) {
    errors.push({
      check: 'phase_valid',
      message: `Unknown phase: '${phase}'`,
      action: `Use one of: ${PHASE_ORDER.join(', ')}`,
    });
    return { valid: false, errors };
  }

  // 2. Check phase not already complete
  if (stateData.phase_status && stateData.phase_status[phase] === 'complete') {
    const nextPhase = PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1];
    errors.push({
      check: 'phase_not_complete',
      message: `Phase '${phase}' is already complete`,
      action: nextPhase ? `Next: /${nextPhase}` : 'All phases are complete.',
    });
    return { valid: false, errors };
  }

  // 3. Check previous phase is complete
  const prevPhase = getPreviousPhase(phase);
  if (prevPhase) {
    const prevStatus = stateData.phase_status?.[prevPhase];
    if (prevStatus !== 'complete') {
      const statusLabel = prevStatus || 'not started';
      errors.push({
        check: 'previous_phase_complete',
        message: `Cannot start ${phase} — previous phase '${prevPhase}' is ${statusLabel}`,
        action: prevStatus === 'pr_pending'
          ? `Merge the PR for /${prevPhase} first`
          : `Complete /${prevPhase} before starting /${phase}`,
      });
    }
  }

  // 4. Check required artifacts from prior phases
  const requiredArtifacts = PHASE_PREREQUISITES[phase] || [];
  for (const artifact of requiredArtifacts) {
    if (!artifacts.artifactExists(params.projectRoot, initConfig, artifact)) {
      errors.push({
        check: 'required_artifact',
        message: `Missing required artifact: '${artifact}'`,
        action: `Expected at: ${artifacts.resolveArtifactPath(params.projectRoot, initConfig, artifact)}`,
      });
    }
  }

  // 5. Check constitution permits the track
  if (resolved && initConfig.track) {
    const trackResult = gates.validateTrack(initConfig.track, resolved);
    if (trackResult.result === gates.GATE_RESULT.BLOCK) {
      errors.push({
        check: 'track_permitted',
        message: trackResult.reason,
        action: 'Check constitution rules or change the initiative track.',
      });
    }
  }

  // 6. Check audience promotion requirements (if phase requires different audience)
  const currentAudience = getPhaseAudience(phase);
  if (prevPhase) {
    const prevAudience = getPhaseAudience(prevPhase);
    if (currentAudience !== prevAudience) {
      // Need audience promotion
      const promotionKey = `${prevAudience}_to_${currentAudience}`;
      const audienceStatus = stateData.audience_status?.[promotionKey];
      if (audienceStatus !== 'passed') {
        errors.push({
          check: 'audience_promotion',
          message: `Audience promotion ${prevAudience}→${currentAudience} required before ${phase}`,
          action: `Promote from ${prevAudience} to ${currentAudience} audience first.`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format precondition errors for display.
 *
 * @param {Array<{check: string, message: string, action: string}>} errors
 * @returns {string}
 */
function formatPreconditionErrors(errors) {
  if (errors.length === 0) return '✓ All preconditions met.';

  const lines = [];
  for (const err of errors) {
    lines.push(`✗ ${err.message}`);
    lines.push(`  Action: ${err.action}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PHASE_ORDER,
  PHASE_AUDIENCE_MAP,
  PHASE_PREREQUISITES,
  PreconditionError,
  getPreviousPhase,
  getPhaseAudience,
  validatePreconditions,
  formatPreconditionErrors,
};
