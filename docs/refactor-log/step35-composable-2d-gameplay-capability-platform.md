# Step 35 Composable 2D Gameplay Capability Platform

目标：把 2D 游戏生成从 genre/template 垂直切片推进为 Runtime Family + Gameplay Capability Package + Profile Recipe 的可组合平台。Step 35 不推翻 Step 34 自然语言修改闭环；Step 34 的 proposal、candidate preview、QA、Accept/Reject/Undo 继续作为上层生命周期，Step 35 只替换底层能力组织方式。

## Scope

- 建立 gameplay capability registry 作为能力状态唯一真源。
- 把现有 `side_scrolling_run_and_gun.v1` 逐步迁移为 capability recipe。
- 证明第二个 profile 可在不新增 genre-specific Phaser template 的情况下生成和修改。
- 保持 Step 33 render fidelity、Step 34 candidate isolation 和 promotion contract 权威。

## Non-goals

- 不让模型动态注册 runtime code。
- 不在 Step35.1 直接切换 runtime 默认路径。
- 不用 profile ID switch、fallback template 或 giant capability package 伪装复用。
- 不改写 Step34 已冻结的上层 amendment lifecycle。

## Step Breakdown

| Step | Status | Boundary |
|---|---|---|
| 35.1 Gameplay Capability Ontology and Global Registry | completed | 建立 capability ID、domain、status、evidence、registry snapshot、inventory report；只做 contract/audit，不改变 runtime 行为。 |
| 35.2 Capability Package Contract | completed | 定义 package manifest、owned paths、schema/normalizer/IR/runtime/amendment/QA/evidence 完整合同，缺层 fail closed。 |
| 35.3 Component / Behavior / ECA DSL | completed | 建立 capability-backed component、behavior、event-condition-action DSL envelope；禁止 script escape hatch。 |
| 35.4 Capability-driven Game IR | completed | DSL node 必须有 owner capability；IR compiler plan 记录 owner、input、output、unsupported reason。 |
| 35.5 Modular Phaser Runtime System Loader | completed | 建立 `phaser_2d_action_arcade.v1` kernel + runtime system manifest；kernel 不按 profile ID 分支。 |
| 35.6 Gameplay Profile Recipe Compiler | completed | Profile recipe 编译出 resolved graph、lock、schema、IR plan、runtime manifest、QA plan 和 generation context。 |
| 35.7 Dependency / Compatibility / Version Resolver | completed | deterministic resolver 生成 exact capability lock，并在 generation/amendment 前报告缺失和冲突。 |
| 35.8 Capability-owned Amendment Operations | completed | Step34 operation route 到 owner package；支持 add/remove capability candidate 和 lock diff。 |
| 35.9 Capability-owned Runtime QA Probes | completed | capability 自带 required/optional probes；没有 required QA 不能 complete supported。 |
| 35.10 Run-and-gun Reference Migration | completed | 生成 run-and-gun reference composition migration/parity artifacts；legacy/composed parity 通过后才允许后续切默认。 |
| 35.11 Second Profile Reuse Proof | completed | `side_scrolling_platformer.v1` 不新增 template、不新增 compiler 大分支，证明 capability 复用。 |
| 35.12 Final Contract / Oracle Review | completed | 汇总 registry、package、lock、runtime manifest、QA、parity、Step33/34 evidence；Oracle P0/P1 为零。 |

## 35.1 Current Slice

目标：先把能力词汇表、状态语义和现有 runtime/genre registry 的兼容关系固定下来。当前切片不把旧 `RuntimeGenreRegistry` 删除，也不把旧 supported genre 直接降级；它新增一个更严格的 gameplay capability 真源，用来阻止后续把 prompt-only、schema-only 或 legacy runtime behavior 误报为完整 Step35 support。

### Implementation Rules

- capability ID 使用 `domain.name.vN`，例如 `movement.run_jump.v1`。
- `complete_supported` 只能由完整 evidence 派生：DSL schema、normalizer、IR compiler、runtime module、amendment operations、capability-owned QA、artifact evidence、render contract。
- 现有 template/genre 能力只能标为 `runtime_backed`，直到 35.2-35.9 补齐 package contract 和 capability-owned QA。
- `RuntimeGenreRegistry` 的状态兼容报告必须从现有 registry 派生，不能维护第二份 supported genre list。
- snapshot 和 inventory report 必须 deterministic，便于进入 artifact index。

### 35.1 Expected Artifacts

- `capability_registry_snapshot.json`
- `capability_inventory_report.json`

### 35.1 Validation

- duplicate capability ID rejected。
- invalid ID/version rejected。
- `complete_supported` 缺 QA 或任一 required evidence rejected。
- snapshot deterministic。
- profile runtime status report 从 `RuntimeGenreRegistry` 派生，避免 divergence。

### 35.1 Oracle Notes

Oracle 重点检查：

- 是否把 legacy runtime supported 误报为 `complete_supported`。
- 是否出现独立 supported genre list。
- 是否让缺 QA 的 package 进入 supported。
- 是否改变 Step34 candidate/amendment lifecycle。

### 35.1 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/registry.ts` 和 `index.ts`。
- `GameplayCapabilityRegistry` 记录 capability ID、version、domain、status、runtime family、profile membership、legacy runtime alias、evidence、QA 和 blockers。
- 默认 registry 不包含任何 `complete_supported` capability；现有 legacy template behavior 只标为 `runtime_backed` 或更低状态。
- `complete_supported` 缺 DSL schema、normalizer、IR compiler、runtime module、amendment operations、capability-owned QA、artifact evidence、render contract、verified required QA probes 或 blockers 清空任一条件都会 fail closed。
- `listGameplayProfileRuntimeStatuses()` 从 `RuntimeGenreRegistry` 派生 profile runtime status，并合并 legacy alias 映射能力与 registry-declared profile capability，防止遗漏 profile-owned planned capability 后误报 complete。
- registry validation 审计 duplicate ID、duplicate legacy alias、ID/version drift、domain/ID prefix drift、unknown profile、legacy alias/profile membership mismatch。
- `side_scrolling_platformer.v1` 复用 shared side-scrolling camera/physics/movement/collision capability，但仍因 planned profile-owned capability 保持 unsupported / legacy-only 状态。

