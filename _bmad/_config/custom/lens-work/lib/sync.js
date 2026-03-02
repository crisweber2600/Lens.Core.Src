/**
 * Sync — S-035
 *
 * Detects and resolves synchronization drift between:
 * - Dual-write targets (YAML state ↔ event log ↔ initiative config)
 * - Branch and file-system state vs logical state
 *
 * Provides repair operations to reconcile divergent state.
 *
 * @module lib/sync
 */

'use strict';

const state = require('./state');
const initiative = require('./initiative');
const eventlog = require('./eventlog');
const dualwrite = require('./dualwrite');
const divergence = require('./divergence');

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class SyncError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SyncError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Detect all drift between dual-write targets.
 *
 * Compares state.yaml, initiative YAML, and event log for consistency.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @returns {{ drifts: Array<{ source: string, target: string, field: string, sourceValue: *, targetValue: * }>, clean: boolean }}
 */
function detectDrift(projectRoot, initiativeId) {
  const drifts = [];

  // Load sources
  let stateData, initConfig;
  try {
    stateData = state.readState(projectRoot);
  } catch {
    drifts.push({ source: 'state.yaml', target: '-', field: '*', sourceValue: null, targetValue: 'FILE_MISSING' });
    return { drifts, clean: false };
  }

  try {
    initConfig = initiative.readInitiative(projectRoot, initiativeId);
  } catch {
    drifts.push({ source: 'initiative.yaml', target: '-', field: '*', sourceValue: null, targetValue: 'FILE_MISSING' });
    return { drifts, clean: false };
  }

  // Check active_initiative consistency
  if (stateData.active_initiative !== initiativeId) {
    drifts.push({
      source: 'state.yaml',
      target: 'initiative.yaml',
      field: 'active_initiative',
      sourceValue: stateData.active_initiative,
      targetValue: initiativeId,
    });
  }

  // Check phase_status consistency
  const statePhaseStatus = stateData.phase_status || {};
  const initPhaseStatus = initConfig.phase_status || {};
  const allPhases = new Set([...Object.keys(statePhaseStatus), ...Object.keys(initPhaseStatus)]);
  for (const phase of allPhases) {
    if (statePhaseStatus[phase] !== initPhaseStatus[phase]) {
      drifts.push({
        source: 'state.yaml',
        target: 'initiative.yaml',
        field: `phase_status.${phase}`,
        sourceValue: statePhaseStatus[phase] || 'MISSING',
        targetValue: initPhaseStatus[phase] || 'MISSING',
      });
    }
  }

  // Check current_phase consistency
  if (stateData.current_phase !== initConfig.current_phase) {
    drifts.push({
      source: 'state.yaml',
      target: 'initiative.yaml',
      field: 'current_phase',
      sourceValue: stateData.current_phase,
      targetValue: initConfig.current_phase,
    });
  }

  return { drifts, clean: drifts.length === 0 };
}

/**
 * Run full divergence analysis (wrapper around divergence module).
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {object} [opts]
 * @returns {{ analysis: object, drifts: object }}
 */
function fullDivergenceCheck(projectRoot, initiativeId, opts = {}) {
  const drifts = detectDrift(projectRoot, initiativeId);
  let divResult;

  try {
    divResult = divergence.detectDivergence(projectRoot);
  } catch {
    divResult = { divergent: false, sources: {} };
  }

  return {
    analysis: divResult,
    drifts,
  };
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

/**
 * Repair detected drift by dual-writing authoritative values.
 *
 * Uses initiative config as source of truth.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {object} [opts]
 * @param {string} [opts.authority='initiative'] - Which source is authoritative
 * @returns {{ repaired: number, failures: string[] }}
 */
function repairDrift(projectRoot, initiativeId, opts = {}) {
  const authority = opts.authority || 'initiative';
  const detection = detectDrift(projectRoot, initiativeId);
  const failures = [];
  let repaired = 0;

  if (detection.clean) {
    return { repaired: 0, failures: [] };
  }

  if (authority === 'initiative') {
    // Use initiative config as source of truth
    let initConfig;
    try {
      initConfig = initiative.readInitiative(projectRoot, initiativeId);
    } catch (err) {
      return { repaired: 0, failures: [`Cannot load initiative: ${err.message}`] };
    }

    try {
      dualwrite.dualWrite(projectRoot, initiativeId, {
        current_phase: initConfig.current_phase,
        phase_status: initConfig.phase_status || {},
        active_initiative: initiativeId,
      });
      repaired = detection.drifts.length;
    } catch (err) {
      failures.push(`Dual-write repair failed: ${err.message}`);
    }
  } else {
    // Use state.yaml as source of truth
    let stateData;
    try {
      stateData = state.readState(projectRoot);
    } catch (err) {
      return { repaired: 0, failures: [`Cannot load state: ${err.message}`] };
    }

    try {
      dualwrite.dualWrite(projectRoot, initiativeId, {
        current_phase: stateData.current_phase,
        phase_status: stateData.phase_status || {},
      });
      repaired = detection.drifts.length;
    } catch (err) {
      failures.push(`Dual-write repair failed: ${err.message}`);
    }
  }

  // Log repair event
  try {
    eventlog.appendEvent(projectRoot, {
      event: 'sync_repair',
      initiative: initiativeId,
      authority,
      drifts_found: detection.drifts.length,
      repaired,
    });
  } catch {
    // Event log may not be available
  }

  return { repaired, failures };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  SyncError,
  detectDrift,
  fullDivergenceCheck,
  repairDrift,
};
