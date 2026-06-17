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
| 30.6 Unsupported Intent Diagnostics Upgrade | completed | 将 unsupported warning 升级为 structured diagnostics，优先防 unsafe fallback。 |
| 30.2 Pickups Editable Contract | in progress | 建立 pickup intent / patch / validator / runtime adapter contract。 |
| 30.4 Runtime Feedback Effects Contract | in progress | 建立 camera shake、hit flash、audio events、warning banner 等结构化 feedback contract。 |
| 30.3 Bosses Editable Contract | in progress | 建立 boss intent / phases / attack pattern enum / intro / defeat contract。 |
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
- `bosses.health`、`bosses.healthBar`、`bosses.attackPatterns`、`bosses.introWarning`、`bosses.defeatEffect` 当前为 `runtime-adapter-missing`；30.3a 已建立 DSL schema、artifact projection 和 SemanticPatch shape，但 parser/runtime hooks 未完成。
- `audio.events.*` 当前为 `runtime-adapter-missing`；30.4b 已建立 DSL schema，30.4c 已建立 SemanticPatch shape，但 event assetRef Resolver V2 binding / runtime hooks 未完成。
- `feedback.cameraShake`、`feedback.hitFlash`、`player.invulnerabilityFrames`、`effects.explosion`、`ui.warningBanner` 当前为 `runtime-adapter-missing`；30.4b 已建立 DSL schema，30.4c 已建立 SemanticPatch shape，但 parser/runtime hooks 未完成。
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

历史下一步：

```txt
30.2 Pickups Editable Contract（已进入 30.2a，见本文件 30.2 section）。
```

## 30.2 Pickups Editable Contract

### 30.2a Pickup Kind DSL Patch Contract

当前目标：先建立 pickup 最小 DSL patch contract，只允许把既有 pickup 的 `kind` 改为当前 Raw DSL 可表达的类型，不宣称 preview runtime / Phaser 行为已完成。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/live-edit.ts` 新增 `/pickups/*/kind` patch path rule。
- `pickup.kind` 值限定为当前 Raw DSL 支持的 `health | score | weapon`。
- patch 必须引用已存在的 pickup id；缺失 id 会失败。
- `applyCandidatePatch()` 可同步更新：
  - `artifact.pickups[pickupId].kind`
  - `artifact.sourceDsl.pickups[].kind`
- `packages/game-dsl/src/live-edit-capabilities.ts` 将 `pickups.weapon` 更新为：
  - `status: "runtime-adapter-missing"`
  - `dslSchema: true`
  - `artifactContract: true`
  - `semanticPatchShape: true`
  - `contractTests: true`
  - `runtimePatchAdapter: false`
  - `phaserRuntimeBehavior: false`
- Workbench diagnostics 将 `pickups.weapon` 归入 `runtime-adapter-missing`，不显示为 supported live-edit。
- conversation unsupported diagnostics 对 `加入散弹武器掉落` 返回 `unsupportedReason: "runtime-adapter-missing"`，继续阻断 fallback 到 `enemy.count` / `projectile.damage`。
- `docs/refactor-log/live-edit-capability-exposure-matrix.md` 同步 `pickups.weapon` 当前状态和路径。

阶段结果：

- side-scrolling run-and-gun 的 existing pickup kind patch 可以通过 DSL patch validation，并生成 pending candidate。
- 当前 Phaser adapter 对 side-scrolling run-and-gun 仍 unsupported，因此 live update plan 保持：
  - `status: "unsupported"`
  - `applyMode: "none"`
- unsupported runtime patch 只写 edit audit / pending candidate，不写 `patch_history`。
- `/pickups/*/value` 明确不在本步 contract 内；该路径会被 `PATCH_PATH_NOT_ALLOWED` 拒绝。

明确未改范围：

- 未新增 top-down shooter pickup runtime behavior。
- 未新增 pickup drop-rate、drop table、spawn lifecycle、weaponRef 或 shield contract。
- 未新增 Workbench pickup inspector field 或 natural-language successful parser mapping。
- 未新增 Phaser runtime patch adapter / generated Phaser behavior。
- 未修改 generated Phaser output。
- 未 push。

已通过验证：

```txt
npx vitest run tests/workspace/live-edit-pipeline.test.ts tests/contracts/live-edit-capabilities.test.ts apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
  -> passed, 4 files, 50 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

