const fs = require('node:fs/promises');
const path = require('node:path');

// fs-extra compatibility helpers using built-in node:fs
const fsHelpers = {
    async pathExists(p) {
        try { await fs.access(p); return true; } catch { return false; }
    },
    async ensureDir(p) {
        await fs.mkdir(p, { recursive: true });
    },
    async copy(src, dest) {
        await fs.copyFile(src, dest);
    },
    async writeFile(p, content) {
        await fs.writeFile(p, content, 'utf8');
    }
};

/**
 * Copy all files from srcDir to destDir, optionally skipping existing files.
 * Only copies files (not subdirectories).
 */
async function copyDirContents(srcDir, destDir, { skipExisting = true, logger } = {}) {
    await fsHelpers.ensureDir(destDir);
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    let copied = 0;
    let skipped = 0;
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const destPath = path.join(destDir, entry.name);
        if (skipExisting && await fsHelpers.pathExists(destPath)) {
            skipped++;
            continue;
        }
        await fsHelpers.copy(path.join(srcDir, entry.name), destPath);
        copied++;
    }
    return { copied, skipped };
}

/**
 * Copy pre-built stub prompts from prompts/stubs/ (shipped with the module)
 * into .github/stubPrompts/ in the target project.
 *
 * Stubs live in the module at prompts/stubs/ so they are version-controlled
 * and distributed without needing to be generated at install time.
 * They are always overwritten to stay in sync with the installed module version.
 */
async function installStubPrompts(moduleDir, stubsDest, { logger }) {
    const stubsSource = path.join(moduleDir, 'prompts', 'stubs');
    if (!(await fsHelpers.pathExists(stubsSource))) {
        logger.warn(`Warning: prompts/stubs/ not found in module — stub prompts not installed`);
        return 0;
    }
    await fsHelpers.ensureDir(stubsDest);
    const entries = await fs.readdir(stubsSource, { withFileTypes: true });
    let copied = 0;
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.prompt.md')) continue;
        await fsHelpers.copy(path.join(stubsSource, entry.name), path.join(stubsDest, entry.name));
        copied++;
    }
    return copied;
}

/**
 * Create _bmad-output/lens-work/settings.json.
 * Stores the GitHub repo reference so the onboarding workflow knows where
 * to clone stub prompts from. Skipped if the file already exists.
 */
