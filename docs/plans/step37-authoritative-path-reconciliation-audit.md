# Step 37 Authoritative Path Reconciliation Audit

> - 文档定位：Step 37 authoritative production chain 的逐段只读审计状态文档。
> - 当前状态：Stage 4 default weapon package contract prerequisite Oracle PASS; checkpoint commit pending
> - 任务契约：`/Users/dahufa/Downloads/step37-authoritative-path-reconciliation-prompt.md`
> - 当前分片：`docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md`
> - 更新日期：2026-06-25

## 1. 任务总览

- 任务契约：`/Users/dahufa/Downloads/step37-authoritative-path-reconciliation-prompt.md`
- 总目标：按外部 prompt 固定的 Stage 0-15 顺序，逐段审计 Step 37 authoritative production chain 是否真实接通；当前用户已授权从 Stage 2 closure 开始执行 full Step37 Loop，但每个阶段仍必须先审查、再实施、再验证、Oracle 复审、checkpoint。
- 背景依据：用户要求“理解拆分任务，先一步步落档成文档再执行”；现有 Step 37 execution log 为 `docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md`。
- 非目标：本轮不修复、不实现、不新增测试、不更新 capability evidence、不修改 generation pipeline、不推进 default cutover、不一次性汇总全部阶段。
- 验收标准：每次只执行一个阶段；每个阶段报告必须包含 verdict、producer、artifact、consumer、actual data flow、authority、fail-closed、fallback、test coverage、findings、missing proof、exit assessment、source references 和 stop marker。
- 禁止改动范围：除本计划状态文档外，不编辑源码、测试、ledger、capability evidence、support summary、DeepSeek prompt、runtime、browser QA、pipeline、git index 或远端分支。
- 影响范围：只读审计覆盖 GameBrief v0.2 到 Capability-owned QA 的 production chain；Stage 0 只覆盖 repo/campaign baseline，不审计业务链路。
- 验证策略：每阶段优先使用只读命令和源码/文档/测试证据；必要时只运行不会写入仓库的测试或类型检查；每阶段结束后停止并等待用户继续。

## 2. 阶段拆分

- [x] 0. Repository and Campaign Baseline：核对 HEAD、工作区、ahead count、最近提交、campaign ledger、support summary、capability cursor、browser QA cursor；不审计业务链路。
- [x] 1. GameBrief v0.2：审计 production run 是否生成并下游消费 canonical GameBrief v0.2。
- [x] 2. Profile Resolution：审计 profile 是否由当前 run 的 GameBrief 决定并被下游真实消费。
- [x] 3. Capability Requirements：审计 requirements/capability 映射来源、identity、provenance 和 exact lock 消费。
- [ ] 4. Complete Capability Packages：审计五维 evidence、completeSupported 和 incomplete package fail-closed。
- [ ] 5. Exact Capability Lock：审计 lock 是否由 requirements 和 complete packages 共同决定并约束后续消费者。
- [ ] 6. Composed DSL Schema：审计 schema 是否由 exact lock 组合并真实用于 model request。
- [ ] 7. CapabilityGameDslDraft v1：审计 DeepSeek Raw DSL 是否只作为 untrusted candidate 并进入 Draft validation。
- [ ] 8. Canonical Game DSL v0.2：审计 canonical artifact 是否成为下游唯一 authority。
- [ ] 9. Capability IR：审计 IR artifact、capability-specific compilation 和 Runtime Plan 消费。
- [ ] 10. Runtime Plan：审计 plan producer、provenance、module/config 决定和下游消费。
- [ ] 11. Scene IR：审计 Scene IR composition、capability provenance 和 legacy override 风险。
- [ ] 12. Runtime System Manifest：审计 manifest 是否与 exact lock 一致并被 loader 消费。
- [ ] 13. Capability Runtime Loader：审计 Phaser loader 是否消费 production manifest 并验证 module/config identity。
- [ ] 14. Real Runtime Evidence：审计 runtime evidence 是否来自真实已安装 capability module 和同一 runtime session。
- [ ] 15. Capability-owned QA：审计 browser QA 是否通过 production page 触发 capability-owned action 并观察真实 evidence。
- [ ] 汇总：仅在用户发送“汇总”后输出跨阶段状态矩阵、第一个断链点、fallback、lineage 缺口和最小修复序列。

## 3. 分片索引

- 主状态文档职责：保留总览、阶段拆分、当前状态、下一步、恢复清单和最近执行记录。
- 当前分片：`docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md`
- 分片列表：
  - Stage 3 Capability Requirements：`docs/plans/step37-authoritative-path-reconciliation-stage-03-capability-requirements.md`
  - Stage 4 Complete Capability Packages：`docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md`
- 归档规则：后续阶段记录写入阶段分片；主状态文档只保留总览、当前状态、下一步、恢复清单和最近执行摘要。

## 4. 当前状态

- 状态：Stage 4 default weapon package contract prerequisite Oracle PASS; checkpoint commit pending.
- 当前步骤：Stage 4 support evidence prerequisite gate checkpoint commit `f5f1daa3` 已创建；当前 Stage 4 micro-loop 为 `weapon.default_straight_single.v1` 增加 validated package contract prerequisite，并把 browser QA probe id 对齐到 package-owned namespace。
- 最近完成：Stage 4 support evidence prerequisite gate 已 checkpoint；它让 target-profile reports 显式列出 prerequisite blockers，但不提升 `qa_observed`。
- 最近验证：default weapon package contract slice RED focused failed as expected for missing package module / old six prerequisite blockers；GREEN package/support/report focused PASS, 4 files / 45 tests；probe-id consumer focused PASS, 3 files / 116 tests；Stage 4 extended focused suite PASS, 12 files / 185 tests；full `npm test` PASS, contracts 93 files / 1039 tests and workspace 34 files / 401 tests；full `npm run typecheck` PASS；`git diff --check` PASS；support summary read-only probe confirms `requiredCapabilityCount=59`, `completeSupportedCount=0`, and `weapon.default_straight_single.v1` remains `qa_observed=false` / `completeSupported=false` with only `requiredProbesVerified` missing；`movement.crouch.v1` and `combat.airborne_fire.v1` retain old six prerequisite blockers。
- 最近 Oracle 结论：Stage 1 final Oracle PASS；Stage 2 Profile Resolution audit Oracle PASS；Stage 2 closure Oracle PASS / no P0/P1/P2/P3；Stage 3 audit Oracle re-review PASS / no P0/P1/P2/P3；Stage 3 closure Oracle re-review PASS / no P0/P1/P2/P3；Stage 4 audit Oracle PASS / no P0/P1/P2, P3 remediated；Stage 4 package closure gate implementation Oracle PASS / no P0/P1/P2/P3；Stage 4 default weapon browser QA evidence implementation Oracle PASS / no P0/P1/P2，P3 notes direct `PlaywrightQaRunnerService.run` capability evidence gate remains opt-in outside production pipeline；Stage 4 support prerequisite gate first Oracle BLOCKED on same-version schema compatibility；adapter fix Oracle re-review PASS / no P0/P1/P2/P3，checkpoint committed as `f5f1daa3`；Stage 4 default weapon package contract prerequisite Oracle PASS / no P0/P1/P2/P3，checkpoint commit allowed。
- 未处理风险：Stage 4 complete package closure 尚未达成；Stage 5 Exact Capability Lock 尚未进入；Stage 3 Gate E 仍不证明 `profileRequirements.requirementsHash` / `requiredCapabilityIds` 字段级 downstream action；post-Stage-1 shadow/canary parity/rollback 仍未实施。`QaReport` status consistency 作为非阻塞债务登记，不重新打开 Stage 1。
- 工作区核对：当前仅允许 Stage 4 implementation 相关 files：QA runner/report/pipeline capability-runtime evidence files、side-scrolling template QA evidence files、相关 focused tests、本状态文档和 Stage 4 分片。

## 5. 下一步