npx vitest run tests/contracts/semantic-editing-*.test.ts tests/contracts/resolver-v2.test.ts tests/workspace/workbench-live-edit-client.test.ts
  -> passed, 12 files, 213 tests

git diff --check -- .
  -> passed
```

审查门禁结论：

- Oracle 初审：BLOCKED。
- P1：`/pickups/*/value` 会允许 invalid candidate，并在 unsupported runtime 分支写 pending artifacts。
- P1 修复：移除 `/pickups/*/value` whitelist、validation 和 candidate apply 逻辑；补 `PATCH_PATH_NOT_ALLOWED` regression。
- Oracle 复审：PASS。
- 复审结论：P1 已关闭；`/pickups/*/kind` 收敛到 `health | score | weapon` 并要求 existing pickup id；`semanticPatchShape: true` 对 `/pickups/*/kind` 可接受，且不代表 runtime 已支持。

剩余风险：

- 仍存在既有整段 `/pickups` warm-restart rule，value 为 `unknown`；后续完整 pickup contract 需要单独收紧或明确用途。
- `apps/maker-workbench/src/features/brief/unsupportedLiveEditIntentDiagnostics.ts` 是新增文件，后续 checkpoint 必须纳入 stage，避免 parser import 断链。

历史下一步：

```txt
30.3 Bosses Editable Contract（已进入 30.3a，见本文件 30.3 section），或继续 30.2b Pickup parser / Workbench field mapping。
```

## 30.3 Bosses Editable Contract

### 30.3a Boss DSL / SemanticPatch Contract

当前目标：为 Boss encounter 建立最小 DSL schema、artifact projection 和 SemanticPatch shape seed，只允许修改既有 Boss 的受控字段，不宣称 add-boss、natural-language parser、runtime adapter、Phaser behavior 或 Workbench UI 已完成。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts` 新增 optional `bosses.items[]` schema。
- Boss Raw DSL 字段包括：
  - `id`
  - `label`
  - `health`
  - `movement`
  - `healthBar.enabled`
  - `phases[].healthThresholdPct`
  - `phases[].attacks`
  - `intro.warningEnabled`
  - `intro.warningText`
  - `intro.audioEvent`
  - `defeat.explosionEffect`
  - `defeat.audioEvent`
- Boss attack pattern enum 收敛为：
  - `spread_shot`
  - `charge`
  - `summon_minions`
  - `laser_burst`
  - `ground_slam`
- `packages/game-dsl/src/dsl-validator.ts` 同步：
  - Boss numeric range path。
  - Boss id duplicate-id 检查。
  - `semanticModel` 可把 Boss id 作为 `enemy` role 引用。
- `packages/game-dsl/src/artifact-contract.ts` 新增 `buildBosses(rawDsl)`，将 Raw DSL `bosses.items[]` 投影到 artifact `bosses` record。
- `packages/game-dsl/src/semantic-editing/semantic-index.ts` 将 Boss 注册为 `entity:<boss_id>`，path 为 `/bosses/items/<index>`。
- `packages/game-dsl/src/semantic-editing/types.ts` 新增 semantic edit intent kind：`configure_boss`。
- `packages/game-dsl/src/live-editing/live-edit-handlers.ts` 新增 `configure_boss` planner handler。
- `configure_boss` 只接受 semantic index 中 path 为 `/bosses/items/<numeric index>` 的 `entity:*` target。
- `configure_boss` payload 顶层只允许：
  - `health`
  - `healthBar`
  - `phases`
  - `intro`
  - `defeat`
