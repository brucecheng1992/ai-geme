# AI Game Asset Semantic Fidelity Plan

最新维护时间：2026-06-12

## 1. 目标

修复“资源加载成功但语义错配”的资产链路问题。Step 3 前的典型案例是用户输入“做一个小猫射击外星人的小游戏”，系统可以生成 `PLAYABLE`、manifest ready、QA passed 的 shooter，但 resolver 因为 `genre=shooter`、资源包覆盖完整、pack priority 高而选择 `kenney-tiny-shooter-tanks`，导致玩家和敌人变成坦克。

本阶段目标不是扩大素材库，而是让 `DSL/IR -> AssetPlan -> AssetManifest -> Phaser -> QA -> Workbench` 能证明核心美术语义匹配。核心原则：

- 用户明确说出的核心实体必须硬匹配。
- 没有合适本地资源时，优先使用 deterministic internal SVG fallback。
- priority、同包完整覆盖、genre 匹配不能挽救 hard semantic mismatch。
- QA / Workbench 不能只展示 load status，还要能展示 semantic fit / mismatch / fallback reason。

## 2. 非目标

- 不新增 Raw DSL asset path / URL / base64 字段。
- 不接入 AI image provider。
- 不全量导入 Kenney / itch.io / OpenGameArt。
- 不把“坦克包不适合小猫外星人”修成单个 brief 特判。
- 不绕过现有 manifest / QA gate。

## 3. 当前基线

当前仓库已经有 Asset Pipeline P0 v0.2：

- `AssetPlan` 从 normalized IR 派生，字段包括 `subject`、`role`、`provider_priority` 和 optional `semantic` constraint。
- `kenney-tiny-shooter-tanks` 已有 pack-level profile、asset-level semantic tags 和 metadata index。
- `selectLocalAssetPack` 先按 pack priority 排序，再要求 pack 完整覆盖所有 plan item id / role / format。
- resolver 已消费 hard semantic constraint：hard mismatch local pack 会被跳过，且仍走既有 `template_svg` fallback。
- `AssetManifest` 已包含 source pack、license、status、summary 和 optional `semanticFit`。
- generated project 根目录已写出 `asset_resolution_report.json`，记录 selected / rejected / fallback diagnostics。
- QA report 已包含 `asset_report`，Workbench Assets 面板可展示 manifest/runtime load 状态和 source pack。

当前状态：Step 8d 默认 / repair-enabled canary comparison 已完成；本步只比较 Step 8c v0.2 small canary pack 的两份既有 canary summary，不改变默认运行时、resolver、QA、Workbench、Phaser 或 asset pack loading。

- QA / Workbench 已能识别 runtime pass 但 hard semantic mismatch 的 `NEEDS_ASSET_REPAIR`，并展示 per-asset semanticFit 摘要。
- 第一批 canary brief fixture 已建立，batch runner 已能默认运行 supported cases、跳过 `expectedUnsupported` cases，并写出 summary report。
- 已新增 Step 6a Asset Repair Planner：`NEEDS_ASSET_REPAIR` / hard semantic failure 只会生成可审计 repair plan，不会自动重选或修复资源。
- 已新增 Step 6b conservative Repair Executor：只在显式调用时消费 repair plan，最多尝试 1 次，并写入 manifest / public manifest / `asset_resolution_report.json.repair`。
- 已新增 Step 6c repair pipeline integration：默认关闭，只有显式 flag 开启且首次 QA 为 runtime pass + hard semantic failed + executable hard repair item 时才执行 repair、rebuild 和一次 QA rerun。
- 已新增 Step 7 repair-enabled canary safety：canary runner 可显式开启 repair guard，summary report 可观测 repair metadata，默认和 repair-enabled canary 均证明当前 supported cases 不误触发 repair；hard mismatch synthetic fixture 证明 repair 仍可触发。
- 已新增 Step 8a taxonomy v0.2：只补当前 unsupported canary cases 需要的 canonical concept / synonym normalization，不接入资源、不 promotion fixture、不改变 resolver / QA / Workbench / Phaser / repair 行为。
- 已新增 Step 8b canary fixture promotion：Step 8a 已支持的 5 个 canary marker 已移除 `expectedUnsupported`，默认 canary 现在运行 14 条 first-batch fixtures，仍不接入资源库、不改变 runtime/default behavior。
- 已新增 Step 8c canary fixture pack v0.2：只把 canary brief fixture 小包从 14 条扩展到 18 条，不接生产 local asset pack、不改变 resolver / runtime / QA / Workbench / Phaser / asset pack loading。
- 已新增 Step 8d default / repair-enabled canary comparison：只新增 deterministic comparison helper / CLI / report，repair 仍显式开启，不设为默认。

## 4. 分步落地计划

| 步骤 | 边界 | 主要产物 | 验收 |
| --- | --- | --- | --- |
| Step 0 | 需求拆分与执行门禁 | 本文档、step index / review log 链接 | 文档检查 + 只读审查 |
| Step 1 | Taxonomy + AssetPlan semantic constraint | canonical tags、strictness、`AssetPlanItem.semantic` | 已完成 |
| Step 2 | Local pack metadata profile | pack / asset subject tags、theme tags、metadata schema | 已完成 |
| Step 3 | Resolver semantic hard gate | complete-pack selection hard gate、fallback on hard mismatch | 已完成 |
| Step 4 | Manifest semanticFit + resolution report | `semanticFit`、`asset_resolution_report.json` | 已完成 |
| Step 5 | QA + Workbench semantic status | `assetSemanticStatus`、mismatch failure、UI 展示 | 已完成 |
| Step 5.5a | Canary brief fixture v0.1 | `asset-semantic-canary.briefs.json`、fixture validation test | 已完成 |
| Step 5.5b | Canary batch runner | 读取 fixture、生成 summary report | 已完成 |
| Step 6a | Asset Repair Planner | 基于 QA / manifest / resolution report 生成 repair plan | 已完成 |
| Step 6b | Repair Executor | mismatch 后重选 / fallback trace | 已完成 |
| Step 6c | Repair pipeline integration | 显式挂入生成 pipeline 的触发点和回写门禁 | 已完成 |
| Step 7 | 回归批量验收 | repair-enabled canary safety + release guard | 已完成 |
| Step 8a | Taxonomy v0.2 | unsupported canary wording 的 canonical / synonym normalization | 已完成 |
| Step 8b | Canary fixture promotion | 将 Step 8a 已支持 wording 从 expectedUnsupported 提升为默认 canary | 已完成 |
| Step 8c | Canary fixture pack v0.2 | 小包 canary brief fixture 扩展，不接生产资源包 | 已完成 |
| Step 8d | Default / repair-enabled canary comparison | 比较两份 canary summary 的 pass/fail、诊断与 repair metadata | 已完成 |

