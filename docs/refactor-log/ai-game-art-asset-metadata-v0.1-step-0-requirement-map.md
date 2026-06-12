# AI Game Art Asset Metadata v0.1 Step 0 Requirement Map

完成时间：2026-06-12

## 1. 本步目标

把外部 metadata 规范和附件里的 Codex 落地建议拆成当前仓库可执行的小步计划。本步只做需求分布、边界收敛和文档沉淀，不实现代码。

关键约束：

- 保持 DSL-first 和 manifest-driven asset pipeline。
- 不把 metadata 工作做成完整 DAM。
- 不改变 `AssetPlan` / `AssetManifest` / resolver / QA / Workbench / Phaser runtime 行为。
- 不把 Step 8b / 8c 的资源扩展和 metadata infrastructure 混成一个大改。

## 2. 需求分层

| 需求 | 问题层级 | Step | 说明 |
| --- | --- | --- | --- |
| 每个美术资源都有独立 manifest | 数据契约 | Step 1 | 建立 sidecar metadata contract，不先引入数据库 |
| P0 必填字段校验 | 数据契约 | Step 1 | 覆盖 `asset_id`、`asset_type`、`title`、`description`、`semantic_tags`、`visual_style`、`world`、`gameplay_role`、`affordances`、`allowed_contexts`、`blocked_contexts`、`source_path`、`thumbnail_path`、`license`、`status`、`version` 等 |
| controlled vocabulary | 数据契约 | Step 1 | 固定 v0.1 enum，避免 `npc` / `NPC` / `char` 漂移 |
| 示例 metadata manifests | 文档规则 + 数据契约 | Step 1 | 用示例锁定字段形状和命名风格 |
| validate 单文件 / 目录 | 工具配置 + 边界适配 | Step 2 | 让新资源进入项目之前可自动验证 |
| duplicate `asset_id` | 数据契约 | Step 2 | 目录级校验，单文件 schema 无法覆盖 |
| `source_path` / `thumbnail_path` 存在性检查 | 边界适配 | Step 2 | 只检查 repo 内相对路径；缺文件时给可定位错误 |
| runtime-safe export | 边界适配 | Step 3 | 只导出 runtime 需要字段，剔除 prompt、seed、reference、review notes、版权备注 |
| valid / invalid tests | 测试 | Step 1-3 | 每步跟随对应 contract tests |
| README / usage | 文档规则 | Step 1-3 | 解释如何新增、校验、导出 metadata |
| 当前 asset pack metadata bridge | 数据契约 + 边界适配 | Step 4 | 先映射现有 tiny packs，不批量导入外部资源 |
| 让 resolver 利用 metadata | 业务规则 | Step 5+ | 只读 diagnostics 先行；改变选择结果必须另起门禁 |

## 3. 字段范围

### 3.1 Step 1 必填字段

Step 1 优先覆盖规范里的 v0.1 P0 字段：

- `asset_id`
- `asset_type`
- `asset_subtype`
- `title`
- `description`
- `version`
- `status`
- `semantic.world`
- `semantic.semantic_tags`
- `semantic.visual_style`
- `gameplay.gameplay_role`
- `gameplay.affordances`
- `gameplay.allowed_contexts`
- `gameplay.blocked_contexts`
- `technical.source_path`
- `technical.thumbnail_path`
- `technical.file_format`
- `ai_generation.generated_by_ai`
- `rights.creator`
- `rights.license`
- `rights.commercial_use`
- `rights.training_use_allowed`
- `rights.rights_risk_level`
- `workflow.owner`
- `workflow.updated_at`

### 3.2 Step 1 可选字段

这些字段可以出现在 schema 和 examples 中，但不能成为 v0.1 入口阻塞：

- `semantic.genre`
- `semantic.subject`
- `semantic.mood`
- `semantic.color_palette`
- `semantic.dominant_colors`
- `gameplay.biome`
- `gameplay.rarity`
- `gameplay.spawnable`
- `gameplay.interaction_type`
- `technical.engine_targets`
- `technical.platform_budget`
- `ai_generation.prompt_summary`
- `ai_generation.negative_prompt_summary`
- `ai_generation.ai_system_used`
- `ai_generation.ai_system_version`
- `ai_generation.seed`
- `ai_generation.human_edit_level`
- `relations`
- `search.embedding_input`

