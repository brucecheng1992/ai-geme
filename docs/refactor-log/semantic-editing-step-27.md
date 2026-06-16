# Step 27: Semantic Editing

完成时间：2026-06-16

## 目标

建立 Semantic Editing 的第一层稳定地址底座，让后续 intent、patch、guard、trace 和 Workbench 都使用语义对象定位 SSOT，而不是使用生成后的 Phaser 文件路径、代码行号或派生产物路径。

当前已完成 Step 27.1、Step 27.2、Step 27.3、Step 27.4、Step 27.5、Step 27.6 与 Step 27.7：稳定语义地址、Raw DSL 语义索引、`SemanticEditIntent` 类型与 schema、`SemanticPatch` 类型与 schema、Patch Planner 最小骨架、Patch Validator / Guards 最小骨架、Patch Applier / Rollback 最小骨架，以及 `fix_blank_preview` repair pack。不实现真实 SSOT persistence、Workbench 面板、QA false-playable 自动闭环、trace event、runtime / pipeline gate 或重新生成闭环。

## 已完成内容

- 新增 `packages/game-dsl/src/semantic-editing/semantic-address.ts`：
  - `SemanticIdKind`
  - `SemanticId`
  - `parseSemanticId`
  - `isSemanticId`
  - `makeSemanticId`
- `SemanticId` 当前支持：
  - `project:<name>`
  - `scene:<name>`
  - `entity:<name>`
  - `asset:<name>`
  - `system:<name>`
  - `rule:<name>`
  - `camera:<name>`
  - `input:<name>`
  - `physics:<name>`
- `SemanticId` grammar 使用稳定 DSL id 风格：`kind:name`，其中 `name` 必须匹配小写字母开头、后续小写字母 / 数字 / 下划线。
- 明确拒绝：
  - 空 id
  - 未知 kind
  - `src/scenes/MainScene.ts:83`
  - `/generated/MainScene.ts`
  - 其他文件路径或代码路径形态
- 新增 `packages/game-dsl/src/semantic-editing/semantic-index.ts`：
  - `SemanticNodeRef`
  - `SemanticIndex`
  - `buildSemanticIndex(ssot: unknown)`
- `buildSemanticIndex` 对当前 Raw DSL SSOT 建立语义索引：
  - `project:default` -> `/`
  - `scene:main` -> `/`
  - `entity:<player.id>` -> `/player`
  - `entity:<entities[].id>` -> `/entities/<index>`
  - `rule:<rules.collisions[].id>` -> `/rules/collisions/<index>`
  - `camera:main` -> `/camera` 或 `/game/camera`
  - `input:keyboard` -> `/player/actions`
  - `system:movement` -> `/player/movement`
  - `system:collision` -> `/rules/collisions`
  - `physics:arcade` -> `/world`
  - side-scrolling optional SSOT nodes such as `pickups` and `level.segments`
- `buildSemanticIndex` 对 `unknown` 输入做边界收敛：
  - malformed optional collections 不会抛错
  - 缺少 id 的 entity / rule 不会产生 `entity:undefined` 或 `rule:undefined`
  - 只对合法 semantic id 建立 ref
- 新增 `packages/game-dsl/src/semantic-editing/index.ts` 并从 `packages/game-dsl/src/index.ts` 导出 Semantic Editing 地址和索引 API。
- 新增 `tests/contracts/semantic-editing-index.test.ts` 覆盖：
  - 合法 semantic id 解析
  - 文件路径 / generated path / unknown kind 拒绝
  - Raw DSL 基础对象索引
  - side-scrolling optional SSOT nodes 索引
  - malformed unknown input 不崩溃、不产生伪造 semantic id
- 新增 `packages/game-dsl/src/semantic-editing/types.ts`：
  - `SemanticEditIntentKind`
  - `SemanticEditReasonSource`
  - `SemanticEditReason`
  - `SemanticEditConstraints`
  - `SemanticEditIntent`
- 新增 `packages/game-dsl/src/semantic-editing/intent-schema.ts`：
  - `SemanticEditIntentSchema`
  - `target` 复用 `isSemanticId`
  - `kind` 与 `reason.source` 使用白名单
  - `reason.message` 必须非空
  - `payload` 保持 `Record<string, unknown>` 扩展能力
  - intent 外层使用 strict object，拒绝额外字段
