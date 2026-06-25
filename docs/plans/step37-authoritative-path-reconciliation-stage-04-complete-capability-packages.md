# Step 37 Stage 4 Complete Capability Packages Audit

> - Parent plan: `docs/plans/step37-authoritative-path-reconciliation-audit.md`
> - Stage: 4 — Complete Capability Packages
> - Current status: audit Oracle PASS; checkpoint commit pending
> - Updated: 2026-06-25

## Scope Lock

- scope: Stage 4 read-only audit only.
- baseline: Stage 3 closure checkpoint commit `59a00483` (`docs: close stage 3 capability requirements`).
- question: Does the current production chain have complete capability packages for the required target capabilities, with all five support dimensions proven and incomplete packages failing closed?
- non-goals: no source code edit, no test edit, no capability evidence update, no package promotion, no exact lock creation, no composed schema, no canonical DSL, no runtime loader, no provider run, no production default cutover.
- starting conclusion: `Stage 3 Exit gate: MET`; `Stage 4 Implementation: NOT_ENTERED`.

## Verdict

`COMPLETE_PACKAGE_CLOSURE_NOT_MET`.

The repository has strict complete-support vocabulary, package-contract validation, and profile compiler fail-closed behavior. Those contracts prevent manual promotion and reject incomplete supported packages. However, the current DeepSeek target profile support summary still reports `completeSupportedCount=0` across 59 required capability IDs, and the current successful active profile path is `active_profile_supported`, not package-complete `capability_complete_supported`. Stage 4 therefore cannot close as complete package support.

## Minimal Closure Requirements

To close Stage 4 in a later implementation checkpoint, the production chain must prove all items below without using a status-string override or legacy template fallback:

1. Produce or reference a package set for the target required capability IDs.
2. Validate each required package as `supportEligible=true` and `completeness=COMPLETE_SUPPORTED`.
3. Preserve owned DSL path, normalizer, IR compiler, runtime system, amendment/patch, required QA evidence, and render-contract ownership per package.
4. Keep every missing, malformed, experimental, legacy-backed, or partial package fail-closed with stable issues.
5. Update target support evidence only from real downstream consumer evidence for `schema_expressible`, `normalized`, `compiled`, `runtime_consumed`, and `qa_observed`.
6. Do not enter Stage 5 exact lock until the Stage 4 package set can prove complete support for the required package universe.

## Producer

- Support vocabulary producer: `GameplayCapabilityRegistry` defines the five support evidence dimensions and derives `COMPLETE_SUPPORTED` only when every dimension is true.
- Target profile producer: `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` defines 60 requirements, 15 clusters, and target completion condition `all_required_capabilities_complete_supported`.
- Support summary producer: `buildDeepSeekRunAndGunValidationProfileSupportSummary` derives required capability count, registered count, complete supported count, classification, missing dimensions, and legacy-backed state from the registry.
- Package contract producer: `GameplayCapabilityPackageContractSchema` and `validateGameplayCapabilityPackage` validate package structure, ownership, completeness, deterministic hashes, and `supportEligible`.
- Profile package compiler: `compileGameplayProfileRecipe` accepts only support-eligible required packages when composing a supported profile from package contracts.

## Artifact

| Artifact | Role |
| --- | --- |
| `targetProfileSupport` in `DslConsumptionReport` | Exposes target profile support dimensions and `completeSupportedCount`; currently evidence only, not closure. |
| `DeepSeekRunAndGunProfileSupportSummary` | Derived support summary for the frozen target profile. |
| `GameplayCapabilityPackageValidationReport` | Per-package validation result, completeness, hashes, support eligibility, and issues. |
| `GameplayCapabilityPackageSetValidationReport` | Package-set validation, duplicate ID and owned path conflict checks. |
| `GameplayProfileCompilationReport` | Synthetic package-composed profile compiler output in tests; proves fail-closed contract behavior, not current target profile production closure. |

## Consumer

- `isCompleteSupportedEvidenceDimensions` requires all five evidence dimensions before complete support is true.
- `GameplayCapabilityDescriptorSchema` rejects descriptors that claim `complete_supported` without evidence, verified QA probes, and no blockers.
- `validateGameplayCapabilityPackage` rejects supported package contracts whose derived completeness is not `COMPLETE_SUPPORTED`.
- `validateGameplayCapabilityPackages` rejects duplicate package IDs and overlapping owned DSL paths.
- `compileGameplayProfileRecipe` rejects missing or non-support-eligible required packages.
- `buildDslConsumptionReport` exposes the target support summary so downstream reports keep incomplete capability evidence visible.

## Actual Data Flow

1. The frozen DeepSeek target profile declares the authoritative target condition: all required capability IDs must reach complete support.
2. The support summary derives its required capability universe from the target profile clusters.
3. Each capability ID is looked up in the gameplay capability registry and mapped to five evidence dimensions.
4. `completeSupported` is derived from those dimensions; missing or malformed evidence fails to false.
5. DSL consumption reports publish the derived summary as evidence, including `completeSupportedCount`.
6. Separately, package-contract tests prove a package compiler path can accept synthetic complete packages and reject incomplete ones.
7. No current artifact proves that the DeepSeek target profile required package set is complete or production-active.

