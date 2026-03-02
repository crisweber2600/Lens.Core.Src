/**
 * Branch Naming Validation — S-011
 *
 * Validates branch names against the LENS flat hyphen-separated naming
 * convention (TD-003). Rejects slashes, enforces lowercase + hyphens,
 * warns on MAX_PATH approach, and validates initiative ID suffix.
 *
 * @module lib/branch-naming
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum allowed branch name length (Windows MAX_PATH minus overhead) */
const MAX_BRANCH_LENGTH = 200;

/** Warning threshold for branch name length */
const WARN_BRANCH_LENGTH = 180;

/** Windows MAX_PATH for reference */
const WINDOWS_MAX_PATH = 260;

/** Valid branch name pattern: lowercase alphanumeric + hyphens only */
const VALID_BRANCH_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/** Initiative ID suffix pattern: exactly 6 alphanumeric characters */
const INITIATIVE_ID_PATTERN = /^[a-z0-9]{6}$/;

/** Canonical audience names */
const VALID_AUDIENCES = Object.freeze(['small', 'medium', 'large']);

/** Canonical phase names */
const VALID_PHASES = Object.freeze([
  'preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan',
]);

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class BranchNamingError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'BranchNamingError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Validate a branch name against LENS naming conventions.
 *
 * Rules:
 * 1. Lowercase alphanumeric + hyphens only
 * 2. No slashes (flat naming — TD-003)
 * 3. Warning when approaching MAX_PATH
 * 4. Initiative ID suffix must be exactly 6 characters
 *
 * @param {string} branchName - Branch name to validate
 * @param {object} [options]
 * @param {boolean} [options.requireInitiativeId] - Require 6-char initiative suffix
 * @param {number} [options.maxLength] - Override max branch length
 * @param {number} [options.warnLength] - Override warning threshold
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateBranchName(branchName, options = {}) {
  const errors = [];
  const warnings = [];
  const maxLen = options.maxLength || MAX_BRANCH_LENGTH;
  const warnLen = options.warnLength || WARN_BRANCH_LENGTH;

  if (!branchName || typeof branchName !== 'string') {
    return { valid: false, errors: ['Branch name must be a non-empty string'], warnings: [] };
  }

  const trimmed = branchName.trim();

  // 1. No slashes (flat naming)
  if (trimmed.includes('/')) {
    errors.push(
      `Branch name contains '/' — LENS uses flat hyphen-separated naming (TD-003). ` +
      `Use hyphens instead: '${trimmed.replace(/\//g, '-')}'`
    );
  }

  // 2. Lowercase alphanumeric + hyphens only
  if (!VALID_BRANCH_PATTERN.test(trimmed)) {
    const issues = [];
    if (/[A-Z]/.test(trimmed)) issues.push('uppercase characters');
    if (/[^a-z0-9/-]/.test(trimmed)) issues.push('special characters');
    if (trimmed.startsWith('-') || trimmed.endsWith('-')) issues.push('leading/trailing hyphens');
    if (trimmed.includes('--')) issues.push('consecutive hyphens');
    if (issues.length) {
      errors.push(`Branch name contains invalid characters: ${issues.join(', ')}`);
    }
  }

  // 3. Length checks
  if (trimmed.length > maxLen) {
    errors.push(
      `Branch name is ${trimmed.length} characters — exceeds maximum of ${maxLen}. ` +
      `Windows MAX_PATH is ${WINDOWS_MAX_PATH} and git adds overhead.`
    );
  } else if (trimmed.length > warnLen) {
    warnings.push(
      `Branch name is ${trimmed.length} characters — approaching maximum of ${maxLen}. ` +
      `Consider shorter names to avoid MAX_PATH issues on Windows.`
    );
  }

  // 4. Initiative ID suffix validation (optional)
  if (options.requireInitiativeId) {
    const parts = trimmed.split('-');
    const suffix = parts[parts.length - 1];
    if (!INITIATIVE_ID_PATTERN.test(suffix)) {
      errors.push(
        `Initiative ID suffix '${suffix}' must be exactly 6 lowercase alphanumeric characters`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Build a LENS-compliant initiative root branch name.
 *
 * Pattern: lens-{domain}-{service}-{feature}-{initiativeId}
 *
 * @param {object} params
 * @param {string} params.domain
 * @param {string} params.service
 * @param {string} params.feature
 * @param {string} params.initiativeId - 6-character ID
 * @returns {string} Branch name
 * @throws {BranchNamingError} If generated name is invalid
 */
function buildInitiativeRootName(params) {
  const { domain, service, feature, initiativeId } = params;
  if (!domain || !service || !feature || !initiativeId) {
    throw new BranchNamingError(
      'All params required: domain, service, feature, initiativeId',
      'MISSING_PARAMS',
      { params },
    );
  }

  const name = `lens-${domain}-${service}-${feature}-${initiativeId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const validation = validateBranchName(name, { requireInitiativeId: true });
  if (!validation.valid) {
    throw new BranchNamingError(
      `Generated branch name is invalid: ${validation.errors.join('; ')}`,
      'INVALID_GENERATED_NAME',
      { name, errors: validation.errors },
    );
  }

  return name;
}

/**
 * Build an audience branch name from initiative root.
 *
 * Pattern: {initiativeRoot}-{audience}
 *
 * @param {string} initiativeRoot
 * @param {string} audience - small | medium | large
 * @returns {string}
 */
function buildAudienceBranchName(initiativeRoot, audience) {
  if (!VALID_AUDIENCES.includes(audience)) {
    throw new BranchNamingError(
      `Invalid audience: '${audience}'. Must be: ${VALID_AUDIENCES.join(', ')}`,
      'INVALID_AUDIENCE',
      { audience },
    );
  }
  return `${initiativeRoot}-${audience}`;
}

/**
 * Build a phase branch name from audience branch.
 *
 * Pattern: {initiativeRoot}-{audience}-{phase}
 *
 * @param {string} initiativeRoot
 * @param {string} audience - small | medium | large
 * @param {string} phase - preplan | businessplan | techplan | devproposal | sprintplan
 * @returns {string}
 */
function buildPhaseBranchName(initiativeRoot, audience, phase) {
  if (!VALID_AUDIENCES.includes(audience)) {
    throw new BranchNamingError(
      `Invalid audience: '${audience}'. Must be: ${VALID_AUDIENCES.join(', ')}`,
      'INVALID_AUDIENCE',
      { audience },
    );
  }
  if (!VALID_PHASES.includes(phase)) {
    throw new BranchNamingError(
      `Invalid phase: '${phase}'. Must be: ${VALID_PHASES.join(', ')}`,
      'INVALID_PHASE',
      { phase },
    );
  }
  return `${initiativeRoot}-${audience}-${phase}`;
}

/**
 * Parse a branch name into its component parts.
 *
 * @param {string} branchName
 * @returns {{ root: string, audience: string|null, phase: string|null, initiativeId: string|null }}
 */
function parseBranchName(branchName) {
  if (!branchName) return { root: '', audience: null, phase: null, initiativeId: null };

  // Try to extract phase (last segment)
  const parts = branchName.split('-');
  const lastPart = parts[parts.length - 1];
  const secondLast = parts.length > 1 ? parts[parts.length - 2] : null;

  let phase = null;
  let audience = null;
  let root = branchName;

  // Check if last segment is a phase
  if (VALID_PHASES.includes(lastPart) && parts.length > 2) {
    phase = lastPart;
    const remaining = parts.slice(0, -1).join('-');
    // Check if second-to-last is an audience
    if (VALID_AUDIENCES.includes(secondLast)) {
      audience = secondLast;
      root = parts.slice(0, -2).join('-');
    } else {
      root = remaining;
    }
  } else if (VALID_AUDIENCES.includes(lastPart) && parts.length > 1) {
    audience = lastPart;
    root = parts.slice(0, -1).join('-');
  }

  // Extract initiative ID (last 6 chars of root)
  const rootParts = root.split('-');
  const rootLast = rootParts[rootParts.length - 1];
  const initiativeId = INITIATIVE_ID_PATTERN.test(rootLast) ? rootLast : null;

  return { root, audience, phase, initiativeId };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  MAX_BRANCH_LENGTH,
  WARN_BRANCH_LENGTH,
  WINDOWS_MAX_PATH,
  VALID_BRANCH_PATTERN,
  INITIATIVE_ID_PATTERN,
  VALID_AUDIENCES,
  VALID_PHASES,
  BranchNamingError,

  // Core API
  validateBranchName,
  buildInitiativeRootName,
  buildAudienceBranchName,
  buildPhaseBranchName,
  parseBranchName,
};
