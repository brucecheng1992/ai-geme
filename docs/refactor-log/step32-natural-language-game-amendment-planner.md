# Step 32 Natural Language Game Amendment Planner

适用项目：`ai-game-maker`

目标：把 Workbench 自然语言入口从字段匹配升级为游戏修改提案系统。自然语言必须先被理解成 `GameDesignDelta` / `GameOperation`，再由系统根据 DSL、runtime、template、QA 和 artifact 能力选择热更新、DSL warm restart、候选版本生成、unsupported capability 或澄清。

## Boundary

Step 32 总体目标链路必须保持：

```txt
Workbench text
  -> semantic amendment planner
  -> GameDesignDelta / GameOperation
  -> capability routing
  -> candidate artifact sandbox
  -> preview / QA
  -> Accept / Reject / Undo
```

禁止变成：

```txt
Workbench text
  -> editable field matcher
  -> no matched field
  -> user-facing failure
```

也禁止把 unsupported intent fallback 到相近字段，例如：

- `增加武器射速` -> `projectile.speed`
- `把玩家变成小猫` -> `player.scale`
- `加一个 Boss` -> `enemy.count`
- `Boss 登场屏幕震动` -> `projectile.damage`

## Landing Order

| Step | Status | Scope |
| --- | --- | --- |
| 32.A Proposal Contract and Deterministic Planner | completed | 建立共享 amendment schema、context pack、proposal contract、deterministic understanding/routing 和 unsafe fallback tests。 |
| 32.B Backend Plan and Artifact Sandbox API | completed | 接入 backend `plan` endpoint，写 proposal/context/understanding/route artifacts，不改 active state。 |
| 32.C Preview / Accept / Reject / Undo Lifecycle | completed | 后端实现 proposal state machine，preview 生成 live-edit 候选，accept 才提升 authoritative state，reject/undo 写后端日志。 |
| 32.D Hot Patch Fast Path Through Planner | completed | 现有 player/enemy/projectile 编辑通过 planner route 到 live-edit fast path，并完成 backend plan-preview-accept 回归。 |
| 32.E DSL Warm Restart Slice: `weapon.fireRate` | completed | `增加武器射速` 生成 DSL warm restart candidate，修改 fire cooldown，不 fallback 到 projectile speed/damage。 |
| 32.F Candidate Regeneration Slice: Player Theme | completed | `把玩家变成小猫` 生成候选 brief/DSL/run，accept 后才提升 active run pointer。 |
| 32.G Workbench Proposal Card | completed | Workbench conversation submit 走 semantic amendment plan/preview，展示 proposal card，移除 user-facing field-first failure。 |
| 32.H Final Browser / QA / Oracle Closure | completed | 真实 Workbench、真实 project/run、preview、QA、Oracle closure 和 focused commit。 |

## 32.A Proposal Contract and Deterministic Planner

当前目标：只建立共享 proposal contract 和 deterministic planner；不接 backend endpoint，不接 Workbench UI，不写运行时状态。

完成时间：2026-06-18

已完成内容：

- 新增 `packages/game-dsl/src/amendments/semantic-amendment-schema.ts`：
  - `GameDomain`
  - `GameDesignDelta`
  - `GameOperation`
  - `AmendmentContextPack`
  - `SemanticEditProposal`
  - `SemanticAmendmentDraftPatch`
  - `ExecutionMode`
  - `SemanticAmendmentReviewState`
- 新增 `packages/game-dsl/src/amendments/semantic-amendment-planner.ts`：
  - 识别玩家速度、武器射速、子弹速度/伤害、敌人数量、pacing、小猫 reskin、run-and-gun、Boss feedback、敌人掉落武器等代表请求。
  - 将自然语言先归一到 `GameDesignDelta` / `GameOperation`。
  - 按 `AmendmentContextPack` capability 路由：
    - `hot_runtime_patch`
    - `dsl_patch_warm_restart`
    - `candidate_regeneration`
    - `unsupported_capability`
    - `needs_clarification`
  - 对 `weapon.fireRate` 生成 `/player/actions/{index}/cooldownMs` draft patch，并显式拒绝 fallback 到 `projectile.speed` / `projectile.damage`。
  - 对 Boss intro screen shake / warning audio 返回 `understood = true` + `unsupported_capability`，缺失能力写入 `missingCapabilities`。
  - 对小猫玩家主题返回 `candidate_regeneration`，并拒绝 `player.scale` only fallback。
  - 对模糊请求返回 `needs_clarification`，不返回字段匹配失败文案。
- `AmendmentContextPackSchema.currentDsl` 使用 `GameDslArtifactSchema.optional()`，planner 内再次 `safeParse`，畸形或缺失 context 会变成受控 `unsupported_capability`。
- `SemanticEditProposalSchema.candidate` 收紧：
  - 移除过宽 `runtimePatch: unknown`。
  - `candidateDsl` 使用 `GameDslArtifactSchema`。
  - `candidateBrief` 使用窄 schema。
- Candidate regeneration 现在要求当前 context 具备 `candidate_brief`、`candidate_dsl`、`candidate_run` capabilities；缺失时返回 `unsupported_capability`。
- 从 `packages/game-dsl/src/index.ts` 导出 amendments API。
- 新增 `tests/contracts/semantic-amendments-planner.test.ts` 覆盖 9 条 contract：
  - 玩家速度走 hot runtime patch。
  - 武器射速走 warm restart，且不 fallback 到 projectile。
  - `让游戏更紧张` 生成 multi-delta proposal。
  - 小猫玩家主题走 candidate regeneration。
  - Boss intro feedback 是 understood unsupported。
  - `改好玩点` 走 clarification。
  - 缺 `currentDsl` 是 unsupported，不是假装表达不清。
  - 缺 shoot action 是 unsupported，并报告 `weapon_fire_rate_action`。
  - 缺 candidate generator capability 是 unsupported，并报告缺失 generator capability。

