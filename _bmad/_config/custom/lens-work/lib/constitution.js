/**
 * Constitution Module (S-013)
 *
 * Loads constitution files from the four-level LENS hierarchy:
 *   org → domain → service → repo
 *
 * Resolution order is parent-first (additive inheritance).
 * Children can only ADD rules — never remove or weaken parent rules.
 *
 * Constitution files are Markdown with YAML frontmatter and
 * optional embedded YAML code blocks for structured config
 * (permitted_tracks, required_gates, additional_review_participants).
 *
 * Path pattern:
 *   _bmad-output/lens-work/constitutions/org/constitution.md
 *   _bmad-output/lens-work/constitutions/domain/{domain}/constitution.md
 *   _bmad-output/lens-work/constitutions/service/{domain}/{service}/constitution.md
 *   _bmad-output/lens-work/constitutions/repo/{domain}/{service}/{repo}/constitution.md
 *
 * @module lib/constitution
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONSTITUTIONS_DIR = '_bmad-output/lens-work/constitutions';

const LAYERS = Object.freeze(['org', 'domain', 'service', 'repo']);

const CONSTITUTION_FILENAME = 'constitution.md';

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the file path for a constitution at a given layer.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {string} layer - One of: org, domain, service, repo
 * @param {object} [context] - Hierarchy context
 * @param {string} [context.domain] - Domain name (required for domain+)
 * @param {string} [context.service] - Service name (required for service+)
 * @param {string} [context.repo] - Repo name (required for repo)
 * @param {string} [context.constitutionsDir] - Override constitutions base dir
 * @returns {string} Absolute path to the constitution file
 */
function resolveConstitutionPath(projectRoot, layer, context = {}) {
  if (!projectRoot) throw new Error('projectRoot is required');
  if (!LAYERS.includes(layer)) {
    throw new Error(`Invalid layer: "${layer}". Must be one of: ${LAYERS.join(', ')}`);
  }

  const baseDir = path.resolve(
    projectRoot,
    context.constitutionsDir || DEFAULT_CONSTITUTIONS_DIR,
  );

  switch (layer) {
    case 'org':
      return path.join(baseDir, 'org', CONSTITUTION_FILENAME);
    case 'domain':
      if (!context.domain) throw new Error('context.domain is required for domain layer');
      return path.join(baseDir, 'domain', context.domain, CONSTITUTION_FILENAME);
    case 'service':
      if (!context.domain) throw new Error('context.domain is required for service layer');
      if (!context.service) throw new Error('context.service is required for service layer');
      return path.join(baseDir, 'service', context.domain, context.service, CONSTITUTION_FILENAME);
    case 'repo':
      if (!context.domain) throw new Error('context.domain is required for repo layer');
      if (!context.service) throw new Error('context.service is required for repo layer');
      if (!context.repo) throw new Error('context.repo is required for repo layer');
      return path.join(baseDir, 'repo', context.domain, context.service, context.repo, CONSTITUTION_FILENAME);
    default:
      throw new Error(`Unhandled layer: ${layer}`);
  }
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a constitution Markdown file into structured data.
 *
 * Extracts:
 * - YAML frontmatter (between --- delimiters)
 * - Embedded YAML code blocks (```yaml ... ```)
 * - Raw Markdown body
 *
 * @param {string} content - Raw file content
 * @returns {{ frontmatter: object, yamlBlocks: object[], body: string }}
 */
function parseConstitution(content) {
  if (!content || typeof content !== 'string') {
    return { frontmatter: {}, yamlBlocks: [], body: '' };
  }

  let frontmatter = {};
  let body = content;

  // Extract YAML frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    try {
      frontmatter = yaml.load(fmMatch[1]) || {};
    } catch (e) {
      frontmatter = { _parseError: e.message };
    }
    body = content.slice(fmMatch[0].length).trim();
  }

  // Extract embedded YAML code blocks
  const yamlBlocks = [];
  const yamlBlockRegex = /```ya?ml\r?\n([\s\S]*?)```/g;
  let match;
  while ((match = yamlBlockRegex.exec(body)) !== null) {
    try {
      const parsed = yaml.load(match[1]);
      if (parsed && typeof parsed === 'object') {
        yamlBlocks.push(parsed);
      }
    } catch (e) {
      // Skip unparseable blocks
    }
  }

  return { frontmatter, yamlBlocks, body };
}

/**
 * Extract structured governance config from parsed constitution.
 *
 * Looks for these keys in YAML blocks:
 * - permitted_tracks
 * - required_gates
 * - additional_review_participants
 *
 * @param {{ frontmatter: object, yamlBlocks: object[] }} parsed
 * @returns {object} Governance config
 */