- 新增 `tests/contracts/semantic-editing-intent.test.ts` 覆盖：
  - 合法 `fix_blank_preview` intent
  - missing reason 拒绝
  - non-semantic target 拒绝
  - unknown kind 拒绝
  - extra outer field 拒绝
  - payload extensibility
  - empty reason message / unknown reason source 拒绝
- `packages/game-dsl/src/semantic-editing/types.ts` 追加：
  - `SemanticPatchStatus`
  - `SemanticPatchOperation`
  - `SemanticPatchValidation`
  - `SemanticPatch`
- 新增 `packages/game-dsl/src/semantic-editing/patch-schema.ts`：
  - `SemanticPatchSchema`
  - `target` 复用 `isSemanticId`
  - `operations` 支持 `set` / `add` / `remove` / `replace`
  - `set` / `add` / `replace` 必须提供 defined `value`
  - `remove` 不允许 `value`
  - operation path 必须是 `/` 开头 SSOT path
  - operation path 拒绝 `/generated`、`/dist`、`/phaser`、`/src` 和 `.ts` / `.tsx` / `.js` / `.jsx`
  - patch lifecycle status 支持 `proposed`、`validated`、`applied`、`rejected`、`rolled_back`
  - patch 记录 `beforeHash`、optional `afterHash`、`createdAt` 和 optional validation
- 新增 `tests/contracts/semantic-editing-patch.test.ts` 覆盖：
  - 合法 proposed patch
  - generated output / source code path 拒绝
  - non-semantic target 拒绝
  - non-SSOT path 拒绝
  - `remove` 携带 `value` 拒绝
  - `replace` 缺少 `value` 拒绝
  - `set` / `add` / `replace` 显式 `value: undefined` 拒绝
  - validation payload 可序列化
- 新增 `packages/game-dsl/src/semantic-editing/patch-planner.ts`：
  - `SemanticPatchPlannerErrorCode`
  - `SemanticPatchPlannerError`
  - `SemanticPatchPlanResult`
  - `SemanticPatchPlanRequest`
  - `SemanticPatchPlannerHandlerInput`
  - `SemanticPatchPlannerHandler`
  - `SemanticPatchPlannerHandlers`
  - `SemanticPatchPlanner`
  - `createSemanticPatchPlanner`
- `createSemanticPatchPlanner` 当前只负责 `intent -> proposed patch`：
  - 先执行 `SemanticEditIntentSchema.safeParse`
  - 再通过 `SemanticIndex.resolve(intent.target)` 定位语义目标
  - 按 `intent.kind` dispatch handler
  - handler 只返回 `SemanticPatchOperation[]`
  - planner 统一封装 `id`、`intentId`、`target`、`beforeHash`、`status: "proposed"` 和 `createdAt`
  - planner 输出再经 `SemanticPatchSchema.safeParse`
- planner 支持 deterministic 注入：
  - `now?: () => Date`
  - `createPatchId?: (intent) => string`
- planner 边界收敛：
  - handler throw 转 `SEMANTIC_PATCH_HANDLER_EXCEPTION`
  - handler 非数组返回转 `INVALID_SEMANTIC_PATCH`
  - handler 空 operations 转 `EMPTY_SEMANTIC_PATCH_OPERATIONS`
  - 传给 handler 的 semantic target 使用 cloned + deep frozen entry，避免 handler 误改 `SemanticIndex` / SSOT
  - planner 不写 `afterHash`
  - planner 不改变 patch status 到 validated / applied / rejected / rolled_back
- 新增 `tests/contracts/semantic-editing-planner.test.ts` 覆盖：
  - invalid intent schema
  - missing semantic target
  - unsupported kind
  - empty operations
  - handler throw
  - deterministic proposed patch
  - 不 mutation intent
  - 不 mutation semanticIndex
  - handler 能拿到 resolved semantic target
  - planner 输出必须通过 `SemanticPatchSchema`
  - handler 非数组返回不向外 throw
  - handler 不能通过 target entry 误改 semanticIndex
- `packages/game-dsl/src/semantic-editing/types.ts` 追加：
  - `SemanticPatchValidationSeverity`
  - `SemanticPatchValidationIssueCode`
  - `SemanticPatchValidationIssue`
  - `SemanticPatchValidationResult`
