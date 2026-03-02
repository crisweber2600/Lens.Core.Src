/**
 * /switch Command — S-019
 *
 * Switch between active initiatives. Lists available initiatives
 * if called without argument, or switches to the specified one.
 *
 * @module lib/switch
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const discovery = require('./discovery');
const eventlog = require('./eventlog');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_STATE_PATH = '_bmad-output/lens-work/state.yaml';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class SwitchError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SwitchError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * List all available initiatives for switching.
 *
 * @param {string} projectRoot
 * @param {object} [options]
 * @returns {{ initiatives: object[], current: string|null }}
 */
function listAvailableInitiatives(projectRoot, options = {}) {
  const statePath = path.resolve(projectRoot, options.statePath || DEFAULT_STATE_PATH);
  let currentId = null;

  if (fs.existsSync(statePath)) {
    try {
      const stateData = yaml.load(fs.readFileSync(statePath, 'utf8'));
      currentId = stateData?.active_initiative || null;
    } catch {
      // Ignore parse errors
    }
  }

  const initiatives = discovery.scanInitiatives(projectRoot, options);

  return { initiatives, current: currentId };
}

/**
 * Switch the active initiative in state.yaml.
 *
 * @param {string} projectRoot
 * @param {string} targetId - Initiative ID to switch to
 * @param {object} [options]
 * @param {string} [options.statePath]
 * @param {boolean} [options.logEvent] - Whether to log the switch event (default: true)
 * @returns {{ switched: boolean, previousId: string|null, newId: string, initiative: object }}
 */
function switchInitiative(projectRoot, targetId, options = {}) {
  const statePath = path.resolve(projectRoot, options.statePath || DEFAULT_STATE_PATH);
  const shouldLog = options.logEvent !== false;

  // Validate target initiative exists
  const allInitiatives = discovery.scanInitiatives(projectRoot, options);
  const target = allInitiatives.find((i) => i.id === targetId);

  if (!target) {
    throw new SwitchError(
      `Initiative '${targetId}' not found. Use listAvailableInitiatives() to see options.`,
      'INITIATIVE_NOT_FOUND',
      { targetId, available: allInitiatives.map((i) => i.id) },
    );
  }

  // Load current state
  if (!fs.existsSync(statePath)) {
    throw new SwitchError('State file not found', 'STATE_NOT_FOUND', { statePath });
  }

  let stateData;
  try {
    stateData = yaml.load(fs.readFileSync(statePath, 'utf8'));
  } catch (err) {
    throw new SwitchError(`Cannot parse state: ${err.message}`, 'STATE_PARSE_ERROR');
  }

  const previousId = stateData.active_initiative;

  // Update state
  stateData.active_initiative = targetId;
  stateData.current_phase = target.phase || null;
  stateData.active_track = target.track || null;
  stateData.last_activity = new Date().toISOString();

  // Write updated state
  const stateHeader = '# v2 — Lifecycle Contract personal state\n';
  const stateYaml = stateHeader + yaml.dump(stateData, {
    lineWidth: -1, noRefs: true, sortKeys: false,
  });
  fs.writeFileSync(statePath, stateYaml, 'utf8');

  // Log event
  if (shouldLog) {
    eventlog.appendEvent(projectRoot, {
      event: 'initiative_switch',
      initiative: targetId,
      previous_initiative: previousId,
      details: { from: previousId, to: targetId },
    });
  }

  return {
    switched: true,
    previousId,
    newId: targetId,
    initiative: target,
  };
}

/**
 * Format the switch result for display.
 *
 * @param {object} result - Result from switchInitiative
 * @returns {string}
 */
function formatSwitchResult(result) {
  const lines = [];

  if (result.previousId) {
    lines.push(`Switched from: ${result.previousId}`);
  }
  lines.push(`Active initiative: ${result.newId}`);
  lines.push(`  Track: ${result.initiative.track}`);
  lines.push(`  Phase: ${result.initiative.phase || '—'}`);
  lines.push(`  Status: ${result.initiative.status}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  SwitchError,
  listAvailableInitiatives,
  switchInitiative,
  formatSwitchResult,
};
