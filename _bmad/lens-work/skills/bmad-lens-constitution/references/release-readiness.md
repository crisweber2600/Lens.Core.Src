# Constitution Release Readiness Notes

## Coverage Summary

- Partial hierarchy resolution is covered for org-only, missing-org, empty, domain-only, service-only, and repo-level paths.
- Merge parity is covered for permitted-track intersection, required-artifact union, gate-mode strongest-wins, `sensing_gate_mode` strongest-wins, reviewer union, and true-wins enforcement flags.
- Express-track parity is covered in defaults, merge behavior, compliance, and progressive display.
- Safety coverage includes malformed frontmatter, invalid slugs, traversal attempts, and no-write assertions against temp-directory governance fixtures.
- Prompt and skill surfaces remain thin; runtime behavior is centralized in `scripts/constitution-ops.py`.

## Remaining Caller-Audit Follow-Ups

- Audit downstream callers that consume `sensing_gate_mode` to confirm they do not special-case missing hierarchy warnings.
- Confirm any repo-level constitution fixture needs before expanding the governance inventory beyond the current representative repo-level tests.
- Keep `hard_gate_failures` available until older callers migrate to the `hard_failures` alias.

## PR Notes Guardrail

Final PR notes should claim only the implemented contract: read-only constitution resolution, sparse-hierarchy tolerance, express-track parity, compliance gate exit-code behavior, progressive-display filtering, and safety regression coverage. Broader caller migration is a follow-up unless completed separately.