- 新增 `packages/game-dsl/src/semantic-editing/patch-validator.ts`：
  - `SemanticPatchValidationRequest`
  - `SemanticPatchGuardInput`
  - `SemanticPatchGuard`
  - `SemanticPatchValidatorOptions`
  - `SemanticPatchValidator`
  - `createSemanticPatchValidator`
- `createSemanticPatchValidator` 当前只负责 `proposed patch -> validation result`：
  - 先执行 `SemanticEditIntentSchema.safeParse`
  - 再执行 `SemanticPatchSchema.safeParse`
  - schema 通过后执行 default guards + custom guards
  - `includeDefaultGuards` 默认为 `true`
  - `includeDefaultGuards: false` 只跳过 default guards，不跳过 intent / patch schema validation
  - warnings 不阻塞 validation，`ok === errors.length === 0`
  - guard throw 转为 `GUARD_EXCEPTION` issue，并继续收集后续 guard issue
- validator 边界收敛：
  - 不 apply patch
  - 不 rollback
  - 不 mutation patch / intent / `SemanticIndex` / SSOT
  - 不写 `afterHash`
  - 不改变 patch status 到 `validated` / `applied` / `rejected` / `rolled_back`
  - 不写回 patch validation result
  - 不调用 planner
  - 不接 trace、Workbench、QA、runtime 或 pipeline
- guard 输入使用 cloned + deep frozen intent / patch，以及 frozen `SemanticIndex` facade；facade 的 `resolve` / `list` 返回 cloned + deep frozen entry，避免 custom guard 误改 SSOT。
- non-cloneable intent payload / patch operation value 会在 guard 前收敛为对应 schema error result，不向外 throw。
- 新增 `packages/game-dsl/src/semantic-editing/guards.ts`：
  - `semantic-target-exists`
  - `semantic-traceability`
  - `semantic-patch-lifecycle`
  - `semantic-operation-path`
  - `no-generated-code-edit`
  - `defaultSemanticPatchGuards`
- 默认 guards 当前覆盖：
  - `patch.target` 必须存在于 `SemanticIndex`
  - `patch.intentId === intent.id`
  - `patch.target === intent.target`
  - `intent.reason.message.trim()` 必须非空
  - `patch.status === "proposed"`
  - `patch.afterHash === undefined`
  - `patch.operations.length > 0`
  - operation path 不能包含危险路径片段，例如 `\\`、NUL、`//`、`/../`、`/./`
  - operation path 不能伪装成 generated / source code path，例如 `src`、`dist`、`build`、`apps`、`packages`、`generated`、`phaser` segment 或 `.ts` / `.tsx` / `.js` / `.jsx` / `.mjs` / `.cjs`
- `no-generated-code-edit` 只检查 `operation.path`，不检查 `operation.value`；`operation.value` 中的 asset file path 不会被误拒。
- 空字符串 `reason.message` 由 `SemanticEditIntentSchema` 提前拒绝；仅空白字符串由 `semantic-traceability` guard 返回 `MISSING_TRACEABILITY_REASON`。
- 新增 `tests/contracts/semantic-editing-validator.test.ts` 覆盖：
  - valid proposed patch validation
  - validator 不 mutation patch / intent / semanticIndex
  - custom guard 不能通过 `SemanticIndex` entry 修改 SSOT
  - invalid intent schema
  - non-cloneable intent payload
  - invalid patch schema
  - non-cloneable patch operation value
  - target missing
  - intentId mismatch
  - target mismatch
  - reason message schema / guard 分层
  - non-proposed status
  - before-apply `afterHash`
  - invalid operation path
  - generated code path
  - asset path in operation value
  - custom warning / error guard
  - guard throw
  - guard execution order
  - default guard list immutable / ordered

## Step 27.5 Patch Validator / Guards

完成时间：2026-06-16

已完成内容：

- 新增 `SemanticPatchValidator` 最小骨架。
- 已支持 intent schema validation。
- 已支持 patch schema validation。
- 已支持 `SemanticTargetExistsGuard`。
- 已支持 `SemanticTraceabilityGuard`。
- 已支持 `SemanticPatchLifecycleGuard`。
- 已支持 `SemanticOperationPathGuard`。
- 已支持 `NoGeneratedCodeEditGuard`。
- 已支持 custom guards。
- 已支持 warning 不阻塞 validation。
- 已支持 guard exception 转 validation issue。
- 已支持 validator contract tests。

