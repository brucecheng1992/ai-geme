# Step 37 — Capability-first Authoritative Generation Pipeline Cutover

Status: IMPLEMENTED — FINAL CLOSURE BLOCKED
Oracle Review: PASS
Production Default Cutover: NOT ACTIVE
Final Closure: BLOCKED
Date: 2026-06-19
Source draft: `/Users/dahufa/Documents/workspace/step37_capability_first_authoritative_generation_pipeline_cutover.md`

This repository file is the durable execution log. The source draft path above is historical input, not a runtime dependency.

## Closure Attempts

- `closure-attempt-001`: BLOCKED. Step37 A-F contracts and gates are implemented and Oracle-reviewed, but production default cutover is not active and the active capability-composed runtime evidence does not yet exist.
- `closure-attempt-002`: RESERVED. Future production-path closure must preserve lineage to `closure-attempt-001` and may pass only after active capability-composed canary, lock, manifest, module load, telemetry, QA, build, parity and rollback evidence all bind to the same run.

## Closure Definition

Step 37 is closed only when supported production generation uses the capability-first authoritative path by default and the legacy fixed-template path remains explicit, auditable and rollback-only.

The target production path is:

```text
GameBrief v0.2
→ GenerationScopePlan
→ Gameplay Profile Resolution
→ Capability Requirements
→ deterministic resolver + exact capability lock
→ composed DSL schema
→ canonical capability-backed DSL
→ capability IR
→ runtime plan
→ Scene IR contribution composition
→ runtime system manifest
→ modular runtime loader/system ownership
→ capability-owned QA
```

## Non-negotiable Acceptance Matrix

- Every run records the actual generation path.
- Supported profiles default to `capability_composed_v1`.
- User play-time intent is not capped by the historical 120 second v0.1 brief schema.
- Downstream compilers do not read raw model output to rewrite authoritative semantics after normalization.
- Every Scene IR gameplay domain has one authority owner.
- Runtime Plan gameplay content is not overwritten by partial `scenes[0]`.
- Runtime system manifest matches the exact capability lock.
- Required telemetry has a producer, reachable trigger and runtime evidence.
- Capability gaps fail closed and cannot silently delete gameplay or fall back to fixed templates.
- Step36 candidates cannot enter production until approved and atomically installed.
- Legacy execution is auditable and rollbackable, but not the default path.
- The frozen reference regression preserves 5 platforms, 3 waves, 1 pickup, win target 3800 and real `enemy.fired`.
- Final build, Step33 render checks, Step34 amendment regressions, Step36 regressions and capability-owned QA pass.

## Execution Phases

### Phase A — P0 Contract Repair

Scope:

- Add GameBrief v0.2 with target, range, endless and unspecified play-time intent.
- Keep `game-brief-v0.1.schema.ts` historically unchanged.
- Add v0.1 migration and transitional ingress normalization.
- Add GenerationScopePlan.
- Update provider prompt so new brief generation no longer instructs `30..120` product-duration clamping.

Exit criteria:

- 600 second target validates.
- 8-12 minute range remains `480..720`.
- 120 second limits appear only as engineering budget fields such as QA probe window.

### Phase B — Direct Scene IR Bug Repair

Scope:

- Remove presence-based whole-scene selection from `scene-ir.ts`.
- Treat v0.1 scenes as overlays by default.
- Add protected gameplay domains, authority report and coverage report.
- Add frozen 5 platforms / 3 waves / 1 pickup / target 3800 regression.

Exit criteria:

- Runtime-plan coverage cannot silently decrease.
- Partial `scenes[0]` cannot clear terrain, waves, pickups, objectives or gameplay camera bounds.

### Phase C — Capability Path Wiring

Scope:

- Add per-run generation path receipt.
- Wire profile resolution, capability requirements, resolver and exact lock before DSL generation.
- Compose DSL schema and compile capability IR/runtime plan.
- Compile runtime system manifest, modular runtime loader evidence and capability QA plan.

Exit criteria:

- Supported profile runs write mandatory capability artifacts.
- `side_scrolling_run_and_gun.v1` has readiness, path receipt, exact lock, runtime manifest and modular loader evidence without default cutover.
- Default path selection remains gated by shadow, parity, canary and rollback evidence in later phases.

### Phase D — Step36 Gap Escalation

Scope:

- Required missing capability blocks before DSL provider invocation.
- Gap report binds source run, profile resolution, requirements and registry snapshot.
- Step36 escalation starts only from blocked gap state.
- Installed packages are resolved only in a new snapshot/new run.

Exit criteria:

- Uninstalled, verified or approved-but-not-installed candidates cannot enter exact locks.
- Gaps do not trigger fixed-template fallback.

### Phase E — Shadow, Parity and Canary

Scope:

- Shadow capability compilation without mutating active legacy output.
- Compare legacy and capability outputs across gameplay semantics, Scene IR coverage, runtime manifest, telemetry, render fidelity and amendments.
- Run side-scrolling canary and rollback drill.

Exit criteria:

