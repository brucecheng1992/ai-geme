# Asset Pack Metadata Bridge Step 4B Implementation

完成时间：2026-06-13

## 1. Purpose

Step 4B implements the report-only helpers defined by Step 4A:

- asset pack metadata bridge summary helper.
- resolver diagnostics summary helper.
- focused contract tests.
- deterministic diagnostic code / severity / JSON shape.

Step 4B does not integrate these helpers into runtime/default behavior. It does not modify resolver decisions, QA runtime behavior, Workbench, Phaser runtime, asset pack loading, repair defaults, source metadata, production packs or large asset library.

## 2. Implementation Scope

Implemented files:

- `packages/asset-pipeline/src/asset-pack-metadata-bridge.ts`
- `packages/asset-pipeline/src/asset-pack-resolver-diagnostics.ts`
- `packages/asset-pipeline/src/index.ts`
- `tests/contracts/asset-pack-metadata-bridge.test.ts`
- `tests/contracts/asset-pack-resolver-diagnostics.test.ts`

Docs updated:

- `docs/refactor-log/asset-pack-metadata-bridge-step-4a.md`
- `docs/refactor-log/asset-pack-metadata-bridge-step-4b.md`
- `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`
- `docs/refactor-log/ai-game-dsl-p0-review-gated.md`

## 3. Asset Pack Metadata Bridge

`createAssetPackMetadataBridgeSummary` is a pure helper. It consumes:

- `RuntimeArtAssetMetadataExportArtifact`
- explicit `AssetPackBridgeCandidate[]`

It produces `AssetPackMetadataBridgeSummary`:

- `bridge_version: "0.1"`
- `ok`
- `runtime_asset_count`
- `candidate_count`
- `matched_count`
- `diagnostic_count`
- deterministic `diagnostics`

The bridge helper:

- does not read the filesystem.
- does not discover asset packs.
- does not call `resolveLocalAssetPack`.
- does not call `selectLocalAssetPack`.
- does not mutate runtime metadata.
- does not mutate candidate input.
- does not change runtime/default behavior.
- does not change resolver decisions.

Bridge diagnostic codes:

- `ASSET_PACK_METADATA_BRIDGE_DUPLICATE_RUNTIME_ASSET_ID`
- `ASSET_PACK_METADATA_BRIDGE_DUPLICATE_CANDIDATE_ASSET_ID`
- `ASSET_PACK_METADATA_BRIDGE_RUNTIME_ASSET_WITHOUT_CANDIDATE`
- `ASSET_PACK_METADATA_BRIDGE_CANDIDATE_WITHOUT_RUNTIME_ASSET`
- `ASSET_PACK_METADATA_BRIDGE_SOURCE_PATH_MISMATCH`
- `ASSET_PACK_METADATA_BRIDGE_THUMBNAIL_PATH_MISMATCH`
- `ASSET_PACK_METADATA_BRIDGE_ABSOLUTE_PATH_REJECTED`
- `ASSET_PACK_METADATA_BRIDGE_MISSING_ASSET_ID`

## 4. Resolver Diagnostics

`createAssetResolverDiagnosticsSummary` is a pure helper. It consumes:

- `RuntimeArtAssetMetadataExportArtifact`
- explicit `requestedAssetIds`
- optional explicit `context.contextId`

It produces `AssetResolverDiagnosticsSummary`:

- `diagnostics_version: "0.1"`
- `ok`
- `requested_count`
- `resolved_count`
- `diagnostic_count`
- deterministic `diagnostics`

The resolver diagnostics helper:

- does not import or call production resolver implementation.
- does not call `resolveLocalAssetPack`.
- does not call `selectLocalAssetPack`.
- does not read or copy default pack files.
- does not mutate runtime metadata.
- does not mutate requested asset input.
- does not change resolver ranking, selection, fallback or hard gate behavior.
- does not change runtime/default behavior.
- does not perform repair writeback.

Resolver diagnostic codes:

- `ASSET_RESOLVER_DIAGNOSTIC_MISSING_ASSET_ID`
- `ASSET_RESOLVER_DIAGNOSTIC_BLOCKED_CONTEXT`
- `ASSET_RESOLVER_DIAGNOSTIC_DUPLICATE_ASSET_ID`
- `ASSET_RESOLVER_DIAGNOSTIC_ABSOLUTE_PATH_REJECTED`

## 5. Unsupported Semantic Diagnostic Decision

Step 4B intentionally does not implement unsupported semantic diagnostics.

Reason:

- Step 4B input only includes runtime metadata, requested asset ids and optional explicit context.
- Inferring unsupported semantics from only requested ids or context would be misleading.
- Future unsupported semantic diagnostics must receive caller-provided expected tags, expected roles or expected semantic constraints, with focused tests proving those expectations are explicit inputs.