阶段边界：

- Validator only validates proposed semantic patches.
- It does not mutate patch, intent, SSOT, IR, runtime, generated Phaser code, or pipeline state.
- Planner only creates proposed patches and does not call validator automatically.
- 本轮未实现 patch applier、rollback、`fix_blank_preview` repair pack、trace events、Workbench patch diff、QA FALSE_PLAYABLE 闭环或 runtime / pipeline gate。

## 修改范围

- `packages/game-dsl/src/semantic-editing/semantic-address.ts`
- `packages/game-dsl/src/semantic-editing/semantic-index.ts`
- `packages/game-dsl/src/semantic-editing/types.ts`
- `packages/game-dsl/src/semantic-editing/intent-schema.ts`
- `packages/game-dsl/src/semantic-editing/patch-schema.ts`
- `packages/game-dsl/src/semantic-editing/patch-planner.ts`
- `packages/game-dsl/src/semantic-editing/patch-validator.ts`
- `packages/game-dsl/src/semantic-editing/guards.ts`
- `packages/game-dsl/src/semantic-editing/index.ts`
- `packages/game-dsl/src/index.ts`
- `tests/contracts/semantic-editing-index.test.ts`
- `tests/contracts/semantic-editing-intent.test.ts`
- `tests/contracts/semantic-editing-patch.test.ts`
- `tests/contracts/semantic-editing-planner.test.ts`
- `tests/contracts/semantic-editing-validator.test.ts`

## 阶段结果

- 当前仓库没有 `packages/core`，因此本阶段按现有 package 边界落在 `packages/game-dsl/src/semantic-editing`。
- 本阶段没有修改 `RawGameDslSchema`，没有改变 normalizer、IR、asset resolver、Phaser runtime、QA、Workbench 或 pipeline 行为。
- `patch-planner.ts` 当前 187 行，仍保持单一 planner 职责，未混入 validator / apply / rollback；暂不拆分 handler 目录。
- `patch-validator.ts` 当前 167 行，保持 schema validation、guard orchestration 和 guard input isolation 职责。
- `guards.ts` 当前 182 行，集中保存 5 个默认 guard；职责仍清晰，暂不拆分为 guard 子目录。
- validator 仅验证 proposed semantic patches，不 mutation patch、intent、SSOT、IR、runtime、generated Phaser code 或 pipeline state。
- 新增文件行数：
  - `semantic-address.ts`: 52
  - `semantic-index.ts`: 116
  - `semantic-editing/types.ts`: 119
  - `semantic-editing/intent-schema.ts`: 30
  - `semantic-editing/patch-schema.ts`: 72
  - `semantic-editing/patch-planner.ts`: 187
  - `semantic-editing/patch-validator.ts`: 167
  - `semantic-editing/guards.ts`: 182
  - `semantic-editing/index.ts`: 50
  - `semantic-editing-index.test.ts`: 74
  - `semantic-editing-intent.test.ts`: 74
  - `semantic-editing-patch.test.ts`: 76
  - `semantic-editing-planner.test.ts`: 209
  - `semantic-editing-validator.test.ts`: 305

## 已通过验证

```bash
npx vitest run tests/contracts/semantic-editing-index.test.ts
npx vitest run tests/contracts/semantic-editing-index.test.ts tests/contracts/semantic-editing-intent.test.ts
npx vitest run tests/contracts/semantic-editing-index.test.ts tests/contracts/semantic-editing-intent.test.ts tests/contracts/semantic-editing-patch.test.ts
npx vitest run tests/contracts/semantic-editing-index.test.ts tests/contracts/semantic-editing-intent.test.ts tests/contracts/semantic-editing-patch.test.ts tests/contracts/semantic-editing-planner.test.ts
npx vitest run tests/contracts/semantic-editing-index.test.ts tests/contracts/semantic-editing-intent.test.ts tests/contracts/semantic-editing-patch.test.ts tests/contracts/semantic-editing-planner.test.ts tests/contracts/semantic-editing-validator.test.ts
npm run typecheck:root
git diff --check -- .
```

结果：

- `tests/contracts/semantic-editing-index.test.ts`: 4 tests passed
- semantic-editing contract tests: 2 test files passed, 7 tests passed
- semantic-editing contract tests: 3 test files passed, 10 tests passed
- semantic-editing contract tests: 4 test files passed, 22 tests passed
- semantic-editing contract tests: 5 test files passed, 43 tests passed
- root TypeScript typecheck passed
- full diff check passed

