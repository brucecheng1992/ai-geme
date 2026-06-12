# AI Game Art Asset Metadata v0.1 Step 3 Runtime-Safe Export

创建时间：2026-06-12
Step 3B 更新时间：2026-06-13

## 1. 本步目标

Step 3 的目标是把已经通过 Step 2 validation 的完整 `.asset.json` sidecar metadata，转换成面向未来 runtime / tool consumers 的 runtime-safe JSON artifact。

Step 3A 只记录 review gate 和实现边界，不实现 runtime-safe export code。Step 3B 已实现 runtime-safe export 逻辑，但仍不把 artifact 接入任何 runtime consumer。

关键边界：

- Step 3 是 runtime-safe metadata export only。
- Step 3 必须复用 Step 2 validation。
- Step 3 产物面向未来 runtime 或工具消费方，但 Step 3 本身不把 artifact 接入任何 consumer。
- Step 3 不改变现有 runtime 行为。
- Step 3 不继续扩大 Step 2 validator implementation；export logic 必须放在 dedicated export files。

## 2. 输入

Step 3B 的输入必须是一个或多个 `.asset.json` sidecar manifests。

输入规则：

- manifests 必须先通过 Step 2 validation。
- duplicate `asset_id` 必须导致 export 失败。
- malformed JSON 必须在 export 前失败。
- invalid schema 必须在 export 前失败。
- validation 返回 errors 时，不得写入 successful runtime artifact。
- export command 不得 silent coerce invalid metadata into valid runtime metadata。

## 3. 输出

Step 3B 的输出是 deterministic runtime-safe JSON artifact。

输出规则：

- JSON output 必须 deterministic。
- file discovery order 必须稳定。
- asset ordering 必须稳定。
- object key order 在可控范围内应稳定。
- diagnostics order 必须稳定。
- 对相同输入重复运行应产生可重复 JSON output。
- output artifact 不得包含 local absolute paths。
- output artifact 不得包含 internal-only fields。
- output artifact 不得包含 raw AI generation details。
- output artifact 不得包含 review notes。
- output artifact 不得包含 legal / copyright notes。
- output artifact 不得包含 private provenance details。

可能的 artifact 输出路径示例：

- `dist/metadata/runtime-art-assets.json`
- `dist/metadata/runtime-art-assets.generated.json`

这些名字只是命令调用方可选择的输出位置；Step 3B 不把生成 artifact 提交进仓库，也不把 artifact 接入 resolver、QA、Workbench、Phaser 或 asset pack loading。

## 4. Runtime-Safe Field Policy

Step 3B 必须使用 explicit allowlist。

原则：

- Runtime export 必须定义 dedicated runtime metadata shape。
- Full metadata schema 不得被当成 runtime schema。
- Export 只能复制明确允许 runtime 使用的字段。
- Export 不得采用 broad “delete a few unsafe fields and keep the rest” strategy。

Step 3B 固定 runtime artifact envelope：

- `runtime_metadata_version`
- `generated_by`
- `asset_count`
- `assets`

Step 3B 固定 runtime asset root allowlist：

- `runtime_metadata_version`
- `asset_id`
- `asset_type`
- `title`
- `description`
- `status`
- `version`

Step 3B 保留当前 schema 的安全分组，而不是把 `semantic` / `gameplay` / `technical` 扁平化：

- `semantic.tags`，由 full metadata 的 `semantic.semantic_tags` 映射。
- `semantic.visual_style`
- `semantic.world`
- `semantic.mood`
- `gameplay.role`，由 full metadata 的 `gameplay.gameplay_role` 映射。
- `gameplay.affordances`
- `gameplay.allowed_contexts`
- `gameplay.blocked_contexts`
- `technical.file_format`
- `technical.source_path`
- `technical.thumbnail_path`
- `technical.texture_resolution`
- `technical.polycount_lod0`
- `technical.platform_budget`
- `relations.variant_of`
- `relations.compatible_with`

Step 3B 不导出 full `ai_generation`、full `rights`、full `workflow`、full `technical`、full `relations` 或 `search`。

## 5. Must-Exclude Fields

Runtime export 至少必须排除以下字段类别。

AI generation / provenance sensitive fields：

- full prompt
- negative prompt
- seed
- raw generation parameters
- model / provider internals that are not needed by runtime
- reference image paths
- control references
- source image references
- prompt writer identity if internal-only

Rights / legal / review fields：

- third-party source notes
- copyright notes
- legal review notes
- training-use notes
- internal commercial-use reasoning
- unresolved rights risk notes

Workflow / private production fields：

- review notes
- artist notes
- internal status notes
- reviewer identity
- owner identity if internal-only
- private local paths
- absolute machine-specific paths

Creator / credit fields must not be exported by default unless a future public credits artifact is explicitly defined.

## 6. Validation Dependency

Step 3B export 必须依赖 Step 2 validation。

Required rules：

- Invalid metadata must not be exported。
- Duplicate `asset_id` must fail export。
- If validation returns errors, export must not write a successful runtime artifact。
- Export command must not silently coerce invalid metadata into valid runtime metadata。
- Export diagnostics must remain distinct from resolver diagnostics。

## 7. Determinism

Step 3B output 必须 deterministic：

- stable file discovery order
- stable asset ordering
- stable object key order where practical
- stable diagnostics order
- repeatable JSON output for the same inputs

Determinism is part of the CI contract. Any future implementation should include tests proving stable JSON output.

## 8. Step 3B CLI

Step 3B 已新增 root-level CLI wrapper，保持 Step 2 script convention：

- `scripts/export-art-runtime-metadata.ts`
- `npm run metadata:export-runtime`

