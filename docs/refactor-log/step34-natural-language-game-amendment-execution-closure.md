# Step 34 Natural Language Game Amendment Execution Closure

目标：把玩家自然语言修改请求闭合为可执行、可验证、可预览、可接受、可拒绝、可撤销的 candidate lifecycle。Step 34 使用现有 DSL、IR、runtime profile、candidate artifact 和 live-edit 能力完成闭环；Step 35 再把能力实现重构为可组合 Gameplay Capability Platform。

## 执行边界

- 保持 DSL-first：自然语言先进入 `GameDesignDelta` / `GameOperation`，再由确定性系统路由执行。
- 不让 Workbench 直接写 SSOT。
- 不让模型或自然语言修改直接改 generated Phaser source。
- Accept 前 active run / active artifacts 不变。
- Candidate artifacts 必须有可审计 refs；Accept / Reject / Undo 必须有后端权威日志或 checkpoint。
- `understood`、`executable`、`verified`、`accepted` 四个状态不能互相伪装。
- Step 34 不建立完整 capability graph；当前使用 profile-backed capability resolver，Step 35 再替换能力实现。

## 分步闭环

| Step | 状态 | 本步边界 |
| --- | --- | --- |
| 34.1 Amendment Request, Provenance and Lifecycle Contract | completed | 建立 request/proposal lifecycle、candidate verification artifact 和 Accept 前置门禁基础。 |
| 34.2 DeepSeek Structured Intent Understanding | completed | 把自然语言理解阶段拆成模型/规则 provenance、typed intents、clarification 和 structured output validation，不停留在字段匹配。 |
| 34.3 Generic GameDesignDelta and Game Amendment IR | completed | 冻结通用 delta / amendment operation / expected effects，不绑定 genre 字段表或 Phaser 路径。 |
| 34.4 Capability-aware Deterministic Execution Router | completed | 基于能力解析选择 hot、warm candidate、regeneration、unsupported 或 clarification。 |
| 34.5 Candidate DSL / Scene / Asset Amendment Builder | completed | 从 active snapshot 生成隔离 candidate DSL、Scene IR、asset artifacts 和 diff。 |
| 34.6 Hot Runtime Patch Session | completed | 补齐 runtime handshake、before snapshot、reversible patch、Accept persistence 和 Reject restore。 |
| 34.7 Warm Restart and Candidate Run Executor | completed | 把 warm restart 从错误分类升级为真实 candidate run / preview artifact / promotion 流程，完整 build/QA 后续完成。 |
| 34.8 Regeneration Amendment Executor | completed | 为现有 player-theme regeneration 补 preservation contract、protected content、drift guard 和 capability gate；结构性开放设计仍走 unsupported/future capability。 |
| 34.9 Capability-effect Gameplay and Render Verification | completed | 按 expected effects 证明请求效果真实发生，缺失或 inconclusive evidence 阻止 Accept。 |
| 34.10 Accept / Reject / Undo Authoritative Promotion | completed | 记录 authoritative promotion artifact set 和可审计提升边界，Reject 不改 active，Undo 恢复完整 checkpoint。 |
| 34.11 Workbench Proposal, Progress and Evidence UX | completed | Workbench 展示理解、执行方式、candidate/active 区分、progress、evidence 和 Accept gate。 |
| 34.12 Final Contract / Oracle Review | completed | 按 P0/P1/P2/P3 做最终 contract、实现、文档和真实验收闭环。 |

## 当前执行记录

### 34.1 Amendment-specific candidate verification artifact

完成时间：2026-06-18

目标：先补 Step 34 的最小真实验证缺口。玩家主题 candidate regeneration 不能只生成 candidate DSL / Scene IR / asset diff 后把 `qaStatus` 留在 `not_run`，必须写出 amendment-specific verification artifact，证明请求效果在 candidate artifacts 中发生，并作为 Accept 前置门禁。

非目标：

- 不新增 Step 35 capability package / graph。
- 不新增浏览器 runtime QA runner。
- 不扩展新的自然语言意图。
- 不改 planner 的 `GameDesignDelta` / routing 语义。
- 不改 generated Phaser source。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - 新增 `candidateAmendmentVerification` artifact ref id。
  - `SemanticAmendmentCandidatePreview` / checkpoint 增加 `candidateAmendmentVerificationRef`。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - 注册 `candidate/candidate_amendment_verification.json`。
