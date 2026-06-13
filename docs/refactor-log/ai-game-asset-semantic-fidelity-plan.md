# AI Game Asset Semantic Fidelity Plan

最新维护时间：2026-06-13

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

当前状态：Step 13D-B batch-zero semantic dry-run / bridge implementation 已完成本地验证：Pirate Kit approved batch-zero fixture 的 10 个 sidecars validate 通过，runtime-safe export `asset_count=10`，default / repair-enabled canary 都使用同一 fixture 且 `failed=0`，comparison `ok=true`，bridge summary `ok=true matched_count=10`，resolver-adjacent diagnostics `ok=true requested_count=10 resolved_count=10`。本步只新增 focused tests、metadata-only canary fixture kind support 和文档记录；不导入资产、不修改 sidecar metadata / thumbnails、不改变默认运行时、resolver、QA verdict、Workbench、Phaser、asset pack loading 或 production asset packs。Runtime/default integration 与 production rollout 继续 parked。

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
- 已新增 Step 9A small art library intake gate：只用文档定义小型真实资源 dry-run 的尺寸、布局、二进制、metadata、validation / export / canary / comparison、非目标和 P0/P1/P2/P3 审查门禁。
- 已新增 Step 9B small art library metadata intake / fixture import：导入 10 个 Kenney Cube Pets 小型 fixture assets 与 sidecar metadata，仍不接 runtime/default behavior。
- 已新增 Step 9C small art library dry-run：`--fixture tests/fixtures/art-library-small-v0.1` 只触发 canary-only metadata/export summary，不改变默认 canary JSON fixture、runtime/default behavior 或 repair default。
- 已新增 Metadata Step 4A asset pack metadata bridge / resolver diagnostics review gate：docs-only 定义 Step 4B 允许读取 runtime-safe metadata / small library dry-run output 并生成 deterministic report，不启动 runtime/default integration 或 large library。
- 已新增 Metadata Step 4B asset pack metadata bridge / resolver diagnostics implementation：只新增 `createAssetPackMetadataBridgeSummary` / `createAssetResolverDiagnosticsSummary` 两个 pure report-only helper、focused tests 和 docs；不调用 `resolveLocalAssetPack` / `selectLocalAssetPack`，不实现 unsupported semantic inference。
- 已新增 Step 10A small library bridge canary review gate：docs-only 定义 Step 10B 只能使用 Step 9B fixture-derived explicit inputs 和 Step 4B pure helpers，不允许 runtime/default resolver paths、production/default asset packs 或 large library。
- 已新增 Step 10B small library bridge canary implementation：只新增 fixture-only contract test 与文档记录，使用 Step 9B 小库 metadata export、explicit candidates、exact 10 requested ids 和 Step 4B pure helpers；green canary 与 missing-id / bridge / blocked-context negative diagnostics 分离。
- 已新增 Art Asset Pipeline Production Rollout 拆分索引：将 Step 11A 到 Step 14D 分拆到 `docs/refactor-log/art-asset-pipeline-production-rollout/`，避免继续膨胀本长文档。
- 已完成 Step 13C-B large-library metadata batch zero：导入 approved Pirate Kit 10-asset fixture、10 个 selected existing previews、10 个 sidecar metadata、README/source evidence 和 focused contract test，不接 runtime/default。
- 已完成 Step 13D-A batch-zero semantic dry-run gate：docs-only 定义 Step 13D-B 如何对同一 batch-zero fixture 跑 metadata validation、runtime export、default / repair-enabled canary、comparison、bridge summary 和 resolver-adjacent diagnostics；runtime/default integration 与 production rollout 继续 parked。
- 已完成 Step 13D-B batch-zero semantic dry-run / bridge implementation：同一 Pirate Kit 10-asset fixture 的 metadata validate/export、default / repair-enabled canary、comparison、bridge summary、resolver-adjacent diagnostics 和独立 negative diagnostics 均通过；未接 runtime/default 或 production asset packs。

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
| Step 9A | Small art library intake review gate | 文档化小型真实资源 dry-run 的准入规则，不导入资源 | 已完成 |
| Step 9B | Small art library metadata intake / fixture import | 导入或创建 10-30 个小型 fixture 资产并补 sidecar metadata | 已完成 |
| Step 9C | Small art library dry-run validation / canary / comparison | 对小型库跑 validate / export / canary / comparison 并生成 dry-run report | 已完成 |
| Metadata Step 4A | Asset pack metadata bridge / resolver diagnostics review gate | docs-only 定义 bridge / diagnostics 边界、deterministic outputs 和 large-library exclusion | 已完成 |
| Metadata Step 4B | Asset pack metadata bridge / resolver diagnostics implementation | bridge helper、diagnostic helper、focused tests、deterministic report schema | 已完成 |
| Step 10A | Small library bridge canary review gate | docs-only 定义 fixture-only explicit-input bridge canary，不接生产/default | 已完成 |
| Step 10B | Small library bridge canary implementation | 使用 Step 4B pure helpers 跑 fixture-only green canary 与独立 negative diagnostics | 已完成 |
| Production rollout split | Rollout index and per-step docs | 将 Step 11A-14D 分拆到独立 docs 目录，固化 gate / validation / stop rules | 已完成 |
| Step 11A | Optional non-default runtime integration gate | docs-only gate，若仍需要才讨论非默认 runtime integration | 已完成 |
| Step 11B | Non-default runtime canary implementation | 脚本侧 flag/config + small fixture runtime-safe export canary，不改默认 runtime | 已完成 |
| Step 11C | Runtime canary closure | 关闭非默认 runtime canary lane，沉淀 flag-off / flag-on / rollback / Step 12A 决策证据 | 已完成 |
| Step 12A | Workbench / QA preview gate | docs-only 定义 runtime-safe preview source、safe field allowlist、read-only policy 和 Step 12B 边界 | 已完成 |
| Step 12B | Workbench / QA preview implementation | small-fixture-only preview DTO、API endpoint、Workbench preview-only 展示和 focused tests | 已完成 |
| Step 12C | QA preview signoff | 小库 preview textual signoff、displayed fields、diagnostic semantics、known limitations、Step 13A 建议 | 已完成 |
| Step 13A | Large library intake gate | docs-only 定义大库 storage、license、batch、validation、rollback 和 failure-budget policy，不访问大库 | 已完成 |
| Step 13B | Large library inventory dry-run | Kenney Pirate Kit read-only archive inventory summary，不抽取、不导入、不生成 metadata/thumbnails | 已完成 |
| Step 13C-A | Batch zero selection / import gate | docs-only 批准 Kenney Pirate Kit batch-zero source、10 个候选、fixture layout、metadata / thumbnail / validation policy | 已完成 |
| Step 13C-B | Large library metadata batch zero | Kenney Pirate Kit 10-asset fixture、sidecar metadata、selected previews、focused contract test，不接 runtime/default | 已完成 |
| Step 13D-A | Batch-zero semantic dry-run / bridge gate | docs-only 定义 Pirate Kit batch-zero fixture 的 validation / export / canary / comparison / bridge / resolver-adjacent diagnostics gate | 已完成 |
| Step 13D-B | Batch-zero semantic dry-run / bridge implementation | 对同一 10-asset fixture 跑 full semantic dry-run、bridge summary、resolver-adjacent diagnostics 和独立 negative diagnostics | 已完成 |
| Workbench / QA preview | Diagnostics preview | 预览 bridge diagnostics，不改变 default verdict | 后续 |
| Large library gate | Large asset library scan/import gate | 尺寸、license、metadata、rollout policy gate | parked |
| Production rollout gate | Default asset pack rollout | 生产默认行为变更的独立 gate | parked |

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

