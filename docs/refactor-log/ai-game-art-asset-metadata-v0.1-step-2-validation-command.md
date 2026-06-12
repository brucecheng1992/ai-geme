# AI Game Art Asset Metadata v0.1 Step 2 Validation Command

完成时间：2026-06-12

## 1. 本步目标

实现 metadata v0.1 的 sidecar manifest validation command。验证入口只接受 `.asset.json` 文件或包含 `.asset.json` 的目录，并复用 Step 1 已建立的 `ArtAssetMetadataSchema` 和 controlled vocabulary contract。

关键约束：

- 不做 runtime-safe export。
- 不桥接现有 asset pack metadata。
- 不修改 resolver、QA、Workbench、Phaser runtime 或现有 asset pack 行为。
- 不新增数据库、UI、runtime loader、AI image provider 或引擎专用格式。
- `source_path` / `thumbnail_path` 存在性只在显式启用 path check 时校验。

## 2. 已完成内容

- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.ts`，提供 `validateArtAssetMetadataFiles`、human / JSON formatter 和 exit code helper。
- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.types.ts`，固定 validation result、diagnostic 和 exit code 类型。
- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.diagnostics.ts`，集中处理 Zod issue 到稳定 diagnostic code / `jsonPath` 的映射。
- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.discovery.ts`，递归发现目录内 `.asset.json` sidecar 文件，并保持确定性排序。
- `packages/asset-pipeline/src/index.ts` 导出 validation API 和类型。
- 新增 `scripts/validate-art-asset-metadata.ts`，作为 `npm run metadata:validate` 的 CLI 入口。
- `package.json` 新增脚本：

    npm run metadata:validate

- 新增 `tests/contracts/art-asset-metadata-validation.test.ts`，覆盖 valid examples、缺字段、非法 enum、重复 `asset_id`、schema-invalid duplicate、malformed JSON、deterministic JSON output、human output 和显式 path existence check。
- 新增 `tests/contracts/art-asset-metadata-validation-cli.test.ts`，真实执行 CLI，覆盖 usage error / input error 的 exit code 2。

## 3. 命令用法

默认校验 `assets/metadata`：

    npm run metadata:validate

校验单个 sidecar manifest：

    npm run metadata:validate -- assets/metadata/examples/prop_container_barrel.asset.json

校验目录：

    npm run metadata:validate -- assets/metadata/examples

输出 CI 可读 JSON：

    npm run metadata:validate -- --json assets/metadata/examples

显式检查 `technical.source_path` 和 `technical.thumbnail_path` 是否存在：

    npm run metadata:validate -- --check-paths --project-root . assets/metadata/examples

Exit code：

| Code | 含义 |
| --- | --- |
| 0 | 所有 metadata manifests 有效 |
| 1 | 发现 validation diagnostics |
| 2 | CLI usage 或 internal error |

## 4. Diagnostic Contract

每个 diagnostic 都是结构化对象：

| 字段 | 说明 |
| --- | --- |
| `severity` | 当前固定为 `error` |
| `code` | 稳定错误码 |
| `message` | 人类可读错误说明 |
| `filePath` | 触发错误的 manifest 文件路径 |
| `jsonPath` | 可定位到字段时提供，例如 `$.technical.source_path` |
| `assetId` | manifest 中可读取到 `asset_id` 时提供 |

当前 Step 2 会产生这些稳定 code：

- `MALFORMED_JSON`
- `REQUIRED_FIELD_MISSING`
- `INVALID_CONTROLLED_VOCABULARY`
- `INVALID_FIELD_FORMAT`
- `SCHEMA_VALIDATION_FAILED`
- `DUPLICATE_ASSET_ID`
- `SOURCE_PATH_MISSING`
- `THUMBNAIL_PATH_MISSING`
- `INPUT_PATH_NOT_FOUND`
- `UNSUPPORTED_INPUT_PATH`
- `NO_METADATA_FILES`

## 5. 本步刻意不做

- 不输出 runtime-safe metadata；Step 3 再处理字段白名单和隐私字段剔除。
- 不把 metadata 接入 resolver ranking、hard gate、repair、QA aggregation 或 Workbench UI。
- 不把现有 tiny local asset pack metadata 自动转换为 `.asset.json`。
- 不支持 YAML、CSV、内嵌 JS/TS metadata 或非 sidecar 输入格式。
- 不把 `source_path` / `thumbnail_path` 的存在性检查设为默认阻塞；默认只校验 schema 内要求的 safe project-relative path。
- 不创建 central asset library database、DAM 后台、权限模型或搜索索引。

