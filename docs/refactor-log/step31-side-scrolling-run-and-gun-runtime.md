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
| 31.2 side_scrolling_run_and_gun.v1 DSL Contract | completed | 审计/补齐最小可运行横版跑枪 DSL contract 和 invalid fixture。 |
| 31.3 side_scrolling_run_and_gun.v1 IR Contract | completed | 将 DSL 编译为 runtime-oriented IR，包含 side camera、gravity、platform、enemy waves、win condition、telemetry。 |
| 31.4 Phaser Runtime Template: Minimum Playable Slice | completed | 新增最小 Phaser side-scrolling run-and-gun template，能 boot、run/jump/shoot、spawn enemies、complete mission。 |
| 31.5 Generation Pipeline Integration | completed | 真实 prompt route 接到 compiler/template/build/preview，不 fallback，不绕过 gate。 |
| 31.6 Runtime QA Telemetry and Smoke Tests | completed | QA 可验证 boot、camera、gravity/jump、shooting、enemy defeat、damage、mission complete。 |
| 31.7 Workbench Preview and Artifact Index Closure | completed | Workbench preview 和 artifact evidence 显示 supported/unsupported 状态一致。 |
| 31.8 Live-edit Registry Handoff, Not Full Live-edit Yet | completed | 只登记 live-edit exposure handoff，不实现完整 live-edit。 |
| 31.9 Final Contract / Oracle Review | completed | 最终验证、浏览器/QA evidence、Oracle closure 和剩余范围归档。 |
| 31.10 Live-edit Patch Bridge and Enemy Fire Regression Closure | completed | 修复 side-scrolling runtime 无法热改、敌人不射击、玩家/敌人 projectile 未区分的问题，并把 `enemy.fired` 纳入 QA 必检。 |

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

## 31.2 side_scrolling_run_and_gun.v1 DSL Contract