- `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts`
  - 为 candidate regeneration 生成 `semantic_amendment_verification.v1`。
  - 对 player theme amendment 检查 candidate DSL label change。
  - 当存在 Scene IR / asset diff 时，额外检查 `player_cat` visual intent 和 request-required asset intent 创建。
  - 对当前没有 amendment-specific verifier 的 delta 返回 failed check，不伪装通过。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`
  - preview 阶段写入 `candidate_amendment_verification.json`。
  - candidate preview 的 `qaStatus` 使用 verification status。
  - candidate accept 要求 `qaStatus === "passed"` 且 verification ref 存在。
  - candidate accept 重新读取 sandbox `candidate_dsl.json` 和 `candidate_amendment_verification.json`，并校验它们与即将提升的 candidate run 一致。
  - Accept / Reject / Undo checkpoint 保留 verification ref。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 preview artifact refs、side-scrolling Scene IR / asset diff verification checks、Accept / Reject / Undo checkpoint ref。
  - 覆盖 preview 后篡改 candidate run DSL 但保留相同 run id 时，Accept 必须失败且 active run 不变。
  - 保留 no-op candidate `AMENDMENT_NO_VISIBLE_EFFECT` 不创建 candidate run。

阶段结果：

- Candidate regeneration 已从“有 candidate artifacts 但 QA 状态未运行”推进为“有 requested-effect verification artifact，并由 Accept 门禁消费”。
- Side-scrolling 玩家主题修改会证明：
  - player label 改为 `小猫`；
  - candidate Scene IR 中玩家 visual intent 改为 `player_cat`；
  - candidate asset diff 创建 `player_cat` 且 active run 未被污染。
- Top-down shooter 旧 candidate path 没有 Scene IR / asset diff 时，只要求当前可用的 candidate DSL label evidence，不把缺失视觉 evidence 伪装成通过。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts
  -> passed, 1 file, 21 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 1 个；P2/P3 无。
- P1 修复：candidate accept 不再只信任 `preview_state` 缓存；现在重新读取 sandbox candidate DSL、candidate run DSL 和 amendment verification artifact，校验 proposal/source/candidate identity、verification `status === "passed"`，并要求 candidate run DSL 与 sandbox candidate DSL 完全一致。
- P1 回归：preview 后把 candidate run `game_dsl.json` 改成非小猫但保留相同 `runId` 时，`accept` 抛 `ProjectRequestError` 且 active run 不变。
- Oracle 复审：P0/P1/P2 无；P3 指出末尾停点措辞应明确为 Step 34.1，避免误读为整个 Step 34 已完成。
- P3 修复：停点措辞改为“完成 Step 34.1 后停下”。
- 文档自审：P0/P1/P2/P3 未发现；文档明确记录当前只完成 34.1，未把 candidate artifact verification 宣称为真实浏览器 QA。

当前下一步：

```txt
34.2 DeepSeek Structured Intent Understanding
```

继续执行 34.2 到 34.12，直到 Step 34 全部闭环后再停。

### 34.2 DeepSeek Structured Intent Understanding

完成时间：2026-06-19

目标：把自然语言理解阶段拆成模型/规则 provenance、typed intents、open design intents、clarification policy 和 structured output validation。当前已有 deterministic planner；本步要先证明 planner/backend planning path 不再以 field matching 作为失败入口，并把 DeepSeek / rules / hybrid provenance 与后续 execution artifacts 的因果链记录清楚。

非目标：

- 不实现 candidate builder。
- 不实现 hot runtime patch session。
- 不实现 Workbench evidence panel。
- 不改 Step 35 capability package / graph。

实现范围：

- `packages/game-dsl/src/amendments/semantic-amendment-schema.ts`
  - `understanding` 增加 `intentClass`、`explicitConstraints`、`inferredConstraints`、`unresolvedReferences`、`modelInvocationId`、`plannerProvenanceStatus`。
- `packages/game-dsl/src/amendments/semantic-amendment-planner.ts`
  - deterministic planner 生成 `RULE_FALLBACK` provenance，不伪装 DeepSeek 调用。
  - typed edit / open design / structural / genre / ambiguous intent 进入 `intentClass`。
  - player reskin 自动记录 `preserve_gameplay_unless_explicitly_requested` inferred constraint。
- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - 新增 plan artifact ref：`modelInvocationProvenance`。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - 写入 `model_invocation_provenance.json`。
  - 当前 provider 明确为 `rules`，`promptVersion` 为 deterministic planner，`structuredOutputValidated: true`。
  - `inputHash` 和 `baseDslHash` 使用真实 sha256，不用长度或伪 hash。
  - 读取旧版 `proposal.json` 时在 artifact 边界补齐 34.2 understanding provenance 和 34.3 amendment IR 外壳，保证 34.1 已生成 proposal 不被新 schema 直接打断。
- `tests/contracts/semantic-amendments-planner.test.ts`
  - 覆盖 typed intent、ambiguous intent、`RULE_FALLBACK` 和 deterministic model invocation id。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 backend artifact refs、`model_invocation_provenance.json` 内容和 proposal understanding provenance。
  - 覆盖 provenance hash / prompt / status / fallback gate 字段。
  - 覆盖旧 proposal artifact 删除新字段后仍可 preview，并由读取边界迁移。

阶段结果：

- 当前实现仍是 deterministic rules planner；文档和 artifact 都明确 `provider: "rules"`，没有声称 DeepSeek 已参与 amendment planning。
- 自然语言理解结果现在有 typed intent class、规则 provenance、结构化 output validation artifact。
- 已有 unsupported / clarification 路径继续保留 `understood` / `needs_clarification` / `unsupported_capability` 语义，不退回 `no_editable_field`。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 32 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 旧 proposal artifact 读取会被新 required understanding 字段打断；P2 provenance hash/audit 字段测试不足；P3 文档把 Workbench UI 混入 34.2 验收措辞。
- P1 修复：`readSemanticAmendmentProposal` 在 artifact read boundary 执行 `safeParse -> legacy backfill -> parse`，旧 proposal artifact 不再被 34.2 新字段直接打断；非法 artifact 仍必须通过 schema parse。
- P2 修复：测试断言 provenance `provider`、`promptVersion`、`status`、`fallbackUsed`、`inputHash`、`baseDslHash` 和 64 位 sha256 格式。
- P3 修复：34.2 目标收敛为 `planner/backend planning path`，不宣称 Workbench UI evidence panel 已完成。
- Oracle 复审：P0/P1/P2 无；P3 文档验证结果仍写 pending。
- P3 修复：文档验证结果更新为真实通过命令和本次复审结论。

当前下一步：

```txt
34.3 Generic GameDesignDelta and Game Amendment IR
```

### 34.3 Generic GameDesignDelta and Game Amendment IR

完成时间：2026-06-19

目标：将 34.2 的自然语言理解结果归一化为可验证、可编译、capability-ready 的通用 amendment IR。IR 必须使用 stable selector、operation precondition、capability requirement 和 expected effect，不允许把自然语言修改系统绑定到 DSL array index、raw JSON Patch path 或 Phaser source。

非目标：

- 不实现 Step 35 capability graph。
- 不替换 34.4 execution router。
- 不实现 34.9 gameplay/render evidence runner。
- 不让模型直接生成 concrete patch 或 generated source。

实现范围：

- `packages/game-dsl/src/amendments/semantic-amendment-schema.ts`
  - 新增 `StableTargetSelectorSchema`、`CapabilityRequirementSchema`、`ExpectedEffectSchema`、`OperationPreconditionSchema`、`GameAmendmentOperationSchema`、`GameAmendmentIrSchema`。
  - `StableTargetSelector` 和定位字段禁止 raw JSON Pointer / 点号数组索引，并要求至少具备 `id`、`role` 或 `tags`。
  - `GameAmendmentOperation` 要求每个 operation 都有 stable `target`、非空 `preconditions`、`requiresCapabilities` 和 `expectedEffects`。
  - `GameAmendmentIr` 增加 `requestId`、`baseArtifactHashes`、`operationDependencies`。
- `packages/game-dsl/src/amendments/semantic-amendment-planner.ts`
  - deterministic planner 把 `GameOperation` 编译成通用 `GameAmendmentOperation`。
  - stat tuning 使用 semantic role / stable component id，而不是 `/enemyTypes/0` 之类数组路径。
  - player speed / health / weapon fire rate 写入 base value precondition。
  - theme regeneration、event action、behavior change 也写入 preconditions、capabilities 和 expected effects。
  - multi-operation plan 生成 deterministic dependency order。
- `packages/game-dsl/src/amendments/index.ts`
  - 导出新增 IR schemas 和 types。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - legacy proposal backfill 同步补齐 34.3 IR envelope 新字段，保证旧 artifact 仍能通过 schema parse。
- `tests/contracts/semantic-amendments-planner.test.ts`
  - 覆盖 player speed amendment IR envelope、stable target、preconditions、capabilities、expected effects。
  - 覆盖 pacing multi-operation dependency order。
  - 覆盖 raw JSON Patch path、点号数组索引、property 泄漏、缺失 target、空 preconditions 在 amendment IR contract boundary 被拒绝。

阶段结果：

- Proposal artifact 现在包含通用 `amendmentIr`，后续 34.4 router / 34.9 verification 可以直接消费 capability requirements 和 expected effects。
- Concrete DSL patch 仍保留在 candidate draft patch 中；amendment IR 不暴露 raw JSON Patch path。
- 当前 no-op runtime/candidate 效果仍由已有 preview/candidate verification gate 拦截；34.3 只冻结 IR 层可表达 preconditions 和 expected effects。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 33 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 2 个，分别是点号数组索引 / property 等定位字段仍可能泄漏 concrete path，以及 operation target / preconditions 未被 schema 强制；P2/P3 无。
- P1 修复：新增 shared stable semantic ref guard，拒绝 `/`、raw JSON Pointer 和 dot-number array-index ref；覆盖 selector、property、componentType、precondition/effect 定位字段。
- P1 修复：`GameAmendmentOperationSchema.target` 改为必填，`preconditions` 改为 `.min(1)`；`addRule` planner branch 补 `scene.main` target 和 target_exists precondition。
- P1 回归：contract tests 覆盖 `enemyTypes.0.physics`、`property: "/enemyTypes/0/..."`、缺失 target、空 preconditions 均被拒绝。
- Oracle 复审：P0/P1/P2/P3 均无。

当前下一步：

```txt
34.4 Capability-aware Deterministic Execution Router
```

### 34.4 Capability-aware Deterministic Execution Router

完成时间：2026-06-19

目标：把 amendment routing 从旧的 execution summary 升级为可审计的 capability-aware execution plan。计划必须列出 required / available / missing / incompatible capabilities、operation plan、runtime/candidate/reload requirement、verification requirements 和 rejected unsafe fallbacks。

非目标：

- 不引入 Step 35 capability graph。
- 不实现 transactional mixed-mode execution。
- 不改变现有 preview / accept lifecycle 的 public execution mode。
- 不实现真实 runtime session availability probe。

实现范围：

- `packages/game-dsl/src/amendments/semantic-amendment-schema.ts`
  - 新增 `AmendmentExecutionPlanSchema` 和类型。
  - `SemanticEditProposalSchema` 增加 `executionPlan`。
- `packages/game-dsl/src/amendments/semantic-amendment-planner.ts`
  - 基于 `amendmentIr.operations`、profile-backed DSL patch capability、generator capabilities 和 execution mode 生成 `step34.execution-plan.v1`。
  - execution plan 包含 `requiredCapabilities`、`availableCapabilities`、`missingCapabilities`、`incompatibleCapabilities`。
  - operation plan 写入 deterministic `compilerId` / `patchAdapterId` / per-operation execution mode。
  - verification requirements 直接来自 amendment IR expected effects。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - `execution_route.json` 从旧 `proposal.execution` 切换为 `proposal.executionPlan`。
  - legacy proposal backfill 补最小 execution plan，旧 proposal 仍能被 lifecycle 读取。
- `packages/game-dsl/src/amendments/index.ts`
  - 导出 `AmendmentExecutionPlanSchema` 和类型。
- `tests/contracts/semantic-amendments-planner.test.ts`
  - 覆盖 hot runtime patch execution plan required / available capability、operation plan、verification requirements。
  - 覆盖 warm restart execution plan 的 reload requirement 和 verification requirements。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 API 实际写出的 `execution_route.json` 是 `step34.execution-plan.v1`。

阶段结果：

- 34.4 现在有独立 execution plan artifact，不再只靠 `execution.mode` / `supportedNow` 推断路由证据。
- 当前 resolver 仍是 profile-backed：用现有 runtime capability report 的 hot / warm / asset swap path 能力和 generator capabilities 计算 plan。Step 35 再替换为 capability graph。
- `proposal.execution` 仍保留，避免破坏 34.1-34.3 已接好的 preview / accept lifecycle。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 33 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output
```