## 6. Determinism And Path Safety

Step 4B outputs are deterministic:

- runtime assets are processed by `asset_id`.
- candidates are processed by `asset_id`, `source_path`, `thumbnail_path`.
- requested ids are processed in sorted order.
- diagnostics are sorted by code, asset id, path/jsonPath and message.
- summaries contain no timestamps.
- helpers do not emit local absolute paths for absolute-path diagnostics.

Absolute path diagnostics are defensive artifact-level checks. They do not replace runtime export validation, and they do not weaken existing validation.

## 7. Fixture Usage

Focused tests use `tests/fixtures/art-library-small-v0.1/metadata` only as test / dry-run input through runtime-safe metadata export.

The small library fixture is not wired into:

- production/default asset packs.
- runtime/default asset loading.
- resolver implementation.
- QA runtime behavior.
- Workbench.
- Phaser runtime.

Large asset library remains parked and was not scanned or imported.

## 8. Tests

Added focused tests:

- `tests/contracts/asset-pack-metadata-bridge.test.ts`
- `tests/contracts/asset-pack-resolver-diagnostics.test.ts`

Bridge tests cover:

- matching small-library runtime metadata and explicit candidates.
- runtime metadata asset with no candidate.
- candidate with no runtime metadata.
- missing candidate `asset_id`.
- duplicate candidate `asset_id`.
- duplicate runtime `asset_id`.
- source path mismatch.
- thumbnail path mismatch.
- absolute path rejection for candidate and runtime path fields.
- deterministic repeated output.
- input non-mutation.
- locked summary shape, diagnostic code and severity.

Resolver diagnostics tests cover:

- existing requested asset id with no diagnostic.
- missing requested asset id.
- duplicate runtime asset id.
- absolute path rejection for runtime path fields.
- explicit blocked context from runtime metadata `gameplay.blocked_contexts`.
- no fabricated unsupported semantic diagnostic without explicit expected semantic input.
- deterministic repeated output.
- input non-mutation.
- locked summary shape, diagnostic code and severity.

## 9. Validation

已通过：

    npx vitest run tests/contracts/asset-pack-metadata-bridge.test.ts tests/contracts/asset-pack-resolver-diagnostics.test.ts
    # 2 个测试文件，15 个测试通过

    npm run test:contracts
    # 18 个测试文件，184 个测试通过

    npm test
    # contracts 184 个测试通过；workspace 125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    # OK 10 metadata files

    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    # ok=true，artifact.asset_count=10，diagnostics=[]

    npm run metadata:validate -- assets/metadata/examples
    # OK 5 metadata files

    npm run metadata:export-runtime -- --json assets/metadata/examples
    # ok=true，artifact.asset_count=5，diagnostics=[]

    git diff --check
    # 无输出

## 10. Review Gate

P0 review focus:

- no large asset library touch, scan or import.
- no runtime/default asset loading behavior change.
- no resolver decision change.
- no `resolveLocalAssetPack` or `selectLocalAssetPack` diagnostics call.
- no small library production/default wiring.
- no metadata or source asset mutation.
- no repair-enabled default.
- no silent unsupported promotion.
- no fabricated unsupported semantic diagnostics.
- no nondeterministic output.
- no generated artifacts committed.

P1 review focus:

- bridge and resolver diagnostic scope remains clear.
- API inputs do not imply real resolver behavior.
- diagnostics remain stable and parseable.
- outputs contain no timestamps or absolute local paths.
- tests prove report-only behavior and do not require production asset packs.

P2 review focus:

- negative tests cover missing, duplicate, path mismatch, absolute path and deterministic output.
- docs include explicit large library exclusion and runtime/default non-goals.
- plan and review log are updated.

P3 review focus:

- naming, formatting and cross-link wording.

## 11. Review Record

Oracle review:

- 首轮审查：P0/P1/P2 未发现；P3 指出 thumbnail mismatch diagnostic 的 `jsonPath` 应指向 candidate thumbnail field，而不是 runtime thumbnail field。
- 已处理：`ASSET_PACK_METADATA_BRIDGE_THUMBNAIL_PATH_MISMATCH` 现在使用 `$.candidates[index].thumbnail_path`，并由 focused test 锁定 source / thumbnail mismatch 的 candidate-side `jsonPath`。
- Oracle 复审：P0/P1/P2/P3 均无；确认上一轮 P3 已解决，Step 4B 保持 pure report-only helper / focused tests / docs 范围，可在主 agent 完成 staged diff 检查后提交。