当前目标：补齐最小可运行横版跑枪 Raw DSL contract；只验证 DSL shape，不接 Phaser runtime，不把 runtime support 标绿。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts` 的 `side_scrolling_run_and_gun` 专属 refinement 补齐最小 playable contract：
  - `world.width > 960`，`world.height >= 540`，`world.gravity > 0`。
  - `player.movement.speed_px_per_sec > 0`。
  - player fire action 生成的 projectile entity 必须有正向 speed。
  - enemy entity 必须声明 `health`。
  - level 至少包含一个 `ground` 或 `platform`。
  - level segments 必须 `endX > startX` 且处于 world width 内。
  - terrain、spawn、pickup、checkpoint、`reach_exit` target 必须处于 world bounds 内。
  - win objective 只允许 `reach_exit` / `enemy_cleared`。
  - `winLose.win` 必须与 `objectives.win.type` 一致。
  - `winLose` 必须具备 `lives` 或 `checkpoints`。
- `packages/game-dsl/src/dsl-validator.ts` 修正 schema issue code 映射顺序：`objectives.win.target` 等 numeric path 先映射为 `NUMERIC_RANGE_INVALID`，避免被 `.target` 字段名误判为 `INVALID_ID_FORMAT`。
- `tests/contracts/fixtures.ts` 的 side-scrolling fixture 改为 `world.width: 1280`，segments、ground、checkpoint、exit target 均落在 world bounds 内，且仍大于 960 视口宽度。
- `apps/maker-api/src/model-provider/prompt-context.builder.ts` 同步更新 prompt context 中的 valid side-scrolling example，避免模型示例继续展示越界关卡。
- `tests/contracts/dsl-validator-normalizer.test.ts` 新增/更新 regression：
  - valid fixture 保持 `side_scrolling_run_and_gun`，不会 downgrade 为 top-down shooter。
  - valid fixture 断言没有要求 `player.spawn`、`player.jumpVelocity`、`player.weapon` 这些尚未实现字段。
  - invalid world width、segment 越界、`reach_exit` target 越界会失败。
  - invalid terrain、player speed、projectile speed、缺 lives/checkpoints 会失败。
  - invalid spawn enemyType reference 会失败。
  - unsupported `target_score` win objective 会失败。
  - `winLose.win` 与 `objectives.win.type` 不一致会失败。

阶段结果：

- `side_scrolling_run_and_gun.v1` 现在具备更窄的 Raw DSL contract，可表示一个最小横向可玩关卡。
- DSL contract 仍复用现有 `game-dsl-v0.1` Raw DSL 结构，没有引入 plan skeleton 中尚未实现的 `player.spawn`、`jumpVelocity`、nested `weapon` 必填字段。
- `side_scrolling_run_and_gun` 仍是 runtime `planned` / generation pipeline unsupported；本步没有新增 Phaser template、preview、QA smoke 或 runtime support。

明确未改范围：

- 未把 `side_scrolling_run_and_gun` 标记为 runtime supported。
- 未新增 `templates/phaser/side_scrolling_run_and_gun`。
- 未实现 player spawn、jump velocity 或 nested weapon DSL 字段。
- 未实现 side-scrolling runtime IR contract。
- 未新增 runtime QA telemetry smoke。
- 未处理 `enemy_cleared` target 可达性；Oracle 认为可作为后续 playable/runtime contract 增强。
- 未处理已有 Workbench conversation UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/compiler-service.test.ts
  -> passed, 3 files, 116 tests

npx tsc --noEmit -p tsconfig.json
  -> passed

git diff --check -- packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts packages/game-dsl/src/dsl-validator.ts tests/contracts/fixtures.ts tests/contracts/dsl-validator-normalizer.test.ts apps/maker-api/src/model-provider/prompt-context.builder.ts
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 无；P2 无。
- Oracle P3-1：建议补 `winLose.win` 与 `objectives.win.type` 不一致的直接 regression；已补并复跑验证通过。
- Oracle P3-2：建议后续考虑 `enemy_cleared` target 可达性；本步不扩 scope，留给 31.3 / 后续 playable contract。
- Oracle 复审：新增测试后 P0/P1/P2 仍为无。

## 31.3 side_scrolling_run_and_gun.v1 IR Contract

当前目标：将 31.2 已验证的 Raw DSL facts 编译成 runtime-oriented Normalized IR；只做 IR contract，不接 Phaser runtime，不把 runtime support 标绿。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/schemas/normalized-game-ir-v0.1.schema.ts` 新增 `runtime_plan.side_scrolling` strict schema：
  - `scene.viewport` 固定为 `960x540`，`scene.world` 包含 `width`、`height`、`gravityY`。
  - `camera` 包含 `side_follow`、`followTarget: player` 和 world bounds。
  - `physics` 包含 gravity platformer colliders / overlaps。
  - `player` 包含 derived spawn、speed、jump velocity、health、lives、projectile id/speed/damage 和 fire cooldown。
  - `platforms`、`enemyDefinitions`、`waves`、`pickups`、`winCondition`、telemetry profile 均进入 runtime plan。
- `NormalizedGameIrSchema.superRefine()` 新增 side-scrolling IR gate：
  - `side_scrolling_run_and_gun` 必须具备 `runtime_plan.side_scrolling`。
  - 非 side-scrolling genre 禁止携带 `runtime_plan.side_scrolling`。
  - side plan 的 world / camera bounds 必须与 IR world 一致。
  - player spawn、platforms、waves、pickups、`reach_exit` target 必须落在 IR world bounds 内。
- `packages/game-dsl/src/normalizer.ts` 新增 `buildSideScrollingRunAndGunPlan()`：
  - 从 validated Raw DSL 派生 deterministic runtime plan。
  - player spawn 从最早 `ground` / `platform` 顶部派生。
  - `jumpVelocity: -540` 是 v1 runtime 默认，不要求 Raw DSL 模型输出。
  - projectile speed / damage 优先来自 fire action 实际 spawned projectile entity，再 fallback 到 `projectiles[]` spec。
- `buildTemplateParams()` 的 side-scrolling branch 改为 asset/UI projection，避免 runtime facts 双 source：
  - 只输出 `style.visualTheme`、`player` label/source id、`assetLabels.enemy/projectile/pickup`、`ui`。
  - 不再输出 `camera`、`projectiles`、`enemyTypes`、`level`、`pickups`、`winLose`。
