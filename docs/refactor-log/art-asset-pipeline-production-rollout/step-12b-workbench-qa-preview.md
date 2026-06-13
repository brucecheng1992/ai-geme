# Step 12B — Workbench / QA Preview Implementation

Status: future code/test step. Start only if Step 12A decides preview is required.

## Goal

Add preview-only internal visibility for small art library metadata, thumbnails, or diagnostics.

## Allowed

- preview UI or QA report;
- read-only diagnostics display;
- small fixture only;
- explicit safe field allowlist;
- focused tests.

## Not Allowed

- production/default runtime integration;
- large library access;
- metadata mutation;
- repair writeback;
- exposing prompt, seed, legal, or review notes;
- making Workbench default depend on the large library.

## Required Tests

- preview source is small fixture only;
- preview is read-only;
- sensitive fields are absent;
- diagnostics display deterministically;
- default runtime behavior unchanged.

## Validation

```bash
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

## Review Gate

P0:

- sensitive fields exposed;
- preview mutates metadata;
- preview changes runtime/default behavior;
- large library touched.

P1:

- source of truth unclear;
- field allowlist incomplete;
- diagnostics semantics unclear.

P2:

- no read-only test;
- no sensitive-field exclusion test;
- no docs update.

P3:

- wording, naming, formatting, cross-link cleanup.
