/**
 * Tests for Event Log Module (S-006)
 *
 * Tests append, read, filter, validate, and edge-case handling
 * for the append-only JSONL event log.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  DEFAULT_LOG_RELATIVE,
  EVENT_TYPES,
  resolveLogPath,
  validateEvent,
  appendEvent,
  readEvents,
  filterEvents,
  getLastEvent,
  countEvents,
} = require('../lib/eventlog');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fresh temp directory for each test */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eventlog-test-'));
}

/** Ensure event-log directory structure exists */
function ensureLogDir(root, relPath) {
  const logPath = path.resolve(root, relPath || DEFAULT_LOG_RELATIVE);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  return logPath;
}

/** Write raw content directly to event-log.jsonl */
function writeRawLog(root, content, relPath) {
  const logPath = ensureLogDir(root, relPath);
  fs.writeFileSync(logPath, content, 'utf8');
  return logPath;
}

/** Read raw log file content */
function readRawLog(root, relPath) {
  const logPath = path.resolve(root, relPath || DEFAULT_LOG_RELATIVE);
  return fs.readFileSync(logPath, 'utf8');
}

// ---------------------------------------------------------------------------
// resolveLogPath
// ---------------------------------------------------------------------------

describe('resolveLogPath', () => {
  it('returns default path when no override', () => {
    const result = resolveLogPath('/project');
    assert.equal(result, path.resolve('/project', DEFAULT_LOG_RELATIVE));
  });

  it('uses override path when provided', () => {
    const result = resolveLogPath('/project', 'custom/events.jsonl');
    assert.equal(result, path.resolve('/project', 'custom/events.jsonl'));
  });

  it('throws when projectRoot is missing', () => {
    assert.throws(() => resolveLogPath(null), /projectRoot is required/);
    assert.throws(() => resolveLogPath(''), /projectRoot is required/);
  });
});

// ---------------------------------------------------------------------------
// validateEvent
// ---------------------------------------------------------------------------

describe('validateEvent', () => {
  it('accepts a valid event with recognised type', () => {
    const result = validateEvent({
      ts: '2026-02-25T00:00:00Z',
      event: 'initiative_created',
      initiative: 'test-123',
    });
    assert.equal(result.valid, true);
    assert.equal(result.errors, undefined);
    assert.equal(result.warnings, undefined);
  });

  it('warns on unrecognised event type but still valid', () => {
    const result = validateEvent({
      ts: '2026-02-25T00:00:00Z',
      event: 'custom_event_xyz',
    });
    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /Unrecognised event type/);
  });

  it('rejects missing ts', () => {
    const result = validateEvent({ event: 'error' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('ts')));
  });

  it('rejects invalid ts format', () => {
    const result = validateEvent({ ts: 'not-a-date', event: 'error' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('ISO8601')));
  });

  it('rejects non-string ts', () => {
    const result = validateEvent({ ts: 12345, event: 'error' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('ISO8601 string')));
  });

  it('rejects missing event type', () => {
    const result = validateEvent({ ts: '2026-02-25T00:00:00Z' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('event')));
  });

  it('rejects non-string event type', () => {
    const result = validateEvent({ ts: '2026-02-25T00:00:00Z', event: 42 });
    assert.equal(result.valid, false);
  });

  it('rejects null, arrays, and primitives', () => {
    assert.equal(validateEvent(null).valid, false);
    assert.equal(validateEvent([]).valid, false);
    assert.equal(validateEvent('string').valid, false);
    assert.equal(validateEvent(42).valid, false);
  });

  it('collects multiple errors', () => {
    const result = validateEvent({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 2);
  });
});

// ---------------------------------------------------------------------------
// appendEvent
// ---------------------------------------------------------------------------

