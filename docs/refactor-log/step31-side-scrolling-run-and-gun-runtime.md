# Step 31 Side-scrolling Run-and-gun Runtime Vertical Slice

适用项目：`ai-game-maker`

目标：让 `side_scrolling_run_and_gun.v1` 从 semantic-known 逐步推进到真正 runtime-supported。Runtime support 只能在 DSL、IR、Phaser template、preview、QA telemetry 和 contract tests 都闭合后标绿；不能把 alias recognition、prompt/schema capability 或 unsupported placeholder 当作可执行支持。

## Boundary

本阶段必须保持：

```txt
Prompt / intent planner
  -> runtime capability registry
  -> unsupported stop with artifacts
  -> DSL / IR / compiler only after runtime support is real
```

禁止变成：

```txt
side_scrolling_run_and_gun prompt
  -> silent fallback to top_down_shooter
```

也禁止在 Phaser template、preview 或 QA smoke 尚未实现前把 `side_scrolling_run_and_gun` 标成 runtime supported。

## Landing Order

| Step | Status | Scope |
| --- | --- | --- |
| 31.1 Runtime Capability Registry and Support Gate Cleanup | completed | 建立 runtime capability registry，intent planner 改为 registry-driven，unsupported intent 停止前写出可审计 artifacts。 |
| 31.2 side_scrolling_run_and_gun.v1 DSL Contract | pending | 审计/补齐最小可运行横版跑枪 DSL contract 和 invalid fixture。 |
| 31.3 side_scrolling_run_and_gun.v1 IR Contract | pending | 将 DSL 编译为 runtime-oriented IR，包含 side camera、gravity、platform、enemy waves、win condition、telemetry。 |
| 31.4 Phaser Runtime Template: Minimum Playable Slice | pending | 新增最小 Phaser side-scrolling run-and-gun template，能 boot、run/jump/shoot、spawn enemies、complete mission。 |
| 31.5 Generation Pipeline Integration | pending | 真实 prompt route 接到 compiler/template/build/preview，不 fallback，不绕过 gate。 |
| 31.6 Runtime QA Telemetry and Smoke Tests | pending | QA 可验证 boot、camera、gravity/jump、shooting、enemy defeat、damage、mission complete。 |
| 31.7 Workbench Preview and Artifact Index Closure | pending | Workbench preview 和 artifact evidence 显示 supported/unsupported 状态一致。 |
| 31.8 Live-edit Registry Handoff, Not Full Live-edit Yet | pending | 只登记 live-edit exposure handoff，不实现完整 live-edit。 |
| 31.9 Final Contract / Oracle Review | pending | 最终验证、浏览器/QA evidence、Oracle closure 和剩余范围归档。 |

## 31.1 Runtime Capability Registry and Support Gate Cleanup

当前目标：只建立 runtime support 的 source of truth，并让 unsupported intent 产出可审计 artifacts；不实现横版跑枪 Phaser runtime。

完成时间：2026-06-17

已完成内容：

- 新增 `packages/game-dsl/src/runtime-capabilities.ts`，定义 `RuntimeSupportStatus`、`RuntimeGenreCapability`、`RUNTIME_GENRE_CAPABILITIES` 和 lookup/description helpers。
- `top_down_shooter` 与 `dodger_collector` 标为 `supported`；`side_scrolling_run_and_gun` 标为 `planned`，且 missing `side_view_camera`、`gravity_platformer_physics`、`run_jump_controller`、`multi_direction_shooting`、`projectile_combat`、`enemy_spawn_triggers`、`platforms_terrain_collision`、`checkpoint_or_lives_system`。
- `apps/maker-api/src/model-provider/intent-plan.ts` 删除本地 hardcoded support set 和 unsupported capability switch，改为从 registry 派生：
  - `runtimeDslSupport`
  - `runtimeSupportStatus`
  - `runtimeSupportReason`
  - `runtimeTemplateId`
  - `qaProfile`
  - `unsupportedCapabilities`
