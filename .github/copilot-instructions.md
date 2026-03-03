<!-- BMAD:START -->
# BMAD Method — Project Instructions

## Project Configuration

- **Project**: bmad.lens.release
- **User**: CrisWeber
- **Communication Language**: English
- **Document Output Language**: English
- **User Skill Level**: intermediate
- **Output Folder**: bmad.lens.release/_bmad-output
- **Planning Artifacts**: bmad.lens.release/_bmad-output/planning-artifacts
- **Implementation Artifacts**: bmad.lens.release/_bmad-output/implementation-artifacts
- **Project Knowledge**: {project-root}/docs

## BMAD Runtime Structure

- **Agent definitions**: `_bmad/bmm/agents/` (BMM module) and `_bmad/core/agents/` (core)
- **Workflow definitions**: `_bmad/bmm/workflows/` (organized by phase)
- **Core tasks**: `_bmad/core/tasks/` (help, editorial review, indexing, sharding, adversarial review)
- **Core workflows**: `_bmad/core/workflows/` (brainstorming, party-mode, advanced-elicitation)
- **Workflow engine**: `_bmad/core/tasks/workflow.yaml` (executes YAML-based workflows)
- **Module configuration**: `_bmad/bmm/bmadconfig.yaml`
- **Core configuration**: `_bmad/core/bmadconfig.yaml`
- **Agent manifest**: `_bmad/_config/agent-manifest.csv`
- **Workflow manifest**: `_bmad/_config/workflow-manifest.csv`
- **Help manifest**: `_bmad/_config/bmad-help.csv`
- **Agent memory**: `_bmad/_memory/`

## Key Conventions

- Always load `_bmad/bmm/bmadconfig.yaml` before any agent activation or workflow execution
- Store all config fields as session variables: `{user_name}`, `{communication_language}`, `{output_folder}`, `{planning_artifacts}`, `{implementation_artifacts}`, `{project_knowledge}`
- MD-based workflows execute directly — load and follow the `.md` file
- YAML-based workflows require the workflow engine — load `workflow.yaml` first, then pass the `.yaml` config
- Follow step-based workflow execution: load steps JIT, never multiple at once
- Save outputs after EACH step when using the workflow engine
- The `{project-root}` variable resolves to the workspace root at runtime

## Change Management — bmad.lens.release

When making modifications to files in the **bmad.lens.release** repository (this repo):

1. **Create a feature branch** off the current branch before making any changes:
   ```
   git checkout -b <descriptive-branch-name>
   ```
   Use a descriptive name (e.g., `fix/lifecycle-audience-fields`, `feat/quickdev-track`).
2. **Make all changes** on the feature branch — never commit directly to the current branch.
3. **Commit** with a clear, conventional commit message (e.g., `fix(lifecycle): correct audience assignments for devproposal/sprintplan`).
4. **Push** the feature branch and **create a PR** targeting the branch you branched from.
5. Use the `promote-branch` script or GitHub CLI (`gh pr create`) to create the PR.

> **Why:** bmad.lens.release is a shared control repo. All changes must go through PR review to prevent regressions in lifecycle definitions, workflows, and agent configurations.

## Available Agents

| Agent | Persona | Title | Capabilities |
|---|---|---|---|
| bmad-master | BMad Master | BMad Master Executor, Knowledge Custodian, and Workflow Orchestrator | runtime resource management, workflow orchestration, task execution, knowledge custodian |
| analyst | Mary | Business Analyst | market research, competitive analysis, requirements elicitation, domain expertise |
| architect | Winston | Architect | distributed systems, cloud infrastructure, API design, scalable patterns |
| dev | Amelia | Developer Agent | story execution, test-driven development, code implementation |
| pm | John | Product Manager | PRD creation, requirements discovery, stakeholder alignment, user interviews |
| qa | Quinn | QA Engineer | test automation, API testing, E2E testing, coverage analysis |
| quick-flow-solo-dev | Barry | Quick Flow Solo Dev | rapid spec creation, lean implementation, minimum ceremony |
| sm | Bob | Scrum Master | sprint planning, story preparation, agile ceremonies, backlog management |
| tech-writer | Paige | Technical Writer | agent capabilities |
| ux-designer | Sally | UX Designer | user research, interaction design, UI patterns, experience strategy |

## Slash Commands

Type `/bmad-` in Copilot Chat to see all available BMAD workflows and agent activators. Agents are also available in the agents dropdown.
<!-- BMAD:END -->
