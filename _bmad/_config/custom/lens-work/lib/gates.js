/**
 * Gate Validation — S-015
 *
 * Validates gate conditions at phase transitions and audience promotions:
 * - Track validation against permitted_tracks
 * - Artifact validation against required_artifacts
 * - Reviewer validation against required_reviewers
 *
 * Default: no constitution at any level → all gates pass.
 *
 * @module lib/gates
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const artifacts = require('./artifacts');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Gate result types */
const GATE_RESULT = Object.freeze({
  PASS: 'pass',
  BLOCK: 'block',
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class GateError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GateError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Core Validators
// ---------------------------------------------------------------------------

/**
 * Validate that the initiative's track is permitted by the constitution.
 *
 * @param {string} track - Initiative's track
 * @param {object} resolved - Resolved constitution governance
 * @returns {{ result: string, reason: string|null }}
 */
function validateTrack(track, resolved) {
  // No constitution or no track restrictions → pass
  if (!resolved || resolved.permitted_tracks === null || !resolved.permitted_tracks) {
    return { result: GATE_RESULT.PASS, reason: null };
  }

  if (resolved.permitted_tracks.includes(track)) {
    return { result: GATE_RESULT.PASS, reason: null };
  }

  return {
    result: GATE_RESULT.BLOCK,
    reason: `Track '${track}' is not permitted. Allowed: ${resolved.permitted_tracks.join(', ')}`,
  };
}

/**
 * Validate that required artifacts exist for a phase.
 *
 * @param {string} projectRoot
 * @param {object} initConfig - Initiative config
 * @param {string} phase - Current phase
 * @param {object} resolved - Resolved constitution governance
 * @returns {{ result: string, missing: string[], checked: string[] }}
 */
function validateArtifacts(projectRoot, initConfig, phase, resolved) {
  // No constitution → no required artifacts → pass
  if (!resolved || !resolved.required_gates) {
    return { result: GATE_RESULT.PASS, missing: [], checked: [] };
  }

  // Find required artifacts for this phase from gates
  const requiredArtifacts = [];
  for (const gate of resolved.required_gates) {
    if (typeof gate === 'object' && gate.phase === phase && gate.required_artifacts) {
      requiredArtifacts.push(...gate.required_artifacts);
    } else if (typeof gate === 'string') {
      // Simple gate name — parse as artifact
      // Convention: gate names like "prd-exists" map to artifact "prd"
      const artifactName = gate.replace(/-exists$/, '');
      if (artifacts.KNOWN_ARTIFACTS.includes(artifactName)) {
        requiredArtifacts.push(artifactName);
      }
    }
  }

  if (requiredArtifacts.length === 0) {
    return { result: GATE_RESULT.PASS, missing: [], checked: [] };
  }

  const missing = [];
  const checked = [];

  for (const artifact of requiredArtifacts) {
    checked.push(artifact);
    if (!artifacts.artifactExists(projectRoot, initConfig, artifact)) {
      missing.push(artifact);
    }
  }

  return {
    result: missing.length === 0 ? GATE_RESULT.PASS : GATE_RESULT.BLOCK,
    missing,
    checked,
  };
}

/**
 * Validate that required reviewers are included in a PR.
 *
 * @param {string[]} prReviewers - List of reviewer usernames on the PR
 * @param {string} promotion - Promotion type (e.g. 'small_to_medium')
 * @param {object} resolved - Resolved constitution governance
 * @returns {{ result: string, missing: string[], required: string[] }}
 */
function validateReviewers(prReviewers, promotion, resolved) {
  // No constitution or no reviewer requirements → pass
  if (!resolved || !resolved.additional_review_participants) {
    return { result: GATE_RESULT.PASS, missing: [], required: [] };
  }

  const required = resolved.additional_review_participants[promotion] || [];
  if (required.length === 0) {
    return { result: GATE_RESULT.PASS, missing: [], required: [] };
  }

  const reviewerSet = new Set((prReviewers || []).map((r) => r.toLowerCase()));
  const missing = required.filter((r) => !reviewerSet.has(r.toLowerCase()));

  return {
    result: missing.length === 0 ? GATE_RESULT.PASS : GATE_RESULT.BLOCK,
    missing,
    required,
  };
}

// ---------------------------------------------------------------------------
// Composite Gate Check
// ---------------------------------------------------------------------------

/**
 * Run all gate validations for a phase transition.
 *
 * @param {object} params
 * @param {string} params.projectRoot
 * @param {object} params.initConfig - Initiative config
 * @param {string} params.phase - Phase being gated
 * @param {string} params.track - Initiative track
 * @param {object} params.resolved - Resolved constitution governance
 * @param {string[]} [params.prReviewers] - PR reviewers (for promotion gates)
 * @param {string} [params.promotion] - Promotion type (for reviewer check)
 * @returns {{ passed: boolean, results: Array<{check: string, result: string, reason: string|null, details: object}> }}
 */
function runGateCheck(params) {
  const results = [];

  // 1. Track validation
  const trackResult = validateTrack(params.track, params.resolved);
  results.push({
    check: 'track',
    result: trackResult.result,
    reason: trackResult.reason,
    details: {},
  });

  // 2. Artifact validation
  const artifactResult = validateArtifacts(
    params.projectRoot, params.initConfig, params.phase, params.resolved,
  );
  results.push({
    check: 'artifacts',
    result: artifactResult.result,
    reason: artifactResult.missing.length > 0
      ? `Missing artifacts: ${artifactResult.missing.join(', ')}`
      : null,
    details: { missing: artifactResult.missing, checked: artifactResult.checked },
  });

  // 3. Reviewer validation (if applicable)
  if (params.promotion) {
    const reviewerResult = validateReviewers(
      params.prReviewers || [], params.promotion, params.resolved,
    );
    results.push({
      check: 'reviewers',
      result: reviewerResult.result,
      reason: reviewerResult.missing.length > 0
        ? `Missing required reviewers: ${reviewerResult.missing.join(', ')}`
        : null,
      details: { missing: reviewerResult.missing, required: reviewerResult.required },
    });
  }

  const passed = results.every((r) => r.result === GATE_RESULT.PASS);

  return { passed, results };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  GATE_RESULT,
  GateError,
  validateTrack,
  validateArtifacts,
  validateReviewers,
  runGateCheck,
};