Stage 4 Complete Capability Packages audit 正在进行：

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 1 Exit gate: MET
Stage 2 Audit: PROFILE_RESOLUTION_RECORDED
Stage 2 Implementation: CHECKPOINT_COMMITTED
Stage 2 Exit gate: MET
Stage 2 checkpoint: 48a855bd
Stage 3 Audit: CHECKPOINT_COMMITTED
Stage 3 audit checkpoint: d7af70b9
Stage 3 Implementation: CHECKPOINT_COMMITTED
Stage 3 Exit gate: MET
Stage 3 closure checkpoint: 59a00483
Stage 4 Audit: CHECKPOINT_COMMITTED
Stage 4 audit checkpoint: d75d49ce
Stage 4 package closure gate checkpoint: 2cfe1f54
Stage 4 default weapon QA evidence checkpoint: 5cefcee1
Stage 4 support prerequisite gate checkpoint: f5f1daa3
Stage 4 Implementation: ORACLE_PASSED_AWAITING_COMMIT
Stage 4 Exit gate: NOT_MET
```

下一步完成当前 Stage 4 default weapon package contract prerequisite checkpoint commit。不要把静态 package prerequisite 收敛等同于 Stage 4 closure；`requiredProbesVerified` 仍阻塞 `qa_observed` 和 `completeSupported`。

## 6. 恢复检查清单

- [ ] 读取本状态文档。
- [ ] 核对 `git status --short --untracked-files=all`。
- [ ] 核对与当前步骤相关的 diff。
- [ ] 核对最近验证结果是否仍可信。
- [ ] 核对最近 Oracle 结论是否覆盖当前 diff；若进入代码修复或实现，必须重新建立审查门禁。
- [ ] 如文档与工作区不一致，先修正文档或记录差异。

## 7. 执行记录

### 1. 建立逐段审计状态文档

完成时间：2026-06-25

目标：

- 将外部 prompt 的执行顺序、禁止事项、验收标准和 Stage 0 下一步落到仓库内可恢复文档。

已完成内容：

- 新增 `docs/plans/step37-authoritative-path-reconciliation-audit.md`。
- 记录 Stage 0-15 拆分、非目标、禁止范围、验证策略和恢复清单。

阶段结果：

- 未修改源码、测试、ledger、capability evidence 或 pipeline。
- Stage 0 尚未执行。

验证结果：

    pending

审查门禁结论：

- 未执行；本记录用于进入只读 Stage 0 前的任务落档。

风险与阻塞：

- Stage 0 预期 `expected_workspace_clean: true`，但本 docs-only 文件会作为来源明确的未提交变更出现。

下一步：

- 执行 Stage 0 只读基线核对并停止等待用户继续。

### 2. Stage 0 — Repository and Campaign Baseline

完成时间：2026-06-25

目标：

- 只读核对当前 HEAD、工作区、ahead count、最近提交、campaign ledger、support summary、capability cursor 和 browser QA cursor；不审计业务链路。

已完成内容：

- 运行只读 Git 基线命令：
  - `git rev-parse HEAD`
  - `git status --short --untracked-files=all`
  - `git rev-list --count origin/main..HEAD`
  - `git log -5 --oneline`
- 读取 Step37 durable execution log、DeepSeek consumption loop 文档、M1 ledger、support summary 相关源码和测试。

阶段结果：

- HEAD：`e44279d13d00e60b4f996cf712edf41724fbfc95`，匹配 prompt 预期 `e44279d1`。
- ahead count：`origin/main..HEAD = 20`，匹配 prompt 预期。
- 最近提交：`e44279d1 feat(game-dsl): expose default weapon QA action probe`。
- 工作区：不是 clean；唯一差异为本轮用户授权创建的 docs-only 状态文档 `docs/plans/step37-authoritative-path-reconciliation-audit.md`。
- Step37 durable log 仍标记 `IMPLEMENTED — FINAL CLOSURE BLOCKED`、`Production Default Cutover: NOT ACTIVE`、`Final Closure: BLOCKED`，当前 disposition 为 `NEW_CONSUMER_REQUIRED`。
- 当前 support summary 仍为 requirements 60、required capabilities 59、registered 17、complete supported 0、legacy-backed 7。
- `weapon.default_straight_single.v1` 当前 evidence 为 `schema_expressible=true`、`normalized=true`、`compiled=true`、`runtime_consumed=true`、`qa_observed=false`、`completeSupported=false`。
- 当前 cursor 已从旧 loop 文档的 `scope_freeze` 推进到 M1 ledger 的 `browser_qa_implementation`；但该 ledger checkpoint 仍写 `ORACLE_PASSED_AWAITING_COMMIT`，与真实 HEAD 已提交 `e44279d1` 存在状态文案不一致。
- 未发现除本状态文档外的来源不明未提交改动。

验证结果：

    git rev-parse HEAD
    # e44279d13d00e60b4f996cf712edf41724fbfc95

    git status --short --untracked-files=all
    # ?? docs/plans/step37-authoritative-path-reconciliation-audit.md

    git rev-list --count origin/main..HEAD
    # 20

    git log -5 --oneline
    # e44279d1 feat(game-dsl): expose default weapon QA action probe
    # 65400268 feat(game-dsl): add default weapon runtime prerequisite
    # ce80c0af docs: add deepseek dsl consumption loop plan
    # 6cfc53ed feat(game-dsl): consume default straight weapon runtime config
    # f97033f2 feat(game-dsl): compile default straight weapon config

审查门禁结论：

- 未执行；Stage 0 是只读基线核对加本状态文档沉淀，未修改源码、测试、ledger 或 support evidence。

风险与阻塞：

- 本状态文档导致 `expected_workspace_clean: true` 不再成立，但来源明确且不影响只读审计；后续阶段需要继续把它作为已知 docs-only 差异处理。
- M1 ledger 的 checkpoint 状态文案与 HEAD 是否已提交存在不一致；本轮不修改 ledger，只在 Stage 0 报告。

下一步：

- 等待用户发送“继续”；下一步只执行 Stage 1 — GameBrief v0.2。

## Stage 1 — GameBrief v0.2

### Review Baseline

- reviewed HEAD: `e44279d13d00e60b4f996cf712edf41724fbfc95`
- latest commit: `e44279d1 feat(game-dsl): expose default weapon QA action probe`
- origin/main..HEAD: `20`
- git status: `?? docs/plans/step37-authoritative-path-reconciliation-audit.md`
- baseline drift: `NO`; HEAD matches the Stage 0 expected baseline and the only worktree delta is this authorized docs-only audit file.
- review scope: Stage 1 only. This review checks whether GameBrief v0.2 is the production authoritative input. It does not audit Stage 2 or later stages.

### Target Lock

This stage verifies whether GameBrief v0.2 is a durable, canonical, production-authoritative input to the run. The target is not satisfied by schema existence, prompt wording, parser acceptance, migration helpers, compatibility projection, mock-only tests, or a raw model output file.

### Status

Snapshot note: this subsection is the Stage 1 pre-implementation audit at base HEAD `e44279d13d00e60b4f996cf712edf41724fbfc95`. Current post-implementation status is recorded in "Stage 1 Closure Implementation — Round 1" below.

- status: `CONNECTED_NOT_AUTHORITATIVE`
- disposition: `LEGACY_AUTHORITY_REMAINS`
- one-sentence verdict: The main project-generation path parses model output into an in-memory canonical GameBrief v0.2 before Raw DSL generation, but the actual downstream generation still projects that brief into legacy Raw DSL v0.1, lacks a canonical GameBrief artifact/provenance ref, does not consume `GenerationScopePlan`, and still has bypass/fallback paths outside canonical GameBrief authority.

### Gate Matrix

| Gate | Result | Production evidence | Test evidence | Missing proof |
| --- | --- | --- | --- | --- |
| A. Production entries obtain canonical v0.2 before Raw DSL/compile | PARTIAL | `ProjectsController.generateProject` delegates to `ProjectsService.generateProject` at `apps/maker-api/src/projects/projects.controller.ts:24-27`; service calls `pipeline.run` at `apps/maker-api/src/projects/projects.service.ts:78-108`; pipeline calls `generateGameBrief` before `generateRawGameDsl` at `apps/maker-api/src/projects/generation-pipeline.service.ts:201-231`; provider parses to canonical at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:177-188`. | `tests/workspace/game-dsl-provider.test.ts:307-335`; `tests/workspace/generation-pipeline.service.test.ts:841-863`. | Deterministic fallback bypasses GameBrief on `MODEL_NOT_AVAILABLE` at `apps/maker-api/src/projects/generation-pipeline.service.ts:581-587` and `apps/maker-api/src/projects/generation-pipeline.service.ts:641-655`; script canary uses a v0.1 fake brief at `scripts/run-asset-semantic-canary.ts:189-207`. |
| B. Canonical means parsed/normalized value, not raw text/JSON | YES for main model-provider branch | `parseAndNormalizeGameBrief` returns `{ canonical, sourceFormat }` at `packages/game-dsl/src/schemas/game-brief-ingress.ts:22-55`; provider returns `parsed.canonical` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:182-188`; `normalizeBriefWithIntentPlan` runs after parse at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:139-140`. | `tests/contracts/game-brief-ingress.test.ts:18-62`; `tests/workspace/game-dsl-provider.test.ts:307-413`. | No durable canonical artifact records the post-parse/post-normalization value. |
| C. Canonical artifact/provenance is durable and traceable | NO | `DeepSeekClient` writes `game-brief.raw.json` as raw provider response status/body at `apps/maker-api/src/model-provider/deepseek.client.ts:66-85`; no pipeline writer persists canonical brief; pipeline receipt refs omit any game-brief artifact at `apps/maker-api/src/projects/generation-pipeline.service.ts:320-332`; artifact index enum has no gameBrief/canonicalBrief id at `apps/maker-api/src/projects/pipeline-artifact-index.ts:9-49`. | Target tests do not assert a canonical GameBrief artifact or receipt ref. | Need canonical artifact with schema version, sourceFormat, content hash, raw-output parent, project/run identity, artifact index ref, and receipt ref. |
| D. Profile Resolution executes and its output is consumed downstream | NO | Capability preflight is built from `intentPlan.normalizedGenre` before GameBrief generation at `apps/maker-api/src/projects/generation-pipeline.service.ts:176-187`; readiness resolves by `normalizedGenre` at `packages/game-dsl/src/generation-capability-readiness.ts:55-66`; resolution is `shadowMode: true` and `activeLockWritten: false` at `packages/game-dsl/src/generation-capability-resolution.ts:41-56`; success receipt still uses `legacy_template_v1` at `apps/maker-api/src/projects/generation-pipeline.service.ts:320-333`. | `tests/workspace/generation-pipeline.service.test.ts:167-245`; `tests/contracts/deepseek-authoritative-dsl-support.test.ts:135-144`. | Need canonical GameBrief -> resolved profile id/version/hash -> scope plan -> behavior-driving downstream consumer. |
| E. GenerationScopePlan affects generation/compile/runtime/QA | NO | `buildGenerationScopePlan` is defined at `packages/game-dsl/src/generation-scope-plan.ts:26-52`; repo search found no production caller under `apps` or `packages` except export at `packages/game-dsl/src/index.ts:59-61`. | `tests/contracts/generation-scope-plan.test.ts:8-42`. | Need a production consumer that reads the plan and changes model, compile, runtime, or QA decisions. |
| F. No raw/legacy/retry/resume bypass | NO | Main Raw DSL path explicitly projects to legacy at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:143-158` and `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:464-480`; fallback writes deterministic Raw DSL without a GameBrief at `apps/maker-api/src/projects/generation-pipeline.service.ts:641-655`; semantic amendment candidate preview builds a candidate DSL from current `game_dsl` rather than canonical GameBrief at `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts:466-519`. | `tests/workspace/generation-pipeline.service.test.ts:328-345`; `tests/workspace/game-dsl-provider.test.ts:484-503`. | Need repository-wide closure for fallback, regeneration, retry/resume, CLI/canary, and direct raw/provider paths. |
| G. Missing/invalid inputs fail closed before model/raw/compile | PARTIAL | Invalid GameBrief parse returns `MODEL_SCHEMA_VALIDATION_FAILED` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:190-207`; unsupported intent stops before model at `apps/maker-api/src/projects/generation-pipeline.service.ts:190-199`; nonrepresentable legacy projection stops before Raw DSL model call at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:143-147`; pipeline records blocked receipt at `apps/maker-api/src/projects/generation-pipeline.service.ts:621-638`. | `tests/contracts/game-brief-ingress.test.ts:43-62`; `tests/workspace/game-dsl-provider.test.ts:449-482`; `tests/workspace/generation-pipeline.service.test.ts:767-910`. | `MODEL_NOT_AVAILABLE` still falls back to deterministic Raw DSL; profile missing/unknown/incompatible and provenance/index write failures lack Stage 1 proof. |
| H. Successful and blocked receipts trace canonical brief/profile/scope evidence | NO | Successful receipt refs only DSL/consumption/runtime artifacts at `apps/maker-api/src/projects/generation-pipeline.service.ts:320-332`; blocked legacy-precondition receipt refs only input and intent plan at `apps/maker-api/src/projects/generation-pipeline.service.ts:621-635`; receipt schema has `profileId` but no game brief, sourceFormat, or scope-plan ref at `packages/game-dsl/src/generation-path-receipt.ts:8-44`. | `tests/workspace/generation-pipeline.service.test.ts:159-175`; `tests/workspace/generation-pipeline.service.test.ts:896-910`. | Need receipt refs for canonical GameBrief, profile resolution, scope plan, and raw-output parent on both success and blocked-before-DSL runs. |

### Production Call Graph

- HTTP entrypoint: `POST /api/projects/generate` calls `ProjectsController.generateProject` at `apps/maker-api/src/projects/projects.controller.ts:24-27`.
- Controller -> service: `ProjectsController.generateProject` calls `ProjectsService.generateProject` at `apps/maker-api/src/projects/projects.controller.ts:24-27`; service parses/creates run and calls `this.pipeline.run` at `apps/maker-api/src/projects/projects.service.ts:78-108`.
- Service -> pipeline: `GenerationPipelineService.run` writes input report and calls private `generateRawDsl` at `apps/maker-api/src/projects/generation-pipeline.service.ts:127-132`.
- Pipeline -> GameBrief provider: `generateRawDsl` calls `this.modelProvider.generateGameBrief` at `apps/maker-api/src/projects/generation-pipeline.service.ts:201-207`.
- GameBrief provider -> model client: `GameDslProviderService.generateGameBrief` calls `modelClient.generateJson` with `outputName: 'game-brief.raw.json'` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:71-137`; `DeepSeekClient.generateJson` delegates to `requestAndParse` at `apps/maker-api/src/model-provider/deepseek.client.ts:50-67`.
- Raw output write: `DeepSeekClient.requestAndParse` writes raw provider status/body to the output path at `apps/maker-api/src/model-provider/deepseek.client.ts:82-85`.
- GameBrief parse/normalize: provider calls `parseAndNormalizeGameBrief(result.json)` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:182-188`; parser returns canonical/sourceFormat at `packages/game-dsl/src/schemas/game-brief-ingress.ts:22-55`; provider then applies `normalizeBriefWithIntentPlan` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:139-140` and `apps/maker-api/src/model-provider/intent-plan.ts:108-132`.
- Profile resolution: `NOT PROVEN as canonical-brief-driven`. Current preflight is written before GameBrief provider call at `apps/maker-api/src/projects/generation-pipeline.service.ts:176-187` and derives readiness from `intentPlan.normalizedGenre` at `packages/game-dsl/src/generation-capability-readiness.ts:55-66`.
- GenerationScopePlan: `NOT FOUND` in production caller search; definition only at `packages/game-dsl/src/generation-scope-plan.ts:26-52`.
- Canonical artifact write: `NOT FOUND`. There is no writer for normalized GameBrief v0.2.
- Pipeline -> Raw DSL provider: when `brief.ok`, `generateRawDsl` calls `this.modelProvider.generateRawGameDsl({ ..., brief: brief.value })` at `apps/maker-api/src/projects/generation-pipeline.service.ts:209-228`.
- Raw DSL provider -> legacy projection: `generateRawGameDsl` calls `toLegacyRawDslBrief(params.brief)` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:143-147`; projection returns v0.1 `target_play_time_sec` when representable at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:464-480`.
- Legacy projection -> Raw DSL model call: provider calls `modelClient.generateJson` with `outputName: 'raw-game-dsl.raw.json'` and `buildRawDslPromptContext({ ...params, brief: legacyBrief.value })` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:149-163`; prompt context type accepts `brief: GameBrief` at `apps/maker-api/src/model-provider/prompt-context.types.ts:62-66`.
- Raw DSL validation: pipeline validates `generated.artifact.sourceDsl` with `validateAndNormalizeRawGameDsl` at `apps/maker-api/src/projects/generation-pipeline.service.ts:135-153`.
- Compile: pipeline calls `compileProject` at `apps/maker-api/src/projects/generation-pipeline.service.ts:155-158`; `compileProject` calls `compiler.compile` with `semanticTraceContext: { originalPrompt, brief }` at `apps/maker-api/src/projects/generation-pipeline.service.ts:269-276`.
- Generation receipt: successful compile writes `selectedPath: 'legacy_template_v1'` receipt at `apps/maker-api/src/projects/generation-pipeline.service.ts:319-333`; receipt writer persists `generation_path_receipt.json` at `apps/maker-api/src/projects/generation-pipeline.service.ts:806-819`.
- Artifact index: valid index is built/written at `apps/maker-api/src/projects/generation-pipeline.service.ts:909-924`; required artifacts include generation receipt and capability shadow reports, but not canonical GameBrief, at `apps/maker-api/src/projects/pipeline-artifact-index.ts:117-155`.

### Canonical Artifact and Provenance

- `game-brief.raw.json`: raw provider response status/body only, written before message JSON parse at `apps/maker-api/src/model-provider/deepseek.client.ts:66-85`.
- Raw model message text: returned as `rawText` after parsing provider body at `apps/maker-api/src/model-provider/deepseek.client.ts:95-107`; it is not a canonical artifact.
- Raw parsed JSON: `result.json` is parsed in memory at `apps/maker-api/src/model-provider/deepseek.client.ts:101-107`; it is not persisted as a separate parsed artifact.
- Canonical normalized GameBrief: produced in memory by `parseAndNormalizeGameBrief` at `packages/game-dsl/src/schemas/game-brief-ingress.ts:22-55` and returned by provider at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:182-188`; no writer persists it.
- Legacy projection: produced by `toLegacyRawDslBrief` at `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:464-480` after `classifyLegacyRawGameDslRepresentability` at `packages/game-dsl/src/schemas/legacy-raw-game-dsl-representability.ts:48-68`.
- Artifact index: `PipelineArtifactRefSchema` has no canonical GameBrief artifact id at `apps/maker-api/src/projects/pipeline-artifact-index.ts:9-49`; valid and blocked indexes include generation input, intent plan, receipt, capability reports, DSL artifacts and runtime artifacts, but not canonical GameBrief at `apps/maker-api/src/projects/pipeline-artifact-index.ts:117-155` and `apps/maker-api/src/projects/pipeline-artifact-index.ts:437-490`.
- Receipt: `GenerationPathReceiptSchema` has `artifactRefs` but no canonical GameBrief/sourceFormat/scope-plan fields at `packages/game-dsl/src/generation-path-receipt.ts:8-44`.
- `semanticTraceContext`: compile receives `brief` at `apps/maker-api/src/projects/generation-pipeline.service.ts:269-276`; compiler writes a semantic extraction trace from prompt/brief text at `apps/maker-api/src/compiler/template-compiler.service.ts:143-150` and `packages/game-dsl/src/semantic/semantic-extraction-trace.ts:42-66`. This is not a canonical GameBrief artifact, has no GameBrief schema/sourceFormat/hash/raw-parent identity, and only exists after compile.

