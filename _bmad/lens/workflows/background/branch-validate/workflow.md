---
name: branch-validate
description: Verify branch topology integrity
agent: lens
trigger: auto (phase_transition, initiative_create)
category: background
user_facing: false
---

# Branch Validate (Background)

**Purpose:** Verify branch topology matches expected patterns from initiative config.

---

## Trigger Behavior

### On `initiative_create`

```yaml
# Verify all branches were created successfully
initiative = load("_bmad-output/lens/initiatives/${initiative_id}.yaml")

if initiative.type == "domain":
  expected = [initiative.domain_prefix]
elif initiative.type == "service":
  expected = ["${initiative.domain_prefix}-${initiative.service_prefix}"]
elif initiative.type == "feature":
  fbr = initiative.feature_branch_root
  expected = [fbr]
  for audience in initiative.audiences:
    expected.push("${fbr}-${audience}")

# Check each expected branch exists
actual = exec("git branch --list").split("\n").map(b => b.trim().replace("* ", ""))

missing = []
for branch in expected:
  if branch not in actual:
    missing.push(branch)

if missing.length > 0:
  state = load("_bmad-output/lens/state.yaml")
  state.background_errors.push({
    ts: ISO_TIMESTAMP,
    error: "Branch topology incomplete",
    missing: missing
  })
  write_file("_bmad-output/lens/state.yaml", state)
```

### On `phase_transition`

```yaml
initiative = load("_bmad-output/lens/initiatives/${initiative_id}.yaml")

if initiative.type != "feature":
  return    # Domain/service don't have phase branches

fbr = initiative.feature_branch_root
current_phase = new_phase    # e.g., "p2"
audience = initiative.review_audience_map[current_phase]

# Verify the phase branch parent (audience branch) exists
audience_branch = "${fbr}-${audience}"
if not branch_exists(audience_branch):
  add_background_error("Audience branch missing: ${audience_branch}")

# Verify the root branch still exists
if not branch_exists(fbr):
  add_background_error("Root branch missing: ${fbr}")

# Check for topology drift: unexpected branches
actual_matching = exec("git branch --list '${fbr}*'").split("\n").map(b => b.trim())
expected_pattern = /^${fbr}(-\w+)*$/
unexpected = actual_matching.filter(b => !expected_pattern.test(b))

if unexpected.length > 0:
  add_background_warning("Unexpected branches found: ${unexpected.join(', ')}")
```

---

## Validation Rules

1. Root branch must always exist for active initiatives
2. Audience branches must exist before phase branches can be created
3. Phase branches are ephemeral — they exist only during active phase work
4. Workflow branches are ephemeral — they exist only during active workflow
5. No unexpected branches should match the initiative pattern
