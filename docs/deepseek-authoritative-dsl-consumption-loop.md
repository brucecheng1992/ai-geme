# DeepSeek DSL 完整消费：剩余 Evidence 清单与推进计划

## 1. 当前 reviewed checkpoint

- **HEAD**：`6cfc53ed`
- **提交**：`feat(game-dsl): consume default straight weapon runtime config`
- **工作区**：干净
- **相对 `origin/main`**：ahead 17
- **Push 状态**：未 push

当前 support summary：

| 指标 | 当前值 |
|---|---:|
| Requirements | 60 |
| Required capabilities | 59 |
| Registered capabilities | 17 |
| Complete supported | 0 |
| Legacy-backed capabilities | 7 |

> 本文所说的“还差 20 个 evidence”，仅指当前已明确推进的 **M2 + M3 共 8 个 capability**，不代表完整 59-capability Profile 的全部剩余工作量。

---

## 2. `complete_supported` 判定规则

一个 capability 只有同时满足以下五个 evidence，才能标记为 `complete_supported=true`：

```text
schema_expressible
AND normalized
AND compiled
AND runtime_consumed
AND qa_observed
```

任何单一层级都不能替代后续层级：

- Schema 能表达，不代表 normalizer 已形成 canonical contract。
- Normalizer 能保真，不代表 compiler 已生成 capability-specific artifact。
- Compiler 生成 artifact，不代表 runtime 已解释并消费其语义。
- Runtime 安装或保存配置，不代表真实行为已被 QA 观察。
- Generic JSON passthrough、ID 聚合、report 映射、raw config retention 均不得冒充 executable support。

---

## 3. 当前 8 个 capability 的 evidence 矩阵

符号说明：

- ✅：evidence 已成立
- ❌：evidence 尚未成立

| Capability | Schema | Normalized | Compiled | Runtime consumed | QA observed | Complete supported | 尚缺 evidence |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `movement.crouch.v1` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | `qa_observed` |
| `combat.airborne_fire.v1` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | `qa_observed` |
| `health.damage_invulnerability.v1` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | `qa_observed` |
| `weapon.default_straight_single.v1` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | `qa_observed` |
| `weapon.spread_shot.v1` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `compiled`、`runtime_consumed`、`qa_observed` |
| `weapon.rapid_fire.v1` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | `compiled`、`runtime_consumed`、`qa_observed` |
| `weapon.replacement_rule.v1` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 全部五项 |
| `weapon.death_reset.v1` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 全部五项 |

---

## 4. 剩余 20 个 evidence 的完整拆分

### 4.1 四个 capability 各缺一个 `qa_observed`

共计：

```text
4 × 1 = 4
```

具体为：

1. `movement.crouch.v1`
2. `combat.airborne_fire.v1`
3. `health.damage_invulnerability.v1`
4. `weapon.default_straight_single.v1`

每个 capability 当前均为：

```yaml
schema_expressible: true
normalized: true
compiled: true
runtime_consumed: true
qa_observed: false
complete_supported: false
```

剩余目标：

```text
qa_observed: false → true
```

但只有在 QA 确实观察到 capability 对应的运行时行为后，才能完成该变化。以下内容不能单独构成 `qa_observed=true`：

- 单元测试只验证 registry boolean；
- loader plan 构建成功；
- module install 返回成功；
- snapshot 仅回显输入配置；
- report 中出现 capability ID；
- runtime state 已安装，但行为没有被实际触发和观察。

---

### 4.2 两个 capability 各缺三个 evidence

共计：

```text
2 × 3 = 6
```

具体为：

1. `weapon.spread_shot.v1`
2. `weapon.rapid_fire.v1`

每个 capability 当前均为：

```yaml
schema_expressible: true
normalized: true
compiled: false
runtime_consumed: false
qa_observed: false
complete_supported: false
```

每个 capability 仍需依次完成：

```text
compiled
→ runtime_consumed
→ qa_observed
```

#### `compiled=true` 的最低要求

- 生成 capability-specific compiled artifact；
- artifact 具有冻结、可测试的 shape；
- compiler 对必要字段做 capability-specific 校验；
- 非法输入 fail-closed；
- 不能仅依赖通用 `systemSourceIds`、`configSourceIds` 或原始 config 搬运。