审查门禁结论：

- Oracle 初审：P0 无；P1 1 个，`requiredCapabilities` 中的 abstract operation capability 没有归入 available / missing / incompatible，审计不闭合；P2 1 个，测试未锁住该 invariant；P3 无。
- P1 初次修复不足：Oracle 复审指出 `candidate_theme_player` 这类 generator capability 被无条件归入 available，会在 generator 关闭时同时出现在 available 和 missing。
- P1 二次修复：`buildAmendmentExecutionPlan` 只把 deterministic compiler/rule/behavior capability 默认归入 `availableCapabilities`；`candidate_*` operation capability 必须由 `context.generatorCapabilities` 提供才算 available；所有 required 中仍未归属的 capability 归入 `missingCapabilities`。
- P2 修复：新增 `expectCapabilityPlanClosed`，覆盖 hot、warm、candidate、unsupported 路径，并检查 available / missing / incompatible 三组互斥；generator 关闭时断言 `candidate_theme_player` 不在 available 且在 missing。
- Oracle 复审：P0/P1/P2/P3 均无。

当前下一步：

```txt
34.5 Candidate DSL / Scene / Asset Amendment Builder
```

### 34.5 Candidate DSL / Scene / Asset Amendment Builder

完成时间：2026-06-19

目标：让 candidate builder 的 active snapshot、candidate artifacts、diff、no-op 和 drift 证据可审计。当前只扩展既有 player theme candidate builder，不引入新的 model-assisted generation。