支持命令：

    npm run metadata:export-runtime -- assets/metadata/examples
    npm run metadata:export-runtime -- --dir assets/metadata/examples --out dist/metadata/runtime-art-assets.json
    npm run metadata:export-runtime -- --file assets/metadata/examples/example.asset.json --out dist/metadata/example.runtime.json
    npm run metadata:export-runtime -- --json assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples --out dist/metadata/runtime-art-assets.json
    npm run metadata:export-runtime -- --check-paths assets/metadata/examples

Exit codes：

| Code | Meaning |
| --- | --- |
| 0 | export success |
| 1 | validation / export errors |
| 2 | usage / input / internal error |

Stdout / stderr：

- 无 `--json` 且无 `--out` 成功时，stdout 只输出 runtime artifact JSON。
- 无 `--json` 且有 `--out` 成功时，stdout 只输出短 human-readable success message。
- 失败且无 `--json` 时，stderr 输出 diagnostics。
- `--json` 优先；无论是否 `--out`，stdout 只输出 deterministic JSON result envelope。

## 9. Step 3B Diagnostics

Step 3B 使用与 Step 2 一致的 uppercase diagnostic code style。Step 3A 中曾记录的 dotted candidate codes 已 superseded。

- `ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED`
- `ART_ASSET_METADATA_RUNTIME_EXPORT_UNSAFE_FIELD_DETECTED`
- `ART_ASSET_METADATA_RUNTIME_EXPORT_OUTPUT_WRITE_FAILED`
- `ART_ASSET_METADATA_RUNTIME_EXPORT_DUPLICATE_ASSET_ID`
- `ART_ASSET_METADATA_RUNTIME_EXPORT_EMPTY_INPUT`
- `ART_ASSET_METADATA_RUNTIME_EXPORT_ABSOLUTE_PATH_REJECTED`
- `ART_ASSET_METADATA_RUNTIME_EXPORT_USAGE_ERROR`

Step 3 diagnostics must remain separate from resolver diagnostics.

## 10. Implementation Files

Step 3B 使用 dedicated export API 和 root script wrapper：

- `packages/asset-pipeline/src/art-asset-metadata.runtime-export.ts`
- `scripts/export-art-runtime-metadata.ts`
- `tests/contracts/art-asset-metadata-runtime-export-api.test.ts`
- `tests/contracts/art-asset-metadata-runtime-export-cli.test.ts`

Step 3B 只通过 `packages/asset-pipeline/src/index.ts` 暴露 runtime export API；未把 export logic 写入 Step 2 validator implementation。

## 11. Step 3 Review Gate

P0：

- runtime export includes internal-only AI prompt, negative prompt, seed, reference image path, review notes, copyright notes, legal notes, or raw provenance details
- runtime export bypasses Step 2 validation
- invalid metadata can be exported successfully
- duplicate `asset_id` produces a successful export
- export command modifies runtime, resolver, QA, Workbench, Phaser, or asset pack loading behavior
- runtime export starts consuming or changing existing asset pack behavior
- runtime export uses the full metadata schema as the runtime schema without an explicit runtime-safe allowlist

P1：

- runtime schema is implicit instead of allowlisted
- output JSON is nondeterministic
- output artifact contains absolute local paths
- export logic is mixed into the Step 2 validation implementation
- CLI exits 0 when export diagnostics contain errors
- export writes partial success artifacts after validation failure
- exported field list is not documented

P2：

- tests only cover happy path
- docs imply runtime integration is complete
- no test proves sensitive fields are excluded
- no test proves validation failure blocks export

P3：

- minor wording / formatting / naming cleanups

## 12. Step 3A 阶段结果

本步只写文档：

- 新增本文档，固定 Step 3 runtime-safe export 的目标、输入、输出、allowlist policy、must-exclude fields、validation dependency、determinism、future CLI / diagnostics expectations 和 P0/P1/P2/P3 review gate。
- 未创建 `art-asset-metadata.runtime-export.ts`。
- 未创建 `art-asset-metadata.runtime-export.cli.ts`。
- 未创建 `art-asset-metadata-runtime-export.test.ts`。
- 未修改 runtime、resolver、QA、Workbench、Phaser、asset pack loading 或 Step 2 validator implementation。

当前下一步：

- Metadata v0.1 Step 3B：runtime-safe export implementation。

## 13. Step 3B 阶段结果

本步已实现 runtime-safe metadata export：

- 新增 `packages/asset-pipeline/src/art-asset-metadata.runtime-export.ts`，复用 Step 2 validation gate，成功后再按 explicit allowlist 构造 deterministic runtime artifact。
- 新增 `scripts/export-art-runtime-metadata.ts`，按 Step 2 root script convention 提供 `npm run metadata:export-runtime`。
- 新增 API / CLI contract tests，分别覆盖 runtime artifact shape、privacy exclusion、determinism、validation failure、duplicate `asset_id`、absolute path rejection、`--out` 成功写入和失败不覆盖、stdout / stderr、`--json + --out`。
- Runtime artifact 使用 grouped `semantic` / `gameplay` / `technical` / `relations` shape。
- Runtime export diagnostic codes 使用 Step 2 uppercase convention。

明确未实现：

- 未接 resolver。
- 未接 QA。
- 未接 Workbench。
- 未接 Phaser runtime。
- 未接 asset pack loading。
- 未实现 runtime loader。
- 未实现 Step 4 asset pack metadata bridge / resolver diagnostics。
- 未新增 Unity / Unreal / glTF / USD / C2PA / credits / UI 能力。

当前下一步：

- Metadata v0.1 Step 4：asset pack metadata bridge / resolver diagnostics，仍必须作为未来独立步骤推进。
