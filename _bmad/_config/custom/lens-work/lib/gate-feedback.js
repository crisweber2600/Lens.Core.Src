/**
 * Gate Feedback Error Messages — S-028
 *
 * Formats structured, actionable error messages when gates block.
 * Error format: ✗ Cannot start {phase} — {reason}. Action: {resolution}
 *
 * @module lib/gate-feedback
 */

'use strict';

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Format a gate block error for missing PR merge.
 *
 * @param {string} phase - Blocked phase
 * @param {string} prUrl - PR URL
 * @returns {string}
 */
function formatMissingPRMerge(phase, prUrl) {
  return `✗ Cannot start ${phase} — previous phase PR has not been merged. Action: Merge the PR at ${prUrl || '(no URL available)'}`;
}

/**
 * Format a gate block error for missing artifact.
 *
 * @param {string} phase - Blocked phase
 * @param {string} artifact - Missing artifact name
 * @param {string} expectedPath - Expected artifact path
 * @returns {string}
 */
function formatMissingArtifact(phase, artifact, expectedPath) {
  return `✗ Cannot start ${phase} — required artifact '${artifact}' is missing. Action: Create it at ${expectedPath}`;
}

/**
 * Format a gate block error for constitution violation.
 *
 * @param {string} phase - Blocked phase
 * @param {string} rule - The violated rule
 * @param {string[]} permitted - Permitted values
 * @returns {string}
 */
function formatConstitutionViolation(phase, rule, permitted) {
  return `✗ Cannot start ${phase} — ${rule}. Action: Permitted values: [${permitted.join(', ')}]`;
}

/**
 * Format a gate block error for state drift.
 *
 * @param {string} phase - Blocked phase
 * @param {Array<{field: string, stateValue: any, configValue: any}>} divergences
 * @returns {string}
 */
function formatStateDrift(phase, divergences) {
  const fields = divergences.map((d) => `${d.field}: state=${d.stateValue}, config=${d.configValue}`).join('; ');
  return `✗ Cannot start ${phase} — state drift detected (${fields}). Action: Run /sync to reconcile`;
}

/**
 * Format a gate block error for audience promotion required.
 *
 * @param {string} phase - Blocked phase
 * @param {string} fromAudience
 * @param {string} toAudience
 * @returns {string}
 */
function formatPromotionRequired(phase, fromAudience, toAudience) {
  return `✗ Cannot start ${phase} — audience promotion ${fromAudience}→${toAudience} required. Action: Promote artifacts first`;
}

/**
 * Format precondition errors into structured feedback.
 *
 * @param {string} phase
 * @param {Array<{check: string, message: string, action: string}>} errors
 * @returns {string}
 */
function formatPreconditionFeedback(phase, errors) {
  if (!errors || errors.length === 0) {
    return `✓ All preconditions met for ${phase}.`;
  }

  const lines = [];
  for (const err of errors) {
    lines.push(`✗ Cannot start ${phase} — ${err.message}. Action: ${err.action}`);
  }
  return lines.join('\n');
}

/**
 * Format a gate check result into feedback messages.
 *
 * @param {string} phase
 * @param {object} gateResult - From gates.runGateCheck()
 * @returns {string}
 */
function formatGateCheckFeedback(phase, gateResult) {
  if (gateResult.passed) {
    return `✓ All gates passed for ${phase}.`;
  }

  const lines = [];
  for (const result of gateResult.results) {
    if (result.result === 'block') {
      const action = getActionForCheck(result.check, result.details);
      lines.push(`✗ Cannot start ${phase} — ${result.reason}. Action: ${action}`);
    }
  }
  return lines.join('\n');
}

/**
 * Get the action suggestion for a specific check type.
 *
 * @param {string} check
 * @param {object} details
 * @returns {string}
 */
function getActionForCheck(check, details) {
  switch (check) {
    case 'track':
      return 'Check constitution rules or change the initiative track';
    case 'artifacts':
      if (details?.missing?.length) {
        return `Create missing artifacts: ${details.missing.join(', ')}`;
      }
      return 'Ensure all required artifacts exist';
    case 'reviewers':
      if (details?.missing?.length) {
        return `Add reviewers: ${details.missing.join(', ')}`;
      }
      return 'Add required reviewers to the PR';
    default:
      return 'Review gate requirements and resolve';
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  formatMissingPRMerge,
  formatMissingArtifact,
  formatConstitutionViolation,
  formatStateDrift,
  formatPromotionRequired,
  formatPreconditionFeedback,
  formatGateCheckFeedback,
  getActionForCheck,
};