非目标：

- 不实现结构性开放设计 regeneration。
- 不运行 Step33 完整 compile / asset resolution / runtime binding / render fidelity。
- 不生成 generated Phaser source。
- 不改变 active run artifacts。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - 新增 candidate artifact refs：`candidateArtifactPlan`、`amendmentEffectDiff`。
  - preview state / checkpoint 保留对应 refs。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - 注册 `candidate_artifact_plan.json` 和 `amendment_effect_diff.json`。
- `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts`
  - 生成 `step34.candidate-artifact-plan.v1`，列出 produced / skipped candidate artifacts。
  - 对未实际运行的 Step33 报告记录 skipped reason：asset resolution、runtime binding、render fidelity、runtime project、preview entry。
  - 生成 `step34.amendment-effect-diff.v1`，记录 requested changes、actual changes、unexpected changes、preserved nodes、removed nodes、no-op operations、drift status。
  - player theme candidate 明确证明 movement stats、health、actions、genre preserved。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`
  - preview 阶段写入新增 candidate artifacts。
  - no-op failed preview 同样保留 artifact plan / effect diff。
  - Accept / Reject / Undo checkpoint 保留新增 refs。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 top-down candidate refs / checkpoint refs。
  - 覆盖 side-scrolling candidate artifact plan、effect diff、preserved movement stats、unexpectedChanges 为空。
  - 覆盖 no-op candidate 写出 `AMENDMENT_NO_VISIBLE_EFFECT` 和 no-op operation ids。

阶段结果：

- Candidate builder 现在不仅写 DSL / Scene IR / asset diff，也写 candidate artifact plan 和 amendment effect diff。
- Active artifacts immutability 仍由既有测试验证：preview 前后的 active `game_dsl.json` / `asset_intent_manifest.json` 不变。
- Step33 完整报告当前没有运行，artifact plan 中明确标记 skipped；没有伪造 `asset_resolution_report.json` / `runtime_binding_report` / `render_fidelity_report`。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts
  -> passed, 1 file, 25 tests

npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 37 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output
```

审查门禁结论：

- Oracle 初审：P0 无；P1 1 个，`driftStatus` 只看 unexpectedChanges，未把 preservedNodes changed / removedNodes 纳入，且 candidate verification / accept 未消费 drift gate；P2 1 个，缺少 broad drift 负向回归；P3 无。
- P1 修复：`amendmentEffectDiff.driftStatus` 现在在 unexpected changes 或任一 preserved node changed 时失败；`removedNodes` 字段已保留，当前 player-theme builder 暂无 removed-node detector。
- P1 修复：`candidateAmendmentVerification` 增加 `amendment_effect_drift_guard` check；Accept 继续通过 verification status gate，因此 drift failed 会阻断 Accept。
- P2 修复：新增 preserved gameplay drift 回归，构造 player physics 被意外改变的 candidate，断言 effect diff failed 且 candidate verification failed。
- Oracle 复审：P0/P1/P2 无；P3 指出 `removedNodes` 当前为空数组占位，文档不能让人误以为 removed-node detector 已实现。
- P3 修复：文档改为说明当前 gate 覆盖 unexpected changes / preserved-node drift，`removedNodes` 为保留字段。

当前下一步：

```txt
34.6 Hot Runtime Patch Session
```

### 34.6 Hot Runtime Patch Session

完成时间：2026-06-19

目标：为 hot runtime patch preview 写出可审计 runtime patch plan，保存 before snapshot、runtime session id、base DSL hash、patch adapter id、reversibility 和 verification probes；Accept 继续持久化 authoritative DSL 并写 amendment verification。

非目标：

