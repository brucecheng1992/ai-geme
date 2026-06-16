# Step 28 Resolver V2

当前状态：

- Step 28 Resolver V2 ✅
  - 28.1 Contract / SemanticIndex Adapter Skeleton ✅
  - 28.2 Asset Resolver Expansion ✅
  - 28.3 Scene Graph Resolver ✅
  - 28.4 IR Integration Gate ✅
  - 28.5 Resolver Trace / Diagnostics UI ✅

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

## Step 28.3 Scene Graph Resolver

完成时间：2026-06-16

已完成内容：

- 新增 `packages/game-dsl/src/resolver-v2/scene-graph.ts`，从 in-memory SSOT-like `/scenes` 提取 deterministic scene graph。
- 新增 `packages/game-dsl/src/resolver-v2/scene-graph-rules.ts`，集中 scene bounds、transform、visibility、parent、camera follow、spawn target 的边界读取和 validation。
- 更新 `packages/game-dsl/src/resolver-v2/types.ts`，新增 scene graph node / edge / transform / result 类型，并扩展 diagnostics code 与 summary counts。
- 更新 `packages/game-dsl/src/resolver-v2/resolver-v2.ts`，在 Resolver V2 主流程中合并 scene graph diagnostics，并在有 graph content 时返回 `sceneGraph` summary snapshot。
- 更新 `packages/game-dsl/src/resolver-v2/index.ts`，导出新增 scene graph API 和类型。
- 更新 `tests/contracts/resolver-v2.test.ts`，新增 Resolver V2 scene graph resolver contract tests。

新增 scene graph extraction 支持：

- scene node：`scene_node:<sceneSemanticId>`。
- entity node：`entity_node:<sceneKey>:<entitySemanticId>`。
- camera node：`camera_node:<sceneKey>:<cameraSemanticId>`。
- spawn node：`spawn_node:<sceneKey>:<spawnKey>`。
- scene / entity / camera / spawn node 都只返回 path、semanticId、transform、visible 和 metadata summary，不返回原 scene/entity/camera/spawn object 引用。
- nodes 按 `path` / `id` deterministic 排序。
- edges 按 `kind` / `path` / `from` / `to` deterministic 排序，edge id 使用 `scene_edge:<kind>:<index>`。

新增 scene graph edges：

- `scene_contains_entity`
- `scene_has_camera`
- `camera_follows_entity`
- `scene_has_spawn`
- `entity_parent`
- `entity_child`

新增 validation / diagnostics：

- duplicate entity id：`RESOLVER_DUPLICATE_ENTITY_ID`
- missing parent：`RESOLVER_ENTITY_PARENT_NOT_FOUND`
- parent cycle：`RESOLVER_ENTITY_PARENT_CYCLE`
- invalid transform：`RESOLVER_INVALID_TRANSFORM`
- camera follow missing target：`RESOLVER_CAMERA_TARGET_NOT_FOUND`
- spawn target missing：`RESOLVER_SPAWN_TARGET_NOT_FOUND`
- spawn out-of-bounds：`RESOLVER_SPAWN_OUT_OF_BOUNDS`
- invalid scene bounds：`RESOLVER_SCENE_BOUNDS_INVALID`
- invalid fallback scene/entity/camera semantic id：`INVALID_RESOLVER_SEMANTIC_ID`
- malformed shapes continue to produce bounded warning/error diagnostics and do not throw.

Scene graph behavior:

- `document.scenes` absent returns empty graph with no diagnostics.
- malformed `document.scenes` produces `RESOLVER_REFERENCE_EXTRACTION_FAILED` warning.
- scene bounds support `scene.world.width/height`、`scene.bounds.width/height`、`scene.width/height`。
- entity transform supports `entity.components.transform` first, then `entity.transform`。
- entity visible supports `components.renderable.visible` first, then `renderable.visible`, then `visible`。
- parent reference supports `entity.parent`、`entity.parentId`、`entity.components.hierarchy.parent`。
- camera follow supports `scene.camera.follow` and produces graph edge only when target entity exists in the same scene lookup。
- spawn supports `scene.spawn.<key>` and `scene.spawns.<key>`，including explicit `entityId` and inferred `entity:<spawnKey>` / `entity:player` lookup。
- invalid fallback entity ids are retained as graph audit nodes but are not registered into the resolvable entity lookup, so parent/camera/spawn resolution cannot silently target invalid semantic ids。

