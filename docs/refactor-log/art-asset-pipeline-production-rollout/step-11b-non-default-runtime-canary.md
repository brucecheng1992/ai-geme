# Step 11B — Non-Default Runtime Canary Implementation

Status: current implementation step. Step 11A is complete and this step runs on `test/art-asset-step-11b-non-default-runtime-canary`.

## Goal

Add a feature-flagged runtime canary path that consumes the small library runtime-safe artifact without changing default behavior.

## Implementation Summary

Step 11B adds a script-side, non-default runtime metadata canary helper. It does not connect to default project generation, Phaser templates, Workbench, QA aggregation, resolver selection, production/default asset packs or large-library paths.

Changed files:

- `scripts/art-asset-runtime-canary.ts`
- `tests/contracts/art-asset-runtime-canary.test.ts`
- rollout / review docs

## Runtime Canary Contract

- Env flag name: `ASSET_RUNTIME_METADATA_CANARY`.
- Default state: disabled when the flag is absent or empty.
- Only enabled value: `small-library-v0.1`.
- Enabled mode reads only `tests/fixtures/art-library-small-v0.1/metadata` through the existing runtime-safe metadata export API.
- Unsupported flag values throw a usage error before reading metadata.
- Disabled mode performs no metadata export I/O.
- Invalid export result or invalid runtime artifact returns `ok=false` deterministic diagnostics.
- Unsafe path diagnostics do not echo production/default or machine-local path values.

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

Implemented coverage:

- default / empty env returns disabled and does not call the exporter;
- `small-library-v0.1` is the only accepted enabled value;
- enabled canary calls the exporter exactly once with `tests/fixtures/art-library-small-v0.1/metadata`;
- export failure fails closed;
- invalid artifact count and unsafe path fail closed without mutating the artifact;
- summaries contain no timestamp, absolute local path or `assets/asset-packs` path.

## Validation

```bash
npx vitest run tests/contracts/art-asset-runtime-canary.test.ts
npx vitest run tests/contracts/asset-pack-small-library-bridge-canary.test.ts
npm run typecheck:root
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

## Completed Validation

```bash
npx vitest run tests/contracts/art-asset-runtime-canary.test.ts
npx vitest run tests/contracts/asset-pack-small-library-bridge-canary.test.ts
npx vitest run tests/contracts/art-asset-runtime-canary.test.ts tests/contracts/asset-pack-small-library-bridge-canary.test.ts
npm run typecheck:root
npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
npm run test:contracts
npm run typecheck
npm test
git diff --check
```

Result:

- Focused runtime canary tests passed: 5 tests.
- Focused small-library bridge plus runtime canary tests passed: 9 tests.
- Metadata validation passed: 10 metadata files.
- Runtime metadata JSON export passed with `ok: true`, 10 assets and no diagnostics.
- Contract suite passed: 20 files, 193 tests.
- Full typecheck passed for root, maker-api and maker-workbench.
- Full test suite passed, including workspace tests.
- `git diff --check` passed.

## Review Result

- Oracle review completed: P0/P1/P2/P3 findings none.
- Oracle confirmed default behavior is unchanged, unsupported flag values fail closed, flag-on scope is fixed to the small fixture metadata directory, unsafe path diagnostics do not echo the raw unsafe path value, tests cover the Step 11B gate, and docs do not claim Step 11C / production default integration / large library completion.