## Oracle 审查门禁

审查模式：Oracle 只读审查。

调度记录：

- 首次 Oracle 等待被用户中断后，原会话句柄不可用；已重新派发 Oracle 审查。
- 代码审查第一轮发现 P1。
- 修复 P1 后复用同一 Oracle 做复审。

第一轮结论：

- P0: 无
- P1: `buildSemanticIndex(ssot: unknown)` 边界校验不够稳定，malformed unknown input 可能抛错或生成伪造 semantic id
- P2: 无
- P3: 无强制文档问题

修正：

- 新增 `addNamedRef`，只有 string name 且 `${kind}:${name}` 通过 `isSemanticId` 时才建立 ref。
- `isRawGameDslLike` 增加 required / optional collections 的 array + record 形状检查。
- 增加 malformed unknown input contract test。

第二轮复审结论：

- P0: 无
- P1: 无，上一轮 P1 已关闭
- P2: 无
- P3: 无

### Step 27.2 Intent Schema

审查模式：Oracle 复用，只读审查。

代码审查结论：

- P0: 无
- P1: 无
- P2: 无
- P3: 无

Oracle 结论：

- Step 27.2 保持 intent-only 边界。
- `target` 复用 `isSemanticId`。
- `kind` 和 `reason.source` 使用白名单。
- `reason.message` 拒绝空字符串。
- 外层 `z.strictObject` 拒绝 `generatedPath` 这类额外字段。
- `payload` 保持可扩展。

### Step 27.3 Patch Schema

审查模式：Oracle 复用，只读审查，两轮。

第一轮结论：

- P0: 无
- P1: `set` / `add` / `replace` 的 `value` 使用 `z.unknown()` 时会接受显式 `undefined`，JSON 序列化后等价于缺少 value
- P2: 无
- P3: 可选补测更深层 generated / code path

修正：

- 新增 `DefinedPatchValueSchema`，拒绝显式 `undefined`。
- `set` / `add` / `replace` 的 `value` 改用 `DefinedPatchValueSchema`。
- 增加 `set` / `add` / `replace` 显式 `value: undefined` 拒绝测试。

第二轮复审结论：

- P0: 无
- P1: 无，上一轮 P1 已关闭
- P2: 无
- P3: 无

### Step 27.4 Patch Planner Skeleton

审查模式：Oracle 新建，只读审查，两轮。

第一轮结论：

- P0: 无
- P1: 无
- P2:
  - handler 返回非数组时可能在 `.length` 处 throw
  - handler 收到 live `SemanticIndex` entry，可能通过 `target.value` 误改 SSOT
- P3:
  - semanticIndex mutation 测试保存的是同一 entry 引用，断言较弱
  - `createPatchId` / `now` callback 异常未统一转 result
  - 默认 `createdAt` 使用 wall clock；测试已通过注入 `now` 保持稳定

修正：

- handler 返回值先按 `unknown` 接收，并用 `Array.isArray` 检查；非数组返回 `INVALID_SEMANTIC_PATCH`。
- handler 入参 target 改为 cloned + deep frozen entry。
- semanticIndex mutation 测试改用 `structuredClone` 保存 before。
- 增加 handler 非数组返回测试。
- 增加 handler 试图修改 `target.value` 时不污染 semanticIndex 的测试。

第二轮复审结论：

- P0: 无
- P1: 无
- P2: 无，上一轮 P2 已关闭
- P3: 无

### Step 27.5 Patch Validator / Guards

审查模式：Oracle 复用，只读审查，三轮。

第一轮结论：

- P0:
  - validator 把 live `SemanticIndex` 直接传给 custom guards；`SemanticIndex.resolve(...).value` 是 SSOT 原对象引用，custom guard 可误改 SSOT。
- P1:
  - `includeDefaultGuards: false` 可跳过 default guards。复核后确认这是本轮 prompt 明确要求的 public option；它仍执行 intent / patch schema validation，不作为实现问题处理。
- P2:
  - `defaultSemanticPatchGuards` 是 mutable array，外部可改默认 guard 顺序。
  - operation path issue 缺少 `intentId` / `target` 上下文。
