---
name: 'step-01-load-profile'
description: 'Load and display the onboarding profile, offer editing'
---

# Step 1: Load and Display Profile

**Goal:** Show the current profile contents and allow the user to update individual fields.

---

## EXECUTION SEQUENCE

### 1. Load Profile

```yaml
profile_path = "{personal_output_folder}/profile.yaml"
profile = load_if_exists(profile_path)

if profile == null:
  output: |
    ⚠️ No profile found at ${profile_path}

    Run /onboard to create your profile.
  END
```

### 2. Display Profile

```yaml
output: |
  👤 Your LENS Profile

  | Field | Value |
  |-------|-------|
  | Name | ${profile.name || "—"} |
  | Git Provider | ${profile.git_provider || "—"} |
  | Default Remote | ${profile.default_remote || "—"} |
  | Auth Method | ${profile.auth_method || "—"} |
  | Created | ${profile.created_at || "—"} |
  | Last Updated | ${profile.updated_at || "—"} |

  Type the field name to update it, or press Enter to exit.
```

### 3. Field Editing Loop

```yaml
loop:
  ask: "Field to update (or Enter to exit):"
  capture: field_name
  if field_name == "":
    break

  field_name = lower(trim(field_name))
  if field_name not in ["name", "git_provider", "default_remote", "auth_method"]:
    output: "Unknown field: ${field_name}. Editable fields: name, git_provider, default_remote, auth_method"
    continue

  ask: "New value for ${field_name}:"
  capture: new_value

  profile[field_name] = new_value
  profile.updated_at = now_iso8601()

  write_yaml(profile_path, profile)
  output: "✅ Updated ${field_name} → ${new_value}"
```

---

## END

Profile review complete.
