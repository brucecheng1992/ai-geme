# Step 33 DSL Render Fidelity & Asset Closure

目标：把自然语言生成 / 修改得到的 authoritative DSL 内容，逐步接到可验证的 Scene / Visual IR、asset binding、Phaser runtime 与 QA 证据。本文是 Step 33 的执行拆分与审查记录，不作为“视觉已完整闭环”的提前声明。

## 执行边界

- 保持 DSL-first：模型生成更丰富的 DSL，系统解释和实现 DSL。
- 不让 Workbench 直接写 SSOT。
- 不让自然语言修改直接改 generated Phaser source。
- candidate run 与 active run 隔离，Accept 后才提升 authoritative artifacts。
- `PLAYABLE` 与 render fidelity 分开判断。
- 任何还没有 runtime / asset / QA 证据的能力只能记录为 `defaulted`、`deferred` 或 `unsupported`，不能写成已通过。

## 分步闭环

### 33.1 DSL Consumption Audit

新增 `dsl_consumption_report.json`，回答 authoritative DSL path 在 normalizer、IR、asset pipeline 和 runtime 之前的消费状态。此步骤只建立审计事实与 gate，不改 Phaser 场景渲染。

验收：

- valid generation pipeline 写出 `dsl_consumption_report.json`。
- `pipeline_artifact_index.json` 列出该 artifact。
- `pipeline_acceptance_report.json` 对 `ignoredAuthoritativeCount` 做 P0 gate。
- Workbench Pipeline Evidence 能看到该 artifact ref。

### 33.2 Scene / Visual DSL Contract

把背景、平台视觉、角色外观、敌人类型、关卡主题从自由文本提升为 Raw DSL 中可校验、可编译的结构化字段。

验收：

- schema、prompt context、fixture、normalizer 测试同步更新。
- 不支持的字段 fail closed 或记录为明确 unsupported，不进入静默 fallback。

### 33.3 Executable Scene / Visual IR

新增 `game.scene.ir.json`，从 normalized DSL / runtime plan 生成稳定 scene nodes、runtime IDs 和 provenance。

验收：

- 核心 scene node 具备 DSL path provenance。
- platform collider 与 visual bounds 使用同一 IR 源。
- template-only gameplay-critical object 被 gate 拦截或标记 system-owned。

### 33.4 Asset Intent And Manifest Closure

新增 `asset_intent_manifest.json`，扩展 asset manifest / resolution report 的 required level、fallback reason 和 source DSL path。

验收：

- core/request-required asset fallback 不能进入 `PASSED`。
- source DSL path、required level 和 fallback reason 可被 artifact ref 审计。

### 33.5 Phaser Scene Compiler De-hardcoding

让 side-scrolling Phaser runtime 优先消费 Scene IR / generated manifests，逐步移除 gameplay-critical 的 hard-coded background、platform、enemy、goal。

验收：

- runtime_scene_binding_report 能证明 IR node 到 runtime instance 的绑定。
- 背景层、平台、敌人、目标数量和坐标来自 IR。

### 33.6 Natural-language Amendment Candidate Build

把 Step 32 `GameDesignDelta` 接到 candidate DSL、Scene IR diff、asset diff、candidate preview 与 Accept / Reject / Undo。

验收：

- active artifacts 在 Accept 前不变。
- candidate run asset invalidation 不污染 active run。
- no-op candidate 标记 `AMENDMENT_NO_VISIBLE_EFFECT`。
- Accept / Reject / Undo 都有 artifact checkpoint。

### 33.7 Fallback Policy And Fidelity Status

引入 render fidelity quality status，把 fallback 从实现细节变成产品可见质量状态。

验收：

- `PASSED`、`PASSED_WITH_OPTIONAL_FALLBACKS`、`VISUALLY_DEGRADED`、`FAILED` 由 evidence 派生。
- request-required fallback 不得被标记为 `PASSED`。

### 33.8 Render Fidelity Report And Workbench Evidence

新增 `render_fidelity_report.json` 与 `qa_report.render_fidelity`，接入 screenshot metrics / scene snapshot 证据，并在 Workbench 分开展示 gameplay QA 与 render fidelity。

验收：

- DSL consumption、asset binding、runtime structure、screenshot metrics / scene snapshot evidence 联合决定 requested effect。
- Workbench 不只展示“Visual QA failed”，要展示 expected vs observed。

### 33.9 Final Oracle Closure

对数据合同、编译链路、资源链路、QA 和 Workbench UX 做最终只读审查。

验收：

- P0/P1/P2 全部关闭或明确记录未处理范围。
- 最终扫描和真实 run 证据证明 Step 33 不再停留在文档层。

## 当前执行记录

### 33.1 DSL Consumption Audit

完成时间：2026-06-18

目标：建立 `dsl_consumption_report.json` 的契约、生成、artifact index、acceptance gate 和 Workbench 证据分组。

非目标：

- 不新增 Scene / Visual DSL 字段。
- 不新增 `game.scene.ir.json`。
- 不修改 Phaser runtime rendering。
- 不宣称 request-required visual fidelity 已通过。

实现范围：