验证：

- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts`：8 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：49 files / 557 tests passed。

Oracle：

- 初审：P0 none；P1 profile complete 判定存在未来 false-supported 风险；P2 domain/ID prefix 未绑定、profile membership 缺审计；P3 docs closeout 未记录。
- 已修复 P1/P2 并补 regression tests。
- 复审：P0 none；P1 none；P2 none；仅剩 docs closeout P3，本节已记录。

未做：

- 未切换 runtime 默认路径。
- 未改 Step34 proposal、candidate preview、QA、Accept/Reject/Undo lifecycle。
- 未实现 35.2 package manifest、35.3 DSL composition、35.5 runtime loader 或 35.8 capability-owned amendment operations。

## 35.2 Current Slice

目标：建立 canonical package contract 和 completeness validator，让后续 package 不能通过手工 support flag 绕过 schema、IR、runtime、amendment、patch、QA、render、evidence 和 ownership 合同。

### Implementation Rules

- package manifest 使用 `contractVersion: "gameplay-capability-package.v1"`。
- package 必须声明 manifest、DSL schema fragment、owned DSL paths、normalizer、IR compiler、runtime systems、amendment operations、patch descriptors、QA probes、required evidence、render contract、dependencies、optional dependencies、conflicts、provided interfaces、defaults 和 diagnostics。
- contract schema 使用 strict object，拒绝任意 `script` / extra runtime fields。
- `COMPLETE_SUPPORTED` 只能由完整 contract + `manifest.status: "supported"` 派生；`experimental` 即使完整也只能是 `COMPLETE_EXPERIMENTAL`。
- `validateGameplayCapabilityPackages()` 必须拒绝跨 package owned DSL path overlap。
- validation report 必须包含 deterministic manifest/package hash。

### 35.2 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/package-contract.ts`。
- 新增 `packages/game-dsl/src/gameplay-capabilities/stable-json.ts`，供 registry snapshot 和 package hash 共用。
- `validateGameplayCapabilityPackage()` 输出 `capability_package_validation_report`，包含 completeness、support eligibility、manifest hash、package hash 和 issues。
- `validateGameplayCapabilityPackages()` 聚合集合级报告，检测 duplicate package ID、exact owned DSL path conflict 和 parent/child owned DSL path conflict。
- `deriveGameplayCapabilityPackageCompleteness()` 固定 `SCHEMA_ONLY`、`SCHEMA_AND_IR`、`RUNTIME_WITHOUT_QA`、`COMPLETE_EXPERIMENTAL`、`COMPLETE_SUPPORTED`。
- package patch descriptors 必须声明 owned paths，且每个 patch path 必须位于 package DSL owned paths 内。
- `defaults` 只允许 declarative JSON，拒绝 function / symbol / bigint / undefined / non-finite number 和 executable-looking keys。
- QA probes 与 required evidence 必须归属于当前 `manifest.id`。
- 新增 `tests/contracts/gameplay-capability-package-contract.test.ts`，覆盖完整 supported package、hash determinism、missing QA、schema-valid incomplete supported package、version drift、extra arbitrary runtime field、patch ownership、declarative defaults、QA ownership、owned path conflict、duplicate package ID、experimental not production-supported。

验证：

- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts`：19 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：50 files / 568 tests passed。

Oracle：

- 初审：P0 none；P1 patch ownership 可空、owned path 只 exact match、defaults 可非 JSON；P2 QA/evidence ownership 未绑定。
- 复审：P0 none；P1 none；P2 duplicate package ID 未拒绝。
- 最终复审：P0/P1/P2 none；35.2 可以 closeout。

未做：

- 未把默认 registry capability 升级为 `complete_supported`。
- 未接 runtime loader、profile resolver、generation pipeline 或 Step34 amendment compiler。
- 未把 package validation report 写入 pipeline artifact index；artifact 接线留给后续 35.6/35.12。

## 35.3 Current Slice

目标：建立 capability-backed DSL base envelope 和 two-pass validation contract，先证明 component / behavior / ECA / goal 节点必须由已注册 capability 拥有，并由 owner schema fragment 验证 config。当前切片不替换 Raw DSL normalizer，不生成 IR。

### Implementation Rules

- base envelope 包含 `profile`、`capabilities`、`scenes`、`entities`、`rules`、`goals`、`assets`、`ui`、`metadata`。
- Pass 1 只验证基础 envelope、stable IDs 和 declarative JSON；拒绝 `script` / `import` / `eval` / `function` / `code` / `module` / `onX` 等 executable-looking keys。
- Pass 2 使用 registry 和 capability schema fragments 验证每个 component、behavior、condition、action、goal 的 owner capability。
- 节点使用未声明 capability、未知 capability 或缺 owner schema fragment 都 fail closed。
- duplicate stable ID 进入 validation issue，避免 authoritative node 被静默忽略。
- legacy adapter 先建立 deterministic report contract，用于记录旧 DSL path 到 capability path 的迁移证据。

### 35.3 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/declarative-json.ts`，统一 declarative JSON / executable-key guard。
- 新增 `packages/game-dsl/src/gameplay-capabilities/capability-dsl.ts`。
- `CapabilityBackedGameDslSchema` 定义 capability-backed envelope、entity components、behaviors、ECA rules 和 goals。
- `validateCapabilityBackedGameDsl()` 输出 `capability_game_dsl_validation_report`，包含 pass1/pass2 状态、declared capabilities、owned nodes、issues 和 deterministic DSL hash。
- `CapabilityDslSchemaFragment` 让 owner capability 提供 node-kind scoped config schema；缺失或 config invalid 都 fail closed。
- `buildLegacyDslAdapterReport()` 输出 deterministic `legacy_dsl_adapter_report`，记录旧 path 到 capability path 的迁移映射。
- duplicate `(capabilityId,nodeKind)` owner schema fragment 会 fail closed，避免宽松 schema 覆盖严格 schema。
- invalid legacy adapter report 先排序 mappings，再生成和排序 errors，hash 不受输入顺序影响。
- executable-key guard 覆盖 `script`、`import`、`eval`、`function`、`code`、`module`、`on_` 和常见 lowercase DOM-like handlers。
- 新增 `tests/contracts/gameplay-capability-dsl.test.ts`，覆盖 two-pass validation、unknown/undeclared capability、owner config validation、unregistered rule action、duplicate schema fragment、unstable ID、script-like config、duplicate stable ID、legacy adapter report determinism。