- `packages/asset-pipeline/src/plan.ts` 对 side-scrolling asset labels/source ids 改读 `assetLabels`，不再依赖 runtime-owned template params。
- `tests/contracts/contract-freeze.test.ts` 新增 side-scrolling runtime plan strict / genre-gated / bounds-aligned regression。
- `tests/contracts/dsl-validator-normalizer.test.ts` 锁定 valid side-scrolling IR plan，并断言 `template_params.params` 不包含 runtime-owned keys。

阶段结果：

- `side_scrolling_run_and_gun.v1` 现在有独立 `runtime_plan.side_scrolling`，后续 Phaser template 可以读取单一 runtime source。
- Raw DSL 仍不要求 `player.spawn`、`jumpVelocity` 或 nested `weapon`；这些在 IR 层由 normalizer 确定性派生。
- `side_scrolling_run_and_gun` 仍是 runtime `planned` / compiler unsupported；本步没有接 runtime template。

明确未改范围：

- 未把 `side_scrolling_run_and_gun` 标记为 runtime supported。
- 未新增 `templates/phaser/side_scrolling_run_and_gun`。
- 未修改 compiler 接受 `side_scrolling_run_and_gun.v1`。
- 未新增 runtime QA telemetry smoke。
- 未处理已有 Workbench conversation UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/contract-freeze.test.ts tests/contracts/asset-pipeline.test.ts
  -> passed, 3 files, 84 tests

npx tsc --noEmit -p tsconfig.json
  -> passed

git diff --check -- packages/game-dsl/src/schemas/normalized-game-ir-v0.1.schema.ts packages/game-dsl/src/normalizer.ts packages/asset-pipeline/src/plan.ts tests/contracts/fixtures.ts tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/contract-freeze.test.ts
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 1 个；P2 1 个；P3 1 个。
- P1 修复：移除 side-scrolling `template_params` 中的 runtime-owned facts，避免 `runtime_plan.side_scrolling` 与 `template_params` 双 source；asset pipeline 改读 asset/UI projection。
- P2 修复：`NormalizedGameIrSchema` 增加 side plan 子对象 bounds 校验，并补 narrowed-world regression。
- P3 修复：projectile speed/damage 优先使用实际 spawned projectile entity facts。
- Oracle 复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用。

31.3 后续已进入 31.4+ runtime landing；此处保留当时的阶段出口：

```txt
31.4 Phaser Runtime Template: Minimum Playable Slice
```

建议下一步新增 `templates/phaser/side_scrolling_run_and_gun`，只实现最小 boot / run / jump / shoot / enemy spawn / mission complete slice，并从 `runtime-plan.generated.json` 读取 `runtime_plan.side_scrolling`。

## 31.4 Phaser Runtime Template: Minimum Playable Slice

当前目标：新增 `templates/phaser/side_scrolling_run_and_gun`，从 `runtime_plan.side_scrolling` 驱动最小可玩横版跑枪 runtime；不从 `template_params` 复制 runtime facts。

完成时间：2026-06-17

已完成内容：

- 新增 `templates/phaser/side_scrolling_run_and_gun`：
  - `src/main.ts` 读取 `runtime-plan.generated.json`、`template-params.generated.json`、`asset-manifest.generated.json`。
  - `src/GameScene.ts` 实现 start / restart / run / jump / fire / projectile / enemy wave / hit / clear / lives / reach-exit / enemy-cleared objective。
  - `src/side-scrolling-runtime-plan.ts` 定义 side runtime slice 类型与 fallback plan。
  - `src/side-scrolling-art-library.ts` 通过 manifest preload / filecomplete / loaderror 输出 runtime asset telemetry。
  - `template-manifest.json` 绑定 side-scrolling contract telemetry。
- `GameScene` 使用自有 simulation + Phaser render：
  - side-follow camera 通过 `camera.bounds`、`viewport` 和 player x 计算 `scrollX`。
  - Phaser camera 调用 `setBounds()` / `setScroll()`，HUD 和 EndScreen 固定 `scrollFactor(0)`。
  - projectile y 改为 player hitbox 中线，避免 fire loop 无法命中敌人。
- `tests/contracts/phaser-templates.test.ts` 新增 side runtime behavior regression：
  - runtime plan camera follow + `reach_exit` win。
  - runtime plan wave spawn + jump + projectile hit + `enemy_cleared` win。