- `packages/game-dsl/src/dsl-consumption-report.ts` 新增 DSL consumption report schema、stable DSL hash、path inventory、summary 和显式 path consumption 分类。
- `packages/game-dsl/src/index.ts` 导出 report builder/schema。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 在 DSL validation / normalization 成功后写出 `dsl_consumption_report.json`。
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` 注册 `dslConsumptionReport` artifact。
- `apps/maker-api/src/projects/pipeline-acceptance-report.ts` 新增 `dsl_consumption` 必需 gate，缺失 summary 或 `ignoredAuthoritativeCount > 0` 时失败。
- `apps/maker-workbench/src/pipeline-evidence-client.ts` 在 DSL evidence group 中暴露 `dslConsumptionReport`。
- `tests/contracts/dsl-consumption-report.test.ts` 覆盖 side-scrolling 报告、unsupported optional domains、父路径不能隐藏子路径、非 side-scrolling gravity refs、player action 子路径分类。
- `tests/workspace/*` 同步覆盖 generation pipeline、artifact index、acceptance report、Workbench evidence client 和 golden trace。

已关闭的审查问题：

- `/player/**`、`/entities/**`、`/world/**` 不再使用宽泛 compiled 父路径兜底。
- side-scrolling 与非 side-scrolling 的 `runtime_plan` refs 分开，非 side-scrolling `world.gravity` 不指向 side-scrolling runtime。
- collision effect 只将当前 runtime 明确消费的 `damage` / `score_add` 标为 compiled，`heal` 等 effect 保持 unsupported。
- player action `spawns` / `cooldown_ms` 只在 `shoot_projectile + side_scrolling_run_and_gun` 下标为 compiled，其他 action/profile 保持 unsupported。

验证：

- `npx vitest run tests/contracts/dsl-consumption-report.test.ts`：5 tests passed。
- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `npm test`：contracts 45 files / 529 tests passed；workspace 31 files / 361 tests passed。

Oracle 只读审查：

- 第一轮指出 P0/P1：compiled 父路径会隐藏 `/player`、`/entities` 子路径，coverage 把 deferred/unsupported 计入，非 side-scrolling report 带 side-scrolling refs。
- 第二轮指出 P0/P1/P2：`/entities/<index>/**`、`/world/gravity`、collision effect 仍存在 false compiled 或缺少 regression。
- 第三轮指出 P0：top-down entity 与 collision effect 子路径仍有宽泛 compiled 风险。
- 第四轮指出 P0：`/player/**` 仍有宽泛 compiled 兜底。
- 最终复审结论：P0/P1/P2/P3 无；同意 Step 33.1 代码门通过。

当前停点：

- 33.1 已完成文档、实现、验证、Oracle 代码门闭环。
- 33.2 已另行完成；不得把 33.1 的审计通过解释成 render fidelity 已完成。

### 33.2 Scene / Visual DSL Contract

完成时间：2026-06-18

目标：先为 `side_scrolling_run_and_gun` 建立可校验的 Scene / Visual DSL contract，让背景层、平台视觉、玩家视觉、敌人 archetype 视觉 / 行为引用、scene enemy instances 和 goal 进入 Raw DSL 的结构化字段。

非目标：

- 不编译 `game.scene.ir.json`。
- 不让 Phaser runtime 消费 `scenes`。
- 不引入 asset intent manifest。
- 不宣称自然语言 amendment 已能真实改变画面。

实现范围：

- `packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts` 新增 `player.visual`、`enemyTypes[].visual`、`behaviorRef`、`colliderRef`、`weaponRef`、`movementRef`、`tags`，以及顶层 `scenes[]` contract。
- `scenes[]` 当前只允许 `side_scrolling_run_and_gun` 使用；非 side-scrolling profile 使用会 fail closed。
- schema 层校验 scene shape、bounds、reach goal 坐标和局部 geometry；引用解析收敛到 validator。
- `packages/game-dsl/src/dsl-validator.ts` 增加 scene 引用校验：`enemyInstances[].archetypeRef`、`enemyInstances[].spawnRule`、`goal.entityRef` 返回稳定 `UNRESOLVED_REFERENCE`；scene / node duplicate id 返回 `DUPLICATE_ID`。
- `packages/game-dsl/src/dsl-consumption-report.ts` 将 `/scenes/**`、`/player/visual/**`、`/enemyTypes/*/visual`、`behaviorRef`、`colliderRef`、`weaponRef`、`movementRef`、`tags` 明确记录为 `deferred`，避免被旧 compiled 父路径兜底吞掉。
- `apps/maker-api/src/model-provider/prompt-context.builder.ts` 更新 side-scrolling `valid_example`、scene / visual allowed enums、scene DSL 生成 guidance，并从 `forbidden_terms` 移除裸 `scene`。
- `apps/maker-api/src/model-provider/prompt-context.types.ts` 同步 scene / visual allowed enum 类型。
- `tests/contracts/scene-dsl.test.ts` 覆盖 valid scene contract、`scene_` ref 合法、missing archetype、missing spawnRule、missing goal entityRef、hazard destroy false pass、duplicate scene node id、越界 platform、非 side-scrolling profile 拒绝。
- `tests/workspace/game-dsl-provider.test.ts` 覆盖 prompt context 不再禁止 `scene`、side-scrolling valid example 包含 visual / scenes，并可通过 `RawGameDslSchema`。

验证：

- `npx vitest run tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-dsl.test.ts tests/contracts/dsl-consumption-report.test.ts`：3 files / 81 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：46 files / 537 tests passed。
- `npm run test:workspace`：31 files / 361 tests passed。

Oracle 只读审查：

- 第一轮指出 P1：`enemyInstances[].spawnRule`、`goal.entityRef` 会悬空通过 validation。
- 第一轮指出 P2：裸 `scene` 禁词会误伤正式 scene ref；scene ref 错误语义应是 `UNRESOLVED_REFERENCE`。
- 第二轮指出 P2：`destroy` goal 不应把 generic `hazard` 当 enemy 目标放行；指出 P3：duplicate scene/node id 不应误映射为 `INVALID_ID_FORMAT`。
- 文档门指出 33.2 验收包含 `prompt context`，因此补齐 prompt context 的 scene / visual contract、allowed enums、valid example 和测试。
- 最终复审结论：P0/P1/P2/P3 无；同意 Step 33.2 代码门通过。

当前停点：

- 33.2 已完成 DSL contract、validator、consumption audit、contract tests 和 Oracle 代码门闭环。
- 33.3 已在下节继续完成；从 `game.scene.ir.json`、stable runtime IDs 和 DSL provenance 开始。

### 33.3 Executable Scene / Visual IR

完成时间：2026-06-18

目标：为 `side_scrolling_run_and_gun` 生成可审计的 `game.scene.ir.json`，把 DSL-authored scene contract 或现有 runtime plan 转成稳定 scene nodes、runtime IDs 和 provenance，并接入 artifact index、acceptance report 与 Workbench evidence refs。

非目标：

- 不让 Phaser runtime 消费 `game.scene.ir.json`。
- 不移除 side-scrolling runtime 内的 hard-coded scene construction。
- 不新增 `asset_intent_manifest.json`。
- 不改变 natural-language amendment 的 candidate / accept / reject 流程。
- 不宣称 render fidelity 已通过；33.3 只提供 Scene IR source-of-truth artifact 和 refs。

实现范围：

- `packages/game-dsl/src/scene-ir.ts` 新增 `SceneIrSchema` 与 `buildSceneIr()`。
- DSL-authored `scenes[0]` 生成 `source: dsl_scene_contract`，保留 background、platform、player spawn、enemy instance、goal 的 DSL provenance。
- legacy side-scrolling DSL 未提供 `scenes` 时生成 `source: runtime_plan_derived`，runtime/template/system derived 内容使用 `runtime_plan` 或 `system` provenance，不伪装成 DSL-authored。
- DSL-authored enemy instance runtime ID 使用 `entity.enemy.<id>`，避免合法 `enemyInstances[].id === 'player'` 覆盖固定玩家 `entity.player` provenance。
- `apps/maker-api/src/compiler/compiler.types.ts` 与 `template-compiler.service.ts` 允许 compiler 接收 `rawDsl`，side-scrolling compile 写出 generated-project 根目录下的 `game.scene.ir.json` 并列入 `files`。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 将 validation 后的 `rawDsl` 传入 compiler，保证真实 generation pipeline 可以写出 DSL-authored Scene IR。
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` 注册 `sceneIr` artifact：side-scrolling compile files 下 required/present；非 side profile skipped/non-required；invalid / unsupported path 只写 skipped ref，不读取 stale generated-project。
- `apps/maker-api/src/projects/pipeline-acceptance-report.ts` 新增 `scene_ir` check，只基于 artifact ref 做 required/present 判定。
- `apps/maker-workbench/src/pipeline-evidence-client.ts` 在 Runtime evidence group 中暴露 `sceneIr` artifact ref。
- `tests/contracts/scene-ir.test.ts` 覆盖 DSL-authored Scene IR、legacy runtime-plan-derived Scene IR、无 `rawDsl` 时 goal provenance 不误标 DSL、enemy id `player` 时 provenance 不碰撞。
- `tests/workspace/*` 同步覆盖 compiler output、artifact index、acceptance report、Workbench evidence、generation pipeline 和 golden trace。

