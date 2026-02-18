const fs = require('fs-extra');
const path = require('node:path');

/**
 * Lens Module Validator
 *
 * Validates the Lens module structure, checking that all required
 * files exist and key configurations are consistent.
 */
async function validate(projectRoot) {
    const moduleRoot = path.join(projectRoot, '_bmad', 'lens');
    const outputRoot = path.join(projectRoot, '_bmad-output', 'lens');
    const errors = [];
    const warnings = [];

    console.log('Validating Lens module...\n');

    // Check module root exists
    if (!(await fs.pathExists(moduleRoot))) {
        errors.push('Module directory not found: _bmad/lens/');
        return { errors, warnings, valid: false };
    }

    // Required files
    const requiredFiles = [
        'agents/lens.agent.yaml',
        'config.yaml',
    ];

    for (const file of requiredFiles) {
        const filePath = path.join(moduleRoot, file);
        if (!(await fs.pathExists(filePath))) {
            errors.push(`Required file missing: ${file}`);
        }
    }

    // Required directories
    const requiredDirs = [
        'skills',
        'workflows',
        'prompts',
        'docs',
    ];

    for (const dir of requiredDirs) {
        const dirPath = path.join(moduleRoot, dir);
        if (!(await fs.pathExists(dirPath))) {
            warnings.push(`Directory missing: ${dir}/`);
        }
    }

    // Check output directory
    if (!(await fs.pathExists(outputRoot))) {
        errors.push('Output directory not found: _bmad-output/lens/');
    } else {
        // Check state file
        const stateFile = path.join(outputRoot, 'state.yaml');
        if (!(await fs.pathExists(stateFile))) {
            warnings.push('State file not initialized: _bmad-output/lens/state.yaml');
        }

        // Check event log
        const eventLog = path.join(outputRoot, 'event-log.jsonl');
        if (!(await fs.pathExists(eventLog))) {
            warnings.push('Event log not initialized: _bmad-output/lens/event-log.jsonl');
        }
    }

    // Report
    const valid = errors.length === 0;
    console.log(`Validation ${valid ? 'PASSED' : 'FAILED'}`);

    if (errors.length > 0) {
        console.log(`\nErrors (${errors.length}):`);
        errors.forEach(e => console.log(`  ✗ ${e}`));
    }

    if (warnings.length > 0) {
        console.log(`\nWarnings (${warnings.length}):`);
        warnings.forEach(w => console.log(`  ⚠ ${w}`));
    }

    if (valid && warnings.length === 0) {
        console.log('\n  ✓ All checks passed');
    }

    return { errors, warnings, valid };
}

// CLI usage
if (require.main === module) {
    const projectRoot = process.argv[2] || process.cwd();
    validate(projectRoot).then(result => {
        process.exit(result.valid ? 0 : 1);
    });
}

module.exports = { validate };
