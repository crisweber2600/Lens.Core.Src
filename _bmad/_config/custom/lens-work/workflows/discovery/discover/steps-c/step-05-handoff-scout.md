---
name: 'step-05-handoff-scout'
description: 'Hand off to SCOUT agent for deep analysis'
---

# Step 5: Hand Off to SCOUT

## ⚠️ MANDATORY - DO NOT SKIP THIS STEP

**YOU MUST:**
1. Display the deep scan prompt box (Section 3)
2. WAIT for user to respond with [DEEP] or [SKIP]
3. ONLY THEN proceed based on their choice

**DO NOT:**
- Skip directly to Compass
- Show "discovery complete" without the prompt
- Assume user wants to skip

---

## Goal
Hand off to SCOUT agent to run the full discovery pipeline (DS → AC → GD).

---

## Instructions

### 1. Check Discovery Completion

Verify that initial discovery has completed:
- ✅ Targets selected
- ✅ Context extracted  
- ✅ Basic analysis performed
- ✅ Initial discovery reports generated

### 2. Display Discovery Summary

```
🔍 Initial Discovery Complete

Scanned:
- {target_count} targets
- {service_count} services
- {microservice_count} microservices detected

Discovery reports generated:
{for report in discovery_reports}
- {report.filename}
{endfor}
```

### 3. Deep Scan Prompt

**CRITICAL: You MUST display this prompt and wait for user response before proceeding.**

**Display:**
```
╭──────────────────────────────────────────────────────────────╮
│  🔍 Initial Discovery Complete!                              │
├──────────────────────────────────────────────────────────────┤
│  Discovery Summary:                                          │
│  • Targets scanned: {target_count}                           │
│  • Services identified: {service_count}                      │
│  • Microservices detected: {microservice_count}              │
│                                                              │
│  Reports generated at:                                       │
│  {docs_output_path}/                                         │
├──────────────────────────────────────────────────────────────┤
│  🧭 Would you like to run a deep scan next?                  │
│                                                              │
│  SCOUT can run the complete discovery pipeline for           │
│  comprehensive technical analysis and documentation:         │
│                                                              │
│  Pipeline Steps:                                             │
│  1. [DS] Deep Discover ⭐ RECOMMENDED - Deep brownfield scan │
│  2. [AC] Analyze Codebase - Technical analysis               │
│  3. [GD] Generate Docs - Comprehensive documentation         │
│                                                              │
│  This will:                                                  │
│  • Perform deep brownfield codebase analysis                │
│  • Extract all APIs, data models, and business logic        │
│  • Generate comprehensive BMAD-ready documentation          │
│  • Map architectural patterns and anti-patterns             │
│  • Analyze cross-service dependencies                       │
│                                                              │
│  Estimated time: 15-30 minutes per project                   │
├──────────────────────────────────────────────────────────────┤
│  Options:                                                    │
│  [DEEP]  Run full deep scan pipeline (recommended)           │
│  [SKIP]  Continue to Compass (you can run [DEEP] anytime)  │
╰──────────────────────────────────────────────────────────────╯
```

**WAIT for user to respond with [DEEP] or [SKIP] before proceeding.**

### 4. User Decision Branch

**If user selects [DEEP]:**
- Proceed to SCOUT Handoff (Section 4 below)
- Run the complete discovery pipeline

**If user selects [SKIP]:**
- Return to Compass menu
- Deep scan can be triggered anytime with [DEEP] command
- User retains access to initial discovery reports

### 5. SCOUT Handoff - DEEP Command Workflow

**Display (if DEEP selected):**
```
🧭→🔎 Handing off to SCOUT

SCOUT will now run the complete discovery pipeline in FULL AUTO mode:

For EVERY project in the domain map, executing in sequence:
1. [DS] Full Discover ⭐ RECOMMENDED - Deep brownfield discovery
2. [AC] Analyze Codebase - Technical analysis  
3. [GD] Generate Docs - Comprehensive documentation

Running in YOLO mode (no confirmations)...
```

### 6. Execute DEEP Pipeline - Step 1: Discover Service (DS)

**Starting for all projects:**
```
🔍 [1/3] DISCOVER SERVICE (DS) - Deep Brownfield Discovery

For each project in domain map:
- Scanning directory structure
- Analyzing file organization
- Mapping service boundaries
- Identifying business domains
- Documenting service responsibilities

Processing:
├─ NextGen/NorthStarET
├─ NextGen/NorthStarET.Student
└─ OldNorthStar/OldNorthStar

Estimated time: 10-15 minutes...
```

**Completion message:**
```
✅ DS Complete: Deep discovery analysis finished for all projects

Generated outputs:
- Service structure maps
- Boundary analysis
- Domain identification
- Repository documentation
```

### 7. Execute DEEP Pipeline - Step 2: Analyze Codebase (AC)