已关闭的审查问题：

- Oracle 第一轮指出 P1：无 `rawDsl` 的 direct compiler path 会把 runtime-plan-derived goal provenance 固定标为 `source: dsl` / `/objectives/win`。已修复为无 `rawDsl` 时使用 `source: runtime_plan` / `/runtime_plan/side_scrolling/winCondition`，并补 `buildSceneIr({ ir })` regression。
- Oracle 第二轮指出 P1：DSL-authored enemy instance `id: player` 会生成 `entity.player`，覆盖 player provenance。已修复为 enemy instance 使用 `entity.enemy.<id>` runtime namespace，并补 provenance collision regression。

验证：

- `npx vitest run tests/contracts/scene-ir.test.ts`：1 file / 4 tests passed。
- `npx vitest run tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/projects-service.test.ts`：7 files / 96 tests passed。
- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `npm run test:workspace`：31 files / 362 tests passed。
- `npm run test:contracts`：47 files / 541 tests passed。

Oracle 只读审查：

- 第一轮代码门：P1，runtime-plan-derived goal provenance 误标 DSL；修复后复审。
- 第二轮代码门：P1，enemy instance runtime ID 与 player provenance key 碰撞；修复后复审。
- 最终代码门复审结论：P0/P1/P2/P3 无；同意 Step 33.3 代码门通过。
- 文档门复审结论：P0/P1/P2/P3 无；同意 Step 33.3 文档门通过。

当前停点：

- 33.3 已完成 Scene IR artifact、compiler output、artifact index、acceptance check、Workbench evidence ref、contract / workspace tests 和 Oracle 代码门闭环。
- 33.4 下一步从 `asset_intent_manifest.json`、required asset fallback policy 和 source DSL path 开始；candidate run asset invalidation 留给 33.6 amendment candidate build。

### 33.4 Asset Intent And Manifest Closure

完成时间：2026-06-18

目标：新增 `asset_intent_manifest.json`，把 `AssetPlan` 与 DSL-authored Scene IR visual refs 派生为可审计的 asset intent、`requiredLevel`、`sourceDslPaths`、fallback policy 和 cache key，并让 acceptance 对 `core_required` / `request_required` fallback 或 missing resolution fail closed。

非目标：

- 不接真实 generated asset provider。
- 不让 Phaser runtime 消费 `asset_intent_manifest.json` 或 Scene IR。
- 不实现 natural-language amendment candidate assets、Accept、Reject 或 Undo。
- 不新增 render fidelity QA、截图 diff 或 visual fidelity status。
- 不宣称 side-scrolling 当前 template fallback 已满足 render fidelity。

实现范围：

