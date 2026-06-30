# Step 37 — Capability-first Authoritative Generation Pipeline Cutover

Status: COMPLETE — GLOBAL EXIT CONDITIONS MET
Oracle Review: PASS
Production Default Cutover: ACTIVE
Legacy Authoritative Path: EXITED
Final Closure: NOT BLOCKED
Workspace Documentation: RECONCILED
Documentation Reconciliation Oracle: APPROVED_FOR_RECEIPT
Date: 2026-06-27
Source draft: `/Users/dahufa/Documents/workspace/step37_capability_first_authoritative_generation_pipeline_cutover.md`

This repository file is the durable execution log. The source draft path above is historical input, not a runtime dependency.

## Closure Attempts

- `closure-attempt-001`: HISTORICAL_BLOCKED. Step37 A-F contracts and gates were implemented and Oracle-reviewed on 2026-06-19, but production default cutover was not active and active capability-composed runtime evidence did not yet exist.
- `closure-attempt-002`: CLOSED. Stage11 production default cutover, Stage12 legacy authoritative path exit and Stage13 final closure receipts close the production-path closure while preserving lineage to `closure-attempt-001`.
  - Stage11 production default cutover receipt: `f3250c18d4f44d2450478cbb79f990a0cf0e87d4`.
  - Stage12 legacy authoritative path exit receipt: `03ba00f9ae23779e558bca40730a58073a083132`.
  - Stage13 final closure receipt: `82972f4d51545fd9b708eaf4f64edd0d515506fd`.
  - Stage13 reviewed candidate: `afabbf4c46c4333e96e46599e6da619cbc880650`.
  - Stage13 Oracle result: `APPROVED_FOR_RECEIPT`, P0/P1/P2/P3 = 0/0/0/0.
  - Documentation reconciliation candidate: `dd91c708e9e6aec1bf59d5497bb1e4abb5b7f148`.
  - Documentation reconciliation Oracle submission: `019f0948-e97a-7211-8840-40ad2c3bbcaa`.
  - Documentation reconciliation Oracle agent: `019f0813-ed9a-7ad0-8341-50ababd44fea`.
  - Documentation reconciliation Oracle result: `APPROVED_FOR_RECEIPT`, P0/P1/P2/P3 = 0/0/0/0.
  - Documentation reconciliation receipt: `external_git_history_only_not_embedded`.
  - Parent Loop Driver receipt result: `COMPLETE_GLOBAL_LOOP` with `global_exit_conditions_met=true`, `user_input_required=false` and `next_atomic_step=none`.

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

## Compatibility & Cutover Check

Global rule added during Step37: a schema or producer artifact passing validation is not enough to mark a Step complete. Every Step that changes a producer contract must name its downstream consumers, compatibility disposition, authority artifact, legacy strategy, fail-closed policy, runtime evidence and rollback path.

Disposition vocabulary:

```ts
type CompatibilityDisposition =
  | "LOSSLESS_COMPATIBLE"
  | "ADAPTER_REQUIRED"
  | "NEW_CONSUMER_REQUIRED"
  | "LEGACY_FORBIDDEN";
```

Step37 final disposition after Stage13: `LEGACY_FORBIDDEN` for silent legacy authority or fallback; the capability-composed path is the active production default.

| Check | Step37 answer |
| --- | --- |
| Producer change | `GameBrief v0.2`, `GenerationScopePlan`, generation path receipt, capability readiness/resolution/runtime/gap/cutover reports, Scene IR authority/coverage reports, production cutover receipt, legacy exit receipt and final closure report were added or changed. |
| Consumer list | Brief ingress, provider projection, generation pipeline, capability resolver, DSL normalizer, compiler, Scene IR builder, runtime template/loader, Workbench evidence client, QA and final closure evaluator. |
| Compatibility type | `LEGACY_FORBIDDEN` for silent fixed-template fallback or legacy authority; the capability-composed path is the production default and legacy may only appear as explicit, auditable rollback or migration evidence. |
| Authority | Play-time intent authority is `GameBrief v0.2`; actual path authority is `generation_path_receipt.json`; gameplay domain authority is `scene_ir_authority_report.json`; active runtime authority is exact capability lock plus runtime system manifest; final closure authority is the Stage13 final closure receipt. |
| Legacy strategy | Legacy authoritative path exited in Stage12. Legacy remains auditable and rollbackable only through explicit authorization and must not be treated as the Step37 production target path. |
| Failure policy | If no consumer can preserve the new semantics, the run must fail closed with explicit evidence such as `LEGACY_DSL_NONREPRESENTABLE`, `BLOCKED_CAPABILITY_GAP` or final closure `blocked`, instead of shortening play time or deleting gameplay. |
| Evidence | Stage11, Stage12 and Stage13 receipts bind same-run active path receipt, exact lock, runtime manifest, module load receipt, capability-owned telemetry, capability QA, build, parity, rollback, Oracle approval and final closure to the current completed Step37 loop. |
| Rollback | Rollback must create a new explicitly authorized legacy run with lineage to the source run and preserved evidence; it must not rewrite the original run or drop new semantics in place. |

