# Getting Started with LENS

Welcome to LENS - Layered Enterprise Navigation System. This guide helps you get started with automatic setup and navigation.

---

## What This Module Does

- **Automatic First-Run Setup:** Bootstraps extensions and clones repositories on first run
- **Context-Aware Navigation:** Detects Domain, Service, Microservice, and Feature lenses
- **Discovery & Synchronization:** Analyzes brownfield systems and keeps documentation in sync
- **Folder Structure Alignment:** Bootstraps structures from the lens domain map

---

## Prerequisites

Before running LENS, ensure the environment is ready:

- Node.js 18+ and Git 2.30+
- Git credentials configured (SSH keys or HTTPS tokens)
- (Optional) Valid `domain-map.yaml` and `service.yaml` files for bootstrap

Full checklist: see [Prerequisites](prerequisites.md).

---

## Installation

Install the LENS module using BMAD CLI:

```bash
bmad install lens
```

For local development or manual install:

```bash
node src/modules/lens/_module-installer/installer.js
```

---

## First Run (Automatic Setup)

**Recommended:** Run the LENS startup workflow for automatic initialization:

```bash
# Execute LENS startup workflow
bmad.start
```

**What happens automatically:**
1. ✅ **Preflight Check:** Validates all LENS systems and extensions
2. ✅ **Extension Initialization:** Brings all installed extensions to OPERATIONAL status
   - lens-sync: Runs initial Scout discovery
   - lens-compass: Creates user profile and roster
   - git-lens: Initializes Tracey state
   - spec: Creates default constitution
3. ✅ **Bootstrap (If Configured):** Clones repositories from domain-map.yaml (with approval)
4. ✅ **Compass Activation:** Launches Compass for context-aware workflow guidance

**Bootstrap Configuration (Optional):**

If you want automatic repository cloning on first run:

1. Create `_bmad/lens-work/domain-map.yaml` with your domain structure
2. Create `_bmad/{domain}/service.yaml` for each domain
3. Run `bmad.start` - you'll be prompted to approve repository clones

See the [Workflows Reference](workflows.md) for configuration templates.

---

## First Steps (After Setup)

**Navigation:**
1. Run `/context` to detect your current lens context
2. Use `/help` to get lens-aware workflow recommendations
3. Use `/switch` to change between Domain/Service/Microservice/Feature views
4. Use `context load` to pull deeper details for the current lens

**Discovery & Synchronization:**
1. Run `Scout, discover` to analyze a brownfield service and generate docs
2. Run `Compass, bootstrap` to manually sync folder structure with domain map
3. Run `Scribe, generate-docs` to propagate documentation changes
4. Use `sync-status` to check alignment between architecture and code

---

## Common Use Cases

- **New team member onboarding** — Run `bmad.start` for automatic setup with full context
- **Legacy service documentation** — Run `discover` to create a BMAD-ready doc set
- **Multi-repository setup** — Configure `domain-map.yaml` and let bootstrap clone everything
- **Documentation propagation** — Use `lens-sync` after changes to keep hierarchy aligned

---

## What's Next

- Review the [Workflows Reference](workflows.md) for bootstrap integration details
- Meet the agents in the [Agents Reference](agents.md)
- Browse the [Workflows Reference](workflows.md)
- Review examples in [Examples](examples.md)
- Review testing guidance in [Testing](testing.md)
- Review operations guidance in [Operations](operations.md)

---

## Need Help?

If you run into issues:
1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Ensure `domain-map.yaml` is present and valid (if using bootstrap)
3. Verify git access for repository cloning
4. Review your module configuration in `config.yaml`
