/**
 * Tests for Context Injection (S-026)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const {
  PHASE_CONTEXT_MAP, PHASE_AGENT_MAP, ContextError,
  buildAgentContext, getExpectedOutputs, formatContextSummary,
} = require('../lib/context-injection');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-ctx-'));
  const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
  const initDir = path.join(lensDir, 'initiatives');
  fs.mkdirSync(initDir, { recursive: true });
  fs.writeFileSync(path.join(lensDir, 'state.yaml'), yaml.dump({
    lifecycle_version: 2,
    active_initiative: 'test-init',
    current_phase: 'preplan',
  }));
  fs.writeFileSync(path.join(initDir, 'test-init.yaml'), yaml.dump({
    id: 'test-init', name: 'Test', track: 'full',
    domain: 'lens', service: 'lens-work', feature: 'test',
  }));
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('S-026: Context Injection', () => {

  beforeEach(() => setup());
  afterEach(() => cleanup());

  describe('PHASE_CONTEXT_MAP', () => {
    it('maps phases to context requirements', () => {
      assert.ok(PHASE_CONTEXT_MAP);
      assert.ok(PHASE_CONTEXT_MAP.preplan || Object.keys(PHASE_CONTEXT_MAP).length > 0);
    });
  });

  describe('PHASE_AGENT_MAP', () => {
    it('maps phases to agents', () => {
      assert.ok(PHASE_AGENT_MAP);
    });
  });

  describe('buildAgentContext', () => {
    it('builds context for a phase', () => {
      const result = buildAgentContext({
        projectRoot: tmpDir,
        initConfig: { id: 'test-init', domain: 'lens', service: 'lens-work', feature: 'test', track: 'full' },
        phase: 'preplan',
        stateData: { current_phase: 'preplan' },
      });
      assert.ok(result);
      assert.ok(result.context !== undefined || result.agent !== undefined);
    });
  });

  describe('getExpectedOutputs', () => {
    it('returns expected outputs for preplan', () => {
      const outputs = getExpectedOutputs('preplan');
      assert.ok(Array.isArray(outputs));
    });
  });

  describe('formatContextSummary', () => {
    it('formats a context summary', () => {
      const ctx = buildAgentContext({
        projectRoot: tmpDir,
        initConfig: { id: 'test-init', domain: 'lens', service: 'lens-work', feature: 'test', track: 'full' },
        phase: 'preplan',
        stateData: { current_phase: 'preplan' },
      });
      const result = formatContextSummary(ctx.context, ctx.agent);
      assert.ok(typeof result === 'string');
    });
  });

  describe('ContextError', () => {
    it('has expected fields', () => {
      const err = new ContextError('msg', 'CODE');
      assert.equal(err.name, 'ContextError');
      assert.equal(err.code, 'CODE');
    });
  });
});