#### `runtime_consumed=true` 的最低要求

- 精确 compiled artifact 进入精确 runtime module；
- module 校验并解释 artifact 字段；
- 字段被转换为 typed operational state、action binding 或等价运行时结构；
- 只反序列化、透传或保存 raw config 不算消费；
- 错误 artifact 或字段不得安装有效状态。

#### `qa_observed=true` 的最低要求

- QA probe 实际触发并观察对应行为；
- `spread_shot` 必须观察到真实的多方向或多 projectile spread 行为；
- `rapid_fire` 必须观察到冻结定义下的射速、冷却或连续触发行为；
- 仅观察配置值存在，不等于观察到玩法行为。

---

### 4.3 两个 capability 各缺全部五个 evidence

共计：

```text
2 × 5 = 10
```

具体为：

1. `weapon.replacement_rule.v1`
2. `weapon.death_reset.v1`

每个 capability 当前均为：

```yaml
schema_expressible: false
normalized: false
compiled: false
runtime_consumed: false
qa_observed: false
complete_supported: false
```

每个 capability 仍需依次完成：

```text
schema_expressible
→ normalized
→ compiled
→ runtime_consumed
→ qa_observed
```

#### `weapon.replacement_rule.v1` 的前置 scope freeze

必须先冻结至少以下语义：

- replacement timing；
- pickup event boundary；
- active weapon ownership；
- previous weapon disposition；
- inventory/loadout ownership；
- slot selection；
- replacement 与 death reset 的交互；
- replacement failure 或拒绝规则。

不得使用以下形式冒充 schema/normalization 支持：

```json
{
  "semantic_status": "unresolved",
  "unresolved_dimensions": ["..."]
}
```

这种记录只能说明 gap 已知，不能说明 replacement rule 的真实语义已被 schema 表达和 canonicalized。

#### `weapon.death_reset.v1` 的前置 scope freeze

必须先冻结至少以下语义：

- 哪个 death event 触发 reset；
- reset 发生在 death、respawn 还是 scene restart 边界；
- active weapon、inventory、ammo、cooldown 分别如何处理；
- 默认武器如何恢复；
- replacement state 是否被清除；
- multiplayer/entity ownership 是否影响 reset；
- QA 应观察哪一个完整生命周期。

---

## 5. 数量核算

当前 8 个 capability 共需要：

```text
8 × 5 = 40 个 evidence
```

已成立：

```text
M2 三项：3 × 4 = 12
Default straight weapon：1 × 4 = 4
Spread + rapid：2 × 2 = 4
Replacement + death reset：2 × 0 = 0

合计：12 + 4 + 4 + 0 = 20
```

尚缺：

```text
40 - 20 = 20
```

也可按缺口类型计算：

```text
4 个 qa_observed
+ 2 ×（compiled + runtime_consumed + qa_observed）
+ 2 ×（schema_expressible + normalized + compiled + runtime_consumed + qa_observed）

= 4
+ 2 × 3
+ 2 × 5

= 4 + 6 + 10
= 20
```

---

## 6. 建议推进顺序

### Phase A：先形成第一个 `complete_supported`

优先对：

```text
weapon.default_straight_single.v1
```

执行只读 QA-observation scope freeze，明确：

- QA 必须触发什么行为；
- 行为从哪个 runtime entry point 触发；
- 观察面是什么；
- 什么结果才构成 straight + single + player-owned + primary fire 的实际证明；
- 是否需要真实 projectile spawn、trajectory 或 hit lifecycle；
- 自动化 QA probe 与普通 contract test 的边界。

只有 scope freeze 证明现有 runtime behavior 已足够可观察时，才应进入 RED/GREEN QA checkpoint。

### Phase B：补齐 M2 三项 QA

按 capability 分开做原子 checkpoint：

1. `movement.crouch.v1`
2. `combat.airborne_fire.v1`
3. `health.damage_invulnerability.v1`

每项均应：

```text
QA scope freeze
→ RED probe
→ 最小 QA observation implementation
→ targeted/regression/typecheck/diff-check
→ Oracle
→ 单一原子本地 commit
→ 停止
```

### Phase C：纵向完成 `spread_shot`

```text
compiler scope freeze
→ compiled checkpoint
→ runtime-consumer scope freeze
→ runtime-consumed checkpoint
→ QA-observation scope freeze
→ QA checkpoint
```

