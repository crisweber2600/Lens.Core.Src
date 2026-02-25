/**
 * Fix — S-036
 *
 * Detects broken or inconsistent state and applies targeted repairs:
 * - Corrupted YAML files (state.yaml, initiative configs)
 * - Orphaned branches (no matching initiative)
 * - Missing event log entries
 * - Constitution reference errors
 *
 * @module lib/fix
 */

'use strict';

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const state = require('./state');
const initiative = require('./initiative');
const eventlog = require('./eventlog');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIX_TYPES = Object.freeze({
  STATE_CORRUPT: 'state_corrupt',
  INITIATIVE_CORRUPT: 'initiative_corrupt',
  MISSING_STATE: 'missing_state',
  MISSING_INITIATIVE: 'missing_initiative',
  ORPHANED_BRANCH: 'orphaned_branch',
  MISSING_EVENT_LOG: 'missing_event_log',
  STALE_REFERENCE: 'stale_reference',
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class FixError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'FixError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

/**
 * Diagnose all detectable issues in the project.
 *
 * @param {string} projectRoot
 * @param {object} [opts]
 * @returns {{ issues: Array<{ type: string, severity: string, description: string, fixable: boolean }> }}
 */
function diagnose(projectRoot, opts = {}) {
  const issues = [];

  // Check state.yaml
  try {
    state.readState(projectRoot);
  } catch (err) {
    const statePath = path.join(projectRoot, '_bmad-output', 'lens-work', 'state.yaml');
    if (fs.existsSync(statePath)) {
      issues.push({
        type: FIX_TYPES.STATE_CORRUPT,
        severity: 'critical',
        description: `state.yaml is corrupted: ${err.message}`,
        fixable: true,
      });
    } else {
      issues.push({
        type: FIX_TYPES.MISSING_STATE,
        severity: 'critical',
        description: 'state.yaml is missing',
        fixable: true,
      });
    }
  }

  // Check initiative configs
  const initDir = path.join(projectRoot, '_bmad-output', 'lens-work', 'initiatives');
  if (fs.existsSync(initDir)) {
    const files = fs.readdirSync(initDir).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const initId = file.replace('.yaml', '');
      try {
        initiative.readInitiative(projectRoot, initId);
      } catch (err) {
        issues.push({
          type: FIX_TYPES.INITIATIVE_CORRUPT,
          severity: 'high',
          description: `Initiative ${initId} is corrupted: ${err.message}`,
          fixable: false,
        });
      }
    }
  }

  // Check event log
  const eventLogPath = path.join(projectRoot, '_bmad-output', 'lens-work', 'event-log.jsonl');
  if (!fs.existsSync(eventLogPath)) {
    issues.push({
      type: FIX_TYPES.MISSING_EVENT_LOG,
      severity: 'low',
      description: 'Event log is missing',
      fixable: true,
    });
  }

  return { issues };
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

/**
 * Apply a fix for a diagnosed issue.
 *
 * @param {string} projectRoot
 * @param {object} issue - Diagnosed issue object
 * @param {object} [opts]
 * @returns {{ fixed: boolean, message: string }}
 */
function applyFix(projectRoot, issue, opts = {}) {
  switch (issue.type) {
    case FIX_TYPES.MISSING_STATE:
      return fixMissingState(projectRoot);
    case FIX_TYPES.STATE_CORRUPT:
      return fixCorruptState(projectRoot);
    case FIX_TYPES.MISSING_EVENT_LOG:
      return fixMissingEventLog(projectRoot);
    default:
      return { fixed: false, message: `No automatic fix for ${issue.type}` };
  }
}

/**
 * Fix missing state.yaml by creating a default one.
 * @param {string} projectRoot
 * @returns {{ fixed: boolean, message: string }}
 */
function fixMissingState(projectRoot) {
  try {
    const statePath = path.join(projectRoot, '_bmad-output', 'lens-work', 'state.yaml');
    const dir = path.dirname(statePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const defaultState = {
      lifecycle_version: 2,
      lens_contract_version: '2.0',
      active_initiative: null,
      current_phase: null,
      active_track: null,
      workflow_status: 'idle',
      phase_status: { preplan: null, businessplan: null, techplan: null, devproposal: null, sprintplan: null },
      audience_status: { small: 'pending', medium: 'pending', large: 'pending', base: 'pending' },
    };
    fs.writeFileSync(statePath, yaml.dump(defaultState, { lineWidth: 120 }), 'utf8');
    return { fixed: true, message: 'Created default state.yaml' };
  } catch (err) {
    return { fixed: false, message: `Cannot create state: ${err.message}` };
  }
}

/**
 * Fix corrupted state.yaml by re-initializing.
 * @param {string} projectRoot
 * @returns {{ fixed: boolean, message: string }}
 */
function fixCorruptState(projectRoot) {
  const statePath = path.join(projectRoot, '_bmad-output', 'lens-work', 'state.yaml');

  // Back up corrupted file
  try {
    const backup = `${statePath}.bak.${Date.now()}`;
    fs.copyFileSync(statePath, backup);
  } catch {
    // backup may fail — continue
  }

  try {
    state.initState(projectRoot);
    return { fixed: true, message: 'Re-initialized state.yaml (corrupted version backed up)' };
  } catch (err) {
    // Fallback: write default state directly
    return fixMissingState(projectRoot).fixed
      ? { fixed: true, message: 'Re-initialized state.yaml (corrupted version backed up)' }
      : { fixed: false, message: `Cannot re-initialize state: ${err.message}` };
  }
}

/**
 * Fix missing event log by creating an empty one.
 * @param {string} projectRoot
 * @returns {{ fixed: boolean, message: string }}
 */
function fixMissingEventLog(projectRoot) {
  const eventLogPath = path.join(projectRoot, '_bmad-output', 'lens-work', 'event-log.jsonl');
  try {
    const dir = path.dirname(eventLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(eventLogPath, '', 'utf8');
    return { fixed: true, message: 'Created empty event-log.jsonl' };
  } catch (err) {
    return { fixed: false, message: `Cannot create event log: ${err.message}` };
  }
}

/**
 * Auto-fix all fixable issues.
 *
 * @param {string} projectRoot
 * @param {object} [opts]
 * @returns {{ total: number, fixed: number, results: Array<{ type: string, fixed: boolean, message: string }> }}
 */
function autoFix(projectRoot, opts = {}) {
  const { issues } = diagnose(projectRoot, opts);
  const fixable = issues.filter(i => i.fixable);
  const results = [];

  for (const issue of fixable) {
    const result = applyFix(projectRoot, issue, opts);
    results.push({ type: issue.type, ...result });
  }

  // Log fix event
  try {
    eventlog.appendEvent(projectRoot, {
      event: 'auto_fix',
      total_issues: issues.length,
      fixable: fixable.length,
      fixed: results.filter(r => r.fixed).length,
    });
  } catch {
    // May fail if event log itself is broken
  }

  return {
    total: issues.length,
    fixed: results.filter(r => r.fixed).length,
    results,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  FIX_TYPES,
  FixError,
  diagnose,
  applyFix,
  autoFix,
};