Safety / boundary：

- Resolver V2 scene graph extraction does not mutate input document, scene objects, entity objects, camera objects or spawn objects。
- Resolver V2 scene graph extraction does not mutate `SemanticIndex` or `SemanticIndexEntry`。
- Returned scene graph nodes / edges are snapshots and do not expose original object references。
- No file system reads/writes are introduced。
- No IR generation is introduced。
- No Phaser generator integration is introduced。
- No Preview runtime integration is introduced。
- No QA / Playwright / pipeline gate integration is introduced。
- No Workbench UI integration is introduced。
- No generated Phaser code is modified。
- Step 27 planner / validator / applier semantics are not modified。

TDD 记录：

- 初始 RED：`npx vitest run tests/contracts/resolver-v2.test.ts` 失败 13 tests，原因是 `sceneGraph`、summary counts、scene graph diagnostics 尚未实现；既有 32 tests passed。
- 初始 GREEN：新增 scene graph extractor、types、exports 和 resolver integration 后，`tests/contracts/resolver-v2.test.ts` 45 tests passed。
- Oracle P2 RED：新增 malformed fallback id 与 direct extractor wrong-kind camera target tests，失败 2 tests。
- Oracle P2 GREEN：fallback semantic id validation 和 camera follow wrong-kind diagnostics 修复后，`tests/contracts/resolver-v2.test.ts` 47 tests passed。
- Oracle P0 RED：新增 invalid fallback entity id + inferred spawn target test，失败 1 test。
- Oracle P0 GREEN：invalid entity ids 排除出 resolvable lookup，inferred spawn target 也走 semantic target validation 后，`tests/contracts/resolver-v2.test.ts` 48 tests passed。

已通过验证：

