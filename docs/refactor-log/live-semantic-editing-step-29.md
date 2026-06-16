# Step 29 Natural-language Live Semantic Editing Chain

当前状态：

- Step 29 Natural-language Live Semantic Editing Chain 🚧
  - 29.1 MVP Chain ✅
  - 29.2 Brief Textbox Deep Integration ✅
  - 29.3 Preview Runtime Refresh Adapter ✅
  - 29.4 Undo / Accept / Reject UX ⬜
  - 29.5 Final Consolidation ⬜

## Step 29.1 MVP Chain

完成时间：2026-06-17

已完成内容：

- 新增 `packages/game-dsl/src/live-editing/types.ts`，定义 natural-language live semantic editing 的 command、parse result、request、stage 与 result contract。
- 新增 `packages/game-dsl/src/live-editing/live-edit-parser.ts`，提供 deterministic rule-based parser。
- 新增 `packages/game-dsl/src/live-editing/live-edit-intents.ts`，将 parser command 转为 `SemanticEditIntent` 并通过 `SemanticEditIntentSchema`。
- 新增 `packages/game-dsl/src/live-editing/live-edit-handlers.ts`，提供 live edit planner handlers。
- 新增 `packages/game-dsl/src/live-editing/live-edit-loop.ts`，串接 parser -> intent -> planner -> validator -> applier -> Resolver V2 -> IR gate -> diff -> diagnostics。
- 新增 `packages/game-dsl/src/live-editing/index.ts` 并从 `packages/game-dsl/src/index.ts` 导出 public API。
- 新增 `apps/maker-workbench/src/features/live-editing/LiveSemanticEditPanel.tsx`。
- 新增 `apps/maker-workbench/src/features/live-editing/index.ts`。
- 新增 `tests/contracts/live-semantic-editing.test.ts`。

MVP parser 支持：

- `fix_blank_preview`
- `move_entity`
- `adjust_camera`
- `bind_asset`

已支持命令示例：

- `fix blank preview`
- `move player to 160, 320`
- `把玩家移动到 160, 320`
- `set camera to follow player`
- `bind player sprite to asset:player_sprite`

安全边界：

- parser deterministic rule-based，不接 LLM API。
- parser 拒绝 generated code path、workspace path、source path、asset file path 和运行 Phaser/code 的指令。
- `bind_asset` 只接受 `asset:<key>` semantic id，不接受 `./assets/player.png`。
- live edit loop 不 mutation input document。
- live edit loop 不 mutation `SemanticIndex` 或 `SemanticIndexEntry`。
- live edit loop 只使用 Step 27 planner / validator / applier orchestration，不绕过低层 guard。
- live edit loop 不写文件、不持久化 SSOT。
- live edit loop 不接真实 Preview runtime。
- live edit loop 不接 Phaser generator。
- live edit loop 不接 QA / pipeline。
- live edit loop 不修改 generated Phaser code。
- trace / diff / diagnostics view model 不保留 full document、raw asset source 或 diagnostic cause。

新增 planner handlers：

- `fix_blank_preview`
  - 复用 Step 27 `createFixBlankPreviewRepairHandlers`。
  - 默认 target `scene:main`。
- `move_entity`
  - 默认 target `entity:player`。
  - 设置 `/scenes/<scene>/entities/<entity>/components/transform`。
  - 保留 existing transform unknown fields。
  - 不替换整个 entity。
  - entity 不存在时 deterministic plan failure。
- `adjust_camera`
  - 默认 scene `scene:main`。
  - 设置 `/scenes/<scene>/camera`。
  - 合并 existing camera unknown fields。
  - 默认 `id: camera:main`。
  - 保留 existing `x` / `y` / `width` / `height` / `zoom` 等字段。
- `bind_asset`
  - 默认 target `entity:player`。
  - 设置 `/scenes/<scene>/entities/<entity>/components/sprite/asset`。
  - 自动创建 missing `components` / `sprite` containers。
  - asset 必须是 `asset:<key>` semantic id。

