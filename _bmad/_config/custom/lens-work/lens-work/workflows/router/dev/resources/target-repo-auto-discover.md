---
name: 'target-repo-auto-discover'
description: 'Inline discover sub-flow for /dev when initiative.target_repos is empty. Runs discover steps 2-4, presents results, and populates session.target_repo.'
discoverStep2: '../../discover/steps/step-02-scan-repos.md'
discoverStep3: '../../discover/steps/step-03-inspect-repos.md'
discoverStep4: '../../discover/steps/step-04-governance-and-branches.md'
---

# Target Repo Auto-Discover Gate

This resource is loaded exclusively from `step-01-preflight.md` when `initiative.target_repos` is empty or absent. It runs a focused subset of the `/discover` workflow (steps 2–4 only) to locate repos, then surfaces a selection prompt so the user can confirm which repo to use for this `/dev` session.

---

## EXECUTION SEQUENCE

### 0. Announce

Display:

```
⚠️  No target repo configured — running /discover first to locate repos…
```

---

### 1. Build Resolver Context

```yaml
profile          = load_if_exists("docs/lens-work/personal/profile.yaml")
governance_setup = load_if_exists("docs/lens-work/governance-setup.yaml")

target_projects_path = profile.target_projects_path || "TargetProjects"
scan_path = "${target_projects_path}/${initiative.domain}/${initiative.service}"
governance_repo_path = governance_setup.governance_repo_path
                     || profile.governance_repo_path
                     || "${target_projects_path}/lens/lens-governance"

if not directory_exists(scan_path):
  FAIL("""
  ❌  Scan path does not exist: ${scan_path}

  No repos can be discovered for this initiative. Ensure the target repos
  are cloned under that path, then re-run /dev.
  """)

if not directory_exists(governance_repo_path):
  FAIL("❌  Governance repo not found at ${governance_repo_path}. Run `/onboard` to configure it first.")

resolver_result = {
  domain:              initiative.domain,
  service:             initiative.service,
  scan_path:           scan_path,
  governance_repo_path: governance_repo_path,
  initiative_root:     initiative.initiative_root
}
```

---

### 2. Run Discover Sub-Steps

Execute the following three steps from the `/discover` workflow in sequence. Treat each as a full step-file execution (read completely, then follow). Do NOT execute discover `step-01` (preflight) or `step-05` (report/docs generation) — they are unnecessary here.

```yaml
invoke: step-file
path: "{discoverStep2}"   # Repo discovery and branch synchronization

invoke: step-file
path: "{discoverStep3}"   # BMAD inspection and language detection

invoke: step-file
path: "{discoverStep4}"   # Governance inventory update and /switch branch creation
```

After these steps, `discovered_repos` and `repo_results` are populated in session state.

---

### 3. Extract Eligible Repos

```yaml
# Read the freshly-updated inventory for this initiative's domain/service
inventory = load("${governance_repo_path}/repo-inventory.yaml")

eligible_repos = inventory
  | filter(r => r.domain == initiative.domain AND r.service == initiative.service)
  | sort_by(r => r.name)
```

---

### 4. Select Target Repo

**If `eligible_repos` is empty:**

```
FAIL("""
❌  No repos found for ${initiative.domain}/${initiative.service} after running discover.

Ensure that repos exist under ${scan_path}, then re-run /dev.
""")
```

**If `eligible_repos` has exactly one entry:**

```
✅  Discovered repo: ${eligible_repos[0].name}
    Path: ${eligible_repos[0].path}
```

Set:
```yaml
selected_repo = eligible_repos[0]
```

**If `eligible_repos` has more than one entry:**

Display:
```
🔍  Multiple repos discovered for ${initiative.domain}/${initiative.service}:

  [1] ${eligible_repos[0].name}  —  ${eligible_repos[0].path}
  [2] ${eligible_repos[1].name}  —  ${eligible_repos[1].path}
  ...

Which repo should /dev target? Enter a number:
```

Require that the user enters a valid integer in range `[1, len(eligible_repos)]`. Re-prompt on invalid input. Set:
```yaml
selected_repo = eligible_repos[user_choice - 1]
```

---

### 5. Resolve and Apply Session State

```yaml
session.target_repo = selected_repo.name
session.target_path = selected_repo.path
```

Display:
```
✅  Target repo resolved: ${session.target_repo}  (${session.target_path})
```

---

### 6. Offer To Persist Back To Initiative Config

Ask:
```
💾  Persist this repo to initiative.target_repos so future /dev runs skip discovery? [Y/n]
```

**If yes (default):**

```yaml
# Update initiative.yaml in-place, setting target_repos[0] = session.target_repo
initiative_config = load(initiative_state.config_path)
initiative_config.target_repos = [session.target_repo]
write(initiative_state.config_path, initiative_config)

git add {initiative_state.config_path}
git commit -m "chore(initiative): set target_repos for ${initiative.initiative_root}"
```

Display:
```
✅  Saved ${session.target_repo} to initiative.target_repos.
    Future /dev runs will skip discovery.
```

**If no:**

```
ℹ️  Stored in session only. Re-discovery will run next time target_repos is empty.
```

---

## RETURN

Control returns to `step-01-preflight.md`. At this point:

- `session.target_repo` is set to the selected repo name
- `session.target_path` is set to the local path of the selected repo
- `resolver_result`, `discovered_repos`, `repo_results` are available in session state if downstream steps need them

The existing guard in step-01 — "if the resolved path points into `{release_repo_root}`, fail immediately" — still applies to the resolved `session.target_path`.
