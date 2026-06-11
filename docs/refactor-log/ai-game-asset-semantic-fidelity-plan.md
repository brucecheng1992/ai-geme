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
- `AssetManifest` 已包含 source pack、license、status、summary。
- QA report 已包含 `asset_report`，Workbench Assets 面板可展示 manifest/runtime load 状态和 source pack。

Step 3 完成后的剩余缺口：

- manifest 没有 `semanticFit`。
- 尚未写出 `asset_resolution_report.json`。
- QA / Workbench 不识别“加载成功但语义错配”。

## 4. 分步落地计划

| 步骤 | 边界 | 主要产物 | 验收 |
| --- | --- | --- | --- |
| Step 0 | 需求拆分与执行门禁 | 本文档、step index / review log 链接 | 文档检查 + 只读审查 |
| Step 1 | Taxonomy + AssetPlan semantic constraint | canonical tags、strictness、`AssetPlanItem.semantic` | 已完成 |
| Step 2 | Local pack metadata profile | pack / asset subject tags、theme tags、metadata schema | 已完成 |
| Step 3 | Resolver semantic hard gate | complete-pack selection hard gate、fallback on hard mismatch | 已完成 |
| Step 4 | Manifest semanticFit + resolution report | `semanticFit`、`asset_resolution_report.json` | 当前下一步 |
| Step 5 | QA + Workbench semantic status | `assetSemanticStatus`、mismatch failure、UI 展示 | mismatch 不显示纯绿色 `PLAYABLE` |
| Step 6 | 自动修复回路 | mismatch 后重选 / fallback trace | 故意错配后能 repair 到 fallback |
| Step 7 | 回归批量验收 | E2E cases 和真实 Workbench proof | cat/alien、tank/tank、generic shooter 均通过对应验收 |

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

下一步 Step 4 应只增加 manifest semantic fit 和 asset resolution report，让 manifest 可解释 selected / rejected / fallback reason；仍不改变 QA / Workbench 判定。

## 9. 审查门禁

每一步按 review-gated-refactor 执行：

1. 本地验证通过。
2. Oracle 只读审查或明确记录主 agent 自审降级原因。
3. 修复 P0/P1/P2 后复验。
4. 把修改范围、验证命令、审查结论写回 `docs/refactor-log/ai-game-dsl-p0-review-gated.md`。
5. 再做文档复审门禁。

## 10. 当前注意事项

- provider `survive_duration` 修复已单独提交；后续 asset semantic fidelity 步骤仍不要混入 provider 改动。
- 本阶段真实验收必须用 Workbench 生成项目证明，不只看单测。
- 真实验收至少包含：
  - 小猫射击外星人：不能选 tank 作为 player/enemy。
  - 坦克大战：可以选 tank pack。
  - 泛化 shooter：不应因缺少 hard concept 被误判失败。
