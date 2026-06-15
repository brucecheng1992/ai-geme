# Step 13E — Large-Library Batch Expansion

Status: Step 13E-B controlled expansion implementation locally validated and Oracle reviewed.

## Goal

Define and record the controlled large-library expansion after the Step 13C / Step 13D Pirate Kit batch-zero proof, without changing runtime/default behavior.

Step 13E-A answered only this question:

```txt
Is a tightly bounded Step 13E-B expansion implementation allowed, and under which constraints?
```

Step 13E-A did not perform the expansion. Step 13E-B implements the approved test-fixture-only expansion and remains separate from Step 14A production rollout.

## Completed Preconditions

- Step 13A approved large-library intake policy.
- Step 13B completed read-only Kenney Pirate Kit archive inventory.
- Step 13C-A approved the batch-zero source, size, layout, metadata policy, thumbnail policy and rollback rules.
- Step 13C-B imported exactly 10 approved Pirate Kit GLB assets, 10 selected existing preview PNGs and 10 sidecar metadata files into `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`.
- Step 13D-A approved the semantic dry-run / bridge gate for the same batch-zero fixture.
- Step 13D-B proved the same 10-asset fixture through metadata validation, runtime-safe export, default canary, repair-enabled canary, comparison, bridge summary, resolver-adjacent diagnostics and focused negative diagnostics.

## Step 13E-A Approved Decision

Step 13E-B may expand the committed large-library fixture only if it stays within all limits below.

### Source

- Use the same Kenney Pirate Kit source family already approved by Step 13A through Step 13D.
- Do not introduce a second large library, mixed-source batch or unrelated asset family in Step 13E-B.
- Use only project-relative committed fixture paths and ignored local temporary extraction/download paths.

### Batch Size

```txt
existing committed batch-zero assets: 10
approved Step 13E-B additional assets: 10
maximum committed Pirate Kit fixture assets after Step 13E-B: 20
absolute Step 13C/13E fixture ceiling remains: 50
```

Step 13E-B must fail review if it imports more than 10 additional assets or raises the committed Pirate Kit fixture above 20 assets.

### Candidate Selection

Step 13E-B should prefer assets that broaden semantic coverage without changing runtime/default behavior:

- pirate / nautical environment props;
- cover / obstacle / collectible / decoration candidates;
- one or two additional structure or vehicle candidates if they remain clearly in the same Pirate Kit family;
- candidates with matching existing `Previews/*.png` entries.

Step 13E-B must not import duplicate semantic roles only to grow count. Each selected asset must have an explicit reason in the fixture README or Step 13E-B log.

### Metadata and Thumbnail Policy

- Every imported asset must have a matching sidecar metadata file.
- Every sidecar must pass metadata validation and runtime-safe export.
- Thumbnails must use existing selected preview/reference images from the approved source archive.
- Do not generate thumbnails in Step 13E-B.
- Do not create or modify sidecars for unselected archive entries.
- Do not write repair output back to source metadata.

### Review Sampling

Step 13E-B requires 100% review of the additional batch before commit.

The main agent owns the implementation evidence. Oracle owns the read-only gate review.

For every newly added asset, the Step 13E-B review must inspect and record:

- archive source path and committed project-relative asset path;
- selected existing preview/reference path;
- sidecar metadata path;
- license/source evidence inheritance from the approved Pirate Kit source;
- file size and total expanded fixture size;
- runtime-safe path validation and absence of absolute local paths;
- semantic role / tags and why the candidate broadens coverage instead of duplicating count.

The review may not sample only a subset of the 10 added assets. If any one asset lacks review evidence, Step 13E-B must stop before commit.

### Validation Budget

Step 13E-B must include focused tests for the expanded fixture and rerun the same semantic bridge path proven in Step 13D-B against the expanded set.

Required minimum:

```bash
npx vitest run <focused Step 13E-B expanded-fixture test file(s)>
npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1
npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1
npm run qa:asset-semantic:compare -- --default-summary <default-summary.json> --repair-enabled-summary <repair-summary.json> --out <comparison-summary.json>
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Expected expanded-fixture result:

```txt
metadata files: 20
runtime-safe export asset_count: 20
default canary failed: 0
repair-enabled canary failed: 0
comparison ok: true
bridge matched_count: 20
resolver-adjacent resolved_count: 20
```

If any minimum command fails, Step 13E-B must stop before commit and report the failing command.

## Not Allowed

Step 13E-A:

- no asset import;
- no sidecar metadata changes;
- no thumbnail changes or generation;
- no generated artifact commits;
- no code/test/script changes;
- no runtime/default behavior change;
- no resolver behavior change;
- no QA / Workbench / Phaser / asset pack loading change;
- no production asset pack change;
- no Step 14A production rollout claim.

Step 13E-B:

- no full Pirate Kit archive import;
- no second-source library import;
- no production/default asset pack wiring;
- no `resolveLocalAssetPack` / `selectLocalAssetPack` dependency in diagnostics-only tests unless a later explicit runtime/default gate approves it;
- no repair-enabled default;
- no silent unsupported promotion;
- no generated thumbnails;
- no generated artifacts committed unless a later gate explicitly promotes a small deterministic fixture report.

## Rollback and Stop Rules

- Reverting Step 13E-B must be a fixture/test/docs revert only.
- Removing the additional 10 assets, their sidecars, their selected previews and focused tests must restore the Step 13D-B batch-zero state.
- If storage size, licensing evidence, metadata validation, semantic canary, bridge diagnostics or typecheck fails, stop before Step 14A.
- Step 14A remains parked until the expanded fixture is either validated and reviewed or explicitly skipped.

## Step 13E-A Validation

```bash
git diff --check
```

Optional boundary checks:

```bash
git diff --name-only
git status --short --branch
```

## Review Gate

P0:

- expands batch in Step 13E-A;
- imports assets, sidecars, thumbnails or generated artifacts in Step 13E-A;
- expands Step 13E-B without explicit size approval;
- ignores rights/licensing state;
- ignores storage budget;
- changes runtime/default behavior;
- changes resolver behavior;
- wires expanded fixture into production/default asset packs;
- allows silent unsupported promotion.

P1:

- Step 13E-B candidate set is not bounded to the approved source family;
- additional batch size or maximum fixture size is unclear;
- failure thresholds are unclear;
- 100% additional-asset review sampling, owner or coverage fields are unclear;
- rollback is unclear;
- validation commands do not cover metadata validation, runtime-safe export, canary, comparison, bridge diagnostics, contracts, full tests and typecheck.

P2:

- no CI budget note;
- no plan/review log update;
- no explicit thumbnail/source-evidence policy;
- no generated-artifact exclusion note;
- no Step 14A parking note.

P3:

- wording, naming, formatting, cross-link cleanup.

## Step 13E-B Controlled Expansion Implementation

Step 13E-B extends the existing committed Pirate Kit fixture:

```txt
tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/
```

It does not create a new fixture path and does not wire the expanded fixture into runtime/default behavior.

### Source Used

- Source page: `https://kenney.nl/assets/pirate-kit`
- Archive URL: `https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip`
- Local archive input: `<LOCAL_ARTIFACT_SOURCE_ZIP>`
- Extraction mode: selected files only; no full archive extraction committed.

### Added Assets

Step 13E-B adds exactly 10 assets:

- `bottle`
- `cannon-ball`
- `cannon-mobile`
- `crate-bottles`
- `rocks-b`
- `rocks-c`
- `patch-sand`
- `structure-platform-dock-small`
- `mast`
- `tool-paddle`

Expanded fixture counts:

```txt
existing batch-zero assets: 10
additional Step 13E-B assets: 10
expanded fixture assets: 20
expanded fixture thumbnails: 20
expanded fixture metadata sidecars: 20
total committed fixture files: 62
total fixture size: 719199 bytes
largest imported file: tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/assets/ship-pirate-small.glb, 131464 bytes
```

