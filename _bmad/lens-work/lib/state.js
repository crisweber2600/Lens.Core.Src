'use strict';

/**
 * State Management — S-003: state.yaml read/write with v2 schema
 *
 * Implements the state management skill's ability to load and save
 * _bmad-output/lens-work/state.yaml using the v2 lifecycle contract schema.
 *
 * @module lib/state
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// ─── Constants ──────────────────────────────────────────────────────────────

/** Canonical phase names for v2 lifecycle contract */
const CANONICAL_PHASES = ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'];

/** Valid values for current_phase (includes null and 'dev' for implementation) */
const VALID_CURRENT_PHASES = [null, ...CANONICAL_PHASES, 'dev'];

/** Valid track types */
const CANONICAL_TRACKS = [null, 'full', 'feature', 'tech-change', 'hotfix', 'spike'];

/** Valid workflow_status values */
const VALID_WORKFLOW_STATUSES = ['idle', 'running', 'error', 'in_progress', 'ready', 'complete', 'pr_pending'];

/** Valid phase_status values */
const VALID_PHASE_STATUS_VALUES = [null, 'passed', 'blocked', 'complete', 'in_progress', 'pr_pending'];

/** Valid audience_status values */
const VALID_AUDIENCE_STATUS_VALUES = [null, 'passed', 'blocked'];

/** Required audience_status keys */
const REQUIRED_AUDIENCE_KEYS = ['small_to_medium', 'medium_to_large', 'large_to_base'];

/** Required top-level fields in state.yaml */
const REQUIRED_STATE_FIELDS = [
  'lifecycle_version',
  'active_initiative',
  'current_phase',
  'active_track',
  'workflow_status',
  'phase_status',
  'audience_status',
];

/** Default state file path (relative to project root) */
const DEFAULT_STATE_PATH = '_bmad-output/lens-work/state.yaml';

/** Default template path (relative to module root) */
const DEFAULT_TEMPLATE_PATH = 'templates/state-template.yaml';

// ─── Errors ─────────────────────────────────────────────────────────────────