### Profile Resolution Consumption

- Resolver input: current production preflight uses `intentPlan.normalizedGenre`, not canonical GameBrief, at `apps/maker-api/src/projects/generation-pipeline.service.ts:176-187`.
- Resolver output: readiness may record `profileResolution.profileId` and support status at `packages/game-dsl/src/generation-capability-readiness.ts:81-108`.
- Profile identity: for side-scrolling tests, `profileId: side_scrolling_run_and_gun.v1` is observed in readiness at `tests/workspace/generation-pipeline.service.test.ts:176-188`; the DeepSeek fixed target profile is a separate support vocabulary contract at `tests/contracts/deepseek-authoritative-dsl-support.test.ts:25-32`.
- Scope plan input/output: `NOT PROVEN`; `buildGenerationScopePlan` is not called in production.
- Downstream reader: resolution/gap/runtime shadow reports read readiness/resolution hashes at `packages/game-dsl/src/generation-capability-resolution.ts:83-124`, `packages/game-dsl/src/generation-capability-runtime.ts:79-113`, and `packages/game-dsl/src/generation-capability-gap.ts:82-177`.
- Behavior change: `NOT PROVEN as authoritative production behavior`; success still compiles `legacy_template_v1` at `apps/maker-api/src/projects/generation-pipeline.service.ts:319-333`.
- Artifact/receipt/provenance: profile id can appear in shadow reports and optional receipt `profileId`, but successful receipt uses IR template id at `apps/maker-api/src/projects/generation-pipeline.service.ts:320-332`, not a canonical GameBrief-derived profile resolution hash.
- Missing/unknown/incompatible profile error codes: `NOT PROVEN` for canonical GameBrief-driven profile failures. Unsupported normalized genre fails before model with `RUNTIME_UNSUPPORTED` at `apps/maker-api/src/projects/generation-pipeline.service.ts:190-199`; unresolved readiness blocker is `runtime_profile_not_resolved` at `packages/game-dsl/src/generation-capability-readiness.ts:117-128`.
- Model-call ordering: unsupported intent blocks before GameBrief and Raw DSL calls; incomplete side-scrolling profile does not block legacy Raw DSL generation, and instead writes shadow blockers while selected path remains `legacy_template_v1`.

### Legacy and Raw Bypass Census

Snapshot note: this census reflects the pre-implementation Stage 1 audit. Round 1 removes the production pipeline's deterministic model-unavailable fallback, but remaining bypass surfaces are tracked in "Remaining Stage 1 Blockers" below.

