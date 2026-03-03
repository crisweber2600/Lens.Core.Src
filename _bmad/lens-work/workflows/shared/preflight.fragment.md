---
name: shared.preflight
description: "Standard phase pre-flight: clean state, load two-file state, load lifecycle"
include_as: invoke
---

# SHARED: Standard Phase Pre-Flight

**Include with:** `invoke: shared.preflight`

**Pre-conditions:** Must run from BMAD control repo root with `_bmad/` and `.git/` present.

**Post-conditions:** `state`, `initiative`, `lifecycle`, `size`, `domain_prefix`, `initiative_root` all populated and available for the calling workflow.

---

```yaml
# 1. Verify working directory is clean
invoke: git-orchestration.verify-clean-state

# 2. Load personal state (two-file architecture)
state = load("_bmad-output/lens-work/state.yaml")

if state == null or state.active_initiative == null:
  error: "No active initiative. Run /new-domain, /new-service, or /new-feature first."
  hint: "If you have an existing initiative, run @lens fix-state to repair state.yaml."
  exit: 1

# 3. Load initiative config
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

if initiative == null:
  error: "Initiative config not found: initiatives/${state.active_initiative}.yaml"
  hint: "Run @lens migrate or check the initiatives/ directory."
  exit: 1

# 4. Load lifecycle contract (phase → audience mapping, phase order)
lifecycle = load("_bmad/lens-work/lifecycle.yaml")

# 5. Populate common fields — always available after this block
size            = initiative.size
domain_prefix   = initiative.domain_prefix
initiative_root = initiative.initiative_root
```

---

**Note:** This fragment replaces the `### 0. Pre-Flight [REQ-9]` comment block that previously appeared verbatim in every phase router. Phase-specific audience derivation and branch resolution continue immediately after this invoke.
