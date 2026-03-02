/**
 * Tests for Constitution Module (S-013)
 *
 * Tests 4-level hierarchy loading, parsing, merging, and governance resolution.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  DEFAULT_CONSTITUTIONS_DIR,
  LAYERS,
  CONSTITUTION_FILENAME,
  resolveConstitutionPath,
  parseConstitution,
  extractGovernanceConfig,
  loadConstitution,
  loadHierarchy,
  mergeGovernance,
  isTrackPermitted,
} = require('../lib/constitution');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'constitution-test-'));
}

/** Create a constitution file at the given layer */
function writeConstitution(root, layer, context, content) {
  const filePath = resolveConstitutionPath(root, layer, context);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/** Minimal valid constitution content */
function makeConstitution(opts = {}) {
  const fm = {
    layer: opts.layer || 'org',
    name: opts.name || 'Test',
    created_by: 'test',
    ratification_date: '2026-01-01',
    last_amended: null,
    amendment_count: 0,
    inherits_from: opts.inherits_from || null,
  };

  let body = `---
${Object.entries(fm).map(([k, v]) => `${k}: ${v === null ? 'null' : JSON.stringify(v)}`).join('\n')}
---

# ${opts.layer || 'Org'} Constitution: ${opts.name || 'Test'}

## Preamble

Test constitution for ${opts.layer || 'org'} level.
`;

  if (opts.permitted_tracks) {
    body += `\n### Permitted Tracks\n\n\`\`\`yaml\npermitted_tracks: [${opts.permitted_tracks.join(', ')}]\n\`\`\`\n`;
  }

  if (opts.required_gates) {
    body += `\n### Required Gates\n\n\`\`\`yaml\nrequired_gates: [${opts.required_gates.join(', ')}]\n\`\`\`\n`;
  }

  if (opts.additional_review_participants) {
    const yamlStr = Object.entries(opts.additional_review_participants)
      .map(([phase, parts]) => `  ${phase}: [${parts.join(', ')}]`)
      .join('\n');
    body += `\n### Additional Review Participants\n\n\`\`\`yaml\nadditional_review_participants:\n${yamlStr}\n\`\`\`\n`;
  }

  return body;
}

// ---------------------------------------------------------------------------
// resolveConstitutionPath
// ---------------------------------------------------------------------------

describe('resolveConstitutionPath', () => {
  it('resolves org path', () => {
    const p = resolveConstitutionPath('/project', 'org');
    assert.ok(p.endsWith(path.join('constitutions', 'org', 'constitution.md')));
  });

  it('resolves domain path', () => {
    const p = resolveConstitutionPath('/project', 'domain', { domain: 'Lens' });
    assert.ok(p.endsWith(path.join('domain', 'Lens', 'constitution.md')));
  });

  it('resolves service path', () => {
    const p = resolveConstitutionPath('/project', 'service', { domain: 'Lens', service: 'lens-work' });
    assert.ok(p.endsWith(path.join('service', 'Lens', 'lens-work', 'constitution.md')));
  });

  it('resolves repo path', () => {
    const p = resolveConstitutionPath('/project', 'repo', {
      domain: 'Lens', service: 'lens-work', repo: 'bmad.lens.src',
    });
    assert.ok(p.endsWith(path.join('repo', 'Lens', 'lens-work', 'bmad.lens.src', 'constitution.md')));
  });

  it('throws for invalid layer', () => {
    assert.throws(() => resolveConstitutionPath('/p', 'invalid'), /Invalid layer/);
  });

  it('throws when required context is missing for domain', () => {
    assert.throws(() => resolveConstitutionPath('/p', 'domain'), /context\.domain is required/);
  });

  it('throws when required context is missing for service', () => {
    assert.throws(() => resolveConstitutionPath('/p', 'service', { domain: 'x' }), /context\.service is required/);
  });

  it('throws when required context is missing for repo', () => {
    assert.throws(() => resolveConstitutionPath('/p', 'repo', { domain: 'x', service: 'y' }), /context\.repo is required/);
  });

  it('supports custom constitutionsDir', () => {
    const p = resolveConstitutionPath('/project', 'org', { constitutionsDir: 'custom/gov' });
    assert.ok(p.includes(path.join('custom', 'gov', 'org')));
  });
});

// ---------------------------------------------------------------------------
// parseConstitution
// ---------------------------------------------------------------------------

describe('parseConstitution', () => {
  it('parses YAML frontmatter', () => {
    const content = '---\nlayer: org\nname: Test\n---\n\n# Heading\n\nBody text.';
    const { frontmatter, body } = parseConstitution(content);
    assert.equal(frontmatter.layer, 'org');
    assert.equal(frontmatter.name, 'Test');
    assert.ok(body.includes('# Heading'));
  });

  it('extracts embedded YAML code blocks', () => {
    const content = `---
layer: domain
name: Lens
---

# Title

\`\`\`yaml
permitted_tracks: [full, feature]
\`\`\`

\`\`\`yaml
required_gates: [constitution-check]
\`\`\`
`;
    const { yamlBlocks } = parseConstitution(content);
    assert.equal(yamlBlocks.length, 2);
    assert.deepEqual(yamlBlocks[0].permitted_tracks, ['full', 'feature']);
    assert.deepEqual(yamlBlocks[1].required_gates, ['constitution-check']);
  });

  it('handles content with no frontmatter', () => {
    const { frontmatter, body } = parseConstitution('# Just a heading\n\nNo frontmatter.');
    assert.deepEqual(frontmatter, {});
    assert.ok(body.includes('# Just a heading'));
  });

  it('handles null/empty content', () => {
    const result = parseConstitution(null);
    assert.deepEqual(result.frontmatter, {});
    assert.equal(result.body, '');
  });

  it('handles malformed frontmatter gracefully', () => {
    const content = '---\ninvalid: [unclosed\n---\n\nBody.';
    const { frontmatter } = parseConstitution(content);
    assert.ok(frontmatter._parseError);
  });

  it('skips unparseable YAML code blocks', () => {
    const content = `---
layer: org
---

\`\`\`yaml
valid_key: true
\`\`\`

\`\`\`yaml
bad: [unclosed
\`\`\`
`;
    const { yamlBlocks } = parseConstitution(content);
    assert.equal(yamlBlocks.length, 1);
  });

  it('handles yml code blocks', () => {
    const content = `---
layer: org
---

\`\`\`yml
permitted_tracks: [full]
\`\`\`
`;
    const { yamlBlocks } = parseConstitution(content);
    assert.equal(yamlBlocks.length, 1);
    assert.deepEqual(yamlBlocks[0].permitted_tracks, ['full']);
  });
});

// ---------------------------------------------------------------------------
// extractGovernanceConfig
// ---------------------------------------------------------------------------

describe('extractGovernanceConfig', () => {
  it('extracts all governance fields', () => {
    const parsed = parseConstitution(makeConstitution({
      layer: 'domain',
      name: 'Lens',
      permitted_tracks: ['full', 'feature'],
      required_gates: ['constitution-check'],
      additional_review_participants: { prd: ['architect', 'analyst'] },
    }));
    const gov = extractGovernanceConfig(parsed);

    assert.equal(gov.layer, 'domain');
    assert.equal(gov.name, 'Lens');
    assert.deepEqual(gov.permitted_tracks, ['full', 'feature']);
    assert.deepEqual(gov.required_gates, ['constitution-check']);
    assert.deepEqual(gov.additional_review_participants.prd, ['architect', 'analyst']);
  });

  it('returns null permitted_tracks when none defined', () => {
    const parsed = parseConstitution(makeConstitution({ layer: 'org' }));
    const gov = extractGovernanceConfig(parsed);
    assert.equal(gov.permitted_tracks, null);
  });

  it('deduplicates required_gates', () => {
    const content = `---
layer: org
---

\`\`\`yaml
required_gates: [gate-a, gate-b]
\`\`\`

\`\`\`yaml
required_gates: [gate-b, gate-c]
\`\`\`
`;
    const parsed = parseConstitution(content);
    const gov = extractGovernanceConfig(parsed);
    assert.deepEqual(gov.required_gates, ['gate-a', 'gate-b', 'gate-c']);
  });
});

// ---------------------------------------------------------------------------
// loadConstitution
// ---------------------------------------------------------------------------

describe('loadConstitution', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpRoot(); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it('loads an existing constitution', () => {
    writeConstitution(tmpRoot, 'org', {}, makeConstitution({ layer: 'org', name: 'TestOrg' }));
    const result = loadConstitution(tmpRoot, 'org');

    assert.ok(result);
    assert.equal(result.layer, 'org');
    assert.ok(result.raw.includes('TestOrg'));
    assert.equal(result.parsed.frontmatter.layer, 'org');
  });

  it('returns null when file does not exist', () => {
    const result = loadConstitution(tmpRoot, 'org');
    assert.equal(result, null);
  });

  it('loads domain constitution with context', () => {
    writeConstitution(tmpRoot, 'domain', { domain: 'Lens' }, makeConstitution({
      layer: 'domain', name: 'Lens',
    }));
    const result = loadConstitution(tmpRoot, 'domain', { domain: 'Lens' });
    assert.ok(result);
    assert.equal(result.governance.layer, 'domain');
  });

  it('loads service constitution with full context', () => {
    writeConstitution(tmpRoot, 'service', { domain: 'Lens', service: 'lens-work' }, makeConstitution({
      layer: 'service', name: 'lens-work',
    }));
    const result = loadConstitution(tmpRoot, 'service', { domain: 'Lens', service: 'lens-work' });
    assert.ok(result);
    assert.equal(result.governance.layer, 'service');
  });

  it('loads repo constitution', () => {
    writeConstitution(tmpRoot, 'repo', {
      domain: 'Lens', service: 'lens-work', repo: 'src',
    }, makeConstitution({ layer: 'repo', name: 'src' }));
    const result = loadConstitution(tmpRoot, 'repo', {
      domain: 'Lens', service: 'lens-work', repo: 'src',
    });
    assert.ok(result);
    assert.equal(result.governance.layer, 'repo');
  });
});