新增 live edit loop behavior：

- `parse_failed`：不 plan、不 validate、不 apply。
- `plan_failed`：不 validate、不 apply。
- `validation_failed`：不 apply。
- `apply_failed`：返回 structured failure 和 diff summary。
- `resolver_blocked`：apply 已在内存成功，但 Resolver V2 / IR gate blocked；返回 `ok=false`，同时包含 `apply`、updated `document`、`diff` 和 `diagnostics`，不自动 rollback。
- `applied`：apply、Resolver V2 与 IR gate 均通过，返回 updated in-memory document。

Workbench MVP：

- 新增 `LiveSemanticEditPanel` 受控组件。
- `enabled=false` 时不运行。
- `autoApply=true` 时 debounce 后调用 `runLiveSemanticEdit`。
- 同一 text 不重复 apply。
- `parse_failed` 不调用 `onDocumentChange`。
- `applied` 时调用 `onDocumentChange(result.document, result)`。
- 其他失败只调用 `onResult`。
- UI 显示 parse / plan / validation / apply / resolver status。
- UI 复用 `SemanticPatchDiffPanel` 和 `ResolverV2DiagnosticsPanel`。
- 组件不直接调用 low-level applier。
- 组件不写 persistence。
- 组件不接 runtime / QA / pipeline。
- 组件不使用 `dangerouslySetInnerHTML`。

未处理范围：

- 未接 LLM parser。
- 未深接入现有 brief 文本框。
- 未接真实 Preview runtime refresh。
- 未接 Phaser generator。
- 未接 QA / pipeline。
- 未写 SSOT persistence。
- 未修改 generated Phaser code。

本轮验证：

