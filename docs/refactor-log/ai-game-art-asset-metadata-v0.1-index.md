# AI Game Art Asset Metadata v0.1 Index

最新维护时间：2026-06-12

## 1. 目标

把外部 `AI Game 美术资源 Semantic Metadata 规范 v0.1` 转成当前仓库可逐步落地的工程任务。当前阶段只建立轻量、引擎无关、可校验的 metadata infrastructure，让新进入项目的美术资源先具备合法 sidecar manifest，再逐步接入检索、runtime-safe export 和现有 Asset Pipeline。

本阶段必须服务现有主链路：

```txt
DSL / IR -> AssetPlan -> Asset Pipeline -> AssetManifest -> Phaser preload/load -> QA -> Workbench
```

Metadata v0.1 不是替代 `AssetPlan` / `AssetManifest`，而是补足“资产库 source of truth”层，让资源进入 resolver / QA / Workbench 前有可审计的语义、玩法、技术、版权和 workflow 信息。

## 2. 资料来源

| 来源 | 作用 | 当前处理方式 |
| --- | --- | --- |
| `<LOCAL_ARTIFACT_SOURCE_SPEC>` | 产品规格源，包含 metadata 分层、P0/P1/P2 字段、manifest 示例、JSON Schema 示例、runtime export 建议 | 不整篇复制进现有大计划；提炼成本文档和 step 文档 |
| `<LOCAL_CODEX_ATTACHMENT_SOURCE>` | 对话型需求来源，明确建议 Codex 先做 v0.1 工程骨架 | 用于拆分 required deliverables 和非目标 |
| `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md` | 当前 Asset Semantic Fidelity 主线，已完成 Step 1-8a | 作为边界约束：不改 resolver / QA / Workbench / Phaser 行为 |
| `docs/refactor-log/ai-game-dsl-p0-step-index.md` | 当前工程阶段入口 | 增加 metadata v0.1 的独立入口 |

## 3. 当前边界

Metadata v0.1 当前只做这些：

- sidecar JSON metadata contract。
- controlled vocabulary。
- 示例 metadata manifests。
- validation command。
- runtime-safe metadata export。
- tests。
- README / usage docs。

Metadata v0.1 当前不做这些：

- 不做完整 DAM、数据库、后台 UI 或权限系统。
- 不接 AI image provider。
- 不接 Unity / Unreal / glTF / USD 深度集成。
- 不新增 Raw DSL asset path / URL / base64 字段。
- 不改变 resolver ranking、Step 3 hard gate、fallback 策略或 repair loop。
- 不改变 QA overall status、Workbench 大 UI 或 Phaser runtime。
- 不让 Codex 自动拍板最终美术 ontology、世界观 taxonomy、版权风险政策或审核责任人。

## 4. 推荐工程落点

后续实现默认从以下落点开始；每一步执行前仍需重新扫描代码确认：

| 类型 | 建议位置 | 说明 |
| --- | --- | --- |
| Schema / parser / exporter | `packages/asset-pipeline/src/art-asset-metadata*.ts` | 复用当前 asset-pipeline 的 Zod / TypeScript 约定 |
| JSON Schema artifact | `assets/metadata/schema/ai_game_art_asset.schema.json` | 满足外部规范对 JSON Schema 的交付要求 |
| Controlled vocabulary | `assets/metadata/controlled_vocabulary.json` | 固定 v0.1 enum，不靠自由标签漂移 |
| Example manifests | `assets/metadata/examples/*.asset.json` | 覆盖 character、environment / prop、interactable prop、UI icon、material / texture |
| Validation script | `scripts/validate-art-asset-metadata.ts` | 支持单文件和目录校验 |
| Runtime export script | `scripts/export-art-runtime-metadata.ts` | 输出 runtime-safe JSON，剔除 prompt、seed、review notes 等内部字段 |
| Tests | `tests/contracts/art-asset-metadata.test.ts` | 覆盖 valid / invalid manifest、duplicate id、path 检查、runtime export privacy |
| Usage docs | `docs/refactor-log/ai-game-art-asset-metadata-v0.1-*.md` | 每步沉淀目标、验证和审查结论 |

## 5. 分步计划

| Step | 边界 | 主要产物 | 验收 |
| --- | --- | --- | --- |
| Step 0 | 需求分布与文档拆分 | 本 index、requirement map、step index 入口 | `git diff --check` + review-gated 文档审查 |
| Step 1 | Schema + controlled vocabulary + examples | metadata schema、vocab、5 类示例 manifest、contract tests | metadata contract tests + `npm run typecheck:root` |
| Step 2 | Validation command | 单文件 / 目录校验、duplicate `asset_id`、非法 enum、缺字段、路径存在性检查 | CLI tests + 手动运行示例目录 |
| Step 3 | Runtime-safe export | runtime metadata schema / exporter / script，剔除 internal-only 字段 | exporter tests + privacy negative tests |
| Step 4 | Existing asset-pack metadata bridge | 为当前 tiny asset packs 建立 sidecar metadata 或映射层，不改变 resolver | contract tests + canary smoke |
| Step 5 | Asset Pipeline read-only integration | resolver / report 可读取 metadata diagnostics，但不改变选择结果 | resolution report tests + QA 不退化 |
| Step 6 | Optional production gates | 新资源进入项目必须通过 metadata validation；接入 canary / CI 脚本 | targeted tests + docs |

## 6. 当前状态

当前已完成 Step 0、Step 1 和 Step 2：

- Step 0：需求拆分、边界确认和文档入口创建。
- Step 1：schema / controlled vocabulary / JSON Schema artifact / 5 个 example sidecar manifests / contract tests。
- Step 2：validation API / CLI / deterministic JSON output / structured diagnostics / duplicate `asset_id` / optional path existence checks / contract tests。

没有修改 resolver、QA、Workbench、Phaser template 或现有 asset pack 的运行行为。

当前下一步：

- Metadata v0.1 Step 3：落 runtime-safe metadata export，按白名单输出 runtime 可消费字段，并剔除 prompt、seed、review notes、third-party source details 等内部字段。
- Asset Semantic Fidelity 主线若继续扩展，仍按原计划先做 Step 8b canary fixture promotion，再做 Step 8c 小包资源扩展；不要和 metadata infrastructure 混成一个大步骤。