Historical diagnostic note superseded by Stage11-13 receipts:

- `proj_20260619_122107_9840` proved `GameBrief v0.2` can produce `play_time_intent` range `480..720`, but Raw DSL v0.1 cannot consume it. Commit 1 supersedes the earlier `FALLBACK_UNSUPPORTED` wording with `LEGACY_DSL_NONREPRESENTABLE`.
- `proj_20260619_122635_e351` produced `game_dsl.json`, but `generation_path_receipt.json` recorded `selectedPath: legacy_template_v1`; the DSL source remained Raw DSL v0.1 with `target_play_time_sec: 120`, so this was not a completed `capability_composed_v1` cutover at that historical checkpoint.

## Production Realization Stages

Step37 continues after A-F. Do not open Step38 for this work.

### 37.G — Active Capability DSL Generation

Implement model-facing `CapabilityGameDslDraft v1`, trusted `CanonicalGameDsl v0.2`, composed schema identity, progression planning and artifact separation:

- model output: `capability-game-dsl-draft.raw.json`;
- trusted authority: `canonical-game-dsl-v0.2.json`;
- schema evidence: `composed-game-dsl-schema.json`;
- normalization evidence: `game-dsl-normalization-report.json`;
- legacy artifacts: `legacy-raw-game-dsl-v0.1.raw.json` and `legacy-game-dsl-v1.json`.

Model drafts must not fabricate registry snapshot hashes, exact locks, package versions, runtime manifest hashes or trusted artifact refs.

### 37.H — Capability IR and Runtime Manifest Consumption

Complete only the reference `side_scrolling_run_and_gun.v1` capability set first. Required output:

- `resolved-capability-graph.json`;
- `gameplay-capability-lock.json`;
- `capability-ir.json`;
- `runtime-plan.generated.json`;
- `runtime-system-manifest.json`;
- `runtime-module-load-receipt.json`.

The runtime manifest must derive deterministically from the exact lock, and the runtime loader must prove that loaded module order, version and hash match the manifest and lock.

### 37.I — Runtime Evidence, Canary and Parity

The same run must prove that enemy firing is capability-owned:

- exact lock contains the enemy firing package;
- runtime manifest contains the enemy firing module;
- runtime loader loads the module;
- Scene IR has a reachable enemy wave;
- enemy enters firing state and creates a projectile;
- runtime emits real `enemy.fired`;
- QA captures the real event with run, lock, manifest, module, capability id and version.

Fixture emits, QA harness injected events, manifest-only producers, unreachable scenes and copied legacy telemetry do not satisfy evidence.

### 37.J — Default Cutover and Final Closure

Run canary first with `CAPABILITY_COMPOSED_V1_ENABLED=true` and `CAPABILITY_COMPOSED_V1_DEFAULT=false`. Compare legacy and capability runs for gameplay semantics, Scene IR coverage, runtime plan, objectives, runtime events, build, QA and rollback.

Only after canary, parity and rollback pass may `CAPABILITY_COMPOSED_V1_DEFAULT=true` become the default. If the capability path is not ready and legacy was not explicitly authorized, the pipeline must fail closed with `CAPABILITY_COMPOSED_PATH_NOT_READY`.

## Recommended Production Implementation Sequence

1. `feat(game-dsl): classify legacy DSL representability`
   - Mark Raw Game DSL v0.1 as legacy.
   - Add `LegacyRepresentabilityResult`.
   - Test range, endless and unspecified as nonrepresentable.
   - Correct failure code and event stage so representability blocks are not model failures.
2. `feat(game-dsl): add capability-backed DSL draft contract`
   - Add `CapabilityGameDslDraft v1`, composed schema identity, progression plan, segment duration targets, arbitrary script prohibition and contract tests.