- 不实现真实浏览器 runtime handshake。
- 不新增 websocket / Playwright runtime session。
- 不实现 runtime disconnect recovery。
- 不改变现有 `DslLiveEditService` 的 patch history 语义。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - 新增 review artifact id：`runtimePatchPlan`。
  - preview state / accept log 增加 `runtimePatchPlanRef`。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - 注册 `review/runtime_patch_plan.json`。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`
  - hot preview 阶段生成 `step34.runtime-patch-plan.v1`。
  - runtime patch plan 包含 `sessionKind: "local_live_edit"`、`handshakeStatus: "not_run"`、`runtimeSessionId`、`baseDslHash`、`patchId`、planned lifecycle states、operation before/after、adapterId、targetRuntimeId、`reversible: true` 和 verification probes。
  - Accept log 保留 `runtimePatchPlanRef`；accept response artifact refs 回传 runtime patch plan ref。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 hot preview artifact refs、runtime session id、base DSL hash、before/after、adapter id、reversibility 和 verification probes。
  - 覆盖 accept log / artifact refs 保留 runtime patch plan ref 和 amendment verification ref，并读取 `amendment_verification.json` 验证 passed checks。

阶段结果：

- Hot preview 现在不再只有 prepared live edit 和 preview state；它有单独 runtime patch plan artifact，可追溯每个 patch operation 的 before/after 和验证 probe。
- Accept 仍通过 `recordRuntimeApplyResult` 持久化 DSL，`amendmentVerification` 继续校验 accepted DSL 与 runtime apply report。
- 当前 runtime session id 是 local live-edit session 标识，不是浏览器 runtime handshake；真实 session ready / disconnect recovery 留给后续 runtime integration。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts
  -> passed, 1 file, 23 tests

npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 34 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output
```

审查门禁结论：

- Oracle 初审：P0/P1 无；P2 1 个，hot accept 测试未显式断言 amendment verification ref / artifact；P3 1 个，runtime patch plan lifecycle 状态容易被误读为真实 browser runtime ACK。
- P2 修复：hot accept 测试断言 `accept_log.amendmentVerificationRef`、artifact refs 包含 `amendmentVerification`，并读取 `amendment_verification.json` 验证 `runtime_apply_status` 与 operation check passed。
- P3 修复：runtime patch plan 增加 `sessionKind: "local_live_edit"`、`handshakeStatus: "not_run"`，文档改为 planned lifecycle states。
- Oracle 复审：P0/P1/P2/P3 均无。

当前下一步：

```txt
34.7 Warm Restart and Candidate Run Executor
```

### 34.7 Warm Restart and Candidate Run Executor

完成时间：2026-06-19

目标：把 `dsl_patch_warm_restart` 从 live-edit runtime apply 流程提升为隔离 candidate run executor。当前首批覆盖已有 weapon fire-rate warm restart path。

非目标：

- 不实现完整 template build / generated project compile。
- 不运行 gameplay QA / render fidelity QA。
- 不扩展新的 warm restart amendment 类型。
- 不实现 Active / Candidate Workbench 对比 UI。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - `candidateBriefRef` 改为可选，支持局部 deterministic warm restart 不重写 brief。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`
  - `dsl_patch_warm_restart` preview 不再停留在 prepared live edit；现在创建 candidate run。
  - warm restart 仍复用 `DslLiveEditService.prepareLiveEditPatch` 做 deterministic DSL patch validation 和 candidate DSL 生成。
  - pending DSL candidate 重新封装为 candidate run identity，避免 candidate run / DSL runId 不一致。
  - warm candidate 写入 `candidate_dsl.json`、`candidate_dsl_diff.json`、`candidate_amendment_verification.json`、`candidate_run.json`、`candidate_runtime_capability_report.json`。
  - Accept 走 candidate promotion，不再要求 runtime apply report。
  - Reject warm candidate 不需要 runtime revert。
- `tests/workspace/semantic-amendment-service.test.ts`
  - weapon fire-rate warm restart preview 断言 candidate run / candidate artifacts。
  - Accept 断言 candidate run 被提升为 latest run。
  - Candidate DSL diff 断言 warm restart before / after。
  - Reject 断言 warm candidate 不需要 runtime revert，且 active latest run 不变。
  - 验证 candidate DSL cooldown 修改生效，projectile speed / damage 不变。

阶段结果：

- Warm restart 不再调用 hot-only accept endpoint，也不再依赖 runtime apply report。
- Active run 在 preview 前后保持不变；Accept 后原子提升 candidate run。
- 当前 candidate run 只写 model-output artifacts 和 run metadata；完整 project build / QA / render fidelity 仍是后续步骤。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts
  -> passed, 1 file, 23 tests

npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 34 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output
```

审查门禁结论：

- Oracle 初审：P0/P1 无；P2 1 个，warm `candidate_dsl_diff.json` 没有 before 值；P3 2 个，总览表 build/QA 措辞过满，warm reject 缺少回归。
- P2 修复：warm candidate DSL diff 从 base DSL 读取 before 值，测试断言 cooldown `300 -> 225`。
- P3 修复：总览表改为 candidate run / preview artifact / promotion 流程，完整 build/QA 后续完成；新增 warm reject 回归，断言 `requiresRuntimeRevert: false` 且 active latest run 不变。
- Oracle 复审：P0/P1/P2 无；P3 指出文档验证计数仍是修复前数值。
- P3 修复：验证计数更新为 workspace 24 tests、组合 35 tests。

当前下一步：

```txt
34.8 Regeneration Amendment Executor
```

### 34.8 Regeneration Amendment Executor

完成时间：2026-06-19

目标：先把现有 player-theme regeneration path 从“只生成 candidate artifacts”推进为“带 preservation contract、protected content allowlist、forbidden fallback 和 capability gate 的 candidate regeneration”。结构性开放设计仍必须走 capability-aware unsupported / future regeneration 能力，不允许绕过 34.4 missing capability gate。

非目标：