```bash
npx vitest run tests/contracts/live-semantic-editing.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npx vitest run tests/contracts/resolver-v2.test.ts
npx vitest run tests/contracts/resolver-v2-trace-diagnostics.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `tests/contracts/live-semantic-editing.test.ts`: 1 test file passed, 17 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 65 tests passed
- `tests/contracts/resolver-v2-trace-diagnostics.test.ts`: 1 test file passed, 16 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

审查门禁：

- Oracle 首审：
  - P0: 无
  - P1: 无
  - P2:
    - parser 对 unsupported entity target 过宽，可能把 `move enemy to 160, 320` 误映射到 `entity:player`。
    - `bind_asset` 未携带 `defaultSceneTarget`，非 main scene 时可能回落到 `/scenes/main`。
  - P3:
    - Workbench duplicate text 去重 key 当前只包含 trimmed text，后续深接入时可扩展为 text + document version。
    - `live-edit-loop.ts` 超过职责检查阈值，后续 Step 29.2 / 29.3 前建议拆阶段 helper。
- 本轮处理：
  - 收紧 `readEntityId`，unsupported explicit target 和 malformed `entity:` 不再默认改 player。
  - `bind_asset` parse result 现在保留 `sceneTarget`。
  - 新增 parser regression tests。
- Oracle 复审：
  - P0: 无
  - P1: 无
  - P2: 无，首审两个 P2 已关闭
  - P3:
    - 后续可补一个 `runLiveSemanticEdit` 非 `scene:main` 的 `bind_asset` end-to-end 测试。
    - Step 29.2 / 29.3 继续扩展前建议拆 `live-edit-loop.ts` 阶段 helper。
    - Workbench duplicate text 去重后续可扩展为 text + document version 或由父层显式控制。
- blocking findings closed

下一步建议：

- Step 29.2 Brief Textbox Deep Integration

## Step 29.2 Brief Textbox Deep Integration

完成时间：2026-06-17

已完成内容：

- 新增 `apps/maker-workbench/src/features/brief/briefTextboxSchema.ts`。
  - 定义 `BriefTextboxDraft`、`BriefTextboxDraftStatus`、`BriefTextboxMode` 与 validation result。
  - 校验 empty / too-long / invalid semantic target / stale project-run / missing current project-run。
  - 为 draft 生成 deterministic `draftHash`，用于 trace 与 handoff。
- 新增 `apps/maker-workbench/src/features/brief/briefTextboxIntentBridge.ts`。
  - 将 validated draft 接入 `runLiveSemanticEdit({ autoApply: false })`。
  - 只产出 preview result、`SemanticEditIntent`、`SemanticPatch`、diff view model 与 29.4 handoff。
  - 失败路径返回 `canAccept: false` 且不产出 handoff。
  - trace payload 收敛为 `draftHash` / `status` / `intentId` / `patchId`，不记录 full brief text。
- 新增 `apps/maker-workbench/src/features/brief/useBriefTextboxDraft.ts`。
  - 管理本地 draft、validation、preview result。
  - project/run 或 text/language 变化时清理旧 preview。
- 新增 `BriefTextbox.tsx` 与 `BriefTextboxPanel.tsx`。
  - Brief textbox 支持 `new_game` 与 `edit_current_game` 模式。
  - `Preview Patch` 只在 current-game draft、valid target、loaded document 与 SemanticIndex 同时满足时可用。
  - 面板内不包含 Generate，不触发 project generation。
- 更新 `apps/maker-workbench/src/App.tsx`。
  - Workbench Game brief 改为 `BriefTextboxPanel`。
  - `idea` 继续作为 new-game prompt。
  - 新增 `semanticEditText` 作为 current-game semantic edit draft。
  - 新增 `briefMode`，`new_game` / `edit_current_game` 使用不同 text state。
  - `Generate` 移入独立 New game action 卡片，并在 `edit_current_game` 模式下 disabled。
  - Preview handoff 仅更新 Workbench status 文本，不 apply、不 rollback、不刷新 runtime。
- 新增 `apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts`。
  - 覆盖 preview patch 不 apply / 不 mutation input document。
  - 覆盖 invalid target、empty、too-long、stale project-run、new_game mode block。
  - 覆盖 trace payload 字段白名单。
  - 覆盖 BriefTextboxPanel 不持有 Generate / onGenerate。
  - 覆盖 App 中 new-game prompt state 与 current-game semantic edit state 分离。

安全边界：

- 29.2 不写 SSOT。
- 29.2 不调用 patch applier。
- 29.2 不 apply runtime patch。
- 29.2 不 rollback。
- 29.2 不刷新 iframe preview。
- 29.2 不接 Phaser generator / QA / pipeline。
- 29.2 不修改 generated Phaser code。
- validation failed / parse failed / plan failed 都不会产出 handoff。
- `new_game` prompt 与 `edit_current_game` semantic draft 使用不同 state，避免 edit-current-game draft 被旁路用于 new project generation。

本轮验证：

```bash
npx vitest run apps/maker-workbench/src/features/brief
npx vitest run tests/contracts/semantic-editing-*.test.ts
npx vitest run tests/contracts/resolver-v2.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `apps/maker-workbench/src/features/brief`: 1 test file passed, 8 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 65 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

审查门禁：

- Oracle 首审：
  - P1:
    - Brief textbox panel 内仍暴露 Generate，违反 29.2 只做 draft / validation / Preview Patch 的边界。
    - Brief trace payload 超出 `draftHash` / `status` / `intentId` / `patchId` 白名单。
- 本轮处理：
  - 从 `BriefTextboxPanel` 移除 Generate / `onGenerate`。
  - 将 Generate 移到 App 独立 New game action 卡片。
  - 收窄 trace payload 字段。
  - 补字段白名单与 panel 不含 Generate 的测试。
- Oracle 复审：
  - P1:
    - Generate 虽移出 panel，但仍消费同一个 `idea` state，`new_game` / `edit_current_game` 未完全分离。