阶段结果：

- 自然语言修改入口的共享 contract 已存在，后续 backend/UI 不需要继续把用户输入当字段查询。
- `understood` 与 `executable` 已分离；缺上下文、缺 action、缺 generator capability 都是 `unsupported_capability`。
- 当前只生成 deterministic draft patch 和 candidate brief metadata；没有写 active SSOT，没有改 Phaser runtime，没有创建真实 candidate run。

明确未改范围：

- 未新增 backend `POST /projects/:projectId/runs/:runId/semantic-amendments/plan` endpoint。
- 未实现 proposal artifact sandbox 写盘。
- 未实现 preview / accept / reject / undo backend state machine。
- 未把 Workbench conversation submit 改到 planner API。
- 未实现真实 candidate regeneration run。
- 未实现真实 preview reload / QA telemetry gate。
- 未改用户已有 Workbench UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts
  -> passed, 1 file, 9 tests

npm run typecheck:root
  -> passed

git diff --check -- docs/refactor-log/step32-natural-language-game-amendment-planner.md
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 2 个；P2 2 个；P3 1 个。
- P1 修复：已理解但缺 DSL/context/mapping 的路径从 `needs_clarification` 改为 `unsupported_capability`，并补 no currentDsl / no shoot action regression。
- P1 修复：`currentDsl` schema 从 `unknown` 收紧到 `GameDslArtifactSchema.optional()`，planner 内 `safeParse`。
- P2 修复：proposal candidate payload 收紧，移除 `runtimePatch: unknown`，`candidateDsl` / `candidateBrief` 使用窄 schema。
- P2 修复：candidate regeneration 加 generator capability gate，并补缺 capability regression。
- P3 修复：包内类型 import 改为直接从 `artifact-contract` / `live-edit` 导入，避免 barrel 循环风险。
- Oracle 复审：发现 unsupported `userMessage` 使用旧 `draft.missingCapabilities`，会丢 routing 阶段缺失项。
- P2 再修复：`userMessage` 改用 `execution.missingCapabilities`，并补 `current_dsl_context`、`weapon_fire_rate_action`、`candidate_brief` 消息断言。
- Oracle 最终复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 新建后复用。

当前下一步：

```txt
32.B Backend Plan and Artifact Sandbox API
```

## 32.B Backend Plan and Artifact Sandbox API

当前目标：接入 backend plan endpoint 和 proposal artifact sandbox；只产生审计 artifacts，不 prepare/apply live edit，不创建 candidate run，不推进 active state。

完成时间：2026-06-18

已完成内容：

- 新增 `apps/maker-api/src/projects/semantic-amendment.controller.ts`：
  - 暴露 `POST /api/projects/:projectId/runs/:runId/semantic-amendments/plan`。
  - Controller 只转发参数，业务逻辑保持在 service。
- 新增 `apps/maker-api/src/projects/semantic-amendment.service.ts`：
  - 校验 project/run 归属。
  - 解析 `{ text, language? }` 请求。
  - 只读读取当前 Game DSL：优先读已存在 live current 的 `dslArtifactPath`；没有 live current 时读 `model-output/game_dsl.json`；不会调用 `ensureLiveVersion`。
  - 用真实 runtime capability resolver 构建 `AmendmentContextPack`。
  - 调用 `planSemanticAmendment` 生成 proposal。
  - 写 proposal sandbox artifacts。
- 新增 `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`：
  - 统一生成 relative artifact refs。
  - 写入 `source_request.json`、`context_pack.json`、`understanding.json`、`design_deltas.json`、`game_operations.json`、`execution_route.json`、`rejected_unsafe_fallbacks.json`、`proposal.json`。
- 新增 `apps/maker-api/src/projects/semantic-amendment.types.ts`：
  - 定义 plan request/response 与 artifact ref schema。
- 新增 `apps/maker-api/src/projects/runtime-capability-resolution.ts`：
  - 从 `ProjectsService` 抽出 generated runtime registry + persisted runtime report 的能力解析。
  - `ProjectsService` 与 `SemanticAmendmentService` 现在复用同一能力门禁。
- `LocalWorkspaceService` 新增 semantic amendment sandbox path helper：
  - `getSemanticAmendmentDir`
  - `getSemanticAmendmentArtifactPath`
- `packages/game-dsl/src/amendments/semantic-amendment-planner.ts` 的 `buildAmendmentContextPack` 新增 `generatorCapabilities?: string[]`：
  - 32.A contract 默认仍保留 deterministic planner 的 candidate capability。
  - 32.B service 显式传 `generatorCapabilities: []`，因为 backend 当前尚未实现真实 candidate brief / DSL / run 能力。
- 新增 `tests/workspace/semantic-amendment-service.test.ts` 覆盖：
  - 有 generated registry 时，`提高玩家速度` 写完整 proposal artifacts，response 不泄漏 workspace absolute root。
  - plan 阶段不会创建 `live/current_version.json`。
  - 缺 generated registry 时，不绕过 runtime capability gate。
  - `把玩家变成小猫` 当前返回 `unsupported_capability`，直到后续 32.F 接入真实 candidate backend。
  - invalid request 不写 proposal artifact。
