# AI Game DSL P0 Step Index

最新维护时间：2026-06-12

## 1. 扫描结论

- Asset Pipeline P0 Step 1-5 已完成，Workbench Assets 面板直接消费 QA report `asset_report` 展示 manifest summary、runtime loaded / failed、结构化 failure reason、source pack 和 license；既有测试文件、`App.tsx`、`normalizer.ts`、`GameScene.ts` 和 Playwright runner 超过 220 行，按职责集中保留并由针对性测试或浏览器烟测覆盖。
- 新增 Asset Semantic Fidelity 阶段，用于修复“资源加载成功但语义错配”；执行计划见 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`。
- 仓库非依赖文件中当前最大文件是 `docs/ai_game_dsl_p0_local_implementation.md`，约 2880 行，属于实施规格文档。
- 现有阶段记录位于 `docs/refactor-log/ai-game-dsl-p0-review-gated.md`。
- 当前已完成阶段：P0 主链路修复 + 模型 DSL 视觉执行复核修复 + DSL-first P1 Step 6 shooter enemy_wave runtime_plan + Asset Pipeline P0 Step 1-5（含 Step 5.1 tiny local asset pack slice）+ Asset Semantic Fidelity Step 1-6b。
- 当前下一步：Asset Semantic Fidelity Step 6c：显式 repair pipeline integration；仍不批量接入新资源库、不接入 AI image provider。

## 2. 大文档拆分索引

`docs/ai_game_dsl_p0_local_implementation.md` 暂作为完整规格源，不直接拆散原文。后续实现按以下职责边界引用章节，并把每一步执行结果追加到 `docs/refactor-log/ai-game-dsl-p0-review-gated.md`。

| 阶段 | 规格章节 | 本步边界 | 主要产物 |
| --- | --- | --- | --- |
| Step 0 | 15, 17-19, 21, 25, 27 | Contract Freeze | schema、contract、capability、QA gate、contract tests |
| Step 1 | 4, 6, 7, 8-10, 36 | Monorepo + 一键启动 | `apps/maker-api`、`apps/maker-workbench`、启动/检查脚本 |
| Step 2 | 4.2-4.3, 11-14 | Local Workspace Storage + Job/API Contract | 路径边界、project/run store、events.jsonl、项目状态 API 契约 |
| Step 3 | 16, 30-31 | Model Provider | DeepSeek client、JSON 生成、raw output logging、错误映射 |
| Step 4 | 17-21 | DSL Validator + IR Normalizer | DSL 校验、机制合同校验、IR 派生、fixtures |
| Step 5 | 22-27 | Phaser Templates | collector/dodger/shooter template、telemetry、QA bridge |
| Step 6 | 28 | Compiler + Build + Preview | 编译生成项目、Vite build、静态 preview、build logs |
| Step 7 | 26-27, 34-35 | Playwright QA | deterministic QA、telemetry gate、QA report |
| Step 8 | 29 | Auto Repair | DSL patch、最多 2 次修复、repair report |
| Step 9 | 32-33, 35 | Workbench UI 收尾 | 状态轮询、preview iframe、QA/Telemetry/build log 展示 |
| P0 Fix | 37 | 主链路修复 | Generate 完整执行 DSL、IR、生成项目、build、preview、QA，并收敛失败状态 |
| P0 Review Fix | 24, 37, 40 | 模型 DSL 视觉执行复核修复 | shooter 模板执行 DSL 派生 primitive visual，避免只换 label |

横切参考章节：

- 第 5 节技术栈冻结：每一步新增依赖、脚本或应用骨架时都必须遵守。
- 第 12 节 API Contract：首次实现项目状态、运行事件、QA 报告和重跑 QA 时必须同步；Workbench 后续只消费同一套 API Contract，不另造前端私有协议。
- 第 37 节最小开发里程碑：`No Model Golden Path` 是里程碑验收口径，不作为独立并列实施步骤。
- 第 38-40 节风险、P1 扩展和最终 P0 定义：用于每阶段交付时确认未越界。

## 3. 执行门禁

每一小步必须满足：

1. 只处理一个边界清晰的问题。
2. 先读取相关代码、配置、规格章节和同类实现。
3. 使用最小必要改动，不顺手治理无关文件。
4. 修改后运行与本步行为对应的验证。
5. 完成本地验证后执行只读审查门禁；若 Oracle 不可用，记录主 agent 自审结论和原因。
6. 审查无 P0/P1/P2 阻塞后，把结果写回阶段记录文档。
7. 文档更新后再次做文档复审门禁。

## 4. Step 1 拆分计划

Step 1 不一次性实现完整业务，只建立可启动骨架和健康检查边界。

### 1.1 应用包骨架

目标：

- 补齐 `apps/maker-api` 和 `apps/maker-workbench` 的 `package.json`、`src` 入口和最小开发脚本。
- 保持 API / Workbench 只做健康检查和占位页面，不引入 Job Protocol 业务状态。
- 同步让类型检查覆盖新增 `apps/*` 源码，或补充等价的 app 级 typecheck/build 验证。

验证：

    npm run typecheck

### 1.2 一键启动脚本

目标：

- 让 `npm run maker:start` 先执行 setup，再并发启动 API 和 Workbench。
- 启动失败时保留可定位上下文。

验证：

    npm run maker:doctor
    npm run maker:start

`npm run maker:start` 是长驻命令，验收时必须记录可判定结果：setup 完成、API health 可访问、Workbench 页面可访问、端口输出清晰、进程可被干净终止。

### 1.3 本地配置与端口检查

目标：

- 固定 API / Workbench 本地端口。
- `maker:doctor` 检查 Node、依赖、目录和必需环境变量占位，不读取或输出密钥值。

验证：

    npm run maker:doctor

## 5. Asset Pipeline P0 v0.2 拆分计划

新落地文档 `AI_Game_Maker_P0_DSL_Asset_Pipeline_落地文档.md` 的新增核心是资源合同与可证明的资源加载。按 review-gated 小步推进：

| 阶段 | 本步边界 | 主要产物 | 状态 |
| --- | --- | --- | --- |
| Asset Step 1 | AssetPlan / AssetManifest artifact gate | `packages/asset-pipeline`、`asset_plan.json`、`public/asset_manifest.json`、`public/assets/*.svg`、QA browser 前置 asset gate | 已完成 |
| Asset Step 2 | Phaser manifest preload / consume | generated `asset-manifest.generated.json` 或 loader、template preload、asset loaded / failed telemetry、QA required asset loaded gate | 已完成 |
| Asset Step 3 | Asset QA report enrichment | QA report 中展示 required / loaded / failed / placeholder 资源明细，区分 `ASSET_MISSING`、`REQUIRED_CORE_ASSET_PLACEHOLDER_USED` 与 runtime load failure | 已完成 |
| Asset Step 4 | Workbench asset status panel | Workbench 展示 manifest summary、asset failure reason，避免 report 404 噪音回归 | 已完成 |
| Asset Step 5 | Tiny local asset pack slice | 一个完整 collector 资源包切片，覆盖资源选择、license、runtime loaded、QA 和 Workbench 展示 | 已完成 |

执行约束：

1. 不新增 Raw DSL asset path / URL / base64 字段。
2. 不接 AI image provider；先保持 deterministic template SVG provider，并用小型 local asset pack 验证资源库合同。
3. 每步先 contract / compiler / QA，再 prompt 或 Workbench。
4. `PLAYABLE` 判定必须逐步从文件存在升级到 runtime loaded + visual / interaction / telemetry 全部通过。

## 6. 当前状态

Step 0 到 Step 9、P0 主链路修复及模型 DSL 视觉执行复核修复已完成。DSL-first P1 扩展已完成到 Step 6：模型生成的 shooter Raw DSL 通过 normalizer 派生为 `runtime_plan.enemy_waves`，由 shooter runtime 执行 enemy wave spawn budget / maxActive / interval / speed multiplier，并由 QA snapshot 与 `enemy.hit` / `enemy.cleared` payload 证明；真实 DeepSeek 生成链路已通过 normalize/compile/build/QA。

Asset Pipeline P0 v0.2 已开始，当前完成 Step 1、Step 2、Step 3、Step 4 和 Step 5：生成项目写入 `asset_plan.json`、`public/asset_manifest.json` 和 `public/assets/*.svg`；Playwright QA 在浏览器前用 `asset_plan` 反查 manifest required 资源并确认文件是普通文件；dodger 和 collector 生成项目写入 `asset-manifest.generated.json`，Phaser runtime 从 manifest `loadKey` preload / render 主资源，并由 QA 读取 `__GAME_TELEMETRY__.assets` 验证 required asset loaded；QA report 现在写入 `asset_report`，包含 manifest 派生资源明细、runtime asset telemetry、结构化 asset failure 和 source pack / license；Workbench Assets 面板已接入 `asset_report`，并能展示资源包和 license。真实 Maker stack 已验证 `proj_20260611_064732_c31d` / `run_20260611_064732_c31d` 为 `PLAYABLE`。

完成结果：

- Contract Freeze、Monorepo + 一键启动、Local Workspace Storage、Model Provider、DSL Validator / IR Normalizer、Phaser Templates、Compiler + Build + Preview、Playwright QA、Auto Repair、Workbench UI 收尾、Generate 主链路修复和模型 DSL 视觉执行复核修复均已落地。
- 每步均已完成本地验证、Sentinel/Oracle 只读审查和阶段文档记录。
- 原 P0 主链路文档范围不再有未执行步骤；新 Asset Pipeline v0.2 文档范围继续按上方 Asset Step 推进。

- 当前下一步：

- 当前进入 Asset Semantic Fidelity 阶段；外部方案包已拆成项目内计划文档 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`。Step 1 已落地 Taxonomy + AssetPlan semantic constraint，Step 2 已落地 local pack metadata profile / asset-level semantic tags / metadata index，Step 3 已落地 resolver hard semantic gate，Step 4 已落地 manifest `semanticFit` 和 `asset_resolution_report.json`，Step 5 已落地 QA + Workbench semantic status，Step 5.5a 已新增 canary brief fixture baseline，Step 5.5b 已新增 canary batch runner 和 summary report，Step 6a 已新增只生成结构化 repair plan 的 Asset Repair Planner，Step 6b 已新增显式 conservative Repair Executor；下一步进入 Step 6c：repair pipeline integration。
- 后续可作为独立扩展候选接入第二个 tiny pack 或真实第三方资源包切片；继续保持小包白名单，不做全量导入。
- 若转回 DSL-first P1 Step 7，应作为独立扩展继续遵守顺序：contract/runtime/QA 先于 prompt，真实模型链路验证后再沉淀文档。

后续如继续扩展，应继续作为独立 P1/P2 阶段推进，避免把扩展能力混入 P0 收尾：

- 模型端到端真实生成质量增强。
- Workbench 重新运行 QA / 清理本地数据按钮。
- CORS middleware 单元测试。
- repair runner 与完整 job pipeline 深度集成。
- P1 扩展能力、生产部署、多用户、权限、数据库或云端能力。