3. `feat(game-dsl): add canonical capability game DSL`
   - Add Canonical Game DSL v0.2, trusted brief/lock/schema bindings, draft to canonical normalizer and raw vs authoritative artifact separation.
4. `feat(compiler): compile canonical capability DSL into runtime plans`
   - Add Capability IR, Runtime Plan, Scene IR authority, progression segment realization and runtime manifest.
5. `test(runtime): prove active capability-composed gameplay realization`
   - Prove active exact lock, active runtime manifest, real `enemy.fired`, capability-owned QA, build pass and same-run evidence identity.
6. `feat(pipeline): make capability-composed generation the default`
   - Execute only after canary, parity and rollback evidence all pass.

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
- Follow-up fix: mixed v0.2 fields now fail closed, prompt uses one-of examples and forbids `target_play_time_sec`, long/endless/unspecified v0.2 intents originally returned `FALLBACK_UNSUPPORTED` before legacy Raw DSL model invocation, and short v0.2 target projection is covered. Commit 1 supersedes that failure code with `LEGACY_DSL_NONREPRESENTABLE`.
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

### 10. 37.G Commit 1 — Legacy DSL Representability Classification

Completed time: 2026-06-19

Completed content:

- Added repository-global `Compatibility & Cutover` rule in `AGENTS.md`.
- Recorded Step37 37.G-J production realization stages and the six-commit implementation sequence.
- Marked Raw Game DSL v0.1 as a legacy bounded dialect with exported min/max target play-time constants.
- Added `LegacyRepresentabilityResult`, `CompatibilityDisposition` and `classifyLegacyRawGameDslRepresentability`.
- Classified v0.1 briefs as `LOSSLESS_COMPATIBLE`, short v0.2 target intents as `ADAPTER_REQUIRED`, and long target/range/endless/unspecified v0.2 intents as `NEW_CONSUMER_REQUIRED`.
- Replaced provider-side `FALLBACK_UNSUPPORTED` for legacy play-time loss with `LEGACY_DSL_NONREPRESENTABLE`.
- Extended `generation_path_receipt.json` so blocked preconditions can record `selectedPath: blocked`, `targetPath`, `legacyRepresentable` and `blocker` without writing `modelFailureCode`.
- Changed the pipeline event for legacy nonrepresentability from `model.failed` to `dsl.blocked_precondition`.
- Added a dedicated DSL precondition blocked artifact index path so artifact index and acceptance report use `dsl_precondition_blocked_*` reasons instead of `model_generation_failed_*`.

Compatibility & Cutover:

| Check | Commit 1 answer |
| --- | --- |
| Producer change | Raw DSL v0.1 legacy constants, representability classifier, provider failure code, generation path receipt fields and artifact-index skip reasons. |
| Consumer list | Provider legacy projection, generation pipeline failure handler, generation path receipt parser, artifact index, acceptance report, Workbench evidence and tests. |
| Compatibility type | `LOSSLESS_COMPATIBLE` for existing v0.1 briefs, `ADAPTER_REQUIRED` for short v0.2 target intents, `NEW_CONSUMER_REQUIRED` for long target/range/endless/unspecified. |
| Authority | `GameBrief v0.2` remains play-time authority; `generation_path_receipt.json` is actual path/blocker authority. |
| Legacy strategy | Legacy Raw DSL v0.1 remains available only when representable; nonrepresentable intents block instead of shortening to 120 seconds. |
| Failure policy | Nonrepresentable legacy projection writes `LEGACY_DSL_NONREPRESENTABLE`, `selectedPath: blocked`, `legacyRepresentable: false` and `dsl.blocked_precondition`. |
| Evidence | Provider, receipt, artifact-index, acceptance and pipeline tests prove the blocked path is not reported as model failure. |
| Rollback | No rollback behavior changed in this commit; legacy rollback remains governed by Phase E/F authorization and lineage rules. |

Phase result:

- Commit 1 is implemented and verified.
- Step37 remains open: no CapabilityGameDslDraft, Canonical Game DSL v0.2, active exact lock, runtime manifest, active module load receipt, real capability-owned `enemy.fired`, canary, parity, rollback or default cutover has been implemented in this commit.
- Current next step is 37.G Commit 2: add the capability-backed DSL draft contract.

Validation:

```bash
npx vitest run tests/contracts/legacy-raw-game-dsl-representability.test.ts tests/contracts/generation-path-receipt.test.ts tests/workspace/game-dsl-provider.test.ts tests/workspace/generation-pipeline.service.test.ts tests/workspace/pipeline-artifact-index.test.ts
npm run typecheck:root
git diff --check
git diff --no-index --check -- /dev/null AGENTS.md
git diff --no-index --check -- /dev/null packages/game-dsl/src/schemas/legacy-raw-game-dsl-representability.ts
git diff --no-index --check -- /dev/null tests/contracts/legacy-raw-game-dsl-representability.test.ts
```

Validation result:

- Commit 1 focused contract/workspace suite passed: 5 files / 120 tests.
- `npm run typecheck:root` passed.
- `git diff --check` passed.
- New-file no-index whitespace checks for `AGENTS.md`, `legacy-raw-game-dsl-representability.ts` and `legacy-raw-game-dsl-representability.test.ts` passed.

Review gate:

- Oracle first Commit 1 review: P0 none; P1 found `LEGACY_DSL_NONREPRESENTABLE` still reused `model_generation_failed_*` artifact-index / acceptance reasons; P2 found pipeline tests did not cover artifact index / acceptance report and the Phase A history still exposed old `FALLBACK_UNSUPPORTED` wording without supersession.
- Follow-up fix: added `buildDslPreconditionBlockedPipelineArtifactIndex`, changed the pipeline to write `dsl_precondition_blocked_*` reasons, added artifact index and acceptance report assertions, and marked the old Phase A wording superseded by `LEGACY_DSL_NONREPRESENTABLE`.
- Oracle follow-up review: P0/P1/P2/P3 none; Commit 1 approved for closure.

### 11. 37.G Commit 2 — Capability-backed DSL Draft Contract

Completed time: 2026-06-19

Completed content:

- Added `CapabilityGameDslDraft v1` as the model-owned draft contract at `capability-game-dsl-draft.raw.json`.
- Added draft support for play-time intent, progression segments, duration targets, scenes, entities, behaviors, waves, pickups, objectives, boss phases and capability-owned config.
- Preserved long/range play-time semantics by requiring range `play_time_intent` to match `progression.estimated_total_sec`; the reference fixture preserves `480..720` instead of collapsing to `120`.
- Added system-owned composed schema identity with sorted capability ids and deterministic hash verification.
- Reused declarative JSON guards for capability config, trigger and condition payloads so arbitrary script-like keys remain forbidden.
- Added draft-level trusted evidence guards so model output cannot claim exact locks, registry snapshots, package versions, runtime manifests, module load receipts, QA/build/canary/parity/rollback/default-cutover status or trusted artifact refs.
- Added local reference validation for scene segment/entity refs, behavior owners, wave segment/enemy refs, pickup refs and boss refs before canonical normalization.
- Added contract tests covering reference run-and-gun draft shape, 3 waves, 1 pickup, win target 3800, boss phases, forbidden script keys, forbidden trusted evidence, undeclared capability refs, duplicate capabilities, disconnected local refs and composed schema identity determinism.

Compatibility & Cutover:

| Check | Commit 2 answer |
| --- | --- |
| Producer change | New `CapabilityGameDslDraft v1` model-output artifact and system-owned `composed_game_dsl_schema` identity contract. |
| Consumer list | Future composed-schema prompt builder, draft parser, trusted draft-to-canonical normalizer, capability compiler and final closure evidence index. No runtime consumer is wired in this commit. |
| Compatibility type | `NEW_CONSUMER_REQUIRED`; Raw Game DSL v0.1 cannot consume this artifact, and this commit intentionally adds no legacy adapter. |
| Authority | Draft is only candidate model intent. It is not authoritative gameplay output; Commit 3 canonical DSL must become authority after binding trusted brief, lock and schema evidence. |
| Legacy strategy | Legacy artifacts remain separate. This commit does not modify `legacy_template_v1` or authorize legacy fallback. |
| Failure policy | Draft parse failures, trusted-evidence claims, unsafe declarative keys, undeclared capability refs and disconnected local refs fail closed at schema parse time. |
| Evidence | Contract tests prove parse acceptance and rejection behavior. No active runtime, QA, canary, parity, rollback or default-cutover evidence is produced by this commit. |
| Rollback | No production path changes exist to roll back. Later cutover rollback must still create explicit legacy runs with lineage and preserved evidence. |

Phase result:

- Commit 2 is implemented and verified as a model draft contract only.
- Step37 remains open: no Canonical Game DSL v0.2, trusted draft-to-canonical normalizer, active exact lock, runtime manifest, module load receipt, real capability-owned `enemy.fired`, canary, parity, rollback or default cutover has been implemented in this commit.
- Current next step is 37.G Commit 3: add the canonical capability Game DSL v0.2 and trusted draft-to-canonical normalizer.

