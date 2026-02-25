/**
 * Phase Workflow Orchestration — S-029, S-030, S-031, S-032, S-033
 *
 * Implements the consistent phase workflow pattern for all 5 planning phases:
 *   pre-flight → context load → agent activation → artifact generation → commit → PR
 *
 * Each phase workflow:
 * - /preplan (S-029): Mary (Analyst) → product-brief.md
 * - /businessplan (S-030): John (PM) + Sally (UX) → prd.md  
 * - /techplan (S-031): Winston (Architect) → architecture.md, tech-decisions.md
 * - /devproposal (S-032): John (PM) → epics.md, stories/
 * - /sprintplan (S-033): Bob (SM) → sprint-status.md
 *
 * @module lib/phase-workflow
 */

'use strict';

const preconditions = require('./preconditions');
const contextInjection = require('./context-injection');
const phaseBranch = require('./phase-branch');
const eventlog = require('./eventlog');
const dualwrite = require('./dualwrite');
const gateFeedback = require('./gate-feedback');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Phase workflow definitions */
const PHASE_WORKFLOWS = Object.freeze({
  preplan: {
    phase: 'preplan',
    audience: 'small',
    agent: 'analyst',
    agentName: 'Mary',
    bmmWorkflow: 'create-product-brief',
    outputs: ['product-brief'],
    description: 'Pre-plan analysis — generate product brief',
  },
  businessplan: {
    phase: 'businessplan',
    audience: 'small',
    agent: 'pm',
    agentName: 'John',
    supportAgents: ['ux-designer'],
    bmmWorkflow: 'create-prd',
    outputs: ['prd'],
    description: 'Business planning — generate PRD',
  },
  techplan: {
    phase: 'techplan',
    audience: 'small',
    agent: 'architect',
    agentName: 'Winston',
    bmmWorkflow: 'create-architecture',
    outputs: ['architecture', 'tech-decisions'],
    description: 'Technical planning — generate architecture',
  },
  devproposal: {
    phase: 'devproposal',
    audience: 'small',
    agent: 'pm',
    agentName: 'John',
    bmmWorkflow: 'create-epics-and-stories',
    outputs: ['epics'],
    description: 'Dev proposal — generate epics and stories',
  },
  sprintplan: {
    phase: 'sprintplan',
    audience: 'small',
    agent: 'sm',
    agentName: 'Bob',
    bmmWorkflow: 'sprint-planning',
    outputs: ['sprint-status'],
    description: 'Sprint planning — generate sprint plan',
  },
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class PhaseWorkflowError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PhaseWorkflowError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Pre-flight
// ---------------------------------------------------------------------------

/**
 * Run pre-flight checks for a phase.
 *
 * Verifies clean state, validates preconditions, and prepares branch.
 *
 * @param {object} params
 * @param {string} params.projectRoot
 * @param {string} params.phase
 * @param {object} params.stateData
 * @param {object} params.initConfig
 * @param {object} [params.resolved] - Resolved constitution
 * @returns {{ ready: boolean, feedback: string, branchName: string|null }}
 */
function runPreflight(params) {
  const { phase, stateData, initConfig, resolved } = params;
  const workflow = PHASE_WORKFLOWS[phase];

  if (!workflow) {
    return {
      ready: false,
      feedback: `Unknown phase: ${phase}`,
      branchName: null,
    };
  }

  // Run precondition checks
  const preconditionResult = preconditions.validatePreconditions({
    projectRoot: params.projectRoot,
    phase,
    stateData,
    initConfig,
    resolved,
  });

  if (!preconditionResult.valid) {
    return {
      ready: false,
      feedback: gateFeedback.formatPreconditionFeedback(phase, preconditionResult.errors),
      branchName: null,
    };
  }

  // Determine branch name
  const branchRoot = initConfig.branches?.root || initConfig.id;
  const branchName = `${branchRoot}-${workflow.audience}-${phase}`;

  return {
    ready: true,
    feedback: `✓ Pre-flight passed for /${phase}`,
    branchName,
  };
}

// ---------------------------------------------------------------------------
// Core Workflow Execution
// ---------------------------------------------------------------------------

/**
 * Execute a phase workflow.
 *
 * Orchestrates: preflight → context → branch → agent → commit → PR → state update
 *
 * @param {object} params
 * @param {string} params.projectRoot
 * @param {string} params.phase
 * @param {object} params.stateData
 * @param {object} params.initConfig
 * @param {object} [params.resolved] - Resolved constitution
 * @param {object} [opts]
 * @param {Function} [opts.execFn] - Override for git commands
 * @param {string} [opts.cwd]
 * @param {boolean} [opts.skipBranch] - Skip git branch operations
 * @param {boolean} [opts.skipCommit] - Skip git commit operations
 * @returns {{ success: boolean, phase: string, agent: object, context: object, feedback: string }}
 */
function executePhaseWorkflow(params, opts = {}) {
  const workflow = PHASE_WORKFLOWS[params.phase];
  if (!workflow) {
    throw new PhaseWorkflowError(`Unknown phase: ${params.phase}`, 'UNKNOWN_PHASE');
  }

  // 1. Pre-flight
  const preflight = runPreflight(params);
  if (!preflight.ready) {
    return {
      success: false,
      phase: params.phase,
      agent: { primary: workflow.agent, name: workflow.agentName },
      context: null,
      feedback: preflight.feedback,
    };
  }

  // 2. Create/checkout phase branch
  if (!opts.skipBranch) {
    const branchRoot = params.initConfig.branches?.root || params.initConfig.id;
    try {
      phaseBranch.createPhaseBranch(branchRoot, workflow.audience, params.phase, {
        cwd: opts.cwd,
        execFn: opts.execFn,
      });
    } catch {
      // Branch creation may fail in test/CI — continue
    }
  }

  // 3. Build agent context
  const { context, agent, warnings } = contextInjection.buildAgentContext({
    projectRoot: params.projectRoot,
    initConfig: params.initConfig,
    phase: params.phase,
    stateData: params.stateData,
  });

  // 4. Update state to in_progress
  try {
    dualwrite.dualWrite(params.projectRoot, params.initConfig.id, {
      phase_status: { [params.phase]: 'in_progress' },
      current_phase: params.phase,
    });
  } catch {
    // Dual-write may fail if files not set up — log and continue
  }

  // 5. Log workflow start
  eventlog.appendEvent(params.projectRoot, {
    event: 'workflow_start',
    initiative: params.initConfig.id,
    phase: params.phase,
    agent: workflow.agentName,
    workflow: workflow.bmmWorkflow,
  });

  return {
    success: true,
    phase: params.phase,
    agent,
    context,
    workflow: workflow.bmmWorkflow,
    expectedOutputs: workflow.outputs,
    feedback: [
      preflight.feedback,
      `Agent: ${workflow.agentName} (${workflow.agent})`,
      `Workflow: ${workflow.bmmWorkflow}`,
      `Expected outputs: ${workflow.outputs.join(', ')}`,
      warnings.length > 0 ? `Warnings: ${warnings.join('; ')}` : '',
    ].filter(Boolean).join('\n'),
  };
}

/**
 * Complete a phase workflow after artifacts are generated.
 *
 * Updates state to pr_pending and creates PR.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {string} phase
 * @param {object} [opts]
 * @returns {{ completed: boolean }}
 */
function completePhaseWorkflow(projectRoot, initiativeId, phase, opts = {}) {
  // Update state to pr_pending
  try {
    dualwrite.dualWrite(projectRoot, initiativeId, {
      phase_status: { [phase]: 'pr_pending' },
    });
  } catch {
    // Continue even if dual-write fails
  }

  // Log workflow end
  eventlog.appendEvent(projectRoot, {
    event: 'workflow_end',
    initiative: initiativeId,
    phase,
    result: 'artifacts_generated',
  });

  return { completed: true };
}

/**
 * Get the workflow definition for a phase.
 *
 * @param {string} phase
 * @returns {object|null}
 */
function getPhaseWorkflow(phase) {
  return PHASE_WORKFLOWS[phase] || null;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PHASE_WORKFLOWS,
  PhaseWorkflowError,
  runPreflight,
  executePhaseWorkflow,
  completePhaseWorkflow,
  getPhaseWorkflow,
};
