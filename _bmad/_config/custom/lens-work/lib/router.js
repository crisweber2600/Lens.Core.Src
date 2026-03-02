/**
 * Command-to-Workflow Router — S-024
 *
 * Maps slash commands to workflow file paths and parameters.
 * Central routing registry for the @lens agent and CLI.
 *
 * @module lib/router
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Route categories for organization.
 */
const CATEGORY = Object.freeze({
  PHASE: 'phase',
  INITIATIVE: 'initiative',
  UTILITY: 'utility',
  GOVERNANCE: 'governance',
  DISCOVERY: 'discovery',
});

/**
 * Master route table mapping commands → workflow metadata.
 *
 * Each entry contains:
 * - command: The slash command (without leading /)
 * - workflow: Relative path to the workflow .md file
 * - category: Route category
 * - description: Human-readable description
 * - agent: Primary agent responsible (optional)
 * - params: Default parameters (optional)
 * - aliases: Alternative triggers (optional)
 */
const ROUTE_TABLE = Object.freeze([
  // ── Phase Router Commands ─────────────────────────────────────────────
  {
    command: 'pre-plan',
    workflow: 'workflows/router/pre-plan/workflow.md',
    category: CATEGORY.PHASE,
    description: 'Launch pre-plan analysis phase',
    agent: 'lens',
    aliases: ['preplan', 'analysis'],
  },
  {
    command: 'spec',
    workflow: 'workflows/router/spec/workflow.md',
    category: CATEGORY.PHASE,
    description: 'Launch specification / planning phase',
    agent: 'lens',
    aliases: ['specification'],
  },
  {
    command: 'tech-plan',
    workflow: 'workflows/router/tech-plan/workflow.md',
    category: CATEGORY.PHASE,
    description: 'Launch technical planning phase',
    agent: 'lens',
    aliases: ['techplan', 'technical-planning'],
  },
  {
    command: 'plan',
    workflow: 'workflows/router/plan/workflow.md',
    category: CATEGORY.PHASE,
    description: 'Complete solutioning / architecture',
    agent: 'lens',
    aliases: ['solutioning'],
  },
  {
    command: 'story-gen',
    workflow: 'workflows/router/story-gen/workflow.md',
    category: CATEGORY.PHASE,
    description: 'Generate stories from epics',
    agent: 'lens',
    aliases: ['stories', 'generate-stories'],
  },
  {
    command: 'review',
    workflow: 'workflows/router/review/workflow.md',
    category: CATEGORY.PHASE,
    description: 'Implementation readiness gate review',
    agent: 'lens',
    aliases: ['gate', 'readiness'],
  },
  {
    command: 'dev',
    workflow: 'workflows/router/dev/workflow.md',
    category: CATEGORY.PHASE,
    description: 'Implementation development loop',
    agent: 'lens',
    aliases: ['develop', 'implement'],
  },

  // ── Initiative Commands ───────────────────────────────────────────────
  {
    command: 'new-domain',
    workflow: 'workflows/router/init-initiative/workflow.md',
    category: CATEGORY.INITIATIVE,
    description: 'Create a new domain-level initiative',
    agent: 'lens',
    params: { layer: 'domain' },
  },
  {
    command: 'new-service',
    workflow: 'workflows/router/init-initiative/workflow.md',
    category: CATEGORY.INITIATIVE,
    description: 'Create a new service-level initiative',
    agent: 'lens',
    params: { layer: 'service' },
  },
  {
    command: 'new-feature',
    workflow: 'workflows/router/init-initiative/workflow.md',
    category: CATEGORY.INITIATIVE,
    description: 'Create a new feature-level initiative',
    agent: 'lens',
    params: { layer: 'feature' },
  },

  // ── Utility Commands ──────────────────────────────────────────────────
  {
    command: 'status',
    workflow: 'workflows/utility/status/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'Display current initiative and phase status',
    agent: 'lens',
  },
  {
    command: 'sync',
    workflow: 'workflows/utility/sync-and-select-branch/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'Sync branches and select active branch',
    agent: 'lens',
    aliases: ['sync-now'],
  },
  {
    command: 'fix',
    workflow: 'workflows/utility/fix-state/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'Fix state divergence or errors',
    agent: 'lens',
    aliases: ['fix-state'],
  },
  {
    command: 'switch',
    workflow: 'workflows/utility/switch/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'Switch active initiative or branch',
    agent: 'lens',
  },
  {
    command: 'onboard',
    workflow: 'workflows/utility/onboarding/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'First-time user and repo onboarding',
    agent: 'lens',
  },
  {
    command: 'fix-story',
    workflow: 'workflows/utility/fix-story/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'Fix or regenerate a story file',
    agent: 'lens',
    aliases: ['#fix-story'],
  },
  {
    command: 'recreate-branches',
    workflow: 'workflows/utility/recreate-branches/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'Recreate missing branches from initiative config',
    agent: 'lens',
  },
  {
    command: 'credentials',
    workflow: 'workflows/utility/manage-credentials/workflow.md',
    category: CATEGORY.UTILITY,
    description: 'Manage git credentials and remote config',
    agent: 'lens',
  },

  // ── Governance Commands ───────────────────────────────────────────────
  {
    command: 'constitution',
    workflow: 'workflows/governance/constitution/workflow.md',
    category: CATEGORY.GOVERNANCE,
    description: 'View or modify constitutional governance rules',
    agent: 'lens',
  },
  {
    command: 'compliance',
    workflow: 'workflows/governance/compliance-check/workflow.md',
    category: CATEGORY.GOVERNANCE,
    description: 'Run compliance check against constitutions',
    agent: 'lens',
    aliases: ['compliance-check'],
  },
  {
    command: 'resolve',
    workflow: 'workflows/governance/resolve-constitution/workflow.md',
    category: CATEGORY.GOVERNANCE,
    description: 'Resolve constitutional conflicts',
    agent: 'lens',
  },
  {
    command: 'ancestry',
    workflow: 'workflows/governance/ancestry/workflow.md',
    category: CATEGORY.GOVERNANCE,
    description: 'View constitutional ancestry chain',
    agent: 'lens',
  },

  // ── Discovery Commands ────────────────────────────────────────────────
  {
    command: 'domain-map',
    workflow: 'workflows/discovery/domain-map/workflow.md',
    category: CATEGORY.DISCOVERY,
    description: 'Generate domain/service map',
    agent: 'lens',
  },
  {
    command: 'impact',
    workflow: 'workflows/discovery/impact-analysis/workflow.md',
    category: CATEGORY.DISCOVERY,
    description: 'Run impact analysis across initiatives',
    agent: 'lens',
    aliases: ['impact-analysis'],
  },
]);

