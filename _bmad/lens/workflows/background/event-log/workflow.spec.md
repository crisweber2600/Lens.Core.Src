# Workflow Specification: event-log (Background)

**Module:** lens
**Status:** Placeholder
**Created:** 2026-02-17
**Type:** Background (auto-triggered, not user-invoked)

---

## Purpose

Appends entries to event-log.jsonl on every state mutation.

## Triggers
- workflow_end
- phase_transition
- initiative_create
- error

## Event Format
```jsonl
{"ts":"ISO8601","event":"event_type","initiative":"id","user":"git_user","details":{}}
```

---

_Spec created on 2026-02-17 via BMAD Module workflow_