## 5. Step 1 最小实现边界

状态：已完成。

Step 1 只处理语义约束生成，不改变 resolver 选择结果：

- 在 `packages/asset-pipeline` 内新增 canonical tag / synonym / forbidden tag 的最小 taxonomy。
- 扩展 `AssetPlanItemSchema`，为每个 item 增加可序列化的 `semantic` 字段。
- `buildAssetPlanFromIr` 从现有 IR `template_params` label / subject 派生 semantic hints。
- 对明确核心实体使用 `strictness: "hard"`，例如 player cat、enemy alien、player/enemy tank。
- 对背景主题使用 `strictness: "medium"`。
- generic shooter 没有明确核心实体时不制造 hard failure。

Step 1 不修改：

- `selectLocalAssetPack` 的选择逻辑。
- `AssetManifestAssetSchema`。
- QA / Workbench。
- Phaser template runtime。

## 6. Step 1 验证建议

已执行：

    npx vitest run tests/contracts/asset-pipeline.test.ts
    npm run typecheck
    git diff --check -- packages/asset-pipeline/src/schemas.ts packages/asset-pipeline/src/plan.ts packages/asset-pipeline/src/taxonomy.ts packages/asset-pipeline/src/index.ts tests/contracts/asset-pipeline.test.ts

Step 1 只扩展 AssetPlan semantic constraint，不让 resolver 消费 semantic score；Step 2 已补齐 local pack metadata。

## 7. Step 2 最小实现边界

状态：已完成。

Step 2 只处理资源包 metadata profile，不改变 resolver 选择结果：

- 扩展 local asset pack schema，允许 pack 写入 `profile`，允许 pack asset 写入 `semantic.subjectTags/themeTags/forbiddenTags`。
- 给 `kenney-tiny-shooter-tanks` 补最小 metadata：player/enemy 为 `tank/vehicle/turret`，background 为 `battlefield/road/grassland`，projectile 为 `shell/projectile`。
- 新增 `indexLocalAssetPackMetadata`，只建立 `assetsById` 与 `semanticByAssetId`，不参与 resolver 评分、过滤或 fallback。
- 增加 schema / pack metadata 测试，证明 tank pack 可以暴露后续 Step 3 所需标签，并拒绝 profile id mismatch、非 canonical tag、duplicate asset id、profile coverage overclaim。

Step 2 不修改：

- `selectLocalAssetPack` 的排序和选择逻辑。
- `AssetManifestAssetSchema`。
- QA / Workbench。
- Phaser template runtime。

Step 2 已执行：

    npx vitest run tests/contracts/asset-pipeline.test.ts
    npm run typecheck
    git diff --check -- packages/asset-pipeline/src/local-asset-pack.schema.ts packages/asset-pipeline/src/local-asset-pack-provider.ts packages/asset-pipeline/src/schemas.ts packages/asset-pipeline/src/index.ts assets/asset-packs/kenney-tiny-shooter-tanks/pack.json tests/contracts/asset-pipeline.test.ts docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md docs/refactor-log/ai-game-dsl-p0-step-index.md docs/refactor-log/ai-game-dsl-p0-review-gated.md

关键断言：

- `kenney-tiny-shooter-tanks` 的 player/enemy 暴露 `tank` / `vehicle` 标签。
- `kenney-tiny-shooter-tanks` 的 background 暴露 `battlefield` / `road` / `grassland` 标签。
- `kenney-tiny-shooter-tanks` 的 projectile 暴露 `projectile` / `shell` 标签，且不会被 Step 1 core hard rules 误当作 tank entity。
- pack metadata 仍通过 safe relative path、license、id/dir 一致性等现有校验。
- 现有 resolver 选择结果不变；Step 2 只让 metadata 可读，不让 resolver 消费 metadata。

Step 3 已在 `selectLocalAssetPack` / selection layer 引入 hard semantic mismatch gate，并保持 manifest / QA / Workbench 判定不变。

## 8. Step 3 最小实现边界

状态：已完成。

Step 3 只处理 resolver hard semantic gate：

- `selectCompletePackAssets` 仍先要求 pack 完整覆盖所有 plan item `id` / `role` / `format`。
- 对 `strictness: "hard"` 的 plan item，local asset 必须有 asset-level semantic metadata，且 `subjectTags` 必须命中 `expectedAnyTags`。
- hard gate 会拒绝 plan forbidden tags 与 asset `subjectTags/themeTags` 冲突，也会拒绝 asset `forbiddenTags` 与 plan `expectedAnyTags` 冲突。
- `strictness: "medium"` 和 `strictness: "soft"` 不阻断 local pack selection。
- local pack 被 hard gate 跳过后，继续使用既有 `template_svg` fallback。

Step 3 不修改：

- `AssetManifestAssetSchema`。
- manifest `semanticFit`。
- `asset_resolution_report.json`。
- QA / Workbench。
- Phaser template runtime。
- provider / model prompt。

Step 3 已执行：

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts
    npm run typecheck
    git diff --check -- packages/asset-pipeline/src/local-asset-pack-provider.ts tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md docs/refactor-log/ai-game-dsl-p0-step-index.md docs/refactor-log/ai-game-dsl-p0-review-gated.md

关键断言：

- 默认 cat/alien shooter 不再选择 `kenney-tiny-shooter-tanks`，而是 fallback 到 `template_svg`。
- tank/tank shooter 仍选择 `kenney-tiny-shooter-tanks`。
- medium/soft semantic constraints 不阻断 local pack selection。
- compiler stale-file 清理测试使用 tank shooter fixture 保留 tank pack wiring 覆盖；默认 cat/alien fallback 契约由 asset-pipeline contract test 覆盖。

Step 4 已增加 manifest semantic fit 和 asset resolution report，让 manifest / report 可解释 selected / rejected / fallback reason，并保持 QA / Workbench 判定不变。

## 9. Step 4 最小实现边界

状态：已完成。

Step 4 只处理可解释性和诊断产物：

- `AssetManifestAssetSchema` 新增 optional `semanticFit`。
- `asset_resolution_report.json` 写在 generated project 根目录，不放入 `public`，不被 Phaser runtime 读取。
- report 记录 final selected asset、expected semantic、semantic fit、candidate selected / rejected / skipped reason。
- hard semantic mismatch candidate 记录 per-asset rejection，包括 actual/missing/conflicting tags。
- style mismatch candidate 记录 expected / actual style。
- incomplete pack candidate 记录 missing / mismatched asset。

