# Step 28 Resolver V2

当前状态：

- Step 28 Resolver V2 🚧
  - 28.1 Contract / SemanticIndex Adapter Skeleton ✅
  - 28.2 Asset Resolver Expansion ✅
  - 28.3 Scene Graph Resolver ⬜
  - 28.4 IR Integration Gate ⬜
  - 28.5 Resolver Trace / Diagnostics UI ⬜

## Step 28.1 Contract / SemanticIndex Adapter Skeleton

完成时间：2026-06-16

已完成内容：

- 新增 `packages/game-dsl/src/resolver-v2/types.ts`。
- 新增 `packages/game-dsl/src/resolver-v2/diagnostics.ts`。
- 新增 `packages/game-dsl/src/resolver-v2/reference-extractor.ts`。
- 新增 `packages/game-dsl/src/resolver-v2/resolver-v2.ts`。
- 新增 `packages/game-dsl/src/resolver-v2/index.ts`。
- 从 `packages/game-dsl/src/index.ts` 导出 Resolver V2 public API。
- 新增 `tests/contracts/resolver-v2.test.ts`。

新增 Resolver V2 类型契约：

- `ResolverV2SemanticKind`
- `ResolverV2ReferenceKind`
- `ResolverV2Reference`
- `ResolverV2DiagnosticSeverity`
- `ResolverV2DiagnosticCode`
- `ResolverV2Diagnostic`
- `ResolverV2Summary`
- `ResolverV2Result`
- `ResolverV2Request`
- `ResolverV2`
- `createResolverV2`
- `resolveSemanticDocumentV2`

新增 diagnostics：

- `INVALID_RESOLVER_DOCUMENT`
- `UNSAFE_RESOLVER_REFERENCE`
- `RESOLVER_REFERENCE_TARGET_NOT_FOUND`
- `RESOLVER_REFERENCE_KIND_MISMATCH`
- `RESOLVER_UNSUPPORTED_REFERENCE_SHAPE`

本轮 reference extraction 支持：

- `/scenes/{sceneKey}/camera/follow` -> `camera_follow_entity`
- `/scenes/{sceneKey}/entities/{entityKey}/components/sprite/asset` -> `sprite_asset`
- scene keys 和 entity keys 使用 deterministic code-unit order。
- references 按 `fieldPath` deterministic 排序。
- reference id 使用 deterministic `resolver_ref:{kind}:{index}`。

SemanticIndex adapter skeleton：

- 安全 reference 通过 `semanticIndex.resolve(reference.targetId)` 解析。
- missing target 产生 `RESOLVER_REFERENCE_TARGET_NOT_FOUND`。
- semantic id kind 或 `SemanticIndexEntry.kind` 不匹配时产生 `RESOLVER_REFERENCE_KIND_MISMATCH`。
- resolved reference 只返回 `resolvedTarget` 摘要：`id` / `kind` / `path`。
- 不返回原始 `SemanticIndexEntry` 引用，不暴露 entry `value`。

Safety / boundary：

- malformed non-object document 不抛出，返回 `INVALID_RESOLVER_DOCUMENT` error diagnostic。
- object document without `scenes` 返回 empty ok result。
- malformed `/assets` root 不抛出，产生 warning 并继续解析非 asset references。
- unsafe generated code path、workspace path、code file path 和 asset filepath 会产生 `UNSAFE_RESOLVER_REFERENCE`，并保持 reference unresolved。
- Resolver V2 不 mutation input document。
- Resolver V2 不 mutation `SemanticIndex` 或 `SemanticIndexEntry`。

阶段边界：

- 本轮未替换现有 resolver。
- 本轮未接 full asset resolver。
- 本轮未接 scene graph resolver。
- 本轮未接 IR generation。
- 本轮未接 Phaser generator。
- 本轮未接 Preview runtime。
- 本轮未跑 QA / Playwright。
- 本轮未接 pipeline gate。
- 本轮未修改 generated Phaser code。
- 本轮未写 workspace 文件或持久化 SSOT。
- 本轮未修改 Step 27 planner / validator / applier 语义。

已通过验证：