```bash
npx vitest run tests/contracts/resolver-v2.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 48 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

阶段结果：

- `scene-graph.ts` 当前 722 行，集中 scene graph traversal、node/edge assembly、relationship connection、cycle detection 和 deterministic ordering。
- `scene-graph-rules.ts` 当前 373 行，集中 scene graph boundary reads and validation rules。
- `resolver-v2.ts` 当前 349 行，主流程只接入 scene graph extraction result、diagnostics merge 和 summary counts。
- `resolver-v2.test.ts` 当前 1665 行，覆盖 48 个 Resolver V2 contract tests。
- 未新增 runtime / QA / Phaser generator / generated-code / pipeline 文件。

审查门禁：

- Oracle 首审：
  - P0: 无。
  - P1: 无确认问题。
  - P2: fallback `scene:${key}` / `entity:${key}` / `camera:${key}` 未校验 key 是否符合 semantic id 规则。
  - P3: scene graph test helper 使用手写镜像类型，存在 public type drift 风险。
- 已修复：
  - `readSemanticIdForKind()` 对 explicit id 和 fallback id 都做 semantic id validation。
  - direct `extractResolverV2SceneGraph()` 对 camera follow wrong-kind target 产生 scene graph diagnostic。
  - tests 改用 public `ResolverV2SceneGraphNode` / `ResolverV2SceneGraphEdge` 类型。
- Oracle 复审：
  - P0: 发现 invalid fallback entity id 仍可能进入 `sceneEntities` lookup，并让 inferred spawn target 静默命中。
  - P1/P2/P3: 无新增确认问题。
- 已修复：
  - invalid entity semantic ids 不再注册进 resolvable entity lookup。
  - inferred spawn target 也先经过 semantic target validation。
  - 新增 regression test 覆盖 malformed entity fallback + inferred spawn target。
- Oracle 终审：
  - P0: 无，上一轮 P0 已关闭。
  - P1: 无。
  - P2: 无。
  - P3: 无。
  - 结论：blocking findings closed。

下一步建议：

- Step 28.4 IR Integration Gate

## Step 28.4 IR Integration Gate

完成时间：2026-06-16

已完成内容：

- 新增 `packages/game-dsl/src/resolver-v2/ir-integration-gate.ts`，提供 `evaluateResolverV2IrIntegrationGate()` 和 `createResolverV2IrIntegrationGate()`。
- 新增 `packages/game-dsl/src/resolver-v2/ir-gate-policy.ts`，集中默认 gate policy、policy merge 和 diagnostic blocker 分类。
- 新增 `packages/game-dsl/src/resolver-v2/ir-gate-blockers.ts`，集中 blockers / warnings 生成和 deterministic ordering。
- 新增 `packages/game-dsl/src/resolver-v2/ir-gate-summaries.ts`，集中 safe IR handoff summary 构建。
- 更新 `packages/game-dsl/src/resolver-v2/types.ts`，新增 IR gate status、policy、blocker、warning、summary、request、result 和 factory contract 类型。
- 更新 `packages/game-dsl/src/resolver-v2/index.ts`，导出新增 gate API 和类型。
- 更新 `tests/contracts/resolver-v2.test.ts`，新增 Resolver V2 IR integration gate contract tests。

新增 IR gate 行为：

- 有 `resolverResult` 时直接使用预计算结果，不重新运行 resolver。
- 无 `resolverResult` 时要求同时提供 `document` 和 `semanticIndex`，并默认使用 `createResolverV2()`。
- 缺输入不抛出，返回 blocked gate result，并产生 `RESOLVER_V2_GATE_MISSING_INPUT` blocker。
- resolver 执行异常不抛出到 gate 外层，返回 blocked gate result，并产生 `RESOLVER_V2_GATE_EXCEPTION` blocker。
- diagnostic error 会阻断 IR handoff。
- asset diagnostics 默认映射为 `RESOLVER_V2_ASSET_ERROR`。
- scene graph diagnostics 默认映射为 `RESOLVER_V2_SCENE_GRAPH_ERROR`。
- unresolved references 默认映射为 `RESOLVER_V2_UNRESOLVED_REFERENCE`。
- warning 默认进入 `warnings`，`policy.blockOnWarnings: true` 时转为 blocker。
- 默认要求 resolver result 带 scene graph。
- 默认要求 scene graph 至少包含一个 scene。
- 默认不要求 scene graph 至少包含一个 entity；`policy.requireAtLeastOneEntity: true` 时才阻断。
- gate `ok` 只在 `status === "ready"` 且 blockers 为空时为 `true`。

新增 safe handoff summary：

- `references` 只包含 id、kind、status、sourcePath、fieldPath、targetId、resolvedTargetId、resolvedAssetId。
- `diagnostics` 不包含 `cause`、stack 或原始错误对象。
- `assets` 只包含 id、key、path、kind、sourceKind，不包含 raw source、sourcePreview 或原 asset definition object。
- `sceneGraph` 只包含 node / edge summary，不包含原 scene/entity/camera/spawn object。
- blockers、warnings、references、diagnostics、assets、sceneGraph nodes / edges 均 deterministic ordering。

Safety / boundary：

- IR gate 不生成 IR。
- IR gate 不调用 Phaser generator。
- IR gate 不调用 Preview runtime。
- IR gate 不调用 QA / Playwright。
- IR gate 不调用 pipeline gate。
- IR gate 不读写文件系统。
- IR gate 不 mutation input document、`SemanticIndex`、`resolverResult`、diagnostics、references、assets 或 sceneGraph。
- IR gate 不修改 generated Phaser code。
- IR gate 不修改 Workbench UI。
- Step 27 planner / validator / applier semantics are not modified。

TDD 记录：

- RED：`npx vitest run tests/contracts/resolver-v2.test.ts` 失败 16 tests，原因是 IR gate API 尚未实现；既有 48 tests passed。
- GREEN：新增 gate policy、blockers、summary、API exports 和 contract tests 后，`tests/contracts/resolver-v2.test.ts` 64 tests passed。
- 拆分复核：`ir-integration-gate.ts` 从 269 行拆分到 125 行，blocker / summary / policy 分别独立成小文件；`tests/contracts/resolver-v2.test.ts` 仍 64 tests passed。
- Oracle P2 GREEN：补充 resolver throw contract test，确认 gate 返回 `RESOLVER_V2_GATE_EXCEPTION` blocker，且 summary / blockers 不泄漏 exception marker、cause 或 stack；`tests/contracts/resolver-v2.test.ts` 65 tests passed。

已通过验证：

```bash
npx vitest run tests/contracts/resolver-v2.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 65 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