Step 4 不修改：

- resolver ranking / final selection。
- Step 3 hard gate 规则。
- fallback 策略。
- QA overall status。
- Workbench PLAYABLE 显示。
- Phaser runtime。
- provider / model prompt。
- repair loop。

Step 4 已执行：

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts
    npm run typecheck
    npx vitest run tests/workspace/playwright-qa-runner.test.ts
    git diff --check

关键断言：

- 默认 cat/alien shooter 仍 fallback 到 `template_svg`，manifest 写入 `fallback_generated` semanticFit，report 解释 `kenney-tiny-shooter-tanks` player/enemy hard semantic mismatch。
- tank/tank shooter 仍选择 `kenney-tiny-shooter-tanks`，manifest 写入 `exact` semanticFit，report 记录 selected local pack。
- style mismatch / incomplete pack candidate 会写出结构化 diagnostics。
- QA runner 既有 28 个测试通过，说明本步没有改变 QA overall status。

Step 5 已让 QA / Workbench 消费 semantic diagnostics 并展示 semantic status；仍未引入 repair loop。

## 10. Step 5 最小实现边界

状态：已完成。

Step 5 只处理 QA / Workbench 消费层：

- QA report 新增 `runtime_status`、`asset_semantic_status` 和 `overall_status`，既有 `status` 仍表示 runtime QA pass/fail。
- QA asset report 从 manifest `semanticFit` 派生 `semantic_status`、per-asset semantic summary 和 semantic issues。
- Workbench 展示 Overall / Runtime / Asset semantic 三类状态，header 优先展示 QA `overall_status`，Assets 面板展示每个 asset 的 semanticFit 摘要。
- hard mismatch / hard unknown 显示为 `NEEDS_ASSET_REPAIR`；medium/soft mismatch 显示 warning；`fallback_generated` 显示为 playable fallback assets。
- 旧磁盘 QA report 在 API 读取边界补齐新字段，避免历史报告破坏新契约。

Step 5 不修改：

- resolver ranking / final selection。
- Step 3 hard gate 规则。
- fallback 策略。
- manifest semanticFit 生成逻辑。
- Phaser runtime。
- asset repair loop。
- AI image provider、新资源库或 provider survive_duration。

Step 5 已执行：

    npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/workspace/workbench-semantic-status.test.ts
    npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/workspace/workbench-semantic-status.test.ts tests/workspace/generation-pipeline.service.test.ts
    npx vitest run tests/workspace/projects-service.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/workbench-semantic-status.test.ts
    npm run typecheck
    npm exec --workspace @ai-game-maker/maker-workbench -- vite build
    npm test
    git diff --check

关键断言：

- runtime QA passed + hard semantic mismatch -> `status: "PASSED"`、`runtime_status: "PASSED"`、`asset_semantic_status: "FAILED"`、`overall_status: "NEEDS_ASSET_REPAIR"`。
- `fallback_generated` -> `asset_semantic_status: "PASSED"`、`overall_status: "PLAYABLE_WITH_FALLBACK_ASSETS"`。
- medium mismatch -> `asset_semantic_status: "WARNING"`、`overall_status: "PLAYABLE_WITH_ART_WARNINGS"`。
- pipeline 仍按 runtime `status: "PASSED"` 写入项目 `PLAYABLE`；Workbench 通过 QA `overall_status` 覆盖展示。

## 11. Step 5.5a 最小实现边界

状态：已完成。

Step 5.5a 只新增 canary brief fixture baseline：

- 新增 `tests/fixtures/asset-semantic-canary.briefs.json`，包含 14 条第一批 canary briefs。
- 覆盖核心概念：`cat`、`alien`、`tank`、`space`、`fishbone` 和 generic shooter。
- 每条 brief 写出 `expect.disallowOverall`、runtime / asset failure 是否允许、optional `allowedOverall`、per-role `expectedCore` 和 optional `preferredPack`。
- 对当前 taxonomy 尚未确认支持的 wording / concept 显式标记 `expectedUnsupported: true`，例如 `fishbone` projectile、`异星人`、`星空`、`装甲车`。
- 新增 `tests/contracts/asset-semantic-canary-fixture.test.ts`，只验证 fixture JSON parse、case id 唯一、brief 非空、expect 契约、concept baseline、strictness、preferredPack pack id 和当前 taxonomy 已支持的 core inference。

Step 5.5a 不修改：

- canary runner 或 batch summary report。
- 批量生成真实游戏。
- resolver ranking / hard gate / fallback 策略。
- manifest semanticFit 生成逻辑。
- QA status 聚合规则。
- Workbench UI。
- Phaser runtime。
- 新资源库、AI image provider 或 provider survive_duration。

Step 5.5a 已执行：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts
    npm test
    npm run typecheck
    git diff --check

关键断言：

- 第一批 fixture 是测试数据基线，不会改变产品行为。
- dog / rabbit / robot / bird / slime / asteroid 等扩展概念未进入 v0.1 fixture。
- 包含 `fishbone` 的 case 保持为显式 unsupported canary marker，后续 taxonomy expansion / canary v0.2 再转正。
- Step 5.5b 才实现 runner 和 summary report；runner 应把 `expectedUnsupported: true` 作为 skip / expected-unsupported report 维度，不按普通 canary failure 聚合。

## 12. Step 5.5b 最小实现边界

状态：已完成。

Step 5.5b 只新增 canary batch runner 和 summary report：

- 新增 `scripts/run-asset-semantic-canary.ts`，读取 `tests/fixtures/asset-semantic-canary.briefs.json`，通过 deterministic local provider 调用现有生成 / 编译 / QA 流程。
- 新增 `scripts/asset-semantic-canary-report.ts`，集中做 fixture parse、case selection、failure threshold、summary JSON 和 summary Markdown 渲染。
- 新增 `npm run qa:asset-semantic:canary`；默认运行 supported cases，默认跳过 `expectedUnsupported: true` cases。
- 支持 `--include-unsupported` 实验性运行 unsupported cases，并在 summary 中标记 `experimental`；unsupported failure 不驱动默认 exit code。
- 支持 `--case <id>` 和 `--limit <n>`，用于单 case 调试和快速 smoke。
- 输出 `artifacts/asset-semantic-canary/<timestamp>/summary.json` 和 `summary.md`。
- 默认给 generated project 的 `npm install` 增加 `--offline`，避免默认 canary 依赖外部网络；需要网络时显式加 `--allow-network`。
- summary 统计 runtime status、asset semantic status、overall status、fallback_generated、mismatch、unknown、warning、placeholder、required missing、asset load failure、selected packs、manifest path、asset_resolution_report path 和 QA report path。

