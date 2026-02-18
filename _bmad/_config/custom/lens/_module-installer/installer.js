const fs = require('node:fs/promises');
const path = require('node:path');
let chalk;
try {
    chalk = require('chalk');
} catch {
    chalk = {
        blue: (message) => message,
        yellow: (message) => message,
        green: (message) => message,
        red: (message) => message,
        gray: (message) => message,
    };
}

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function copyRecursive(sourcePath, targetPath, overwrite = false) {
    try {
        const stats = await fs.stat(sourcePath);
        if (stats.isDirectory()) {
            await ensureDir(targetPath);
            const entries = await fs.readdir(sourcePath, { withFileTypes: true });
            for (const entry of entries) {
                const entrySource = path.join(sourcePath, entry.name);
                const entryTarget = path.join(targetPath, entry.name);
                if (entry.isDirectory()) {
                    await copyRecursive(entrySource, entryTarget, overwrite);
                } else if (entry.isFile()) {
                    const targetExists = await pathExists(entryTarget);
                    if (overwrite || !targetExists) {
                        await fs.copyFile(entrySource, entryTarget);
                    }
                } else if (entry.isSymbolicLink()) {
                    const targetExists = await pathExists(entryTarget);
                    if (overwrite || !targetExists) {
                        const linkTarget = await fs.readlink(entrySource);
                        try {
                            await fs.unlink(entryTarget);
                        } catch (e) {
                            // ignore if target doesn't exist
                        }
                        await fs.symlink(linkTarget, entryTarget);
                    }
                }
            }
            return;
        }

        await ensureDir(path.dirname(targetPath));
        const targetExists = await pathExists(targetPath);
        if (overwrite || !targetExists) {
            await fs.copyFile(sourcePath, targetPath);
        }
    } catch (error) {
        throw new Error(`Failed to copy from ${sourcePath} to ${targetPath}: ${error.message}`);
    }
}

/**
 * Lens Module Installer
 *
 * Handles:
 * - Creating output directories (state, events, dashboards, initiatives)
 * - Setting up config file
 * - Initializing empty state
 * - Copying Copilot instructions to .github/
 * - IDE-specific configuration
 */