### Phase D：纵向完成 `rapid_fire`

使用与 spread 相同的分层方式，但不得复用不匹配的 artifact 或 runtime 语义。

### Phase E：重新定义 replacement 与 death-reset

先完成真实语义契约，不得从通用 JSON carrier 或 unresolved metadata 直接抬高 evidence。

---

## 7. 每个 checkpoint 的统一停点

每一层都应独立提交，避免一次提交跨越多个 evidence：

```text
scope freeze
→ RED
→ 最小实现
→ GREEN
→ targeted tests
→ regression tests
→ typecheck
→ git diff --check
→ 只读 Oracle
→ 原子本地 commit
→ 工作区干净
→ 不 push
→ 停止等待显式授权
```

不应停在以下状态：

- 未评审的 RED；
- 半实现且 evidence 已被提前抬高；
- runtime 和 QA 混在同一 checkpoint；
- 工作区存在不明来源改动；
- Oracle 有阻塞 finding；
- capability evidence 与实际执行链不一致。

---

## 8. 当前最准确的进度表述

```text
当前已经为 weapon.default_straight_single.v1 打通：
Schema → Normalization → Compiler → Runtime Consumer。

M2 三项 capability 也已到达 4/5 evidence。

当前共有 4 个 capability 仅缺 qa_observed；
2 个 capability 各缺 compiler、runtime consumer 和 QA；
2 个 capability 仍缺完整五层语义与执行链。

当前 8 个已明确推进 capability 共缺 20 个 evidence。
完整 59-capability Profile 仍有 42 个 capability 尚未登记，
且 completeSupportedCount 仍为 0。
```

---

## 9. 下一轮建议目标

```text
weapon.default_straight_single.v1
QA-Observation Scope Freeze
```

该轮只读评估应回答：

1. 哪个真实 runtime action 会触发默认直线单发武器？
2. 哪个 QA probe 能观察到该行为，而不是只观察配置或安装状态？
3. 是否必须产生真实 projectile、trajectory、spawn record 或命中事件？
4. `qa_observed=true` 的最小、可重复、fail-closed 验收标准是什么？
5. 下一轮 RED 应覆盖哪些输入、执行步骤、观察结果和负例？

该 scope freeze 不应：

- 直接修改代码；
- 提前将 `qa_observed` 设为 true；
- 实现 spread、rapid、replacement 或 death reset；
- 修改 M2 QA evidence；
- stage、commit 或 push。

---

## 10. Campaign 根目标与真正终止条件

本计划的根目标不是“完成 M2”“完成 M3”或“出现第一个 `complete_supported`”。这些都只是中间 checkpoint。

根目标是：

```text
使冻结的 DeepSeek DSL Target Profile 能够被当前 authoritative pipeline
从 DSL 输入一直真实消费到可验证的 runtime behavior。
```

完整链路为：

```text
DeepSeek DSL
→ schema validation
→ canonical normalization
→ capability-specific compilation
→ capability-specific runtime consumption
→ QA-observed behavior
```

若当前冻结 Profile 的规模继续保持为 60 个 requirement、59 个 required capability，则 campaign 的终止门应至少满足：

```yaml
requirements_total: 60
requirements_covered_by_complete_support: 60
required_capabilities: 59
registered_required_capabilities: 59
complete_supported_count: 59
target_requirements_depending_only_on_legacy_backing: 0
workspace_clean: true
blocking_oracle_findings: 0
```

因此：

- `completeSupportedCount=1` 只是首次纵向闭环，不是 campaign 完成；
- 当前 8 个 M2/M3 capability 的 20 个剩余 evidence 只是近期工作集；
- 当前 17 个 registered capability 之外的其余 required capability 仍需后续登记、冻结语义并推进完整链路；
- 不得以 generic JSON passthrough、ID 聚合、loader ready、raw config retention 或 legacy behavior 冒充 authoritative DSL consumption。

---

## 11. Loop 的运行单位

Loop 的最小运行单位不是 milestone，而是一个原子 checkpoint：

```text
一个 capability
×
一个 evidence 层级
```

例如：

```text
weapon.default_straight_single.v1 × qa_observed
```

或：

```text
weapon.spread_shot.v1 × compiled
```

