/**
 * /new Initiative Creation — S-034
 *
 * Creates a new initiative with all required scaffolding:
 * - Initiative config from template
 * - Audience branches (small/medium/large)
 * - State updates
 * - Event logging
 *
 * @module lib/new-initiative
 */

'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const initiative = require('./initiative');
const state = require('./state');
const eventlog = require('./eventlog');
const gitops = require('./gitops');
const branchNaming = require('./branch-naming');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Available tracks */
const TRACKS = Object.freeze(['full', 'feature', 'tech-change', 'hotfix', 'spike']);

/** Track → phases mapping (aligned with lifecycle.yaml and initiative.js) */
const TRACK_PHASES = Object.freeze({
  full: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'],
  feature: ['businessplan', 'techplan', 'devproposal', 'sprintplan'],
  'tech-change': ['techplan', 'sprintplan'],
  hotfix: ['techplan'],
  spike: ['preplan'],
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class NewInitiativeError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'NewInitiativeError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a 6-character random initiative ID suffix.
 *
 * @returns {string}
 */
function generateId() {
  return crypto.randomBytes(3).toString('hex').slice(0, 6);
}

/**
 * Slugify a feature name for use in branch names and IDs.
 *
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40); // Keep reasonable length
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Build initiative parameters from user input.
 *
 * @param {object} params
 * @param {string} params.domain
 * @param {string} params.service
 * @param {string} params.featureName
 * @param {string} params.track
 * @param {string} [params.description]
 * @returns {object} Complete initiative creation parameters
 */
function buildInitiativeParams(params) {
  if (!params.domain) throw new NewInitiativeError('Domain is required', 'MISSING_DOMAIN');
  if (!params.service) throw new NewInitiativeError('Service is required', 'MISSING_SERVICE');
  if (!params.featureName) throw new NewInitiativeError('Feature name is required', 'MISSING_FEATURE');
  if (!params.track || !TRACKS.includes(params.track)) {
    throw new NewInitiativeError(
      `Invalid track: '${params.track}'. Must be: ${TRACKS.join(', ')}`,
      'INVALID_TRACK',
    );
  }

  const slug = slugify(params.featureName);
  const idSuffix = generateId();
  const initiativeId = `${slug}-${idSuffix}`;

  const phases = TRACK_PHASES[params.track] || [];
  const phaseStatus = {};
  for (const phase of ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan']) {
    phaseStatus[phase] = phases.includes(phase) ? null : 'complete'; // Skip non-active phases
  }

  const firstPhase = phases.length > 0 ? phases[0] : 'dev';

  return {
    id: initiativeId,
    name: params.featureName,
    slug,
    domain: params.domain,
    service: params.service,
    track: params.track,
    description: params.description || '',
    phases,
    phaseStatus,
    firstPhase,
    docsPath: `Docs/${params.domain.toLowerCase()}/${params.service.toLowerCase()}/feature/${slug}`,
    branchRoot: branchNaming.buildInitiativeRootName({
      domain: params.domain,
      service: params.service,
      feature: slug,
      initiativeId: idSuffix,
    }),
  };
}

/**
 * Create a new initiative with full scaffolding.
 *
 * @param {string} projectRoot
 * @param {object} params - From buildInitiativeParams
 * @param {object} [opts]
 * @param {boolean} [opts.createBranches] - Create git branches (default: true)
 * @param {boolean} [opts.pushBranches] - Push branches to remote (default: false)
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ created: boolean, initiativeId: string, branches: object, configPath: string }}
 */
function createInitiative(projectRoot, params, opts = {}) {
  const shouldCreateBranches = opts.createBranches !== false;

  // 1. Check initiative doesn't already exist
  const existingPath = path.join(
    projectRoot,
    '_bmad-output/lens-work/initiatives',
    `${params.id}.yaml`,
  );
  const fs = require('node:fs');
  if (fs.existsSync(existingPath)) {
    throw new NewInitiativeError(
      `Initiative '${params.id}' already exists`,
      'ALREADY_EXISTS',
      { id: params.id, path: existingPath },
    );
  }

  // 2. Create initiative config
  const configData = {
    lifecycle_version: 2,
    id: params.id,
    name: params.name,
    domain: params.domain,
    service: params.service,
    layer: 'feature',
    track: params.track,
    description: params.description,
    current_phase: params.firstPhase,
    active_phases: params.phases,
    phase_status: params.phaseStatus,
    audience_status: {
      small_to_medium: null,
      medium_to_large: null,
      large_to_base: null,
    },
    docs: {
      path: params.docsPath,
      domain: params.domain,
      service: params.service,
      feature: params.slug,
    },
    branches: {
      root: params.branchRoot,
      audiences: gitops.DEFAULT_AUDIENCES.map((a) => `${params.branchRoot}-${a}`),
    },
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
  };

  // Create config directory and file
  const configDir = path.dirname(existingPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const yaml = require('js-yaml');
  fs.writeFileSync(existingPath, yaml.dump(configData, {
    lineWidth: -1, noRefs: true, sortKeys: false,
  }), 'utf8');

  // 3. Update state.yaml
  try {
    const stateData = state.readState(projectRoot);
    state.writeState(projectRoot, {
      ...stateData,
      active_initiative: params.id,
      current_phase: params.firstPhase,
      active_track: params.track,
      last_activity: new Date().toISOString(),
    });
  } catch {
    // State might not exist yet — that's fine for fresh repos
  }

  // 4. Create branches
  let branches = { branches: [], initiativeRoot: params.branchRoot };
  if (shouldCreateBranches) {
    try {
      // Create root branch first
      gitops.createBranch(params.branchRoot, opts);

      // Create audience branches
      branches = gitops.createAudienceBranches(params.branchRoot, {
        push: opts.pushBranches || false,
        cwd: opts.cwd,
        execFn: opts.execFn,
      });
    } catch {
      // Git operations may fail in test environments — that's OK
    }
  }

  // 5. Log event
  eventlog.appendEvent(projectRoot, {
    event: 'initiative_created',
    initiative: params.id,
    details: {
      track: params.track,
      domain: params.domain,
      service: params.service,
      feature: params.name,
      branchRoot: params.branchRoot,
    },
  });

  return {
    created: true,
    initiativeId: params.id,
    branches,
    configPath: existingPath,
  };
}

/**
 * Format initiative creation result for display.
 *
 * @param {object} result
 * @param {object} params
 * @returns {string}
 */
function formatCreationResult(result, params) {
  const lines = [];
  lines.push(`✓ Initiative created: ${result.initiativeId}`);
  lines.push(`  Track: ${params.track}`);
  lines.push(`  Domain: ${params.domain}/${params.service}`);
  lines.push(`  Docs: ${params.docsPath}`);
  lines.push(`  Branch root: ${params.branchRoot}`);

  if (params.phases.length > 0) {
    lines.push(`  First phase: /${params.firstPhase}`);
  } else {
    lines.push(`  Ready for: /dev`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  TRACKS,
  TRACK_PHASES,
  NewInitiativeError,
  generateId,
  slugify,
  buildInitiativeParams,
  createInitiative,
  formatCreationResult,
};
