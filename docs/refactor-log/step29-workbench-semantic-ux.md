# Step 29 Workbench Semantic UX Closure

完成时间：2026-06-17

## 状态

Step 29 Natural-language Live Semantic Editing Chain ✅

- 29.1 MVP Chain ✅
- 29.2 Brief Textbox Deep Integration ✅
- 29.3 Preview Runtime Refresh Adapter ✅
- 29.4 Undo / Accept / Reject UX ✅
- 29.5 Final Consolidation ✅

完成口径：

- Step 29 完成 Workbench-facing semantic UX 与 backend-adapter-gated action lifecycle。
- Workbench 不直接写 SSOT，不直接调用 semantic patch applier，不修改 generated Phaser code。
- 当前仓库尚未新增 semantic patch accept / rollback backend endpoint；真实 SSOT persistence、regeneration 和 QA runner 是后续独立工作。

## 新增和更新

- Brief Textbox draft / validation / intent bridge：`apps/maker-workbench/src/features/brief/*`。
- SemanticPatch preview handoff：`BriefTextboxPanel` -> `useSemanticPatchActions.openReview`。
- PreviewRuntimeRefreshAdapter：`apps/maker-workbench/src/features/preview/*`。
- Semantic patch applied / rollback preview refresh bridge：`semanticEditPreviewRefreshBridge.ts`。
- Accept / Reject / Undo UX：`apps/maker-workbench/src/features/semantic-editing/*`。
- Workbench integration：`apps/maker-workbench/src/App.tsx`。
- Tests:
  - `apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts`
  - `apps/maker-workbench/src/features/preview/__tests__/previewRuntimeRefreshAdapter.test.ts`
  - `apps/maker-workbench/src/features/semantic-editing/__tests__/semanticPatchActions.test.ts`
- Step log：`docs/refactor-log/live-semantic-editing-step-29.md`。

## 闭环检查

- Brief Textbox can create patch preview: 已支持 non-mutating preview patch。
- Patch diff is visible: 已通过 `SemanticPatchDiffPanel` / review panel 展示 patch metadata 与 operations。
- Validated patch can be accepted: Workbench action lifecycle 支持 backend adapter accept；无 backend 时 fail safe。
- Rejected patch does not mutate SSOT: reject 只记录本地 action history，不触发 preview refresh。
- Applied patch can be undone: Workbench action lifecycle 支持 backend adapter undo；无 backend 时 fail safe。
- Accept triggers regeneration / preview refresh / QA: 当前只在 backend 返回 `applied` 后触发 preview refresh request；真实 regeneration / QA runner 未新增。
- Undo triggers regeneration / preview refresh / QA: 当前只在 backend 返回 `rolled_back` 后触发 preview refresh request；真实 regeneration / QA runner 未新增。
- Preview loads generated artifact entry URL: refresh adapter 只接受 artifact index 中的 generated-project preview manifest，不 fallback 到 Workbench shell。
- False playable is not shown as playable: blank preview / false playable 会进入 failed verdict。
- Trace can replay edit lifecycle: action state 保留 patch id、intent id、trace event ids 和 history。
- Patch history persists enough for audit / rollback: 当前为 Workbench local action history；持久化 patch history 未实现。

## 安全边界

- 未进入 Step 28.3 / 28.4 / 28.5。
- 未进入 Phaser Upgrade。
- 未接 IR generator。
- 未接 Phaser generator。
- 未新增 backend QA runner。
- 未修改 generated Phaser code。
- 未把 iframe loaded / HTTP 200 / build success 当 PLAYABLE。
- 未把 backend adapter gate 伪装成已完成 SSOT persistence。

## 验证

已通过：

```bash
npx vitest run apps/maker-workbench/src/features/semantic-editing/__tests__/semanticPatchActions.test.ts apps/maker-workbench/src/features/preview/__tests__/previewRuntimeRefreshAdapter.test.ts apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
# 3 test files passed, 44 tests passed

npx vitest run tests/contracts/semantic-editing-*.test.ts
# 10 test files passed, 138 tests passed

npx vitest run tests/contracts/resolver-v2.test.ts
# 1 test file passed, 65 tests passed

npm run typecheck:root
# passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
# passed

git diff --check -- .
# passed
```

脚本可用性：

- `npm run test --workspace @ai-game-maker/maker-workbench`: not available，`@ai-game-maker/maker-workbench` 当前没有 `test` script。
- `npm run test:workbench`: not available。
- `npm run test:workbench-semantic-editing`: not available。
- `npm run test:preview-refresh`: not available。
- `npm run test:playwright`: not available。

## Oracle 门禁

- Step 29.4 收口复审：
  - P0: 无
  - P1: 无
  - P2: 无
  - P3: hook stale async guard 仍是 source assertion，后续可补 behavior-level hook/component test。
- Step 29.5 文档收口 Oracle：
  - P0: 无
  - P1: 无
  - P2: 无
  - P3: 无
  - 确认文档未把 backend adapter gate 夸大成已实现 persistence。

## 最终扫描

- Workbench semantic UX 最大源码文件：`apps/maker-workbench/src/features/semantic-editing/semanticPatchActionState.ts`，540 行。
- Preview refresh 最大源码文件：`apps/maker-workbench/src/features/preview/PreviewRuntimeRefreshAdapter.ts`，411 行。
- 测试文件：
  - `apps/maker-workbench/src/features/semantic-editing/__tests__/semanticPatchActions.test.ts`，458 行。
  - `apps/maker-workbench/src/features/preview/__tests__/previewRuntimeRefreshAdapter.test.ts`，339 行。
  - `apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts`，237 行。
- `data/generated-projects` 代码文件时间扫描无输出；本轮未新增或修改 generated project code。

## 未处理范围

- Semantic patch accept / rollback backend endpoint。
- Real SSOT persistence and regeneration pipeline for accepted / rolled-back semantic patches。
- Backend QA runner integration for semantic patch lifecycle。
- Behavior-level React hook/component test for stale async accept / undo completion after a newer review opens。
- Step 28.3 / 28.4 / 28.5。
- Phaser Upgrade。

## 下一步建议

如果继续 live semantic editing，优先做 semantic patch accept / rollback backend endpoint，再接真实 SSOT persistence、regeneration 和 QA。若回到大路线，应单独选择 Phaser Upgrade 或后续 Resolver / pipeline 工作，不要混入 Step 29 closure。
