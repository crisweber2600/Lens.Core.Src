---
name: 'step-04-epics-stories'
description: 'Generate epics, stories, sprint-status.yaml, and individual story files'
nextStepFile: './step-05-dev-ready.md'
---

# Step 4: Epics, Stories, and Sprint Planning

**Goal:** Break the architecture and PRD into implementable epics, generate user stories with acceptance criteria, produce sprint-status.yaml, and create individual story files.

---

## EXECUTION SEQUENCE

### 1. Generate Epics

Based on the architecture and PRD, generate the epic list:

```yaml
epics = produce_artifact("epics", context=["architecture", "prd"])

# Each epic must have:
#   - Epic key (short identifier, e.g., E1, E2)
#   - Title
#   - Description
#   - Acceptance criteria (high-level)
#   - Estimated story count

save_to: "${docs_path}/epics.md"

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${docs_path}/epics.md
  phase: "ARTIFACT:EXPRESSPLAN:EPICS"
  initiative: ${initiative_root}
  description: "epics produced (express)"
```

### 2. Generate Stories

For each epic, generate detailed user stories:

```yaml
stories = produce_artifact("stories", context=["epics", "architecture", "prd"])

# Each story must have:
#   - Story key (e.g., E1-S1, E1-S2)
#   - Title
#   - User story format ("As a... I want... So that...")
#   - Acceptance Criteria (testable conditions)
#   - Story Points (Fibonacci: 1, 2, 3, 5, 8, 13)
#   - Dependencies (other story keys)

save_to: "${docs_path}/stories.md"

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${docs_path}/stories.md
  phase: "ARTIFACT:EXPRESSPLAN:STORIES"
  initiative: ${initiative_root}
  description: "stories produced (express)"
```

### 3. Generate Sprint Status

```yaml
sprint_status = produce_artifact("sprint-status", format="yaml", context=["stories", "epics"])

# sprint-status.yaml schema:
#   sprint_number: 1
#   initiative: {initiative_root}
#   track: express
#   stories:
#     - key: E1-S1
#       title: "..."
#       points: 3
#       status: not-started
#       epic: E1
#       assignee: null

save_to: "${docs_path}/sprint-status.yaml"
```

### 4. Generate Individual Story Files

For each story, create a dedicated story file with full implementation context:

```yaml
for story in stories:
  story_file = produce_story_file(
    story: story,
    context: ["architecture", "prd", "epics"],
    include: [
      "Technical Context",
      "Implementation Notes",
      "Acceptance Criteria",
      "Testing Strategy",
      "Dependencies"
    ]
  )
  save_to: "${docs_path}/${story.key}.md"

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${docs_path}/sprint-status.yaml
    - ${docs_path}/*.md  # all story files
  phase: "ARTIFACT:EXPRESSPLAN:SPRINT-PLAN"
  initiative: ${initiative_root}
  description: "sprint-status and story files produced (express)"
```

### 5. Output Summary

```
✅ Epics & Stories Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━
Epics:    {epic_count}
Stories:  {story_count}
Points:   {total_points}

Story Files Generated:
{list of story file paths}

Sprint Status: ${docs_path}/sprint-status.yaml
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`
