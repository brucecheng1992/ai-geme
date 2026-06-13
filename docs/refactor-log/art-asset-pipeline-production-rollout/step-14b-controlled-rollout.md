# Step 14B — Controlled Rollout Implementation

Status: controlled rollout implementation locally validated and Oracle reviewed.

## Goal

Enable the smallest approved production/runtime integration change, guarded and reversible.

## Current Decision

Step 14B rollout decision:

```yaml
mode: non-default feature-flagged controlled rollout
default_behavior: unchanged
feature_flag: off by default
approved_input:
  - tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/
  - runtime-safe artifact generated from its metadata
production_asset_pack_mutation: not allowed
large_library_scan: not allowed
repair_enabled_default: not allowed
metadata_repair_writeback: not allowed
```

Success criteria:

- flag off equals current behavior;
- flag on exposes only the approved Pirate Kit semantic fixture / artifact path;
- rollback is disabling the flag;
- tests prove both flag-off and flag-on behavior.

## Implementation Result

Step 14B implements only a non-default semantic asset rollout helper:

- helper: `scripts/art-asset-semantic-rollout.ts`;
- focused tests: `tests/contracts/art-asset-semantic-rollout.test.ts`;
- feature flag: `ART_ASSET_SEMANTIC_ROLLOUT_ENABLED`;
- enabled value: `pirate-kit-v0.1`;
- default state: disabled when the flag is unset or empty;
- approved metadata input: `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata`;
- approved fixture root: `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`;
- expected asset count: `20`;
- rollback: disable `ART_ASSET_SEMANTIC_ROLLOUT_ENABLED`.

Flag-off behavior:

- returns a deterministic disabled summary;
- does not call the metadata exporter;
- does not read the Pirate Kit fixture;
- does not touch production/default asset packs.

Flag-on behavior:

- calls the existing runtime-safe metadata export API only for the approved Pirate Kit metadata directory;
- rejects unsupported flag values;
- fails closed when runtime metadata export fails;
- rejects artifacts with a non-20 asset count;
- rejects runtime-safe output paths outside the approved Pirate Kit fixture root;
- does not mutate source metadata.

Step 14B does not wire this helper into default gameplay, resolver selection, QA verdicts, Workbench, Phaser or production/default asset pack loading. Broad/default production rollout remains not approved.

## Allowed

- feature flag / staged config;
- loading only approved asset set;
- diagnostics and fallback;
- rollback path;
- production tests;
- performance checks.

## Not Allowed

- unapproved large library load;
- repair writeback;
- unsupported silent promotion;
- bypassing metadata validation;
- permanent default behavior change without gate approval.

## Required Tests

- flag off equals old behavior;
- flag on loads approved set only;
- invalid metadata fails closed;
- unsupported assets are not promoted;
- repair writeback disabled;
- fallback works;
- rollback config works;
- performance/memory budget check where testable.

## Validation

```bash
npx vitest run tests/contracts/art-asset-semantic-rollout.test.ts tests/contracts/art-asset-runtime-canary.test.ts
npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- assets/metadata/examples
npm run metadata:export-runtime -- --json assets/metadata/examples
npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Canary / comparison checks remain required before closing Step 14B if the rollout is treated as canary acceptance rather than helper-only implementation.

Validation result:

- Focused rollout test passed: 1 file / 6 tests.
- Focused rollout plus existing runtime canary regression passed: 2 files / 11 tests.
- Pirate Kit metadata validate / JSON validate / check-paths passed: 20 files.
- Pirate Kit runtime-safe export passed: `asset_count=20`.
- Baseline examples validate/export passed: 5 files / `asset_count=5`.
- Baseline small fixture validate/export passed: 10 files / `asset_count=10`.
- `npm run test:contracts` passed: 24 files / 216 tests.
- `npm test` passed: contracts 24 files / 216 tests, workspace 12 files / 125 tests.
- `npm run typecheck` passed: root, maker-api, maker-workbench.
- `git diff --check` passed.
- Default Pirate Kit canary passed: `runnable=20`, `passed=20`, `failed=0`.
- Repair-enabled Pirate Kit canary passed: `runnable=20`, `passed=20`, `failed=0`, `repair.attemptedCount=0`.
- Canary comparison passed: `ok=true`, `case.total=20`, `default.failed=0`, `repair.failed=0`.
- Generated canary / comparison outputs remain under ignored `artifacts/` and are not committed.

Review result:

- Oracle review completed.
- P0/P1 blockers: none.
- Initial P2: review log / rollout README still said Oracle review pending.
- Initial P3: this document still said implementation in progress.
- Resolution: docs now record completed validation and Oracle review status before commit.

## Review Gate

P0:

- Step 14B changes default behavior with flag off;
- Step 14B modifies production asset packs without approval;
- Step 14B enables broad/default rollout;
- Step 14B makes repair-enabled default;
- Step 14B performs metadata repair/writeback;
- Step 14B scans large library;
- Step 14B imports additional assets;
- Step 14B lacks rollback;
- Step 14B has no flag-off equality test;
- Step 14B commits generated artifacts;
- Step 14B introduces unresolved license/right risk into runtime-safe output.

P1:

- feature flag semantics unclear;
- approved scope unclear;
- rollback path unclear;
- default behavior test unclear;
- production asset pack policy unclear;
- docs imply broad rollout is complete;
- performance/size impact unrecorded.

P2:

- tests only cover flag-on happy path;
- no flag-off test;
- no rollback test;
- no asset count assertion;
- no metadata/export validation;
- no plan/review log update;
- no generated artifact exclusion check.

P3:

- wording, naming, formatting, cross-link cleanup.
