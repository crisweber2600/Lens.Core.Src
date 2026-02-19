/**
 * @bmad-lens/lens-work
 *
 * Programmatic API for the LENS Workbench module.
 * Most consumers will use the CLI (`npx @bmad-lens/lens-work install`)
 * or import the installer for integration with bmad-method.
 */
const path = require('node:path');
const { install } = require('./_module-installer/installer');

module.exports = {
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
