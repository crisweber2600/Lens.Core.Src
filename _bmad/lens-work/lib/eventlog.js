/**
 * Event Log Module (S-006)
 *
 * Append-only JSONL event log for LENS lifecycle events.
 * Provides append, read, and filter operations on
 * `_bmad-output/lens-work/event-log.jsonl`.
 *
 * Contract:
 *   - Every line is valid JSON (JSONL format)
 *   - Events are immutable — append-only, never edit or delete
 *   - Required fields: ts (ISO8601), event (type string)
 *   - Optional: initiative, user, phase, details, etc.
 *
 * @module lib/eventlog
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default event-log.jsonl location relative to project root */
const DEFAULT_LOG_RELATIVE = '_bmad-output/lens-work/event-log.jsonl';

/**
 * All recognised event types from architecture §4.3 + state-management skill.
 * Events with unrecognised types issue a warning but are still appended
 * to preserve forward-compatibility.
 */
const EVENT_TYPES = Object.freeze([
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
  // Legacy / observed in real logs (kept for compat)
  'bootstrap',
  'branch-sync',
  'init-initiative',
  'phase_start',
  'start-phase',
  'phase_pr_created',
  'phase_complete',
  'party_mode_review',
  'constitution-ratified',
  'constitution-compliance-fix',
  'techplan_review_complete',
  'dev_phase_start',
  'state_write',
  'state_initialized',
  'initiative_updated',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the absolute path to the event log.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {string} [relativePath] - Override for relative log path
 * @returns {string} Absolute path to event-log.jsonl
 */
function resolveLogPath(projectRoot, relativePath) {
  if (!projectRoot) {
    throw new Error('projectRoot is required');
  }
  return path.resolve(projectRoot, relativePath || DEFAULT_LOG_RELATIVE);
}

/**
 * Validate an event object before appending.
 *
 * Returns { valid: true } or { valid: false, errors: string[] }.
 *
 * @param {object} event
 * @returns {{ valid: boolean, errors?: string[], warnings?: string[] }}
 */
function validateEvent(event) {
  const errors = [];
  const warnings = [];

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  // Required: ts
  if (!event.ts) {
    errors.push('Missing required field: ts');
  } else if (typeof event.ts !== 'string') {
    errors.push('Field "ts" must be an ISO8601 string');
  } else {
    // Validate ISO8601
    const d = new Date(event.ts);
    if (isNaN(d.getTime())) {
      errors.push(`Field "ts" is not a valid ISO8601 date: ${event.ts}`);
    }
  }

  // Required: event (type)
  if (!event.event) {
    errors.push('Missing required field: event');
  } else if (typeof event.event !== 'string') {
    errors.push('Field "event" must be a string');
  } else if (!EVENT_TYPES.includes(event.event)) {
    warnings.push(`Unrecognised event type: "${event.event}" (will still be appended)`);
  }

  const result = { valid: errors.length === 0 };
  if (errors.length) result.errors = errors;
  if (warnings.length) result.warnings = warnings;
  return result;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Append a single event to the event log.
 *
 * Will auto-populate `ts` with the current ISO8601 timestamp if not provided.
 * Creates the log file (and parent directories) if it doesn't exist.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {object} event - Event object ({ event, initiative?, user?, ... })
 * @param {object} [options]
 * @param {string} [options.logPath] - Override relative log path
 * @param {boolean} [options.strict=false] - Reject unrecognised event types
 * @returns {{ success: boolean, warnings?: string[], errors?: string[] }}
 */
function appendEvent(projectRoot, event, options = {}) {
  // Auto-populate timestamp
  const eventObj = { ...event };
  if (!eventObj.ts) {
    eventObj.ts = new Date().toISOString();
  }

  // Validate
  const validation = validateEvent(eventObj);

  if (options.strict && validation.warnings?.length) {
    return {
      success: false,
      errors: validation.warnings.map((w) => w.replace('(will still be appended)', '(strict mode)')),
    };
  }

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // Resolve path and ensure directory
  const logPath = resolveLogPath(projectRoot, options.logPath);
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Serialize — deterministic key order: ts, event, initiative first
  const ordered = {};
  if (eventObj.ts) ordered.ts = eventObj.ts;
  if (eventObj.event) ordered.event = eventObj.event;
  if (eventObj.initiative) ordered.initiative = eventObj.initiative;
  // Copy remaining keys
  for (const key of Object.keys(eventObj)) {
    if (!(key in ordered)) {
      ordered[key] = eventObj[key];
    }
  }

  const line = JSON.stringify(ordered);

  // Append with newline
  fs.appendFileSync(logPath, line + '\n', 'utf8');

  const result = { success: true };
  if (validation.warnings?.length) {
    result.warnings = validation.warnings;
  }
  return result;
}

/**
 * Read all events from the event log.
 *
 * Returns an array of parsed event objects. Skips blank lines.
 * Lines that fail JSON.parse are returned in the `errors` array.
 *
 * @param {string} projectRoot
 * @param {object} [options]
 * @param {string} [options.logPath] - Override relative log path
 * @returns {{ events: object[], errors: Array<{line: number, raw: string, error: string}> }}
 */
function readEvents(projectRoot, options = {}) {
  const logPath = resolveLogPath(projectRoot, options.logPath);

  if (!fs.existsSync(logPath)) {
    return { events: [], errors: [] };
  }

  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  const events = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue; // skip blank lines

    try {
      events.push(JSON.parse(raw));
    } catch (err) {
      errors.push({
        line: i + 1,
        raw,
        error: err.message,
      });
    }
  }

  return { events, errors };
}

/**
 * Read and filter events for a specific initiative.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId - Initiative ID to filter by
 * @param {object} [options]
 * @param {string} [options.logPath] - Override relative log path
 * @param {string} [options.eventType] - Filter by event type
 * @param {string} [options.since] - ISO8601 — only events after this time
 * @param {string} [options.until] - ISO8601 — only events before this time
 * @returns {{ events: object[], errors: Array<{line: number, raw: string, error: string}> }}
 */
function filterEvents(projectRoot, initiativeId, options = {}) {
  const { events, errors } = readEvents(projectRoot, options);

  let filtered = events.filter((e) => {
    // Match initiative by any of the common ID fields
    return (
      e.initiative === initiativeId ||
      e.id === initiativeId
    );
  });

  // Filter by event type
  if (options.eventType) {
    filtered = filtered.filter((e) => e.event === options.eventType);
  }

  // Filter by date range
  if (options.since) {
    const since = new Date(options.since).getTime();
    filtered = filtered.filter((e) => new Date(e.ts).getTime() >= since);
  }
  if (options.until) {
    const until = new Date(options.until).getTime();
    filtered = filtered.filter((e) => new Date(e.ts).getTime() <= until);
  }

  return { events: filtered, errors };
}

/**
 * Get the last event of a given type for an initiative.
 *
 * @param {string} projectRoot
 * @param {string} initiativeId
 * @param {string} eventType
 * @param {object} [options]
 * @param {string} [options.logPath]
 * @returns {object|null} The most recent matching event, or null
 */
function getLastEvent(projectRoot, initiativeId, eventType, options = {}) {
  const { events } = filterEvents(projectRoot, initiativeId, {
    ...options,
    eventType,
  });
  return events.length ? events[events.length - 1] : null;
}

/**
 * Count events, optionally grouped by event type.
 *
 * @param {string} projectRoot
 * @param {object} [options]
 * @param {string} [options.logPath]
 * @param {string} [options.initiative] - Filter by initiative
 * @returns {{ total: number, byType: Record<string, number> }}
 */
function countEvents(projectRoot, options = {}) {
  const { events } = options.initiative
    ? filterEvents(projectRoot, options.initiative, options)
    : readEvents(projectRoot, options);

  const byType = {};
  for (const e of events) {
    const type = e.event || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
  }

  return { total: events.length, byType };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  DEFAULT_LOG_RELATIVE,
  EVENT_TYPES,

  // Helpers
  resolveLogPath,
  validateEvent,

  // Core API
  appendEvent,
  readEvents,
  filterEvents,
  getLastEvent,
  countEvents,
};