Step 5.5b 不修改：

- resolver ranking / hard gate / fallback 策略。
- manifest `semanticFit` 生成逻辑。
- QA status 聚合规则和 Workbench UI。
- Phaser runtime。
- asset repair loop。
- 新资源库、AI image provider、taxonomy expansion 或 provider `survive_duration` 修复。
- 当前工作区既有 shooter HUD 脏文件。

Step 5.5b 已执行：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts
    npx vitest run tests/contracts/asset-semantic-canary-runner.test.ts
    npm run qa:asset-semantic:canary -- --limit 3
    npm test
    npm run typecheck
    git diff --check

关键断言：

- `expectedUnsupported: true` 默认 skipped；`--include-unsupported` 标记 experimental。
- `PLAYABLE_WITH_FALLBACK_ASSETS` 和 `PLAYABLE_WITH_ART_WARNINGS` 通过，medium warning 只统计不阻断。
- `NEEDS_ASSET_REPAIR`、`QA_FAILED`、hard mismatch、hard unknown、required missing、asset load failure 和未允许 placeholder 会失败。
- `fallback_generated` 不算 mismatch；`PLAYABLE_WITH_FALLBACK_ASSETS` 不算失败。
- `--limit 3` smoke 生成 `artifacts/asset-semantic-canary/20260612T053854Z`，3 个 runnable supported cases 全部通过，11 个 skipped。

## 13. Step 6a 最小实现边界

状态：已完成。

Step 6a 只新增 Asset Repair Planner：

- 新增 `packages/asset-pipeline/src/asset-repair-plan.ts` 和 `asset-repair-plan.types.ts`，导出 `AssetRepairPlan`、`AssetRepairPlanItem`、`AssetRepairPlannerQaReport` 和 `buildAssetRepairPlan`。
- Planner 消费 normalized QA report 最小形状、`AssetManifest` 和必需 `AssetResolutionReport`，返回 `asset-repair-plan-v0.1` 结构化对象。
- 只在 `NEEDS_ASSET_REPAIR`、`asset_semantic_status: "FAILED"`、hard `mismatch`、hard `unknown` 或 hard requirement 缺 `semanticFit` 时触发。
- 只为 hard semantic failed assets 生成 executable `items`；selected local pack 生成 `blacklist_candidate_then_reresolve`，无可 blacklist pack 时生成 `force_template_svg_fallback`。
- 若 QA 顶层状态要求 repair 但 manifest / resolution report 没有 hard semantic evidence，则生成 `no_action` diagnostic item，供 Step 6b 审计但不得执行修复。
- `fallback_generated`、`PLAYABLE_WITH_FALLBACK_ASSETS`、`PLAYABLE_WITH_ART_WARNINGS`、medium / soft mismatch 或 unknown 均不触发 repair plan；可疑但非 hard repair 的项进入 `ignored` 作为审计解释。
- 本步只返回结构化对象，暂不落盘 `asset_repair_plan.json`。

Step 6a 不修改：

- repair executor、blacklist 执行、重新 resolve、manifest 写入、`asset_resolution_report.json` 写入或 QA 重跑。
- resolver ranking / hard gate / fallback 策略。
- QA status 聚合规则和 Workbench UI。
- Phaser runtime。
- manifest `semanticFit` 生成逻辑。
- 新资源库、taxonomy expansion、AI image provider 或 provider `survive_duration` 修复。
- shooter HUD 脏文件。

Step 6a 已执行：

    npx vitest run tests/contracts/asset-repair-plan.test.ts
    npm run test:contracts
    npm run typecheck
    npm run qa:asset-semantic:canary -- --limit 3
    git diff --check

关键断言：

- hard mismatch local-pack asset 会生成 `blacklist_candidate_then_reresolve`。
- hard requirement 缺 `semanticFit` 会按 hard unknown 触发。
- hard unknown 且无 selected local pack 会生成 `force_template_svg_fallback`。
- `PLAYABLE_WITH_FALLBACK_ASSETS`、`PLAYABLE_WITH_ART_WARNINGS`、`fallback_generated`、exact / compatible / not_applicable、medium / soft mismatch 或 unknown 不触发 executable repair。

## 14. Step 6b 最小实现边界

状态：已完成。

Step 6b 新增 conservative Asset Repair Executor：

- 新增 `packages/asset-pipeline/src/asset-repair-executor.ts` 和 `asset-repair-executor.types.ts`，导出显式 `executeAssetRepairPlan` API。
- 新增 `asset-repair-report.schema.ts`，让 `asset_resolution_report.json` 可以可选携带 `repair` section。
- `plan.triggered=false` 时 no-op，不读取或写入项目文件。
- `plan.triggered=true` 时先读取 `asset_plan.json`、`public/asset_manifest.json` 和 `asset_resolution_report.json`，并在任何写入前校验三者与 `repairPlan.projectId` 一致。
- 只处理 hard semantic failed executable item；`no_action` / medium / soft / `fallback_generated` 不执行修复。
- 对 selected local pack 错误候选使用 project-local blacklist 重新 resolve；rerresolve 写入临时 staging 目录，只把 repaired requirement 对应 SVG copy 回项目，避免覆盖非 repair 目标资产。
- 没有合格 local asset 时强制生成 deterministic `template_svg` fallback，并保持原 requirement id / `loadKey`。
- 修复成功时重写 project root `asset_manifest.json`、`public/asset_manifest.json` 和 `asset_resolution_report.json.repair`。
- `triggered=true` 但没有 executable hard item 时，只写 `asset_resolution_report.json.repair.status = "no_action"`，不写 manifest 或 assets。
- 最多尝试 1 次；本步不默认挂入 `GenerationPipeline`。

Step 6b 不修改：

- QA 聚合规则、Workbench UI、Phaser runtime、taxonomy、Step 3 hard gate 或正常 resolver ranking。
- medium / soft warning、`fallback_generated` 或成功路径资源。
- 新资源库、AI image provider 或 provider `survive_duration`。
- shooter HUD 脏文件。

Step 6b 已执行：

    npx vitest run tests/contracts/asset-repair-executor.test.ts
    npm run test:contracts
    npm run typecheck
    npm run qa:asset-semantic:canary -- --limit 3
    git diff --check

