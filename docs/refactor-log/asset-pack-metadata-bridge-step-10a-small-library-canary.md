# Asset Pack Metadata Bridge Step 10A Small Library Canary Gate

完成时间：2026-06-13

## 1. Purpose

Step 10A gates a future Step 10B small library bridge canary.

The Step 10B canary may use:

- Step 9B small art library fixture.
- Step 9C small art library dry-run record as prior evidence only.
- Step 4B pure report-only helpers:
  - `createAssetPackMetadataBridgeSummary`
  - `createAssetResolverDiagnosticsSummary`

Step 10A is docs-only. It is not runtime/default integration, not a resolver run, and not production/default asset pack wiring. Step 10B must be described as a fixture-only explicit-input canary that uses the resolver-adjacent report-only diagnostics helper, not the real resolver and not production/default resolver paths.

Step 10B executable inputs must be freshly derived from the small fixture metadata, runtime-safe export and explicit test/dry-run input. Step 9C dry-run outputs may be cited for closure evidence, but must not become Step 10B executable input.

## 2. Step 4B Closure

Step 4B is complete and added only pure report-only helpers:

- `createAssetPackMetadataBridgeSummary`
- `createAssetResolverDiagnosticsSummary`

Step 4B did not:

- call `resolveLocalAssetPack`.
- call `selectLocalAssetPack`.
- change runtime/default behavior.
- change resolver decisions.
- touch, scan or import large asset library.
- add production/default asset pack wiring.
- implement unsupported semantic diagnostics without explicit expected semantic input.

## 3. Step 10B Input Rules

Step 10B may use only fixture-only explicit inputs.

Allowed inputs:

- `tests/fixtures/art-library-small-v0.1/`
- `tests/fixtures/art-library-small-v0.1/metadata`
- runtime-safe metadata generated from the small library metadata.
- explicit bridge candidates derived from small library fixture metadata or file layout.
- exact 10 known small-library asset ids as `requestedAssetIds`.
- a focused missing-id negative case.
- a focused blocked-context negative case only if it is derived from metadata and the helper supports it.

Forbidden inputs:

- large asset library.
- production/default asset pack.
- `resolveLocalAssetPack`.
- `selectLocalAssetPack`.
- real resolver path.
- runtime/default resolver path.
- QA runtime path.
- Workbench path.
- Phaser runtime path.
- asset pack loading path.

## 4. Step 10B Helper Usage

Step 10B must use only:

- `createAssetPackMetadataBridgeSummary`
- `createAssetResolverDiagnosticsSummary`

Step 10B must not use:

- `resolveLocalAssetPack`
- `selectLocalAssetPack`
- production/default resolver implementation.
- production/default asset pack loading.
- file-copying resolver paths.

## 5. Green Canary Vs Negative Diagnostics

Step 10B must keep the green canary and negative diagnostics separate.

Green canary:

- uses the 10 valid small-library asset ids.
- expects bridge summary `ok=true`.
- expects resolver-adjacent diagnostics summary `ok=true`.
- does not mix in a missing-id case.
- does not mix in a blocked-context negative case.

Negative diagnostics:

- missing-id case is a focused separate test/report case.
- blocked-context case is a focused separate test/report case, only if supported by metadata.
- duplicate/path mismatch/absolute path cases remain focused helper tests, not green canary behavior.

## 6. Unsupported Semantic Diagnostics Rule

Step 10B must not require unsupported semantic diagnostics.

Current Step 4B resolver-adjacent diagnostics API has no explicit expected semantic input. Therefore Step 10B must not invent unsupported semantic diagnostics from only `requestedAssetIds` or context.

Unsupported semantic diagnostics can only be added in a future step if an API explicitly accepts `expectedTags`, `expectedRoles` or `expectedSemantics`, and tests prove the semantics are caller-provided.

## 7. Candidate Derivation Rules

Step 10B bridge candidates must be explicit.

Rules:

- one candidate per small library metadata asset.
- candidate `asset_id` matches metadata `asset_id`.
- candidate `source_path` matches runtime metadata `technical.source_path`.
- candidate `thumbnail_path` matches runtime metadata `technical.thumbnail_path`.
- candidate `asset_type` may mirror runtime metadata `asset_type` if useful.
- candidates are test/dry-run inputs only.
- candidates are not production asset pack entries.
- candidates are not derived by scanning production/default asset packs.