- No unresolved P0/P1 parity findings.
- Rollback creates a new explicitly authorized legacy run and preserves original evidence.

### Phase F — Final Closure

Scope:

- Generate Step37 artifact index and final closure report.
- Run scoped Step37 tests, full contract suite, Step36 regression suite, root typecheck and diff checks.
- Complete Oracle final gate.

Exit criteria:

- Final closure report binds exact hashes and evidence for the whole matrix.

## Review-Gated Progress Log

### 0. Execution Log Scaffold

Completed time: 2026-06-19

Completed content:

- Created the repository-local Step37 execution log from the external draft.
- Split the work into Phase A-F with explicit exit criteria.
- Preserved the final acceptance matrix as a checklist for later closure.

Phase result:

- No production code changed in this step.
- Current next step is Phase A contract repair.

Validation:

```bash
git diff --no-index --check -- /dev/null docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md
```

Review gate:

- Oracle first review: P0 none; P1 found default cutover was placed too early and modular runtime loader evidence was under-specified; P2 found the original untracked-file whitespace check was ineffective and the gate result needed to be recorded.
- Follow-up fix: Phase C now records readiness/evidence only, default cutover is explicitly gated by later shadow/parity/canary/rollback evidence, modular runtime loader/system ownership is part of the target path, and validation uses `git diff --no-index --check`.
- Oracle follow-up review: P0/P1/P2/P3 none; approved entering Phase A contract repair with the boundary that default cutover remains out of scope.

### 1. Phase A Contract Repair

Completed time: 2026-06-19

Completed content:

- Added `GameBriefV02Schema` with explicit `target`, `range`, `endless` and `unspecified` play-time intent.
- Kept `game-brief-v0.1.schema.ts` unchanged; v0.1 still rejects 600 second target values.
- Added deterministic v0.1 to v0.2 migration without rewriting source artifacts.
- Added transitional ingress normalization for old-key raw outputs above 120 seconds.
- Added mixed-field ingress guard so v0.2 `play_time_intent` cannot be silently collapsed by legacy `target_play_time_sec`.
- Added `GenerationScopePlan` so QA probe windows remain engineering budget, not product-duration intent.
- Updated `GameDslProviderService` Game Brief prompt to v0.2, one-of play-time examples and `target_play_time_sec` forbidden field.
- Added Raw DSL v0.1 fail-closed boundary for v0.2 long target/range/endless/unspecified play-time intents; short target can still project into the legacy prompt during transition.

Phase result:

- Phase A contract layer is implemented and covered by scoped tests.
- Default cutover, Scene IR authority, capability resolver, exact lock, runtime manifest and modular runtime loading remain out of scope for this step.
- Current next step is Phase B direct Scene IR bug repair: remove `scenes[0]` presence-based authority selection and add runtime-plan coverage/authority reports.

Validation:

```bash
npx vitest run tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts
npm run typecheck:root
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/schemas/game-brief-v0.2.schema.ts
git diff --no-index --check -- /dev/null packages/game-dsl/src/schemas/game-brief-ingress.ts
git diff --no-index --check -- /dev/null packages/game-dsl/src/schemas/game-brief-migration.ts
git diff --no-index --check -- /dev/null packages/game-dsl/src/generation-scope-plan.ts
git diff --no-index --check -- /dev/null tests/contracts/game-brief-v0.2.test.ts
git diff --no-index --check -- /dev/null tests/contracts/game-brief-ingress.test.ts
git diff --no-index --check -- /dev/null tests/contracts/generation-scope-plan.test.ts
git diff --no-index --check -- /dev/null docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md
```

Validation result:

- `npx vitest ...` passed: 4 files / 88 tests.
- `npm run typecheck:root` passed.
- `git diff --check` passed.
- Each `git diff --no-index --check` command above returned the expected new-file diff status with no whitespace/check output.

Review gate:

- Oracle first Phase A review: P0 none; P1 found mixed v0.2 + legacy duration could collapse a range and provider prompt used a misleading nested shape; P2 requested Raw DSL legacy projection tests.
- Follow-up fix: mixed v0.2 fields now fail closed, prompt uses one-of examples and forbids `target_play_time_sec`, long/endless/unspecified v0.2 intents return `FALLBACK_UNSUPPORTED` before legacy Raw DSL model invocation, and short v0.2 target projection is covered.
- Oracle follow-up review: P0/P1/P2 none; P3 suggested optional endless/unspecified tests, which were added and verified.

### 2. Phase B Direct Scene IR Bug Repair

Completed time: 2026-06-19

Completed content:

- Changed `buildSceneIr` so side-scrolling Scene IR is always built from `runtime_plan.side_scrolling` first.
- Removed the stale private whole-scene DSL-authored Scene IR authority path.
- Limited v0.1 `scenes[0]` participation to presentation/background overlay; partial scene terrain, enemies, pickups, objectives and gameplay camera data no longer overwrite runtime-plan gameplay content.
- Added Scene IR `pickups` with schema default `[]` for old artifact compatibility.
- Added `buildSceneIrAuthorityReport` and `buildSceneIrCoverageReport`.
- Changed protected gameplay provenance for terrain/player/spawns/pickups/objectives to `source: runtime_plan`; raw DSL paths are retained only in `relatedDslPaths` for audit.
- Added the frozen coverage regression where partial `scenes[0]` cannot reduce 5 platforms, 3 waves, 1 pickup or reach target 3800.
- Updated asset-intent expectations so protected raw scene gameplay visual refs do not become request-required authority after Phase B.
- Added compiler output for `scene_ir_authority_report.json` and `scene_ir_coverage_report.json`.
- Added both reports to `RuntimeCompileResult.files`, `pipeline_artifact_index`, acceptance checked artifacts and Workbench Runtime evidence grouping.
- Added a generic `required_artifacts` acceptance check so required artifact refs in `pipeline_artifact_index` cannot be missing or skipped silently.
- Extended runtime scene binding reports and side-scrolling template binding state to include pickups.

Phase result:

- Phase B direct Scene IR bug repair is closed.
- Runtime Plan is the gameplay authority for terrain, player/spawns, waves, pickups and objectives.
- Scene DSL overlay remains allowed for presentation/background only.
- Authority and coverage decisions are emitted as real generated-project artifacts and are visible to artifact index, acceptance and Workbench evidence.
- Default capability cutover, capability resolver, exact capability lock, runtime system manifest and capability-owned QA remain out of scope for this step.
- Current next step is Phase C capability path wiring.

Validation:

```bash
npx vitest run tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts
npx vitest run tests/workspace/generation-pipeline.service.test.ts --testNamePattern "runtime scene binding|PLAYABLE|side-scrolling"
npx vitest run tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-artifact-index.test.ts
npx vitest run tests/workspace/pipeline-golden-trace.test.ts
npm run typecheck:root
npx vitest run tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts
git diff --check
```

Validation result:

- Scene/runtime/compiler/index focused suite passed: 6 files / 68 tests.
- Generation pipeline filtered runtime evidence suite passed: 4 tests, 27 skipped by test-name filter.
- Acceptance/Workbench/index suite passed: 3 files / 24 tests.
- Golden trace suite passed: 3 tests.
- `npm run typecheck:root` passed.
- Phase A+B unfiltered regression list passed: 13 files / 178 tests.
- `git diff --check` passed.

Review gate:

- Oracle first Phase B review: P0 none; P1 found authority/coverage reports were helper-only and not generated artifacts, and protected gameplay provenance could still say `source: dsl`; P2 found runtime scene binding reports ignored pickups and `enemy_cleared` objective coverage remained weaker than reach-target coverage.
- Follow-up fix: compiler now writes authority/coverage reports, artifact index records them, protected gameplay provenance is runtime-plan owned, runtime/template binding evidence includes pickups, and tests cover emitted reports.
- Oracle second review: P0/P1 none; P2 found acceptance report did not expose or gate missing required authority/coverage artifacts.
- Follow-up fix: acceptance now includes the reports in artifact order and checked artifacts, and `required_artifacts` fails if any required artifact ref is not present; Workbench Runtime grouping includes the reports.
- Oracle final review: P0/P1/P2 none; Phase B approved for closure after docs update.
- Deferred P3: Workbench evidence tests do not explicitly lock the new Runtime grouping, and `enemy_cleared` objective target-count coverage remains weaker than reach-exit target coverage.

### 3. Phase C1 Generation Path Receipt

Completed time: 2026-06-19

Completed content:

- Added `generation_path_receipt.json` as a per-run, schema-validated receipt.
- Added `GenerationPathReceiptSchema` and `buildGenerationPathReceipt`.
- Recorded the actual runtime path as `selectedPath`, including current `legacy_template_v1`, reserved/target `capability_composed_v1` and fail-closed terminal paths.
- Added mandatory `dslSource` so receipts distinguish model-provider DSL, deterministic local fallback DSL and runs where no DSL was generated.
- Added optional `modelFailureCode` so schema validation failures and provider throws are not mislabeled as model unavailable.
- Wrote receipts for valid compile success, DSL candidate validation failure, raw DSL normalization failure, unsupported intent, model generation failure, runtime capability gate failure, compiler exception and compiler runtime-unsupported failure.
- Added model-generation-failed and compile-failed artifact indexes so failed runs still produce index and acceptance evidence.
- Added `generationPathReceipt` as a required artifact in valid, invalid DSL, unsupported intent, model generation failed and compile failed indexes.
- Extended acceptance `required_artifacts` checks and Workbench Prompt / Provenance grouping to include the receipt.
- Preserved the current truth that successful compiled production runs still use `legacy_template_v1`; default `capability_composed_v1` cutover remains gated by later phases.

Phase result:

- Phase C1 generation path receipt is closed.
- Every terminal path covered by this step emits an auditable receipt and artifact index.
- Deterministic local fallback is no longer indistinguishable from model-provider DSL in receipt evidence.
- Non-fallback model failures now use `fail_closed_model_generation_failed` with `modelFailureCode`.
- This step does not implement profile resolution, exact capability lock, runtime system manifest, modular runtime loader evidence or default capability cutover.
- Current next step is Phase C2 capability readiness / gap preflight: profile resolution, capability requirements, registry snapshot and readiness evidence before model invocation.

Validation:

```bash
npx vitest run tests/contracts/generation-path-receipt.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts
npm run typecheck:root
npx vitest run tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts
git diff --check
```

Validation result:

- C1 focused suite passed: 6 files / 60 tests.
- `npm run typecheck:root` passed.
- Phase A+B+C1 unfiltered regression list passed: 15 files / 211 tests.
- `git diff --check` passed.

Review gate:

- Oracle first C1 review after terminal path fixes: P0/P1 none; P2 found deterministic local fallback was recorded only as ordinary `legacy_template_v1`, and non-unavailable model hard failures were mislabeled as `fail_closed_model_unavailable`.
- Follow-up fix: `dslSource` is mandatory, fallback receipts include `deterministic_local_fallback` and `raw_game_dsl_fallback`, and non-fallback model failures now write `fail_closed_model_generation_failed` plus `modelFailureCode`.
- Oracle follow-up review: P0/P1/P2 none; Phase C1 approved for documentation.
- Deferred P3: `fail_closed_model_unavailable` remains in the receipt enum as a reserved value but is not used by current hard-failure paths, and provider-thrown failure has code coverage through implementation but no narrow direct assertion.

### 4. Phase C2 Capability Readiness / Gap Preflight

Completed time: 2026-06-19

Completed content:

- Added `generation_capability_readiness_report.json` as the pre-model capability readiness evidence for intent-planned runs.
- Added `buildGenerationCapabilityPreflight` and `GenerationCapabilityReadinessReportSchema`.
- Reused the Step35 gameplay capability registry snapshot and profile runtime status helpers instead of inventing a parallel registry view.
- Recorded `profileResolution`, `capabilityRequirements`, `targetDefaultPath`, actual `selectedDefaultPath`, `capabilityPathReadiness`, `exactLockStatus` and blockers.
- Wrote `capability_registry_snapshot.json` and `generation_capability_readiness_report.json` immediately after `intent_plan.json`, before unsupported-intent handling and before any model DSL invocation.
- Added both artifacts as required refs in valid, invalid DSL, unsupported intent, model-generation-failed and compile-failed pipeline indexes.
- Added both artifacts to acceptance required-artifact checks and Workbench Runtime evidence grouping.
- Added a synthetic complete-supported registry test proving that `ready_for_resolver` still does not cut the run over to `capability_composed_v1`; actual `selectedDefaultPath` remains `legacy_template_v1` until later cutover gates pass.

Phase result:

- Phase C2 capability readiness / gap preflight is closed.
- Every intent-planned run now emits a registry snapshot and readiness report before model DSL generation.
- Current `side_scrolling_run_and_gun.v1` resolves to a runtime-executable profile but remains blocked for capability path because requirements are incomplete, including `telemetry.gameplay_events.v1`.
- C2 records `targetDefaultPath: capability_composed_v1`, while `selectedDefaultPath` can only be the current actual path `legacy_template_v1` or the terminal `fail_closed_unsupported_intent`.
- Exact capability lock, runtime system manifest, modular runtime loader, default capability cutover and capability-owned QA remain out of scope for this step.
- Current next step is Phase C3 resolver / exact-lock shadow artifacts, using C2 readiness as the input gate.

Validation:

```bash
npx vitest run tests/contracts/generation-capability-readiness.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts
npm run typecheck:root
npx vitest run tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts
git diff --check
git diff --no-index --check -- /dev/null docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md
```

Validation result:

- C2 focused suite passed: 6 files / 61 tests.
- `npm run typecheck:root` passed.
- Phase A+B+C1+C2 unfiltered regression list passed: 16 files / 214 tests.
- `git diff --check` passed.
- `git diff --no-index --check` for this untracked docs file returned the expected new-file diff status with no whitespace/check output.

Review gate:

- Oracle first C2 review: P0/P1/P2 none; P3 noted that `ready_for_resolver` could imply default cutover if `selectedDefaultPath` was interpreted as a target instead of the actual path.
- Follow-up fix: `selectedDefaultPath` now records only the current actual production path for C2, and `targetDefaultPath` separately records the future capability target.
- Oracle second review: P0/P1/P2 none; P3 noted that the schema still allowed `capability_composed_v1` and requested a synthetic ready-registry guard.
- Follow-up fix: C2 `selectedDefaultPath` schema now allows only `legacy_template_v1` or `fail_closed_unsupported_intent`, and the synthetic complete-supported registry test confirms readiness does not perform default cutover.
- Oracle final code review: P0/P1/P2/P3 none; Phase C2 approved for documentation.

### 5. Phase C3 Resolver / Exact-lock Shadow Artifacts

Completed time: 2026-06-19

Completed content:

- Added `generation_capability_resolution_report.json` as the resolver / exact-lock shadow evidence for intent-planned runs.
- Added `buildGenerationCapabilityResolutionShadow` and `GenerationCapabilityResolutionReportSchema`.
- Bound the C3 report to the C2 `capability_registry_snapshot.json` and `generation_capability_readiness_report.json` hashes.
- Kept the actual selected path explicit: C3 reports `targetPath: capability_composed_v1`, while `selectedPath` remains `legacy_template_v1` or `fail_closed_unsupported_intent`.
- Fixed the C3 contract to `shadowMode: true` and `activeLockWritten: false`; it does not write active `gameplay_capability_lock.json`, runtime manifest or default capability path.
- Added fail-closed paths for readiness-blocked profiles, unsupported intents, resolver-ready profiles without approved installed packages and ambiguous runtime family derivation.
- Added a resolved shadow path for synthetic complete-supported profiles with approved installed packages; it writes a profile-bound `shadow_gameplay_capability_lock.json` only as shadow evidence.
- Derived runtime family from the registry snapshot capability `runtimeFamilies` intersection instead of hardcoding a template/runtime family.
- Wired the production pipeline to write the resolution report immediately after C2 readiness preflight, before model DSL invocation.
- Added `generationCapabilityResolutionReport` as a required artifact and `shadowGameplayCapabilityLock` as a non-required skipped/present shadow artifact in artifact index, acceptance and Workbench Runtime evidence.

Phase result:

- Phase C3 resolver / exact-lock shadow artifacts are closed.
- Real current side-scrolling runs produce a blocked resolver shadow report and do not produce a shadow lock, because the profile is not capability-complete yet.
- Synthetic ready profiles prove the resolver can produce a profile-bound shadow exact lock without mutating the active production path.
- Step36 candidates still cannot affect production because production passes no package candidates; C3 accepts only `approvedInstalledPackages` as an explicit future input surface.
- Default capability cutover, active lock writing, runtime system manifest, modular runtime loader evidence and capability-owned QA remain out of scope for this step.
- Current next step is Phase C4 runtime manifest / modular loader evidence / capability-owned QA shadow wiring.

Validation:

```bash
npx vitest run tests/contracts/generation-capability-resolution.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
npx vitest run tests/workspace/generation-pipeline.service.test.ts --testNamePattern "side-scrolling runtime scene binding|pipeline artifact index|unsupported"
npx vitest run tests/workspace/pipeline-golden-trace.test.ts
npm run typecheck:root
npx vitest run tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/generation-capability-resolution.ts
git diff --no-index --check -- /dev/null tests/contracts/generation-capability-resolution.test.ts
git diff --no-index --check -- /dev/null docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md
```

Validation result:

- C3 contract/index/acceptance/Workbench focused suite passed: 4 files / 28 tests.
- C3 pipeline filtered suite passed: 7 tests, 24 skipped by test-name filter.
- Pipeline golden trace suite passed: 3 tests.
- `npm run typecheck:root` passed.
- Phase A+B+C1+C2+C3 unfiltered regression list passed: 17 files / 218 tests.
- `git diff --check` passed.
- The `git diff --no-index --check` commands above returned the expected new-file diff status with no whitespace/check output.

Review gate:

- Oracle C3 code review: P0/P1/P2 none; approved entering C3 docs gate.
- Deferred P3: `approvedInstalledPackages` is an explicit future input boundary, but the module does not yet verify Step36 approval/install provenance itself. Before C4/C5 production package injection, approved package source, approval artifact/hash or installed registry ref must be recorded.
- Deferred P3: the production index does not yet pass `shadowCapabilityLockPresent`; this is correct for current runs because production writes no shadow lock, but must be wired from actual resolver output when approved packages are connected.

### 6. Phase C4 Runtime Manifest / Modular Loader / Capability-owned QA Shadow Evidence

Completed time: 2026-06-19

Completed content:

- Added `generation_capability_runtime_report.json` as the runtime manifest / modular loader / capability-owned QA shadow evidence for intent-planned runs.
- Added `buildGenerationCapabilityRuntimeShadow` and `GenerationCapabilityRuntimeReportSchema`.
- Bound the C4 report to the C3 `generation_capability_resolution_report.json` hash.
- Kept C4 shadow-only: reports use `shadowMode: true`, `activeRuntimeManifestWritten: false` and `activeCapabilityQaWritten: false`.
- Current real runs without a shadow exact lock now write `runtimeManifestStatus: not_attempted_no_shadow_lock` and do not synthesize fake runtime manifest, loader report, QA plan or QA report.
- Added resolved synthetic path coverage where one shadow lock drives runtime manifest owner checks, Phaser modular loader plan, capability QA plan and capability QA report.
- Added manifest/lock mismatch blocking so runtime evidence is `blocked`, not `observed`, when manifest owners do not match the exact shadow lock.
- Added `generationCapabilityRuntimeReport` as a required artifact and the four shadow runtime/QA artifacts as non-required skipped/present refs in artifact index, acceptance and Workbench Runtime evidence.