## 22. Step 9A small art library intake review gate

状态：已完成。

Step 9A 是 docs-only gate，详见 `docs/refactor-log/asset-semantic-small-art-library-v0.1.md`。

Step 9A 定义：

- small art library target size 为 10 到 30 个 assets，最大 50 个；超过 50 个不属于 Step 9，必须进入独立 large-library rollout gate。
- 推荐路径为 `tests/fixtures/art-library-small-v0.1/`，因为本阶段是 test / dry-run fixture；只有仓库先建立 `assets/canary` 约定时，才考虑 `assets/canary/art-library-small-v0.1/`。
- Step 9B 必须在 import 前明确 per-file、total-size、allowed binary formats、thumbnail 计入规则和外部 artifact reference 表达方式。
- Step 9B 每个 asset 必须有 sidecar metadata，且通过既有 metadata validation，兼容 taxonomy v0.2，并能走 runtime-safe export allowlist。
- Step 9C 必须跑 metadata validate / JSON validate / runtime-safe export / default canary / repair-enabled canary / comparison；canary 当前应使用 `--fixture <small-library-canary-briefs.json>`，comparison 应使用 `--default-summary` / `--repair-enabled-summary` / `--out`，如果现有 `--fixture` 不足以表达 small library dry-run，则记录停止条件或另起 canary-only input option。
- 小型库 dry-run 不进入 production/default runtime，不改变 asset pack loading、Phaser runtime loading、Workbench、resolver default decision、QA aggregation 或 repair default。

