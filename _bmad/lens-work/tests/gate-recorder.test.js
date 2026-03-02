/**
 * Tests for Gate Recorder (S-023)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  recordGateDecision, recordPreconditionCheck,
  getGateHistory, formatGateDecision,
} = require('../lib/gate-recorder');

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-gate-rec-'));
  const lensDir = path.join(tmpDir, '_bmad-output', 'lens-work');
  fs.mkdirSync(lensDir, { recursive: true });
  fs.writeFileSync(path.join(lensDir, 'event-log.jsonl'), '', 'utf8');
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('S-023: Gate Recorder', () => {

  beforeEach(() => setup());
  afterEach(() => cleanup());

  describe('recordGateDecision', () => {
    it('records a gate decision', () => {
      const result = recordGateDecision(tmpDir, {
        initiative: 'test-init',
        phase: 'preplan',
        passed: true,
        results: [{ check: 'track', result: 'pass', reason: 'ok' }],
      });
      assert.ok(result);
    });
  });

  describe('recordPreconditionCheck', () => {
    it('records a precondition check', () => {
      const result = recordPreconditionCheck(tmpDir, 'test-init', 'preplan', {
        valid: true,
        errors: [],
      });
      assert.ok(result);
    });
  });

  describe('getGateHistory', () => {
    it('returns gate history', () => {
      recordGateDecision(tmpDir, {
        initiative: 'test-init',
        phase: 'preplan',
        passed: true,
        results: [{ check: 'track', result: 'pass', reason: 'ok' }],
      });
      const history = getGateHistory(tmpDir, 'test-init');
      assert.ok(history);
    });
  });

  describe('formatGateDecision', () => {
    it('formats a gate decision', () => {
      const result = formatGateDecision({
        initiative: 'test',
        phase: 'preplan',
        outcome: 'pass',
      });
      assert.ok(typeof result === 'string');
    });
  });
});
