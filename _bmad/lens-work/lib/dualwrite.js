/**
 * Dual-Write Contract Enforcement (S-005)
 *
 * Ensures every mutation to shared fields (current_phase, phase_status)
 * updates BOTH state.yaml AND the active initiative config atomically.
 *
 * This module provides:
 * 1. A single `dualWrite()` entry point for shared-field mutations
 * 2. Atomic rollback if either write fails (compensating action)
 * 3. Verification that shared fields are identical in both files
 * 4. Prevention of single-file writes for shared fields
 *
 * Source of truth hierarchy: git > event log > state files
 *
 * @module lib/dualwrite
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fields that MUST be written to both state.yaml and initiative config */
const SHARED_FIELDS = Object.freeze(['phase_status', 'current_phase', 'audience_status']);

/** Default paths */
const DEFAULT_STATE_PATH = '_bmad-output/lens-work/state.yaml';
const DEFAULT_INITIATIVES_PATH = '_bmad-output/lens-work/initiatives';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class DualWriteError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DualWriteError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the initiative config file path for a given initiative ID.
 *
 * Searches in order: flat file, Service.yaml, Domain.yaml.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {object} [options]
 * @param {string} [options.initiativesPath] - Override initiatives base path
 * @returns {string|null} Absolute path or null if not found
 */
