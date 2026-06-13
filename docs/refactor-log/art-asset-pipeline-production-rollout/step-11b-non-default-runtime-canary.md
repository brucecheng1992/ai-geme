# Step 11B — Non-Default Runtime Canary Implementation

Status: future code/test step. Do not start until Step 11A is complete.

## Goal

Add a feature-flagged runtime canary path that consumes the small library runtime-safe artifact without changing default behavior.

## Allowed

- feature flag definition;
- flag-off tests;
- flag-on canary tests;
- small fixture runtime artifact input;
- invalid artifact diagnostics;
- docs update.

## Not Allowed

- default runtime behavior change;
- production asset pack replacement;
- large library access;
- repair writeback;
- resolver decision changes;
- Workbench default path;
- Phaser default loading path.

## Required Tests

- flag off equals old behavior;
- flag on uses only small fixture input;
- flag on does not mutate metadata;
- flag on does not read large library;
- invalid runtime artifact is rejected or diagnosed;
- production/default asset pack remains unchanged;
- diagnostics are deterministic.

## Validation

```bash
npm run test:contracts
npm test
npm run typecheck
git diff --check
npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
```

## Review Gate

P0:

- flag-on becomes default;
- flag-off behavior changes;
- production/default asset pack modified;
- large library touched;
- runtime loads unvalidated metadata;
- repair writeback occurs;
- runtime behavior becomes nondeterministic.

P1:

- feature flag name/scope unclear;
- input artifact path unclear;
- rollback path unclear;
- tests rely on machine-specific path.

P2:

- no flag-off test;
- no flag-on test;
- no negative invalid-artifact test;
- no docs update.

P3:

- wording, naming, formatting, cross-link cleanup.
