#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const path = require('node:path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { install } = require('../_module-installer/installer');

const pkg = require('../package.json');

const program = new Command();

program
  .name('lens-work')
  .description('LENS Workbench — lifecycle router for BMAD workflows')
  .version(pkg.version);

// ─── install ────────────────────────────────────────────────────────────────
program
  .command('install')
  .description('Install lens-work module into a BMAD control repo')
  .option('-r, --root <path>', 'Project root (defaults to cwd)', process.cwd())
  .option('--target-projects <path>', 'TargetProjects path', '../TargetProjects')
  .option('--docs-output <path>', 'Docs output path', 'Docs')
  .option('--no-telemetry', 'Disable lifecycle telemetry')
  .option('--git-remote <type>', 'Default git remote', 'github')
  .action(async (opts) => {
    const projectRoot = path.resolve(opts.root);

    console.log(chalk.blue(`Installing lens-work into ${projectRoot}...`));

    const config = {
      target_projects_path: opts.targetProjects,
      docs_output_path: opts.docsOutput,
      enable_telemetry: opts.telemetry !== false,
      default_git_remote: opts.gitRemote,
    };

    const logger = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    // Copy module assets to _bmad/lens-work/
    const destDir = path.join(projectRoot, '_bmad', 'lens-work');
    const moduleRoot = path.join(__dirname, '..');

    console.log(chalk.yellow('Copying module assets...'));
    await fs.ensureDir(destDir);

    const assetDirs = [
      'agents', 'data', 'docs', 'prompts', 'scripts',
      'templates', 'tests', 'workflows', '_module-installer',
    ];

    for (const dir of assetDirs) {
      const src = path.join(moduleRoot, dir);
      if (await fs.pathExists(src)) {
        await fs.copy(src, path.join(destDir, dir), { overwrite: true });
      }
    }

    // Copy top-level module files
    for (const file of ['module.yaml', 'config.yaml', 'service-map.yaml', 'README.md']) {
      const src = path.join(moduleRoot, file);
      if (await fs.pathExists(src)) {
        await fs.copy(src, path.join(destDir, file), { overwrite: true });
      }
    }

    // Run the installer (creates output dirs, state files, copilot instructions)
    const ok = await install({
      projectRoot,
      config,
      installedIDEs: ['vscode'],
      logger,
    });

    if (ok) {
      console.log(chalk.green('✓ lens-work installed successfully'));
    } else {
      console.error(chalk.red('✗ Installation failed'));
      process.exit(1);
    }
  });

// ─── validate ───────────────────────────────────────────────────────────────
program
  .command('validate')
  .description('Validate an existing lens-work installation')
  .option('-r, --root <path>', 'Project root (defaults to cwd)', process.cwd())
  .action(async (opts) => {
    const projectRoot = path.resolve(opts.root);
    const checks = [];

    const required = [
      '_bmad/lens-work/module.yaml',
      '_bmad/lens-work/agents/compass.agent.yaml',
      '_bmad-output/lens-work/state.yaml',
    ];

    for (const rel of required) {
      const exists = await fs.pathExists(path.join(projectRoot, rel));
      checks.push({ file: rel, ok: exists });
    }

    const allOk = checks.every(c => c.ok);

    for (const c of checks) {
      console.log(`  ${c.ok ? chalk.green('✓') : chalk.red('✗')} ${c.file}`);
    }

    if (allOk) {
      console.log(chalk.green('\n✓ Installation is valid'));
    } else {
      console.error(chalk.red('\n✗ Installation has issues — run `lens-work install`'));
      process.exit(1);
    }
  });

// ─── info ───────────────────────────────────────────────────────────────────
program
  .command('info')
  .description('Show module version and paths')
  .action(() => {
    const moduleRoot = path.join(__dirname, '..');
    console.log(`  Package:     ${pkg.name}`);
    console.log(`  Version:     ${pkg.version}`);
    console.log(`  Module root: ${moduleRoot}`);
  });

program.parse();