- 扩展 `tests/workspace/local-workspace.service.test.ts` 覆盖 sandbox path 与 path escape guard。

阶段结果：

- Backend 已有 natural-language plan endpoint 和可审计 artifact sandbox。
- 32.B 保持 non-mutating：不会 prepare/apply live edit，不写 patch history，不创建 candidate run，不推进 live current。
- Runtime capability source-of-truth 已和 Workbench live edit 对齐：generated registry 过期、缺失或不匹配时，不把 hot/warm path 当成可执行。
- Candidate regeneration 在 32.B 只保持“已理解但当前能力缺失”，不提前承诺 supported candidate run。

明确未改范围：

- 未实现 preview / accept / reject / undo state machine。
- 未把 proposal 转成 `DslPatchV1` 并进入 live-edit prepare。
- 未实现真实 candidate regeneration run。
- 未接 Workbench UI proposal card。
- 未跑真实浏览器 preview / QA。
- 未改用户已有 Workbench UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts tests/workspace/local-workspace.service.test.ts
  -> passed, 2 files, 8 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npx vitest run tests/workspace/projects-service.test.ts tests/contracts/semantic-amendments-planner.test.ts
  -> passed, 2 files, 43 tests

npx vitest run tests/workspace/semantic-amendment-service.test.ts tests/contracts/semantic-amendments-planner.test.ts tests/workspace/projects-service.test.ts
  -> passed, 3 files, 47 tests

git diff --check -- docs/refactor-log/step32-natural-language-game-amendment-planner.md
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 无；P2 1 个；P3 无。
- P2 修复：32.B service 不再继承 deterministic planner 的默认 generator capabilities；plan context 显式传 `generatorCapabilities: []`。
- P2 修复：补 `把玩家变成小猫` service regression，确认 backend 当前缺 candidate brief / DSL / run 时返回 `unsupported_capability`，不返回 supported candidate regeneration。
- Oracle 复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用。

当前下一步：

```txt
32.C Preview / Accept / Reject / Undo Lifecycle
```

## 32.C Preview / Accept / Reject / Undo Lifecycle

当前目标：实现 backend proposal lifecycle；hot/warm proposal 可以 preview、accept、reject、undo，candidate regeneration 仍留到 32.F。

完成时间：2026-06-18

已完成内容：

- 扩展 `apps/maker-api/src/projects/semantic-amendment.controller.ts`：
  - `POST /api/projects/:projectId/runs/:runId/semantic-amendments/:proposalId/preview`
  - `POST /api/projects/:projectId/runs/:runId/semantic-amendments/:proposalId/accept`
  - `POST /api/projects/:projectId/runs/:runId/semantic-amendments/:proposalId/reject`
  - `POST /api/projects/:projectId/runs/:runId/semantic-amendments/:proposalId/undo`
- 新增 `apps/maker-api/src/projects/semantic-amendment-lifecycle.ts`：
  - `preview` 只支持 `hot_runtime_patch` / `dsl_patch_warm_restart`。
  - `preview` 将 proposal `dslPatch` 转成 `DslPatchV1`，调用 `DslLiveEditService.prepareLiveEditPatch`，写 `review/preview_state.json`。
  - `accept` 要求 `runtimeApplyReport`，调用 `recordRuntimeApplyResult`；只有 `applied_hot` / `applied_warm_restart` 才把 proposal 标记为 `accepted` 并写 `undo_checkpoint.json`。
  - `reject` 写 `review/reject_log.json`，不推进 live current。
  - `undo` 仅允许 `accepted` proposal，读取 `undo_checkpoint.json` 恢复 `live/current_version.json`，写 `review/undo_log.json`。
- 新增 `apps/maker-api/src/projects/semantic-amendment-live-state.ts`：
  - 收敛 run/project 归属校验。
  - 收敛 current DSL / live current version 读取。
  - 收敛 undo restore，并校验 checkpoint DSL identity。
- 扩展 `apps/maker-api/src/projects/semantic-amendment-artifacts.ts`：
  - 支持 proposal read/write。
  - 支持 `review/preview_state.json`、`accept_log.json`、`reject_log.json`、`undo_checkpoint.json`、`undo_log.json`。
- 扩展 `apps/maker-api/src/projects/semantic-amendment.types.ts`：
  - 增加 lifecycle response types。
  - 内部 checkpoint artifact 保留完整 `LiveVersionRecord`。
  - 对外 response 使用 `SemanticAmendmentVersionSummary`，不返回 `dslArtifactPath`。
- 扩展 `LocalWorkspaceService`：
  - `getSemanticAmendmentReviewArtifactPath`。
- 扩展 `tests/workspace/semantic-amendment-service.test.ts` 覆盖：
  - `preview -> accept -> undo` 会先推进 live current，再通过 checkpoint 恢复。
  - accept / undo response 不泄漏 workspace absolute root。
  - runtime apply failure 会让 proposal 进入 `failed`，不写 undo checkpoint，不推进 current。
  - live current 被后续修改推进后，旧 proposal 的 undo 被拒绝，避免覆盖后续 accepted change。
  - `preview -> reject` 写 backend reject log，不推进 active state。
- 扩展 `tests/workspace/local-workspace.service.test.ts` 覆盖 review artifact path 和 path escape guard。

阶段结果：

- Hot/warm semantic amendment 已有 backend authoritative lifecycle。
- Accept 是唯一推进 authoritative live current 的入口，并且依赖 runtime apply report。
- Reject / failed accept 不推进 current。
- Undo 使用 backend checkpoint，并阻止 stale undo 覆盖后续 accepted version。
- Preview/accept/undo response 不泄漏本机 workspace absolute path。