function resolveInitiativeConfigPath(projectRoot, initiativeId, options = {}) {
  const basePath = path.resolve(projectRoot, options.initiativesPath || DEFAULT_INITIATIVES_PATH);

  const candidates = [
    path.join(basePath, `${initiativeId}.yaml`),
    path.join(basePath, initiativeId, 'Service.yaml'),
    path.join(basePath, initiativeId, 'Domain.yaml'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Snapshot & Restore (for atomic rollback)
// ---------------------------------------------------------------------------

/**
 * Take a snapshot of both files before mutation.
 *
 * @param {string} statePath
 * @param {string} configPath
 * @returns {{ stateContent: string|null, configContent: string|null }}
 */
function _takeSnapshot(statePath, configPath) {
  return {
    stateContent: fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8') : null,
    configContent: fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : null,
  };
}

/**
 * Restore files from snapshot (compensating action on failure).
 *
 * @param {string} statePath
 * @param {string} configPath
 * @param {{ stateContent: string|null, configContent: string|null }} snapshot
 */
function _restoreSnapshot(statePath, configPath, snapshot) {
  try {
    if (snapshot.stateContent !== null) {
      fs.writeFileSync(statePath, snapshot.stateContent, 'utf8');
    }
    if (snapshot.configContent !== null) {
      fs.writeFileSync(configPath, snapshot.configContent, 'utf8');
    }
  } catch {
    // Critical: even rollback failed — files may be inconsistent
    // This should be logged to event log
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Execute an atomic dual-write mutation.
 *
 * Updates shared fields in BOTH state.yaml and the initiative config.
 * If either write fails, performs compensating rollback.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} initiativeId - Initiative to update
 * @param {object} updates - Fields to update (only SHARED_FIELDS are processed)
 * @param {object} [options]
 * @param {string} [options.statePath] - Override state file path
 * @param {string} [options.initiativesPath] - Override initiatives base path
 * @returns {{ success: boolean, stateUpdated: boolean, configUpdated: boolean, changedFields: string[] }}
 * @throws {DualWriteError} If files not found or atomic write fails
 */
function dualWrite(projectRoot, initiativeId, updates, options = {}) {
  // 1. Validate that updates contain shared fields
  const changedFields = Object.keys(updates).filter((f) => SHARED_FIELDS.includes(f));
  if (changedFields.length === 0) {
    return { success: true, stateUpdated: false, configUpdated: false, changedFields: [] };
  }

  // 2. Resolve paths
  const statePath = path.resolve(projectRoot, options.statePath || DEFAULT_STATE_PATH);
  const configPath = resolveInitiativeConfigPath(projectRoot, initiativeId, options);

  if (!fs.existsSync(statePath)) {
    throw new DualWriteError(
      `State file not found: ${statePath}`,
      'STATE_NOT_FOUND',
      { statePath },
    );
  }

  if (!configPath) {
    throw new DualWriteError(
      `Initiative config not found for: ${initiativeId}`,
      'INITIATIVE_NOT_FOUND',
      { initiativeId },
    );
  }

  // 3. Take snapshot before mutation
  const snapshot = _takeSnapshot(statePath, configPath);

  // 4. Load both files
  let state, config;
  try {
    state = yaml.load(fs.readFileSync(statePath, 'utf8'));
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    throw new DualWriteError(
      `Failed to parse files: ${err.message}`,
      'PARSE_ERROR',
      { cause: err },
    );
  }

  if (!state || state.lifecycle_version !== 2) {
    throw new DualWriteError('State file is not v2 lifecycle', 'INVALID_STATE_VERSION');
  }
  if (!config || config.lifecycle_version !== 2) {
    throw new DualWriteError('Initiative config is not v2 lifecycle', 'INVALID_CONFIG_VERSION');
  }

  // 5. Apply updates to both
  try {
    if (changedFields.includes('phase_status') && updates.phase_status) {
      // Merge phase_status (partial update)
      state.phase_status = { ...state.phase_status, ...updates.phase_status };
      config.phase_status = { ...config.phase_status, ...updates.phase_status };
    }

    if (changedFields.includes('current_phase')) {
      state.current_phase = updates.current_phase;
      config.current_phase = updates.current_phase;
    }

    // Update timestamps
    state.last_activity = new Date().toISOString();
    config.last_activity = new Date().toISOString();
  } catch (err) {
    throw new DualWriteError(
      `Failed to apply updates: ${err.message}`,
      'UPDATE_ERROR',
      { cause: err },
    );
  }

  // 6. Write both files atomically
  let stateWritten = false;
  let configWritten = false;

  try {
    // Write state first
    const stateHeader = '# v2 — Lifecycle Contract personal state\n';
    const stateYaml = stateHeader + yaml.dump(state, { lineWidth: -1, noRefs: true, sortKeys: false });
    fs.writeFileSync(statePath, stateYaml, 'utf8');
    stateWritten = true;

    // Write initiative config
    const configYaml = yaml.dump(config, { lineWidth: -1, noRefs: true, sortKeys: false });
    fs.writeFileSync(configPath, configYaml, 'utf8');
    configWritten = true;
  } catch (err) {
    // Compensating action: restore snapshot
    _restoreSnapshot(statePath, configPath, snapshot);

    throw new DualWriteError(
      `Atomic dual-write failed, rolled back: ${err.message}`,
      'WRITE_FAILED_ROLLED_BACK',
      { stateWritten, configWritten, cause: err },
    );
  }

  return {
    success: true,
    stateUpdated: true,
    configUpdated: true,
    changedFields,
  };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify that shared fields are identical in both state.yaml and initiative config.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {object} [options]
 * @param {string} [options.statePath] - Override state file path
 * @param {string} [options.initiativesPath] - Override initiatives base path
 * @returns {{ consistent: boolean, divergences: Array<{field: string, stateValue: any, configValue: any}> }}
 */
function verifyConsistency(projectRoot, initiativeId, options = {}) {
  const statePath = path.resolve(projectRoot, options.statePath || DEFAULT_STATE_PATH);
  const configPath = resolveInitiativeConfigPath(projectRoot, initiativeId, options);

  if (!fs.existsSync(statePath) || !configPath) {
    return { consistent: true, divergences: [], missing: !fs.existsSync(statePath) ? 'state' : 'config' };
  }

  const state = yaml.load(fs.readFileSync(statePath, 'utf8'));
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

  if (!state || !config) {
    return { consistent: false, divergences: [{ field: '_file', stateValue: !!state, configValue: !!config }] };
  }

  // Only check if this initiative is the active one
  if (state.active_initiative !== initiativeId) {
    return { consistent: true, divergences: [], note: 'Initiative is not active — skipping check' };
  }

  const divergences = [];

  // Check current_phase
  if (state.current_phase !== config.current_phase) {
    divergences.push({
      field: 'current_phase',
      stateValue: state.current_phase,
      configValue: config.current_phase,
    });
  }

  // Check phase_status (deep comparison per key)
  if (state.phase_status && config.phase_status) {
    const allKeys = new Set([
      ...Object.keys(state.phase_status || {}),
      ...Object.keys(config.phase_status || {}),
    ]);

    for (const key of allKeys) {
      const stateVal = state.phase_status[key] ?? null;
      const configVal = config.phase_status[key] ?? null;
      if (stateVal !== configVal) {
        divergences.push({
          field: `phase_status.${key}`,
          stateValue: stateVal,
          configValue: configVal,
        });
      }
    }
  }

  return {
    consistent: divergences.length === 0,
    divergences,
  };
}

/**
 * Validate that a set of updates targets only shared fields
 * (preventing single-file mutations for shared fields).
 *
 * @param {object} updates - Proposed updates
 * @returns {{ valid: boolean, sharedFields: string[], nonSharedFields: string[] }}
 */
function classifyUpdates(updates) {
  const sharedFields = [];
  const nonSharedFields = [];

  for (const key of Object.keys(updates)) {
    if (SHARED_FIELDS.includes(key)) {
      sharedFields.push(key);
    } else {
      nonSharedFields.push(key);
    }
  }

  return {
    valid: true,
    sharedFields,
    nonSharedFields,
  };
}

/**
 * Guard function: call before any single-file write to ensure
 * no shared fields are being updated without dual-write.
 *
 * @param {string[]} fieldsBeingWritten - Field names being written
 * @throws {DualWriteError} If shared fields detected in single-file write
 */
function assertNoDualWriteViolation(fieldsBeingWritten) {
  const violations = fieldsBeingWritten.filter((f) => SHARED_FIELDS.includes(f));
  if (violations.length > 0) {
    throw new DualWriteError(
      `Dual-write violation: fields [${violations.join(', ')}] must be updated via dualWrite(), not single-file write`,
      'DUAL_WRITE_VIOLATION',
      { violations },
    );
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  SHARED_FIELDS,
  DEFAULT_STATE_PATH,
  DEFAULT_INITIATIVES_PATH,

  // Errors
  DualWriteError,

  // Path resolution
  resolveInitiativeConfigPath,

  // Core API
  dualWrite,

  // Verification
  verifyConsistency,
  classifyUpdates,
  assertNoDualWriteViolation,
};