describe('appendEvent', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('appends a valid event and creates the file', () => {
    const result = appendEvent(tmpRoot, {
      event: 'initiative_created',
      initiative: 'test-abc',
    });
    assert.equal(result.success, true);

    // File exists and contains one line
    const content = readRawLog(tmpRoot);
    const lines = content.trim().split('\n');
    assert.equal(lines.length, 1);

    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.event, 'initiative_created');
    assert.equal(parsed.initiative, 'test-abc');
    assert.ok(parsed.ts); // auto-populated
  });

  it('auto-populates ts when not provided', () => {
    const before = new Date().toISOString();
    appendEvent(tmpRoot, { event: 'bootstrap' });
    const after = new Date().toISOString();

    const { events } = readEvents(tmpRoot);
    assert.equal(events.length, 1);
    assert.ok(events[0].ts >= before);
    assert.ok(events[0].ts <= after);
  });

  it('preserves explicit ts', () => {
    const ts = '2026-01-01T00:00:00Z';
    appendEvent(tmpRoot, { ts, event: 'bootstrap' });

    const { events } = readEvents(tmpRoot);
    assert.equal(events[0].ts, ts);
  });

  it('appends multiple events (append-only)', () => {
    appendEvent(tmpRoot, { event: 'workflow_start', initiative: 'a' });
    appendEvent(tmpRoot, { event: 'workflow_end', initiative: 'a' });
    appendEvent(tmpRoot, { event: 'error', initiative: 'b', details: { msg: 'oops' } });

    const { events } = readEvents(tmpRoot);
    assert.equal(events.length, 3);
    assert.equal(events[0].event, 'workflow_start');
    assert.equal(events[1].event, 'workflow_end');
    assert.equal(events[2].event, 'error');
    assert.equal(events[2].details.msg, 'oops');
  });

  it('creates parent directories when they do not exist', () => {
    const result = appendEvent(tmpRoot, { event: 'bootstrap' }, {
      logPath: 'deep/nested/dir/events.jsonl',
    });
    assert.equal(result.success, true);

    const content = fs.readFileSync(
      path.resolve(tmpRoot, 'deep/nested/dir/events.jsonl'),
      'utf8',
    );
    assert.ok(content.trim().length > 0);
  });

  it('rejects events with missing required fields', () => {
    // appendEvent auto-populates ts, so only "event" is missing → 1 error
    const result = appendEvent(tmpRoot, {});
    assert.equal(result.success, false);
    assert.ok(result.errors.length >= 1);
    assert.ok(result.errors.some((e) => e.includes('event')));

    // File should NOT be created
    const logPath = resolveLogPath(tmpRoot);
    assert.equal(fs.existsSync(logPath), false);
  });

  it('rejects events with explicit invalid ts and missing event', () => {
    const result = appendEvent(tmpRoot, { ts: 'garbage' });
    assert.equal(result.success, false);
    assert.ok(result.errors.length >= 2);
  });

  it('warns but appends unrecognised event types (non-strict)', () => {
    const result = appendEvent(tmpRoot, {
      event: 'totally_new_event',
      initiative: 'x',
    });
    assert.equal(result.success, true);
    assert.ok(result.warnings?.length > 0);

    const { events } = readEvents(tmpRoot);
    assert.equal(events[0].event, 'totally_new_event');
  });

  it('rejects unrecognised event types in strict mode', () => {
    const result = appendEvent(tmpRoot, {
      event: 'totally_new_event',
    }, { strict: true });
    assert.equal(result.success, false);
    assert.ok(result.errors.some((e) => e.includes('strict mode')));
  });

  it('uses deterministic key ordering: ts, event, initiative first', () => {
    appendEvent(tmpRoot, {
      user: 'alice',
      initiative: 'proj-1',
      event: 'gate_opened',
      ts: '2026-03-01T00:00:00Z',
      details: { gate: 'constitution' },
    });

    const raw = readRawLog(tmpRoot).trim();
    const keys = Object.keys(JSON.parse(raw));
    assert.equal(keys[0], 'ts');
    assert.equal(keys[1], 'event');
    assert.equal(keys[2], 'initiative');
  });

  it('does not mutate the original event object', () => {
    const original = { event: 'bootstrap' };
    appendEvent(tmpRoot, original);
    assert.equal(original.ts, undefined); // ts was not added to original
  });
});

// ---------------------------------------------------------------------------
// readEvents
// ---------------------------------------------------------------------------