## Authority

The Stage 4 authority for closure is a complete, support-eligible capability package set tied to the target required capability universe. The current repository authority is weaker: `GameplayCapabilityRegistry` and target profile support summary are authoritative for incomplete evidence reporting, while package-contract tests are authoritative only for contract behavior.

## Fail Closed

- Manual `status: complete_supported` without evidence remains incomplete.
- Unknown or malformed evidence dimensions derive to false.
- Supported packages that parse but lack required QA/evidence/render/amendment completeness fail with `SUPPORTED_PACKAGE_INCOMPLETE`.
- Missing required profile packages fail with `PROFILE_REQUIRED_CAPABILITY_MISSING`.
- Required packages that are not support-eligible fail with `PROFILE_REQUIRED_CAPABILITY_UNSUPPORTED`.
- Experimental complete packages remain non-production-eligible.

## Fallback

No Stage 4 fallback can promote legacy-backed or active-profile-supported capability state to complete packages. Synthetic package compiler tests are not a fallback for the DeepSeek target profile package universe, and legacy runtime-backed behavior cannot satisfy `qa_observed` or package-owned evidence without real capability consumers.

## Gate Matrix

| Gate | Result | Evidence | Missing proof |
| --- | --- | --- | --- |
| A. Five evidence dimensions exist and are strict | YES | Registry defines `schema_expressible`, `normalized`, `compiled`, `runtime_consumed`, `qa_observed` and derives complete support from all five. | None for vocabulary strictness. |
| B. Manual complete support override is blocked | YES | Descriptor schema and tests keep status-only or partial evidence below complete support. | None for status-only guard. |
| C. Package contract can prove complete packages | PARTIAL | Package-contract tests accept synthetic complete packages and reject incomplete supported packages. | No production target profile package set is shown. |
| D. Profile compiler fails closed for required packages | YES | Compiler rejects missing and unsupported required packages before profile support can be forced. | This is tested with fixtures, not target profile production packages. |
| E. DeepSeek target profile complete support | NO | Current support summary contract asserts `completeSupportedCount=0`, `requiredCapabilityCount=59`, and every target capability incomplete. | Need all required target capabilities to become `completeSupported=true` from real downstream evidence. |
| F. Production active path uses complete packages | NO | Current loop boundaries show active profile support is not final complete package cutover; production default cutover remains not active. | Need package-complete path to become the production authority before Stage 5 exact lock. |

## Findings

### Blocking: target profile package closure is not met

The frozen target profile currently has zero complete-supported required capabilities. This blocks Stage 4 closure because the stage is about complete capability packages, not active profile requirement identity.

`weapon.default_straight_single.v1` is the nearest partial vertical slice, but it remains incomplete: support tests record `schema_expressible=true`, `normalized=true`, `compiled=true`, `runtime_consumed=true`, `qa_observed=false`, and `completeSupported=false`.

### Boundary: contract existence is not production closure

The package contract and profile compiler already enforce important fail-closed semantics, but they are exercised through synthetic fixtures. They do not prove a production package set for the 59 required target capability IDs.

### Boundary: active profile support is below complete package support

Stage 1-3 active profile authority checks can remain closed, but they do not convert `active_profile_supported` or legacy-backed capability evidence into `capability_complete_supported`.

## Missing Proof

- No target profile package set containing all required capability IDs is available as production authority.
- No evidence shows all required packages validated as `supportEligible=true`.
- No evidence shows all 59 required target capabilities have `qa_observed=true`.
- No evidence shows `completeSupportedCount=59`.
- No evidence shows production default path selects complete package authority.
- No Stage 5 exact capability lock can be derived from complete packages yet.

## Source References

- `packages/game-dsl/src/gameplay-capabilities/registry.ts:12`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts:13`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts:129`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts:730`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts:751`
- `packages/game-dsl/src/gameplay-capabilities/package-contract.ts:11`
- `packages/game-dsl/src/gameplay-capabilities/package-contract.ts:281`
- `packages/game-dsl/src/gameplay-capabilities/package-contract.ts:302`
- `packages/game-dsl/src/gameplay-capabilities/package-contract.ts:372`
- `packages/game-dsl/src/gameplay-capabilities/profile-recipe-compiler.ts:435`
- `packages/game-dsl/src/gameplay-capabilities/profile-recipe-compiler.ts:446`
- `packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts:66`
- `packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts:268`
- `packages/game-dsl/src/dsl-consumption-report.ts:28`
- `packages/game-dsl/src/dsl-consumption-report.ts:114`
- `tests/contracts/deepseek-authoritative-dsl-support.test.ts:50`
- `tests/contracts/deepseek-authoritative-dsl-support.test.ts:80`
- `tests/contracts/deepseek-authoritative-dsl-support.test.ts:135`
- `tests/contracts/gameplay-capability-package-contract.test.ts:10`
- `tests/contracts/gameplay-capability-package-contract.test.ts:39`
- `tests/contracts/gameplay-profile-recipe-compiler.test.ts:47`
- `docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md:5`
- `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md:89`

