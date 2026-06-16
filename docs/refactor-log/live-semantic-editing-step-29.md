# Step 29 Natural-language Live Semantic Editing Chain

当前状态：

- Step 29 Natural-language Live Semantic Editing Chain 🚧
  - 29.1 MVP Chain ✅
  - 29.2 Brief Textbox Deep Integration ⬜
  - 29.3 Preview Runtime Refresh Adapter ⬜
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