关键断言：

- hard semantic failed local-pack asset 会 project-local blacklist 当前 pack 并重新 resolve。
- rerresolve 命中第二个合格 local pack 时，只复制 repaired requirement 的文件，非 repair 目标 asset 文件和 manifest entry 保持不变。
- 无合格 local asset 时写 deterministic template SVG fallback，`semanticFit.status = "fallback_generated"`。
- `triggered=true` 但无 executable hard item 会写 `repair.status = "no_action"` 审计 section。
- `repairPlan.projectId` 与项目 artifact 不一致时直接拒绝，且不写 manifest / report。
- repaired report 不保留被 blacklist pack 的旧 `selected` candidate。

## 15. Step 6c 最小实现边界

状态：已完成。

Step 6c 将 repair planner / executor 以显式 flag 挂入 `GenerationPipeline`：

- 新增 `AssetSemanticRepairConfig`，默认 `enabled=false`。
- 仅 `ASSET_SEMANTIC_REPAIR_ENABLED=true` 或显式构造参数开启 repair integration。
- 首次 QA 必须完成且 runtime pass：`status="PASSED"`、`runtime_status="PASSED"`。
- 顶层语义状态必须是 `overall_status="NEEDS_ASSET_REPAIR"` 或 `asset_semantic_status="FAILED"`。
- 任何 `asset_report.failures`、runtime asset `failed` / `missing` / `missing_required_roles` 都不进入 repair。
- `buildAssetRepairPlan` 返回 `triggered=true` 后，还必须至少有一个 hard semantic executable item，才会调用 `executeAssetRepairPlan`。
- repair 成功后只重新执行一次 build / preview artifact check / QA，不做循环。
- `maxAttempts` 被硬性限制为 0..1；配置值大于 1 仍按 1 执行。
- repair attempt 继续写入 generated project `asset_resolution_report.json.repair`，pipeline 额外写入 `asset-repair.*` event 和 `asset-repair` run step。
- 最终 `qa-report.json` 会写入可审计的 `asset_semantic_repair` metadata，包含 `enabled`、`attempted`、`skippedReason`、`attemptCount`、`maxAttempts`、repair plan 触发情况、executable item 数、before/after semantic status、repaired requirements 和 failure reasons。

Step 6c 不修改：

- 默认成功路径：flag 关闭时不读取 repair artifacts，不 build plan，不执行 executor，不 rerun QA；仅在最终 QA report 写入 disabled audit metadata。
- `PLAYABLE`、`PLAYABLE_WITH_FALLBACK_ASSETS`、`PLAYABLE_WITH_ART_WARNINGS`。
- `fallback_generated`、medium / soft warning、runtime `QA_FAILED`、required asset load failure、missing file/path/build failure。
- resolver ranking、Step 3 hard gate、fallback 策略、Phaser runtime、Workbench 大 UI、taxonomy、新资源库、AI image provider 或 provider `survive_duration`。
- shooter HUD 脏文件。

Step 6c 已执行：

    npx vitest run tests/workspace/generation-pipeline.service.test.ts
    # 1 个测试文件，19 个测试通过

    npm run typecheck:root
    # 通过

    npm run typecheck --workspace @ai-game-maker/maker-api
    # 通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npx vitest run tests/contracts/asset-repair-plan.test.ts tests/contracts/asset-repair-executor.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 4 个测试文件，61 个测试通过

    npm run qa:asset-semantic:canary
    # summary 写入 artifacts/asset-semantic-canary/20260612T081700Z
    # total=14 runnable=9 skipped=5 experimental=0 passed=9 failed=0
    # NEEDS_ASSET_REPAIR=0 QA_FAILED=0 hardMismatch=0 hardUnknown=0 requiredAssetMissing=0 assetLoadFailures=0 placeholderUsed=0

    git diff --check
    # 无输出

关键断言：

- flag disabled 时，semantic failed QA report 仍不触发 repair，QA 只跑一次。
- flag enabled 且 hard semantic failed 时，repair 最多执行一次，并触发一次 build + QA rerun。
- `PLAYABLE`、`PLAYABLE_WITH_FALLBACK_ASSETS`、`PLAYABLE_WITH_ART_WARNINGS`、runtime `QA_FAILED` 和 `ASSET_LOAD_FAILED` 不触发 repair，即使不一致 report 同时带有 `asset_semantic_status="FAILED"` 也不会进入 repair。
- inconsistent `overall_status="QA_FAILED"`、runtime asset failure、executor failure、repair 后 rebuild failure 都会写入结构化 skipped / failure metadata，且不进入无边界重试。
- repair 后 rebuild failure 会把 `qa` step 从初次 QA 的 `RUNNING` 收敛为 `DONE`，避免 final project status 与 timeline step 不一致。
- `qa-report.json.asset_semantic_repair.repairedRequirements` 只记录本次 hard semantic repair 的 before / after requirement 结果，不修 `fallback_generated`、medium / soft warning 或 fallback playable 状态。
- 默认 canary summary：`total=14 runnable=9 skipped=5 passed=9 failed=0`，`NEEDS_ASSET_REPAIR=0`、`QA_FAILED=0`、`hardMismatch=0`、`hardUnknown=0`、`requiredAssetMissing=0`、`assetLoadFailures=0`、`placeholderUsed=0`。

## 16. Step 7 最小实现边界

状态：已完成。

Step 7 只处理 repair-enabled canary observability / tests / docs：

- `npm run qa:asset-semantic:canary -- --repair-enabled` 显式开启 semantic asset repair guard，并把 `{ enabled: true, maxAttempts: 1 }` 传入 `GenerationPipelineService`。
- 未传 `--repair-enabled` 时仍走既有 env config；默认环境下 repair disabled。
- `summary.json` 新增 repair 聚合和 release guard 顶层别名：`repairEnabled`、`repairAttempted`、`repairAttemptedCount`、`repairSucceededCount`、`repairFailedCount`、`repairSkippedReasons`。
- `repairFailedCount > 0` 会使 supported summary 失败；successful repair attempt 会被记录为 `repairAttemptedCount > 0` / `repairSucceededCount > 0`，但不自动失败。
- 每个 completed canary case 记录 normalized repair metadata；旧 QA report 缺 `asset_semantic_repair` 时兼容为 `attempted=false`、`skippedReason="missing_repair_metadata"`。
- `summary.md` 展示 Repair counts、Repair skipped reasons 和 per-case repair cell。
- synthetic hard mismatch pipeline test 证明 flag enabled 时 hard semantic mismatch 可触发 repair、一次 build/QA rerun、final QA report 写入 before/after status 和 repaired requirement metadata。

