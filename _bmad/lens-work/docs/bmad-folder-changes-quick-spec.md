# Quick-Spec: _bmad Folder Changes

Document Version: 1.0  
Last Updated: February 5, 2026  
Commit Range: 7dc8c515 -> HEAD  
Scope: All changes to _bmad/ folder structure  
Summary: 89 files changed, 7,034 insertions(+), 307 deletions(-)

---

## Overview

This quick-spec documents significant enhancements to the _bmad folder structure, focusing on:
- State management refactoring
- New utility workflows
- Enhanced agent capabilities
- Router workflow expansion
- Comprehensive documentation, validation, and testing

---

## 1. State Management Architecture Changes

### 1.1 Two-File State Structure

Changed Files:
- _bmad/lens-work/workflows/utility/migrate-state/workflow.md (NEW +168)
- _bmad/lens-work/workflows/utility/status/workflow.md (+25)
- _bmad/lens-work/workflows/utility/resume/workflow.md (+13)
- _bmad/lens-work/workflows/router/init-initiative/workflow.md (NEW +255)

Key Changes:

Split state.yaml into two files:
- Personal state (git-ignored)
  - state.yaml
  - Tracks active initiative and current position
- Initiative config (git-committed)
  - initiatives/{id}.yaml
  - Tracks gates, blocks, repos, phases

State Loading Pattern:

```
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
```

### 1.2 Initiative Configuration Schema

```
id: redis-scraper-f4c8e1
name: Redis Scraper POC
layer: service
domain: claut
created_at: 2026-02-03T10:00:00Z
created_by: crisweber
target_repo: CLAUT/Core
gates:
  - name: tests-pass
    status: open
blocks: []
```

---

## 2. New Utility Workflows

### 2.1 Switch Workflow (Context Switcher)

Files:
- _bmad/lens-work/workflows/utility/switch/workflow.md (NEW +469)
- _bmad/lens-work/prompts/lens-work.switch.prompt.md (NEW +32)

Purpose: Interactive context switching with branch checkout and state sync

Features:
- Switch active initiative
- Switch lens (domain/service/microservice/feature)
- Switch phase (P0-P4)
- Switch lane (small/medium/large)
- Automatic branch resolution via Casey
- Branch hierarchy:

```
{domain}/{initiative_id}/{lane}-{phase}
```

Casey Integrations:
- branch-status
- checkout-branch
- fetch-and-checkout
- create-branch-if-missing
- create-branch

### 2.2 Check-Repos Workflow

File: _bmad/lens-work/workflows/utility/check-repos/workflow.md (NEW +152)

Checks:
- Repo exists in TargetProjects
- Valid git repo
- Correct remote
- Branch exists and checked out
- No uncommitted changes
- Sync with remote

### 2.3 Migrate-State Workflow

File: _bmad/lens-work/workflows/utility/migrate-state/workflow.md

Process:
1. Load old state.yaml
2. Extract initiative data
3. Create initiatives/
4. Write initiatives/{id}.yaml
5. Backup old state
6. Write new personal state
7. Log migration
8. Output commit instructions

---

## 3. Enhanced Onboarding Workflow

File: _bmad/lens-work/workflows/utility/onboarding/workflow.md (+274)

### 3.1 Profile Creation
- Reads git config user.name/email
- Saves to _bmad-output/personal/profile.yaml
- Overrides bmad-config.yaml

### 3.2 Repository Reconciliation
- Loads repo-inventory.yaml
- Scans TargetProjects/
- Fixes missing repos and wrong branches
- Updates inventory

### 3.3 Inventory Update

Tracks:
- current_branch
- last_commit
- has_uncommitted
- is_git_repo

---

## 4. Agent Enhancements

### 4.1 Compass Agent

Files:
- compass.agent.yaml
- compass.spec.md

New Commands:
- /switch
- /context
- /constitution
- /lens

### 4.2 Casey Agent (Git Operations)

New Methods:
- branch-status
- create-branch-if-missing
- fetch-and-checkout
- show-branch

Enhanced Methods:
- checkout-branch
- create-branch

---

## 5. Router Workflow Enhancements

### 5.1 Init-Initiative Router

Initializes initiative and state files.

### 5.2 Dev Phase Router
- Lane validation
- Auto-branch creation
- Merge gate checking

### 5.3 Plan Phase Router
- Story breakdown
- Planning artifact generation

### 5.4 Pre-Plan Router
- Constitution enforcement
- Discovery validation

### 5.5 Spec Router
- Architecture and technical spec generation

### 5.6 Review Router
- PR validation
- Checklist enforcement
- Gate updates

---

## 6. New Include Files

### 6.1 Lane Topology
- 4-level branch hierarchy
- Lane and phase definitions
- Merge strategies

### 6.2 JIRA Integration
- Story templates
- Epic/Feature linking
- Sprint queries