- patch planner 只写入既有 Boss 的 Raw DSL SSOT path：
  - `/bosses/items/<index>/health`
  - `/bosses/items/<index>/healthBar/enabled`
  - `/bosses/items/<index>/phases`
  - `/bosses/items/<index>/intro/warningEnabled`
  - `/bosses/items/<index>/intro/warningText`
  - `/bosses/items/<index>/intro/audioEvent`
  - `/bosses/items/<index>/defeat/explosionEffect`
  - `/bosses/items/<index>/defeat/audioEvent`
- `packages/game-dsl/src/live-edit-capabilities.ts` 将以下能力更新为 `runtime-adapter-missing`：
  - `bosses.health`
  - `bosses.healthBar`
  - `bosses.attackPatterns`
  - `bosses.introWarning`
  - `bosses.defeatEffect`
- `bosses.enabled` 仍保持 `warm-restart-only`，不表示可 live-edit 新增 Boss。
- Workbench diagnostics 将 Boss 子能力归入 `runtime-adapter-missing`，不显示为 supported live-edit。
- 新增 `tests/contracts/live-semantic-editing-bosses.test.ts`，覆盖 planner、applier、input immutability、Raw DSL validation、非 Boss target、empty payload、range validation、attack enum、duplicate attack、未知顶层 key 和未知 nested key。
- `tests/contracts/dsl-validator-normalizer.test.ts` 覆盖 Boss Raw DSL schema 正负路径，并验证 Boss 不改变 normalized runtime requirements / runtime plan。
- `tests/contracts/semantic-editing-index.test.ts` 覆盖 Boss semantic id indexing。
- `docs/refactor-log/live-edit-capability-exposure-matrix.md` 同步 Boss 子能力当前状态。

阶段结果：

- 既有 Boss 的 health、healthBar、phases、intro、defeat 配置现在可以通过 explicit semantic intent 规划成 SemanticPatch。
- patch apply 会返回 cloned document，不 mutate 输入 Raw DSL。
- patch 后 Raw DSL 仍通过 `validateRawGameDsl()`。
- Boss Raw DSL 可被 artifact contract 投影为 `bosses` record，但 normalizer/runtime plan 当前仍不消费 Boss。
- registry 仍不会把 Boss 能力标为 `supported-live-edit`。
- Workbench natural-language parser 仍不会把普通用户输入成功映射到 `configure_boss`。

明确未改范围：

- 未新增 add-boss patch contract；`bosses.enabled` 仍只是 warm-restart placeholder。
- 未新增 natural-language parser mapping。
- 未新增 runtime patch adapter。
- 未新增 Phaser runtime behavior。
- 未新增 Workbench UI field。
- 未修改 generated Phaser output。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/live-semantic-editing-bosses.test.ts tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/live-edit-capabilities.test.ts tests/contracts/semantic-editing-index.test.ts apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
  -> passed, 6 files, 71 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

npx vitest run tests/contracts/semantic-editing-*.test.ts tests/contracts/resolver-v2.test.ts
  -> passed, 11 files, 203 tests

git diff --check -- .
  -> passed