| Caller | Entry type | Obtains canonical v0.2 first | Uses profile resolution | Can call legacy/raw directly | Fail-closed evidence | Path:line |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectsController.generateProject` -> `ProjectsService.generateProject` | HTTP/controller | PARTIAL: main model branch does | Shadow/preflight only, not canonical-driven | YES via legacy projection and model-unavailable fallback | PARTIAL | `apps/maker-api/src/projects/projects.controller.ts:24-27`; `apps/maker-api/src/projects/projects.service.ts:78-108`; `apps/maker-api/src/projects/generation-pipeline.service.ts:201-231` |
| `GenerationPipelineService.run` | internal service | PARTIAL | Shadow/preflight only | YES: `writeDeterministicFallback` writes Raw DSL when provider unavailable | PARTIAL | `apps/maker-api/src/projects/generation-pipeline.service.ts:127-173`; `apps/maker-api/src/projects/generation-pipeline.service.ts:581-587`; `apps/maker-api/src/projects/generation-pipeline.service.ts:641-655` |
| `GameDslProviderService.generateRawGameDsl` | internal model-provider caller | NO: accepts `ProviderGameBrief` but immediately projects to legacy | NO | YES: Raw DSL prompt receives legacy `GameBrief` | YES for nonrepresentable v0.2; NO for short representable target authority | `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:143-175`; `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:464-480` |
| `TemplateCompilerService.compile` | direct compiler caller | N/A in production; called by pipeline after Raw DSL validation | NO canonical profile consumption | Direct production caller only found via pipeline | Runtime gate/compile failures recorded | `apps/maker-api/src/projects/generation-pipeline.service.ts:234-335`; search found production compile call only at `apps/maker-api/src/projects/generation-pipeline.service.ts:270` |
| Worker / queue / scheduled job | worker/queue/scheduled | NOT FOUND | NOT FOUND | NOT FOUND | NOT PROVEN | `git grep` for `queue|worker|scheduled|command` under `apps packages` found no generation worker caller. |
| Retry / resume | retry/resume | NOT FOUND for backend generation retry/resume | NOT FOUND | NOT FOUND | NOT PROVEN | `git grep` found frontend preview retry refs but no backend generation retry/resume caller. |
| Semantic amendment preview | regeneration | NO canonical GameBrief production run | NO | Builds candidate DSL from current `game_dsl`, not model Raw DSL | Candidate validation only | `apps/maker-api/src/projects/semantic-amendment.controller.ts:25-31`; `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts:466-519`; `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts:46-68` |
| Asset semantic canary script | CLI/script | NO: fake provider returns v0.1 brief | NO | YES: fake provider returns Raw DSL directly | Not a canonical GameBrief gate | `scripts/run-asset-semantic-canary.ts:165-207` |

### Fail-Closed Matrix

| Failure case | Detection point | Error code/status | Raw DSL model called? | Compile called? | Receipt/artifact emitted? | Test evidence | Production evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| invalid canonical v0.2 | provider parse catches ingress/schema failure | `MODEL_SCHEMA_VALIDATION_FAILED` -> pipeline `FAILED` | NO | NO | model-failed receipt/index, no canonical brief ref | `tests/workspace/game-dsl-provider.test.ts:398-413`; `tests/workspace/generation-pipeline.service.test.ts:841-863` | `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:190-207`; `apps/maker-api/src/projects/generation-pipeline.service.ts:604-619` |
| mixed v0.2 + legacy fields | `hasV02OnlyFields` rejects legacy fallback | `GAME_BRIEF_INGRESS_VALIDATION_FAILED` wrapped as `MODEL_SCHEMA_VALIDATION_FAILED` | NO in main branch | NO | model-failed receipt/index | `tests/contracts/game-brief-ingress.test.ts:43-51` | `packages/game-dsl/src/schemas/game-brief-ingress.ts:28-34` |
| v0.2-only malformed input | `GameBriefV02Schema.safeParse` then ingress error | `MODEL_SCHEMA_VALIDATION_FAILED` | NO | NO | model-failed receipt/index | `tests/contracts/game-brief-v0.2.test.ts:66-79`; `tests/contracts/game-brief-ingress.test.ts:54-62` | `packages/game-dsl/src/schemas/game-brief-v0.2.schema.ts:37-61`; `packages/game-dsl/src/schemas/game-brief-ingress.ts:51-55` |
| missing brief result | provider failure passthrough | provider code such as `MODEL_EMPTY_CONTENT` / `MODEL_JSON_PARSE_FAILED` | NO except `MODEL_NOT_AVAILABLE` fallback | NO except fallback | model-failed receipt/index for hard failure; fallback can continue | `tests/workspace/deepseek-client.test.ts:119-147` was inspected but not in Stage 1 target command | `apps/maker-api/src/model-provider/deepseek.client.ts:95-109`; `apps/maker-api/src/projects/generation-pipeline.service.ts:581-597` |
| empty model result | DeepSeek retries once then failure | `MODEL_EMPTY_CONTENT` | NO | NO | model-failed receipt/index | `tests/workspace/deepseek-client.test.ts:119-132` was inspected but not in Stage 1 target command | `apps/maker-api/src/model-provider/deepseek.client.ts:57-64`; `apps/maker-api/src/model-provider/deepseek.client.ts:95-99` |
| target > legacy capacity | legacy representability | `LEGACY_DSL_NONREPRESENTABLE` | NO | NO | blocked receipt/index | `tests/contracts/legacy-raw-game-dsl-representability.test.ts:77-91` | `packages/game-dsl/src/schemas/legacy-raw-game-dsl-representability.ts:75-92`; `apps/maker-api/src/projects/generation-pipeline.service.ts:621-638` |
| range | legacy representability | `LEGACY_DSL_NONREPRESENTABLE` | NO | NO | blocked receipt/index | `tests/workspace/game-dsl-provider.test.ts:449-462`; `tests/workspace/generation-pipeline.service.test.ts:865-910` | `packages/game-dsl/src/schemas/legacy-raw-game-dsl-representability.ts:95-100` |
| endless | legacy representability | `LEGACY_DSL_NONREPRESENTABLE` | NO | NO | blocked receipt/index | `tests/workspace/game-dsl-provider.test.ts:464-482` | `packages/game-dsl/src/schemas/legacy-raw-game-dsl-representability.ts:102-105` |
| unspecified | legacy representability | `LEGACY_DSL_NONREPRESENTABLE` | NO | NO | blocked receipt/index | `tests/workspace/game-dsl-provider.test.ts:464-482` | `packages/game-dsl/src/schemas/legacy-raw-game-dsl-representability.ts:108-110` |
| profile missing | preflight unresolved for unsupported normalized genre | `RUNTIME_UNSUPPORTED` for unsupported intent; canonical profile missing not proven | NO for unsupported intent | NO | unsupported-intent receipt/index | `tests/workspace/generation-pipeline.service.test.ts:767-838` | `apps/maker-api/src/projects/generation-pipeline.service.ts:190-199`; `packages/game-dsl/src/generation-capability-readiness.ts:81-87` |
| profile unknown | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | No canonical profile selector branch found. |
| profile incompatible | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | Current readiness records incomplete capabilities but still allows legacy generation. |
| scope plan failure | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | NOT PROVEN | `tests/contracts/generation-scope-plan.test.ts:8-42` only covers helper behavior | No production caller found. |
| canonical artifact write failure | NOT IMPLEMENTED | NOT IMPLEMENTED | N/A | N/A | N/A | NOT PROVEN | No canonical artifact writer found. |
| provenance/index write failure | artifact/index writes are awaited but no stable failure receipt is proven | thrown write error likely aborts current async path | NOT PROVEN | NOT PROVEN | NOT PROVEN after failure | NOT PROVEN | `apps/maker-api/src/projects/generation-pipeline.service.ts:806-824`; `apps/maker-api/src/projects/generation-pipeline.service.ts:909-924` |
| retry without canonical artifact | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT PROVEN | No backend generation retry/resume caller found. |
| resume with legacy-only state | NOT PROVEN | NOT PROVEN | N/A | N/A | semantic amendment/live-edit operate from current DSL artifacts | NOT PROVEN | `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts:466-519`; `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts:46-68` |

### Findings

#### P0

- none.

#### P1

- severity: P1
  type: CONFIRMED DEFECT
  title: `MODEL_NOT_AVAILABLE` can bypass canonical GameBrief and continue through deterministic Raw DSL fallback.
  evidence path:line: `apps/maker-api/src/projects/generation-pipeline.service.ts:581-587`; `apps/maker-api/src/projects/generation-pipeline.service.ts:641-655`; `tests/workspace/generation-pipeline.service.test.ts:328-345`
  impact: A production run with unavailable model configuration can still emit Raw DSL fallback and reach `PLAYABLE`, so not every production generation run is gated by canonical GameBrief v0.2.
  why this affects authoritative closure: Stage 1 requires no raw/legacy bypass and fail-closed behavior when canonical brief evidence is absent.
  what remains to verify: Whether this fallback is still intentionally allowed as a controlled fixture provider under a newer explicit contract; current code does not route it through GameBrief v0.2 canonical artifact/provenance.

#### P2

- severity: P2
  type: CONFIRMED DESIGN GAP
  title: Raw DSL generation consumes a legacy `GameBrief` projection, so legacy remains the behavior-driving authority.
  evidence path:line: `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:143-158`; `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:464-480`; `apps/maker-api/src/model-provider/prompt-context.types.ts:62-66`; `apps/maker-api/src/projects/generation-pipeline.service.ts:320-333`
  impact: Short representable v0.2 targets can proceed, but only after projection into `target_play_time_sec`; successful receipt still records `legacy_template_v1`.
  why this affects authoritative closure: Compatibility projection is not authoritative cutover unless canonical remains the decision source with lossless, versioned provenance and fail-closed unsupported semantics.
  what remains to verify: A downstream path that consumes canonical v0.2 or a versioned projection artifact as the sole authority.

- severity: P2
  type: CONFIRMED DESIGN GAP
  title: Canonical normalized GameBrief has no durable artifact, content hash, index ref, or receipt ref.
  evidence path:line: `apps/maker-api/src/model-provider/deepseek.client.ts:66-85`; `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:182-188`; `apps/maker-api/src/projects/pipeline-artifact-index.ts:9-49`; `packages/game-dsl/src/generation-path-receipt.ts:8-44`
  impact: A successful or blocked run cannot trace decisions back to a canonical GameBrief artifact; `rawOutputPath` points to raw provider response, not normalized canonical content.
  why this affects authoritative closure: In-memory canonical values are not durable provenance.
  what remains to verify: Canonical artifact writer, artifact index entry, receipt ref, raw-parent ref, sourceFormat, schema version, and hash.

- severity: P2
  type: CONFIRMED DESIGN GAP
  title: Profile resolution is shadow/preflight and is not driven by canonical GameBrief.
  evidence path:line: `apps/maker-api/src/projects/generation-pipeline.service.ts:176-187`; `packages/game-dsl/src/generation-capability-readiness.ts:55-66`; `packages/game-dsl/src/generation-capability-resolution.ts:83-124`; `tests/workspace/generation-pipeline.service.test.ts:176-245`
  impact: Profile reports exist, but production still selects `legacy_template_v1` and does not prove canonical brief -> resolved profile -> behavior-driving downstream consumption.
  why this affects authoritative closure: Builder/report existence and context propagation do not count as behavior-driving profile consumption.
  what remains to verify: Profile id/version/hash selected from canonical GameBrief and consumed by generation, compile, runtime, QA, artifact, and receipt decisions.

- severity: P2
  type: CONFIRMED DESIGN GAP
  title: `GenerationScopePlan` exists only as a helper/contract test, not a production consumer.
  evidence path:line: `packages/game-dsl/src/generation-scope-plan.ts:26-52`; production grep found no caller under `apps` or `packages`; `tests/contracts/generation-scope-plan.test.ts:8-42`
  impact: Play-time intent does not yet drive generation, compilation, runtime, or QA budget decisions through a persisted scope plan.
  why this affects authoritative closure: Stage 1 requires the scope result to affect downstream behavior, not only be constructible.
  what remains to verify: A production call from canonical GameBrief to `GenerationScopePlan`, persisted plan artifact, and downstream consumer evidence.

- severity: P2
  type: EVIDENCE GAP
  title: Repository-wide bypass closure is incomplete for regeneration/script paths.
  evidence path:line: `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts:466-519`; `apps/maker-api/src/projects/semantic-amendment-candidate-artifacts.ts:46-68`; `scripts/run-asset-semantic-canary.ts:189-207`
  impact: Main HTTP generation is not the only code path that creates DSL-like candidate artifacts; current evidence does not prove every regeneration/canary path is gated by canonical GameBrief v0.2.
  why this affects authoritative closure: Stage 1 requires no raw-request, legacy brief, regeneration, retry/resume, CLI, controller, worker, or internal-service bypass.
  what remains to verify: Whether these paths are explicitly out of production scope or must be gated/marked as non-authoritative.

- severity: P2
  type: TEST COVERAGE GAP
  title: Fail-closed coverage does not prove canonical artifact/provenance/profile/scope failure behavior.
  evidence path:line: `apps/maker-api/src/projects/generation-pipeline.service.ts:806-824`; `apps/maker-api/src/projects/generation-pipeline.service.ts:909-924`; `tests/workspace/generation-pipeline.service.test.ts:767-910`
  impact: Existing tests cover invalid brief, unsupported intent, and legacy nonrepresentability, but do not cover canonical artifact write failure, profile unknown/incompatible, scope-plan failure, or receipt/index write failure as stable fail-closed outcomes.
  why this affects authoritative closure: Partial fail-closed behavior is not all-entry fail-closed behavior.
  what remains to verify: Targeted production-path tests for each Stage 1 fail-closed row.

#### P3

- none.

### Closure Requirements

1. Persist canonical normalized GameBrief v0.2 as a model-output artifact with schema version, sourceFormat, content hash, raw-output parent ref, project/run correlation, artifact index entry, and receipt ref.
2. Replace or explicitly gate the legacy Raw DSL projection so downstream generation either consumes canonical GameBrief/GenerationScopePlan/profile outputs or fails closed when semantics are not representable.
3. Wire canonical GameBrief -> profile resolution -> GenerationScopePlan -> downstream behavior, with profile id/version/hash and scope artifact refs visible in success and blocked receipts.
4. Close or formally mark out-of-scope all bypass paths: deterministic model-unavailable fallback, semantic-amendment regeneration previews, retry/resume, scripts/canaries, direct raw/provider calls, and direct compiler calls.
5. Add fail-closed evidence for canonical artifact/provenance/index write failures, profile missing/unknown/incompatible, scope-plan construction failure, and legacy-only resume/retry states.

### Tests and Commands

- `pwd`: `/Users/dahufa/Documents/workspace/ai-game-maker`
- `git rev-parse HEAD`: `e44279d13d00e60b4f996cf712edf41724fbfc95`
- `git log -1 --oneline`: `e44279d1 feat(game-dsl): expose default weapon QA action probe`
- `git rev-list --count origin/main..HEAD`: `20`
- `git status --short --untracked-files=all`: `?? docs/plans/step37-authoritative-path-reconciliation-audit.md`
- `git grep -nE 'generateGameBrief\(|generateRawGameDsl\(|toLegacyRawDslBrief\(|parseAndNormalizeGameBrief\(|normalizeBriefWithIntentPlan\(|buildGenerationScopePlan\(|compileProject\(' -- apps packages`: found production call chain and confirmed no production `buildGenerationScopePlan` caller.
- `git grep -nE 'game-brief\.raw\.json|game_brief|GameBrief|ProviderGameBrief|rawOutputPath|sourceFormat|target_play_time_sec|artifactRefs|artifactIndex|generation_path_receipt|contentHash|sha256|semanticTraceContext' -- apps packages tests`: found raw output writer, in-memory canonical parse, legacy projection, receipt/index refs, no canonical GameBrief artifact id.
- `git grep -nEi 'profile.?resolution|resolved.?profile|resolve[A-Za-z]*Profile|validation.?profile|profile.?id|profile.?version|GenerationScopePlan|buildGenerationScopePlan|deepseek-run-and-gun-validation-profile-v1' -- apps packages tests docs`: found shadow/preflight reports and fixed target profile support contracts; no canonical GameBrief-driven production profile consumer.
- `git grep -nE 'GenerationPipelineService|generationPipeline|generateRawDsl\(|compileProject\(|regenerat|retry|resume|queue|worker|controller|command' -- apps packages`: found HTTP project generation, semantic-amendment regeneration references, and no backend generation worker/queue/retry/resume caller.
- `git grep -nE 'GameBriefV01|Legacy.*Brief|RawDslBrief|target_play_time_sec|legacy_template_v1|LEGACY_DSL_NONREPRESENTABLE' -- apps packages tests`: found legacy projection, legacy selected path, deterministic fallback, and legacy nonrepresentability tests.
- `npx vitest run tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts tests/contracts/deepseek-authoritative-dsl-support.test.ts`: PASS, 5 files / 135 tests.

### Stage Boundary

Stage 2 was not audited.

## Stage 1 Closure Implementation — Round 1

### Scope Lock

- scope: Stage 1 only. No Stage 2 audit or implementation was entered.
- loop goal slice: make canonical GameBrief v0.2 durable and connected before Raw DSL generation; remove the model-unavailable deterministic Raw DSL fallback from the production pipeline.
- non-goals: no full capability runtime cutover, no legacy compiler removal, no regeneration/canary governance, no complete profile lock promotion.
- reviewed base: `e44279d13d00e60b4f996cf712edf41724fbfc95`

### Minimal Closure Requirements Extracted From Stage 1 Review

1. Persist canonical normalized GameBrief v0.2 as a model-output artifact with schema version, source format, content hash, raw-output parent ref, and project/run identity.
2. Write and index `GenerationScopePlan` from canonical `play_time_intent` before Raw DSL generation.
3. Pass canonical brief provenance and scope plan into Raw DSL generation so downstream prompt construction consumes them.
4. Recompute capability preflight from the canonical GameBrief genre rather than only the pre-brief intent plan genre.
5. Fail closed on `MODEL_NOT_AVAILABLE` before Raw DSL/compile instead of writing deterministic fallback Raw DSL.
6. Surface canonical brief and scope artifacts in receipt, artifact index, acceptance report, and Workbench evidence grouping.

### RED Evidence

Before implementation, the focused test run failed as expected:

```text
npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts
```

Observed RED failures:

- model-unavailable path still returned playable output through deterministic fallback instead of `FAILED`;
- `canonical_game_brief.json` did not exist;
- artifact index did not include `canonicalGameBrief` or `generationScopePlan`.

### Implemented Scope

- Added `CanonicalGameBriefArtifactSchema` and builder in `packages/game-dsl/src/canonical-game-brief-artifact.ts`.
- Exported canonical brief artifact constants and builder from `packages/game-dsl/src/index.ts`.
- In `GenerationPipelineService`, after successful `generateGameBrief`:
  - verifies `rawOutputPath` is exactly the current run's `game-brief.raw.json`;
  - parses/normalizes the provider value into canonical GameBrief v0.2;
  - persists `canonical_game_brief.json`;
  - builds and persists `generation_scope_plan.json`;
  - emits `game_brief.canonicalized`;
  - recomputes capability preflight from canonical brief genre;
  - passes `canonicalBriefRef` and `generationScopePlan` into `generateRawGameDsl`.
- Replaced production `MODEL_NOT_AVAILABLE` deterministic fallback with fail-closed receipt `selectedPath: fail_closed_model_unavailable`.
- Added canonical brief and scope artifact refs to success, post-canonical Raw DSL failure, invalid DSL candidate, and legacy-precondition blocked receipts after canonicalization.
- Added `canonicalGameBrief` and `generationScopePlan` to pipeline artifact index, acceptance report ordering, and Workbench evidence grouping.
- Updated provider prompt context to include canonical brief ref and generation scope plan.
- Updated production-path tests and smoke provider fixture so ordinary successful runs use model-provider GameBrief + Raw DSL, not forbidden fallback.

### New HEAD Re-review

- status: `PARTIAL_CLOSURE_NOT_EXITED`
- disposition: `NEW_CONSUMER_REQUIRED`
- exit assessment: `NOT_MET`
- one-sentence verdict: canonical GameBrief v0.2 is now durable and connected to the main production Raw DSL request path, but Stage 1 is not complete because legacy Raw DSL projection and `legacy_template_v1` remain behavior-driving, and profile resolution is still not a full authoritative downstream consumer.

### Gate Matrix After Round 1

| Gate | Result | Current proof | Remaining gap |
| --- | --- | --- | --- |
| Canonical GameBrief v0.2 persisted with provenance | YES for main pipeline | `canonical_game_brief.json` includes schema version, sourceFormat, content hash, raw-output ref, projectId, runId. | Need broader bypass closure outside main generation path. |
| Raw provider output belongs to the same run | YES for main pipeline | pipeline rejects any `rawOutputPath` that is not the current run's `game-brief.raw.json`. | None for main pipeline; direct provider callers remain separate bypass surface. |
| GenerationScopePlan persisted | YES for main pipeline | `generation_scope_plan.json` is written from canonical `play_time_intent`. | It is prompt-context consumed, not yet compile/runtime/QA behavior-driving. |
| Profile Resolution consumed downstream | PARTIAL | capability preflight is recomputed from canonical brief genre before Raw DSL request. | resolution remains shadow/preflight; no active lock or behavior-driving profile consumer. |
| Legacy only controlled adapter | NO | nonrepresentable v0.2 semantics still fail closed; canonical ref/scope accompany Raw DSL prompt. | successful path still projects to legacy Raw DSL and records `legacy_template_v1`. |
| Production entries cannot bypass canonical brief | PARTIAL | main HTTP/service pipeline cannot call Raw DSL after provider success without canonical artifact write. | `GameDslProviderService.generateRawGameDsl` remains callable with legacy-shaped brief by direct internal callers/tests. |
| Missing brief/profile/artifact/provenance blocks before Raw DSL/compile | PARTIAL | invalid brief, model unavailable, non-current raw output path, canonical artifact/provenance build failure, and post-canonical Raw DSL failure block before compile while preserving existing canonical/scope evidence. | profile missing/unknown/incompatible and scope/profile write failures need explicit tests and stable codes. |

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added `canonical_game_brief.json` and `generation_scope_plan.json`; changed model-unavailable production behavior from deterministic fallback to fail-closed. |
| Consumer list | `GenerationPipelineService` writes and reads the canonical artifact object before Raw DSL; `GameDslProviderService.generateRawGameDsl` receives `canonicalBriefRef` and `generationScopePlan`; prompt context serializes them; receipt/index/acceptance/Workbench surfaces read artifact refs. |
| Compatibility type | `NEW_CONSUMER_REQUIRED`. The main path now has durable canonical evidence, but legacy projection still remains the behavior-driving adapter and profile resolution is not yet an active downstream consumer. |
| Authority | Canonical semantic meaning for Stage 1 is `canonical_game_brief.json`; raw provider output remains parent evidence only. |
| Legacy strategy | Legacy Raw DSL projection is still allowed only after canonical artifact creation and only when representability checks pass; it is not an accepted final cutover state. |
| Failure policy | `MODEL_NOT_AVAILABLE`, invalid brief, non-current raw output path, canonical artifact/provenance failure, post-canonical Raw DSL failure, and legacy nonrepresentability fail closed before compile; post-canonical failures keep canonical/scope artifacts present in receipt/index evidence. |
| Evidence | Focused and wider vitest suites assert canonical artifact persistence, scope plan persistence, prompt context consumption, receipt/index refs, model-unavailable fail-closed behavior, and post-canonical Raw DSL failure evidence preservation. |
| Rollback | A failed cutover can remove the new artifact refs and provider prompt context wiring without rewriting existing raw provider outputs; semantics are preserved in canonical artifact while Round 1 remains uncommitted. |

Completion rule result:

- Stage 1 cannot be marked complete because disposition is `NEW_CONSUMER_REQUIRED` and same-run evidence does not yet prove active profile lock / full downstream behavior-driving consumption.

### Verification

Commands executed after implementation:

```text
npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts
# PASS, 2 files / 41 tests