## Verification

```text
npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/dsl-consumption-report.test.ts tests/contracts/gameplay-capability-registry.test.ts
# PASS, 5 files / 52 tests

git diff --check
# PASS

rg -n "[ \t]+$" docs/plans/step37-authoritative-path-reconciliation-audit.md docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md
# PASS, no matches
```

## Oracle Review

- review status: PASS.
- agent: `019efe9e-ccf1-7333-9a1a-4835c414fe98`.
- findings: P0/P1/P2 none.
- P3: Oracle requested explicit mention that `weapon.default_straight_single.v1` remains incomplete because `qa_observed=false`.
- remediation: Findings now point out that `weapon.default_straight_single.v1` has four dimensions true but still keeps `qa_observed=false` and `completeSupported=false`.
- checkpoint decision: Stage 4 audit may enter checkpoint commit; this does not approve Stage 4 implementation, complete package closure, Stage 5 exact lock, composed schema, canonical DSL, runtime loader, capability-owned QA, or production default cutover.

## Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3: CAPABILITY_REQUIREMENTS_CLOSED
Stage 4 Audit: COMPLETE_PACKAGE_CLOSURE_NOT_MET
Stage 4 Audit Gate: ORACLE_PASSED_AWAITING_COMMIT
Stage 4 Implementation: NOT_ENTERED
Stage 4 Exit gate: NOT_MET
Next: Stage 4 audit checkpoint commit
```

Stop marker: Stage 4 Complete Capability Packages audit passed Oracle. Do not implement Stage 4 or enter Stage 5 until checkpoint commit completes.

## Stage 4 Closure Implementation — Package Closure Gate

### Scope Lock

- scope: Stage 4 implementation only.
- baseline: Stage 4 audit checkpoint commit `d75d49ce` (`docs: record stage 4 package audit`).
- implementation target: make the existing target profile support artifact explicitly carry package-closure gate evidence, without changing capability evidence or marking any capability complete.
- non-goals: no registry evidence promotion, no source/test fixture fake QA, no active profile lock behavior change, no exact lock creation, no Stage 5 entry, no runtime loader, no provider/browser artifact, no production default cutover.
- starting conclusion: `Stage 4 Audit: COMPLETE_PACKAGE_CLOSURE_NOT_MET`; `Stage 4 Implementation: NOT_ENTERED`.

### Extracted Minimal Closure Requirements

1. Preserve the audit conclusion that target package closure is not met.
2. Make `targetProfileSupport` expose the required package universe, registered count, incomplete capability IDs, and an exact-lock blocker.
3. Derive the closure gate only from `buildDeepSeekRunAndGunValidationProfileSupportSummary`; do not add a manual support flag.
4. Keep `active_profile_supported` and active profile lock semantics unchanged for Stage 1-3.
5. Add focused contract coverage proving Stage 5 exact lock is blocked while `completeSupportedCount=0/59`.

### Implemented Scope

- `DslConsumptionTargetProfileSupportSchema` now includes `requiredCapabilityCount`, `registeredCapabilityCount`, and `completePackageClosure`.
- `completePackageClosure.status` is `blocked_incomplete_target_profile` until every required target capability is complete-supported.
- `completePackageClosure.exactLockAllowed` is `false` unless `completeSupportedCount === requiredCapabilityCount` and there are no incomplete capability IDs.
- `completePackageClosure.incompleteCapabilityIds` lists every required target capability whose support summary is not complete-supported.
- The GREEN test asserts the current fail-closed state: 59 required capabilities, 18 registered capabilities, zero complete-supported capabilities, `weapon.default_straight_single.v1` still incomplete, and Stage 5 exact lock blocked.

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | `DslConsumptionTargetProfileSupportSchema` and `buildDslConsumptionTargetProfileSupport` add derived package-closure fields: `requiredCapabilityCount`, `registeredCapabilityCount`, and `completePackageClosure`. |
| Consumer list | `DslConsumptionReportSchema`, existing `buildDslConsumptionReport` callers, DSL consumption report tests, Workbench/artifact readers that parse report JSON, and future Stage 5 exact-lock gates can read the additive fields. |
| Compatibility type | `LOSSLESS_COMPATIBLE`: existing target-profile support fields remain unchanged; new fields are additive on generated reports and preserve old semantic evidence. |
| Authority | `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` defines the required capability universe; `GameplayCapabilityRegistry` support evidence and `buildDeepSeekRunAndGunValidationProfileSupportSummary` derive counts and incomplete IDs. |
| Legacy strategy | Legacy-backed or active-profile-supported runtime state cannot promote `completePackageClosure`; the gate remains blocked until all five dimensions are true for every required target capability. |
| Failure policy | Missing or incomplete support evidence derives `completePackageClosure.status=blocked_incomplete_target_profile`, `exactLockAllowed=false`, and blocker `stage5_exact_lock_blocked`; no exact lock may be claimed from this artifact. |
| Evidence | RED/GREEN `tests/contracts/dsl-consumption-report.test.ts` proves the new fields are required and currently block Stage 5 exact lock while keeping weapon QA incomplete. |
| Rollback | Reverting this implementation removes only additive report fields and the focused assertion; prior targetProfileSupport evidence and active profile path semantics remain available. |

Compatibility disposition:

```ts
const STAGE_4_PACKAGE_CLOSURE_GATE_DISPOSITION = "LOSSLESS_COMPATIBLE";
```

### Validation

```text
npx vitest run tests/contracts/dsl-consumption-report.test.ts
# RED: failed before producer wiring because required package-closure fields were absent