- 本轮处理：
  - 新增 `semanticEditText` 与 `briefMode`。
  - `new_game` 使用 `idea`，`edit_current_game` 使用 `semanticEditText`。
  - `Generate` 在 `edit_current_game` 模式 disabled。
  - 补 App state 分离与 Generate mode gate 测试。
- Oracle 三审：
  - 剩余 findings: 无
  - 是否仍阻塞 29.2: 不阻塞

未处理范围：

- 未实现 29.3 Preview Runtime Refresh Adapter。
- 未实现 29.4 Undo / Accept / Reject UX。
- 未实现 29.5 Final Consolidation。
- 未写 SSOT persistence。
- 未接 runtime / QA / pipeline。
- 未修改 generated Phaser code。

## Step 29.3 Preview Runtime Refresh Adapter

完成时间：2026-06-17

已完成内容：

- 新增 `apps/maker-workbench/src/features/preview/PreviewRuntimeRefreshAdapter.ts`。
  - 定义 preview refresh request / result / status / reason contract。
  - 通过 `pipeline_artifact_index` 中的 `phaserPreviewManifest` 判定 generated preview artifact readiness。
  - 缺失 artifact index、缺失 preview manifest、manifest 非 `present` 或非 `generated-project` root 时返回 `PREVIEW_ARTIFACT_ENTRY_NOT_FOUND`。
  - 拒绝 Workbench shell origin 的 preview URL，返回 `PREVIEW_ARTIFACT_POINTS_TO_WORKBENCH_SHELL`。
  - 生成 cache-busted iframe URL，cache key 使用 patch id / run id / refresh id。
  - 新 refresh 会使旧 refresh 进入 `stale`。
  - `iframe loaded` 只记录 load signal，不等于 runtime ready 或 QA passed。
  - `runtime loaded + QA passed + telemetry observed` 后才进入 `ready`。
  - `PREVIEW_BLANK_SCREEN` 降级为 `FALSE_PLAYABLE` failed verdict。
  - `ready` / `failed` terminal verdict 不会被后续 iframe / runtime / QA event 覆盖。
- 新增 `usePreviewRuntimeRefresh` hook。
  - 在 React 内保持 adapter 生命周期稳定。
  - 提供 request / iframe loaded / runtime loaded / QA complete 的 state bridge。
- 新增 `PreviewFrame` 与 `PreviewStatusBadge`。
  - `PreviewFrame` 承载 cache-busted iframe URL。
  - `PreviewStatusBadge` 暴露 refresh 状态，不把 shell load 误标为 playable。
- 新增 `semanticEditPreviewRefreshBridge.ts`。
  - 将 semantic patch applied / rollback event 映射为 preview refresh request。
  - 只做 request handoff，不实现 Accept / Undo / Rollback。
- 更新 `App.tsx`。
  - `loadProject` 读取现有 `/api/projects/:projectId/runs/:runId/artifacts`，把 `pipeline_artifact_index` 放入 Workbench dashboard state。
  - preview refresh request 传入 `artifactIndex`、backend preview URL、run status 和 Workbench origin。
  - 有 refresh result 时只使用 adapter 产出的 `iframeUrl`；没有 `iframeUrl` 时不 fallback 到旧 `previewUrl`。
  - iframe `onLoad` 只标记 iframe loaded。
  - `AIGAME_RUNTIME_READY` 标记 runtime loaded。
  - 现有 QA report 只作为 QA verdict 输入；未新增 QA runner 或 backend pipeline。
- 更新 `workbench-api.ts`。
  - `DashboardData` 增加 Workbench-only `pipelineArtifactIndex`。
- 新增 `apps/maker-workbench/src/features/preview/__tests__/previewRuntimeRefreshAdapter.test.ts`。
  - 覆盖 artifact URL、missing artifact、Workbench shell URL、cache bust、stale request。
  - 覆盖 iframe loaded 不等于 QA passed。
  - 覆盖 QA before runtime 不 ready，runtime + QA passed 后才 ready。
  - 覆盖 false playable / blank screen failure。
  - 覆盖 terminal verdict 不被后续 event 覆盖。
  - 覆盖 semantic patch applied / rollback 到 refresh request 的 bridge。
  - 覆盖 App refresh path 使用 `pipeline_artifact_index` 且不 fallback 到 Workbench shell。