阶段结果：

- side-scrolling template 不再只是源码占位；可以由 generated runtime plan 驱动真实 run/jump/shoot/enemy clear/mission complete。
- `GameScene.ts` 当前 510 行，超过 220 行职责检查线；本步保持为单一 scene slice，未拆分。后续若继续加 pickup、enemy projectile 或多关卡，应优先拆出 side-scrolling simulation / renderer / telemetry helpers。

## 31.5 Generation Pipeline Integration

当前目标：让 compiler、asset evidence chain、intent/product route 能识别 `side_scrolling_run_and_gun.v1`，且不破坏 collector/dodger/shooter。

完成时间：2026-06-17

已完成内容：

- `apps/maker-api/src/compiler/template-compiler.service.ts` 接受 `side_scrolling_run_and_gun.v1`：
  - 复制 side-scrolling template。
  - 写入 `side_scrolling_run_and_gun/src/runtime-plan.generated.json`。
  - 写入 `side_scrolling_run_and_gun/src/asset-manifest.generated.json`。
  - 生成 root `src/main.ts` 指向 side template entry。
- `apps/maker-api/src/compiler/compiler.types.ts` 扩展 compile success `templateId` union。
- `asset-pipeline-report.ts`、`asset-library-usage-report.ts`、`asset-binding-trace-report*` 允许 side-scrolling preview manifest path。
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` valid compile files preview manifest regex 纳入 side-scrolling。
- `packages/runtime-adapters/phaser/src/phaser-adapter-v0.1.capabilities.json` 加入 side-view camera、run/jump controller、multi-direction shooting、projectile combat、enemy spawn triggers、terrain collision、lives/checkpoint 能力。
- `packages/game-dsl/src/runtime-capability-gate.ts` 检查 `runtime_requirements.capabilities`。

阶段结果：

- 手工 normalized side-scrolling IR 可以 compile 到真实 generated project。
- compiler/asset evidence chain 会把 preview manifest 指向 `side_scrolling_run_and_gun/src/asset-manifest.generated.json`。
- 真实生成项目 `proj_step31_side_scroll_smoke` 可 `npm run build`。

## 31.6 Runtime QA Telemetry and Smoke Tests

当前目标：让 Playwright QA 能验证 side-scrolling runtime，不只依赖 TypeScript/源码字符串。

完成时间：2026-06-17

已完成内容：

- `packages/runtime-core/src/qa/playable-qa-gate-v0.1.json` 新增 `side_scrolling_run_and_gun` required events：
  - `player.moved`
  - `player.jumped`
  - `player.fired`
  - `projectile.spawned`
  - `enemy.hit`
  - `checkpoint.reached`
  - `game.restarted`
  - any group: `enemy.cleared` / `level.segment.completed` / `game.won`
- `apps/maker-api/src/qa/qa.types.ts` 将 `QaGenre` 扩展到 `side_scrolling_run_and_gun`。
- `apps/maker-api/src/qa/playwright-browser-runner.ts` 新增 side-scrolling deterministic interaction：
  - Enter start。
  - ArrowRight 验证 player x 移动与 camera scroll。
  - Space 验证 `player.jumped`。
  - J + ArrowRight 推进到 enemy hit / clear / mission progress。
  - R restart。
- `apps/maker-api/src/qa/qa-asset-report.ts` 将 side-scrolling 纳入 runtime asset telemetry 必检范围。

真实 QA evidence：

```txt
npx tsx -e "... PlaywrightQaRunnerService.run({ genre: 'side_scrolling_run_and_gun', previewUrl: 'http://127.0.0.1:4179/index.html' }) ..."
  -> status: PASSED
  -> runtime_status: PASSED
  -> missing_events: []
  -> missing_any_groups: []
  -> asset_runtime.required: background_main, player, enemy, projectile, tileset, pickup
  -> asset_runtime.loaded: background_main, player, enemy, projectile, tileset, pickup
  -> overall_status: PLAYABLE_WITH_FALLBACK_ASSETS