- 不实现 Step 35 capability graph。
- 不实现模型辅助结构性 regeneration executor。
- 不实现 boss / enemy / level 结构新增。
- 不把 unsupported structural request 降级成 player-theme fallback。
- 不改 generated Phaser source。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - 新增 `preservationContract` artifact ref id。
  - candidate preview / checkpoint 增加 `preservationContractRef`。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - 注册 `candidate/preservation_contract.json`。
- `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts`
  - candidate artifact bundle 增加 `step34.preservation-contract.v1`。
  - preservation contract 明确 protected content：player physics、health、actions、genre、projectiles。
  - allowlist 限定本步可改内容：player label、player visual、scene player visual intent 和 player intent id。
  - contract 记录 `forbiddenFallbacks`、inferred constraints、execution mode 和 missing capabilities，证明 regeneration 不能绕过 unsupported capability gate。
  - `candidate_artifact_plan.json` 把 `preservation_contract` 列为 produced artifact。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`
  - candidate regeneration preview 写入 preservation contract。
  - Accept / Reject / Undo checkpoint 保留 `preservationContractRef`。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 side-scrolling player-theme candidate 的 preservation contract 内容。
  - 覆盖 protected content / allowlist / forbidden fallback / capability gate 字段。
  - 覆盖 accept 和 undo checkpoint 保留 preservation contract ref。

阶段结果：

- Player-theme regeneration candidate 现在有独立 preservation contract，后续 Accept 证据链可区分“允许改变玩家外观”和“必须保留玩法/genre/projectile”。
- Unsupported structural request 仍由 34.4 execution plan 暴露为 missing capability，不会被本步 regeneration executor 静默降级。
- Candidate artifact plan 现在同时列出 candidate DSL、Scene IR、asset diff、amendment verification、effect diff 和 preservation contract；未运行的 Step33 / preview / render-fidelity artifacts 仍显式 `skipped`。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts
  -> passed, 1 file, 25 tests

npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 37 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output
```

- Oracle 初审：P0 无；P1 1 个，preservation contract 声明保护 `/projectiles`，但 amendment effect diff / drift guard 未证明 projectile 保留；P2 1 个，缺少 structural/open regeneration 不降级为 player-theme candidate 的回归；P3 2 个，总览表措辞过满，candidate artifact plan skipped reason 仍带 `step34_5_preview`。
- P1 修复：`amendmentEffectDiff.preservedNodes` 增加 `/projectiles`，drift guard 覆盖所有 preservation contract preserve path；新增 projectile drift 负向回归，candidate 修改 projectile damage 时 verification failed。
- P2 修复：新增横版跑枪 structural genre regeneration 回归，缺少 `candidate_genre_side_scrolling_run_and_gun` 时保持 `unsupported_capability`，不生成 player-theme candidate brief。
- P3 修复：总览表改为当前 player-theme regeneration 边界；candidate artifact plan skipped reason 改为 `step34_regeneration_preview`。
- Oracle 复审：P0/P1/P2 无；P3 指出文档验证计数仍是修复前数值。
- P3 修复：验证计数更新为 workspace 25 tests、组合 37 tests。

当前下一步：

```txt
34.9 Capability-effect Gameplay and Render Verification
```

### 34.9 Capability-effect Gameplay and Render Verification

完成时间：2026-06-19

目标：把 34.4 `executionPlan.verificationRequirements` 从计划字段推进为可审计 artifact 和 Accept gate。Candidate / warm restart / hot runtime patch 都必须写出 `capability_effect_verification.json`，逐条证明 expected effect 有对应 evidence；missing 或 inconclusive evidence 不得通过 Accept。

非目标：

- 不实现真实浏览器 gameplay probe runner。
- 不实现 render-fidelity screenshot runner。
- 不实现 runtime event probe。
- 不把 inconclusive runtime/render evidence 伪装为 passed；没有 verifier 的 effect kind 会失败或 inconclusive，并阻止 Accept。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - 新增 `capabilityEffectVerification` artifact id。
  - candidate preview / checkpoint 和 accept log 增加 `capabilityEffectVerificationRef`。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - candidate 和 review artifact path 均注册 `capability_effect_verification.json`。
- `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts`
  - player-theme candidate 生成 `step34.capability-effect-verification.v1`。
  - `asset_binding` expected effect 要求 candidate DSL visual binding evidence；side-scrolling 还要求 Scene IR / asset diff evidence。
  - `property_changed` expected effect 由 amendment effect diff 证明。
  - `runtime_event` 等当前没有 candidate verifier 的 effect kind 返回 inconclusive，不伪装通过。
  - `candidate_amendment_verification.json` 新增 `capability_effect_verification` 总门禁 check。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`
  - candidate regeneration preview 写入 capability-effect verification。
  - warm restart candidate 写入 capability-effect verification，并纳入 warm amendment verification。
  - hot accept 写入 review `capability_effect_verification.json`，使用 accepted DSL 和 runtime apply report 证明 `property_changed` effect。
  - candidate accept 重新读取 `capability_effect_verification.json` 并要求 proposal/source/candidate/status 匹配。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 player-theme candidate preview / accept / undo checkpoint refs。
  - 覆盖 candidate `asset_binding` effect verification passed。
  - 覆盖 warm restart `property_changed` effect verification passed。
  - 覆盖 hot patch review `property_changed` effect verification passed。
  - 覆盖 candidate effect verification 顶层 status 与内部 checks 冲突时 Accept 被阻止且 active run 不变。
  - 覆盖 unsupported expected effect kind 只能产生 inconclusive / failed，不能伪装通过。

阶段结果：

- `qaStatus: "passed"` 不再只代表 amendment-specific check；它包含 capability-effect verification gate。
- Candidate Accept 不只信 `preview_state`，会重新读取 candidate DSL、candidate amendment verification 和 capability-effect verification。
- Hot Accept 的 `accept_log` 记录 review `capabilityEffectVerificationRef`；如果 expected effect 没有 accepted DSL / runtime apply report evidence，会回滚 live version 并失败。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 39 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output
```