```

审查门禁结论：

- Oracle 初审：PASS；P0/P1/P2 无，P3 1 个。
- P3：`configure_boss` 测试未直接覆盖 nested unknown key rejection。
- P3 修复：补 `healthBar.style` nested unknown key regression，期望 `SEMANTIC_PATCH_HANDLER_EXCEPTION`。
- Oracle 复审：PASS；P0/P1/P2/P3 均无。
- 复审结论：30.3a 只建立 Boss DSL / SemanticPatch contract seed；没有 parser/runtime/Phaser/UI false claim；Boss 子能力仍为 `runtime-adapter-missing`。

剩余风险：

- `configure_boss` 目前只可由 explicit semantic intent 使用，不是自然语言 live-edit 成功路径。
- Boss phases 当前作为完整数组写入，未开放直接写 `/bosses/items/<index>/phases/<index>`。
- artifact `bosses` record 只投影 runtime-neutral summary（health、movement、phase count），runtime attack / intro / defeat 行为仍只保留在 `sourceDsl`。
- 后续进入 30.5 前，需要明确 Boss runtime adapter 如何观察 health bar、phase attacks、intro warning 和 defeat effect。

当前下一步：

```txt
30.5 Phaser Runtime Patch Behavior（接入已完成的 pickups / bosses / feedback contracts），或继续 30.2b / 30.3b parser mapping。
```

## 30.4 Runtime Feedback Effects Contract

### 30.4a Collision Effects Semantic Patch Contract

当前目标：先建立 Raw DSL 里已有 `rules.collisions[].effects` 的受控 semantic patch contract，只允许更新既有 collision rule 的 effects，不宣称 camera shake、hit flash、audio event、warning banner 或 Phaser runtime behavior 已完成。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/live-editing/live-edit-handlers.ts` 为 `modify_rule` 增加 collision effects planner handler。
- `modify_rule` handler 只接受 `rule:*` semantic target，且 target path 必须是 `/rules/collisions/<numeric index>`。
- `intent.payload.effects` 收敛到当前 Raw DSL `EffectSchema` 可表达的结构：
  - effect array 长度必须为 1 到 6。
  - `type` 只允许 `damage | destroy | score_add | heal | knockback | end_game`。
  - `value` 可选；存在时必须是 `0..1000` 的整数。
  - effect object 只允许 `type` / `value`，未知 key 会被拒绝。
- live document operation planner 支持穿过已存在数组索引，以便规划 `/rules/collisions/0/effects`。
- semantic patch applier 支持穿过已存在数组索引，但最终 parent 仍必须是 object；不允许直接替换数组元素。
- `packages/game-dsl/src/live-edit-capabilities.ts` 将 `collision.effects` 更新为：
  - `status: "runtime-adapter-missing"`
  - `dslSchema: true`
  - `artifactContract: true`
  - `resolver: true`
  - `semanticPatchShape: true`
  - `contractTests: true`
  - `runtimePatchAdapter: false`
  - `phaserRuntimeBehavior: false`
- Workbench diagnostics 将 `collision.effects` 归入 `runtime-adapter-missing`，不显示为 supported live-edit。
- 新增 `tests/contracts/live-semantic-editing-rule-effects.test.ts`，覆盖 planner、applier、unsupported payload 和数组元素直写边界。
- `docs/refactor-log/live-edit-capability-exposure-matrix.md` 同步 `collision.effects` 当前状态。

阶段结果：

- 既有 collision rule 的 effects 可以被规划为 semantic patch：
  - patch path: `/rules/collisions/0/effects`
  - patch op: `set`
- patch apply 会返回 cloned document，不 mutate 输入 Raw DSL。
- `camera_shake` 等不存在于 Raw DSL `EffectSchema` 的 feedback payload 会被拒绝。
- `/rules/collisions/0` 这种直接替换数组元素的 patch apply 会失败，数组路径支持只用于穿过 existing index。

明确未改范围：

- 未新增 natural-language parser mapping；用户输入不会直接成功触发 `modify_rule`。
- 未新增 camera shake、hit flash、audio events、warning banner 的 DSL schema。
- 未新增 feedback/audio runtime adapter。
- 未新增 Phaser runtime behavior。
- 未修改 generated Phaser output。
- 未新增 Workbench UI field。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/live-semantic-editing-rule-effects.test.ts tests/contracts/live-edit-capabilities.test.ts apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts
  -> passed, 3 files, 12 tests

npx vitest run tests/contracts/semantic-editing-*.test.ts tests/contracts/resolver-v2.test.ts
  -> passed, 11 files, 203 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

git diff --check -- .
  -> passed