```bash
npx vitest run tests/contracts/resolver-v2.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 15 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

阶段结果：

- `reference-extractor.ts` 当前 217 行，集中 in-memory document traversal 与 reference draft extraction。
- `resolver-v2.ts` 当前 189 行，集中 SemanticIndex resolution、unsafe reference guard、diagnostic emission 与 summary。
- `types.ts` 当前 80 行，集中 Resolver V2 public contract。
- `diagnostics.ts` 当前 35 行，集中 diagnostic object creation。
- `resolver-v2.test.ts` 当前 428 行，覆盖 15 个 Resolver V2 contract tests。

审查门禁：

- P0: 无
- P1: 无
- P2:
  - Oracle 指出 `packages/game-dsl/src/index.ts` 当前 diff 同时包含 Step 27 未提交 public exports 和本轮 Resolver V2 root export，checkpoint commit 时需明确归属，避免把 Step 27 exports 误归到 Step 28.1。
  - 本轮处理：文档明确 Step 28.1 只新增 `export * from './resolver-v2/index.js';`；其余 trace / diff / false-playable / QA-loop exports 属于 Step 27 已完成但未提交的工作树基线，不在本轮新增范围。
- P3:
  - Oracle 建议 28.2 前可考虑区分 invalid semantic id 与真正 unsafe path，目前本轮仍按 28.1 prompt 将非 semantic target id 统一收敛为 `UNSAFE_RESOLVER_REFERENCE`。
- Oracle 结论：未发现 Resolver V2 mutation、entry reference leak、IR / Phaser / runtime / QA / pipeline / file I/O / generated-code 越界，blocking findings closed。
- Oracle 复审结论：P0 / P1 / P2 无 blocking issue；P2 仅保留后续 Step 28.1 独立 commit 时需注意 partial staging 或已提交 Step 27 基线的提交卫生提醒；P3 保持为 28.2 前可评估的非阻塞建议。

下一步建议：

- Step 28.2 Asset Resolver Expansion

## Step 28.2 Asset Resolver Expansion

完成时间：2026-06-16

已完成内容：

- 新增 `packages/game-dsl/src/resolver-v2/asset-catalog.ts`，从 in-memory SSOT-like `/assets` 提取 deterministic asset catalog。
- 新增 `packages/game-dsl/src/resolver-v2/asset-reference-rules.ts`，集中 sprite / audio / font expected asset kinds、reference target 分类和 unsafe source 判断。
- 新增 `packages/game-dsl/src/resolver-v2/reference-extractor-shared.ts`，集中 Resolver V2 extraction helper、deterministic key sort 与 reference shape diagnostics。
- 更新 `packages/game-dsl/src/resolver-v2/reference-extractor.ts`，扩展 scene/entity component asset reference extraction。
- 更新 `packages/game-dsl/src/resolver-v2/resolver-v2.ts`，在 SemanticIndex target resolution 后检查 asset definition existence、duplicate id、unsafe source 和 asset type compatibility。
- 更新 `packages/game-dsl/src/resolver-v2/types.ts` / `diagnostics.ts` / `index.ts`，导出 asset catalog contract、`resolvedAsset` snapshot 和新增 diagnostics。
- 更新 `tests/contracts/resolver-v2.test.ts`，新增 Step 28.2 contract tests。

新增 asset catalog 支持：

- flat `/assets/{assetKey}` asset definitions。
- grouped `/assets/{groupKey}/{assetKey}` asset definitions。
- Step 27.7 `fallbacks` / `generated_shape` fallback asset definitions。
- `ResolverV2AssetKind`：`image` / `sprite` / `audio` / `font` / `atlas` / `tilemap` / `tileset` / `generated_shape` / `unknown`。
- `ResolverV2AssetSourceKind`：`file` / `generated` / `inline` / `unknown`。
- ordinary asset source path, such as `./assets/player.png`, is kept as metadata-only `sourcePreview` and is not read.
- unsafe generated/workspace/code source path produces `RESOLVER_ASSET_SOURCE_UNSAFE`.
- duplicate asset id produces `RESOLVER_DUPLICATE_ASSET_ID`.

新增 reference extraction 支持：

- `/scenes/{sceneKey}/entities/{entityKey}/components/audio/asset` -> `audio_asset`
- `/scenes/{sceneKey}/entities/{entityKey}/components/sound/asset` -> `audio_asset`
- `/scenes/{sceneKey}/entities/{entityKey}/components/text/fontAsset` -> `font_asset`
- `/scenes/{sceneKey}/entities/{entityKey}/components/text/font/asset` -> `font_asset`

SemanticIndex adapter behavior：

- 新增 reference kind 仍统一通过 `SemanticIndex.resolve(reference.targetId)` 解析。
- sprite references expect `image` / `sprite` / `generated_shape` / `atlas` asset definitions。
- audio references expect `audio` asset definitions。
- font references expect `font` asset definitions。
- missing target、kind mismatch、missing asset definition、asset type mismatch、duplicate asset id、unsafe filepath / generated path 都产生 diagnostics。
- `INVALID_RESOLVER_SEMANTIC_ID` 与 `UNSAFE_RESOLVER_REFERENCE` 已区分：`player_sprite` 是 invalid semantic id；`./assets/player.png` 是 unsafe reference target。
- unsafe reference target 在 Resolver V2 边界层短路，不调用 `SemanticIndex.resolve()`。
- `resolvedTarget` 仍只返回 `id` / `kind` / `path` snapshot，不返回原始 `SemanticIndexEntry`。
- `resolvedAsset` 只返回 `id` / `kind` / `path` / `sourceKind` snapshot，不返回原始 asset definition object。

Safety / boundary：

- asset source path 仍作为 asset definition data，不在本轮解析。
- `./assets/*.png`、workspace path、generated code path 作为 reference target 时仍产生 `UNSAFE_RESOLVER_REFERENCE`。
- Resolver V2 仍不 mutation input document、`SemanticIndex` 或 `SemanticIndexEntry`。
- malformed `/assets` root 会产生 warning，不阻断 camera follow 等非 asset reference 解析。
- 本轮未发现、读取、写入或导入真实 asset files。
- 本轮未接 asset pack discovery / metadata bridge / asset pipeline。
- 本轮未接 IR generation、Phaser generator、Preview runtime、QA / Playwright 或 Workbench UI。
- 本轮未修改 generated Phaser code。

TDD 记录：

- RED：`npx vitest run tests/contracts/resolver-v2.test.ts` 失败 11 tests，原因是 asset catalog API、`resolvedAsset`、asset definition existence/type/source/duplicate diagnostics 和 invalid-id classification 尚未实现。
- GREEN：新增 asset catalog、reference rules 和 resolver asset checks 后，`tests/contracts/resolver-v2.test.ts` 30 tests passed。

已通过验证：

```bash
npx vitest run tests/contracts/resolver-v2.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 30 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

阶段结果：

- `asset-catalog.ts` 当前 308 行，集中 asset catalog extraction、kind/source inference、source safety diagnostics 和 duplicate id diagnostics。
- `asset-reference-rules.ts` 当前 50 行，集中 target/source safety rules 和 expected asset kind sets。
- `reference-extractor.ts` 当前 221 行，集中 document-level extraction orchestration 和 scene/entity component references。
- `reference-extractor-shared.ts` 当前 70 行，集中 shared extraction helpers。
- `asset-reference-extractor.ts` 当前 8 行，是私有 rules re-export wrapper，不包含 extraction 逻辑。
- `resolver-v2.ts` 未接文件系统、runtime、IR、Phaser 或 pipeline。

审查门禁：

- Oracle 首审：
  - P0: 无。
  - P1: 合法 semantic id 名称如 `asset:generated` 会被 unsafe path segment 规则误判为 `UNSAFE_RESOLVER_REFERENCE`。
  - P2: `expectedAssetKinds` 复用可变数组常量，consumer mutation 可能污染后续 resolver rules。
  - P2: asset source safety 对 `./assets/generated/player.png` 这类普通 metadata path 偏保守；本轮保持 conservative generated segment guard，不作为 blocking。
  - P3: `asset-reference-extractor.ts` 只是 rules re-export wrapper，命名可能误导；本轮因“不删除文件”约束保留为私有 wrapper。
- 已修复：
  - `classifyResolverV2ReferenceTarget()` 改为 semantic-id-first，合法 semantic id 不再被 path segment guard 拦截。
  - `expectedAssetKinds` 写入 reference / diagnostic 时复制数组，避免 consumer mutation 污染规则常量。
  - 新增回归测试覆盖 `asset:generated` 正常解析，以及 `expectedAssetKinds` snapshot 不污染下一次 resolve。
  - 更新版 28.2 复核补充 `./assets/player.png` unsafe reference target 不调用 `SemanticIndex.resolve()` 的 contract test。
  - 更新版 28.2 复核补充 malformed `/assets` root warning 且继续解析 non-asset reference 的 contract test。
- Oracle 复审：
  - P0: 无。
  - P1: 无，上一轮 P1 已关闭。
  - P2: `expectedAssetKinds` consumer mutation 风险已关闭。
  - 保留项：conservative generated segment source guard 和私有 `asset-reference-extractor.ts` wrapper 均为非阻塞记录。
  - 结论：blocking findings closed。

下一步建议：

- Step 28.3 Scene Graph Resolver