Step 9A 未做：

- 未创建 `tests/fixtures/art-library-small-v0.1/` 或 `assets/canary/art-library-small-v0.1/`。
- 未导入真实或大型 binary assets。
- 未创建 metadata sidecar、runtime export artifact、canary fixture、tests、code、runtime consumer 或 asset pack bridge。
- 未启动 Metadata Step 4A、large asset library、DAM / vector / image embedding、Unity / Unreal / glTF / USD 或 C2PA pipeline。

Step 9A 验证：

    git diff --check

审查记录：

- Oracle 初审：P0/P2/P3 无；P1 要求把 canary / comparison 命令示例改为当前 CLI 的 `--fixture`、`--default-summary`、`--repair-enabled-summary` 和 `--out` flag 语法。
- Oracle 复审：P0/P1/P2/P3 均无；确认 Step 9A 仍为 docs-only，未越界到 assets、metadata sidecars、generated artifacts、runtime / resolver / QA / Workbench / Phaser 或 asset pack loading。

## 23. 当前注意事项

- provider `survive_duration` 修复已单独提交；后续 asset semantic fidelity 步骤仍不要混入 provider 改动。
- Step 7 已用默认和 repair-enabled canary summary 证明批量 supported cases 不退化；后续新增 taxonomy / 资源库 / AI image provider 仍必须另起小步，并重新跑 release guard。
- Step 8c 已只完成 canary fixture pack / brief pack v0.2；Step 8d 已只完成 default / repair-enabled canary summary comparison，不扩展资源或运行时行为。
- Step 9A 已只完成 small art library intake review gate。
- Step 9B 已导入 Kenney Cube Pets 小型 fixture 与 sidecar metadata；下一步若继续资产主线，应进入 Step 9C dry-run validation / canary / comparison。
- Step 9C 已完成 dry-run validation / canary / comparison；不得启动 Metadata Step 4A、大资源库接入或 runtime / resolver / QA / Workbench / Phaser 变更。
- shooter HUD stash 仍是独立任务，不应混入 Asset Semantic Fidelity 后续步骤。
- 可选技术债治理应另起命名，例如 pipeline split，不再复用 Step 8a / Step 8b 编号。
- 后续涉及真实验收时仍必须用 Workbench / generated project / QA 产物证明，不只看单测。
- 后续扩展的真实验收至少包含：
  - 小猫射击外星人：不能选 tank 作为 player/enemy。
  - 坦克大战：可以选 tank pack。
  - 泛化 shooter：不应因缺少 hard concept 被误判失败。