```

说明：`overall_status` 为 `PLAYABLE_WITH_FALLBACK_ASSETS` 是因为当前 smoke project 使用 deterministic template fallback assets；runtime gate 和 telemetry gate 均已通过。

## 31.7 Workbench Preview and Artifact Index Closure

当前目标：把 `side_scrolling_run_and_gun` 从 planned/unsupported 切到 supported，真实 prompt route 进入 generation / compile / build / QA。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/runtime-capabilities.ts` 将 `side_scrolling_run_and_gun` 改为：
  - `status: "supported"`
  - `implementedCapabilities` 覆盖全部 required capabilities
  - `missingCapabilities: []`
  - `templateId: "phaser/side_scrolling_run_and_gun.v1"`
  - `qaProfile: "side_scrolling_run_and_gun_smoke"`
- `apps/maker-api/src/model-provider/prompt-context.builder.ts` 更新 P0 scope：
  - side-scrolling runtime generation 已支持。
  - model 仍不得输出 `runtime_plan` / `template_params`；runtime facts 由 DSL normalizer 派生。
- `tests/workspace/generation-pipeline.service.test.ts` 新增 side prompt supported path：
  - `横版跑枪打外星人` 不再 DSL 前 unsupported。
  - compile 接收 `side_scrolling_run_and_gun.v1`。
  - QA genre 为 `side_scrolling_run_and_gun`。
  - artifact index preview manifest 指向 side template。
- unsupported intent 表仅保留 vertical shooter / platformer 等仍未支持 genre。

阶段结果：

- `contra-like` / `横版跑枪` / `魂斗罗式` 仍 normalized 到 generic `side_scrolling_run_and_gun`，但不再 fallback 到 shooter，也不再停在 runtime unsupported。
- Workbench 可通过现有 artifact index / acceptance report 看到 side-scrolling generated project、runtime report、QA report 证据链。

## 31.8 Live-edit Registry Handoff, Not Full Live-edit Yet

当前目标：登记 runtime support 与 live-edit support 的边界；不把 side-scrolling runtime support 误当成 hot live-edit support。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/live-edit.ts` 新增 `side_scrolling_run_and_gun.phaser.v1` runtime report adapter config：
  - runtime capability report status 可为 `supported`。
  - `liveEditCapabilities` 仍为空。
- `validateAndPlanDslPatch()` 新增 live-edit path capability gate：
  - runtime report supported 但 path 不在 adapter live-edit capabilities 中时，返回 `unsupported` / `applyMode: none`。
  - side-scrolling pickup kind patch 仍可生成 pending candidate 和 validation report，但不会写 patch history 或 runtime apply。
- `tests/workspace/live-edit-pipeline.test.ts` 更新 side-scrolling expectations：
  - runtime report supported。
  - live-edit patch unsupported。

明确未改范围：

- 未实现 side-scrolling hot patch / warm restart live edit。
- 未实现 pickup runtime behavior。
- 未实现 side-scrolling enemy projectile / enemy fire。
- 未实现 full asset pack rollout；当前 smoke 使用 deterministic fallback assets。

## 31.9 Final Contract / Oracle Review

当前状态：已完成最终 Oracle 复审和验证闭环。

完成时间：2026-06-17

Oracle 最终复审：

- P0：无。
- P1：无。
- P2：无。
- P3：`restart()` 重绘前未清理静态背景、平台、玩家和 HUD，长期重复 restart 可能叠加静态对象。

P3 已处理：

- `SideScrollingRunAndGunScene` 新增静态 render object tracking。
- `renderFirstFrame()` 每次重绘前调用静态对象清理。
- `side-scrolling-art-library.ts` 的 `drawBackground()` 返回可追踪的 Phaser image。
- `tests/contracts/phaser-templates.test.ts` 新增 restart 静态对象清理 regression。

已通过验证：

```txt
npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/live-edit-pipeline.test.ts tests/workspace/compiler-service.test.ts tests/contracts/phaser-templates.test.ts tests/contracts/contract-freeze.test.ts tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/asset-pipeline.test.ts
  -> passed, 9 files, 282 tests

npx tsc --noEmit -p tsconfig.json
  -> passed

git diff --check -- apps/maker-api/src packages templates tests docs/refactor-log/step31-side-scrolling-run-and-gun-runtime.md packages/runtime-core/src/qa/playable-qa-gate-v0.1.json
  -> passed

