/**
 * @deprecated S-016 — Constitution Display (DEPRECATED)
 *
 * ⚠️  THIS FILE IS DEPRECATED AND SCHEDULED FOR REMOVAL.
 *
 * The display formatting logic previously implemented here has been
 * converted to a fully LLM-executable BMAD skill:
 *
 *   _bmad/lens-work/skills/constitution.md  (Part 6 — Display Formatting)
 *
 * The skill's Part 6 defines all display formats:
 *   - formatConstitution → skill Part 6 layer sections + RESOLVED section
 *   - getConstitutionSummary → skill Part 6 Status Summary format
 *
 * DO NOT add new callers of this module. Migrate existing callers to
 * use the constitution skill instructions instead.
 *
 * @module lib/constitution-display
 */

'use strict';


const constitution = require('./constitution');

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Format the constitution hierarchy for display.
 *
 * Shows each level's contributions and the final merged result.
 *
 * @param {string} projectRoot
 * @param {object} context - { domain, service, repo? }
 * @param {object} [options]
 * @param {string} [options.constitutionsDir]
 * @returns {string} Formatted display string
 */
function formatConstitution(projectRoot, context, options = {}) {
  const { chain, resolved } = constitution.loadHierarchy(projectRoot, context, options);

  const lines = [];
  lines.push('═══ Constitution — Resolved Governance ═══');
  lines.push('');

  // Show each level
  for (const layer of constitution.LAYERS) {
    const found = chain.find((c) => c.layer === layer);
    lines.push(`── ${layer.toUpperCase()} ──`);

    if (!found) {
      lines.push('  (none)');
    } else {
      const gov = found.governance;

      if (gov.permitted_tracks) {
        lines.push(`  permitted_tracks: [${gov.permitted_tracks.join(', ')}]`);
      }
      if (gov.required_gates && gov.required_gates.length > 0) {
        lines.push(`  required_gates: [${gov.required_gates.join(', ')}]`);
      }
      if (gov.additional_review_participants) {
        const phases = Object.keys(gov.additional_review_participants);
        if (phases.length > 0) {
          lines.push('  additional_review_participants:');
          for (const phase of phases) {
            const participants = gov.additional_review_participants[phase];
            lines.push(`    ${phase}: [${participants.join(', ')}]`);
          }
        }
      }
      if (!gov.permitted_tracks && !gov.required_gates?.length &&
          !Object.keys(gov.additional_review_participants || {}).length) {
        lines.push('  (no governance rules)');
      }
    }
    lines.push('');
  }

  // Show merged result
  lines.push('── RESOLVED (MERGED) ──');

  if (resolved.permitted_tracks !== null) {
    lines.push(`  permitted_tracks: [${resolved.permitted_tracks.join(', ')}]`);
  } else {
    lines.push('  permitted_tracks: (unrestricted)');
  }

  if (resolved.required_gates && resolved.required_gates.length > 0) {
    lines.push(`  required_gates: [${resolved.required_gates.join(', ')}]`);
  } else {
    lines.push('  required_gates: (none)');
  }

  if (resolved.additional_review_participants) {
    const phases = Object.keys(resolved.additional_review_participants);
    if (phases.length > 0) {
      lines.push('  additional_review_participants:');
      for (const phase of phases) {
        const participants = resolved.additional_review_participants[phase];
        lines.push(`    ${phase}: [${participants.join(', ')}]`);
      }
    } else {
      lines.push('  additional_review_participants: (none)');
    }
  }

  lines.push('');
  lines.push(`  layers_loaded: [${resolved.layers_loaded.join(', ')}]`);

  return lines.join('\n');
}

/**
 * Get a brief summary of the constitution for use in /status.
 *
 * @param {string} projectRoot
 * @param {object} context
 * @param {object} [options]
 * @returns {string}
 */
function getConstitutionSummary(projectRoot, context, options = {}) {
  const { chain, resolved } = constitution.loadHierarchy(projectRoot, context, options);

  if (chain.length === 0) {
    return 'No constitution files found — all gates pass by default.';
  }

  const parts = [];
  parts.push(`${chain.length} level(s) loaded: [${resolved.layers_loaded.join(', ')}]`);

  if (resolved.permitted_tracks !== null) {
    parts.push(`tracks: [${resolved.permitted_tracks.join(', ')}]`);
  }

  if (resolved.required_gates.length > 0) {
    parts.push(`${resolved.required_gates.length} gate(s)`);
  }

  return parts.join(' | ');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  formatConstitution,
  getConstitutionSummary,
};