npx vitest run tests/contracts/dsl-consumption-report.test.ts
# GREEN: PASS, 1 file / 6 tests

npx vitest run tests/contracts/dsl-consumption-report.test.ts tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-gap.test.ts
# PASS, 8 files / 62 tests

npm test
# PASS, contracts 93 files / 1036 tests; workspace 34 files / 398 tests

npm run typecheck
# PASS

git diff --check
# PASS

rg -n "[ \t]+$" docs/plans/step37-authoritative-path-reconciliation-audit.md docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md packages/game-dsl/src/dsl-consumption-report.ts tests/contracts/dsl-consumption-report.test.ts
# PASS, no matches
```

### Implementation Oracle Review

- review status: PASS.
- agent: `019efea7-5a9b-74c3-bca9-37ce91347a81`.
- findings: P0/P1/P2/P3 none.
- checkpoint decision: Stage 4 implementation may enter checkpoint commit.
- scope guard: This review approves only the additive package-closure gate reporting in `targetProfileSupport`. It does not approve complete package closure, Stage 5 exact lock, composed schema, runtime loader, capability-owned QA, or production default cutover.

### Implementation Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3: CAPABILITY_REQUIREMENTS_CLOSED
Stage 4 Audit: COMPLETE_PACKAGE_CLOSURE_NOT_MET
Stage 4 Implementation: ORACLE_PASSED_AWAITING_COMMIT
Stage 4 Exit gate: NOT_MET
Next: Stage 4 implementation checkpoint commit
```

Stop marker: Stage 4 implementation passed Oracle for package closure gate only. Do not enter Stage 5 and do not claim complete package closure until checkpoint commit complete.

## Stage 4 Closure Implementation — Default Weapon Browser QA Evidence Surface

### Scope Lock

- scope: Stage 4 implementation only.
- baseline: Stage 4 package closure gate checkpoint commit `2cfe1f54` (`feat(game-dsl): expose stage 4 package closure gate`).
- implementation target: create a browser-observed capability runtime evidence surface for `weapon.default_straight_single.v1` and ensure QA report consumers can read and fail closed on the required probe.
- non-goals: no registry `qa_observed` promotion, no `completeSupported` promotion, no complete package set, no Stage 5 exact lock, no composed schema, no canonical DSL change, no runtime loader rewrite, no production default cutover.
- starting conclusion: `Stage 4 Exit gate: NOT_MET`; nearest partial slice is `weapon.default_straight_single.v1` with `schema_expressible=true`, `normalized=true`, `compiled=true`, `runtime_consumed=true`, `qa_observed=false`.

### Extracted Minimal Closure Requirements

1. Keep Stage 4 package closure fail-closed while adding only browser-observable evidence plumbing for the default weapon capability.
2. Emit a stable probe from the real side-scrolling `fire()` action path, not from a static report or synthetic support summary.
3. Surface the probe through both `__GAME_QA__.telemetry()` and `__GAME_QA__.snapshot()` so browser QA can observe it after deterministic interaction.
4. Make Playwright QA evaluate required capability runtime probes when the pipeline passes an expectation, and write the evidence into `qa_report.json`.
5. Pass the default weapon probe expectation only for `side_scrolling_run_and_gun` QA; leave other genres unchanged.
6. Do not mark `weapon.default_straight_single.v1` `qa_observed=true` until the package registry/support summary has an explicit Stage 4 promotion gate.

### Implemented Scope

- Added optional `QaCapabilityRuntimeExpectation` / `QaCapabilityRuntimeEvidence` to QA input, browser result, and QA report types.
- Added `evaluateCapabilityRuntimeEvidence` to Playwright browser QA:
  - reads capability probes from `snapshot.capabilityRuntime.probes`;
  - reads matching probes from telemetry payload `capabilityRuntime`;
  - fails closed with `CAPABILITY_RUNTIME_MISMATCH` when an expected probe is absent or mismatched.