npm run build --prefix data/generated-projects/proj_step31_side_scroll_smoke
  -> passed, Vite chunk-size warning only

PlaywrightQaRunnerService side_scrolling_run_and_gun smoke against http://127.0.0.1:4179/index.html
  -> status PASSED
  -> runtime_status PASSED
  -> visual_status PASSED
  -> missing_events []
  -> missing_any_groups []
  -> required assets background_main, player, enemy, projectile, tileset, pickup all loaded
  -> overall_status PLAYABLE_WITH_FALLBACK_ASSETS
```

真实 smoke 说明：

- `proj_step31_side_scroll_smoke` 由 `TemplateCompilerService` 重新生成。
- Preview server 必须以 `data/generated-projects/proj_step31_side_scroll_smoke` 为 root 启动。
- `PLAYABLE_WITH_FALLBACK_ASSETS` 来自 deterministic template fallback SVG；runtime/visual/telemetry/asset gate 均通过。

31.9 时点剩余范围（已由 31.10 更新）：

说明：以下是 31.9 Oracle 复审时的剩余范围；当前事实以 31.10 的“新的剩余范围”为准。

- 未实现 side-scrolling hot/warm live-edit；当前仅 runtime report supported，patch application 仍按 capability gate 返回 unsupported。
- 未实现 pickup runtime behavior。
- 未实现 enemy projectile / enemy fire。
- 未做 full art asset pack rollout；当前 smoke 使用 deterministic fallback assets。

## 31.10 Live-edit Patch Bridge and Enemy Fire Regression Closure

当前目标：修复真实 Workbench 中 side-scrolling preview “不能修改”、玩家/敌人射击链路不完整的问题，并防止旧的 runtime support green gate 再次漏掉敌人开火。

完成时间：2026-06-17

已完成内容：

- `SideScrollingRunAndGunScene` 将 projectile 区分为 `player` / `enemy` owner，并新增 enemy firing cooldown、range、damage 与 telemetry。
- `runtime_plan.side_scrolling.enemyDefinitions[]` 新增 `firing` contract；normalizer 从玩家 projectile facts 派生敌人最小开火参数。
- `side-scrolling-live-edit-bridge.ts` 新增 runtime bridge：
  - hot patch：`/player/physics/maxSpeed`、`/player/health/max`、`/enemyTypes/*/physics/speed`、`/enemyTypes/*/health/max`、`/projectiles/*/speed`、`/projectiles/*/damage`。
  - warm restart：`/player/label`、`/enemyTypes/*/label`、`/level/waves/*/count`、`/world/width`。
- `main.ts` 安装 `AIGAME_RUNTIME_READY` / `AIGAME_GET_CAPABILITIES` / `AIGAME_APPLY_PATCH` protocol，compiler 写入 side-scrolling `live-edit-registry.generated.json`。
- `runtime_capability_report.json` 对 side-scrolling 暴露非空 live-edit capabilities；未登记 path 仍走 `unsupported`，避免 UI 误报可改。
- QA contract / playable gate / Playwright deterministic interaction 新增 `enemy.fired` 必检，防止只有玩家射击或只有敌人受击也被判定 playable。
- Prompt context 增加 Raw DSL id/reference ASCII lower_snake_case 约束，修复真实中文 prompt 生成 `脉冲弹` / `无人机_type` 等非 schema id 后 DSL 失败的问题。

真实运行证据摘录：

说明：以下记录来自 2026-06-17 本地 `maker:start`、真实 API 生成、QA report 读取、Live Edit prepare API 和 Workbench 浏览器验证；这些 `data/local-data` / generated report artifacts 不纳入 git 工作树。

```txt
POST /api/projects
  -> projectId: proj_20260617_120220_1025
  -> runId: run_20260617_120220_1025
  -> status: PLAYABLE

intent_plan.json
  -> normalizedGenre: side_scrolling_run_and_gun
  -> matchedAlias: 横版跑枪
  -> templateId: phaser/side_scrolling_run_and_gun.v1
  -> qaProfile: side_scrolling_run_and_gun_smoke

