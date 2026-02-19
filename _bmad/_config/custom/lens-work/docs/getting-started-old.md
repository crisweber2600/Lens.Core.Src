# Getting Started with LENS Sync & Discovery

Welcome to LENS Sync & Discovery. This guide helps you align architectural intent with real code and keep everything in sync.

---

## What This Module Does

- Bootstraps folder structures from the lens domain map
- Discovers brownfield systems and generates documentation
- Propagates documentation changes upward through the lens hierarchy

---

## Prerequisites

Before running workflows, ensure the environment is ready:

- Node.js 18+ and Git 2.30+
- Lens root present at `_lens/` or `lens/`
- Valid `domain-map.yaml` and `service.yaml` files

Full checklist: see [Prerequisites](prerequisites.md).

---

## Installation

Install the base LENS module, then enable the extension:

```bash
bmad install lens
```

For local development or manual install:

```bash
node src/modules/lens/extensions/lens-sync/_module-installer/installer.js
```

---

## First Steps

1. Run `Bridge, bootstrap` to align structure with the lens domain map.
2. Run `Scout, discover` to analyze a brownfield service and generate docs.
3. Run `Link, lens-sync` to propagate documentation changes.

---

## Common Use Cases

- **New team member onboarding** — bootstrap and discover to generate a full context pack.
- **Legacy service documentation** — run discover to create a BMAD-ready doc set.
- **Documentation propagation** — use lens-sync after changes to keep hierarchy aligned.

---

## What’s Next

- Meet the agents in the [Agents Reference](agents.md)
- Browse the [Workflows Reference](workflows.md)
- Review examples in [Examples](examples.md)
- Review testing guidance in [Testing](testing.md)
- Review operations guidance in [Operations](operations.md)

---

## Need Help?

If you run into issues:
1. Ensure `domain-map.yaml` is present and valid.
2. Verify git access for repository cloning.
3. Check your module configuration in module.yaml.
