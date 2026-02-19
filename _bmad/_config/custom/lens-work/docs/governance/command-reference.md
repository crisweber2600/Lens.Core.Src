# Governance Command Reference

All governance commands available in lens-work.

---

## Compass Menu Commands

These commands are available from the main Compass navigation menu.

### /constitution

Create, amend, or view a constitution at the current LENS layer.

```
/constitution
```

**Modes:**
- `[V] View` — Display current constitution (default)
- `[C] Create` — New constitution from template
- `[A] Amend` — Modify existing constitution

**Workflow:** `workflows/governance/constitution/workflow.md`
**Agent:** Scribe (Cornelius)

---

### /resolve

Display the resolved constitution for the current context.

```
/resolve
```

Walks the inheritance chain (Domain → current layer) and shows all accumulated articles with sources.

**Workflow:** `workflows/governance/resolve-constitution/workflow.md`
**Agent:** Scribe (Cornelius)

---

### /compliance

Run a compliance check against an artifact.

```
/compliance
```

Evaluates a PRD, architecture doc, story, or code file against resolved constitutional rules.

**Output:** PASS/WARN/FAIL per article, with overall verdict (COMPLIANT / CONDITIONAL PASS / NON-COMPLIANT).

`/review` also invokes compliance checks automatically for implementation-gate artifacts and blocks on FAIL.

**Workflow:** `workflows/governance/compliance-check/workflow.md`
**Agent:** Scribe (Cornelius)

---

### /ancestry

Display the constitution inheritance chain.

```
/ancestry
```

Shows the heritage tree with ratification dates, article counts, and amendment history.

**Workflow:** `workflows/governance/ancestry/workflow.md`
**Agent:** Scribe (Cornelius)

---

## Direct Scribe Activation

Invoke Scribe directly without routing through Compass:

```
@bmad-agent-lens-work-scribe
```

Scribe presents its own governance menu with all commands.

---

## Internal Workflows

### resolve-context

Internal workflow that injects `constitutional_context` into the LENS context for lifecycle routers and governance workflows.

Not user-facing — automatically called by `/pre-plan`, `/spec`, `/plan`, `/review`, and `/dev` before phase logic executes.

**Workflow:** `workflows/governance/resolve-context/workflow.md`

---

## Event Types

All governance operations produce events in `event-log.jsonl`:

| Event Type | Trigger | Required Fields |
|------------|---------|-----------------|
| `constitution-created` | `/constitution` create mode | layer, name, articles_count, ratified_by, git_commit_sha |
| `constitution-amended` | `/constitution` amend mode | layer, name, amendment_summary, articles_added, articles_modified |
| `compliance-evaluated` | `/compliance` | artifact_path, artifact_type, pass_count, warn_count, fail_count, initiative_id (required) |
| `constitution-resolved` | `/resolve` | target_layer, layers_walked, total_articles |

---

_Command Reference for lens-work governance_