// Build lookup indexes for fast resolution
const _commandIndex = new Map();
const _aliasIndex = new Map();

for (const route of ROUTE_TABLE) {
  _commandIndex.set(route.command, route);
  if (route.aliases) {
    for (const alias of route.aliases) {
      _aliasIndex.set(alias, route);
    }
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class RouterError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'RouterError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Resolve a command string to its route entry.
 *
 * Strips leading '/' if present, then checks exact command match
 * and alias match. Returns a resolved route object.
 *
 * @param {string} cmd - Command to resolve (with or without leading /)
 * @returns {{ command: string, workflow: string, category: string, description: string, agent: string|undefined, params: object|undefined }}
 * @throws {RouterError} If command not found
 */
function resolveCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') {
    throw new RouterError('Command must be a non-empty string', 'INVALID_COMMAND');
  }

  // Normalize: trim, strip leading /, lowercase
  const normalized = cmd.trim().replace(/^\/+/, '').trim().toLowerCase();

  // Exact match
  const exact = _commandIndex.get(normalized);
  if (exact) {
    return {
      command: exact.command,
      workflow: exact.workflow,
      category: exact.category,
      description: exact.description,
      agent: exact.agent,
      params: exact.params ? { ...exact.params } : undefined,
    };
  }

  // Alias match
  const aliased = _aliasIndex.get(normalized);
  if (aliased) {
    return {
      command: aliased.command,
      workflow: aliased.workflow,
      category: aliased.category,
      description: aliased.description,
      agent: aliased.agent,
      params: aliased.params ? { ...aliased.params } : undefined,
    };
  }

  throw new RouterError(
    `Unknown command: '${cmd}'. Use listCommands() to see available commands.`,
    'COMMAND_NOT_FOUND',
    { command: cmd, normalized },
  );
}

/**
 * List all available commands.
 *
 * @param {object} [options]
 * @param {string} [options.category] - Filter by category
 * @returns {Array<{command: string, workflow: string, category: string, description: string, aliases: string[]|undefined}>}
 */
function listCommands(options = {}) {
  let routes = [...ROUTE_TABLE];

  if (options.category) {
    routes = routes.filter((r) => r.category === options.category);
  }

  return routes.map((r) => ({
    command: r.command,
    workflow: r.workflow,
    category: r.category,
    description: r.description,
    aliases: r.aliases || undefined,
  }));
}

/**
 * Get all unique command categories.
 *
 * @returns {string[]}
 */
function listCategories() {
  return [...new Set(ROUTE_TABLE.map((r) => r.category))];
}

/**
 * Format a human-readable help listing of all commands.
 *
 * @param {object} [options]
 * @param {string} [options.category] - Filter by category
 * @returns {string}
 */
function formatHelp(options = {}) {
  const commands = listCommands(options);

  if (commands.length === 0) {
    return 'No commands available.';
  }

  const lines = ['Available Commands:', ''];
  const categories = [...new Set(commands.map((c) => c.category))];

  for (const cat of categories) {
    lines.push(`── ${cat.toUpperCase()} ──`);
    const catCmds = commands.filter((c) => c.category === cat);
    for (const cmd of catCmds) {
      const aliases = cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
      lines.push(`  /${cmd.command}${aliases}`);
      lines.push(`    ${cmd.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  CATEGORY,
  ROUTE_TABLE,
  RouterError,
  resolveCommand,
  listCommands,
  listCategories,
  formatHelp,
};