- Side-scrolling runtime now emits default weapon probe evidence when `fire()` creates a player projectile:
  - `capabilityId: weapon.default_straight_single.v1`;
  - `probeId: weapon.default_straight_single.v1.fire.browser_qa.v1`;
  - `action: fire`;
  - `eventType: player.fired`;
  - `sourceRef: runtime_plan.side_scrolling.player.projectileEntityId`.
- `PlaywrightQaRunnerService` preserves `capability_runtime` in `qa_report.json`.
- `GenerationPipelineService` passes the default weapon expected probe to QA only for `side_scrolling_run_and_gun`.
- Existing package closure gate remains blocked at `completeSupportedCount=0/59`; Stage 5 exact lock remains blocked.

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Side-scrolling `fire()` now produces `capabilityRuntime` probe evidence in `player.fired`, `projectile.spawned`, projectile snapshot metadata, and `snapshot.capabilityRuntime.probes`; QA report schemas add optional `capability_runtime`. |
| Consumer list | Playwright browser QA reads the probe from browser snapshot/telemetry; `PlaywrightQaRunnerService` writes it to `qa_report.json`; `GenerationPipelineService` passes the side-scrolling expected probe to QA. |
| Compatibility type | `LEGACY_FORBIDDEN` for the expected probe gate: a side-scrolling preview that cannot expose the default weapon probe fails closed with `CAPABILITY_RUNTIME_MISMATCH` instead of silently claiming browser-observed capability evidence. |
| Authority | Runtime action evidence is authoritative only when produced by the side-scrolling runtime session after `fire()`; the expected probe identity is owned by the Stage 4 QA expectation in the production pipeline. |
| Legacy strategy | Old previews without `capabilityRuntime` are not accepted for this evidence gate; they must be rebuilt through the current template before browser QA can satisfy the probe. |
| Failure policy | Missing probe, wrong capability id, wrong action, wrong event type, or wrong projectile entity id produces failed capability runtime evidence and blocks QA success when the expectation is required. |
| Evidence | RED/GREEN focused tests prove missing runtime evidence failed first, then browser QA evaluator/report/pipeline all consumed the new probe; full tests and typecheck passed. |
| Rollback | Reverting this implementation removes only optional QA evidence plumbing and the side-scrolling probe; package closure gate remains blocked and Stage 5 stays unentered. |

Compatibility disposition:

```ts
const STAGE_4_DEFAULT_WEAPON_BROWSER_QA_DISPOSITION = "LEGACY_FORBIDDEN";
```

Completion rule result:

- Same-run consumer evidence exists for the named downstream consumer: Playwright browser QA evaluates the probe and the QA runner writes it into `qa_report.json`.
- Stage 4 package closure is still not met because registry/support summary still records `qa_observed=false` and `completeSupported=false` for `weapon.default_straight_single.v1`.

### Validation

```text
npx vitest run tests/contracts/phaser-templates.test.ts tests/workspace/playwright-qa-runner.test.ts
# RED: failed before implementation because side-scrolling telemetry lacked capabilityRuntime and evaluateCapabilityRuntimeEvidence was missing

npx vitest run tests/workspace/generation-pipeline.service.test.ts -t "routes supported side-scrolling run-and-gun prompts through compile, build, and QA"
# RED: failed before pipeline wiring because expectedCapabilityRuntime was undefined

npx vitest run tests/contracts/phaser-templates.test.ts tests/workspace/playwright-qa-runner.test.ts tests/workspace/generation-pipeline.service.test.ts tests/contracts/dsl-consumption-report.test.ts tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-gap.test.ts
# PASS, 11 files / 178 tests

npm test
# PASS, contracts 93 files / 1037 tests; workspace 34 files / 401 tests

npm run typecheck
# PASS
```

### Implementation Oracle Review

- review status: PASS.
- agent: `019efeb5-9986-7af3-a415-0ffd8b9826ce`.
- findings: P0/P1/P2 none.
- P3: Direct `PlaywrightQaRunnerService.run` calls remain opt-in for `expectedCapabilityRuntime`; production `GenerationPipelineService` passes the side-scrolling expectation, so this does not block the current micro-loop. Future Workbench/manual QA evidence claims should centralize or require the expectation at the QA service boundary.
- checkpoint decision: Stage 4 default weapon browser QA evidence implementation may enter checkpoint commit.
- scope guard: This review approves only the default weapon browser-observed capability runtime evidence surface and QA report propagation. It does not approve registry `qa_observed` promotion, complete package closure, Stage 5 exact lock, composed schema, canonical DSL, runtime-loader cutover, or production default cutover.

