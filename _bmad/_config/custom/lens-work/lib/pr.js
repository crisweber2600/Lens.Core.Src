/**
 * PR Creation — S-010
 *
 * Creates Pull Requests for phase completion (phase→audience) and
 * audience promotion (audience→audience). Supports GitHub MCP with
 * graceful fallback to manual instructions.
 *
 * @module lib/pr
 */

'use strict';

const branchNaming = require('./branch-naming');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** PR title templates */
const PR_TITLE_TEMPLATES = {
  phase: 'phase({phase}): Complete {phase} for {initiative}',
  promotion: 'promote({from}→{to}): Promote {initiative} to {audience}',
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class PRError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PRError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// PR Body Building
// ---------------------------------------------------------------------------

/**
 * Build a structured PR body with initiative context.
 *
 * @param {object} params
 * @param {string} params.type - 'phase' or 'promotion'
 * @param {string} params.initiativeId
 * @param {string} [params.phase]
 * @param {string} [params.audience]
 * @param {string[]} [params.artifacts] - Artifacts produced
 * @param {string} [params.nextStep] - What to do next
 * @param {object} [params.context] - Additional context
 * @returns {string} Formatted PR body markdown
 */
function buildPRBody(params) {
  const lines = [];
  lines.push(`## ${params.type === 'phase' ? 'Phase Completion' : 'Audience Promotion'}`);
  lines.push('');
  lines.push(`**Initiative:** ${params.initiativeId}`);

  if (params.phase) lines.push(`**Phase:** ${params.phase}`);
  if (params.audience) lines.push(`**Audience:** ${params.audience}`);
  lines.push('');

  if (params.artifacts && params.artifacts.length > 0) {
    lines.push('### Artifacts Produced');
    for (const a of params.artifacts) {
      lines.push(`- ${a}`);
    }
    lines.push('');
  }

  if (params.nextStep) {
    lines.push(`### Next Steps`);
    lines.push(params.nextStep);
    lines.push('');
  }

  if (params.context) {
    lines.push('### Context');
    lines.push('```json');
    lines.push(JSON.stringify(params.context, null, 2));
    lines.push('```');
  }

  return lines.join('\n');
}

/**
 * Build a PR title from template.
 *
 * @param {string} type - 'phase' or 'promotion'
 * @param {object} params
 * @param {string} params.initiative
 * @param {string} [params.phase]
 * @param {string} [params.from] - Source audience
 * @param {string} [params.to] - Target audience
 * @param {string} [params.audience]
 * @returns {string}
 */
function buildPRTitle(type, params) {
  let template = PR_TITLE_TEMPLATES[type] || PR_TITLE_TEMPLATES.phase;

  for (const [key, value] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }

  return template;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Create a PR for phase completion (phase branch → audience branch).
 *
 * Attempts GitHub MCP first; falls back to manual instructions on failure.
 *
 * @param {object} params
 * @param {string} params.initiativeRoot - Initiative root branch name
 * @param {string} params.audience - Target audience
 * @param {string} params.phase - Phase being completed
 * @param {string} params.initiativeId - Initiative ID
 * @param {string[]} [params.artifacts] - List of artifacts produced
 * @param {string} [params.nextStep] - Next step description
 * @param {object} [opts]
 * @param {Function} [opts.mcpCreatePR] - GitHub MCP PR creation function
 * @param {string} [opts.repoOwner] - GitHub repo owner
 * @param {string} [opts.repoName] - GitHub repo name
 * @returns {Promise<{ created: boolean, url: string|null, manual: boolean, instructions: string|null }>}
 */
async function createPhasePR(params, opts = {}) {
  const headBranch = branchNaming.buildPhaseBranchName(
    params.initiativeRoot, params.audience, params.phase,
  );
  const baseBranch = branchNaming.buildAudienceBranchName(
    params.initiativeRoot, params.audience,
  );

  const title = buildPRTitle('phase', {
    phase: params.phase,
    initiative: params.initiativeId,
  });

  const body = buildPRBody({
    type: 'phase',
    initiativeId: params.initiativeId,
    phase: params.phase,
    audience: params.audience,
    artifacts: params.artifacts,
    nextStep: params.nextStep,
  });

  // Try GitHub MCP
  if (opts.mcpCreatePR) {
    try {
      const result = await opts.mcpCreatePR({
        owner: opts.repoOwner,
        repo: opts.repoName,
        title,
        body,
        head: headBranch,
        base: baseBranch,
      });

      return {
        created: true,
        url: result.html_url || result.url || null,
        manual: false,
        instructions: null,
      };
    } catch (err) {
      // Fall through to manual
    }
  }

  // Manual fallback
  const manualUrl = opts.repoOwner && opts.repoName
    ? `https://github.com/${opts.repoOwner}/${opts.repoName}/compare/${baseBranch}...${headBranch}?expand=1`
    : null;

  const instructions = [
    `Create a Pull Request manually:`,
    `  Head branch: ${headBranch}`,
    `  Base branch: ${baseBranch}`,
    `  Title: ${title}`,
    manualUrl ? `  URL: ${manualUrl}` : '',
  ].filter(Boolean).join('\n');

  return {
    created: false,
    url: manualUrl,
    manual: true,
    instructions,
  };
}

/**
 * Create a PR for audience promotion (audience → audience).
 *
 * @param {object} params
 * @param {string} params.initiativeRoot - Initiative root branch name
 * @param {string} params.fromAudience - Source audience (e.g. 'small')
 * @param {string} params.toAudience - Target audience (e.g. 'medium')
 * @param {string} params.initiativeId - Initiative ID
 * @param {object} [opts]
 * @param {Function} [opts.mcpCreatePR]
 * @param {string} [opts.repoOwner]
 * @param {string} [opts.repoName]
 * @returns {Promise<{ created: boolean, url: string|null, manual: boolean, instructions: string|null }>}
 */
async function createPromotionPR(params, opts = {}) {
  const headBranch = branchNaming.buildAudienceBranchName(
    params.initiativeRoot, params.fromAudience,
  );
  const baseBranch = branchNaming.buildAudienceBranchName(
    params.initiativeRoot, params.toAudience,
  );

  const title = buildPRTitle('promotion', {
    from: params.fromAudience,
    to: params.toAudience,
    initiative: params.initiativeId,
    audience: params.toAudience,
  });

  const body = buildPRBody({
    type: 'promotion',
    initiativeId: params.initiativeId,
    audience: `${params.fromAudience} → ${params.toAudience}`,
    nextStep: `After merge, ${params.toAudience} audience has all changes from ${params.fromAudience}.`,
  });

  // Try GitHub MCP
  if (opts.mcpCreatePR) {
    try {
      const result = await opts.mcpCreatePR({
        owner: opts.repoOwner,
        repo: opts.repoName,
        title,
        body,
        head: headBranch,
        base: baseBranch,
      });

      return {
        created: true,
        url: result.html_url || result.url || null,
        manual: false,
        instructions: null,
      };
    } catch {
      // Fall through to manual
    }
  }

  // Manual fallback
  const manualUrl = opts.repoOwner && opts.repoName
    ? `https://github.com/${opts.repoOwner}/${opts.repoName}/compare/${baseBranch}...${headBranch}?expand=1`
    : null;

  const instructions = [
    `Create a Pull Request manually:`,
    `  Head branch: ${headBranch}`,
    `  Base branch: ${baseBranch}`,
    `  Title: ${title}`,
    manualUrl ? `  URL: ${manualUrl}` : '',
  ].filter(Boolean).join('\n');

  return {
    created: false,
    url: manualUrl,
    manual: true,
    instructions,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PR_TITLE_TEMPLATES,
  PRError,
  buildPRBody,
  buildPRTitle,
  createPhasePR,
  createPromotionPR,
};
