# Agents Reference

LENS Sync & Discovery includes 3 specialized agents:

---

## Bridge — The Synchronizer

**ID:** `_bmad/agents/bridge/bridge.md`
**Icon:** 🧱

**Role:**
Synchronize physical project structure with the lens domain map and bootstrap environments safely.

**When to Use:**
When you need to create or align folder structures, clone repositories, or identify drift between lens and reality.

**Key Capabilities:**
- Bootstrap project structure from domain map
- Detect and report drift
- Reconcile conflicts between lens and filesystem

**Menu Triggers:**
- [BS] bootstrap
- [SS] sync-status
- [RC] reconcile

---

## Scout — Discovery Specialist

**ID:** `_bmad/agents/scout/scout.md`
**Icon:** 🔍

**Role:**
Analyze brownfield codebases to extract architecture, APIs, data models, and business context.

**When to Use:**
When you need to understand a legacy service or produce BMAD-ready documentation.

**Key Capabilities:**
- Full discovery pipeline
- Deep technical analysis
- Documentation generation from findings

**Menu Triggers:**
- [DS] discover
- [AC] analyze-codebase
- [GD] generate-docs

---

## Link — Lens Guardian

**ID:** `_bmad/agents/link/link.md`
**Icon:** 🔗

**Role:**
Maintain lens data integrity, propagate documentation, and manage sharding and rollback.

**When to Use:**
When documentation changes need to be rolled up or validated across the lens hierarchy.

**Key Capabilities:**
- Propagate documentation upward
- Validate lens schemas
- Rollback changes safely

**Menu Triggers:**
- [UL] lens-sync
- [VS] validate-schema
- [RB] rollback

---
