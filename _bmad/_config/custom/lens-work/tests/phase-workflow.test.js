/**
 * Tests for Phase Workflow (S-029–S-033)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PHASE_WORKFLOWS, PhaseWorkflowError, runPreflight,
  executePhaseWorkflow, completePhaseWorkflow, getPhaseWorkflow,
} = require('../lib/phase-workflow');

describe('S-029–S-033: Phase Workflow', () => {

  describe('PHASE_WORKFLOWS', () => {
    it('has all 5 phases', () => {
      assert.ok(PHASE_WORKFLOWS.preplan);
      assert.ok(PHASE_WORKFLOWS.businessplan);
      assert.ok(PHASE_WORKFLOWS.techplan);
      assert.ok(PHASE_WORKFLOWS.devproposal);
      assert.ok(PHASE_WORKFLOWS.sprintplan);
    });
    it('each workflow has agent and outputs', () => {
      for (const [, wf] of Object.entries(PHASE_WORKFLOWS)) {
        assert.ok(wf.agent);
        assert.ok(Array.isArray(wf.outputs));
      }
    });
  });

  describe('getPhaseWorkflow', () => {
    it('returns workflow for known phase', () => {
      const wf = getPhaseWorkflow('preplan');
      assert.ok(wf);
      assert.equal(wf.phase, 'preplan');
    });
    it('returns null for unknown phase', () => {
      const wf = getPhaseWorkflow('nonexistent');
      assert.equal(wf, null);
    });
  });

  describe('runPreflight', () => {
    it('fails for unknown phase', () => {
      const result = runPreflight({
        projectRoot: process.cwd(),
        phase: 'nonexistent',
        stateData: {},
        initConfig: { id: 'test' },
      });
      assert.ok(!result.ready);
    });
    it('runs preflight for preplan', () => {
      const result = runPreflight({
        projectRoot: process.cwd(),
        phase: 'preplan',
        stateData: { current_phase: null },
        initConfig: { id: 'test', track: 'full', branches: { root: 'lens-test' } },
      });
      assert.ok(typeof result.ready === 'boolean');
    });
  });

  describe('executePhaseWorkflow', () => {
    it('throws for unknown phase', () => {
      assert.throws(() => {
        executePhaseWorkflow({
          projectRoot: process.cwd(),
          phase: 'nonexistent',
          stateData: {},
          initConfig: { id: 'test' },
        });
      });
    });
    it('executes preplan workflow with skip options', () => {
      const result = executePhaseWorkflow({
        projectRoot: process.cwd(),
        phase: 'preplan',
        stateData: { current_phase: null },
        initConfig: { id: 'test', track: 'full', branches: { root: 'lens-test' } },
      }, { skipBranch: true, skipCommit: true });
      assert.ok(typeof result.success === 'boolean');
    });
  });

  describe('completePhaseWorkflow', () => {
    it('completes a phase workflow', () => {
      const result = completePhaseWorkflow(process.cwd(), 'test', 'preplan');
      assert.ok(result.completed);
    });
  });

  describe('PhaseWorkflowError', () => {
    it('has expected fields', () => {
      const err = new PhaseWorkflowError('msg', 'CODE');
      assert.equal(err.name, 'PhaseWorkflowError');
      assert.equal(err.code, 'CODE');
    });
  });
});