### Implementation Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3: CAPABILITY_REQUIREMENTS_CLOSED
Stage 4 Audit: COMPLETE_PACKAGE_CLOSURE_NOT_MET
Stage 4 Package Closure Gate: CHECKPOINT_COMMITTED
Stage 4 Default Weapon Browser QA Evidence: ORACLE_PASSED_AWAITING_COMMIT
Stage 4 Exit gate: NOT_MET
Next: Stage 4 default weapon browser QA evidence checkpoint commit
```

Stop marker: Stage 4 default weapon browser QA evidence implementation passed Oracle and is awaiting checkpoint commit. Do not enter Stage 5 and do not claim complete package closure.

## Stage 4 Closure Implementation — Support Evidence Prerequisite Gate

### Scope Lock

- scope: Stage 4 implementation only.
- baseline: Stage 4 default weapon browser QA evidence checkpoint commit `5cefcee1` (`feat(game-dsl): expose default weapon QA probe evidence`).
- implementation target: expose granular support-evidence prerequisites for target profile capabilities so `qa_observed` cannot be inferred from browser probe evidence alone.
- non-goals: no registry evidence promotion, no `qa_observed=true`, no `completeSupported=true`, no complete package set, no Stage 5 exact lock, no runtime loader cutover, no production default cutover.
- starting conclusion: `Stage 4 Exit gate: NOT_MET`; default weapon now has browser QA evidence plumbing, but support formula still requires package-owned QA plus artifact/render/amendment prerequisites.

### Extracted Minimal Closure Requirements

1. Preserve `missingEvidenceDimensions: ['qa_observed']` for `weapon.default_straight_single.v1`.
2. Add granular prerequisite blockers showing which pieces prevent `qa_observed` from becoming true.
3. Derive those blockers from the existing registry descriptor fields, not from a manual report override.
4. Publish the blockers through both DeepSeek target profile support summary and `targetProfileSupport.capabilities` in DSL consumption reports.
5. Keep Stage 4 package closure gate blocked at `completeSupportedCount=0/59`.

### Implemented Scope

- Added `GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_PREREQUISITES` and `getMissingGameplayCapabilitySupportEvidencePrerequisites`.
- `DeepSeekRunAndGunProfileCapabilitySupport` now carries `missingSupportEvidencePrerequisites`.
- `DslConsumptionTargetProfileSupportSchema.capabilities[]` now carries `missingSupportEvidencePrerequisites`.
- Focused tests require `weapon.default_straight_single.v1` to expose the missing prerequisites:
  - `amendmentOperations`;
  - `capabilityOwnedQa`;
  - `artifactEvidence`;
  - `renderContract`;
  - `requiredProbeIds`;
  - `requiredProbesVerified`.

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Target profile support summary and DSL consumption report add additive `missingSupportEvidencePrerequisites` arrays per capability. |
| Consumer list | `buildDeepSeekRunAndGunValidationProfileSupportSummary`, `buildGameplayCapabilityInventoryReport`, `DslConsumptionReportSchema`, report readers, and future Stage 4 promotion gates can read the blockers. |
| Compatibility type | `ADAPTER_REQUIRED`: new generated reports write additive blocker arrays; same-version `DslConsumptionReportSchema` keeps old reports readable by defaulting absent blocker arrays to `[]`. |
| Authority | `GameplayCapabilityRegistry` descriptor evidence and QA metadata remain the source of truth for support prerequisites. |
| Legacy strategy | Legacy reports without the new field remain readable through the schema adapter, but they do not gain prerequisite evidence; newly generated reports must derive blockers from the registry descriptor. |
| Failure policy | Missing registry evidence or QA probe metadata keeps prerequisites listed and preserves `qa_observed=false`, `completeSupported=false`, and `completePackageClosure.status=blocked_incomplete_target_profile`. |
| Evidence | RED/GREEN focused tests prove the blockers are surfaced for default weapon support reports, and a legacy parse regression proves old target-profile support reports remain readable through the adapter. |
| Rollback | Reverting this implementation removes only additive blocker details and the parser adapter; previous fail-closed support dimensions and package closure gate remain intact. |

Compatibility disposition:

```ts
const STAGE_4_SUPPORT_PREREQUISITE_GATE_DISPOSITION = "ADAPTER_REQUIRED";
```

### Validation

```text
npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/dsl-consumption-report.test.ts
# RED: failed before implementation because missingSupportEvidencePrerequisites was absent

npx vitest run tests/contracts/dsl-consumption-report.test.ts -t "parses older target profile support reports without prerequisite blockers"
# RED: failed before the schema adapter because same-version legacy reports without missingSupportEvidencePrerequisites were rejected
# PASS after adapter, 1 passed / 6 skipped

npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/dsl-consumption-report.test.ts tests/contracts/gameplay-capability-registry.test.ts
# PASS, 3 files / 33 tests

npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/dsl-consumption-report.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-gap.test.ts
# PASS, 9 files / 68 tests

npm test
# PASS, contracts 93 files / 1038 tests; workspace 34 files / 401 tests

npm run typecheck
# PASS

git diff --check
# PASS

