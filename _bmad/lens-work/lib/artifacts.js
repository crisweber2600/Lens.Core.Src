/**
 * Artifact Path Resolution — S-017
 *
 * Resolves, checks existence, loads, and lists planning artifacts
 * for initiatives following the canonical path convention:
 *   Docs/{domain}/{service}/feature/{feature}/{artifact}.md
 *
 * @module lib/artifacts
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Canonical docs directory name (capital D per repo convention) */
const DOCS_DIR = 'Docs';

/** Standard planning artifact names */
const KNOWN_ARTIFACTS = Object.freeze([
  'product-brief',
  'prd',
  'architecture',
  'tech-decisions',
  'ux-spec',
  'stories',
  'sprint-plan',
  'epics',
]);

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class ArtifactError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ArtifactError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the docs base path for an initiative from its config.
 *
 * Uses the initiative config's `docs` object if available.
 * Falls back to: Docs/{domain}/{service}/feature/{feature}/
 *
 * @param {object} initConfig - Initiative config object
 * @param {object} [options]
 * @param {string} [options.docsDir] - Override docs directory name
 * @returns {string} Relative path segments (forward slashes, no project root)
 */
function buildDocsRelativePath(initConfig, options = {}) {
  const docsDir = options.docsDir || DOCS_DIR;

  // If initiative has explicit docs.path
  if (initConfig.docs && initConfig.docs.path) {
    // Normalize to use the correct docs dir casing
    const docPath = initConfig.docs.path;
    // Replace leading docs/ or Docs/ with correct one
    if (/^docs\//i.test(docPath)) {
      return docsDir + docPath.slice(4);
    }
    return docPath;
  }

  // Build from components
  const domain = initConfig.docs?.domain || initConfig.domain_prefix || initConfig.domain || '';
  const service = initConfig.docs?.service || initConfig.service_prefix || initConfig.service || '';
  const feature = initConfig.docs?.feature || initConfig.name || '';

  const segments = [docsDir];
  if (domain) segments.push(domain.toLowerCase());
  if (service) segments.push(service.toLowerCase());
  if (feature) {
    segments.push('feature');
    segments.push(feature.toLowerCase());
  }

  return segments.join('/');
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Resolve the absolute path to a planning artifact.
 *
 * @param {string} projectRoot - Absolute path to the BMAD control repo
 * @param {object} initConfig - Initiative config (or minimal {docs, domain_prefix, name})
 * @param {string} artifact - Artifact name (e.g. 'prd', 'architecture')
 * @param {object} [options]
 * @param {string} [options.extension] - File extension (default: '.md')
 * @param {string} [options.docsDir] - Override docs directory name
 * @returns {string} Absolute path to the artifact file
 */
function resolveArtifactPath(projectRoot, initConfig, artifact, options = {}) {
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new ArtifactError('projectRoot must be a non-empty string', 'INVALID_PROJECT_ROOT');
  }
  if (!initConfig || typeof initConfig !== 'object') {
    throw new ArtifactError('initConfig must be an object', 'INVALID_INIT_CONFIG');
  }
  if (!artifact || typeof artifact !== 'string') {
    throw new ArtifactError('artifact must be a non-empty string', 'INVALID_ARTIFACT');
  }

  const ext = options.extension || '.md';
  const relPath = buildDocsRelativePath(initConfig, options);
  const fileName = artifact.endsWith(ext) ? artifact : `${artifact}${ext}`;

  return path.resolve(projectRoot, relPath, fileName);
}

/**
 * Check if a planning artifact exists on disk.
 *
 * @param {string} projectRoot
 * @param {object} initConfig
 * @param {string} artifact
 * @param {object} [options]
 * @returns {boolean}
 */
function artifactExists(projectRoot, initConfig, artifact, options = {}) {
  try {
    const resolved = resolveArtifactPath(projectRoot, initConfig, artifact, options);
    return fs.existsSync(resolved);
  } catch {
    return false;
  }
}

/**
 * Load a planning artifact's content.
 *
 * @param {string} projectRoot
 * @param {object} initConfig
 * @param {string} artifact
 * @param {object} [options]
 * @returns {string} File content as UTF-8 string
 * @throws {ArtifactError} If artifact does not exist or cannot be read
 */
function loadArtifact(projectRoot, initConfig, artifact, options = {}) {
  const resolved = resolveArtifactPath(projectRoot, initConfig, artifact, options);

  if (!fs.existsSync(resolved)) {
    throw new ArtifactError(
      `Artifact not found: ${artifact} at ${resolved}`,
      'ARTIFACT_NOT_FOUND',
      { artifact, resolvedPath: resolved },
    );
  }

  try {
    return fs.readFileSync(resolved, 'utf8');
  } catch (err) {
    throw new ArtifactError(
      `Failed to read artifact: ${artifact} — ${err.message}`,
      'ARTIFACT_READ_ERROR',
      { artifact, resolvedPath: resolved, cause: err.message },
    );
  }
}

/**
 * List all artifacts found in the initiative's docs directory.
 *
 * @param {string} projectRoot
 * @param {object} initConfig
 * @param {object} [options]
 * @param {string} [options.extension] - Filter by extension (default: '.md')
 * @param {string} [options.docsDir]
 * @returns {Array<{name: string, path: string, exists: boolean}>}
 */
function listArtifacts(projectRoot, initConfig, options = {}) {
  const ext = options.extension || '.md';
  const relPath = buildDocsRelativePath(initConfig, options);
  const dirPath = path.resolve(projectRoot, relPath);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(ext))
      .map((e) => ({
        name: e.name.replace(ext, ''),
        path: path.join(dirPath, e.name),
        exists: true,
      }));
  } catch {
    return [];
  }
}

/**
 * Check which known artifacts exist for an initiative.
 *
 * @param {string} projectRoot
 * @param {object} initConfig
 * @param {object} [options]
 * @returns {Array<{artifact: string, exists: boolean, path: string}>}
 */
function checkKnownArtifacts(projectRoot, initConfig, options = {}) {
  return KNOWN_ARTIFACTS.map((artifact) => {
    const resolved = resolveArtifactPath(projectRoot, initConfig, artifact, options);
    return {
      artifact,
      exists: fs.existsSync(resolved),
      path: resolved,
    };
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  DOCS_DIR,
  KNOWN_ARTIFACTS,
  ArtifactError,
  buildDocsRelativePath,
  resolveArtifactPath,
  artifactExists,
  loadArtifact,
  listArtifacts,
  checkKnownArtifacts,
};
