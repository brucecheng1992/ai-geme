# AI Game Art Asset Metadata v0.1 Step 1 Schema And Vocabulary

完成时间：2026-06-12

## 1. 本步目标

实现 metadata v0.1 的数据契约层：schema、controlled vocabulary、JSON Schema artifact、示例 sidecar manifests 和 contract tests。

关键约束：

- 不接 validation CLI。
- 不接 runtime-safe export。
- 不接 resolver、QA、Workbench 或 Phaser runtime。
- 不改变 `AssetPlan` / `AssetManifest` / repair / fallback 行为。
- 不引入数据库、DAM、UI、AI image provider 或引擎深度集成。

## 2. 已完成内容

- 新增 `packages/asset-pipeline/src/art-asset-metadata.vocabulary.ts`，集中定义 v0.1 enum、`ArtAssetControlledVocabularySchema` 和 `ART_ASSET_CONTROLLED_VOCABULARY`。
- 新增 `packages/asset-pipeline/src/art-asset-metadata.schema.ts`，提供 `ArtAssetMetadataSchema` 和 `parseArtAssetMetadata`。
- `packages/asset-pipeline/src/index.ts` 导出 metadata schema / vocab。
- 新增 `assets/metadata/controlled_vocabulary.json`。
- 新增 `assets/metadata/schema/ai_game_art_asset.schema.json`。
- 新增 5 个 example sidecar manifests：
  - `character_npc_merchant.asset.json`
  - `environment_prop_forest_clearing.asset.json`
  - `material_texture_wood_plank.asset.json`
  - `prop_container_barrel.asset.json`
  - `ui_icon_inventory.asset.json`
- 新增 `tests/contracts/art-asset-metadata.test.ts`，覆盖 JSON Schema artifact、controlled vocabulary、examples、invalid enum、缺失 required semantic tags、unsafe path 和 slug policy。

## 3. 阶段结果

- Metadata v0.1 现在具备可导入的 TypeScript/Zod schema 和非 TS 工具可读 JSON Schema artifact。
- Controlled vocabulary JSON 必须与 TypeScript 常量全量一致。
- JSON Schema artifact 已表达关键 Zod 契约：asset id、slug、date、safe project-relative path、required/min/max、`additionalProperties: false`、`relations` / `search` shape 和 enum。
- v0.1 canonical slug policy 已锁定：允许小写字母开头、后续小写字母/数字/下划线；拒绝 digit-prefix、单字符和 hyphen slug。
- 本步没有读取或写入现有 runtime artifacts，没有改 resolver、QA、Workbench 或 Phaser template。

文件规模：

- `art-asset-metadata.vocabulary.ts`：175 行。
- `art-asset-metadata.schema.ts`：119 行。
- `art-asset-metadata.test.ts`：211 行。
- `ai_game_art_asset.schema.json`：336 行，属于 declarative schema artifact。

## 4. TDD 记录

RED：

    npx vitest run tests/contracts/art-asset-metadata.test.ts

首次失败点：

- 缺少 `assets/metadata/schema/ai_game_art_asset.schema.json`。
- 缺少 `assets/metadata/controlled_vocabulary.json`。
- 缺少 `assets/metadata/examples`。
- 缺少 `ArtAssetMetadataSchema` / parser export。

Oracle P1 修复前新增 RED：

    npx vitest run tests/contracts/art-asset-metadata.test.ts

失败点：

- JSON Schema artifact 缺少 `$defs.slug` / safe path 等关键约束。

GREEN：

    npx vitest run tests/contracts/art-asset-metadata.test.ts

结果：6 个测试通过。

## 5. 已通过验证

    npm run test:contracts
    # 9 个测试文件，125 个测试通过

    npm test
    # contracts 125 个测试通过；workspace 125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

## 6. 审查门禁结论

- Oracle 首轮审查：P0 无。
- Oracle 首轮 P1：JSON Schema artifact 弱于 Zod 契约，尤其 path safety、slug pattern、array min/max、relations/search shape；已修复。
- Oracle 首轮 P2：文档状态仍停在 Step 0；本记录用于关闭该项。
- Oracle 首轮 P3：slug policy 需显式测试；JSON Schema enum 第三份副本需一致性测试；已补测试。
- Oracle 代码复审：P0/P1/P2/P3 均无，代码门禁通过。
- 审查模式：Oracle 新建后复用。

## 7. 当前下一步

Metadata v0.1 Step 2 已完成。当前下一步是 Step 3：

- 新增 runtime-safe metadata export。
- 只输出 runtime 可消费白名单字段。
- 剔除 prompt、negative prompt、seed、review notes、third-party source details 等内部或敏感字段。
- 继续不改变 resolver、QA、Workbench 或 Phaser runtime 行为。
