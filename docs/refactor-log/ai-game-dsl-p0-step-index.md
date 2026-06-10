# AI Game DSL P0 Step Index

最新维护时间：2026-06-11

## 1. 扫描结论

- 当前本步新增/修改的 dodger runtime 相关文件已按职责检查；既有测试文件、`normalizer.ts`、`GameScene.ts` 和 Playwright runner 超过 220 行，按职责集中保留并由针对性测试覆盖。
- 仓库非依赖文件中当前最大文件是 `docs/ai_game_dsl_p0_local_implementation.md`，约 2880 行，属于实施规格文档。
- 现有阶段记录位于 `docs/refactor-log/ai-game-dsl-p0-review-gated.md`。
- 当前已完成阶段：P0 主链路修复 + 模型 DSL 视觉执行复核修复 + DSL-first P1 Step 6 shooter enemy_wave runtime_plan。
- 当前下一步：DSL-first P1 Step 7 继续扩展一个可执行可玩性薄片；优先考虑 collector 小闭环，或在 shooter enemy_wave 基础上做二阶增强。

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

## 5. 当前状态

Step 0 到 Step 9、P0 主链路修复及模型 DSL 视觉执行复核修复已完成。DSL-first P1 扩展已开始，当前完成 Step 6：模型生成的 shooter Raw DSL 通过 normalizer 派生为 `runtime_plan.enemy_waves`，由 shooter runtime 执行 enemy wave spawn budget / maxActive / interval / speed multiplier，并由 QA snapshot 与 `enemy.hit` / `enemy.cleared` payload 证明；真实 DeepSeek 生成链路已通过 normalize/compile/build/QA。

完成结果：

- Contract Freeze、Monorepo + 一键启动、Local Workspace Storage、Model Provider、DSL Validator / IR Normalizer、Phaser Templates、Compiler + Build + Preview、Playwright QA、Auto Repair、Workbench UI 收尾、Generate 主链路修复和模型 DSL 视觉执行复核修复均已落地。
- 每步均已完成本地验证、Sentinel/Oracle 只读审查和阶段文档记录。
- 当前 P0 文档范围不再有未执行步骤。

当前下一步：

- DSL-first P1 Step 7：可继续选择 collector 的一个小闭环，或在 shooter 已验证的 enemy wave 基础上做更小的二阶增强。
- 任一扩展都必须继续遵守顺序：contract/runtime/QA 先于 prompt，真实模型链路验证后再沉淀文档。

后续如继续扩展，应继续作为独立 P1/P2 阶段推进，避免把扩展能力混入 P0 收尾：

- 模型端到端真实生成质量增强。
- Workbench 重新运行 QA / 清理本地数据按钮。
- CORS middleware 单元测试。
- repair runner 与完整 job pipeline 深度集成。
- P1 扩展能力、生产部署、多用户、权限、数据库或云端能力。