## 24. Step 9B small art library metadata intake / fixture import

状态：已完成。

Step 9B 只处理小型真实资源 fixture 与 sidecar metadata：

- 来源：Kenney Cube Pets，`https://kenney.nl/assets/cube-pets`。
- 路径：`tests/fixtures/art-library-small-v0.1/`。
- 导入 10 个 GLB 模型和 10 个匹配 PNG thumbnail：`animal-bee`、`animal-bunny`、`animal-cat`、`animal-crab`、`animal-dog`、`animal-fish`、`animal-fox`、`animal-lion`、`animal-penguin`、`animal-tiger`。
- 为每个 asset 新增 `.asset.json` sidecar，字段满足既有 `ArtAssetMetadataSchema`，并标记 CC0、非 AI 生成、低 rights risk、`small_art_library_fixture` allowed context。
- 新增 focused contract test，锁定 exact 10 basename、目录布局、全 fixture size / extension policy、metadata validation 和 project-relative referenced paths。

Step 9B 不修改：

- runtime/default asset loading、resolver、QA、Workbench、Phaser、asset pack loading 或 repair-enabled default。
- Step 9C canary / comparison 输入与产物。
- Metadata Step 4A、大资源库、DAM / database / vector / image embedding、Unity / Unreal / glTF / USD 或 C2PA pipeline。

验证命令：

    npx vitest run tests/contracts/asset-semantic-small-art-library-fixture.test.ts
    # 1 个测试文件，4 个测试通过

    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    # OK 10 metadata files

    npm run metadata:validate -- --json tests/fixtures/art-library-small-v0.1/metadata
    # ok=true，10 个 files，diagnostics=[]

    npm run metadata:validate -- --check-paths tests/fixtures/art-library-small-v0.1/metadata
    # OK 10 metadata files

    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    # ok=true，artifact.asset_count=10，diagnostics=[]

    npm run metadata:validate -- assets/metadata/examples
    # OK 5 metadata files

    npm run metadata:export-runtime -- --json assets/metadata/examples
    # ok=true，artifact.asset_count=5，diagnostics=[]

    npm run test:contracts
    # 15 个测试文件，165 个测试通过

    npm test
    # contracts 165 个测试通过；workspace 125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

fixture size check：

- `tests/fixtures/art-library-small-v0.1/` 当前 `du -sh` 为 1.5M。
- 全 fixture 文件字节总和为 1,486,226 bytes。
- 最大文件为 `assets/animal-lion.glb`，172,936 bytes。

## 25. Step 9C small art library dry-run validation / canary / comparison

状态：已完成，并已通过 fast-forward merge 关闭 branch boundary。

Step 9C 只处理小型真实资源 fixture 的 deterministic dry-run：

- `npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-small-v0.1` 现在识别 small art library fixture root，并只在 canary dry-run 内读取其 `metadata/`。
- 默认 `--fixture` JSON canary brief 行为不变；未传 `--fixture` 时仍使用 `tests/fixtures/asset-semantic-canary.briefs.json`。
- small library dry-run 先执行 metadata validation 和 runtime-safe export，再构造 deterministic canary summary。
- default 与 repair-enabled small library canary summary 都写入 fixture identity `art-library-small-v0.1` 和 `assetCount=10`。
- comparison helper 现在要求 default 与 repair-enabled summary 的 `fixturePath` / fixture identity / asset count 一致，并在 comparison output 写入 deterministic fixture summary。

Step 9C 不修改：

- runtime/default asset loading、resolver、QA aggregation、Workbench、Phaser、asset pack loading 或 repair-enabled default。
- Metadata Step 4A bridge/resolver diagnostics。
- large asset library。
- Step 9B fixture asset set 或 source metadata。