**After DS completes, starting AC for all projects:**
```
📊 [2/3] ANALYZE CODEBASE (AC) - Technical Analysis

For each project identified in DS:
- Extracting APIs and endpoints
- Analyzing data models
- Mapping dependencies
- Identifying patterns
- Detecting technical debt
- Documenting business logic

Processing all services across all projects...

Estimated time: 15-20 minutes...
```

**Completion message:**
```
✅ AC Complete: Technical analysis finished for all projects

Generated outputs:
- API specifications
- Data model documentation
- Dependency maps
- Architecture patterns
- Anti-pattern detection
```

### 8. Execute DEEP Pipeline - Step 3: Generate Docs (GD)

**After AC completes, starting GD for all projects:**
```
📝 [3/3] GENERATE DOCS (GD) - Comprehensive Documentation

For each analyzed project:
- Generating BMAD-ready documentation
- Creating architecture diagrams
- Compiling API references
- Documenting data flows
- Writing deployment guides
- Generating implementation specs

Processing all services across all projects...

Estimated time: 10-15 minutes...
```

**Final completion message:**
```
✅ DEEP Scan Complete: Full discovery pipeline finished!

All Projects Processed:
├─ NextGen/NorthStarET ............ ✅ Complete
├─ NextGen/NorthStarET.Student .... ✅ Complete
└─ OldNorthStar/OldNorthStar ...... ✅ Complete

Generated artifacts:
- Comprehensive architecture documentation
- Service specifications (DS)
- Technical analysis reports (AC)
- Implementation documentation (GD)
- Consolidated discovery report

Estimated total time: 35-50 minutes ⏱️

All documentation available at:
{docs_output_path}/

Ready to proceed with next steps!
```

### 9. Activate SCOUT Agent

**Call SCOUT agent in AUTO/YOLO mode (if DEEP selected):**

```
Activate SCOUT agent: {project-root}/_bmad/lens-work/agents/scout
Trigger: AUTO (full auto mode - DS → AC → GD)

SCOUT will:
- Load domain map from: {project-root}/_bmad/lens-work/domain-map.yaml
- Execute [DS] on every service/microservice
- Execute [AC] on every analyzed service
- Execute [GD] on every analyzed codebase
- Generate complete documentation for all projects
- Return consolidated summary report
```

### 10. Post-DEEP Navigation

**After DEEP pipeline completes:**

```
🎯 What's next?

Your complete codebase discovery is ready!

Available actions:
[NAV]    Show current architectural lens
[MAP]    View domain architecture map
[GUIDE]  Get workflow recommendations
[IMP]    Run impact analysis on planned changes
[HELP]   Show all available commands
```

**Return to Compass menu with full discovery context**

### 11. Alternative: Skip Deep Scan

**IF user selects [SKIP]:**

Ensure the SCOUT agent is installed as part of the lens module.

```
⏭️  Skipping Deep Scan

Initial discovery is complete. Discovery reports available at:
{docs_output_path}/

To run the complete pipeline later:
- Type [DEEP] to trigger the full DS → AC → GD workflow
- Or navigate to: {project-root}/_bmad/lens-work/agents/scout

Or continue with Compass for other workflows.
```

**Return to Compass menu**

---

## Completion

**IMPORTANT: Verify .gitignore is protecting LENS system files before proceeding**

Before completing the discovery workflow, remind user:
```
🔒 REMINDER: Verify LENS system file protection

Run these commands to ensure .gitignore is updated and committed:

  git status                # Verify no _bmad/_memory/ files are staging
  git add .gitignore        # Stage any .gitignore updates
  git commit -m "chore: protect LENS system files from accidental commits"

This prevents accidental commits of:
- Session state (_bmad-output/lens-work/state.yaml)
- Sidecar memories (_bmad/_memory/**)
- Personal profiles (_bmad-output/personal/)
- Generated artifacts ({docs_output_path}/ and _bmad-output/lens-work/)
```

---

**IF user selected [DEEP]:**
- Activate SCOUT agent by loading: {project-root}/_bmad/lens-work/agents/scout/scout.md
- SCOUT will display its menu with DS, AC, GD options
- User can select [AUTO] to run the full pipeline automatically
- SCOUT will return to its menu after each operation completes
- Total estimated time: 35-50 minutes for full scan
- All artifacts stored in: {project-root}/docs/{Domain}/{Service}/

**IF user selected [SKIP]:**
- Return to Compass menu with initial discovery available
- Can trigger [DEEP] command anytime to start full pipeline
- Initial reports available for reference

**IF SCOUT not available:**
- Discovery complete with basic reports
- Return to Compass menu
- User can manually run advanced workflows

---

**Note:** This step hands off to SCOUT agent. SCOUT always displays its menu and returns to it after each operation, enabling users to run DS, AC, GD in sequence or use AUTO mode.
