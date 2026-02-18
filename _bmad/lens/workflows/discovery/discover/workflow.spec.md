# Workflow Specification: discover

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Scan and inventory repositories under target_projects_path.

**Description:** When users run `/discover`, this workflow performs a scan of the configured TargetProjects directory, inventories all repos, their branches, and BMAD structure status.

**Workflow Type:** Discovery command (user-facing, idempotent)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Read Config | Get target_projects_path and discovery_depth |
| 2 | Scan Repos | Walk directory tree, identify git repos |
| 3 | Inventory | Record repo details (branches, size, BMAD status) |
| 4 | Write Output | Save repo-inventory.yaml |
| 5 | Report | Show discovered repos and recommendations |

---

## Skills Invoked
- discovery (scanning, inventory)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