npx tsx -e "import { buildDeepSeekRunAndGunValidationProfileSupportSummary } from './packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts'; const support = buildDeepSeekRunAndGunValidationProfileSupportSummary(); const weapon = support.capabilities.find((capability) => capability.capabilityId === 'weapon.default_straight_single.v1'); console.log(JSON.stringify({summary:support.summary, weapon}, null, 2));"
# PASS: requiredCapabilityCount=59, completeSupportedCount=0; weapon.default_straight_single.v1 remains qa_observed=false, completeSupported=false, and lists prerequisite blockers
```

### Oracle Re-review Note

The first support prerequisite gate Oracle review returned BLOCKED on P1 because same-version `DslConsumptionReportSchema` required the newly added `missingSupportEvidencePrerequisites` field and could reject older `targetProfileSupport` reports. The follow-up implementation keeps new generated reports authoritative for blocker lists while adapting old parsed reports to `[]`; Oracle re-review is required before checkpoint commit.

### Implementation Oracle Re-review

Oracle PASS / no P0/P1/P2/P3.

Oracle confirmed:

- the previous same-version parser compatibility P1 is resolved by the schema adapter;
- new reports still carry registry-derived blocker lists;
- legacy reports remain readable but do not gain prerequisite evidence;
- browser probe evidence is not promoted into registry `qa_observed` or `completeSupported`;
- Compatibility & Cutover now correctly uses `ADAPTER_REQUIRED`;
- Stage 4 Exit gate remains `NOT_MET`;
- checkpoint commit is allowed.

### Implementation Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3: CAPABILITY_REQUIREMENTS_CLOSED
Stage 4 Audit: COMPLETE_PACKAGE_CLOSURE_NOT_MET
Stage 4 Package Closure Gate: CHECKPOINT_COMMITTED
Stage 4 Default Weapon Browser QA Evidence: CHECKPOINT_COMMITTED
Stage 4 Support Evidence Prerequisite Gate: ORACLE_PASSED_AWAITING_COMMIT
Stage 4 Exit gate: NOT_MET
Next: checkpoint commit for support evidence prerequisite gate
```

Stop marker: Stage 4 support evidence prerequisite gate passed Oracle and is awaiting checkpoint commit. Do not enter Stage 5 and do not claim complete package closure.

## Stage 4 Closure Implementation — Default Weapon Package Contract Prerequisite

### Scope Lock

- scope: Stage 4 implementation only.
- baseline: Stage 4 support evidence prerequisite gate checkpoint commit `f5f1daa3` (`feat(game-dsl): expose support prerequisite blockers`).
- implementation target: add a validated default straight single weapon package contract and align its required browser QA probe id with the package-owned probe namespace.
- non-goals: no `requiredProbesVerified=true`, no `qa_observed=true`, no `completeSupported=true`, no complete package set, no Stage 5 exact lock, no production default cutover.
- starting conclusion: `Stage 4 Exit gate: NOT_MET`; `weapon.default_straight_single.v1` had static browser probe evidence but no validated package contract prerequisite record.

### Current Stage Review Conclusion

`weapon.default_straight_single.v1` remains the nearest Stage 4 vertical slice. Before this slice, its target-profile support reported:

```text
missingEvidenceDimensions: ['qa_observed']
missingSupportEvidencePrerequisites:
  amendmentOperations
  capabilityOwnedQa
  artifactEvidence
  renderContract
  requiredProbeIds
  requiredProbesVerified
completeSupported: false
```

The minimal safe next closure requirement is not to mark QA observed. It is to make the static package contract and package-owned required probe ID real and validated, leaving same-run probe verification for the next Stage 4 slice.

### Extracted Minimal Closure Requirements

1. Add a deterministic `GameplayCapabilityPackageContract` for `weapon.default_straight_single.v1`.
2. Ensure the package validates as `COMPLETE_SUPPORTED` / `supportEligible=true` at the package-contract layer.
3. Align the browser QA probe id with the capability-owned namespace: `weapon.default_straight_single.v1.fire.browser_qa.v1`.
4. Let registry/support/report consumers derive static prerequisites from the validated package contract:
   - `amendmentOperations`;
   - `capabilityOwnedQa`;
   - `artifactEvidence`;
   - `renderContract`;
   - `requiredProbeIds`.
5. Keep dynamic QA verification blocked with `missingSupportEvidencePrerequisites: ['requiredProbesVerified']`.
6. Preserve `qa_observed=false`, `completeSupported=false`, and `completeSupportedCount=0/59`.

### Implemented Scope