明确未改范围：

- Candidate regeneration lifecycle 仍未实现；`candidate_regeneration` preview 仍会被拒绝，等 32.F。
- `weapon.fireRate` 的 live-edit warm restart runtime slice 仍未实现，等 32.E。
- Workbench UI proposal card 仍未接入，等 32.G。
- 真实浏览器 preview / QA closure 仍未执行，等 32.H。
- 未改用户已有 Workbench UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts tests/workspace/local-workspace.service.test.ts
  -> passed, 2 files, 13 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

npx vitest run tests/workspace/projects-service.test.ts tests/contracts/semantic-amendments-planner.test.ts tests/workspace/live-edit-pipeline.test.ts
  -> passed, 3 files, 68 tests

git diff --check -- docs/refactor-log/step32-natural-language-game-amendment-planner.md
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 2 个；P2 1 个；P3 无。
- P1 修复：`undo` 增加 checkpoint identity 校验、`acceptedVersionId` 必填校验、当前 live version 必须仍等于该 accepted version，避免 undo 覆盖后续 accepted change。
- P1 修复：accept / undo response 改用 `SemanticAmendmentVersionSummary`，不返回 `dslArtifactPath`；内部 checkpoint artifact 仍保留完整路径用于恢复。
- P2 修复：补 runtime apply failure regression，确认失败不会写 undo checkpoint、不会推进 current。
- P2 修复：补 stale-current undo regression，确认 live current 被外部推进后旧 proposal undo 被拒绝。
- Oracle 复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用。

当前下一步：

```txt
32.D Hot Patch Fast Path Through Planner
```

## 32.D Hot Patch Fast Path Through Planner

当前目标：让现有可热更新的 player / enemy / projectile 数值修改继续从 semantic planner 进入 live-edit fast path，而不是回到 editable field matcher 或 user-facing no matched field failure。

完成时间：2026-06-18

已完成内容：

- 扩展 `packages/game-dsl/src/amendments/semantic-amendment-planner.ts`：
  - 直接识别 `提高玩家生命值` / `玩家血量` / `player health`。
  - 直接识别 `提高敌人速度` / `敌人移速` / `enemy speed`。
  - 直接识别 `提高敌人生命值` / `敌人血量` / `enemy health`。
  - 将这些请求统一建模为 `GameDesignDelta.kind = tune_stat`，再生成 `GameOperation.kind = stat_tuning`。
  - 将 planner draft patch 映射到既有 live-edit hot paths：
    - `/player/health/max`
    - `/enemyTypes/{id}/physics/speed`
    - `/enemyTypes/{id}/health/max`
  - 保持已有 player speed、projectile speed、projectile damage fast path 不变。
- 扩展 `tests/contracts/semantic-amendments-planner.test.ts`：
  - 覆盖 `提高敌人速度`、`提高敌人生命值`、`提高玩家生命值`。
  - 断言这些请求不会进入 clarification / unsupported，也不会需要 unsafe fallback。
  - 断言 execution mode 为 `hot_runtime_patch`，draft patch path 命中 runtime capability。
- 扩展 `tests/workspace/semantic-amendment-service.test.ts`：
  - 增加 backend lifecycle 表格回归：
    - enemy speed
    - enemy health
    - player health
    - projectile damage
  - 每个 case 都走 `plan -> preview -> accept`。
  - `preview` 断言 `preparedLiveEdit.status = hot_patchable`、`apply_mode = hot`、`affectedPaths` 命中预期 path。
  - `accept` 断言 proposal 进入 `accepted`，runtime apply result 为 `applied_hot`。
  - accept 后读取 `live/current_version.json` 的 `dslArtifactPath`，再按 expected JSON pointer 断言 authoritative DSL 中的实际值等于 planner patch op value。

阶段结果：

- 热更新数值修改现在由 semantic planner 负责理解和路由，不依赖字段匹配失败路径。
- Planner 与 runtime capability gate 仍分层：planner 只生成 draft patch，最终是否 hot 由 `hotPatchCapabilities` / generated runtime registry 决定。
- Backend 已证明 hot path 不是只停在 proposal：plan 后能 preview，preview 后能 accept，accept 后 authoritative current DSL 真实变更。

明确未改范围：

- 未把 Workbench conversation submit 接到 proposal card，等 32.G。
- 未实现 `weapon.fireRate` warm restart runtime slice，等 32.E。
- 未实现 candidate regeneration，等 32.F。
- 未执行真实浏览器 preview / QA，等 32.H。
- 未改用户已有 Workbench UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts tests/workspace/live-edit-pipeline.test.ts
  -> passed, 3 files, 47 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

rg -n "[[:blank:]]+$" packages/game-dsl/src/amendments/semantic-amendment-planner.ts tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts
  -> no matches

rg -n "[[:blank:]]+$" docs/refactor-log/step32-natural-language-game-amendment-planner.md
  -> no matches
