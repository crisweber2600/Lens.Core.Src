# Getting Started with Lens

Lens is the unified lifecycle router for BMAD. You interact with one agent (`@lens`) through Copilot Chat, and it orchestrates every phase of your initiative — from brainstorming through implementation — by delegating to internal skills and routing work to the right BMAD modules.

This guide walks you through your first complete session: onboarding, creating an initiative, running the first phase, and checking progress.

## What You Need

Before you begin, confirm:

- BMAD is installed with the Lens module enabled
- Your workspace has a git repository initialized
- Git user identity is configured (`git config user.name` and `git config user.email`)
- Copilot Chat is available in your IDE

## Step 1: Onboard

Run the onboard command in Copilot Chat:

```text
@lens /onboard
```

Lens detects your git identity, creates a user profile, and scans your workspace. You see output like:

```text
🔭 /onboard — Welcome to Lens!
└── Detecting your environment...

📋 Profile created for Jane Smith
├── Email: jane@example.com
├── Discovery depth: shallow
└── Default audiences: small, medium, large

🔍 Scanning workspace...
├── Found 3 git repositories
├── Inventory saved to _bmad-output/lens/repo-inventory.yaml
└── Run /discover for deeper analysis
```

Onboarding is a one-time step. If you run it again, Lens updates your profile's `last_seen` timestamp and refreshes the workspace scan.

## Step 2: Create an Initiative

Start a new initiative with:

```text
@lens /new
```

Lens asks three questions:

1. **Type** — Domain (organizational grouping), Service (service within a domain), or Feature (full lifecycle with branch topology)
2. **Name and ID** — A descriptive name and a slugified identifier
3. **Audiences** — Review groups for progressive disclosure (default: small, medium, large)

Here is what a typical feature initiative looks like:

```text
🔭 /new — Create Initiative

What type of initiative?

[D] Domain — organizational grouping (single branch)
[S] Service — service within a domain (single branch)
[F] Feature — feature/microservice with full lifecycle (full topology)
```

After selecting Feature and providing details, Lens creates the branch topology:

```text
✅ Initiative created
├── Name: User Authentication Flow
├── Type: feature
├── ID: auth-flow
├── Branch root: platform-user-mgmt-auth-flow
├── Branches created:
│   platform-user-mgmt-auth-flow
│   ├── platform-user-mgmt-auth-flow-small
│   ├── platform-user-mgmt-auth-flow-medium
│   └── platform-user-mgmt-auth-flow-large
└── Next: Run /pre-plan to begin the lifecycle
```

All branches are pushed to the remote immediately. The initiative config is saved at `_bmad-output/lens/initiatives/auth-flow.yaml`, and the global state file is updated.

## Step 3: Start Pre-Planning

Begin the first phase:

```text
@lens /pre-plan
```

Lens creates your phase branch (`platform-user-mgmt-auth-flow-small-p1`), checks governance rules, and presents workflow options:

```text
🔭 /pre-plan — Pre-Plan Phase

You're starting the Pre-Plan phase. Available workflows:

[1] Brainstorming (optional) — Creative exploration with CIS
[2] Research (optional) — Deep dive research with CIS
[3] Product Brief (required) — Define problem, vision, and scope

Recommended path: 1 → 2 → 3 (or skip to 3 if you have clarity)

Select workflow(s): [1] [2] [3] [A]ll [S]kip to Product Brief
```

Each workflow creates a sub-branch (e.g., `platform-user-mgmt-auth-flow-small-p1-brainstorm`) so your work stays isolated. When the workflow completes, Lens merges it back to the phase branch.

At any point during a phase you can use these keywords:

| Keyword | Effect |
|---------|--------|
| `defaults` | Apply defaults to the current step |
| `yolo` | Apply defaults to the entire remaining workflow |
| `all questions` | Present all questions upfront for batch answers |
| `skip` | Jump to a named optional step |
| `pause` | Save progress and resume later with `/resume` |
| `back` | Roll back to the previous step |

When the required artifact (`product-brief.md`) is complete, Lens runs gate validation and finishes the phase:

