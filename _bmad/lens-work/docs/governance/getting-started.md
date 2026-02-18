# Getting Started with Governance

Learn how to set up constitutional governance for your lens-work workflows.

---

## Prerequisites

- BMAD installed
- lens-work module installed and synced

---

## Quick Start

### 1. Create Your First Constitution

Start with a Domain constitution that applies enterprise-wide:

```
/constitution
```

Select `[C] Create`, then choose the `domain` layer.

Scribe (Cornelius) will guide you through:
- Naming your domain
- Writing a preamble
- Adding articles with rationale and evidence requirements
- Ratifying the constitution

### 2. Verify It Works

Check that your constitution is recognized:

```
/resolve
```

You should see your domain constitution with its articles listed.

### 3. Check Compliance

Run a compliance check against any artifact:

```
/compliance
```

Scribe will evaluate the artifact against your constitutional rules and report PASS/WARN/FAIL per article.

### 4. View Your Heritage

See the full inheritance chain:

```
/ancestry
```

This shows all constitutions from Domain down to your current layer, with article counts and dates.

---

## Constitution Storage

Constitutions are stored at:

```
_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md
```

For example:
- `_bmad-output/lens-work/constitutions/domain/bmad/constitution.md`
- `_bmad-output/lens-work/constitutions/service/lens/constitution.md`

---

## Next Steps

- [Constitution Guide](constitution-guide.md) — How constitutions work in detail
- [Command Reference](command-reference.md) — All governance commands
- [Examples](examples.md) — Real-world usage examples

---

## Troubleshooting

### Constitution not found

Make sure your constitution is in the correct location:
- Default: `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md`
- Verify with: `/resolve`

### Inheritance not working

Ensure the parent constitution exists. For example, a service constitution requires a domain constitution at `_bmad-output/lens-work/constitutions/domain/{domain_name}/constitution.md`.

### No rules defined

This message from `/compliance` is expected if no constitutions have been created for your context. Create one with `/constitution`.

---

_Getting Started with lens-work governance_
