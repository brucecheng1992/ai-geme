# Step 26: Semantic Extraction Trace

完成时间：2026-06-16

## 目标

建立 `SemanticExtractionTrace`，让 prompt / brief 到 `GameSemanticModel` 的语义抽取过程可解释。Step 26 只新增观测 artifact 和 refs-only 索引，不改变 Phaser runtime、template 行为、live edit、Resolver V2 或 acceptance gate 语义。

## 已完成内容

- 新增 `packages/game-dsl/src/semantic/semantic-extraction-trace.schema.ts`：
  - `ExtractionSource`
  - `SemanticExtractionTraceEntry`
  - `SemanticExtractionTrace`
  - `SemanticExtractionTraceReport`
- 新增 `packages/game-dsl/src/semantic/semantic-extraction-trace.ts`，生成 trace entries：
  - original prompt 命中 concept alias -> `extractionSource: manual_prompt`，`inferred: false`
  - generated brief 命中 concept alias -> `extractionSource: prompt_coach`，`inferred: false`
  - 显式 DSL semantic profile -> `extractionSource: llm`，`inferred: false`
  - conservative fallback derivation -> `extractionSource: fallback_derivation`，`inferred: true`
- trace entry 记录：
  - `sourceTerm`
  - `normalizedTerm`
  - `entityId`
  - `gameplayRole`
  - `visualConcept`
  - `strictness`
  - `confidence`
  - `extractionSource`
  - `inferred`
  - `rationale`
- `SemanticExtractionTraceReportSchema` 校验 `entryCount === entries.length`。
- 英文 alias 使用词边界匹配，避免 `cat` 误匹配 `catapult`；中文 alias 保持子串匹配。
- compiler 写出 generated-project artifact：
  - `semantic_extraction_trace_report.json`
- `semantic_model_report.json` 增加 refs-only 链接：
  - `semanticTracePresent`
  - `semanticTraceRef: { artifact: "semantic_extraction_trace_report.json" }`
  - 不复制 trace entries
- generation pipeline 将 `input.idea` 和 model brief 作为 `semanticTraceContext` 传入 compiler。
- `pipeline_artifact_index.json` 新增 `semanticExtractionTraceReport` ref；invalid DSL 路径标记 downstream generated artifact 为 skipped。

## 覆盖用例

- `小猫射击外星人`：player cat、enemy alien，`inferred: false`。
- `坦克大战`：player tank，`inferred: false`。
- `Human Action Shooter`：player `human_character`，`inferred: false`。
- `Generic Shooter`：player 保持 `generic_actor`，`inferred: true`，不推断为 tank。
- `Catapult Shooter`：不把 `cat` 子串误判为 explicit cat prompt term。
- trace report `entryCount` 与 entries 长度不一致时 schema 拒绝。

## 修改范围

- `packages/game-dsl/src/semantic/semantic-extraction-trace.schema.ts`
- `packages/game-dsl/src/semantic/semantic-extraction-trace.ts`
- `packages/game-dsl/src/semantic/semantic-model-report.ts`
- `packages/game-dsl/src/index.ts`
- `apps/maker-api/src/compiler/compiler.types.ts`
- `apps/maker-api/src/compiler/template-compiler.service.ts`
- `apps/maker-api/src/projects/generation-pipeline.service.ts`
- `apps/maker-api/src/projects/pipeline-artifact-index.ts`
- `tests/contracts/semantic-extraction-trace.test.ts`
- `tests/workspace/compiler-service.test.ts`
- `tests/workspace/pipeline-artifact-index.test.ts`

## 已通过验证

```bash
npm run typecheck:root
npm run test:contracts -- tests/contracts/semantic-extraction-trace.test.ts tests/contracts/dsl-validator-normalizer.test.ts
npm run test:workspace -- tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts
```

结果：

- root TypeScript typecheck passed
- contracts 全量实际执行：25 test files passed，240 tests passed
- workspace 全量实际执行：29 test files passed，314 tests passed

说明：

- 曾误用 Jest 风格 `--runInBand` 参数，Vitest 返回 unknown option；随后使用项目支持的 Vitest 命令重跑并通过。

## Oracle 审查门禁

审查模式：Oracle 只读审查。

Oracle 结论：

- Step 26 listed files: no P0 / P1 / P2 blocker
- Observability-only: PASS
- Trace schema/report: PASS
- Explicit/fallback semantics: PASS
- `semantic_model_report` refs-only linkage: PASS
- `pipeline_artifact_index` refs-only + invalid DSL skipped: PASS

Oracle caveat：

- `packages/asset-pipeline/src/plan.ts` 当前仍有 Step 25 修改，属于已审过的 semantic source-of-truth 基线，不属于 Step 26 observability-only 交付范围。

Oracle P3 已收敛：

- 为 `SemanticExtractionTraceReportSchema` 增加 `entryCount === entries.length` 校验。
- 为英文 alias 增加词边界匹配，避免 larger word substring false positive。

## 未改范围

- 未改变 Phaser runtime / template 行为。
- 未实现 Workbench semantic editing。
- 未实现 Resolver V2 或 hard mismatch acceptance matrix。
- 未改变 QA / repair / acceptance gate 语义。
- 未把 trace payload 复制进 `semantic_model_report.json` 或 `pipeline_artifact_index.json`。

## 下一步建议

Step 27: Workbench Semantic Editing。

建议边界：

- 只在 Workbench 层支持 semantic patch 展示 / 提交，例如 `replaceConcept(player, cat -> robot)`。
- 继续保持 generated artifact refs-only。
- 不在 Step 27 中扩大 Resolver V2 或 acceptance matrix。