Step 7 不修改：

- resolver ranking、Step 3 hard gate、fallback 策略、QA status 聚合、Workbench 大 UI、Phaser runtime、taxonomy、新资源库、AI image provider 或 provider `survive_duration`。
- `templates/phaser/shooter/src/GameScene.ts`、`templates/phaser/shooter/src/shooter-renderer.ts`、`tests/contracts/phaser-templates.test.ts`。
- 默认 canary selection；`expectedUnsupported: true` cases 仍默认跳过，`--include-unsupported` 仍是实验模式。

Step 7 已执行：

    npx vitest run tests/contracts/asset-semantic-canary-runner.test.ts tests/workspace/generation-pipeline.service.test.ts
    # 2 个测试文件，35 个测试通过

    npx vitest run tests/contracts/asset-semantic-canary-runner.test.ts
    # 1 个测试文件，17 个测试通过

    npx vitest run tests/workspace/generation-pipeline.service.test.ts
    # 1 个测试文件，19 个测试通过

    npx vitest run tests/contracts/asset-repair-plan.test.ts tests/contracts/asset-repair-executor.test.ts
    # 2 个测试文件，11 个测试通过

    npm run typecheck:root
    # 通过

    npm test
    # contracts: 8 个测试文件，116 个测试通过
    # workspace: 12 个测试文件，125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm run qa:asset-semantic:canary
    # summary 写入 artifacts/asset-semantic-canary/20260612T085457Z
    # total=14 runnable=9 skipped=5 experimental=0 passed=9 failed=0
    # repair.enabled=false repair.attemptedCount=0 repair.failedCount=0

    npm run qa:asset-semantic:canary -- --repair-enabled
    # summary 写入 artifacts/asset-semantic-canary/20260612T085600Z
    # total=14 runnable=9 skipped=5 experimental=0 passed=9 failed=0
    # repair.enabled=true repair.attemptedCount=0 repair.failedCount=0
    # repair.skippedReasons.no_asset_semantic_repair_needed=9

    git diff --check
    # 无输出

关键断言：

- 默认 canary 路径不误开启 repair；supported 9 个 case 全部通过，unsupported 5 个 case 仍默认跳过。
- repair-enabled canary 路径证明当前 green supported cases 不误触发 repair，`repairAttemptedCount=0`、`repairFailedCount=0`。
- `--include-unsupported --repair-enabled` 在聚合测试中会把 unsupported case 标为 experimental，仍不驱动 supported release exit code。
- fallback_generated、art warning、medium / soft warning 和 playable fallback 状态不会触发 repair。
- hard mismatch synthetic test 保持 repair 能力可触发：首次 QA 为 `NEEDS_ASSET_REPAIR` 后执行 1 次 repair、1 次 QA rerun，并记录 `beforeOverallStatus="NEEDS_ASSET_REPAIR"`、`afterOverallStatus="PLAYABLE_WITH_FALLBACK_ASSETS"`。
- summary 对旧 report 兼容，不因缺失 `asset_semantic_repair` 崩溃。

## 17. Step 8a 最小实现边界

状态：已完成。

Step 8a 只处理 taxonomy / synonym normalization：

- 新增 `fishbone` projectile-only canonical concept，覆盖 `fishbone`、`fish_bone`、`fish bone`、`鱼骨`、`鱼骨头`、`鱼骨头子弹`、`鱼骨子弹`。
- `fishbone` semantic strictness 为 `medium`，不会把 projectile 泛化成 hard gate；forbidden tags 只表达 projectile 语义冲突，例如 `shell`、`tank_bullet`、`missile`、`alien`、`extraterrestrial`。
- 扩展现有 canonical concept 的输入同义词：`异星人`、`异星`、`外星怪物`、`异星怪物`、`ufo_creature`、`ufo creature`、`space_creature`、`space creature` -> `alien`；`星空`、`银河`、`星海`、`stars`、`starfield`、`star_field`、`star field`、`cosmic` -> `space`；`装甲车`、`armored_vehicle`、`armored vehicle`、`armoured_vehicle`、`armoured vehicle` -> `tank`。
- 这些 alias 只属于当前 canary unsupported wording 对应的 `alien` / `space` / `tank` concept family input normalization；不扩大 `expectedAnyTags`、resolver ranking、report schema 或资源选择行为。
- ASCII alias 走 tokenizer / token sequence 匹配，不使用 substring；`tankard` 不命中 `tank`，`caterpillar` 不命中 `cat`。
- 当前 5 个 `expectedUnsupported: true` canary fixture 仍保留，默认 canary 仍跳过；fixture promotion 留给 Step 8b。

Step 8a 不修改：

- resolver ranking、Step 3 hard gate、fallback 策略、manifest `semanticFit`、`asset_resolution_report`、QA aggregation、Workbench UI、Phaser runtime、repair planner / executor / pipeline、canary runner 行为。
- 新资源库、真实美术资源、AI image provider 或 shooter HUD 文件。

Step 8a 验证：

    npx vitest run tests/contracts/asset-pipeline.test.ts
    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts
    npm test
    npm run typecheck
    npm run qa:asset-semantic:canary -- --limit 3
    npm run qa:asset-semantic:canary -- --repair-enabled --limit 3
    git diff --check

结果：

