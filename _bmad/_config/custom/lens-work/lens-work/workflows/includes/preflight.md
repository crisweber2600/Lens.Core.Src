# Shared Preflight

**Include with:** Reference this file from any prompt that needs preflight.

**Purpose:** Ensures all authority repos are synchronized and constitutional governance is resolved before workflow execution.

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip_constitution` | boolean | `false` | When `true`, skip Step 5 (Resolve and Enforce Constitution). Use this when the calling workflow performs its own constitutional context injection (e.g., via a dedicated Step 1a). |

---

## Preflight Steps

> **Script implementation:** The full logic for Steps 1–4b is implemented in
> [`scripts/preflight.sh`](../../scripts/preflight.sh) (Bash) and
> [`scripts/preflight.ps1`](../../scripts/preflight.ps1) (PowerShell).
> The steps below describe the algorithm. Run the script to execute all checks:
>
> ```bash
> bash bmad.lens.release/_bmad/lens-work/scripts/preflight.sh                    # default
> bash bmad.lens.release/_bmad/lens-work/scripts/preflight.sh --caller onboard   # from /onboard
> bash bmad.lens.release/_bmad/lens-work/scripts/preflight.sh --skip-constitution
> ```
>
> ```powershell
> .\bmad.lens.release\_bmad\lens-work\scripts\preflight.ps1                      # default
> .\bmad.lens.release\_bmad\lens-work\scripts\preflight.ps1 -Caller onboard      # from /onboard
> .\bmad.lens.release\_bmad\lens-work\scripts\preflight.ps1 -SkipConstitution
> ```

### 1. Check Release Branch

Verify that `bmad.lens.release` directory exists.

### 1a. Enforce LENS_VERSION Compatibility

Read `LENS_VERSION` from the control repo root and `schema_version` from `bmad.lens.release/_bmad/lens-work/lifecycle.yaml`. Hard-stop if they don't match.

> **Session caching:** The agent activation (step 4) loads `lifecycle.yaml` into `{lifecycle}`. If the session variable `{lifecycle}` already contains the parsed lifecycle data, use it instead of re-reading the file. Fall back to a file read only on cache-miss.

### 2. Determine Pull Strategy

> See [docs/preflight-strategy.md](../../docs/preflight-strategy.md) for rationale behind freshness windows.

Read `_bmad-output/lens-work/personal/.preflight-timestamp` as the last successful full preflight time (ISO 8601 UTC datetime).

Use branch-aware freshness windows:
- **If branch is `alpha`:** run full preflight when timestamp is missing or older than **1 hour**.
- **If branch is `beta`:** run full preflight when timestamp is missing or older than **3 hours**.
- **Otherwise:** run full preflight when timestamp is missing or older than **today** (daily cadence).

If full preflight is required, pull ALL authority repos. Otherwise, skip pulls and run presence + `.github` sync checks only.

### 3. Sync .github from Release Repo

On every preflight run, verify `.github/` completeness against `bmad.lens.release/.github/` and sync if files are missing. Also sync if release `.github/` changed during pull. Keep prompt hygiene: `.github/prompts/` must only contain `lens-work*.prompt.md` files.

### Step 3b: Sync Agent Entry Points

On every preflight run, sync agent entry point files (e.g., `CLAUDE.md`) from the release repo to the workspace root. Copy each entry point file if it is missing or if the release version changed during pull.

### Step 4: Verify IDE Adapters

On every preflight run, check that IDE command adapters are installed. For Claude Code, the required adapter is `.claude/commands/`. If the directory is missing, run the installer in idempotent mode before proceeding.

Note: If additional IDEs are active (Cursor, Codex), add equivalent checks as those adapters are introduced to the workspace.

### 4. Verify Authority Repos

If any authority repo directory is missing:

1. **If the calling workflow is `/onboard`:** Continue so the workflow can bootstrap/repair those repos.
2. **Otherwise:** Show a warm redirect instead of a cryptic hard-stop — explain what onboarding does, how long it takes, and offer to run `/onboard`.

### 5. Resolve and Enforce Constitution

> **Skippable:** When `params.skip_constitution == true`, skip this entire step and proceed to Step 6.
> Callers that perform their own constitutional context injection (e.g., router workflows with a dedicated Step 1a)
> MUST pass `skip_constitution: true` to avoid double-resolution. The constitution skill's `resolve-context`
> operation returns the session-cached result on second call, but the gate enforcement below does NOT re-run from cache —
> skipping here is the clean approach.

Resolve constitutional governance before any workflow-specific logic runs.

#### 5a. Resolve Context

```yaml
if params.skip_constitution == true:
  # Skip — caller handles its own constitutional context injection
  goto: Step 6

# Check session cache first — avoid re-resolving if already loaded during this session
if session.constitutional_context exists and session.constitutional_context.status != null:
  constitutional_context = session.constitutional_context
else:
  constitutional_context = invoke("constitution.resolve-context")
```

#### 5b. Handle Parse Errors

```yaml
if constitutional_context.status == "parse_error":
  if constitutional_context.context_available == false:
    warning: "⚠️ Constitutional context unavailable during bootstrap. Continuing in advisory mode."
    constitutional_context.gate_mode = "advisory"
  else:
    FAIL("❌ Constitutional context parse error. Fix governance files before continuing.")
```

#### 5c. Cache and Enforce Hard Gates

```yaml
session.constitutional_context = constitutional_context

if constitutional_context.gate_mode == "hard" and constitutional_context.preflight_status == "FAIL":
  FAIL("❌ Constitution hard gate failed during preflight. Resolve compliance issues before running this workflow.")
```

#### 5d. Surface Advisory Warnings

```yaml
if constitutional_context.gate_mode == "advisory" and constitutional_context.preflight_status == "WARN":
  warning: "⚠️ Constitution advisory warnings detected. Continue with care and address warnings in phase outputs."
```

All downstream workflow decisions MUST follow `session.constitutional_context`.

### 6. Update Timestamp

After a successful full preflight, write the current UTC timestamp (ISO 8601 datetime) to `_bmad-output/lens-work/personal/.preflight-timestamp`.

---

## Authority Repos

| Repo | Purpose |
|------|---------|
| `bmad.lens.release` | Release module with workflows, agents, prompts |
| `{governance-repo-path}` | Governance settings (from `_bmad-output/lens-work/governance-setup.yaml`) |

## Synced Content

| Source | Destination | Content |
|--------|-------------|---------|
| `bmad.lens.release/.github/` | `.github/` | Copilot agents, prompts, instructions |
| `bmad.lens.release/CLAUDE.md` | `./CLAUDE.md` | Claude Code agent entry point |