async function createSettings(outputDir, { githubRepo, githubBranch, logger }) {
    const settingsPath = path.join(outputDir, 'settings.json');
    if (await fsHelpers.pathExists(settingsPath)) {
        logger.log('settings.json already exists — skipping');
        return;
    }
    const settings = {
        version: 1,
        github: {
            repo: githubRepo,
            branch: githubBranch,
            stubsSourcePath: '.github/prompts',
            stubsTargetPath: '.github/stubPrompts',
            cloneOnboardingStubsEnabled: true
        },
        'lens-work': {
            version: '1.0.0',
            installedDate: new Date().toISOString(),
            preferredQuestionMode: 'interactive',
            preferredTracker: 'none'
        }
    };
    logger.log('Creating settings.json');
    await fsHelpers.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * LENS Workbench Module Installer
 * 
 * Handles:
 * - Creating output directories
 * - Setting up TargetProjects path
 * - Configuring docs output path
 * - IDE-specific configuration
 */
async function install(options) {
    const { projectRoot, config, installedIDEs, logger } = options;

    // GitHub control repo — configurable, defaults to the canonical bmad.lens.release
    const githubRepo = config['github_repo'] || 'https://github.com/crisweber2600/bmad.lens.release';
    const githubBranch = config['github_branch'] || 'release/2.0.0';

    try {
        logger.log('Installing LENS Workbench (lens-work)...');

        // Create lens-work output directory
        const outputDir = path.join(projectRoot, '_bmad-output', 'lens-work');
        if (!(await fsHelpers.pathExists(outputDir))) {
            logger.log(`Creating output directory: _bmad-output/lens-work/`);
            await fsHelpers.ensureDir(outputDir);
        }

        // Create subdirectories
        const subdirs = ['dashboards', 'archive', 'snapshots'];
        for (const subdir of subdirs) {
            const subdirPath = path.join(outputDir, subdir);
            if (!(await fsHelpers.pathExists(subdirPath))) {
                await fsHelpers.ensureDir(subdirPath);
            }
        }

        // Create settings.json — stores github.repo so onboarding can clone stubs
        await createSettings(outputDir, { githubRepo, githubBranch, logger });

        // Create Docs output directory if specified
        if (config['docs_output_path']) {
            const docsPath = config['docs_output_path'].replace('{project-root}/', '');
            const docsDir = path.join(projectRoot, docsPath);
            if (!(await fsHelpers.pathExists(docsDir))) {
                logger.log(`Creating docs directory: ${docsPath}/`);
                await fsHelpers.ensureDir(docsDir);
            }
        }

        // Create lens-work config file
        const configDir = path.join(projectRoot, '_bmad', 'lens-work');
        if (!(await fsHelpers.pathExists(configDir))) {
            await fsHelpers.ensureDir(configDir);
        }

        const configFile = path.join(configDir, 'config.yaml');
        if (!(await fsHelpers.pathExists(configFile))) {
            const configContent = `# LENS Workbench Configuration
# Generated during installation

# TargetProjects path (where repos are cloned)
target_projects_path: "${config['target_projects_path'] || '../TargetProjects'}"

# Docs output path
docs_output_path: "${config['docs_output_path'] || 'Docs'}"

# Telemetry settings
telemetry:
  enabled: ${config['enable_telemetry'] !== false}
  dashboard_format: json  # json, html

# Git settings
git:
  default_remote: ${config['default_git_remote'] || 'github'}
  fetch_strategy: background
  fetch_ttl: 60

# Role gating (advisory by default)
role_gating:
  enabled: true
  mode: advisory  # advisory, enforced
`;
            logger.log('Creating lens-work config file');
            await fsHelpers.writeFile(configFile, configContent);
        }

        // Initialize empty state file
        const stateFile = path.join(outputDir, 'state.yaml');
        if (!(await fsHelpers.pathExists(stateFile))) {
            const stateContent = `# LENS Workbench State
# Auto-managed by lens-work - do not edit manually

version: 1
active_initiative: null
`;
            await fsHelpers.writeFile(stateFile, stateContent);
        }

        // GitHub Copilot-specific configuration
        if (installedIDEs && installedIDEs.includes('github-copilot')) {
            const githubDir = path.join(projectRoot, '.github');
            await fsHelpers.ensureDir(githubDir);

            // Copy copilot instructions to .github folder
            const sourceInstructionsFile = path.join(__dirname, '..', 'docs', 'copilot-instructions.md');
            const targetInstructionsFile = path.join(githubDir, 'lens-work-instructions.md');
            try {
                if (await fsHelpers.pathExists(sourceInstructionsFile)) {
                    logger.log('Installing Copilot instructions to .github/');
                    await fsHelpers.copy(sourceInstructionsFile, targetInstructionsFile);
                    if (await fsHelpers.pathExists(targetInstructionsFile)) {
                        logger.log('✓ Copilot instructions installed');
                    }
                } else {
                    logger.warn(`Warning: Copilot instructions source not found at ${sourceInstructionsFile}`);
                }
            } catch (copyError) {
                logger.warn(`Warning: Could not install Copilot instructions: ${copyError.message}`);
            }

            // Deploy prompt files to ../.github/prompts/ (sibling of projectRoot, i.e. bmad.lens.release/.github/prompts/)
            const promptsSource = path.join(__dirname, '..', 'prompts');
            const promptsDest = path.join(projectRoot, '..', '.github', 'prompts');
            try {
                if (await fsHelpers.pathExists(promptsSource)) {
                    logger.log('Installing Copilot prompt files to ../.github/prompts/');
                    const { copied, skipped } = await copyDirContents(promptsSource, promptsDest, {
                        skipExisting: true,
                        logger
                    });
                    logger.log(`✓ Copilot prompts: ${copied} installed, ${skipped} skipped (already exist)`);
                } else {
                    logger.warn(`Warning: Prompts source directory not found at ${promptsSource}`);
                }
            } catch (promptError) {
                logger.warn(`Warning: Could not install Copilot prompts: ${promptError.message}`);
            }

            // Install stub prompts from prompts/stubs/ (shipped with the module) to .github/stubPrompts/
            // Stubs are pre-built in the module so they are version-controlled and ready to copy.
            const stubsDest = path.join(githubDir, 'stubPrompts');
            try {
                logger.log('Installing stub prompts to .github/stubPrompts/');
                const copied = await installStubPrompts(path.join(__dirname, '..'), stubsDest, { logger });
                logger.log(`✓ Stub prompts: ${copied} installed to .github/stubPrompts/`);
            } catch (stubError) {
                logger.warn(`Warning: Could not install stub prompts: ${stubError.message}`);
            }
        }

        // Additional IDE-specific configuration
        if (installedIDEs && installedIDEs.length > 0) {
            for (const ide of installedIDEs) {
                await configureForIDE(ide, projectRoot, config, logger);
            }
        }

        logger.log('✓ LENS Workbench installation complete');
        logger.log('  Run "@lens-work onboard" to get started');
        return true;
    } catch (error) {
        logger.error(`Error installing lens-work: ${error.message}`);
        return false;
    }
}

async function configureForIDE(ide, projectRoot, config, logger) {
    const platformSpecificPath = path.join(__dirname, 'platform-specifics', `${ide}.js`);

    try {
        if (await fsHelpers.pathExists(platformSpecificPath)) {
            const platformHandler = require(platformSpecificPath);
            if (typeof platformHandler.install === 'function') {
                await platformHandler.install({ projectRoot, config, logger });
            }
        }
    } catch (error) {
        logger.warn(`Warning: Could not configure ${ide}: ${error.message}`);
    }
}

module.exports = { install };