- `tests/contracts/asset-pipeline.test.ts`：20 个测试通过。
- `tests/contracts/asset-semantic-canary-fixture.test.ts`：6 个测试通过。
- `npm test` 通过：contracts 119 个测试通过，workspace 125 个测试通过。
- `npm run typecheck` 通过。
- 默认 canary smoke：`artifacts/asset-semantic-canary/20260612T094445Z`，`runnable=3 skipped=11 experimental=0 passed=3 failed=0`，`repair.enabled=false repair.attemptedCount=0 repair.failedCount=0`。
- repair-enabled canary smoke：`artifacts/asset-semantic-canary/20260612T094506Z`，`runnable=3 skipped=11 experimental=0 passed=3 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- `git diff --check` 通过。

## 18. Step 8b 最小实现边界

状态：已完成。

Step 8b 只处理 canary fixture promotion：

- 移除 Step 8a 已支持的 5 个 `expectedUnsupported: true` canary marker，让这些 case 进入默认 canary runnable 集合。
- 保持 canary runner 的 `expectedUnsupported` 通用 skip / experimental 机制不变，避免影响未来未支持概念。
- 更新 focused contract tests，证明默认 fixture promotion 后仍是 14 条第一批 deterministic canary，不扩大资源库或 runtime 行为。
- 记录 promotion rationale：`fishbone` projectile、`异星人`、`星空`、`装甲车` 已由 Step 8a taxonomy v0.2 支持。

Step 8b 不修改：

- resolver ranking、Step 3 hard gate、fallback 策略、manifest `semanticFit`、`asset_resolution_report`、QA aggregation、Workbench UI、Phaser runtime、repair planner / executor / pipeline 或 asset pack loading。
- 新资源库、真实美术资源、AI image provider、large asset library、Metadata Step 4A 或 shooter HUD 文件。
- Step 8c 小包资源扩展或 Step 8d 默认 / repair-enabled 对比。

Step 8b 已执行：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts tests/contracts/asset-semantic-canary-runner.test.ts
    npm run qa:asset-semantic:canary
    npm run qa:asset-semantic:canary -- --repair-enabled
    npm run test:contracts
    npm test
    npm run typecheck
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples

结果：

- TDD 红灯：focused canary tests 先因 5 个旧 `expectedUnsupported` marker 失败；移除 marker 后 focused suite 通过，2 个测试文件 23 个测试通过。
- 默认 full canary：`artifacts/asset-semantic-canary/20260612T190227Z`，`runnable=14 skipped=0 experimental=0 passed=14 failed=0`，`repair.enabled=false repair.attemptedCount=0 repair.failedCount=0`。
- repair-enabled full canary：`artifacts/asset-semantic-canary/20260612T190351Z`，`runnable=14 skipped=0 experimental=0 passed=14 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- `npm run test:contracts` 通过：13 个测试文件，155 个测试通过。
- `npm test` 通过：contracts 155 个测试通过，workspace 125 个测试通过。
- `npm run typecheck` 通过。
- `npm run metadata:validate -- assets/metadata/examples` 通过：`OK 5 metadata files`。
- `npm run metadata:export-runtime -- --json assets/metadata/examples` 通过：`ok=true`、`diagnostics=[]`、`asset_count=5`。

关键断言：

- promoted fixture：`cat_fishbone_alien_shooter`、`kitten_extraterrestrial_shooter`、`orange_cat_starfield_alien_shooter`、`armored_vehicle_vs_tank`、`cat_space_alien_fishbone`。
- promotion rationale 来自 Step 8a taxonomy v0.2：`fishbone` projectile、`异星人`、`星空`、`装甲车` 已进入可识别 canonical / alias baseline。
- default canary 不再跳过 first-batch supported cases；runner 的通用 `expectedUnsupported` skip / experimental 机制保留给未来未支持概念。
- full canary 证明 promotion 后没有 `NEEDS_ASSET_REPAIR` / `QA_FAILED` / repair attempted。

## 19. Step 8c 最小实现边界

状态：已完成。

Step 8c 只处理 small canary fixture pack / brief pack v0.2：

- 将 `tests/fixtures/asset-semantic-canary.briefs.json` 从 14 条扩展到 18 条，仍保持 5-20 条的小包边界。
- 新增 fixture 只覆盖当前 canary runner 已支持的 `player`、`enemy`、`projectile`、`background` role。
- 用 focused contract tests 锁定新增 fixture id、pack size、deterministic selection 和 supported-only 默认 runnable 行为。
- 本步不是生产 local asset pack 接入，不新增或修改 `assets/asset-packs`。
- 本步不覆盖 UI / material / prop runtime canary，因为当前 canary runner 不建模这些 role，Metadata Step 4A 仍 parked。

新增 fixture：

- `tank_battlefield_shooter`：tank player/enemy hard semantics + battlefield medium background，保持 `kenney-tiny-shooter-tanks` 是有效小包。
- `tank_fishbone_battlefield_shooter`：tank player/enemy + fishbone medium projectile + battlefield background，证明 medium projectile warning 不升级为 hard repair。
- `cat_vs_tank_space_shooter`：cat/tank mixed hard concepts + space background，覆盖混合 fallback / pack boundary。
- `alien_vs_alien_space_shooter`：alien player/enemy + space background，覆盖 creature-only fallback boundary。

Step 8c 不修改：

- resolver ranking、Step 3 hard gate、fallback 策略、manifest `semanticFit`、`asset_resolution_report`、QA aggregation、Workbench UI、Phaser runtime、repair planner / executor / pipeline 或 asset pack loading。
- 生产资源包、真实第三方资源切片、large asset library、AI image provider、Metadata Step 4A 或 shooter HUD 文件。
- Step 8d 默认 / repair-enabled 对比报告、comparison script 或差异分析。

Step 8c 已执行：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts tests/contracts/asset-semantic-canary-runner.test.ts
    npm run qa:asset-semantic:canary
    npm run qa:asset-semantic:canary -- --repair-enabled
    npm run test:contracts
    npm test
    npm run typecheck
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples
    git diff --check

默认 canary 与 repair-enabled canary 在本步仅作为 Step 8c release guard，不作为 Step 8d comparison；本步只记录两条命令是否保持 `failed=0` 且 repair 未误触发。

结果：