npm run typecheck
# PASS

npx vitest run tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-acceptance-client.test.ts tests/workspace/generation-pipeline.smoke.test.ts tests/workspace/projects-service.test.ts
# PASS, 12 files / 195 tests

git diff --check
# PASS
```

### Remaining Stage 1 Blockers

1. `GameDslProviderService.generateRawGameDsl` still accepts a `ProviderGameBrief` shape directly; direct internal callers can bypass the pipeline's canonical artifact gate unless the provider API is narrowed.
2. Successful generation still records `selectedPath: legacy_template_v1`; legacy remains the behavior-driving implementation, not just a named controlled adapter.
3. Profile resolution remains shadow/preflight; it is not yet an active profile lock consumed by generation/compile/runtime/QA.
4. `GenerationScopePlan` is consumed by prompt context, but not yet proven as a compile/runtime/QA behavior-driving consumer.
5. Deterministic fallback helper and receipt enum remain in the repo as residual contract/test surfaces even though the production pipeline no longer uses them.
6. Regeneration/canary/direct compiler paths remain unaudited for Stage 1 bypass closure.

### Oracle Gate

- first review status: `ORACLE_BLOCKED`
- first review P2: post-canonical Raw DSL provider failures wrote model-generation-failed receipt/index without canonical/scope refs, causing false `skipped` evidence after `canonical_game_brief.json` and `generation_scope_plan.json` already existed.
- P2 fix: split model-failure index/receipt semantics by `stageOneAuthorityEstablished`; post-canonical model failures now keep canonical/scope refs present while `gameDsl` remains skipped before DSL.
- re-review status: `ORACLE_PASS_WITH_P3`
- re-review result: no P0/P1/P2; P3 doc ambiguity addressed by adding pre-implementation snapshot notes to the original Stage 1 audit subsection.

### Stage Boundary

Stage 2 was not audited or entered.

## Non-Blocking Debt Register

### QaReport Status Consistency

- status: REGISTERED_NON_BLOCKING
- source: Round 4 Oracle P3.
- debt: `QaReport.status`, `overall_status`, and nested `result.status` can still be made stricter as a schema or pre-`completeQa` consistency check.
- boundary: This debt does not reopen Stage 1 because Round 4 authority mismatch/missing evidence is already forced through `enforceRuntimeAuthorityQaGate` and fails closed with `RUNTIME_AUTHORITY_MISMATCH`.
- next eligible step: a separate hardening task or the first stage that changes QA report schema/acceptance semantics.

## Stage 2 Audit — Profile Resolution

### Scope Lock

- scope: Stage 2 read-only audit only. No Stage 2 implementation, shadow/canary parity, rollback promotion, source code, test, runtime, QA, ledger, or capability evidence edits were made.
- audit question: Does profile resolution come from the current run's canonical GameBrief, and is the resolved profile consumed downstream as behavior-driving authority?
- checkpoint baseline: Stage 1 closed in local checkpoint commit `b9a0c0cb` (`feat(game-dsl): enforce active profile authority consumption`).
- starting conclusion: `Stage 1: AUTHORITATIVE_AND_CONNECTED`; `Exit gate: MET`; `Stage 2 Implementation: NOT_ENTERED`.

### Verdict

`PROFILE_RESOLUTION_AUTHORITATIVE_FOR_ACTIVE_PROFILE_CHAIN`.

The production path now resolves profile authority from the canonical GameBrief-derived runtime genre and carries that identity through `active_profile_lock`, `authority_bundle`, Raw DSL, compiler, runtime, and QA. Stage 2 implementation remains not entered; this section is an audit record only.

### Producer

- Producer entry: `GenerationPipelineService.generateRawDsl`.
- Current-run source: provider `generateGameBrief` returns raw `game-brief.raw.json`; `writeStageOneAuthorityArtifacts` parses it to `canonical_game_brief.json` and derives `generation_scope_plan.json`.
- Profile input: after canonicalization, the pipeline reruns capability preflight from `normalizedRuntimeGenreForCanonicalBrief(authority.value.brief)`, not from the earlier intent-only preflight.
- Profile lock: `writeActiveProfileLock` builds `active_profile_lock.json` from canonical brief, generation scope plan, and canonical readiness report.

### Artifact

| Artifact | Role |
| --- | --- |
| `canonical_game_brief.json` | Source of the current run's canonical `genre`, play-time intent, and content hash. |
| `generation_scope_plan.json` | Current run scope derived from the canonical GameBrief play-time intent. |
| `generation_capability_readiness_report.json` | Profile resolution report keyed by the canonical brief-derived runtime genre. |
| `active_profile_lock.json` | Hash-bound active profile authority, including `profileId`, `runtimeGenre`, `runtimeTemplateId`, `runtimeTemplateManifestId`, `qaProfile`, `profileRequirements`, and refs back to canonical brief/scope/readiness. |
| `authority_bundle.json` | Source-of-truth bundle embedding canonical brief, scope, active profile lock, refs, and Raw DSL authority mode. |

### Consumer

- Raw DSL provider consumes `AuthorityBundle` and validates the bundle against the current `projectId`, `runId`, and canonical brief before the model call.
- Prompt context includes canonical brief ref, authority bundle ref, active profile lock ref/body, generation scope plan, and Raw DSL authority semantics.
- Compiler requires the same `AuthorityBundle` before compile and writes runtime authority into generated project files.
- Runtime templates consume `runtime-authority.generated.json` and expose profile/runtime authority through QA snapshots.
- Playwright QA compares observed runtime authority against expected bundle/lock/profile/template/manifest/QA profile identity.
- Receipt, artifact index, acceptance report, and Workbench evidence expose the same profile authority artifacts.

### Actual Data Flow

1. Intent preflight may classify early unsupported intent, but supported production profile authority is recalculated after canonical GameBrief is persisted.
2. `canonical_game_brief.json` is produced from the current provider output and `generation_scope_plan.json` is derived from its `play_time_intent`.
3. Canonical GameBrief `genre` is normalized into the runtime genre used by capability readiness and profile resolution.
4. Active profile lock records the resolved profile and hashes the behavior-bearing profile requirements.
5. Authority bundle embeds and hash-binds canonical brief, scope, active profile lock, and Raw DSL consumption mode.
6. Raw DSL, compiler, runtime, QA, receipt/index, and Workbench evidence consume or expose the same bundle/lock identity.

### Authority

`authority_bundle.json` is the Stage 2 audit authority for downstream consumption. Its embedded `active_profile_lock` is the source of truth for resolved profile identity and behavior-bearing profile requirements. `active_profile_lock.canonicalBriefRef`, `generationScopePlanRef`, and `readinessReportRef` prevent the resolved profile from floating away from the current run's canonical GameBrief.

### Fail Closed

- If no runtime profile resolves for the normalized genre, readiness writes `profileResolution.status: unresolved`, selects `fail_closed_unsupported_intent`, and records `runtime_profile_not_resolved`.
- `buildActiveProfileLock` rejects unresolved, non-executable, legacy-backed, missing template/manifest/QA profile, empty requirement, missing alias, or incomplete requirement states.
- Raw DSL and compiler both validate `AuthorityBundle` before consumption.
- QA fails with `RUNTIME_AUTHORITY_MISMATCH` when runtime output omits or forges bundle/lock/profile/template/manifest identity.

### Fallback

Successful production profile resolution does not use `legacy_runtime_supported`. Unsupported or unresolved profiles fail closed; post-Stage-1 shadow/canary parity and rollback evidence are not part of this Stage 2 audit and remain future gated work.

### Test Coverage

- `tests/contracts/generation-capability-readiness.test.ts` covers resolved active profile readiness, complete-supported default path, and unresolved profile fail-closed behavior.
- `tests/contracts/generation-capability-resolution.test.ts` covers profile-bound resolution report and shadow lock profile identity.
- `tests/workspace/generation-pipeline.service.test.ts` covers canonical brief/scope/artifact refs, active profile lock, authority bundle, Raw DSL bundle consumption, compiler bundle consumption, QA timeout from scope, and forged runtime authority fail-closed behavior.
- `tests/workspace/compiler-service.test.ts` covers runtime authority file emission and generated runtime consumption surface.
- `tests/workspace/playwright-qa-runner.test.ts` covers runtime authority pass-through and bundle-hash mismatch failure.

### Findings

No Stage 2 Profile Resolution blocker was found in the active profile production chain.

P3 follow-up remains registered separately: `QaReport` status consistency can be hardened without reopening Stage 1 or blocking this profile-resolution audit.

### Missing Proof

- This audit does not prove Stage 3 Capability Requirements or later stages.
- This audit does not enter or implement post-Stage-1 shadow/canary parity, rollback promotion, registry transaction canary/promotion, or complete package cutover.
- This audit relies on source and test evidence, not a new provider/browser run generated during this step.

### Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Exit gate: MET
Stage 2 Audit: PROFILE_RESOLUTION_RECORDED
Stage 2 Implementation: NOT_ENTERED
Next: Stage 3 Capability Requirements audit only after user authorization
```

