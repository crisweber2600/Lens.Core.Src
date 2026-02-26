```prompt
---
description: Launch QuickDev — rapid parity verification via target-project agents (Amelia/Developer, small audience, no promotion gates)
---

Activate @lens agent and execute /quickdev:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/quickdev` command to launch the QuickDev phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. No promotion gate required — quickdev operates within small audience
6. Derive audience from lifecycle contract: `quickdev` → `small`
7. Create and checkout phase branch `{initiative_root}-small-quickdev` from `{initiative_root}-small` (push immediately)
8. Activate Amelia (Developer) as agent owner for this phase:
   - Load and adopt persona from: `_bmad/bmm/agents/dev.md`
   - Remain as Amelia for all quickdev operations

Use `#think` before selecting parity agent or planning batch execution.

**Phase identity:**
- Phase: `quickdev` | Display: QuickDev | Audience: `small`
- Agent owner: Amelia (Developer) — `_bmad/bmm/agents/dev.md`
- Branch pattern: `{initiative_root}-small-quickdev`
- Track: `quickdev` (rapid execution — no full planning ceremony)

**Prerequisites:**
- Active initiative exists (state.yaml + initiative config)
- Target project has parity agents in `.github/agents/` directory
- Environment variables set: `NORTHSTARUSERNAME`, `NORTHSTARPASSWORD`
- Aspire AppHost available for backend services

**Target project agents (delegated to, not loaded by @lens):**
| Agent | Purpose | When to use |
|-------|---------|-------------|
| `visual-parityV2` | Single page screenshot comparison and iterative fixes | Quick single-page verification |
| `prod-local-parity-v2` | Zero-tolerance 8-phase parity with test generation | Full parity with automated tests |
| `sprint-task-picker` | ADO sprint task → parity agent pipeline | Batch execution from sprint backlog |

**Execution sequence:**

**[0] Pre-Flight (required)**
- Verify clean working directory (git-orchestration)
- Load two-file state
- Create phase branch `{initiative_root}-small-quickdev` from `{initiative_root}-small`; push immediately
- Ensure `{docs_path}/parity-reports/` directory exists

**[1] Target Selection**
- User selects: single page, full parity, sprint batch, or custom agent
- Each mode delegates to a different target-project agent

**[2] Agent Delegation**
- Switch working directory to target project (`TargetProjects/northstar/migration/NorthStarET/`)
- Invoke selected agent with user-provided parameters (page name, menu path, etc.)
- Agent executes parity workflow in target project context
- All code changes happen in the target project, not the BMAD planning repo

**[3] Capture Parity Report**
- After agent completes, generate structured parity report
- Save to `{docs_path}/parity-reports/{page-slug}_{timestamp}.md`
- Report includes: differences found, fixes applied, remaining issues, tests generated

**[4] State Update**
- Update initiative config with quickdev run metadata
- Append to event-log.jsonl

**[5] Commit and Continue**
- Commit parity report to planning repo
- Push to phase branch
- Display next steps and related stories (S-009, S-032)

**Related stories:**
- S-009 — SectionDataEntry Parity Tests (EP-002)
- S-032 — Visual Regression Baseline Capture (EP-006)

**Parity report format:**
Reports are saved to `{docs_path}/parity-reports/` with naming convention:
`{page-slug}_{YYYY-MM-DD_HHmmss}.md`

Each report captures agent output, differences, fixes, remaining issues, and test evidence.
This provides an auditable trail linking parity verification to planning artifacts.
```
