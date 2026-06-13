# Step 12A — Workbench / QA Preview Gate

Status: future docs-only gate.

## Goal

Define whether and how small art library metadata, bridge diagnostics, and runtime-safe metadata should be previewed in internal tooling.

## Allowed

- preview scope document;
- user stories;
- data-source boundaries;
- safe field allowlist;
- read-only policy;
- P0/P1/P2/P3 gate;
- Step 12B implementation boundary.

## Not Allowed

- code changes;
- UI changes;
- runtime changes;
- QA runner changes;
- production/default integration;
- large library access.

## Required Decisions

- Is Workbench preview required before large library rollout?
- Is QA CLI/report enough?
- What asset fields are safe to display?
- Are thumbnails displayed?
- Are diagnostics displayed?
- Is the preview read-only?
- What is the source of truth: sidecars, runtime-safe export, or bridge summary?

## Validation

```bash
git diff --check
```

## Review Gate

P0:

- implements code;
- changes production/default behavior;
- exposes internal/provenance-sensitive fields;
- touches large library;
- implies QA signoff is complete.

P1:

- preview source unclear;
- safe display fields unclear;
- read-only policy unclear;
- diagnostics semantics unclear.

P2:

- no non-goals;
- no plan/review log update;
- no privacy/sensitivity note.

P3:

- wording, naming, formatting, cross-link cleanup.
