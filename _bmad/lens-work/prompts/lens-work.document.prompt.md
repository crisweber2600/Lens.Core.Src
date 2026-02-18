```prompt
---
description: Generate canonical documentation for in-scope repos using document-project and quick-spec
---

Activate Scout agent and execute document:

1. Load agent: `_bmad/lens-work/agents/scout.agent.yaml`
2. Execute `document` command to generate docs
3. Run document-project + quick-spec per repo
4. Write to canonical path with frontmatter

**Prerequisites:**
- `discover` must run first (needs repo-inventory.yaml)

**Output Path:**
`Docs/{domain}/{service}/{repo}/`
- `project-context.md` — From document-project
- `current-state.tech-spec.md` — From quick-spec

**Decision Logic:**
- `skip`: No changes since last documentation
- `incremental`: Minor changes—update quick-spec only
- `full`: Major changes—regenerate both docs

**Frontmatter:** All docs include standardized machine-readable frontmatter.

```