## 6. 固定验收口径

Step 2 只做 metadata 进入项目之前的门禁，不做消费方。validation command 进 CI 后，每个新美术资源进入项目前都必须先过 metadata validation，避免脏 metadata 扩散到 resolver、QA、Workbench 或 runtime 链路。

P0：

- validation command 不能 falsely pass invalid metadata。
- duplicate `asset_id` 必须被检测。
- diagnostics 含错误时 CLI 不能退出 0。
- command 不能 import 或 mutate runtime、resolver、Workbench、Phaser、QA 或 existing asset pack 行为。
- JSON Schema artifact 不能再次弱于 Zod contract。

P1：

- diagnostics 必须稳定、结构化、可解析。
- JSON output order 必须 deterministic。
- path checks 不能让 examples 默认变脆；`source_path` / `thumbnail_path` 存在性检查必须显式开启。
- validation logic 必须复用 Step 1 contract layer，不能复制一套平行 schema。

P2：

- docs 不能暗示 Step 2 已实现 runtime export。
- command name 和 options 必须保持项目脚本约定一致。
- malformed JSON、invalid enum、duplicate `asset_id` 必须有 negative tests。

P3：

- minor wording、formatting、naming cleanups。

当前推进顺序固定为：

1. Step 0：文档规则。
2. Step 1：数据契约。
3. Step 2：validation command。
4. Step 3：runtime-safe export。
5. Step 4：asset pack metadata bridge / resolver diagnostics。

## 7. 文件规模

- `art-asset-metadata-validation.ts`：207 行。
- `art-asset-metadata-validation.diagnostics.ts`：92 行。
- `art-asset-metadata-validation.discovery.ts`：63 行。
- `art-asset-metadata-validation.types.ts`：46 行。
- `validate-art-asset-metadata.ts`：85 行。
- `art-asset-metadata-validation.test.ts`：206 行。
- `art-asset-metadata-validation-cli.test.ts`：78 行。

验证模块按职责拆成 API / diagnostics / discovery / types，避免把文件发现、schema issue 映射、CLI 格式化和 path existence check 混在一个大文件里。

## 8. 已通过验证

    npx vitest run tests/contracts/art-asset-metadata-validation.test.ts tests/contracts/art-asset-metadata-validation-cli.test.ts
    # 2 个测试文件，12 个测试通过

    npx vitest run tests/contracts/art-asset-metadata.test.ts
    # 6 个测试通过

    npm run test:contracts
    # 11 个测试文件，137 个测试通过

    npm test
    # contracts 137 个测试通过；workspace 125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm run metadata:validate -- assets/metadata/examples
    # OK 5 metadata files

    npm run metadata:validate -- --json assets/metadata/examples
    # 输出 version=art-asset-metadata-validation-v0.1、ok=true、5 个 files、diagnostics=[]

## 9. 审查门禁结论

- Oracle 首轮审查：P0 无；确认未越界到 runtime、resolver、QA、Workbench、Phaser 或 existing asset pack。
- Oracle 首轮 P1：input / usage 类错误会返回 1，无法和 validation errors 区分；duplicate `asset_id` 只覆盖 schema-valid 文件。
- 已修复：`ArtAssetMetadataValidationExitCode` 扩为 `0 | 1 | 2`，input / usage diagnostics 返回 2；duplicate detection 改为 JSON parse 成功且 `asset_id` 是 string 后即收集，不依赖 schema 成功。
- Oracle 首轮 P2：缺少真实 CLI exit code 回归测试；human output 对非法文件显示 `0 metadata files`。
- 已修复：新增 CLI contract test 覆盖 unknown flag、缺 `--project-root` value 和 missing input path 的 exit code 2；`files` 现在记录发现到的 sidecar 文件，human summary 对非法文件也显示正确文件数。
- Oracle 首轮 P3：missing required field 分类依赖 Zod message 文本。
- 已修复：required field 判断改为基于原始 JSON path 是否存在。
- Oracle 复审：上一轮 P1/P2/P3 均关闭，未发现新的 P0/P1/P2。
- 审查模式：Oracle 新建后复用。

## 10. 当前下一步

Metadata v0.1 Step 3：

- 新增 runtime-safe metadata export。
- 只输出 runtime 可消费白名单字段。
- 剔除 prompt、negative prompt、seed、review notes、third-party source details 等内部或敏感字段。
- 继续不改变 resolver、QA、Workbench 或 Phaser runtime 行为。
