/**
 * State Divergence Detection — S-007
 *
 * Detects when shared fields in state.yaml and the active initiative
 * config have drifted out of sync. Provides a preflight guard that
 * workflows call before any mutation to ensure consistency.
 *
 * Source of truth hierarchy: git > event log > state files
 *
 * @module lib/divergence
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fields compared between state.yaml and initiative config */
const SHARED_FIELDS = Object.freeze(['phase_status', 'current_phase']);

/** Default paths */
const DEFAULT_STATE_PATH = '_bmad-output/lens-work/state.yaml';
const DEFAULT_INITIATIVES_PATH = '_bmad-output/lens-work/initiatives';

/** Divergence severity levels */
const SEVERITY = Object.freeze({
  /** Informational — fields present but values equal */
  NONE: 'none',
  /** Warning — values differ but may be intentional (e.g. stale timestamp) */
  WARNING: 'warning',
  /** Critical — shared contract fields differ */
  CRITICAL: 'critical',
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class DivergenceError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DivergenceError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deep-equal comparison for objects / primitives (suitable for YAML values).
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k, i) => k === keysB[i] && deepEqual(a[k], b[k]));
  }

  return false;
}

/**
 * Resolve the initiative config path (flat → nested fallback).
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {object} [opts]
 * @param {string} [opts.initiativesPath]
 * @returns {string|null}
 */
function resolveConfigPath(projectRoot, initiativeId, opts = {}) {
  const basePath = path.resolve(projectRoot, opts.initiativesPath || DEFAULT_INITIATIVES_PATH);

  const candidates = [
    path.join(basePath, `${initiativeId}.yaml`),
    path.join(basePath, initiativeId, 'Service.yaml'),
    path.join(basePath, initiativeId, 'Domain.yaml'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Load and parse a YAML file.
 *
 * @param {string} filePath
 * @returns {object}
 */
function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Detect divergence between state.yaml and the active initiative config.
 *
 * Compares all SHARED_FIELDS and returns a detailed report.
 *
 * @param {string} projectRoot - Absolute path to the BMAD control repo
 * @param {object} [options]
 * @param {string} [options.statePath] - Override state file relative path
 * @param {string} [options.initiativesPath] - Override initiatives base path
 * @param {string} [options.initiativeId] - Override initiative ID (else read from state)
 * @returns {{ divergent: boolean, severity: string, fields: Array<{field: string, stateValue: *, initValue: *, match: boolean}>, initiative: string|null, statePath: string, configPath: string|null }}
 * @throws {DivergenceError} If state file cannot be loaded
 */
function detectDivergence(projectRoot, options = {}) {
  const stateRelPath = options.statePath || DEFAULT_STATE_PATH;
  const statePath = path.resolve(projectRoot, stateRelPath);

  // 1. Load state.yaml
  if (!fs.existsSync(statePath)) {
    throw new DivergenceError(
      `State file not found: ${statePath}`,
      'STATE_NOT_FOUND',
      { statePath },
    );
  }

  const state = loadYaml(statePath);

  // 2. Determine active initiative
  const initiativeId = options.initiativeId || (state && state.active_initiative) || null;

  if (!initiativeId) {
    // No active initiative — nothing to diverge from
    return {
      divergent: false,
      severity: SEVERITY.NONE,
      fields: [],
      initiative: null,
      statePath,
      configPath: null,
    };
  }

  // 3. Resolve initiative config
  const configPath = resolveConfigPath(projectRoot, initiativeId, options);

  if (!configPath) {
    // Initiative referenced in state but config missing — critical
    return {
      divergent: true,
      severity: SEVERITY.CRITICAL,
      fields: [],
      initiative: initiativeId,
      statePath,
      configPath: null,
      error: `Initiative config not found for: ${initiativeId}`,
    };
  }

  let config;
  try {
    config = loadYaml(configPath);
  } catch (err) {
    throw new DivergenceError(
      `Failed to parse initiative config: ${configPath} — ${err.message}`,
      'CONFIG_PARSE_ERROR',
      { configPath, cause: err.message },
    );
  }

  // 4. Compare shared fields
  const fields = [];
  let hasDivergence = false;

  for (const field of SHARED_FIELDS) {
    const stateValue = state[field] !== undefined ? state[field] : null;
    const initValue = config[field] !== undefined ? config[field] : null;
    const match = deepEqual(stateValue, initValue);

    if (!match) {
      hasDivergence = true;
    }

    fields.push({ field, stateValue, initValue, match });
  }

  return {
    divergent: hasDivergence,
    severity: hasDivergence ? SEVERITY.CRITICAL : SEVERITY.NONE,
    fields,
    initiative: initiativeId,
    statePath,
    configPath,
  };
}

/**
 * Preflight consistency check. Throws if shared fields are divergent.
 *
 * Call this at the start of any workflow that mutates shared fields
 * to ensure the system is in a consistent state before proceeding.
 *
 * @param {string} projectRoot
 * @param {object} [options] - Same options as detectDivergence
 * @returns {{ ok: boolean, report: object }} On success
 * @throws {DivergenceError} If divergence detected (code: 'DIVERGENCE_DETECTED')
 */
function preflightCheck(projectRoot, options = {}) {
  const report = detectDivergence(projectRoot, options);

  if (report.divergent) {
    const divergentFields = report.fields
      .filter((f) => !f.match)
      .map((f) => `${f.field}: state=${JSON.stringify(f.stateValue)} vs init=${JSON.stringify(f.initValue)}`)
      .join('; ');

    const msg = report.error
      ? report.error
      : `State divergence detected for initiative '${report.initiative}': ${divergentFields}`;

    throw new DivergenceError(
      msg,
      'DIVERGENCE_DETECTED',
      {
        initiative: report.initiative,
        severity: report.severity,
        fields: report.fields,
      },
    );
  }

  return { ok: true, report };
}

/**
 * Generate a human-readable summary of a divergence report.
 *
 * @param {object} report - Output from detectDivergence
 * @returns {string}
 */
function formatReport(report) {
  if (!report.divergent) {
    if (!report.initiative) {
      return '✅ No active initiative — nothing to check.';
    }
    return `✅ State consistent for initiative '${report.initiative}'`;
  }

  const lines = [
    `❌ State divergence detected for initiative '${report.initiative}'`,
    `   Severity: ${report.severity}`,
  ];

  if (report.error) {
    lines.push(`   Error: ${report.error}`);
  }

  for (const f of report.fields) {
    const marker = f.match ? '✓' : '✗';
    lines.push(
      `   ${marker} ${f.field}: state=${JSON.stringify(f.stateValue)} | init=${JSON.stringify(f.initValue)}`,
    );
  }

  lines.push('   → Run /fix to resolve, or use dualWrite() for future mutations.');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  SHARED_FIELDS,
  SEVERITY,
  DivergenceError,
  detectDivergence,
  preflightCheck,
  formatReport,
  // Internal (exposed for testing)
  deepEqual,
  resolveConfigPath,
};