describe('readEvents', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns empty array when file does not exist', () => {
    const { events, errors } = readEvents(tmpRoot);
    assert.equal(events.length, 0);
    assert.equal(errors.length, 0);
  });

  it('parses valid JSONL content', () => {
    const content = [
      '{"ts":"2026-01-01T00:00:00Z","event":"bootstrap"}',
      '{"ts":"2026-01-02T00:00:00Z","event":"error","details":{"msg":"fail"}}',
    ].join('\n') + '\n';
    writeRawLog(tmpRoot, content);

    const { events, errors } = readEvents(tmpRoot);
    assert.equal(events.length, 2);
    assert.equal(errors.length, 0);
    assert.equal(events[0].event, 'bootstrap');
    assert.equal(events[1].details.msg, 'fail');
  });

  it('skips blank lines', () => {
    const content = '{"ts":"2026-01-01T00:00:00Z","event":"bootstrap"}\n\n\n{"ts":"2026-01-02T00:00:00Z","event":"error"}\n\n';
    writeRawLog(tmpRoot, content);

    const { events, errors } = readEvents(tmpRoot);
    assert.equal(events.length, 2);
    assert.equal(errors.length, 0);
  });

  it('reports parse errors with line number', () => {
    const content = [
      '{"ts":"2026-01-01T00:00:00Z","event":"bootstrap"}',
      'THIS IS NOT JSON',
      '{"ts":"2026-01-03T00:00:00Z","event":"error"}',
    ].join('\n') + '\n';
    writeRawLog(tmpRoot, content);

    const { events, errors } = readEvents(tmpRoot);
    assert.equal(events.length, 2);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].line, 2);
    assert.equal(errors[0].raw, 'THIS IS NOT JSON');
  });

  it('handles large event payloads', () => {
    const bigDetails = { data: 'x'.repeat(10_000) };
    appendEvent(tmpRoot, {
      event: 'workflow_end',
      initiative: 'big',
      details: bigDetails,
    });

    const { events } = readEvents(tmpRoot);
    assert.equal(events.length, 1);
    assert.equal(events[0].details.data.length, 10_000);
  });
});

// ---------------------------------------------------------------------------
// filterEvents
// ---------------------------------------------------------------------------