function extractGovernanceConfig(parsed) {
  const config = {
    layer: parsed.frontmatter.layer || null,
    name: parsed.frontmatter.name || null,
    inherits_from: parsed.frontmatter.inherits_from || null,
    permitted_tracks: null,
    required_gates: [],
    additional_review_participants: {},
  };

  for (const block of parsed.yamlBlocks) {
    if (block.permitted_tracks && Array.isArray(block.permitted_tracks)) {
      config.permitted_tracks = block.permitted_tracks;
    }
    if (block.required_gates && Array.isArray(block.required_gates)) {
      config.required_gates = [
        ...config.required_gates,
        ...block.required_gates.filter((g) => !config.required_gates.includes(g)),
      ];
    }
    if (block.additional_review_participants && typeof block.additional_review_participants === 'object') {
      for (const [phase, participants] of Object.entries(block.additional_review_participants)) {
        if (!config.additional_review_participants[phase]) {
          config.additional_review_participants[phase] = [];
        }
        for (const p of participants) {
          if (!config.additional_review_participants[phase].includes(p)) {
            config.additional_review_participants[phase].push(p);
          }
        }
      }
    }
  }

  return config;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/**
 * Load a single constitution file from a specific layer.
 *
 * Returns null if the file doesn't exist (missing levels contribute empty set).
 *
 * @param {string} projectRoot
 * @param {string} layer
 * @param {object} [context]
 * @returns {{ path: string, layer: string, raw: string, parsed: object, governance: object } | null}
 */
function loadConstitution(projectRoot, layer, context = {}) {
  const filePath = resolveConstitutionPath(projectRoot, layer, context);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseConstitution(raw);
  const governance = extractGovernanceConfig(parsed);

  return {
    path: filePath,
    layer,
    raw,
    parsed,
    governance,
  };
}

/**
 * Load the full constitution hierarchy for a given context.
 *
 * Resolves org → domain → service → repo in parent-first order.
 * Missing levels are skipped (no error).
 *
 * @param {string} projectRoot
 * @param {object} context - { domain, service?, repo? }
 * @param {object} [options]
 * @param {string} [options.constitutionsDir] - Override constitutions base dir
 * @returns {{ chain: object[], resolved: object }}
 */
function loadHierarchy(projectRoot, context = {}, options = {}) {
  const ctx = { ...context, ...options };
  const chain = [];

  // Always try org
  const org = loadConstitution(projectRoot, 'org', ctx);
  if (org) chain.push(org);

  // Domain (if context provides domain)
  if (ctx.domain) {
    const domain = loadConstitution(projectRoot, 'domain', ctx);
    if (domain) chain.push(domain);
  }

  // Service (if context provides service)
  if (ctx.domain && ctx.service) {
    const service = loadConstitution(projectRoot, 'service', ctx);
    if (service) chain.push(service);
  }

  // Repo (if context provides repo)
  if (ctx.domain && ctx.service && ctx.repo) {
    const repo = loadConstitution(projectRoot, 'repo', ctx);
    if (repo) chain.push(repo);
  }

  // Resolve effective governance by merging chain
  const resolved = mergeGovernance(chain);

  return { chain, resolved };
}

// ---------------------------------------------------------------------------
// Merging (Additive Inheritance)
// ---------------------------------------------------------------------------

/**
 * Merge governance from a constitution chain.
 *
 * Rules (per Article VII of the Lens domain constitution):
 * - permitted_tracks: INTERSECTION (most restrictive wins)
 * - required_gates: UNION (additive — more gates accumulate)
 * - additional_review_participants: UNION (additive per phase)
 *
 * @param {object[]} chain - Array of loaded constitutions
 * @returns {object} Merged governance config
 */
function mergeGovernance(chain) {
  const merged = {
    permitted_tracks: null,
    required_gates: [],
    additional_review_participants: {},
    layers_loaded: [],
  };

  for (const c of chain) {
    const gov = c.governance;
    merged.layers_loaded.push(c.layer);

    // permitted_tracks: INTERSECTION
    if (gov.permitted_tracks !== null) {
      if (merged.permitted_tracks === null) {
        merged.permitted_tracks = [...gov.permitted_tracks];
      } else {
        merged.permitted_tracks = merged.permitted_tracks.filter((t) =>
          gov.permitted_tracks.includes(t),
        );
      }
    }

    // required_gates: UNION
    for (const gate of gov.required_gates) {
      if (!merged.required_gates.includes(gate)) {
        merged.required_gates.push(gate);
      }
    }

    // additional_review_participants: UNION per phase
    for (const [phase, participants] of Object.entries(gov.additional_review_participants)) {
      if (!merged.additional_review_participants[phase]) {
        merged.additional_review_participants[phase] = [];
      }
      for (const p of participants) {
        if (!merged.additional_review_participants[phase].includes(p)) {
          merged.additional_review_participants[phase].push(p);
        }
      }
    }
  }

  return merged;
}

/**
 * Check if a track is permitted by the resolved governance.
 *
 * @param {object} resolved - Result of mergeGovernance
 * @param {string} track - Track to check
 * @returns {boolean}
 */
function isTrackPermitted(resolved, track) {
  if (resolved.permitted_tracks === null) return true; // No restrictions
  return resolved.permitted_tracks.includes(track);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  DEFAULT_CONSTITUTIONS_DIR,
  LAYERS,
  CONSTITUTION_FILENAME,

  // Path resolution
  resolveConstitutionPath,

  // Parsing
  parseConstitution,
  extractGovernanceConfig,

  // Loading
  loadConstitution,
  loadHierarchy,

  // Merging
  mergeGovernance,
  isTrackPermitted,
};
