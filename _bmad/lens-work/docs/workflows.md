# Workflows Reference

LENS Sync & Discovery includes 9 workflows:

---

## bootstrap

**Purpose:** Bootstrap target project structure from the lens domain map.

**When to Use:**
When setting up a new environment or aligning folder structure to the domain map.

**Key Steps:**
- Load lens map
- Scan folders
- Compare and analyze gaps
- Execute sync
- Validate and report

**Agent(s):** Bridge

---

## sync-status

**Purpose:** Detect drift between the lens model and physical project structure.

**When to Use:**
When you want a quick report of alignment and conflicts.

**Key Steps:**
- Load lens map
- Scan folders
- Compare structures
- Write drift report
- Recommend reconciliation

**Agent(s):** Bridge

---

## reconcile

**Purpose:** Resolve conflicts between lens data and physical project structure.

**When to Use:**
After sync-status identifies conflicts.

**Key Steps:**
- Load conflicts
- Present options
- Apply resolution
- Validate results
- Report outcomes

**Agent(s):** Bridge

---

## discover

**Purpose:** Perform full brownfield discovery and generate BMAD-ready documentation.

**When to Use:**
When onboarding or documenting a legacy microservice.

**Key Steps:**
- Select target
- Extract context
- Analyze codebase
- Generate docs
- Update lens metadata

**Agent(s):** Scout

---

## analyze-codebase

**Purpose:** Deep technical analysis without full discovery.

**When to Use:**
When you need focused technical insight without generating the full doc set.

**Key Steps:**
- Select target
- Inspect stack
- Map surfaces
- Summarize findings

**Agent(s):** Scout

---

## generate-docs

**Purpose:** Generate documentation from analysis findings.

**When to Use:**
After analyze-codebase to produce full documentation artifacts.

**Key Steps:**
- Load analysis
- Map templates
- Generate docs
- Write outputs

**Agent(s):** Scout

---

## lens-sync

**Purpose:** Propagate documentation changes up the lens hierarchy with auto-sharding.

**When to Use:**
After new docs are produced or updated.

**Key Steps:**
- Identify changes
- Aggregate summaries
- Shard large files
- Propagate to domain
- Report updates

**Agent(s):** Link

---

## validate-schema

**Purpose:** Validate lens data against schemas.

**When to Use:**
Before or after major updates to ensure integrity.

**Key Steps:**
- Load schemas
- Validate data
- Summarize issues
- Report results

**Agent(s):** Link

---

## rollback

**Purpose:** Revert lens changes safely to a previous state.

**When to Use:**
When a change needs to be reversed or integrity issues are detected.

**Key Steps:**
- Select snapshot
- Apply rollback
- Verify integrity
- Report outcomes

**Agent(s):** Link

---