验证：

- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts`：28 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：51 files / 577 tests passed。

Oracle：

- 初审：P0 none；P1 duplicate schema fragment 会覆盖 owner schema；P2 invalid legacy adapter report hash 对输入顺序不稳定；P3 executable-key guard 可扩大。
- 已修复 P1/P2/P3 并补 regression tests。
- 复审：P0/P1/P2 none；35.3 可以 closeout。

未做：

- 未替换 Raw DSL v0.1 schema / normalizer。
- 未生成 `composed_game_dsl_schema.json` artifact；当前只提供 schema fragment validation contract。
- 未生成 IR 或 runtime manifest。
- 未接 Step34 amendment compiler。

## 35.4 Current Slice

目标：建立 capability compiler dispatch、compiler plan、IR fragment merge 和 compilation report 合同。当前切片不替换现有 genre compiler，也不接 runtime manifest。

### Implementation Rules

- 35.4 必须复用 35.3 的 two-pass DSL validation；DSL invalid 时 IR compilation fail closed。
- 每个 owned DSL node 必须找到 `(capabilityId,nodeKind)` IR compiler，否则进入 `IR_COMPILER_MISSING`。
- duplicate compiler ownership 进入 `IR_COMPILER_DUPLICATE`，不能后注册覆盖先注册。
- compiler fragment 必须声明当前 source path，否则进入 `IR_FRAGMENT_SOURCE_UNOWNED`，避免 DSL node 被静默丢弃。
- merge 使用 append-only deterministic merge；duplicate output owner 进入 `IR_OUTPUT_CONFLICT`，禁止 last-write-wins。
- compilation report 记录 DSL hash、capability lock hash、compiler plan hash、output IR hash、consumed / uncompiled source paths 和 issues。

### 35.4 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/capability-ir.ts`。
- `CapabilityIrFragmentSchema` 固定 capability-owned IR fragment 合同：source paths、runtime system configs、entity components、rules、goals、asset requirements、telemetry requirements。
- `compileCapabilityDrivenGameIr()` 先运行 35.3 validator，再按 capability/node-kind dispatch compiler。
- `CapabilityIrCompilerPlan` 输出 deterministic `capability_ir_compiler_plan` 和 plan hash。
- `CapabilityIrCompilationReport` 输出 deterministic `capability_ir_compilation_report`。
- output IR 使用 `capability-game-ir.v0.1` contract，保留 runtime family、profile、capability lock ref、asset manifest ref、telemetry plan ref、QA plan ref。
- IR fragment owner 必须等于 source node owner，所有 output owner 必须等于 fragment owner；不匹配进入 `IR_FRAGMENT_OWNER_MISMATCH`。
- duplicate output ID 无论是否来自同一 capability 都进入 `IR_OUTPUT_CONFLICT`，禁止 last-write-wins。
- compiler exception 转成 `IR_COMPILER_EXCEPTION` invalid report，不向调用方抛出。
- 新增 `tests/contracts/gameplay-capability-ir.test.ts`，覆盖 deterministic compiler output、missing compiler fail、duplicate compiler fail、source path omission fail、duplicate output owner fail、same-capability duplicate output fail、owner mismatch fail、compiler exception fail closed。

验证：

- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts`：36 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：52 files / 585 tests passed。

Oracle：

- 初审：P0 none；P1 duplicate IR output ID same capability 未 fail closed；P1 fragment/output owner 未绑定 dispatch owner；P2 compiler exception 未转 report-level fail closed。
- 已修复 P1/P2 并补 regression tests。
- 复审：P0/P1/P2 none；35.4 可以 closeout。

未做：

- 未替换 `packages/game-dsl/src/normalizer.ts` 或现有 template compiler。
- 未接 Step33 Scene IR / asset intent compiler；当前只保留 fragment merge contract。
- 未生成 runtime system manifest；35.5 处理。
- 未接 generation pipeline artifact index。

## 35.5 Current Slice

目标：建立 `phaser_2d_action_arcade.v1` universal composition path 的 runtime system manifest、loader plan、binding report、hot patch acknowledgement 和 lifecycle session 合同。当前切片只做 contract/runtime family loader 层，不迁移旧模板目录，也不切换默认生成路径。

### Implementation Rules

- runtime kernel 必须声明 `templateBoundary: "universal_kernel"`、`profileBranching: "forbidden"`、`defaultGameplayObjects: "forbidden"`。
- compatibility mode 必须显式选择 `universal_composition`；`legacy_template` 不能作为隐式 fallback 进入 modular loader。
- loader plan 必须验证 capability lock ref、capability membership、module availability、module ownership、dependency presence、duplicate config 和 dependency cycle。
- load order 使用 dependency graph + phase/id stable ordering，plan hash 必须 deterministic。
- runtime module config 来自 capability IR `runtimeSystemConfigs[].config`；禁止只传 hash 后让模块内部默认补行为。
- hot patch 只能接受 module descriptor 声明的 patchable properties，且必须返回 verification event。
- binding report 初始为 `bound_pending_qa`，只有 QA probe 被 module 明确声明且观察到所有 module 后才能升级 `qa_observed`。
- lifecycle session install/start 只执行一次，update loop 不重复，dispose 按 load order 反向执行。

### 35.5 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/phaser-runtime-loader.ts`。
- `PhaserRuntimeSystemManifestSchema` 固定 universal kernel、compatibility mode、runtime system module descriptor、patch descriptor 和 service IDs。
- `buildPhaserRuntimeSystemLoaderPlan()` 输出 `phaser_runtime_loader_report`、`phaser_runtime_loader_plan` 和 `capability_runtime_binding_report`。
- loader fail closed 覆盖 invalid IR/manifest/lock、lock ref mismatch、lock missing capability、legacy compatibility mode、duplicate runtime system config、duplicate module、template-default entity policy、missing module、capability mismatch、missing dependency 和 dependency cycle。
- `PhaserRuntimeLoaderPlanEntry` 保留 declarative `config` 和 `configHash`；`createPhaserRuntimeModuleSession().installAll()` 把 authoritative config 传给 module install。
- `acknowledgePhaserRuntimePatch()` 只接受 descriptor 声明的 patchable property，并返回 snapshot/apply/revert strategy 与 verification event。
- `observePhaserRuntimeBindingReport()` 要求 observed module 声明调用方 QA probe；未声明或未观察完整模块时保持 `bound_pending_qa`。
- 新增 `tests/contracts/phaser-runtime-loader.test.ts`，覆盖 deterministic dependency/phase order、missing module、missing dependency、dependency cycle、duplicate config、template-default forbidden、legacy fallback forbidden、hot patch acknowledgement、QA binding observation、lifecycle install/start/update/dispose。

