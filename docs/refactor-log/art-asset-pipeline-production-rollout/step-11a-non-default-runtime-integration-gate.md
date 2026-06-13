# Step 11A — Non-Default Runtime Integration Gate

Status: next docs-only gate after Step 10B branch boundary closes.

## Goal

Define whether and how a future runtime canary may consume the small art library runtime-safe metadata artifact behind an explicit non-default flag.

## Allowed

- docs-only gate;
- feature flag semantics;
- flag-off equivalence requirements;
- flag-on canary input rules;
- rollback path;
- Step 11B implementation boundary;
- validation requirements.

## Not Allowed

- code changes;
- tests;
- scripts;
- generated artifacts;
- runtime/default behavior changes;
- resolver decision changes;
- QA / Workbench / Phaser changes;
- production/default asset pack loading;
- large library access;
- repair writeback.

## Required Decisions

- feature flag name;
- default state: off;
- accepted input source: small fixture runtime-safe export only;
- flag-off behavior equivalence test shape;
- invalid artifact failure mode;
- rollback path;
- Step 11B file scope.

## Validation

```bash
git diff --check
```

## Review Gate

P0:

- implements code;
- changes default runtime behavior;
- enables runtime integration by default;
- touches large library;
- wires production/default asset pack;
- allows repair writeback;
- implies production rollout is complete.

P1:

- feature flag semantics unclear;
- flag-off equivalence not required;
- input artifact rules unclear;
- rollback path unclear;
- ownership/QA responsibility unclear.

P2:

- no non-goals;
- no validation requirements;
- no plan/review log update;
- no deferred rollout statement.

P3:

- wording, naming, formatting.

## Done When

- Step 11A docs gate exists;
- Step 11B boundaries are clear;
- no code changed;
- large library remains parked;
- runtime/default behavior remains unchanged;
- Oracle or documented self-review has no P0/P1/P2 blockers.
