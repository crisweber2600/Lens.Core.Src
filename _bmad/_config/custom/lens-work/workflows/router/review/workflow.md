---
name: review
description: Legacy redirect to sprintplan (v2)
agent: "@lens"
trigger: /review command
category: router
redirects_to: sprintplan
---

# /review — Legacy Command Redirect

**Purpose:** This is a legacy command that redirects to the new `/sprintplan` command.

---

## Redirect Notice

The `/review` command has been replaced by `/sprintplan` in LENS Workbench v2.0.0.

```
🔄 Redirecting to /sprintplan...

The review phase has been renamed to "sprintplan" as part of the
v2 lifecycle contract with named phases.

Command mapping:
- OLD: /review (p5 phase)
- NEW: /sprintplan (large audience)
```

---

## Execution

```yaml
# Automatic redirect
redirect_to: /sprintplan
preserve_args: true

output: |
  Redirecting to /sprintplan...
  (The /review command is now an alias for /sprintplan)
```

---

## Migration Notes

In v2.0.0, the lifecycle uses named phases instead of numbered phases:

| v1 Legacy | v2 Named Phase | Audience | Agent |
|-----------|---------------|----------|-------|
| (legacy p1) | preplan | small | Mary |
| (legacy p2) | businessplan | small | John+Sally |
| (legacy p3) | techplan | small | Winston |
| (legacy p4) | devproposal | medium | John |
| (legacy p5) | sprintplan | large | Bob |
| (legacy p6) | dev | base | Dev Team |

The `/review` command (legacy p5) is now `/sprintplan` in the large audience.

---

_Legacy command preserved as alias for backward compatibility_
_Redirects to: `/sprintplan`_