## 8. Requested Id Rules

Resolver-adjacent `requestedAssetIds` must be explicit.

Rules:

- green path uses the exact 10 small-library asset ids.
- requested ids should be sorted deterministically.
- missing-id negative case must be separate.
- blocked-context negative case must be separate and only if supported by metadata.
- no unsupported semantic case unless future explicit expected semantic inputs exist.

## 9. Expected Step 10B Outputs

Future Step 10B outputs:

- bridge summary.
- resolver-adjacent diagnostics summary.
- optional combined canary summary.

Output requirements:

- deterministic.
- no timestamps.
- no absolute local paths.
- no machine-specific paths.
- no generated artifacts committed unless explicit stable fixtures are documented.
- diagnostic codes uppercase.
- stable JSON shape.
- stable counts.
- stable severity.
- stable sorting.

## 10. Step 10B Pass/Fail Criteria

Step 10B green canary should pass only if:

- small library metadata validation passes.
- runtime export succeeds.
- explicit bridge candidates are derived from the same fixture input.
- bridge summary `ok=true` for the 10 valid assets.
- resolver-adjacent diagnostics summary `ok=true` for the 10 valid requested ids.
- default/runtime behavior remains unchanged.
- large asset library is not touched.
- production/default asset pack is not touched.
- no generated artifacts are committed.

Focused negative tests should prove:

- missing id diagnostic is deterministic.
- blocked context diagnostic is deterministic if supported.
- negative cases are separate from green canary.
- no unsupported semantic diagnostic is fabricated.

## 11. Non-Goals

Step 10A and the future Step 10B canary are not:

- runtime/default integration.
- production asset pack wiring.
- resolver behavior change.
- real resolver execution.
- `resolveLocalAssetPack` / `selectLocalAssetPack` usage.
- QA runtime path.
- Workbench preview.
- Phaser runtime loading.
- asset pack loading behavior change.
- large library rollout.
- repair writeback.
- unsupported semantic promotion.
- new asset import.

## 12. Future Boundaries

Step 10B:

- implement fixture-only explicit-input small library bridge canary.
- use only Step 4B pure helpers.
- run against Step 9B small library fixture only.
- keep green canary and negative diagnostics separate.
- do not wire runtime/default.

Step 11A:

- docs-only gate for optional non-default runtime integration, if still needed.

Step 13A:

- large library gate remains future and separate.

## 13. Review Gate

P0:

- Step 10A implements code/tests/scripts/artifacts.
- Step 10A starts Step 10B implementation.
- Step 10A changes runtime/default asset loading behavior.
- Step 10A changes resolver behavior.
- Step 10A touches or scans large asset library.
- Step 10A wires small library into production/default asset packs.
- Step 10A allows `resolveLocalAssetPack` / `selectLocalAssetPack` use for Step 10B canary.
- Step 10A allows production/default resolver paths.
- Step 10A allows QA/Workbench/Phaser/asset-pack-loading paths.
- Step 10A allows repair writeback.
- Step 10A allows unsupported semantic promotion.
- Step 10A requires unsupported semantic diagnostics without explicit expected semantic input.
- Step 10A implies runtime integration is complete.

P1:

- Step 10B inputs are unclear.
- candidate derivation rules are unclear.
- requested id rules are unclear.
- blocked-context rules are unclear.
- green canary and negative diagnostics are mixed.
- output/report shape is unclear.
- deterministic requirements are unclear.
- docs say "resolver run" instead of resolver-adjacent report-only diagnostics helper.
- docs imply production/default integration is complete.
- docs imply large library rollout is allowed.

P2:

- no previous Step 4B closure note.
- no explicit large library exclusion.
- no runtime/default non-goal.
- no review log update.
- no plan update.
- no pass/fail criteria.
- no future Step 10B boundary.
- no statement that generated artifacts are forbidden in Step 10A.

P3:

- naming issues.
- formatting issues.
- cross-link cleanup.
- small wording issues.

## 14. Docs Status Update

Step status after this docs-only gate:

- Step 4B：done.
- Step 10A：current docs-only gate; done after this change is reviewed and committed.
- Step 10B：next future implementation, fixture-only and explicit-input.
- runtime/default integration：parked.
- large asset library：parked.