验证：

- `npx vitest run tests/contracts/phaser-runtime-loader.test.ts`：10 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts`：46 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：53 files / 595 tests passed。

Oracle：

- 初审：P0 none；P1 loader plan/session 只传 `configHash` 会迫使 module 使用内部默认；P2 QA observation 可用任意 `qaProbeId` 伪造。
- 已修复 P1/P2 并补 regression tests。
- 复审：P0/P1/P2 none；35.5 可以 closeout。

未做：

- 未创建 `templates/phaser/universal-2d-action/` 真实模板目录。
- 未切换 compiler/template 默认路径。
- 未把旧 `side_scrolling_run_and_gun` runtime 迁移到 composed path；35.10 处理。
- 未接 Step34 amendment router；35.8 处理。

## 35.6 Current Slice

目标：让 profile recipe 只声明 capability composition、defaults、constraints 和 acceptance，由 compiler 派生 capability graph、exact lock、composed DSL schema、IR compiler plan、runtime manifest、QA plan 和 generation context。当前切片不调用 DeepSeek，不接 generation pipeline，不切换 legacy template。

### Implementation Rules

- recipe 使用 `gameplay-profile-recipe.v0.1`，不允许 profile 内手写 `supported`。
- required capability 缺 package 或 package 非 `COMPLETE_SUPPORTED` 必须 blocked。
- optional capability 缺失或不完整进入 deferred，不得进入 exact supported set。
- direct dependency 可以纳入 selected set；缺失 dependency 或 conflict blocked，完整 resolver 留给 35.7。
- profile support 由 `graphResolved && allRequiredPackagesComplete && runtimeManifestComplete && qaPlanComplete && referenceAcceptancePassed` 派生。
- reference acceptance 不能只是布尔值；必须包含 recipe 要求的 evidence refs。
- defaults 合并优先级：capability defaults < profile defaults < accepted amendment values < user values。
- `userValues` / `acceptedAmendmentValues` 作为 unknown 输入解析为 declarative JSON，拒绝 `script` / executable-looking key / function 等非 JSON 值。
- generation context 只能暴露 capability-facing 信息，不暴露 runtime system IDs、template path 或 implementation details。
- runtime readiness 复用 35.5 loader fail-closed 语义，legacy mode、template-default module、dependency/cycle 等不能让 profile supported。

### 35.6 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/profile-recipe-compiler.ts`。
- `GameplayProfileRecipeSchema` 定义 profile recipe contract、required/optional capabilities、defaults、constraints 和 acceptance required evidence。
- `compileGameplayProfileRecipe()` 输出 `gameplay_profile_compilation_report`，并在成功时返回七类 artifacts：`resolvedCapabilityGraph`、`gameplayCapabilityLock`、`composedGameDslSchema`、profile-level `capabilityIrCompilerPlan`、`runtimeSystemManifest`、`capabilityQaPlan`、`generationCapabilityContext`。
- `mergeGameplayProfileDefaults()` 固定 defaults precedence，用户显式值不会被 profile/capability default 覆盖。
- optional unsupported capabilities 进入 `deferredCapabilities` 和 `prohibitedUnsupportedFallbacks`，不进入 lock。
- compiler 用 selected packages 构造 profile runtime IR slice + capability lock，并调用 35.5 `buildPhaserRuntimeSystemLoaderPlan()`；loader invalid 会映射为 `PROFILE_RUNTIME_LOADER_INVALID`。
- `generationCapabilityContext` 只包含 supported/deferred capabilities、supported DSL node kinds、supported operations、constraints、defaults 和 prohibited fallback 文案。
- 新增 `tests/contracts/gameplay-profile-recipe-compiler.test.ts`，覆盖 deterministic artifacts、unsupported required capability、optional deferred、defaults precedence、generation context 不泄漏 runtime implementation、35.5 runtime loader inherited fail-closed、declarative defaults guard、reference acceptance evidence。

验证：