- P3:
  - 建议补 custom guard 试图 mutation `SemanticIndex` 的回归测试。

修正：

- validator 给 guards 传 cloned + deep frozen intent / patch。
- validator 给 guards 传 frozen `SemanticIndex` facade，`resolve` / `list` 返回 cloned + deep frozen entry。
- `defaultSemanticPatchGuards` 改为 readonly + `Object.freeze`，默认 guard objects 也冻结。
- operation path / generated-code issue 补充 `intentId` / `target`。
- 新增 custom guard 试图修改 `SemanticIndex` entry value 的回归测试。
- 新增 default guard list immutable / ordered 测试。

第二轮结论：

- P0: 无，上一轮 P0 已关闭
- P1:
  - schema 通过后 `cloneForGuard` 直接 `structuredClone`，`intent.payload` 或 `operation.value` 若包含 non-cloneable unknown，会让 `validate()` 向外 throw。
- P2: 无阻塞问题
- P3: 无

修正：

- intent clone failure 转为 `INVALID_SEMANTIC_EDIT_INTENT_SCHEMA` validation result。
- patch clone failure 转为 `INVALID_SEMANTIC_PATCH_SCHEMA` validation result。
- clone failure 在 guard 前返回，不执行 default guards 或 custom guards。
- 新增 non-cloneable intent payload 测试。
- 新增 non-cloneable patch operation value 测试。

第三轮复审结论：

- P0: 无
- P1: 无，上一轮 P1 已关闭
- P2: 无
- P3: 无
- Oracle 结论：P0/P1/P2/P3 均无新问题，两轮 blocking findings 均已关闭。

### Step 27.6 Patch Applier / Rollback

完成时间：2026-06-16

已完成内容：

- 新增 `SemanticPatchApplier` 最小骨架。
- 已支持 proposed patch validation before apply。
- 已支持 `beforeHash` stale check。
- 已支持 in-memory cloned document apply。
- 已支持 deterministic `hashSemanticPatchDocument`，object key 使用 code-unit order 稳定排序。
- 已支持 `set` / `add` / `replace` / `remove` object path operations。
- 已支持 object path JSON Pointer escaping：`~1` -> `/`，`~0` -> `~`。
- 已支持 `appliedPatch` 输出。
- 已支持 `afterHash` 计算。
- 已支持 rollbackPatch 生成。
- 已支持 rollback 恢复 document。
- 已支持 rollback patch 与 original applied patch 的 `intentId` / `target` 绑定校验。
- 已支持 rollback 后 hash 必须恢复到 original `beforeHash` 的 postcondition。
- 已支持 deterministic rollback id/time injection。
- 已支持 applier contract tests。

阶段边界：

- Applier applies semantic patches only to an in-memory JSON-compatible document clone.
- It does not persist SSOT, regenerate IR/Phaser, emit trace events, update Workbench, or run QA.
- Rollback is implemented as applying a generated rollback patch.
- Original applied patch is returned as rolled_back lifecycle view; no patch registry is mutated.
- 本轮仅覆盖 object SSOT paths；array path support 未实现。

修改范围：

- `packages/game-dsl/src/semantic-editing/document-hash.ts`
- `packages/game-dsl/src/semantic-editing/patch-document.ts`
- `packages/game-dsl/src/semantic-editing/patch-applier-types.ts`
- `packages/game-dsl/src/semantic-editing/patch-applier-lifecycle.ts`
- `packages/game-dsl/src/semantic-editing/patch-applier.ts`
- `packages/game-dsl/src/semantic-editing/index.ts`
- `packages/game-dsl/src/index.ts`
- `tests/contracts/semantic-editing-applier.test.ts`
- `docs/refactor-log/semantic-editing-step-27.md`

阶段结果：

- `SemanticPatchApplier` 保持纯内存实现，不写文件、不持久化 SSOT、不 mutation 输入 document / patch / intent / `SemanticIndex`。
- `patch-applier.ts` 当前 266 行，保留 apply / rollback orchestration 与统一错误收敛；schema lifecycle 和 document operations 已拆到相邻职责文件。
- `patch-document.ts` 当前 218 行，集中 object path apply 与 inverse operation 生成；未加入 array path support。
- `semantic-editing-applier.test.ts` 当前 539 行，覆盖 apply / rollback 主路径、failure atomicity、mutation guard、hash determinism、rollback mismatch 和 deterministic injection。

