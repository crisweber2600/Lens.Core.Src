/**
 * Onboard Flow — S-020
 *
 * Implements the 4-step onboarding sequence for new and returning users.
 * Completes in ≤5 user interactions (NFR12).
 *
 * @module lib/onboard
 */

'use strict';

const discovery = require('./discovery');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Onboard steps */
const STEPS = Object.freeze({
  DETECT: 1,
  EXPLAIN: 2,
  COMMANDS: 3,
  ACTION: 4,
});

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Step 1: Detect returning vs. new user.
 *
 * @param {string} projectRoot
 * @param {object} [options]
 * @returns {{ isReturning: boolean, initiatives: object[], message: string }}
 */
function detectUser(projectRoot, options = {}) {
  const initiatives = discovery.scanInitiatives(projectRoot, options);
  const isReturning = initiatives.length > 0;

  const message = isReturning
    ? `Welcome back! Found ${initiatives.length} existing initiative(s).`
    : 'Welcome to LENS! No existing initiatives found — let\'s get started.';

  return { isReturning, initiatives, message };
}

/**
 * Step 2: Explain phases, tracks, audiences.
 *
 * @returns {{ phases: string, tracks: string, audiences: string }}
 */
function explainConcepts() {
  return {
    phases: [
      '**Phases** define the planning lifecycle. Each initiative progresses through:',
      '  PrePlan → BusinessPlan → TechPlan → DevProposal → SprintPlan → Dev',
      'Each phase produces specific artifacts and requires a PR merge to advance.',
    ].join('\n'),

    tracks: [
      '**Tracks** control which phases are required for your initiative:',
      '  • full — all 5 planning phases (large projects)',
      '  • feature — BusinessPlan + TechPlan + DevProposal + SprintPlan (medium features)',
      '  • tech-change — TechPlan + SprintPlan (technical improvements)',
      '  • hotfix — TechPlan only (minimal planning, fast to execution)',
      '  • spike — PrePlan only (research, time-boxed, no implementation)',
    ].join('\n'),

    audiences: [
      '**Audiences** control document visibility and review scope:',
      '  • small — core team ("inner circle") — all 5 planning phases happen here',
      '  • medium — extended team — lead review via adversarial review gate',
      '  • large — full team — stakeholder approval gate',
      'Artifacts flow small → medium → large through PR-based promotions.',
    ].join('\n'),
  };
}

/**
 * Step 3: Show Tier 1 commands.
 *
 * @returns {string}
 */
function showTier1Commands() {
  return [
    '**Getting Started Commands:**',
    '',
    '  /new       — Create a new initiative',
    '  /status    — Show current initiative status',
    '  /switch    — Switch between initiatives',
    '  /onboard   — Re-run this onboarding (anytime)',
    '',
    '**Phase Commands** (run in order):',
    '  /pre-plan → /businessplan → /tech-plan → /devproposal → /sprintplan → /dev',
  ].join('\n');
}

/**
 * Step 4: Offer next action based on user type.
 *
 * @param {boolean} isReturning
 * @param {object[]} initiatives
 * @returns {{ suggestion: string, command: string }}
 */
function suggestNextAction(isReturning, initiatives) {
  if (isReturning && initiatives.length > 0) {
    const active = initiatives.find((i) => i.status === 'active');
    if (active) {
      return {
        suggestion: `You have an active initiative: ${active.id}. Check its status or switch to another.`,
        command: '/status',
      };
    }
    return {
      suggestion: 'You have existing initiatives. Switch to one or create a new one.',
      command: '/switch',
    };
  }

  return {
    suggestion: 'Ready to start? Create your first initiative!',
    command: '/new',
  };
}

/**
 * Run the complete onboard flow and return formatted output.
 *
 * @param {string} projectRoot
 * @param {object} [options]
 * @returns {string}
 */
function runOnboard(projectRoot, options = {}) {
  const lines = [];
  lines.push('═══ LENS Onboarding ═══');
  lines.push('');

  // Step 1
  const detection = detectUser(projectRoot, options);
  lines.push(`Step 1: ${detection.message}`);
  lines.push('');

  // Step 2
  const concepts = explainConcepts();
  lines.push(concepts.phases);
  lines.push('');
  lines.push(concepts.tracks);
  lines.push('');
  lines.push(concepts.audiences);
  lines.push('');

  // Step 3
  lines.push(showTier1Commands());
  lines.push('');

  // Step 4
  const action = suggestNextAction(detection.isReturning, detection.initiatives);
  lines.push(`→ ${action.suggestion}`);
  lines.push(`  Try: ${action.command}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  STEPS,
  detectUser,
  explainConcepts,
  showTier1Commands,
  suggestNextAction,
  runOnboard,
};
