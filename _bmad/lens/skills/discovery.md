# Skill: discovery

**Module:** lens
**Owner:** @lens agent
**Type:** Internal delegation skill

---

## Purpose

Handles repository scanning, documentation generation, bootstrapping, and user onboarding. Replaces the Scout agent from lens-work.

## Responsibilities

1. **Onboarding** — First-time user/repo setup, profile creation
2. **Repo discovery** — Scan TargetProjects for repositories, inventory them
3. **Bootstrapping** — Initialize BMAD structure in target repositories
4. **Documentation generation** — Generate canonical docs from discovered repos

## Commands

| Command | Action |
|---------|--------|
| `/onboard` | Detect git user, create profile, scan workspace |
| `/discover` | Inventory repos under target_projects_path |
| `/bootstrap` | Initialize BMAD structure in a target repo |

## Discovery Depth

Controlled by `discovery_depth` config:
- **shallow** — Repo names, branches, basic structure
- **deep** — Full codebase analysis, dependency mapping, architecture inference

## Output Artifacts

| Artifact | Path |
|----------|------|
| Repo inventory | `_bmad-output/lens/repo-inventory.yaml` |
| Bootstrap report | `_bmad-output/lens/bootstrap-report.md` |
| User profiles | `_bmad-output/lens/profiles/` |

## Trigger Conditions

- `/onboard` — First use or explicit re-onboard
- `/discover` — User requests scan
- `/bootstrap` — User requests BMAD initialization

## Integration

- Reads `target_projects_path` from config
- Reads `docs_output_path` for canonical doc location
- Writes discovery artifacts to output paths

---

_Skill spec created on 2026-02-17 via BMAD Module workflow_