// ---------------------------------------------------------------------------
// loadHierarchy
// ---------------------------------------------------------------------------

describe('loadHierarchy', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpRoot(); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it('loads all four levels when all exist', () => {
    writeConstitution(tmpRoot, 'org', {}, makeConstitution({ layer: 'org' }));
    writeConstitution(tmpRoot, 'domain', { domain: 'D' }, makeConstitution({ layer: 'domain' }));
    writeConstitution(tmpRoot, 'service', { domain: 'D', service: 'S' }, makeConstitution({ layer: 'service' }));
    writeConstitution(tmpRoot, 'repo', { domain: 'D', service: 'S', repo: 'R' }, makeConstitution({ layer: 'repo' }));

    const { chain, resolved } = loadHierarchy(tmpRoot, { domain: 'D', service: 'S', repo: 'R' });
    assert.equal(chain.length, 4);
    assert.deepEqual(resolved.layers_loaded, ['org', 'domain', 'service', 'repo']);
  });

  it('skips missing levels (no error)', () => {
    // Only org and domain exist
    writeConstitution(tmpRoot, 'org', {}, makeConstitution({ layer: 'org' }));
    writeConstitution(tmpRoot, 'domain', { domain: 'D' }, makeConstitution({ layer: 'domain' }));

    const { chain, resolved } = loadHierarchy(tmpRoot, { domain: 'D', service: 'S', repo: 'R' });
    assert.equal(chain.length, 2);
    assert.deepEqual(resolved.layers_loaded, ['org', 'domain']);
  });

  it('returns empty chain when no constitutions exist', () => {
    const { chain, resolved } = loadHierarchy(tmpRoot, { domain: 'X' });
    assert.equal(chain.length, 0);
    assert.deepEqual(resolved.layers_loaded, []);
  });

  it('loads only org when no context provided', () => {
    writeConstitution(tmpRoot, 'org', {}, makeConstitution({ layer: 'org' }));
    const { chain } = loadHierarchy(tmpRoot);
    assert.equal(chain.length, 1);
    assert.equal(chain[0].layer, 'org');
  });

  it('loads org + domain when only domain in context', () => {
    writeConstitution(tmpRoot, 'org', {}, makeConstitution({ layer: 'org' }));
    writeConstitution(tmpRoot, 'domain', { domain: 'D' }, makeConstitution({ layer: 'domain' }));

    const { chain } = loadHierarchy(tmpRoot, { domain: 'D' });
    assert.equal(chain.length, 2);
  });

  it('merges governance from hierarchy', () => {
    writeConstitution(tmpRoot, 'org', {}, makeConstitution({
      layer: 'org',
      permitted_tracks: ['full', 'feature', 'tech-change', 'hotfix', 'spike'],
      required_gates: ['basic-check'],
    }));
    writeConstitution(tmpRoot, 'domain', { domain: 'D' }, makeConstitution({
      layer: 'domain',
      permitted_tracks: ['full', 'feature', 'tech-change'],
      required_gates: ['constitution-check'],
      additional_review_participants: { prd: ['architect'] },
    }));

    const { resolved } = loadHierarchy(tmpRoot, { domain: 'D' });

    // permitted_tracks is intersection
    assert.deepEqual(resolved.permitted_tracks, ['full', 'feature', 'tech-change']);
    // required_gates is union
    assert.deepEqual(resolved.required_gates, ['basic-check', 'constitution-check']);
    // additional_review_participants is union
    assert.deepEqual(resolved.additional_review_participants.prd, ['architect']);
  });
});