Validation:

```bash
npx vitest run tests/contracts/capability-game-dsl-draft-v1.test.ts
npm run typecheck:root
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/schemas/capability-game-dsl-draft-v1.schema.ts
git diff --no-index --check -- /dev/null tests/contracts/capability-game-dsl-draft-v1.test.ts
```

Validation result:

- Commit 2 draft contract suite passed: 1 file / 11 tests.
- `npm run typecheck:root` passed.
- `git diff --check` passed.
- New-file no-index whitespace checks for `capability-game-dsl-draft-v1.schema.ts` and `capability-game-dsl-draft-v1.test.ts` passed.

Review gate:

- Oracle first Commit 2 review: P0 none; P1 found draft `metadata` still allowed active/cutover evidence claims and Step37 docs had not recorded the new producer contract; P2 found composed schema identity parsed regex-only hashes and local segment/entity refs were not validated.
- Follow-up fix: metadata is now a strict no-evidence object; forbidden evidence keys include active runtime, canary, parity, rollback, QA/build and default-cutover claims; composed schema identity rechecks deterministic hash; draft parser validates local refs before canonical normalization; Step37 docs now record Commit 2 Compatibility & Cutover.
- Oracle follow-up review: P0/P3 none; residual P1 found combined keys such as `activeRuntimeEvidence`, `canaryReady`, `buildStatus`, `qaStatus` and `moduleLoadStatus` could bypass exact forbidden-key matching; residual P2 found `capability_configs[*].applies_to[*]` was still an unchecked local reference.
- Residual fix: forbidden evidence detection now blocks exact keys, evidence/cutover substrings and active/status-style key combinations; `capability_configs.applies_to` refs are validated against declared entities and covered by contract tests.
- Oracle second follow-up review: P0/P2/P3 none; residual P1 found space-separated keys such as `runtime manifest hash`, `capability lock hash` and `trusted artifact refs` could bypass normalization.
- Residual P1 fix: evidence-key normalization now removes every non-alphanumeric separator before matching, and contract tests cover space-separated trusted evidence keys.
- Oracle final Commit 2 review: P0/P1/P2/P3 none; residual P1 is closed and Commit 2 is approved for closure.

### 12. 37.G Commit 3 — Canonical Capability Game DSL

Completed time: 2026-06-19

Completed content:

- Added `CanonicalGameDsl v0.2` as the trusted authoritative DSL artifact at `canonical-game-dsl-v0.2.json`.
- Added `game_dsl_normalization_report.v0.2` at `game-dsl-normalization-report.json`.
- Added trusted source binding fields for `game_brief_hash`, `profile_resolution_hash`, `capability_lock_hash`, `composed_schema_hash` and `draft_hash`.
- Added `normalizeCapabilityGameDslDraftToCanonicalV02` to parse `CapabilityGameDslDraft v1`, exact `gameplay_capability_lock`, and composed schema identity before canonical output is allowed.
- Required draft profile, exact lock profile and composed schema profile to match.
- Required draft capability ids, exact lock capability ids and composed schema capability ids to match as the canonical authority boundary.
- Recomputed exact lock hash before trusting it.
- Preserved `play_time_intent` range `480..720` and progression duration targets in canonical output.
- Carried model-authored behaviors/configs into canonical `systems` without producing Runtime Plan or runtime manifest.
- Separated raw model artifact, authoritative canonical artifact and legacy artifacts in the normalization report.
- Added contract tests proving canonical normalization success, raw/authoritative/legacy artifact separation, capability-set blocking, profile/hash blocking and deterministic report hashes.

Compatibility & Cutover:

| Check | Commit 3 answer |
| --- | --- |
| Producer change | New authoritative `CanonicalGameDsl v0.2` and `game_dsl_normalization_report.v0.2` artifacts. |
| Consumer list | Future capability IR compiler, runtime plan compiler, Scene IR authority builder, runtime manifest builder, Workbench artifact index and final closure evaluator. No runtime consumer is wired in this commit. |
| Compatibility type | `NEW_CONSUMER_REQUIRED`; legacy Raw DSL and legacy normalized `game-dsl.v1` are explicitly separate artifacts and cannot consume canonical v0.2 directly. |
| Authority | `canonical-game-dsl-v0.2.json` becomes authoritative gameplay DSL only after trusted normalizer binds brief, profile resolution, exact lock, composed schema and raw draft hashes. Raw draft remains candidate input. |
| Legacy strategy | Legacy artifacts are named as `legacy-raw-game-dsl-v0.1.raw.json` and `legacy-game-dsl-v1.json`; this commit does not route active generation to either one. |
| Failure policy | Invalid draft, invalid lock, invalid composed schema, profile mismatch, stale lock hash or capability-set mismatch blocks normalization and omits canonical artifact hash. |
| Evidence | Contract tests prove normalization and fail-closed source binding. No active runtime, QA, canary, parity, rollback or default-cutover evidence is produced by this commit. |
| Rollback | No production path changes exist to roll back. Later rollback must still create explicit legacy runs rather than rewriting canonical artifacts. |

Phase result:

- Commit 3 is implemented and verified as a canonical DSL contract and trusted normalizer only.
- Step37 remains open: no Capability IR compiler, Runtime Plan, runtime manifest, module load receipt, real capability-owned `enemy.fired`, canary, parity, rollback or default cutover has been implemented in this commit.
- Current next step is 37.H Commit 4: compile canonical capability DSL into Runtime Plans.

Validation:

```bash
npx vitest run tests/contracts/game-dsl-v0.2.test.ts
npm run typecheck:root
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/schemas/game-dsl-v0.2.schema.ts
git diff --no-index --check -- /dev/null tests/contracts/game-dsl-v0.2.test.ts
```

Validation result:

- Commit 3 canonical DSL contract suite passed: 1 file / 7 tests.
- `npm run typecheck:root` passed.
- `git diff --check` passed.
- New-file no-index whitespace checks for `game-dsl-v0.2.schema.ts` and `game-dsl-v0.2.test.ts` passed.

Review gate:

- Oracle first Commit 3 review: P0/P3 none; P1 found canonical `systems` dropped `capability_configs[*].applies_to`, and normalization report schema did not bind `status` to authoritative hash presence; P2 found canonical schema invalid could throw before blocked report and exact lock packages were not checked against `capabilityIds`.
- Follow-up fix: canonical config-derived systems now preserve `applies_to_entity_ids`; normalization report schema enforces normalized-with-hash and blocked-without-hash; canonical payload construction now lets outer `safeParse` produce blocked reports; exact lock packages must match locked capability ids.
- Oracle follow-up review: P0/P1/P3 none; residual P2 found `game_dsl_normalization_report.reportHash` was not recomputed by the schema.
- Residual P2 fix: normalization report schema now recomputes deterministic report hash, and contract tests reject stale `reportHash`.
- Oracle final Commit 3 review: P0/P1/P2/P3 none; residual P2 is closed and Commit 3 is approved for closure.

### 13. 37.H Commit 4 — Canonical Capability Runtime Compilation

Completed time: 2026-06-19

Completed content:

- Added `compileCanonicalCapabilityDslToRuntimePlan` as the canonical v0.2 downstream compiler boundary.
- Added `capability-ir.json`, `runtime-plan.generated.json` and `runtime-system-manifest.json` output refs.
- Added `capability_runtime_plan.v0.2` with realized progression segments, runtime system summaries and gameplay ids.
- Compiled canonical DSL into `CapabilityDrivenGameIr` without reading raw model draft output.
- Built runtime system manifest from exact lock packages using universal composition mode and `authoritativeConfig: capability_ir`.
- Added Scene IR authority report where every gameplay domain has a single owner: `canonical_game_dsl_v0.2_runtime_plan`.
- Added compiler report with blocked/compiled status, source hashes, output refs and deterministic hash.
- Added tests proving successful compilation, existing Phaser runtime loader plan consumption, exact lock/profile mismatch blocking, nested canonical capability ref blocking and runtime manifest/lock owner parity.

Compatibility & Cutover:

| Check | Commit 4 answer |
| --- | --- |
| Producer change | New canonical compilation report, Capability IR, Runtime Plan and Runtime System Manifest producer functions. |
| Consumer list | Existing Phaser runtime loader plan builder, future runtime module loader, Scene IR renderer, QA planner, Workbench artifact index and final closure evaluator. |
| Compatibility type | `NEW_CONSUMER_REQUIRED`; legacy runtime template does not consume canonical v0.2, Capability IR or runtime manifest directly. |
| Authority | `canonical-game-dsl-v0.2.json` remains semantic authority; `runtime-plan.generated.json` becomes derived gameplay runtime authority; `runtime-system-manifest.json` is derived from the exact lock. |
| Legacy strategy | No legacy path mutation. Legacy artifacts remain comparison/rollback-only. |
| Failure policy | Invalid canonical DSL, invalid/stale lock, profile/runtime mismatch, capability-set mismatch, unsupported runtime family, invalid manifest or invalid runtime plan block compilation. |
| Evidence | Contract tests prove generated IR and manifest are consumable by the existing loader planner and that manifest capability owners match the exact lock. No runtime modules are actually loaded in this commit. |
| Rollback | No production path changes exist to roll back. Later rollback must use explicit legacy authorization and lineage. |

Phase result:

- Commit 4 is implemented and verified as canonical compilation and manifest generation only.
- Step37 remains open: no real runtime module load receipt, real capability-owned `enemy.fired`, capability-owned QA, build pass, canary, parity, rollback or default cutover has been implemented in this commit.
- Current next step is 37.I Commit 5: prove active capability-composed gameplay realization.

Validation:

```bash
npx vitest run tests/contracts/canonical-capability-runtime-compiler.test.ts
npm run typecheck:root
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/canonical-capability-runtime-compiler.ts
git diff --no-index --check -- /dev/null tests/contracts/canonical-capability-runtime-compiler.test.ts
```

Validation result:

- Commit 4 canonical runtime compiler suite passed: 1 file / 9 tests.
- `npm run typecheck:root` passed.
- `git diff --check` passed.
- New-file no-index whitespace checks for `canonical-capability-runtime-compiler.ts` and `canonical-capability-runtime-compiler.test.ts` passed.

Review gate:

- Oracle first Commit 4 review: P0/P3 none; P1 found exact lock `packages[*].capabilityId` was not checked against `capabilityIds`, and wave compilation hardcoded `spawn.static.v1`; P2 found compilation report hash/status invariants were not schema-enforced and runtime plan/manifest builders could throw before blocked report handling.
- Follow-up fix: exact lock packages must match locked capability ids; wave rules are derived from canonical wave spawn capabilities and missing spawn capability blocks; compilation report schema recomputes hash and enforces compiled/blocked output invariants; runtime plan and manifest builders now return payloads for outer `safeParse` fail-closed handling.
- Oracle follow-up review: P0/P3 none; residual P1 found canonical source `capability_lock_hash` was not checked against the exact lock and duplicate package owners could bypass set comparison; residual P2 found compiled reports could omit source hashes and runtime plan `planHash` was not recomputed.
- Residual fix: compiler now requires canonical source lock hash to match the exact lock; package owner parity rejects duplicates and missing/extra packages; compiled reports require source hashes; runtime plan schema recomputes `planHash`; report hash calculation strips undefined fields instead of throwing.
- Oracle second follow-up review: P0/P2/P3 none; residual P1 found runtime system ids dropped capability version suffixes and could collide across `*.v1` / `*.v2`.
- Residual P1 fix: runtime system ids now preserve capability version suffixes, and contract tests prove `spawn.static.v1` and `spawn.static.v2` compile to distinct loader-consumable modules.
- Oracle third follow-up review: P0/P2/P3 none; residual P1 found Capability IR output ids still dropped capability version suffixes and could collide across multi-version capabilities.
- Residual P1 fix: derived Capability IR `entityComponents`, `rules` and `goals` output ids now preserve full capability ids, and versioned spawn tests assert IR rule ids remain unique.
- Oracle final Commit 4 review: P0/P1/P2/P3 none; residual P1 is closed and Commit 4 is approved for closure.

### 14. 37.I Commit 5 — Active Capability-composed Gameplay Realization Evidence

Completed time: 2026-06-19

Completed content:

- Added `active_capability_composed_gameplay_realization_report.v0.1` for same-run active capability-composed runtime evidence.
- Added `runtime_module_load_receipt.v0.1` recording active module load order, versions, lifecycle hooks and teardown.
- Added `capability_owned_telemetry_evidence.v0.1` requiring `enemy.fired` to come from a loaded runtime module with a reachable update-loop trigger.
- Added `capability_path_build_report.v0.1` binding build status to the same active run, exact lock, runtime manifest, runtime plan and loader plan identity.
- Added fail-closed realization checks for generation path receipt, exact lock hash, runtime manifest ownership, runtime module load receipt, enemy firing evidence, capability QA, build and same-run identity.
- Added an active reference contract test that compiles canonical v0.2 DSL, builds the runtime loader plan, runs `createPhaserRuntimeModuleSession`, emits `enemy.fired` from `system.combat.projectile.v1` during `update`, captures module teardown, binds QA to the real telemetry evidence hash, and records build pass evidence.
- Added negative tests proving `enemy.fired` evidence blocks without a reachable runtime update trigger and final realization blocks when capability QA is not bound to the real telemetry evidence.

