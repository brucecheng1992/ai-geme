# Live-edit Capability Exposure Matrix

适用范围：Step 30 Workbench live-edit capability productization。

核心规则：

```txt
Capability exists != Workbench live-edit support.
```

Workbench live-edit support 只能在 capability 同时具备 parser mapping、validated patch shape、preview/runtime adapter behavior、accept/reject/undo lifecycle 和 tests 后标为 `supported-live-edit` 或 `runtime-complete`。

## Status Definition

| Status | Meaning |
| --- | --- |
| `supported-live-edit` | Workbench 可以接收自然语言或字段编辑，并经过 patch、runtime adapter、lifecycle 和 tests。 |
| `runtime-complete` | runtime behavior 完整存在，且可被完整 live-edit contract 控制。 |
| `warm-restart-only` | runtime inventory 可 warm restart 该 domain，但不能宣称 live runtime patch 支持。 |
| `generation-only` | 只属于生成 prompt/DSL 能力，不属于 Workbench live-edit。 |
| `schema-only` | DSL 可描述，但 parser/runtime live-edit 闭环缺失。 |
| `resolver-only` | resolver 能解析相关资源，但没有 live-edit event binding。 |
| `artifact-only` | artifact 可记录，但 Workbench live-edit 无法应用。 |
| `known-not-exposed` | 系统知道该概念，但当前必须阻断，不允许 fallback 到近似字段。 |
| `runtime-adapter-missing` | parser/patch 可能存在，但 preview runtime 不能执行。 |
| `behavior-not-verified` | 行为可能存在，但缺少测试或审查证据。 |
| `requires-generator-gate` | 需要 generator/runtime source gate，不能在 Step 30 中硬塞。 |
| `blocked-unsupported` | 当前必须阻断。 |

## Matrix