- `packages/asset-pipeline/src/asset-intent-manifest.ts` 新增 `AssetIntentManifestSchema`、`buildAssetIntentManifest()` 和 `summarizeAssetIntentResolutionFallbacks()`。
- `asset_intent_manifest.json` 从 `asset_plan.json` 生成；当 33.3 `sceneIr` 为 `dsl_scene_contract` 时，枚举 `backgrounds[]`、`platforms[]`、`player`、`enemyInstances[]`、`goals[]` 的 visual refs。
- 能映射当前 runtime asset slot 的 visual refs 绑定到 `background_main`、`tileset`、`player`、`enemy`；额外 background / platform / enemy 和 goal visual 生成 standalone `request_required` intent。
- 同一个 `assetIntentRef` 多处复用时按 id 合并，`sourceDslPaths` 做 union，不重复生成 intent，也不丢 DSL path。
- `AssetIntentIdSchema` / standalone `assetPlanId` 对齐 33.2 `SceneRefSchema`，允许合法 `.` / `-` refs。
- `packages/asset-pipeline/src/writer.ts` 写出 `asset_intent_manifest.json` 并列入 compile files。
- `apps/maker-api/src/compiler/template-compiler.service.ts` 将 side-scrolling `sceneIr` 传入 asset pipeline。
- `apps/maker-api/src/compiler/asset-pipeline-report.ts` 把 `assetIntentManifest` 纳入 asset pipeline report artifacts 和 compile file 检查。
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` 注册 `assetIntentManifest` artifact；valid path present/missing 基于 compile files，invalid / unsupported path 为静态 skipped ref。
- `apps/maker-api/src/projects/pipeline-acceptance-report.ts` 新增 `asset_intent_resolution` required check。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 读取 `asset_intent_manifest.json` 与 `asset_resolution_report.json`，用同一 summary 函数统计 `core_required` / `request_required` fallback 或 missing resolution。
- `apps/maker-workbench/src/pipeline-evidence-client.ts` 在 Assets evidence group 中展示 `assetIntentManifest` ref。
- `tests/contracts/asset-intent-manifest.test.ts` 覆盖 request-required Scene visual refs、goal visual、额外 background / platform / enemy、重复 visual ref 合并、dot/hyphen SceneRef、missing resolution blocking、legacy plan-only core-required intents。
- `tests/workspace/*` 同步覆盖 compiler output、asset pipeline report、artifact index、acceptance gate、Workbench evidence、golden trace 和 generation pipeline fixtures。

已关闭的审查问题：

- Oracle 第一轮指出 P0：只采第一个 background / platform / enemy，漏掉 goal visual 和额外 visual refs，会隐藏 request-required intent。已改为枚举所有 Scene IR visual refs，standalone missing resolution 计入 blocking fallback。
- Oracle 第二轮指出 P1：复用同一 `assetIntentRef` 会 duplicate fail 或丢 source path。已按 intent id 合并 refs 并 union `sourceDslPaths`。
- Oracle 第三轮指出 P1：asset intent id schema 比 33.2 `SceneRefSchema` 更窄，会拒绝合法 `.` / `-` refs。已对齐字符集与长度，并补 dot/hyphen regression。

验证：

- `npx vitest run tests/contracts/asset-intent-manifest.test.ts`：1 file / 3 tests passed。
- `npx vitest run tests/workspace/compiler-service.test.ts tests/workspace/asset-pipeline-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts`：7 files / 68 tests passed。
- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `npm run test:contracts`：48 files / 544 tests passed。
- `npm run test:workspace`：31 files / 363 tests passed。

Oracle 只读审查：

- 第一轮代码门：P0，漏采 goal / extra Scene visual refs；修复后复审。
- 第二轮代码门：P1，复用同一 visual ref 不合并 source paths；修复后复审。
- 第三轮代码门：P1，SceneRef 合法字符集与 AssetIntent schema 不一致；修复后复审。
- 最终代码门复审结论：P0/P1/P2/P3 无；同意 Step 33.4 代码门通过。
- 文档门复审结论：P0/P1/P2/P3 无；同意 Step 33.4 文档门通过。

当前停点：

- 33.4 已完成 asset intent manifest、compiler output、artifact index、acceptance gate、Workbench evidence ref、contract / workspace tests 和 Oracle 代码门闭环。
- candidate run asset invalidation 未在 33.4 实现；按 Step 33 拆分留给 33.6 amendment candidate build。
- 33.5 下一步从 Phaser side-scrolling runtime 消费 Scene IR / generated manifests、减少 gameplay-critical hard-coded scene construction 开始。

### 33.5 Phaser Scene Compiler De-hardcoding

完成时间：2026-06-18

目标：让 `side_scrolling_run_and_gun` template runtime 消费 33.3 生成的 Scene IR，使用同一份 `scene-ir.generated.json` 投影背景、平台、玩家 spawn、敌人 spawn 和 goal，并在 QA snapshot 观测后回写 `runtime_scene_binding_report.json`，作为 Scene IR node 到 runtime instance 的审计证据。

非目标：

- 不重写 combat / projectile / health / live-edit bridge；这些仍由 `runtime-plan.generated.json` 提供数值基线。
- 不接真实 generated asset provider，也不改变 33.4 的 asset fallback policy。
- 不新增 browser screenshot diff、render fidelity quality status 或 QA 后 render fidelity report；这些留给 33.7 / 33.8。
- 不实现 natural-language amendment candidate、Accept、Reject、Undo 或 candidate run asset invalidation；这些留给 33.6。

实现范围：

- `packages/game-dsl/src/scene-ir.ts` 为 runtime-plan-derived enemy instance 保留 `count`，避免原 runtime wave count 在 Scene IR 投影时被压成 1。
- `templates/phaser/side_scrolling_run_and_gun/src/side-scrolling-scene-ir.ts` 新增 `resolveSideScrollingRuntimeSliceWithSceneIr()`，从 Scene IR 投影 runtime slice 的 world / camera / backgrounds / platforms / player spawn / waves / goals，并返回 `bindingState`。
- unsupported runtime goal kind 不再静默映射为 `enemy_cleared`；runtime 保留基线 win condition，并把该 goal binding 标记为 `unbound` / `unsupported_goal_kind`。
- `templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts` 支持 optional `sceneBindingState`，QA snapshot 暴露 `backgrounds`、`platforms`、`goals` 和 `sceneBindings`；enemy wave 支持 Scene IR 派生的 `spawnY`。
- `templates/phaser/side_scrolling_run_and_gun/src/main.ts` 导入 `scene-ir.generated.json`，用 Scene IR 投影后的 `sideScrollingRuntimeSlice` 创建 runtime；`runtime-plan.generated.json` 只保留 combat / physics 数值基线。
- `templates/phaser/side_scrolling_run_and_gun/template-manifest.json` 声明新增 source file 和 `scene-ir.generated.json`。
- `packages/game-dsl/src/runtime-capabilities.ts` 为 side-scrolling 注册 generated `sceneIr` template artifact 和 helper source。
- `apps/maker-api/src/compiler/runtime-scene-binding-report.ts` 新增 `RuntimeSceneBindingReportSchema`、`buildRuntimeSceneBindingReport()`、`buildRuntimeObservedSceneBindingReport()` 和 writer；compile 阶段 report 为 pending/fail，只有 QA snapshot 观测到 matching binding 后才 pass。
- `apps/maker-api/src/compiler/template-compiler.service.ts` 同时写 root `game.scene.ir.json`、template 内 `side_scrolling_run_and_gun/src/scene-ir.generated.json` 和 `runtime_scene_binding_report.json`，并列入 compile files。
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` 注册 `runtimeSceneBindingReport`；side-scrolling required，非 side-scrolling optional skipped，invalid / unsupported path 静态 skipped。
- `apps/maker-api/src/projects/pipeline-acceptance-report.ts` 新增 `runtime_scene_binding` gate；side-scrolling report missing、status fail 或 `unboundCount > 0` 会 fail closed。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 在 QA 后用 `qaReport.snapshot.sceneBindings` 回写 observed `runtime_scene_binding_report.json`，再读取 status / unbound count 并校验 identity。
- `apps/maker-workbench/src/pipeline-evidence-client.ts` 在 Runtime evidence group 展示 `runtimeSceneBindingReport` ref。
- `tests/contracts/phaser-templates.test.ts` 覆盖 template declaration、Scene IR -> runtime slice 投影、runtime snapshot `sceneBindings`、runtime-plan-derived wave count、unsupported goal fail-closed 和旧 side-scrolling runtime 行为。
- `tests/workspace/runtime-scene-binding-report.test.ts` 覆盖 compile-stage report 不能静态 pass，以及 QA snapshot observed bindings 才能生成 pass report。
- `tests/workspace/*` 同步覆盖 compiler output、artifact index、acceptance gate、Workbench evidence、golden trace 和 generation pipeline fixtures。

验证：

- RED：`npx vitest run tests/contracts/phaser-templates.test.ts --testNamePattern "generated Scene IR"` 先失败于缺少 `scene-ir.generated.json` import。
- RED：`npx vitest run tests/workspace/compiler-service.test.ts --testNamePattern "side-scrolling run-and-gun"` 先失败于缺少 `side_scrolling_run_and_gun/src/scene-ir.generated.json`。
- RED：`npx vitest run tests/contracts/phaser-templates.test.ts --testNamePattern "wave counts|unsupported runtime goals"` 先失败于 Scene IR wave count 被投影为 1。
- RED：`npx vitest run tests/workspace/runtime-scene-binding-report.test.ts` 先失败于 compile-stage `runtime_scene_binding_report.json` 静态 pass。
- `npx vitest run tests/contracts/phaser-templates.test.ts`：1 file / 42 tests passed。
- `npx vitest run tests/workspace/compiler-service.test.ts`：1 file / 11 tests passed。
- `npx vitest run tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts`：3 files / 20 tests passed。
- `npx vitest run tests/workspace/generation-pipeline.service.test.ts --testNamePattern "runtime scene binding"`：1 test passed，真实 compiler + fake QA snapshot 回写 observed runtime binding report。
- `npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-golden-trace.test.ts`：2 files / 34 tests passed。
- `npx vitest run tests/contracts/phaser-templates.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts`：3 files / 49 tests passed。
- `npx vitest run tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-golden-trace.test.ts`：7 files / 66 tests passed。
- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `npm run test:workspace`：32 files / 366 tests passed。
- `npm run test:contracts`：48 files / 546 tests passed。

已关闭的审查问题：

- Oracle 第一轮指出 P0：`runtime_scene_binding_report.json` 是 compiler 静态自证 pass，acceptance 会 false pass。已改为 compile 阶段 pending/fail，QA snapshot observed bindings 回写后才 pass，并补 `runtime-scene-binding-report` 与 generation pipeline 回写测试。
- Oracle 第一轮指出 P0：runtime-plan-derived wave count 被 Scene IR 投影成每个 wave 1 个敌人。已在 Scene IR enemy instance 保留 `count` 并由 template resolver 使用。
- Oracle 第一轮指出 P1：`destroy` / `collect` / `survive` goal 被静默映射为 `enemy_cleared`。已改为保留 runtime 基线并把 unsupported goal binding 标记 unbound，交给 acceptance fail closed。

Oracle 只读审查：

- 第一轮代码门：P0，runtime binding report 静态自证 pass；P0，runtime-plan-derived wave count 回归；P1，unsupported goal 静默映射；修复后复审。
- 代码门复审结论：P0/P1/P2/P3 无；同意 Step 33.5 代码门通过。
- 文档门复审结论：P0/P1/P2/P3 无；同意 Step 33.5 文档门通过。

当前停点：

- 33.5 已完成 side-scrolling runtime 消费 Scene IR、generated artifact、runtime binding report、artifact index、acceptance gate、Workbench evidence ref、contract / workspace tests。
- 33.6 下一步从 natural-language amendment candidate DSL、Scene IR diff、asset diff、candidate preview 和 Accept / Reject / Undo 隔离开始。

### 33.6 Natural-language Amendment Candidate Build

完成时间：2026-06-18

目标：把 Step 32 `candidate_regeneration` 接到 candidate DSL、Scene IR diff、asset intent diff、candidate run artifact 和 Accept / Reject / Undo artifact checkpoint；Accept 前 active run / active artifacts 不被 candidate preview 污染，no-op candidate fail closed。

非目标：

- 不实现 render fidelity quality status；留给 33.7。
- 不实现 screenshot diff、`render_fidelity_report.json` / `qa_report.render_fidelity` 或 Workbench expected vs observed；留给 33.8。
- 不让自然语言 amendment 直接修改 generated Phaser source。
- 不把 candidate promotion 解释成 runtime / QA observed success。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts` 新增 candidate artifact builder：从 base DSL / candidate DSL 生成 `candidate_dsl_diff.json`，并为 side-scrolling 生成 `candidate_scene_ir.json`、`candidate_scene_ir_diff.json`、`candidate_asset_intent_manifest.json`、`candidate_asset_diff.json`。
- player theme candidate 不再只改 `player.label`；同步写入 `sourceDsl.player.visual.assetIntentRef = player_cat`，让 Scene IR / asset intent 有可审计的 visual change。
- side-scrolling visible-effect gate 只认 Scene IR / asset diff；非 side-scrolling 保留旧 DSL diff 兼容。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts` 的 candidate preview 写入 candidate artifact sandbox；有可见变化时才创建 `run_candidate_*`，并在 candidate run model outputs 写入 `game_dsl.json`、`game.scene.ir.json`、`asset_intent_manifest.json`、`runtime_capability_report.json`。
- no-op candidate 写出 diff / preview evidence 后返回 `reviewState: failed` 与 `failureReason: AMENDMENT_NO_VISIBLE_EFFECT`，不创建 candidate run。
- Accept / Reject / Undo 日志与 undo checkpoint 增加 `candidateArtifactCheckpoint`，记录 candidate DSL、Scene IR、asset manifest / diff、candidate run 和 capability report refs，并固定 `activeRunMutation: false`。
- `apps/maker-api/src/projects/dsl-live-edit.service.ts` 的 `ensureLiveVersion()` 初始化 live current 时只写 `live/current_version.json`，不重写 active `game_dsl.json`，避免 Accept 前改变 active artifact 序列化。
- `packages/game-dsl/src/scene-ir.ts` 让 runtime-plan-derived Scene IR 也保留 `/player/visual` 的 `assetIntentRef`。
- `packages/asset-pipeline/src/asset-intent-manifest.ts` 不再要求 `sceneIr.source === dsl_scene_contract` 才采集 Scene IR visual refs；runtime-plan-derived player visual ref 也会生成 request-required asset intent。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts` 与 `semantic-amendment.types.ts` 注册新增 candidate artifact refs。
- `apps/maker-workbench/src/features/semantic-amendments/semanticAmendmentClient.ts` 同步 API response 类型。
- `tests/workspace/semantic-amendment-service.test.ts` 覆盖 side-scrolling candidate Scene / asset artifacts、active artifact 隔离、no-op gate、legacy side-scrolling 无 `scenes[]` visual candidate、Accept / Reject / Undo checkpoint。

验证：

- RED：`npx vitest run tests/workspace/semantic-amendment-service.test.ts --testNamePattern "side-scrolling candidate|no-op player theme|player theme candidate run|rejects a previewed player theme"` 先失败于缺少 Scene / asset artifacts、缺少 checkpoint、no-op 未 fail closed。
- `npx vitest run tests/workspace/semantic-amendment-service.test.ts --testNamePattern "player theme candidate run|side-scrolling candidate|legacy side-scrolling|no-op player theme"`：4 tests passed。
- `npx vitest run tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts`：2 files / 7 tests passed。
- `npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/workspace/semantic-amendment-service.test.ts apps/maker-workbench/src/features/semantic-amendments/__tests__/semanticAmendmentClient.test.ts`：5 files / 40 tests passed。
- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `npm run test:workspace`：32 files / 369 tests passed。
- `npm run test:contracts`：48 files / 546 tests passed。

已关闭的审查问题：

- Oracle 第一轮指出 P1：candidate accept 在没有 runtime / QA observed 证据时把 `runtimeNoException` 与 `previewBooted` 标成 `true`。已改为 candidate preview / accept 只写 `schemaValid`，不提前声明 runtime / preview success，并补 regression。
- Oracle 第一轮指出 P1：legacy side-scrolling 无 `scenes[]` 时可能把真实 player visual change 判成 `AMENDMENT_NO_VISIBLE_EFFECT`。已让 runtime-plan-derived Scene IR 保留 player visual ref，并让 asset intent manifest 采集该 ref；补无 `scenes[]` regression。

Oracle 只读审查：

- 第一轮代码门：P1，candidate accept 伪造 runtime / preview true；P1，legacy side-scrolling 无 `scenes[]` false no-op；修复后复审。
- 代码门复审结论：P0/P1/P2/P3 无；同意 Step 33.6 代码门通过。
- 文档门复审结论：P0/P1/P2/P3 无；同意 Step 33.6 文档门通过。

当前停点：

- 33.6 已完成 natural-language amendment candidate DSL、Scene IR diff、asset diff、candidate preview、Accept / Reject / Undo checkpoint、active/candidate 隔离、no-op gate 和 legacy side-scrolling visual candidate regression。
- 33.7 下一步从 fallback policy 与 render fidelity quality status 开始；不得把 33.6 candidate promotion 解释成 render fidelity QA 已通过。

### 33.7 Fallback Policy And Fidelity Status

完成时间：2026-06-18

目标：把 render fidelity quality status 提升为 `pipeline_acceptance_report.json` 的可审计产品状态，并由 asset intent fallback、runtime Scene binding、asset binding trace 和 asset library usage evidence 派生；request-required fallback 不能被标为 `PASSED`。

非目标：

- 不新增 screenshot diff、`render_fidelity_report.json` / `qa_report.render_fidelity` 或 expected vs observed 解释；留给 33.8。
- 不改变 Phaser runtime 渲染行为。
- 不把 `PLAYABLE` / `previewable` 与 render fidelity status 合并。
- 不让 optional fallback 伪装成 full fidelity pass。

实现范围：

- `apps/maker-api/src/projects/pipeline-acceptance-report.ts` 新增 `renderFidelity` contract，状态枚举为 `PASSED`、`PASSED_WITH_OPTIONAL_FALLBACKS`、`VISUALLY_DEGRADED`、`FAILED`。
- `PipelineAcceptanceReportSchema` 校验 `renderFidelity.status` 必须由 evidence 派生，手工把 request-required fallback 报告改成 `PASSED` 会被 schema 拒绝。
- `renderFidelity` 派生输入包含 core/request/optional fallback count、runtime unbound count、asset binding status 和 asset library status；required render-fidelity check 失败或 skipped 时 status 为 `FAILED`。
- `packages/asset-pipeline/src/asset-intent-manifest.ts` 的 `summarizeAssetIntentResolutionFallbacks()` 新增 `optionalFallbackCount`，把 optional fallback 与 core/request-required blocking fallback 分开。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 读取 `asset_intent_manifest.json` 与 `asset_resolution_report.json` 后把 optional fallback summary 传入 acceptance report。
- `apps/maker-workbench/src/workbench-api.ts` 与 `apps/maker-workbench/src/pipeline-acceptance-client.ts` 同步 `renderFidelity` type，并在 Pipeline Acceptance 面板展示 sanitized status / reason。
- `tests/workspace/projects-service.test.ts` 更新手写 acceptance report fixture，保证 API 边界测试仍验证新 schema。

验证：

- RED：`npx vitest run tests/workspace/pipeline-acceptance-report.test.ts tests/contracts/asset-intent-manifest.test.ts tests/workspace/workbench-pipeline-acceptance-client.test.ts` 先失败于缺少 `renderFidelity`、缺少 optional fallback summary 和 Workbench 展示。
- `npx vitest run tests/workspace/pipeline-acceptance-report.test.ts tests/contracts/asset-intent-manifest.test.ts tests/workspace/workbench-pipeline-acceptance-client.test.ts`：3 files / 22 tests passed。
- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `npx vitest run tests/contracts/scene-dsl.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/dsl-consumption-report.test.ts`：4 files / 21 tests passed。
- `npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/workbench-pipeline-acceptance-client.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/semantic-amendment-service.test.ts`：6 files / 81 tests passed。
- `npx vitest run tests/workspace/projects-service.test.ts`：34 tests passed。
- `npm run test:contracts`：48 files / 547 tests passed。
- `npm run test:workspace`：32 files / 370 tests passed。

已关闭的审查问题：

- 完整 workspace 第一次回归发现 `ProjectsService` 手写旧版 `pipeline_acceptance_report.json` fixture 缺少 `renderFidelity`，导致 schema 先于 identity check 拒绝。已更新 fixture，使身份校验和 unsafe boundary 测试继续覆盖真实边界。

Oracle 只读审查：

- 代码门结论：P0/P1/P2/P3 无；同意 Step 33.7 代码门通过。

当前停点：

- 33.7 已完成 evidence-derived render fidelity quality status、optional fallback count、request-required fallback fail-closed gate 和 Workbench Pipeline Acceptance 展示。
- 33.8 下一步从 screenshot metrics / scene snapshot evidence、`render_fidelity_report.json` / `qa_report.render_fidelity` 和 Workbench expected vs observed 开始；不得把 33.7 的 status contract 解释成截图级 render fidelity QA 已完成。

### 33.8 Render Fidelity Report And Workbench Evidence

完成时间：2026-06-18

目标：把 QA 后的 screenshot metrics、scene snapshot、DSL consumption、asset binding trace 与 runtime scene binding 聚合成真实 `render_fidelity_report.json`，同步写入 `qa_report.render_fidelity`、artifact index、pipeline acceptance 和 Workbench QA / evidence UI；report 缺席时 render fidelity 不能被标为 `PASSED`。

非目标：

- 不实现像素级截图 diff 或 goldens 比对。
- 不改变 QA runner 的 Playwright 行为。
- 不把 `renderFidelity.status === FAILED` 等同于 `overallStatus === fail`；overall / previewable 仍由 required pipeline checks 派生。
- 不新增新的 runtime 模板能力或 asset 生成策略。

实现范围：

- `apps/maker-api/src/qa/render-fidelity-report.ts` 新增 `render-fidelity-report.v1` contract，聚合 `dsl_consumption`、`asset_binding`、`runtime_structure`、`screenshot`、`scene_snapshot` checks。
- `render_fidelity_report.json` 的 status 从 checks 派生：任一 fail 为 `FAILED`，任一 warn 为 `VISUALLY_DEGRADED`，否则 `PASSED`；expected / observed / missing / evidence refs 都写入报告。
- `apps/maker-api/src/projects/generation-pipeline.service.ts` 在 QA 完成后先写 observed `runtime_scene_binding_report.json`，再写 `render_fidelity_report.json`，再把 summary 注入 `qa_report.render_fidelity`，最后重写 artifact index 与 pipeline acceptance。
- `apps/maker-api/src/projects/pipeline-artifact-index.ts` 新增 `renderFidelityReport` artifact ref，valid / invalid DSL / runtime unsupported 路径都给出可解释状态。
- `apps/maker-api/src/projects/pipeline-acceptance-report.ts` 新增 `render_fidelity_report` check；report `FAILED` 让 `renderFidelity.status` fail-closed，report `VISUALLY_DEGRADED` / `PASSED_WITH_OPTIONAL_FALLBACKS` 降级为 warning evidence。
- Oracle 复审后补强：当 `render_fidelity_report.json` artifact 不可用时，`render_fidelity_report` check 即使是 non-required 也标为 `fail`，使 `renderFidelity.status` 派生为 `FAILED`；同时保持 `overallStatus` / `previewable` 不被 non-required report 阻断。
- `apps/maker-workbench/src/QaStatusPanel.tsx` 显示 Render fidelity status / reason / expected / observed / missing，并保持 sanitized HTML 输出。
- `apps/maker-workbench/src/pipeline-evidence-client.ts` 把 `renderFidelityReport` 放入 Build / QA / Preview evidence group，Workbench 能从 artifact index 找到报告。
- `apps/maker-workbench/src/workbench-api.ts`、`apps/maker-api/src/qa/qa.types.ts` 同步 `render_fidelity` API 类型。

验证：

- RED：`npx vitest run tests/workspace/render-fidelity-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/workbench-qa-status-panel.test.tsx` 先失败于缺少 report builder、artifact ref、acceptance check 与 Workbench 展示。
- `npx vitest run tests/workspace/render-fidelity-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/workbench-qa-status-panel.test.tsx`：5 files / 26 tests passed。
- `npx vitest run tests/workspace/render-fidelity-report.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/generation-pipeline.smoke.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts`：5 files / 50 tests passed。
- `npx vitest run tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/workbench-pipeline-acceptance-client.test.ts tests/workspace/workbench-qa-status-panel.test.tsx tests/workspace/projects-service.test.ts tests/workspace/playwright-qa-runner.test.ts`：5 files / 83 tests passed。
- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `npm run test:contracts`：48 files / 547 tests passed。
- `npm run test:workspace`：34 files / 375 tests passed。
- `git diff --check`：passed。

已关闭的审查问题：

- Oracle 第一轮指出 P1：`renderFidelityReport` 是 non-required artifact，缺失时 `buildArtifactCheck()` 返回 skipped，可能让 `renderFidelity.status` 在没有 screenshot metrics / scene snapshot / `render_fidelity_report.json` 的情况下推成 `PASSED`。已改为 `buildRenderFidelityReportCheck()` 对 report 不可用返回 non-required fail check，并补 `fails render fidelity when the render fidelity report is unavailable` regression：其他 evidence 全 pass、report 缺席时 `overallStatus` / `previewable` 仍 pass/true，但 `renderFidelity.status` 必须为 `FAILED`。

Oracle 只读审查：

- 第一轮代码门：P1，report unavailable 仍可能 render fidelity `PASSED`；修复后复审。
- 代码门复审结论：P0/P1/P2/P3 无；同意 Step 33.8 代码门通过。

当前停点：

- 33.8 已完成 QA 后 `render_fidelity_report.json`、`qa_report.render_fidelity`、artifact index、pipeline acceptance、Workbench QA panel 和 evidence group 接线；report 缺席 fail-closed regression 已补。
- 33.9 下一步只做 Step33 final closure：最终验证、Oracle 总审、文档收口；不得再扩展新功能。

### 33.9 Final Oracle Closure

完成时间：2026-06-18

目标：对 Step33 的 DSL contract、Scene IR、asset intent、runtime binding、semantic amendment candidate、QA/render fidelity、artifact index、acceptance report、Workbench UI/API 和文档记录做最终闭环确认；完成后停止，不再扩展新功能。

非目标：

- 不新增 pixel / golden screenshot diff。
- 不新增 runtime 模板能力、asset 生成策略或 provider fallback。
- 不新增 amendment 操作能力。
- 不做提交、push 或发布。

最终验证：

- `npm run typecheck:root`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-api`：passed。
- `npm run typecheck --workspace @ai-game-maker/maker-workbench`：passed。
- `git diff --check`：passed。
- `npm run test:contracts`：48 files / 547 tests passed。
- `npm run test:workspace`：34 files / 375 tests passed，覆盖 `generation-pipeline.smoke` 与 `playwright-qa-runner`。

Oracle 总审结论：

- P0/P1/P2/P3 无。
- 总审确认 Step33 当前工作区改动是闭环的：DSL schema / prompt context、validator、DSL consumption、Scene IR、asset intent manifest、runtime scene binding、render fidelity report、artifact index、acceptance report 和 Workbench API/UI 是同一条链路，不是各写各的孤立产物。
- 总审确认 side-scrolling runtime 消费 generated Scene IR；compile 阶段 binding report 不静态自证 pass，QA snapshot observed 后才回写 pass。
- 总审确认 core/request-required fallback fail-closed，optional fallback 单独表达为 `PASSED_WITH_OPTIONAL_FALLBACKS`，不会伪装成 full `PASSED`。
- 总审确认 candidate DSL / Scene IR / asset manifest / diff 写入 candidate sandbox；no-op 在创建 candidate run 前 fail closed；Accept / Reject / Undo checkpoint 保留 candidate refs，active run 只在 Accept 后提升。
- 总审确认 `render_fidelity_report.json`、`qa_report.render_fidelity`、artifact index、acceptance、Workbench QA/evidence 已接线；report unavailable 会让 render fidelity 子状态 `FAILED`，但不阻断 overall / previewable。
- 总审确认 Pipeline Evidence 仍是 refs-only，Pipeline Acceptance 和 QA panel 保持 sanitizer / safe path 过滤。
- 总审确认文档边界准确，未把 pixel/golden diff 或未实现的新 runtime / asset 能力写成完成项。

最终停点：

- Step33 已完成；停在此处。
- 后续如继续推进，应另开 Step34，不在 Step33 收口中继续扩 scope。