- `npx vitest run tests/contracts/gameplay-profile-recipe-compiler.test.ts`：8 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts`：54 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：54 files / 603 tests passed。

Oracle：

- 初审：P0 none；P1 runtime manifest completeness 未继承 35.5 loader fail-closed 语义；P2 user/amendment defaults 未做 declarative JSON validation。
- 已修复 P1/P2 并补 regression tests。
- 复审：P0/P1/P2 none；35.6 可以 closeout。

未做：

- 未实现 full dependency / compatibility / version resolver；35.7 处理。
- 未把 profile compiler 接入 DeepSeek prompt builder 或 generation pipeline artifact index。
- 未迁移 legacy side-scrolling template 到 composed path；35.10 处理。

## 35.7 Current Slice

目标：实现 gameplay capability graph resolver，生成 exact package lock 和可读 diagnostics，在 generation/amendment 前阻止缺失能力、不兼容组合、依赖环、runtime family mismatch、未完成 package、hidden downgrade 和未授权 active lock 变更。

### Implementation Rules

- resolver 独立于旧 asset resolver-v2；输入是 capability package candidates、requested capability IDs、runtime family、active lock、allowed version changes、allowed removals 和 requiresOneOf。
- 同一 capability 允许多个 packageVersion 作为候选；最终 selected set 只能有一个 exact package。
- 无 active lock 时选择最高 supported packageVersion；同版本 stable 高于 prerelease。
- active lock 存在时默认必须复用 exact packageVersion + packageHash；只有 `allowedVersionChanges` 允许升级。
- active lock 中既有 capability 默认不能从新 lock 静默移除；只有 `allowedCapabilityRemovals` 允许移除。
- required dependency 必须进入 selected closure；optional dependency 缺失只进入 deferred；requiresOneOf deterministic 选择可用 option 并继续闭包。
- conflictsWith、dependency cycle、runtime family mismatch、incomplete package 都 blocked。
- 最终 selected package set 必须跑 35.2 package-set validation，防止 owned DSL path overlap 进入 lock。
- diagnostics 使用 `MISSING_CAPABILITY`、`VERSION_CONFLICT`、`INCOMPATIBLE_CAPABILITIES`、`DEPENDENCY_CYCLE`、`RUNTIME_FAMILY_MISMATCH`、`INCOMPLETE_PACKAGE`，并包含 explanation/remediation。

### 35.7 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/capability-resolver.ts`。
- `resolveGameplayCapabilityGraph()` 输出 `gameplay_capability_resolution_report`，成功时附带 exact `gameplay_capability_lock`。
- resolver 对每个 candidate 单独运行 package validation，因此支持同一 capability 的多个 packageVersion；最终 selected set 再运行 `validateGameplayCapabilityPackages()` 做跨 package ownership 校验。
- version selection 使用 SemVer-like precedence，major/minor/patch 数字比较，同版本 stable 高于 prerelease。
- active lock preservation 同时覆盖 exact package version/hash、未授权 removal 和显式 upgrade。
- requiresOneOf 选中 option 后会继续做 dependency closure，避免 option 自身依赖遗漏。
- 新增 `tests/contracts/gameplay-capability-resolver.test.ts`，覆盖 dependency closure、optional deferred、conflict、cycle、deterministic highest version、stable over prerelease、active lock version preservation、explicit upgrade、unapproved removal、runtime family mismatch、selected package-set ownership validation、requiresOneOf closure、human-readable diagnostics。

验证：

- `npx vitest run tests/contracts/gameplay-capability-resolver.test.ts`：12 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-resolver.test.ts`：66 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：55 files / 615 tests passed。

Oracle：

- 初审：P0 none；P1 active lock 中未进入新 closure 的 capability 可被静默移除；P2 final selected packages 未跑 35.2 package-set validation。
- 复审：P0 none；P1 none；P2 prerelease packageVersion ordering 不符合 stable > prerelease。
- 已修复 P1/P2 并补 regression tests。
- 最终复审：P0/P1/P2 none；35.7 可以 closeout。

未做：

- 未把 resolver diagnostics 接入 Step34 planner 的 `unsupported_capability` 文案；35.8 处理 amendment 侧接入。
- 未实现 capability add/remove candidate 的完整 preview/accept promotion；35.8 处理。

## 35.8 Current Slice

目标：把 Step34 generic Amendment IR 接到 capability package owner，让自然语言修改通过 capability-owned operation contract、resolver lock 和 package patch policy 路由，而不是回到 profile/genre field map。

### Implementation Rules

- operation owner 只能来自 candidate `afterLock` 中 exact `capabilityId + packageVersion + packageHash` 对应的 package。
- `requiresCapabilities.required === true` 是硬约束：required owner 未进入 lock、exact package 缺失或不支持 operation 时必须 fail closed，不允许 generic fallback。
- 没有 required owner 时，generic operation 只能在唯一 locked owner 支持时路由；多个 locked owner 支持同一 generic operation 必须 `OPERATION_OWNER_AMBIGUOUS`。
- add capability candidate 必须经 resolver 生成新 lock，并记录 before/after lock diff。
- remove capability 必须保留 dependency impact guard，不能留下 broken profile。
- Accept 只能在 routed plan 上原子提升 candidate lock；Reject 保持 active lock 不变。

### 35.8 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/capability-amendment-operations.ts`。
- `routeCapabilityOwnedAmendment()` 校验 Step34 `GameAmendmentIr`、active capability lock 和 package contracts，调用 35.7 resolver 生成 candidate `afterLock`。
- `CapabilityAmendmentExecutionPlan` 记录 operation routes、owner packages、before/after lock、lock diff、resolver report、proposal / DeepSeek invocation / amendment IR hash provenance。
- operation key 支持 `SetComponentProperty:<property>` 和 generic operation 名；owner route 输出 compiler ID、packageVersion、executionPolicy 和 patch descriptor IDs。
- package owner map 不使用 last-wins；同一 capability 多个候选版本通过 afterLock 的 exact packageVersion/packageHash 选择。
- required owner 未 locked、exact package 缺失、required owner 不支持 operation、generic owner ambiguous 都 fail closed。
- `promoteCapabilityLockForAmendment()` 固定 Accept/Reject 语义：Accept blocked plan 不提升，Reject 永远保留 active lock。
- 新增 `tests/contracts/gameplay-capability-amendments.test.ts`，覆盖 owner routing、field-first fallback 禁止、add capability candidate、exact locked package version/hash、generic owner ambiguous、requiresCapabilities 消歧、required owner fallback 禁止、remove dependency guard、hot/warm policy、Accept/Reject promotion。

验证：