async function install(options) {
    const { projectRoot, config, installedIDEs, logger } = options;
    // Normalize project root to handle both Unix and Windows paths
    const normalizedRoot = path.resolve(projectRoot);

    try {
        logger.log(chalk.blue('Installing Lens...'));

        // Create lens output directory
        const outputDir = path.join(normalizedRoot, '_bmad-output', 'lens');
        if (!(await pathExists(outputDir))) {
            logger.log(chalk.yellow('Creating output directory: _bmad-output/lens/'));
            await ensureDir(outputDir);
        }

        // Create subdirectories
        const subdirs = ['dashboards', 'initiatives', 'profiles', 'snapshots', 'archive'];
        for (const subdir of subdirs) {
            const subdirPath = path.join(outputDir, subdir);
            if (!(await pathExists(subdirPath))) {
                await ensureDir(subdirPath);
            }
        }

        // Create Docs output directory if specified
        if (config['docs_output_path']) {
            const docsPath = config['docs_output_path'].replace('{project-root}/', '');
            const docsDir = path.join(normalizedRoot, docsPath);
            if (!(await pathExists(docsDir))) {
                logger.log(chalk.yellow(`Creating docs directory: ${docsPath}/`));
                await ensureDir(docsDir);
            }
        }

        // Create lens config file
        const configDir = path.join(normalizedRoot, '_bmad', 'lens');
        if (!(await pathExists(configDir))) {
            await ensureDir(configDir);
        }

        const configFile = path.join(configDir, 'config.yaml');
        if (!(await pathExists(configFile))) {
            const audiences = config['default_audiences'] || 'small,medium,large';
            const configContent = `# Lens Configuration
# Generated during installation

# TargetProjects path (where repos are cloned)
target_projects_path: "${config['target_projects_path'] || '../TargetProjects'}"

# Docs output path
docs_output_path: "${config['docs_output_path'] || 'Docs'}"

# Telemetry settings
telemetry:
  enabled: ${config['enable_telemetry'] === true}

# Discovery settings
discovery:
  depth: ${config['discovery_depth'] || 'shallow'}

# JIRA integration
jira:
  enabled: ${config['enable_jira_integration'] === true}

# Git settings
git:
  default_remote: "${config['default_git_remote'] || 'origin'}"
  fetch_strategy: background
  fetch_ttl: 60

# Default audiences for new initiatives
default_audiences:
${audiences.split(',').map(a => `  - ${a.trim()}`).join('\n')}
`;
            logger.log(chalk.yellow('Creating lens config file'));
            await fs.writeFile(configFile, configContent);
        }

        // Initialize empty state file
        const stateFile = path.join(outputDir, 'state.yaml');
        if (!(await pathExists(stateFile))) {
            const stateContent = `# Lens State
# Auto-managed by Lens — do not edit manually
# Use /sync, /fix, or /override for state repairs

lens_contract_version: "2.0"
active_initiative: null
background_errors: []
workflow_status: idle
`;
            await fs.writeFile(stateFile, stateContent);
        }

        // Initialize empty event log
        const eventLogFile = path.join(outputDir, 'event-log.jsonl');
        if (!(await pathExists(eventLogFile))) {
            await fs.writeFile(eventLogFile, '');
        }

        // Install prompt files into _bmad/lens/prompts
        const sourcePromptsDir = path.join(__dirname, '..', 'prompts');
        const targetPromptsDir = path.join(normalizedRoot, '_bmad', 'lens', 'prompts');
        const githubPromptsDir = path.join(normalizedRoot, '.github', 'prompts');
        try {
            if (await pathExists(sourcePromptsDir)) {
                // Install to _bmad/lens/prompts
                await ensureDir(targetPromptsDir);
                logger.log(chalk.yellow('Installing Lens prompts to _bmad/lens/prompts/'));
                await copyRecursive(sourcePromptsDir, targetPromptsDir, true);
                
                // Install to .github/prompts for release
                await ensureDir(githubPromptsDir);
                logger.log(chalk.yellow('Installing Lens prompts to .github/prompts/'));
                await copyRecursive(sourcePromptsDir, githubPromptsDir, true);
                
                logger.log(chalk.green('✓ Lens prompts installed'));
            } else {
                logger.warn(chalk.yellow(`Warning: Prompts source not found at ${sourcePromptsDir}`));
            }
        } catch (copyError) {
            logger.warn(chalk.yellow(`Warning: Could not install prompts: ${copyError.message}`));
        }

        // Copy copilot instructions to .github folder
        const sourceInstructionsFile = path.join(__dirname, '..', 'docs', 'copilot-instructions.md');
        const githubDir = path.join(normalizedRoot, '.github');
        const targetInstructionsFile = path.join(githubDir, 'lens-instructions.md');

        try {
            if (await pathExists(sourceInstructionsFile)) {
                if (!(await pathExists(githubDir))) {
                    await ensureDir(githubDir);
                }
                logger.log(chalk.yellow('Installing Copilot instructions to .github/'));
                await copyRecursive(sourceInstructionsFile, targetInstructionsFile, true);

                if (await pathExists(targetInstructionsFile)) {
                    logger.log(chalk.green('✓ Copilot instructions installed'));
                } else {
                    logger.warn(chalk.yellow('Warning: Could not verify Copilot instructions file'));
                }
            } else {
                logger.warn(chalk.yellow(`Warning: Copilot instructions source not found at ${sourceInstructionsFile}`));
            }
        } catch (copyError) {
            logger.warn(chalk.yellow(`Warning: Could not install Copilot instructions: ${copyError.message}`));
        }

        // IDE-specific configuration
        if (installedIDEs && installedIDEs.length > 0) {
            for (const ide of installedIDEs) {
                await configureForIDE(ide, normalizedRoot, config, logger);
            }
        }

        logger.log(chalk.green('✓ Lens installation complete'));
        logger.log(chalk.gray('  Run "@lens /onboard" to get started'));
        return true;
    } catch (error) {
        logger.error(chalk.red(`Error installing Lens: ${error.message}`));
        return false;
    }
}

async function configureForIDE(ide, projectRoot, config, logger) {
    const platformSpecificPath = path.join(__dirname, 'platform-specifics', `${ide}.js`);

    try {
        if (await pathExists(platformSpecificPath)) {
            const platformHandler = require(platformSpecificPath);
            if (typeof platformHandler.install === 'function') {
                await platformHandler.install({ projectRoot, config, logger });
            }
        }
    } catch (error) {
        logger.warn(chalk.yellow(`Warning: Could not configure ${ide}: ${error.message}`));
    }
}

module.exports = { install };
