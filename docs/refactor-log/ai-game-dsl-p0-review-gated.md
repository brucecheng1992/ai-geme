# AI Game DSL P0 Review-Gated Refactor Log

## 分阶段拆分

分阶段执行顺序以 `docs/refactor-log/ai-game-dsl-p0-step-index.md` 为准。

`No Model Golden Path`、`Model DSL Path`、`Full Local Path` 和 `Repair Path` 是规格第 37 节的里程碑验收口径，不作为独立并列实施步骤。

## 当前阶段

当前处于 Step 19 Catalog-backed AssetManifest Identity lane。Step 19 已让 local/template catalog identity 从 `AssetManifest` / Phaser preview manifest 显式流入 `asset_library_usage_report.json`，并通过 usage report 与 asset pipeline report 校验一致性；未新增 artifact content/download/path API，未提交，未 push。

执行索引：`docs/refactor-log/ai-game-dsl-p0-step-index.md`。

当前下一步：Step 19 代码、验证、文档与 Oracle 门禁已完成；准备提交 `feat: add catalog identity to asset manifests`，不 push。Runtime/default broad rollout 仍 parked，未来 broad/default rollout 只有在单独 approval gate 明确批准后才可开始。shooter HUD stash 仍作为独立任务处理；不要混入 AI image provider、runtime/default integration、resolver / QA verdict / Phaser / repair 改动或 provider survive_duration 修复。

### 2.54 Step 17: Pre-push Stack Audit / Prompt Coach Safety Gap

完成时间：2026-06-15

已完成内容：

- 对 `origin/main..HEAD` 的 17 个本地提交执行 push 前审计，确认工作区原始状态为 `main...origin/main [ahead 17]`。
- 修复 Oracle 发现的 P2：Prompt Coach LLM output validator 与 Workbench Prompt Coach client 对泛 API key、`process.env.*`、Bearer 凭证、本地临时/家目录路径、Windows 反斜杠路径、raw provider 文本识别不足。
- 修复 Prompt Coach API-facing error 边界：provider failure message 不再拼接进 `ProjectRequestError` 对外响应，统一映射为稳定错误文案。
- `pipeline-evidence-client.ts` 复用既有 `workbench-display-safety.ts` 的 path / reason 安全 helper，避免 evidence panel 与 acceptance summary 的安全展示规则继续分叉。
- 新增回归测试覆盖：
  - Prompt Coach 后端 LLM 输出包含 `OPENAI_API_KEY`、`process.env.OPENAI_API_KEY`、Bearer、raw provider 和 `C:\Users\...` 时拒绝写成功 artifacts。
  - Prompt Coach provider failure message 包含 env / Bearer / 本地路径时，服务层错误不透传敏感文本。
  - Workbench Prompt Coach 错误、报告字段和 artifact refs 不展示泛 env / Bearer / 本地路径。
  - 保留玩家 prompt 中 `Collect tokens` 这类正常游戏语义，不把普通 gameplay token 误判为 secret。

阶段结果：

- Artifact refs API 仍只有固定 `/artifacts` 和 `/acceptance` 读取面；没有新增 artifact content、download 或 arbitrary path API。
- Prompt Coach 仍是 prepare-only candidate：mock 默认 deterministic，LLM 仅在 `PROMPT_COACH_LLM_ENABLED=true` 时启用。
- 本次修复不修改 DSL schema、generation prompt、QA verdict、Phaser runtime、live edit、provider abstraction、asset pack 或 report contract。

已通过验证：

    git diff --check origin/main..HEAD
    # 无输出

    rg -n "<<<<<<<|=======|>>>>>>>" . -g '!node_modules' -g '!dist' -g '!build'
    # 无冲突标记命中

    npx vitest run tests/workspace/prompt-coach.test.ts tests/workspace/workbench-prompt-coach-client.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 3 个测试文件，30 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm test
    # contracts 24 个测试文件 / 224 个测试通过；workspace 25 个测试文件 / 273 个测试通过

审查记录：

- Oracle 首轮：
  - P2：Prompt Coach LLM output validator / Workbench Prompt Coach client 脱敏边界漏掉泛 API key、`process.env.*`、Bearer、本地临时/家目录路径和 raw provider 文本。
  - P1：按 `origin/main..HEAD` 字面审查时，早期已批准 step 中的 DSL schema / generation prompt / Phaser / live edit / asset pack 变更被判为与当前 Step 17 非目标冲突；这些变更对应历史已完成步骤，不是 Step 17 新增变更。
- Oracle 第二轮：P0/P1 非阻塞；发现 2 个残留 P2：
  - 后端 Prompt Coach LLM output validator 未覆盖 Windows 反斜杠路径。
  - Prompt Coach provider failure message 仍可能作为 API-facing error 原样暴露 provider 文本。
- Oracle 最终复审：P0/P1/P2 clear；确认 Windows 反斜杠路径、provider failure message 透传、Workbench Prompt Coach 展示边界和 Pipeline Evidence shared safety helper 均已覆盖；允许提交本次最小 Step 17 safety fix，不 push。

### 2.53 Step 11: Prompt Coach Workbench Opt-in Panel

完成时间：2026-06-15

已完成内容：

- 新增 Workbench 侧 Prompt Coach types：`PromptOptimizationMode`、`PromptOptimizationReport`、`PromptOptimizationArtifactRef` 和 `PreparePromptOptimizationResponse`。
- 新增 `prompt-coach-client.ts`，只调用 `POST /api/projects/:projectId/prompt-optimizations/prepare`；request body 包含 `originalPrompt`、optional `runId` 和 `mode`，缺省 mode 为 `mock`。
- 新增 `PromptCoachPanel.tsx`：提供 local prompt draft、`mock | llm` selector、prepare loading/error/result 三态、copy optimized prompt 和 `Use optimized prompt`。
- Workbench `App.tsx` 只挂接 `PromptCoachPanel`；`Use optimized prompt` 仅调用 `setIdea(candidate)`，不会 submit generate、不会写 project prompt。
- result view 展示 optimized prompt candidate、original prompt、intent summary、DSL warnings、unsupported requests、suggested questions、supported DSL version、mode / strategy 和 safe artifact refs。
- Workbench client 过滤 artifact refs：只展示 `model-output` 下非空安全相对路径，并要求 `promptOptimizationReport/json` 或 `optimizedPrompt/txt` 的 id/format 配对。
- Workbench client 对后端错误文本做脱敏：命中 env / provider / secret / authorization / raw provider / absolute path 类文本时，只显示稳定通用错误 `Prompt Coach LLM mode is unavailable.`；普通 gating 错误如 `Prompt Coach LLM mode is not configured.` 仍可显示。
- Prompt Coach draft 使用 `{ draft, dirty }`：主 Game brief 变化时，未编辑的 panel draft 会同步；用户已编辑的独立 draft 不会被自动覆盖；`Use game brief` 显式重置为当前主输入。

阶段结果：

- Prompt Coach Workbench 仍是 opt-in prepare / preview，不新增服务端 apply endpoint。
- 未修改 Step 10 LLM adapter、schema normalizer、后端 PromptOptimizationReport contract、`GenerationPipelineService`、DSL generation prompt、DSL schema、QA verdict、Phaser、live edit、asset reports 或 `pipeline_artifact_index`。
- 未新增 provider、未做 provider abstraction，未把 API key / env / provider config / raw provider response 暴露到 Workbench。
- `App.tsx` 只新增 import 和组件挂接，主要状态 / 请求 / view-model 被收敛在 `PromptCoachPanel.tsx` 和 `prompt-coach-client.ts`。

已通过验证：

    npx vitest run tests/workspace/workbench-prompt-coach-client.test.ts
    # 1 个测试文件，11 个测试通过

    npx vitest run tests/workspace/workbench-prompt-coach-client.test.ts tests/workspace/prompt-coach.test.ts tests/workspace/projects-service.test.ts
    # 3 个测试文件，38 个测试通过

    npx vitest run tests/workspace/pipeline-artifact-index.test.ts tests/workspace/prompt-coach-llm-client.test.ts
    # 2 个测试文件，6 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：24 个测试文件，268 个测试通过

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：20 个测试文件，238 个测试通过

浏览器验收：

- 本地启动 `npm run maker:start` 后，用 Playwright 打开 `http://127.0.0.1:5173/`。
- 使用既有 project/run，mock prepare 显示 candidate、warnings、unsupported requests、suggested questions 和相对 artifact refs。
- `Use optimized prompt` 只更新本地 `Idea` textarea；未观察到 `/generate`、`/live-edits` 或 `/live-edit/` 请求。
- `mode=llm` 未配置时显示 `Prompt Coach LLM mode is not configured.`，没有 silent fallback mock。
- 页面正文未出现 `DEEPSEEK_API_KEY`、`secret-test-key`、`authorization: Bearer` 或 `raw provider`。

审查门禁结论：

- Oracle 首轮：P0 clear；P1 指出 Workbench 错误展示路径可能原样暴露 env/provider 错误文本；P2 指出 Prompt Coach local draft 不随主 Idea 更新；P3 指出 artifact ref 过滤可补 id/format/path 非空校验。
- 已修复：错误消息脱敏、clean/dirty draft 同步模型、artifact ref id/format/path 白名单，并补 3 类测试覆盖。
- Oracle 复审：P0/P1/P2 clear，P3 acceptable；确认未引入自动 apply/generation、未触碰 Step 10 adapter / schema normalizer / DSL schema / QA verdict / Phaser / asset pipeline / `pipeline_artifact_index`。
- 审查模式：Oracle 新建 + 复审。

### 2.52 Step 10: Prompt Coach Gated LLM Mode

完成时间：2026-06-15

已完成内容：

- 扩展 Prompt Coach prepare request，支持 `mode: "mock" | "llm"`；缺省仍为 `mock`。
- 拆出 `prompt-coach.contract.ts`，让 `prompt_optimization_report.json` contract 显式记录 `mode`、`strategy` 和可选 `modelProfile`，并约束 mode / strategy 一致。
- 拆出 `prompt-coach-mock.ts`，保持 Step 9 mock strategy / hash 输入兼容，mock 继续 deterministic。
- 新增 `PromptCoachDeepSeekClient` 专用窄 adapter；只有 `PROMPT_COACH_LLM_ENABLED=true` 时 `ProjectsModule` 才启用 LLM mode。
- Prompt Coach LLM adapter 使用 JSON-only system/user prompt，禁止输出 Phaser / JS / TS code、`game_dsl.json`、asset manifest、runtime patch、provider call、file system path、secret / env / API key / headers / raw provider data。
- LLM adapter 不复用会写 raw provider response 的 `DeepSeekClient`，不写 raw provider output artifact。
- 新增 `prompt-coach-llm-output.ts`，对 LLM JSON 做 strict schema validation、长度限制、数组长度限制、危险文本过滤、trim / 去空 / 去重 / deterministic 排序。
- LLM success report 使用 `strategy: "llm-v1"`、`mode: "llm"` 和安全 `modelProfile`；不记录 API key、headers、raw provider response、provider response id、token cost 或 timestamp。
- LLM mode 失败时抛明确 API error，不写 `prompt_optimization_report.json` success、不写 `optimized_prompt.txt`、不写 `game_dsl.json`、不改 project prompt、不触发 generation pipeline。
- LLM `optimizationId` hash scope 包含 normalized payload hash，避免同 run / prompt / mode 的不同 LLM 输出互相覆盖；mock 路径不纳入 payload hash，保持 deterministic。

阶段结果：

- Prompt Coach 仍为 prepare-only / non-apply；没有新增 apply 行为。
- 未修改现有 DSL generation prompt、`GenerationPipelineService`、`GameDslProviderService`、DSL schema、QA verdict、Phaser、live edit、asset reports 或 `pipeline_artifact_index`。
- 未接入 provider abstraction / registry；本步只新增 Prompt Coach 专用 DeepSeek adapter。
- 文件职责已拆分：`prompt-coach.service.ts` 184 行，contract / mock / llm output / llm client 均为小文件。

已通过验证：

    npx vitest run tests/workspace/prompt-coach-llm-client.test.ts tests/workspace/prompt-coach.test.ts tests/workspace/projects-service.test.ts
    # 3 个测试文件，29 个测试通过

    npx vitest run tests/workspace/pipeline-artifact-index.test.ts
    # 1 个测试文件，4 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：19 个测试文件，227 个测试通过

审查门禁结论：

- Oracle 首轮：P0 无；P1 指出 LLM 危险文本过滤未覆盖 `dslFitWarnings` / `unsupportedRequests` / `capabilitiesUsed`；P2 指出同 run / prompt / mode 不同 LLM 输出可能覆盖同一 artifact path；P3 指出注释、mode/strategy schema 和重复读取 config 可收紧。
- 已修复：危险文本过滤覆盖所有进入 report 的 LLM 字符串字段；LLM `optimizationId` 纳入 normalized payload hash；更新 service 注释；report schema 约束 mode/strategy；`ProjectsModule` 只读取一次 DeepSeek config。
- Oracle 复审：P0/P1/P2 均无，确认未引入新的阻塞问题。
- 审查模式：Oracle 新建 + 复审。

### 2.51 Step 9: Prompt Coach Artifact Contract / Prepare API

完成时间：2026-06-15

已完成内容：

- 新增 `PromptCoachService`，用 deterministic `mock-v1` 策略生成 `prompt_optimization_report.json` contract 和 `optimized_prompt.txt`。
- 新增 `POST /api/projects/:projectId/prompt-optimizations/prepare`，只做 prepare，不 apply，不触发 `GenerationPipelineService.run`。
- `PromptOptimizationReport` 记录 `reportVersion`、`projectId`、可选 `runId`、稳定 `optimizationId`、`originalPrompt`、`optimizedPrompt`、`intentSummary`、deterministic warnings / unsupported requests / suggested questions、`supportedDslVersion: "v1"`、`capabilitiesUsed`、`status: "prepared"`、`applied: false`、`strategy: "mock-v1"`。
- artifact 写入 project-level model-output：`prompt-optimizations/<optimizationId>/prompt_optimization_report.json` 和 `prompt-optimizations/<optimizationId>/optimized_prompt.txt`。
- `optimizationId` hash scope 包含 `projectId`、`runId ?? "project-level"`、normalized original prompt、DSL version 和 strategy，避免同 project/prompt 不同 run 的 artifact path 互相覆盖。
- API 边界校验 project 存在、optional `runId` ownership、`originalPrompt` 非空；空白 `runId` 不降级为 project-level scope。
- 更新 `ProjectsModule` 注入 `PromptCoachService`，并同步已有 `ProjectsService` 构造点。
- 新增 `tests/workspace/prompt-coach.test.ts`，扩展 `tests/workspace/projects-service.test.ts`。

阶段结果：

- Prompt Coach 本阶段仅优化“意图表达”，不生成 Phaser 代码，不写或修改 `game_dsl.json`，不修改 project `idea` / original prompt。
- prompt optimization artifacts 通过 response artifacts refs 暴露；本步未修改 Step 8 `pipeline_artifact_index` schema 或既有 contract。
- 本步未改 `asset_pipeline_report` / `dsl_validation_report` 语义，未改 QA verdict、DSL schema、Phaser、live edit、Chrome MCP 或 provider abstraction。
- 同一 exact scope 重复 prepare 会 deterministic 幂等重写相同内容；未来若 report 引入时间、人工编辑或非 deterministic 字段，应升级为 no-clobber / versioned write。

已通过验证：

    npx vitest run tests/workspace/prompt-coach.test.ts tests/workspace/projects-service.test.ts
    # 2 个测试文件，20 个测试通过

    npx vitest run tests/workspace/pipeline-artifact-index.test.ts
    # 1 个测试文件，4 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：18 个测试文件，218 个测试通过

审查门禁结论：

- Oracle 首轮：P0/P1/P2 无；确认未接真实 LLM / provider、未改 generation prompt、未覆盖 project idea / originalPrompt、未写 `game_dsl.json`、未触发 generation pipeline、artifact refs 为相对路径，未破坏 pipeline artifact index、QA verdict、DSL schema、Phaser、live edit 或 asset pipeline。
- Oracle P3：空白 `runId` 会降级为 project-level scope；已修复为显式 reject 并补 RED/GREEN 测试。
- Oracle P3：同一 exact scope 重复 prepare deterministic 幂等重写相同 artifact；本阶段接受，记录为未来非 deterministic 字段引入前的设计约束。
- Oracle 复审：P0/P1/P2 均无，确认空白 `runId` 修复未引入新问题。
- 审查模式：Oracle 新建 + 复审。

### 2.50 Step 14C: Controlled Rollout Verification / Closeout

完成时间：2026-06-14

已完成内容：

- 新增 `docs/refactor-log/art-asset-pipeline-production-rollout/step-14c-controlled-rollout-closeout.md`。
- 更新 rollout README、decision points 和 semantic fidelity plan。
- 验证 Step 14B controlled rollout helper 已实现并保持非默认。
- 记录 feature flag：`ART_ASSET_SEMANTIC_ROLLOUT_ENABLED`。
- 记录 flag-off 为当前/default behavior，且不调用 metadata exporter。
- 记录 flag-on 仅允许 `pirate-kit-v0.1` 和 approved Pirate Kit 20-asset runtime-safe input。
- 记录 rollback 为关闭 `ART_ASSET_SEMANTIC_ROLLOUT_ENABLED`。
- 记录 production asset packs、runtime/default behavior、resolver、QA、Workbench、Phaser、asset pack loading、metadata sidecars 和 source assets 均未改变。
- 记录 broad/default production rollout 仍未批准，未来需要单独 approval gate。

行为边界：

- Step 14C is verification / closeout only。
- No new rollout behavior implemented。
- No runtime/default behavior changed。
- No resolver behavior changed。
- No QA / Workbench / Phaser / asset pack loading changed。
- No production asset packs changed。
- No assets imported。
- No metadata sidecars changed。
- No generated artifacts committed。
- No large-library scan。
- Repair-enabled remains non-default。
- No metadata repair/writeback。
- Broad/default production rollout remains not approved。

验证：

    npx vitest run tests/contracts/art-asset-semantic-rollout.test.ts
    npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run test:contracts
    npm test
    npm run typecheck
    npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep14c-default
    npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep14c-repair
    npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260614Tstep14c-default/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260614Tstep14c-repair/summary.json --out artifacts/asset-semantic-canary-comparison/20260614Tstep14c/comparison.json

验证结果：

- Focused rollout test passed：1 file / 6 tests。
- Pirate Kit metadata validate passed：20 metadata files。
- Pirate Kit JSON validate passed：`ok=true`，`diagnostics=[]`。
- Pirate Kit check-paths passed：20 metadata files。
- Pirate Kit runtime-safe export passed：`ok=true`，`diagnostics=[]`，`asset_count=20`。
- `npm run test:contracts` passed：24 files / 216 tests。
- `npm test` passed：contracts 24 files / 216 tests，workspace 12 files / 125 tests。
- `npm run typecheck` passed：root、maker-api、maker-workbench。
- Default canary passed：`runnable=20 skipped=0 experimental=0 passed=20 failed=0`，`repair.enabled=false`。
- Repair-enabled canary passed：`runnable=20 skipped=0 experimental=0 passed=20 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- Comparison passed：`ok=true case.total=20 case.runnable=20 case.skipped=0 case.experimental=0 default.failed=0 repair.failed=0 failureDiagnosticDelta=0`。
- Generated canary / comparison artifacts remain under ignored `artifacts/` and are not committed。

最终状态：

- The art asset semantic pipeline is controlled-rollout ready.
- It is not broad/default production rollout.
- Broad/default rollout requires a separate future approval gate.

审查门禁结论：

- Oracle review completed。
- P0/P1 blockers：none。
- Initial P2：review log still said Oracle review pending。
- Initial P3：legacy `step-14c-production-verification-rollback.md` still exists as a future draft, but current README points to the new Step 14C closeout document; left untouched because it is outside the allowed Step 14C docs scope。
- Resolution：updated this review log to record the Step 14C Oracle conclusion before commit。

### 2.49 Step 14B: Controlled Rollout Implementation

完成时间：2026-06-14

已完成内容：

- 新增 `scripts/art-asset-semantic-rollout.ts`。
- 新增 `tests/contracts/art-asset-semantic-rollout.test.ts`。
- 引入非默认 feature flag：`ART_ASSET_SEMANTIC_ROLLOUT_ENABLED`。
- 唯一 enabled value：`pirate-kit-v0.1`。
- flag unset / empty 时返回 disabled summary，且不调用 metadata exporter。
- flag-on 时只使用 `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata` 的 runtime-safe export。
- rollout summary 锁定 fixture root、metadata dir、asset count `20`、rollback instruction 和 deterministic diagnostics。
- invalid export、asset count mismatch 和 fixture-root 外路径均 fail closed。
- 更新 Step 14B rollout docs、rollout README 和 semantic fidelity plan。

行为边界：

- Default behavior remains unchanged when flag is off。
- No production asset packs changed。
- No runtime/default resolver path changed。
- No QA / Workbench / Phaser / asset pack loading changed。
- No assets imported。
- No metadata sidecars changed。
- No thumbnails generated。
- No large-library scan。
- Repair-enabled remains non-default。
- No metadata repair/writeback。
- Broad/default production rollout remains not approved。
- Generated artifacts are not committed。

验证：

    npx vitest run tests/contracts/art-asset-semantic-rollout.test.ts
    npx vitest run tests/contracts/art-asset-semantic-rollout.test.ts tests/contracts/art-asset-runtime-canary.test.ts
    npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples
    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    npm run test:contracts
    npm test
    npm run typecheck
    git diff --check
    npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep14b-default
    npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep14b-repair
    npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260614Tstep14b-default/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260614Tstep14b-repair/summary.json --out artifacts/asset-semantic-canary-comparison/20260614Tstep14b/comparison.json

验证结果：

- Focused rollout test RED：failed because `scripts/art-asset-semantic-rollout.js` did not exist。
- Focused rollout test GREEN：6 tests passed。
- Focused rollout + existing runtime canary regression passed：2 files / 11 tests。
- Pirate Kit metadata validate / JSON validate / check-paths passed：20 files。
- Pirate Kit runtime-safe export passed：`asset_count=20`。
- Baseline examples validate/export passed：5 files / `asset_count=5`。
- Baseline small fixture validate/export passed：10 files / `asset_count=10`。
- `npm run test:contracts` passed：24 files / 216 tests。
- `npm test` passed：contracts 24 files / 216 tests，workspace 12 files / 125 tests。
- `npm run typecheck` passed：root、maker-api、maker-workbench。
- `git diff --check` passed。
- Default canary passed：`runnable=20 skipped=0 experimental=0 passed=20 failed=0`，`repair.enabled=false`。
- Repair-enabled canary passed：`runnable=20 skipped=0 experimental=0 passed=20 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- Comparison passed：`ok=true case.total=20 case.runnable=20 default.failed=0 repair.failed=0 failureDiagnosticDelta=0`。
- Generated canary / comparison artifacts remain under ignored `artifacts/` and are not committed。

审查门禁结论：

- Oracle review completed。
- P0/P1 blockers：none。
- Initial P2：review log / rollout README still said Oracle review pending。
- Initial P3：Step 14B document still said implementation in progress。
- Resolution：updated Step 14B docs and rollout README to reflect completed validation and Oracle review result。

### 2.48 Step 14A: Production Rollout Gate

完成时间：2026-06-14

已完成内容：

- 更新 `docs/refactor-log/art-asset-pipeline-production-rollout/step-14a-production-rollout-gate.md`。
- 将 Step 14A 明确为 docs-only approval gate，不实现 rollout。
- 总结 Step 13E-B evidence：20 GLB assets、20 selected existing previews、20 metadata sidecars、metadata validate/export、default canary、repair-enabled canary、comparison、bridge summary、resolver-adjacent diagnostics、contracts、full tests 和 typecheck 均已通过。
- 判定当前 evidence 足够进入 limited Step 14B proposal，但不足以 broad/default production rollout。
- 推荐 Step 14B 只走 Mode B：off-by-default non-default feature flag path；Mode C internal preview / QA-only path 仅在需要检查同一 approved fixture-backed output 时允许。
- 定义 Step 14B feature flag / guard policy、production asset pack policy、runtime/default behavior policy、QA / Workbench / Phaser policy、rollback policy、failure budget、performance / size policy、rights / license policy 和 allowed boundary。
- 更新 semantic fidelity plan、rollout README 和 decision points。

行为边界：

- Step 14A is docs-only。
- No code, tests or scripts changed。
- No assets imported。
- No metadata sidecars changed。
- No thumbnails generated。
- No generated artifacts created or committed。
- Runtime/default behavior did not change。
- Resolver behavior did not change。
- QA / Workbench / Phaser / asset pack loading did not change。
- Production asset packs did not change。
- Step 14B implementation did not start。
- Repair-enabled did not become default。
- Metadata repair/writeback remains disallowed。
- Large-library bulk scan remains disallowed。
- `AGENTS.md` was not restored。
- Parked plan patch was not applied。
- No tag / stash / push / sync operations。

验证：

    git diff --check
    git diff --name-only

验证结果：

- `git diff --check` passed。
- `git diff --name-only` confirmed only Step 14A docs / plan / rollout tracking docs changed。

审查门禁结论：

- Main-agent self-review completed before commit。
- Oracle review completed after commit `bb398b3`。
- P0/P1/P2 blockers：none。
- Initial P3：README / review log still used pre-commit status wording。
- Resolution：updated Step 14A status wording to reflect committed `bb398b3` and branch-boundary next step。

### 2.47 Step 13E-B: Controlled Large-Library Expansion Implementation

完成时间：2026-06-14

已完成内容：

- 扩展 `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`。
- 从同一 approved Kenney Pirate Kit archive 只新增 10 个 GLB assets。
- 只新增对应 10 个 selected existing `Previews/*.png` 到 `thumbnails/`；没有生成 thumbnails。
- 新增 10 个 sidecar `.asset.json` metadata files。
- 更新 fixture `README.md`，记录 100% additional-asset review sampling evidence。
- 更新 `tests/contracts/asset-semantic-large-library-batch-zero-pirate-kit.test.ts`，锁定 20-asset exact set、10 additional assets、sidecar/thumbnail parity、path safety、runtime-safe export 和 README evidence。
- 更新 `tests/contracts/asset-semantic-large-library-batch-zero-dry-run.test.ts`，将 default / repair-enabled canary、comparison、bridge summary 和 resolver-adjacent diagnostics 提升到 20 assets。
- 更新 Step 13E 文档、semantic fidelity plan 和 rollout README。

Added asset basenames:

- `bottle`
- `cannon-ball`
- `cannon-mobile`
- `crate-bottles`
- `rocks-b`
- `rocks-c`
- `patch-sand`
- `structure-platform-dock-small`
- `mast`
- `tool-paddle`

阶段结果：

- Additional asset count：10。
- Expanded fixture asset count：20。
- Thumbnail count：20 selected existing preview PNGs。
- Metadata sidecar count：20。
- Target fixture path：`tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`。
- Total fixture size：`719199` bytes。
- Largest imported file：`assets/ship-pirate-small.glb`，`131464` bytes。
- Downloaded zip remains under ignored `artifacts/` and is not tracked。
- Generated canary/comparison artifacts remain under ignored `artifacts/` and are not tracked。

行为边界：

- Full archive was not imported。
- No unapproved source was used。
- No thumbnails were generated。
- No metadata was created for unselected archive files。
- No production asset packs changed。
- Runtime/default behavior did not change。
- Resolver behavior did not change。
- QA / Workbench / Phaser / asset pack loading did not change。
- Repair-enabled did not become default。
- Step 14A production rollout remains future。
- `AGENTS.md` was not restored。
- Parked plan patch was not applied。
- No tag / stash / push / sync operations。

验证：

    npx vitest run tests/contracts/asset-semantic-large-library-batch-zero-pirate-kit.test.ts
    npx vitest run tests/contracts/asset-semantic-large-library-batch-zero-dry-run.test.ts
    npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep13e-expanded-default
    npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep13e-expanded-repair
    npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260614Tstep13e-expanded-default/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260614Tstep13e-expanded-repair/summary.json --out artifacts/asset-semantic-canary-comparison/20260614Tstep13e-expanded/comparison.json
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples
    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    npm run test:contracts
    npm test
    npm run typecheck
    git diff --check

验证结果：

- Focused expanded fixture test passed：1 file / 6 tests。
- Focused expanded dry-run / bridge test passed：1 file / 7 tests。
- Expanded fixture metadata validate / JSON validate / check-paths / runtime export passed：20 metadata files，`asset_count=20`，no diagnostics。
- Default canary passed：`runnable=20 passed=20 failed=0`。
- Repair-enabled canary passed：`runnable=20 passed=20 failed=0`，`repair.attemptedCount=0`。
- Comparison passed：`ok=true`，`case.total=20`，`default.failed=0`，`repair.failed=0`。
- Bridge green summary asserted by focused test：`ok=true`，`matched_count=20`，`diagnostic_count=0`。
- Resolver-adjacent green summary asserted by focused test：`ok=true`，`requested_count=20`，`resolved_count=20`，`diagnostic_count=0`。
- Baseline examples validate / runtime export passed：5 files，`asset_count=5`。
- Baseline small fixture validate / runtime export passed：10 files，`asset_count=10`。
- `npm run test:contracts` passed：23 files / 210 tests。
- `npm test` passed：contracts 23 files / 210 tests，workspace 12 files / 125 tests。
- `npm run typecheck` passed：root、maker-api、maker-workbench。
- `git diff --check` passed。

Generated artifacts:

- Default canary artifact path：`artifacts/asset-semantic-canary/20260614Tstep13e-expanded-default/summary.json`。
- Repair-enabled canary artifact path：`artifacts/asset-semantic-canary/20260614Tstep13e-expanded-repair/summary.json`。
- Comparison artifact path：`artifacts/asset-semantic-canary-comparison/20260614Tstep13e-expanded/comparison.json`。
- Generated artifacts remain ignored and are not committed。

审查门禁结论：

- Oracle review completed with `PASS_WITH_P3_NOTES`。
- P0/P1/P2 blockers：none。
- P3：Step 13E 文档顶部仍保留旧 Step 13E-A gate wording；review log / Step 13E doc 仍写 Oracle pending。
- Resolution：已清理 Step 13E 顶部旧 gate wording，并把 pending placeholders 更新为本次 Oracle verdict。
- Final gate：Step 13E-B 可进入 commit；Step 14A remains parked。

### 2.46 Step 13E-A: Large-Library Batch Expansion Gate

完成时间：2026-06-14

已完成内容：

- 扩展 `docs/refactor-log/art-asset-pipeline-production-rollout/step-13e-batch-expansion-gate.md`。
- 文档定义 Step 13E-A 只回答是否允许 Step 13E-B 扩展，不执行 import。
- 文档批准 Step 13E-B 只能继续使用同一 Kenney Pirate Kit source family。
- 文档将 Step 13E-B additional assets capped at 10。
- 文档将 Step 13E-B 后 committed Pirate Kit fixture total capped at 20。
- 文档要求每个新增 asset 都有 matching sidecar metadata 和 existing selected preview/reference image。
- 文档要求 Step 13E-B 对 100% additional assets 做 main-agent implementation evidence 和 Oracle read-only review coverage，覆盖 source path、committed path、preview path、sidecar path、license/source inheritance、file size、runtime-safe path 和 semantic-role rationale。
- 文档要求 Step 13E-B 复跑 metadata validate / JSON validate / check-paths / runtime-safe export / default canary / repair-enabled canary / comparison / bridge diagnostics / contracts / full tests / typecheck。
- 更新 rollout README、decision points、validation matrix 和 semantic fidelity plan。

行为边界：

- Step 13E-A is docs-only。
- No assets imported。
- No sidecar metadata changed。
- No thumbnails changed or generated。
- No generated artifacts created or committed。
- No code/tests/scripts changed。
- Runtime/default behavior did not change。
- Resolver behavior did not change。
- QA / Workbench / Phaser / asset pack loading did not change。
- Production asset packs did not change。
- Step 13E-B implementation remains future。
- Step 14A production rollout remains parked。
- `AGENTS.md` was not restored。
- Parked plan patch was not applied。
- No tag / stash / push / sync operations。

验证：

    git diff --check

审查门禁结论：

- Local validation completed: `git diff --check` passed.
- Oracle review completed.
- Initial P1: Step 13E-B review sampling was unclear.
- Resolution: Step 13E-B now requires 100% review of additional assets, with main-agent implementation evidence and Oracle read-only review ownership plus required per-asset coverage fields.
- Initial P3: review log still said validation / Oracle review pending.
- Resolution: review log updated with validation and review conclusion.
- Remaining P0/P1/P2 blockers: none after resolution.

### 2.45 Step 13D-B: Batch Zero Semantic Dry-Run / Bridge Implementation

完成时间：2026-06-14

已完成内容：

- 新增 `tests/contracts/asset-semantic-large-library-batch-zero-dry-run.test.ts`。
- 扩展现有 metadata-only canary dry-run support，让 `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/` 明确输出 `fixture.kind=large_art_library_batch_zero`。
- 保持 Step 9C small-library dry-run 兼容，既有 small fixture 仍输出 `fixture.kind=small_art_library`。
- 扩展 canary comparison schema / report type 以接受 `large_art_library_batch_zero` fixture kind。
- 更新 Step 13D 文档、semantic fidelity plan 和 review log。

阶段结果：

- Exact batch-zero asset ids used:
  - `pirate_kit_barrel_001`
  - `pirate_kit_boat_row_small_001`
  - `pirate_kit_cannon_001`
  - `pirate_kit_chest_001`
  - `pirate_kit_crate_001`
  - `pirate_kit_flag_pirate_001`
  - `pirate_kit_palm_straight_001`
  - `pirate_kit_rocks_a_001`
  - `pirate_kit_ship_pirate_small_001`
  - `pirate_kit_tower_complete_small_001`
- Default canary artifact path: `artifacts/asset-semantic-canary/20260614Tstep13d-default/summary.json`.
- Repair-enabled canary artifact path: `artifacts/asset-semantic-canary/20260614Tstep13d-repair/summary.json`.
- Comparison artifact path: `artifacts/asset-semantic-canary-comparison/20260614Tstep13d-batch-zero/comparison.json`.
- Bridge green summary: `ok=true`, `matched_count=10`, `diagnostic_count=0`.
- Resolver-adjacent green summary: `ok=true`, `requested_count=10`, `resolved_count=10`, `diagnostic_count=0`.
- Negative diagnostics summary: missing requested id、missing bridge candidate、candidate without runtime metadata 和 blocked context 均由 focused tests 单独覆盖，未混入 green path。

行为边界：

- No additional assets imported。
- No sidecar metadata changed。
- No thumbnails changed。
- No generated artifacts committed。
- Runtime/default behavior did not change。
- Resolver behavior did not change。
- QA / Workbench / Phaser / asset pack loading did not change。
- Production asset packs did not change。
- Repair-enabled did not become default。
- `resolveLocalAssetPack` / `selectLocalAssetPack` were not imported or called by Step 13D-B tests。
- `AGENTS.md` was not restored。
- Parked plan patch was not applied。
- No tag / stash / push / sync operations。

验证：

    npx vitest run tests/contracts/asset-semantic-large-library-batch-zero-dry-run.test.ts
    npx vitest run tests/contracts/asset-semantic-small-library-dry-run.test.ts
    npx vitest run tests/contracts/asset-semantic-canary-comparison.test.ts tests/contracts/asset-pack-small-library-bridge-canary.test.ts
    npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep13d-default
    npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 --timestamp 20260614Tstep13d-repair
    npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260614Tstep13d-default/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260614Tstep13d-repair/summary.json --out artifacts/asset-semantic-canary-comparison/20260614Tstep13d-batch-zero/comparison.json
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples
    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    npm run test:contracts
    npm test
    npm run typecheck

验证结果：

- Focused Step 13D-B test passed：1 file / 7 tests。
- Existing small-library dry-run regression passed：1 file / 4 tests。
- Existing comparison / small bridge regressions passed：2 files / 9 tests。
- Batch-zero metadata validate / JSON validate / check-paths / runtime export passed：10 metadata files, `asset_count=10`, no diagnostics。
- Default canary passed：`passed=10 failed=0`。
- Repair-enabled canary passed：`passed=10 failed=0`，`repair.attemptedCount=0`。
- Comparison passed：`ok=true`，`case.total=10`，`default.failed=0`，`repair.failed=0`。
- Baseline examples validate / runtime export passed。
- Baseline small fixture validate / runtime export passed。
- `npm run test:contracts` passed：23 files / 209 tests。
- `npm test` passed：contracts 23 files / 209 tests，workspace 12 files / 125 tests。
- `npm run typecheck` passed：root、maker-api、maker-workbench。

审查门禁结论：

- Oracle review completed.
- P0/P2/P3: none.
- P1: new focused test file `tests/contracts/asset-semantic-large-library-batch-zero-dry-run.test.ts` was untracked at review time and must be included in final commit scope.
- Resolution: include the new focused test in the final staged scope with the related Step 13D-B scripts/docs changes before committing.

### 2.44 Step 13D-A: Batch Zero Semantic Dry-Run / Bridge Gate

完成时间：2026-06-14

已完成内容：

- 新增 `docs/refactor-log/asset-semantic-large-library-step-13d-batch-zero-dry-run.md`。
- 文档定义 Step 13D-B 只能使用 `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`、其 `metadata/`、同一 metadata directory 的 runtime-safe export、同源 explicit bridge candidates、exact 10 batch-zero asset ids 和独立 focused negative test ids。
- 文档定义 green path：10 个 sidecars validation、10 个 assets runtime-safe export、同一 fixture 的 default canary、repair-enabled canary、comparison、bridge summary `ok=true`、resolver-adjacent diagnostics `ok=true`。
- 文档要求 default 与 repair-enabled 使用 identical fixture input，repair-enabled 仍保持 non-default。
- 文档要求 focused negative diagnostics 与 green path 分离：missing requested id、missing bridge candidate、candidate without runtime metadata、metadata 支持时的 blocked context，以及必要时 helper-level path mismatch / absolute path cases。
- 文档固定 Step 13D-B 只能使用 `createAssetPackMetadataBridgeSummary` / `createAssetResolverDiagnosticsSummary`，不得调用 `resolveLocalAssetPack` / `selectLocalAssetPack` / runtime/default resolver paths / production/default asset pack loading。
- 更新 semantic fidelity plan 和 review log，把 Step 13C-B 标为 done、Step 13D-A 标为 current/done-after-validation、Step 13D-B 标为 next，runtime/default integration 与 production rollout 继续 parked。

阶段结果：

- Step 13D-A is docs-only。
- No assets imported。
- No code/tests/scripts changed。
- No sidecar metadata changed。
- No thumbnails changed。
- No generated artifacts added。
- Runtime/default behavior did not change。
- Resolver behavior did not change。
- Production asset packs did not change。
- Step 13D-B remains future implementation。
- `AGENTS.md` was not restored。
- Parked plan patch was not applied。

Step 13D-B required commands:

    npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run qa:asset-semantic:canary -- --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1
    npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-batch-zero-pirate-kit-v0.1
    npm run qa:asset-semantic:compare -- --default-summary <default-summary.json> --repair-enabled-summary <repair-summary.json> --out <comparison-summary.json>
    npx vitest run <focused Step 13D-B test file(s)>
    npm run test:contracts
    npm test
    npm run typecheck
    git diff --check

验证：

    git diff --check

审查门禁结论：

- 主 agent 只读自审完成：P0/P1/P2/P3 均无。
- Oracle 未派发：当前可用 multi-agent 工具要求用户显式要求 sub-agent work；本次请求要求 review gate / review findings，但未明确要求派发 Oracle 子 agent。

### 2.43 Step 13C-B: Kenney Pirate Kit Metadata Batch Zero Implementation

完成时间：2026-06-13

已完成内容：

- 新增 `tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/` fixture。
- 从 Step 13C-A 批准的 Kenney Pirate Kit archive 只导入 10 个 GLB assets。
- 只导入对应 10 个 selected existing `Previews/*.png` 到 `thumbnails/`；没有生成 thumbnails。
- 新增 10 个 sidecar `.asset.json` metadata files。
- 新增 fixture `README.md` 和 `source/LICENSE.txt` source evidence。
- 新增 `tests/contracts/asset-semantic-large-library-batch-zero-pirate-kit.test.ts`，覆盖 exact set、fixture size/format、metadata validation、project-relative paths、unique deterministic asset ids 和 runtime-safe export。
- 更新 Step 13C 文档、semantic fidelity plan 和 review log。

Imported asset basenames:

- `barrel`
- `chest`
- `crate`
- `cannon`
- `flag-pirate`
- `palm-straight`
- `rocks-a`
- `ship-pirate-small`
- `tower-complete-small`
- `boat-row-small`

阶段结果：

- Imported asset count：10 GLB。
- Thumbnail count：10 selected existing preview PNGs。
- Metadata sidecar count：10。
- Target fixture path：`tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/`。
- Total fixture size：`409374` bytes。
- Largest imported file：`assets/ship-pirate-small.glb`，`131464` bytes。
- Downloaded zip remains under ignored `artifacts/` and is not tracked。
- Selected extraction temp remains under ignored `artifacts/` and is not tracked。

行为边界：

- Full archive was not imported。
- No thumbnails were generated。
- No metadata was created for unselected archive files。
- No production asset packs changed。
- Runtime/default behavior did not change。
- Resolver behavior did not change。
- QA / Workbench / Phaser / asset pack loading did not change。
- Generated artifacts were not added。
- Step 13D、large library expansion、runtime/default integration 和 production rollout remain future。

验证：

    npx vitest run tests/contracts/asset-semantic-large-library-batch-zero-pirate-kit.test.ts
    npm run metadata:validate -- tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- --check-paths tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/metadata
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples
    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    npm run test:contracts
    npm test
    npm run typecheck
    git diff --check

验证结果：

- Focused test passed：5 tests。
- Batch-zero metadata validate / check-paths / runtime export passed。
- Batch-zero metadata JSON validate passed：`ok=true`，10 files，no diagnostics。
- Baseline examples validate / runtime export passed。
- Baseline small fixture validate / runtime export passed。
- `npm run test:contracts` passed：22 files / 202 tests。
- `npm test` passed：contracts and workspace tests。
- `npm run typecheck` passed：root、maker-api、maker-workbench。
- `git diff --check` passed。

审查门禁结论：

- Sage/Oracle 审查完成：P0/P1/P2 均无。
- P3：初审指出 Step 13C 文档和 review log 仍写 Sage/Oracle review pending；已补充本轮审查结论。

### 2.42 Step 13C-A: Batch Zero Selection / Import Gate

完成时间：2026-06-13

已完成内容：

- 新增 `docs/refactor-log/asset-semantic-large-library-step-13c-batch-zero.md`。
- 文档批准 Step 13C-B 只能使用 Kenney Pirate Kit source page 和 direct archive URL。
- 文档定义 Step 13C-B 可再次下载 exact archive 到 ignored temp path，并只可把 approved selected files 解到 ignored selected-extraction temp path。
- 文档批准 Pirate Kit batch zero 为 10 个 GLB model candidates 及对应 existing `Previews/*.png` reference images。
- 文档推荐 fixture layout：`tests/fixtures/art-library-batch-zero-pirate-kit-v0.1/{assets,metadata,source,thumbnails}`。
- 文档定义 metadata policy、thumbnail policy、Step 13C-B allowed / forbidden operations、validation requirements、review gate 和 rollback / failure policy。
- 更新 semantic fidelity plan；可选 Step 13B follow-up pointer 记录 Step 13C-A gate 已打开。

Approved Step 13C-B source:

- Source page：`https://kenney.nl/assets/pirate-kit`。
- Archive URL：`https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip`。
- License evidence：Creative Commons CC0, based on Step 13B source page evidence。

Batch size policy:

- General target：10 to 30 assets。
- Hard max：50 assets。
- Pirate Kit Step 13C-B approved batch-zero asset count：10。
- Do not import the whole Pirate Kit archive。

Approved candidate archive paths:

- `Models/GLB format/barrel.glb` + `Previews/barrel.png`
- `Models/GLB format/chest.glb` + `Previews/chest.png`
- `Models/GLB format/crate.glb` + `Previews/crate.png`
- `Models/GLB format/cannon.glb` + `Previews/cannon.png`
- `Models/GLB format/flag-pirate.glb` + `Previews/flag-pirate.png`
- `Models/GLB format/palm-straight.glb` + `Previews/palm-straight.png`
- `Models/GLB format/rocks-a.glb` + `Previews/rocks-a.png`
- `Models/GLB format/ship-pirate-small.glb` + `Previews/ship-pirate-small.png`
- `Models/GLB format/tower-complete-small.glb` + `Previews/tower-complete-small.png`
- `Models/GLB format/boat-row-small.glb` + `Previews/boat-row-small.png`

行为边界：

- 本步 docs-only，没有 archive extraction。
- 本步没有 import assets、sidecar metadata、thumbnails、tests、scripts、code 或 generated artifacts。
- 本步没有修改 runtime/default behavior、resolver、QA、Workbench、Phaser、asset pack loading 或 production asset packs。
- Step 13C-B implementation 仍为 future step；production rollout 继续 parked。

验证：

    git diff --check
    git status --short --branch
    git diff --name-only

验证结果：

- `git diff --check` 通过。
- `git status --short --branch` 只显示允许的 docs 改动和新增 Step 13C-A gate 文档。
- `git diff --name-only` 只显示允许的既有 docs 改动；新增文档为 `docs/refactor-log/asset-semantic-large-library-step-13c-batch-zero.md`。
- `find tests/fixtures/art-library-batch-zero-pirate-kit-v0.1 artifacts/asset-semantic-large-library-batch-zero -maxdepth 3 -print 2>/dev/null || true` 无输出，确认没有创建 batch-zero fixture、extraction temp directory 或 generated artifacts。

审查门禁结论：

- Sage/Oracle 审查完成：P0/P1/P2 均无。
- P3：初审指出 Step 13C-A gate 文档和 review log 仍写 validation / review pending；已补充本地验证和审查结论。

### 2.41 Step 13B: Kenney Pirate Kit Large-Library Inventory Dry-Run

完成时间：2026-06-13

已完成内容：

- 以 clean `main` 为边界新建 `test/asset-semantic-step-13b-large-library-inventory` 分支。
- 使用用户明确提供并完成 preflight 的 Kenney Pirate Kit direct archive URL。
- 将 archive 仅下载到 ignored local artifacts：`artifacts/asset-semantic-large-library-inventory/tmp/kenney_pirate-kit.zip`。
- 使用 archive listing metadata 生成 ignored dry-run outputs：`raw-entries.json` 与 `inventory-summary.json`。
- 新增 `docs/refactor-log/asset-semantic-large-library-step-13b-inventory.md`，只沉淀 deterministic inventory summary、边界和 Step 13C recommendation。
- 更新 rollout README、semantic fidelity plan 和 step index 的当前阶段状态。

Inventory 结果：

- Archive size：`3154665` bytes。
- Archive entries：`379` total entries，`370` files，`9` directories。
- Total uncompressed bytes：`9335467`。
- Extension counts：`fbx=72`、`glb=72`、`obj=72`、`mtl=72`、`png=77`、`txt=1`、`html=1`、`url=3`。
- Coarse media counts：`model_3d=216`、`image_texture=77`、`documentation=2`、`unknown=75`。
- License / readme candidate：`License.txt`。
- Preview / reference image candidates：`74`，包括 `Preview.png`、`Sample.png` 和 `Previews/*.png`。
- Filename-convention animation-specific entries：`0`；source page still advertises `Animation` as page-level evidence only。
- Candidate asset count by unique model basename：`72`。
- Metadata sidecar entries detected：`0`；missing metadata estimate by unique model basename：`72`。
- Thumbnail/reference coverage by unique model basename：`72/72`；missing thumbnail/reference estimate by unique model basename：`0`。
- Coverage method：archive-entry paths only；no extraction、hashing、image reads or image dimension probes。

行为边界：

- 本步只 list archive entries，没有 extraction。
- 本步没有把 zip、raw entries、summary JSON 或 asset binaries 加入 git。
- 本步没有复制或导入 assets，没有生成 sidecar metadata、thumbnails、hashes、embeddings 或 image dimension probes。
- 本步没有 code、UI、runtime、QA runner、resolver、Phaser、Workbench 或 asset pack loading 行为改动。
- 本步没有启动 Step 13C；Step 13C batch zero 仍需用户显式批准。

验证：

    npm run test:contracts
    npm test
    npm run typecheck
    git diff --check
    git status --short --branch
    git diff --name-only
    git status --ignored --short artifacts/asset-semantic-large-library-inventory || true

验证结果：

- `npm run test:contracts` 通过：21 files / 197 tests。
- `npm test` 通过：contracts 与 workspace tests 均通过。
- `npm run typecheck` 通过：root、maker-api、maker-workbench。
- `git diff --check` 通过。
- `git status --short --branch` 只显示本步 docs 改动和新增 Step 13B inventory 文档。
- `git status --ignored --short artifacts/asset-semantic-large-library-inventory || true` 显示 `artifacts/` ignored。
- `git ls-files artifacts/asset-semantic-large-library-inventory` 无输出，确认 ignored artifacts 未进入 tracked files。

审查门禁结论：

- Sage/Oracle 初审发现两个 P2：missing metadata / thumbnail coverage estimate 缺失，以及 step index 后段残留 Step 13A 当前状态。
- 已修复：补充 archive-entry-path-only coverage estimates；同步 step index 为 Step 13B 当前状态且 Step 13C 仍需显式批准。
- Sage/Oracle 复审完成：P0/P1/P2 均无。
- P3：Sage 建议 docs-prefixed commit message；本步保留用户任务明确要求的 `test: inventory large art library candidates`。

### 2.40 Step 13A: Large Library Intake Gate

完成时间：2026-06-13

已完成内容：

- 关闭 Step 12C 分支边界：`docs/art-asset-step-12c-qa-preview-signoff` 已 fast-forward 合并回 `main`。
- 新建 `docs/art-asset-step-13a-large-library-intake-gate` 分支。
- 更新 `docs/refactor-log/art-asset-pipeline-production-rollout/step-13a-large-library-intake-gate.md`，定义 large-library location rule、storage mode、allowed formats、batch size、size limits、metadata coverage、thumbnail policy、rights/licensing tracking、review owner、sampling policy、rollback path、failure budget 和 Step 13B boundary。
- 更新 rollout README、semantic fidelity plan 和 step index 的当前阶段状态。

Gate 决策：

- Step 13A 不批准任何具体大库路径；Step 13B 只有在用户提供一个明确 read-only source location 或 external artifact reference 后才能开始。
- 默认 storage mode 是外部/本地 ignored read-only source；repo bulk binaries forbidden；Git LFS 未批准。
- Step 13B 只能 read-only inventory/report，不复制、不生成 metadata、不写 sidecars、不导入 fixtures、不触碰 runtime/default paths。
- Step 13C batch zero 若到达，最多 10 assets；每个 source asset 不超过 5 MB、每个 thumbnail 不超过 512 KB、总 fixture payload 不超过 30 MB，除非后续 gate 显式修改。
- batch-zero import 要求 100% sidecar metadata、已知 rights/licensing、thumbnail coverage 和 runtime-safe export 通过。
- unknown-rights assets 禁止进入 pipeline。

行为边界：

- 本步没有访问、扫描、inventory、复制或导入大库。
- 本步没有 code、UI、runtime、QA runner、resolver、Phaser 或 Workbench 行为改动。
- 本步没有 metadata generation、source mutation、repair writeback、production/default integration 或 AI image provider。

验证：

    git diff --check

验证结果：

- `git diff --check` 通过。

审查门禁结论：

- Oracle 审查完成：P0/P1/P2/P3 均无。
- Oracle 确认 Step 13A 未批准、触碰、inventory 或导入任何大库；storage、formats、batch/size、metadata、thumbnail、rights、rollback 和 failure budget 清楚；review ownership 和 sampling policy 清楚；Step 13B 仍为 read-only report-only，且需要用户提供明确 source location。

### 2.39 Step 12C: QA Preview Signoff Report

完成时间：2026-06-13

已完成内容：

- 关闭 Step 12B 分支边界：`feat/art-asset-step-12b-workbench-qa-preview` 已 fast-forward 合并回 `main`。
- 新建 `docs/art-asset-step-12c-qa-preview-signoff` 分支。
- 更新 `docs/refactor-log/art-asset-pipeline-production-rollout/step-12c-qa-preview-signoff.md`，记录 textual report、displayed field list、diagnostic semantics、known limitations、production/default unchanged statement 和 Step 13A recommendation。
- 更新 rollout README、semantic fidelity plan 和 step index 的当前阶段状态。

阶段结果：

- Step 12B 的 small-library preview 可作为 QA-facing internal preview signoff 继续向 Step 13A gate 推进。
- 本 signoff 只覆盖 small fixture library，不覆盖 large library、不证明 production readiness、不批准 production/default runtime integration。
- Step 13A 只能作为 docs-only large library intake gate 继续，必须先定义 size limits、license / provenance review、metadata validation、storage policy、scan/report commands、rollback policy 和 no-runtime/default-integration boundary。

行为边界：

- 本步没有 code、UI、runtime、QA runner、resolver、Phaser 或 Workbench 行为改动。
- 本步没有触碰 large library、production/default integration、metadata mutation、repair writeback 或 AI image provider。
- 本步没有声称 QA signoff 代表 production readiness。

验证：

    git diff --check

验证结果：

- `git diff --check` 通过。

审查门禁结论：

- Oracle 审查完成：P0/P1/P2/P3 均无。
- Oracle 确认本 signoff 未声称 production readiness、未批准 large-library intake、未提交 generated screenshots/artifacts、未改变 runtime/default behavior 或 QA verdict semantics，且 Step 13A 仍是 docs-only gate。

### 2.38 Step 12B: Workbench / QA Preview Implementation

完成时间：2026-06-13

已完成内容：

- 关闭 Step 12A 分支边界：`docs/art-asset-step-12a-workbench-qa-preview-gate` 已 fast-forward 合并回 `main`。
- 新建 `feat/art-asset-step-12b-workbench-qa-preview` 分支。
- 新增 `packages/asset-pipeline/src/art-asset-workbench-preview.ts`，从 runtime-safe small fixture metadata export 构建 read-only preview DTO，并复用 deterministic bridge / resolver diagnostics summaries。
- 新增 `apps/maker-api/src/art-asset-preview/*`，提供 `GET /api/art-assets/preview/small-library` preview-only endpoint。
- 更新 Workbench optional fetch 与 Assets 面板，在 preview DTO 可用时展示 small-library preview-only 区块。
- 新增 `tests/contracts/art-asset-workbench-preview.test.ts`，覆盖 source scope、read-only、deterministic / non-mutating output、sensitive-field exclusion、out-of-scope path fail-closed behavior 和 maker-api service output。
- 更新 Step 12B rollout 文档和总览状态。

阶段结果：

- preview source 固定为 `small-library-runtime-safe-export`。
- preview fixture 固定为 `tests/fixtures/art-library-small-v0.1`。
- preview DTO 明确 `read_only: true`，不写 metadata、manifest、QA report、repair output 或 generated artifacts。
- preview builder 在构造 DTO 前校验 runtime artifact path-like fields 必须留在 `tests/fixtures/art-library-small-v0.1/` 下；越界时 fail closed，且错误不回显原始路径。
- Workbench fetch 使用 optional path；preview endpoint 失败不会影响 project status、QA report、repair report 或 build log。
- preview asset DTO 不包含 `technical.source_path`，不暴露 raw sidecar-only fields、rights/legal/creator/source details、workflow/review notes、search/embedding input、AI generation fields、absolute local paths、production/default asset pack paths 或 large-library paths。

行为边界：

- 本步没有修改 default project generation、Phaser templates、QA runner、QA verdict semantics、resolver selection、production/default asset pack loading 或 large-library path。
- 本步没有让 repair-enabled mode 成为默认。
- 本步没有接 AI image provider。

验证：

    npx vitest run tests/contracts/art-asset-workbench-preview.test.ts
    npm run typecheck:root
    npm run test:contracts
    npm run typecheck
    npm test
    curl -s http://localhost:3000/api/art-assets/preview/small-library
    Playwright smoke against http://127.0.0.1:5173/
    git diff --check

验证结果：

- Focused Workbench preview contract 通过：4 tests。
- Root typecheck 通过。
- Contract suite 通过：21 files，197 tests。
- Full typecheck 通过：root、maker-api、maker-workbench。
- Full test suite 通过：contracts 21 files / 197 tests，workspace 12 files / 125 tests。
- API smoke 通过：`GET /api/art-assets/preview/small-library` 返回 `ok: true`、10 assets、`read_only: true`、0 bridge diagnostics、0 resolver diagnostics，preview asset technical data 不暴露 `source_path`。
- Workbench Playwright smoke 通过：生成项目后 `Small library preview`、`Ready` 和 safe thumbnail path text 可见，无 console/page errors。
- `git diff --check` 通过。

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 preview builder 接受任意 runtime artifact 但固定标记 small-library preview，且可能把非 small fixture 相对路径透出到 thumbnail / diagnostics；P3 指出 review log 顶部仍以 Step 10B 为锚点。
- 已修复：`createSmallLibraryWorkbenchPreview()` 在构造 candidates / diagnostics / DTO 前校验 artifact path-like fields 必须留在 `tests/fixtures/art-library-small-v0.1/` 下；越界时 fail closed 且不回显原始路径；补充 `assets/asset-packs/large-library/...` negative test；review log 顶部改为 Step 12B 当前阶段。
- Oracle 复审：P0/P1/P2/P3 均无；确认上一轮 sensitive path P1 已关闭，无 large-library / default behavior / QA verdict / docs consistency 问题，可以进入提交门禁。

### 2.37 Step 12A: Workbench / QA Preview Gate

完成时间：2026-06-13

已完成内容：

- 关闭 Step 11C 分支边界：`docs/art-asset-step-11c-runtime-canary-closure` 已 fast-forward 合并回 `main`。
- 新建 `docs/art-asset-step-12a-workbench-qa-preview-gate` 分支。
- 更新 `docs/refactor-log/art-asset-pipeline-production-rollout/step-12a-workbench-qa-preview-gate.md`，定义 Workbench / QA preview 的 source-of-truth、safe field allowlist、sensitive field blocklist、read-only policy、privacy note、non-goals 和 Step 12B boundary。
- 更新 rollout README、semantic fidelity plan 和 step index 的当前阶段状态。

Gate 决策：

- Workbench preview 在 large-library rollout 前需要，但只能在 Step 12B 中作为 small-fixture-only preview-only implementation 继续。
- QA CLI/report 是必要证据，但不足以替代人工 preview signoff。
- preview source of truth 是 runtime-safe export 加 deterministic bridge / resolver diagnostics summaries；raw sidecar metadata 只可作为 runtime-safe export 输入，不可由 UI / QA preview 直接读取或渲染。
- preview 必须 read-only，不得修改 metadata、manifest、QA verdict、repair output、generated artifacts 或 runtime/default behavior。
- thumbnails 只允许来自 small fixture runtime-safe `technical.thumbnail_path`，且必须保持在 `tests/fixtures/art-library-small-v0.1/` 下。
- diagnostics 只允许展示 deterministic / sanitized code、severity、asset id、json path、message 和由既有 safe diagnostic helper 生成的 safe relative fixture path。

行为边界：

- 本步没有 code、UI、runtime、QA runner 或 Workbench 改动。
- 本步没有触碰 large library、production/default integration、metadata mutation、repair writeback 或 AI image provider。
- 本步没有声称 QA signoff 完成。

验证：

    git diff --check

验证结果：

- `git diff --check` 通过。

审查门禁结论：

- Oracle 审查完成：P0/P1/P2/P3 均无。
- Oracle 确认 Step 12A 仍为 docs-only gate，preview source 清楚，safe allowlist / sensitive blocklist 明确，read-only policy 清楚，diagnostics 必须 deterministic / sanitized，Step 12B 仍是 small-fixture-only preview-only，且 rollout README、semantic plan、review log、step index 当前状态一致。

### 2.36 Step 11C: Runtime Canary Verification and Closure

完成时间：2026-06-13

已完成内容：

- 关闭 Step 11B 分支边界：`test/art-asset-step-11b-non-default-runtime-canary` 已 fast-forward 合并回 `main`。
- 新建 `docs/art-asset-step-11c-runtime-canary-closure` 分支。
- 更新 `docs/refactor-log/art-asset-pipeline-production-rollout/step-11c-runtime-canary-closure.md`，沉淀 flag-off safety、flag-on isolation、rollback path、known limitations 和 Step 12A decision。
- 更新 rollout README、semantic fidelity plan 和 step index 的当前阶段状态。

阶段结果：

- Step 11 non-default runtime canary lane 可以关闭。
- flag-off rollback 为移除或不设置 `ASSET_RUNTIME_METADATA_CANARY`；不需要生产/default 配置变更。
- flag-on 仍只允许 `ASSET_RUNTIME_METADATA_CANARY=small-library-v0.1`，只读取 `tests/fixtures/art-library-small-v0.1/metadata`。
- Step 12A 只允许作为 docs-only Workbench / QA preview gate 继续；实现仍 parked，必须等 Step 12A 审查后再决定。

行为边界：

- 本步没有修改 default project generation、Phaser templates、Workbench、QA aggregation、resolver selection、production/default asset pack loading 或 large-library path。
- 本步没有让 repair-enabled mode 成为默认。
- 本步没有写 generated artifacts。
- 本步没有批准 large-library intake、runtime/default integration 或 AI image provider。

验证：

    npx vitest run tests/contracts/art-asset-runtime-canary.test.ts tests/contracts/asset-pack-small-library-bridge-canary.test.ts
    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata | rg '"ok"|"asset_count"|"diagnostics"'
    git diff --check

验证结果：

- Focused runtime canary + small-library bridge tests 通过：2 files，9 tests。
- small-library metadata validation 通过：10 metadata files。
- small-library runtime metadata export 证据：`"ok": true`、`"diagnostics": []`、`"asset_count": 10`。
- `git diff --check` 通过。

审查门禁结论：

- Oracle 审查完成：P0/P1/P2/P3 均无。
- Oracle 确认 closure 未声称 default runtime integration 完成，已记录 flag-off safety evidence 和 rollback path，未批准 large-library intake，Step 12A 仍是 docs-only gate，且 rollout README、semantic plan、review log、step index 当前状态一致。

### 2.35 Step 11B: Non-Default Runtime Canary Implementation

完成时间：2026-06-13

已完成内容：

- 关闭 Step 11A 分支边界：`docs/art-asset-step-11a-runtime-integration-gate` 已 fast-forward 合并回 `main`。
- 新建 `test/art-asset-step-11b-non-default-runtime-canary` 分支。
- 新增 `scripts/art-asset-runtime-canary.ts`，提供 `ASSET_RUNTIME_METADATA_CANARY` 的非默认配置解析和 small-library runtime metadata canary summary。
- 新增 `tests/contracts/art-asset-runtime-canary.test.ts`，覆盖 default disabled、flag-on small fixture、unsupported flag、export failure、invalid artifact 和 deterministic / non-leaking summary。
- 更新 Step 11B rollout 文档和总览状态。

阶段结果：

- 默认缺省或空 `ASSET_RUNTIME_METADATA_CANARY` 时 canary disabled，并且不执行 metadata export I/O。
- 只有 `ASSET_RUNTIME_METADATA_CANARY=small-library-v0.1` 会启用 canary，且只读取 `tests/fixtures/art-library-small-v0.1/metadata`。
- invalid artifact / export failure fail closed，diagnostics 不回显 production/default asset pack path 或本机绝对路径。

行为边界：

- 本步没有修改 default project generation、Phaser templates、Workbench、QA aggregation、resolver selection、production/default asset pack loading 或 large-library path。
- 本步没有让 repair-enabled mode 成为默认。
- 本步没有写 generated artifacts。

验证：

    npx vitest run tests/contracts/art-asset-runtime-canary.test.ts
    npx vitest run tests/contracts/asset-pack-small-library-bridge-canary.test.ts
    npx vitest run tests/contracts/art-asset-runtime-canary.test.ts tests/contracts/asset-pack-small-library-bridge-canary.test.ts
    npm run typecheck:root
    npm run metadata:validate -- tests/fixtures/art-library-small-v0.1/metadata
    npm run metadata:export-runtime -- --json tests/fixtures/art-library-small-v0.1/metadata
    npm run test:contracts
    npm run typecheck
    npm test
    git diff --check

验证结果：

- Focused runtime canary tests 通过：5 tests。
- Focused small-library bridge + runtime canary tests 通过：9 tests。
- small-library metadata validation 通过：10 metadata files。
- small-library runtime metadata JSON export 通过：`ok: true`，10 assets，0 diagnostics。
- contract suite 通过：20 files，193 tests。
- full typecheck 通过：root、maker-api、maker-workbench。
- full test suite 通过：contract suite + workspace suite。
- `git diff --check` 通过。

审查门禁结论：

- Oracle 审查完成：P0/P1/P2/P3 均无。
- Oracle 确认默认行为未改变、unsupported flag fail closed、flag-on scope 固定到 small fixture metadata directory、unsafe path diagnostics 不回显原始 unsafe path，测试覆盖 Step 11B gate，文档未误称 Step 11C / production default integration / large library 已完成。

### 2.34 Step 11A: Non-Default Runtime Integration Gate

完成时间：2026-06-13

已完成内容：

- 关闭 Step 10B 分支边界：`test/asset-semantic-step-10b-small-library-bridge-canary` 已 fast-forward 合并回 `main`。
- 新建 `docs/art-asset-step-11a-runtime-integration-gate` 分支。
- 更新 `docs/refactor-log/art-asset-pipeline-production-rollout/step-11a-non-default-runtime-integration-gate.md`，定义 Step 11B 的非默认 canary flag、输入契约、flag-off 等价测试、flag-on canary 测试、失败关闭、rollback 和候选文件范围。
- 更新 rollout README 与 semantic fidelity plan，标记 Step 11A 为当前 docs-only gate。

Gate 决策：

- Step 11B 只能作为非默认 canary 继续。
- proposed flag：`ASSET_RUNTIME_METADATA_CANARY=small-library-v0.1`。
- 默认状态 off；flag 缺失或空值时必须等价于当前行为。
- 只允许读取 `tests/fixtures/art-library-small-v0.1/metadata` 派生的 runtime-safe metadata。
- 非法 flag value 或 invalid runtime artifact 必须 fail closed。
- rollback 为移除或不设置该非默认 flag path；不能要求生产/default 配置变更。

行为边界：

- 本步没有修改代码、测试、脚本或 generated artifacts。
- 本步没有修改 runtime/default behavior。
- 本步没有修改 resolver、QA、Workbench、Phaser 或 asset pack loading。
- 本步没有触碰 large art library。
- 本步没有让 repair-enabled mode 成为默认。

验证：

    git diff --check

审查门禁结论：

- Oracle 首轮审查：P0/P1/P3 无；P2 指出 `docs/refactor-log/ai-game-dsl-p0-step-index.md` 后段仍保留旧 Step 8d branch boundary 当前下一步，与顶部 Step 11A 冲突。
- 已修复：将 step index 后段当前下一步同步为 Art Asset Pipeline Production Rollout 阶段，Step 10B 已关闭分支边界，当前 Step 11A docs-only gate，Step 11A 提交并通过 Oracle 门禁后才可决定是否进入 Step 11B。
- Oracle 复审：P0/P1/P2/P3 均无；确认 Step 11A 仍是 docs-only，未误称 Step 11B、production rollout、large library 或 runtime/default integration 已完成。
- 审查模式：Oracle 新建后复用。

### 2.33 Art Asset Pipeline Production Rollout Split

完成时间：2026-06-13

已完成内容：

- 从 `/Users/dahufa/Documents/workspace/art_asset_pipeline_production_rollout_plan.zip` 萃取剩余 rollout 计划。
- 新增 `docs/refactor-log/art-asset-pipeline-production-rollout/README.md`，记录当前状态、硬边界、分步索引和 branch boundary。
- 新增 Step 11A 到 Step 14D 的逐步 docs，按步骤类型记录 allowed/not allowed、required output 或 required decisions，并统一记录 validation 和 P0/P1/P2/P3 review gate。
- 新增 supporting docs：validation matrix、review gates、artifact storage policy、decision points。

阶段结果：

- 没有启动 Step 11A implementation。
- 没有修改 runtime/default behavior。
- 没有触碰 large art library、QA、Workbench、Phaser、resolver 或 asset pack loading。
- 后续执行必须从 Step 11A docs-only gate 开始，且不能继续在 Step 10B 分支上落后续步骤。

验证：

    git diff --check

审查门禁结论：

- Oracle 新建审查：P0/P1/P2 均无；P3 指出部分 step 文档缺 `P3` 小节，以及 2.33 描述对 allowed/not allowed 的承诺过宽。
- 已修复：所有 Step 11A-14D step 文档补齐 `P3` 小节；2.33 描述改为按步骤类型记录 allowed/not allowed、required output 或 required decisions。
- Oracle 复审：P0/P1/P2/P3 均无；确认没有 runtime/default、large library、Workbench/QA、Phaser、resolver 或 repair default 的越界暗示。
- 审查模式：Oracle 新建后复用。

### 2.32 Step 10B: Small Library Bridge Canary Implementation

完成时间：2026-06-13

已完成内容：

- 新增 `tests/contracts/asset-pack-small-library-bridge-canary.test.ts`，实现 fixture-only small library bridge canary。
- 从 `tests/fixtures/art-library-small-v0.1/metadata` 生成 runtime-safe metadata。
- 从同一份 runtime-safe metadata 派生 explicit bridge candidates。
- 使用 exact 10 small-library asset ids 作为 sorted `requestedAssetIds`。
- 使用 Step 4B pure report-only helpers：
  - `createAssetPackMetadataBridgeSummary`
  - `createAssetResolverDiagnosticsSummary`
- 更新 `docs/refactor-log/asset-pack-metadata-bridge-step-10a-small-library-canary.md` 与 semantic fidelity plan，记录 Step 10B follow-up。

Gate 摘要：

- Bridge green canary `ok=true`、`matched_count=10`、`diagnostic_count=0`。
- Resolver-adjacent green canary `ok=true`、`requested_count=10`、`resolved_count=10`、`diagnostic_count=0`。
- Missing requested id、missing bridge candidate 和 blocked context diagnostics 都是独立 negative cases，不混入 green canary。
- Summary objects 不包含 timestamp、absolute local path 或 production/default asset pack path。
- Unsupported semantic diagnostics 未被发明；当前 helper API 没有 explicit expected semantic input。

行为边界：

- 本步没有修改 runtime/default asset loading。
- 本步没有修改 resolver behavior。
- 本步没有调用 `resolveLocalAssetPack` 或 `selectLocalAssetPack`。
- 本步没有使用 real/default resolver paths。
- 本步没有修改 QA runtime behavior、Workbench、Phaser 或 asset pack loading。
- 本步没有触碰、扫描、导入或处理 large asset library。
- 本步没有修改 source assets、metadata sidecars 或 source metadata。
- 本步没有新增 generated artifacts、CLI scripts 或 npm scripts。
- 本步没有让 repair-enabled mode 成为默认。

验证：

    npx vitest run tests/contracts/asset-pack-small-library-bridge-canary.test.ts

审查记录：

- Oracle 只读审查：P0/P1/P2/P3 均无。
- Oracle 确认 green canary 只从 `tests/fixtures/art-library-small-v0.1/metadata` runtime export 派生输入，只调用 `createAssetPackMetadataBridgeSummary` / `createAssetResolverDiagnosticsSummary`。
- Oracle 确认 missing-id、missing-candidate、blocked-context negative diagnostics 与 green canary 分离且 deterministic。
- Oracle 确认 docs 未误称 runtime integration、production/default loading、real resolver execution、large library rollout 或 Workbench/Phaser integration 已完成。

Future boundaries：

- Step 11A：non-default runtime integration gate remains future if needed。
- Step 13A：large library gate remains future and separate。

### 2.31 Step 10A: Small Library Bridge Canary Review Gate

完成时间：2026-06-13

已完成内容：

- 新增 `docs/refactor-log/asset-pack-metadata-bridge-step-10a-small-library-canary.md`，定义 Step 10B small library bridge canary 的 docs-only gate。
- 更新 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`，将 Step 4B 标为已完成，Step 10A 标为当前 docs-only gate，Step 10B 标为下一步。
- 更新本 review log，记录 Step 10A 是 docs-only gate，不实现 Step 10B。

Gate 摘要：

- Step 10B 必须是 fixture-only explicit-input small library bridge canary。
- Step 10B 只能使用 `createAssetPackMetadataBridgeSummary` 和 `createAssetResolverDiagnosticsSummary`。
- Step 10B 不得调用 `resolveLocalAssetPack`、`selectLocalAssetPack`、real resolver path、runtime/default resolver path、QA runtime path、Workbench path、Phaser runtime path 或 asset pack loading path。
- Bridge candidates 必须一条 small library metadata asset 对一条 explicit candidate，字段来自 runtime-safe metadata `asset_id`、`technical.source_path`、`technical.thumbnail_path`，可选 `asset_type`。
- Resolver-adjacent `requestedAssetIds` green path 必须使用 exact 10 known small-library asset ids。
- Green canary 与 negative diagnostics 必须分离；missing-id / blocked-context 只能作为 focused negative cases。
- Step 10B 不要求 unsupported semantic diagnostics；当前 helper API 没有 explicit expected semantic input。

行为边界：

- 本步没有实现代码。
- 本步没有新增 tests、scripts、CLI 或 generated artifacts。
- 本步没有修改 runtime/default asset loading。
- 本步没有修改 resolver behavior。
- 本步没有修改 QA runtime behavior、Workbench、Phaser 或 asset pack loading。
- 本步没有扫描、导入或处理 large asset library。
- 本步没有修改 asset imports、metadata sidecars、source metadata 或 source assets。
- 本步没有启动 Step 10B implementation。

Future boundaries：

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

### 2.30 Metadata Step 4B: Asset Pack Metadata Bridge / Resolver Diagnostics Implementation

完成时间：2026-06-13

已完成内容：

- 新增 `packages/asset-pipeline/src/asset-pack-metadata-bridge.ts`，提供 deterministic report-only `createAssetPackMetadataBridgeSummary`。
- 新增 `packages/asset-pipeline/src/asset-pack-resolver-diagnostics.ts`，提供 deterministic report-only `createAssetResolverDiagnosticsSummary`。
- 更新 `packages/asset-pipeline/src/index.ts`，只导出新增 pure helper API / types。
- 新增 `tests/contracts/asset-pack-metadata-bridge.test.ts`，覆盖 small library explicit candidates、missing / duplicate / mismatch / absolute path / deterministic / non-mutation。
- 新增 `tests/contracts/asset-pack-resolver-diagnostics.test.ts`，覆盖 requested id、missing id、duplicate id、absolute path、blocked context、no fabricated unsupported semantic diagnostic、deterministic / non-mutation。
- 新增 `docs/refactor-log/asset-pack-metadata-bridge-step-4b.md`，记录 Step 4B boundary、API、diagnostic codes、validation 和 review gate。
- 更新 `docs/refactor-log/asset-pack-metadata-bridge-step-4a.md` 与 semantic fidelity plan，记录 Step 4B follow-up。

API 摘要：

- Bridge input 为 runtime-safe metadata artifact + explicit candidates；candidate `asset_id` 保持 optional，以便 missing id 成为可诊断输入。
- Bridge output 为 `bridge_version: "0.1"`、counts 和 deterministic diagnostics。
- Resolver diagnostics input 为 runtime-safe metadata artifact + explicit requested ids + optional explicit context id。
- Resolver diagnostics output 为 `diagnostics_version: "0.1"`、counts 和 deterministic diagnostics。

Diagnostic codes：

- Bridge：`ASSET_PACK_METADATA_BRIDGE_DUPLICATE_RUNTIME_ASSET_ID`、`ASSET_PACK_METADATA_BRIDGE_DUPLICATE_CANDIDATE_ASSET_ID`、`ASSET_PACK_METADATA_BRIDGE_RUNTIME_ASSET_WITHOUT_CANDIDATE`、`ASSET_PACK_METADATA_BRIDGE_CANDIDATE_WITHOUT_RUNTIME_ASSET`、`ASSET_PACK_METADATA_BRIDGE_SOURCE_PATH_MISMATCH`、`ASSET_PACK_METADATA_BRIDGE_THUMBNAIL_PATH_MISMATCH`、`ASSET_PACK_METADATA_BRIDGE_ABSOLUTE_PATH_REJECTED`、`ASSET_PACK_METADATA_BRIDGE_MISSING_ASSET_ID`。
- Resolver diagnostics：`ASSET_RESOLVER_DIAGNOSTIC_MISSING_ASSET_ID`、`ASSET_RESOLVER_DIAGNOSTIC_BLOCKED_CONTEXT`、`ASSET_RESOLVER_DIAGNOSTIC_DUPLICATE_ASSET_ID`、`ASSET_RESOLVER_DIAGNOSTIC_ABSOLUTE_PATH_REJECTED`。

Unsupported semantic diagnostic decision：

- Step 4B 不实现 unsupported semantic diagnostics。
- 当前 helper input 没有 explicit expected tags / expected roles / expected semantic constraints；从 requested asset id 或 context 推断 unsupported semantic 会误导。
- 后续如需该能力，必须先扩展显式 expected semantic input 并新增 tests。

行为边界：

- 本步没有修改 runtime/default asset loading。
- 本步没有修改 resolver decisions 或 production resolver implementation。
- 本步没有调用 `resolveLocalAssetPack` 或 `selectLocalAssetPack`。
- 本步没有修改 QA runtime behavior、Workbench、Phaser 或 asset pack loading。
- 本步没有接入 production/default asset packs。
- 本步没有扫描、导入或处理 large asset library。
- 本步没有修改 source metadata、source assets 或 repair writeback。
- 本步没有生成或提交 artifacts。

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
- Oracle 复审：P0/P1/P2/P3 均无；确认 Step 4B 可以在 staged diff 检查后提交。

### 2.29 Metadata Step 4A: Asset Pack Metadata Bridge / Resolver Diagnostics Review Gate

完成时间：2026-06-13

已完成内容：

- 新增 `docs/refactor-log/asset-pack-metadata-bridge-step-4a.md`，定义 future asset pack metadata bridge / resolver diagnostics review gate。
- 更新 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`，记录 Step 9C branch boundary 已关闭、Step 4A 为当前 docs-only gate、Step 4B 为下一步，large asset library 和 runtime/default integration 继续 parked。
- 更新本 review log，记录 Step 4A docs-only 边界和 Step 4B future implementation boundary。

Gate 摘要：

- Step 4A 只是 review gate，用于把既有 metadata validation、runtime-safe export、Step 9C small library dry-run 和 canary comparison 输出连接到未来 bridge / diagnostics 设计。
- Step 4B 未来可以读取 runtime-safe metadata artifacts、small library dry-run outputs 或 fixture metadata，生成 deterministic bridge summary、resolver diagnostics JSON 或 compatibility report。
- Resolver diagnostics 必须 report-only、deterministic、stable diagnostic code style，不改变 resolver decision、runtime/default behavior、repair writeback 或 unsupported asset promotion。
- Small library dry-run output 可以作为 fixture / canary / bridge diagnostic input，但不能成为 production/default asset loading 输入。
- Large asset library 继续 parked；未来必须另走 large library gate。

行为边界：

- 本步没有实现代码。
- 本步没有新增或修改 tests。
- 本步没有修改 asset imports、metadata sidecars 或 generated artifacts。
- 本步没有修改 runtime/default asset loading、resolver default behavior、QA aggregation、Workbench、Phaser、asset pack loading 或 repair-enabled default。
- 本步没有扫描、导入或处理 large asset library。
- 本步没有启动 Step 4B implementation。

Step 4B 未来允许：

- bridge helper。
- resolver diagnostic helper。
- focused tests。
- deterministic report schema。
- docs update。

Step 4B 未来不允许：

- runtime/default loading。
- production asset pack integration。
- Workbench UI。
- Phaser runtime loading。
- large library rollout。
- repair-enabled default。
- source metadata rewrite。
- large asset library scan/import。

后续路线：

1. Metadata Step 4B asset pack metadata bridge / resolver diagnostics implementation。
2. Small library bridge canary，仍为 fixture-only / non-production。
3. Non-default runtime integration，必须显式 opt-in。
4. Workbench / QA preview，只预览 diagnostics，不改变 default verdict。
5. Large library gate，单独审查 size、license、scan/import 和 rollout policy。
6. Production rollout gate，单独审查 default asset pack behavior、resolver consumer 和 runtime loading。

验证：

    git diff --check

审查记录：

- Oracle 审查：P0/P1/P2/P3 均无阻塞；确认 Step 4A docs-only gate 可在主 agent 重新确认 `git diff --check`、`git status --short --branch` 和 staged diff 范围后提交。

### 2.28 Asset Semantic Fidelity Step 9C: Small Art Library Dry-Run Validation / Canary / Comparison

完成时间：2026-06-13

已完成内容：

- 新增 `scripts/asset-semantic-small-art-library-dry-run.ts`，当 `--fixture` 指向包含 `metadata/` 的 fixture root 时，只在 canary dry-run 内执行 metadata validation / runtime-safe export，并生成 deterministic canary summary。
- 更新 `scripts/run-asset-semantic-canary.ts`，保持默认 JSON canary brief fixture 行为不变；small library directory fixture 不启动 preview server / project generation / runtime resolver。
- 更新 `scripts/asset-semantic-canary-report.ts`，给 summary 增加 optional fixture identity。
- 更新 `scripts/asset-semantic-canary-comparison.ts`，要求 default 和 repair-enabled summary 使用相同 fixture path / identity / asset count，并在 comparison output 写入 deterministic fixture summary。
- 新增 `tests/contracts/asset-semantic-small-library-dry-run.test.ts`，覆盖 small library root detection、default / repair-enabled same fixture identity、comparison deterministic output、ignored artifacts path。
- 扩展 `tests/contracts/asset-semantic-canary-comparison.test.ts`，覆盖 fixture path mismatch rejection。

行为边界：

- 未修改 runtime/default asset loading、resolver default behavior、QA aggregation、Workbench、Phaser、asset pack loading 或 repair-enabled default。
- 未启动 Metadata Step 4A bridge / resolver diagnostics。
- 未触碰 large asset library。
- 未导入 Step 9B 之外的新资产，small library fixture asset count 仍为 10。
- 未静默修复或重写 source metadata。
- generated runtime / canary / comparison artifacts 全部留在 ignored `artifacts/` 路径，未加入 git。

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
    # artifacts/asset-semantic-canary/20260613Tstep9c-default，runnable=10 skipped=0 experimental=0 passed=10 failed=0，repair.enabled=false

    npm run qa:asset-semantic:canary -- --repair-enabled --fixture tests/fixtures/art-library-small-v0.1 --timestamp 20260613Tstep9c-repair
    # artifacts/asset-semantic-canary/20260613Tstep9c-repair，runnable=10 skipped=0 experimental=0 passed=10 failed=0，repair.enabled=true

    npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260613Tstep9c-default/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260613Tstep9c-repair/summary.json --out artifacts/asset-semantic-canary-comparison/20260613Tstep9c-small-library/comparison.json
    # ok=true，case.total=10，case.runnable=10，default.failed=0，repair.failed=0，failureDiagnosticDelta=0

    npm run qa:asset-semantic:canary -- --limit 1 --timestamp 20260613Tstep9c-default-behavior-smoke
    # default JSON fixture smoke 仍通过：runnable=1 skipped=17 passed=1 failed=0

    git ls-files --others --exclude-standard artifacts/asset-semantic-canary/20260613Tstep9c-default artifacts/asset-semantic-canary/20260613Tstep9c-repair artifacts/asset-semantic-canary-comparison/20260613Tstep9c-small-library
    # 无输出

阶段结果：

- default canary artifact：`artifacts/asset-semantic-canary/20260613Tstep9c-default/summary.json`。
- repair-enabled canary artifact：`artifacts/asset-semantic-canary/20260613Tstep9c-repair/summary.json`。
- comparison artifact：`artifacts/asset-semantic-canary-comparison/20260613Tstep9c-small-library/comparison.json`。
- comparison summary：`ok=true`，fixture identity `art-library-small-v0.1`，`asset_count=10`，default / repair-enabled 均 `failure_diagnostic_count=0`、`diagnostic_codes=[]`、`medium_warning_count=0`，所有 delta 为 0。

审查记录：

- Oracle 复审：P0/P1/P2 未发现问题；确认 Step 9C 改动保持在 canary/dry-run/reporting 层，未越界到 runtime/default behavior、resolver、QA aggregation、Workbench、Phaser、asset pack loading、large library 或 Metadata Step 4A。
- Oracle 重点确认：`--fixture` directory branch 未劫持默认 JSON canary；default / repair-enabled summary 校验相同 small library fixture path / identity / asset count；generated artifacts 保持在 ignored `artifacts/` 路径且未进入 git。
- P3 可选：未来若继续修改 runner，可补 CLI 级 small-library smoke test；本步已有本地命令验证，不阻塞提交。

### 2.27 Asset Semantic Fidelity Step 9A: Small Art Library Intake Review Gate

完成时间：2026-06-13

已完成内容：

- 新增 `docs/refactor-log/asset-semantic-small-art-library-v0.1.md`，定义 small art library dry-run 的目的、与 Step 8a-8d 的关系、尺寸限制、布局建议、二进制资产策略、metadata 要求、validation / export / canary / comparison 要求、runtime/default 非目标、Step 9B / Step 9C 边界和 P0/P1/P2/P3 gate。
- 更新 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`，把 Step 9A 标为已完成，Step 9B 标为下一步，Step 9C 标为后续。
- 更新本 review log，记录 Step 9A 是 docs-only gate。

行为边界：

- 本步没有导入任何 art library。
- 本步没有新增真实 binary assets、metadata sidecar、runtime export artifacts、canary fixtures、tests 或 code。
- 本步没有创建 `tests/fixtures/art-library-small-v0.1/` 或 `assets/canary/art-library-small-v0.1/` 目录。
- 本步没有修改 runtime/default behavior、asset pack loading、resolver、QA、Workbench、Phaser、repair planner / executor / pipeline 或 shooter HUD。
- 本步没有启动 Metadata Step 4A、large asset library、DAM / vector / image embedding、Unity / Unreal / glTF / USD 或 C2PA pipeline。

Gate 摘要：

- small art library target size 为 10 到 30 个 assets，最大 50 个；超过 50 个必须另走 large-library rollout gate。
- 默认推荐路径为 `tests/fixtures/art-library-small-v0.1/`，因为 Step 9 是 test / dry-run fixture；只有仓库先建立 `assets/canary` 约定时才考虑 `assets/canary/art-library-small-v0.1/`。
- Step 9B import 前必须明确 per-file、total-size、allowed binary formats、thumbnail 计入规则和外部 artifact reference 表达方式。
- Step 9B 每个 asset 必须有 sidecar metadata，并通过既有 metadata validation，兼容 taxonomy v0.2，且 runtime-safe export 不包含 prompt / seed / legal / review notes / absolute local paths。
- Step 9C 必须跑 metadata validate / JSON validate / runtime-safe export / default canary / repair-enabled canary / comparison；canary 当前应使用 `--fixture <small-library-canary-briefs.json>`，comparison 应使用 `--default-summary` / `--repair-enabled-summary` / `--out`；如果现有 `--fixture` 不足以表达 small library dry-run，Step 9B 或 Step 9C 只能新增 canary-only input option，不能改变默认行为。

验证：

    git diff --check

审查记录：

- Oracle 初审：P0/P2/P3 无；P1 要求把 canary / comparison 命令从 positional placeholder 改成当前 CLI 的 `--fixture`、`--default-summary`、`--repair-enabled-summary` 和 `--out` flag 语法。
- Oracle 复审：P0/P1/P2/P3 均无；确认 Step 9A 仍为 docs-only，未越界到 assets、metadata sidecars、generated artifacts、runtime / resolver / QA / Workbench / Phaser 或 asset pack loading。

### 2.26 Asset Semantic Fidelity Step 8d: Default / Repair-Enabled Canary Comparison

完成时间：2026-06-13

已完成内容：

- 新增 `scripts/asset-semantic-canary-comparison.ts`，只读取两份 canary `summary.json` 并构建 deterministic comparison object。
- 新增 `scripts/compare-asset-semantic-canaries.ts` 和 `npm run qa:asset-semantic:compare`，支持 `--default-summary`、`--repair-enabled-summary` 与可选 `--out`。
- 新增 `tests/contracts/asset-semantic-canary-comparison.test.ts`，覆盖 green comparison、case set / repair flag mismatch、failure diagnostic code delta、medium warning 分离、case-level repair action normalization 和 CLI args。
- 更新 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`，记录 Step 8d 边界、验证命令与结果。

行为边界：

- comparison CLI 不运行 canary，只读取调用方传入的两份 summary；只有 build 成功后才写 `comparison.json`。
- default input 必须 `repair.enabled=false`，repair-enabled input 必须 `repair.enabled=true`；两份 summary 的 case id 顺序、`skipped`、`experimental`、`total`、`runnable`、`skipped`、`experimental` 必须一致。
- `failure_diagnostic_count` 只统计 `NEEDS_ASSET_REPAIR`、`QA_FAILED`、hard mismatch / unknown、required asset missing、asset load failure 和 placeholder；medium warning 只进入 `medium_warning_count`。
- repair action 只从 case-level `repair.repairedRequirements[].action` 去重排序为 `actionsAccepted`，不制造固定空的 proposed / rejected action aggregate。
- 未修改 canary fixture pack、taxonomy、生产资源包、large asset library、AI image provider、Metadata Step 4A、resolver、QA、Workbench、Phaser、asset pack loading、runtime default behavior、repair planner / executor / pipeline 或 shooter HUD。

验证：

    npx vitest run tests/contracts/asset-semantic-canary-comparison.test.ts
    npm run qa:asset-semantic:canary
    npm run qa:asset-semantic:canary -- --repair-enabled
    npm run qa:asset-semantic:compare -- --default-summary artifacts/asset-semantic-canary/20260613T064654Z/summary.json --repair-enabled-summary artifacts/asset-semantic-canary/20260613T064842Z/summary.json --out artifacts/asset-semantic-canary-comparison/20260613T064842Z/comparison.json
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

- Oracle 预审：P0 无；P1 要求校验 exact comparable case set 和 default / repair-enabled repair flag，并避免输出误导性的固定空 repair action arrays；P2 要求 `failure_diagnostic_count` 不包含 medium warnings。已按此收紧。
- Oracle 最终审查：P0/P1/P2 均无；P3 提醒 CLI 成功日志应打印 case set 摘要，已补充 `case.total` / `case.runnable` / `case.skipped` / `case.experimental` 输出；本步可提交。

### 2.25 Asset Semantic Fidelity Step 8c: Canary Fixture Pack v0.2

完成时间：2026-06-13

已完成内容：

- `tests/fixtures/asset-semantic-canary.briefs.json` 从 14 条扩展到 18 条，保持 5-20 条 small canary fixture pack 边界。
- 新增 fixtures：`tank_battlefield_shooter`、`tank_fishbone_battlefield_shooter`、`cat_vs_tank_space_shooter`、`alien_vs_alien_space_shooter`。
- 新增覆盖：tank + battlefield local-pack positive path、tank + fishbone medium projectile warning boundary、cat/tank mixed fallback boundary、alien-only creature fallback boundary。
- `tests/contracts/asset-semantic-canary-fixture.test.ts` 断言 Step 8c fixture id、pack size、canary v0.2 taxonomy baseline 和 Step 8c notes。
- `tests/contracts/asset-semantic-canary-runner.test.ts` 断言默认 runner selection 现在选中 18 条、skipped 为空。

行为边界：

- 本步是 canary fixture pack / brief pack v0.2，不是生产 local asset pack 接入；未新增或修改 `assets/asset-packs`。
- 未修改 resolver ranking、Step 3 hard gate、fallback 策略、manifest `semanticFit`、`asset_resolution_report`、QA aggregation、Workbench UI、Phaser runtime、repair planner / executor / pipeline 或 asset pack loading。
- 未接入真实第三方资源切片、large asset library、AI image provider、Metadata Step 4A 或 shooter HUD 文件。
- 默认 canary 与 repair-enabled canary 仅作为 Step 8c release guard，不作为 Step 8d comparison；未生成 comparison report 或 script。

验证：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts tests/contracts/asset-semantic-canary-runner.test.ts
    npm run qa:asset-semantic:canary
    npm run qa:asset-semantic:canary -- --repair-enabled
    npm run test:contracts
    npm test
    npm run typecheck
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples

结果：

- TDD 红灯：focused canary tests 先因 fixture 仍为 14 条失败；补充 4 条 Step 8c fixture 后 2 个测试文件 24 个测试通过。
- 默认 full canary：`artifacts/asset-semantic-canary/20260613T061551Z`，`runnable=18 skipped=0 experimental=0 passed=18 failed=0`，`repair.enabled=false repair.attemptedCount=0 repair.failedCount=0`。
- repair-enabled full canary：`artifacts/asset-semantic-canary/20260613T061743Z`，`runnable=18 skipped=0 experimental=0 passed=18 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- default / repair-enabled summaries 均为 `NEEDS_ASSET_REPAIR=0`、`QA_FAILED=0`、`hardMismatch=0`、`hardUnknown=0`、`requiredAssetMissing=0`、`assetLoadFailures=0`、`placeholderUsed=0`。
- `tank_fishbone_battlefield_shooter` 产生的 medium warning 保持为 `PLAYABLE_WITH_ART_WARNINGS`，没有升级为 hard mismatch 或 repair trigger。
- `npm run test:contracts` 通过：13 个测试文件，156 个测试通过。
- `npm test` 通过：contracts 156 个测试通过，workspace 125 个测试通过。
- `npm run typecheck` 通过。
- `npm run metadata:validate -- assets/metadata/examples` 通过：`OK 5 metadata files`。
- `npm run metadata:export-runtime -- --json assets/metadata/examples` 通过：`ok=true`、`diagnostics=[]`、`asset_count=5`。

审查记录：

- Oracle 预审：P0/P1 无；P2 提醒 `tank_fishbone_battlefield_shooter` 不应断言 medium warning 为 0；P3 提醒 `battlefield` 只作为 canary v0.2 baseline，不应被写成 taxonomy/resource expansion。已按此收紧。
- Oracle 最终审查：P0/P1/P2/P3 均无，可提交；确认本步只改 6 个 Step 8c 文件，没有 `assets/asset-packs`、runtime、resolver、QA、Workbench、Phaser、shooter HUD 或 metadata examples 变更。

### 2.24 Asset Semantic Fidelity Step 8b: Canary Fixture Promotion

完成时间：2026-06-13

已完成内容：

- `tests/fixtures/asset-semantic-canary.briefs.json` 移除 5 个 Step 8a 已支持 canary 的 `expectedUnsupported` / `unsupportedReason` marker。
- promoted fixtures：`cat_fishbone_alien_shooter`、`kitten_extraterrestrial_shooter`、`orange_cat_starfield_alien_shooter`、`armored_vehicle_vs_tank`、`cat_space_alien_fishbone`。
- promotion rationale：Step 8a taxonomy v0.2 已支持 `fishbone` projectile、`异星人`、`星空`、`装甲车`。
- `tests/contracts/asset-semantic-canary-fixture.test.ts` 断言默认 fixture 不再携带 unsupported marker，并保留 promoted fixture id 集。
- `tests/contracts/asset-semantic-canary-runner.test.ts` 断言默认 runner selection 现在选中 14 条、skipped 为空；runner 对 synthetic `expectedUnsupported` 的 skip / experimental 机制仍由既有测试覆盖。

行为边界：

- 未修改 resolver ranking、Step 3 hard gate、fallback 策略、manifest `semanticFit`、`asset_resolution_report`、QA aggregation、Workbench UI、Phaser runtime、repair planner / executor / pipeline 或 asset pack loading。
- 未接入新资源库、真实美术资源、AI image provider、large asset library、Metadata Step 4A 或 shooter HUD 文件。
- 未启动 Step 8c 小包资源扩展或 Step 8d 默认 / repair-enabled 对比。

验证：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts tests/contracts/asset-semantic-canary-runner.test.ts
    npm run qa:asset-semantic:canary
    npm run qa:asset-semantic:canary -- --repair-enabled
    npm run test:contracts
    npm test
    npm run typecheck
    npm run metadata:validate -- assets/metadata/examples
    npm run metadata:export-runtime -- --json assets/metadata/examples

结果：

- TDD 红灯：focused canary tests 先因 5 个旧 `expectedUnsupported` marker 失败；移除 marker 后 2 个测试文件 23 个测试通过。
- 默认 full canary：`artifacts/asset-semantic-canary/20260612T190227Z`，`runnable=14 skipped=0 experimental=0 passed=14 failed=0`，`repair.enabled=false repair.attemptedCount=0 repair.failedCount=0`。
- repair-enabled full canary：`artifacts/asset-semantic-canary/20260612T190351Z`，`runnable=14 skipped=0 experimental=0 passed=14 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`。
- `npm run test:contracts` 通过：13 个测试文件，155 个测试通过。
- `npm test` 通过：contracts 155 个测试通过，workspace 125 个测试通过。
- `npm run typecheck` 通过。
- `npm run metadata:validate -- assets/metadata/examples` 通过：`OK 5 metadata files`。
- `npm run metadata:export-runtime -- --json assets/metadata/examples` 通过：`ok=true`、`diagnostics=[]`、`asset_count=5`。

审查记录：

- Oracle 只读审查：P0/P1/P2/P3 均无，可提交；确认本步只 promotion 5 个 Step 8a 已支持 canary fixture，未触碰 runtime/default behavior、resolver、QA、Workbench、Phaser、asset pack loading、large asset library、Step 8c/8d 或 Metadata Step 4A。

### 2.23 Asset Semantic Fidelity Step 8a: Taxonomy v0.2 for Canary Unsupported Concepts

完成时间：2026-06-12

已完成内容：

- `packages/asset-pipeline/src/taxonomy.ts` 新增 projectile-only canonical concept `fishbone`，覆盖 `fishbone`、`fish_bone`、`fish bone`、`鱼骨`、`鱼骨头`、`鱼骨头子弹`、`鱼骨子弹`。
- `fishbone` 保持 `strictness="medium"`，不把 projectile 语义升级为 hard gate；forbidden tags 覆盖 `shell`、`tank_bullet`、`missile`、`alien`、`extraterrestrial`。
- 扩展现有 canonical concept 的输入 alias：`异星人`、`异星`、`外星怪物`、`异星怪物`、`ufo_creature`、`ufo creature`、`space_creature`、`space creature` -> `alien`；`星空`、`银河`、`星海`、`stars`、`starfield`、`star_field`、`star field`、`cosmic` -> `space`；`装甲车`、`armored_vehicle`、`armored vehicle`、`armoured_vehicle`、`armoured vehicle` -> `tank`。
- 这些 alias 只属于当前 canary unsupported wording 对应的 `alien` / `space` / `tank` concept family input normalization；不扩大 `expectedAnyTags`、resolver ranking、report schema 或资源选择行为。
- taxonomy 匹配 helper 改为先 normalize，再对 ASCII alias 使用 token / token-sequence 匹配；保留 `tankard` 不命中 `tank`、`caterpillar` 不命中 `cat` 的负例。
- `tests/contracts/asset-pipeline.test.ts` 增加 taxonomy v0.2 alias 覆盖和 substring 负例。
- `tests/contracts/asset-semantic-canary-fixture.test.ts` 将 `fishbone` 纳入当前 supported canonical baseline，同时显式断言 5 个 `expectedUnsupported` fixture 仍未 promotion，留给 Step 8b。

行为边界：

- 未修改 resolver ranking、Step 3 hard gate、fallback 策略、manifest `semanticFit`、`asset_resolution_report`、QA aggregation、Workbench UI、Phaser runtime、repair planner / executor / pipeline 或 canary runner 行为。
- 未接入新资源库、真实美术资源或 AI image provider。
- 未修改 shooter HUD 文件。

验证：

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

审查记录：

- Oracle 预审：确认 Step 8a 应只做 taxonomy / synonym normalization 和契约测试，不直接 promotion fixture；`fishbone` 应作为 projectile-only canonical concept，strictness 保持 `medium`；P0 风险是 substring 匹配、projectile hard gate、runner / resolver / QA / repair 行为外溢。
- Oracle 复审：P0/P1/P3 无；P2 指出裸词 `vehicle -> tank` 范围超过当前 canary 需求，已移除裸 `vehicle` alias，并补充 `Vehicle` 不命中 hard tank 的负例后复验。
- Oracle 修复确认：P2 已解决，最终 P0/P1/P2/P3 均无。
- Oracle 二次复审：P0/P1/P3 无；P2 指出代码和文档列出的 alias 范围不一致，已补全文档中的 `alien` / `space` / `tank` input normalization alias 列表并声明不扩大 resolver / report / resource behavior。
- Oracle 二次修复确认：P2 已解决，最终 P0/P1/P2/P3 均无。

### 2.22 Asset Semantic Fidelity Step 7: Repair-Enabled Canary Safety + Release Guard

完成时间：2026-06-12

已完成内容：

- `scripts/run-asset-semantic-canary.ts` 新增 `--repair-enabled`，显式开启时把 `AssetSemanticRepairConfig` 传入 `GenerationPipelineService`，并强制 `maxAttempts=1`。
- 新增 `scripts/asset-semantic-canary-options.ts`，把 runner CLI parsing / help / repair config resolver 提炼为无副作用纯模块，便于合约测试覆盖 default、`--repair-enabled`、env 等价开启和 parser 错误。
- 未传 `--repair-enabled` 时继续读取既有 `readAssetSemanticRepairConfig()`；默认环境下 repair 仍关闭，env 等价路径仍可生效。
- `scripts/asset-semantic-canary-report.ts` 开始解析最终 QA report 的 optional `asset_semantic_repair` metadata。
- `summary.json` 新增顶层 `repair` 聚合对象，并提供 `repairEnabled`、`repairAttempted`、`repairAttemptedCount`、`repairSucceededCount`、`repairFailedCount`、`repairSkippedReasons` 顶层 release guard 别名。
- `repairFailedCount > 0` 会让 supported summary 失败；successful repair attempt 会被记录为 `repairAttemptedCount > 0` / `repairSucceededCount > 0`，但不自动失败。
- 每个 completed case 新增 `repair` metadata；旧 QA report 缺少 repair metadata 时兼容为 `attempted=false`、`skippedReason="missing_repair_metadata"`，不让历史 report 解析失败。
- `summary.md` 新增 `## Repair`、`## Repair skipped reasons`，case table 新增 repair 列。
- 扩展 `tests/contracts/asset-semantic-canary-runner.test.ts`，覆盖 runner default repair disabled、`--repair-enabled` enabled、env 等价开启、parser `--help` / unknown arg / timestamp override / missing flag value、repair-enabled green no-attempt pass、repair attempted success、repair failure fail summary、expectedUnsupported 默认跳过、`--include-unsupported --repair-enabled` 标为 experimental、旧 report 兼容、missing metadata、Markdown repair sections。
- 扩展 `tests/workspace/generation-pipeline.service.test.ts` 的 synthetic hard mismatch repair case：repair 后 QA rerun 返回 `PLAYABLE_WITH_FALLBACK_ASSETS`，并断言 `maxAttempts=1`、before/after status、role / expectedConcept / previous semantic fit / repaired requirement metadata。

阶段结果：

- 解决层级：边界适配 + release guard observability；未改变 repair planner / executor / pipeline 触发规则本身。
- 默认 canary：`artifacts/asset-semantic-canary/20260612T085457Z`，`total=14 runnable=9 skipped=5 experimental=0 passed=9 failed=0`，`repair.enabled=false repair.attemptedCount=0 repair.failedCount=0`。
- repair-enabled canary：`artifacts/asset-semantic-canary/20260612T085600Z`，`total=14 runnable=9 skipped=5 experimental=0 passed=9 failed=0`，`repair.enabled=true repair.attemptedCount=0 repair.failedCount=0`，`repair.skippedReasons.no_asset_semantic_repair_needed=9`。
- 未修改 resolver ranking、Step 3 hard gate、fallback 策略、QA status 聚合、Workbench 大 UI、Phaser runtime、taxonomy、新资源库、AI image provider 或 provider `survive_duration`。
- 未修改 `templates/phaser/shooter/src/GameScene.ts`、`templates/phaser/shooter/src/shooter-renderer.ts` 或 `tests/contracts/phaser-templates.test.ts`。

已通过验证（本步实际执行）：

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
    # runnable=9 skipped=5 experimental=0 passed=9 failed=0
    # repair.enabled=false repair.attemptedCount=0 repair.failedCount=0

    npm run qa:asset-semantic:canary -- --repair-enabled
    # summary 写入 artifacts/asset-semantic-canary/20260612T085600Z
    # runnable=9 skipped=5 experimental=0 passed=9 failed=0
    # repair.enabled=true repair.attemptedCount=0 repair.failedCount=0

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 预审：P0 红线确认，建议最小影响面限定在 canary runner / summary / pipeline 测试 / 文档，不触碰 resolver、hard gate、fallback、QA 聚合、Workbench、Phaser runtime、taxonomy、资源库或 AI image provider。
- Oracle 代码审查：P0/P1/P2 均无；P3 指出 `repairSucceededCount` 对 attempted 但缺 after status 的坏 metadata 计数偏宽。
- 已处理：新增 `isRepairSuccess()`，只有 repair 后 `afterOverallStatus` 为 playable 类状态且 `afterAssetSemanticStatus` 为 `PASSED` / `WARNING` 时才计入 succeeded；`afterOverallStatus="NEEDS_ASSET_REPAIR"` / `QA_FAILED` 计入 failed；补充 `repair_incomplete_metadata_case` 测试。
- Oracle 复审：P0/P1/P2/P3 均无；确认上一轮 P3 已关闭。
- Oracle 补测审查：P0/P1/P2 均无；P3 建议补 parser 纯单测并将三份 refactor 文档纳入复审。
- 已处理：补充 `--help`、unknown arg、`--timestamp` override、缺失 flag value parser 测试，并复跑 runner contract test 与 root typecheck。
- 审查模式：Oracle 复用。

### 2.21 Asset Semantic Fidelity Step 6c: Repair Pipeline Integration Behind Flag

完成时间：2026-06-12

已完成内容：

- `GenerationPipelineService` 新增 `AssetSemanticRepairConfig`，默认 `enabled=false`，仅 `ASSET_SEMANTIC_REPAIR_ENABLED=true` 或测试显式配置才会进入 repair integration。
- 首次 QA 完成后只在 `status="PASSED"`、`runtime_status="PASSED"`，且 `overall_status="NEEDS_ASSET_REPAIR"` 或 `asset_semantic_status="FAILED"` 时考虑 repair。
- repair 触发前额外拒绝 `asset_report.failures`、runtime asset `failed` / `missing` / `missing_required_roles`，确保 required asset load failure、missing file/path 或 runtime QA failure 不进入 semantic repair。
- pipeline 读取 generated project 的 `public/asset_manifest.json` 和 `asset_resolution_report.json`，调用 `buildAssetRepairPlan`；只有 `plan.triggered=true` 且存在 hard semantic executable item 时才调用 `executeAssetRepairPlan`。
- repair 最多执行 1 次；`maxAttempts` 即使配置为更大也 clamp 到 1。
- repair 成功后重新执行 build / preview artifact check / QA 一次；不循环重试。
- repair 执行结果继续写入 generated project `asset_resolution_report.json.repair`；pipeline 额外写入 `asset-repair.*` timeline event 和 `asset-repair` run step。
- 最终 `qa-report.json` 写入 `asset_semantic_repair` audit metadata，覆盖 disabled / skipped / attempted / failed / repaired outcomes，并记录 before / after semantic status、repair plan triggered、executable item count、repaired requirements 和 failure reasons。
- `PLAYABLE`、`PLAYABLE_WITH_FALLBACK_ASSETS`、`PLAYABLE_WITH_ART_WARNINGS`、`fallback_generated`、medium / soft warning、runtime `QA_FAILED` 和 asset load failure 均不会触发 repair。
- 新增/扩展 `tests/workspace/generation-pipeline.service.test.ts`，覆盖默认关闭、显式开启后 hard semantic repair + 一次 QA rerun、fallback/warning 不修、runtime failure 不修、asset load failure 不修、inconsistent `overall_status="QA_FAILED"` 不修、inconsistent fallback/warning overall 不修、zero attempt budget、no executable item、executor failure、repair rebuild failure step 收敛和 final report metadata。

阶段结果：

- 解决层级：边界适配 + pipeline 业务规则门禁。
- 行为边界：未修改 resolver ranking、Step 3 hard gate、fallback 策略、Phaser runtime、Workbench 大 UI、taxonomy、新资源库、AI image provider 或 provider `survive_duration`。
- 默认 canary 路径未开启 repair，`NEEDS_ASSET_REPAIR=0`、`QA_FAILED=0`、`hardMismatch=0`、`hardUnknown=0`、`requiredAssetMissing=0`、`assetLoadFailures=0`、`placeholderUsed=0` 维持健康。
- shooter HUD stash 不属于本步 scope；本步没有修改 `templates/phaser/shooter/src/GameScene.ts`、`templates/phaser/shooter/src/shooter-renderer.ts` 或 `tests/contracts/phaser-templates.test.ts`。

已通过验证（本步实际执行）：

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

审查门禁结论：

- Oracle 代码审查：P0/P1/P2 均无；P3 指出默认关闭测试未覆盖 `readAssetSemanticRepairConfig` env 解析和 maxAttempts clamp。
- 已处理：新增 `readAssetSemanticRepairConfig` 配置测试，覆盖默认 `enabled=false` 和显式开启时 `maxAttempts` clamp 到 1；复跑 `tests/workspace/generation-pipeline.service.test.ts`、相关四件套、全量 `npm run typecheck` 和 `git diff --check`。
- Oracle 文档复审：首轮 P2 指出验证记录缺少全量 `npm run typecheck` 和 `git diff --check` 结果；已补齐 review log 与 semantic fidelity plan 的验证结果后复审，P0/P1/P2/P3 均无。
- 附件规格复核首轮：P0 无；P1 指出缺少结构化 `asset_semantic_repair` report metadata；P2 指出 skip reason 不够显式且缺少 inconsistent `overall_status="QA_FAILED"` 等边界测试。
- 已处理：`QaReport` 新增 optional `asset_semantic_repair`，pipeline 在最终 report 写入 disabled / skipped / attempted / failed / repaired metadata；补充 no executable item、executor failure、rebuild failure、runtime asset failure、inconsistent QA_FAILED、fallback / warning skip 和 repaired requirements 断言。
- Oracle 复审 P2：指出 inconsistent fallback/warning overall 仍可能被 `asset_semantic_status="FAILED"` 放行、repair rebuild failure 时 `qa` step 可能残留 `RUNNING`、Step 7 文档措辞像提前验收完成。
- 已处理：precheck 显式按 overall 拒绝 `PLAYABLE` / fallback / art warning；repair rebuild failure 返回前收敛 `qa` step 为 `DONE`；Step 7 表格改为“待验收目标”；补充 zero attempt budget、inconsistent fallback/warning、rebuild failure step 断言并复跑验证。
- Oracle 最终复审：P0/P1/P2/P3 均无；确认上一轮 3 个 P2 和 1 个 P3 已关闭，Step 6c 代码与文档门禁通过。
- 审查模式：Oracle 复用。

### 2.20 Asset Semantic Fidelity Step 6b: Conservative Repair Executor

完成时间：2026-06-12

已完成内容：

- 新增 `packages/asset-pipeline/src/asset-repair-executor.ts` 和 `asset-repair-executor.types.ts`，导出显式 `executeAssetRepairPlan`。
- 新增 `packages/asset-pipeline/src/asset-repair-report.schema.ts`，让 `AssetResolutionReportSchema` 可选携带 `repair` section。
- `plan.triggered=false` 时 no-op；`plan.triggered=true` 时只处理 hard semantic failed executable item。
- `LocalAssetPackProvider` 仅新增 optional project-local blacklist 输入；默认不传 blacklist 时选择行为不变。
- rerresolve 使用临时 staging assets 目录，只有 repaired requirement ID 对应的 SVG 会被 copy 回项目，避免覆盖非 repair 目标文件。
- 无合格 local asset 时强制 deterministic `template_svg` fallback，并保持 requirement id / `loadKey`。
- 修复成功时重写 project root `asset_manifest.json`、`public/asset_manifest.json` 和 `asset_resolution_report.json.repair`。
- `triggered=true` 但无 executable hard item 时只写 `repair.status = "no_action"` 审计 section，不写 manifest 或 assets。
- 写入前校验 `repairPlan.projectId`、`asset_plan.json.projectId`、`public/asset_manifest.json.projectId` 和 `asset_resolution_report.json.projectId` 一致。
- 新增 `tests/contracts/asset-repair-executor.test.ts`，覆盖 fallback repair、第二个合格 local pack rerresolve、no-action audit、project id mismatch 和 blacklisted selected candidate 清理。

阶段结果：

- 解决层级：数据契约 + repair executor 边界适配 + 文件 I/O 审计。
- 行为边界：未默认挂入 `GenerationPipeline`；未修改 QA 聚合、Workbench UI、Phaser runtime、taxonomy、Step 3 hard gate、正常 resolver ranking、新资源库、AI image provider 或 provider `survive_duration`。
- 修复范围只包含 hard semantic failed executable item；不修 medium / soft warning 或 `fallback_generated`。
- shooter HUD stash 不属于本步 scope；本步没有修改 `templates/phaser/shooter/src/GameScene.ts`、`templates/phaser/shooter/src/shooter-renderer.ts` 或 `tests/contracts/phaser-templates.test.ts`。

已通过验证（本步实际执行）：

    npx vitest run tests/contracts/asset-repair-executor.test.ts
    # 1 个测试文件，5 个测试通过

    npm run test:contracts
    # contracts 8 个测试文件 / 109 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm run qa:asset-semantic:canary -- --limit 3
    # summary 写入 artifacts/asset-semantic-canary/20260612T065850Z
    # runnable=3 skipped=11 experimental=0 passed=3 failed=0

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 rerresolve 直接写真实 `public/assets` 会覆盖非 repair 目标文件；P2 指出 triggered/no executable 未写 no-action audit、缺少 project identity 校验；P3 指出 repaired report 可能同时保留同一 pack 的旧 `selected` 和新 `rejected` candidate。
- 已处理：rerresolve 改用 staging 目录并只 copy repaired SVG；triggered/no executable 写 `repair.status = "no_action"`；写入前校验 project id；过滤被 blacklist pack 的旧 selected candidate；blacklisted candidate 增加 `role` 审计字段。
- Oracle 复审：P0/P1/P2/P3 均无；确认未自动挂入 GenerationPipeline，未触碰禁止范围，Step 6b 可以进入文档更新阶段。
- 审查模式：Oracle 复用。

### 2.19 Asset Semantic Fidelity Step 6a: Asset Repair Planner

完成时间：2026-06-12

已完成内容：

- 新增 `packages/asset-pipeline/src/asset-repair-plan.ts` 和 `asset-repair-plan.types.ts`，导出 `asset-repair-plan-v0.1` 的 `AssetRepairPlan` 类型和 `buildAssetRepairPlan` 纯函数。
- Planner 消费 normalized QA report 最小形状、`AssetManifest` 和必需 `AssetResolutionReport`，合并 manifest `semanticFit`、resolution report expected semantic 和 QA semantic issue。
- 只在 `NEEDS_ASSET_REPAIR`、`asset_semantic_status: "FAILED"`、hard `mismatch`、hard `unknown` 或 hard requirement 缺 `semanticFit` 时触发。
- 只为 hard semantic failed assets 生成 executable `items`；selected local pack 输出 `blacklist_candidate_then_reresolve`，无可 blacklist pack 时输出 `force_template_svg_fallback`。
- 当 QA 顶层状态要求 repair 但 manifest / resolution report 没有 hard semantic evidence 时，输出 `no_action` diagnostic item，供 Step 6b 审计但不得执行修复。
- `fallback_generated`、`PLAYABLE_WITH_FALLBACK_ASSETS`、`PLAYABLE_WITH_ART_WARNINGS`、medium / soft mismatch 或 unknown 不触发 repair，进入 `ignored` 作为审计说明。
- 新增 `tests/contracts/asset-repair-plan.test.ts`，覆盖 hard mismatch、hard unknown、hard missing semanticFit、force template fallback、status-only diagnostic、passing fit status 和 fallback / warning 不触发契约。

阶段结果：

- 解决层级：数据契约 + repair 业务规则。
- 结构变化：新增一个 `packages/asset-pipeline` 纯 planner 文件、一个类型文件、一个 contract 测试文件，并通过 `packages/asset-pipeline/src/index.ts` 导出最小 API。
- 行为边界：未修改 resolver ranking、hard semantic gate、fallback 策略、manifest `semanticFit` 生成、QA 聚合、Workbench UI、Phaser runtime、repair executor、资源库、taxonomy、AI image provider 或 provider `survive_duration`。
- 本步只返回结构化对象，暂不落盘 `asset_repair_plan.json`。
- shooter HUD stash 不属于本步 scope；本步没有修改 `templates/phaser/shooter/src/GameScene.ts`、`templates/phaser/shooter/src/shooter-renderer.ts` 或 `tests/contracts/phaser-templates.test.ts`。

已通过验证（本步实际执行）：

    npx vitest run tests/contracts/asset-repair-plan.test.ts
    # 1 个测试文件，6 个测试通过

    npm run test:contracts
    # contracts 7 个测试文件 / 104 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm run qa:asset-semantic:canary -- --limit 3
    # summary 写入 artifacts/asset-semantic-canary/20260612T062028Z
    # runnable=3 skipped=11 experimental=0 passed=3 failed=0

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 `resolutionReport` optional 会让 hard requirement 缺 `semanticFit` 的证据静默缺失；P2 指出 status-only 触发可能 `triggered: true` 但 `items: []`、plan item 缺少语义证据字段、测试边界不足；P3 指出 `no_action` 若不用应移除或补语义。
- 已处理：`resolutionReport` 改为必需输入；plan item 增加 `actualTags`、`missingTags`、`conflictingTags`、`selectedPath` 和 `semanticFitReason`；status-only repair signal 输出 `no_action` diagnostic item；新增 hard unknown、force fallback、passing fit status、medium unknown 和 status-only diagnostic 契约测试。
- Oracle 复审：P0/P1/P2/P3 均无；确认首轮 P1/P2/P3 已处理，Step 6a 仍保持只生成 planner 的边界，没有文件写入、blacklist 执行、重新 resolve、QA 聚合、Workbench、Phaser runtime、schema 或 provider 越界改动。
- 审查模式：Oracle 复用。

### 2.18 Asset Semantic Fidelity Step 5.5b: Canary batch runner + summary report

完成时间：2026-06-12

已完成内容：

- 新增 `scripts/run-asset-semantic-canary.ts`，读取 `tests/fixtures/asset-semantic-canary.briefs.json`，用 deterministic local provider 调用现有生成 / 编译 / QA 流程。
- 新增 `scripts/asset-semantic-canary-report.ts`，集中处理 fixture parse、默认 supported case selection、`expectedUnsupported` skip、`--include-unsupported` experimental、failure threshold 和 summary 渲染。
- 新增 package script `npm run qa:asset-semantic:canary`。
- CLI 支持 `--include-unsupported`、`--case <id>`、`--limit <n>`、`--fixture`、`--output-root`、`--timestamp` 和 `--allow-network`。
- 默认给 generated project 的 `npm install` 增加 `--offline`，避免默认 canary 依赖外部网络；需要网络时必须显式 `--allow-network`。
- summary 写出 `artifacts/asset-semantic-canary/<timestamp>/summary.json` 和 `summary.md`，包含 overall/runtime/asset semantic status、fallback_generated、mismatch、unknown、warning、placeholder、required missing、asset load failure、selected packs、manifest path、asset_resolution_report path 和 QA report path。
- 新增 `tests/contracts/asset-semantic-canary-runner.test.ts`，只测 aggregation / parsing / threshold，不把真实 batch generation 放进 `npm test` 的昂贵路径。
- `artifacts/` 加入 `.gitignore`，避免本地 canary summary 进入版本控制；根 `tsconfig.json` 纳入 `scripts/**/*.ts`，让 CLI 接受 root typecheck。

阶段结果：

- 解决层级：canary 工具配置 + runner 边界适配 + summary 业务阈值聚合。
- 结构变化：新增两个 `scripts/asset-semantic-canary*` 文件和一个 contract 测试；更新 package script、root devDependency / lockfile、root typecheck include、`.gitignore` 和 refactor 文档。
- 行为边界：未修改 resolver ranking、hard semantic gate、fallback 策略、manifest semanticFit 生成逻辑、QA status 聚合规则、Workbench UI、Phaser runtime、asset repair loop、新资源库、AI image provider、taxonomy expansion 或 provider `survive_duration`。
- 当前工作区既有 shooter HUD 脏文件不属于本步 scope；本步没有修改 `templates/phaser/shooter/src/GameScene.ts`、`templates/phaser/shooter/src/shooter-renderer.ts` 或 `tests/contracts/phaser-templates.test.ts`。
- `fallback_generated`、`PLAYABLE_WITH_FALLBACK_ASSETS` 和 `PLAYABLE_WITH_ART_WARNINGS` 不算失败；medium warning 只统计不阻断；hard mismatch / hard unknown / required missing / asset load failure / 未允许 placeholder 会失败。
- `expectedUnsupported: true` 默认 skipped，不算失败；`--include-unsupported` 仅用于实验性运行，并标记为 `experimental`。
- Step 6 repair loop 仍未实现；Step 5.5b summary 只作为后续 repair loop 范围判断依据。

已通过验证（本步实际执行）：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts
    # 1 个测试文件，5 个测试通过

    npx vitest run tests/contracts/asset-semantic-canary-runner.test.ts
    # 1 个测试文件，9 个测试通过

    npm run typecheck:root
    # 根 TypeScript 检查通过，覆盖 scripts/**/*.ts

    npm run qa:asset-semantic:canary -- --limit 3
    # summary 写入 artifacts/asset-semantic-canary/20260612T053854Z
    # runnable=3 skipped=11 experimental=0 passed=3 failed=0

    npm test
    # contracts 6 个测试文件 / 99 个测试通过；workspace 12 个测试文件 / 114 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出根脚本使用 `tsx` 但 root `package.json` 未声明 devDependency；P2 指出 `--case` 拼错时会 0 case 假绿；P3 指出 `mediumWarnings` 实际统计所有 warning，字段语义容易误导。
- 已处理：root `devDependencies` 和 lockfile 显式声明 `tsx`；`selectAssetSemanticCanaryBriefs` 对未知 case id 抛错并补测试；warning 统计拆为 per-case all warnings 和 summary medium warnings，并补 soft warning 不进入 medium aggregate 的测试。
- Oracle 代码复审：P0/P1/P2 无；P3 指出文档中 contracts 测试数仍为 98，已修正为 99。
- Oracle 文档复审：P0/P1/P2/P3 均无；确认三份文档准确记录 Step 5.5b 已完成、Step 6 为当前下一步，未声称 repair loop、resolver / QA / Workbench / Phaser runtime / fallback、taxonomy expansion、新资源库或 AI image provider 已变更。
- 审查模式：Oracle 复用。

### 2.17 Asset Semantic Fidelity Step 5.5a: Canary brief fixture v0.1

完成时间：2026-06-12

已完成内容：

- 新增 `tests/fixtures/asset-semantic-canary.briefs.json`，作为 Step 5.5b canary batch runner 的第一批输入 fixture。
- fixture 包含 14 条 brief，覆盖 `cat`、`alien`、`tank`、`space`、`fishbone` 和 generic shooter。
- 每条 brief 写出 semantic expectations：`disallowOverall`、runtime / asset failure 是否允许、optional `allowedOverall`、per-role `expectedCore`、optional `preferredPack` 和 notes。
- 对当前 taxonomy 尚未确认支持的 wording / concept 显式标记 `expectedUnsupported: true`，包括 `fishbone` projectile、`异星人`、`星空`、`装甲车`。
- 新增 `tests/contracts/asset-semantic-canary-fixture.test.ts`，只做 fixture parse / validation：JSON parse、id 唯一、brief 非空、expect 契约、concept baseline、strictness、forbidden expansion concepts、preferredPack pack id 和当前 taxonomy core inference。

阶段结果：

- 解决层级：测试 fixture 数据契约。
- 结构变化：新增 `tests/fixtures/asset-semantic-canary.briefs.json` 和 `tests/contracts/asset-semantic-canary-fixture.test.ts`。
- 行为边界：未修改 resolver ranking、hard gate、fallback 策略、manifest semanticFit、QA status 聚合、Workbench UI、Phaser runtime、asset repair loop、AI image provider、新资源库或 provider survive_duration。
- 本步不实现 canary runner，不批量生成真实游戏；Step 5.5b 才实现 runner 和 summary report。
- dog / rabbit / robot / bird / slime / asteroid 等扩展概念未进入 v0.1 fixture。
- Step 5.5b runner 应把 `expectedUnsupported: true` 作为 skip / expected-unsupported report 维度，不按普通 canary failure 聚合。

已通过验证（本步实际执行）：

    npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts
    # 红灯：fixture 文件不存在；转绿后 1 个测试文件，5 个测试通过

    npm test
    # contracts 5 个测试文件 / 90 个测试通过；workspace 12 个测试文件 / 114 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0/P1/P2 无；P3 建议补 `preferredPack.roles` 真实覆盖校验、`allowedOverall` / `disallowOverall` 互斥校验，并明确 Step 5.5b runner 如何处理 `expectedUnsupported`。
- 已处理：fixture validation test 现在校验 preferred pack role coverage 和 overall allow/disallow disjoint；文档明确 Step 5.5b runner 应把 `expectedUnsupported: true` 作为 skip / expected-unsupported report 维度，不按普通 canary failure 聚合。
- 复验通过：`npx vitest run tests/contracts/asset-semantic-canary-fixture.test.ts`、`npm run typecheck`、`npm test`、`git diff --check`。
- 文档复审：Oracle 复审 P0/P1/P2/P3 均无；确认三份文档未声称已实现 runner、batch report、真实批量生成、repair loop 或产品行为变化，Step 5.5b / Step 6 顺序一致，`expectedUnsupported` 和 provider survive_duration out of scope 表述准确。
- 审查模式：Oracle 复用。

### 2.16 Asset Semantic Fidelity Step 5: QA + Workbench semantic status

完成时间：2026-06-12

已完成内容：

- `QaReport` 新增 `runtime_status`、`asset_semantic_status`、`overall_status`，保留既有 `status` 作为 runtime QA pass/fail 结果。
- `QaAssetReport` 新增 `semantic_status`、per-asset `assets[].semantic_fit` 摘要和 `semantic_issues`，由 `asset-semantic-qa.ts` 从 manifest `semanticFit` 派生。
- `fallback_generated` 归类为 semantic passed；hard `mismatch/unknown` 归类为 failed；medium/soft `mismatch/unknown` 归类为 warning；缺少 optional `semanticFit` 按旧 manifest 兼容为 passed。
- `qa-asset-report.ts` 集中组装 asset report 和 overall status：runtime failed 优先返回 `QA_FAILED`，semantic failed 返回 `NEEDS_ASSET_REPAIR`，semantic warning 返回 `PLAYABLE_WITH_ART_WARNINGS`，语义 fallback 返回 `PLAYABLE_WITH_FALLBACK_ASSETS`。
- `ProjectsService.getQaReport()` 在读取旧磁盘 QA report 时通过 `normalizePersistedQaReport()` 补齐新字段，避免历史 report 缺字段破坏 API 契约。
- Workbench header 优先展示 `qaReport.overall_status`；`QaStatusPanel` 展示 Overall / Runtime / Asset semantic 三类状态；`AssetStatusPanel` 展示 semantic issue 数量、issue 列表和每个 asset 的 semanticFit 摘要。
- 测试覆盖 hard semantic mismatch 的 `NEEDS_ASSET_REPAIR`、`fallback_generated` 的 fallback playable、medium mismatch warning、旧 QA report normalize，以及 pipeline 仍按 runtime `status: "PASSED"` 写入 `PLAYABLE`。

阶段结果：

- 解决层级：QA 数据契约 + Workbench 状态建模 / 展示。
- 结构变化：新增 `asset-semantic-qa.ts`、`qa-asset-report.ts`、`qa-report-normalizer.ts`、`workbench-status.ts`、`QaStatusPanel.tsx`、`AssetSemanticList.tsx` 和 `workbench-semantic-status.test.ts`。
- 行为边界：未修改 resolver ranking、hard gate、fallback 策略、manifest semanticFit 生成、Phaser runtime、asset repair loop、AI image provider 或 provider survive_duration。
- runtime QA 与 asset semantic QA 保持独立：semantic failed 不把 `QaReport.status` 改成 `QA_FAILED`，由 `overall_status` 表达 asset repair 需求。
- 文件规模：`playwright-qa-runner.service.ts` 由 232 行降至 142 行；新增 QA / Workbench helper 文件均低于 220 行；`App.tsx` 仍超过 220 行但本步只减少 QA 面板职责并保持主组合层边界。
- 未改范围：尚未实现 asset repair loop；未做新资源库、AI image provider 或真实修复闭环。

已通过验证（本步实际执行）：

    npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/workspace/workbench-semantic-status.test.ts
    # 红灯后转绿：2 个测试文件，34 个测试通过

    npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/workspace/workbench-semantic-status.test.ts tests/workspace/generation-pipeline.service.test.ts
    # 3 个测试文件，41 个测试通过

    npx vitest run tests/workspace/projects-service.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/workbench-semantic-status.test.ts
    # Oracle 反馈修复后，3 个测试文件，17 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm exec --workspace @ai-game-maker/maker-workbench -- vite build
    # Workbench production build 通过

    npm test
    # contracts 84 个测试通过，workspace 114 个测试通过

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0/P1 无；P2 指出历史磁盘 QA report 缺少新必填字段时 API 类型兼容风险；P3 指出旧 report 在 QA 面板 overall tone 上可能显示 neutral，并建议补 pipeline 边界测试。
- 已处理：新增 `normalizePersistedQaReport()` 并接入 `ProjectsService.getQaReport()`；`QaStatusPanel` 改用 `getWorkbenchStatusTone(overallStatus)`；补充 pipeline 回归测试。
- Oracle 复审：P0/P1/P2 无；P3 残留为旧 report runtime 行颜色可 polish。
- 复审后处理：已进一步改为用推导后的 runtime / semantic label 计算 tone，并通过 `npm run typecheck`、Workbench build 和相关测试。
- 审查模式：Oracle 复用

### 2.15 Asset Semantic Fidelity Step 4: Manifest semanticFit + resolution report

完成时间：2026-06-12

已完成内容：

- `AssetManifestAssetSchema` 新增 optional `semanticFit`，字段包含 status、confidence、strictness、expected concept/tags、actual/missing/conflicting tags 和 reason。
- 新增 `resolution-report.ts`，定义 `asset-resolution-report-v0.1` schema，并集中计算 template fallback、local asset fit、hard semantic rejection 和 final report assets / candidates。
- `writeAssetArtifacts` 继续沿用既有 selection / fallback 结果，只在 manifest assets 上挂 `semanticFit`，并额外写出 project 根目录 `asset_resolution_report.json`。
- `resolveLocalAssetPack` 只增加 diagnostics：记录 selected、style mismatch、incomplete pack、hard semantic mismatch candidates；保留 `selectLocalAssetPack` 兼容 API。
- report 能解释 cat/alien shooter 为什么 fallback 到 template SVG、`kenney-tiny-shooter-tanks` 的 player/enemy 为什么 hard mismatch、tank/tank shooter 为什么 selected local pack，以及 style / incomplete pack 为什么未选中。

阶段结果：

- 解决层级：manifest 数据契约 + asset resolution 诊断产物。
- 结构变化：新增 `packages/asset-pipeline/src/resolution-report.ts`；`schemas.ts`、`local-asset-pack-provider.ts`、`writer.ts`、`index.ts` 同步类型和写出路径；合同测试与 compiler 测试补充 report 断言。
- 行为边界：未修改 resolver ranking / final selection / fallback 策略；未改变 Step 3 hard gate；未修改 QA overall status、Workbench PLAYABLE、Phaser runtime 或 provider。
- 文件规模：`schemas.ts`、`resolution-report.ts` 均为 220 行，`local-asset-pack-provider.ts` 为 213 行，仍保持职责集中。
- 未改范围：尚未实现 QA semantic status、Workbench semantic display、repair loop、medium/soft blocking、AI image provider 或新资源库接入。

已通过验证：

    npx vitest run tests/contracts/asset-pipeline.test.ts
    # 实现前红灯：cat/alien fallback 与 tank/tank selected 两个测试均失败在 semanticFit undefined；P3 诊断测试失败在 style/incomplete candidate 缺字段

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts
    # 2 个测试文件，28 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npx vitest run tests/workspace/playwright-qa-runner.test.ts
    # 1 个测试文件，28 个测试全部通过，证明 QA overall status 边界未改变

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0/P1/P2 无；P3 指出 `incomplete_pack` / `style_mismatch` candidate 解释粒度偏粗。
- 已处理：为 candidate schema 增加 `expectedStyle`、`actualStyle`、`missingAssets`，并增加合同测试覆盖 style mismatch 和 incomplete pack diagnostics。
- Oracle 复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 新建 + 复用

### 2.14 Asset Semantic Fidelity Step 3: Resolver semantic hard gate

完成时间：2026-06-12

已完成内容：

- `selectCompletePackAssets` 新增 hard-only semantic gate：local pack 仍先按 `id` / `role` / `format` 完整覆盖；若 plan item `semantic.strictness === "hard"`，pack asset 必须有 asset-level semantic metadata。
- hard gate 要求 asset `subjectTags` 命中 plan `expectedAnyTags`，并要求 asset `subjectTags/themeTags` 不命中 plan `forbiddenTags`，asset `forbiddenTags` 不命中 plan `expectedAnyTags`。
- `semantic.strictness !== "hard"` 直接放过，不阻断 medium / soft constraint。
- hard mismatch 的 complete local pack 返回 `undefined`，由 `writeAssetArtifacts` 保持既有 `template_svg` fallback；未新增新的 fallback 分支。
- 合同测试覆盖默认 cat/alien shooter 回退 `template_svg`、tank/tank shooter 仍选择 `kenney-tiny-shooter-tanks`、medium / soft constraint 不阻断 local pack selection。
- `compiler-service.test.ts` 同步把保留 tank pack wiring 断言的 stale-file 清理测试改用 tank shooter fixture，避免默认 cat/alien shooter 的新 fallback 契约和旧断言冲突。

阶段结果：

- 解决层级：resolver 业务规则。
- 结构变化：`local-asset-pack-provider.ts` 从 138 行增至 167 行；`tests/contracts/asset-pipeline.test.ts` 增至 558 行；`tests/workspace/compiler-service.test.ts` 仅补 tank shooter fixture。
- 行为边界：未修改 manifest schema / writer、QA、Workbench、Phaser runtime 或 provider；未写 manifest `semanticFit`，未写 `asset_resolution_report.json`，未改变 QA / Workbench PLAYABLE 判定。
- 未改范围：尚未实现 manifest semantic fit、asset resolution report、QA semantic status、Workbench semantic display 或 repair loop。

已通过验证：

    npx vitest run tests/contracts/asset-pipeline.test.ts
    # 实现前红灯：默认 cat/alien shooter 仍选中 kenney-tiny-shooter-tanks；实现后 18 个测试通过

    npx vitest run tests/workspace/compiler-service.test.ts
    # 修复同步前红灯：旧测试仍期待默认 shooter 选 tank pack；同步后通过

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts
    # 2 个测试文件，27 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check -- packages/asset-pipeline/src/local-asset-pack-provider.ts tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md docs/refactor-log/ai-game-dsl-p0-step-index.md docs/refactor-log/ai-game-dsl-p0-review-gated.md
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 `tests/workspace/compiler-service.test.ts` 仍使用默认 cat/alien shooter 并断言 `kenney-tiny-shooter-tanks`，会和新 hard gate 契约冲突；P2 建议文档同步；P3 无。
- 已处理：先复现 compiler test 红灯；将该 stale-file 清理测试的 shooter fixture 改成 tank shooter，保留 tank pack wiring 断言，同时由 contract test 保留默认 cat/alien fallback 契约。
- Oracle 复审：P0/P1/P2/P3 均无。
- 文档复审：Oracle 指出 plan 顶部仍把 cat/alien 选中 tank pack 写成“当前系统”问题、Step 3 表格使用 `gate before priority / score` 容易误导；已改为 “Step 3 前的典型案例” 和 `complete-pack selection hard gate`，复审 P0/P1/P2/P3 均无。
- 审查模式：Oracle 新建 + 复用

### 2.13 Asset Semantic Fidelity Step 2: Local pack metadata profile

完成时间：2026-06-12

已完成内容：

- 新增 `packages/asset-pipeline/src/local-asset-pack.schema.ts`，把 local pack schema 从 provider 文件拆出，并新增 `AssetPackProfileSchema`、asset-level `semantic` metadata schema 和 `indexLocalAssetPackMetadata`。
- `LocalAssetPackSchema` 支持 pack-level `profile`，字段包含 `version`、`packId`、`taxonomyVersion`、`priority`、`primaryGenre`、`primaryTheme`、`styleTags`、`camera`、`subjectCoverageByRole`、`incompatibleConcepts` 和 `notes`。
- `PackAssetSchema` 支持 optional `semantic.subjectTags/themeTags/forbiddenTags`。
- `LocalAssetPackSchema.superRefine` 新增 metadata lint：profile `packId` 必须匹配 pack id；profile `priority` 必须匹配 pack priority；asset id 不允许重复；`profile.subjectCoverageByRole` 与 asset-level `semantic.subjectTags` 必须双向一致。
- `kenney-tiny-shooter-tanks` 增加明确的 tank/battlefield/top_down shooter profile：player/enemy 暴露 `tank` / `vehicle` / `turret`，background 暴露 `battlefield` / `road` / `grassland`，projectile 只暴露 `projectile` / `shell`，`tank` 只作为 projectile theme tag。
- `local-asset-pack-provider.ts` 只改为导入 schema 和 metadata index；`selectCompletePackAssets` 仍只按 `id` / `role` / `format` 判断完整覆盖，不读取 semantic score，不过滤，不改变 fallback。
- `tests/contracts/asset-pipeline.test.ts` 增加 pack profile/index 断言、非法 metadata lint 断言，并保留现有 shooter selection 结果仍为 `kenney-tiny-shooter-tanks`。

阶段结果：

- 解决层级：local asset pack 数据契约 + metadata lint。
- 结构变化：`local-asset-pack-provider.ts` 从 189 行降到 138 行；新增 `local-asset-pack.schema.ts` 为 199 行；`schemas.ts` 保持 210 行；既有合同测试文件集中保留并扩展到 506 行。
- 行为边界：未修改 resolver ranking / selection / fallback 行为；未启用 semantic hard gate；未修改 `AssetManifestAssetSchema`、QA、Workbench 或 Phaser runtime。
- 未改范围：尚未实现 resolver hard gate、manifest `semanticFit`、`asset_resolution_report.json`、QA semantic status 或 Workbench semantic display。
- 注意：当前工作区仍有 Step 1 基线改动和 provider `survive_duration` 修复改动；本步没有触碰 provider 修复文件。

已通过验证：

    npx vitest run tests/contracts/asset-pipeline.test.ts
    # 1 个测试文件，16 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check -- packages/asset-pipeline/src/local-asset-pack.schema.ts packages/asset-pipeline/src/local-asset-pack-provider.ts packages/asset-pipeline/src/schemas.ts packages/asset-pipeline/src/index.ts assets/asset-packs/kenney-tiny-shooter-tanks/pack.json tests/contracts/asset-pipeline.test.ts docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md docs/refactor-log/ai-game-dsl-p0-step-index.md docs/refactor-log/ai-game-dsl-p0-review-gated.md
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 Step 1 既有未提交基线容易被误判为本步越界；P2 指出 metadata index 依赖 asset id 唯一，且 hard gate 前需要校验 pack-level coverage 与 asset-level tags 一致；P3 建议测试名可更宽。
- 已处理：向 Oracle 明确 Step 1 是本轮既有基线；补充 duplicate asset id lint；补充 `subjectCoverageByRole` 与 asset-level `subjectTags` 双向一致性校验；补对应负例测试。
- Oracle 复审：P0/P1/P2 均无；P3 仅保留测试名可更宽的轻微建议，不阻塞 Step 2。
- 审查模式：Oracle 复用

### 2.12 Asset Semantic Fidelity Step 1: Taxonomy and AssetPlan semantic constraint

完成时间：2026-06-11

已完成内容：

- `AssetPlanItemSchema` 新增 optional `semantic` 字段，字段包含 `expectedConcept`、`expectedAnyTags`、`forbiddenTags` 和 `strictness`。
- 新增 `packages/asset-pipeline/src/taxonomy.ts`，最小覆盖 `cat`、`alien`、`tank`、`space`、`battlefield` canonical tags 和中英文同义词。
- `buildAssetPlanFromIr` 在生成 plan item 时写入 semantic hints；player/enemy 明确核心实体为 hard，background 主题为 medium，非核心和泛化角色保持 soft。
- background semantic 会读取 `template_params.params.world.visual_theme` 作为 style hint。
- 合同测试覆盖 cat/alien hard、tank hard、`caterpillar` / `tankard` 英文子串负例、非核心 projectile 含 tank 仍 soft、space background medium。

阶段结果：

- 解决层级：AssetPlan 数据契约 + taxonomy 纯规则。
- 行为边界：未修改 `selectLocalAssetPack`、manifest、QA、Workbench 或 Phaser runtime；当前 resolver 仍不消费 `semantic`。
- 未改范围：尚未给 local asset pack 补 subject/theme metadata；尚未实现 semantic hard gate、manifest `semanticFit` 或 QA semantic status。

已通过验证：

    npx vitest run tests/contracts/asset-pipeline.test.ts
    # 1 个测试文件，14 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check -- packages/asset-pipeline/src/schemas.ts packages/asset-pipeline/src/plan.ts packages/asset-pipeline/src/taxonomy.ts packages/asset-pipeline/src/index.ts tests/contracts/asset-pipeline.test.ts
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0/P1 无；P2 指出非 background 角色统一套 core hard rules 会让 projectile/collectible/hazard 误变 hard；P2 指出英文 `includes` 会让 `caterpillar` / `tankard` 误命中；P3 建议 `expectedConcept` 复用 tag schema，并把 `world.visual_theme` 传给 background。
- 已修复：core hard rules 仅限 `player_character` / `enemy`；英文 concept/alias 改为 token matching；非核心角色保持 soft；`expectedConcept` 复用 `SemanticTagSchema`；background 读取 style theme；补充负例与背景测试。
- Oracle 复审：P0/P1/P2/P3 均无，Step 1 可通过代码审查门禁。
- 审查模式：Oracle 复用

### 2.11 Asset Semantic Fidelity Step 0: requirement split and execution plan

完成时间：2026-06-11

已完成内容：

- 读取 `AGM_Asset_Semantic_Fidelity_Markdown_Folder.zip`，确认核心问题是资源加载成功但语义错配，而不是 `ASSET_LOAD_FAILED`。
- 新增 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`，把方案拆成 Step 0 到 Step 7：taxonomy、pack metadata、resolver hard gate、manifest semanticFit、QA/Workbench、repair loop、回归验收。
- 更新 `docs/refactor-log/ai-game-dsl-p0-step-index.md`，把当前下一步切到 Asset Semantic Fidelity Step 1。

阶段结果：

- 解决层级：文档规则 + 后续数据契约执行计划。
- 行为边界：未修改 asset resolver、manifest schema、QA、Workbench 或 Phaser runtime。
- 未改范围：尚未实现 taxonomy、semantic hard gate、manifest semanticFit 或 Workbench semantic display。
- 注意：当前工作区另有未提交 provider 修复改动，属于 shooter `survive_duration` 归一化；本步文档没有触碰这些文件。

已通过验证：

    unzip -l /Users/dahufa/Documents/workspace/AGM_Asset_Semantic_Fidelity_Markdown_Folder.zip
    rg -n "Asset Semantic|semantic|asset|DSL|QA|Workbench|P0|Step" /Users/dahufa/.codex/memories/MEMORY.md
    rg -n "AssetPlan|AssetManifest|semantic|fallback|priority|selectCompletePackAssets|asset_report" packages/asset-pipeline/src apps/maker-api/src/qa apps/maker-workbench/src docs/refactor-log -g "*.ts" -g "*.tsx" -g "*.md"
    git diff --check -- docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md docs/refactor-log/ai-game-dsl-p0-step-index.md docs/refactor-log/ai-game-dsl-p0-review-gated.md

审查门禁结论：

- Oracle 首轮审查：P0/P1 无；P2 指出 `step-index` 顶部完成状态仍停在 Asset Pipeline Step 4.1，和后文 Step 5.1 完成记录不一致；P3 建议补充 scoped `git diff --check` 验证记录。
- 已修复：顶部完成状态改为 Asset Pipeline P0 Step 1-5（含 Step 5.1），并补充 scoped `git diff --check` 验证命令。
- 审查模式：Oracle 新建

### 2.10 Asset Pipeline P0 Step 5.1: tiny local asset pack slice

完成时间：2026-06-11

已完成内容：

- 新增 `assets/asset-packs/agm-tiny-collector`，只包含 collector 最小闭环资源：`background_main.svg`、`player.svg`、`collectible.svg` 和 `pack.json` license/style 元数据。
- `writeAssetArtifacts` 优先选择完整覆盖当前 `AssetPlan` 的 local asset pack；若没有完整覆盖，则整体回退到 `template_svg`，避免同一玩法半套资源混搭。
- `AssetManifestAsset` 增加 `sourcePack`、`licenseId`、`licenseName`、`attribution`、`sourceUrl`；当 `source === "local_asset_pack"` 时这些字段必须存在。
- collector template 新增 manifest-driven art runtime，`preload()` 加载 `asset-manifest.generated.json`，首帧优先渲染 manifest image，并通过 `__GAME_TELEMETRY__.assets` 暴露 required / loaded / failed。
- QA runtime asset gate 扩展到 collector：collector 缺 runtime asset telemetry 或 required asset 未 loaded 时不能 PASS。
- QA report 聚合 `asset_report.sources`，Workbench Assets 面板展示 source pack、license 和 attribution。
- 真实 Maker stack 生成 `proj_20260611_064732_c31d` / `run_20260611_064732_c31d`，状态 `PLAYABLE`，QA report 显示 collector runtime assets `background_main/player/collectible` 全部 loaded。
- Workbench 桌面和移动端均展示 `agm-tiny-collector`、`CC0-1.0` 和 `Creative Commons CC0 1.0 Universal`，无水平溢出。

阶段结果：

- 解决层级：asset selection 数据契约 + generated project 边界适配 + collector runtime asset loading + Workbench 展示。
- DSL-first 边界：未新增 Raw DSL asset path / URL / base64 字段；资源选择仍从 trusted IR 派生的 `AssetPlan` 进入系统侧 provider。
- 未改范围：没有全量导入 Kenney / itch.io / OpenGameArt；dodger/shooter 暂不使用这个 tiny pack，仍按现有资源路径运行。

已通过验证：

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 4 个测试文件，67 个测试全部通过

    npm run typecheck --workspace @ai-game-maker/maker-workbench
    npm run typecheck --workspace @ai-game-maker/maker-api
    npm run typecheck:root
    # 三段类型检查通过

    Real Maker stack:
    # POST /api/projects/generate -> proj_20260611_064732_c31d / run_20260611_064732_c31d / PLAYABLE
    # QA visual_status=PASSED, asset_report.runtime.loaded=[background_main, player, collectible]
    # Workbench screenshots: /tmp/agm-tiny-pack-workbench/workbench-desktop.png, /tmp/agm-tiny-pack-workbench/workbench-mobile.png

审查门禁结论：

- Oracle 只读审查指出：collector 必须实际 preload/render manifest 资源、local asset license 不能 optional 丢失、QA/Workbench 需要展示 source pack/license。
- 已修复：collector runtime manifest preload/render、collector QA runtime asset gate、`local_asset_pack` license 必填、Workbench source pack/license 展示、缺 local pack 整体回退测试。

### 2.9 Asset Pipeline P0 Step 4.1: Workbench asset status panel

完成时间：2026-06-11

已完成内容：

- `workbench-api.ts` 为 Workbench 侧 `QaReport` 补齐 `asset_report?: QaAssetReport` 类型，字段对齐 maker-api QA report 合同。
- 新增 `AssetStatusPanel` 纯展示组件，展示 `required`、`ready`、`loaded`、`failed`、`placeholder`、`missing` 指标。
- Assets 面板展示 required asset ids、runtime loaded asset ids，以及 `asset_report.failures[].code/message/asset_ids/roles`。
- `App.tsx` 只挂载 `<AssetStatusPanel report={data.qaReport?.asset_report} />`，未继续堆叠资产 JSX 或新增数据请求。

阶段结果：

- 解决层级：Workbench 数据契约消费 + React 组件职责拆分。
- 行为边界：未修改 API 返回结构、QA 生成、DSL、compiler、asset pipeline 或 Phaser template。
- UI 铺路结果：Workbench 不需要解析 QA failure message 即可展示 asset failure reason。
- 未改范围：尚未用真实新生成 run 做 Workbench 桌面 / 移动端视觉验收；尚未展示 license / attribution；collector / shooter runtime asset telemetry 仍待后续分步接入。

已通过验证：

    npm run typecheck --workspace @ai-game-maker/maker-workbench
    # maker-workbench 类型检查通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm exec --workspace @ai-game-maker/maker-workbench -- vite build
    # Vite production build 通过

    git diff --check
    # 无输出

    Workbench Playwright smoke: http://127.0.0.1:5174/
    # 无数据状态：Manifest Status=1、No asset report=1、console errors=[]
    # mocked QA asset_report：Blocked=1、ASSET_LOAD_FAILED=2、enemy.hazard=2、failure reason=1、console errors=[]

审查门禁结论：

- Oracle 代码审查：P0/P1/P2 均无；P3 建议补 Workbench production build。
- 已补验证：`npm exec --workspace @ai-game-maker/maker-workbench -- vite build` 通过。
- 审查模式：Oracle 新建

下一步建议：

- Asset Pipeline P0 Step 4.2：启动真实 Maker stack，生成或加载一个包含 `asset_report` 的 run，在 Workbench 桌面 / 移动端验证 Assets 面板与 QA/Telemetry/Preview 区域布局不互相挤压。

### 2.8 Asset Pipeline P0 Step 3: QA asset report enrichment

完成时间：2026-06-11

已完成内容：

- `QaReport` 新增 `asset_report`，保留既有 `asset_manifest_summary` 兼容字段。
- `asset_report` 汇总 manifest 派生的 `required`、`ready`、`fallback_used`、`placeholder_used`、`missing`、runtime asset telemetry 和结构化 `failures`。
- `runPlaywrightQaBrowser` 将 `__GAME_TELEMETRY__.assets` 规范化为 snake_case `asset_runtime`，并在 `ASSET_LOAD_FAILED` 分支带出 runtime telemetry。
- `validateGeneratedProjectAssets` 的可定位失败带出 `assetId` 和 `role`，QA service 将其写入 `asset_report.failures[].asset_ids/roles`。
- `PlaywrightQaRunnerService` 对 dodger alternate runner 增加 service-level guard：当 browser runner 报告通过但缺少 runtime asset telemetry 时，report 以 `ASSET_LOAD_FAILED` 失败。
- 测试覆盖 passed report 的 asset 明细、manifest 缺失、preview asset missing、core placeholder、runtime required not loaded、runtime missing asset、missing required role 和 alternate runner 缺 runtime telemetry。

阶段结果：

- 解决层级：QA report 数据契约 + browser runner 边界适配 + asset validator failure metadata。
- Workbench 铺路结果：后续 UI 可直接读取 `asset_report.manifest_summary`、`asset_report.runtime` 和 `asset_report.failures`，不需要解析 message。
- DSL-first 边界：未新增 Raw DSL asset path / URL / base64 字段；未改资源 provider；未改 Phaser 模板；未接 Workbench UI。
- 未改范围：Workbench Assets 面板仍未接入；QA report 还未展示 license / attribution 细节；collector / shooter runtime asset telemetry 仍待后续分步接入。

已通过验证：

    npx vitest run tests/workspace/playwright-qa-runner.test.ts
    # 1 个测试文件，26 个测试全部通过

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts && npm run typecheck
    # 4 个测试文件，63 个测试全部通过；root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # 11 个测试文件，104 个测试全部通过

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 `asset_report.fallback_used` 把 `source=template_svg` 误判为 fallback，与 manifest `summary.fallback_used` 语义不一致；P2 指出 asset gate failure 缺结构化 asset id / role；P2 指出 injected browser runner 缺 runtime asset telemetry 时 service 层可能误判 PASSED；P3 建议文档沉淀。
- 已修复：`asset_report.fallback_used` 改为只按 `status === "fallback_used"`；validator 可定位失败返回 `assetId` / `role`；QA service 写入结构化 failure ids / roles；dodger alternate runner 缺 `asset_runtime` 时 service 层返回 `ASSET_LOAD_FAILED`；补 preview `ASSET_MISSING`、core placeholder 和缺 runtime telemetry 测试。
- Oracle 复审：P0/P1/P2/P3 均无，Step 3 代码门禁通过。
- 审查模式：Oracle 新建

下一步建议：

- Asset Pipeline P0 Step 4：Workbench asset status panel，优先消费 `asset_report`，避免前端解析 QA failure message。

### 2.7 Asset Pipeline P0 Step 2: dodger manifest preload / runtime asset gate

完成时间：2026-06-11

已完成内容：

- `AssetManifestAssetSchema` 新增 `loadKey`，收紧为 `agm.<asset_id>`，并校验重复 `loadKey` 与 id 不一致。
- `writeAssetArtifacts` 为 manifest assets 写入稳定 `loadKey`，继续保持 path 限制为 `assets/<id>.svg`。
- `TemplateCompilerService` 为 dodger 生成项目写入 `dodger/src/asset-manifest.generated.json`，内容来自 Asset Pipeline 生成的 manifest。
- dodger template 新增 manifest-driven art runtime：`preload()` 使用 manifest `loadKey` 和 manifest `path` 加载 SVG，主渲染对象优先通过 manifest `loadKey` 创建 image；graphics 仅作为缺纹理时的降级绘制和粒子效果。
- `exposeRuntime` 支持暴露 telemetry extras；dodger runtime 在 `__GAME_TELEMETRY__.assets` 暴露 `manifestLoaded`、`required`、`loaded`、`failed`、`fallbackUsed`、`placeholderUsed`、`missing` 和 `missingRequiredRoles`。
- Playwright QA 在 dodger 交互 QA 前读取 runtime asset telemetry，要求 manifest loaded、required 非空、required 全部 loaded，且 `failed`、`missing`、`missingRequiredRoles` 不包含阻塞项；失败码使用 `ASSET_LOAD_FAILED`。
- 测试覆盖 manifest `loadKey` 合同、compiler 生成 `asset-manifest.generated.json`、dodger template manifest preload、runtime asset loaded gate、missing asset、缺 required role，以及 collectible 资源非必需时不生成/不加载。

阶段结果：

- 解决层级：数据契约 + compiler 生成边界 + Phaser runtime 解释 + Playwright QA runtime 门禁。
- DSL-first 边界：模型仍不输出 asset path / URL / base64；资源 manifest 继续由 IR 派生并由 compiler 写入生成项目。
- 本步先只接入 dodger，以验证 manifest consumption 和 runtime loaded gate；collector / shooter 仍待后续分步接入。
- 未改范围：QA report 还未持久化 required / loaded / failed 明细；Workbench Assets 面板未接入；第三方固定资源库、LicensePolicy、NoticeWriter 仍待后续步骤。

已通过验证：

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 4 个测试文件，60 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # 11 个测试文件，101 个测试全部通过

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 `required` 只收集 manifest 中存在的 asset id，而 `missing` 可能记录 role 名，导致缺 `player_character` role 时 QA 可能假阳性；P2 指出 runtime required 语义没有完全体现 manifest `required` 字段，建议避免合同误读；P2 建议补 `missing` 和缺 role 负例；P3 提醒新增文件提交时必须纳入。
- 已修复：dodger asset telemetry 中 `required` / `missing` 统一使用 asset id；缺失或 `required !== true` 的 template-consumed role 写入 `missingRequiredRoles`；QA 对 `missing` 非空和 `missingRequiredRoles` 非空直接 `ASSET_LOAD_FAILED`；补 runtime asset missing 与 required role absent 两个负例。
- Oracle 复审：P0/P1/P2 均无，Step 2 代码门禁通过。
- 审查模式：Oracle 复用

下一步建议：

- Asset Pipeline P0 Step 3：把 runtime asset telemetry 和 manifest summary 写进 QA report，区分 `ASSET_MISSING`、`REQUIRED_CORE_ASSET_PLACEHOLDER_USED` 与 `ASSET_LOAD_FAILED` 的明细，为 Workbench Assets 面板铺路。

### 2.6 Asset Pipeline P0 Step 1: AssetPlan / AssetManifest artifact gate

完成时间：2026-06-11

已完成内容：

- 新增 `packages/asset-pipeline`，拆分为 `schemas.ts`、`plan.ts`、`writer.ts`、`validator.ts`、`template-svg-provider.ts` 和 `index.ts`。
- `AssetPlanSchema` / `AssetManifestSchema` 固化 `asset-plan-v0.1` 与 `asset-manifest-v0.1`，禁止绝对路径、URL scheme、`..` 路径和 manifest path / id 不一致。
- `buildAssetPlanFromIr` 从 `NormalizedGameIr` 派生 deterministic `AssetPlan`，不新增 Raw DSL asset 字段，也不读取模型生成路径。
- `writeAssetArtifacts` 在 generated project 写入 `asset_plan.json`、`public/asset_manifest.json` 和 `public/assets/<id>.svg` template SVG 资源。
- `TemplateCompilerService` 在编译生成项目时写入 `game.ir.json` 和 asset artifacts，并把这些文件计入 compile result。
- `PlaywrightQaRunnerService` 在进入浏览器前调用 `validateGeneratedProjectAssets`，要求 `asset_plan.json` 中所有 required items 被 manifest 覆盖，manifest asset 必须 `required=true`、`status=ready`、metadata 与 plan 一致，且路径指向普通文件。
- QA failure code 新增 `ASSET_MANIFEST_INVALID`、`ASSET_MISSING`、`REQUIRED_CORE_ASSET_PLACEHOLDER_USED`；通过 asset gate 的 QA report 写入 `asset_manifest_summary`。
- 测试覆盖 AssetPlan 派生、manifest 路径安全、required asset 漏报、目录伪装 SVG、核心 placeholder 阻断、编译落盘和 QA 浏览器前置阻断。

阶段结果：

- 解决层级：数据契约 + 编译边界 + QA 门禁。
- DSL-first 边界：模型仍只生成 Raw DSL；本步从已校验 IR deterministic 派生资源计划，没有开放模型输出 asset path / URL / base64。
- 结构结果：`packages/asset-pipeline/src/validator.ts` 191 行，`schemas.ts` 158 行，`template-svg-provider.ts` 74 行，`plan.ts` 68 行，`writer.ts` 62 行，没有继续保留 492 行混合入口文件。
- 未改范围：Phaser templates 尚未 preload / render manifest assets；QA 还未证明 Phaser runtime 的 required assets loaded telemetry；Workbench asset panel 尚未接入。

已通过验证：

    npm install --package-lock-only --ignore-scripts
    # 通过；package-lock 新增 @ai-game-maker/asset-pipeline workspace link；npm audit 仍报告既有 5 vulnerabilities，未执行 audit fix

    npx vitest run tests/contracts/asset-pipeline.test.ts tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 3 个测试文件，33 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 asset gate 只信任 manifest 自声明资产集合，无法发现 manifest 漏报 core required assets；P1 指出文件门禁只用 `stat`，目录伪装 `.svg` 也会通过；P2 建议收紧 path 到 `assets/<id>.svg` 并补测试。
- 已修复：`validateGeneratedProjectAssets` 改为读取 `asset_plan.json` + `asset_manifest.json`，required plan item 必须被 manifest 覆盖且 metadata 一致；文件检查改为 `stat(...).isFile()`；manifest path 收紧为 `assets/${id}.svg`，并检查重复 path / path 与 id 一致；补漏报 plan required item 和目录伪装 `.svg` 测试。
- Oracle 复审：P0/P1/P2/P3 均无，Asset Pipeline P0 Step 1 代码门禁通过。
- 审查模式：Oracle 复用

下一步建议：

- Asset Pipeline P0 Step 2：让 Phaser templates 读取 generated `asset_manifest.json`，preload manifest 中 required assets，并在 runtime telemetry / QA 中证明 `assetsLoaded` / `assetsFailed` 与 manifest required assets 对齐。
- 暂不接 AI image provider；继续保持 deterministic template SVG provider，先打通 manifest consumption 与 QA loaded gate。

### 2.5 DSL-first dodger difficulty curve runtime_plan

完成时间：2026-06-11

已完成内容：

- `NormalizedGameIrSchema` 新增 `runtime_plan.difficulty_curve`，字段包括 `derived_from`、`level`、speed / spawn interval multiplier start/end 和 `ramp_duration_ms`。
- `runtime_plan.difficulty_curve` 当前只允许 dodger；collector / shooter 携带该字段会被 schema 拒绝。
- `normalizer` 不新增 Raw DSL 字段，而是从模型已生成的 `game.difficulty` 与 `game.target_play_time_sec` 派生 deterministic runtime hints。
- dodger runtime 新增 difficulty resolver 与 interpolation；hazard 创建时使用当前 curve 计算 speed multiplier，并用 spawn interval multiplier 计算下一次 hazard spawn delay。
- `DodgerGameScene` 在 QA snapshot 暴露 `difficultyPlan`，并在 `hazard.spawned` payload 暴露 `difficultyLevel`、`difficultySource`、`rampProgress`、`speedMultiplier`、`spawnIntervalMultiplier` 和 `effectiveIntervalMs`。
- Playwright QA 对 `difficultyPlan.source === "runtime_plan"` 做独立语义门禁：不依赖 `spawnPlan.hazard.source`，必须观察到任意 `hazard.spawned` event 携带合法 difficulty metadata。
- prompt context 增加 `difficulty_runtime_guidance`，说明 dodger difficulty 会派生 runtime curve，同时禁止模型输出 `runtime_plan`、`template_params`、`difficulty_curve`、multiplier 或 ramp 字段。
- QA visual gate 截图前等待两个 `requestAnimationFrame`，稳定全量测试中的 canvas 绘制时序；dodger movement QA 改为短窗口验证移动后不会立即受伤，避免把后续正常难度压力误判为 lane dodge 失败。

阶段结果：

- 解决层级：IR contract + normalizer 派生 + dodger runtime 解释 + QA 语义门禁 + prompt/provider 边界；没有新增 Raw DSL 字段，也没有让模型输出模板私有参数。
- DSL-first 边界：大模型仍只生成 Raw DSL 的 `game.difficulty` / `target_play_time_sec`；normalizer 生成 `runtime_plan.difficulty_curve`；生成项目写入 `runtime-plan.generated.json`；dodger runtime 执行；QA 证明 runtime_plan difficulty metadata 被 hazard spawn 消费。
- 当前 difficulty 语义为 spawn-time tuning：新生成 hazard 使用当时 curve multiplier，已有 hazard 的速度在创建时固化。
- 当前 curve：
  - `easy`: speed 0.9 -> 1.0，spawn interval 1.15 -> 1.05。
  - `normal`: speed 1.0 -> 1.25，spawn interval 1.0 -> 0.8。
  - `ramp_duration_ms = game.target_play_time_sec * 1000`。
- 未改范围：未新增 Raw DSL difficulty curve 字段；未新增 telemetry event type；未扩展 collector / shooter；未把全量 telemetry payload 持久化到 QA report。

已通过验证：

    npx vitest run tests/contracts/phaser-templates.test.ts tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/contract-freeze.test.ts
    # 3 个测试文件，55 个测试全部通过

    npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/workspace/game-dsl-provider.test.ts
    # 2 个测试文件，44 个测试全部通过

    npm test
    # 11 个测试文件，91 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    git diff --check
    # 无输出

    npx tsx "<DeepSeek dodger Raw DSL -> normalize -> compile -> Vite build -> Playwright QA>"
    # DeepSeek deepseek-v4-flash 生成 dodger Raw DSL，genre=dodger，difficulty=normal
    # runtime-plan.generated.json 包含 coin fixed_positions、barrier right_edge_wave 和 normal difficulty_curve
    # compile=true；build=true；QA rerun PASS；visual PASS
    # 产物：proj_20260611_step5_20260610161928
    # QA report: data/local-data/qa-reports/proj_20260611_step5_20260610161928/run_20260611_step5_20260610161928_rerun3.json
    # runtime plan: data/generated-projects/proj_20260611_step5_20260610161928/dodger/src/runtime-plan.generated.json

审查门禁结论：

- Oracle 方案审查：P0 无；允许执行 Step 5；要求 difficulty QA 独立证明，避免连续 multiplier 精确相等；要求 genre gate、派生值冻结、restart reset 覆盖。
- Oracle 首轮代码审查：P0 无；P1 指出 difficulty QA 依赖 `spawnPlan.hazard.source === "runtime_plan"`，当只有 difficulty_curve 来自 runtime_plan 时证明不足；P2 建议明确 spawn-time tuning 或改 per-frame multiplier，并补 ramp 后新 hazard 调度测试；P3 建议补 forbidden_fields。
- 已修复：新增独立 `verifyDodgerRuntimePlanDifficulty`；补 `difficultyPlan.source=runtime_plan` 但 hazard telemetry 缺 metadata 的负例；补 ramp 后新 hazard `effectiveIntervalMs` / multiplier 集成测试；`forbidden_fields` 增加 difficulty / multiplier / ramp 字段。
- Oracle 复审：P0/P1/P2/P3 均无，Step 5 代码门禁通过。
- 审查模式：Oracle 复用

下一步建议：

- DSL-first P1 Step 6：优先选择 shooter 或 collector 的一个小型可执行薄片，继续按 contract -> normalizer/IR -> runtime -> QA -> prompt/provider -> real E2E 的顺序推进。
- 如果继续 dodger，应优先扩展已验证 runtime_plan 能力，而不是新增 Raw DSL 自由数值字段。

### 2.4 DSL-first dodger collectible fixed_positions spawn

完成时间：2026-06-10

已完成内容：

- dodger fixture/golden 将 collectible spawn 收敛为 `fixed_positions`，hazard 继续使用 `right_edge_wave`。
- dodger runtime 解释 `runtime_plan.spawn_rules` 中的 collectible `fixed_positions`：模型控制 `count`、`max_active`、`interval_ms`，runtime 根据 world/lane 几何派生固定 slot pool。
- `DodgerGameScene` 新增 collectible runtime object、spawn budget、max active、interval 补发、收集后隐藏与补发节奏；`dodgeFrame()` 与真实 `update()` 一样推进 collectible runtime。
- `item.spawned` payload 暴露 `entityId`、`strategy`、`source`、`count`、`maxActive`、`intervalMs`；`item.collected` payload 暴露 `entityId`、`source`、`slotIndex`。
- Playwright QA 对 `spawnPlan.hazard` 和 `spawnPlan.collectible` 分别做 semantic check；hazard 必须是 `right_edge_wave + laneCount`，collectible 必须是 `fixed_positions` 且无 `laneCount`。
- provider scope gate 只放行两个模型可生成 slice：`dodger hazard right_edge_wave` 与 `dodger collectible fixed_positions`。
- provider 拒绝 duplicate same-kind spawn、spawn-bearing entity 与 template primary entity 不一致、collectible 携带 `lane_count`、collectible 缺少 `player <overlap> collectible` 且 `score_add > 0` 的可执行收集语义。
- dodger prompt valid example 增加 collectible、collect action、collect collision 和 fixed_positions guidance；修复真实模型验证暴露的 prompt example action/collision 重复 id。

阶段结果：

- 解决层级：数据契约 golden + 模板 runtime 解释 + QA 语义门禁 + 模型 prompt/provider 边界；没有新增 genre，也没有让模型输出 `runtime_plan` 或 `template_params`。
- DSL-first 边界：模型生成 Raw DSL 的 `entity.spawn`；normalizer 写入 `ir.runtime_plan.spawn_rules`；dodger runtime 解释执行；QA 通过 snapshot/telemetry 证明 runtime_plan 行为发生。
- 当前 executable + prompt-exposed subset：
  - `dodger` / `hazard` / `right_edge_wave`，count 5..12、max_active 2..4、interval_ms 600..1200、lane_count 3..4。
  - `dodger` / `collectible` / `fixed_positions`，count 3..10、max_active 1..3、interval_ms 700..1600，必须省略 lane_count，且必须有正向 collect scoring collision。
- 未改范围：未开放 collector/shooter spawn、hazard fixed_positions、hazard top_edge_stream、collectible right_edge_wave、collectible top_edge_stream，也未允许多 primary hazard/collectible。

已通过验证：

    npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/phaser-templates.test.ts
    # 2 个测试文件，37 个测试全部通过

    npm run test:contracts
    # 3 个测试文件，50 个测试全部通过

    npx vitest run tests/workspace/game-dsl-provider.test.ts tests/workspace/playwright-qa-runner.test.ts tests/workspace/compiler-service.test.ts
    # 3 个测试文件，49 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    git diff --check
    # 无输出

    npx tsx --eval "<DeepSeek dodger Raw DSL -> normalize -> compile -> Vite build -> Playwright QA>"
    # 第一次真实模型验证暴露 prompt valid example action/collision id 重复，已修复为 collect_action / collect_coin
    # 第二次 DeepSeek deepseek-v4-flash 生成 dodger Raw DSL；collectible spawn 为 fixed_positions；hazard spawn 为 right_edge_wave
    # runtime_plan.spawn_rules 写入 coin fixed_positions 与 barrier right_edge_wave；compile=true；build=true；QA PASSED；observed_events=23
    # 产物：proj_20260610_step4_20260610t155627 / run_20260610_step4_20260610t155627
    # QA report: data/local-data/qa-reports/proj_20260610_step4_20260610t155627/run_20260610_step4_20260610t155627.json
    # screenshot: data/generated-projects/proj_20260610_step4_20260610t155627/qa/screenshot.png
    # 本命令为本地一次性 eval 验证，未固化为仓库脚本

审查门禁结论：

- Oracle 计划审查：P0 无；P1 要求收紧 provider 范围、定义 fixed_positions 语义、QA 独立检查 collectible、旧兼容按 entity kind 保留；P2/P3 建议补数值/策略/文档约束。
- Oracle 首轮代码审查：P0 无；P1 指出 spawn-bearing entity 与 template primary entity 可能不一致，导致 runtime 混用或忽略模型语义；P2 建议加强调度测试、QA 策略白名单、`item.collected.slotIndex`。
- 已修复：provider 要求 spawn-bearing hazard/collectible 在 DSL 中是唯一 primary entity；补 duplicate、primary mismatch、range、lane_count、缺 collect scoring collision 负例；QA 增加 hazard/collectible 策略白名单和 malformed/mismatch 负例；runtime 补 count/maxActive/interval 调度测试。
- Oracle 二次代码复审：P1 指出 collectible fixed_positions 未要求 collect scoring collision，normalizer 可能不生成 `template_params.collectible`，runtime/QA 会跳过。
- 已修复：provider 要求 player overlap collectible collision 且 `score_add > 0`；补 missing collision、missing score_add、score_add=0 三个负例；补 hazard unsupported strategy QA 负例。
- Oracle 最终代码复审：P0/P1/P2/P3 均无，Step 4 代码门禁通过。
- 审查模式：Oracle 复用

下一步建议：

- DSL-first P1 Step 5：继续用同样顺序扩展一个薄片，优先考虑 dodger 难度曲线 runtime 字段；也可以选择 shooter/collector 的一个小 contract/runtime/QA/prompt 闭环。
- 进入下一步前继续保持规则：先 contract/runtime/QA，再 prompt/provider，最后真实模型链路验证。

### 2.3 DSL-first prompt/context: verified dodger spawn generation

完成时间：2026-06-10

已完成内容：

- `RawDslPromptContext` 新增 `spawn_generation_guidance`，避免把 IR 字段名 `runtime_plan` 暴露成模型可输出字段。
- dodger prompt valid example 的 hazard 增加 `spawn: { strategy: "right_edge_wave", max_active: 3, interval_ms: 800, lane_count: 3 }`。
- prompt context 对 collector/shooter 明确禁止 `entity.spawn`；对 dodger 只允许 hazard 使用 `right_edge_wave`，并给出 `count`、`max_active`、`interval_ms`、`lane_count` 的已验证范围。
- `GameDslProviderService` 删除 `rules.spawns` 静默剥离逻辑，Raw DSL 直接进入 strict schema；模型输出 `rules.spawns` 会失败。
- provider 在 schema 通过后、brief mismatch 检查前新增 `checkRawDslMatchesVerifiedPromptScope`：只放行 `dodger + hazard + right_edge_wave`，并硬校验 count 5..12、max_active 2..4、interval_ms 600..1200、lane_count 3..4。
- provider 测试覆盖 prompt guidance、dodger 成功路径、collectible spawn 拒绝、`fixed_positions` / `top_edge_stream` 拒绝、各数值范围独立拒绝、`rules.spawns` strict schema 拒绝。

阶段结果：

- 解决层级：模型 prompt/context + provider 边界校验；没有修改 runtime/template 已通过门禁的执行逻辑。
- DSL-first 边界：大模型现在可以生成 Raw DSL 的 `entity.spawn`，但 provider 只允许进入当前已由 contract + runtime + QA 验证过的 dodger hazard `right_edge_wave` 子集。
- 当前 executable + prompt-exposed subset：`dodger` / `hazard` / `right_edge_wave`，范围为 count 5..12、max_active 2..4、interval_ms 600..1200、lane_count 3..4。
- 未改范围：未开放 collectible spawn、collector/shooter spawn、`fixed_positions`、`top_edge_stream`，也未把 `runtime_plan` 或 `template_params` 作为 Raw DSL 输出字段。

已通过验证：

    npx vitest run tests/workspace/game-dsl-provider.test.ts
    # 1 个测试文件，19 个测试全部通过

    npm run test:contracts
    # 3 个测试文件，48 个测试全部通过

    npx vitest run tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/generation-pipeline.smoke.test.ts
    # 3 个测试文件，27 个测试全部通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    git diff --check
    # 无输出

    npx tsx --eval "<DeepSeek provider prompt shape check>"
    # dodger context 输出 spawn_generation_guidance；valid example hazard spawn 为 right_edge_wave；prompt 明确禁止 runtime_plan/template_params
    # 本命令为本地一次性 eval 验证，未固化为仓库脚本

    npx tsx --eval "<DeepSeek dodger Raw DSL -> normalize -> compile -> Vite build -> Playwright QA>"
    # DeepSeek deepseek-v4-flash 生成 dodger Raw DSL；hazard spawn 为 right_edge_wave；runtime_plan.spawn_rules 写入 obstacle；compile=true；build=true；QA PASSED
    # 产物：proj_20260610_232000_step3_e2e / run_20260610_232000_step3_e2e
    # QA report: data/local-data/qa-reports/proj_20260610_232000_step3_e2e/run_20260610_232000_step3_e2e.json
    # 本命令为本地一次性 eval 验证，未固化为仓库脚本

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 `rules.spawns` 仍会被 provider 静默剥离、prompt 数值范围未在 provider 硬校验；P2 建议补 `fixed_positions/top_edge_stream` 和独立范围分支测试；P3 建议避免 `runtime_plan_guidance` 诱导模型输出 IR 字段。
- 已修复：删除 `rules.spawns` 剥离；provider 硬校验 count/max_active/interval_ms/lane_count；字段改为 `spawn_generation_guidance`；prompt 明确禁止 `runtime_plan/template_params`；补 strategy/range/`rules.spawns` 测试。
- Oracle 二次复审：P0/P1/P2/P3 均无，Step 3 代码门禁通过。
- 审查模式：Oracle 复用

下一步建议：

- DSL-first P1 Step 4：继续用同样方式扩展一个可执行薄片，优先从 `collectible spawn` 或 dodger 难度曲线中选一个；必须先 contract/runtime/QA，再 prompt。
- 若选择继续提升 dodger 可玩性，应让模型字段进入 runtime 可观察行为，并用 Playwright QA 或 template runtime 单测证明。

### 2.2 DSL-first runtime_plan v0: dodger runtime/semantic QA

完成时间：2026-06-10

已完成内容：

- `TemplateCompilerService` 现在为 dodger 生成项目复制 `dodger-runtime-plan.ts` / `runtime-plan.generated.json`，并把 `ir.runtime_plan` 原样写入生成项目。
- dodger `main.ts` import `runtime-plan.generated.json`，合并后传入 `DodgerGameScene`；模型 DSL/IR 仍是事实来源，模板只解释 runtime plan。
- 新增 `templates/phaser/dodger/src/dodger-runtime-plan.ts`，把 `runtime_plan.spawn_rules` 解析为 dodger runtime 可执行的 `ResolvedDodgerSpawnRule`。
- `DodgerGameScene` 当前只执行 `hazard + right_edge_wave` 薄片：使用 `count`、`maxActive`、`intervalMs`、`laneCount` 控制 hazard 入场，并在 `hazard.spawned` payload 和 QA snapshot 中暴露 `entityId`、`strategy`、`source`、`maxActive`、`laneCount`。
- `SpawnSystem.spawn(...)` 支持透传 payload 到 telemetry。
- Playwright QA 增加 dodger semantic check：当 snapshot 声明 `spawnPlan.hazard.source === "runtime_plan"` 时，必须观察到匹配 `source/entityId/strategy/maxActive/laneCount` 的 `hazard.spawned` telemetry；runtime_plan snapshot 缺字段会失败，而不是跳过。
- 合同/工作区测试覆盖 runtime plan 解析、unsupported strategy 不冒充已执行、fallback lane 几何不漂移、编译器落盘、QA mismatch 和 malformed snapshot 负例。

阶段结果：

- 解决层级：IR 编译边界 + 模板运行时解释 + QA 语义门禁；没有把 prompt 直接扩展到尚未可执行的字段。
- DSL-first 边界：`runtime_plan.spawn_rules` 已能从模型 DSL 归一化结果进入生成项目，并真实影响 dodger hazard 的入场节奏、最大活跃数和轨道数。
- 当前 executable subset：`dodger` / `hazard` / `right_edge_wave`；`fixed_positions` 与 `top_edge_stream` 仍保留在合同枚举中，但不会被 dodger runtime 标记为 `source: "runtime_plan"` 执行。
- 旧兼容：没有 runtime plan 时保留模板默认 3 lane 几何 `[startY - 110, startY, startY + 110]`。
- 未改范围：本步未更新 prompt、未要求模型开始生成 spawn 字段、未实现 collectible spawn 或其他 genre 的 runtime_plan 执行。

已通过验证：

    npx vitest run tests/contracts/phaser-templates.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 2 个测试文件，21 个测试全部通过

    npm run test:contracts
    # 3 个测试文件，48 个测试全部通过

    npx vitest run tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 2 个测试文件，16 个测试全部通过

    npm run typecheck:root
    # tsc --noEmit -p tsconfig.json 通过

    npm run typecheck --workspace @ai-game-maker/maker-api
    # maker-api 类型检查通过

    git diff --check
    # 无输出

    npx tsx --eval "<dodger compile + Vite build quick check>"
    # compile=true, build=true；临时生成项目和 build log 已清理

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 runtime 把所有 strategy 标记为 `runtime_plan`，但实际只执行 `right_edge_wave`；P2 指出 fallback lane 几何漂移、QA 未比对 `maxActive/laneCount`。
- 已修复：`resolveDodgerSpawnRule` 只在 strategy 等于当前 executable fallback strategy 时返回 `source: "runtime_plan"`；fallback 3 lane 恢复旧几何；QA 比对 `maxActive/laneCount`。
- Oracle 二次复审：P0/P1 无；P2 指出 malformed runtime_plan snapshot 会被折叠成 no-op。
- 已修复：`readSnapshotDodgerSpawnPlan` 改为 `absent/not_runtime_plan/malformed/runtime_plan` 四态；`source: "runtime_plan"` 但缺必需字段时 QA 失败；补缺 `laneCount` 负例。
- Oracle 最终复审：P0/P1/P2/P3 均无，Step 2.2 代码门禁通过。
- 审查模式：Oracle 复用

下一步建议：

- DSL-first P1 Step 3：更新模型 prompt/context，只允许生成 `dodger` 的 `entity.spawn.strategy = "right_edge_wave"`，并明确 `max_active/interval_ms/lane_count` 范围与可玩性目标。
- DSL-first P1 Step 3 后必须跑真实模型生成链路，检查 raw DSL、IR、生成项目、QA report 和 Workbench 状态，而不是只看 prompt 文案。

### 2.1 DSL-first runtime_plan v0: dodger spawn contract/golden

完成时间：2026-06-10

已完成内容：

- 在 Raw Game DSL 的 entity 上新增可选 `spawn` 语义，当前仅允许 `dodger` 使用；`collector` / `shooter` 携带 `entity.spawn` 会稳定拒绝。
- 在 Normalized IR 中新增 `runtime_plan.spawn_rules`，用于保留模型生成的入场语义，避免只压入模板私有 `template_params`。
- `normalizer` 新增 `buildRuntimePlan(...)`，把 `raw.entities[].spawn` 映射为结构化 `spawn_rules`；缺省 `max_active` / `interval_ms` 明确为 normalizer-derived runtime hints，不是模型事实。
- `NormalizedGameIrSchema` 同步限制：当前 `runtime_plan.spawn_rules` 只允许 `dodger`，直接构造 collector/shooter IR 携带 spawn plan 会被拒绝。
- 合同测试新增 dodger spawn golden、非 dodger spawn 负例、spawn 数值范围 code、partial spawn 缺省值、runtime_plan 严格枚举与额外字段拒绝。

阶段结果：

- 解决层级：数据契约 + IR contract；本步未修改 prompt、Phaser runtime、QA runner 或 Workbench。
- DSL-first 边界：`spawn` 从 Raw DSL contract 进入 `ir.runtime_plan.spawn_rules`；测试断言 `template_params.params` 不包含 `"spawn"`。
- 当前只承诺 contract/golden：`runtime_plan.spawn_rules` 已可被验证和编译输入解析，但模板尚未解释执行，QA 尚未证明 spawn 语义发生。
- 文件规模：`raw-game-dsl-v0.1.schema.ts` 183 行、`normalized-game-ir-v0.1.schema.ts` 153 行、`normalizer.ts` 280 行；`normalizer.ts` 超过 220 行但本步只在数据契约边界增加局部函数，未继续扩展模板职责。

已通过验证：

    npx vitest run tests/contracts/dsl-validator-normalizer.test.ts
    # 22 个测试全部通过

    npx vitest run tests/contracts/contract-freeze.test.ts
    # 13 个测试全部通过

    npm run test:contracts
    # 3 个测试文件，45 个测试全部通过

    npm run typecheck:root
    # tsc --noEmit -p tsconfig.json 通过

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 指出 `spawn` 实际放开到所有 genre/entity kind，超出 dodger 薄片边界；P2 指出 normalizer 缺省值语义未冻结、runtime_plan 缺少 freeze 负例；P3 建议后续拆 explicit spawn fixture。
- 已修复：Raw DSL 限制 `entity.spawn` 当前仅 dodger 可用；补充非 dodger spawn 拒绝、spawn 数值范围、template_params 不含 spawn、runtime_plan 严格枚举/额外字段拒绝测试。
- Oracle 二次复审：P1 指出 Normalized IR 入口仍允许非 dodger `runtime_plan.spawn_rules`；P2 建议冻结缺省值，并让 Raw schema superRefine 同时检查 engine leakage 和 spawn genre 边界。
- 已修复：Normalized IR 拒绝 collector/shooter spawn_rules；补 partial spawn 缺省值 golden；Raw schema superRefine 不再提前 return。
- Oracle 最终复审：P0/P1/P2/P3 均无，Step 2.1 代码门禁通过，可以进入文档沉淀。
- 审查模式：Oracle 复用

下一步建议：

- Step 2.2：让 dodger runtime 读取并解释 `runtime_plan.spawn_rules`，旧默认行为保持兼容。
- Step 2.2 同步新增最小 semantic QA：当 IR 声明 spawn rule 时，QA report 能证明对应 entity spawn event 或 snapshot 状态变化发生。
- DSL-first P1 Step 3：runtime 和 semantic QA 通过后，再更新 prompt context，让模型开始生成当前已验证的 `spawn` 字段。

### 1.24 Shooter 模板真实移动与 QA 可玩性门禁

完成时间：2026-06-10

已完成内容：

- 将 shooter 模板从 `ArrowRight` 触发一次性 `hitEnemy()` 改为真实方向输入：支持 Arrow/WASD 持续移动，`Space` 发射。
- 新增 `templates/phaser/shooter/src/shooter-runtime.ts`，维护玩家坐标、敌人生成、子弹推进、敌人追踪、碰撞、清除、计分和玩家受伤/失败。
- 新增 `templates/phaser/shooter/src/shooter-renderer.ts`，集中管理 Phaser 可移动对象、敌人/子弹映射和 HUD。
- `GameScene` 降为流程编排层，负责 start/fire/update/restart、遥测和目标判定。
- `template-visuals.ts` 改为返回可移动 `Container` / 局部坐标 projectile，避免静态绘制后无法移动。
- `QaBridge.snapshot()` 支持模板追加 `player/enemiesActive/projectilesActive/enemiesCleared`，`player.moved` payload 改为扁平 `fromX/fromY/toX/toY`。
- Playwright QA 对 shooter 先校验 `snapshot.player.x` 真实变化，再重复发射直到观察到 `enemy.cleared` 或 `score.changed`。
- 编译器文件清单、shooter manifest 和合约测试已同步新增 runtime/renderer 文件。

阶段结果：

- 解决层级：状态建模 + 模板运行时 + QA 门禁；没有只在展示层或遥测层兜底。
- `GameScene.ts` 从 154 行调整为 188 行，仍保留编排职责；新增 `shooter-runtime.ts` 202 行、`shooter-renderer.ts` 103 行、`template-visuals.ts` 198 行。
- 当前运行中的本地 `localhost:3000` API 进程若未重启，仍可能使用旧 QA runner；源码验证路径已通过，当前 Workbench 页面需要重启 dev server 后再生成才能使用新 QA 逻辑。
- 工作区存在另一组 `local-data/result` 相关源码 diff，不属于本步范围，本步未纳入审查和说明。

已通过验证：

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run test:contracts
    # 3 个测试文件，36 个测试全部通过

    npm run test:workspace
    # 11 个测试文件，60 个测试全部通过，包含 Playwright QA runner 和 generation pipeline smoke

    npm test
    # contracts + workspace 全量通过

审查门禁结论：

- Oracle 首轮审查：P0 无；P1 发现 shooter 单次 Space / 单次命中只等待 `enemy.hit`，不能保证满足 `enemy.cleared` 或 `score.changed`；P2 发现移动断言方向脆弱、gate failure code 不清晰、嵌套 telemetry payload 浅克隆泄漏；P3 发现 restart 未清空持续输入。
- 已修复：QA 循环射击直到进度事件、左右方向兜底移动断言、`REQUIRED_TELEMETRY_MISSING` failure code、扁平 movement payload、restart 清空 move input。
- Oracle 复审：P0/P1/P2 均无；P3 建议移动失败时直接返回，避免额外等待 timeout。
- 已修复 P3 并最终复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用

下一步建议：

- 重启本地 `npm run maker:start`，在 Workbench 重新 Generate 一个 shooter 项目，确认当前浏览器页面加载的是新 API runner。
- 后续 P1/P2 可继续扩展：多敌人类型、道具、关卡波次、失败/胜利反馈和更细的 QA 视觉回归。

### 0. Contract Freeze

完成时间：2026-06-09

已完成内容：

- 新增根目录 npm workspaces、TypeScript/Vitest 基础配置和本地数据清理/准备脚本占位。
- 新增 Game Brief、Raw Game DSL、Normalized IR、Telemetry event 的 Zod schema。
- 新增 collector/dodger/shooter mechanic contract、Playable QA gate、Phaser adapter capability、三个 template manifest。
- 新增 `tests/contracts/contract-freeze.test.ts` 和 `tests/contracts/fixtures.ts`，校验 schema、contract、QA gate、IR 不变量与 manifest 的一致性。

阶段结果：

- Contract Freeze 清单中的文件已落盘。
- Raw DSL 会拒绝 forbidden fields / engine terms；Normalized IR 会拒绝 genre/template/telemetry/QA contract 漂移。
- QA gate 已冻结 `all` 全部满足、每个 `any_groups` 至少一个满足的判定语义。
- 暂未进入 API、模型、编译器、真实模板源码和 Workbench 业务开发。

已通过验证：

    npm install
    # 安装成功；曾提示 dev 依赖链 5 个漏洞，未执行 npm audit fix --force，避免破坏性升级

    npm run test:contracts
    # 1 个测试文件，11 个测试全部通过

    npm run typecheck
    # tsc --noEmit 通过

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- 首轮 Oracle 审查发现 P0：Raw DSL 禁止字段会被 Zod 默认剥离，缺少负例覆盖。
- 已修复：Raw DSL 改为严格对象并递归拒绝 forbidden fields / engine terms。
- 已同步处理 P1：telemetry all + any_groups、IR 跨字段一致性、JSON 契约结构测试。
- 二次复审发现 P1：Normalized IR 未绑定 genre 到对应 mechanic contract telemetry。
- 已修复：Normalized IR 从实际 mechanic contract JSON 派生 genre 对应 telemetry contract，并补 QA common events、gate 判定语义、IR strict object 覆盖。
- 已补充：三类真实 contract JSON 均可构造对应 IR，Dodger 多 `any_groups` 判定语义已冻结。
- 最终 Oracle 复审：P0/P1/P2/P3 均无阻塞，Step 0 可视为完成。
- 审查模式：Oracle 复用

下一步建议：

- Step 1：Monorepo + 一键启动。补齐 `apps/maker-api`、`apps/maker-workbench` 的最小可启动骨架，并让 `npm run maker:start` 启动本地 API / Workbench。
- 进入 DSL Validator / IR Normalizer 前补 genre 到 `runtime_requirements` 的派生规则测试，避免玩法语义漂移到 compiler/template 层。

### 1.1 应用包骨架

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api` workspace 包，包含 NestJS `AppModule`、`HealthController` 和 `src/main.ts` 入口。
- 新增 `apps/maker-workbench` workspace 包，包含 React/Vite `index.html`、`App.tsx`、`main.tsx` 和 `vite.config.ts`。
- 更新根 `tsconfig.json`，让 `npm run typecheck` 覆盖 `apps/**/*.ts` 和 `apps/**/*.tsx`，并补齐 JSX、DOM、Nest decorator 编译选项。
- 通过 `npm install` 同步 workspace 依赖和 `package-lock.json`；Vite 相关包保留在 Workbench devDependencies，不进入生产依赖面。

阶段结果：

- API 仅提供 `/health` 健康检查，不包含项目状态、Job Protocol、存储、模型、编译或 QA 逻辑。
- Workbench 仅提供占位页面，不包含生成流程、状态轮询、preview iframe 或 QA 展示。
- 新增 app 文件行数均未超过 220 行；当前最大新增源码文件为 `apps/maker-api/src/health.controller.ts`，17 行。
- 本机 5173 端口已被占用，包级 Workbench 冒烟时 Vite 自动使用 5174；固定端口检查留到 Step 1.2/1.3。

已通过验证：

    npm install
    # 安装成功；全量 npm audit 仍报告 5 个 dev 依赖链漏洞，未执行 npm audit fix --force，避免破坏性升级

    npm run typecheck
    # tsc --noEmit 通过，已覆盖 apps/**/*.ts 和 apps/**/*.tsx

    npm audit --omit=dev
    # found 0 vulnerabilities

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # 返回 {"service":"maker-api","status":"ok"}；随后手动 Ctrl-C 停止长驻进程

    npm run --workspace @ai-game-maker/maker-workbench dev
    curl -sS http://127.0.0.1:5174/
    # 返回 Vite HTML；5173 被占用，Vite 自动切换到 5174；随后手动 Ctrl-C 停止长驻进程

审查门禁结论：

- Oracle 只读审查：P0/P1/P2 均无，Step 1.1 可通过代码审查门禁。
- P3：根 `tsconfig.json` 当前同时覆盖 Node API、React Workbench、packages 和 tests，且全局开启 DOM/JSX/Nest decorator 配置。当前骨架阶段不阻塞；进入真实 API / Workbench 逻辑前，建议拆 root/base config + app 级 tsconfig 或 project references，避免后端/shared packages 误用浏览器全局仍被类型系统放过。
- 审查模式：Oracle 复用

下一步建议：

- Step 1.2 前置小步：收敛 TypeScript 配置边界，拆出 API / Workbench app 级 tsconfig，并保持根 `npm run typecheck` 覆盖全部项目。
- Step 1.2：一键启动脚本。让 `npm run maker:start` 执行 setup 后并发启动 API / Workbench，并打印清晰访问地址。
- Step 1.3：本地配置与端口检查。让 `maker:doctor` 检查目录、依赖、端口占用和必需环境变量占位，不输出密钥值。

### 1.2 前置小步：收敛 TypeScript 配置边界

完成时间：2026-06-10

已完成内容：

- 新增根 `tsconfig.base.json`，收敛所有 TypeScript 项目共享的严格编译选项，并显式限制基础 `lib` 为 `ES2022`。
- 根 `tsconfig.json` 回到只覆盖 `packages/**/*.ts` 和 `tests/**/*.ts`，并保留 Node/Vitest 类型。
- 新增 `apps/maker-api/tsconfig.json`，仅覆盖 API `src/**/*.ts`，单独开启 Nest decorator 相关编译选项。
- 新增 `apps/maker-workbench/tsconfig.json`，仅覆盖 Workbench `src/**/*.ts(x)` 和 `vite.config.ts`，单独开启 DOM/JSX/Vite 类型。
- 更新根 `npm run typecheck`，串行执行 root、maker-api、maker-workbench 三段类型检查。

阶段结果：

- P3 中提到的根 `tsconfig.json` 混合 DOM/JSX/Nest decorator 配置问题已收敛。
- 根类型检查仍覆盖 packages/tests，app 类型检查由各自 workspace tsconfig 承担。
- 未改动 API / Workbench 运行逻辑，未进入一键启动脚本实现。

已通过验证：

    npm run typecheck
    # 依次通过 typecheck:root、@ai-game-maker/maker-api typecheck、@ai-game-maker/maker-workbench typecheck

审查门禁结论：

- Oracle 只读审查首轮发现 P1：`tsconfig.base.json` 未显式设置 `lib`，root/API 仍可能继承 TypeScript 默认 DOM 全局。
- 已修复：`tsconfig.base.json` 显式设置 `lib: ["ES2022"]`，Workbench app tsconfig 单独覆盖 DOM/DOM.Iterable。
- Oracle 复审：P0/P1/P2 均无，本前置小步可通过审查门禁。
- P3：Workbench `tsconfig.json` 当前同时覆盖浏览器源码和 `vite.config.ts`，因此浏览器源码也能看到 Node 类型。当前骨架阶段不阻塞；后续 Workbench 逻辑增多时，可拆 `tsconfig.node.json` 给 `vite.config.ts`。
- 审查模式：Oracle 复用

下一步建议：

- Step 1.2：一键启动脚本。让 `npm run maker:start` 执行 setup 后并发启动 API / Workbench，并打印清晰访问地址。

### 1.2 一键启动脚本

完成时间：2026-06-10

已完成内容：

- 将 `scripts/dev.mjs` 从占位输出改为本地 dev 服务启动器。
- 使用 Node 内置 `child_process.spawn` 并发启动 `@ai-game-maker/maker-api` 和 `@ai-game-maker/maker-workbench`，未新增 `concurrently` 依赖。
- 为子进程输出加 `[maker-api]` / `[maker-workbench]` 前缀，启动时打印配置访问地址。
- 当任一子进程异常退出时，停止其它子进程并收敛退出码；收到 `SIGINT` / `SIGTERM` 时停止全部子进程。
- 修复 Oracle 首轮发现的退出码问题：非 shutdown 状态下任一子进程退出，即使 code 为 0，父脚本也会设置非零退出码。

阶段结果：

- `npm run maker:start` 会先执行 `maker:setup`，再启动 API 和 Workbench。
- API 可通过 `http://localhost:3000/health` 访问。
- 本机 5173 端口已被占用，Workbench 验证时由 Vite 自动切换到 `http://127.0.0.1:5174/`；固定端口占用检查留到 Step 1.3。
- 手动 Ctrl-C 后父脚本退出码为 0，API 子 npm 进程会打印 code 130 生命周期提示；停止后 3000 和 5174 均不可连接。
- 未引入 Job Protocol、存储、模型、编译、QA 或 Workbench 状态流。

已通过验证：

    npm run maker:start
    # setup 完成；API 和 Workbench 子进程均启动；输出包含服务前缀和访问地址

    curl -sS http://localhost:3000/health
    # 返回 {"service":"maker-api","status":"ok"}

    curl -sS http://127.0.0.1:5174/ | head -20
    # 返回 Vite HTML；5173 被占用，Vite 自动切换到 5174

    # Ctrl-C 停止 npm run maker:start 后：
    curl -sS --max-time 2 http://localhost:3000/health || true
    curl -sS --max-time 2 http://127.0.0.1:5174/ | head -5 || true
    # 两个端口均连接失败，确认本次启动的子进程已停止

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    node --check scripts/dev.mjs
    # 脚本语法检查通过

审查门禁结论：

- Oracle 只读审查首轮发现 P1：非 shutdown 子进程 code 0 退出会被父进程当作成功。
- 已修复：非 shutdown 的子进程退出统一视为 dev 启动器失败，`code === 0` 或 `code === null` 时父进程退出码设置为 1。
- Oracle 复审：P0/P1/P2 均无，Step 1.2 可通过审查门禁。
- P3：`stopAll()` 当前只 kill 直接的 npm 子进程；本地验证已确认 Ctrl-C 后 3000/5174 均停止，但后续如跨平台出现孙进程残留，可考虑进程组管理或直接启动底层命令。
- P3：启动器先打印配置地址 5173，但当前机器 Vite 实际切到 5174；该问题留给 Step 1.3 端口检查处理。
- 审查模式：Oracle 复用

下一步建议：

- Step 1.3：本地配置与端口检查。让 `maker:doctor` 检查目录、依赖、端口占用和必需环境变量占位，不输出密钥值。

### 1.3 本地配置与端口检查

完成时间：2026-06-10

已完成内容：

- 将 `scripts/doctor.mjs` 从占位输出改为本地环境检查脚本。
- 检查 Node.js 主版本、`node_modules`、`package-lock.json`、`local-data/*`、`generated-projects`。
- 检查 `.env.example` 是否包含必需 key；`.env` 不存在或 key 缺失时只输出 key 名称和 warning，不输出任何环境变量值。
- 检查 `DEEPSEEK_API_KEY` 是否存在非占位值，只输出配置状态，不输出密钥内容。
- 检查 maker-api 3000 和 maker-workbench 5173 端口是否可用。

阶段结果：

- `maker:doctor` 能提前发现 5173 被占用，避免 `maker:start` 后才由 Vite 自动切换端口。
- 当前本机 `.env` 缺失，按 warning 处理；模型调用仍未进入本阶段。
- 当前本机 5173 被占用，按 failure 处理，`maker:doctor` 退出码为 1。
- 未改动 `maker:start`、API/Workbench 业务逻辑、Job Protocol、存储、模型、编译或 QA。

已通过验证：

    node --check scripts/doctor.mjs
    node --check scripts/dev.mjs
    # 脚本语法检查通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run maker:doctor
    # PASS：Node.js、依赖、local-data 目录、generated-projects、.env.example、3000 端口
    # WARN：.env is missing; model calls will remain disabled until configured
    # FAIL：maker-workbench port 5173 is already in use
    # 退出码：1

审查门禁结论：

- Oracle 只读审查：代码侧 P0/P1/P2 均无，`doctor` 可通过 Step 1.3 代码审查门禁。
- Oracle 文档复审首轮发现 P1/P2：Step Index 的 Step 2 目标与禁止范围冲突；状态指针提前推进到 Step 2。
- 已修复：状态指针退回 Step 1.3 文档审查修复；Step 2 禁止范围改为允许 Local Workspace Storage 范围内的路径边界、project/run store 和 events.jsonl，同时禁止后续阶段存储。
- P3：`parseEnv` 仅做简单 `KEY=value` 解析，不处理引号或行尾注释。当前只用于 key 状态和占位值粗检查，不阻塞；模型接入前可增强。
- 审查模式：Oracle 复用

下一步建议：

- Step 2：Local Workspace Storage + Job/API Contract。实现路径边界、project/run store、events.jsonl 和项目状态 API 契约。

### 2.1 LocalWorkspaceService 路径边界

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api/src/workspace/local-workspace.constants.ts`，集中定义 `local-data`、`generated-projects` 和本地数据子目录名称。
- 新增 `apps/maker-api/src/workspace/local-workspace.service.ts`，实现 workspace root、local-data、generated-projects、project/run/QA/telemetry/model-output 路径解析。
- 新增 `WorkspacePathError`，对非绝对路径、越界路径、不安全 project/run id 和不安全文件名早失败。
- 新增 `apps/maker-api/src/workspace/local-workspace.module.ts`，将 workspace service 作为 API 模块内可导出的 provider。
- 更新 `apps/maker-api/src/app.module.ts`，导入 `LocalWorkspaceModule`。
- 新增 `tests/workspace/local-workspace.service.test.ts`，覆盖正常路径、非法 id、越界绝对路径和相对路径拒绝。
- 更新根 `package.json`，新增 `test:workspace`，并让 `npm test` 同时运行 contract tests 和 workspace tests。

阶段结果：

- 后端本地路径边界已集中到 `LocalWorkspaceService`。
- 本步未实现 project/run JSON store、events.jsonl 写入、项目状态 API、模型输出存储、生成项目编译产物存储或 QA 报告写入。
- 当前新增源码文件均低于 220 行；最大新增源码为 `local-workspace.service.ts`，108 行。

已通过验证：

    npx vitest run tests/workspace/local-workspace.service.test.ts
    # 1 个测试文件，5 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 5 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查：P0/P1/P2/P3 均无，Step 2.1 可通过代码审查门禁。
- 审查确认：`assertInsideWorkspace` 通过 `resolve` + `relative` 拒绝 root 外路径；project/run id 校验与当前示例匹配；model output 文件名允许 `brief.raw.json` 并拒绝路径分隔和 `..`；未越过 Step 2.1 实现 store/API/业务链路。
- 后续注意：Step 2.2 开始真实写入时，继续保持所有写路径只从 `LocalWorkspaceService` 派生；如果未来允许用户控制目录或处理已有磁盘内容，再补充 symlink/realpath 层面的写入防护。
- 审查模式：Oracle 复用

下一步建议：

- Step 2.2：Project / Run Store。基于 `LocalWorkspaceService` 实现 project.json、latest-run.json、run.json 和 events.jsonl 的最小读写，不接模型、编译或 QA。

### 2.2 Project / Run Store

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api/src/projects/project-state.types.ts`，冻结 P0 project/run/event 基础类型和 `ProjectStatus` 状态枚举。
- 新增 `apps/maker-api/src/projects/json-file-store.ts`，集中 JSON 文件读写，并在读写前执行 workspace 边界断言。
- 新增 `apps/maker-api/src/projects/project-record.guards.ts`，对从磁盘读出的 `project.json` / `run.json` 做最小结构校验。
- 新增 `ProjectStoreService`，支持创建/读取/写入 `project.json`，以及读取/写入 `latest-run.json`。
- 新增 `RunStoreService`，支持创建/读取/写入 `run.json`，以及追加/读取 `events.jsonl`。
- 新增 `ProjectsModule` 并导入 `AppModule`，让 store service 进入 API 模块边界。
- 新增 `tests/workspace/project-run-store.test.ts`，覆盖 project/run 文件写读、events.jsonl、非法 id 拒绝和 latest-run project mismatch。
- 修复 Oracle 首轮发现的读入边界问题：`events.jsonl` 每行会校验 `timestamp/type/message`；`readProject/readRun/readLatestRun` 会校验路径 id 与文件内容 id 一致；run steps 会校验 `name/status`。
- 修复 Oracle 首轮发现的 DI 边界问题：`ProjectsModule` 使用 provider factory 注入同一个 `LocalWorkspaceService` 实例，不在 store 内部自行创建 workspace service。

阶段结果：

- `local-data/projects/<projectId>/project.json` 和 `latest-run.json` 最小读写已落地。
- `local-data/runs/<runId>/run.json` 和 `events.jsonl` 最小读写已落地。
- 所有写路径从 `LocalWorkspaceService` 派生，并在写入前执行 `assertInsideWorkspace`。
- 未实现项目 API controller、Job Protocol 编排、模型输出存储、生成项目编译产物存储、QA 报告写入、模型调用、编译或 QA。
- 当前新增源码文件均低于 220 行；最大新增源码为 `project-state.types.ts`，87 行；最大新增测试为 `project-run-store.test.ts`，171 行。

已通过验证：

    npm run test:workspace
    # local-workspace 5 个测试通过；project-run-store 6 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 11 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # Nest 成功初始化 LocalWorkspaceModule、ProjectsModule、AppModule；health 返回 {"service":"maker-api","status":"ok"}

    npm audit --omit=dev
    # found 0 vulnerabilities

    # Oracle 首轮修复后复验：
    npm run typecheck
    npm test
    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # 均通过；Nest 成功初始化 ProjectsModule，health 返回 {"service":"maker-api","status":"ok"}

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：events.jsonl 未校验事件结构；读取 project/run/latest-run 时未校验文件内容 id 与路径 id 一致；run steps 只校验数组；store provider 未真正注入 `LocalWorkspaceService`。
- 已修复：补充 `assertJobEventRecord`、run step 校验、读取 id 一致性校验和 provider factory 注入。
- Oracle 复审：P0/P1/P2 均无，Step 2.2 可通过代码审查门禁。
- P3：阶段日志验证计数曾保留旧值，已同步为 project-run-store 6 个测试、workspace tests 11 个测试。
- 审查模式：Oracle 复用

下一步建议：

- Step 2.3：项目状态 API 契约。基于 Project / Run Store 增加最小 `POST /api/projects/generate`、`GET /api/projects/:projectId`、`GET /api/projects/:projectId/runs/:runId/events`，只创建 CREATED 本地记录和读取状态，不接模型、编译或 QA。

### 2.3 项目状态 API 契约

完成时间：2026-06-10

已完成内容：

- 新增 `project-api.types.ts`，定义 generate/status/events 三个最小 API response 类型。
- 新增 `ProjectRequestError`，用于 API service 边界的请求校验错误。
- 新增 `ProjectsService`，实现 `generateProject`、`getProject`、`getRunEvents`。
- 新增 `ProjectsController`，暴露 `POST /api/projects/generate`、`GET /api/projects/:projectId`、`GET /api/projects/:projectId/runs/:runId/events`。
- 更新 `ProjectsModule`，注册 `ProjectsController` 和 `ProjectsService`。
- 新增 `tests/workspace/projects-service.test.ts`，覆盖 CREATED 记录创建、状态读取、事件读取、非法请求拒绝和 run/project mismatch。
- 修复真实 HTTP 冒烟发现的 controller 注入问题：`ProjectsController` 使用显式 `@Inject(ProjectsService)`，避免当前 `tsx` 启动链路下依赖 decorator metadata 推断。
- 修复 Oracle 首轮发现的 API 契约问题：默认 `run_id` 与 `project_id` 使用同一随机后缀，避免同秒跨项目 run 冲突；`ProjectRequestError` 继承 Nest `BadRequestException`，非法 body 真实 HTTP 返回 400；`getProject` 校验 `project.latest_run_id === latest_run.run_id`。

阶段结果：

- `POST /api/projects/generate` 会创建 `CREATED` 状态的 project/run 本地记录，写入 `latest-run.json`，并追加一条 `job.started` 事件。
- `GET /api/projects/:projectId` 会返回 project 和 latest_run。
- `GET /api/projects/:projectId/runs/:runId/events` 会返回 events.jsonl 事件。
- 本步未接模型、DSL 生成、编译、QA、repair、Workbench 状态流或后台 Job 编排。
- HTTP 冒烟产生的测试 project/run 记录已清理。
- 当前新增源码文件均低于 220 行；最大新增源码为 `projects.service.ts`，106 行；最大新增测试为 `project-run-store.test.ts`，171 行。

已通过验证：

    npm run test:workspace
    # local-workspace 5 个测试通过；project-run-store 6 个测试通过；projects-service 5 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 16 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    # Nest 成功映射 /api/projects/generate、/api/projects/:projectId、/api/projects/:projectId/runs/:runId/events

    node fetch HTTP smoke
    # invalid POST /api/projects/generate 返回 400 与 {"ok":false,"message":"idea is required."}
    # valid POST /api/projects/generate 返回 ok true、CREATED、project_id、run_id；project_id/run_id 使用同一随机后缀
    # GET /api/projects/:projectId 返回 ok true、project.status CREATED、latest_run.run_id
    # GET /api/projects/:projectId/runs/:runId/events 返回 ok true 和 job.started 事件
    # 本轮 HTTP smoke 创建的 local-data/projects/proj_20260609_171238_484b 与 local-data/runs/run_20260609_171238_484b 已清理

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：同秒不同 project 会共享固定 `_0001` run_id；非法 body 会返回 500 而不是 400；project.latest_run_id 与 latest_run.run_id 未做一致性校验。
- 已修复：run_id 使用随机后缀；`ProjectRequestError` 映射为 400；`getProject` 增加 latest_run 一致性校验，并补测试与 HTTP smoke。
- Oracle 复审：P0/P1/P2/P3 均无，Step 2.3 可通过代码审查门禁。
- 审查模式：Oracle 复用

下一步建议：

- Step 3：Model Provider。接入 DeepSeek JSON provider、raw output logging、timeout/retry/error mapping；仍必须让模型输出经本地 schema 校验后才能进入后续链路。

### 3.1 Model Provider 基础客户端

完成时间：2026-06-10

已完成内容：

- 新增 `model-provider.types.ts`，定义 `JsonChatParams`、模型错误码和 `GenerateJsonResult`。
- 新增 `model-provider.config.ts`，从环境变量读取 DeepSeek base URL、模型名、API key 和默认 timeout。
- 新增 `DeepSeekClient`，实现 JSON chat request、JSON output、raw response logging、空内容 retry 1 次、timeout、rate limit、provider failure、invalid JSON、missing key 错误映射。
- 新增 `ModelProviderModule` 并导入 `AppModule`，让 DeepSeek client 进入 API 模块边界。
- 新增 `tests/workspace/deepseek-client.test.ts`，覆盖 raw output 落盘、JSON parse、empty content retry、invalid JSON、rate limit、timeout、missing key。
- 修正 Step Index 中 Step 3 的禁止范围，允许 `local-data/model-outputs` raw output 写入，仍禁止 DSL Validator、IR Normalizer、编译、QA、repair 和 Workbench 状态流。
- 修复 Oracle 首轮发现的 provider 边界问题：非 JSON 429/5xx 先按 HTTP status 映射；HTTP 2xx response body 会先写入 raw output，再解析 provider envelope；missing key 会先 trim；timeout 改用 `DEEPSEEK_TIMEOUT_MS`；Step Index 边界标题层级已修正。

阶段结果：

- Model Provider 只提供可注入的 DeepSeek JSON client，尚未接入 `POST /api/projects/generate` 或任何项目流水线。
- 模型 raw response 会写入 `local-data/model-outputs/<projectId>/<runId>/<outputName>`。
- 模型返回 JSON 只解析为 `unknown`，尚未进入 Game Brief / Raw DSL schema 校验。
- 未调用真实 DeepSeek；测试使用注入的 fake fetch。
- 当前新增源码文件均低于 220 行；最大新增源码为 `deepseek.client.ts`。

已通过验证：

    npx vitest run tests/workspace/deepseek-client.test.ts
    # 1 个测试文件，3 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 19 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # Nest 成功初始化 ModelProviderModule；health 返回 {"service":"maker-api","status":"ok"}

    npm audit --omit=dev
    # found 0 vulnerabilities

    # Oracle 首轮修复后复验：
    npx vitest run tests/workspace/deepseek-client.test.ts
    # 1 个测试文件，6 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 22 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # Nest 成功初始化 ModelProviderModule；health 返回 {"service":"maker-api","status":"ok"}

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2/P3：`response.json()` 在 status 映射前执行，非 JSON 429/5xx 错误码不稳；HTTP 200 非 JSON 时 raw output 不保证落盘；timeout 错用 `QA_TIMEOUT_MS`；missing key 未 trim；测试缺少非 JSON 429/5xx 和 raw 落盘失败场景；Step Index 边界标题层级不清。
- 已修复：改为先读 `response.text()`；非 2xx 先按 status 映射；2xx raw body 先写入 raw output，再解析 provider envelope 和 content；新增 `DEEPSEEK_TIMEOUT_MS`；missing key 使用 trim；补充测试并拆分错误映射用例。
- Oracle 复审：P0/P1/P2 均无，Step 3.1 可通过代码审查门禁。
- P3：请求头曾使用未 trim 的 API key，已改为复用 trim 后的 key；文档行数旧值已改为“低于 220 行”。
- 审查模式：Oracle 复用

下一步建议：

- Step 3.2：Prompt Context Builder + Game Brief / Raw DSL provider service。构造 brief/raw DSL prompt 输入，并让模型结果先落 raw output，再经 GameBriefSchema / RawGameDslSchema 校验；不接编译、QA 或 Workbench 状态流。

### 3.2 Prompt Context Builder + Game Brief / Raw DSL provider service

完成时间：2026-06-10

已完成内容：

- 新增 `prompt-context.types.ts`，定义 Raw DSL prompt context 的稳定输入结构。
- 新增 `prompt-context.builder.ts`，按 `GameBrief.genre` 选择 collector / dodger / shooter contract，并输出 `idea`、`language`、`brief`、`selected_contract`、`allowed_enums`、`forbidden_terms`、`forbidden_fields`、`output_json_rule`、`valid_example`、`invalid_examples_summary`、`p0_scope` 和防套壳规则。
- 新增 `GameDslProviderService`，提供 `generateGameBrief` 与 `generateRawGameDsl`；`DeepSeekClient.generateJson` 返回 `unknown` 后，必须先通过 `GameBriefSchema` / `RawGameDslSchema`，才返回结构化 `value`。
- 为 Raw DSL 增加 provider boundary 一致性门禁：`game.genre`、`game.camera`、`game.difficulty`、`game.target_play_time_sec` 必须与 Game Brief 一致，防止合法但错 genre 的 DSL 穿过 selected contract 边界。
- 在 `ModelProviderModule` 中通过 factory provider 显式注入 `DeepSeekClient` 并导出 `GameDslProviderService`。
- 新增 `tests/workspace/game-dsl-provider.test.ts`，覆盖 prompt context、shooter contract 选择、Game Brief schema 成功/失败、provider failure 透传、Raw DSL schema 成功/失败、Raw DSL 与 brief 不一致失败。

阶段结果：

- Step 3.2 只在 Model Provider 边界生成并校验 Game Brief / Raw DSL，不接入 `POST /api/projects/generate`、DSL Validator、IR Normalizer、编译、QA、repair 或 Workbench 状态流。
- `MODEL_SCHEMA_VALIDATION_FAILED` 是 `GameDslProviderResult` 的局部错误语义，用于区分模型 JSON 语法失败与 provider service schema / brief 一致性失败；后续接入流水线/API 映射时需要显式处理。
- 当前新增源码与测试文件均低于 220 行；最大新增测试文件为 `game-dsl-provider.test.ts`，最大新增源码文件为 `game-dsl-provider.service.ts`。

已通过验证：

    npx vitest run tests/workspace/game-dsl-provider.test.ts
    # 1 个测试文件，8 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 30 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run maker:setup && npm run start --workspace @ai-game-maker/maker-api
    curl -sS http://127.0.0.1:3000/health
    # Nest 成功初始化 ModelProviderModule；health 返回 {"service":"maker-api","status":"ok"}
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：`GameDslProviderService` 使用结构类型注入，Nest DI token 不够稳定；Raw DSL 只过 schema，未校验返回 DSL 与 brief genre / camera / difficulty 的一致性；测试缺少 provider failure 透传和 shooter mismatch 覆盖。
- 已修复：`ModelProviderModule` 改用 factory provider 显式注入 `DeepSeekClient`；Raw DSL schema 通过后继续校验 genre、camera、difficulty、target play time 与 Game Brief 一致；补充 provider failure 透传、shooter contract 选择和 shooter brief + collector DSL 被拒测试。
- Oracle 复审：P0/P1/P2/P3 均无，Step 3.2 可通过代码审查门禁。
- 审查模式：Oracle 复用

下一步建议：

- Step 4：DSL Validator + IR Normalizer。将 Raw Game DSL 的 schema 校验、genre contract 机制校验、runtime capability 边界和 Normalized Game IR 派生收敛到本地 validator / normalizer；仍不接编译、QA、repair 或 Workbench 状态流。

### 4. DSL Validator + IR Normalizer

完成时间：2026-06-10

已完成内容：

- 新增 `validation.types.ts`，定义 DSL 校验 issue code、issue/result 类型、`ValidateAndNormalizeResult` 和 `DslValidationError`。
- 新增 `dsl-validator.ts`，实现 Raw DSL 本地校验入口：schema 校验、engine leakage / arbitrary code 映射、ID 格式、数值范围、重复 ID、引用完整性、机制合同和目标可达性。
- 新增 `mechanic-contract.validator.ts`，按 collector / dodger / shooter 分开校验核心机制；shooter 要求真实 `shoot_projectile -> projectile -> projectile_hit -> enemy damage/clear or score progress` 链路。
- 新增 `normalizer.ts`，实现 `validateAndNormalizeRawGameDsl` 和 `normalizeRawGameDsl`；只有通过 validator 后才派生 Normalized IR，并再经过 `NormalizedGameIrSchema` 复验。
- 扩展 `NormalizedGameIrSchema.runtime_requirements.objectives`，并同步 Phaser capability 支持 `none` / `time_up`，使 runtime capability check 覆盖 movement、collision、actions、objectives。
- 更新 `packages/game-dsl/src/index.ts` 导出 validator、normalizer、校验类型和 `DslValidationError`。
- 扩展 contract fixtures 和 `dsl-validator-normalizer.test.ts`，覆盖 collector / shooter 正常 IR 派生、engine leakage、任意代码字段、重复 ID、引用缺失、不可达目标、score_add=0、shooter target_score 无 score_add、反向 projectile_hit、ID/数值失败码、normalize 不能绕过验证。

阶段结果：

- Raw Game DSL 不能直接进入编译链路；Step 4 只产出可信 `game-ir-v0.1`，不调用模型、不写 `local-data`、不生成 Phaser 项目、不运行 Vite build / Playwright QA、不接 repair 或 Workbench。
- `normalizeRawGameDsl(input: unknown)` 现在内部调用完整校验，失败抛 `DslValidationError`，不提供绕过 validator 的导出路径。
- 当前 shooter `enemy.can_be_cleared` 只认 `destroy` effect，属于 P0 保守约束；后续若模板支持按血量扣减清敌，再扩展为 `damage.value >= enemy.health`。
- 当前相关源码与测试文件均低于 220 行；机制合同已拆到独立文件，避免 `dsl-validator.ts` 职责过载。

已通过验证：

    npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/contract-freeze.test.ts
    # 2 个测试文件，21 个测试通过

    npm test
    # contract tests 21 个通过；workspace tests 30 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    # Oracle P3 修复后复验：
    npx vitest run tests/contracts/dsl-validator-normalizer.test.ts
    # 1 个测试文件，10 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：`normalizeRawGameDsl` 可绕过 validator；collector target_score 未按 score_add.value 计算可达性；shooter target_score 无 score_add 可被误放行；projectile_hit 方向被对称匹配；runtime capability 未覆盖 objectives；ID/数值失败码未分层；`validation.types.ts` type-only import 仍经 index。
- 已修复：`normalizeRawGameDsl` 改为 `unknown` 输入并内部调用完整校验；score progress 要求正数 score_add 并按 count * scoreValue 判断；projectile_hit 改为有方向；IR 增加 `runtime_requirements.objectives` 并同步 Phaser capability；补充 ID/数值失败码映射和边界测试；移除 schema import 环；拆分机制合同文件。
- Oracle 复审：P0/P1/P2 均无，Step 4 可通过代码审查门禁。
- P3：`DslValidationError` 未设置 `name` 已修复；`enemy.can_be_cleared` 只认 `destroy` 是当前 P0 保守约束，记录为后续可扩展点。
- 审查模式：Oracle 复用

下一步建议：

- Step 5：Phaser Templates。实现 collector / dodger / shooter 三个确定性模板的最小 runtime kernel、template manifest 对齐、telemetry emit 和 QA bridge；仍不接 Compiler + Build + Preview、Playwright QA 或 repair。

### 5. Phaser Templates

完成时间：2026-06-10

已完成内容：

- 新增 `templates/phaser/shared/kernel.ts`，提供 RuntimeState、TelemetrySystem、GameStateSystem、InputSystem、MovementSystem、SpawnSystem、CollisionSystem、ScoreSystem、ObjectiveSystem、QaBridge 和 runtime 暴露边界。
- 新增 collector / dodger / shooter 的 `src/template-params.ts`、`src/GameScene.ts`、`src/main.ts` 源码骨架。
- 三个 template manifest 增加 `source_files`、`shared_files`、`required_telemetry_all`、`required_telemetry_any_groups`，并与 genre contract 对齐。
- collector 模板提供 `collectItem` 链路；dodger 模板提供 `dodgeFrame` / `hitHazard` 链路；shooter 模板提供 `fire` / `hitEnemy` 链路并用 `projectileInFlight` 防止未 fire 先 hit。
- `__GAME_TELEMETRY__` 只暴露 telemetry / state snapshot；`QaBridge.telemetry()` 和 `__GAME_TELEMETRY__.events` 都返回逐条复制的 telemetry，不暴露内部可变 event 引用。
- 新增 `tests/contracts/phaser-templates.test.ts`，覆盖 manifest 源文件、telemetry contract、shared QA bridge、genre 关键 gameplay telemetry、telemetry snapshot 只读性、restart deterministic state 和 shooter fire-before-hit 行为。

阶段结果：

- Step 5 只补模板源码骨架和模板合同测试，不接 Compiler + Build + Preview、不运行 Vite build / Playwright QA、不写 `local-data`、不接 repair 或 Workbench。
- SpawnSystem 不发非 schema 事件 `enemy.spawned`；enemy spawn 是模板内部状态，不作为 P0 telemetry contract。
- QA Bridge 只能 start / restart / snapshot / telemetry，不能直接写 telemetry 或直接标记 win。
- 当前相关模板源码、manifest 和测试文件均低于 220 行。

已通过验证：

    npx vitest run tests/contracts/phaser-templates.test.ts
    # 1 个测试文件，7 个测试通过

    npm test
    # contract tests 28 个通过；workspace tests 30 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：`__GAME_TELEMETRY__` 暴露可变 state/events；restart 未恢复 health / genre-specific state；shooter `hitEnemy` 可在未 `fire` 时产生 `enemy.hit`；测试只有源码字符串断言。
- 已修复：runtime 暴露改为 snapshot getter；restart 恢复 `health/maxHealth`、score、frame；shooter restart 清零 `enemiesCleared` / `projectileInFlight`，`hitEnemy` 必须先消费 `projectileInFlight`；新增轻量实例化行为测试。
- Oracle 复审再次发现 P1：telemetry 数组虽然是 copy，但 event object 仍是内部引用。
- 已修复：`QaBridge.telemetry()` 和 `__GAME_TELEMETRY__.events` getter 都返回 `cloneTelemetry()`，event 与 payload 都复制；测试覆盖修改返回 event 不污染真实 telemetry。
- Oracle 最终复审：P0/P1/P2/P3 均无，Step 5 可通过代码审查门禁。
- 审查模式：Oracle 复用

下一步建议：

- Step 6：Compiler + Build + Preview。实现 IR 选择模板、写入 generated project、生成 params / main / scene 文件、执行或准备 Vite build、记录 build logs，并通过 Nest 静态 preview 暴露 dist；仍不接 Playwright QA 或 repair。

### 6. Compiler + Build + Preview

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api/src/compiler/compiler.types.ts`，定义 runtime compile、build runner 和命令执行边界类型。
- 新增 `TemplateCompilerService`，从 `NormalizedGameIrSchema` 选择 collector / dodger / shooter template，并写入 `generated-projects/<projectId>/`。
- `TemplateCompilerService` 默认 template root 从 `LocalWorkspaceService.getRootDir()/templates/phaser` 派生，不依赖 `process.cwd()`；同 `projectId` 重新编译前会清理旧 generated project，避免模板残留。
- 生成项目会写入 template 源码、`shared/kernel.ts`、`template-params.generated.json`、`package.json`、`index.html` 和 `vite.config.ts`；HTML 入口使用相对路径，Vite `base` 为 `./`。
- 新增 `ViteBuildRunnerService`，只允许构建 `workspace.getGeneratedProjectDir(projectId)`，执行 `npm exec vite build -- <projectDir>`，并把 stdout / stderr 写入 `local-data/build-logs/<projectId>/<runId>.log`。
- build runner 对 spawn / exec 非 numeric error code 映射为失败，并保留 `error.message` 到 stderr/log。
- 新增 `PreviewController` 和 `CompilerModule`，通过 `/preview/<projectId>/index.html` 暴露 `generated-projects/<projectId>/dist/index.html`。
- 扩展 `LocalWorkspaceService` 路径能力，新增 generated project、dist 和 build log 路径，并让默认 workspace root 从当前目录向上定位包含 workspaces 的 repo root。
- 新增 `tests/workspace/compiler-service.test.ts`，覆盖模板生成、API package cwd 下模板解析、重复生成清理、build log 成功/失败、projectDir/projectId 边界和 preview dist 路径。
- 扩展 `tests/workspace/local-workspace.service.test.ts`，覆盖 generated project、dist 和 build log 路径。

阶段结果：

- Step 6 已打通本地 `Normalized IR -> generated project -> Vite build -> preview index` 的最小链路。
- Preview 只暴露当前 generated project 的 dist index；未引入 Playwright QA、telemetry gate 执行、Auto Repair、Workbench 完整状态流或模型调用。
- Build 日志固定落在 `local-data/build-logs/<projectId>/<runId>.log`，构建目录必须和 projectId 精确匹配。
- 当前新增 compiler/API 源码文件均低于 220 行；最大相关测试文件为 `tests/workspace/compiler-service.test.ts`，141 行。

已通过验证：

    npx vitest run tests/workspace/compiler-service.test.ts
    # 1 个测试文件，7 个测试通过

    npx vitest run tests/workspace/local-workspace.service.test.ts tests/workspace/compiler-service.test.ts
    # 2 个测试文件，12 个测试通过

    npm test
    # contract tests 28 个通过；workspace tests 37 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npx tsx --eval "<TemplateCompilerService smoke>"
    # 使用 collector Raw DSL 归一化后的 IR 成功生成 generated-projects/proj_step6_build_smoke

    npm exec vite build -- generated-projects/proj_step6_build_smoke
    # Vite 真实 build 成功，生成 dist/index.html 和 dist/assets/*

    npx tsx --eval "<ViteBuildRunnerService smoke>"
    # 默认 build runner 返回 ok true，并写入 local-data/build-logs/proj_step6_build_smoke/run_step6_build_smoke.log

    npm run start --workspace @ai-game-maker/maker-api
    curl -i http://localhost:3000/preview/proj_step6_build_smoke/index.html
    curl -s http://localhost:3000/health
    # preview 返回 HTTP 200，health 返回 {"service":"maker-api","status":"ok"}
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

审查门禁结论：

- Oracle 只读审查首轮发现 P1：compiler 默认 templateRoot 依赖 `process.cwd()`；build runner 只校验 projectDir 在 workspace 内，未绑定到当前 projectId。
- Oracle 首轮还发现 P2：默认 `execFile` runner 在非 numeric error code 时可能误报成功；同 projectId 重编译不清理旧 generated project。
- 已修复：template root 改为从 workspace root 派生；build runner 要求 `resolve(projectDir) === workspace.getGeneratedProjectDir(projectId)`；非 numeric exec error 映射为 exitCode 1；compile 前清理 outputDir；补充对应测试。
- 真实 Vite build smoke 发现 CLI 契约问题：`vite build` 的 root 是位置参数，不支持 `--root`。已修正为 `npm exec vite build -- <projectDir>`，并用真实 Vite build 和默认 build runner smoke 复验。
- Oracle 复审：P0/P1/P2 均无，Step 6 可通过代码审查门禁。
- P3：默认 `execFile` runner 的非 numeric error 分支未直接以真实 spawn 失败覆盖；当前实现逻辑明确，后续如需要可通过注入底层命令或拆出 runner 单测补强。
- 审查模式：Oracle 复用

下一步建议：

- Step 7：Playwright QA。实现 deterministic QA runner、preview 页面自动化、telemetry gate 判定和 QA report 写入；仍不接 Auto Repair 或 Workbench 完整状态流。

### 7. Playwright QA

完成时间：2026-06-10

已完成内容：

- 新增本地 QA dev dependency `playwright`，并安装 Chromium 浏览器二进制用于真实浏览器验收。
- 三个 Phaser template 的 `src/main.ts` 增加 deterministic 键盘输入映射：collector 用 Enter / ArrowRight / r，dodger 用 Enter / ArrowRight / h / r，shooter 用 Enter / Space / ArrowRight / r。
- QA bridge 保持 Step 5 冻结边界，只暴露 start / restart / snapshot / telemetry；Playwright 通过真实页面键盘事件触发 runtime 方法，不直接写 telemetry 或直接标记胜负。
- 新增 `apps/maker-api/src/qa/qa.types.ts`，定义 QA report、browser runner、gate evaluation 和失败码。
- 新增 `PlayableQaGateService`，复用 `playable-qa-gate-v0.1.json`，按 common + genre `all` 以及 `any_groups` 语义判定 telemetry gate。
- 新增 `playwright-browser-runner.ts`，打开 preview URL 并追加 `?qa=1&seed=golden`，等待 QA bridge，执行 genre-specific 键盘序列，读取 telemetry，并用 `TelemetryEventSchema` 解析浏览器返回事件。
- 新增 `PlaywrightQaRunnerService`，合并 browser runner 结果与 gate 结果，写入 `local-data/qa-reports/<projectId>/<runId>.json`。
- 新增 `QaModule` 并导入 `AppModule`。
- 真实 QA 发现 Vite build assets 404 后，补充 `PreviewController` 的 `/preview/:projectId/assets/:fileName` 路由，限制只能服务 `generated-projects/<projectId>/dist/assets` 下的单段文件。
- 新增 `tests/workspace/playwright-qa-runner.test.ts`，覆盖 gate all/any_groups、PASSED report、REQUIRED_TELEMETRY_MISSING report 和 QA_BRIDGE_MISSING report。
- 扩展 `tests/contracts/phaser-templates.test.ts`，覆盖 deterministic keyboard input 映射。

阶段结果：

- Step 7 已打通 `preview page -> Playwright keyboard input -> runtime telemetry -> telemetry gate -> QA report` 的最小闭环。
- collector、dodger、shooter 三类真实 E2E smoke 均返回 `PASSED`，且 `missing_events` / `missing_any_groups` 为空。
- QA report 保留 observed events、missing events、missing any groups、console errors、snapshot、failure code、message 和 started/completed timestamp。
- 本阶段未接 Auto Repair、Workbench 完整状态流、模型调用或 DSL/IR 修改。
- 当前新增 QA 源码文件均低于 220 行；最大相关源码为 `playwright-browser-runner.ts`。

已通过验证：

    npx vitest run tests/workspace/playwright-qa-runner.test.ts
    # 1 个测试文件，4 个测试通过

    npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/contracts/phaser-templates.test.ts
    # 2 个测试文件，12 个测试通过

    npx vitest run tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts tests/contracts/phaser-templates.test.ts
    # 3 个测试文件，19 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # contract tests 29 个通过；workspace tests 41 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    npx playwright install chromium
    # 安装 Chromium / headless shell / ffmpeg 到本机 Playwright cache

    npx tsx --eval "<compile and build collector/dodger/shooter smoke>"
    # proj_step7_collector_smoke、proj_step7_dodger_smoke、proj_step7_shooter_smoke 均 compile/build 成功

    npm run start --workspace @ai-game-maker/maker-api
    npx tsx --eval "<PlaywrightQaRunnerService collector/dodger/shooter smoke>"
    # collector/dodger/shooter 均 status: PASSED，missing_events 和 missing_any_groups 为空
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

审查门禁结论：

- Oracle 只读审查首轮发现 P2：页面加载成功但 QA bridge 缺失时会被误报为 `PREVIEW_LOAD_FAILED`。
- 已修复：`page.goto()` 与 QA bridge wait 分开映射；加载失败返回 `PREVIEW_LOAD_FAILED`，bridge wait 失败且无 console error 返回 `QA_BRIDGE_MISSING`，有 console error 返回 `FATAL_CONSOLE_ERROR`；`message` 会进入最终 QA report。
- 同步补充 `QA_BRIDGE_MISSING` report 语义测试。
- Oracle 复审：P0/P1/P2 均无，Step 7 可通过代码审查门禁。
- P3：真实 browser runner 的 bridge wait 分支未直接用 Playwright failure fixture 覆盖；`chromium.launch()` 失败仍会在外层 try 之前抛出，不生成 QA report。当前本机已安装 Chromium 且真实 smoke 通过，后续如需要可收敛为环境失败 report。
- 审查模式：Oracle 复用

下一步建议：

- Step 8：Auto Repair。实现 QA/validation 失败后的 DSL patch repair 流程、最多 2 次修复限制和 repair report；仍不接 Workbench 完整状态流。

### 8. Auto Repair

完成时间：2026-06-10

已完成内容：

- 新增 `DslPatchSchema`，冻结 `game-dsl-patch-v0.1` patch schema，并从 `packages/game-dsl/src/index.ts` 导出。
- `LocalWorkspaceService` 新增 `getRepairReportPath(projectId, runId)`，repair report 固定写入 `local-data/repair-reports/<projectId>/<runId>.json`。
- 新增 `apps/maker-api/src/repair/dsl-repair.types.ts`，定义 `MAX_REPAIR_ATTEMPTS = 2`、repair input/report/attempt 类型。
- 新增 `dsl-patch-apply.ts`，安全应用 DSL patch；禁止修改 `dsl_version`、`game.genre`、template 相关路径，并按 path segment 拒绝 `__proto__`、`prototype`、`constructor`。
- 新增 `dsl-repair-recipes.ts`，提供本地确定性 repair recipe，覆盖 collector / dodger / shooter 常见缺失机制：collectible、hazard、projectile、enemy、collision、action、objective reachability。
- 新增 `DslRepairService`，执行 `create patch -> apply patch -> validateAndNormalizeRawGameDsl -> write repair report`；attempt 必须是整数且范围为 1..2，否则返回 `REPAIR_FAILED`。
- 新增 `RepairModule` 并导入 `AppModule`。
- 新增 `tests/workspace/dsl-repair-service.test.ts`，覆盖 shooter 缺 projectile/collision 修复、collector scoring reachability 修复、attempt 边界、protected path 和 prototype pollution path。
- 扩展 `tests/workspace/local-workspace.service.test.ts`，覆盖 repair report path。

阶段结果：

- Step 8 已提供受限 DSL patch repair 能力，repair 后必须重新进入 `validateAndNormalizeRawGameDsl`，不提供绕过 validator / IR 的出口。
- repair service 的 `REPAIRED` 只表示 DSL validation/normalization 通过；真实 compile/build/QA 仍由外部流水线继续执行。
- 本阶段未直接修改 runtime telemetry、未跳过 QA、未接 Workbench 完整状态流、未调用真实模型。
- 当前 repair 相关源码文件均低于 220 行；最大新增源码为 `dsl-repair-recipes.ts`，171 行。

已通过验证：

    npx vitest run tests/workspace/dsl-repair-service.test.ts tests/workspace/local-workspace.service.test.ts
    # 2 个测试文件，9 个测试通过

    npx vitest run tests/workspace/dsl-repair-service.test.ts
    # 1 个测试文件，5 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # contract tests 29 个通过；workspace tests 46 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    npx tsx --eval "<repair shooter missing projectile smoke>"
    # 删除 shooter projectile 和 collision 后，repair 返回 REPAIRED；repaired_dsl 重新 validate/normalize 通过；compile/build 成功

    npm run start --workspace @ai-game-maker/maker-api
    npx tsx --eval "<PlaywrightQaRunnerService repaired shooter smoke>"
    # repaired shooter preview 真实 QA 返回 PASSED，missing_events 和 missing_any_groups 为空
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

审查门禁结论：

- Oracle 只读审查首轮发现 P1：patch path 未拒绝 `__proto__` / `prototype` / `constructor`，存在 prototype pollution 风险。
- Oracle 首轮还发现 P2：attempt 只拒绝 `> MAX_REPAIR_ATTEMPTS`，未拒绝 0、负数或非整数。
- 已修复：`assertAllowedPatchPath()` 按 segment 拒绝 `__proto__`、`prototype`、`constructor`；`DslRepairService.repair()` 要求 attempt 为整数且 `1 <= attempt <= MAX_REPAIR_ATTEMPTS`；补充 `__proto__.polluted` 和 attempt=0 测试。
- Oracle 复审：P0/P1/P2 均无，Step 8 可通过代码审查门禁。
- P3：prototype pollution 测试只直接覆盖 `__proto__`，实现同时拒绝 `prototype` / `constructor`；后续可参数化补强。
- 审查模式：Oracle 复用

下一步建议：

- Step 9：Workbench UI 收尾。实现状态 timeline、preview iframe、QA report、telemetry summary、build log 和 error message 展示；消费既有 API/文件契约，不另造前端私有协议。

### 9. Workbench UI 收尾

完成时间：2026-06-10

已完成内容：

- API 新增最小报告读取端点：`GET /api/projects/:projectId/runs/:runId/qa-report`、`repair-report`、`build-log`。
- `ProjectsService` 读取 QA report、repair report 和 build log 前，会先执行 run ownership 校验，再通过 `LocalWorkspaceService` 派生固定路径。
- `main.ts` 新增本地 CORS middleware：Workbench origin 可访问 API；`Origin: null` 仅允许 `GET/OPTIONS` 且仅限 `/preview/...`，用于 sandbox iframe 加载 preview index/assets。
- Workbench 从骨架改为本地控制台，包含 Generate、Project ID / Run ID、Refresh、Timeline、preview iframe、QA、Telemetry summary、Repair、Events 和 Build Log。
- Workbench iframe 使用 `sandbox="allow-scripts"`，未加 `allow-same-origin`、`allow-forms` 或 `allow-popups`。
- 新增 `apps/maker-workbench/src/workbench-api.ts`，收敛 API base、response 类型、request helper 和 telemetry summary helper。
- 新增 `apps/maker-workbench/src/styles.css`，提供 Workbench 双栏/响应式布局。
- 扩展 `tests/workspace/projects-service.test.ts`，覆盖 QA report、repair report、build log 读取和 run ownership 失败。

阶段结果：

- Step 9 已实现可本地演示的 Workbench UI，消费既有 project/run/report/log/preview 契约，不另造前端私有协议。
- 本阶段未改模型、DSL Validator、IR Normalizer、Compiler、QA 或 Repair 核心语义。
- 本阶段未新增登录、权限、多用户、数据库、云部署或生产发布能力。
- 当前 Workbench / API 相关源码文件均低于 220 行。

已通过验证：

    npx vitest run tests/workspace/projects-service.test.ts
    # 1 个测试文件，6 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # contract tests 29 个通过；workspace tests 47 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    curl -i -H 'Origin: http://127.0.0.1:5174' http://localhost:3000/api/projects/proj_step9_ui_smoke
    # 返回 Access-Control-Allow-Origin: http://127.0.0.1:5174

    curl -i -H 'Origin: null' http://localhost:3000/api/projects/proj_step9_ui_smoke
    # 返回 200 但不含 Access-Control-Allow-Origin，浏览器无法读取 API 响应

    curl -i -H 'Origin: null' http://localhost:3000/preview/proj_step9_ui_smoke/index.html
    # 返回 Access-Control-Allow-Origin: null，Access-Control-Allow-Methods: GET,OPTIONS

    npm run start --workspace @ai-game-maker/maker-api
    npm run dev --workspace @ai-game-maker/maker-workbench
    # Workbench 因 5173 被占用自动切到 http://127.0.0.1:5174/

    node --input-type=module "<Workbench desktop Playwright smoke>"
    # 页面显示 PLAYABLE、PASSED、score.changed、vite build；iframe 存在；consoleErrors 为空

    node --input-type=module "<Workbench mobile Playwright smoke>"
    # 390x844 无横向 overflow；consoleErrors 为空
    # 截图：local-data/workbench-step9-smoke.png、local-data/workbench-step9-mobile-smoke.png
    # 验收后手动 Ctrl-C 停止服务；API 退出码 130、Workbench 退出码 1 均为手动停服

审查门禁结论：

- Oracle 只读审查首轮发现 P1：`Origin: null` 被全局放行到 API 和 POST，范围超过 sandbox iframe 加载 preview assets 的需要。
- 已修复：Workbench origin 可访问 API；`Origin: null` 只允许 `/preview/...` 的 `GET/OPTIONS`；`/api/*` 携带 `Origin: null` 时不设置 `Access-Control-Allow-Origin`；不允许的 preflight 返回 403。
- Oracle 复审：P0/P1/P2 均无，Step 9 可通过代码审查门禁。
- P3：CORS 行为当前由 curl/browser smoke 覆盖，后续可补轻量 middleware 测试锁住分支。
- 审查模式：Oracle 复用

Step 9 阶段结果：

- Step 0 到 Step 9 已按 review-gated 流程完成代码实现、验证、Oracle/Sentinel 审查和文档沉淀。

### 10. P0 主链路修复

完成时间：2026-06-10

已完成内容：

- 修复 `POST /api/projects/generate` 只创建 Project / Run 的缺口，新增 `GenerationPipelineService` 串联 `idea -> DSL -> DSL validation -> IR -> Phaser/Vite project -> npm install/build -> preview artifact -> Playwright QA -> final status`。
- 新增 deterministic local DSL fallback：无 `.env` / 模型不可用 / provider 抛错时，本地仍能生成可验证 DSL；“做一个小猫射击外星人的小游戏”会进入 shooter 主链路。
- `TemplateCompilerService` 统一生成 `generated-projects/<projectId>/package.json`、`index.html`、`src/main.ts` 和模板源码，`ViteBuildRunnerService` 在生成项目目录执行 `npm install --package-lock=false` 与 `npm run build`。
- build 成功后检查 `generated-projects/<projectId>/dist/index.html`；缺失时状态收敛为 `PREVIEW_ARTIFACT_MISSING`，构建失败或 compiler/build runner 抛错时状态收敛为 `BUILD_FAILED`。
- QA runner 正常失败和启动级异常均会写 QA report；启动级异常写入最小 `QA_FAILED` report，failure code 为 `QA_RUNNER_FAILED`。
- Timeline 记录主链路关键事件：`dsl.generated`、`ir.generated`、`project.generated`、`build.started`、`build.success` / `build.failed`、`qa.started`、`qa.passed` / `qa.failed`。
- Workbench 增加非终态轮询，并按 run status 条件读取 QA / build / repair report，避免不存在的可选 report 产生 404 控制台噪音。
- 新增 `tests/workspace/generation-pipeline.smoke.test.ts`，覆盖“小猫射击外星人”到 `dist/index.html`、preview 200、QA report PASSED 和关键 events。
- 新增 `tests/workspace/generation-pipeline.service.test.ts`，覆盖 compiler 抛异常、build 成功但 preview artifact 缺失、QA runner 抛异常等失败收敛路径。

阶段结果：

- Generate 主链路已不再停留在 `CREATED`；happy path 最终返回 `PLAYABLE`，QA 失败返回 `QA_FAILED`，构建/预览 artifact 失败返回 `BUILD_FAILED` 或 `PREVIEW_ARTIFACT_MISSING`。
- Preview endpoint 继续优先服务 `generated-projects/<projectId>/dist/index.html`。
- 当前实现仍保持本地 P0 范围；未新增数据库、队列、后台 worker、多用户、权限或云部署能力。

已通过验证：

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npx vitest run tests/workspace/generation-pipeline.smoke.test.ts
    # 1 个测试通过；真实生成 dist/index.html，preview 200，QA report PASSED

    npx vitest run tests/workspace/generation-pipeline.service.test.ts
    # 3 个测试通过；覆盖 BUILD_FAILED、PREVIEW_ARTIFACT_MISSING、QA_FAILED report 兜底

    npm test
    # contract tests 29 个通过；workspace tests 51 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    curl -sS -X POST http://localhost:3000/api/projects/generate \
      -H 'Content-Type: application/json' \
      -d '{"idea":"做一个小猫射击外星人的小游戏","language":"zh"}'
    # 返回 status: PLAYABLE

    curl -sS -o /dev/null -w '%{http_code}\n' \
      http://localhost:3000/preview/<projectId>/index.html
    # 返回 200

    node --input-type=module "<Workbench Generate Playwright smoke>"
    # 页面显示 PLAYABLE、PASSED、build.success；iframeCount=1；console errors=[]

审查门禁结论：

- Sentinel / Oracle 首轮发现 P1：pipeline 缺少阶段级异常收敛，异常可能卡在 `DSL_GENERATING`、`COMPILING`、`BUILDING` 或 `QA_RUNNING` 等中间态。
- Sentinel / Oracle 首轮发现 P1：QA runner 启动级异常时 QA report 不一定落盘。
- 已修复：provider 抛错进入 deterministic fallback；compiler/build runner 异常收敛到 `BUILD_FAILED` 并写 `build.failed`；QA runner 异常写最小 `QA_FAILED` report、收敛到 `QA_FAILED` 并写 `qa.failed`。
- Sentinel / Oracle 复审：P0/P1/P2 均无，代码门禁通过。
- P3：后续可继续补模型 provider throw 的直接测试，以及在 failure tests 中同时断言 `run.json` / `latest-run.json` 状态一致性。
- 审查模式：Oracle 复用

最终结果：

- Step 0 到 Step 9 加 P0 主链路修复均已按 review-gated 流程完成代码实现、验证、Sentinel/Oracle 审查和文档沉淀。

### 11. P0 模型 DSL 视觉执行复核修复

完成时间：2026-06-10

已完成内容：

- 复核真实模型“做一个坦克大战小游戏”链路，确认模型 Raw DSL 已输出 `坦克`、`炮弹`、`敌方坦克`、`battlefield`，但旧 shooter 模板硬编码 `drawCatPlayer` / `drawAlienEnemy`，导致浏览器画面只改 label、不执行 DSL 视觉语义。
- 新增 `packages/game-dsl/src/template-visual-params.ts`，在 validated Raw DSL 到 IR template params 的边界层，按 label 优先、theme 兜底派生 shooter primitive visual：`cat`、`alien`、`tank`、`ship`、`circle` 以及 projectile 的 `bolt`、`shell`、`beam`。
- `packages/game-dsl/src/normalizer.ts` 在 shooter `template_params.params` 写入 `player.visual`、`projectile.visual`、`enemy.visual`，让模型 DSL 中的实体语义进入 Phaser deterministic template。
- 新增 `templates/phaser/shooter/src/template-visuals.ts`，使用 P0 允许的 circle / rectangle / triangle / text label / simple color 绘制不同 primitive visual；`GameScene.ts` 移除固定猫/外星人绘图，改为执行 `drawShooterPlayer`、`drawShooterEnemy`、`drawShooterProjectile`。
- `templates/phaser/shooter/src/main.ts` 对 nested `visual` 做默认值深合并，保证旧 generated params 缺少 visual 时仍可用默认 primitive visual。
- `templates/phaser/shooter/template-manifest.json` 和 `TemplateCompilerService` 纳入 `template-visuals.ts`，确保生成项目复制并报告新增模板源码。
- 扩展合同测试，覆盖坦克大战 DSL 派生 `tank/shell/tank`、label 优先于 broad theme、projectile theme fallback、shooter renderer 不再固定猫/外星人、compiler 复制 `template-visuals.ts`。

阶段结果：

- 真实模型链路现在可从 DeepSeek Raw DSL 生成 `坦克/炮弹/敌方坦克` template params，并在浏览器预览中显示双方坦克和炮弹 primitive shape。
- 本次只修复 shooter 模板执行 DSL 视觉参数的 P0 缺口；未让 LLM 生成 Phaser 源码，未引入图片、外部 URL、素材下载、新依赖或新玩法。
- Telemetry、QA gate、project/run 状态机和 Workbench API 契约保持不变。

已通过验证：

    npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/compiler-service.test.ts
    # 3 个测试文件，32 个测试通过

    npm test
    # contract tests 36 个通过；workspace tests 59 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npx tsx "<临时真实 DeepSeek 坦克大战端到端 smoke 脚本>"
    # DeepSeek deepseek-v4-flash 生成 Game Brief / Raw DSL
    # result.status = PLAYABLE
    # generated labels: 坦克 / 炮弹 / 敌方坦克
    # generated visuals: tank / shell / tank
    # QA status = PASSED，visual_status = PASSED，screenshot_size = 21806

审查门禁结论：

- Oracle 首轮审查发现 P1：renderer 未覆盖完整 `cat | alien | tank | ship | circle` entity visual kind；projectile visual 仍可能被 theme 覆盖 label。
- 已修复：player/enemy 绘制统一进入 `drawEntity`，完整覆盖 `tank`、`alien`、`cat`、`ship` 并默认 `circle`；projectile visual 改为 label 优先、theme 兜底。
- Oracle 复审发现 P2：缺少 `circle` 默认渲染路径和 projectile theme fallback 测试。
- 已修复：补充 `drawCircleEntity` 合同断言，以及 `Round + battlefield -> shell` normalizer 测试。
- Oracle 最终复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用

最终结果：

- P0 复核缺口已关闭：当前链路不再只是“模型换 label”，而是 `LLM Raw DSL -> validated IR template_params -> Phaser primitive visual execution -> browser playable -> QA PASSED`。

### 12. DSL-first P1 Step 6：Shooter enemy wave runtime_plan 薄片

完成时间：2026-06-11

目标与边界：

- 选择 shooter 做一个小但收益高的闭环：大模型仍只生成 Raw Game DSL；normalizer 从 Raw DSL 的 enemy count / health / movement speed、`game.difficulty`、`target_play_time_sec` 派生 `runtime_plan.enemy_waves`；Phaser shooter runtime 执行该 IR；QA 证明玩法链路真实消费了 runtime_plan。
- 不新增 Raw DSL 字段，不允许模型输出 `runtime_plan` / `enemy_waves`，不新增 `enemy.spawned` telemetry，不把模板改成绕过 DSL 的“完美模板”。

已完成内容：

- `NormalizedGameIrSchema` 新增 shooter-only `runtime_plan.enemy_waves`，严格限定 `derived_from` 字段列表、`right_edge_wave` strategy、数值范围、最多 1 条 wave，并拒绝非 shooter genre 携带 enemy waves。
- `normalizer` 新增 `buildShooterEnemyWaves(...)`，从现有 Raw DSL 派生 `entity_id`、`count`、`max_active`、`interval_ms`、`speed_multiplier`，并保持 `template_params.enemy` 只作为 label/visual/base stats/default fallback。
- compiler 为 shooter 复制 `shooter-runtime-plan.ts` 并写入 `shooter/src/runtime-plan.generated.json`。
- shooter runtime 新增 `resolveShooterEnemyWave(...)`，`advanceShooterWorld(...)` 用 resolved wave 控制 spawn budget、`maxActive`、interval 和 enemy speed multiplier。
- enemy 实例保存 `entityId`、`waveSource`、`strategy`、`speedMultiplier`；`enemy.hit` / `enemy.cleared` payload 从 enemy state 发出，QA 不依赖全局猜测。
- `GameScene` 的 QA snapshot 新增 `enemyWavePlan`，Playwright QA 在 source 为 `runtime_plan` 时验证 `maxActive` 与 hit/clear telemetry 元数据匹配。
- prompt context 仅轻量提示模型不要输出 runtime fields，并说明 shooter enemy pressure 由 runtime 从 Raw DSL facts 派生。

已通过验证：

    npm run test:contracts
    # 3 个测试文件，58 个测试通过

    npm run test:workspace -- --run tests/workspace/compiler-service.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 11 个测试文件，94 个测试通过，包含 shooter enemyWavePlan QA 正负例

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npx tsx "<临时真实 DeepSeek shooter 端到端脚本>"
    # DeepSeek deepseek-v4-flash 生成 Game Brief / Raw DSL，未走 deterministic fallback
    # projectId = proj_20260611_step6_shooter_20260610170325
    # runId = run_20260611_step6_shooter_20260610170325
    # Raw DSL: genre=shooter, title=小猫太空射击, enemy alien count=12, hasRuntimePlan=false
    # runtime-plan.generated.json: enemy_waves[0] entity_id=alien, count=12, max_active=3, interval_ms=600, speed_multiplier=1.15
    # QA report: status=PASSED, visual_status=PASSED；observed enemy.hit / enemy.cleared / score.changed / game.restarted

阶段结果：

- 当前 shooter 链路已经是 `LLM Raw DSL -> validator/normalizer -> runtime_plan.enemy_waves -> compiler generated runtime plan -> shooter runtime execution -> Playwright QA PASSED`。
- QA report 只保存 observed events 与 snapshot，不保存完整 telemetry payload；payload 匹配由 `tests/workspace/playwright-qa-runner.test.ts` 的正负例覆盖。

审查门禁结论：

- Oracle 首轮复审发现 P1：shooter 的 `runtime_plan.enemy_waves[0].count` 与胜利目标未绑定，可能出现 enemy wave 最多刷 6 个但 `enemy_cleared.target=99` 或 `target_score` 依赖 secondary enemy 的不可胜利 DSL。
- 已修复：`validateObjectiveReachability` 增加 shooter 分支，`enemy_cleared.target` 必须小于等于 primary enemy count；`target_score` 只能按 primary enemy `projectile_hit` score budget 判断可达。
- 已修复：shooter mechanic contract 要求当前 P0 runtime envelope 下恰好一个 primary enemy 和一个 primary projectile；provider prompt scope 同步拒绝模型输出多个 shooter enemy/projectile。
- 已修复：provider 的 unreachable shooter `target_score` normalize 逻辑改为只按 primary enemy score budget 计算，并同步更新 prompt 文案。
- 已补测试：`enemy_cleared target > primary enemy count` 负例、multi-enemy `target_score` 负例、primary enemy budget 可达正例，以及 provider 多 enemy 拒绝用例。
- P1 修复后验证：

    npm run test:contracts
    # 3 个测试文件，60 个测试通过

    npm run test:workspace -- --run tests/workspace/game-dsl-provider.test.ts tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts
    # 11 个测试文件，95 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

- Oracle 复审：原 P1 已关闭，未发现新的 P0/P1/P2，代码门禁通过。
- Oracle 只读复现确认：`enemy_cleared target=99` 返回 `UNREACHABLE_OBJECTIVE`；multi-enemy `target_score=14` 返回 `enemy.single_primary` 和 primary wave 不可达错误；multi-projectile 返回 `projectile.single_primary`；primary enemy 可达 `target_score=6` 仍可通过；provider unreachable `target_score=10` 会 normalize 为 `enemy_cleared target=6`。
- P3：provider 对 shooter 多 enemy/projectile 的顶层 message 仍复用 `Raw Game DSL uses unsupported spawn generation scope.`，但 `issues` 中已有精确原因，不阻塞本次门禁。

### 13. AI Game Art Asset Metadata v0.1 Step 0：需求拆分与文档入口

完成时间：2026-06-12

已完成内容：

- 新增 `docs/refactor-log/ai-game-art-asset-metadata-v0.1-index.md`，把外部 metadata 规范拆成 metadata v0.1 的目标、边界、推荐工程落点和 Step 0-6 分步计划。
- 新增 `docs/refactor-log/ai-game-art-asset-metadata-v0.1-step-0-requirement-map.md`，记录需求分层、字段范围、runtime export 白名单 / 排除项、非目标和后续 Step 1 边界。
- 更新 `docs/refactor-log/ai-game-dsl-p0-step-index.md`，增加 Metadata v0.1 独立入口，并把过期的“提交 Step 8a”下一步改成 Asset Semantic Fidelity Step 8b / 8c 与 Metadata v0.1 Step 1 并列说明。

阶段结果：

- 本步只完成文档拆分和门禁入口，不修改源码、测试、脚本、package scripts 或现有 asset pack。
- 未改变 `AssetPlan`、`AssetManifest`、resolver ranking、fallback、repair、QA、Workbench 或 Phaser runtime。
- Metadata v0.1 被拆为独立 infrastructure 工作；Asset Semantic Fidelity Step 8b / 8c 仍保留为资源扩展主线，不和 metadata 工作混成一个大改。
- 文档行数：index 83 行，requirement map 166 行，step index 137 行。

已通过验证：

    git diff --check

审查门禁结论：

- Oracle 首轮审查：P0/P1/P2 均无。
- Oracle 首轮 P3：Step Index 顶部仍写“提交 Step 8a”，与 Step 8a 已完成及 Metadata v0.1 下一步冲突。
- 已修复：Step Index 顶部改为并列说明 Asset Semantic Fidelity Step 8b / 8c 和 Metadata v0.1 Step 1。
- Oracle 复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 新建后复用。

当前下一步：

- Metadata v0.1 Step 1：schema / controlled vocabulary / examples / contract tests。
- Asset Semantic Fidelity 主线若继续扩展，仍先做 Step 8b canary fixture promotion，再做 Step 8c 小包资源扩展。

### 14. AI Game Art Asset Metadata v0.1 Step 1：Schema / Vocabulary / Examples

完成时间：2026-06-12

已完成内容：

- 新增 `packages/asset-pipeline/src/art-asset-metadata.vocabulary.ts`，集中定义 v0.1 controlled vocabulary、Zod vocab schema 和 `ART_ASSET_CONTROLLED_VOCABULARY`。
- 新增 `packages/asset-pipeline/src/art-asset-metadata.schema.ts`，提供 `ArtAssetMetadataSchema` 和 `parseArtAssetMetadata`。
- `packages/asset-pipeline/src/index.ts` 导出 metadata schema / vocab。
- 新增 `assets/metadata/controlled_vocabulary.json`、`assets/metadata/schema/ai_game_art_asset.schema.json` 和 5 个 `assets/metadata/examples/*.asset.json`。
- 新增 `tests/contracts/art-asset-metadata.test.ts`，覆盖 JSON Schema artifact、vocab 同步、example manifests、invalid enum、required semantic tags、unsafe path 和 slug policy。
- 新增 `docs/refactor-log/ai-game-art-asset-metadata-v0.1-step-1-schema-vocabulary.md` 记录本步边界、验证和审查结论。

阶段结果：

- Metadata v0.1 已具备 TypeScript/Zod schema、非 TS 工具可读 JSON Schema artifact、controlled vocabulary 和 5 类示例 sidecar manifest。
- JSON Schema artifact 已补齐与 Zod 对齐的关键约束：asset id、slug、date、safe project-relative path、required/min/max、`additionalProperties: false`、`relations` / `search` shape 和 enum。
- 本步只新增 metadata contract/export surface；未接 CLI、runtime-safe export、resolver、QA、Workbench 或 Phaser runtime。
- 文件行数：`art-asset-metadata.vocabulary.ts` 175 行，`art-asset-metadata.schema.ts` 119 行，`art-asset-metadata.test.ts` 211 行；JSON Schema 336 行，属于 declarative schema artifact。

已通过验证：

    npx vitest run tests/contracts/art-asset-metadata.test.ts
    # 6 个测试通过

    npm run test:contracts
    # 9 个测试文件，125 个测试通过

    npm test
    # contracts 125 个测试通过；workspace 125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 首轮审查：P0 无。
- Oracle 首轮 P1：JSON Schema artifact 弱于 Zod 契约，尤其 path safety、slug pattern、array min/max、relations/search shape。
- 已修复：JSON Schema 补齐 `$defs.asset_metadata_id`、`$defs.slug`、`$defs.date_string`、`$defs.project_relative_path`，source / thumbnail path 引用 safe path，补齐 required/min/max、`additionalProperties: false`、relations/search shape 和 enum 一致性测试。
- Oracle 首轮 P2：文档状态仍停在 Step 0；已更新 index、step index、Step 0 文档和本 review log。
- Oracle 首轮 P3：slug policy 需显式测试，JSON Schema enum 第三份副本需一致性测试；已补测试。
- Oracle 代码复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 新建后复用。

当前下一步：

- Metadata v0.1 Step 3：runtime-safe metadata export，按白名单输出 runtime 可消费字段，并剔除 prompt、seed、review notes、third-party source details 等内部或敏感字段。

### 15. AI Game Art Asset Metadata v0.1 Step 2：Validation Command

完成时间：2026-06-12

已完成内容：

- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.ts`，提供 `validateArtAssetMetadataFiles`、human / JSON formatter 和 validation exit code helper。
- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.types.ts`，固定 validation result、diagnostic 和 exit code 类型。
- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.diagnostics.ts`，将 Zod issue 映射为稳定 diagnostic code / `jsonPath` / `assetId`。
- 新增 `packages/asset-pipeline/src/art-asset-metadata-validation.discovery.ts`，递归发现目录内 `.asset.json` sidecar 文件，并保持确定性排序。
- `packages/asset-pipeline/src/index.ts` 导出 validation API 和类型。
- 新增 `scripts/validate-art-asset-metadata.ts`，支持 `--json`、`--check-paths`、`--project-root`、单文件和目录输入。
- `package.json` 新增 `metadata:validate` 脚本。
- 新增 `tests/contracts/art-asset-metadata-validation.test.ts`，覆盖 valid examples、missing required field、invalid enum、duplicate `asset_id`、schema-invalid duplicate、malformed JSON、deterministic JSON output、human output 和显式 path existence check。
- 新增 `tests/contracts/art-asset-metadata-validation-cli.test.ts`，真实执行 CLI，覆盖 usage error / input error 的 exit code 2。
- 新增 `docs/refactor-log/ai-game-art-asset-metadata-v0.1-step-2-validation-command.md`，记录命令用法、diagnostic contract、exit code 和非目标。

阶段结果：

- CLI exit code 固定为：0 valid，1 validation diagnostics，2 CLI usage / internal error。
- Diagnostic contract 固定包含 `severity`、`code`、`message`、`filePath`，并在可定位时提供 `jsonPath` 和 `assetId`。
- 默认只校验 Step 1 schema 要求的 safe project-relative path；`source_path` / `thumbnail_path` 文件存在性必须显式传 `--check-paths` 才会检查。
- 本步只新增 metadata validation infrastructure；未接 runtime-safe export、existing asset pack bridge、resolver、QA、Workbench、Phaser runtime、数据库、UI 或 runtime loader。
- Step 2 固定验收口径已写入步骤文档：P0 重点守住 invalid metadata 不误过、duplicate `asset_id` 必检、diagnostics 不得 exit 0、不得 import / mutate runtime-resolver-Workbench 链路、JSON Schema artifact 不得弱于 Zod contract；P1 重点守住 diagnostics 稳定、JSON output deterministic、path checks 显式开启、validation 复用 Step 1 contract layer。
- 当前顺序固定为 Step 0 文档规则、Step 1 数据契约、Step 2 validation command、Step 3 runtime-safe export、Step 4 asset pack metadata bridge / resolver diagnostics；Step 2 只做门禁，不做消费方。
- 文件规模：validation API 207 行，diagnostics 92 行，discovery 63 行，types 46 行，CLI 85 行，validation test 206 行，CLI test 78 行。

已通过验证：

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

审查门禁结论：

- Oracle 首轮审查：P0 无；确认未越界到 runtime、resolver、QA、Workbench、Phaser 或 existing asset pack。
- Oracle 首轮 P1：input / usage 类错误会返回 1，无法和 validation errors 区分；duplicate `asset_id` 只覆盖 schema-valid 文件。
- 已修复：`ArtAssetMetadataValidationExitCode` 扩为 `0 | 1 | 2`，input / usage diagnostics 返回 2；duplicate detection 改为 JSON parse 成功且 `asset_id` 是 string 后即收集，不依赖 schema 成功。
- Oracle 首轮 P2：缺少真实 CLI exit code 回归测试；human output 对非法文件显示 `0 metadata files`。
- 已修复：新增 CLI contract test 覆盖 unknown flag、缺 `--project-root` value 和 missing input path 的 exit code 2；`files` 现在记录发现到的 sidecar 文件，human summary 对非法文件也显示正确文件数。
- Oracle 首轮 P3：missing required field 分类依赖 Zod message 文本。
- 已修复：required field 判断改为基于原始 JSON path 是否存在。
- Oracle 复审：上一轮 P1/P2/P3 均关闭，未发现新的 P0/P1/P2。
- 审查模式：Oracle 新建后复用。

当前下一步：

- Metadata v0.1 Step 3：runtime-safe metadata export，按白名单输出 runtime 可消费字段，并剔除 prompt、negative prompt、seed、review notes、third-party source details 等内部或敏感字段。

### 16. AI Game Art Asset Metadata v0.1 Step 3A：Runtime-Safe Export Review Gate

完成时间：2026-06-12

已完成内容：

- 新增 `docs/refactor-log/ai-game-art-asset-metadata-v0.1-step-3-runtime-safe-export.md`。
- 文档固定 Step 3 runtime-safe export 的目标：把通过 Step 2 validation 的完整 `.asset.json` sidecar metadata 转成未来 runtime / tool consumers 可用的 runtime-safe JSON artifact。
- 文档明确 Step 3A 只写 review gate，不实现 runtime-safe export code。
- 文档明确 Step 3B 必须复用 Step 2 validation，invalid metadata、malformed JSON 和 duplicate `asset_id` 不得成功 export。
- 文档明确 runtime-safe export 必须使用 explicit allowlist，不能把 full metadata schema 当作 runtime schema，也不能用“delete a few unsafe fields and keep the rest”策略。
- 文档列出必须排除的 AI generation / provenance、rights / legal / review、workflow / private production fields，并声明 creator / credit fields 默认不导出，除非未来定义 public credits artifact。
- 文档记录 Step 3B 的 candidate CLI、exit codes、diagnostic codes 和 expected future implementation files。
- 更新 `docs/refactor-log/ai-game-dsl-p0-step-index.md`，把当前下一步改为 Metadata v0.1 Step 3B runtime-safe export implementation。

阶段结果：

- 本步只修改文档。
- 未创建 `packages/asset-pipeline/src/art-asset-metadata.runtime-export.ts`。
- 未创建 `packages/asset-pipeline/src/art-asset-metadata.runtime-export.cli.ts`。
- 未创建 `tests/contracts/art-asset-metadata-runtime-export.test.ts`。
- 未修改 runtime、resolver、QA、Workbench、Phaser、asset pack loading 或 Step 2 validator implementation。

已通过验证：

    git diff --check
    # 无输出

审查门禁结论：

- Oracle 文档审查：PASS_WITH_NOTES；P0/P1/P2 无。
- Oracle P3：顶部“当前阶段”仍写 Metadata v0.1 只完成到 Step 0-2；顶部“当前下一步”仍写 Step 3 runtime-safe metadata export。
- 已修复：顶部状态同步为 Step 0-2 + Step 3A runtime-safe export review gate 已完成，下一步同步为 Step 3B runtime-safe export implementation。
- 审查模式：Oracle 新建。

当前下一步：

- Metadata v0.1 Step 3B：runtime-safe export implementation，必须先复用 Step 2 validation，再实现 explicit allowlist export。

### 17. AI Game Art Asset Metadata v0.1 Step 3B：Runtime-Safe Export Implementation

完成时间：2026-06-13

已完成内容：

- 新增 `packages/asset-pipeline/src/art-asset-metadata.runtime-export.ts`，实现 runtime-safe export API。
- 新增 `scripts/export-art-runtime-metadata.ts`，按 Step 2 root script convention 提供 `npm run metadata:export-runtime`。
- `package.json` 只新增 `metadata:export-runtime` script。
- `packages/asset-pipeline/src/index.ts` 只导出 runtime export API / types / formatter / exit helper。
- 新增 `tests/contracts/art-asset-metadata-runtime-export-api.test.ts`。
- 新增 `tests/contracts/art-asset-metadata-runtime-export-cli.test.ts`。
- 更新 `docs/refactor-log/ai-game-art-asset-metadata-v0.1-step-3-runtime-safe-export.md`，记录 Step 3B 已实现、grouped runtime artifact shape、uppercase diagnostics、CLI / `--out` / `--json` 行为和非目标。
- 更新 `docs/refactor-log/ai-game-dsl-p0-step-index.md`，把 Metadata v0.1 下一步推进到 Step 4。

阶段结果：

- Runtime export 先复用 Step 2 `validateArtAssetMetadataFiles`；invalid metadata、malformed JSON、duplicate `asset_id` 均不会导出成功。
- Runtime artifact 使用 explicit allowlist，不把 full metadata schema 当作 runtime schema。
- Runtime artifact 保留 safe grouped shape：`semantic`、`gameplay`、`technical`、`relations`。
- Runtime export 排除 `ai_generation`、`rights`、`workflow`、`search`、creator / credit、review notes、prompt summary、seed、third-party sources、non-allowlisted technical / relations fields。
- Runtime export output deterministic，assets 按 `asset_id` 排序。
- `--json` 优先控制 stdout；`--json + --out` 输出 deterministic JSON envelope，并包含 `outputPath` 和 `artifact`。
- `--out` 成功可覆盖既有 artifact；validation / export failure 不创建、不覆盖 successful-looking artifact。
- Step 3B 没有接 resolver、QA、Workbench、Phaser runtime、asset pack loading 或 runtime consumer。
- Step 3B 没有实现 Step 4 asset pack metadata bridge / resolver diagnostics。
- 未修改 `packages/asset-pipeline/src/art-asset-metadata-validation.ts`。

已通过验证：

    npx vitest run tests/contracts/art-asset-metadata.test.ts tests/contracts/art-asset-metadata-validation.test.ts tests/contracts/art-asset-metadata-validation-cli.test.ts tests/contracts/art-asset-metadata-runtime-export-api.test.ts tests/contracts/art-asset-metadata-runtime-export-cli.test.ts
    # 5 个测试文件，35 个测试通过

    npm run test:contracts
    # 13 个测试文件，154 个测试通过

    npm test
    # contracts 154 个测试通过；workspace 125 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm run metadata:validate -- assets/metadata/examples
    # OK 5 metadata files

    npm run metadata:validate -- --json assets/metadata/examples
    # ok=true，5 个 files，diagnostics=[]

    npm run metadata:export-runtime -- assets/metadata/examples
    # 输出 runtime_metadata_version=0.1、generated_by=metadata:export-runtime、asset_count=5

    npm run metadata:export-runtime -- --json assets/metadata/examples
    # ok=true，artifact.asset_count=5

    npm run metadata:export-runtime -- assets/metadata/examples --out /tmp/.../runtime-art-assets.json
    # OK 5 runtime metadata assets，并写入临时 artifact

    npm run metadata:export-runtime -- --json assets/metadata/examples --out /tmp/.../runtime-art-assets.json
    # ok=true，JSON envelope 包含 outputPath 和 artifact

审查门禁结论：

- Sage / Oracle 首轮审查：PASS_WITH_NOTES；P0/P1/P2 无。
- Sage 首轮 P3：`--file` / `--dir` 只选择 API entrypoint，未额外强制目标类型。
- 已修复：`exportRuntimeArtAssetMetadataFromFile()` / `exportRuntimeArtAssetMetadataFromDirectory()` 增加 explicit input kind check；`--file <directory>` / `--dir <file>` 均返回 usage diagnostic 和 exit code 2，并补 CLI contract tests。
- Sage 复审：PASS_WITH_NOTES；上一轮 P3 已关闭，未发现新的 P0/P1/P2；仅要求把审查结论写回本文档。
- 审查模式：Oracle / Sage 复用。

当前下一步：

- Metadata v0.1 Step 4：asset pack metadata bridge / resolver diagnostics，必须作为未来独立步骤推进。

### 18. Asset Semantic Fidelity Step 9B：Small Art Library Metadata Intake / Fixture Import

完成时间：2026-06-13

已完成内容：

- 新增 `tests/fixtures/art-library-small-v0.1/`，作为 Step 9B 小型真实资源 dry-run fixture。
- 来源为 Kenney Cube Pets：`https://kenney.nl/assets/cube-pets`，许可证为 Creative Commons Zero / CC0。
- 导入 10 个 GLB 模型和 10 个匹配 PNG thumbnail：`animal-bee`、`animal-bunny`、`animal-cat`、`animal-crab`、`animal-dog`、`animal-fish`、`animal-fox`、`animal-lion`、`animal-penguin`、`animal-tiger`。
- 新增 `tests/fixtures/art-library-small-v0.1/metadata/*.asset.json`，每个 asset 均具备 complete metadata sidecar，包含 semantic、gameplay、technical、ai_generation、rights、workflow、relations 和 search 字段。
- 新增 `tests/contracts/asset-semantic-small-art-library-fixture.test.ts`，锁定 exact 10 basename、目录布局、全 fixture size / extension policy、metadata validation 和 project-relative referenced paths。
- 更新 `docs/refactor-log/asset-semantic-small-art-library-v0.1.md` 和 `docs/refactor-log/ai-game-asset-semantic-fidelity-plan.md`，记录 Step 9B 资源来源、导入范围、size policy、非目标和验证命令。

阶段结果：

- 只导入小型 fixture，不导入完整 Cube Pets 包。
- 不提交下载 zip、FBX、OBJ、overview / preview / URL helper 文件或 runtime export artifact。
- `source/` 只保存 provenance / license evidence，不作为 production source-art 目录。
- Sidecar metadata 的 `technical.source_path` / `thumbnail_path` 均保持 project-relative path。
- Runtime-safe export 只作为 validation command 运行，不生成提交 artifact。

Step 9B 未做：

- 未启动 Step 9C default / repair-enabled canary / comparison。
- 未启动 Metadata Step 4A。
- 未修改 runtime/default asset loading、resolver、QA、Workbench、Phaser、asset pack loading 或 repair-enabled default。
- 未导入 large asset library、DAM / database / vector / image embedding、Unity / Unreal / glTF / USD 或 C2PA pipeline。

已通过验证：

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

审查记录：

- Oracle 预审：P0 无；P1 要求 metadata complete schema、对新 fixture 运行 runtime export、focused test 锁 exact 10 basenames；P2 要求避免给所有动物统一 collectible role、README 记录来源/排除项/size policy、size gate 遍历整个 fixture；P3 要求说明 `source/` 语义，并考虑 `semantic.world=kenney_cube_pet`。
- 已落实：sidecar metadata 补齐 complete schema；focused test 锁 exact basenames / full fixture size；README 记录 provenance、排除项和边界；所有动物 gameplay role 保持 `npc` / `decoration`；`semantic.world` 使用 `kenney_cube_pet`。

### 19. 2D Generation Pipeline Stabilization Step 1：Intent Plan / Genre Taxonomy Gate

完成时间：2026-06-14

已完成内容：

- 新增 `apps/maker-api/src/model-provider/intent-plan.ts`，把短 prompt 先归一为 `intent_plan.json`：
  - 正式 2D genre taxonomy：`top_down_shooter`、`side_scrolling_platformer`、`side_scrolling_run_and_gun`、`vertical_shooter`、`dodger_collector`、`breakout`、`maze_chase`。
  - 多语言 alias：`小猫大战坦克`、`魂斗罗`、`魂斗罗式`、`横版跑枪`、`横版射击`、`run and gun`、`contra-like`、`飞机大战`、`马里奥式`、`平台跳跃`、`打砖块`、`迷宫追逐`。
  - 内部 `unrecognized_2d_genre` 只用于未知 prompt 早停，不作为正式 taxonomy enum。
- `GameDslProviderService` 接入 intent plan：
  - model prompt 显式携带 `intent_plan` 和 alias 表。
  - `小猫大战坦克` 映射到当前可执行 brief genre `shooter` / `top_down`。
  - run-and-gun alias 仍归一为 generic `side_scrolling_run_and_gun`，并清理 `Contra` / `魂斗罗` 等版权特定 title 文本。
- `GenerationPipelineService` 在 `DSL_GENERATING` 阶段先写 `intent_plan.json`。
- 当前 runtime DSL 未覆盖的 genre 明确返回 `RUNTIME_UNSUPPORTED` 和 `unsupportedCapabilities`，不进入 model brief/raw DSL 生成：
  - `side_scrolling_run_and_gun`
  - `side_scrolling_platformer`
  - `vertical_shooter`
  - `breakout`
  - `maze_chase`
  - `unrecognized_2d_genre`
- 保持 DSL-first 边界：本步不扩 asset coverage，不实现新的 Phaser runtime adapter，不把 side-scrolling run-and-gun 静默降级为 top-down shooter。

阶段结果：

- Pipeline artifact 链路新增第一个稳定节点：`intent_plan.json`。
- 当前可运行闭环仍以 `top_down_shooter -> shooter` 为主。
- 当前未支持 genre 在 runtime 生成前结构化早停，后续 Phase 2/3/5 可继续补 `dsl_validation_report.json`、`runtime_capability_report.json`、schema v1 和 runtime adapters。

本步未做：

- 未实现 DSL schema v1 的完整严格字段集。
- 未生成 `dsl_validation_report.json`、`runtime_capability_report.json`、`asset_plan.json`、`asset_resolution_report.json`、`runtime_manifest.json`、`build_report.json` 的全链路新 artifact 序列。
- 未扩大 local asset pack 覆盖面。
- 未实现 side-scrolling platformer / run-and-gun Phaser playable runtime。

已通过验证：

    npx vitest run tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts
    # 2 个测试文件，78 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

审查记录：

- Oracle 首轮：发现 2 个 P1：
  - `side_scrolling_run_and_gun` 在 intent 层被标记 supported，但实际 runtime capability gate / template compiler 仍不支持。
  - 未命中 alias 的 prompt 默认降级为 supported `top_down_shooter`，会掩盖未知或未覆盖 genre。
- 已修复：
  - `supportedRuntimeDslGenres` 只保留 `top_down_shooter` 和 `dodger_collector`。
  - `side_scrolling_run_and_gun`、`side_scrolling_platformer`、`vertical_shooter`、`breakout`、`maze_chase` 均返回 explicit unsupported capabilities。
  - 未识别 prompt 返回内部 `unrecognized_2d_genre` 并早停，不静默降级。
  - pipeline 测试覆盖 `飞机大战`、`contra-like`、`横版跑枪打外星人`、`马里奥式平台跳跃`、`平台跳跃` 和未知 prompt 的 `intent_plan.json` / `RUNTIME_UNSUPPORTED` 行为。
- Oracle 复审：P0/P1 无，两个上一轮 P1 已关闭；可进入 docs / commit。

当前下一步：

- 2D pipeline stabilization Step 2：补 DSL schema v1 validation report artifact，并把 `game_dsl.json` / `dsl_validation_report.json` 写成稳定 pipeline contract。

### 20. Asset Pipeline Step 6：Verifiable Asset Manifest Pipeline Report

完成时间：2026-06-14

已完成内容：

- 新增 `apps/maker-api/src/compiler/asset-pipeline-report.ts`，在 compiler 产物中写入 `asset_pipeline_report.json`：
  - 记录 `asset_plan.json`、`public/asset_manifest.json`、模板内 `asset-manifest.generated.json` 和 `asset_resolution_report.json` 的相对 artifact 路径。
  - 汇总 manifest version、summary、asset ids、required asset ids、load keys 和 asset files。
  - 不写时间戳、随机值或机器相关绝对路径，保持 report deterministic。
- `TemplateCompilerService` 在写完 public manifest 和 Phaser preview manifest 后生成 report，并将 `asset_pipeline_report.json` 纳入最终 `RuntimeCompileSuccess.files`。
- report writer 在写入前做真实校验：
  - public manifest 与 Phaser preview manifest 必须一致。
  - manifest `projectId` 必须匹配当前 project。
  - 最终 compile files 必须列出 `asset_plan.json`、`public/asset_manifest.json`、`asset_resolution_report.json` 和所有 manifest asset files。
  - Phaser template entry 必须 import `asset-manifest.generated.json`，并将 `generatedAssetManifest` 传入对应 `create*ArtRuntime(...)`，且该 art runtime 被 `preload(this)` 消费。
  - manifest asset files 必须存在且为普通文件。
- 新增 `tests/workspace/asset-pipeline-report.test.ts`，覆盖 happy path、projectId mismatch、preview 未把 manifest 传给 art runtime、最终 compile files 漏列 asset 的失败路径。
- 扩展 `tests/workspace/compiler-service.test.ts`，覆盖 collector report 内容，以及 collector -> shooter 重新 compile 后 report 不保留 stale `collectible` asset。

阶段结果：

- `AssetPlan -> AssetManifest -> Phaser preview manifest -> asset files -> compile files` 形成可追溯 report。
- 本步不改变 resolver ranking、fallback 策略、provider abstraction、Phaser gameplay / visual polish、QA verdict 或 Workbench 展示语义。
- Step 5 live edit registry / bridge / runtime protocol 未修改。

本步未做：

- 未新增 AI image provider 或 asset provider abstraction。
- 未扩大 asset pack 覆盖面。
- 未把 report 接入 Workbench UI。
- 未改 DSL schema v1、runtime capability report、build report 或 QA report 结构。

已通过验证：

    npx vitest run tests/workspace/asset-pipeline-report.test.ts tests/workspace/compiler-service.test.ts
    # 2 个测试文件，15 个测试通过

    npx vitest run tests/contracts/asset-pipeline.test.ts
    # 1 个测试文件，23 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：15 个测试文件，199 个测试通过

审查记录：

- Oracle 首轮：P0/P1 无；发现 2 个 P2：
  - `previewManifestConsumedByTemplate` 只验证入口文件包含字符串，不能证明 preview 实际消费 manifest。
  - `assetFilesListedInCompileResult` 实际校验中间 `assetArtifacts.files`，不是最终 `RuntimeCompileSuccess.files`。
- 已修复：
  - preview 消费校验改为检查 manifest import、对应 `create*ArtRuntime(generatedAssetManifest)` 调用，以及 art runtime `preload(this)`。
  - `TemplateCompilerService` 先构造最终 `compileFiles`，report writer 校验同一份列表，返回结果也使用同一份列表。
  - 补 `projectId` 一致性断言和 report writer 负向测试。
- Oracle 复审：P0/P1/P2 无；P3 仅提示当前 preview 消费校验仍为正则 / 字符串级别而非 AST，针对固定模板可接受；提交前需确认新增文件纳入 commit。

当前下一步：

- 继续 2D pipeline stabilization Step 2：补 DSL schema v1 validation report artifact，并把 `game_dsl.json` / `dsl_validation_report.json` 写成稳定 pipeline contract。

### 21. DSL Pipeline Step 7：Deterministic DSL Validation Report Contract

完成时间：2026-06-15

已完成内容：

- 扩展 `packages/game-dsl/src/artifact-contract.ts` 的 `DslValidationReportSchema`：
  - 新增 `reportVersion: "dsl-validation-report-v1"`。
  - 新增 `sourceArtifact`，区分 valid 路径的 `game_dsl.json` 和 invalid 路径的 `game_dsl.candidate.json`。
  - 新增 `valid` boolean，并用 schema-level invariant 保证 `status` / `valid` 一致。
  - 新增 `checkedPaths`，按稳定顺序记录 schema / semantic checks / issue paths / stable id paths。
  - 新增 `stableIdSummary`，记录 stable id 总数、唯一数、重复 id 和按 path 排序的 checked id 列表。
  - 新增 `objectCounts`，记录 player、player actions、enemyTypes、projectiles、waves、pickups、bosses、terrain、segments 计数。
  - 用 schema-level invariant 保证 `errorCount === errors.length`、`warningCount === warnings.length`。
- `buildDslValidationReport` 现在对 `errors`、`warnings`、`checkedPaths`、`stableIdSummary.checked` 和 `duplicateIds` 做 deterministic ordering。
- `validateGameDslArtifact` 增加可选 `sourceArtifact` 参数，默认仍为 `game_dsl.json`。
- `GenerationPipelineService` 在 invalid artifact 路径中写出 `sourceArtifact: "game_dsl.candidate.json"` 的 `dsl_validation_report.json`，并保持 invalid DSL 阻断 compile / build / QA。
- live edit candidate validation report 仅校正 `sourceArtifact: "game_dsl.candidate.json"` 元数据，不改变 patch 能力、plan、runtime apply 或 live edit 流程。
- 新增 `tests/workspace/dsl-validation-report.test.ts`，覆盖 deterministic happy path、missing required field、duplicate stable id、dangling reference、report invariant 失败。
- 扩展 `tests/workspace/generation-pipeline.service.test.ts`，覆盖 valid / invalid generation pipeline 中 `sourceArtifact`、`valid`、stable id summary、object counts 和 checked paths。

阶段结果：

- `game_dsl.json` / `dsl_validation_report.json` 成为稳定、可回归、可审计的 DSL pipeline contract。
- invalid DSL 继续写 `game_dsl.candidate.json` 和 `dsl_validation_report.json`，并明确返回 `DSL_VALIDATION_FAILED`，不进入 preview success。
- 本步不改变 `asset_pipeline_report.json` 语义，也不改变 resolver ranking / fallback、provider abstraction、asset pack、Phaser gameplay、prompt、QA verdict、Workbench UI 或 live edit 能力。

本步未做：

- 未新增 DSL schema 能力或玩法表达。
- 未新增 provider / 外部 asset 服务。
- 未扩大 asset pack。
- 未把 DSL artifact refs 接入 Workbench UI 或项目 API 聚合面。
- 未改变 `RuntimeCompileSuccess.files` 的语义；compile files 仍只描述生成的 Phaser/Vite 项目目录，DSL artifacts 仍位于 model-output artifact 区。

已通过验证：

    npx vitest run tests/workspace/dsl-validation-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/generation-pipeline.service.test.ts
    # 3 个测试文件，44 个测试通过

    npx vitest run tests/workspace/asset-pipeline-report.test.ts tests/contracts/asset-pipeline.test.ts
    # 2 个测试文件，27 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：16 个测试文件，204 个测试通过

审查记录：

- Oracle 首轮：P0/P1/P2 无；发现 1 个 P3：
  - `DslValidationReportSchema` 只校验结构，不校验 `status` / `valid` / `errorCount` / `warningCount` 与 arrays 一致性。
- 已修复：
  - 增加 schema-level invariant，保证 `status` / `valid`、`errorCount` / `errors.length`、`warningCount` / `warnings.length` 一致。
  - 增加 focused test 覆盖 report invariant 失败路径。
- Oracle 增量复审：P0/P1/P2 无；上一轮 P3 已关闭。第二轮 P3 提醒外部 report 仍可声明 `invalid` 但没有 errors；已继续收紧 schema invariant，要求 `status` / `valid` 必须由 `errors.length` 推导，并补 schema boundary 测试。
- Oracle 最终复审：P0/P1/P2/P3 无。

当前下一步：

- 继续 2D pipeline stabilization Step 3：选择最小 pipeline artifact index / API visibility 挂接点，让 Workbench 或项目 API 能稳定看到 `game_dsl.json`、`dsl_validation_report.json`、`runtime_capability_report.json`、`asset_pipeline_report.json` 等 artifact refs；不得改变 QA verdict 总结构或重复 Step 20 asset report。

### 22. 2D Pipeline Stabilization Step 3：Pipeline Artifact Index / API Visibility

完成时间：2026-06-15

已完成内容：

- 新增 `apps/maker-api/src/projects/pipeline-artifact-index.ts`，定义 `pipeline_artifact_index.json` 的 stable contract：
  - `indexVersion: "pipeline-artifact-index-v0.1"`。
  - `projectId` / `runId`。
  - deterministic `artifacts` refs array。
  - 每个 ref 只包含 `id`、`role`、`artifactRoot`、artifact-root-relative `path`、`status`、`required`、`producedBy`、`format` 和 missing/skipped `reason`。
  - schema 拒绝绝对路径、`..` 和反斜杠路径。
- `GenerationPipelineService` 在 valid generation path 写入并刷新 `pipeline_artifact_index.json`：
  - compile 后可见 DSL validation、runtime capability、asset plan、public AssetManifest、Phaser preview manifest、asset resolution report 和 asset pipeline report refs。
  - build runner 正常返回后标记 build log ref present，覆盖 build failed / preview missing / build success 路径。
  - QA report 写出后标记 QA report ref present。
- `GenerationPipelineService` 在 invalid DSL path 写入最小 index：
  - `game_dsl.candidate.json` 和 `dsl_validation_report.json` 为 present。
  - `game_dsl.json`、runtime capability、asset / preview / build / QA 下游 refs 明确 skipped，不读取或暴露旧 generated-project stale artifacts。
- 新增只读 API：
  - `GET /api/projects/:projectId/runs/:runId/artifacts`。
  - `ProjectsService.getPipelineArtifacts` 先校验 run ownership，再读取固定 `pipeline_artifact_index.json` 并按 schema parse。
  - parse 后校验 index 内部 `projectId` / `runId` 必须匹配 URL 参数，防止错误 index 暴露其他 run refs。
  - 缺失 index 返回明确 `404 Pipeline artifact index not found.`。
- 新增 / 扩展测试：
  - `tests/workspace/pipeline-artifact-index.test.ts` 覆盖 deterministic ordering、无绝对路径、不复制 report payload、invalid DSL skipped refs、writer parseability，以及 `/abs`、`..`、反斜杠、`C:/...` path 拒绝。
  - `tests/workspace/generation-pipeline.service.test.ts` 覆盖 valid / invalid pipeline 写出 index、invalid DSL 不读取 stale generated-project report、build failed 后 buildLog ref present。
  - `tests/workspace/projects-service.test.ts` 覆盖 API service 读取、run ownership mismatch、缺失 index 404、index identity mismatch、不泄漏 workspace absolute path。

阶段结果：

- 本步只暴露已知 artifact refs，不复制 `asset_pipeline_report.json`、`dsl_validation_report.json` 或其他 report 内容。
- API 不枚举目录、不暴露任意文件系统路径、不提供 artifact 内容下载能力。
- `pipeline_artifact_index.json` 位于当前 project/run 的 model-output artifact 区；generated-project refs 均通过 compile result 已知文件列表派生。
- 本步不改变 QA verdict 总结构、不改变 Step 20 `asset_pipeline_report.json` 或 Step 21 `dsl_validation_report.json` 语义。
- 本步不扩 DSL schema、不改 LLM prompt、不改 Phaser gameplay / visual polish、不扩 live edit、不接 provider abstraction / 外部 asset 服务、不扩大 asset pack、不改 resolver ranking / fallback、不碰 Chrome MCP integration。

已通过验证：

    npx vitest run tests/workspace/pipeline-artifact-index.test.ts
    # 1 个测试文件，4 个测试通过

    npx vitest run tests/workspace/projects-service.test.ts tests/workspace/generation-pipeline.service.test.ts
    # 2 个测试文件，45 个测试通过

    npx vitest run tests/workspace/pipeline-artifact-index.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/compiler-service.test.ts
    # 3 个测试文件，45 个测试通过

    npx vitest run tests/workspace/projects-service.test.ts
    # 1 个测试文件，15 个测试通过

    npx vitest run tests/workspace/asset-pipeline-report.test.ts tests/workspace/dsl-validation-report.test.ts tests/contracts/asset-pipeline.test.ts
    # 3 个测试文件，32 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：17 个测试文件，213 个测试通过

审查记录：

- Oracle 首轮：P0 无；发现 1 个 P1、2 个 P2、1 个 P3：
  - P1：API 返回前未校验 index 文件内部 `projectId` / `runId` 与 URL 参数一致。
  - P2：build failed 路径未刷新 buildLog ref，导致实际 build log 可能存在但 index 仍标 missing。
  - P2：path schema 未拒绝 `C:/tmp/file.json` 这类 Windows drive absolute 形态。
  - P3：invalid DSL stale generated-project artifact 防回归测试不够实证。
- 已修复：
  - `ProjectsService.getPipelineArtifacts` parse 后增加 index identity 校验，并补 mismatch 测试。
  - `GenerationPipelineService.buildProject` 在 build runner 正常返回后、`build.ok` 判断前刷新 index，使 build failed / preview missing 也暴露 buildLog ref，并补 build failed 测试。
  - `PipelineArtifactRefSchema` path guard 拒绝 Windows drive absolute path，并补 schema boundary 测试。
  - invalid DSL 测试预先写入 stale `asset_pipeline_report.json`，确认 index 仍标 downstream skipped 且不包含 stale payload。
- Oracle 复审：P0/P1/P2 无；代码侧无新增问题。P3 仅提示 review log 未更新，本段已补齐。

当前下一步：

- 本步代码侧 P0/P1/P2 已清零；等待文档补充后的最终门禁确认。本步未提交、未 push。

### 23. Step 12：Generation Input Provenance Report

完成时间：2026-06-15

已完成内容：

- 新增 `generation_input_report.json` contract：
  - `reportVersion: "generation_input_report.v1"`。
  - 记录当前 generation 的 `projectId` / `runId` / `effectivePrompt`。
  - `source` 区分 `manual` 与 `prompt-coach-candidate`。
  - Prompt Coach 候选来源只记录安全 ref：source `projectId`、`optimizationId`、相对 `prompt_optimization_report.json` / `optimized_prompt.txt` path、`mode`、`strategy`、report version。
  - 不复制 `intentSummary`、`suggestedQuestions`、provider raw response、API key、绝对路径或 Prompt Coach 大段 payload。
- `GenerationPipelineService` 在 pipeline 起点写出 `generation_input_report.json`：
  - manual generation 自动写 manual provenance。
  - API 已解析的 Prompt Coach provenance 会随 pipeline input 写入。
  - 写入前校验 report 的 `projectId` / `runId` / `effectivePrompt` 必须与当前 pipeline input 一致。
  - valid DSL 与 invalid DSL path 均会写出该报告。
- `pipeline_artifact_index.json` 增加 `generationInputReport` ref：
  - role 为 `prompt`。
  - artifact root 为 `model-output`。
  - path 为 `generation_input_report.json`。
  - valid / invalid DSL index 均列出该 ref。
- `ProjectsService.generateProject` 增加可选 provenance 输入：
  - request body 支持 `promptOptimizationProjectId` + `promptOptimizationId` 成对传入。
  - 后端只根据 source project id 与 optimization id 推导 artifact path，不接受前端 path。
  - 后端读取并校验 `prompt_optimization_report.json` 与 `optimized_prompt.txt`。
  - 校验 report project/id ownership、optimized prompt artifact 一致性，以及当前 `idea` 必须等于 optimized candidate；不匹配时 400 且不启动 pipeline。
- Workbench 只在用户点击 `Use optimized prompt` 后保存候选 provenance：
  - `Idea` textarea 等于候选文本时，Generate 请求携带 provenance ids。
  - 用户编辑 `Idea` 后清除候选选择，Generate 请求回到 manual provenance。
  - 未新增自动应用、自动生成或覆盖原项目 prompt 的行为。
- 浏览器验收时发现并修复一个既有 Workbench 空白页阻断：
  - `buildLiveObjectTree` 之前假设 `level.waves` 是数组。
  - 当前 `game_dsl.json` contract 中 `level.waves` 是 record。
  - 已在 Workbench helper 中兼容 array / record 两种视图，并同步前端类型与测试；不改变 DSL schema、live edit API 或 runtime 行为。

阶段结果：

- 本步只新增 generation input provenance artifact 与 index ref。
- 未改变 generation prompt 行为；模型 / deterministic fallback 仍使用请求中的 `idea`。
- 未改变 Step 10 LLM adapter、schema normalizer、DSL schema、QA verdict、Phaser runtime、asset report、provider 配置、Chrome MCP。
- Prompt Coach report contract 未破坏；仅在新 generation report ref 中记录 source project id 以支持当前 Workbench “旧 project 产出候选、新 project 执行生成”的实际 API 边界。
- 浏览器自动化使用 Playwright fallback：Browser plugin 已加载但 `iab` 返回不可用。

已通过验证：

    npx vitest run tests/workspace/generation-input-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/generation-pipeline.service.test.ts
    # 3 个测试文件，37 个测试通过

    npx vitest run tests/workspace/projects-service.test.ts
    # 1 个测试文件，21 个测试通过

    npx vitest run tests/workspace/workbench-prompt-coach-client.test.ts
    # 1 个测试文件，12 个测试通过

    npx vitest run tests/workspace/generation-input-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/projects-service.test.ts tests/workspace/workbench-prompt-coach-client.test.ts
    # 5 个测试文件，69 个测试通过

    npx vitest run tests/workspace/workbench-live-edit-client.test.ts tests/workspace/workbench-prompt-coach-client.test.ts
    # 2 个测试文件，18 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    npm run maker:start
    # API: http://localhost:3000
    # Workbench: http://localhost:5173

    Playwright browser flow
    # Workbench first generation -> Prompt Coach prepare -> Use optimized prompt -> second generation
    # second run: proj_20260614_191934_4bd1 / run_20260614_191934_4bd1
    # generation_input_report.json source = prompt-coach-candidate
    # promptOptimizationRef.projectId = proj_20260614_191916_06a5
    # candidatePromptMatchesEffectivePrompt = true
    # pipeline_artifact_index.json contains generationInputReport
    # screenshots: /tmp/ai-game-maker-step12-prompt-coach-adopted.png, /tmp/ai-game-maker-step12-generated.png

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：21 个测试文件，246 个测试通过

审查记录：

- Oracle 首轮：P0 无；发现 1 个 P1、2 个 P2、1 个 P3：
  - P1：unreadable Prompt Coach artifact 错误可能通过 Node `readFile` message 泄漏 workspace 绝对路径。
  - P2：`promptOptimizationProjectId` / `promptOptimizationId` 格式校验太晚，非法 id 可能先触发 workspace path helper 而不是稳定 `ProjectRequestError`。
  - P2：文档顶部“当前阶段/当前下一步”仍停在 Step 11。
  - P3：Workbench selection 使用当前 prop `projectId`，旧 result + 新 projectId 时会 fail closed 但 UX 不清晰。
- 已修复：
  - unreadable artifact 改为稳定错误 `Prompt optimization artifact is not readable.`，不拼底层路径，并补不泄漏 workspace root 的测试。
  - `parseGenerateRequest` 在 API 边界校验 `proj_...` 与 `opt_proj_..._[a-f0-9]{12}` 格式，并补非法 id 不启动 pipeline 的测试。
  - 文档顶部同步为 Step 12 lane。
  - Workbench selection 改用 `report.projectId`，不再使用当前 prop `projectId`。
- Oracle 复审：P0/P1/P2/P3 均无；确认上一轮 P1/P2 已关闭，P3 前端修复可接受。

当前下一步：

- Step 12 代码、验证、浏览器验收与 Oracle 门禁已完成；准备提交 `feat: add generation prompt provenance report`。未 push。

### 24. Step 13：Workbench Pipeline Evidence Panel

完成时间：2026-06-15

已完成内容：

- 新增 Workbench 侧 `pipeline-evidence-client.ts`：
  - 只读取 `GET /api/projects/:projectId/runs/:runId/artifacts`。
  - `projectId` / `runId` 为空时不发请求。
  - 请求 URL 对 `projectId` / `runId` 做 `encodeURIComponent`。
  - 404 显示明确空态：`No pipeline artifact index is available for this run.`。
- 新增 `PipelineEvidencePanel`：
  - 分组展示 `pipeline_artifact_index.json` refs：Prompt / Provenance、DSL、Runtime、Assets、Build / QA / Preview、Other。
  - 每个 ref 展示 `id`、`role`、`artifactRoot`、`path`、`status`、`required`、`producedBy`、`format` 和 missing / skipped `reason`。
  - 未知但安全的 artifact id 进入 Other。
  - 面板 refresh 只刷新 artifacts API，不触发全局 reload。
- Workbench 前端防御过滤：
  - 拒绝空 path、绝对路径、Windows drive path、protocol URL、反斜杠和 `..`。
  - path / reason 命中 `authorization`、`api key`、`secret`、`DEEPSEEK_API_KEY`、`raw provider`、`/Users/` 或 Windows absolute path 时不展示敏感文本。
  - 面板不渲染 artifact content link 或 download link。
- `App.tsx` 挂接 Pipeline Evidence 面板：
  - 加载 project/run 时同时读取 read-only artifact refs。
  - 手动修改 Project ID / Run ID 为空时回到 idle 状态。
  - 保持现有 generation、Prompt Coach、live edit、QA、asset status 和 preview 行为不变。
- `workbench-api.ts` 增加 Workbench-only `PipelineArtifactRef` / `PipelineArtifactIndex` / `PipelineArtifactsResponse` 类型。

阶段结果：

- 本步只增加 Workbench 对既有 artifact refs API 的只读展示。
- 未修改 `pipeline_artifact_index.json` 生成逻辑、schema、artifact ordering 或 API response contract。
- 未读取 `generation_input_report.json`、`prompt_optimization_report.json`、`dsl_validation_report.json`、`asset_pipeline_report.json` 或任何 artifact 内容。
- 未新增 artifact 内容 API、下载能力、目录枚举或任意 path 读取能力。
- 未触发 generation、Prompt Coach prepare、live edit、provider、Chrome MCP 或 Phaser runtime 改动。

已通过验证：

    npx vitest run tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 1 个测试文件，7 个测试通过

    npx vitest run tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/projects-service.test.ts
    # 2 个测试文件，28 个测试通过

    npx vitest run tests/workspace/pipeline-artifact-index.test.ts tests/workspace/generation-input-report.test.ts tests/workspace/workbench-prompt-coach-client.test.ts tests/workspace/prompt-coach.test.ts
    # 4 个测试文件，28 个测试通过

    npx vitest run tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/projects-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/generation-input-report.test.ts tests/workspace/workbench-prompt-coach-client.test.ts tests/workspace/prompt-coach.test.ts
    # 6 个测试文件，56 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：22 个测试文件，253 个测试通过

浏览器验收：

    npm run maker:start
    # API: http://localhost:3000
    # Workbench: http://localhost:5173

    Playwright browser flow
    # Browser plugin `iab` 不可用，使用 Playwright fallback。
    # 既有 run: proj_20260615_032806_46e6 / run_20260615_032806_46e6
    # 面板展示 generationInputReport、gameDsl、dslValidationReport、assetPipelineReport。
    # 面板展示 status、required / optional、missing / skipped reason。
    # 面板 Refresh 只请求 /api/projects/:projectId/runs/:runId/artifacts。
    # 未观察到 /generate、/prompt-optimizations、/live-edits、generation_input_report.json 或 pipeline_artifact_index.json 内容请求。
    # screenshot: /tmp/ai-game-maker-step13-pipeline-evidence.png

审查记录：

- Oracle 审查：P0/P1/P2/P3 clear。
  - 确认 Workbench 只调用既有 `/artifacts` refs API，空 project/run 不请求且 URL segment 已编码。
  - 确认面板只渲染 ref metadata 纯文本，无 `href` / download / artifact content 读取能力。
  - 确认前端过滤绝对路径、URL、反斜杠、`..`、secret/env/raw provider 文本，敏感 reason 会隐藏。
  - 确认 Step 13 未改后端 `pipeline_artifact_index.json` contract、generation、Prompt Coach prepare、live edit、provider、Chrome 或 Phaser runtime。

当前下一步：

- Step 13 代码、验证、浏览器验收与 Oracle 门禁已完成；准备提交 `feat: add workbench pipeline evidence panel`。未 push。

### 25. Step 14：Pipeline Acceptance Report

完成时间：2026-06-15

已完成内容：

- 新增 `pipeline_acceptance_report.json` contract：
  - `reportVersion: "pipeline_acceptance_report.v1"`。
  - 记录 `projectId` / `runId` / `overallStatus` / `previewable`。
  - `checkedArtifacts` 只记录 artifact id、相对 path、status、required。
  - `checks` 固定顺序覆盖 generation input、DSL validation、DSL artifact、runtime capability、asset pipeline、preview manifest、artifact index consistency、build log、QA report。
  - `errors` / `warnings` 由 checks 推导。
  - 不记录 timestamp、绝对路径、provider raw response、env、secret 或已有 report payload。
- `overallStatus` 与 `previewable` 改为 schema 级不变量：
  - 任一 required check `fail` / `skipped` => `overallStatus: "fail"`。
  - 无 required failure 且存在 warn => `overallStatus: "warn"`。
  - required checks 全部 pass 且无 warn => `overallStatus: "pass"`。
  - `previewable` 由 required checks 是否全部 pass 推导，schema 拒绝矛盾值。
- `pipeline_artifact_index.json` 增加 `pipelineAcceptanceReport` ref：
  - role 为 `index`。
  - artifact root 为 `model-output`。
  - path 为 `pipeline_acceptance_report.json`。
  - valid / invalid DSL index 均列出该 ref。
- valid path 写入 acceptance report：
  - compile / build / QA 阶段刷新 index 前写入 `pipeline_acceptance_report.json`。
  - build log / QA report 仍按既有 optional ref 语义进入 acceptance summary。
- invalid DSL path 写入 acceptance report：
  - `game_dsl.candidate.json` validation 失败路径写入 invalid acceptance/index，downstream generated-project/build/QA refs skipped。
  - raw DSL normalization failure 路径写入 `dsl_validation_report.json`、`runtime_capability_report.json`、invalid acceptance/index。
  - invalid source 为 `game_dsl.json` 时，index/acceptance 标记 `gameDsl` 与 `runtimeCapabilityReport` present，`gameDslCandidate` skipped。
  - invalid source 为 `game_dsl.candidate.json` 时，index/acceptance 标记 `gameDslCandidate` present，`gameDsl` skipped。
- 新增只读 API：
  - `GET /api/projects/:projectId/runs/:runId/acceptance`。
  - 只读取固定 `pipeline_acceptance_report.json`。
  - 先校验 run ownership，再校验 report 内部 `projectId` / `runId` 与请求一致。
  - 不接受客户端 path，不提供 artifact content / download / arbitrary path API。
  - schema 拒绝 unsafe artifactPath、evidenceRefs、reason、errors、warnings 和 status 文本。
- Workbench 最小挂接：
  - Evidence panel 的 Build / QA / Preview 分组展示 `pipelineAcceptanceReport` ref。
  - 未新增 JSON viewer、download/open file、report diff、自动修复或 artifact 内容请求。

阶段结果：

- 本步新增 deterministic acceptance summary artifact、artifact index ref、最小 API 和 Workbench ref 可见性。
- 未改变 QA verdict 总结构。
- 未改变 `dsl_validation_report`、`asset_pipeline_report`、`generation_input_report`、`prompt_optimization_report` 既有语义。
- 未改 DSL schema、LLM prompt 行为、Prompt Coach adapter、Phaser gameplay / visual polish、live edit、provider abstraction、asset pack、resolver ranking / fallback。
- invalid DSL acceptance 不读取 stale generated-project artifacts；只根据固定 model-output reports 与 deterministic artifact refs 汇总。

已通过验证：

    npx vitest run tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/projects-service.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 5 个测试文件，68 个测试通过

    npx vitest run tests/workspace/pipeline-artifact-index.test.ts tests/workspace/generation-input-report.test.ts tests/workspace/asset-pipeline-report.test.ts tests/workspace/dsl-validation-report.test.ts
    # 4 个测试文件，16 个测试通过

    npx vitest run tests/workspace/projects-service.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 2 个测试文件，30 个测试通过

    npx vitest run tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/projects-service.test.ts
    # 4 个测试文件，61 个测试通过

    npx vitest run tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/generation-input-report.test.ts tests/workspace/asset-pipeline-report.test.ts tests/workspace/dsl-validation-report.test.ts tests/workspace/projects-service.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 8 个测试文件，80 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：23 个测试文件，259 个测试通过

审查记录：

- Oracle 首轮：P0 无；发现 1 个 P1、1 个 P2、1 个 P3：
  - P1：raw DSL normalization failure 分支没有写 `pipeline_acceptance_report.json` / `pipeline_artifact_index.json`。
  - P2：acceptance report schema / API 边界没有限制 `artifactPath`、`evidenceRefs`、`reason`、`errors`、`warnings` 的安全内容。
  - P3：API 正向 fixture 过瘦，建议增加 unsafe API 边界测试。
- 已修复首轮问题：
  - raw normalization failure 分支写出 invalid `dsl_validation_report.json`、acceptance report 和 artifact index。
  - schema 拒绝 unsafe relative path、protocol/absolute path、secret/env/raw provider 文本。
  - API 测试覆盖 report identity mismatch 与 unsafe content rejection。
- Oracle 二轮：P0/P2 无；发现 1 个 P1、1 个 P3：
  - P1：raw normalization failure 实际有 `game_dsl.json`，但 index/acceptance 错标 `game_dsl.candidate.json` present。
  - P3：测试没有断言真实 `game_dsl.candidate.json` 文件不存在。
- 已修复二轮问题：
  - invalid index 按 `dsl_validation_report.sourceArtifact` 区分 `game_dsl.json` 与 `game_dsl.candidate.json`。
  - acceptance DSL artifact check 指向真实 source artifact。
  - 测试断言 `gameDsl` present、`gameDslCandidate` skipped 且 candidate 文件不存在。
- Oracle 三轮：P0/P2 无；发现 1 个 P1：
  - P1：raw normalization failure 实际有 `runtime_capability_report.json`，但 index/acceptance 仍标 skipped。
- 已修复三轮问题：
  - `sourceArtifact="game_dsl.json"` 的 invalid index 标记 `runtimeCapabilityReport` present。
  - raw normalization failure helper 显式写出 `runtime_capability_report.json`。
  - 测试断言 runtime report ref 与真实文件存在性一致。
- Oracle 最终复审：P0/P1/P2/P3 均无。

当前下一步：

- Step 14 代码、验证与 Oracle 门禁已完成；准备提交 `feat: add pipeline acceptance report`。未 push。

### 26. Step 15：Workbench Acceptance Summary

完成时间：2026-06-15

已完成内容：

- 新增 Workbench 侧 `pipeline-acceptance-client.ts`：
  - 只读取 `GET /api/projects/:projectId/runs/:runId/acceptance`。
  - `projectId` / `runId` 为空时不发请求。
  - 请求 URL 对 `projectId` / `runId` 做 `encodeURIComponent`。
  - 404 显示明确空态：`No pipeline acceptance report is available for this run.`。
- 新增 `PipelineAcceptanceSummary`：
  - 展示 `overallStatus`、`previewable`、required checks pass/fail 统计。
  - 展示 failed required checks、warn checks、skipped checks 的 check id / category / status / required / reason。
  - 不展示完整 JSON payload，不提供 artifact content link、download link 或任意 path 打开能力。
  - 面板 refresh 只刷新 acceptance API，不触发全局 reload。
- Workbench 前端防御过滤：
  - 拒绝展示空 path、绝对路径、Windows drive path、protocol URL、反斜杠和 `..`。
  - reason / status / id / category / artifactId 命中 `authorization`、`api key`、generic API key、`process.env.*`、Bearer token、`secret`、`token`、`raw provider`、`/Users/`、`/tmp/`、`/home/` 或 Windows absolute path 时不展示敏感文本。
  - 事件、Build Log、HTTP statusText 和 thrown error 展示层隐藏本机绝对路径与 sensitive token 文本，避免页面整体暴露 workspace path。
- `App.tsx` 挂接 Acceptance Summary：
  - 加载 project/run 时并行读取 read-only acceptance summary。
  - 手动修改 Project ID / Run ID 为空时回到 idle 状态。
  - Acceptance 面板的 `Refresh` 只调用 acceptance client。
- `workbench-api.ts` 增加 Workbench-only `PipelineAcceptanceReport` / `PipelineAcceptanceCheck` / `PipelineAcceptanceResponse` 类型。

阶段结果：

- 本步只增加 Workbench 对既有 acceptance API 的只读摘要展示。
- 未修改后端 `pipeline_acceptance_report.json`、`pipeline_artifact_index.json`、acceptance API、QA verdict、DSL schema、generation prompt、Prompt Coach adapter、Phaser runtime、live edit、provider abstraction、asset pack、resolver ranking / fallback。
- 未读取 `pipeline_acceptance_report.json` artifact content path，也未新增 artifact content / download / arbitrary path API。
- 未触发 generation、Prompt Coach prepare、live edit、QA rerun、provider 或 Phaser runtime 改动。

已通过验证：

    npx vitest run tests/workspace/workbench-pipeline-acceptance-client.test.ts tests/workspace/projects-service.test.ts
    # 2 个测试文件，32 个测试通过

    npx vitest run tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 3 个测试文件，14 个测试通过

    npx vitest run tests/workspace/workbench-prompt-coach-client.test.ts tests/workspace/generation-input-report.test.ts
    # 2 个测试文件，15 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

浏览器验收：

    npm run maker:start
    # API: http://localhost:3000
    # Workbench: http://localhost:5173

    Playwright browser flow
    # 验收 run: proj_20260615_043855_32f2 / run_20260615_043855_32f2
    # Acceptance Summary 展示 PASS、Previewable: Yes、Required checks: 7 passed / 0 failed、Warnings: 0、Skipped: 0。
    # Acceptance 面板 Refresh 只请求 /api/projects/:projectId/runs/:runId/acceptance。
    # 未观察到 /generate、/prompt-optimizations、/live-edits、pipeline_acceptance_report.json、artifact content/path 请求。
    # 页面正文未出现 OPENAI_API_KEY、DEEPSEEK_API_KEY、process.env、Bearer token、raw provider、/Users/、/tmp/、/home/ 或 Windows absolute path；未展示 full JSON payload。
    # Acceptance Summary 不展示 Report ref、Ref 或 pipeline_acceptance_report.json。

审查记录：

- Oracle 首轮：P0/P1 无；发现 1 个 P2、2 个 P3：
  - P2：Workbench 脱敏边界漏掉 generic env/token、`process.env.X`、Bearer token、`/tmp`、`/home`，且 thrown error path 可绕过 acceptance HTTP statusText 脱敏。
  - P3：副作用边界缺 App 集成级自动化测试；当前由 client 单测和 Playwright browser flow 覆盖。
  - P3：Acceptance Summary 展示 `Report ref` / `Ref:`，超出最小 reason 摘要面。
- 已修复：
  - 新增共享 `workbench-display-safety.ts`，覆盖 generic API key、`process.env.*`、Bearer token、token、raw provider、`/Users`、`/tmp`、`/home`、Windows absolute path。
  - `fetchPipelineAcceptance` 捕获 thrown fetch error 并返回脱敏 error view；`App.tsx` 的 acceptance refresh、global `runAction` 和 runtime apply error 展示使用同一脱敏 helper。
  - Acceptance Summary 移除 `Report ref` 和 per-check `Ref:` 展示，只保留 status / previewable / counts / check id / category / status / required / reason。
  - 测试补充 generic env/token/thrown error 脱敏覆盖；浏览器复验确认 summary 无 ref/path，Refresh 只请求 `/acceptance`。
- Oracle 二轮：P0/P1 无；P2 仍未完全关闭：
  - `sanitizeWorkbenchErrorMessage` 对敏感 thrown error 复用首个 token，可能把 `OPENAI_API_KEY`、`process.env.OPENAI_API_KEY`、`/tmp/...` 或 `Bearer` 暴露为 `OPENAI_API_KEY Error`。
- 已修复二轮问题：
  - `sanitizeWorkbenchErrorMessage` 命中敏感内容时只保留安全数字 HTTP status，例如 `500 Error`；其他敏感 thrown error 统一返回 fallback。
  - 测试改为断言 thrown `OPENAI_API_KEY ... process.env ... Bearer ... /tmp/...` 只显示 `Pipeline acceptance request failed.`。
- Oracle 最终复审：P0/P1/P2 均 clear；P3 副作用边界由 client 单测和浏览器复验覆盖，按当前 Step 15 范围可接受，不阻塞。

当前下一步：

- Step 15 代码、验证、浏览器验收与 Oracle 门禁已完成；准备提交 `feat: add workbench acceptance summary`。未 push。

### 27. Step 16：Pipeline Golden Trace Regression

完成时间：2026-06-15

已完成内容：

- 新增 `tests/workspace/pipeline-golden-trace.test.ts`。
- 新增 valid golden trace 覆盖：
  - 在 test harness 中创建 source project/run。
  - 调用 Prompt Coach mock prepare，断言 `prompt_optimization_report.json` 与 `optimized_prompt.txt` artifact 存在。
  - 用 `optimizedPrompt` 和 verified provenance 调用 `ProjectsService.generateProject`。
  - 读取并断言 `generation_input_report.json` 的 `source=prompt-coach-candidate`、`effectivePrompt`、`promptOptimizationRef` 和不复制完整 Prompt Coach payload。
  - 读取并断言 `game_dsl.json`、`dsl_validation_report.json` 的 valid 状态、`stableIdSummary` 和 `objectCounts`。
  - test-only fake compiler 写出最小合法 asset plan、public manifest、preview manifest、实际 `public/assets/*.svg`、preview `main.ts`、asset resolution report，并调用生产 `writeAssetPipelineReport` 生成 `asset_pipeline_report.json`。
  - 读取并解析 `asset_pipeline_report.json`，断言 asset pipeline report schema、checks 和 artifacts refs。
  - 读取并断言 `pipeline_artifact_index.json` 包含 generation input、DSL validation、runtime capability、asset plan、public manifest、preview manifest、asset resolution、asset pipeline、acceptance 和 artifact index refs。
  - 读取并断言 `pipeline_acceptance_report.json` 为 `overallStatus=pass`、`previewable=true`，required checks 无 fail，check ordering deterministic。
  - 调用既有 `getPipelineArtifacts` / `getPipelineAcceptance` 验证当前 run API，且 project/run mismatch 仍 rejected。
  - 将 index / acceptance 转成 Workbench Evidence / Acceptance view-model，断言 Prompt、DSL、Runtime、Assets、Build / QA / Preview 分组和 acceptance summary 关键字段。
- 新增 invalid DSL trace 覆盖：
  - service-level 构造 unresolved projectile DSL。
  - 断言 `generation_input_report.json`、`game_dsl.candidate.json`、invalid `dsl_validation_report.json`、fail `pipeline_acceptance_report.json` 均存在。
  - 断言 downstream runtime / asset pipeline refs skipped，且不混入 stale generated-project artifact。
- 新增 determinism 覆盖：
  - 同输入跑两次 golden trace。
  - 只比较 normalized contract summary：artifact ids/statuses、acceptance check ids/statuses、generation input source、DSL valid、previewable。
  - 不比较 timestamp、随机 run id、绝对目录或完整 JSON snapshot。

阶段结果：

- 本步只新增 workspace 测试文件、test-only helper 和 review-gated 文档记录。
- 未修改 production code。
- 未新增 Workbench panel、API endpoint、report contract、LLM mode、provider、artifact content/download/path API、generation behavior 或 QA verdict 字段。
- 未修改 Prompt Coach、generation input、DSL validation、asset pipeline、artifact index、acceptance、Phaser、live edit、asset pack 或 resolver 行为。

已通过验证：

    npx vitest run tests/workspace/pipeline-golden-trace.test.ts
    # 1 个测试文件，3 个测试通过

    npx vitest run tests/workspace/prompt-coach.test.ts tests/workspace/generation-input-report.test.ts tests/workspace/dsl-validation-report.test.ts tests/workspace/asset-pipeline-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts
    # 6 个测试文件，28 个测试通过

    npx vitest run tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/workbench-pipeline-acceptance-client.test.ts tests/workspace/workbench-prompt-coach-client.test.ts
    # 3 个测试文件，28 个测试通过

    npx vitest run tests/workspace/projects-service.test.ts
    # 1 个测试文件，23 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

浏览器验收：

- 本步未修改 Workbench / API / generation production code，按 Step 16 要求不跑浏览器验收。

审查记录：

- Oracle 首轮：P0/P1 无；发现 1 个 P2、1 个 P3：
  - P2：golden trace 对 Asset pipeline 的覆盖仍是声明式 ref 覆盖，fake compiler 只返回 `asset_plan.json`、manifest 和 `asset_pipeline_report.json` 等 `files` 条目，没有写出真实 asset pipeline artifacts 或解析 report。
  - P3：审查请求称“仅新增测试文件”，但实际还包含 review-gated 文档 diff；范围说明需要纳入 docs diff。
- 已修复：
  - test-only fake compiler 写出最小合法 asset pipeline artifacts，并通过生产 `writeAssetPipelineReport` 生成 `asset_pipeline_report.json`。
  - valid golden trace 使用 `AssetPipelineReportSchema.parse` 读取/解析 `asset_pipeline_report.json`，并断言 asset plan、public manifest、asset resolution 文件存在。
  - 文档记录明确纳入 Step 16 review-gated 记录。
- Oracle 最终复审：P0/P1/P2 无，P3 无阻塞；确认上一轮 P2 已关闭，文档 diff 范围卫生可接受。

当前下一步：

- Step 16 测试、验证与 Oracle 门禁已完成；准备提交 `test: add pipeline golden trace coverage`。未 push。

### 28. Step 18：Local Template Asset Library Usage Evidence

完成时间：2026-06-15

已完成内容：

- 新增 `apps/maker-api/src/compiler/template-asset-catalog.ts`：
  - 生成 `template_asset_catalog.v1`。
  - 盘点本地 `assets/asset-packs` 与 small runtime fixture metadata。
  - catalog entry 只保留 `id`、`kind`、`source=local-template`、安全相对 `relativePath`、`tags`、`supportedGenres`、`purpose`、`required`。
  - 对最终写入 entry 的文件路径做 regular file 校验；local pack 目录名必须与 `pack.id` 一致。
- 新增 `apps/maker-api/src/compiler/asset-library-usage-report.ts`：
  - 生成 per-run `asset_library_usage_report.json`。
  - 读取 `asset_plan.json`、`public/asset_manifest.json` 与 Phaser preview manifest。
  - 校验 manifest asset 使用是否匹配 catalog，或记录 `template_svg` / `placeholder` deterministic fallback。
  - report 只记录 usage/ref/status/reason，不复制 `AssetManifest` 或 `asset_pipeline_report` payload。
- 更新 compiler valid path：
  - 写出 `asset_library_usage_report.json`。
  - 将 `asset_library_usage_report.json` 加入 `RuntimeCompileSuccess.files`。
- 更新 artifact / acceptance / Workbench refs：
  - `pipeline_artifact_index.json` 新增 `assetLibraryUsageReport` ref。
  - invalid DSL path 将 `assetLibraryUsageReport` 标记为 skipped，不读取 generated-project stale artifact。
  - `pipeline_acceptance_report.json` 新增 required assets check `asset_library_usage`；usage status 为 `fail` 或 present ref 缺 status 时 fail，`warn` 保持 `previewable=true`。
  - Workbench Evidence panel 仅把 `assetLibraryUsageReport` 归入 Assets 分组，不新增 content/download/path API。
- 新增/更新测试：
  - catalog deterministic、安全相对路径、文件存在、duplicate id、unsafe path、pack id mismatch。
  - usage report matched / fallback / unmatched / status 推导 / 安全文本 / public-preview mismatch / identity mismatch。
  - valid / invalid artifact index 与 acceptance。
  - invalid DSL stale `asset_library_usage_report.json` 不混入 index/acceptance。
  - golden trace 与 Workbench Evidence 分组。

阶段结果：

- 本步保持 local/template asset library first，只新增可验证证据。
- 未接 provider abstraction、外部 asset 生成服务、artifact content/download/path API。
- 未修改 resolver ranking / fallback 策略、DSL schema、LLM prompt、Prompt Coach adapter、live edit、Phaser gameplay / visual polish、QA verdict 总结构。
- `asset_library_usage_report.json` 不包含 timestamp、绝对路径、env、secret、raw provider response 或完整 manifest/report payload。

已通过验证：

    npx vitest run tests/workspace/template-asset-catalog.test.ts tests/workspace/asset-library-usage-report.test.ts
    # 2 个测试文件，8 个测试通过

    npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/asset-pipeline-report.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/pipeline-golden-trace.test.ts
    # 5 个测试文件，46 个测试通过

    npx vitest run tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 1 个测试文件，7 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：27 个测试文件，282 个测试通过

审查记录：

- Oracle 首轮：P0/P1 无；发现 2 个 P2、2 个 P3：
  - P2：catalog 文件存在校验未完全对齐最终输出 path；runtime thumbnail 未 stat。
  - P2：`assetLibraryUsageReport` ref present 但未传入 usage status 时 acceptance 会默认 pass。
  - P3：invalid DSL stale artifact 测试未同时覆盖 stale `asset_library_usage_report.json`。
  - P3：usage report 测试缺 public/preview manifest mismatch 和 identity mismatch。
- 已修复：
  - catalog 校验 `pack.id === directory entry`，并对最终 entry exact path 做 regular file stat。
  - runtime fixture entry 对最终 thumbnail exact path 做 regular file stat。
  - acceptance 在 present ref 缺 usage status 时 fail，reason 为 `asset_library_usage_report.json status is unavailable.`。
  - invalid DSL 测试写入并断言不混入 stale `asset_library_usage_report.json`。
  - usage report 测试补 public/preview mismatch 与 identity mismatch。
- Oracle 最终复审：P0/P1/P2/P3 均无；首轮 P2/P3 已关闭。

当前下一步：

- Step 18 代码、验证、文档与 Oracle 门禁已完成；未提交，未 push。

### 29. Step 19：Catalog-backed AssetManifest Identity

完成时间：2026-06-15

已完成内容：

- 扩展 `AssetManifestAsset` contract，新增可选 `catalogRef`：
  - `catalogVersion: "template_asset_catalog.v1"`。
  - `catalogAssetId`。
  - `source: "local-template"`。
- 在 local/template 资产生成路径写入 catalog identity：
  - complete local asset pack selection 写入 `local-pack:<packId>:<assetId>`。
  - mixed local pack selection 写入同一 local pack catalog id。
  - runtime small-library asset 写入 `runtime-small-library:<runtimeAssetId>`。
  - `template_svg` deterministic fallback 不伪造 `catalogRef`。
- 更新 `asset_library_usage_report.json`：
  - 优先读取 manifest `catalogRef.catalogAssetId`。
  - 继续用 manifest source 派生的 expected id 做一致性校验，避免错误 catalogRef 被接受。
  - 校验 catalog entry `source` / `relativePath` 与 manifest source identity 一致。
  - local pack 校验 `assets/asset-packs/<sourcePack>/<assetId>.<format>`。
  - runtime asset 校验 `conversion.sourcePath`；缺失时 deterministic fail。
  - `missingCatalogEntries` 只记录真正缺失的 catalog entry，不把 manifest 缺字段或 path mismatch 混为 missing entry。
- 更新 `asset_pipeline_report.json`：
  - 新增 `catalogIdentityMatchesPreviewManifest` check。
  - public manifest 与 Phaser preview manifest 的 `catalogRef` 不一致时 fail。
- 更新 golden trace：
  - golden manifest 改为 catalog-backed local asset pack fixture。
  - `asset_library_usage_report.json` used assets 全部 matched。
  - acceptance 从 `warn` 变为 `pass`，仍保持 `previewable=true`。
- 新增/更新回归测试：
  - manifest local/template assets 写入 identity。
  - preview manifest 携带同一 identity。
  - usage report 覆盖 missing catalogRef、bad catalog id、missing catalog entry、local path mismatch、runtime missing `conversion.sourcePath`、runtime path mismatch。
  - report payload 不复制 catalog `relativePath` 或完整 manifest/report。
  - artifact index / acceptance / Workbench Evidence 仍只暴露 refs。

阶段结果：

- 本步只强化 catalog identity 和 report 校验，不改变 asset selection strategy、resolver ranking / fallback、asset packs、provider abstraction、external asset generation、DSL schema、LLM prompt、Prompt Coach adapter、live edit、Phaser gameplay / visual polish、QA verdict 或 artifact API。
- `AssetManifest.path` 仍保持 generated runtime path，例如 `assets/player.svg`；catalog `relativePath` 仍表示 source asset path，因此 path consistency 校验发生在 source identity 层。
- `asset_library_usage_report.json` 仍通过既有 `asset_library_usage` acceptance check 反映 pass/warn/fail；没有新增 report artifact 或 content/download/path API。

已通过验证：

    npx vitest run tests/workspace/asset-library-usage-report.test.ts tests/workspace/asset-pipeline-report.test.ts tests/workspace/compiler-service.test.ts
    # 3 个测试文件，25 个测试通过

    npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/pipeline-golden-trace.test.ts
    # 4 个测试文件，42 个测试通过

    npx vitest run tests/workspace/workbench-pipeline-evidence-client.test.ts
    # 1 个测试文件，7 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查通过

    git diff --check
    # 无输出

    npm test
    # contracts：24 个测试文件，224 个测试通过
    # workspace：27 个测试文件，286 个测试通过

审查记录：

- Oracle 首轮：P0 无；发现 1 个 P1：
  - P1：`runtime_asset` 缺少 `conversion.sourcePath` 时会跳过 catalog path consistency 校验并错误 matched。
- 已修复：
  - `expectedCatalogRelativePath(asset)` 返回 `undefined` 时 usage report 直接 fail，reason 为 `is missing manifest source path for catalog identity validation`。
  - 新增 runtime 缺 `conversion.sourcePath` 和 runtime catalog path mismatch 两条回归测试。
- Oracle 复审：P0/P1/P2 clear；确认上一轮 P1 已清除，未发现 resolver/fallback/provider/DSL/Phaser/QA/API 边界漂移。

当前下一步：

- Step 19 代码、验证、文档与 Oracle 门禁已完成；未提交，未 push。