- `npx vitest run tests/contracts/gameplay-capability-amendments.test.ts`：11 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-resolver.test.ts tests/contracts/gameplay-capability-amendments.test.ts`：77 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：56 files / 626 tests passed。

Oracle：

- 初审：P0 none；P1 package routing 可能从非 locked candidate last-wins 取 owner；P1 generic operation 多 owner first-match 风险。
- 复审：P0 none；P1 required owner 不支持或未 locked 时仍可能 fallback generic owner；P2 缺上述回归测试。
- 最终复审：P0/P1/P2/P3 none；35.8 可以 closeout。

未做：

- 未把 capability-owned QA probes 接入 amendment expected-effects verification；35.9 处理。
- 未迁移 legacy run-and-gun runtime/template 默认路径；35.10 处理。
- 未证明第二个 profile 复用；35.11 处理。

## 35.9 Current Slice

目标：把 capability QA 从“断言字符串/事件名存在”升级为 capability-owned runtime probe contract，并输出可组合的 QA plan/report、profile acceptance report 和 amendment verification report。当前切片固定 contract 与 fail-closed 语义，不迁移默认 runtime path。

### Implementation Rules

- package QA probe 必须包含 `capabilityId`、`prerequisites`、`actions`、`observations`、`assertions` 和 `severity`。
- supported package 缺 required probe 或 required evidence 不能 `COMPLETE_SUPPORTED`。
- profile QA plan 必须组合 locked package probes、profile scenario probes、Step33 render fidelity evidence refs 和 Step34 amendment verification refs。
- QA report 不能相信外部布尔值；plan blocked、missing assertion results、duplicate probe IDs、conflicting actions、invalid runtime observation refs 都必须 fail closed。
- required profile scenario 与 required package probe 同等进入 report evaluation；optional failures 必须可见但不能掩盖 required pass/fail。
- amendment verification 必须复用 Step34 expected effects 做 before/after 检查；`runtime_event minimumCount: 0` 在 verifier 层按至少 1 处理，避免无事件通过。

### 35.9 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/capability-lock.ts`，将 `gameplay_capability_lock` schema/常量从 profile compiler 中抽出，打断 resolver/profile/QA 循环依赖。
- 升级 `packages/game-dsl/src/gameplay-capabilities/package-contract.ts` 的 QA probe schema，新增 action、observation、assertion descriptor，并校验 probe ownership 和 assertion observation refs。
- 新增 `packages/game-dsl/src/gameplay-capabilities/capability-qa-probes.ts`。
- `buildCapabilityRuntimeQaPlan()` 使用 exact capability lock 选择 package，组合 required/optional/package/profile probes，记录 Step33/Step34 refs，并检测 missing locked package、missing required probe、duplicate probe ID、conflicting action、runtime observation ref invalid、profile scenario invalid。
- `evaluateCapabilityQaReport()` 评估 package probes 与 profile scenario probes，要求每个 plan assertion id 都有 passed result；blocked plan 直接 failed。
- `buildProfileAcceptanceReport()` 汇总 capability QA status 与 render fidelity。
- `buildAmendmentVerificationReport()` 复用 Step34 `ExpectedEffectSchema`，覆盖 property_changed、runtime_event、constraint_preserved、asset_binding 和 no_regression。
- `compileGameplayProfileRecipe()` 改为输出/依赖 `capability_qa_plan.v0.2`，`qaPlanComplete` 由 v0.2 plan status 派生，不再保留旧同名 v0.1 私有 plan。
- 新增 `tests/contracts/gameplay-capability-qa-probes.test.ts`，并同步 Step35 旧 fixture 到 richer probe shape。

验证：

- `npx vitest run tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-qa-probes.test.ts`：34 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-resolver.test.ts tests/contracts/gameplay-capability-amendments.test.ts tests/contracts/gameplay-capability-qa-probes.test.ts`：92 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：57 files / 641 tests passed。

Oracle：

- 初审：P0 none；P1 profile compiler 仍输出旧 `capability_qa_plan.v0.1`；P1 QA report 可让 blocked plan 伪装 passed；P2 runtime_event minimum 0 false positive、prerequisites 可空。
- 复审：P0 none；P1 required `profileScenarioProbes` 已组合进 v0.2 plan 但未参与 `evaluateCapabilityQaReport()`，required profile scenario 可被忽略。
- 复审：P0/P1 none；P2 profile scenario 缺 runtime schema validation。
- 复审：P0/P1 none；P2 profile scenario runtimeSystemId 未按 selected locked packages 校验。
- 复审：P0/P1 none；P2 duplicate probe id 可导致 result/assertion map last-write-wins。
- 最终复审：P0/P1/P2/P3 none；35.9 可以 closeout。

未做：

- 未迁移 `side_scrolling_run_and_gun.v1` 到 composed path；35.10 处理。
- 未证明 `side_scrolling_platformer.v1` 复用；35.11 处理。
- 未生成真实浏览器 run 的 QA artifact index；35.10-35.12 汇总处理。

## 35.10 Current Slice

目标：为 `side_scrolling_run_and_gun.v1` 建立 reference composition migration/parity artifact，让 legacy path 与 composed path 可以 dual-run 比较。当前切片不切默认、不删除 legacy template、不宣称真实浏览器 playtest 已完成。

### Implementation Rules

- reference profile 使用 `side_scrolling_run_and_gun.v1`，runtime family 固定 `phaser_2d_action_arcade.v1`。
- migration strategy 固定为 `dual_run_legacy_default_composed_flagged`。
- composed runtime manifest 必须为 `universal_composition`，且不能携带 `legacyTemplatePath` 或 `templates/phaser/side_scrolling_run_and_gun`。
- parity gates 必须包含 normalized DSL、IR、runtime events、gameplay QA、render fidelity、asset fallback、amendment lifecycle。
- Step34 amendment scenario evidence 必须覆盖 speed、fire rate、background、platform layout、player appearance、enemy archetype、Accept/Reject/Undo。
- required artifact refs 必须包含 capability lock、QA plan/report、profile acceptance、migration report 和 parity report，且 evidence refs/path 不能为空。

### 35.10 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/run-and-gun-reference-composition.ts`。
- 固定 `RUN_AND_GUN_REFERENCE_CAPABILITY_IDS` 14 个 reference capability IDs。
- `buildRunAndGunReferenceRecipe()` 生成 run-and-gun capability recipe。
- `buildLegacyVsComposedParityReport()` 汇总 required parity gates 和 amendment scenarios；缺失、失败或 evidence ref 为空都会 failed。
- `buildRunAndGunCapabilityMigrationReport()` 调用 profile compiler，校验 universal composition manifest、parity、amendment lifecycle 和 artifact refs，输出 `run_and_gun_capability_migration_report`。
- 对 blocked profile report 做 undefined stripping，保证 report hash 可稳定生成。
- 新增 `tests/contracts/gameplay-run-and-gun-reference-composition.test.ts`，覆盖 ready composition、legacy fallback blocked、universal manifest 携带 legacyTemplatePath blocked、render parity failure、missing amendment scenario、missing/empty artifact refs、empty parity/amendment evidence refs、deterministic reports。

