# Lens Copilot Instructions

These instructions are installed to `.github/lens-instructions.md` during module installation. They configure GitHub Copilot behavior for Lens-managed repositories. Keep this file concise — it loads into Copilot's context window.

---

## Agent

Activate Lens with `@lens` in Copilot Chat. All lifecycle commands go through this single agent. Do not invoke individual skills or background workflows directly — Lens handles delegation internally.

## State

Lens tracks initiative state in `_bmad-output/lens/state.yaml` and `_bmad-output/lens/event-log.jsonl`. These files are auto-managed. Before making changes:

1. Run `/status` to confirm the current phase and branch
2. Verify you are on the correct branch for the active phase
3. Follow the phase workflow — do not skip phases or edit gate statuses manually

If state seems wrong, use `/sync` (lightweight reconciliation), `/fix` (rebuild from event log), or `/override` (manual correction).

## Branches

Lens uses flat hyphen-separated branch naming with no slashes:

- **Root:** `{featureBranchRoot}`
- **Audience:** `{featureBranchRoot}-{audience}`
- **Phase:** `{featureBranchRoot}-{audience}-p{N}`
- **Workflow:** `{featureBranchRoot}-{audience}-p{N}-{workflow}`

Rules:

- Never push directly to audience or root branches — use phase branches
- Create workflow branches from phase branches for individual tasks
- PR at phase end: phase branch → audience branch
- Lens creates and pushes branches automatically — manual branch creation is not needed

## Files

| Location | Contents |
|----------|----------|
| `_bmad-output/planning-artifacts/` | Phase outputs: briefs, PRDs, architecture docs, stories |
| `_bmad-output/implementation-artifacts/` | Code, tests, implementation outputs |
| `_bmad-output/lens/state.yaml` | Current initiative state (auto-managed) |
| `_bmad-output/lens/event-log.jsonl` | Audit trail (auto-managed, append-only) |
| `_bmad-output/lens/initiatives/` | Per-initiative config files |
| `_bmad/lens/config.yaml` | Global Lens configuration |

Do not edit state files or event log manually. Use Lens commands for all state changes.

## Constitution

Governance checks run automatically at every workflow boundary. In advisory mode (default), violations produce warnings but do not block. In enforced mode, critical violations block progress until resolved.

When you see a governance warning: read the cited rule, follow the remediation guidance, and run `/lens` for full compliance detail.

## Commands

| Command | Type | Purpose |
|---------|------|---------|
| `/onboard` | Discovery | First-time setup |
| `/new` | Initiative | Create initiative |
| `/switch` | Initiative | Switch active initiative |
| `/pre-plan` | Phase | Brainstorming and vision |
| `/plan` | Phase | Product requirements |
| `/tech-plan` | Phase | Architecture design |
| `/Story-Gen` | Phase | Story generation |
| `/Review` | Phase | Readiness checks |
| `/Dev` | Phase | Implementation |
| `/status` | Utility | Compact status |
| `/lens` | Utility | Full context view |
| `/sync` | Recovery | Reconcile state with git |
| `/fix` | Recovery | Rebuild state from event log |
| `/override` | Recovery | Manual state override |
| `/resume` | Recovery | Resume interrupted workflow |
| `/archive` | Utility | Archive completed initiative |
| `/discover` | Discovery | Scan repositories |
| `/bootstrap` | Discovery | Initialize BMAD in repos |