```

审查门禁结论：

- Oracle 初审：PASS；P0/P1/P2 无，P3 1 个。
- P3：`readRuleEffect()` 规范化输出但未显式拒绝 effect payload 未知字段。
- P3 修复：新增 `assertOnlyRuleEffectKeys()`，只允许 `type` / `value`；补 unknown key regression。
- 附加 regression：补 `/rules/collisions/0` direct array element write 失败测试，锁定数组路径支持边界。
- Oracle 复审：PASS；P0/P1/P2/P3 均无。
- 复审结论：没有 false runtime claim；`collision.effects` 仍为 `runtime-adapter-missing`；数组路径支持没有开放直接写数组元素；DSL-first 保持。

剩余风险：

- 30.4a 只完成 semantic patch contract seed，parser/runtime adapter/Phaser behavior 仍待后续步骤。
- camera shake、hit flash、audio events、warning banner 当前仍没有 Raw DSL schema，本步不应宣称支持。
- `patch-document.ts` 的 existing array index traversal 是通用能力；后续新增 array-backed semantic edits 时需要继续补对应 applier regression。

历史下一步：

```txt
30.4b Feedback/audio DSL schema design，或 30.5 Phaser Runtime Patch Behavior（接入已完成的 contract）。
```

### 30.4b Feedback / Audio DSL Schema Contract

当前目标：为 feedback、audio event、explosion、warning banner 和 invulnerability frames 建立 Raw DSL schema seed，只提升 DSL 表达能力，不新增 parser mapping、semantic patch shape、Resolver V2 event binding、runtime adapter 或 Phaser behavior。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts` 新增 optional structured DSL schema：
  - `feedback.cameraShake.enabled`
  - `feedback.cameraShake.intensity`
  - `feedback.cameraShake.durationMs`
  - `feedback.hitFlash.enabled`
  - `feedback.hitFlash.durationMs`
  - `feedback.hitFlash.flashCount`
  - `player.invulnerabilityFrames.durationMs`
  - `player.invulnerabilityFrames.flashEnabled`
  - `effects.explosion.enabled`
  - `effects.explosion.scale`
  - `effects.explosion.durationMs`
  - `effects.explosion.audioEvent`
  - `effects.explosion.cameraShake`
  - `audio.events.<eventKey>.assetRef`
  - `audio.events.<eventKey>.volume`
  - `audio.events.<eventKey>.enabled`
  - `ui.warningBanner.enabled`
  - `ui.warningBanner.text`
  - `ui.warningBanner.durationMs`
- audio event keys 固定为：
  - `shoot`
  - `enemyHit`
  - `enemyDefeated`
  - `playerHit`
  - `pickupCollected`
  - `weaponPickup`
  - `shieldPickup`
  - `bossIntro`
  - `bossDefeated`
  - `explosion`
  - `warning`
- 所有新增 feedback/audio/effects/warning schema 均为 `strictObject`。
- `packages/game-dsl/src/dsl-validator.ts` 将新增数值字段接入稳定 `NUMERIC_RANGE_INVALID` issue code。
- `tests/contracts/dsl-validator-normalizer.test.ts` 新增 30.4b contract tests：
  - 正向：Raw DSL 可接受 feedback/audio/effects/invulnerability/warningBanner。
  - 正向：normalizer 暂不消费这些字段，`runtime_requirements` / `runtime_plan` 与 baseline 相同。
  - 负向：cameraShake intensity、audio volume、explosion scale 越界会失败。
  - 负向：未知 audio event key 会失败。
- `packages/game-dsl/src/live-edit-capabilities.ts` 将以下能力更新为 `schema-only`：
  - `audio.events.pickupCollected`
  - `audio.events.explosion`
  - `audio.events.warning`
  - `feedback.cameraShake`
  - `feedback.hitFlash`
  - `player.invulnerabilityFrames`
  - `effects.explosion`