已通过验证：

    npx vitest run tests/contracts/asset-semantic-small-library-dry-run.test.ts tests/contracts/asset-semantic-canary-comparison.test.ts
    # 2 个测试文件，9 个测试通过

    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    # OK 10 metadata files

    npm run metadata:validate -- --json tests/fixtures/art-library-small-v0.1/metadata
    # ok=true，10 个 files，diagnostics=[]

    npm run metadata:validate -- --check-paths tests/fixtures/art-library-small-v0.1/metadata
    # OK 10 metadata files

    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    # ok=true，artifact.asset_count=10，diagnostics=[]

    npm run metadata:validate -- assets/metadata/examples
    # OK 5 metadata files

    npm run metadata:export-runtime -- --json assets/metadata/examples
    # ok=true，artifact.asset_count=5，diagnostics=[]

    npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-small-v0.1 --timestamp 20260613Tstep9c-default
    # artifacts/asset-semantic-canary/20260613Tstep9c-default，runnable=10 passed=10 failed=0，repair.enabled=false

    npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-small-v0.1 --timestamp 20260613Tstep9c-repair
    # artifacts/asset-semantic-canary/20260613Tstep9c-repair，runnable=10 passed=10 failed=0，repair.enabled=true

    npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260613Tstep9c-default/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260613Tstep9c-repair/summary.json --out artifacts/asset-semantic-canary-comparison/20260613Tstep9c-small-library/comparison.json
    # ok=true，case.total=10，failureDiagnosticDelta=0

    npm run qa:asset-semantic:canary -- --limit 1 --timestamp 20260613Tstep9c-default-behavior-smoke
    # default JSON fixture smoke 仍通过：runnable=1 skipped=17 passed=1 failed=0

    node -e "<artifact path check>"
    # Step 9C summaries / comparison 不包含 /Users；comparison 不包含 ISO timestamp 或 summary.json 路径

    git ls-files --others --exclude-standard artifacts/asset-semantic-canary/20260613Tstep9c-default artifacts/asset-semantic-canary/20260613Tstep9c-repair artifacts/asset-semantic-canary-comparison/20260613Tstep9c-small-library
    # 无输出，说明 generated artifacts 位于 ignored 路径

    find tests/fixtures/art-library-small-v0.1/assets -maxdepth 1 -type f -name '*.glb' | wc -l
    # 10

阶段结果：

- default canary artifact：`artifacts/asset-semantic-canary/20260613Tstep9c-default/summary.json`。
- repair-enabled canary artifact：`artifacts/asset-semantic-canary/20260613Tstep9c-repair/summary.json`。
- comparison artifact：`artifacts/asset-semantic-canary-comparison/20260613Tstep9c-small-library/comparison.json`。
- comparison `ok=true`；default / repair-enabled 均 `failure_diagnostic_count=0`、`diagnostic_codes=[]`、`medium_warning_count=0`；所有 delta 为 0。
- generated artifacts 全部在 ignored `artifacts/` 下，未加入 git。
- small library fixture asset count 仍为 10。

审查记录：

- Oracle 复审：P0/P1/P2 未发现问题；确认 `--fixture` directory branch 只影响 canary/dry-run，default JSON canary 行为保持不变；确认 default / repair-enabled 使用相同 small library fixture path / identity / asset count；确认 generated artifacts 位于 ignored `artifacts/` 路径且未进入 git。
- P3 可选：未来若继续修改 runner，可补 CLI 级 small-library smoke test；本步已有本地命令验证，不阻塞提交。

## 26. Metadata Step 4A asset pack metadata bridge / resolver diagnostics review gate

状态：已完成。

Step 4A 只记录 future bridge / diagnostics 边界：