| Capability | User wording | DSL/runtime path | Runtime inventory mode | Current status | Blocked fallback |
| --- | --- | --- | --- | --- | --- |
| `player.speed` | 提高玩家速度 | `/player/physics/maxSpeed` | `hot` | `supported-live-edit` | n/a |
| `player.health` | 增加玩家血量 | `/player/health/max` | `hot` | `supported-live-edit` | n/a |
| `player.scale` | 放大/缩小玩家 | `/player/render/scale` | `hot` | `supported-live-edit` | n/a |
| `player.label` | 把玩家角色改成小猫 | `/player/label` | `warm-restart` | `supported-live-edit` | n/a |
| `enemy.speed` | 敌人更快/更慢 | `/enemyTypes/*/physics/speed` | `hot` | `supported-live-edit` | n/a |
| `enemy.health` | 敌人更肉/更脆 | `/enemyTypes/*/health/max` | `hot` | `supported-live-edit` | n/a |
| `enemy.label` | 改敌人概念 | `/enemyTypes/*/label` | `warm-restart` | `supported-live-edit` | n/a |
| `enemy.count` | 增加/减少敌人数量 | `/level/waves/*/count` | `warm-restart` | `supported-live-edit` | n/a |
| `projectile.speed` | 子弹更快/更慢 | `/projectiles/*/speed` | `hot` | `supported-live-edit` | n/a |
| `projectile.damage` | 子弹伤害更高/更低 | `/projectiles/*/damage` | `hot` | `supported-live-edit` | n/a |
| `world.width` | 扩大/缩小世界宽度 | `/world/width` | `warm-restart` | `supported-live-edit` | n/a |
| `pickups.enabled` | 开启补给掉落 | `/pickups` | `warm-restart` | `known-not-exposed` | `enemy.count`, `projectile.damage` |
| `pickups.dropRate` | 提高补给掉落概率 | `/pickups/dropRate` | `warm-restart` | `known-not-exposed` | `enemy.count` |
| `pickups.weapon` | 将既有 pickup 改为 weapon 类型 | `/pickups/*/kind` | `warm-restart` | `runtime-adapter-missing` | `enemy.count`, `projectile.damage` |
| `pickups.shield` | 掉落护盾/无敌道具 | `/pickups/items/*/effect/type` | `warm-restart` | `known-not-exposed` | `player.health` |
| `bosses.enabled` | 增加关底 Boss | `/bosses` | `warm-restart` | `warm-restart-only` | `enemy.count` |
| `bosses.health` | 提高 Boss 血量 | `/bosses/items/*/health` | `warm-restart` | `runtime-adapter-missing` | `enemy.health` |
| `bosses.healthBar` | 显示 Boss 血条 | `/bosses/items/*/healthBar/enabled` | `warm-restart` | `runtime-adapter-missing` | n/a |
| `bosses.attackPatterns` | Boss 三种攻击模式 | `/bosses/items/*/phases/*/attacks` | `warm-restart` | `runtime-adapter-missing` | `enemy.count`, `projectile.damage` |
| `bosses.introWarning` | Boss 登场警告 | `/bosses/items/*/intro/warningEnabled` | `warm-restart` | `runtime-adapter-missing` | n/a |
| `bosses.defeatEffect` | Boss 死亡大爆炸 | `/bosses/items/*/defeat/explosionEffect` | `warm-restart` | `runtime-adapter-missing` | n/a |
| `audio.events.pickupCollected` | 获得武器提示音 | `/audio/events/pickupCollected` | `not-listed` | `runtime-adapter-missing` | `projectile.damage` |
| `audio.events.explosion` | 爆炸音效 | `/audio/events/explosion` | `not-listed` | `runtime-adapter-missing` | `projectile.damage` |
| `audio.events.warning` | 警告提示音 | `/audio/events/warning` | `not-listed` | `runtime-adapter-missing` | n/a |
| `feedback.cameraShake` | 屏幕震动 | `/feedback/cameraShake` | `not-listed` | `runtime-adapter-missing` | `world.width` |
| `feedback.hitFlash` | 玩家受击闪烁 | `/feedback/hitFlash` | `not-listed` | `runtime-adapter-missing` | `player.health` |
| `player.invulnerabilityFrames` | 短暂无敌 | `/player/invulnerabilityFrames` | `not-listed` | `runtime-adapter-missing` | `player.health` |
| `effects.explosion` | 爆炸视觉效果 | `/effects/explosion` | `not-listed` | `runtime-adapter-missing` | `projectile.damage` |
| `collision.effects` | 碰撞触发效果 | `/rules/collisions/*/effects` | `not-listed` | `runtime-adapter-missing` | n/a |
| `ui.warningBanner` | WARNING 提示横幅 | `/ui/warningBanner` | `not-listed` | `runtime-adapter-missing` | n/a |
| `hazards.damage` | 陷阱伤害 | `/hazards/*/damage` | `not-listed` | `known-not-exposed` | `enemy.health`, `projectile.damage` |
| `hazards.movement` | 移动陷阱 | `/hazards/*/movement` | `not-listed` | `requires-generator-gate` | `enemy.count` |
| `obstacles.platforms` | 平台/障碍 | `/level/terrain`, `/obstacles` | `not-listed` | `requires-generator-gate` | `world.width`, `enemy.count` |

## Code Source Of Truth

- Registry：`packages/game-dsl/src/live-edit-capabilities.ts`
- Status union：`packages/game-dsl/src/live-edit-capability-status.ts`
- Workbench diagnostics：`apps/maker-workbench/src/features/semantic-editing/liveEditDiagnostics.ts`

Docs 和 UI diagnostics 均应从同一 registry 语义出发。后续新增 vertical slice 时，必须同步修改 registry、tests 和本 matrix。

注意：`registrySupportedEndToEnd` 只表示 canonical registry 认可该能力具备完整 live-edit contract；`supportedEndToEnd` 还必须结合当前 run 的 runtime capability inventory。当前 run 未列出的能力不得在 Workbench 中显示为可编辑。