runtime_capability_report.json
  -> status: supported
  -> selectedAdapterId: side_scrolling_run_and_gun.phaser.v1
  -> liveEditCapabilities.hot: player speed/health, enemy speed/health, projectile speed/damage
  -> liveEditCapabilities.warmRestart: player label, enemy label, wave count, world width

qa_report.json
  -> status: PASSED
  -> runtime_status: PASSED
  -> missing_events: []
  -> observed: player.fired, projectile.spawned, enemy.hit, enemy.fired, projectile.spawned

POST /api/projects/proj_20260617_120220_1025/runs/run_20260617_120220_1025/live-edits/prepare
  body: replace /projectiles/pulse_bolt/damage -> 2
  -> status: hot_patchable
  -> apply_mode: hot
  -> validation: valid
  -> runtime_patch.projectiles.pulse_bolt.damage: 2
```

Workbench / browser 验证：

```txt
Preview: http://127.0.0.1:3000/preview/proj_20260617_120220_1025/index.html
  -> Enter / ArrowRight / Space / J 后 telemetry 包含 player.fired、enemy.fired、player.damaged、enemy.hit、enemy.cleared

Workbench: http://127.0.0.1:5173/
  -> Runtime ready: phaser:side_scrolling_run_and_gun
  -> LIVE-EDIT SUPPORTED: 10
  -> 修改 Max speed 为 320 后返回 applied_hot
  -> history: patch_workbench_01adf32c:applied:/player/physics/maxSpeed
```

已通过验证：

```txt
npm run typecheck:root
  -> passed

npx vitest run tests/workspace/game-dsl-provider.test.ts tests/contracts/phaser-templates.test.ts tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/contract-freeze.test.ts tests/workspace/live-edit-pipeline.test.ts tests/workspace/compiler-service.test.ts tests/workspace/generation-pipeline.service.test.ts
  -> passed, 7 files, 224 tests

npx vitest run tests/workspace/playwright-qa-runner.test.ts
  -> passed, 1 file, 32 tests