Stop marker: Stage 2 Profile Resolution audit recorded. Do not implement Stage 2. Do not proceed to Stage 3 without explicit user instruction.

### Source References

- `apps/maker-api/src/projects/generation-pipeline.service.ts:243-278`
- `apps/maker-api/src/projects/generation-pipeline.service.ts:973-984`
- `apps/maker-api/src/projects/generation-pipeline.service.ts:1003-1025`
- `packages/game-dsl/src/generation-capability-readiness.ts:62-115`
- `packages/game-dsl/src/active-profile-lock.ts:72-169`
- `packages/game-dsl/src/authority-bundle.ts:120-180`
- `apps/maker-api/src/model-provider/game-dsl-provider.service.ts:72-88`
- `apps/maker-api/src/model-provider/prompt-context.builder.ts:400-416`
- `apps/maker-api/src/compiler/template-compiler.service.ts:37-41`
- `apps/maker-api/src/qa/playwright-browser-runner.ts:174-195`
- `tests/workspace/generation-pipeline.service.test.ts:563-728`
- `tests/contracts/generation-capability-readiness.test.ts:26-45`
- `tests/contracts/generation-capability-readiness.test.ts:48-71`
- `tests/contracts/generation-capability-resolution.test.ts:133-155`
- `tests/workspace/compiler-service.test.ts:430-446`
- `tests/workspace/playwright-qa-runner.test.ts:84-166`

### Verification

```text
git diff --check
# PASS

rg -n "[ \t]+$" docs/plans/step37-authoritative-path-reconciliation-audit.md
# PASS, no trailing whitespace matches

npx vitest run tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts
# PASS, 5 files / 88 tests
```

### Oracle Review

Oracle PASS / no P0/P1/P2.

Oracle confirmed:

- Stage 1 remains closed and tied to checkpoint commit `b9a0c0cb`.
- Stage 2 is only an audit record; `Stage 2 Implementation: NOT_ENTERED`.
- Profile Resolution evidence is sufficient for `PROFILE_RESOLUTION_AUTHORITATIVE_FOR_ACTIVE_PROFILE_CHAIN`.
- `QaReport` status consistency is correctly registered as non-blocking debt and does not reopen Stage 1.
- Next step is gated on explicit user authorization for Stage 3 Capability Requirements audit.

## Stage 2 Closure Implementation — Profile Resolution Exit Gate

### Scope Lock

- scope: Stage 2 only. This closure does not reopen Stage 1 and does not enter Stage 3 Capability Requirements.
- implementation type: no-code closure implementation.
- baseline: Stage 2 audit checkpoint commit `f2a5c195` (`docs: record stage 2 profile resolution audit`).
- starting conclusion: `Stage 2 Audit: PROFILE_RESOLUTION_RECORDED`; `Stage 2 Implementation: NOT_ENTERED`.
- non-goals: no producer contract change, no source/test/runtime/QA/capability-evidence edit, no shadow/canary parity, no rollback promotion, no complete package cutover, no production default cutover.

### Minimal Closure Requirements

1. Convert the Stage 2 audit verdict into an implementation closure only if no additional code path is needed to make profile resolution authoritative.
2. Preserve the Stage 2 evidence boundary: profile resolution is closed only for canonical GameBrief-derived active-profile authority consumption through the current production chain.
3. Keep Stage 3 unopened: capability requirement identity, package completeness, exact lock, composed schema, canonical DSL, runtime loader, real runtime evidence, and capability-owned QA remain future stages.
4. Re-run Stage 2 focused verification plus full tests and typecheck before claiming the Stage 2 exit gate.
5. Re-submit the no-code closure diff and verification evidence to Oracle before checkpoint commit.

### Implemented Scope

- No production code, test, schema, runtime, QA, support-summary, or capability evidence files changed.
- The current-state cursor now records Stage 2 closure implementation as in progress instead of treating the Stage 2 audit as a permanent stop marker.
- The closure state continues to use `authority_bundle.json` and embedded `active_profile_lock` as the profile-resolution authority.
- `QaReport` status consistency remains a P3 follow-up and does not reopen Stage 1 or block Stage 2.

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | None. This closure records no-code Stage 2 implementation status; it does not change a contract, field, artifact, runtime behavior, or QA evidence producer. |
| Consumer list | Existing Stage 2 consumers remain Raw DSL provider, prompt context, compiler, runtime templates, Playwright QA, receipt, artifact index, acceptance report, and Workbench evidence. |
| Compatibility type | `LOSSLESS_COMPATIBLE`: no producer or consumer shape changed. |
| Authority | `authority_bundle.json` remains the Stage 2 authority; embedded `active_profile_lock` remains the resolved profile identity and behavior-bearing requirement authority. |
| Legacy strategy | Legacy authoritative path remains exited for successful active profiles; no legacy fallback or `legacy_runtime_supported` production default is reintroduced. |
| Failure policy | Existing fail-closed policies remain unchanged for unresolved profile, unsupported profile, malformed bundle/lock refs, missing runtime authority, and mismatched QA runtime authority. |
| Evidence | Stage 2 focused suite, full `npm test`, full `npm run typecheck`, `git diff --check`, and Oracle closure review must pass before checkpoint commit. |
| Rollback | Reverting this closure record returns Stage 2 to audit-only `NOT_ENTERED` documentation without changing source artifacts or runtime behavior. |

Compatibility disposition:

```ts
const STAGE_2_PROFILE_RESOLUTION_CLOSURE_DISPOSITION = "LOSSLESS_COMPATIBLE";
```

### Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Exit gate: MET
Stage 2 Audit: PROFILE_RESOLUTION_RECORDED
Stage 2 Implementation: ORACLE_PASSED_AWAITING_COMMIT
Stage 2 Exit gate: MET
Next: Stage 3 Capability Requirements audit only after Stage 2 checkpoint commit
```

### Validation

```text
npx vitest run tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts
# PASS, 5 files / 88 tests

npm test
# PASS, contracts 93 files / 1036 tests; workspace 34 files / 398 tests

npm run typecheck
# PASS

git diff --check
# PASS