已通过验证：

```bash
npx vitest run tests/contracts/semantic-editing-applier.test.ts
npx vitest run tests/contracts/semantic-editing-index.test.ts tests/contracts/semantic-editing-intent.test.ts tests/contracts/semantic-editing-patch.test.ts tests/contracts/semantic-editing-planner.test.ts tests/contracts/semantic-editing-validator.test.ts tests/contracts/semantic-editing-applier.test.ts
npm run typecheck:root
git diff --check -- .
```

结果：

- `tests/contracts/semantic-editing-applier.test.ts`: 19 tests passed
- semantic-editing contract tests: 6 test files passed, 62 tests passed
- root TypeScript typecheck passed
- final diff check passed after document update

审查模式：Oracle 复用，只读审查，三轮。

第一轮结论：

- P0: 无
- P1:
  - `document-hash.ts` 使用 `localeCompare` 排序 object keys，不适合作为跨环境 deterministic hash。
  - rollback patch 没有校验 `intentId` / `target` 与 original applied patch 绑定。
- P2: 无
- P3:
  - 缺少 multi-op success rollback inverse order contract test。

修正：

- object key 排序改为 code-unit comparator。
- rollback 前校验 rollback patch 与 applied patch 的 `intentId` / `target` 一致。
- 增加 hash code-unit order、rollback patch binding、multi-op success inverse order 回归测试。

第二轮结论：

- P0: 无
- P1:
  - rollback 成功后未校验 restored document hash 等于 original `beforeHash`，同 intent/target 但非 inverse operations 的 rollback patch 可能被误标为成功。
- P2: 无
- P3: 无，上一轮 P3 已关闭。

修正：

- rollback apply 成功后增加 `appliedRollback.afterHash === appliedPatch.beforeHash` postcondition。
- 增加非 inverse rollback patch 失败测试。

第三轮复审结论：

- P0: 无
- P1: 无，上一轮 P1 已关闭。
- P2: 无
- P3: 无
- Oracle 结论：P0/P1/P2/P3 均无新问题，blocking findings closed。

### Step 27.7 `fix_blank_preview` Repair Pack

完成时间：2026-06-16

已完成内容：

- 新增 `packages/game-dsl/src/semantic-editing/repair-packs/fix-blank-preview.ts`。
- 新增 `packages/game-dsl/src/semantic-editing/repair-packs/fix-blank-preview-config.ts`。
- 新增 `packages/game-dsl/src/semantic-editing/repair-packs/fix-blank-preview-operations.ts`。
- 新增 `packages/game-dsl/src/semantic-editing/repair-packs/index.ts`。
- 新增并导出：
  - `FIX_BLANK_PREVIEW_REPAIR_KIND`
  - `FixBlankPreviewRepairPayload`
  - `FixBlankPreviewRepairHandlerOptions`
  - `createFixBlankPreviewRepairHandler`
  - `createFixBlankPreviewRepairHandlers`
- `fix_blank_preview` repair handler 只接入 `SemanticPatchPlanner` handler contract，输出 deterministic `SemanticPatchOperation[]`。
- repair operations 只面向 SSOT object paths：
  - `/scenes/{sceneKey}/background`
  - `/scenes/{sceneKey}/camera`
  - `/scenes/{sceneKey}/spawn/player`
  - `/scenes/{sceneKey}/entities/{markerKey}`
  - `/assets/fallbacks/{fallbackAssetKey}`
- repair payload 支持按 section 关闭：
  - `ensureBackgroundVisible`
  - `ensureCameraSeesSpawn`
  - `ensureRenderableEntity`
  - `ensureAssetBindings`
- all sections disabled 时 handler 返回空 operations，由 planner 统一收敛为 `EMPTY_SEMANTIC_PATCH_OPERATIONS`。
- `scenePath` 必须是严格 `/scenes/{sceneKey}` 形态；真实 `SemanticIndex` 的 `scene:main -> /` 这类 Raw DSL 根路径不会被自动改写到 detached `/scenes/main`。
- known payload fields schema invalid 时不吞错，统一转 planner `SEMANTIC_PATCH_HANDLER_EXCEPTION`。
- marker key 不允许与 primary entity 名称碰撞；已有 entity key 若不是同一个 repair marker id，也会拒绝覆盖。
- 新增 `tests/contracts/semantic-editing-fix-blank-preview.test.ts` 覆盖 planner -> validator -> applier -> rollback 的纯内存闭环。
- explicit `scenePath` 契约只接受 canonical `/scenes/{sceneKey}`，拒绝 missing leading slash、double slash、trailing slash 和 nested scene child path。

