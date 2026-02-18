# Troubleshooting

Use this guide when LENS does not detect or restore context as expected.

---

## Detection Issues

**Lens not detected or incorrect lens**
- Ensure your branch matches a configured pattern.
- Check `_bmad/lens-work/config.yaml` for overrides that may shadow defaults.
- Run `lens-configure` to validate or adjust patterns.

**No services or microservices detected**
- Confirm expected folder names exist (for example: `services/`, `apps/`).
- Add or adjust path hints in your project configuration.

---

## Session Issues

**Session not restored**
- Confirm `_bmad-output/lens-work/state.yaml` exists and is readable.
- Run `lens-detect` to regenerate the session snapshot.

**Session feels stale**
- Run `lens-sync` to reconcile map drift.
- Clear the session file and re-run `lens-detect` if necessary.

---

## Prompt or Workflow Issues

**Prompt not showing up after install**
- Re-run `bmad install lens`.
- Verify `.github/prompts/` contains LENS prompt files.

**Workflow missing or incomplete**
- Confirm workflows exist under `_bmad/lens-work/workflows/`.
- Use `workflow-guide` to list available workflows for the current lens.

---

## Still Stuck?

- Review [Configuration](configuration.md).
- Review [Session Store](session-store.md).
- Run `lens-restore` after verifying your session file.