阶段结果：

- `ir-integration-gate.ts` 当前 125 行，集中 gate request resolution、policy merge 和 result assembly。
- `ir-gate-blockers.ts` 当前 150 行，集中 blockers / warnings 和 ordering。
- `ir-gate-policy.ts` 当前 69 行，集中默认策略和 diagnostic category classification。
- `ir-gate-summaries.ts` 当前 153 行，集中 safe summary snapshot construction。
- `types.ts` 当前 329 行，新增 IR gate public contract。
- `resolver-v2.test.ts` 当前覆盖 65 个 Resolver V2 contract tests。
- 未新增 runtime / QA / Phaser generator / generated-code / pipeline 文件。

审查门禁：

- Oracle 首审：
  - P0: 无。
  - P1: Oracle 认为 scene-only graph 默认放行不符合 “empty scene” blocker。
  - P2: resolver throw 分支缺 contract test。
  - P2: `RESOLVER_V2_EMPTY_SCENE_GRAPH` public literal 当前未 emit，empty graph 实现使用 `RESOLVER_V2_MISSING_SCENE`。
  - P3: `blockOnAssetDiagnostics` / `blockOnSceneGraphDiagnostics` 命名可能让人误以为是放行开关。
- 本轮处理：
  - P1 不采纳为 blocking：Step 28.4 prompt 明确默认 `requireAtLeastOneEntity: false`，并要求 “scene but no entities: default not blocked solely, policy blocks”；因此 scene-only graph 默认 ready、显式 `requireAtLeastOneEntity: true` 才 blocked 是本轮契约。
  - P2 已修复：新增 resolver throw contract test，确认异常不抛出、不泄漏 cause / stack。
  - P2 保留为非阻塞记录：`RESOLVER_V2_EMPTY_SCENE_GRAPH` 是 prompt 指定 public blocker literal；本轮规则明确 empty sceneGraph 使用 `RESOLVER_V2_MISSING_SCENE` 阻断，暂不删除 public literal。
  - P3 保留为后续命名澄清建议：字段名来自 prompt，本轮不改 public contract。
- Oracle 复审：
  - P0: 无。
  - P1: 无；补充 prompt 背景后，scene-only graph 默认 ready 属于目标契约。
  - P2: 无 blocking；resolver throw contract test 覆盖不抛出、blocked、`RESOLVER_V2_GATE_EXCEPTION` 和异常 marker / cause / stack 不泄漏。
  - P3: 无必须处理项。
  - 结论：当前未发现 P0 / P1 / P2 blocking issue。

下一步建议：

- Step 28.5 Resolver Trace / Diagnostics UI

## Step 28.5 Resolver Trace / Diagnostics UI

完成时间：2026-06-16

已完成内容：

- 新增 `packages/game-dsl/src/resolver-v2/trace-events.ts`，定义 Resolver V2 trace event type / severity / schema。
- 新增 `packages/game-dsl/src/resolver-v2/trace-recorder.ts`，提供 deterministic in-memory trace recorder、sink forwarding 和 sink exception capture。
- 新增 `packages/game-dsl/src/resolver-v2/trace-summaries.ts`，集中 resolver / IR gate / diagnostic / blocker trace-safe summary。
- 新增 `packages/game-dsl/src/resolver-v2/traced-resolver-v2.ts`，提供 `traceResolverV2Resolve()` 和 `traceResolverV2IrGate()`。
- 新增 `packages/game-dsl/src/resolver-v2/diagnostics-view-model.ts` 及 mapper/types/scene-graph helper，生成 safe diagnostics view model。
- 新增 `apps/maker-workbench/src/features/resolver-v2/ResolverV2DiagnosticsPanel.tsx` 和 panel parts，只读渲染 diagnostics view model。
- 新增 `apps/maker-workbench/src/features/resolver-v2/index.ts`，导出 Workbench resolver-v2 feature。
- 更新 `packages/game-dsl/src/resolver-v2/index.ts`，导出新增 trace / diagnostics API 和类型。
- 新增 `tests/contracts/resolver-v2-trace-diagnostics.test.ts`，覆盖 Step 28.5 trace / diagnostics 契约。

