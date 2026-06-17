# Step 30 Live-edit Capability Productization

适用项目：`ai-game-maker`

目标：把 DSL / prompt / artifact / resolver 中已有或已知的游戏语义，和 Workbench live-edit 真正可编辑、可预览、可 accept/reject/undo 的能力严格区分。Step 30 不把 prompt-only 或 placeholder capability 宣称为 runtime live-edit support。

## Boundary

本阶段必须保持：

```txt
Workbench UI
  -> semantic edit service / backend
  -> SemanticPatch / validated DSL patch
  -> validated SSOT update or preview runtime refresh
  -> runtime adapter behavior
```

禁止变成：

```txt
Workbench UI
  -> direct SSOT object mutation
```

也禁止把 unsupported intent fallback 到相近字段，例如：

- `增加散弹武器掉落` -> `enemy.count`
- `Boss 血量更高` -> `enemy.health`
- `屏幕震动` -> `world.width`
- `爆炸音效` -> `projectile.damage`

## Recommended Landing Order

| Step | Status | Scope |
| --- | --- | --- |
| 30.1 Live-edit Capability Exposure Matrix | completed | 建立 canonical matrix、registry、Workbench diagnostics、测试，阻断 false-green capability claims。 |
| 30.6 Unsupported Intent Diagnostics Upgrade | pending | 将 unsupported warning 升级为 structured diagnostics，优先防 unsafe fallback。 |
| 30.2 Pickups Editable Contract | pending | 建立 pickup intent / patch / validator / runtime adapter contract。 |
| 30.4 Runtime Feedback Effects Contract | pending | 建立 camera shake、hit flash、audio events、warning banner 等结构化 feedback contract。 |
| 30.3 Bosses Editable Contract | pending | 建立 boss intent / phases / attack pattern enum / intro / defeat contract。 |
| 30.5 Phaser Runtime Patch Behavior | pending | 把已完成 contract 接到 preview runtime adapter 和可观察 runtime behavior。 |
| 30.7 Final Contract / Oracle Review | pending | 做 closure、final validation、Oracle review 和未完成范围归档。 |

选择该顺序的原因：

- 30.1 先防止 capability list placeholder 被错误标绿。
- 30.6 在高阶 vertical slice 前先阻断 unsafe fallback。
- 30.2 pickups 是最小的高级 vertical slice。
- 30.4 feedback 会被 pickups 和 bosses 复用。
- 30.3 bosses 风险更高，等待 feedback contract 稳定后再进。
- 30.5 只在 contracts 稳定后进入 runtime behavior。

## 30.1 Live-edit Capability Exposure Matrix

当前目标：只建立 capability exposure source of truth，不实现 pickups/bosses/feedback runtime behavior。

完成时间：2026-06-17

已完成内容：

- 新增 `packages/game-dsl/src/live-edit-capability-status.ts`，定义 `LiveEditCapabilityStatus`。
- 新增 `packages/game-dsl/src/live-edit-capabilities.ts`，建立 canonical exposure registry。
- 从 `packages/game-dsl/src/index.ts` 导出 capability registry / summary API。
- 新增 `apps/maker-workbench/src/features/semantic-editing/liveEditDiagnostics.ts`，让 Workbench 从 registry 派生 diagnostics 分组。
- 更新 Workbench Live edit panel，分开展示 `supported-live-edit`、`warm-restart-only`、`known-not-exposed`、`resolver-only`、`requires-generator-gate` 等分组。
- 新增 `docs/refactor-log/live-edit-capability-exposure-matrix.md`。
- 新增 30.1 regression tests：
  - `tests/contracts/live-edit-capabilities.test.ts`
  - `apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts`

阶段结果：

- 当前支持字段仍标记为 `supported-live-edit`：
  - `player.speed`
  - `player.health`
  - `player.scale`
  - `player.label`
  - `enemy.speed`
  - `enemy.health`
  - `enemy.label`
  - `enemy.count`
  - `projectile.speed`
  - `projectile.damage`
  - `world.width`
- `/pickups` 和 `/bosses` 可显示为 runtime inventory `warm-restart`，但 registry status 不会变成 `supported-live-edit`。
- `audio.events.*` 当前为 `resolver-only`。
- `feedback.cameraShake`、`feedback.hitFlash`、`player.invulnerabilityFrames` 当前为 `known-not-exposed`。
- `hazards.movement`、`obstacles.platforms` 当前为 `requires-generator-gate`。

明确未改范围：

- 未新增 pickup parser、patch contract、validator 或 runtime behavior。
- 未新增 boss parser、patch contract、validator 或 runtime behavior。
- 未新增 feedback/audio event runtime binding。
- 未修改 generator、IR generator、Phaser generator、runtime QA pipeline。
- 未修改 generated Phaser output。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/live-edit-capabilities.test.ts
  -> passed, 1 file, 6 tests

npx vitest run apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts
  -> passed, 1 file, 3 tests

npx vitest run tests/contracts/semantic-editing-*.test.ts
  -> passed, 10 files, 138 tests

npx vitest run tests/contracts/resolver-v2.test.ts
  -> passed, 1 file, 65 tests

npx vitest run apps/maker-workbench/src/features/semantic-editing/__tests__/semanticPatchActions.test.ts apps/maker-workbench/src/features/preview/__tests__/previewRuntimeRefreshAdapter.test.ts tests/workspace/workbench-live-edit-client.test.ts
  -> passed, 3 files, 48 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

git diff --check -- .
  -> passed
```

审查门禁结论：

- Oracle 初审：P0 无；P1 1 个；P2 2 个；P3 2 个。
- P1 修复：`notExposed()` 层级布尔默认改为保守 false，逐项显式标记真实层级，避免 false-claim DSL/artifact support。
- P2 修复：Workbench diagnostics 引入 current-run runtime status；registry-supported 但当前 run 未列出的能力降级为 `runtime-adapter-missing`。
- P2 修复：tests 补 exact supported allowlist、registry key uniqueness、layer boolean assertions、empty inventory regression。
- P3 修复：Workbench diagnostics panel 展示 group summary 和 blocked fallback 摘要。
- Oracle 复审：上一轮 P1/P2 已关闭；发现 `summarizeLiveEditCapabilityExposure()` empty inventory false-green P2。
- P2 再修复：summary API 拆分 `registrySupportedEndToEnd` 与 current-inventory `supportedEndToEnd`。
- Oracle 最终复审：P0/P1/P2/P3 均无。
- 审查模式：Oracle 复用。

当前下一步：

```txt
30.6 Unsupported Intent Diagnostics Upgrade。
```