Phase result:

- Phase C4 runtime manifest / modular loader / capability-owned QA shadow evidence is closed.
- Real current side-scrolling runs remain blocked/skipped at C4 because C3 has no shadow lock.
- Synthetic resolved path proves runtime manifest, loader and capability-owned QA can be evaluated against the same profile-bound shadow lock.
- C4 still does not write active runtime manifest, active QA evidence, active lock, runtime template output or default capability path.
- Current next step is Phase D Step36 gap escalation and candidate install boundary wiring.

Validation:

```bash
npx vitest run tests/contracts/generation-capability-runtime.test.ts
npx vitest run tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-resolution.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
npx vitest run tests/workspace/generation-pipeline.service.test.ts --testNamePattern "side-scrolling runtime scene binding|pipeline artifact index|unsupported"
npx vitest run tests/workspace/pipeline-golden-trace.test.ts
npm run typecheck:root
npx vitest run tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/generation-capability-runtime.ts
git diff --no-index --check -- /dev/null tests/contracts/generation-capability-runtime.test.ts
git diff --no-index --check -- /dev/null docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md
```

Validation result:

- C4 contract suite passed: 4 tests.
- C4 contract/index/acceptance/Workbench focused suite passed: 5 files / 32 tests.
- C4 pipeline filtered suite passed: 7 tests, 24 skipped by test-name filter.
- Pipeline golden trace suite passed: 3 tests.
- `npm run typecheck:root` passed.
- Phase A+B+C1+C2+C3+C4 unfiltered regression list passed: 18 files / 222 tests.
- `git diff --check` passed.
- The `git diff --no-index --check` commands above returned the expected new-file diff status with no whitespace/check output.

Review gate:

- Oracle C4 first code review: P0/P1/P2 none; P3 found manifest/lock mismatch could still report runtime evidence as `observed`.
- Follow-up fix: `runtimeEvidenceStatus` now includes `blocked`, and non-empty blockers prevent `observed` even if QA sub-report passes.
- Oracle C4 follow-up review: P0/P1/P2 none; the mismatch evidence P3 is closed and Phase C4 is approved for documentation.
- Deferred P3: production index flags for `shadowRuntimeSystemManifestPresent`, `shadowRuntimeLoaderReportPresent`, `shadowCapabilityQaPlanPresent` and `shadowCapabilityQaReportPresent` are not yet driven from actual output. Current production writes none of these files, so skipped is correct; future approved-package runtime wiring must set them from resolver/runtime output or file existence.

### 7. Phase D Step36 Gap Escalation / Candidate Install Boundary

Completed time: 2026-06-19

Completed content:

- Added `generation_capability_gap_report.json` as the Step36 gap escalation / candidate install boundary evidence for intent-planned runs.
- Added `buildGenerationCapabilityGapReport` and `GenerationCapabilityGapReportSchema`.
- Bound the D report to the C2 registry/readiness, C3 resolution and C4 runtime report hashes.
- Recorded `capabilityPathGate`, `gapStatus`, `providerInvocationPolicy`, `step36EscalationStatus`, missing required capability ids, missing registry aliases, resolver missing capabilities and runtime evidence blockers.
- Locked production install policy in the report: resolver package namespace is the active immutable registry snapshot, uninstalled Step36 candidates are forbidden, approved-but-not-installed candidates are forbidden, and installed packages require a new registry snapshot plus a new run.
- Locked production mutation in the report: generation does not mutate the active registry, does not mutate the active exact lock and does not allow fixed-template fallback on capability gaps.
- Added explicit attempted-candidate-package rejection evidence so a future caller cannot silently pass sandbox/verified/approved-but-not-installed packages into the production gap boundary.
- Wired the production pipeline to write the gap report immediately after C4 runtime shadow evidence and before model DSL invocation.
- Added `generationCapabilityGapReport` as a required artifact in valid, invalid DSL, unsupported intent, model-generation-failed and compile-failed artifact indexes.
- Added the report to acceptance checked artifacts and Workbench Runtime evidence grouping.

Phase result:

- Phase D gap escalation report and candidate install boundary wiring are implemented and verified.
- Real current side-scrolling runs now record a required capability gap before provider invocation, including `telemetry.gameplay_events.v1`; they remain explicit `legacy_template_v1` actual runs until later cutover phases change default path behavior.
- Unsupported intents remain `fail_closed_unsupported_intent` and do not route into Step36 synthesis.
- D does not install packages, does not write active locks, does not mutate registry state and does not convert legacy execution into default capability execution.
- Strict `BLOCKED_CAPABILITY_GAP` runtime status, explicit escalation API and post-install new-run resume remain later cutover work; this step records the required per-run gap evidence and install boundary.
- Current next step is Phase E shadow / parity / canary wiring.

Validation:

```bash
npx vitest run tests/contracts/generation-capability-gap.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts
npx vitest run tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-golden-trace.test.ts
npm run typecheck:root
npx vitest run tests/contracts/generation-capability-gap.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/generation-capability-gap.ts
git diff --no-index --check -- /dev/null tests/contracts/generation-capability-gap.test.ts
```