每个 checkpoint 原则上只允许抬高一个 evidence。若为了建立该 evidence 必须先实现行为基础设施，则可以产生一个“enabling checkpoint”，但该 checkpoint 不得提前修改 support evidence。

推荐的自动化边界：

```yaml
auto_advance_within_checkpoint: true
auto_advance_across_semantic_scope_gates: false
auto_push: false
```

也就是说，Codex 可以在一个已经冻结的 checkpoint 内自动完成：

```text
RED → 最小实现 → GREEN → regression → typecheck
→ diff-check → Oracle → 原子本地 commit
```

但在以下边界必须停止：

- 新 capability 的语义尚未冻结；
- QA scope 发现缺少实际 runtime behavior；
- 需要新增跨域架构；
- Oracle 出现阻塞 finding；
- 当前 evidence 无法被真实、可执行证据支持；
- 即将跨入下一个 evidence 或下一个 capability；
- 即将 push。

---

## 12. Loop 状态机

```text
AUDIT_STATE
    ↓
SELECT_NEXT_GAP
    ↓
SCOPE_FREEZE
    ├── scope ambiguous / architecture expansion required
    │       → STOP_FOR_AUTHORIZATION
    │
    └── scope approved
            ↓
           RED
            ↓
     MINIMAL_IMPLEMENTATION
            ↓
          GREEN
            ↓
       REGRESSION_GATE
            ↓
        ORACLE_REVIEW
            ├── blocking finding
            │       → STOP_WITH_FINDING
            │
            └── clear
                    ↓
              ATOMIC_COMMIT
                    ↓
              RECOMPUTE_STATE
                    ↓
              REPORT_NEXT_CURSOR
                    ↓
              STOP_FOR_AUTHORIZATION
```

Campaign 终止只发生在：

```text
PROFILE_TERMINAL_GATE == PASS
```

而不是在某个 M2/M3 milestone 标记为 completed 时终止。

---

## 13. Next-gap 调度规则

每次 commit 后必须从真实代码、registry、support tests 和 consumption report 重新计算状态，不能只依赖本文档中的旧摘要。

建议优先级：

```text
1. 先处理 Oracle/blocker，恢复可信 checkpoint。
2. 优先完成已经 4/5 的 capability，形成真实纵向闭环。
3. 对 2/5 或 3/5 capability 按 compiled → runtime_consumed → qa_observed 纵向推进。
4. 对 0/5 capability 先做真实 semantic scope freeze，再进入 schema。
5. 当前 cluster 形成稳定闭环后，再扩展尚未登记的 required capability。
6. 始终遵守 dependency graph；依赖未冻结时不得机械按计数推进。
```

当前推荐顺序是：

```text
A. weapon.default_straight_single.v1 → qa_observed
B. movement.crouch.v1 → qa_observed
C. combat.airborne_fire.v1 → qa_observed
D. health.damage_invulnerability.v1 → qa_observed
E. weapon.spread_shot.v1 → compiled → runtime_consumed → qa_observed
F. weapon.rapid_fire.v1 → compiled → runtime_consumed → qa_observed
G. weapon.replacement_rule.v1 → 全链路
H. weapon.death_reset.v1 → 全链路
I. 重新审计其余 registered capability 与尚未登记的 required capability
```

该顺序不是绝对规则。若 QA scope freeze 发现某 capability 缺少真实 behavior，应插入明确的 enabling checkpoint，并保持 `qa_observed=false`。

---

## 14. 当前 Loop Cursor

截至 checkpoint：

```yaml
head: 6cfc53ed
workspace: clean
ahead_of_origin_main: 17
pushed: false
```

当前 cursor：

```yaml
campaign: deepseek_dsl_consumption
capability: weapon.default_straight_single.v1
target_evidence: qa_observed
phase: scope_freeze
current_evidence:
  schema_expressible: true
  normalized: true
  compiled: true
  runtime_consumed: true
  qa_observed: false
  complete_supported: false
```

本轮 scope freeze 的关键不是检查 config 是否安装，而是确认是否存在一个可触发、可重复、可观察的默认直线单发武器行为。

