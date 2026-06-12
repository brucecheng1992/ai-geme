# AI Game Art Asset Metadata v0.1 Step 3 Runtime-Safe Export

完成时间：2026-06-12

## 1. 本步目标

Step 3 的目标是把已经通过 Step 2 validation 的完整 `.asset.json` sidecar metadata，转换成面向未来 runtime / tool consumers 的 runtime-safe JSON artifact。

Step 3A 只记录 review gate 和实现边界，不实现 runtime-safe export code。Step 3B 才允许实现 export 逻辑。

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

Step 3B 的输出应是 deterministic runtime-safe JSON artifact。

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

可能的未来 artifact 名称示例：

- `dist/metadata/runtime-art-assets.json`
- `dist/metadata/runtime-art-assets.generated.json`

这些名字只是 Step 3B implementation review 的候选示例，不是 Step 3A 已经要求或实现的输出路径。

## 4. Runtime-Safe Field Policy

Step 3B 必须使用 explicit allowlist。

原则：

- Runtime export 必须定义 dedicated runtime metadata shape。
- Full metadata schema 不得被当成 runtime schema。
- Export 只能复制明确允许 runtime 使用的字段。
- Export 不得采用 broad “delete a few unsafe fields and keep the rest” strategy。

候选 runtime-safe 字段包括：

- `runtime_metadata_version`
- `asset_id`
- `asset_type`
- `title`
- `description`
- `semantic_tags`
- `visual_style`
- `world`
- `gameplay_role`
- `affordances`
- `allowed_contexts`
- `blocked_contexts`
- `file_format`
- `source_path`
- `thumbnail_path`
- `status`
- `version`
- limited technical data only if explicitly safe
- limited relations only if explicitly safe

以上只是 Step 3B implementation review 的候选字段清单，不代表 runtime-safe export 已经实现，也不代表这些字段已被最终批准。

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

## 8. Step 3B CLI Expectations

以下命令是 Step 3B 的候选 CLI expectations，Step 3A 不实现它们。

Candidate commands：

    npm run metadata:export-runtime -- assets/metadata/examples
    npm run metadata:export-runtime -- --dir assets/metadata/examples --out dist/metadata/runtime-art-assets.json
    npm run metadata:export-runtime -- --file assets/metadata/examples/example.asset.json --out dist/metadata/example.runtime.json
    npm run metadata:export-runtime -- --json assets/metadata/examples

Expected future exit codes：

| Code | Meaning |
| --- | --- |
| 0 | export success |
| 1 | validation / export errors |
| 2 | usage / input / internal error |

## 9. Step 3B Diagnostics Expectations

以下是 Step 3B 的候选 diagnostic codes，Step 3A 不实现它们。

- `metadata.runtime_export.validation_failed`
- `metadata.runtime_export.unsafe_field_detected`
- `metadata.runtime_export.output_write_failed`
- `metadata.runtime_export.duplicate_asset_id`
- `metadata.runtime_export.empty_input`
- `metadata.runtime_export.absolute_path_rejected`

Step 3 diagnostics must remain separate from resolver diagnostics.

## 10. Expected Future Implementation Files

Step 3B 预计使用 dedicated export files：

- `packages/asset-pipeline/src/art-asset-metadata.runtime-export.ts`
- `packages/asset-pipeline/src/art-asset-metadata.runtime-export.cli.ts`
- `tests/contracts/art-asset-metadata-runtime-export.test.ts`

Step 3A 不创建这些 code files，也不创建 empty documentation stubs。

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

- Metadata v0.1 Step 3B：runtime-safe export implementation，必须先复用 Step 2 validation，再实现 explicit allowlist export。