### 6.3 Gate Event Template
- Gate definitions
- Event logging
- Validation rules

### 6.4 PR Links
- URL standards
- Validation
- Review integration

### 6.5 Docs Path
- Canonical paths
- Naming conventions
- Version control rules

### 6.6 Artifact Validator
- Schemas
- Required fields
- Workflow integration

---

## 7. New Documentation
- Migration Guide
- Branch Protection
- CI Integration
- Hotfix / Release Strategy
- Multi-Repo Initiatives

---

## 8. New and Updated Prompts

New:
- /switch
- /context
- /constitution
- /compliance
- /focus
- /lens

Updated:
- new-domain
- new-service
- new-feature
- start

---

## 9. Testing and Validation

### 9.1 Test Specifications
- State management
- Branch switching
- Initiative creation
- Workflow execution
- Agent integration
- Error handling

### 9.2 Validation Scripts
- validate-lens-work.ps1
- sync-prompts.ps1

---

## 10. Configuration Updates

### 10.1 Module Config
- Agent registry
- Workflow registry
- Validation rules
- CI/CD hooks

### 10.2 BMAD Config
- New state paths
- Initiative directories
- Enhanced routing

### 10.3 README

Expanded with:
- Architecture
- Lifecycle
- Commands
- Examples

---

## 11. Custom Config Updates

Path: _bmad/_config/custom/lens-work/
- Synced with core
- Updated prompts
- Updated workflows

---

## 12. Memory Updates
- Updated state paths
- Profile path configuration

---

## 13. Key Architectural Decisions

### 13.1 State Separation

Problem: Merge conflicts in shared state.yaml

Solution:
- Personal state (local)
- Initiative config (shared)

Benefits:
- No merge conflicts
- Clean isolation
- Easy switching

### 13.2 Branch Topology

```
{domain}/{initiative_id}/{lane}-{phase}
```

Example:

```
claut/redis-scraper-f4c8e1/small-p3
```

### 13.3 Casey Integration

Decision: Delegate all git operations to Casey

Benefits:
- Centralized logic
- Safer operations
- Easier testing

---

## 14. Breaking Changes

### 14.1 State File Format

Old:

```
initiative:
  id: xyz
  gates: [...]
current:
  phase: p2
```

New:

```
# state.yaml (personal)
active_initiative: xyz
current:
  phase: p2

# initiatives/xyz.yaml (shared)
id: xyz
gates: [...]
```

Migration Required: @tracey migrate-state

### 14.2 Profile Location

Old: _bmad/lens-work/profiles/{name}.yaml  
New: _bmad-output/personal/profile.yaml

### 14.3 Command Changes

Removed: #new-feature  
Added: /new-feature, /switch, /context, /constitution

---

## 15. Migration Path

### Existing Users
- @tracey migrate-state
- Move profiles -> commit initiatives -> update .gitignore

### New Users
- @scout onboard
- @compass /new-feature "your feature"
- @compass /switch

---

## 16. File Change Summary

| Category   | Files | Insertions | Deletions |
|------------|-------|------------|-----------|
| Workflows  | 23    | 2,847      | 89        |
| Agents     | 5     | 339        | 10        |
| Includes   | 6     | 1,609      | 0         |
| Prompts    | 23    | 346        | 28        |
| Docs       | 5     | 324        | 0         |
| Tests      | 1     | 759        | 0         |
| Scripts    | 2     | 177        | 0         |
| Config     | 7     | 433        | 180       |
| **TOTAL**  | 89    | 7,034      | 307       |

---

## 17. Testing Checklist
- Migration works
- New initiatives correct
- /switch aligns branches
- Casey edge cases handled
- Onboarding correct
- Status shows both files
- Routers update configs
- Validation passes

---

## 18. Next Steps

### Immediate
- Test migration
- Validate workflows
- Document issues

### Short-term
- VS Code UI
- CI validation
- Telemetry

### Long-term
- Multi-user sync
- History and rollback
- Advanced branching

---

## 19. Related Documentation
- Migration Guide
- Lane Topology
- JIRA Integration
- Test Specifications
- README

---

## 20. Questions and Answers

Why split state?  
To avoid merge conflicts.

What happens to old state?  
Backed up as state.yaml.backup.

Can I switch without switching branches?  
No.

How do I create an initiative?  
@compass /new-feature "name"

If Casey is unavailable?  
Manual git allowed, but validation is reduced.

---

## Notes / Punch List (Chat)
1. Double-check onboarding repo cloning
2. Fix branching
3. Session state save bug
4. Reduce Copilot Q&A churn
5. Stop using JIRA MCP; use CSVs
6. Follow flows more strictly

---

If you want this:
- exported as a file
- split into ADRs
- converted to release notes
- trimmed to a PR description

say which one and I will do it immediately.
