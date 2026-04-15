<!-- BMAD:START -->
# BMAD Method — Project Instructions

## Project Configuration

- **Project**: lens.core
- **User**: CrisWeber
- **Communication Language**: English
- **Document Output Language**: English
- **User Skill Level**: intermediate
- **Output Folder**: docs
- **Planning Artifacts**: {project-root}/docs/planning-artifacts
- **Implementation Artifacts**: {project-root}/docs/implementation-artifacts
- **Project Knowledge**: {project-root}/docs

## BMAD Runtime Structure

- **Agent definitions**: `lens.core/_bmad/bmm/agents/` (BMM module) and `lens.core/_bmad/core/agents/` (core)
- **Workflow definitions**: `lens.core/_bmad/bmm/workflows/` (organized by phase)
- **Core tasks**: `lens.core/_bmad/core/tasks/` (help, editorial review, indexing, sharding, adversarial review)
- **Core workflows**: `lens.core/_bmad/core/workflows/` (brainstorming, party-mode, advanced-elicitation)
- **Workflow engine**: `lens.core/_bmad/core/tasks/workflow.yaml` (executes YAML-based workflows)
- **Module configuration**: `lens.core/_bmad/bmm/bmadconfig.yaml`
- **Core configuration**: `lens.core/_bmad/core/bmadconfig.yaml`
- **Agent manifest**: `lens.core/_bmad/_config/agent-manifest.csv`
- **Workflow manifest**: `lens.core/_bmad/_config/workflow-manifest.csv`
- **Help manifest**: `lens.core/_bmad/_config/bmad-help.csv`
- **Agent memory**: `lens.core/_bmad/_memory/`

## Key Conventions

- Always load `lens.core/_bmad/bmm/bmadconfig.yaml` before any agent activation or workflow execution
- Store all config fields as session variables: `{user_name}`, `{communication_language}`, `{output_folder}`, `{planning_artifacts}`, `{implementation_artifacts}`, `{project_knowledge}`
- MD-based workflows execute directly — load and follow the `.md` file
- YAML-based workflows require the workflow engine — load `workflow.yaml` first, then pass the `.yaml` config
- Follow step-based workflow execution: load steps JIT, never multiple at once
- Save outputs after EACH step when using the workflow engine
- The `{project-root}` variable resolves to the workspace root at runtime

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
| tech-writer | Paige | Technical Writer | documentation, Mermaid diagrams, standards compliance, concept explanation |
| ux-designer | Sally | UX Designer | user research, interaction design, UI patterns, experience strategy |

## Slash Commands

Type `/bmad-` in Copilot Chat to see all available BMAD workflows and agent activators. Agents are also available in the agents dropdown.
<!-- BMAD:END -->
