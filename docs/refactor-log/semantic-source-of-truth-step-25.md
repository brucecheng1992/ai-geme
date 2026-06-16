# Step 25: Semantic Source Of Truth

完成时间：2026-06-16

## 目标

建立统一的 `GameSemanticModel`，让 DSL / IR / generated run artifacts 都能引用同一个语义事实源。Step 25 只处理 source-of-truth 契约和下游 asset plan 消费，不实现 Workbench semantic editing，不改变 resolver / QA / repair / runtime 策略。

## 已完成内容

- 新增 `packages/game-dsl/src/semantic/semantic-model.schema.ts`，定义 `GameplayRole`、`VisualConcept`、`SemanticStrictness`、`EntitySemanticProfile` 和 `GameSemanticModel`。
- 新增 `packages/game-dsl/src/semantic/semantic-model-derivation.ts`，在 raw DSL 没有显式 `semanticModel` 时生成保守默认模型：
  - generic player / enemy -> `generic_actor`
  - projectile -> `bullet`
  - explicit cat / alien / human / tank / fishbone labels 才进入对应 known concept
  - 不从 broad theme 推断 generic player 为 tank
- `RawGameDslSchema` 接受 optional `semanticModel`，`NormalizedGameIrSchema` 接受 optional `semanticModel`；normalizer 对真实 DSL -> IR 路径总是产出 `semanticModel`。
- 显式 raw `semanticModel` 会保真进入 IR，不被 normalizer 改写。
- DSL validator 校验 semantic profile：
  - `entityId` 必须指向 `player.id` 或 `entities[].id`
  - `role` 必须匹配 player / enemy / projectile / collectible / hazard
- `buildAssetPlanFromIr` 优先消费 `ir.semanticModel`：
  - 有 `sourceEntityId` 时按 `entityId + role` 精确绑定
  - 没有 `sourceEntityId` 且同 role 只有唯一 profile 时才消费
  - 歧义时回退旧 taxonomy inference，不静默取第一个 profile
  - background / pickup 暂不消费 `semanticModel`，保持 Step 25 entity 语义边界闭合
- generated project 写出 `semantic_model_report.json`，并在 `pipeline_artifact_index.json` 注册 `semanticModelReport`。

## 修改范围

- `packages/game-dsl/src/semantic/`
- `packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts`
- `packages/game-dsl/src/schemas/normalized-game-ir-v0.1.schema.ts`
- `packages/game-dsl/src/normalizer.ts`
- `packages/game-dsl/src/dsl-validator.ts`
- `packages/game-dsl/src/index.ts`
- `packages/asset-pipeline/src/plan.ts`
- `apps/maker-api/src/compiler/template-compiler.service.ts`
- `apps/maker-api/src/projects/pipeline-artifact-index.ts`
- focused contract / workspace tests

## 已通过验证

```bash
npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts
npm run typecheck:root
git diff --check -- docs/refactor-log/semantic-source-of-truth-step-25.md packages/game-dsl/src/semantic/semantic-model.schema.ts packages/game-dsl/src/semantic/semantic-model-derivation.ts packages/game-dsl/src/semantic/semantic-model-report.ts packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts packages/game-dsl/src/schemas/normalized-game-ir-v0.1.schema.ts packages/game-dsl/src/normalizer.ts packages/game-dsl/src/dsl-validator.ts packages/game-dsl/src/index.ts packages/asset-pipeline/src/plan.ts apps/maker-api/src/compiler/template-compiler.service.ts apps/maker-api/src/projects/pipeline-artifact-index.ts tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts
```

结果：

- 4 个 test files passed
- 73 个 tests passed
- root TypeScript typecheck passed
- scoped diff check passed

## Oracle 审查门禁

审查模式：Oracle 只读审查，两轮。

第一轮结论：

- P0: 无
- P1: asset plan 按 role 取第一个 semantic profile 有多实体错配风险；validator 未校验 role 与 DSL entity kind 一致
- P2: background / pickup role 契约不闭合

修正：

- asset plan 改为按 `sourceEntityId` 精确匹配 profile；没有明确 id 且同 role 多 profile 时回退旧 inference
- validator 增加 role-kind consistency 校验
- asset plan 不再从 semanticModel 消费 background / pickup

第二轮结论：

- P0: 无
- P1: 无，已关闭
- P2: 无 blocker
- P3: 可选后续测试增强：更贴近真实 raw DSL 的多实体用例；side-scrolling 多 enemy 歧义回退测试

## 未改范围

- 未实现 Workbench semantic editing。
- 未改变 resolver selection 策略、hard mismatch 判定、QA overall 映射、repair 触发 / 执行边界或 Phaser runtime 行为。
- 未把 background / pickup 纳入 semantic source-of-truth 闭环。

## 下一步建议

Step 26: Semantic Extraction Trace。

建议边界：

- 从 prompt / brief / raw DSL 生成 `semantic_extraction_trace_report.json`
- 记录 `sourceTerm -> entityId -> role -> concept -> strictness -> sourcePath`
- 不改变 `GameSemanticModel` schema、不改变 resolver / QA / repair / runtime 行为
- 继续使用 Oracle review gate