- 新增 `docs/refactor-log/asset-pack-metadata-bridge-step-4a.md`，定义 Step 4B 可读取 runtime-safe metadata artifacts、small library dry-run outputs 或 fixture metadata，并生成 deterministic bridge summary / resolver diagnostics / compatibility report。
- 明确 resolver diagnostics 只能 report-only，不能改变 resolver ranking、selection、fallback、hard gate、repair trigger 或 runtime/default behavior。
- 明确 small library dry-run output 只能作为 fixture / canary / bridge diagnostic input，不能成为 production/default asset loading 输入。
- 明确 large asset library 继续 parked，Step 4B 不得扫描或导入大资源库。

Step 4A 不修改：

- code、tests、asset imports、metadata sidecars 或 generated artifacts。
- runtime/default asset loading、resolver、QA aggregation、Workbench、Phaser 或 asset pack loading。
- repair-enabled default、repair writeback 或 unsupported asset promotion。
- Step 4B implementation。

Step 4B 未来允许：

- 新增 bridge helper。
- 新增 resolver diagnostic helper。
- 新增 focused tests。
- 新增 deterministic report schema。
- 更新 docs。

Step 4B 未来不允许：

- runtime/default loading。
- production asset pack integration。
- Workbench UI。
- Phaser runtime loading。
- large library rollout。
- repair-enabled default。
- source metadata rewrite。
- large asset library scan/import。

后续路线保持分布落地：

1. Metadata Step 4B asset pack metadata bridge / resolver diagnostics implementation。
2. Small library bridge canary，仍保持 fixture-only / non-production。
3. Non-default runtime integration，必须显式 opt-in。
4. Workbench / QA preview，只预览 diagnostics，不改变 default verdict。
5. Large library gate，单独审查 size、license、scan/import 和 rollout policy。
6. Production rollout gate，单独审查 default asset pack behavior、resolver consumer 和 runtime loading。

验证：

    git diff --check

审查记录：

- Oracle 审查：P0/P1/P2/P3 均无阻塞；确认 Step 4A 仍为 docs-only，未越界到 code、tests、asset imports、metadata sidecars、generated artifacts、runtime/default behavior、resolver、QA、Workbench、Phaser、asset pack loading、large library 或 Step 4B implementation。

## 27. Metadata Step 4B asset pack metadata bridge / resolver diagnostics implementation

状态：已完成。

Step 4B 只实现 report-only helper：

- 新增 `packages/asset-pipeline/src/asset-pack-metadata-bridge.ts`，提供 `createAssetPackMetadataBridgeSummary`。
- 新增 `packages/asset-pipeline/src/asset-pack-resolver-diagnostics.ts`，提供 `createAssetResolverDiagnosticsSummary`。
- 更新 `packages/asset-pipeline/src/index.ts` 只导出新增 helper 类型/API。
- 新增 `tests/contracts/asset-pack-metadata-bridge.test.ts`。
- 新增 `tests/contracts/asset-pack-resolver-diagnostics.test.ts`。
- 新增 `docs/refactor-log/asset-pack-metadata-bridge-step-4b.md`。

Bridge summary 可报告：

- duplicate runtime metadata asset id。
- duplicate candidate asset id。
- missing candidate asset id。
- runtime metadata asset without candidate。
- candidate without runtime metadata。
- source path mismatch。
- thumbnail path mismatch。
- absolute path rejected。

Resolver diagnostics 可报告：

- missing requested asset id。
- blocked context from explicit `gameplay.blocked_contexts` + input `contextId`。
- duplicate runtime asset id。
- absolute path rejected。

Unsupported semantic diagnostics decision：

- Step 4B 不实现 unsupported semantic diagnostics。
- 原因是当前 helper input 没有 caller-provided expected tags / expected roles / expected semantic constraints。
- 后续若要加入 unsupported semantic diagnostics，必须先扩展显式 expected semantic input，并补 focused tests，不能从 requested asset id 或 context 伪造推断。

Step 4B 不修改：