```

新的剩余范围：

- Side-scrolling 仍不支持 `/player/render/scale`、asset swap 或 arbitrary DSL path；这些必须继续由 capability gate 明确拒绝。
- Enemy fire 当前是最小 projectile smoke，不包含复杂寻路、武器差异、弹幕模式或可配置 firing DSL 字段。
- Pickup runtime behavior 与 full art asset pack rollout 仍是后续范围。

## 31.11 Spawn Position Live-edit and Capability Truth Closure

当前目标：修复真实 Workbench 中“敌人不要凭空刷新在玩家面前，是指地图的末端”被多字段歧义拦截，以及旧 generated runtime support gate 误报支持导致 runtime apply 失败的问题；保持 DSL-first，不把需求改成 hardcoded template special case。

完成时间：2026-06-17

已完成内容：

- `side_scrolling_run_and_gun` live-edit capability 增加敌人刷新位置字段：
  - Workbench 暴露 `Spawn x`。
  - 自然语言解析将“敌人 / 生成 / 刷新 / 地图末端 / 关卡末端”映射到 `/level/waves/*/x`。
  - patch pipeline 将 wave `x` 同步到 Versioned DSL 的 `level.waves` 与 `sourceDsl.level.spawns`。
  - runtime patch bridge 支持 warm restart 更新 `triggerX` / `spawnX`。
- `live-edit-registry.generated.json` 写入 runtime-side capability inventory；`getLiveCurrent` 读取 generated runtime registry 后再暴露 live-edit capability，防止旧 generated runtime 没有 `x` 支持时 Workbench false-positive。
- 旧 `runtime_capability_report.json` 不再作为唯一真相源；它只在 generated runtime registry 文件存在、`runId` 匹配但缺旧格式 inventory 时作为兼容 fallback。registry 文件缺失或 `runId` 错配时返回空 live-edit capability，避免旧 runtime false-positive。
- Raw DSL schema 的版权引用报错改为定位真实路径；provider 只归一化 side-scrolling `metadata.description` 中的“魂斗罗式 / Contra-like”参考描述，避免真实 prompt 因说明文字复制 source reference 而失败，同时仍保留 title / label / asset 等字段的版权拦截。

真实运行证据摘录：

```txt
旧 generated run:
  proj_20260617_120220_1025 / run_20260617_120220_1025
  -> old runtime bridge only accepted wave count
  -> after registry intersection, Workbench disables Spawn x instead of exposing a broken edit

新真实 API run:
  POST /api/projects/generate
  prompt: 原创魂斗罗式2D横版卷轴跑枪游戏，必须是side_scrolling_run_and_gun，玩家奔跑跳跃射击，敌人在地图后段刷新
  -> project_id: proj_20260617_132743_a4b0
  -> run_id: run_20260617_132743_a4b0
  -> status: PLAYABLE_WITH_FALLBACK_ASSETS

Workbench edit:
  input: 敌人不要凭空刷新在玩家面前，是指地图的末端
  -> patch: patch_workbench_24a549a0
  -> affectedPaths: /level/waves/spawn_intro_drone/x, /level/waves/spawn_bridge_drone/x
  -> runtime status: applied_warm_restart
  -> current version: v_patch_workbench_24a549a0
  -> Spawn x: 1200
```

已通过验证：

```txt
npx vitest run tests/workspace/conversation-live-edit-parser.test.ts tests/workspace/workbench-live-edit-client.test.ts tests/workspace/live-edit-pipeline.test.ts tests/contracts/live-edit-capabilities.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/projects-service.test.ts tests/workspace/compiler-service.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/dsl-validator-normalizer.test.ts
  -> passed, 9 files, 238 tests

npx vitest run tests/workspace/projects-service.test.ts tests/workspace/conversation-live-edit-parser.test.ts tests/workspace/game-dsl-provider.test.ts
  -> passed, 3 files, 106 tests

npx vitest run tests/workspace/projects-service.test.ts
  -> passed, 1 file, 34 tests

npm run typecheck:root
  -> passed

git diff --check
  -> passed

Chrome DevTools Workbench verification
  -> Browser plugin unavailable, Chrome DevTools fallback used
  -> new run generated and live edit applied as warm restart
```

审查门禁结论：

- Oracle 初审：P0 无；P1 1 个；P2 1 个；P3 2 个。
- P1 修复：`prepareWorkbenchLiveEdit()` 和 deterministic prepare 现在传入 registry-aware capability report；`DslLiveEditService.prepareLiveEditPatch()` 支持外部 capability report，避免旧 generated runtime 被 direct API / stale client 绕过 Workbench current-state gate。
- P2 修复：generated runtime registry 必须 `runId` 匹配才可信；只有 registry 文件存在、`runId` 匹配但缺旧格式 inventory 时才优先使用 persisted report，registry 文件缺失或 `runId` 错配时使用空 live-edit capability，不再动态放开新字段。
- P3 修复：补 `增加敌人` 仍落 wave count、`敌人不要刷新到地图末端` 不落 `Spawn x` 的 parser regression。
- P3 修复：补 provider regression，确认只归一化 `metadata.description` 中的 source-reference 描述，`metadata.title` 仍因 copyrighted source term 失败。
- Oracle 复审：P0 无；P1 1 个；P2 无；P3 1 个低优先级语义覆盖缺口。
- 复审 P1 修复：generated registry `runId` 错配现在视为不可 target runtime，返回空 live-edit capabilities，不再 fallback persisted report；只有 registry 文件存在、`runId` 匹配但缺旧格式 inventory 时才 fallback persisted report。
- 复审 P1 regression：补 top-down shooter stale registry runId 测试，确认 persisted report 中已有 `/player/physics/maxSpeed` 时仍不会 exposed / prepare。
- Oracle 最终复审：P0/P1/P2 无；P3 文档 fallback 表述偏宽，已修正。
- 审查模式：Oracle 新建 + Oracle 复用复审。

新的剩余范围：

- 当前只支持 wave spawn `x`，不支持复杂 spawn pattern、AI encounter director、随机刷怪权重或多段刷怪曲线。
- `metadata.description` 的 source-reference normalization 只服务模型说明文字；真实 title / label / id / asset 引用仍必须失败，不能被静默清洗。
- 旧 generated project 不回写升级 runtime bridge；它们通过 registry intersection 隐藏不支持字段，新生成 project 才获得新 live-edit capability。