- `packages/game-dsl/src/live-edit.ts` 新增 `buildUnsupportedRuntimeCapabilityReport()`，允许 pre-DSL unsupported report 使用 `intentPlanRef`，同时 supported report 继续要求 `validatedDslRef`、`selectedAdapterId`、`runtimeTemplateId`、`qaProfile`。
- `buildRuntimeCapabilityReport()` 改为按 registry + adapter config 判定 top-down shooter / dodger runtime report；避免 `dodger_collector` registry supported 但 report 写成 shooter adapter unsupported。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 在 unsupported intent 停止前写出：
  - `runtime_capability_report.json`
  - `pipeline_artifact_index.json`
  - `pipeline_acceptance_report.json`
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` 将 `intent_plan.json` 纳入 artifact index，并新增 unsupported intent index；unsupported run 的 DSL、validation、generated-project、build、QA refs 均为 `skipped`。
- `apps/maker-api/src/projects/pipeline-acceptance-report.ts` 不再把 runtime report artifact present 直接等同于 runtime capability pass；`runtime_capability_report.status === "unsupported"` 会让 runtime check fail。
- `apps/maker-workbench/src/pipeline-evidence-client.ts` 将 `intentPlan` 归入 `Prompt / Provenance` 证据组。
- 新增/更新 regression：
  - unsupported intent 不调用 Game Brief / Raw DSL。
  - unsupported intent 不写 `game_dsl.json` 或 `dsl_validation_report.json`。
  - unsupported intent 写出 runtime capability report、artifact index 和 acceptance report。
  - unsupported acceptance 的 `runtime_capability` 为 fail，而不是 false-green pass。
  - `dodger_collector` runtime report 与 registry/adapter metadata 一致。

阶段结果：

- `side_scrolling_run_and_gun` 仍是 `runtimeSupportStatus: "planned"`、`runtimeDslSupport: "unsupported"`。
- 魂斗罗 / 横版跑枪 / contra-like 仍会被 semantic normalized 到 `side_scrolling_run_and_gun`，但 pipeline 在 DSL 生成前明确停止。
- Unsupported stop 现在有 artifacts 可供 Workbench 和后续 QA/diagnostics 展示。
- Unsupported stop 不会生成 fake `game_dsl.json`、generated Phaser project、preview URL 或 QA report。

行数 / 结构变化：

- 新增 `packages/game-dsl/src/runtime-capabilities.ts`：119 行。
- `packages/game-dsl/src/live-edit.ts` 当前 1032 行；本步只在既有 live-edit/report contract 文件内扩展 runtime report schema 和 builders，未拆分 live-edit 主文件，后续若继续扩 runtime report 可单独拆出 `runtime-capability-report.ts`。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 当前 945 行；本步只新增 unsupported artifact write path，未改 pipeline 主流程职责边界。
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` 当前 274 行；新增 unsupported index builder。

明确未改范围：

- 未把 `side_scrolling_run_and_gun` 标记为 runtime supported。
- 未新增 `templates/phaser/side_scrolling_run_and_gun`。
- 未接入 side-view camera、gravity platformer physics、run/jump controller、enemy waves、mission complete runtime behavior。
- 未修改 compiler 接受 `side_scrolling_run_and_gun.v1` template。
- 未新增 runtime QA telemetry smoke。
- 未实现 live-edit exposure beyond handoff。
- 未处理已有 Workbench conversation UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/live-edit-pipeline.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-acceptance-report.test.ts
  -> passed, 5 files, 131 tests

npx tsc --noEmit -p tsconfig.json
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

git diff --check -- packages/game-dsl/src/runtime-capabilities.ts packages/game-dsl/src/index.ts packages/game-dsl/src/live-edit.ts apps/maker-api/src/model-provider/intent-plan.ts apps/maker-api/src/projects/generation-pipeline.service.ts apps/maker-api/src/projects/pipeline-artifact-index.ts apps/maker-api/src/projects/pipeline-acceptance-report.ts apps/maker-workbench/src/pipeline-evidence-client.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/live-edit-pipeline.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 2 个；P2 2 个；P3 无阻塞。
- P1 修复：unsupported acceptance 的 `runtime_capability` 从 artifact-present pass 改为读取 runtime report status；unsupported status 现在 fail，避免 false-green runtime support。
- P1 修复：`dodger_collector` runtime report 改为 registry/adapter-driven，使用 `dodger_collector.phaser.v1`，并补 regression。
- P2 修复：unsupported preview manifest path 对非 side-scrolling genre 使用 `runtime_unsupported/src/asset-manifest.generated.json`，避免错误指向 side-scrolling runtime。
- P2 修复：supported runtime report schema 重新要求 `validatedDslRef`、`selectedAdapterId`、`runtimeTemplateId`、`qaProfile`。
- Oracle 复审：上一轮 4 个问题均已关闭；P0/P1/P2 均无新阻塞；P3 可选建议是给 `buildPipelineAcceptanceReport()` 再补直接单测覆盖 runtime unsupported/missing status。
- 审查模式：Oracle 复用。

当前下一步：

```txt
31.2 side_scrolling_run_and_gun.v1 DSL Contract
```

建议下一步先审计现有 `packages/game-dsl/src/contracts/side_scrolling_run_and_gun.contract.json`、`packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts`、`tests/contracts/dsl-validator-normalizer.test.ts` 和 `tests/contracts/fixtures.ts`，确认 DSL contract 已经覆盖最小 playable slice，补缺失 invalid fixture，但仍不接 Phaser runtime template。
