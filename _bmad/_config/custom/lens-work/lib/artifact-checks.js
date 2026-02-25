/**
 * Artifact Existence Checks — S-022
 *
 * Checks each required artifact from the constitution's required_artifacts
 * for a given phase, reports missing artifacts, and updates checklist items.
 *
 * @module lib/artifact-checks
 */

'use strict';

const artifacts = require('./artifacts');
const checklist = require('./checklist');

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Check artifact existence for a phase and update checklist statuses.
 *
 * @param {string} projectRoot
 * @param {object} initConfig - Initiative config
 * @param {string} phase - Current phase
 * @param {object} resolved - Resolved constitution governance
 * @returns {{ checked: Array<{artifact: string, exists: boolean, path: string}>, missing: Array<{artifact: string, expectedPath: string}>, allPresent: boolean }}
 */
function checkPhaseArtifacts(projectRoot, initConfig, phase, resolved) {
  const checked = [];
  const missing = [];

  // Get required artifacts from constitution gates
  const requiredArtifacts = extractRequiredArtifacts(phase, resolved);

  for (const artifactName of requiredArtifacts) {
    const resolvedPath = artifacts.resolveArtifactPath(projectRoot, initConfig, artifactName);
    const exists = artifacts.artifactExists(projectRoot, initConfig, artifactName);

    checked.push({ artifact: artifactName, exists, path: resolvedPath });

    if (!exists) {
      missing.push({ artifact: artifactName, expectedPath: resolvedPath });
    }
  }

  // Also check for directory artifacts (e.g. stories/)
  const dirArtifacts = extractDirectoryArtifacts(phase, resolved);
  for (const dirName of dirArtifacts) {
    const dirPath = artifacts.resolveArtifactPath(projectRoot, initConfig, dirName, { extension: '' });
    const fs = require('node:fs');
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();

    checked.push({ artifact: dirName, exists, path: dirPath });
    if (!exists) {
      missing.push({ artifact: dirName, expectedPath: dirPath });
    }
  }

  return {
    checked,
    missing,
    allPresent: missing.length === 0,
  };
}

/**
 * Extract required artifact names from constitution gates for a phase.
 *
 * @param {string} phase
 * @param {object} resolved
 * @returns {string[]}
 */
function extractRequiredArtifacts(phase, resolved) {
  const result = [];
  if (!resolved || !resolved.required_gates) return result;

  for (const gate of resolved.required_gates) {
    if (typeof gate === 'object' && gate.phase === phase && gate.required_artifacts) {
      result.push(...gate.required_artifacts);
    } else if (typeof gate === 'string') {
      const artifactName = gate.replace(/-exists$/, '');
      if (artifacts.KNOWN_ARTIFACTS.includes(artifactName)) {
        result.push(artifactName);
      }
    }
  }

  return [...new Set(result)];
}

/**
 * Extract directory artifact names from constitution gates for a phase.
 *
 * @param {string} phase
 * @param {object} resolved
 * @returns {string[]}
 */
function extractDirectoryArtifacts(phase, resolved) {
  const result = [];
  if (!resolved || !resolved.required_gates) return result;

  for (const gate of resolved.required_gates) {
    if (typeof gate === 'object' && gate.phase === phase && gate.required_directories) {
      result.push(...gate.required_directories);
    }
  }

  return [...new Set(result)];
}

/**
 * Update checklist items with artifact existence check results.
 *
 * @param {object} checklistObj - Checklist with items array
 * @param {Array<{artifact: string, exists: boolean}>} checkResults
 * @returns {object} Updated checklist
 */
function updateChecklistWithArtifacts(checklistObj, checkResults) {
  const now = new Date().toISOString();
  const updatedItems = checklistObj.items.map((item) => {
    if (item.type !== 'artifact') return item;

    const artifactName = item.id.replace('artifact-', '');
    const result = checkResults.find((r) => r.artifact === artifactName);

    if (result) {
      return {
        ...item,
        status: result.exists ? checklist.ITEM_STATUS.PASSED : checklist.ITEM_STATUS.FAILED,
        detected_at: result.exists ? now : null,
      };
    }

    return item;
  });

  return { ...checklistObj, items: updatedItems };
}

/**
 * Format artifact check results for display.
 *
 * @param {Array<{artifact: string, exists: boolean, path: string}>} checked
 * @returns {string}
 */
function formatArtifactReport(checked) {
  const lines = ['Artifact Existence Check:'];
  for (const item of checked) {
    const icon = item.exists ? '✓' : '✗';
    lines.push(`  ${icon} ${item.artifact} — ${item.path}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  checkPhaseArtifacts,
  extractRequiredArtifacts,
  extractDirectoryArtifacts,
  updateChecklistWithArtifacts,
  formatArtifactReport,
};