- TDD 红灯：focused canary tests 先因 fixture 仍为 14 条失败；补充 4 条 Step 8c fixture 后 2 个测试文件 24 个测试通过。
- 默认 full canary：`artifacts/asset-semantic-canary/20260613T061551Z`，`runnable=18 skipped=0 experimental=0 passed=18 failed=0`，`repair.enabled=false repair.attemptedCount=0 repair.failedCount=0`。
- repair-enabled full canary：`artifacts/asset-semantic-canary/20260613T061743Z`，`runnable=18 skipped=0 experimental=0 passed=18 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- default / repair-enabled summaries 均为 `NEEDS_ASSET_REPAIR=0`、`QA_FAILED=0`、`hardMismatch=0`、`hardUnknown=0`、`requiredAssetMissing=0`、`assetLoadFailures=0`、`placeholderUsed=0`。
- `tank_fishbone_battlefield_shooter` 允许并记录 medium warning / `PLAYABLE_WITH_ART_WARNINGS`，不作为 hard mismatch 或 repair trigger。
- `npm run test:contracts` 通过：13 个测试文件，156 个测试通过。
- `npm test` 通过：contracts 156 个测试通过，workspace 125 个测试通过。
- `npm run typecheck` 通过。
- `npm run metadata:validate -- assets/metadata/examples` 通过：`OK 5 metadata files`。
- `npm run metadata:export-runtime -- --json assets/metadata/examples` 通过：`ok=true`、`diagnostics=[]`、`asset_count=5`。

审查记录：

- Oracle 预审：P0/P1 无；P2 提醒 `tank_fishbone_battlefield_shooter` 不应断言 medium warning 为 0；P3 提醒 `battlefield` 只作为 canary v0.2 baseline，不应被写成 taxonomy/resource expansion。已按此收紧。
- Oracle 最终审查：P0/P1/P2/P3 均无，可提交；确认 diff 只包含 6 个 Step 8c 文件，未触碰 `assets/asset-packs`、runtime、resolver、QA、Workbench、Phaser、shooter HUD 或 metadata examples。

## 20. Step 8d 最小实现边界

状态：已完成。

Step 8d 只处理 Step 8c v0.2 small canary pack 的 default summary 与 repair-enabled summary 对比：

- 新增 deterministic comparison helper / CLI，只读取两份 `summary.json` 并可选写出 `comparison.json`。
- 校验两份输入的 comparable case set：case id、顺序、`skipped` 与 `experimental` 必须一致；default summary 必须是 `repair.enabled=false`，repair-enabled summary 必须是 `repair.enabled=true`。
- 对比 `total`、`runnable`、`skipped`、`experimental`、`passed`、`failed`、`exitCode`、failure diagnostic count / codes、medium warning count 与 repair attempted / failed / action metadata。
- failure diagnostic count 只统计 `NEEDS_ASSET_REPAIR`、`QA_FAILED`、hard mismatch / unknown、required asset missing、asset load failure 和 placeholder；medium warning 单独记录，不计入 failure diagnostic。
- repair action 只从 case-level `repair.repairedRequirements[].action` 归一化为去重排序结果，不制造固定空的 proposed / rejected action aggregate。
- comparison report 不包含 timestamp 或绝对路径，diagnostic code 与 repair action 必须排序，便于提交外的本地 artifact 对比。

Step 8d 不修改：

- canary fixture pack、taxonomy、production local asset pack、large asset library、AI image provider 或 Metadata Step 4A。
- resolver ranking、Step 3 hard gate、fallback 策略、manifest `semanticFit`、`asset_resolution_report`、QA aggregation、Workbench UI、Phaser runtime、repair planner / executor / pipeline、asset pack loading、runtime default behavior 或 shooter HUD 文件。
- repair 默认开关；repair-enabled canary 仍只能通过显式 `--repair-enabled` 运行。

Step 8d 已执行：

    npx vitest run tests/contracts/asset-semantic-canary-comparison.test.ts
    npm run qa:asset-semantic:canary
    npm run qa:asset-semantic:canary -- --repair-enabled
    npm run qa:asset-semantic:compare -- --default-summary <default-summary.json> --repair-enabled-summary <repair-summary.json> --out <comparison.json>
    npm run test:contracts
    npm test
    npm run typecheck
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples
    git diff --check

结果：

- TDD 红灯：focused comparison test 先因 `scripts/asset-semantic-canary-comparison.js` 不存在失败；补充 helper / CLI / npm script 后 focused suite 5 个测试通过。
- 默认 full canary：`artifacts/asset-semantic-canary/20260613T064654Z`，`runnable=18 skipped=0 experimental=0 passed=18 failed=0`，`repair.enabled=false repair.attemptedCount=0 repair.failedCount=0`。
- repair-enabled full canary：`artifacts/asset-semantic-canary/20260613T064842Z`，`runnable=18 skipped=0 experimental=0 passed=18 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- comparison artifact：`artifacts/asset-semantic-canary-comparison/20260613T064842Z/comparison.json`，`ok=true`，default / repair-enabled 均 `failure_diagnostic_count=0`、`diagnostic_codes=[]`、`medium_warning_count=3`，delta 均为 0。
- `npm run test:contracts` 通过：14 个测试文件，161 个测试通过。
- `npm test` 通过：contracts 161 个测试通过，workspace 125 个测试通过。
- `npm run typecheck` 通过。
- `npm run metadata:validate -- assets/metadata/examples` 通过：`OK 5 metadata files`。
- `npm run metadata:export-runtime -- --json assets/metadata/examples` 通过：`ok=true`、`diagnostics=[]`、`asset_count=5`。
- `git diff --check` 通过。

审查记录：

- Oracle 预审：P0 无；P1 要求校验 exact comparable case set 和 default / repair-enabled repair flag，并避免输出误导性的固定空 repair action arrays；P2 要求 `failure_diagnostic_count` 不包含 medium warnings。已按此收紧 helper / tests / report shape。
- Oracle 最终审查：P0/P1/P2 均无；P3 提醒 CLI 成功日志应打印 case set 摘要，已补充 `case.total` / `case.runnable` / `case.skipped` / `case.experimental` 输出；本步可提交。

## 21. 审查门禁

每一步按 review-gated-refactor 执行：

1. 本地验证通过。
2. Oracle 只读审查或明确记录主 agent 自审降级原因。
3. 修复 P0/P1/P2 后复验。
4. 把修改范围、验证命令、审查结论写回 `docs/refactor-log/ai-game-dsl-p0-review-gated.md`。
5. 再做文档复审门禁。

## 22. 当前注意事项

- provider `survive_duration` 修复已单独提交；后续 asset semantic fidelity 步骤仍不要混入 provider 改动。
- Step 7 已用默认和 repair-enabled canary summary 证明批量 supported cases 不退化；后续新增 taxonomy / 资源库 / AI image provider 仍必须另起小步，并重新跑 release guard。
- Step 8c 已只完成 canary fixture pack / brief pack v0.2；Step 8d 已只完成 default / repair-enabled canary summary comparison，不扩展资源或运行时行为。
- 后续应先关闭 Step 8d branch boundary；如继续资产主线，仍需另起小步，不能混入 Metadata Step 4A、大资源库接入或 runtime / resolver / QA / Workbench / Phaser 变更。
- shooter HUD stash 仍是独立任务，不应混入 Asset Semantic Fidelity 后续步骤。
- 可选技术债治理应另起命名，例如 pipeline split，不再复用 Step 8a / Step 8b 编号。
- 后续涉及真实验收时仍必须用 Workbench / generated project / QA 产物证明，不只看单测。
- 后续扩展的真实验收至少包含：
  - 小猫射击外星人：不能选 tank 作为 player/enemy。
  - 坦克大战：可以选 tank pack。
  - 泛化 shooter：不应因缺少 hard concept 被误判失败。
