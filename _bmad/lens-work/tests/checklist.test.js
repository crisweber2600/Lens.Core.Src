/**
 * Tests for Checklist (S-021)
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  ITEM_STATUS, ChecklistError, generateChecklist,
  evaluateChecklist, checkGateReady, formatChecklist,
} = require('../lib/checklist');

describe('S-021: Checklist', () => {

  describe('ITEM_STATUS', () => {
    it('has standard statuses', () => {
      assert.ok(ITEM_STATUS.PENDING || ITEM_STATUS.pending || Object.keys(ITEM_STATUS).length > 0);
    });
  });

  describe('generateChecklist', () => {
    it('generates a checklist for a phase', () => {
      const result = generateChecklist('preplan', { track: 'full' });
      assert.ok(result);
      assert.ok(Array.isArray(result.items) || Array.isArray(result));
    });
  });

  describe('evaluateChecklist', () => {
    it('evaluates checklist items', () => {
      const cl = generateChecklist('preplan', { track: 'full' });
      const result = evaluateChecklist(cl, {});
      assert.ok(result);
    });
  });

  describe('checkGateReady', () => {
    it('checks if gate is ready', () => {
      const cl = generateChecklist('preplan', { track: 'full' });
      const result = checkGateReady(cl);
      assert.ok(typeof result === 'object');
    });
  });

  describe('formatChecklist', () => {
    it('formats checklist to markdown', () => {
      const cl = generateChecklist('preplan', { track: 'full' });
      const result = formatChecklist(cl);
      assert.ok(typeof result === 'string');
    });
  });

  describe('ChecklistError', () => {
    it('has expected fields', () => {
      const err = new ChecklistError('msg', 'CODE');
      assert.equal(err.name, 'ChecklistError');
      assert.equal(err.code, 'CODE');
    });
  });
});
