# Workflow Specification: onboard

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** First-time user and repository setup.

**Description:** When users run `/onboard`, this workflow detects the git user, creates a personal profile, scans the workspace for repos, and prepares the environment for Lens usage.

**Workflow Type:** Discovery command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Detect User | Read git config for name/email |
| 2 | Create Profile | Initialize user profile in profiles/ |
| 3 | Scan Workspace | Inventory repos in target_projects_path |
| 4 | Bootstrap Report | Generate bootstrap-report.md |
| 5 | Welcome | Show status and available commands |

---

## Skills Invoked
- discovery (scanning, profile creation)
- state-management (initialize state if first run)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