- Added `createDefaultStraightSingleWeaponPackageContract()`.
- Exported the default weapon package contract from `gameplay-capabilities/index.ts`.
- `GameplayCapabilityRegistry` now validates the package contract and derives static default-weapon prerequisites from `supportEligible=true`.
- The default weapon descriptor still stays `status: 'planned'` and `classification: 'DEFERRED'`.
- Side-scrolling browser QA telemetry, QA runner expectations, generation pipeline expectation, and tests now use the package-owned probe id.
- Focused tests assert the package contract is valid and support-eligible while the support summary still reports only `requiredProbesVerified` missing.

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | Added the default weapon package contract artifact producer and changed the default weapon browser QA probe id to the package-owned namespace. |
| Consumer list | `validateGameplayCapabilityPackage`, `GameplayCapabilityRegistry`, `buildDeepSeekRunAndGunValidationProfileSupportSummary`, `DslConsumptionReportSchema`, side-scrolling QA telemetry, Playwright QA runner, and generation pipeline capability-runtime expectation read the new contract/probe identity. |
| Compatibility type | `LEGACY_FORBIDDEN` for the old non-owned probe id: `weapon.default_straight_single.fire.browser_qa.v1` cannot satisfy the package-owned required probe. New producers and consumers use `weapon.default_straight_single.v1.fire.browser_qa.v1` in the same run. |
| Authority | The package contract is the static prerequisite authority for default weapon package evidence; `GameplayCapabilityRegistry` remains the support-evidence authority; a future capability QA report must still verify the required probe. |
| Legacy strategy | Old browser probe id evidence is not accepted as package-owned evidence. It may appear only in historical artifacts and cannot clear `requiredProbesVerified`. |
| Failure policy | Missing or stale probe id evidence fails closed as a capability runtime mismatch, while registry support keeps `qa_observed=false`, `completeSupported=false`, and `completePackageClosure.status=blocked_incomplete_target_profile`. |
| Evidence | RED/GREEN package-contract and support tests prove static prerequisites are derived from a validated package contract; template/QA runner/pipeline tests prove active consumers use the package-owned probe id. |
| Rollback | Reverting this slice removes the package contract, restores the old browser probe id, and returns default weapon prerequisite blockers to the previous six-item list without entering Stage 5. |

Compatibility disposition:

```ts
const STAGE_4_DEFAULT_WEAPON_PACKAGE_CONTRACT_DISPOSITION = "LEGACY_FORBIDDEN";
```

### Validation

```text
npx vitest run tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/dsl-consumption-report.test.ts
# RED before implementation: missing package module and default weapon still listed amendmentOperations/capabilityOwnedQa/artifactEvidence/renderContract/requiredProbeIds as blockers
# PASS, 4 files / 45 tests

npx vitest run tests/contracts/phaser-templates.test.ts tests/workspace/playwright-qa-runner.test.ts tests/workspace/generation-pipeline.service.test.ts
# PASS, 3 files / 116 tests

npx vitest run tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/dsl-consumption-report.test.ts tests/contracts/gameplay-profile-recipe-compiler.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-gap.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/playwright-qa-runner.test.ts tests/workspace/generation-pipeline.service.test.ts
# PASS, 12 files / 185 tests

npm test
# PASS, contracts 93 files / 1039 tests; workspace 34 files / 401 tests

npm run typecheck
# PASS

npx tsx -e "import { buildDeepSeekRunAndGunValidationProfileSupportSummary } from './packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts'; const support = buildDeepSeekRunAndGunValidationProfileSupportSummary(); const weapon = support.capabilities.find((capability) => capability.capabilityId === 'weapon.default_straight_single.v1'); console.log(JSON.stringify({summary:support.summary, weapon}, null, 2));"
# PASS: requiredCapabilityCount=59, completeSupportedCount=0; weapon.default_straight_single.v1 remains qa_observed=false, completeSupported=false, and only lists requiredProbesVerified as missing prerequisite
```

### Implementation Oracle Review

Oracle PASS / no P0/P1/P2/P3.

Oracle confirmed:

- package `supportEligible=true` is used only for static prerequisite evidence and does not verify same-run QA;
- `requiredProbesVerified=false` continues to block `qa_observed` and `completeSupported`;
- `completeSupportedCount` remains `0/59`;
- old non-owned probe id is absent from active code/test/template/app surfaces;
- `movement.crouch.v1` and `combat.airborne_fire.v1` still retain their old six prerequisite blockers;
- `defaultStraightSingleWeaponPackageEvidence` is used only by `weapon.default_straight_single.v1`;
- Compatibility disposition `LEGACY_FORBIDDEN` and Stage 4 Exit gate `NOT_MET` are consistent with code;
- checkpoint commit is allowed.

### Implementation Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3: CAPABILITY_REQUIREMENTS_CLOSED
Stage 4 Audit: COMPLETE_PACKAGE_CLOSURE_NOT_MET
Stage 4 Package Closure Gate: CHECKPOINT_COMMITTED
Stage 4 Default Weapon Browser QA Evidence: CHECKPOINT_COMMITTED
Stage 4 Support Evidence Prerequisite Gate: CHECKPOINT_COMMITTED
Stage 4 Default Weapon Package Contract Prerequisite: ORACLE_PASSED_AWAITING_COMMIT
Stage 4 Exit gate: NOT_MET
Next: checkpoint commit for default weapon package contract prerequisite
```

Stop marker: Stage 4 default weapon package contract prerequisite passed Oracle and is awaiting checkpoint commit. Do not enter Stage 5 and do not claim complete package closure.