// ---------------------------------------------------------------------------
// mergeGovernance
// ---------------------------------------------------------------------------

describe('mergeGovernance', () => {
  it('intersects permitted_tracks', () => {
    const chain = [
      { layer: 'org', governance: { permitted_tracks: ['full', 'feature', 'hotfix'], required_gates: [], additional_review_participants: {} } },
      { layer: 'domain', governance: { permitted_tracks: ['full', 'feature'], required_gates: [], additional_review_participants: {} } },
      { layer: 'service', governance: { permitted_tracks: ['full'], required_gates: [], additional_review_participants: {} } },
    ];
    const merged = mergeGovernance(chain);
    assert.deepEqual(merged.permitted_tracks, ['full']);
  });

  it('unions required_gates', () => {
    const chain = [
      { layer: 'org', governance: { permitted_tracks: null, required_gates: ['gate-a'], additional_review_participants: {} } },
      { layer: 'domain', governance: { permitted_tracks: null, required_gates: ['gate-b', 'gate-a'], additional_review_participants: {} } },
    ];
    const merged = mergeGovernance(chain);
    assert.deepEqual(merged.required_gates, ['gate-a', 'gate-b']);
  });

  it('unions additional_review_participants per phase', () => {
    const chain = [
      { layer: 'org', governance: { permitted_tracks: null, required_gates: [], additional_review_participants: { prd: ['pm'] } } },
      { layer: 'domain', governance: { permitted_tracks: null, required_gates: [], additional_review_participants: { prd: ['architect'], architecture: ['analyst'] } } },
    ];
    const merged = mergeGovernance(chain);
    assert.deepEqual(merged.additional_review_participants.prd, ['pm', 'architect']);
    assert.deepEqual(merged.additional_review_participants.architecture, ['analyst']);
  });

  it('returns null permitted_tracks when none defined', () => {
    const chain = [
      { layer: 'org', governance: { permitted_tracks: null, required_gates: [], additional_review_participants: {} } },
    ];
    const merged = mergeGovernance(chain);
    assert.equal(merged.permitted_tracks, null);
  });

  it('handles empty chain', () => {
    const merged = mergeGovernance([]);
    assert.equal(merged.permitted_tracks, null);
    assert.deepEqual(merged.required_gates, []);
    assert.deepEqual(merged.layers_loaded, []);
  });
});

