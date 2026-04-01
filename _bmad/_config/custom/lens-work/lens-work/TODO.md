# LENS Workbench TODO

## Agent Build Checklist

- [x] Primary LENS agent defined for runtime activation in `agents/lens.agent.md`
- [x] Validator-compatible structured companion added in `agents/lens.agent.yaml`
- [ ] Run deep agent validation against `agents/lens.agent.yaml`

## Workflow Build Checklist

- [x] Core, router, utility, and governance workflows implemented
- [x] Step-file scaffolding added for single-file workflows so packaging is consistent
- [ ] Run deep workflow validation on representative workflows, starting with `router/dev` and `router/sprintplan`
- [ ] Decide whether to fully migrate legacy single-file workflows to step-driven execution

## Testing

- [ ] Re-run BMAD module validation after each structural change
- [ ] Smoke test installer output for GitHub Copilot, Cursor, Claude, and Codex stubs
- [ ] Verify `module-help.csv` command ordering remains aligned with the LENS agent menu

## Next Steps

- [ ] Confirm whether install-question naming remains intentionally snake_case because of installer compatibility
- [ ] Document the dual agent representation (`.md` runtime source and `.yaml` structured companion) in release-facing docs if this pattern is retained

---

## Deferred Items (Quality Scan 2026-04-01)

Items identified during quality scan remediation that are out of scope for the fix pass.

### New Workflows (Backlog)

| Workflow | Purpose | Priority |
|----------|---------|----------|
| `/approval-status` | Show pending promotion PR approval state | Medium |
| `/rollback-phase` | Revert a phase to restart artifact production | Low |
| `/pause-epic` | Suspend an in-flight epic without losing state | Low |
| `/resume-epic` | Resume a paused epic | Low |
| `/audit-all-initiatives` | Cross-initiative consistency scan | Medium |

### Script Extraction (Backlog)

Complex logic in workflow markdown that would benefit from shell/PowerShell extraction.

**High:** `derive-initiative-status.sh`, `scan-active-initiatives.sh`, `load-command-registry.sh`, `validate-phase-artifacts.sh`, `plan-lifecycle-renames.sh`

**Medium:** `validate-feature-move.sh`, `bootstrap-target-projects.sh`, `derive-next-action.sh`, `run-preflight-cached.sh`

### Enhancement Roadmap

**UX:** First-run scope guidance, `/next` preview mode, `/profile` command, status health indicators

**Governance:** Soft gates for sensing, constitution-aware track filtering, sensing advisory guidance

**Lifecycle:** Story-state tracking in initiative-state.yaml, story chaining rollback (`/reset-story-branch`), pre-sprintplan readiness summary

**Diagnostics:** Config load failure diagnosis, LENS_VERSION mismatch upgrade guidance, move-feature in-flight work safeguards

### Architecture Notes

- 28/29 workflows use step-driven architecture; only `utility/dashboard` is single-file (intentional — thin delegation wrapper)
- All shell scripts pass SC2086 quoting checks; flagged `$2` refs are awk/jq field variables inside single quotes (false positives)
- Relative paths (`./`, `../`) in YAML frontmatter are an intentional architectural pattern for intra-workflow step references