阶段边界：

- Repair pack only proposes semantic patch operations.
- It does not validate, apply, persist, rollback, regenerate IR/Phaser, run QA, emit trace events, update Workbench, or touch runtime / pipeline state.
- Contract tests 使用 in-memory document 验证 planner / validator / applier / rollback composition；真实 SSOT persistence 仍未接入。
- 本轮不修改 generated Phaser code，不修改 generated project，不修复真实 preview runtime。

修改范围：

- `packages/game-dsl/src/semantic-editing/repair-packs/fix-blank-preview.ts`
- `packages/game-dsl/src/semantic-editing/repair-packs/fix-blank-preview-config.ts`
- `packages/game-dsl/src/semantic-editing/repair-packs/fix-blank-preview-operations.ts`
- `packages/game-dsl/src/semantic-editing/repair-packs/index.ts`
- `packages/game-dsl/src/semantic-editing/index.ts`
- `packages/game-dsl/src/index.ts`
- `tests/contracts/semantic-editing-fix-blank-preview.test.ts`
- `docs/refactor-log/semantic-editing-step-27.md`

阶段结果：

- `fix-blank-preview.ts` 当前 117 行，保持 planner handler orchestration 职责。
- `fix-blank-preview-config.ts` 当前 200 行，集中 payload schema、defaults、merge 与 config validation。
- `fix-blank-preview-operations.ts` 当前 232 行，集中 document operation planner、repair value builders 与 path/entity collision guards；略高于 220 行阈值但职责仍集中，暂不机械拆分。
- `semantic-editing-fix-blank-preview.test.ts` 当前 583 行，覆盖主路径、payload overrides、section disable、real semantic index path guard、invalid payload、marker collision、canonical strict scenePath、mutation guard 和 repeated apply。

已通过验证：

```bash
npx vitest run tests/contracts/semantic-editing-fix-blank-preview.test.ts
npx vitest run tests/contracts/semantic-editing-index.test.ts tests/contracts/semantic-editing-intent.test.ts tests/contracts/semantic-editing-patch.test.ts tests/contracts/semantic-editing-planner.test.ts tests/contracts/semantic-editing-validator.test.ts tests/contracts/semantic-editing-applier.test.ts tests/contracts/semantic-editing-fix-blank-preview.test.ts
npm run typecheck:root
git diff --check -- .
```

结果：

- `tests/contracts/semantic-editing-fix-blank-preview.test.ts`: 21 tests passed
- semantic-editing contract tests: 7 test files passed, 83 tests passed
- root TypeScript typecheck passed
- diff check passed

审查模式：Oracle 复用，只读审查。

代码审查结论：

- 第一轮复审 P0/P1 无，P2 指出 `validateScenePath` 仍会接受非 canonical scenePath。
- 已修正 raw string scenePath 校验，要求 strict `/scenes/{sceneKey}`。
- 已补 `scenes/main`、`/scenes//main`、`/scenes/main/` handler exception 契约测试。
- 第二轮复审 P0/P1/P2 无，上轮 P2 已关闭。

未实现范围：

- 未实现真实 SSOT persistence。
- 未实现 patch registry。
- 未实现 trace events。
- 未实现 Workbench patch diff。
- 未实现 QA FALSE_PLAYABLE 闭环。
- 未接 runtime / pipeline gate。

## 未改范围

- 未接入 trace events。
- 未接入 Workbench UI。
- 未改变 generated project、Phaser runtime、QA 或 pipeline acceptance gate。

## 下一步建议

Step 27.8: Semantic patch trace / Workbench / QA integration（以新 prompt 为准）。

建议边界：

- 基于 Step 27.7 repair pack 已验证的 pure semantic patch proposal 边界推进。
- 继续不触碰 generated Phaser code；后续接线应消费 semantic patch / SSOT，而不是直接改 runtime。
- trace、QA、Workbench 或 runtime / pipeline gate 需要按后续 prompt 单独开边界。
- 继续使用 Oracle review gate。