Review log requirements for Step 10A:

- Step 10A is docs-only.
- no code/tests/scripts/artifacts added.
- no runtime/default behavior changed.
- no resolver behavior changed.
- no QA/Workbench/Phaser/asset-pack-loading behavior changed.
- no large art library touched.
- Step 10B remains future implementation.

## 15. Validation For Step 10A

Required validation:

    git diff --check

Required final repository checks:

- Only docs changed.
- No code changed.
- No tests changed.
- No scripts changed.
- No assets or metadata sidecars changed.
- No generated artifacts were added.
- No runtime/resolver/QA/Workbench/Phaser/asset pack loading files changed.
- Large asset library was not touched.
- Step 10B was not started.

## 16. Review Record

Oracle pre-review:

- Go for docs-only.
- P0 focus: no code/tests/scripts/artifacts, no runtime/default/resolver/large library/production wiring, no repair writeback, no unsupported semantic promotion.
- P1 focus: keep green canary and negative diagnostics separate; define explicit candidate derivation and requested id rules; use resolver-adjacent report-only diagnostics helper wording.
- P2 focus: include Step 4B closure, large library exclusion, runtime/default non-goal, plan/review log update, pass/fail criteria and future boundaries.

Oracle review:

- 首轮审查：P0/P2/P3 未发现；P1 指出 Step 9C dry-run output wording 可能放宽 Step 10B executable input boundary。
- 已处理：Step 9C dry-run 只可作为 prior evidence；Step 10B executable inputs 必须从 small fixture metadata、runtime-safe export 和 explicit test/dry-run input fresh derive。
- Oracle 复审：P0/P1/P2/P3 均无；确认 Step 10A docs-only gate 可在 staged diff 检查后提交。

## 17. Step 10B Implementation Follow-Up

完成时间：2026-06-13

Step 10B has implemented the fixture-only small library bridge canary in:

- `tests/contracts/asset-pack-small-library-bridge-canary.test.ts`

Step 10B uses only explicit fixture-derived inputs:

- runtime-safe metadata exported from `tests/fixtures/art-library-small-v0.1/metadata`.
- one explicit bridge candidate per exported fixture asset.
- sorted exact 10 small-library `requestedAssetIds`.

Step 10B uses only the Step 4B pure report-only helpers:

- `createAssetPackMetadataBridgeSummary`
- `createAssetResolverDiagnosticsSummary`

Step 10B proves:

- small library runtime export succeeds for 10 fixture assets.
- bridge green canary returns `ok=true`, `matched_count=10` and `diagnostic_count=0`.
- resolver-adjacent green canary returns `ok=true`, `requested_count=10`, `resolved_count=10` and `diagnostic_count=0`.
- missing requested id diagnostics are deterministic and separate from the green canary.
- bridge missing-candidate diagnostics are deterministic and separate from the green canary.
- blocked-context diagnostics are deterministic and separate from the green canary because the fixture metadata explicitly blocks `production_default_runtime`.
- in-memory summaries contain no timestamps, absolute local paths or production/default asset pack paths.

Step 10B did not:

- change runtime/default behavior.
- change resolver behavior.
- call `resolveLocalAssetPack` or `selectLocalAssetPack`.
- use real/default resolver paths.
- touch QA, Workbench, Phaser or asset pack loading.
- touch, scan or import large asset library.
- modify source assets or metadata sidecars.
- commit generated artifacts.
- invent unsupported semantic diagnostics.
- make repair-enabled mode default.

Step 10B review gate:

- Oracle 只读审查：P0/P1/P2/P3 均无。
- Oracle 确认 green canary 只从 `tests/fixtures/art-library-small-v0.1/metadata` runtime export 派生输入，只调用 `createAssetPackMetadataBridgeSummary` / `createAssetResolverDiagnosticsSummary`。
- Oracle 确认 missing-id、missing-candidate、blocked-context negative diagnostics 与 green canary 分离且 deterministic。
- Oracle 确认 docs 未误称 runtime integration、production/default loading、real resolver execution、large library rollout 或 Workbench/Phaser integration 已完成。

Future boundary:

- Step 11A non-default runtime integration gate remains future if needed.
- Large asset library gate remains parked.
