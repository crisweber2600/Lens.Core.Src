/**
 * Gate Decision Recording — S-023
 *
 * Records gate check events (pass or block) in the event log
 * with full details of what passed/failed. Integrates with
 * the event log module (S-006).
 *
 * @module lib/gate-recorder
 */

'use strict';

const eventlog = require('./eventlog');

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Record a gate check result in the event log.
 *
 * @param {string} projectRoot
 * @param {object} params
 * @param {string} params.initiativeId
 * @param {string} params.gateType - 'phase_transition' | 'audience_promotion'
 * @param {string} params.phase - Phase or promotion being gated
 * @param {boolean} params.passed
 * @param {Array<{check: string, result: string, reason: string|null, details: object}>} params.results
 * @param {object} [options]
 * @param {string} [options.logPath]
 * @returns {{ success: boolean }}
 */
function recordGateDecision(projectRoot, params, options = {}) {
  const eventType = params.passed ? 'gate_opened' : 'gate_blocked';

  const violations = params.results
    .filter((r) => r.result === 'block')
    .map((r) => ({
      check: r.check,
      reason: r.reason,
      details: r.details,
    }));

  const passes = params.results
    .filter((r) => r.result === 'pass')
    .map((r) => r.check);

  return eventlog.appendEvent(projectRoot, {
    event: eventType,
    initiative: params.initiativeId,
    gate_type: params.gateType,
    phase: params.phase,
    result: params.passed ? 'pass' : 'block',
    checks_passed: passes,
    violations: violations.length > 0 ? violations : undefined,
    total_checks: params.results.length,
  }, options);
}

/**
 * Record a precondition check result.
 *
 * @param {string} projectRoot
 * @param {object} params
 * @param {string} params.initiativeId
 * @param {string} params.phase
 * @param {boolean} params.valid
 * @param {Array<{check: string, message: string, action: string}>} params.errors
 * @param {object} [options]
 * @returns {{ success: boolean }}
 */
function recordPreconditionCheck(projectRoot, params, options = {}) {
  const eventType = params.valid ? 'gate_opened' : 'gate_blocked';

  return eventlog.appendEvent(projectRoot, {
    event: eventType,
    initiative: params.initiativeId,
    gate_type: 'precondition',
    phase: params.phase,
    result: params.valid ? 'pass' : 'block',
    precondition_errors: params.valid ? undefined : params.errors,
  }, options);
}

/**
 * Get gate history for an initiative from the event log.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {object} [options]
 * @returns {{ events: object[], lastResult: object|null }}
 */
function getGateHistory(projectRoot, initiativeId, options = {}) {
  const opened = eventlog.filterEvents(projectRoot, initiativeId, {
    ...options, eventType: 'gate_opened',
  });
  const blocked = eventlog.filterEvents(projectRoot, initiativeId, {
    ...options, eventType: 'gate_blocked',
  });

  const all = [...opened.events, ...blocked.events]
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));

  return {
    events: all,
    lastResult: all.length > 0 ? all[all.length - 1] : null,
  };
}

/**
 * Format a gate decision for display.
 *
 * @param {object} decision - Recorded gate event
 * @returns {string}
 */
function formatGateDecision(decision) {
  if (!decision) return 'No gate decisions recorded.';

  const icon = decision.result === 'pass' ? '✓' : '✗';
  const lines = [`${icon} Gate ${decision.result}: ${decision.gate_type} for ${decision.phase}`];

  if (decision.checks_passed) {
    lines.push(`  Passed: ${decision.checks_passed.join(', ')}`);
  }

  if (decision.violations) {
    for (const v of decision.violations) {
      lines.push(`  ✗ ${v.check}: ${v.reason}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  recordGateDecision,
  recordPreconditionCheck,
  getGateHistory,
  formatGateDecision,
};