// ---------------------------------------------------------------------------
// isTrackPermitted
// ---------------------------------------------------------------------------

describe('isTrackPermitted', () => {
  it('returns true when no track restrictions', () => {
    assert.equal(isTrackPermitted({ permitted_tracks: null }, 'full'), true);
  });

  it('returns true for permitted track', () => {
    assert.equal(isTrackPermitted({ permitted_tracks: ['full', 'feature'] }, 'full'), true);
  });

  it('returns false for non-permitted track', () => {
    assert.equal(isTrackPermitted({ permitted_tracks: ['full', 'feature'] }, 'hotfix'), false);
  });
});

// ---------------------------------------------------------------------------
// Integration: real constitutions
// ---------------------------------------------------------------------------

describe('integration: real constitutions', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

  it('can parse the real domain constitution (if exists)', () => {
    const result = loadConstitution(projectRoot, 'domain', { domain: 'lens' });
    if (!result) return; // Skip if not present

    assert.equal(result.layer, 'domain');
    assert.ok(result.parsed.frontmatter.layer);
    assert.ok(result.raw.length > 0);
  });

  it('can load full hierarchy for lens domain', () => {
    const { chain, resolved } = loadHierarchy(projectRoot, { domain: 'lens' });
    // May have 0-2 levels depending on what exists
    assert.ok(Array.isArray(chain));
    assert.ok(Array.isArray(resolved.layers_loaded));
  });

  it('real domain constitution has governance config', () => {
    const result = loadConstitution(projectRoot, 'domain', { domain: 'lens' });
    if (!result) return;

    assert.ok(result.governance);
    // Lens domain should have permitted_tracks and required_gates
    if (result.governance.permitted_tracks) {
      assert.ok(Array.isArray(result.governance.permitted_tracks));
    }
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('LAYERS is frozen with correct values', () => {
    assert.ok(Object.isFrozen(LAYERS));
    assert.deepEqual([...LAYERS], ['org', 'domain', 'service', 'repo']);
  });

  it('DEFAULT_CONSTITUTIONS_DIR is correct', () => {
    assert.equal(DEFAULT_CONSTITUTIONS_DIR, '_bmad-output/lens-work/constitutions');
  });

  it('CONSTITUTION_FILENAME is correct', () => {
    assert.equal(CONSTITUTION_FILENAME, 'constitution.md');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpRoot(); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  it('handles constitution with no YAML blocks', () => {
    writeConstitution(tmpRoot, 'org', {}, '---\nlayer: org\nname: Minimal\n---\n\n# Minimal\n\nNo embedded YAML.');
    const result = loadConstitution(tmpRoot, 'org');
    assert.ok(result);
    assert.deepEqual(result.governance.required_gates, []);
    assert.equal(result.governance.permitted_tracks, null);
  });

  it('handles constitution with only frontmatter', () => {
    writeConstitution(tmpRoot, 'org', {}, '---\nlayer: org\nname: FMOnly\n---\n');
    const result = loadConstitution(tmpRoot, 'org');
    assert.ok(result);
    assert.equal(result.governance.name, 'FMOnly');
  });

  it('handles deeply nested repo constitution path', () => {
    const ctx = { domain: 'Big-Corp', service: 'microservice-a', repo: 'api-gateway' };
    writeConstitution(tmpRoot, 'repo', ctx, makeConstitution({ layer: 'repo', name: 'api-gateway' }));
    const result = loadConstitution(tmpRoot, 'repo', ctx);
    assert.ok(result);
    assert.equal(result.governance.name, 'api-gateway');
  });

  it('hierarchy with service constitution but no org/domain', () => {
    writeConstitution(tmpRoot, 'service', { domain: 'D', service: 'S' }, makeConstitution({
      layer: 'service',
      permitted_tracks: ['full'],
    }));
    const { chain, resolved } = loadHierarchy(tmpRoot, { domain: 'D', service: 'S' });
    assert.equal(chain.length, 1);
    assert.deepEqual(resolved.permitted_tracks, ['full']);
  });
});
