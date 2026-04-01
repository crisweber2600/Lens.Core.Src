# LENS Workbench — Configuration Examples

Sample `bmadconfig.yaml` configurations for different team sizes, git providers, and use cases.

---

## Solo Developer (GitHub)

The simplest setup — one developer, one repo, express track by default.

```yaml
# _bmad/lens-work/bmadconfig.yaml
user_name: "Alice"
communication_language: "english"
output_folder: "_bmad-output"
target_projects_path: "../TargetProjects"
default_git_remote: "github"
lifecycle_contract: "_bmad/lens-work/lifecycle.yaml"
initiative_output_folder: "_bmad-output/lens-work/initiatives"
personal_output_folder: "_bmad-output/lens-work/personal"
```

**Recommended constitution settings:**
```yaml
# constitutions/org.yaml
permitted_tracks: [express, feature, hotfix, quickdev, spike]
branching_strategy: trunk-based
stakeholder_gate: informational
collapse_gates:
  enabled: true
```

---

## Small Team (GitHub, 2-5 developers)

Standard setup with feature tracks and PR-based review gates.

```yaml
# _bmad/lens-work/bmadconfig.yaml
user_name: "Bob"
communication_language: "english"
output_folder: "_bmad-output"
target_projects_path: "../TargetProjects"
default_git_remote: "github"
lifecycle_contract: "_bmad/lens-work/lifecycle.yaml"
initiative_output_folder: "_bmad-output/lens-work/initiatives"
personal_output_folder: "_bmad-output/lens-work/personal"
```

**Recommended constitution settings:**
```yaml
# constitutions/org.yaml
permitted_tracks: [express, feature, full, tech-change, hotfix, quickdev, spike]
branching_strategy: pr-per-milestone
stakeholder_gate: informational
collapse_gates:
  enabled: true
  rules:
    - name: small-feature
      max_stories: 3
```

---

## Enterprise Team (GitHub, regulated)

Full governance with mandatory stakeholder approval and all gates enforced.

```yaml
# _bmad/lens-work/bmadconfig.yaml
user_name: "Carol"
communication_language: "english"
output_folder: "_bmad-output"
target_projects_path: "../TargetProjects"
default_git_remote: "github"
lifecycle_contract: "_bmad/lens-work/lifecycle.yaml"
initiative_output_folder: "_bmad-output/lens-work/initiatives"
personal_output_folder: "_bmad-output/lens-work/personal"
```

**Recommended constitution settings:**
```yaml
# constitutions/org.yaml
permitted_tracks: [full, feature, tech-change, hotfix]
branching_strategy: pr-per-milestone
stakeholder_gate: hard
collapse_gates:
  enabled: false
content_sensing_mode: hard-gate
enable_parallel_phases: false
```

---

## Azure DevOps Setup

Same module — different git provider target.

```yaml
# _bmad/lens-work/bmadconfig.yaml
user_name: "Dave"
communication_language: "english"
output_folder: "_bmad-output"
target_projects_path: "../TargetProjects"
default_git_remote: "azure-devops"
lifecycle_contract: "_bmad/lens-work/lifecycle.yaml"
initiative_output_folder: "_bmad-output/lens-work/initiatives"
personal_output_folder: "_bmad-output/lens-work/personal"
```

> **Note:** Azure DevOps uses the same REST API PR creation scripts. PAT scope requires `Code (Read & Write)` and `Pull Request Threads (Read & Write)`.

---

## GitLab Setup

```yaml
# _bmad/lens-work/bmadconfig.yaml
user_name: "Eve"
communication_language: "english"
output_folder: "_bmad-output"
target_projects_path: "../TargetProjects"
default_git_remote: "gitlab"
lifecycle_contract: "_bmad/lens-work/lifecycle.yaml"
initiative_output_folder: "_bmad-output/lens-work/initiatives"
personal_output_folder: "_bmad-output/lens-work/personal"
```

> **Note:** GitLab PAT requires `api` scope. The provider adapter detects GitLab URLs and uses the GitLab REST API for merge request creation.

---

## Multi-IDE Setup

If your team uses multiple editors, install adapters for all of them:

```bash
./_bmad/lens-work/scripts/install.sh --all-ides
```

This generates adapter files for:
- **GitHub Copilot** (VS Code) — `.github/copilot-instructions.md`
- **Cursor** — `.cursor/rules/`
- **Claude Code** — `.claude/`
- **Codex CLI** — `.codex/`

All adapters reference the same module and lifecycle contract — no configuration drift.

---

## Non-English Communication

LENS supports any language for agent communication:

```yaml
user_name: "Franz"
communication_language: "german"
```

All agent responses, menu items, and workflow guidance will be in German. Artifact structure and git operations remain in English (branch names, commit messages, YAML keys).