Compatibility & Cutover:

| Check | Commit 5 answer |
| --- | --- |
| Producer change | New active runtime evidence producers: runtime module load receipt, capability-owned telemetry evidence, capability path build report and active gameplay realization report. |
| Consumer list | Final closure evaluator, Workbench evidence client, cutover gate, capability-owned QA reader, runtime audit tooling and future artifact index writers. |
| Compatibility type | `NEW_CONSUMER_REQUIRED`; legacy templates and shadow runtime reports do not express active module lifecycle, reachable trigger or same-run build/QA evidence. |
| Authority | Exact capability lock remains capability authority; runtime manifest is derived from that lock; runtime plan is gameplay runtime authority; module load receipt and telemetry evidence are runtime truth for active consumption. |
| Legacy strategy | No legacy path mutation and no default switch. Legacy remains explicit rollback/comparison only. |
| Failure policy | Non-capability selected path, stale hash, identity mismatch, missing lifecycle hook, missing update trigger, unloaded producer, unbound QA, failed build or manifest/lock mismatch blocks final active realization. |
| Evidence | Contract tests prove a real in-process runtime module session emits `enemy.fired` and QA consumes that telemetry evidence. This is active reference evidence, not production default canary completion. |
| Rollback | No production default was changed. Rollback remains governed by Phase E/F explicit legacy authorization and lineage. |

Phase result:

- Commit 5 active runtime evidence implementation is verified locally.
- Step37 remains open: production canary, parity, rollback and default cutover are still not executed.
- Current next step is 37.J Commit 6 only after real canary, parity and rollback evidence all pass.

Validation:

```bash
npx vitest run tests/contracts/active-capability-runtime-evidence.test.ts
npx vitest run tests/contracts/active-capability-runtime-evidence.test.ts tests/contracts/canonical-capability-runtime-compiler.test.ts tests/contracts/phaser-runtime-loader.test.ts
npm run typecheck:root
git diff --check
git diff --no-index --check -- /dev/null packages/game-dsl/src/active-capability-runtime-evidence.ts
git diff --no-index --check -- /dev/null tests/contracts/active-capability-runtime-evidence.test.ts
```

Validation result:

- Commit 5 active runtime evidence suite passed: 1 file / 8 tests.
- Related runtime compiler and loader regression gate passed: 3 files / 27 tests.
- `npm run typecheck:root` passed.
- `git diff --check` passed.
- New-file no-index whitespace checks for `active-capability-runtime-evidence.ts` and `active-capability-runtime-evidence.test.ts` produced no whitespace output.

Review gate:

- Oracle first Commit 5 review: P0/P3 none; P1 found final realization did not bind `telemetryEvidence.moduleLoadReceiptHash` to the current module load receipt and did not bind manifest systems to exact lock package version/hash; P2 found schema-level invariants and lifecycle ordering were too weak; P3 found validation counts in docs lagged behind the executed gate.
- Follow-up fix: final realization now blocks cross-receipt `enemy.fired` splicing; runtime module load entries record exact package version/hash; manifest package refs, lifecycle completeness/order, passed-report invariants and evidenceRefs coverage are enforced; docs validation counts were updated.
- Oracle second Commit 5 review: P0/P3 none; residual P1 found loader plan hash was self-trusted and manifest/receipt capability mismatch was only indirectly blocked; residual P2 found `evidenceRefs` hash consistency was not schema-enforced.
- Residual fix: active evidence now recomputes loader plan hash, checks loader plan against manifest systems, directly blocks manifest/receipt capability mismatch and rejects passed reports whose evidenceRefs hashes do not match report fields.
- Oracle third Commit 5 review: P0/P1/P3 none; residual P2 found module load receipt did not fail when loader plan omitted a manifest system.
- Residual P2 fix: module load receipt now checks manifest-to-loader-plan reverse coverage and fails with `loader_plan_manifest_system_not_loaded:<systemId>`.
- Oracle final Commit 5 review: P0/P1/P2/P3 none; residual P2 is closed and Commit 5 is approved for closure.
