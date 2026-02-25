/**
 * Initiative Discovery Scan — S-018
 *
 * Scans _bmad-output/lens-work/initiatives/ for initiative configs,
 * cross-references with state.yaml, and detects orphans.
 *
 * @module lib/discovery
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default initiatives directory (relative to project root) */
const INITIATIVES_BASE = '_bmad-output/lens-work/initiatives';

/** Default state file path (relative to project root) */
const DEFAULT_STATE_PATH = '_bmad-output/lens-work/state.yaml';

/** Valid initiative layers in precedence order */
const LAYER_PRECEDENCE = Object.freeze(['domain', 'service', 'feature', 'repo']);

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class DiscoveryError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DiscoveryError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely load a YAML file. Returns null on any error.
 *
 * @param {string} filePath
 * @returns {object|null}
 */
function safeLoadYaml(filePath) {
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Determine if an initiative is "active" based on its phase_status.
 *
 * An initiative is active if it has at least one non-complete, non-null phase.
 *
 * @param {object} config
 * @returns {boolean}
 */
function isActive(config) {
  if (!config || !config.phase_status) return false;
  if (config.current_phase === 'dev') return true;

  const statuses = Object.values(config.phase_status);
  // Active if any phase is not-yet-complete (in_progress, pr_pending, blocked, null)
  return statuses.some((s) => s !== 'complete' && s !== 'passed');
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Scan the initiatives directory for all initiative configs.
 *
 * Supports flat files (*.yaml) and nested directories with
 * Service.yaml or Domain.yaml inside.
 *
 * @param {string} projectRoot - Absolute path to the BMAD control repo
 * @param {object} [options]
 * @param {string} [options.initiativesPath] - Override initiatives base path
 * @param {string} [options.statePath] - Override state file path
 * @param {string} [options.filterLayer] - Only return initiatives of this layer
 * @param {string} [options.filterTrack] - Only return initiatives of this track
 * @param {boolean} [options.activeOnly] - Only return active initiatives
 * @returns {Array<{id: string, name: string, track: string, phase: string, status: string, layer: string, isActive: boolean, configPath: string}>}
 */
function scanInitiatives(projectRoot, options = {}) {
  const basePath = path.resolve(projectRoot, options.initiativesPath || INITIATIVES_BASE);
  const stateRelPath = options.statePath || DEFAULT_STATE_PATH;
  const statePath = path.resolve(projectRoot, stateRelPath);

  if (!fs.existsSync(basePath)) {
    return [];
  }

  // Load state for cross-referencing
  let stateData = null;
  if (fs.existsSync(statePath)) {
    stateData = safeLoadYaml(statePath);
  }
  const activeInitiativeId = stateData?.active_initiative || null;

  const results = [];

  // Scan directory entries
  let entries;
  try {
    entries = fs.readdirSync(basePath, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    let configPath = null;
    let config = null;

    if (entry.isFile() && entry.name.endsWith('.yaml')) {
      // Flat initiative file
      configPath = path.join(basePath, entry.name);
      config = safeLoadYaml(configPath);
    } else if (entry.isDirectory()) {
      // Nested: check for Service.yaml or Domain.yaml
      const servicePath = path.join(basePath, entry.name, 'Service.yaml');
      const domainPath = path.join(basePath, entry.name, 'Domain.yaml');

      if (fs.existsSync(servicePath)) {
        configPath = servicePath;
        config = safeLoadYaml(servicePath);
      } else if (fs.existsSync(domainPath)) {
        configPath = domainPath;
        config = safeLoadYaml(domainPath);
      }
    }

    if (!config || !config.id) continue;

    const initiative = {
      id: config.id,
      name: config.name || config.id,
      track: config.track || 'unknown',
      phase: config.current_phase || null,
      status: _deriveStatus(config, activeInitiativeId),
      layer: config.layer || 'unknown',
      isActive: isActive(config),
      configPath,
    };

    // Apply filters
    if (options.filterLayer && initiative.layer !== options.filterLayer) continue;
    if (options.filterTrack && initiative.track !== options.filterTrack) continue;
    if (options.activeOnly && !initiative.isActive) continue;

    results.push(initiative);
  }

  // Sort by layer precedence, then by name
  results.sort((a, b) => {
    const layerA = LAYER_PRECEDENCE.indexOf(a.layer);
    const layerB = LAYER_PRECEDENCE.indexOf(b.layer);
    if (layerA !== layerB) return (layerA === -1 ? 999 : layerA) - (layerB === -1 ? 999 : layerB);
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Derive a human-readable status string for an initiative.
 *
 * @param {object} config
 * @param {string|null} activeInitiativeId
 * @returns {string}
 */
function _deriveStatus(config, activeInitiativeId) {
  if (config.id === activeInitiativeId) return 'active';

  const ps = config.phase_status;
  if (!ps || typeof ps !== 'object') return 'unknown';

  const values = Object.values(ps);
  if (values.every((v) => v === 'complete' || v === 'passed')) return 'complete';
  if (values.some((v) => v === 'blocked')) return 'blocked';
  if (values.some((v) => v === 'in_progress' || v === 'pr_pending')) return 'in_progress';

  return 'not_started';
}

/**
 * Detect orphan initiatives — configs with no matching state reference,
 * or state references with no matching config.
 *
 * @param {string} projectRoot
 * @param {object} [options]
 * @param {string} [options.initiativesPath]
 * @param {string} [options.statePath]
 * @returns {{ orphanConfigs: Array<{id: string, configPath: string}>, missingConfigs: string[] }}
 */
function detectOrphans(projectRoot, options = {}) {
  const stateRelPath = options.statePath || DEFAULT_STATE_PATH;
  const statePath = path.resolve(projectRoot, stateRelPath);

  // Get all scanned initiatives
  const allInitiatives = scanInitiatives(projectRoot, options);
  const scannedIds = new Set(allInitiatives.map((i) => i.id));

  // Load state
  let stateData = null;
  if (fs.existsSync(statePath)) {
    stateData = safeLoadYaml(statePath);
  }

  const orphanConfigs = [];
  const missingConfigs = [];

  // Configs not referenced by state
  const activeId = stateData?.active_initiative || null;
  for (const init of allInitiatives) {
    // An orphan is an initiative that is marked inactive and has no complete status
    // For now, we just flag initiatives that are not the active one and are not complete
    if (init.id !== activeId && init.status !== 'complete') {
      // Could be orphaned — depends on context
      // We only flag true orphans: initiatives with no phases started
      if (init.status === 'not_started' || init.status === 'unknown') {
        orphanConfigs.push({ id: init.id, configPath: init.configPath });
      }
    }
  }

  // State references a config that doesn't exist
  if (activeId && !scannedIds.has(activeId)) {
    missingConfigs.push(activeId);
  }

  return { orphanConfigs, missingConfigs };
}

/**
 * Get a brief summary of all initiatives for display.
 *
 * @param {string} projectRoot
 * @param {object} [options]
 * @returns {string}
 */
function formatSummary(projectRoot, options = {}) {
  const initiatives = scanInitiatives(projectRoot, options);

  if (initiatives.length === 0) {
    return '📋 No initiatives found.';
  }

  const lines = [`📋 Found ${initiatives.length} initiative(s):`];

  for (const init of initiatives) {
    const activeMarker = init.status === 'active' ? ' ★' : '';
    const phaseLabel = init.phase || '—';
    lines.push(
      `   ${activeMarker ? '→' : ' '} ${init.id} [${init.layer}/${init.track}] phase=${phaseLabel} status=${init.status}${activeMarker}`,
    );
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  INITIATIVES_BASE,
  LAYER_PRECEDENCE,
  DiscoveryError,
  scanInitiatives,
  detectOrphans,
  formatSummary,
  isActive,
  // Internal (for testing)
  safeLoadYaml,
  _deriveStatus,
};
