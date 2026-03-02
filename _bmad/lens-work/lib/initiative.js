'use strict';

/**
 * Initiative Config CRUD — S-004: Create, Read, Update initiative configs
 *
 * Manages per-initiative configuration files at
 * _bmad-output/lens-work/initiatives/{id}.yaml (or nested for domain/service).
 *
 * @module lib/initiative
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// ─── Constants ──────────────────────────────────────────────────────────────

/** Valid initiative layers */
const VALID_LAYERS = ['domain', 'service', 'feature', 'repo'];

/** Valid track types (must match lifecycle.yaml) */
const CANONICAL_TRACKS = ['full', 'feature', 'tech-change', 'hotfix', 'spike'];

/** Canonical phase names */
const CANONICAL_PHASES = ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'];

/** Valid current_phase values (includes null and 'dev') */
const VALID_CURRENT_PHASES = [null, ...CANONICAL_PHASES, 'dev'];

/** Valid phase_status values */
const VALID_PHASE_STATUS_VALUES = [null, 'passed', 'blocked', 'complete', 'in_progress', 'pr_pending'];

/** Fields that can be updated via update-initiative */
const UPDATABLE_FIELDS = [
  'current_phase',
  'phase_status',
  'constitution_mode',
  'question_mode',
  'scope',
  'coupling',
  'docs',
  'target_repos',
  'last_activity',
];

/** Fields that cannot be changed after creation */
const PROTECTED_FIELDS = [
  'id',
  'lifecycle_version',
  'layer',
  'domain',
  'domain_prefix',
  'service',
  'service_prefix',
  'initiative_root',
  'track',
  'active_phases',
  'audiences',
  'created_at',
];

/** Required fields for initiative config */
const REQUIRED_FIELDS = [
  'id',
  'name',
  'layer',
  'domain',
  'domain_prefix',
  'track',
  'initiative_root',
  'active_phases',
  'phase_status',
];

/** Required fields for create-initiative input */
const REQUIRED_CREATE_FIELDS = [
  'initiative_id',
  'name',
  'layer',
  'domain',
  'domain_prefix',
  'track',
  'target_repos',
  'initiative_root',
];

/** Default base path for initiatives (relative to project root) */
const INITIATIVES_BASE = '_bmad-output/lens-work/initiatives';

/** Default template path (relative to module root) */
const DEFAULT_TEMPLATE_PATH = 'templates/initiative-template.yaml';

// ─── Errors ─────────────────────────────────────────────────────────────────

class InitiativeError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'InitiativeError';
    this.code = code;
    this.details = details;
  }
}

// ─── Path Resolution ────────────────────────────────────────────────────────

/**
 * Resolve the file path for an initiative config based on its layer.
 *
 * - Feature/Repo: initiatives/{id}.yaml (flat)
 * - Service: initiatives/{domain}/{service}/Service.yaml (nested)
 * - Domain: initiatives/{domain}/Domain.yaml (nested)
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} initiativeId - Initiative identifier
 * @param {string} layer - domain|service|feature|repo
 * @param {object} [opts] - Optional: domain_prefix, service_prefix for nested paths
 * @returns {string} Absolute file path
 */