验证：

- `npx vitest run tests/contracts/gameplay-run-and-gun-reference-composition.test.ts`：10 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-resolver.test.ts tests/contracts/gameplay-capability-amendments.test.ts tests/contracts/gameplay-capability-qa-probes.test.ts tests/contracts/gameplay-run-and-gun-reference-composition.test.ts`：102 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：58 files / 651 tests passed。

Oracle：

- 初审：P0 none；P1 evidence refs 和 artifact refs 可为空字符串但 report 仍 ready。
- 复审：P0/P1 none；P2 universal composition manifest 仍可携带 `legacyTemplatePath`。
- 最终复审：P0/P1/P2 none；P3 duplicate valid parity gates/scenarios/artifact refs 后续进入 artifact index 前可收紧。

未做：

- 未切换默认 runtime/template path。
- 未删除 legacy side-scrolling template。
- 未完成真实浏览器 dual-run playtest；最终汇总在 35.12 处理。
- P3 未处理：duplicate valid parity gates/scenarios/artifact refs 可能造成 evidence ambiguity，进入 artifact index 前应加 duplicate diagnostics。

## 35.11 Current Slice

目标：证明第二个 profile `side_scrolling_platformer.v1` 可以复用 Step35 capability platform，而不是新增 `templates/phaser/side_scrolling_platformer`、新增 compiler genre switch 或复制 run/jump/camera/gravity/health runtime。

### Implementation Rules

- platformer recipe 固定 composition：`camera.side_follow.v1`、`physics.gravity_platformer.v1`、`collision.platform.v1`、`movement.run_jump.v1`、`health.damage_invulnerability.v1`、`pickup.collectible.v1`、`goal.reach_exit.v1`、`scene.parallax_background.v1`、`asset.sprite_binding.v1`、`telemetry.gameplay_events.v1`。
- base platformer profile 默认禁止加载 `combat.projectile.v1`、`weapon.cooldown.v1`、`enemy.ranged_attack.v1`。
- reuse proof 必须绑定 35.10 ready 的 `side_scrolling_run_and_gun.v1` migration report，并从其 `gameplayCapabilityLock.packages` 派生 reference package hashes。
- reuse ratio 按 package hash 计算，不按 capability ID 自证；`goal.reach_exit.v1` 和 `pickup.collectible.v1` 作为 platformer 新能力单独列出。
- template 检测按 path segment 识别 `side_scrolling_platformer`，不能只匹配裸目录名。
- collect/exit QA 和 render fidelity 不能只信任布尔值；必须同时有非空 artifact refs。
- amendment scenarios 必须覆盖 denser platforms、ice ruins background、collectible count 8、jump height increase、add shooting capability。
- `add_shooting_capability` 只能生成 candidate，不进入 base profile；declared additions 和 resolver actual lock diff 都必须 exactly 等于 `combat.projectile.v1 + weapon.cooldown.v1`。

### 35.11 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/platformer-reuse-proof.ts`。
- 固定 `PLATFORMER_REQUIRED_CAPABILITY_IDS`、`PLATFORMER_FORBIDDEN_BASE_CAPABILITY_IDS`、`PLATFORMER_REQUIRED_AMENDMENT_SCENARIOS` 和 `PLATFORMER_REQUIRED_ARTIFACT_KINDS`。
- `buildPlatformerReuseProofReport()` 编译 `side_scrolling_platformer.v1` profile recipe，输出 `side_scrolling_platformer_reuse_proof_report`。
- report 记录 `referenceCompositionReady`、35.10 report hash、reference lock hash、reused capability IDs、new capability IDs、missing reference package IDs、reuse ratio、template/compiler regression flags、QA/render evidence completeness、amendment scenario status 和 shooting candidate resolver report。
- reuse proof 只接受 ready 的 `run_and_gun_capability_migration_report`，且必须来自 `side_scrolling_run_and_gun.v1` compiled lock；self-supplied platformer package refs 不能证明 reuse。
- `noNewTemplateDirectory` 按 path segment 检测 `side_scrolling_platformer`，覆盖 `templates/phaser/side_scrolling_platformer`。
- `missingArtifactKinds` 要求 `side_scrolling_platformer_reuse_proof_report`、`platformer_collect_exit_qa_report`、`render_fidelity_report` 全部存在且 path 非空。
- amendment scenario 缺失或失败都会 blocked；`add_shooting_capability` 必须是 `candidate_generated`。
- `shootingActualAddedCapabilityIds` 从 base platformer lock 与 shooting resolver lock 的差集派生；如果 projectile 依赖额外拉入 `enemy.ranged_attack.v1`，proof blocked。
- 新增 `tests/contracts/gameplay-platformer-reuse-proof.test.ts`，覆盖 ready reuse proof、projectile base module 禁止、新 template 目录、compiler switch、missing/failed amendment、QA/render artifact refs、reference lock hash mismatch、无 ready run-and-gun reference report、自称 shooting additions 过宽、resolver actual diff 过宽和 shooting package 缺失。

验证：

