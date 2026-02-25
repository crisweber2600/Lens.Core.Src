/**
 * Tests for Command-to-Workflow Router (S-024)
 *
 * Tests route resolution, command listing, and help formatting.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  CATEGORY,
  ROUTE_TABLE,
  RouterError,
  resolveCommand,
  listCommands,
  listCategories,
  formatHelp,
} = require('../lib/router');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S-024: Command-to-Workflow Router', () => {

  // ── Constants ─────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('CATEGORY has expected values', () => {
      assert.equal(CATEGORY.PHASE, 'phase');
      assert.equal(CATEGORY.INITIATIVE, 'initiative');
      assert.equal(CATEGORY.UTILITY, 'utility');
      assert.equal(CATEGORY.GOVERNANCE, 'governance');
      assert.equal(CATEGORY.DISCOVERY, 'discovery');
    });

    it('CATEGORY is frozen', () => {
      assert.throws(() => { CATEGORY.CUSTOM = 'custom'; });
    });

    it('ROUTE_TABLE is frozen', () => {
      assert.throws(() => { ROUTE_TABLE.push({}); });
    });

    it('ROUTE_TABLE has at least 20 entries', () => {
      assert.ok(ROUTE_TABLE.length >= 20, `Expected ≥20 routes, got ${ROUTE_TABLE.length}`);
    });

    it('every route has required fields', () => {
      for (const route of ROUTE_TABLE) {
        assert.ok(route.command, `missing command: ${JSON.stringify(route)}`);
        assert.ok(route.workflow, `missing workflow for ${route.command}`);
        assert.ok(route.category, `missing category for ${route.command}`);
        assert.ok(route.description, `missing description for ${route.command}`);
      }
    });

    it('every workflow path ends with .md', () => {
      for (const route of ROUTE_TABLE) {
        assert.ok(route.workflow.endsWith('.md'), `${route.command} workflow must end with .md`);
      }
    });
  });

  // ── RouterError ───────────────────────────────────────────────────────

  describe('RouterError', () => {
    it('has correct name and code', () => {
      const err = new RouterError('test', 'CODE', { x: 1 });
      assert.equal(err.name, 'RouterError');
      assert.equal(err.code, 'CODE');
      assert.deepEqual(err.details, { x: 1 });
    });

    it('is an instance of Error', () => {
      assert.ok(new RouterError('test', 'CODE') instanceof Error);
    });
  });

  // ── resolveCommand ────────────────────────────────────────────────────

  describe('resolveCommand', () => {
    // ── Phase commands ────────────────────────────────────────────────

    it('resolves /pre-plan', () => {
      const result = resolveCommand('/pre-plan');
      assert.equal(result.command, 'pre-plan');
      assert.ok(result.workflow.includes('pre-plan'));
      assert.equal(result.category, CATEGORY.PHASE);
    });

    it('resolves /spec', () => {
      const result = resolveCommand('spec');
      assert.equal(result.command, 'spec');
      assert.equal(result.category, CATEGORY.PHASE);
    });

    it('resolves /tech-plan', () => {
      const result = resolveCommand('/tech-plan');
      assert.equal(result.command, 'tech-plan');
    });

    it('resolves /plan', () => {
      const result = resolveCommand('plan');
      assert.equal(result.command, 'plan');
    });

    it('resolves /review', () => {
      const result = resolveCommand('/review');
      assert.equal(result.command, 'review');
    });

    it('resolves /dev', () => {
      const result = resolveCommand('dev');
      assert.equal(result.command, 'dev');
      assert.ok(result.workflow.includes('dev'));
    });

    it('resolves /story-gen', () => {
      const result = resolveCommand('story-gen');
      assert.equal(result.command, 'story-gen');
    });

    // ── Initiative commands ──────────────────────────────────────────

    it('resolves /new-domain with layer param', () => {
      const result = resolveCommand('/new-domain');
      assert.equal(result.command, 'new-domain');
      assert.equal(result.category, CATEGORY.INITIATIVE);
      assert.deepEqual(result.params, { layer: 'domain' });
    });

    it('resolves /new-service with layer param', () => {
      const result = resolveCommand('/new-service');
      assert.deepEqual(result.params, { layer: 'service' });
    });

    it('resolves /new-feature with layer param', () => {
      const result = resolveCommand('/new-feature');
      assert.deepEqual(result.params, { layer: 'feature' });
    });

    // ── Utility commands ────────────────────────────────────────────

    it('resolves /status', () => {
      const result = resolveCommand('/status');
      assert.equal(result.command, 'status');
      assert.equal(result.category, CATEGORY.UTILITY);
    });

    it('resolves /sync', () => {
      const result = resolveCommand('/sync');
      assert.equal(result.command, 'sync');
    });

    it('resolves /fix', () => {
      const result = resolveCommand('/fix');
      assert.equal(result.command, 'fix');
    });

    it('resolves /switch', () => {
      const result = resolveCommand('/switch');
      assert.equal(result.command, 'switch');
    });

    it('resolves /onboard', () => {
      const result = resolveCommand('/onboard');
      assert.equal(result.command, 'onboard');
    });

    // ── Governance commands ─────────────────────────────────────────

    it('resolves /constitution', () => {
      const result = resolveCommand('/constitution');
      assert.equal(result.command, 'constitution');
      assert.equal(result.category, CATEGORY.GOVERNANCE);
    });

    it('resolves /compliance', () => {
      const result = resolveCommand('/compliance');
      assert.equal(result.command, 'compliance');
    });

    it('resolves /ancestry', () => {
      const result = resolveCommand('/ancestry');
      assert.equal(result.command, 'ancestry');
    });

    // ── Discovery commands ──────────────────────────────────────────

    it('resolves /domain-map', () => {
      const result = resolveCommand('/domain-map');
      assert.equal(result.command, 'domain-map');
      assert.equal(result.category, CATEGORY.DISCOVERY);
    });

    it('resolves /impact', () => {
      const result = resolveCommand('/impact');
      assert.equal(result.command, 'impact');
    });

    // ── Alias resolution ────────────────────────────────────────────

    it('resolves alias "preplan" to pre-plan', () => {
      const result = resolveCommand('preplan');
      assert.equal(result.command, 'pre-plan');
    });

    it('resolves alias "analysis" to pre-plan', () => {
      const result = resolveCommand('analysis');
      assert.equal(result.command, 'pre-plan');
    });

    it('resolves alias "techplan" to tech-plan', () => {
      const result = resolveCommand('techplan');
      assert.equal(result.command, 'tech-plan');
    });

    it('resolves alias "sync-now" to sync', () => {
      const result = resolveCommand('sync-now');
      assert.equal(result.command, 'sync');
    });

    it('resolves alias "fix-state" to fix', () => {
      const result = resolveCommand('fix-state');
      assert.equal(result.command, 'fix');
    });

    it('resolves alias "compliance-check" to compliance', () => {
      const result = resolveCommand('compliance-check');
      assert.equal(result.command, 'compliance');
    });

    // ── Normalization ───────────────────────────────────────────────

    it('strips leading slashes', () => {
      const result = resolveCommand('///pre-plan');
      assert.equal(result.command, 'pre-plan');
    });

    it('handles uppercase input', () => {
      const result = resolveCommand('/PRE-PLAN');
      assert.equal(result.command, 'pre-plan');
    });

    it('trims whitespace', () => {
      const result = resolveCommand('  /dev  ');
      assert.equal(result.command, 'dev');
    });

    // ── Error cases ─────────────────────────────────────────────────

    it('throws RouterError for unknown command', () => {
      assert.throws(
        () => resolveCommand('/nonexistent'),
        (err) => err instanceof RouterError && err.code === 'COMMAND_NOT_FOUND',
      );
    });

    it('throws RouterError for empty command', () => {
      assert.throws(
        () => resolveCommand(''),
        (err) => err instanceof RouterError && err.code === 'INVALID_COMMAND',
      );
    });

    it('throws RouterError for null command', () => {
      assert.throws(
        () => resolveCommand(null),
        (err) => err instanceof RouterError && err.code === 'INVALID_COMMAND',
      );
    });

    // ── Return value structure ──────────────────────────────────────

    it('returns complete route object', () => {
      const result = resolveCommand('/new-domain');
      assert.ok('command' in result);
      assert.ok('workflow' in result);
      assert.ok('category' in result);
      assert.ok('description' in result);
      assert.ok('agent' in result);
      assert.ok('params' in result);
    });

    it('returns a new params object (not reference)', () => {
      const r1 = resolveCommand('/new-domain');
      const r2 = resolveCommand('/new-domain');
      assert.deepEqual(r1.params, r2.params);
      r1.params.layer = 'modified';
      assert.notEqual(r1.params.layer, r2.params.layer);
    });
  });

  // ── listCommands ──────────────────────────────────────────────────────

  describe('listCommands', () => {
    it('returns all commands when no filter', () => {
      const result = listCommands();
      assert.ok(result.length >= 20);
    });

    it('filters by category', () => {
      const phaseCommands = listCommands({ category: CATEGORY.PHASE });
      assert.ok(phaseCommands.length >= 5);
      phaseCommands.forEach((c) => assert.equal(c.category, CATEGORY.PHASE));
    });

    it('returns empty for unknown category', () => {
      const result = listCommands({ category: 'nonexistent' });
      assert.equal(result.length, 0);
    });

    it('each item has command, workflow, category, and description', () => {
      const result = listCommands();
      for (const cmd of result) {
        assert.ok(cmd.command, `missing command`);
        assert.ok(cmd.workflow, `missing workflow for ${cmd.command}`);
        assert.ok(cmd.category, `missing category for ${cmd.command}`);
        assert.ok(cmd.description, `missing description for ${cmd.command}`);
      }
    });
  });

  // ── listCategories ────────────────────────────────────────────────────

  describe('listCategories', () => {
    it('returns all unique categories', () => {
      const categories = listCategories();
      assert.ok(categories.includes(CATEGORY.PHASE));
      assert.ok(categories.includes(CATEGORY.INITIATIVE));
      assert.ok(categories.includes(CATEGORY.UTILITY));
      assert.ok(categories.includes(CATEGORY.GOVERNANCE));
      assert.ok(categories.includes(CATEGORY.DISCOVERY));
    });

    it('returns no duplicates', () => {
      const categories = listCategories();
      assert.equal(categories.length, new Set(categories).size);
    });
  });

  // ── formatHelp ────────────────────────────────────────────────────────

  describe('formatHelp', () => {
    it('includes "Available Commands" header', () => {
      const output = formatHelp();
      assert.ok(output.includes('Available Commands'));
    });

    it('includes category sections', () => {
      const output = formatHelp();
      assert.ok(output.includes('PHASE'));
      assert.ok(output.includes('UTILITY'));
      assert.ok(output.includes('GOVERNANCE'));
    });

    it('includes command with leading slash', () => {
      const output = formatHelp();
      assert.ok(output.includes('/pre-plan'));
      assert.ok(output.includes('/dev'));
    });

    it('includes aliases when present', () => {
      const output = formatHelp();
      assert.ok(output.includes('aliases'));
    });

    it('filters by category', () => {
      const output = formatHelp({ category: CATEGORY.GOVERNANCE });
      assert.ok(output.includes('GOVERNANCE'));
      assert.ok(!output.includes('PHASE'));
    });

    it('returns message when no commands match', () => {
      const output = formatHelp({ category: 'nonexistent' });
      assert.ok(output.includes('No commands available'));
    });
  });
});