class StateError extends Error {
  /**
   * @param {string} message
   * @param {string} code - Error code for programmatic handling
   * @param {object} [details] - Additional context
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'StateError';
    this.code = code;
    this.details = details;
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a state object against the v2 schema.
 *
 * @param {object} state - Parsed state object
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateState(state) {
  const errors = [];

  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['State must be a non-null object'] };
  }

  // 1. Validate lifecycle_version
  if (state.lifecycle_version !== 2) {
    if (state.lifecycle_version === 1 || state.lifecycle_version == null) {
      errors.push(
        `Legacy v1 state detected — lifecycle_version = ${state.lifecycle_version ?? 'missing'}. ` +
        `Required: lifecycle_version = 2. Run /migrate to upgrade.`
      );
    } else {
      errors.push(`Unknown lifecycle_version: ${state.lifecycle_version}`);
    }
  }

  // 2. Validate required fields exist
  for (const field of REQUIRED_STATE_FIELDS) {
    if (!(field in state)) {
      errors.push(`State file missing required field: '${field}'`);
    }
  }

  // 3. Validate current_phase is canonical
  if ('current_phase' in state && !VALID_CURRENT_PHASES.includes(state.current_phase)) {
    errors.push(
      `Invalid phase name: '${state.current_phase}'. ` +
      `Allowed: ${VALID_CURRENT_PHASES.filter(Boolean).join(', ')}. ` +
      `Legacy numbered phases (p1-p6) are not valid in v2.`
    );
  }

  // 4. Validate active_track is canonical
  if ('active_track' in state && !CANONICAL_TRACKS.includes(state.active_track)) {
    errors.push(
      `Invalid track: '${state.active_track}'. ` +
      `Allowed: ${CANONICAL_TRACKS.filter(Boolean).join(', ')}`
    );
  }

  // 5. Validate workflow_status
  if ('workflow_status' in state && !VALID_WORKFLOW_STATUSES.includes(state.workflow_status)) {
    errors.push(`Invalid workflow_status: '${state.workflow_status}'`);
  }

  // 6. Validate phase_status map
  if (state.phase_status && typeof state.phase_status === 'object') {
    // Validate keys
    for (const key of Object.keys(state.phase_status)) {
      if (!CANONICAL_PHASES.includes(key)) {
        errors.push(
          `Invalid phase_status key: '${key}'. Must be a canonical v2 phase name.`
        );
      }
    }
    // Validate values
    for (const [key, value] of Object.entries(state.phase_status)) {
      if (!VALID_PHASE_STATUS_VALUES.includes(value)) {
        errors.push(`Invalid phase_status value for ${key}: '${value}'`);
      }
    }
  }

  // 7. Validate audience_status map
  if (state.audience_status && typeof state.audience_status === 'object') {
    // Validate required keys exist
    for (const key of REQUIRED_AUDIENCE_KEYS) {
      if (!(key in state.audience_status)) {
        errors.push(`audience_status missing required key: '${key}'`);
      }
    }
    // Validate values
    for (const [key, value] of Object.entries(state.audience_status)) {
      if (!VALID_AUDIENCE_STATUS_VALUES.includes(value)) {
        errors.push(`Invalid audience_status value for ${key}: '${value}'`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Load and validate state.yaml.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {object} [options]
 * @param {string} [options.statePath] - Override state file path (relative to projectRoot)
 * @returns {object} Validated state object
 * @throws {StateError} If file missing, unparseable, or schema invalid
 */
function readState(projectRoot, options = {}) {
  const statePath = path.resolve(projectRoot, options.statePath || DEFAULT_STATE_PATH);

  // 1. Check file exists
  if (!fs.existsSync(statePath)) {
    throw new StateError(
      `State file not found at: ${statePath}`,
      'STATE_NOT_FOUND',
      { path: statePath }
    );
  }

  // 2. Load YAML
  let raw;
  try {
    raw = fs.readFileSync(statePath, 'utf8');
  } catch (err) {
    throw new StateError(
      `Cannot read state file: ${err.message}`,
      'STATE_READ_ERROR',
      { path: statePath, cause: err }
    );
  }

  let state;
  try {
    state = yaml.load(raw);
  } catch (err) {
    throw new StateError(
      `State file is not valid YAML: ${err.message}`,
      'STATE_PARSE_ERROR',
      { path: statePath, cause: err }
    );
  }

  // 3. Validate schema
  const { valid, errors } = validateState(state);
  if (!valid) {
    throw new StateError(
      `State validation failed:\n${errors.map(e => `  ├── ${e}`).join('\n')}`,
      'STATE_VALIDATION_ERROR',
      { path: statePath, errors }
    );
  }

  // Attach metadata
  state._resolvedPath = statePath;
  return state;
}

// ─── Write ──────────────────────────────────────────────────────────────────

/**
 * Save state to state.yaml. Validates before writing.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {object} state - State object to write
 * @param {object} [options]
 * @param {string} [options.statePath] - Override state file path (relative to projectRoot)
 * @param {string[]} [options.changedFields] - Which fields changed (for dual-write)
 * @returns {{ written: boolean, dualWritePerformed: boolean }}
 * @throws {StateError} If validation fails or write error
 */
function writeState(projectRoot, state, options = {}) {
  const statePath = path.resolve(projectRoot, options.statePath || DEFAULT_STATE_PATH);

  // 1. Remove internal metadata before validation
  const stateToValidate = { ...state };
  delete stateToValidate._resolvedPath;

  // 2. Validate
  const { valid, errors } = validateState(stateToValidate);
  if (!valid) {
    throw new StateError(
      `Cannot write invalid state:\n${errors.map(e => `  ├── ${e}`).join('\n')}`,
      'STATE_WRITE_VALIDATION_ERROR',
      { path: statePath, errors }
    );
  }

  // 3. Update timestamp
  stateToValidate.last_activity = new Date().toISOString();

  // 4. Serialize to YAML (with comment header)
  const header = '# v2 — Lifecycle Contract personal state\n';
  const yamlStr = header + yaml.dump(stateToValidate, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });

  // 5. Write file
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, yamlStr, 'utf8');
  } catch (err) {
    throw new StateError(
      `Failed to write state file: ${err.message}`,
      'STATE_WRITE_ERROR',
      { path: statePath, cause: err }
    );
  }

  // 6. Dual-write to initiative config if shared fields changed
  let dualWritePerformed = false;
  const changedFields = options.changedFields || [];
  const DUAL_WRITE_FIELDS = ['phase_status', 'current_phase'];
  const needsDualWrite = changedFields.some(f => DUAL_WRITE_FIELDS.includes(f));

  if (needsDualWrite && stateToValidate.active_initiative) {
    try {
      dualWritePerformed = _dualWriteToInitiative(
        projectRoot,
        stateToValidate.active_initiative,
        stateToValidate,
        changedFields
      );
    } catch (err) {
      // Dual-write failure is non-fatal but should be logged
      console.warn(`⚠️ Dual-write to initiative config failed: ${err.message}`);
    }
  }

  return { written: true, dualWritePerformed };
}

