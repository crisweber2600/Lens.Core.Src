/**
 * /status Command — S-027
 *
 * Shows structured status output:
 * - Default: 3-line format per NFR10
 * - Verbose: all phases, gates, branches, event count
 *
 * @module lib/status
 */

'use strict';

const state = require('./state');
const discovery = require('./discovery');
const eventlog = require('./eventlog');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHASE_ORDER = ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'];

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Build the 3-line status output (NFR10).
 *
 * Line 1: {id} ({track}) — {phase} [{status}] on {audience} ({label})
 * Line 2: Pending item or 'All clear'
 * Line 3: Next: {specific_next_action}
 *
 * @param {object} stateData - Current state
 * @param {object} initConfig - Active initiative config
 * @returns {string}
 */
function formatCompactStatus(stateData, initConfig) {
  if (!stateData || !stateData.active_initiative) {
    return 'No active initiative. Use /new to create one or /switch to select one.';
  }

  const id = stateData.active_initiative;
  const track = stateData.active_track || initConfig?.track || 'unknown';
  const phase = stateData.current_phase || '—';
  const status = stateData.workflow_status || 'idle';

  // Determine audience from phase
  // v2: all 5 phases execute at small audience level (architecture §3.2.2)
  const audienceMap = { preplan: 'small', businessplan: 'small', techplan: 'small', devproposal: 'small', sprintplan: 'small' };
  const audience = audienceMap[phase] || '—';

  // Line 1
  const line1 = `${id} (${track}) — ${phase} [${status}] on ${audience}`;

  // Line 2: pending item
  let line2 = 'All clear';
  const phaseStatus = stateData.phase_status || {};
  const currentPhaseStatus = phaseStatus[phase];
  if (currentPhaseStatus === 'pr_pending') {
    line2 = `Pending: PR merge for /${phase}`;
  } else if (currentPhaseStatus === 'blocked') {
    line2 = `Blocked: gate check failed for /${phase}`;
  } else if (currentPhaseStatus === 'in_progress') {
    line2 = `In progress: /${phase}`;
  }

  // Check for state drift
  if (initConfig && initConfig.current_phase !== stateData.current_phase) {
    line2 = `⚠ State drift detected — suggest /sync`;
  }

  // Line 3: next action
  let line3 = 'Next: continue current work';
  if (currentPhaseStatus === 'pr_pending') {
    line3 = `Next: merge PR for /${phase}, then advance`;
  } else if (currentPhaseStatus === 'complete' || currentPhaseStatus === null) {
    // Find next incomplete phase
    const nextPhase = findNextPhase(phaseStatus, initConfig);
    if (nextPhase) {
      line3 = `Next: /${nextPhase}`;
    } else {
      line3 = 'Next: all planning phases complete — proceed to /dev';
    }
  } else {
    line3 = `Next: complete /${phase}`;
  }

  return [line1, line2, line3].join('\n');
}

/**
 * Build verbose status output.
 *
 * @param {string} projectRoot
 * @param {object} stateData
 * @param {object} initConfig
 * @returns {string}
 */
function formatVerboseStatus(projectRoot, stateData, initConfig) {
  const lines = [];

  lines.push('═══ Initiative Status (Verbose) ═══');
  lines.push('');

  if (!stateData || !stateData.active_initiative) {
    lines.push('No active initiative.');
    return lines.join('\n');
  }

  // Initiative info
  lines.push(`Initiative: ${stateData.active_initiative}`);
  lines.push(`Track: ${stateData.active_track || '—'}`);
  lines.push(`Current phase: ${stateData.current_phase || '—'}`);
  lines.push(`Workflow status: ${stateData.workflow_status || '—'}`);
  lines.push('');

  // Phase status
  lines.push('── Phases ──');
  const ps = stateData.phase_status || {};
  for (const phase of PHASE_ORDER) {
    const status = ps[phase] || 'not started';
    const icon = status === 'complete' ? '✓' : status === 'pr_pending' ? '⏳' : status === 'blocked' ? '✗' : '○';
    lines.push(`  ${icon} ${phase}: ${status}`);
  }
  lines.push('');

  // Audience status
  lines.push('── Audience Promotions ──');
  const as = stateData.audience_status || {};
  for (const [key, val] of Object.entries(as)) {
    const status = val || 'not done';
    const icon = status === 'passed' ? '✓' : '○';
    lines.push(`  ${icon} ${key}: ${status}`);
  }
  lines.push('');

  // Branches
  if (initConfig?.branches) {
    lines.push('── Branches ──');
    lines.push(`  Root: ${initConfig.branches.root || '—'}`);
    if (initConfig.branches.audiences) {
      for (const b of initConfig.branches.audiences) {
        lines.push(`  Audience: ${b}`);
      }
    }
    lines.push('');
  }

  // Event count
  try {
    const counts = eventlog.countEvents(projectRoot, { initiative: stateData.active_initiative });
    lines.push(`── Events: ${counts.total} total ──`);
    for (const [type, count] of Object.entries(counts.byType)) {
      lines.push(`  ${type}: ${count}`);
    }
  } catch {
    lines.push('── Events: unavailable ──');
  }

  return lines.join('\n');
}

/**
 * Format status for all initiatives (no active initiative).
 *
 * @param {string} projectRoot
 * @returns {string}
 */
function formatAllInitiativesStatus(projectRoot) {
  return discovery.formatSummary(projectRoot);
}

/**
 * Find the next incomplete phase for the initiative.
 *
 * @param {object} phaseStatus
 * @param {object} initConfig
 * @returns {string|null}
 */
function findNextPhase(phaseStatus, initConfig) {
  const activePhases = initConfig?.active_phases || PHASE_ORDER;

  for (const phase of PHASE_ORDER) {
    if (!activePhases.includes(phase)) continue;
    const status = phaseStatus[phase];
    if (status !== 'complete' && status !== 'passed') {
      return phase;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PHASE_ORDER,
  formatCompactStatus,
  formatVerboseStatus,
  formatAllInitiativesStatus,
  findNextPhase,
};