若当前 runtime 只有 typed module-local state，而没有实际 fire action execution、projectile spawn/trajectory 或等价行为观察面，则不得直接把 `qa_observed` 设为 true。应输出 blocker/enabling memo，并把下一 cursor 改成建立最小可观察行为边界；support evidence 保持不变。

---

## 15. 可直接交给 Codex 的 Campaign Loop Controller

```text
你现在运行的是 DEEPSEEK-DSL-CONSUMPTION-CAMPAIGN loop。

根目标：
使冻结的 DeepSeek DSL Target Profile 通过以下完整 authoritative chain：
DSL schema → canonical normalization → capability-specific compiler
→ capability-specific runtime consumption → QA-observed behavior。

不要把 M2/M3 completed、某个 commit 完成、或 completeSupportedCount=1
当作 campaign 终点。

若冻结 Profile 仍为 60 requirements / 59 required capabilities，
最终终止门是：
- 60/60 requirement 被 complete-supported capability 覆盖；
- 59/59 required capability 已登记；
- completeSupportedCount=59；
- target profile 不依赖仅 conditional legacy-backed 的能力；
- 全部 authoritative support/consumption/QA gates 通过；
- 工作区干净；
- 无阻塞 Oracle finding。

当前基线：
- HEAD: 6cfc53ed
- workspace clean
- origin/main..HEAD: 17
- 未 push

当前 cursor：
weapon.default_straight_single.v1 × qa_observed × scope_freeze

Loop 规则：
1. 每次开始时从 registry、support tests、consumption report 和真实实现
   重新审计状态，不盲信旧 memo。
2. 每个实现 checkpoint 原则上只抬高一个 capability 的一个 evidence。
3. evidence 必须严格按：
   schema_expressible → normalized → compiled → runtime_consumed
   → qa_observed 推进，不得跳层。
4. generic JSON passthrough、ID 聚合、report 映射、loader ready、
   raw config retention、installed=true 均不得冒充后续 evidence。
5. 若 QA 所需真实行为尚不存在，先定义 enabling checkpoint，
   但不得提前把 qa_observed 改为 true。
6. 自动推进只限已冻结的单一 checkpoint 内：
   RED → 最小实现 → GREEN → regression → typecheck
   → git diff --check → Oracle → 原子本地 commit。
7. 遇到语义未冻结、跨域架构扩张、Oracle 阻塞、evidence 不真实、
   或即将跨入下一个 checkpoint 时，停止并等待显式授权。
8. 永不自动 push。

现在只执行只读 QA-Observation Scope Freeze，回答：
- 哪个真实 runtime action 会触发默认直线单发武器？
- 从 compiler artifact 到 runtime module，再到行为执行的调用链是什么？
- 当前是否真的存在 fire action executor 或等价行为边界？
- QA 要观察什么：projectile spawn、straight trajectory、single count、
  player ownership、primary slot/fire binding 中的哪些组合？
- 什么才是可重复、fail-closed 的 qa_observed=true 验收标准？
- 正例和负例 RED 应覆盖哪些输入、动作与观察结果？
- 若行为基础设施尚不存在，给出最小 enabling checkpoint，
  并明确本轮不得修改任何 support evidence。

本轮：
- 只读；
- 不编辑；
- 不 stage；
- 不 commit；
- 不 push；
- 不修改 M2 qa_observed；
- 不推进 spread、rapid、replacement、death-reset。

输出 QA-Observation Scope Memo 后停止。
```

---

## 16. 每轮结束报告格式

```yaml
campaign_goal: deepseek_dsl_consumption
checkpoint_result: scope_frozen | committed | blocked | oracle_failed
head_before: <sha>
head_after: <sha-or-same>
workspace_clean: true | false
pushed: false

capability: <capability-id>
target_evidence: <evidence>
evidence_before: false
evidence_after: true | false
complete_supported_after: true | false

validation:
  red_confirmed: true | false | not_applicable
  targeted: pass | fail | not_run
  regression: pass | fail | not_run
  typecheck: pass | fail | not_run
  diff_check: pass | fail | not_run
  oracle: clear | blocked | not_run

scope_boundary:
  implemented: <exact boundary>
  explicitly_not_implemented:
    - <non-goal>

next_cursor:
  capability: <capability-id>
  target_evidence: <evidence-or-enabling-task>
  phase: scope_freeze | implementation

stop_reason: <why the loop stopped here>
```