- runtime/default asset loading。
- resolver decisions。
- production resolver implementation。
- QA runtime behavior。
- Workbench。
- Phaser runtime。
- asset pack loading behavior。
- production/default asset packs。
- large asset library。
- source metadata 或 source assets。
- repair-enabled default 或 repair writeback。

Step 4B 明确不调用：

- `resolveLocalAssetPack`
- `selectLocalAssetPack`

Small library fixture 用途：

- `tests/fixtures/art-library-small-v0.1/metadata` 只作为 focused tests 的 runtime-safe export input。
- 不接入 production/default asset packs。
- 不改变 Step 9B fixture asset set 或 source metadata。

已通过验证：

    npx vitest run tests/contracts/asset-pack-metadata-bridge.test.ts tests/contracts/asset-pack-resolver-diagnostics.test.ts
    # 2 个测试文件，15 个测试通过

    npm run test:contracts
    # 18 个测试文件，184 个测试通过

    npm test
    # contracts 184 个测试通过；workspace 125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    # OK 10 metadata files

    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    # ok=true，artifact.asset_count=10，diagnostics=[]

    npm run metadata:validate -- assets/metadata/examples
    # OK 5 metadata files

    npm run metadata:export-runtime -- --json assets/metadata/examples
    # ok=true，artifact.asset_count=5，diagnostics=[]

    git diff --check
    # 无输出

审查记录：

- Oracle 首轮审查：P0/P1/P2 未发现；P3 指出 thumbnail mismatch diagnostic 的 `jsonPath` 应指向 candidate thumbnail field。已改为 `$.candidates[index].thumbnail_path` 并补测试锁定。
- Oracle 复审：P0/P1/P2/P3 均无；确认 Step 4B 保持 pure report-only helper / focused tests / docs 范围，未越界到 runtime/default behavior、resolver decisions、QA、Workbench、Phaser、asset pack loading、large library、repair writeback 或 unsupported semantic inference。

## 28. Step 10A small library bridge canary review gate

状态：当前 docs-only gate，完成后 Step 10B 才能开始。

Step 10A 只记录 future small library bridge canary 边界：

- 新增 `docs/refactor-log/asset-pack-metadata-bridge-step-10a-small-library-canary.md`。
- Step 10B 必须是 fixture-only explicit-input canary。
- Step 10B 只能使用 `createAssetPackMetadataBridgeSummary` 和 `createAssetResolverDiagnosticsSummary`。
- Step 10B 不得使用 `resolveLocalAssetPack`、`selectLocalAssetPack`、real resolver path、runtime/default resolver path、QA runtime path、Workbench path、Phaser runtime path 或 asset pack loading path。
- Step 10B 不得要求 unsupported semantic diagnostics；当前 Step 4B helper 没有 explicit expected semantic input。

Step 10B input rules：

- 可使用 `tests/fixtures/art-library-small-v0.1/` 和 `tests/fixtures/art-library-small-v0.1/metadata`。
- 可使用从 small library metadata 生成的 runtime-safe metadata。
- 可使用从 fixture metadata 或 file layout 派生的 explicit bridge candidates。
- green path 使用 exact 10 known small-library asset ids 作为 `requestedAssetIds`。
- missing-id / blocked-context cases 必须作为 focused negative diagnostics，不能混入 green canary。

Step 10B pass/fail criteria：

- metadata validation passes。
- runtime export succeeds。
- bridge summary `ok=true` for matching explicit candidates。
- resolver-adjacent diagnostics summary `ok=true` for the 10 valid requested ids。
- negative diagnostics deterministic and separate。
- no runtime/default behavior changes。
- no production/default asset pack or large asset library touched。
- no generated artifacts committed。

Step 10A 不修改：

- code、tests、scripts 或 generated artifacts。
- runtime/default asset loading。
- resolver behavior。
- QA、Workbench、Phaser 或 asset pack loading。
- production/default asset packs。
- large asset library。
- source metadata 或 metadata sidecars。

未来边界：