Validation result:

- D contract/index/acceptance/Workbench focused suite passed: 4 files / 27 tests.
- D pipeline/golden trace suite passed: 2 files / 34 tests.
- `npm run typecheck:root` passed.
- Phase A+B+C1+C2+C3+C4+D unfiltered regression list passed: 19 files / 225 tests.
- `git diff --check` passed.
- The `git diff --no-index --check` commands above returned the expected new-file diff status with no whitespace/check output.

Review gate:

- Oracle Phase D code/docs review: P0/P1/P2 none; Phase D approved for closure.
- Deferred P3: `approvedInstalledPackages` remains a future input surface in `generation-capability-resolution.ts`. Production does not pass this input and D forbids uninstalled / approved-but-not-installed candidates, so Phase D remains closed. Before package provenance is connected in a later phase, this input must become an installed-registry-snapshot input or validate approval/install hashes.

### 8. Phase E Shadow / Parity / Canary Cutover Gate

Completed time: 2026-06-19

Completed content:

- Added `generation_capability_cutover_report.json` as the shadow/parity/canary cutover gate evidence for intent-planned runs.
- Added `buildGenerationCapabilityCutoverReport`, `GenerationCapabilityCutoverReportSchema`, `buildGenerationCapabilityRollbackDrillReport` and `LegacyExecutionAuthorizationSchema`.
- Bound the E report to the Phase D gap report hash and Phase C4 runtime report hash.
- Kept the production cutover gate conservative: `targetPath` is `capability_composed_v1`, but `defaultCutoverAllowed`, `activePathMutation` and `shadowOutputMutation` are fixed `false`.
- Recorded blocked states for unresolved gap, missing runtime evidence, unresolved parity and missing/failed rollback drills.
- Reused the Step35 run-and-gun parity and migration report contract as the comparable side-scrolling shadow evidence source.
- Added rollback drill evidence requiring an explicitly authorized legacy run, a new rollback run id, preserved historical artifacts, labeled legacy output, no registry mutation and preserved exact lock.
- Added a synthetic resolved side-scrolling path proving candidate canary readiness is reached only after capability gap, runtime evidence, parity and rollback gates pass.
- Added evidence identity checks so cutover readiness cannot be assembled from a different project, run, genre, profile, runtime-report hash or rollback source run.
- Added rollback authorization time-window validation so `expiresAt` must be after `createdAt`.
- Added negative tests for parity failure, rollback reuse of the source run id, cross-run/cross-profile evidence reuse and invalid rollback authorization time windows.
- Wired the production pipeline to write the cutover report after the gap report and before model DSL invocation.
- Added `generationCapabilityCutoverReport` as a required artifact in valid, invalid DSL, unsupported intent, model-generation-failed and compile-failed artifact indexes.
- Added the report to acceptance checked artifacts and Workbench Runtime evidence grouping.

Phase result:

- Phase E shadow/parity/canary cutover gate is implemented and verified.
- Real current side-scrolling runs still report `blocked_by_gap` and `candidateCanaryStatus: not_started_gap_blocked`; they do not silently enter canary or default cutover.
- Synthetic resolved side-scrolling evidence can reach `candidate_canary_ready`, but default production cutover remains false until Phase F final closure and human/default switch evidence exist.
- Legacy rollback is modeled as explicit authorization plus a new legacy run, not an in-place rewrite of existing capability evidence.
- Cross-run or cross-profile evidence now reports `blocked_by_evidence_identity` and cannot expose comparable/canary-ready capability evidence.
- Runtime evidence must carry the same profile id as the gap report before canary readiness can be considered.
- E does not install Step36 packages, does not write active locks, does not mutate runtime output and does not change the current actual production path away from `legacy_template_v1`.
- Current next step is Phase F final closure report / full validation / final Oracle gate.

Validation:

```bash
npx vitest run tests/contracts/generation-capability-cutover.test.ts
npx vitest run tests/contracts/generation-capability-cutover.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-golden-trace.test.ts
npm run typecheck:root
npx vitest run tests/contracts/generation-capability-cutover.test.ts tests/contracts/generation-capability-gap.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts
git diff --check
```

Validation result:

- E cutover contract suite passed: 1 file / 6 tests.
- E contract/index/acceptance/Workbench/pipeline focused suite passed: 6 files / 64 tests.
- `npm run typecheck:root` passed.
- Phase A+B+C1+C2+C3+C4+D+E unfiltered regression list passed: 20 files / 231 tests.
- `git diff --check` passed.

Review gate:

- Oracle first Phase E review: P0 none; P1 found cutover readiness could be assembled from another run/profile's evidence; P2 found rollback authorization `expiresAt` / `createdAt` was not validated.
- Follow-up fix: cutover reports now block cross-project, cross-run, cross-genre, cross-profile, runtime hash mismatch and rollback-source mismatch evidence with `blocked_by_evidence_identity`; rollback drills now fail invalid authorization time windows.
- Oracle follow-up review: P0/P2/P3 none; residual P1 found runtime evidence could omit `profileId` while the gap/migration profile matched.
- Residual P1 fix: gap-profiled cutover reports now require runtime evidence to carry the same `profileId`; missing runtime profile evidence is blocked as `evidence_identity_mismatch:runtime_profile`.
- Oracle final follow-up review: P0/P1/P2/P3 none; residual P1 is closed and Phase E is approved for closure.

### 9. Phase F Final Closure Report / Fail-closed Gate

Completed time: 2026-06-19

Completed content:

- Added `step37_final_closure_report` contract and deterministic report builder.
- Added 13 final acceptance ids matching the user-facing Step37 acceptance matrix.
- Added required evidence refs for artifact index, generation path receipt, GameBrief v0.2, scope plan, Scene IR authority/coverage, capability gap, cutover, runtime, exact lock, runtime manifest, capability QA, reference QA and Oracle gate.
- Added validation receipts for Step37 final closure tests, A-F regression, Step36 synthesis regression, root typecheck and diff check.
- Added no-index validation receipts for new Phase F files and this untracked docs file.
- Added final Oracle gate hash binding with `P0=0` and unresolved `P1=0` requirements.
- Added acceptance-to-evidence binding so each of the 13 acceptance checks must point to an allowed required evidence path or hash.
- Kept positive fixture helpers inside tests only; production exports only the builder, constants and types, not fake complete-evidence generators.
- Added validation freshness checks using explicit `evaluatedAt` and `maxValidationAgeMs`.
- Capped validation freshness windows with a fixed 24h maximum.
- Added reference regression checks for 5 platforms, 3 waves, 1 pickup, win target 3800, real `enemy.fired`, build pass and capability-owned QA pass.
- Added tests proving the report can close only with complete positive evidence and blocks current A-E state instead of falsely declaring Step37 closed.
- Added tests for missing/duplicate/invalid evidence, missing hash/producer/parent lineage, failed/stale validation receipts, reference failure, Oracle failure and deterministic hashes.

Phase result:

- Phase F final closure gate is implemented and verified.
- Current truthful final closure status remains `blocked`, not `closed`.
- The known blocking final acceptance items are default `capability_composed_v1` production cutover, active runtime manifest bound to an exact lock, real capability-owned `enemy.fired` runtime evidence, and final build/capability-owned QA pass on the active capability path.
- This preserves Step37's final definition without fabricating default cutover or runtime evidence.

Validation:

```bash
npx vitest run tests/contracts/step37-final-closure.test.ts
npm run typecheck:root
npx vitest run tests/contracts/step37-final-closure.test.ts tests/contracts/generation-capability-cutover.test.ts tests/contracts/generation-capability-gap.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts
npx vitest run tests/contracts/capability-synthesis-policy.test.ts tests/contracts/capability-synthesis-scaffold.test.ts tests/contracts/capability-synthesis-lifecycle.test.ts tests/contracts/capability-synthesis-verification.test.ts
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/step37-final-closure.ts
git diff --no-index --check -- /dev/null tests/contracts/step37-final-closure.test.ts
git diff --no-index --check -- /dev/null docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md
```

Validation result:

- Phase F final closure contract suite passed: 1 file / 5 tests.
- Phase F final closure contract suite after Oracle P1 fixes passed: 1 file / 6 tests.
- Phase F final closure contract suite after validation-window cap passed: 1 file / 7 tests.
- `npm run typecheck:root` passed.
- Phase A+B+C1+C2+C3+C4+D+E+F unfiltered regression list passed: 21 files / 237 tests.
- Phase A+B+C1+C2+C3+C4+D+E+F unfiltered regression list after validation-window cap passed: 21 files / 238 tests.
- Step36 synthesis regression subset passed: 4 files / 64 tests.
- `git diff --check` passed.
- Phase F `git diff --no-index --check` commands for new source, new test and docs returned expected new-file status with no whitespace/check output.

Review gate:

- Oracle first Phase F review: P0 none; P1 found production-exported `complete*` helpers could fabricate `closed`, and acceptance checks were not bound to required evidence path/hash; P2 requested no-index validation receipts and validation freshness/lineage.
- Follow-up fix: production no longer exports or contains complete fixture helpers; tests own the fixtures; each acceptance id is mapped to allowed evidence kinds and must reference an allowed evidence path or hash; required validation commands now include no-index checks; validation receipts must fit an explicit freshness window.
- Oracle follow-up review: P0/P1/P3 none; P2 found validation freshness still depended on an unbounded caller-supplied `maxValidationAgeMs`.
- P2 fix: `STEP37_FINAL_MAX_VALIDATION_AGE_MS` caps the window at 24h, and over-wide caller windows now fail with `STEP37_FINAL_VALIDATION_STALE`.
- Oracle final follow-up review: P0/P1/P2/P3 none; remaining P2/P3 are closed and Phase F final closure gate is approved.