### 100% Additional-Asset Review Evidence

The fixture README records every newly added asset with:

- asset id;
- archive-relative source GLB path;
- selected existing preview path;
- file size;
- category / semantic rationale;
- metadata sidecar path;
- validation status.

The 10 added metadata sidecars use:

```txt
workflow.owner: asset_semantic_step_13e_b
workflow.reviewed_by: main_agent
workflow.created_at / updated_at / approved_at: 2026-06-14
blocked_contexts: production_default_runtime, large_library_rollout
license: cc0
```

### Behavior Boundary

- Runtime/default behavior did not change.
- Resolver behavior did not change.
- QA / Workbench / Phaser / asset pack loading did not change.
- Production asset packs did not change.
- Repair-enabled remains non-default.
- Step 14A production rollout remains future.
- No downloaded archive, raw extraction directory, generated thumbnail or generated canary/comparison artifact is committed.

### Step 13E-B Validation Evidence

Focused tests:

```bash
npx vitest run tests/contracts/asset-semantic-large-library-batch-zero-pirate-kit.test.ts
npx vitest run tests/contracts/asset-semantic-large-library-batch-zero-dry-run.test.ts
```

Results:

- Expanded fixture exact-set test passed: 1 file / 6 tests.
- Expanded semantic dry-run / bridge test passed: 1 file / 7 tests.
- Bridge summary asserted by focused test: `ok=true`, `matched_count=20`, `diagnostic_count=0`.
- Resolver-adjacent summary asserted by focused test: `ok=true`, `requested_count=20`, `resolved_count=20`, `diagnostic_count=0`.
- Negative diagnostics remain separate from the green path.

Metadata gates:

```bash
npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
```

Results:

- Metadata validate passed: 20 metadata files.
- JSON validate passed: `ok=true`, 20 files, no diagnostics.
- Check-paths validate passed: 20 metadata files.
- Runtime-safe export passed: `asset_count=20`, no diagnostics.

Canary / comparison:

```bash
npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep13e-expanded-default
npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep13e-expanded-repair
npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260614Tstep13e-expanded-default/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260614Tstep13e-expanded-repair/summary.json --out artifacts/asset-semantic-canary-comparison/20260614Tstep13e-expanded/comparison.json
```

Results:

- Default canary passed: `runnable=20`, `passed=20`, `failed=0`.
- Repair-enabled canary passed: `runnable=20`, `passed=20`, `failed=0`, `repair.attemptedCount=0`.
- Comparison passed: `ok=true`, `case.total=20`, `default.failed=0`, `repair.failed=0`.
- Default canary artifact: `artifacts/asset-semantic-canary/20260614Tstep13e-expanded-default/summary.json`.
- Repair-enabled canary artifact: `artifacts/asset-semantic-canary/20260614Tstep13e-expanded-repair/summary.json`.
- Comparison artifact: `artifacts/asset-semantic-canary-comparison/20260614Tstep13e-expanded/comparison.json`.

Baseline and full gates:

```bash
npm run metadata:validate -- assets/metadata/examples
npm run metadata:export-runtime -- --json assets/metadata/examples
npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
npm run test:contracts
npm test
npm run typecheck
git diff --check
```

Results:

- Example metadata validate/export passed: 5 files, `asset_count=5`.
- Small fixture metadata validate/export passed: 10 files, `asset_count=10`.
- `npm run test:contracts` passed: 23 files / 210 tests.
- `npm test` passed: contracts 23 files / 210 tests, workspace 12 files / 125 tests.
- `npm run typecheck` passed: root, maker-api, maker-workbench.
- `git diff --check` passed.

Oracle review:

- Oracle review completed with `PASS_WITH_P3_NOTES`.
- P0/P1/P2 blockers: none.
- P3 findings: stale Step 13E-A gate wording and pending Oracle placeholders.
- Resolution: stale wording and pending placeholders were updated before commit.
- Final gate: Step 13E-B may proceed to commit; Step 14A remains parked.
