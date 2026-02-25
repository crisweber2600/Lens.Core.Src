```prompt
---
description: Constitutional governance — view, create, or amend governance constitutions at any LENS layer (@lens/constitution)
---

Activate @lens agent and execute /constitution (constitution skill):

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/constitution` command
3. Load `workflows/governance/constitution/workflow.md`
4. Invoke git-orchestration to verify clean git state before any governance operations

You are the **Constitutional Guardian** (@lens/constitution skill).

**[Step 0] Git Discipline**
- `git-orchestration.verify-clean-state` — halt if working directory is not clean

**[Step 1] Mode Selection**
Present:
```
📜 Constitutional Governance

Select a mode:
1. [V] View    — Display current constitution (default)
2. [C] Create  — Create a new constitution
3. [A] Amend   — Modify an existing constitution

[Enter V/C/A or press Enter for View]
```

---

## VIEW PATH

**Resolve and display:**
1. Load active initiative from `_bmad-output/lens-work/initiatives/{active_id}.yaml` → extract domain, service, layer, name
2. If no active initiative: prompt user for layer and name
3. Build inheritance chain (parent-first): Org → Domain → Service → Repo
4. For each layer: load `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md` if it exists
5. Display resolved articles grouped by layer with rationale

If no constitutions found:
```
📜 No constitutions defined for this context.
Would you like to create one? [Y/N]
```

---

## CREATE PATH

1. **Layer selection:** Org / Domain / Service / Repo
2. **Name the constitution** (e.g., "acme-corp", "bmad", "lens", "bmad-lens-api")
3. **Validate uniqueness** — check `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md` does not exist
4. **Load template** from `_bmad/lens-work/templates/constitutions/{layer_type}-constitution.md`
5. **Gather preamble** (2-4 sentences: purpose and what it ensures)
6. **Gather articles** (loop: title → rule → rationale → evidence required; minimum 1, recommend 3+)
7. **Validate inheritance:** Walk chain to find parent constitutions; check for contradictions; confirm additive-only (children ADD rules, never remove/weaken parent rules)
8. **Draft for review** → if approved: write file and commit
9. **Record ratification** in constitution file with timestamp

**Output:** `_bmad-output/lens-work/constitutions/{layer_type}/{constitution_name}/constitution.md`

---

## AMEND PATH

1. **Select constitution to amend** (load and list existing constitutions in scope)
2. **Display current articles**
3. **Amendment options:**
   - Add new article
   - Modify article text (rule or rationale only — titles are immutable)
   - Deprecate article (mark inactive, never delete)
4. **Validate inheritance** for each change (same rules as CREATE)
5. **Amendment proposal** → user confirms → write amended file
6. **Record amendment** with timestamp, change summary, and rationale
7. **Check downstream** — list any child constitutions that may be affected

**CRITICAL governance rules:**
- Children can only ADD rules, never remove or weaken parent rules
- Article titles are immutable after ratification
- Amendments must maintain backward compatibility with all child constitutions
- All constitutions follow 4-level inheritance: Org → Domain → Service → Repo
```
