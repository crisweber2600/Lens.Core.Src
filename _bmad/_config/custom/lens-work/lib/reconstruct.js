/**
 * Reconstruct — S-037
 *
 * Reconstructs state from git history and file-system artifacts when
 * state.yaml, initiative configs, or event log are missing or corrupted.
 *
 * Forensic analysis:
 * - Scans branch topology for initiative branches
 * - Reads artifact metadata from planning artifact frontmatter
 * - Parses git log for lens-work commit messages
 * - Rebuilds timeline from commit dates
 *
 * @module lib/reconstruct
 */

'use strict';

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

class ReconstructError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ReconstructError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Git Forensics
// ---------------------------------------------------------------------------

/**
 * Discover initiative branches from git.
 *
 * Scans for branches matching the lens-work naming pattern:
 *   lens-{domain}-{service}-{feature}-{suffix}
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {string[]}
 */
function discoverBranches(opts = {}) {
  const execFn = opts.execFn || execSync;
  const cwd = opts.cwd || process.cwd();

  try {
    const raw = execFn('git branch -a --list "lens-*"', { cwd, encoding: 'utf8' }).trim();
    if (!raw) return [];
    return raw.split('\n').map(b => b.trim().replace(/^\*\s*/, '')).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Parse initiative ID from a branch name.
 *
 * @param {string} branchName
 * @returns {string|null}
 */
function parseInitiativeFromBranch(branchName) {
  // Pattern: lens-{domain}-{service}-{feature}-{hash}[-audience][-phase]
  const match = branchName.match(/^(lens-[\w-]+-[\w]+-[\w]+)(?:-(?:small|medium|large|base))?/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Scan git log for lens-work related commits.
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @param {number} [opts.limit=50]
 * @returns {Array<{ hash: string, date: string, message: string }>}
 */
function scanGitLog(opts = {}) {
  const execFn = opts.execFn || execSync;
  const cwd = opts.cwd || process.cwd();
  const limit = opts.limit || 50;

  try {
    const raw = execFn(
      `git log --all --oneline --grep="lens" --format="%H|%aI|%s" -n ${limit}`,
      { cwd, encoding: 'utf8' }
    ).trim();

    if (!raw) return [];

    return raw.split('\n').filter(Boolean).map(line => {
      const [hash, date, ...msgParts] = line.split('|');
      return { hash, date, message: msgParts.join('|') };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// File-System Forensics
// ---------------------------------------------------------------------------

/**
 * Scan for planning artifact frontmatter in Docs directory.
 *
 * @param {string} projectRoot
 * @returns {Array<{ file: string, frontmatter: object }>}
 */
function scanArtifactFrontmatter(projectRoot) {
  const docsDir = path.join(projectRoot, 'Docs');
  const results = [];

  if (!fs.existsSync(docsDir)) return results;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) {
            const frontmatter = yaml.load(fmMatch[1]);
            if (frontmatter && (frontmatter.initiative || frontmatter.phase || frontmatter.lens)) {
              results.push({ file: path.relative(projectRoot, fullPath), frontmatter });
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walk(docsDir);
  return results;
}

// ---------------------------------------------------------------------------
// Reconstruction
// ---------------------------------------------------------------------------

/**
 * Reconstruct initiative state from git history and file-system artifacts.
 *
 * @param {string} projectRoot
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {Function} [opts.execFn]
 * @returns {{ initiatives: object[], branches: string[], artifacts: object[], commits: object[], reconstructedState: object }}
 */
function reconstructState(projectRoot, opts = {}) {
  // 1. Discover branches
  const branches = discoverBranches(opts);

  // 2. Parse initiatives from branches
  const initiativeIds = [...new Set(branches.map(parseInitiativeFromBranch).filter(Boolean))];

  // 3. Scan git log
  const commits = scanGitLog(opts);

  // 4. Scan artifact frontmatter
  const artifacts = scanArtifactFrontmatter(projectRoot);

  // 5. Build reconstructed state
  const reconstructedState = {
    version: '2.0',
    reconstructed: true,
    reconstructed_at: new Date().toISOString(),
    initiatives: initiativeIds.map(id => ({
      id,
      branches: branches.filter(b => b.startsWith(id)),
      artifacts: artifacts.filter(a =>
        a.frontmatter.initiative === id || a.file.includes(id)
      ),
    })),
    commit_count: commits.length,
    branch_count: branches.length,
    artifact_count: artifacts.length,
  };

  return {
    initiatives: reconstructedState.initiatives,
    branches,
    artifacts,
    commits,
    reconstructedState,
  };
}

/**
 * Write reconstructed state to a recovery file.
 *
 * @param {string} projectRoot
 * @param {object} reconstructedState
 * @param {object} [opts]
 * @returns {string} Path to recovery file
 */
function writeRecoveryFile(projectRoot, reconstructedState, opts = {}) {
  const dir = path.join(projectRoot, '_bmad-output', 'lens-work');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const recoveryPath = path.join(dir, `recovery-${Date.now()}.yaml`);
  fs.writeFileSync(recoveryPath, yaml.dump(reconstructedState, { lineWidth: 120 }), 'utf8');

  return recoveryPath;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  ReconstructError,
  discoverBranches,
  parseInitiativeFromBranch,
  scanGitLog,
  scanArtifactFrontmatter,
  reconstructState,
  writeRecoveryFile,
};