- Step 10B：implement fixture-only explicit-input small library bridge canary。
- Step 11A：docs-only gate for optional non-default runtime integration, if still needed。
- Step 13A：large library gate remains future and separate。

验证：

    git diff --check
    # 无输出

审查记录：

- Oracle pre-review：Go for docs-only；要求 Step 10B 写成 fixture-only explicit-input canary，禁止 runtime/default resolver integration，并明确 green canary 与 negative diagnostics 分离。
- Oracle 首轮审查：P0/P2/P3 未发现；P1 指出 Step 9C dry-run output wording 可能放宽 Step 10B executable input boundary。已收窄为 prior evidence only，Step 10B executable inputs 必须 fresh derive from small fixture metadata、runtime-safe export 和 explicit test/dry-run input。
- Oracle 复审：P0/P1/P2/P3 均无；确认 Step 10A docs-only gate 可在 staged diff 检查后提交。

## 29. Step 10B small library bridge canary implementation

状态：当前 implementation 步骤。

已完成内容：

- 新增 `tests/contracts/asset-pack-small-library-bridge-canary.test.ts`。
- 使用 `tests/fixtures/art-library-small-v0.1/metadata` 生成 runtime-safe metadata。
- 从同一份 runtime-safe metadata 派生 explicit bridge candidates。
- 使用 exact 10 small-library asset ids 作为 sorted `requestedAssetIds`。
- 使用 Step 4B pure report-only helpers：
  - `createAssetPackMetadataBridgeSummary`
  - `createAssetResolverDiagnosticsSummary`
- 将 green canary 与 missing-id、missing-candidate、blocked-context negative diagnostics 分离。

Step 10B green canary 证明：

- runtime export succeeds for 10 fixture assets。
- bridge summary `ok=true`、`matched_count=10`、`diagnostic_count=0`。
- resolver-adjacent diagnostics summary `ok=true`、`requested_count=10`、`resolved_count=10`、`diagnostic_count=0`。
- in-memory canary summary deterministic，且不包含 timestamp、absolute local path 或 production/default asset pack path。

Step 10B negative diagnostics：

- missing requested id 使用 `creature_kenney_cube_pet_otter_001`，只在独立 resolver-adjacent negative case 中出现。
- missing bridge candidate 使用 `creature_kenney_cube_pet_cat_001`，只在独立 bridge negative case 中出现。
- blocked context 使用 fixture metadata 明确声明的 `production_default_runtime`，只在独立 resolver-adjacent negative case 中出现。
- 不发明 unsupported semantic diagnostics；当前 helper 仍没有 explicit expected semantic input。

行为边界：

- 未修改 runtime/default asset loading。
- 未修改 resolver behavior。
- 未调用 `resolveLocalAssetPack` 或 `selectLocalAssetPack`。
- 未使用 real/default resolver paths。
- 未接 QA、Workbench、Phaser 或 asset pack loading。
- 未触碰、扫描或导入 large asset library。
- 未修改 source assets 或 metadata sidecars。
- 未提交 generated artifacts。
- 未让 repair-enabled mode 成为默认。

验证：

    npx vitest run tests/contracts/asset-pack-small-library-bridge-canary.test.ts

审查记录：

- Oracle 只读审查：P0/P1/P2/P3 均无。
- Oracle 确认 green canary 只从 `tests/fixtures/art-library-small-v0.1/metadata` runtime export 派生输入，只调用 `createAssetPackMetadataBridgeSummary` / `createAssetResolverDiagnosticsSummary`。
- Oracle 确认 missing-id、missing-candidate、blocked-context negative diagnostics 与 green canary 分离且 deterministic。
- Oracle 确认 docs 未误称 runtime integration、production/default loading、real resolver execution、large library rollout 或 Workbench/Phaser integration 已完成。

未来边界：

- Step 11A：non-default runtime integration gate remains future if needed。
- Large asset library gate remains parked。
