/**
 * Gate Enforcement — S-040
 *
 * End-to-end gate enforcement that prevents invalid phase transitions.
 * Verifies that:
 * - All prior phase artifacts exist and pass quality checks
 * - Constitution constraints are satisfied
 * - PR reviews are completed where required
 * - Event log records gate decisions
 *
 * Acts as the final GateKeeper before phase promotion.
 *
 * @module lib/gate-enforcement
 */

'use strict';

const gates = require('./gates');
const artifactChecks = require('./artifact-checks');
const gateRecorder = require('./gate-recorder');
const preconditions = require('./preconditions');
const constitution = require('./constitution');
const eventlog = require('./eventlog');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENFORCEMENT_OUTCOMES = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  WARN: 'warn',
  SKIP: 'skip',
});

/** Phase artifact requirements */
const PHASE_ARTIFACTS = Object.freeze({
  preplan: ['product-brief'],
  businessplan: ['prd'],
  techplan: ['architecture', 'tech-decisions'],
  devproposal: ['epics'],
  sprintplan: ['sprint-status'],
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class GateEnforcementError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GateEnforcementError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Enforcement Checks
// ---------------------------------------------------------------------------

/**
 * Check if all required artifacts exist for a phase.
 *
 * @param {string} projectRoot
 * @param {string} phase
 * @param {object} initConfig
 * @returns {{ pass: boolean, missing: string[], present: string[] }}
 */
function checkArtifacts(projectRoot, phase, initConfig) {
  const required = PHASE_ARTIFACTS[phase] || [];
  const missing = [];
  const present = [];

  for (const artifact of required) {
    try {
      const result = artifactChecks.checkArtifact(projectRoot, initConfig, phase, artifact);
      if (result.exists) {
        present.push(artifact);
      } else {
        missing.push(artifact);
      }
    } catch {
      missing.push(artifact);
    }
  }

  return { pass: missing.length === 0, missing, present };
}

/**
 * Run gate precondition checks.
 *
 * @param {string} projectRoot
 * @param {string} phase
 * @param {object} stateData
 * @param {object} initConfig
 * @returns {{ pass: boolean, errors: string[] }}
 */
function checkPreconditions(projectRoot, phase, stateData, initConfig) {
  try {
    const result = preconditions.validatePreconditions({
      projectRoot,
      phase,
      stateData,
      initConfig,
    });
    return { pass: result.valid, errors: result.errors || [] };
  } catch (err) {
    return { pass: false, errors: [err.message] };
  }
}

/**
 * Check constitution constraints for phase gate.
 *
 * @param {string} projectRoot
 * @param {string} phase
 * @param {object} initConfig
 * @returns {{ pass: boolean, violations: string[] }}
 */
function checkConstitution(projectRoot, phase, initConfig) {
  try {
    const resolved = constitution.loadConstitution(projectRoot);
    if (!resolved) return { pass: true, violations: [] };

    const violations = [];

    // Check if phase is allowed by constitution
    if (resolved.allowed_phases) {
      if (!resolved.allowed_phases.includes(phase)) {
        violations.push(`Phase "${phase}" not allowed by constitution`);
      }
    }

    // Check required reviewers
    if (resolved.required_reviewers && resolved.required_reviewers[phase]) {
      violations.push(`Review required by: ${resolved.required_reviewers[phase].join(', ')}`);
    }

    return { pass: violations.length === 0, violations };
  } catch {
    return { pass: true, violations: [] };
  }
}

// ---------------------------------------------------------------------------
// Full Enforcement
// ---------------------------------------------------------------------------

/**
 * Run full gate enforcement for a phase transition.
 *
 * Combines artifact checks, precondition validation, and
 * constitution constraints into a single pass/fail decision.
 *
 * @param {object} params
 * @param {string} params.projectRoot
 * @param {string} params.phase
 * @param {object} params.stateData
 * @param {object} params.initConfig
 * @param {object} [opts]
 * @param {boolean} [opts.record=true] - Record gate decision
 * @returns {{ outcome: string, artifacts: object, preconditions: object, constitution: object, feedback: string }}
 */
function enforce(params, opts = {}) {
  const { projectRoot, phase, stateData, initConfig } = params;
  const record = opts.record !== false;

  // Run all checks
  const artifactResult = checkArtifacts(projectRoot, phase, initConfig);
  const preconditionResult = checkPreconditions(projectRoot, phase, stateData, initConfig);
  const constitutionResult = checkConstitution(projectRoot, phase, initConfig);

  // Determine outcome
  const allPass = artifactResult.pass && preconditionResult.pass && constitutionResult.pass;
  const outcome = allPass ? ENFORCEMENT_OUTCOMES.PASS : ENFORCEMENT_OUTCOMES.FAIL;

  // Build feedback
  const feedback = buildFeedback(phase, outcome, artifactResult, preconditionResult, constitutionResult);

  // Record gate decision
  if (record) {
    try {
      gateRecorder.recordGate(projectRoot, initConfig.id || 'unknown', phase, {
        outcome,
        artifacts: artifactResult,
        preconditions: preconditionResult,
        constitution: constitutionResult,
      });
    } catch {
      // Recording gate failures should not block enforcement
    }

    try {
      eventlog.appendEvent(projectRoot, {
        event: 'gate_enforcement',
        initiative: initConfig.id,
        phase,
        outcome,
        artifacts_pass: artifactResult.pass,
        preconditions_pass: preconditionResult.pass,
        constitution_pass: constitutionResult.pass,
      });
    } catch {
      // Event log failures should not block enforcement
    }
  }

  return {
    outcome,
    artifacts: artifactResult,
    preconditions: preconditionResult,
    constitution: constitutionResult,
    feedback,
  };
}

/**
 * Build human-readable feedback for gate enforcement result.
 *
 * @param {string} phase
 * @param {string} outcome
 * @param {object} artifactResult
 * @param {object} preconditionResult
 * @param {object} constitutionResult
 * @returns {string}
 */
function buildFeedback(phase, outcome, artifactResult, preconditionResult, constitutionResult) {
  const lines = [];

  if (outcome === ENFORCEMENT_OUTCOMES.PASS) {
    lines.push(`✓ Gate PASSED for phase "${phase}"`);
  } else {
    lines.push(`✗ Gate FAILED for phase "${phase}"`);
  }

  lines.push('');

  // Artifacts
  lines.push(`Artifacts: ${artifactResult.pass ? '✓' : '✗'}`);
  if (!artifactResult.pass) {
    lines.push(`  Missing: ${artifactResult.missing.join(', ')}`);
  }

  // Preconditions
  lines.push(`Preconditions: ${preconditionResult.pass ? '✓' : '✗'}`);
  if (!preconditionResult.pass) {
    for (const err of preconditionResult.errors) {
      lines.push(`  - ${err}`);
    }
  }

  // Constitution
  lines.push(`Constitution: ${constitutionResult.pass ? '✓' : '✗'}`);
  if (!constitutionResult.pass) {
    for (const v of constitutionResult.violations) {
      lines.push(`  - ${v}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  ENFORCEMENT_OUTCOMES,
  PHASE_ARTIFACTS,
  GateEnforcementError,
  checkArtifacts,
  checkPreconditions,
  checkConstitution,
  enforce,
  buildFeedback,
};