function resolveInitiativePath(projectRoot, initiativeId, layer, opts = {}) {
  const basePath = path.resolve(projectRoot, INITIATIVES_BASE);

  if (!layer || !VALID_LAYERS.includes(layer)) {
    throw new InitiativeError(
      `Unknown initiative layer: '${layer}'. Expected: ${VALID_LAYERS.join(', ')}`,
      'INVALID_LAYER',
      { layer }
    );
  }

  switch (layer) {
    case 'feature':
    case 'repo':
      return path.join(basePath, `${initiativeId}.yaml`);
    case 'service': {
      // Use domain/service hierarchy from initiative config if available
      const domain = opts.domain_prefix || initiativeId;
      const service = opts.service_prefix || 'default';
      return path.join(basePath, domain, service, 'Service.yaml');
    }
    case 'domain': {
      const domain = opts.domain_prefix || initiativeId;
      return path.join(basePath, domain, 'Domain.yaml');
    }
    default:
      return path.join(basePath, `${initiativeId}.yaml`);
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate an initiative config object.
 *
 * @param {object} config - Initiative config
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateInitiative(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Initiative config must be a non-null object'] };
  }

  // 1. Validate lifecycle_version
  if (config.lifecycle_version !== 2) {
    if (config.lifecycle_version === 1 || config.lifecycle_version == null) {
      errors.push(
        `Legacy v1 initiative config detected — lifecycle_version = ${config.lifecycle_version ?? 'missing'}. ` +
        `Required: lifecycle_version = 2. Run /migrate to upgrade.`
      );
    } else {
      errors.push(`Unknown lifecycle_version: ${config.lifecycle_version}`);
    }
  }

  // 2. Validate required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in config)) {
      errors.push(`Initiative config missing required field: '${field}'`);
    }
  }

  // 3. Validate track
  if ('track' in config && !CANONICAL_TRACKS.includes(config.track)) {
    errors.push(`Invalid track: '${config.track}'. Allowed: ${CANONICAL_TRACKS.join(', ')}`);
  }

  // 4. Validate layer
  if ('layer' in config && !VALID_LAYERS.includes(config.layer)) {
    errors.push(`Invalid layer: '${config.layer}'. Allowed: ${VALID_LAYERS.join(', ')}`);
  }

  // 5. Validate current_phase
  if ('current_phase' in config && !VALID_CURRENT_PHASES.includes(config.current_phase)) {
    errors.push(`Invalid current_phase: '${config.current_phase}'`);
  }

  // 6. Validate phase_status keys match active_phases
  if (config.phase_status && config.active_phases) {
    for (const phase of config.active_phases) {
      if (!(phase in config.phase_status)) {
        errors.push(
          `phase_status missing key for active phase: '${phase}'. ` +
          `active_phases: [${config.active_phases}], phase_status keys: [${Object.keys(config.phase_status)}]`
        );
      }
    }
  }

  // 7. Validate phase_status values
  if (config.phase_status && typeof config.phase_status === 'object') {
    for (const [key, value] of Object.entries(config.phase_status)) {
      if (!VALID_PHASE_STATUS_VALUES.includes(value)) {
        errors.push(`Invalid phase_status value for ${key}: '${value}'`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Create ─────────────────────────────────────────────────────────────────

/**
 * Create a new initiative config from template.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} moduleRoot - Absolute path to lens-work module root
 * @param {object} input - Initiative creation parameters
 * @param {string} input.initiative_id - Unique identifier
 * @param {string} input.name - Human-readable name
 * @param {string} input.layer - domain|service|feature|repo
 * @param {string} input.domain - Domain name
 * @param {string} input.domain_prefix - Normalized domain prefix
 * @param {string} [input.service] - Service name
 * @param {string} [input.service_prefix] - Normalized service prefix
 * @param {string} input.track - full|feature|tech-change|hotfix|spike
 * @param {string[]} input.target_repos - Target repo names
 * @param {string} input.initiative_root - Root branch name
 * @param {string} [input.question_mode='interactive'] - interactive|batch
 * @param {object} [input.docs] - Documentation paths
 * @param {object} [input.lifecycle] - Parsed lifecycle.yaml (for deriving phases/audiences)
 * @returns {object} Created initiative config
 * @throws {InitiativeError}
 */
function createInitiative(projectRoot, moduleRoot, input) {
  // 1. Validate required input fields
  for (const field of REQUIRED_CREATE_FIELDS) {
    if (!input[field]) {
      throw new InitiativeError(
        `Missing required field for initiative creation: '${field}'`,
        'MISSING_FIELD',
        { field }
      );
    }
  }

  // 2. Validate layer
  if (!VALID_LAYERS.includes(input.layer)) {
    throw new InitiativeError(
      `Invalid layer: '${input.layer}'. Allowed: ${VALID_LAYERS.join(', ')}`,
      'INVALID_LAYER',
      { layer: input.layer }
    );
  }

  // 3. Validate track
  if (!CANONICAL_TRACKS.includes(input.track)) {
    throw new InitiativeError(
      `Invalid track: '${input.track}'. Allowed: ${CANONICAL_TRACKS.join(', ')}`,
      'INVALID_TRACK',
      { track: input.track }
    );
  }

  // 4. Resolve file path
  const configPath = resolveInitiativePath(projectRoot, input.initiative_id, input.layer, {
    domain_prefix: input.domain_prefix,
    service_prefix: input.service_prefix,
  });

  // 5. Check if already exists
  if (fs.existsSync(configPath)) {
    throw new InitiativeError(
      `Initiative config already exists at: ${configPath}`,
      'INITIATIVE_EXISTS',
      { path: configPath, id: input.initiative_id }
    );
  }

  // 6. Load template
  const templatePath = path.resolve(moduleRoot, DEFAULT_TEMPLATE_PATH);
  if (!fs.existsSync(templatePath)) {
    throw new InitiativeError(
      `Initiative template not found: ${templatePath}`,
      'TEMPLATE_NOT_FOUND',
      { path: templatePath }
    );
  }

  let config;
  try {
    config = yaml.load(fs.readFileSync(templatePath, 'utf8'));
  } catch (err) {
    throw new InitiativeError(
      `Failed to load initiative template: ${err.message}`,
      'TEMPLATE_PARSE_ERROR',
      { path: templatePath, cause: err }
    );
  }

  // 7. Derive active_phases and audiences from lifecycle or track defaults
  let activePhases, audiences;
  if (input.lifecycle && input.lifecycle.tracks && input.lifecycle.tracks[input.track]) {
    const trackConfig = input.lifecycle.tracks[input.track];
    activePhases = trackConfig.phases || [];
    audiences = trackConfig.audiences || [];
  } else {
    // Fallback: derive from track defaults
    activePhases = _getDefaultPhases(input.track);
    audiences = _getDefaultAudiences(input.track);
  }

  // 8. Populate config
  const now = new Date().toISOString();
  config.lifecycle_version = 2;
  config.id = input.initiative_id;
  config.name = input.name;
  config.layer = input.layer;
  config.domain = input.domain;
  config.domain_prefix = input.domain_prefix;
  config.service = input.service || null;
  config.service_prefix = input.service_prefix || null;
  config.target_repos = input.target_repos;
  config.initiative_root = input.initiative_root;
  config.track = input.track;
  config.active_phases = activePhases;
  config.audiences = audiences;
  config.question_mode = input.question_mode || 'interactive';
  config.scope = input.layer;
  config.coupling = 'none';
  config.constitution_mode = 'advisory';
  config.created_at = now;
  config.last_activity = now;
  config.current_phase = null;

  // 9. Initialize phase_status map
  config.phase_status = {};
  for (const phase of activePhases) {
    config.phase_status[phase] = null;
  }

  // 10. Set docs paths
  config.docs = input.docs || {
    path: null,
    domain: input.domain_prefix,
    service: input.service_prefix || null,
    repo: null,
  };

  // 11. Validate the config
  const { valid, errors } = validateInitiative(config);
  if (!valid) {
    throw new InitiativeError(
      `Created config fails validation:\n${errors.map(e => `  ├── ${e}`).join('\n')}`,
      'CREATE_VALIDATION_ERROR',
      { errors }
    );
  }

  // 12. Write config
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const yamlStr = yaml.dump(config, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  fs.writeFileSync(configPath, yamlStr, 'utf8');

  // Attach metadata
  config._resolvedPath = configPath;
  return config;
}

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Read and validate an initiative config by ID.
 * Auto-detects layer if not provided.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} initiativeId - Initiative identifier
 * @param {object} [options]
 * @param {string} [options.layer] - Specific layer to check (auto-detect if omitted)
 * @returns {object} Validated initiative config with _resolvedPath and _resolvedLayer
 * @throws {InitiativeError}
 */
function readInitiative(projectRoot, initiativeId, options = {}) {
  const basePath = path.resolve(projectRoot, INITIATIVES_BASE);
  let configPath = null;
  let detectedLayer = options.layer || null;

  if (detectedLayer) {
    // Direct lookup
    configPath = resolveInitiativePath(projectRoot, initiativeId, detectedLayer);
    if (!fs.existsSync(configPath)) {
      throw new InitiativeError(
        `Initiative config not found — ID: ${initiativeId}, Layer: ${detectedLayer}, Expected at: ${configPath}`,
        'INITIATIVE_NOT_FOUND',
        { id: initiativeId, layer: detectedLayer, path: configPath }
      );
    }
  } else {
    // Auto-detect: try feature first (flat file), then scan for nested
    const candidates = [
      { path: path.join(basePath, `${initiativeId}.yaml`), layer: 'feature' },
    ];

    // Also scan nested directories for Service.yaml and Domain.yaml  
    if (fs.existsSync(basePath)) {
      try {
        const entries = fs.readdirSync(basePath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const domainPath = path.join(basePath, entry.name, 'Domain.yaml');
            const serviceDirs = _listSubdirs(path.join(basePath, entry.name));

            candidates.push({ path: domainPath, layer: 'domain' });
            for (const subdir of serviceDirs) {
              candidates.push({
                path: path.join(basePath, entry.name, subdir, 'Service.yaml'),
                layer: 'service',
              });
            }
          }
        }
      } catch {
        // Ignore directory read errors
      }
    }

    for (const candidate of candidates) {
      if (fs.existsSync(candidate.path)) {
        // Check if this config matches the requested ID
        try {
          const raw = fs.readFileSync(candidate.path, 'utf8');
          const parsed = yaml.load(raw);
          if (parsed && parsed.id === initiativeId) {
            configPath = candidate.path;
            detectedLayer = candidate.layer;
            break;
          }
        } catch {
          // Skip unreadable files
        }
      }
    }

    if (!configPath) {
      throw new InitiativeError(
        `Initiative config not found for any layer — ID: ${initiativeId}`,
        'INITIATIVE_NOT_FOUND',
        { id: initiativeId }
      );
    }
  }

  // Load and parse
  let config;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(raw);
  } catch (err) {
    throw new InitiativeError(
      `Failed to parse initiative config: ${err.message}`,
      'INITIATIVE_PARSE_ERROR',
      { path: configPath, cause: err }
    );
  }

  // Validate
  const { valid, errors } = validateInitiative(config);
  if (!valid) {
    throw new InitiativeError(
      `Initiative config validation failed:\n${errors.map(e => `  ├── ${e}`).join('\n')}`,
      'INITIATIVE_VALIDATION_ERROR',
      { path: configPath, id: initiativeId, errors }
    );
  }

  // Verify ID matches
  if (config.id !== initiativeId) {
    throw new InitiativeError(
      `Initiative ID mismatch — requested: ${initiativeId}, found: ${config.id}`,
      'INITIATIVE_ID_MISMATCH',
      { requested: initiativeId, found: config.id, path: configPath }
    );
  }

  // Attach metadata
  config._resolvedPath = configPath;
  config._resolvedLayer = detectedLayer;
  return config;
}

// ─── Update ─────────────────────────────────────────────────────────────────

/**
 * Update specific fields in an initiative config.
 * Enforces validation, protected fields, and dual-write contract.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} initiativeId - Initiative identifier
 * @param {object} updates - Map of field names to new values
 * @param {object} [options]
 * @param {string} [options.layer] - Specific layer (auto-detect if omitted)
 * @returns {{ config: object, changedFields: string[] }}
 * @throws {InitiativeError}
 */
function updateInitiative(projectRoot, initiativeId, updates, options = {}) {
  // 1. Load current config
  const config = readInitiative(projectRoot, initiativeId, options);
  const configPath = config._resolvedPath;

  // 2. Validate update fields
  const changedFields = [];

  for (const field of Object.keys(updates)) {
    if (PROTECTED_FIELDS.includes(field)) {
      throw new InitiativeError(
        `Cannot update protected field: '${field}'`,
        'PROTECTED_FIELD',
        { field, protectedFields: PROTECTED_FIELDS }
      );
    }
    if (!UPDATABLE_FIELDS.includes(field)) {
      throw new InitiativeError(
        `Unknown field: '${field}'. Updatable: ${UPDATABLE_FIELDS.join(', ')}`,
        'UNKNOWN_FIELD',
        { field, updatableFields: UPDATABLE_FIELDS }
      );
    }
  }

  // 3. Apply updates with special handling
  for (const [field, value] of Object.entries(updates)) {
    if (field === 'phase_status') {
      // Partial map merge
      if (!value || typeof value !== 'object') {
        throw new InitiativeError(
          `phase_status must be an object, got: ${typeof value}`,
          'INVALID_PHASE_STATUS_TYPE',
          { type: typeof value }
        );
      }
      // Validate keys against active_phases
      for (const phaseKey of Object.keys(value)) {
        if (!config.active_phases.includes(phaseKey)) {
          throw new InitiativeError(
            `Cannot set phase_status for inactive phase: '${phaseKey}'. ` +
            `Active phases for track '${config.track}': [${config.active_phases}]`,
            'INACTIVE_PHASE',
            { phase: phaseKey, activePpases: config.active_phases }
          );
        }
      }
      // Validate values
      for (const [phaseKey, phaseValue] of Object.entries(value)) {
        if (!VALID_PHASE_STATUS_VALUES.includes(phaseValue)) {
          throw new InitiativeError(
            `Invalid phase_status value for ${phaseKey}: '${phaseValue}'`,
            'INVALID_PHASE_VALUE',
            { phase: phaseKey, value: phaseValue }
          );
        }
      }
      // Merge (partial — only overwrite specified keys)
      if (!config.phase_status) config.phase_status = {};
      Object.assign(config.phase_status, value);
      changedFields.push('phase_status');

    } else if (field === 'current_phase') {
      if (!VALID_CURRENT_PHASES.includes(value)) {
        throw new InitiativeError(
          `Invalid current_phase: '${value}'`,
          'INVALID_CURRENT_PHASE',
          { phase: value }
        );
      }
      config.current_phase = value;
      changedFields.push('current_phase');

    } else if (field === 'docs') {
      if (!value || typeof value !== 'object') {
        throw new InitiativeError(
          `docs must be an object, got: ${typeof value}`,
          'INVALID_DOCS_TYPE',
          { type: typeof value }
        );
      }
      config.docs = value;
      changedFields.push('docs');

    } else {
      config[field] = value;
      changedFields.push(field);
    }
  }

  // 4. Update timestamp
  config.last_activity = new Date().toISOString();

  // 5. Clean internal metadata before writing
  const configToWrite = { ...config };
  delete configToWrite._resolvedPath;
  delete configToWrite._resolvedLayer;

  // 6. Write updated config
  const yamlStr = yaml.dump(configToWrite, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  fs.writeFileSync(configPath, yamlStr, 'utf8');

  // 7. Dual-write to state.yaml if shared fields changed
  const DUAL_WRITE_FIELDS = ['phase_status', 'current_phase'];
  const needsDualWrite = changedFields.some(f => DUAL_WRITE_FIELDS.includes(f));

  if (needsDualWrite) {
    try {
      _dualWriteToState(projectRoot, initiativeId, config, changedFields);
    } catch {
      // Dual-write failure is non-fatal
    }
  }

  // Re-attach metadata
  config._resolvedPath = configPath;
  return { config, changedFields };
}

/**
 * Internal: Propagate shared fields from initiative config to state.yaml (dual-write).
 * @private
 */
function _dualWriteToState(projectRoot, initiativeId, config, changedFields) {
  const statePath = path.resolve(projectRoot, '_bmad-output/lens-work/state.yaml');
  if (!fs.existsSync(statePath)) return;

  const state = yaml.load(fs.readFileSync(statePath, 'utf8'));
  if (!state || state.active_initiative !== initiativeId) return;

  let modified = false;

  if (changedFields.includes('phase_status') && config.phase_status) {
    state.phase_status = { ...state.phase_status, ...config.phase_status };
    modified = true;
  }

  if (changedFields.includes('current_phase')) {
    state.current_phase = config.current_phase;
    modified = true;
  }

  if (modified) {
    state.last_activity = new Date().toISOString();
    const header = '# v2 — Lifecycle Contract personal state\n';
    const yamlStr = header + yaml.dump(state, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
    fs.writeFileSync(statePath, yamlStr, 'utf8');
  }
}

// ─── List ───────────────────────────────────────────────────────────────────

/**
 * Scan the initiatives directory and return all initiative configs.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {object} [filter]
 * @param {string} [filter.layer] - Filter by layer
 * @param {string} [filter.track] - Filter by track
 * @returns {object[]} Array of initiative summary objects
 */
function listInitiatives(projectRoot, filter = {}) {
  const basePath = path.resolve(projectRoot, INITIATIVES_BASE);
  const initiatives = [];

  if (!fs.existsSync(basePath)) return initiatives;

  // Scan flat YAML files (feature/repo layer)
  try {
    const entries = fs.readdirSync(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.yaml')) {
        try {
          const filePath = path.join(basePath, entry.name);
          const config = yaml.load(fs.readFileSync(filePath, 'utf8'));
          if (config && config.lifecycle_version === 2) {
            initiatives.push(_summarize(config, filePath));
          }
        } catch {
          // Skip unreadable files
        }
      }
    }

    // Scan nested directories (domain/service layer)
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(basePath, entry.name);

        // Check for Domain.yaml
        const domainPath = path.join(dirPath, 'Domain.yaml');
        if (fs.existsSync(domainPath)) {
          try {
            const config = yaml.load(fs.readFileSync(domainPath, 'utf8'));
            if (config && config.lifecycle_version === 2) {
              initiatives.push(_summarize(config, domainPath));
            }
          } catch { /* skip */ }
        }

        // Check subdirectories for Service.yaml
        const subdirs = _listSubdirs(dirPath);
        for (const subdir of subdirs) {
          const servicePath = path.join(dirPath, subdir, 'Service.yaml');
          if (fs.existsSync(servicePath)) {
            try {
              const config = yaml.load(fs.readFileSync(servicePath, 'utf8'));
              if (config && config.lifecycle_version === 2) {
                initiatives.push(_summarize(config, servicePath));
              }
            } catch { /* skip */ }
          }
        }
      }
    }
  } catch {
    // Base path not readable
  }

  // Apply filters
  let result = initiatives;
  if (filter.layer) {
    result = result.filter(i => i.layer === filter.layer);
  }
  if (filter.track) {
    result = result.filter(i => i.track === filter.track);
  }

  // Sort by layer precedence, then name
  const layerOrder = { domain: 0, service: 1, feature: 2, repo: 3 };
  result.sort((a, b) => {
    const layerDiff = (layerOrder[a.layer] || 9) - (layerOrder[b.layer] || 9);
    if (layerDiff !== 0) return layerDiff;
    return (a.name || '').localeCompare(b.name || '');
  });

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create summary object from initiative config */
function _summarize(config, filePath) {
  return {
    id: config.id,
    name: config.name,
    layer: config.layer,
    track: config.track,
    current_phase: config.current_phase,
    initiative_root: config.initiative_root,
    path: filePath,
  };
}

/** List subdirectories of a path */
function _listSubdirs(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return [];
  }
}

/** Get default phases for a track (fallback when lifecycle.yaml not provided) */
function _getDefaultPhases(track) {
  const defaults = {
    full: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'],
    feature: ['businessplan', 'techplan', 'devproposal', 'sprintplan'],
    'tech-change': ['techplan', 'sprintplan'],
    hotfix: ['techplan'],
    spike: ['preplan'],
  };
  return defaults[track] || defaults.full;
}

/** Get default audiences for a track (fallback when lifecycle.yaml not provided) */
function _getDefaultAudiences(track) {
  const defaults = {
    full: ['small', 'medium', 'large', 'base'],
    feature: ['small', 'medium', 'large', 'base'],
    'tech-change': ['small', 'medium', 'large', 'base'],
    hotfix: ['small', 'base'],
    spike: ['small'],
  };
  return defaults[track] || defaults.full;
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Operations
  createInitiative,
  readInitiative,
  updateInitiative,
  listInitiatives,
  validateInitiative,
  resolveInitiativePath,

  // Constants
  VALID_LAYERS,
  CANONICAL_TRACKS,
  CANONICAL_PHASES,
  UPDATABLE_FIELDS,
  PROTECTED_FIELDS,
  REQUIRED_FIELDS,
  INITIATIVES_BASE,

  // Error class
  InitiativeError,
};