```text
✅ Pre-Plan phase complete
├── Gate: pre-plan = passed
├── Artifacts: product-brief.md ✅
├── Checklist: 3/3 required items complete
├── PR: platform-user-mgmt-auth-flow-small-p1 → platform-user-mgmt-auth-flow-small
└── Next: Run /plan to continue
```

## Step 4: Progress Through Phases

Each phase follows the same pattern — Lens creates the branch, validates gates from the previous phase, routes work to the appropriate BMAD module, and closes with a PR:

| Phase | Command | Routes to | Key output |
|-------|---------|-----------|------------|
| P1 Pre-Plan | `/pre-plan` | CIS + BMM | `product-brief.md` |
| P2 Plan | `/plan` | BMM | `prd.md`, `epics.md` |
| P3 Tech-Plan | `/tech-plan` | BMM | `architecture.md`, `tech-decisions.md` |
| P4 Story-Gen | `/Story-Gen` | BMM | `implementation-stories.md` |
| P5 Review | `/Review` | Lens-native | `readiness-report.md` |
| P6 Dev | `/Dev` | BMM | Source code, tests, PRs |

Phases P2 and P3 include an **audience cascade merge** — artifacts from smaller audiences automatically merge into larger ones before the next phase begins, so the full context accumulates progressively.

Phase 5 (`/Review`) is unique: Lens runs it internally without routing to another module, validating all prior phases, checking every gate, and producing a readiness report.

## Step 5: Check Status

Two views are available at any point:

**Compact status:**

```text
@lens /status
```

```text
📊 Status: auth-flow (feature)
├── Phase: Pre-Plan (P1)
├── Branch: platform-user-mgmt-auth-flow-small-p1
├── Audience: small
├── Checklist: 2/3 complete
├── Gates: pre-plan=in-progress, plan=not-started, ...
└── Workflow: running
```

**Expanded context:**

```text
@lens /lens
```

This shows the full initiative details: all gate statuses, expanded checklist with individual items, branch topology, recent events from the event log, background errors (if any), and available commands.

## Command Reference

| Command | Type | Purpose |
|---------|------|---------|
| `/onboard` | Discovery | First-time user and workspace setup |
| `/new` | Initiative | Create a new initiative |
| `/switch` | Initiative | Switch between active initiatives |
| `/pre-plan` | Phase | Brainstorming, discovery, vision setting |
| `/plan` | Phase | Product requirements and feature definition |
| `/tech-plan` | Phase | Architecture and technical design |
| `/Story-Gen` | Phase | Generate implementation stories |
| `/Review` | Phase | Implementation readiness checks |
| `/Dev` | Phase | Implementation loop — code, test, PR |
| `/status` | Utility | Compact state display |
| `/lens` | Utility | Full expanded context |
| `/sync` | Utility | Reconcile state with git |
| `/fix` | Utility | Repair corruption from event log |
| `/override` | Utility | Manual state override (advanced) |
| `/resume` | Utility | Resume interrupted workflow |
| `/archive` | Utility | Archive completed initiative |
| `/discover` | Discovery | Scan and inventory repositories |
| `/bootstrap` | Discovery | Initialize BMAD in target repos |

## Managing Multiple Initiatives

You can run several initiatives in parallel. Use `/new` to create each one, and `/switch` to move between them:

```text
@lens /switch
```

Lens lists all initiatives from `_bmad-output/lens/initiatives/`, lets you select one, loads its state, and checks out the appropriate branch. Only one initiative is active at a time.

## Recovery Commands

If something goes wrong, Lens has a three-tier recovery ladder:

1. **`/sync`** — Lightweight. Compares `state.yaml` against actual git branches and fixes drift.
2. **`/fix`** — Rebuilds `state.yaml` from scratch by replaying `event-log.jsonl`.
3. **`/override`** — Manual. Lets you set any state field directly.

All three are idempotent — running them multiple times produces the same result.

## Next Steps

- Read [Architecture](architecture.md) to understand how Lens delegates internally
- Read [Configuration](configuration.md) to customize audiences, discovery depth, and governance
- Read [Branch Topology](branch-topology.md) for the full branch naming and lifecycle strategy
- Read [Troubleshooting](troubleshooting.md) if you hit an issue