- audio event capability 保留 `dslSchema: true` / `artifactContract: true`，但 `resolver: false`，避免误称 Resolver V2 已支持 `/audio/events/*/assetRef`。
- Workbench diagnostics 将上述 schema-only 能力归入 `schema-only` 分组。
- conversation unsupported diagnostics 对 audio event prompts 返回 `known-dsl-concept-not-live-editable`，不再返回 resolver-capability reason。
- `docs/refactor-log/live-edit-capability-exposure-matrix.md` 同步 audio/feedback/effects 当前状态。

阶段结果：

- Raw DSL 现在可以描述 feedback/audio/effects/warning banner 的结构化配置。
- 这些配置仍不会改变 normalized runtime plan。
- Workbench 仍不会把这些能力显示为 supported live-edit。
- audio event binding 不再被文档或 registry 表述为 Resolver V2 已支持。

明确未改范围：

- 未新增 natural-language parser mapping。
- 未新增 semantic patch planner handler for feedback/audio/effects。
- 未新增 Resolver V2 `/audio/events/*/assetRef` extraction。
- 未新增 runtime patch adapter。
- 未新增 Phaser runtime behavior。
- 未新增 Workbench UI field。
- 未修改 generated Phaser output。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/live-edit-capabilities.test.ts apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
  -> passed, 4 files, 63 tests

npx vitest run tests/contracts/semantic-editing-*.test.ts tests/contracts/resolver-v2.test.ts
  -> passed, 11 files, 203 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

git diff --check -- .
  -> passed