新增 Resolver V2 trace event contract：

- `resolver_v2.resolve.started`
- `resolver_v2.resolve.completed`
- `resolver_v2.resolve.failed`
- `resolver_v2.ir_gate.started`
- `resolver_v2.ir_gate.completed`
- `resolver_v2.ir_gate.blocked`
- `resolver_v2.diagnostics.reported`
- Trace severity：`debug` / `info` / `warning` / `error`
- `ResolverV2TraceEventSchema` 可 parse recorder 产出的事件。

新增 trace recorder 行为：

- `createResolverV2TraceRecorder()` 支持 deterministic `now()` 和 deterministic `createEventId()` 注入。
- `getEvents()` 返回 cloned event snapshots，不暴露内部数组。
- `clear()` 清空 events / sink errors / sequence。
- sink throw 不影响 recorder emit、resolver resolve 或 IR gate evaluate 结果。
- sink throw 被记录到 `getSinkErrors()`。

新增 traced wrapper 行为：

- `traceResolverV2Resolve()` 发出 resolve started / completed / failed 生命周期事件。
- resolver 成功返回但 diagnostics 非空时，额外发出 `resolver_v2.diagnostics.reported`。
- custom resolver throw 不抛出到调用方，返回 gate-safe failed `ResolverV2Result`，并发出 `resolver_v2.resolve.failed`。
- `traceResolverV2IrGate()` 发出 IR gate started / completed 或 started / blocked 生命周期事件。
- custom gate throw 不抛出到调用方，返回 blocked `ResolverV2IrGateResult`，并产生 `RESOLVER_V2_GATE_EXCEPTION` blocker。

新增 diagnostics view model：

- `createResolverV2DiagnosticsViewModel()` 输入为 `unknown`，invalid input 不抛出。
- 输出 summary、diagnostics、blockers、references、assets、sceneGraph、traceEvents 和 warnings。
- 输出只包含 safe fields，不保留原数组或原对象引用。
- deterministic ordering 覆盖 diagnostics、blockers、references、assets 和 sceneGraph rows。

新增 Workbench read-only diagnostics panel：

- `ResolverV2DiagnosticsPanel` 只接收 `ResolverV2DiagnosticsViewModel` props。
- 组件不调用 resolver。
- 组件不调用 IR gate。
- 组件不写 persistence。
- 组件不发 trace。
- 组件不接 runtime / QA / pipeline。
- 组件不使用 `dangerouslySetInnerHTML`。
- 组件无 state / reducer / effect / ref / custom hook。

Safe redaction：

- trace payload 不包含完整 document。
- trace payload 不包含 raw asset source。
- trace payload 不包含 diagnostic `cause` 或 stack。
- diagnostics view model 不包含完整 document。
- diagnostics view model 不包含 raw asset source。
- diagnostics view model 不包含 diagnostic `cause` 或 stack。
- Workbench panel 只渲染 view model，不接触 document 或 raw asset source。

Safety / boundary：

- 本轮未生成 IR。
- 本轮未替换 existing resolver。
- 本轮未接 Phaser generator。
- 本轮未接 Preview runtime。
- 本轮未接 QA / Playwright。
- 本轮未接 pipeline gate。
- 本轮未写 workspace 文件或持久化 SSOT。
- 本轮未修改 generated Phaser code。
- 本轮未进入 Phaser Upgrade。

TDD 记录：

