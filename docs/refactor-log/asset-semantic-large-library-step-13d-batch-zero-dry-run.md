# Asset Semantic Large Library Step 13D-A Batch Zero Semantic Dry-Run Gate

最新维护时间：2026-06-14

## Purpose

Step 13D-A gates the dry-run and bridge validation of the Kenney Pirate Kit batch-zero fixture.

This step is docs-only. It does not implement code, add tests, import assets, modify sidecar metadata, generate thumbnails, change runtime/default behavior, change resolver behavior, touch production asset packs or start production rollout.

Step 13D-B remains the future implementation step that will run the approved Pirate Kit batch-zero fixture through the full semantic dry-run and bridge canary pipeline.

## Previous Evidence

- Step 13B inventoried the Kenney Pirate Kit source archive read-only.
- Step 13C-A approved exactly 10 GLB candidates from the Pirate Kit archive.
- Step 13C-B imported exactly 10 approved GLB assets into `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`.
- Step 13C-B imported exactly 10 selected existing preview PNGs into the fixture `thumbnails/` directory.
- Step 13C-B created exactly 10 sidecar metadata manifests in the fixture `metadata/` directory.
- Step 13C-B validation passed: focused fixture tests, metadata validate, metadata validate `--json`, metadata validate `--check-paths`, runtime export `--json`, baseline examples validate/export, small fixture validate/export, `npm run test:contracts`, `npm test`, `npm run typecheck` and `git diff --check`.
- No production asset pack changed.
- Runtime/default behavior did not change.
- Resolver behavior did not change.
- QA / Workbench / Phaser / asset pack loading did not change.

## Step 13D-B Inputs

Step 13D-B may use only:

- `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`
- `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata`
- runtime-safe metadata exported from that metadata directory
- explicit bridge candidates derived from the same fixture metadata/runtime export
- the exact 10 batch-zero asset ids as `requestedAssetIds`
- focused negative test ids separate from the green path

The exact green-path `requestedAssetIds` are:

- `pirate_kit_barrel_001`
- `pirate_kit_boat_row_small_001`
- `pirate_kit_cannon_001`
- `pirate_kit_chest_001`
- `pirate_kit_crate_001`
- `pirate_kit_flag_pirate_001`
- `pirate_kit_palm_straight_001`
- `pirate_kit_rocks_a_001`
- `pirate_kit_ship_pirate_small_001`
- `pirate_kit_tower_complete_small_001`

Step 13D-B must not use:

- full Pirate Kit archive
- ignored extraction artifacts
- production/default asset packs
- large library source archive
- `resolveLocalAssetPack`
- `selectLocalAssetPack`
- runtime/default resolver paths
- QA / Workbench / Phaser loading paths

## Green Path

The Step 13D-B green path must:

- validate all 10 sidecars;
- export runtime-safe metadata for all 10 assets;
- run default canary on `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`;
- run repair-enabled canary on the same fixture input;
- compare default and repair-enabled summaries;
- derive bridge candidates from the same fixture metadata/runtime export;
- run bridge summary with `ok=true`;
- run resolver-adjacent diagnostics with `ok=true`;
- keep repair-enabled non-default;
- use identical fixture input for default and repair-enabled canaries.

Default and repair-enabled canaries must differ only by the explicit `--repair-enabled` flag and their output paths/timestamps.

## Negative Diagnostics

Negative diagnostics must be separate from the green path.

Allowed focused negative cases:

- missing requested id;
- missing bridge candidate;
- candidate without runtime metadata;
- blocked context only if metadata supports it;
- path mismatch / absolute path only in focused helper tests if needed.

Negative cases must not be mixed into the green batch-zero canary. They must not make the green default canary, repair-enabled canary, bridge summary or resolver-adjacent diagnostics summary fail.

## Step 13D-B Outputs

Step 13D-B must produce or record:

- metadata validation results;
- metadata validation JSON result;
- metadata validation with `--check-paths` result;
- runtime export JSON result;
- default canary summary;
- repair-enabled canary summary;
- default vs repair-enabled comparison summary;
- bridge summary;
- resolver-adjacent diagnostics summary.

