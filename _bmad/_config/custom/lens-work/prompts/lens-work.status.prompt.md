```prompt
---
description: Display current initiative state, blocks, topology, and next steps
---

Activate Tracey agent and execute ST (status):

1. Load agent: `_bmad/lens-work/agents/tracey.agent.yaml`
2. Execute `ST` command to display current state
3. Show initiative position, merge gates, and recommendations

**Output Format:**
```
📍 lens-work Status Report
═══════════════════════════════════════════════════
Initiative: {id}
Layer: {layer} | Target: {target_repo}

Current Position
├── Phase: {phase} ({phase_name})
├── Workflow: {workflow}
└── Branch: {active_branch}

Merge Gates
├── ✅ completed
├── 🔄 in_progress
└── ⏳ pending

Next Steps
├── {recommendation_1}
└── {recommendation_2}
═══════════════════════════════════════════════════
```

```