- RED：`npx vitest run tests/contracts/resolver-v2-trace-diagnostics.test.ts` 失败 14 tests，原因是 trace recorder、traced wrappers 和 diagnostics view model API 尚未实现。
- GREEN：新增 trace events / recorder / wrappers / diagnostics view model / exports 后，`tests/contracts/resolver-v2-trace-diagnostics.test.ts` 14 tests passed。
- Oracle P1 RED：补充 partially malformed unknown input regression test，复现 `diagnostics: [null]` / `blockers: [null]` / invalid sceneGraph 会导致 view model throw。
- Oracle P1 GREEN：diagnostics / blockers / references / sceneGraph 增加 row-level guards，坏行跳过且不抛出；`tests/contracts/resolver-v2-trace-diagnostics.test.ts` 15 tests passed。
- Oracle 复审 P1 RED：补充 malformed scene graph node regression test，复现 `sceneGraph.nodes: [null]` 仍会在 scene graph grouping 时 throw。
- Oracle 复审 P1 GREEN：scene graph view model helper 增加 node row guard，只复制 type-valid optional fields，resolver / gate graph grouping 统一基于 safe rows；`tests/contracts/resolver-v2-trace-diagnostics.test.ts` 16 tests passed。
- React type GREEN：新增 Workbench read-only panel 后，`npm run typecheck --workspace @ai-game-maker/maker-workbench` passed。
- 结构复核：`diagnostics-view-model.ts` 拆分为主工厂、types、mappers、scene-graph helper；Workbench panel 拆分为主 panel 和 parts helper。

已通过验证：