- `npx vitest run tests/contracts/gameplay-platformer-reuse-proof.test.ts`：12 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-resolver.test.ts tests/contracts/gameplay-capability-amendments.test.ts tests/contracts/gameplay-capability-qa-probes.test.ts tests/contracts/gameplay-run-and-gun-reference-composition.test.ts tests/contracts/gameplay-platformer-reuse-proof.test.ts`：114 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：59 files / 663 tests passed。

Oracle：

- 初审：P0 none；P1 failed amendment scenario 仍可 ready、QA/render 可由裸 boolean 冒充；P2 template path 检测太精确、reuse ratio 只按 capability ID。
- 复审：P0 none；P1 referencePackageRefs 仍可由 platformer 自证，未绑定 35.10 reference lock；P2 shooting declared additions 未对 resolver actual diff 做 exact-set。
- 最终复审：P0/P1/P2 none；35.11 可以 closeout。

未做：

- 未新增 `templates/phaser/side_scrolling_platformer`。
- 未新增 compiler top-level genre switch。
- 未切换默认 runtime/template path。
- 未宣称真实浏览器 dual-run 或 profile generation smoke 已完成；最终汇总和 gate 在 35.12 处理。

## 35.12 Current Slice

目标：用可测试的 final closure contract 汇总 Step35 required evidence、P0/P1 gate、35.10 run-and-gun migration/parity report、35.11 platformer reuse proof 和 final Oracle review，确认 Step35 是 capability-platform closure，而不是给现有 genre 包一层 registry。

### Implementation Rules

- final evidence 必须覆盖 capability registry snapshot、package completeness report、capability lock、composed DSL schema、compiler plan、runtime system manifest、capability runtime binding report、capability QA report、run-and-gun parity report、second profile acceptance report、Step34 amendment evidence、Step33 render fidelity evidence。
- P0/P1 questions 必须逐项有 evidence ref、summary 和 passed/failed 状态；任何缺失、失败或 invalid question 都 blocked。
- 35.10 reference migration 不能只看 `status: "ready"`，必须同时检查 artifact kind、profile、no genre-specific template、runtime manifest complete、QA/render/amendment lifecycle、artifact refs complete、parity passed 和 blockers empty。
- 35.11 second profile reuse proof 不能只看 `status: "ready"`，必须同时检查 artifact kind、profile、reference composition ready、reuse threshold、no projectile/no template/no genre switch、collect/exit QA、render fidelity、artifact/scenario completeness、shooting resolver resolved、actual additions exact 和 blockers empty。
- final Oracle gate 必须是 `step35_final_oracle`，status passed，evidence ref 非空，且 P0/P1 findings 为空。
- duplicate final evidence kind 进入 blocker，避免 closure artifact 出现多来源证据歧义。

### 35.12 Closeout

实现：

- 新增 `packages/game-dsl/src/gameplay-capabilities/step35-final-contract.ts`。
- 新增 `STEP35_REQUIRED_FINAL_EVIDENCE_KINDS`、`STEP35_P0_QUESTION_IDS`、`STEP35_P1_QUESTION_IDS` 和 `STEP35_FINAL_ORACLE_GATE_ID`。
- `buildStep35FinalClosureReport()` 输出 deterministic `step35_final_capability_platform_closure_report`，状态为 `closed` 或 `blocked`。
- report 记录 final evidence refs、missing/invalid/duplicate evidence kinds、P0/P1 answers、missing/failed/invalid P0/P1 IDs、run-and-gun readiness、second-profile readiness、Oracle gate 状态和 blockers。
- `isRunAndGunReferenceReady()` 固定 35.10 migration report 闭包字段，防止内部不一致的 ready report 通过 final gate。
- `isPlatformerReuseReady()` 固定 35.11 reuse proof 闭包字段，包含 shooting actual additions exact-set；重复 ID 或缺 required shooting capability 都 blocked。
- 新增 `tests/contracts/step35-final-contract.test.ts`，覆盖 closure ready、missing/invalid/duplicate evidence、P0 failure、P1 failure、35.10 report not ready、35.10 internally inconsistent ready report、35.11 not ready、35.11 internally inconsistent ready proof、malformed shooting additions、Oracle P0/P1 finding、hash determinism。

验证：

- `npx vitest run tests/contracts/step35-final-contract.test.ts`：12 tests passed。
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-dsl.test.ts tests/contracts/gameplay-capability-ir.test.ts tests/contracts/phaser-runtime-loader.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-resolver.test.ts tests/contracts/gameplay-capability-amendments.test.ts tests/contracts/gameplay-capability-qa-probes.test.ts tests/contracts/gameplay-run-and-gun-reference-composition.test.ts tests/contracts/gameplay-platformer-reuse-proof.test.ts tests/contracts/step35-final-contract.test.ts`：126 tests passed。
- `npm run typecheck:root`：passed。
- `npm run test:contracts`：60 files / 675 tests passed。

Oracle：

- 35.12 implementation 初审：P0 none；P1 final gate 对 35.10/35.11 ready report 检查不完整；P2 duplicate evidence kind 未阻断。
- 复审：P0/P1 none；P2 shooting actual additions exact-set helper 未拒绝 duplicate/missing required。
- 35.12 implementation 最终复审：P0/P1/P2/P3 none；允许进入 final Oracle prompt。
- Step35 final Oracle：P0 none；P1 none；P2 none；P3 duplicate valid parity gates / amendment scenarios / artifact refs 仍可能造成 evidence ambiguity，已知且不阻塞 contract/platform closure。
- Final Oracle 结论：Step35 可以 close，限定为 contract/platform closure；未宣称默认 runtime/template 已切换，也未宣称真实浏览器 dual-run 已完成。

未做：

- 未切换默认 runtime/template path。
- 未删除 legacy `side_scrolling_run_and_gun` template。
- 未完成真实浏览器 dual-run playtest 或 artifact-index 级 duplicate evidence diagnostics。
- P3 留存：进入 artifact index 或真实 dual-run 证据汇总前，收紧 duplicate valid parity gates、amendment scenarios 和 artifact refs。