/**
 * Internal: Propagate shared fields from state to initiative config (dual-write).
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {object} state
 * @param {string[]} changedFields
 * @returns {boolean} true if dual-write was performed
 * @private
 */
function _dualWriteToInitiative(projectRoot, initiativeId, state, changedFields) {
  // Try to find initiative config (feature-level flat file first)
  const basePath = path.resolve(projectRoot, '_bmad-output/lens-work/initiatives');

  const candidates = [
    path.join(basePath, `${initiativeId}.yaml`),
    path.join(basePath, initiativeId, 'Service.yaml'),
    path.join(basePath, initiativeId, 'Domain.yaml'),
  ];

  let configPath = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      configPath = candidate;
      break;
    }
  }

  if (!configPath) {
    return false; // No initiative config found — not an error
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);

  if (!config || config.lifecycle_version !== 2) {
    return false;
  }

  let modified = false;

  if (changedFields.includes('phase_status') && state.phase_status) {
    config.phase_status = { ...config.phase_status, ...state.phase_status };
    modified = true;
  }

  if (changedFields.includes('current_phase')) {
    config.current_phase = state.current_phase;
    modified = true;
  }

  if (modified) {
    const yamlStr = yaml.dump(config, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
    fs.writeFileSync(configPath, yamlStr, 'utf8');
  }

  return modified;
}

// ─── Init ───────────────────────────────────────────────────────────────────

/**
 * Initialize a new state.yaml from the template.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {string} moduleRoot - Absolute path to the lens-work module root
 * @param {object} [options]
 * @param {string} [options.statePath] - Override state file path (relative to projectRoot)
 * @param {string} [options.templatePath] - Override template path (relative to moduleRoot)
 * @param {string} [options.userName] - Git user name (auto-detected if omitted)
 * @param {string} [options.userEmail] - Git user email (auto-detected if omitted)
 * @returns {object} The initialized state object
 * @throws {StateError} If state file already exists
 */
function initState(projectRoot, moduleRoot, options = {}) {
  const statePath = path.resolve(projectRoot, options.statePath || DEFAULT_STATE_PATH);
  const templatePath = path.resolve(moduleRoot, options.templatePath || DEFAULT_TEMPLATE_PATH);

  // 1. Check state file doesn't already exist
  if (fs.existsSync(statePath)) {
    throw new StateError(
      'State file already exists. Use writeState() to update.',
      'STATE_ALREADY_EXISTS',
      { path: statePath }
    );
  }

  // 2. Load template
  if (!fs.existsSync(templatePath)) {
    throw new StateError(
      `State template not found: ${templatePath}`,
      'TEMPLATE_NOT_FOUND',
      { path: templatePath }
    );
  }

  let state;
  try {
    const raw = fs.readFileSync(templatePath, 'utf8');
    state = yaml.load(raw);
  } catch (err) {
    throw new StateError(
      `Failed to load state template: ${err.message}`,
      'TEMPLATE_PARSE_ERROR',
      { path: templatePath, cause: err }
    );
  }

  // 3. Populate user context
  const userName = options.userName || _getGitConfig('user.name');
  const userEmail = options.userEmail || _getGitConfig('user.email');

  if (state.user) {
    state.user.name = userName;
    state.user.email = userEmail;
  }

  const now = new Date().toISOString();
  state.created_at = now;
  state.last_activity = now;

  // 4. Validate the initialized state
  const { valid, errors } = validateState(state);
  if (!valid) {
    throw new StateError(
      `Initialized state fails validation:\n${errors.map(e => `  ├── ${e}`).join('\n')}`,
      'INIT_VALIDATION_ERROR',
      { errors }
    );
  }

  // 5. Write state file
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const header = '# v2 — Lifecycle Contract personal state\n';
  const yamlStr = header + yaml.dump(state, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });
  fs.writeFileSync(statePath, yamlStr, 'utf8');

  return state;
}

/**
 * Get a git config value. Returns null if not available.
 * @param {string} key
 * @returns {string|null}
 * @private
 */
function _getGitConfig(key) {
  try {
    const { execSync } = require('node:child_process');
    return execSync(`git config ${key}`, { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Operations
  readState,
  writeState,
  initState,
  validateState,

  // Constants (exported for tests and downstream consumers)
  CANONICAL_PHASES,
  VALID_CURRENT_PHASES,
  CANONICAL_TRACKS,
  VALID_WORKFLOW_STATUSES,
  VALID_PHASE_STATUS_VALUES,
  VALID_AUDIENCE_STATUS_VALUES,
  REQUIRED_AUDIENCE_KEYS,
  REQUIRED_STATE_FIELDS,
  DEFAULT_STATE_PATH,

  // Error class
  StateError,
};