```

审查门禁结论：

- Oracle 初审：P0/P1/P2/P3 均无。
- Oracle 建议强化剩余风险：accept 后直接读取 current DSL artifact 并断言目标 JSON path 实际值。
- 已按建议补强 service lifecycle 回归。
- Oracle 复审：P3 1 个，测试使用 `ops[0]` 轻微绑定 patch op 顺序。
- P3 修复：按 `op.path === expectedPath` 查找 planner op，再与 accepted DSL 实际值比较。
- Oracle 最终复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用。

当前下一步：

```txt
32.E DSL Warm Restart Slice: weapon.fireRate
```

## 32.E DSL Warm Restart Slice: `weapon.fireRate`

当前目标：让 `增加武器射速` 从 semantic planner 生成 `/player/actions/{index}/cooldownMs` DSL patch，走 warm restart preview / accept，并显式拒绝 fallback 到 projectile speed / damage。

完成时间：2026-06-18

已完成内容：

- 扩展 `packages/game-dsl/src/live-edit.ts` runtime capability contract：
  - `top_down_shooter` warm restart capability 新增 `/player/actions/*/cooldownMs`。
  - `side_scrolling_run_and_gun` warm restart capability 新增 `/player/actions/*/cooldownMs`。
  - patch whitelist 新增 `player-action-cooldown`，将 `/player/actions/*/cooldownMs` 分类为 `warmRestart`。
  - validation 要求 cooldown value 是 int `0..5000`，且 player action index 存在。
  - `applyCandidatePatch` 新增 player action cooldown 同步逻辑：
    - `artifact.player.actions[index].cooldownMs`
    - `artifact.sourceDsl.player.actions[index].cooldown_ms`
- 更新 `tests/contracts/semantic-amendments-planner.test.ts`：
  - 移除测试中对 `/player/actions/*/cooldownMs` 的手工 capability 注入。
  - `weapon.fireRate` contract 现在依赖真实 `buildRuntimeCapabilityReport`。
- 扩展 `tests/workspace/live-edit-pipeline.test.ts`：
  - runtime capability report 断言 warm restart 包含 `/player/actions/*/cooldownMs`。
  - 新增合法 weapon cooldown warm restart 回归：
    - `prepare` 返回 `warm_restart_required`。
    - `prepare` 不推进 `live/current_version.json`。
    - pending candidate DSL 同步 artifact/sourceDsl cooldown。
    - runtime 确认 `applied_warm_restart` 后，authoritative current DSL 同步 artifact/sourceDsl cooldown。
  - 新增非法 weapon cooldown 回归：
    - `5001` 越界。
    - `225.5` 非整数。
    - `/player/actions/99/cooldownMs` action index 不存在。
    - 全部返回 `failed_validation` / `PATCH_VALUE_INVALID` / `applyMode = none`，不推进 current，不写 patch history，只写 invalid audit log。
- 扩展 `tests/workspace/semantic-amendment-service.test.ts`：
  - `增加武器射速` plan 返回 `dsl_patch_warm_restart`。
  - `rejectedUnsafeFallbacks` 保持 `projectile.speed` / `projectile.damage`。
  - `preview` 返回 `warm_restart_required` / `apply_mode = warm_restart`。
  - `accept` 使用 `applied_warm_restart` 推进 current。
  - accept 后读取 current DSL，断言 `/player/actions/0/cooldownMs` 已更新，`sourceDsl.player.actions[0].cooldown_ms` 已同步，`projectiles.bolt.speed/damage` 未被误改。

阶段结果：

- `weapon.fireRate` 现在是完整 DSL warm restart slice：planner 理解、capability gate 支持、preview 产生候选 DSL、accept 后提升 current。
- 该 slice 没有落到 projectile 近似字段，也没有被标成 hot runtime patch。
- Candidate DSL 与 source DSL 在 weapon cooldown 上保持一致，避免 accept 后 replay/projection 偏移。

明确未改范围：

- 未实现 candidate regeneration，等 32.F。
- 未接 Workbench proposal card，等 32.G。
- 未执行真实浏览器 preview / QA，等 32.H。
- 未改用户已有 Workbench UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts tests/workspace/live-edit-pipeline.test.ts
  -> passed, 3 files, 50 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

rg -n "[[:blank:]]+$" packages/game-dsl/src/live-edit.ts packages/game-dsl/src/amendments/semantic-amendment-planner.ts tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts tests/workspace/live-edit-pipeline.test.ts
  -> no matches

rg -n "[[:blank:]]+$" docs/refactor-log/step32-natural-language-game-amendment-planner.md
  -> no matches
```

审查门禁结论：

- Oracle 初审：P0/P1/P2 均无；P3 1 个。
- P3 修复：补 invalid weapon cooldown validation 回归，覆盖越界、非整数、缺 action index，确认 failed validation 不推进 current。
- Oracle 复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用。

当前下一步：

```txt
32.F Candidate Regeneration Slice: Player Theme
```

## 32.F Candidate Regeneration Slice: Player Theme

当前目标：让 `把玩家变成小猫` 从 understood-but-unsupported 升级为真实 candidate regeneration：preview 生成候选 brief / DSL / run artifacts，Accept 后才提升 active run pointer，Reject / Undo 由后端状态机负责。

完成时间：2026-06-18

已完成内容：

- 扩展 `packages/game-dsl/src/amendments/semantic-amendment-planner.ts`：
  - generator capabilities 增加 `candidate_theme_player`。
  - player theme candidate 需要 `candidate_brief` / `candidate_dsl` / `candidate_run` / `candidate_theme_player`。
  - genre candidate 需要对应 `candidate_genre_*`，避免泛化 overclaim。
- 扩展 `SemanticAmendmentService` plan context：
  - backend 当前只声明已实现的 player theme candidate capability。
- 扩展 `LocalWorkspaceService`：
  - 新增 `getSemanticAmendmentCandidateArtifactPath`。
- 扩展 `semantic-amendment.types.ts`：
  - candidate artifact ids：
    - `candidateBrief`
    - `candidateDsl`
    - `candidateDslDiff`
    - `candidateRun`
    - `candidateRuntimeCapabilityReport`
  - `SemanticAmendmentPreviewState.candidatePreview`。
  - `SemanticAmendmentAcceptLog.candidatePromotionResult`。
  - undo checkpoint/log 支持 active run pointer 字段。
- 扩展 `semantic-amendment-artifacts.ts`：
  - candidate artifact refs。
  - candidate artifact writer。
- 扩展 `semantic-amendment-lifecycle.ts`：
  - `preview` 支持 `candidate_regeneration` player theme。
  - preview 生成 deterministic candidate DSL：保持玩法不变，将 player label/source label 改为 `小猫`。
  - preview 写入：
    - `candidate/candidate_brief.json`
    - `candidate/candidate_dsl.json`
    - `candidate/candidate_dsl_diff.json`
    - `candidate/candidate_run.json`
    - `candidate/candidate_runtime_capability_report.json`
    - candidate run 的 `model-output/game_dsl.json`
    - candidate run 的 `model-output/runtime_capability_report.json`
  - preview 创建 candidate run，但不更新 project active run pointer。
  - candidate DSL validation 失败时，在创建 candidate run 前返回 failed preview state/proposal，避免留下 `PREVIEW_READY` candidate run。
  - `accept` 支持 candidate mode：
    - 不要求 `runtimeApplyReport`。
    - 校验 candidate DSL `runId` 同时匹配 candidate run 和 preview state。
    - 初始化 candidate run live current。
    - 更新 `latest-run.json` 和 `project.json.latest_run_id` 到 candidate run。
    - 写 candidate undo checkpoint。
  - `reject` candidate preview 不要求 runtime revert，不提升 active。
  - `undo` candidate mode：
    - 校验当前 latest run 仍是 accepted candidate run。
    - 若 active run 已被后续推进，拒绝 stale undo。
    - 恢复 previous active run pointer。

阶段结果：

- `把玩家变成小猫` 现在会生成真实 candidate sandbox 和 candidate run，不再只写 proposal metadata。
- Preview 阶段不会提升 active run pointer。
- Accept 是 candidate run 变成 active 的唯一入口。
- Reject / Undo 都由 backend artifacts 和 project latest-run 真相源驱动。
- Candidate preview 记录 `qaStatus = not_run`，没有声称真实 browser QA 已通过。

明确未改范围：

- 未接 Workbench proposal card，等 32.G。
- 未执行真实浏览器 preview / QA，等 32.H。
- 未运行完整 generation pipeline / compiler / Playwright QA；32.F 是 deterministic candidate DSL/run vertical slice。
- 未改用户已有 Workbench UI diff。
- 未 push。

已通过验证：

```txt
npx vitest run tests/workspace/semantic-amendment-service.test.ts tests/workspace/local-workspace.service.test.ts tests/contracts/semantic-amendments-planner.test.ts tests/workspace/live-edit-pipeline.test.ts tests/workspace/projects-service.test.ts
  -> passed, 5 files, 93 tests

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck:root
  -> passed

rg -n "[[:blank:]]+$" apps/maker-api/src/projects/semantic-amendment-lifecycle.ts apps/maker-api/src/projects/semantic-amendment.service.ts apps/maker-api/src/projects/semantic-amendment-artifacts.ts apps/maker-api/src/projects/semantic-amendment.types.ts apps/maker-api/src/workspace/local-workspace.service.ts packages/game-dsl/src/amendments/semantic-amendment-planner.ts tests/workspace/semantic-amendment-service.test.ts tests/workspace/local-workspace.service.test.ts tests/contracts/semantic-amendments-planner.test.ts
  -> no matches

rg -n "[[:blank:]]+$" docs/refactor-log/step32-natural-language-game-amendment-planner.md
  -> no matches
```

审查门禁结论：

- Oracle 初审：P0 无；P1 1 个；P2 1 个；P3 无。
- P1 修复：candidate accept 在任何 live current / active pointer 写入前校验 candidate DSL `runId`，并补篡改 candidate DSL identity 回归。
- P2 修复：candidate DSL validation 失败时，在创建 candidate run 前返回 failed preview state/proposal，避免留下 `PREVIEW_READY` candidate run。
- Oracle 复审：P0/P1/P2 均无；P3 1 个。
- P3 剩余风险：invalid candidate preview 分支当前缺直接回归测试；deterministic player-theme candidate 低成本路径总是生成 valid DSL。代码已将 candidate run 写入移动到 validation 之后，后续若 candidate generator 可注入或可产生 invalid candidate，应补“不创建 candidate run”的直接回归。
- 审查模式：Oracle 复用。

当前下一步：

```txt
32.G Workbench Proposal Card
```

## 32.G Workbench Proposal Card

当前目标：Workbench conversation edit submit 不再以 editable field matcher 作为自然语言入口；每次当前游戏修改请求先进入 semantic amendment planner，返回 proposal card，并通过 backend preview / accept / reject / undo lifecycle 收口。

完成时间：2026-06-18

已完成内容：

- 新增 `apps/maker-workbench/src/features/semantic-amendments/semanticAmendmentClient.ts`：
  - 封装 `plan` / `preview` / `accept` / `reject` / `undo` API。
  - 定义 Workbench 侧最小 `SemanticEditProposal` / `SemanticAmendmentPreviewState` / response types。
  - `isPreviewableSemanticAmendment` 区分 hot/warm/candidate 与 unsupported/clarification。
  - `requiresRuntimeApplyReport` 只对 `hot_runtime_patch` / `dsl_patch_warm_restart` 返回 true。
  - `buildSemanticAmendmentRuntimeApplyReport` 复用 live-edit runtime report builder，不伪造 accept。
- 新增 `SemanticAmendmentProposalCard.tsx`：
  - 展示 proposal summary、mode、review state、domains、confidence、preview/candidate/QA metadata。
  - 展示 planned changes、missing capabilities、rejected unsafe fallbacks。
  - 暴露 Accept / Reject / Undo action buttons。
- 扩展 `BriefTextboxPanel.tsx`：
  - 新增 `amendmentCards` prop。
  - 在 conversation history 中渲染 semantic amendment proposal card。
  - 保留原有 deterministic semantic patch preview fallback；当 `onSubmitEdit` 返回 handled 时清空 composer。
- 扩展 `App.tsx`：
  - 移除 conversation submit 对 `parseConversationLiveEditCommand` 的直接调用。
  - `submitConversationEdit` 现在执行：
    - append user edit message。
    - `planSemanticAmendment`。
    - 对 supported mode 自动 `previewSemanticAmendment`。
    - unsupported / clarification 也保留 proposal card，不再返回 “没有找到对应可编辑字段”。
  - 新增 semantic amendment card state 和 view mapper。
  - hot/warm Accept：
    - 要求 current project/run 与 proposal run 一致。
    - 要求 preview runtime ready。
    - 发送 `AIGAME_APPLY_PATCH` 到 iframe。
    - 等真实 `AIGAME_PATCH_RESULT` 后构造 `runtimeApplyReport`，再调用 backend semantic `accept`。
  - candidate Accept：
    - 不发送 runtime report。
    - 调用 backend semantic `accept`，由 backend promotion 更新 active run。
    - Workbench 使用 `candidatePromotionResult.activeRunId` 刷新当前 run。
  - Reject / Undo：
    - 分别调用 backend semantic `reject` / `undo`，不做 UI-only rollback。
  - runtime message handler：
    - 保留旧 deterministic live-edit pending patch。
    - 新增 semantic amendment pending patch。
    - 语义 patch 回执必须匹配 `runId` / `patchId` / `previewInstanceId`，且 message source 必须是当前 preview iframe。
- 新增 `apps/maker-workbench/src/features/semantic-amendments/__tests__/semanticAmendmentClient.test.ts`：
  - 覆盖 semantic runtime apply report 构造。
  - 覆盖 previewability 与 runtime-accept requirement mode 区分。
  - 源码集成断言 Workbench submit 走 semantic amendments，不回到 field-first parser。
- 更新 `briefTextboxIntentBridge.test.ts`：
  - conversation composer 集成断言新增 proposal card。
  - failed submit 仍保留 composer draft。
  - App submit path 不包含 `parseConversationLiveEditCommand({ text`。

阶段结果：

- Workbench 当前游戏自然语言修改入口已经接入 Step 32 planner / proposal card。
- 用户可见层不再把自然语言修改请求首先交给 field matcher，也不会把 unknown field failure 当最终结果。
- hot/warm proposal accept 等真实 iframe runtime result 后才调用 backend accept。
- candidate proposal accept 由 backend promotion 改 active run pointer。
- Reject / Undo 均走 backend lifecycle。

明确未改范围：

- 未删除旧 `conversationLiveEditParser`；它仍作为 legacy deterministic parser 测试对象存在，但不再是 Workbench conversation submit 的入口。
- 未执行真实浏览器 Workbench 端到端；等 32.H。
- 未声称 candidate preview 已跑真实 QA；32.F 仍记录 `qaStatus = not_run`。
- 未改 `scripts/dev.mjs` 的用户已有 dirty diff。
- 未 push。

已通过验证：

```txt
npx vitest run apps/maker-workbench/src/features/semantic-amendments/__tests__/semanticAmendmentClient.test.ts apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
  -> passed, 2 files, 23 tests

npx vitest run apps/maker-workbench/src/features/semantic-amendments/__tests__ apps/maker-workbench/src/features/brief/__tests__ apps/maker-workbench/src/features/semantic-editing/__tests__ apps/maker-workbench/src/features/preview/__tests__ tests/workspace/workbench-live-edit-client.test.ts
  -> passed, 6 files, 74 tests

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

git diff --check -- apps/maker-workbench/src/App.tsx apps/maker-workbench/src/features/brief/BriefTextboxPanel.tsx apps/maker-workbench/src/features/semantic-amendments apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
  -> passed
```

审查门禁结论：

- Oracle 初审：P0/P1/P2 均无；P3 2 个。
- P3 已记录：当前 Workbench tests 主要是源码集成和 client unit tests，尚未模拟 React 中 `plan -> preview -> iframe result -> accept`；该端到端验证纳入 32.H。
- P3 修复：`postMessage` 如果在设置 semantic pending ref 后抛错，现在会清理匹配当前 card 的 `pendingSemanticAmendmentRef` 和 `pendingSemanticAmendmentId`。
- Oracle 复审：P0/P1/P2 均无；pending-state P3 已解决。
- 剩余 P3：仍缺真实浏览器/React 端到端 `plan -> preview -> iframe AIGAME_PATCH_RESULT -> accept` 证据，纳入 32.H。
- 审查模式：Oracle 复用。

当前下一步：

```txt
32.H Final Browser / QA / Oracle Closure
```

## 32.H Final Browser / QA / Oracle Closure

当前目标：用真实 Workbench、真实 project/run、真实 preview iframe 和真实 runtime patch 回执完成 Step 32 端到端验收；补齐最终验证、Oracle closure，并准备 focused commit。

完成时间：2026-06-18

真实浏览器验收对象：

- Workbench URL：`http://127.0.0.1:5173/`
- API URL：`http://localhost:3000`
- 项目：`proj_20260617_181548_f1c7`
- Run：`run_20260617_181548_f1c7`
- 初始生成 brief：`做一个小猫射击外星人的小游戏`
- 真实生成状态：`PLAYABLE_WITH_ART_WARNINGS`
- QA：`RUNTIME PASSED`，`ASSET SEMANTIC WARNING`
- Preview iframe：`/preview/proj_20260617_181548_f1c7/index.html?refresh=run_20260617_181548_f1c7`
- Runtime：`Runtime ready: phaser:top_down_shooter`

已完成浏览器闭环：

- 真实生成 / 加载：
  - Workbench 成功加载真实 project/run。
  - Timeline 显示 `dsl-generation` / `dsl-validation` / `project-generation` / `build` / `qa` 均为 `DONE`。
  - Preview refresh 从 `qa_running` 回到 `ready`。
  - Telemetry 显示 `game.ready`、`player.fired`、`projectile.spawned`、`enemy.hit`、`score.changed` 等真实信号。
- Hot runtime patch accept：
  - 输入 `提高玩家速度` 后出现 `Semantic amendment proposal`。
  - Proposal mode：`hot runtime patch`。
  - Preview state：`preview ready`。
  - Planned change：`/player/physics/maxSpeed -> 312`。
  - 点击 Accept 后，Workbench 等 iframe `AIGAME_PATCH_RESULT`，再调用 backend accept。
  - History 写入 `v_patch_am_20260617_181719_9390a2c9`，操作为 `replace /player/physics/maxSpeed`。
- 第二个 hot runtime patch accept：
  - 输入 `提高敌人速度` 后出现 proposal card。
  - 点击 Accept 后，History 写入 `v_patch_am_20260617_182233_fed58c13`，操作为 `replace /enemyTypes/alien/physics/speed`。
  - 修复并验证 preview refresh 重新请求 `reason: semantic_patch_applied`，最终回到 `ready`，避免 runtime accept 后卡在 `qa_running`。
- Unsupported capability：
  - 输入 `Boss 登场时屏幕震动并播放警告音` 后出现 proposal card。
  - Proposal mode：`unsupported capability`。
  - 显示 missing capabilities：
    - `boss_lifecycle_event`
    - `camera_shake_runtime_effect`
    - `warning_audio_event_binding`
  - 显示 blocked fallbacks：
    - `enemy.count`
    - `enemy.speed`
    - `projectile.damage`
  - 仅显示 Reject，不显示 Accept。
  - 没有回到旧的 “没有找到对应可编辑字段” 失败路径。
- 干净 DevTools 复验：
  - 用完整 project/run ID 一次性加载，避免局部输入产生短 ID 请求。
  - Unsupported proposal card 复现后，Chrome DevTools console error/warn 为空。
  - Network 中本次有效请求均为 `200` / `304` / semantic `plan 201`。
  - 截图证据：`/tmp/step32h-workbench-unsupported-proposal-clean.png`。

本阶段补充修复：

- `App.tsx` preview auto-refresh 去重策略收紧：
  - 对同一 run 已处于 active refresh 且状态不是 `failed` / `waiting_for_build` 时继续跳过。
  - 对 `failed` / `waiting_for_build` 允许重试，避免 artifacts/status 到达后不能恢复。
- semantic runtime accept 后显式触发 `previewRefresh.requestRefresh({ reason: 'semantic_patch_applied', patchId, forceQa: true })`：
  - cache key 带 patch id。
  - preview badge 可从 `qa_running` 回到 `ready`。
  - runtime version 与 history 可见地推进到 accepted patch。

阶段结果：

- Workbench 自然语言入口已经完成 `plan -> preview -> runtime iframe result -> backend accept -> reload current project/run` 的真实浏览器闭环。
- Unsupported intent 现在作为 understood-but-missing-capability proposal 呈现，不再是 field-first failure，也不会 fallback 到危险近邻字段。
- Candidate regeneration backend lifecycle 已在 32.F 完成并由 service/workspace tests 覆盖；Workbench candidate accept 入口已在 32.G 接线，但 32.F 明确仍不声称 candidate preview 已跑真实 QA。

已通过最终验证：

```txt
npx vitest run tests/contracts/semantic-amendments-planner.test.ts tests/workspace/semantic-amendment-service.test.ts tests/workspace/local-workspace.service.test.ts tests/workspace/live-edit-pipeline.test.ts tests/workspace/workbench-live-edit-client.test.ts apps/maker-workbench/src/features/semantic-amendments/__tests__ apps/maker-workbench/src/features/brief/__tests__ apps/maker-workbench/src/features/semantic-editing/__tests__ apps/maker-workbench/src/features/preview/__tests__
  -> passed, 10 files, 133 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-api
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

git diff --check -- .
  -> passed
```

审查门禁状态：

- 32.G Oracle 已完成实现复审：P0/P1/P2 均无。
- 32.H Oracle 初审指出文档仍保留中间态文字，和 Landing table 的 `completed` 状态矛盾。
- 已回填真实最终验证结果，并把本节状态更新为闭环完成；Workbench semantic amendment flow 未发现 P0/P1/P2。

提交边界：

- 本次提交应包含 Step 32 semantic amendment planner/backend/workbench/docs/tests。
- 不包含用户已有 `scripts/dev.mjs` dirty diff。
- 不 push。
