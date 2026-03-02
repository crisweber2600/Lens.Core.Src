/**
 * @bmad-lens/lens-work
 *
 * Programmatic API for the LENS Workbench module.
 * Most consumers will use the CLI (`npx @bmad-lens/lens-work install`)
 * or import the installer for integration with bmad-method.
 */
const path = require('node:path');
const { install } = require('./_module-installer/installer');
const state = require('./lib/state');
const initiative = require('./lib/initiative');
const eventlog = require('./lib/eventlog');
// constitution, constitutionDisplay, constitutionStress have been migrated to
// the BMAD constitution skill and @lens/constitution agent. These lib files are
// deprecated. Kept here as stubs for backward compatibility ONLY.
// See: _bmad/lens-work/skills/constitution.md
// See: _bmad/lens-work/agents/constitution.md
const constitution = require('./lib/constitution');
const dualwrite = require('./lib/dualwrite');
const divergence = require('./lib/divergence');
const gitops = require('./lib/gitops');
const artifacts = require('./lib/artifacts');
const discovery = require('./lib/discovery');
const router = require('./lib/router');
const branchNaming = require('./lib/branch-naming');
const phaseBranch = require('./lib/phase-branch');
const pr = require('./lib/pr');
const cascade = require('./lib/cascade');
const gates = require('./lib/gates');
// constitutionDisplay is deprecated — see _bmad/lens-work/skills/constitution.md Part 6
// Kept as stub for backward compatibility only.
const constitutionDisplay = require('./lib/constitution-display');
const checklist = require('./lib/checklist');
const preconditions = require('./lib/preconditions');
const switchInit = require('./lib/switch');
const onboard = require('./lib/onboard');
const newInitiative = require('./lib/new-initiative');
const artifactChecks = require('./lib/artifact-checks');
const gateRecorder = require('./lib/gate-recorder');
const contextInjection = require('./lib/context-injection');
const status = require('./lib/status');
const gateFeedback = require('./lib/gate-feedback');
const phaseWorkflow = require('./lib/phase-workflow');
const sync = require('./lib/sync');
const fix = require('./lib/fix');
const reconstruct = require('./lib/reconstruct');
const dogfood = require('./lib/dogfood');
// constitutionStress is deprecated — see _bmad/lens-work/skills/constitution.md Part 9
// Kept as stub for backward compatibility only.
const constitutionStress = require('./lib/constitution-stress');
const gateEnforcement = require('./lib/gate-enforcement');

module.exports = {
  /**
   * State management operations (S-003).
   * @see lib/state.js
   */
  state,

  /**
   * Initiative config CRUD operations (S-004).
   * @see lib/initiative.js
   */
  initiative,

  /**
   * Event log operations (S-006).
   * @see lib/eventlog.js
   */
  eventlog,

  /**
   * Constitution loading and governance resolution (S-013).
   * @deprecated Migrated to constitution skill and @lens/constitution agent.
   * @see _bmad/lens-work/skills/constitution.md
   * @see _bmad/lens-work/agents/constitution.md
   */
  constitution,

  /**
   * Dual-write contract enforcement (S-005).
   * @see lib/dualwrite.js
   */
  dualwrite,

  /**
   * State divergence detection (S-007).
   * @see lib/divergence.js
   */
  divergence,

  /**
   * Git branch operations (S-008).
   * @see lib/gitops.js
   */
  gitops,

  /**
   * Artifact path resolution (S-017).
   * @see lib/artifacts.js
   */
  artifacts,

  /**
   * Initiative discovery scan (S-018).
   * @see lib/discovery.js
   */
  discovery,

  /**
   * Command-to-workflow routing (S-024).
   * @see lib/router.js
   */
  router,

  /**
   * Branch naming conventions (S-011).
   * @see lib/branch-naming.js
   */
  branchNaming,

  /**
   * Phase branch creation (S-009).
   * @see lib/phase-branch.js
   */
  phaseBranch,

  /**
   * Pull request generation (S-010).
   * @see lib/pr.js
   */
  pr,

  /**
   * Cascade merge operations (S-012).
   * @see lib/cascade.js
   */
  cascade,

  /**
   * Phase gate validation (S-015).
   * @see lib/gates.js
   */
  gates,

  /**
   * Constitution display formatting (S-016).
   * @deprecated Migrated to constitution skill (Part 6 — Display Formatting).
   * @see _bmad/lens-work/skills/constitution.md
   */
  constitutionDisplay,

  /**
   * Checklist extraction and tracking (S-021).
   * @see lib/checklist.js
   */
  checklist,

  /**
   * Phase precondition validation (S-025).
   * @see lib/preconditions.js
   */
  preconditions,

  /**
   * Initiative switching (S-019).
   * @see lib/switch.js
   */
  switchInit,

  /**
   * Onboarding workflow (S-020).
   * @see lib/onboard.js
   */
  onboard,

  /**
   * New initiative creation (S-034).
   * @see lib/new-initiative.js
   */
  newInitiative,

  /**
   * Artifact existence and quality checks (S-022).
   * @see lib/artifact-checks.js
   */
  artifactChecks,

  /**
   * Gate decision recording (S-023).
   * @see lib/gate-recorder.js
   */
  gateRecorder,

  /**
   * Agent context injection (S-026).
   * @see lib/context-injection.js
   */
  contextInjection,

  /**
   * Initiative status display (S-027).
   * @see lib/status.js
   */
  status,

  /**
   * Gate feedback formatting (S-028).
   * @see lib/gate-feedback.js
   */
  gateFeedback,

  /**
   * Phase workflow orchestration (S-029–S-033).
   * @see lib/phase-workflow.js
   */
  phaseWorkflow,

  /**
   * State synchronization and drift repair (S-035).
   * @see lib/sync.js
   */
  sync,

  /**
   * Broken state diagnosis and repair (S-036).
   * @see lib/fix.js
   */
  fix,

  /**
   * State reconstruction from git history (S-037).
   * @see lib/reconstruct.js
   */
  reconstruct,

  /**
   * Self-referential validation (S-038).
   * @see lib/dogfood.js
   */
  dogfood,

  /**
   * Constitution stress testing (S-039).
   * @deprecated Migrated to constitution skill (Part 9 — Edge Cases and Validation).
   * @see _bmad/lens-work/skills/constitution.md
   */
  constitutionStress,

  /**
   * End-to-end gate enforcement (S-040).
   * @see lib/gate-enforcement.js
   */
  gateEnforcement,

  /**
   * Run the lens-work module installer programmatically.
   *
   * @param {object} options
   * @param {string} options.projectRoot - Absolute path to the BMAD control repo
   * @param {object} [options.config]    - Answers to install_questions from module.yaml
   * @param {string[]} [options.installedIDEs] - IDE identifiers for platform config
   * @param {object} [options.logger]    - Logger with .log(), .warn(), .error()
   * @returns {Promise<boolean>} true on success
   */
  install,

  /**
   * Resolve the absolute path to the module's assets directory.
   * Useful when other tools need to locate agents, workflows, etc.
   *
   * @returns {string}
   */
  getModuleRoot() {
    return __dirname;
  },

  /**
   * Return the parsed module.yaml manifest.
   *
   * @returns {object}
   */
  getManifest() {
    const yaml = require('js-yaml');
    const fs = require('node:fs');
    const manifestPath = path.join(__dirname, 'module.yaml');
    return yaml.load(fs.readFileSync(manifestPath, 'utf8'));
  },
};