```bash
npx vitest run tests/contracts/resolver-v2.test.ts
npx vitest run tests/contracts/resolver-v2-trace-diagnostics.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 65 tests passed
- `tests/contracts/resolver-v2-trace-diagnostics.test.ts`: 1 test file passed, 16 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

阶段结果：

- `trace-events.ts` 当前 32 行，集中 trace event schema。
- `trace-recorder.ts` 当前 74 行，集中 deterministic recorder。
- `trace-summaries.ts` 当前 97 行，集中 trace-safe summary。
- `traced-resolver-v2.ts` 当前 168 行，集中 trace wrappers。
- `diagnostics-view-model.ts` 当前 61 行，集中 view model factory。
- `diagnostics-view-model-mappers.ts` 当前 219 行，集中 safe rows / input guards。
- `diagnostics-view-model-scene-graph.ts` 当前 116 行，集中 scene graph view grouping 和 scene graph node row guard。
- `ResolverV2DiagnosticsPanel.tsx` 当前 166 行，集中 Workbench panel composition。
- `ResolverV2DiagnosticsPanelParts.tsx` 当前 80 行，集中 read-only table/list/status UI parts。
- `resolver-v2-trace-diagnostics.test.ts` 当前覆盖 16 个 trace / diagnostics contract tests。

审查门禁：

- Oracle 首审：
  - P0: 无。
  - P1: safe diagnostics view model 的 `unknown` 输入防护只做浅层检查，半合法但内部损坏的输入仍可能抛出。
  - P2: `ResolverV2TraceEventSchema` 的 `payload` 仍是 `Record<string, unknown>`；wrapper 自身 payload safe，本轮保持 prompt 指定 contract。
  - P3: Workbench panel 拆分后职责可接受。
- 已修复：
  - 新增 partially malformed input regression test，覆盖 `references: [null]`、`diagnostics: [null]`、`blockers: [null]` 和 invalid `sceneGraph`。
  - diagnostics view model mapper 增加 row-level guard，对坏行跳过，不再 cast 后读取。
  - scene graph view model mapper 对 invalid graph shape 返回 `undefined`，不抛出。
- Oracle 复审：
  - P0: 无。
  - P1: 无，前述 scene graph node row guard 后 P1 已关闭。
  - P2: 文档仍记录 `15 tests passed` 且保留 `Oracle 复审待执行`；本次已更新为 16 tests 与最终复审结果。
  - 结论：代码层未发现 P0 / P1 / P2 blocking issue；文档 P2 已在本节修正。

下一步建议：

- Step 28 Final Consolidation / Checkpoint，之后再进入 Phaser Upgrade 或下一阶段。

## Step 28 Final Consolidation / Checkpoint

完成时间：2026-06-16

已完成内容：

- 前置 Step 28.5 checkpoint commit 已创建：`e5ce5b2 feat(game-dsl): add resolver v2 trace diagnostics`。
- 复核 Step 28.1 到 28.5 文档记录、Resolver V2 public exports、trace / diagnostics view model、Workbench read-only panel 和 trace diagnostics contract tests。
- 复核 Step 28 最终边界：本轮未进入 Phaser Upgrade，未接 IR generator、Phaser generator、Preview runtime、QA runner、pipeline，也未修改 generated Phaser code。
- 复核 Workbench 闭环边界：28.5 只新增 read-only diagnostics panel export；panel 接收 view model props，不调用 resolver / IR gate，不写 persistence，不发 trace。
- 执行 export surface、boundary、redaction / safety、determinism、contract test、Workbench typecheck 和文件规模审计。
- 记录 Resolver V2 后续可治理的大文件，但本轮不做额外拆分或重构。

Checkpoint 状态：

- branch：`main`
- local commit：`e5ce5b2 feat(game-dsl): add resolver v2 trace diagnostics`
- remote：未 push，`main...origin/main [ahead 8]`
- Step 28.5 checkpoint 后 working tree clean；本节为 docs-only final record，不新增代码行为。
- 本轮未新增 commit，未 push；当前仅保留本节文档更新作为未提交变更。

最终边界确认：

- Step 28 Resolver V2 已完成 28.1 到 28.5。
- Workbench diagnostics 闭环已完成 read-only surface。
- Phaser Upgrade 仍未开始。
- actual IR generation 未实现。
- existing resolver replacement 未执行。
- IR generator / Phaser generator / Preview runtime / Playwright QA runner / pipeline gate integration 均未接入。
- Workbench persistence / approve / reject 未实现。
- generated Phaser code 未修改。

Capability inventory：

- 28.1 Contract / SemanticIndex Adapter Skeleton：完成 Resolver V2 public contract、reference extraction skeleton、SemanticIndex adapter 和 baseline diagnostics；未替换 existing resolver，未接 IR / Phaser / runtime / pipeline。
- 28.2 Asset Resolver Expansion：完成 in-memory asset catalog、asset reference checks、source safety diagnostics 和 asset type compatibility；未做 asset pack discovery、真实 asset file 读取或 asset pipeline。
- 28.3 Scene Graph Resolver：完成 in-memory scene graph nodes / edges、relationship validation、deterministic ordering 和 scene graph diagnostics；未接 runtime、QA、Phaser generator 或 generated code。
- 28.4 IR Integration Gate：完成 resolver result 到 safe IR handoff summary 的 ready / blocked gate；不生成 IR，不调用真实 IR generator，不调用 Phaser generator、runtime、QA 或 pipeline。
- 28.5 Resolver Trace / Diagnostics UI：完成 trace recorder、traced resolver / gate wrappers、diagnostics view model 和 Workbench read-only diagnostics panel；未实现 persistence、approve / reject、backend API 或 runtime integration。

审计结果：

- Export surface：`packages/game-dsl/src/resolver-v2/index.ts` 当前解析到 67 个 named exports，并覆盖附件审计清单列出的 60 个 Resolver V2 symbols；`packages/game-dsl/src/index.ts` 通过 `export * from './resolver-v2/index.js';` 暴露；Workbench barrel 导出 `ResolverV2DiagnosticsPanel` 和 `ResolverV2DiagnosticsPanelProps`。
- Boundary audit：未发现真实 Playwright / browser / filesystem persistence / runtime / QA / pipeline / generator 调用；`generated/phaser` 命中仅为 unsafe fixture / diagnostic，`Phaser generator` / `pipeline gate` 命中为文档边界说明。
- Redaction / safety audit：trace、view model 和 IR handoff summary contract tests 覆盖 full document、raw asset source、diagnostic cause / stack 不外泄；custom resolver / gate / sink throw 不向调用方泄漏或中断。
- Determinism audit：reference extraction、asset catalog、scene graph、IR gate blockers / warnings / summary、diagnostics view model 和 trace recorder 均有 deterministic ordering 或 injected clock / id factory 覆盖。
- Workbench audit：resolver-v2 feature 只渲染 `viewModel`，未使用 `dangerouslySetInnerHTML`，未使用 hook/state/effect，未调用 resolver / gate / persistence / runtime / QA / pipeline。

最终扫描：

```bash
find packages/game-dsl/src/resolver-v2 apps/maker-workbench/src/features/resolver-v2 -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} + | sort -nr | head -20
```

结果：

- total: 4118 lines
- `packages/game-dsl/src/resolver-v2/scene-graph.ts`: 722 lines
- `packages/game-dsl/src/resolver-v2/scene-graph-rules.ts`: 373 lines
- `packages/game-dsl/src/resolver-v2/resolver-v2.ts`: 349 lines
- `packages/game-dsl/src/resolver-v2/types.ts`: 329 lines
- `packages/game-dsl/src/resolver-v2/asset-catalog.ts`: 308 lines
- `packages/game-dsl/src/resolver-v2/reference-extractor.ts`: 221 lines
- `packages/game-dsl/src/resolver-v2/diagnostics-view-model-mappers.ts`: 219 lines
- `packages/game-dsl/src/resolver-v2/traced-resolver-v2.ts`: 168 lines
- `apps/maker-workbench/src/features/resolver-v2/ResolverV2DiagnosticsPanel.tsx`: 166 lines
- `packages/game-dsl/src/resolver-v2/ir-gate-summaries.ts`: 153 lines
- `packages/game-dsl/src/resolver-v2/ir-gate-blockers.ts`: 150 lines
- `packages/game-dsl/src/resolver-v2/ir-integration-gate.ts`: 125 lines
- `packages/game-dsl/src/resolver-v2/diagnostics-view-model-scene-graph.ts`: 116 lines
- `packages/game-dsl/src/resolver-v2/trace-summaries.ts`: 97 lines
- `apps/maker-workbench/src/features/resolver-v2/ResolverV2DiagnosticsPanelParts.tsx`: 80 lines
- `packages/game-dsl/src/resolver-v2/trace-recorder.ts`: 74 lines
- `packages/game-dsl/src/resolver-v2/diagnostics-view-model-types.ts`: 72 lines
- `packages/game-dsl/src/resolver-v2/reference-extractor-shared.ts`: 70 lines
- `packages/game-dsl/src/resolver-v2/ir-gate-policy.ts`: 69 lines

分组扫描：

- resolver-v2 源码最大文件：`packages/game-dsl/src/resolver-v2/scene-graph.ts`，722 lines
- Workbench resolver-v2 最大文件：`apps/maker-workbench/src/features/resolver-v2/ResolverV2DiagnosticsPanel.tsx`，166 lines
- resolver-v2 contract test 最大文件：`tests/contracts/resolver-v2.test.ts`，2271 lines

已通过验证：

```bash
npx vitest run tests/contracts/resolver-v2.test.ts
npx vitest run tests/contracts/resolver-v2-trace-diagnostics.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
git diff --cached --check -- .
```

结果：

- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 65 tests passed
- `tests/contracts/resolver-v2-trace-diagnostics.test.ts`: 1 test file passed, 16 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed
- staged diff check passed before checkpoint commit

审查门禁：

- Oracle 只读审查：P0 / P1 / P2 均无。
- Oracle 核对 checkpoint commit `e5ce5b2` 存在且标题一致；checkpoint 范围限于 Resolver V2、Workbench resolver-v2 panel、tests 和文档，未发现 runtime / QA / pipeline / generated Phaser code 文件。
- Oracle 核对最终扫描结果与文档一致，`git diff --check -- .` 和 `git diff --cached --check -- .` 均通过。
- Oracle 结论：验证记录关系清楚，边界表述未进入 Phaser Upgrade 或 runtime / pipeline 接线。
- Oracle P3：export count wording / documentation precision；已修正为 “67 named exports，覆盖审计清单 60 个 symbols”。
- 最终复审结论：P0 / P1 / P2 无，P3 已关闭，无遗留 blocking finding。

下一步建议：

- 人工 review 后做 Step 28 final checkpoint commit。
- 然后进入 Phaser Upgrade planning；启动前继续保持 Resolver V2 / Workbench diagnostics 边界，不把 generator/runtime/pipeline 接线混入 Step 28 收口。