rg -n "[ \t]+$" docs/plans/step37-authoritative-path-reconciliation-audit.md
# PASS, no matches
```

### Oracle Review

- status: PASS.
- agent: `019efe8e-d261-78a0-8c76-b66b60975c7f`.
- findings: P0/P1/P2/P3 none.
- conclusion: Stage 2 Profile Resolution no-code closure may pass Oracle gate and proceed to checkpoint commit.
- scope guard: Oracle explicitly did not approve Stage 3 capability closure, runtime cutover, shadow/canary parity, rollback promotion, or production default approval.

Stop marker: Stage 2 closure implementation passed local validation and Oracle. Do not proceed to Stage 3 until checkpoint commit completes.

## Stage 1 Closure Implementation — Round 4 Complete Active Profile Consumption

### Scope Lock

- scope: Stage 1 only. No Stage 2 implementation or audit was entered.
- loop goal slice: make every behavior-bearing field in `active_profile_lock` drive Raw DSL authority, compiler output, runtime consumption, and QA evidence through the same bundle/lock hash.
- non-goals: no capability package promotion, no registry transaction canary, no Stage 2 parity/rollback promotion, no legacy fallback path.
- starting conclusion: `Stage 1: PARTIAL_CLOSURE_NOT_EXITED`; `Exit gate: NOT_MET`; `Stage 2: NOT_ENTERED`.

### Implemented Scope

- Production readiness now chooses `capability_composed_v1` for executable active profiles and no longer routes supported defaults through `legacy_runtime_supported`.
- Active profile requirements are derived from runtime-required behavior aliases only:
  - required behavior capabilities are written to `activeRequirementCapabilityIds`;
  - broader declared profile memberships remain visible in `declaredProfileCapabilityIds` but do not mask active runtime consumption gaps;
  - `player_health` is now owned by `health.player_health_points.v1`; `health.damage_invulnerability.v1` remains a declared profile capability and no longer impersonates health-point consumption.
- `active_profile_lock.json` now records `runtimeTemplateManifestId`, `profileRequirements`, `requirementsHash`, and `legacyAdapterPolicy: legacy_forbidden`.
- `authority_bundle.json` now records `rawDslConsumption.mode: complete_active_profile_lock` for `active_profile_supported` and `capability_complete_supported` active profiles.
- Capability resolution/runtime/gap/cutover reports now model the active profile-bound path without receipt-only promotion:
  - resolution: `selectedPath: capability_composed_v1`, `resolverAttempt: skipped_active_profile_bound`, `exactLockStatus: not_required_active_profile_bound`;
- runtime before QA authority observation: `qaRuntimeAuthorityStatus: missing`, `runtimeEvidenceStatus: not_attempted`, `blockers: ["runtime_authority_not_observed"]`;
  - runtime after QA authority observation: `shadowMode: false`, `runtimeManifestStatus: active_profile_bound`, `qaRuntimeAuthorityStatus: matched`, `runtimeEvidenceStatus: observed`;
  - gap/cutover before QA authority observation remain blocked; only the QA-matched closure writes `cutoverStage: active_profile_authoritative` and `defaultCutoverAllowed: true`.
- Compiler output now writes `runtime-authority.generated.json` both at project root and under the selected runtime template `src/`.
- Collector, dodger, shooter, and side-scrolling runtimes import `runtime-authority.generated.json`, parse it through the shared fail-closed helper, pass the authority snapshot into their runtime scenes, and expose the same bundle/lock hash through `__GAME_QA__.snapshot().runtimeAuthority`.
- Playwright QA now receives the expected authority refs from the pipeline and fails with `RUNTIME_AUTHORITY_MISMATCH` when the compiled preview does not expose the same authority bundle hash, active profile lock hash, runtime template ID, manifest ID, profile ID, and QA profile.

### Gate Matrix After Round 4

| Gate | Result | Evidence |
| --- | --- | --- |
| Production default no longer selects `legacy_runtime_supported` | MET | readiness and generation pipeline tests assert `selectedDefaultPath: capability_composed_v1`, `profileSupportStatus: active_profile_supported`, and empty blockers. |
| Raw DSL consumes complete behavior semantics | MET | `authority_bundle.rawDslConsumption.mode` is `complete_active_profile_lock`; active lock includes hash-bound `profileRequirements.requiredCapabilityIds`, declared profile IDs, runtime template ID, manifest ID, and QA profile. |
| Compiler consumes same bundle/lock hash | MET | compiler tests assert generated `runtime-authority.generated.json` contains the same `bundleHash`, active lock `lockHash`, and active lock ref as the input `AuthorityBundle`. |
| Runtime consumes same bundle/lock hash | MET | collector, dodger, shooter, and side-scrolling `main.ts` import `runtime-authority.generated.json`, parse it fail-closed, and pass the parsed authority snapshot into the runtime scene. |
| QA observes same bundle/lock hash | MET | Playwright QA compares `__GAME_QA__.snapshot().runtimeAuthority` with the expected `AuthorityBundle`/`active_profile_lock` refs and returns `RUNTIME_AUTHORITY_MISMATCH` on missing or mismatched evidence. |
| Missing or unsupported profile requirements fail closed | MET | active lock build rejects unsupported profiles, legacy profiles, missing runtime template IDs, empty active requirements, missing aliases, and incomplete active requirement blockers. |
| No legacy fallback or receipt-only cutover | MET | generation path receipt records `legacy_forbidden`; runtime/gap/cutover reports are written as blocked until QA returns matched runtime authority evidence; Stage 2 legacy shadow tests remain explicit synthetic canary evidence, not production default. |

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Changed capability readiness, active profile lock, authority bundle, capability resolution/runtime/gap/cutover reports, compiler output, Phaser runtime entrypoints, and QA runtime authority evidence. |
| Consumer list | Raw DSL provider and prompt context consume `AuthorityBundle`; compiler validates and writes `runtime-authority.generated.json`; collector/dodger/shooter/side-scrolling runtimes import that file; QA compares the runtime authority snapshot against expected bundle/lock refs; pipeline receipt/index/acceptance/workbench evidence read the same refs. |
| Compatibility type | `LOSSLESS_COMPATIBLE` for Stage 1 active profile consumption: every behavior-bearing active requirement is preserved in the lock, bundle, compiler output, runtime scene, and QA snapshot. Stage 2 package-composed parity remains `NOT_ENTERED`. |
| Authority | `authority_bundle.json` remains the Stage 1 source of truth; it embeds and hashes `canonical_game_brief.json`, `generation_scope_plan.json`, and `active_profile_lock.json`. `active_profile_lock.profileRequirements.requirementsHash` is the source of truth for active behavior requirements. |
| Legacy strategy | Production legacy fallback is forbidden. `legacyAdapterPolicy` is `legacy_forbidden`; Stage 2 shadow/canary parity fixtures are kept only as explicitly marked future gated evidence. |
| Failure policy | Missing bundle, forged hashes, unsupported profile, legacy profile, missing `runtimeTemplateManifestId`, missing active requirement, missing alias, malformed runtime authority JSON, missing QA runtime authority, or mismatched bundle/lock hash fails closed before Raw DSL, compiler success, QA success, or cutover success. |
| Evidence | Focused contracts/workspace tests, full `npm test`, typecheck, compiler artifact assertions, active profile lock/bundle assertions, runtime authority snapshot assertions, and QA authority mismatch tests pass locally; Round 4 Oracle re-review found no remaining code-side P0/P1/P2. |
| Rollback | A failed Stage 1 active consumption rollout can roll back the Round 4 active-profile report/authority wiring without rewriting canonical brief, scope plan, or active lock artifacts; Stage 2 remains untouched. |

Completion rule result:

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Exit gate: MET
Stage 2: NOT_ENTERED
```

### Stage 1 Exit Review

Stage 1 exit is met for this Round 4 scope.

Reasons:

1. The production default path is `capability_composed_v1`; no successful supported default is selected by `legacy_runtime_supported`.
2. Raw DSL receives a schema-validated, lossless, hash-bound `AuthorityBundle` whose `rawDslConsumption.mode` is `complete_active_profile_lock`.
3. Compiler, runtime, and QA all expose or consume the same bundle/lock identity instead of relying on receipt naming.
4. Profile requirement gaps, unsupported profiles, forged refs, and legacy-backed production defaults fail closed.

Round 4 first Oracle review returned no P0 and blocked on P1/P2 evidence issues: pre-QA runtime/cutover reports could claim observed/default cutover, QA did not gate on runtime authority hash identity, malformed runtime authority could be silently ignored, and the success receipt still described a legacy adapter allowance. The follow-up implementation closed those code-side blockers. Round 4 Oracle re-review then found no P0/P1 and no remaining code-side P2; its only blocking finding was that this document still mixed premature `MET` language with pending-review language. This record corrects the document state to the final gate result.

Non-blocking follow-up: Oracle P3 noted existing `QaReport` status consistency debt because `completeQa` primarily keys off `report.status`. Round 4 authority mismatch/missing evidence is still fail-closed by `enforceRuntimeAuthorityQaGate`, so this is tracked as a future schema / pre-`completeQa` consistency hardening item rather than a Stage 1 exit blocker.

### Verification

```text
npx vitest run tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-gap.test.ts tests/contracts/generation-capability-cutover.test.ts tests/workspace/playwright-qa-runner.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/generation-pipeline.service.test.ts
# PASS, 6 files / 127 tests

npx vitest run tests/workspace/compiler-service.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/pipeline-artifact-index.test.ts
# PASS, 3 files / 21 tests

npm run typecheck
# PASS

npm test
# PASS, contracts 93 files / 1036 tests; workspace 34 files / 398 tests

git diff --check
# PASS
```

Historical focused runs before Oracle Round 4 rework:

```text
npx vitest run tests/workspace/game-dsl-provider.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-gap.test.ts tests/contracts/generation-capability-cutover.test.ts tests/contracts/gameplay-capability-registry.test.ts
# PASS, 8 files / 110 tests

npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/compiler-service.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-gap.test.ts tests/contracts/generation-capability-cutover.test.ts tests/contracts/gameplay-capability-registry.test.ts
# PASS, 10 files / 156 tests

npx vitest run tests/contracts/phaser-templates.test.ts tests/contracts/deepseek-authoritative-dsl-support.test.ts
# PASS, 2 files / 59 tests

npx vitest run tests/contracts/phaser-templates.test.ts && npm run typecheck
# PASS

npm test
# PASS, contracts 93 files / 1034 tests; workspace 34 files / 395 tests

```

### Stage Boundary

Stage 2 was not audited or entered.

## Stage 1 Closure Implementation — Round 3 AuthorityBundle

### Scope Lock

- scope: Stage 1 only. No Stage 2 audit or implementation was entered.
- loop goal slice: establish an unforgeable `AuthorityBundle` and make Raw DSL, compiler, canary, and direct compiler entry surfaces depend on that bundle instead of loose authority refs.
- non-goals: no full capability package cutover, no exact capability lock promotion, no registry transaction canary/promotion, no Stage 2 entry.
- starting conclusion: `Stage 1: PARTIAL_CLOSURE_NOT_EXITED`; `Disposition: NEW_CONSUMER_REQUIRED`; `Exit gate: NOT_MET`; `Stage 2: NOT_ENTERED`.

### Minimal Closure Requirements Extracted

1. Provider must schema-parse `GenerationScopePlan` as part of a single authority object, not accept loose scope input.
2. Canonical brief, scope plan, active profile lock, and their refs/hashes must belong to the current `projectId/runId` and match embedded artifact content.
3. Ref, content, or identity mismatch must fail closed before the Raw DSL model call.
4. Raw DSL authority consumption must be explicit: either complete active profile lock consumption, or a version/hash-bound immutable projection for legacy-backed execution.
5. Regeneration/canary/direct compiler surfaces must not construct authority context or compile successfully outside canonical brief + scope plan + active profile lock preconditions.
6. `capability_composed_v1` success must not be only a receipt rename; the compiled runtime must receive the same bundle that Raw DSL received.

### Implemented Scope

- Added `AuthorityBundleSchema` / `buildAuthorityBundle` / `validateAuthorityBundleForRun`.
- Pipeline now writes `authority_bundle.json` after `active_profile_lock.json` and before Raw DSL generation.
- Raw DSL provider contract now accepts `authorityBundle` only:
  - validates bundle schema and current-run identity;
  - recomputes canonical brief hash, scope plan hash, active lock hash, and bundle hash;
  - verifies provider brief hash matches bundle canonical brief;
  - fails closed before model invocation on missing, forged, or mismatched bundle.
- Raw DSL prompt context now serializes `authority_bundle_ref`, full `active_profile_lock`, `generation_scope_plan`, and `raw_dsl_authority`.
- `rawDslConsumption` records:
  - `complete_active_profile_lock` only for `capability_complete_supported`;
  - `versioned_hash_bound_projection` with `canonicalBriefHash`, `generationScopePlanHash`, and `activeProfileLockHash` for current legacy-backed runtime profiles.
- Compiler `RuntimeCompileInput` now requires `authorityBundle`; `TemplateCompilerService.compile` validates it for the current run before writing runtime artifacts.
- Runtime compiler output always writes `runtime-authority.generated.json` from the validated bundle.
- DSL consumption report, receipt, pipeline artifact index, acceptance report ordering, and Workbench evidence grouping now include `authority_bundle`.
- Asset semantic canary provider now returns current-run model output paths, so canary execution enters the same canonical brief + scope plan + active profile lock + bundle pipeline.
- Direct compiler tests now must construct an authority bundle from schema-parsed Raw DSL before compile, proving the compiler cannot typecheck as an independent authority path.

### Gate Matrix After Round 3