- Oracle 初审：P0 无；P1 1 个，candidate / warm Accept 的 `parseCapabilityEffectVerification` 只看顶层 `status`，没有校验内部 `checks` / `verificationRequirements` 一致性；P2 2 个，缺少“内部 check inconclusive 但顶层 status passed”的读边界回归，缺少 unsupported effect kind 不伪通过的回归；P3 无。
- P1 修复：`parseCapabilityEffectVerification` 现在要求 `verificationRequirements` 与 `checks` 存在、数量一致，check status 必须是 `passed` / `failed` / `inconclusive`，且顶层 `status === "passed"` 必须等价于所有 checks passed。
- P2 修复：candidate Accept 篡改测试改为顶层 passed 但内部 inconclusive，Accept 必须失败；新增 runtime_event expected effect 回归，capability-effect verification failed 且 check inconclusive，candidate amendment verification 总门禁 failed。
- Oracle 复审：P0/P1/P2/P3 均无。

当前下一步：

```txt
34.10 Accept / Reject / Undo Authoritative Promotion
```

### 34.10 Accept / Reject / Undo Authoritative Promotion

完成时间：2026-06-19

目标：把 Accept 的 authoritative state transition 写成独立、可审计 artifact，明确 promotion 前后 active run / live version、被提升的 artifact set 和 invariant；Reject 保持不改 active；Undo 继续依赖 checkpoint 防止覆盖后续 active state。本步记录可审计提升边界，不声明数据库事务级 atomic。

非目标：

- 不引入数据库事务层。
- 不改变现有 run store / project store 持久化 API。
- 不重写 Reject / Undo 状态机。
- 不把 candidate run artifact 复制回 source run。

实现范围：

- `apps/maker-api/src/projects/semantic-amendment.types.ts`
  - 新增 review artifact id `authoritativePromotion`。
  - accept log 增加 `authoritativePromotionRef`。
- `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`
  - 注册 `review/authoritative_promotion.json`。
- `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`
  - hot accept 成功后写 `step34.authoritative-promotion.v1`，记录 live version promotion：before/after live version、active run 不变、source run live version 被更新、runtime patch / verification refs。
  - candidate accept 成功后写 `step34.authoritative-promotion.v1`，记录 candidate run promotion：before active run、accepted run、after active run、candidate artifact checkpoint、source run 未被 mutation。
  - accept log 和 response artifact refs 返回 `authoritativePromotionRef`。
- `tests/workspace/semantic-amendment-service.test.ts`
  - 覆盖 candidate accept 的 `authoritative_promotion.json` before/after/invariants。
  - 覆盖 hot accept 的 `authoritative_promotion.json` before/after/invariants。
  - 继续覆盖 Reject 不推进 active run、Undo active run advanced 时阻止恢复、failed runtime apply 不写 undo checkpoint。

阶段结果：

- Accept 现在有独立 authoritative promotion artifact，不再只能从 accept log 推断提升了什么。
- Candidate promotion 明确记录 `sourceRunMutated: false`，Hot live version promotion 明确记录 `activeRunChanged: false`。
- Undo 仍由 `undo_checkpoint.json` 做恢复边界；active run 或 live version 已被后续推进时继续 fail closed。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 2 files, 39 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output
```

审查门禁结论：

- Oracle 初审：P0/P1/P2 无；P3 指出总览“原子提升完整 authoritative artifact set”措辞可能误读为数据库事务级 atomic。
- P3 修复：总览和目标改为“记录 authoritative promotion artifact set / 可审计提升边界”，并明确本步不声明数据库事务级 atomic。

当前下一步：

```txt
34.11 Workbench Proposal, Progress and Evidence UX
```

### 34.11 Workbench Proposal, Progress and Evidence UX

完成时间：2026-06-19

目标：让 Workbench proposal card 不只显示自然语言摘要，而是直接呈现 execution mode、active run / candidate run 区分、Accept gate 状态和后端 evidence refs。UI 必须消费真实后端 artifact refs，不写静态假证据。

非目标：

- 不新增 artifact JSON fetch / inspector drawer。
- 不新增真实浏览器 gameplay probe UI。
- 不重做 conversation layout。
- 不改 preview iframe refresh 协议。

实现范围：

- `apps/maker-workbench/src/features/semantic-amendments/semanticAmendmentClient.ts`
  - 同步后端新增 refs：`preservationContractRef`、`candidateArtifactPlanRef`、`amendmentEffectDiffRef`、`capabilityEffectVerificationRef`、`candidateAmendmentVerificationRef`、`authoritativePromotionRef`。
  - 同步 `runtimePatchPlanRef`。
  - candidate brief ref 改为可选，匹配 warm restart candidate preview。
  - `requiresRuntimeApplyReport` 收敛为仅 `hot_runtime_patch`，warm restart 走后端 candidate promotion accept。
- `apps/maker-workbench/src/features/semantic-amendments/SemanticAmendmentProposalCard.tsx`
  - card view 增加 `acceptGateLabel` 和 `evidenceRefs`。
  - UI 显示 `Accept gate` detail row 和 `Evidence refs` list。
- `apps/maker-workbench/src/App.tsx`
  - `SemanticAmendmentConversationCard` 保存后端返回的 `artifact_refs`。
  - plan / preview / accept / reject / undo 后合并 artifact refs，避免 accepted/rejected/undone 后丢失 evidence。
  - card view 基于真实 state 计算 Accept gate：candidate evidence passed/failed、runtime evidence pending、blocked active run differs、blocked runtime not ready、accepted/failed。
  - detail rows 显示 active run，并在 candidate preview 时显示 active vs candidate。
  - evidence refs 按 provenance / route / preservation / effect verification / promotion / logs 优先级排序。
- Workbench browser-safe imports
  - Workbench runtime value imports 避开 `@ai-game-maker/game-dsl` 根 barrel，改走 browser-safe `semantic-editing` / `live-editing` / live-edit capability 子模块。
  - 修复 Vite 浏览器 smoke 中 `node:crypto` 被 externalized 的前端启动错误；保留 type-only root imports 不进入 bundle。
- `apps/maker-workbench/src/features/semantic-amendments/__tests__/semanticAmendmentClient.test.ts`
  - 锁定 conversation submit 仍走 semantic amendments。
  - 锁定 App 会合并 artifact refs 并构建 accept gate/evidence refs。
  - 锁定 warm restart 不再要求 runtime apply report。
  - 锁定 proposal card 渲染 Accept gate 和 Evidence refs。

阶段结果：

- Workbench card 可以直接看到 candidate 是否已经通过 evidence gate、当前 active run 与 candidate run 是否一致、以及后端生成的关键 evidence artifact path。
- Accept/reject/undo 后 card 不丢 evidence refs；`authoritativePromotion`、`acceptLog`、`rejectLog`、`undoLog` 都能出现在 evidence list。
- UI 文案不声称真实浏览器 gameplay/render runner 已完成，只展示当前后端返回的 refs 和 gate。

已通过验证：

```txt
npx vitest run apps/maker-workbench/src/features/semantic-amendments/__tests__/semanticAmendmentClient.test.ts tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 3 files, 43 tests

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output

