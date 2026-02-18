# Installation Testing

This checklist captures manual verification of the LENS installation flow.

---

## Checklist

- [ ] Run `bmad install lens`
- [ ] Verify `.github/prompts/` contains LENS prompt files
- [x] Verify `module.yaml` prompt wiring (module relies on prompts folder copy)
- [ ] Test `_module-installer/installer.js`
- [x] Test IDE-specific handlers (if present)

---

## Test Log

**Date:** 2026-01-31

**Environment:**
- OS: Linux
- Workspace: BMAD.Lens

**Results:**
- bmad install lens: Skipped (bmad CLI not available in environment)
- prompts verification: Skipped (requires install to `.github/prompts/`)
- module.yaml prompts: Verified (module uses prompts folder copy in installer)
- installer.js: Failed to run (missing `fs-extra` dependency)
- IDE handlers: Not applicable (no platform-specific handlers found)
