/**
 * Agent Context Injection — S-026
 *
 * Loads all prior phase artifacts, initiative config, and resolved
 * constitution, then packages them as read-only context for the
 * phase agent being activated.
 *
 * @module lib/context-injection
 */

'use strict';

const artifacts = require('./artifacts');
const constitution = require('./constitution');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Phase → required prior artifacts mapping */
const PHASE_CONTEXT_MAP = Object.freeze({
  preplan: [],
  businessplan: ['product-brief'],
  techplan: ['product-brief', 'prd'],
  devproposal: ['product-brief', 'prd', 'architecture', 'tech-decisions'],
  sprintplan: ['product-brief', 'prd', 'architecture', 'tech-decisions', 'epics'],
});

/** Phase → agent mapping */
const PHASE_AGENT_MAP = Object.freeze({
  preplan: { primary: 'analyst', name: 'Mary' },
  businessplan: { primary: 'pm', name: 'John', support: ['ux-designer'] },
  techplan: { primary: 'architect', name: 'Winston' },
  devproposal: { primary: 'pm', name: 'John' },
  sprintplan: { primary: 'sm', name: 'Bob' },
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class ContextError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ContextError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Load all prior phase artifacts from the docs path.
 *
 * @param {string} projectRoot
 * @param {object} initConfig
 * @param {string} phase
 * @returns {{ artifacts: Record<string, string>, missing: string[] }}
 */
function loadPriorArtifacts(projectRoot, initConfig, phase) {
  const required = PHASE_CONTEXT_MAP[phase] || [];
  const loaded = {};
  const missing = [];

  for (const artifactName of required) {
    try {
      loaded[artifactName] = artifacts.loadArtifact(projectRoot, initConfig, artifactName);
    } catch {
      missing.push(artifactName);
    }
  }

  return { artifacts: loaded, missing };
}

/**
 * Build the complete context object for agent activation.
 *
 * @param {object} params
 * @param {string} params.projectRoot
 * @param {object} params.initConfig - Initiative config
 * @param {string} params.phase - Phase being activated
 * @param {object} [params.stateData] - Current state data
 * @returns {{ context: object, agent: object, warnings: string[] }}
 */
function buildAgentContext(params) {
  const warnings = [];
  const { projectRoot, initConfig, phase, stateData } = params;

  // 1. Load prior artifacts
  const { artifacts: priorArtifacts, missing } = loadPriorArtifacts(
    projectRoot, initConfig, phase,
  );
  if (missing.length > 0) {
    warnings.push(`Missing prior artifacts: ${missing.join(', ')}`);
  }

  // 2. Load constitution
  let resolvedConstitution = null;
  try {
    const ctx = {
      domain: initConfig.domain || initConfig.docs?.domain,
      service: initConfig.service || initConfig.docs?.service,
    };
    const { resolved } = constitution.loadHierarchy(projectRoot, ctx);
    resolvedConstitution = resolved;
  } catch {
    warnings.push('Could not load constitution hierarchy');
  }

  // 3. Get agent info
  const agent = PHASE_AGENT_MAP[phase] || { primary: 'unknown', name: 'Unknown' };

  // 4. Build read-only context
  const context = Object.freeze({
    initiative: {
      id: initConfig.id,
      name: initConfig.name,
      track: initConfig.track,
      domain: initConfig.domain,
      service: initConfig.service,
      phase,
      phaseStatus: initConfig.phase_status,
      docsPath: initConfig.docs?.path || artifacts.buildDocsRelativePath(initConfig),
    },
    priorArtifacts: Object.freeze({ ...priorArtifacts }),
    constitution: resolvedConstitution ? Object.freeze({ ...resolvedConstitution }) : null,
    state: stateData ? Object.freeze({
      currentPhase: stateData.current_phase,
      workflowStatus: stateData.workflow_status,
      audienceStatus: stateData.audience_status,
    }) : null,
  });

  return { context, agent, warnings };
}

/**
 * Get the expected output artifacts for a phase.
 *
 * @param {string} phase
 * @returns {string[]}
 */
function getExpectedOutputs(phase) {
  const outputs = {
    preplan: ['product-brief'],
    businessplan: ['prd'],
    techplan: ['architecture', 'tech-decisions'],
    devproposal: ['epics'],
    sprintplan: ['sprint-status'],
  };
  return outputs[phase] || [];
}

/**
 * Format context summary for logging.
 *
 * @param {object} context
 * @param {object} agent
 * @returns {string}
 */
function formatContextSummary(context, agent) {
  const lines = [];
  lines.push(`Agent: ${agent.name} (${agent.primary})`);
  lines.push(`Initiative: ${context.initiative.id} [${context.initiative.track}]`);
  lines.push(`Phase: ${context.initiative.phase}`);
  lines.push(`Prior artifacts: ${Object.keys(context.priorArtifacts).join(', ') || '(none)'}`);
  lines.push(`Constitution: ${context.constitution ? 'loaded' : 'none'}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PHASE_CONTEXT_MAP,
  PHASE_AGENT_MAP,
  ContextError,
  loadPriorArtifacts,
  buildAgentContext,
  getExpectedOutputs,
  formatContextSummary,
};
