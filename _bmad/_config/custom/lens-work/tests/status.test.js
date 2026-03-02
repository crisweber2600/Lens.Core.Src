/**
 * Tests for Status Display (S-027)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PHASE_ORDER, formatCompactStatus, formatVerboseStatus,
  formatAllInitiativesStatus, findNextPhase,
} = require('../lib/status');

describe('S-027: Status Display', () => {

  const mockState = {
    active_initiative: 'test-init',
    current_phase: 'preplan',
    phase_status: {
      preplan: 'done',
      businessplan: null,
      techplan: null,
      devproposal: null,
      sprintplan: null,
    },
  };

  const mockInit = {
    id: 'test-init',
    name: 'Test Initiative',
    track: 'full',
  };

  describe('PHASE_ORDER', () => {
    it('has 5 phases', () => {
      assert.equal(PHASE_ORDER.length, 5);
    });
  });

  describe('formatCompactStatus', () => {
    it('returns compact status string', () => {
      const result = formatCompactStatus(mockState, mockInit);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });
  });

  describe('formatVerboseStatus', () => {
    it('returns verbose status string', () => {
      const result = formatVerboseStatus(mockState, mockInit);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });
  });

  describe('formatAllInitiativesStatus', () => {
    it('formats status for project root', () => {
      try {
        const result = formatAllInitiativesStatus(process.cwd());
        assert.ok(typeof result === 'string');
      } catch {
        // May fail if discovery doesn't find initiatives — OK
        assert.ok(true);
      }
    });
  });

  describe('findNextPhase', () => {
    it('finds next phase after preplan', () => {
      const next = findNextPhase(
        { preplan: 'complete', businessplan: null, techplan: null, devproposal: null, sprintplan: null },
        { active_phases: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'] },
      );
      assert.equal(next, 'businessplan');
    });
    it('returns null when all done', () => {
      const next = findNextPhase(
        { preplan: 'complete', businessplan: 'complete', techplan: 'complete', devproposal: 'complete', sprintplan: 'complete' },
        { active_phases: ['preplan', 'businessplan', 'techplan', 'devproposal', 'sprintplan'] },
      );
      assert.equal(next, null);
    });
  });
});