Generated artifacts:

- must stay under ignored `artifacts/` or temporary paths;
- must not be committed unless explicitly approved as stable fixtures;
- must not include absolute machine-specific paths;
- must be deterministic.

## Required Commands For Step 13D-B

Step 13D-B must run:

```bash
npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata

npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1
npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1

npm run qa:asset-semantic:compare -- \
  --default-summary <default-summary.json> \
  --repair-enabled-summary <repair-summary.json> \
  --out <comparison-summary.json>
```

Step 13D-B must also run:

```bash
npx vitest run <focused Step 13D-B test file(s)>
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

The focused Step 13D-B tests must cover green-path bridge / resolver-adjacent summaries and focused negative diagnostics without touching production/default resolver paths.

## Bridge / Resolver-Adjacent Requirements

Step 13D-B must use only these pure helpers introduced earlier:

- `createAssetPackMetadataBridgeSummary`
- `createAssetResolverDiagnosticsSummary`

Step 13D-B must not call:

- `resolveLocalAssetPack`
- `selectLocalAssetPack`
- real/default resolver paths
- production/default asset pack loading

Bridge candidates must be explicit and derived from the batch-zero fixture metadata/runtime export.

Resolver requested ids must be the exact 10 batch-zero asset ids for the green path.

The bridge summary must prove the explicit candidates are present in runtime-safe metadata and return `ok=true`.

The resolver-adjacent diagnostics summary must prove the exact 10 requested ids resolve from the same runtime-safe metadata and return `ok=true`.

## Review Gate

P0:

- Step 13D-A implements code/tests/scripts;
- Step 13D-A imports assets or modifies sidecars;
- Step 13D-A changes runtime/default behavior;
- Step 13D-A touches production asset packs;
- Step 13D-A starts production rollout;
- Step 13D-A allows default and repair-enabled canaries to use different fixture inputs;
- Step 13D-A allows generated artifacts to be committed;
- Step 13D-A allows repair-enabled to become default;
- Step 13D-A allows source metadata repair/writeback;
- Step 13D-A implies production integration is complete;
- Step 13D-A allows `resolveLocalAssetPack` or `selectLocalAssetPack` in Step 13D-B.

P1:

- Step 13D-B input scope unclear;
- green path unclear;
- negative diagnostics not separated;
- bridge candidate derivation unclear;
- resolver requested id derivation unclear;
- output/report shape unclear;
- docs imply runtime/default integration is complete.

P2:

- no Step 13C-B evidence summary;
- no exact asset count assertion;
- no canary/compare commands documented;
- no bridge/resolver diagnostic expectations;
- no plan/review log update;
- no explicit production asset pack exclusion.

P3:

- naming issues;
- formatting issues;
- cross-link cleanup;
- wording issues.

## Docs Status

- Step 13C-B is done.
- Step 13D-A is the current docs-only gate and becomes done after this document, the semantic fidelity plan and the review log are updated and `git diff --check` passes.
- Step 13D-B is next: batch-zero semantic dry-run / bridge implementation.
- Runtime/default integration remains parked.
- Production rollout remains parked.

## Step 13D-A Validation And Review

Step 13D-A validation passed for this branch snapshot:

```bash
git diff --check
```

Validation result:

- `git diff --check`: passed.

Repository checks:

- only allowed docs changed;
- no code/tests/scripts changed;
- no assets imported;
- no sidecar metadata changed;
- no thumbnails changed;
- no generated artifacts added;
- no runtime/default behavior changed;
- no production asset packs changed;
- Step 13D-B not started;
- `AGENTS.md` not restored;
- parked plan patch not applied.

Read-only review gate:

- P0: none.
- P1: none.
- P2: none.
- P3: none.
- Review mode: main agent self-review. Oracle was not dispatched because the available multi-agent tool requires an explicit user request for sub-agent work in this environment.
