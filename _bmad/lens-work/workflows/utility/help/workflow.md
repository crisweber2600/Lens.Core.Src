---
name: help
description: "Display full command reference with context-sensitive next steps and quick-start guidance"
agent: "@lens"
trigger: "/help or H via @lens"
category: utility
version: "2.0.0"
---

# Help Display Workflow

**Purpose:** Display a structured command reference for lens-work, organised by category, with context-sensitive highlighting of the next recommended commands for the current initiative state.

---

## Input Parameters

None required — optionally reads `_bmad-output/lens-work/state.yaml` for context-aware highlighting.

---

## Steps

### Step 1 — Check Current Context (Optional)

Attempt to read `_bmad-output/lens-work/state.yaml`. If available, note the current phase and audience for Step 3 highlighting. If unavailable, show the full reference without highlighting.

### Step 2 — Display Command Reference

Display the full command reference grouped by category:

---

#### 🚀 Initiative Setup
| Code | Name | Description |
|---|---|---|
| `ND` | New Domain | Create a domain-level initiative with organisational branch |
| `NS` | New Service | Create a service-level initiative |
| `NF` | New Feature | Create a feature-level initiative with full branch topology |
| `OB` | Onboard | Full onboarding (profile, credentials, repo reconciliation) |
| `BS` | Bootstrap | Bootstrap repository discovery and documentation |

#### 📋 Phase Commands (sequential)
| Code | Name | Phase | Description |
|---|---|---|---|
| `PP` | Pre-Plan | preplan | Brainstorm, research, product brief (Mary/Analyst) |
| `BP` | Business Plan | businessplan | PRD, UX (John/PM + Sally/UX) |
| `TP` | Tech Plan | techplan | Architecture, tech decisions, API contracts (Winston/Architect) |
| `SG` | Story Generation | devproposal | Generate stories with estimates and dependencies |
| `DP` | Dev Proposal | devproposal | Epics, stories, readiness (John/PM) |
| `SP` | Sprint Plan | sprintplan | Readiness gate, sprint planning (Bob/SM) |
| `DV` | Dev Loop | dev | Story implementation, code review, retro |

#### 🔄 State & Navigation
| Code | Name | Description |
|---|---|---|
| `ST` | Status | Display current state including initiative, phase, audience, gate progression |
| `CX` | Context | Display current active context summary |
| `SW` | Switch Context | Switch active initiative, lens, or phase |
| `SY` | Sync State | Validate and repair state consistency |
| `FX` | Fix State | Rebuild state from event-log.jsonl when state.yaml is corrupted |
| `OV` | Override State | Manual state override with safety confirmation |
| `RS` | Resume | Resume interrupted workflow from last checkpoint |
| `AR` | Archive | Archive completed or abandoned initiative |
| `RB` | Recreate Branches | Recreate missing git branches (recovery) |
| `FS` | Fix Story | Correction loop (Quick-Spec → Review → Quick-Dev) |

#### ⚖️ Governance
| Code | Name | Description |
|---|---|---|
| `CO` | Constitution | Create, amend, or view constitutions |
| `CC` | Compliance Check | Check artifact compliance against constitutions |
| `AN` | Ancestry | Display constitution inheritance chain |
| `RC` | Resolve Constitution | Resolve accumulated rules for current context |

#### 🔍 Discovery
| Code | Name | Description |
|---|---|---|
| `DR` | Discover Repos | Scan and inventory target project repositories |
| `RP` | Repo Status | Check status of all discovered repositories |
| `DM` | Domain Map | View or edit domain architecture map |
| `IA` | Impact Analysis | Cross-boundary impact analysis |

#### ℹ️ Help & Context
| Code | Name | Description |
|---|---|---|
| `H` | Help | This command — full command reference |
| `CX` | Context | Current active context |

---

### Step 3 — Context-Sensitive Highlighting

If current state is available, append a "What's Next?" block:

```
💡 What's Next for [{initiative_name}]
Current: Phase={current_phase}, Audience={audience}
Recommended: [{next_command_code}] {next_command_name}
```

Use this table to determine recommended next command:

| Phase | Audience | Recommended |
|---|---|---|
| (none) | — | `OB` Onboard or `ND` New Domain |
| preplan | small | `BP` Business Plan |
| businessplan | small | `TP` Tech Plan |
| techplan | small | `DP` Dev Proposal (promote to medium first) |
| devproposal | medium | `SP` Sprint Plan (promote to large first) |
| sprintplan | large | `DV` Dev Loop (promote to base first) |
| dev | base | Continue stories or `AR` Archive when complete |

---

## Output

- Inline formatted command reference table
- Context-sensitive "What's Next?" block (when state available)
- No files written

---

## Error Handling

| Condition | Action |
|---|---|
| `state.yaml` missing | Show full reference without context highlighting |
| Unrecognised phase in state | Show full reference, flag unknown phase |