### 3.3 Runtime export 白名单

Step 3 的 runtime-safe export 只保留这类字段：

- identity：`asset_id`、`asset_type`、`asset_subtype`、`title`、`description`、`version`
- semantic：`world`、`semantic_tags`、`visual_style`、`mood`、`subject`
- gameplay：`gameplay_role`、`affordances`、`allowed_contexts`、`blocked_contexts`、`rarity`、`spawnable`、`interaction_type`
- technical：`source_path`、`thumbnail_path`、`file_format`、`platform_budget`
- rights gate：`license`、`commercial_use`、`rights_risk_level`

Step 3 必须排除：

- full prompt / negative prompt
- seed
- reference image paths
- review notes
- legal notes
- rejection reason
- internal artist notes
- third-party source details

## 4. 非目标细化

以下需求来自外部规范，但不进入 metadata v0.1 第一阶段：

- keyword search、vector search、image similarity search。
- central DB / Postgres / MongoDB / Airtable / Notion / DAM。
- Unity ScriptableObject / Addressables exporter。
- Unreal DataAsset / PrimaryAssetLabel exporter。
- glTF `KHR_xmp_json_ld` 写入。
- OpenUSD `assetInfo` / `customData` 写入。
- C2PA / IPTC / XMP provenance pipeline。
- MaterialX / lookdev deep integration。
- 500-1000 资源规模后的 asset graph / knowledge graph。
- 自动打标模型。
- 美术审核责任制、版权政策和最终 ontology 决策。

## 5. 与当前 Asset Semantic Fidelity 的关系

当前 Asset Semantic Fidelity 已证明：

- `AssetPlan` 可以携带 semantic constraint。
- local pack 可以有 pack / asset semantic metadata。
- resolver hard gate 可以阻止 hard semantic mismatch。
- `AssetManifest.semanticFit` 和 `asset_resolution_report.json` 可以解释候选拒绝原因。
- QA / Workbench 可以展示 semantic status。
- repair planner / executor / pipeline integration 仍默认关闭并受 flag 控制。

Metadata v0.1 后续应补的是“资源进入项目之前的 source-of-truth contract”，不是继续在 generated manifest 或 QA report 上堆字段。正确顺序是：

```txt
sidecar art metadata -> validated asset library entry -> AssetPlan / resolver adapter -> AssetManifest diagnostics -> QA / Workbench
```

## 6. Step 0 阶段结果

已完成内容：

- 建立 `docs/refactor-log/ai-game-art-asset-metadata-v0.1-index.md`。
- 建立本文档，记录需求分布、字段范围、非目标和后续 step。
- 将 metadata v0.1 从 Asset Semantic Fidelity Step 8b / 8c 中拆出，作为独立 infrastructure 工作。
- 更新 `docs/refactor-log/ai-game-dsl-p0-step-index.md`，把 Metadata v0.1 作为独立入口，并移除过期的“提交 Step 8a”下一步描述。

明确未改范围：

- 未修改源码、测试、脚本或 package scripts。
- 未修改现有 asset pack。
- 未改变 resolver ranking、fallback、repair、QA、Workbench 或 Phaser runtime。

已通过验证：

    git diff --check

审查门禁结论：

- Oracle 首轮审查：P0/P1/P2 均无；P3 指出 Step Index 顶部仍残留“提交 Step 8a”，可能误导后续 agent。
- 已修复：Step Index 顶部改为并列说明 Asset Semantic Fidelity Step 8b / 8c 和 Metadata v0.1 Step 1。
- Oracle 复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 新建后复用。

## 7. 当前下一步

Metadata v0.1 Step 1 和 Step 2 已完成。当前下一步是 Step 3：

- 新增 runtime-safe metadata export。
- 按白名单输出 runtime 可消费字段。
- 剔除 prompt、negative prompt、seed、review notes、third-party source details 等内部或敏感字段。
- 仍不接 resolver、QA、Workbench 或 Phaser runtime。