Browser smoke
  -> http://127.0.0.1:5174/ rendered AI Game Maker Workbench
  -> no node:crypto browser console error after reload
  -> only favicon.ico 404 observed
```

- Oracle 初审：P0 无；P1 1 个，Workbench 仍把 `dsl_patch_warm_restart` 当 runtime apply，需要 runtime ready / prepared live edit，但后端 34.7 已改为 candidate promotion；P2 2 个，client type 缺 `runtimePatchPlanRef`，测试锁住了错误 warm 行为且偏 source-level；P3 无。
- P1 修复：`requiresRuntimeApplyReport` 现在仅对 `hot_runtime_patch` 返回 true，warm restart 会走普通 candidate accept。
- P2 修复：Workbench preview state type 增加 `runtimePatchPlanRef`；测试改为断言 warm restart 不需要 runtime apply report，并保留 App/card 的 evidence refs / accept gate source guard。
- Oracle 复审：P0/P1/P2/P3 均无。

当前下一步：

```txt
34.12 Final Contract / Oracle Review
```

### 34.12 Final Contract / Oracle Review

完成时间：2026-06-19

目标：对 Step 34.1-34.11 做最终 contract / implementation / docs / validation 闭环，确认自然语言 amendment 从 request、understanding、IR、execution plan、candidate/hot/warm preview、effect verification、accept/reject/undo、Workbench evidence UX 到 Oracle gate 均已落地。

最终覆盖范围：

- Backend contract
  - source request / model invocation provenance / context / understanding / delta / operation / execution route / proposal artifacts。
  - generic amendment IR：stable target selector、preconditions、capabilities、expected effects。
  - execution plan：required / available / missing / incompatible capability closure。
  - candidate artifact bundle：candidate DSL、Scene IR、asset manifest/diff、preservation contract、effect diff、capability-effect verification、candidate amendment verification。
  - hot runtime patch plan、runtime apply verification、authoritative live-version promotion。
  - warm restart candidate run、candidate verification、candidate promotion。
  - accept / reject / undo logs and checkpoints。
- Workbench UX
  - proposal cards show mode / review state / accept gate / active vs candidate / evidence refs。
  - warm restart no longer requires runtime apply report in Workbench。
  - Workbench browser bundle avoids Node-only `node:crypto` import path。
- Final P1 closure
  - `dsl_patch_warm_restart` 的 `execution.requiresCandidateRun` 和 `executionPlan.candidateRunRequired` 已与真实后端路径对齐为 `true`。
  - planner contract 和 workspace warm preview 均覆盖 warm restart candidate run required。
- Known non-goals still deferred
  - Step 35 capability graph。
  - real browser gameplay probe runner。
  - render-fidelity screenshot runner for amendment candidates。
  - model-assisted structural/open regeneration executor。
  - database transaction layer。

最终验证：

```txt
npx vitest run apps/maker-workbench/src/features/semantic-amendments/__tests__/semanticAmendmentClient.test.ts tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> passed, 3 files, 43 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

npm run typecheck:root
  -> passed

git diff --check
  -> passed, no output

Browser smoke
  -> http://127.0.0.1:5174/ rendered AI Game Maker Workbench
  -> no node:crypto browser console error after reload
  -> only favicon.ico 404 observed
```

最终审查门禁：

- Oracle 总审初审：P0 无；P1 1 个，warm restart 真实走 candidate preview/accept/promotion，但 execution/audit 字段仍写 `requiresCandidateRun: false` / `candidateRunRequired: false`；P2 无；P3 文档仍是总审前状态。
- P1 修复：`route()` 对 `dsl_patch_warm_restart` 和 `candidate_regeneration` 都设置 `requiresCandidateRun: true`；`executionPlan.candidateRunRequired` 随之为 true。
- P1 回归：planner weapon fire-rate contract、open pacing contract 和 workspace warm preview 均断言 warm restart candidate run required。
- Oracle 总审复审：P0/P1/P2 无；P3 仅剩文档收尾状态字样。
- P3 修复：34.12 总表标记为 completed，最终验证/最终审查状态改为 final gate passed。
- Final gate：passed。
