/**
 * Checklist Schema & Gate Logic — S-021
 *
 * Implements progressive gate readiness checklists that track
 * artifact existence, review status, and constitution compliance.
 *
 * @module lib/checklist
 */

'use strict';

const artifacts = require('./artifacts');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Checklist item statuses */
const ITEM_STATUS = Object.freeze({
  PENDING: 'pending',
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class ChecklistError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ChecklistError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Checklist Generation
// ---------------------------------------------------------------------------

/**
 * Generate a checklist from the resolved constitution's required_artifacts.
 *
 * @param {string} phase - Current phase
 * @param {object} resolved - Resolved constitution governance
 * @param {object} [options]
 * @returns {{ items: Array<{id: string, description: string, required: boolean, status: string, type: string, detected_at: string|null}> }}
 */
function generateChecklist(phase, resolved, options = {}) {
  const items = [];

  if (!resolved) {
    return { items };
  }

  // Generate from required_gates
  if (resolved.required_gates && resolved.required_gates.length > 0) {
    for (const gate of resolved.required_gates) {
      if (typeof gate === 'object' && gate.phase === phase) {
        // Structured gate entry
        if (gate.required_artifacts) {
          for (const art of gate.required_artifacts) {
            items.push({
              id: `artifact-${art}`,
              description: `Artifact '${art}' must exist`,
              required: true,
              status: ITEM_STATUS.PENDING,
              type: 'artifact',
              detected_at: null,
            });
          }
        }
        if (gate.checks) {
          for (const check of gate.checks) {
            items.push({
              id: `check-${check}`,
              description: `Gate check: ${check}`,
              required: true,
              status: ITEM_STATUS.PENDING,
              type: 'check',
              detected_at: null,
            });
          }
        }
      } else if (typeof gate === 'string') {
        items.push({
          id: `gate-${gate}`,
          description: `Gate: ${gate}`,
          required: true,
          status: ITEM_STATUS.PENDING,
          type: 'gate',
          detected_at: null,
        });
      }
    }
  }

  // Add track permission check
  if (resolved.permitted_tracks !== null) {
    items.push({
      id: 'track-permitted',
      description: 'Track is permitted by constitution',
      required: true,
      status: ITEM_STATUS.PENDING,
      type: 'track',
      detected_at: null,
    });
  }

  // Add reviewer checks for promotions
  if (resolved.additional_review_participants) {
    for (const [promotion, reviewers] of Object.entries(resolved.additional_review_participants)) {
      if (reviewers.length > 0) {
        items.push({
          id: `reviewers-${promotion}`,
          description: `Required reviewers for ${promotion}: ${reviewers.join(', ')}`,
          required: true,
          status: ITEM_STATUS.PENDING,
          type: 'reviewers',
          detected_at: null,
        });
      }
    }
  }

  return { items };
}

// ---------------------------------------------------------------------------
// Checklist Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a checklist against actual state.
 *
 * @param {object} checklist - Checklist with items array
 * @param {object} context
 * @param {string} context.projectRoot
 * @param {object} context.initConfig
 * @param {string} context.track
 * @param {object} context.resolved - Resolved constitution
 * @param {string[]} [context.prReviewers]
 * @returns {{ items: object[], readiness: number, passed: boolean }}
 */
function evaluateChecklist(checklist, context) {
  const now = new Date().toISOString();
  const evaluatedItems = checklist.items.map((item) => {
    const evaluated = { ...item };

    switch (item.type) {
      case 'artifact': {
        const artifactName = item.id.replace('artifact-', '');
        const exists = artifacts.artifactExists(
          context.projectRoot, context.initConfig, artifactName,
        );
        evaluated.status = exists ? ITEM_STATUS.PASSED : ITEM_STATUS.FAILED;
        if (exists) evaluated.detected_at = now;
        break;
      }
      case 'track': {
        const permitted = context.resolved?.permitted_tracks === null ||
          (context.resolved?.permitted_tracks || []).includes(context.track);
        evaluated.status = permitted ? ITEM_STATUS.PASSED : ITEM_STATUS.FAILED;
        if (permitted) evaluated.detected_at = now;
        break;
      }
      case 'reviewers': {
        if (context.prReviewers) {
          const promotion = item.id.replace('reviewers-', '');
          const required = context.resolved?.additional_review_participants?.[promotion] || [];
          const reviewerSet = new Set(context.prReviewers.map((r) => r.toLowerCase()));
          const allPresent = required.every((r) => reviewerSet.has(r.toLowerCase()));
          evaluated.status = allPresent ? ITEM_STATUS.PASSED : ITEM_STATUS.FAILED;
          if (allPresent) evaluated.detected_at = now;
        }
        break;
      }
      default:
        // Unknown type — leave as pending
        break;
    }

    return evaluated;
  });

  const requiredItems = evaluatedItems.filter((i) => i.required);
  const passedRequired = requiredItems.filter((i) => i.status === ITEM_STATUS.PASSED);
  const readiness = requiredItems.length > 0
    ? Math.round((passedRequired.length / requiredItems.length) * 100)
    : 100;

  const passed = requiredItems.every((i) => i.status === ITEM_STATUS.PASSED);

  return { items: evaluatedItems, readiness, passed };
}

/**
 * Check gate readiness — returns true if all required items pass.
 *
 * @param {object} checklist - Evaluated checklist
 * @returns {{ ready: boolean, readiness: number, blocking: object[] }}
 */
function checkGateReady(checklist) {
  const requiredItems = checklist.items.filter((i) => i.required);
  const blocking = requiredItems.filter((i) => i.status !== ITEM_STATUS.PASSED);
  const readiness = requiredItems.length > 0
    ? Math.round(((requiredItems.length - blocking.length) / requiredItems.length) * 100)
    : 100;

  return {
    ready: blocking.length === 0,
    readiness,
    blocking,
  };
}

/**
 * Format a checklist for display.
 *
 * @param {object} checklist
 * @returns {string}
 */
function formatChecklist(checklist) {
  const lines = [];

  for (const item of checklist.items) {
    const icon = item.status === ITEM_STATUS.PASSED ? '✓'
      : item.status === ITEM_STATUS.FAILED ? '✗'
      : '○';
    const req = item.required ? '' : ' (optional)';
    lines.push(`  ${icon} ${item.description}${req}`);
  }

  const { readiness, blocking } = checkGateReady(checklist);
  lines.push('');
  lines.push(`Gate readiness: ${readiness}%`);
  if (blocking.length > 0) {
    lines.push(`Blocking items: ${blocking.length}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  ITEM_STATUS,
  ChecklistError,
  generateChecklist,
  evaluateChecklist,
  checkGateReady,
  formatChecklist,
};