```

审查门禁结论：

- Oracle 初审：BLOCKED。
- P2：`audio.events.*` 标为 `resolver-only` / `resolver: true` 会误导后续 agent，因为 Resolver V2 当前不提取 `/audio/events/*/assetRef`。
- P2 修复：将 `audio.events.*` 改为 `schema-only`，移除 resolver claim；tests、Workbench diagnostics、conversation unsupported reason、matrix 同步。
- Oracle 复审：PASS；P0/P1/P2/P3 均无。
- 复审结论：P2 已关闭；没有 parser/runtime/Phaser false claim；normalizer ignoring feedback/audio/effects 已由测试锁住。

剩余风险：

- 30.4b 只完成 Raw DSL schema seed，parser mapping、semantic patch shape、Resolver V2 event binding、runtime adapter、Phaser behavior 和 Workbench UI 均未完成。
- 后续如果进入 runtime plan，需要新增显式 IR/runtime contract 和回归测试，不能让 normalizer 继续隐式忽略。
- `collision.effects` 仍只是 30.4a semantic patch contract，状态为 `runtime-adapter-missing`，不代表 runtime 支持。

历史下一步：

```txt
30.4c Feedback/audio SemanticPatch contract（已完成，见下一节），或 30.5 Phaser Runtime Patch Behavior（接入已完成的 contract）。
```

### 30.4c Feedback / Audio SemanticPatch Contract

当前目标：为 30.4b 的 feedback/audio/effects/warning Raw DSL schema 建立受控 SemanticPatch shape，只允许 project-level `configure_feedback` 写入 Raw DSL SSOT 路径，不宣称 parser mapping、Resolver V2 event binding、runtime adapter、Phaser behavior 或 Workbench UI 已完成。

完成时间：2026-06-17

已完成内容：

- `packages/game-dsl/src/semantic-editing/types.ts` 新增 semantic edit intent kind：`configure_feedback`。
- `packages/game-dsl/src/live-editing/live-edit-handlers.ts` 新增 `configure_feedback` planner handler。
- `configure_feedback` 只接受 `project:*` semantic target。
- `configure_feedback` payload 顶层只允许：
  - `cameraShake`
  - `hitFlash`
  - `invulnerabilityFrames`
  - `explosion`
  - `audioEvents`
  - `warningBanner`
- nested object 均保持 strict key validation；未知顶层 key 和未知 nested key 都会被拒绝。
- patch planner 只写入 Raw DSL SSOT path：
  - `/feedback`
  - `/feedback/cameraShake`
  - `/feedback/hitFlash`
  - `/player/invulnerabilityFrames`
  - `/effects`
  - `/effects/explosion`
  - `/audio`
  - `/audio/events`
  - `/audio/events/<eventKey>`
  - `/ui/warningBanner`
- audio event key 固定为 30.4b schema 允许的 event key；`assetRef` 只允许 `asset:<dsl_id>` 形式。
- `packages/game-dsl/src/live-edit-capabilities.ts` 将以下能力更新为 `runtime-adapter-missing`：
  - `audio.events.pickupCollected`
  - `audio.events.explosion`
  - `audio.events.warning`
  - `feedback.cameraShake`
  - `feedback.hitFlash`
  - `player.invulnerabilityFrames`
  - `effects.explosion`
  - `ui.warningBanner`
- audio event capability 继续保留 `resolver: false`，避免误称 Resolver V2 已支持 `/audio/events/*/assetRef`。
- Workbench diagnostics 将上述能力归入 `runtime-adapter-missing`，不显示为 supported live-edit。
- conversation unsupported diagnostics 对相关 audio/feedback/effects prompts 返回 `runtime-adapter-missing`，继续阻断 fallback 到 `world.width` / `player.health` / `projectile.damage` 等 scalar field。
- 新增 `tests/contracts/live-semantic-editing-feedback.test.ts`，覆盖 planner、applier、input immutability、Raw DSL validation、unsafe target、empty payload、range validation、unknown audio event key、invalid `assetRef`、未知顶层 key 和未知 nested key。
- `docs/refactor-log/live-edit-capability-exposure-matrix.md` 同步 audio/feedback/effects/warning 当前状态。

阶段结果：

- feedback/audio/effects/warning 配置现在可以通过 explicit semantic intent 规划成 SemanticPatch。
- patch apply 会返回 cloned document，不 mutate 输入 Raw DSL。
- patch 后 Raw DSL 仍通过 `validateRawGameDsl()`。
- registry 仍不会把这些能力标为 `supported-live-edit`。
- Workbench natural-language parser 仍不会把普通用户输入成功映射到 `configure_feedback`。

明确未改范围：

- 未新增 natural-language parser mapping。
- 未新增 Resolver V2 `/audio/events/*/assetRef` extraction。
- 未新增 runtime patch adapter。
- 未新增 Phaser runtime behavior。
- 未新增 Workbench UI field。
- 未修改 generated Phaser output。
- 未 push。

已通过验证：

```txt
npx vitest run tests/contracts/live-semantic-editing-feedback.test.ts tests/contracts/live-edit-capabilities.test.ts apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
  -> passed, 4 files, 31 tests

npx vitest run tests/contracts/semantic-editing-*.test.ts tests/contracts/resolver-v2.test.ts
  -> passed, 11 files, 203 tests

npm run typecheck:root
  -> passed

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

git diff --check -- .
  -> passed
```

审查门禁结论：

- Oracle 初审：PASS；P0/P1/P2 无，P3 1 个。
- P3：tests 未直接覆盖 unknown key rejection path。
- P3 修复：补顶层 unknown key regression（`script: true`）和 nested unknown key regression（`cameraShake.easing`）。
- Oracle 复审：PASS；P0/P1/P2/P3 均无。
- 复审结论：30.4c 只建立 SemanticPatch contract seed；没有 parser/runtime/Resolver V2 false claim；capability 仍为 `runtime-adapter-missing`。

剩余风险：

- `configure_feedback` 目前只可由 explicit semantic intent 使用，不是自然语言 live-edit 成功路径。
- audio event `assetRef` 仅做语法校验，尚无 Resolver V2 资源提取或绑定。
- runtime adapter / Phaser / UI 行为仍未接入，因此用户预览不会出现屏幕震动、闪烁、无敌帧、爆炸、音效或 warning banner 行为。
- 后续进入 30.5 前，需要为 runtime adapter 明确热更新/暖重启边界和可观察 QA 证据。

历史下一步：

```txt
30.3 Bosses Editable Contract（已进入 30.3a，见本文件 30.3 section），或 30.5 Phaser Runtime Patch Behavior（接入已完成的 contract）。
```

## 30.6 Unsupported Intent Diagnostics Upgrade

当前目标：将 Workbench conversation live-edit 的 unsupported failure 从单一 `unsupported_field` 文案升级为结构化 diagnostics，阻止高层 future intent 被误回退到已支持 scalar 字段。

完成时间：2026-06-17

已完成内容：

- 新增 `apps/maker-workbench/src/features/brief/unsupportedLiveEditIntentDiagnostics.ts`。
- `parseConversationLiveEditCommand()` 在进入 numeric / label parser 前识别已知但未暴露的高层能力。
- `unsupported_field` failure 现在可携带：
  - `unsupportedReason`
  - `recognizedCapabilities`
  - `blockedFallbacks`
  - `suggestions`
  - `diagnostics`
- `recognizedCapabilities`、`blockedFallbacks`、diagnostic copy 从 `packages/game-dsl` capability exposure registry 派生。
- unknown concept 仍返回 `unsupported_field`，但标记为 `unsupportedReason: "unknown-concept"`。
- 新增 regression tests，覆盖：
  - `加入散弹武器掉落`
  - `Boss 登场时屏幕震动并播放警告提示`
  - `玩家受击后闪烁并短暂无敌`
  - `获得武器时播放提示音`
  - `击败 Boss 时触发大爆炸`
  - `爆炸音效更强`
  - `加入会移动的陷阱`

阶段结果：

- 不支持的 high-level live-edit intent 不会被错误转换为：
  - `enemy.count`
  - `projectile.damage`
  - `world.width`
  - `player.health`
- 已支持字段仍保持原 live-edit 成功路径：
  - player speed / health / scale / label
  - enemy speed / health / label / count
  - projectile speed / damage
  - world width
- conversation composer 仍只通过 failure `message` 展示错误；本步只补数据契约，不新增 UI 面板。

明确未改范围：

- 未新增 pickup parser、patch contract、validator 或 runtime behavior。
- 未新增 boss parser、patch contract、validator 或 runtime behavior。
- 未新增 feedback/audio event runtime binding。
- 未修改 generator、IR generator、Phaser generator、runtime QA pipeline。
- 未修改 generated Phaser output。
- 未 push。

已通过验证：

```txt
npx vitest run apps/maker-workbench/src/features/brief/__tests__/briefTextboxIntentBridge.test.ts
  -> passed, 1 file, 20 tests

npx vitest run tests/contracts/live-edit-capabilities.test.ts apps/maker-workbench/src/features/semantic-editing/__tests__/liveEditDiagnostics.test.ts
  -> passed, 2 files, 9 tests

npm run typecheck --workspace @ai-game-maker/maker-workbench
  -> passed

npm run typecheck:root
  -> passed

npx vitest run tests/contracts/semantic-editing-*.test.ts tests/contracts/resolver-v2.test.ts
  -> passed, 11 files, 203 tests

git diff --check -- .
  -> passed
```

审查门禁结论：

- Oracle 审查：PASS。
- P0/P1/P2：无。
- P3 非阻塞提醒：新增文件 `apps/maker-workbench/src/features/brief/unsupportedLiveEditIntentDiagnostics.ts` 当前为未跟踪文件，后续 checkpoint 必须纳入 stage，避免 parser import 断链。
- Oracle 结论：DSL-first 保持；未把 future intent 映射到 `enemy.count`、`projectile.damage`、`world.width`；未触碰 Phaser 输出；registry 一致性通过；测试足以防止指定 high-level unsupported intent fallback。

剩余风险：

- intent detection 仍是局部 phrase matcher，不是从 registry `examples` 自动生成；后续新增 capability 时需要同步维护 pattern list。

历史下一步：

```txt
30.2 Pickups Editable Contract（已进入 30.2a，见本文件 30.2 section）。
```