安全边界：

- 29.3 不实现 Accept / Undo / Reject。
- 29.3 不写 SSOT persistence。
- 29.3 不调用 semantic patch applier。
- 29.3 不实现 rollback。
- 29.3 不接 backend QA runner。
- 29.3 不接 backend pipeline。
- 29.3 不接 IR generator。
- 29.3 不接 Phaser generator。
- 29.3 不修改 Resolver V2 能力。
- 29.3 不修改 generated Phaser code。
- 29.3 只消费现有 artifact index、runtime message 与 QA report，不把 iframe loaded 或 HTTP 200 视为 PLAYABLE。

本轮验证：

```bash
npx vitest run apps/maker-workbench/src/features/preview/__tests__/previewRuntimeRefreshAdapter.test.ts
npx vitest run apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
npx vitest run tests/contracts/semantic-editing-*.test.ts
npx vitest run tests/contracts/resolver-v2.test.ts
npm run typecheck:root
npm run typecheck --workspace @ai-game-maker/maker-workbench
git diff --check -- .
```

结果：

- `apps/maker-workbench/src/features/preview/__tests__/previewRuntimeRefreshAdapter.test.ts`: 1 test file passed, 17 tests passed
- `apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts`: 1 test file passed, 8 tests passed
- semantic-editing contract tests: 10 test files passed, 138 tests passed
- `tests/contracts/resolver-v2.test.ts`: 1 test file passed, 65 tests passed
- root TypeScript typecheck passed
- Workbench TypeScript typecheck passed
- diff check passed

审查门禁：

- Oracle 首审：
  - P1:
    - App 未实际消费 backend artifact index，missing / skipped preview artifact 仍可能加载 fallback preview URL。
    - Runtime / QA gating order-dependent，QA 可能在 iframe/runtime ready 前标记 ready，后续 iframe/runtime event 又可能覆盖状态。
  - P2:
    - 测试未覆盖 App 未传 artifact index、QA before runtime、QA verdict 被后续 event 覆盖等路径。
- 本轮处理：
  - `loadProject` 读取 `pipeline_artifact_index` 并传给 preview refresh adapter。
  - adapter 在没有 artifact index evidence 时返回 `PREVIEW_ARTIFACT_ENTRY_NOT_FOUND`。
  - adapter 引入 runtime / iframe / QA 单调状态规则，QA passed 需等待 runtime loaded 才 ready。
  - 补 artifact index、QA-first、terminal verdict regression tests。
- Oracle 复审：
  - P1:
    - `completeQa` 仍可能覆盖 artifact-missing `failed` 或 `ready` terminal verdict。
    - App 在已有 refresh 但无 `iframeUrl` 时仍可能 fallback 到 `previewUrl`。
- 本轮处理：
  - `completeQa` 增加 terminal guard。
  - `activePreviewUrl` 改为：没有 refresh result 时才使用旧 `previewUrl`；已有 refresh result 时只使用 `iframeUrl` 或空字符串。
  - 补 `completeQa` after artifact missing failed、`completeQa` after ready、App no-fallback source guard tests。
- Oracle 三审：
  - blocker: 无
  - 上轮 P1 已关闭
  - 确认未越界到 backend pipeline、QA runner、IR / Phaser generator、Resolver V2 新能力、SSOT apply / rollback 或 generated Phaser code

未处理范围：

- 未实现 29.4 Undo / Accept / Reject UX。
- 未实现 29.5 Final Consolidation。
- 未写 SSOT persistence。
- 未新增 QA runner。
- 未修改 generated Phaser code。