| Gate | Result | Current proof | Remaining gap |
| --- | --- | --- | --- |
| canonical brief/scope/lock current-run bundle | YES | `authority_bundle.json` embeds canonical brief, scope plan, active lock, refs, and recomputed hashes for the current `projectId/runId`. | None for the implemented Stage 1 bundle surface. |
| provider fails before model on forged/missing authority | YES | provider test asserts missing bundle and forged `generationScopePlan` hash both keep model calls at `0`. | None for provider boundary. |
| Raw DSL consumes complete lock or immutable projection | YES/PARTIAL | bundle records full active lock plus `versioned_hash_bound_projection` for current `legacy_runtime_supported` profiles. | Full `complete_active_profile_lock` mode still needs future complete-supported runtime profiles. |
| compiler cannot bypass authority | YES | compiler input type requires `authorityBundle`; service validates bundle before compile; direct compiler tests construct bundle explicitly. | Runtime still executes legacy-backed adapters under the projection. |
| canary cannot bypass current-run artifacts | YES for asset semantic canary | canary provider returns current `game-brief.raw.json` / `raw-game-dsl.raw.json` paths and goes through `ProjectsService` + pipeline. | Registry transaction canary/promotion remains outside Stage 1 production generation. |
| `capability_composed_v1` is not only receipt rename | PARTIAL+ | Raw DSL, compiler, `runtime-authority.generated.json`, receipt, index, and DSL consumption report all bind to the same bundle. | Capability shadow reports still show legacy-backed incomplete capability state; final complete-supported cutover is not active. |

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added `authority_bundle.json`; changed Raw DSL provider and compiler contracts from loose/optional authority fields to required `AuthorityBundle`; added `authorityBundleRef` to DSL consumption evidence. |
| Consumer list | `GenerationPipelineService`, `GameDslProviderService`, prompt context builder, `TemplateCompilerService`, DSL consumption report builder, generation receipt, pipeline artifact index, pipeline acceptance report, Workbench evidence grouping, and asset semantic canary provider. |
| Compatibility type | `NEW_CONSUMER_REQUIRED`. The Stage 1 entry surfaces are now bundle-bound, but default runtime profiles are still `legacy_runtime_supported`, so final complete-supported consumer evidence is not met. |
| Authority | `authority_bundle.json` is the source of truth for the Stage 1 authority set; it embeds and hashes `canonical_game_brief.json`, `generation_scope_plan.json`, and `active_profile_lock.json`. |
| Legacy strategy | Legacy-backed runtime execution is allowed only through `versioned_hash_bound_projection` inside the bundle; implicit legacy authority/fallback is forbidden. |
| Failure policy | Missing bundle, invalid schema, wrong project/run, stale/forged refs, mismatched content hashes, mismatched provider brief, or invalid Raw DSL consumption mode fail closed before Raw DSL model invocation or compiler execution. |
| Evidence | Focused tests assert bundle persistence, provider pre-model fail-closed behavior, canary current-run raw paths, compiler required bundle input, compiler precondition validation, `runtime-authority.generated.json`, receipt/index refs, Workbench grouping, and DSL consumption bundle refs. |
| Rollback | A failed cutover can remove bundle wiring while preserving the already persisted canonical brief/scope/active lock artifacts; the current disposition remains `NEW_CONSUMER_REQUIRED` so rollback does not claim Stage 1 exit. |

Completion rule result:

- Stage 1 remains open: `Stage 1 = PARTIAL_CLOSURE_NOT_EXITED`.
- Disposition remains `NEW_CONSUMER_REQUIRED`.
- Exit gate remains `NOT_MET`.
- Stage 2 remains `NOT_ENTERED`.

### Stage 1 Exit Review

Stage 1 exit is still not met.

Reasons:

1. All implemented production entry surfaces now converge on `AuthorityBundle`, but `rawDslConsumption.mode` is `versioned_hash_bound_projection` for current default profiles because they are still `legacy_runtime_supported`.
2. The bundle removes implicit legacy authority/fallback, but it does not convert legacy-backed runtime support into `capability_complete_supported`.
3. The `capability_composed_v1` path is now connected through Raw DSL, compiler, and evidence artifacts, but complete downstream capability consumer evidence remains future work.

Current status remains:

```text
Stage 1: PARTIAL_CLOSURE_NOT_EXITED
Disposition: NEW_CONSUMER_REQUIRED
Exit gate: NOT_MET
Stage 2: NOT_ENTERED
```

### Verification

```text
npx vitest run tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts
# PASS, 4 files / 127 tests

npm run typecheck
# PASS

npm test
# PASS, contracts 93 files / 1034 tests; workspace 34 files / 395 tests

git diff --check
# PASS
```

### Stage Boundary

Stage 2 was not audited or entered.

## Stage 1 Closure Implementation — Round 2

### Scope Lock

- scope: Stage 1 only. No Stage 2 audit or implementation was entered.
- loop goal slice: close direct `generateRawGameDsl` bypass and make active profile lock plus `GenerationScopePlan` mandatory, behavior-driving prerequisites on the authoritative generation path.
- non-goals: no complete capability package cutover, no exact capability lock promotion, no regeneration/canary/direct compiler implementation, no Stage 2 entry.
- starting conclusion: `Stage 1: PARTIAL_CLOSURE_NOT_EXITED`; `Disposition: NEW_CONSUMER_REQUIRED`; `Exit gate: NOT_MET`; `Stage 2: NOT_ENTERED`.

### Minimal Closure Requirements Extracted

1. `GameDslProviderService.generateRawGameDsl` must fail closed before the model when `canonicalBriefRef`, `activeProfileLockRef`, or `GenerationScopePlan` is missing.
2. Main production generation must persist `active_profile_lock.json` after canonical GameBrief/scope/canonical-profile preflight and before Raw DSL.
3. Supported successful generation must no longer record `legacy_template_v1` as the selected production path; legacy may appear only as a controlled adapter policy under the active lock.
4. Profile/scope must drive downstream behavior, not only artifact persistence: Raw DSL receives the active lock ref, compile receives authority context, and QA receives scope-derived timeout.
5. Pipeline artifact index, acceptance report order, and Workbench evidence must surface `activeProfileLock`.

### RED Evidence

Before implementation, the focused test run failed as expected:

```text
npx vitest run tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts
```

Observed RED failures:

- direct `generateRawGameDsl({ ..., brief })` invoked the model instead of failing on missing Stage 1 authority refs;
- successful pipeline run did not write `active_profile_lock.json`;
- compile did not receive authoritative profile/scope context and QA did not receive scope-derived timeout.

### Implemented Scope

- Added `ActiveProfileLockSchema` / `buildActiveProfileLock` and exported active lock constants from `packages/game-dsl/src/index.ts`.
- Added provider-level Raw DSL authority guard:
  - missing `canonicalBriefRef`, `activeProfileLockRef`, or `generationScopePlan` returns `MODEL_SCHEMA_VALIDATION_FAILED`;
  - model is not invoked when those prerequisites are missing.
- Pipeline now:
  - writes canonical GameBrief and `generation_scope_plan.json`;
  - recomputes capability preflight from canonical brief genre;
  - builds and persists `active_profile_lock.json`;
  - passes active lock ref plus scope to Raw DSL generation;
  - passes canonical brief, active lock, and scope to compiler as `authoritativeContext`;
  - passes `generationScopePlan.qaProbeWindowSec * 1000` to Playwright QA as `timeoutMs`.
- Successful compile receipt now records:
  - `selectedPath: capability_composed_v1`;
  - `targetPath: capability_composed_v1`;
  - `profileId` from active profile lock;
  - `capabilityReadiness: ready`;
  - `active_profile_lock` and `generation_scope_plan` refs.
- `TemplateCompilerService` writes `runtime-authority.generated.json` when authoritative context is present.
- Added `activeProfileLock` to artifact index schema, acceptance ordering, and Workbench Pipeline Evidence grouping.

### New HEAD Re-review

- status: `PARTIAL_CLOSURE_NOT_EXITED`
- disposition: `NEW_CONSUMER_REQUIRED`
- exit assessment: `NOT_MET`
- one-sentence verdict: direct Raw DSL provider bypass is now fail-closed and the supported production path consumes active profile lock/scope through Raw DSL, compile, and QA, but Stage 1 still cannot exit because regeneration, canary, and direct compiler entry surfaces remain unaudited and final completeSupported/cutover conditions are not met.

### Gate Matrix After Round 2

| Gate | Result | Current proof | Remaining gap |
| --- | --- | --- | --- |
| canonical GameBrief persisted with provenance | YES for main pipeline | `canonical_game_brief.json` remains required and receipt/index referenced. | Entry audit outside main generation still incomplete. |
| active profile lock mandatory before Raw DSL | YES for main pipeline and provider API | provider guard fails before model; pipeline writes `active_profile_lock.json` before Raw DSL. | Regeneration/canary/direct compiler surfaces still need explicit closure. |
| GenerationScopePlan behavior-driving | PARTIAL+ | Raw DSL prompt receives scope; QA timeout is derived from `qaProbeWindowSec`; compiler receives scope in authority context. | Runtime semantics are still legacy-adapter backed, not completeSupported. |
| supported success no longer lands on `legacy_template_v1` | YES for generation receipt | success receipt records `capability_composed_v1` with controlled adapter policy in active lock. | Shadow readiness/gap reports still show legacy-backed incomplete capability state by design. |
| legacy only controlled adapter | PARTIAL | active lock declares `legacyAdapterPolicy: controlled_adapter_only`; success receipt selects capability path. | Legacy compiler/templates still execute as adapter; full legacy exit remains future stage work. |
| production entries cannot bypass canonical brief/profile/scope | PARTIAL | main HTTP pipeline and direct Raw DSL provider call are gated. | semantic-amendment regeneration, asset semantic canary, and direct compiler entry audit remains. |

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added `active_profile_lock.json`; changed Raw DSL provider contract to require canonical brief ref, active profile lock ref, and `GenerationScopePlan`; added compiler `authoritativeContext`. |
| Consumer list | Raw DSL provider guard and prompt context, generation pipeline receipt/index, compiler authority file writer, QA runner timeout input, acceptance report ordering, and Workbench Pipeline Evidence grouping. |
| Compatibility type | `NEW_CONSUMER_REQUIRED`. Active profile/scope are now consumed on the main path, but complete capability packages, exact lock, runtime loader, and full QA observation are not complete. |
| Authority | `canonical_game_brief.json` plus `active_profile_lock.json` and `generation_scope_plan.json` are the Stage 1 authority set before Raw DSL. |
| Legacy strategy | Legacy runtime may execute only as the active lock's `controlled_adapter_only` strategy; successful receipt no longer selects `legacy_template_v1`. |
| Failure policy | Missing canonical brief ref, active lock ref, or scope plan fails closed before Raw DSL model invocation; active lock construction failure writes blocked receipt/index before Raw DSL/compile. |
| Evidence | Focused tests assert provider model is not called without authority refs, active lock is persisted, Raw DSL receives the lock ref, compiler receives authority context, QA receives scope timeout, and receipt/index expose the new authority refs. |
| Rollback | The change is isolated to Stage 1 authority artifacts and optional compiler context; rollback can remove active lock wiring without rewriting existing canonical/raw artifacts. |

Completion rule result:

- Stage 1 remains open: `status = PARTIAL_CLOSURE_NOT_EXITED`.
- Disposition remains `NEW_CONSUMER_REQUIRED`.
- Exit gate remains `NOT_MET`.
- Stage 2 remains `NOT_ENTERED`.

### Verification

```text
npx vitest run tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
# PASS, 5 files / 134 tests

npm run typecheck
# PASS

npm test
# PASS, contracts 93 files / 1034 tests; workspace 34 files / 394 tests

git diff --check
# PASS
```

### Remaining Stage 1 Blockers

1. Regeneration / semantic amendment entry points still need explicit Stage 1 authority audit and closure.
2. Asset semantic canary and script fixtures still need authority classification or gating.
3. Direct compiler entry points still need audit to prove they cannot act as an independent authoritative path.
4. Capability shadow reports still correctly show incomplete/legacy-backed capability state; final `completeSupported` and Production Default Cutover are not active.

### Oracle Gate

- Round 2 review status: `ORACLE_PASS`
- P0/P1/P2: none.
- P3 notes:
  - Raw DSL provider authority guard checks presence/ref shape, but does not schema-parse `generationScopePlan` or compare the lock ref with persisted lock content at the provider boundary.
  - Raw DSL prompt consumes `active_profile_lock_ref` rather than the full active lock; compiler and QA provide stronger behavior-driving consumption in this round.
  - Stage 1 exit blockers remain: regeneration, canary, and direct compiler surfaces are not closed; compiler `authoritativeContext` is still optional for direct callers.
- Oracle accepted fixed conclusion: `Stage 1 PARTIAL_CLOSURE_NOT_EXITED`; `Disposition NEW_CONSUMER_REQUIRED`; `Exit gate NOT_MET`; `Stage 2 NOT_ENTERED`.

### Stage Boundary

Stage 2 was not audited or entered.