describe('filterEvents', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
    // Seed with events from two initiatives
    const events = [
      { ts: '2026-01-01T00:00:00Z', event: 'initiative_created', initiative: 'alpha' },
      { ts: '2026-01-02T00:00:00Z', event: 'phase_transition', initiative: 'alpha', phase: 'businessplan' },
      { ts: '2026-01-03T00:00:00Z', event: 'initiative_created', initiative: 'beta' },
      { ts: '2026-01-04T00:00:00Z', event: 'gate_opened', initiative: 'alpha', phase: 'techplan' },
      { ts: '2026-01-05T00:00:00Z', event: 'error', initiative: 'beta', details: { msg: 'fail' } },
      { ts: '2026-01-06T00:00:00Z', event: 'workflow_end', initiative: 'alpha' },
    ];
    const content = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
    writeRawLog(tmpRoot, content);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('filters by initiative ID', () => {
    const { events } = filterEvents(tmpRoot, 'alpha');
    assert.equal(events.length, 4);
    assert.ok(events.every((e) => e.initiative === 'alpha'));
  });

  it('filters by initiative ID using "id" field (legacy)', () => {
    // Some older events use "id" instead of "initiative"
    const legacyContent = '{"ts":"2026-06-01T00:00:00Z","event":"init-initiative","id":"gamma"}\n';
    writeRawLog(tmpRoot, legacyContent);

    const { events } = filterEvents(tmpRoot, 'gamma');
    assert.equal(events.length, 1);
    assert.equal(events[0].id, 'gamma');
  });

  it('filters by event type', () => {
    const { events } = filterEvents(tmpRoot, 'alpha', { eventType: 'gate_opened' });
    assert.equal(events.length, 1);
    assert.equal(events[0].phase, 'techplan');
  });

  it('filters by since date', () => {
    const { events } = filterEvents(tmpRoot, 'alpha', { since: '2026-01-03T00:00:00Z' });
    assert.equal(events.length, 2);
    assert.ok(events.every((e) => new Date(e.ts) >= new Date('2026-01-03T00:00:00Z')));
  });

  it('filters by until date', () => {
    const { events } = filterEvents(tmpRoot, 'alpha', { until: '2026-01-02T00:00:00Z' });
    assert.equal(events.length, 2);
    assert.ok(events.every((e) => new Date(e.ts) <= new Date('2026-01-02T00:00:00Z')));
  });

  it('combines event type and date range filters', () => {
    const { events } = filterEvents(tmpRoot, 'alpha', {
      eventType: 'phase_transition',
      since: '2026-01-01T00:00:00Z',
      until: '2026-01-03T00:00:00Z',
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'phase_transition');
  });

  it('returns empty array for unknown initiative', () => {
    const { events } = filterEvents(tmpRoot, 'nonexistent');
    assert.equal(events.length, 0);
  });

  it('returns empty when file does not exist', () => {
    const freshRoot = makeTmpRoot();
    try {
      const { events, errors } = filterEvents(freshRoot, 'anything');
      assert.equal(events.length, 0);
      assert.equal(errors.length, 0);
    } finally {
      fs.rmSync(freshRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// getLastEvent
// ---------------------------------------------------------------------------

describe('getLastEvent', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
    const events = [
      { ts: '2026-01-01T00:00:00Z', event: 'gate_opened', initiative: 'proj', gate: 'first' },
      { ts: '2026-01-02T00:00:00Z', event: 'gate_opened', initiative: 'proj', gate: 'second' },
      { ts: '2026-01-03T00:00:00Z', event: 'gate_blocked', initiative: 'proj' },
    ];
    writeRawLog(tmpRoot, events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns the last matching event', () => {
    const ev = getLastEvent(tmpRoot, 'proj', 'gate_opened');
    assert.equal(ev.gate, 'second');
  });

  it('returns null when no match', () => {
    const ev = getLastEvent(tmpRoot, 'proj', 'initiative_archived');
    assert.equal(ev, null);
  });

  it('returns null for unknown initiative', () => {
    const ev = getLastEvent(tmpRoot, 'unknown', 'gate_opened');
    assert.equal(ev, null);
  });
});

// ---------------------------------------------------------------------------
// countEvents
// ---------------------------------------------------------------------------

describe('countEvents', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
    const events = [
      { ts: '2026-01-01T00:00:00Z', event: 'bootstrap' },
      { ts: '2026-01-02T00:00:00Z', event: 'initiative_created', initiative: 'a' },
      { ts: '2026-01-03T00:00:00Z', event: 'initiative_created', initiative: 'b' },
      { ts: '2026-01-04T00:00:00Z', event: 'error', initiative: 'a' },
    ];
    writeRawLog(tmpRoot, events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('counts all events', () => {
    const { total, byType } = countEvents(tmpRoot);
    assert.equal(total, 4);
    assert.equal(byType.bootstrap, 1);
    assert.equal(byType.initiative_created, 2);
    assert.equal(byType.error, 1);
  });

  it('counts events for a specific initiative', () => {
    const { total, byType } = countEvents(tmpRoot, { initiative: 'a' });
    assert.equal(total, 2);
    assert.equal(byType.initiative_created, 1);
    assert.equal(byType.error, 1);
  });

  it('returns zero for empty log', () => {
    const freshRoot = makeTmpRoot();
    try {
      const { total, byType } = countEvents(freshRoot);
      assert.equal(total, 0);
      assert.deepEqual(byType, {});
    } finally {
      fs.rmSync(freshRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: real event-log.jsonl
// ---------------------------------------------------------------------------

describe('integration: real event-log.jsonl', () => {
  // Read the actual project's event-log.jsonl to validate parsing
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

  it('can parse the real event-log.jsonl without errors', () => {
    const logPath = path.resolve(projectRoot, DEFAULT_LOG_RELATIVE);
    if (!fs.existsSync(logPath)) {
      // Skip if not available (CI or standalone)
      return;
    }

    const { events, errors } = readEvents(projectRoot);
    assert.ok(events.length > 0, 'Expected at least one event');
    assert.equal(errors.length, 0, `Parse errors: ${JSON.stringify(errors)}`);

    // Every event has ts and event fields
    for (const e of events) {
      assert.ok(e.ts, `Event missing ts: ${JSON.stringify(e)}`);
      assert.ok(e.event, `Event missing event: ${JSON.stringify(e)}`);
    }
  });

  it('can filter real events for upgrade initiative', () => {
    const logPath = path.resolve(projectRoot, DEFAULT_LOG_RELATIVE);
    if (!fs.existsSync(logPath)) return;

    const { events } = filterEvents(projectRoot, 'upgrade-cjki9q');
    // The real log has many events for this initiative
    assert.ok(events.length > 0, 'Expected events for upgrade-cjki9q');
  });

  it('can count real events by type', () => {
    const logPath = path.resolve(projectRoot, DEFAULT_LOG_RELATIVE);
    if (!fs.existsSync(logPath)) return;

    const { total, byType } = countEvents(projectRoot);
    assert.ok(total > 0);
    assert.ok(Object.keys(byType).length > 0);
  });
});

// ---------------------------------------------------------------------------
// EVENT_TYPES constant
// ---------------------------------------------------------------------------

describe('EVENT_TYPES', () => {
  it('is frozen', () => {
    assert.ok(Object.isFrozen(EVENT_TYPES));
  });

  it('contains all §4.3 event types', () => {
    const required = [
      'initiative_created',
      'phase_transition',
      'audience_promotion',
      'workflow_start',
      'workflow_end',
      'gate_opened',
      'gate_blocked',
      'state_synced',
      'state_fixed',
      'state_overridden',
      'error',
      'initiative_archived',
      'constitution_violation',
      'constitution_passed',
      'migrate_lifecycle',
    ];
    for (const type of required) {
      assert.ok(EVENT_TYPES.includes(type), `Missing event type: ${type}`);
    }
  });

  it('contains legacy/observed event types for compat', () => {
    const legacy = [
      'bootstrap',
      'branch-sync',
      'init-initiative',
      'phase_start',
      'phase_pr_created',
      'phase_complete',
      'party_mode_review',
    ];
    for (const type of legacy) {
      assert.ok(EVENT_TYPES.includes(type), `Missing legacy type: ${type}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTmpRoot();
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('handles events with nested objects and arrays', () => {
    appendEvent(tmpRoot, {
      event: 'workflow_end',
      initiative: 'complex',
      details: {
        artifacts: ['a.md', 'b.md'],
        stats: { lines: 100, files: 5 },
        nested: { deep: { value: true } },
      },
    });

    const { events } = readEvents(tmpRoot);
    assert.equal(events[0].details.artifacts.length, 2);
    assert.equal(events[0].details.stats.lines, 100);
    assert.equal(events[0].details.nested.deep.value, true);
  });

  it('handles unicode in event data', () => {
    appendEvent(tmpRoot, {
      event: 'error',
      initiative: 'unicode',
      details: { msg: '日本語テスト 🚀 café' },
    });

    const { events } = readEvents(tmpRoot);
    assert.equal(events[0].details.msg, '日本語テスト 🚀 café');
  });

  it('handles concurrent appends (serial simulation)', () => {
    // Simulate rapid sequential appends
    for (let i = 0; i < 50; i++) {
      appendEvent(tmpRoot, {
        event: 'workflow_start',
        initiative: 'stress',
        details: { index: i },
      });
    }

    const { events, errors } = readEvents(tmpRoot);
    assert.equal(events.length, 50);
    assert.equal(errors.length, 0);
  });

  it('appending to an existing file preserves old content', () => {
    const existing = '{"ts":"2026-01-01T00:00:00Z","event":"bootstrap"}\n';
    writeRawLog(tmpRoot, existing);

    appendEvent(tmpRoot, { event: 'error', initiative: 'x' });

    const { events } = readEvents(tmpRoot);
    assert.equal(events.length, 2);
    assert.equal(events[0].event, 'bootstrap');
    assert.equal(events[1].event, 'error');
  });

  it('handles empty event-log.jsonl file', () => {
    writeRawLog(tmpRoot, '');
    const { events, errors } = readEvents(tmpRoot);
    assert.equal(events.length, 0);
    assert.equal(errors.length, 0);
  });

  it('custom logPath option works across all functions', () => {
    const custom = 'custom/path/log.jsonl';
    appendEvent(tmpRoot, { event: 'bootstrap' }, { logPath: custom });
    const { events } = readEvents(tmpRoot, { logPath: custom });
    assert.equal(events.length, 1);
  });
});
