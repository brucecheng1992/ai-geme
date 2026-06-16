# Step 28 Resolver V2

当前状态：

- Step 28 Resolver V2 🚧
  - 28.1 Contract / SemanticIndex Adapter Skeleton ✅
  - 28.2 Asset Resolver Expansion ⬜
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
