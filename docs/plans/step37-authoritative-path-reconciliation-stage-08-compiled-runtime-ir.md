# Step37 Stage 8 - Compile Normalized Capability DSL To Runtime IR

## Current Atomic Step

checkpoint_id: stage8.compile_normalized_capability_dsl_to_runtime_ir
closure_scope: atomic_step
implementation_status: implementing
local_validation_status: passed
candidate_status: ready_for_commit
oracle_status: not_submitted
parent_stage_status: running
parent_loop_status: running
global_exit_conditions_met: false
user_input_required: false
next_action: CONTINUE_PARENT_LOOP
next_atomic_step: stage9.consume_compiled_runtime_ir_in_runtime

## Source Inputs

source_normalized_capability_dsl_path: docs/plans/step37-normalized-capability-dsl-from-draft.v0.1.json
source_normalized_capability_dsl_audit_hash: fnv1a_4c046453
source_normalized_canonical_dsl_hash: fnv1a_4f9c3411
source_normalization_report_hash: fnv1a_d9d4f570
source_normalization_lock_hash: fnv1a_bc2dcb21
source_exact_capability_lock_hash: fnv1a_0c570c26
required_capability_count: 59
complete_supported_count: 59
package_count: 59

## Initial Compile Precondition Evidence

initial_raw_normalized_compile_status: blocked
initial_raw_normalized_compile_blockers:
- error_code: CAPABILITY_CONTRACT_INVALID
  path: /systems/config_cfg_weapon_default_straight_single_v1/applies_to_entity_ids
  interpretation: Stage 7 generic weapon config did not yet bind the default weapon system to the player owner required by the compiler contract.
- error_code: CAPABILITY_CONTRACT_INVALID
  path: /systems/config_cfg_weapon_default_straight_single_v1/config/fire_action
  interpretation: Stage 7 generic weapon config did not yet declare the concrete shoot_projectile fire action.
- error_code: CAPABILITY_CONTRACT_INVALID
  path: /systems/config_cfg_weapon_default_straight_single_v1/config/pattern
  interpretation: Stage 7 generic weapon config did not yet declare the straight projectile pattern.
- error_code: CAPABILITY_CONTRACT_INVALID
  path: /systems/config_cfg_weapon_default_straight_single_v1/config/projectile_count
  interpretation: Stage 7 generic weapon config did not yet declare one projectile.
- error_code: CAPABILITY_CONTRACT_INVALID
  path: /systems/config_cfg_weapon_default_straight_single_v1/config/slot
  interpretation: Stage 7 generic weapon config did not yet declare the primary slot.
- error_code: CAPABILITY_SET_MISMATCH
  path: /waves/1/capability_ids
  interpretation: wave_flying declared enemy.flying_right_entry.v1 but did not explicitly declare a locked spawn capability.

## Implementation Plan

implementation_paths:
- packages/game-dsl/src/step37-compile-normalized-capability-dsl.ts
- packages/game-dsl/src/step37-normalize-capability-dsl-draft.ts
- packages/game-dsl/src/step37-remaining-inventory-driver.ts
- packages/game-dsl/src/index.ts
- tests/contracts/step37-stage8-compile-normalized-runtime-ir.test.ts
- tests/contracts/step37-remaining-inventory-driver.test.ts
- docs/plans/step37-compiled-runtime-ir-from-normalized-capability-dsl.v0.1.json
- docs/plans/step37-authoritative-path-reconciliation-stage-08-compiled-runtime-ir.md

evidence_chain:
- Stage 7 normalized canonical DSL remains immutable and is not rewritten.
- Stage 8 builds a compile-ready canonical DSL with explicit adapter actions.
- canonical-capability runtime compiler consumes the compile-ready DSL and normalized capability lock.
- Stage 8 persists capability IR, runtime plan, runtime system manifest, Scene IR authority report, and compilation report hashes.
- Parent Loop Driver only advances after Stage 8 report has compiled=true and still keeps runtime_consumed=false and qa_observed=false.

## Compatibility & Cutover

Producer change: Stage 8 adds compiled runtime IR artifact and a compile-ready canonical DSL view derived from the Stage 7 normalized artifact.
Consumer list: canonical capability runtime compiler, runtime-plan consumer in the next Stage 9 atom, Parent Loop Driver, Stage8 contract tests, Oracle receipt review.
Compatibility type: ADAPTER_REQUIRED.
Authority: Stage 7 normalized canonical DSL remains source authority for normalized semantics; Stage 8 compile-ready DSL is derived compiler input with explicit adapter provenance.
Legacy strategy: legacy authoritative path remains active and read-only; production default cutover remains forbidden in this atom.
Failure policy: raw normalized DSL compiler failures remain fail-closed; missing adapter actions, source hash drift, stale normalized evidence, or smuggled runtime/QA/cutover fields block Stage 8 closure.
Evidence: focused Stage8 contract validates disabled-adapter RED and adapter-enabled GREEN, persisted output hashes, and Driver Stage9 routing.
Rollback: remove the Stage8 candidate and artifact without modifying Stage7 normalized source or any package runtime implementation.

## Validation Log

validation_status: passed
repo_head_at_validation: 7260cf1a720238e5d6bcb7ce98195d541c2afac9
repo_tree_identity: pending_candidate_commit
active_skill_revision_type: sha256_bundle
active_skill_bundle_format: step37_manifest_v1_path_size_sha
active_skill_file_count: 8
active_skill_bundle_digest: ed4e3ba1da435f24a527ca1a34f9374bfe1d7ca9e4d482a6d229c3518997dd72
validation_commands:
- command: /usr/bin/time -p npx vitest run tests/contracts/step37-stage8-compile-normalized-runtime-ir.test.ts tests/contracts/step37-remaining-inventory-driver.test.ts
  exit_code: 0
  duration: 2.49s
  result: 2 files, 44 tests passed
- command: /usr/bin/time -p npx vitest run tests/contracts/canonical-capability-runtime-compiler.test.ts tests/contracts/game-dsl-v0.2.test.ts tests/contracts/step37-stage6-composed-dsl-schema.test.ts tests/contracts/step37-stage6-capability-dsl-draft.test.ts tests/contracts/step37-stage7-normalize-capability-dsl-draft.test.ts tests/contracts/step37-stage8-compile-normalized-runtime-ir.test.ts tests/contracts/step37-remaining-inventory-driver.test.ts tests/contracts/step37-parent-loop-driver.test.ts
  exit_code: 0
  duration: 2.49s
  result: 8 files, 109 tests passed
- command: /usr/bin/time -p npm run test:contracts
  exit_code: 0
  duration: 11.39s
  result: 106 files, 1431 tests passed
- command: /usr/bin/time -p npm test
  exit_code: 0
  duration: 61.78s
  result: contracts 106 files / 1431 tests passed; workspace 34 files / 410 tests passed
- command: /usr/bin/time -p npm run typecheck
  exit_code: 0
  duration: 6.82s
  result: root, maker-api, and maker-workbench typecheck passed
- command: /usr/bin/time -p git diff --check
  exit_code: 0
  duration: 0.02s
  result: whitespace check passed
- command: Skill freshness manifest digest
  exit_code: 0
  duration: <1s
  result: active_skill_bundle_digest ed4e3ba1da435f24a527ca1a34f9374bfe1d7ca9e4d482a6d229c3518997dd72
- command: Stage8 inventory alignment recompute
  exit_code: 0
  duration: <1s
  result: next_atomic_step stage9.consume_compiled_runtime_ir_in_runtime; selectionFailure null

artifact_outputs:
- path: docs/plans/step37-compiled-runtime-ir-from-normalized-capability-dsl.v0.1.json
  audit_hash: fnv1a_2aaa4454
  compile_ready_canonical_dsl_hash: fnv1a_1e39ce48
  compilation_report_hash: fnv1a_88acb2e8
  compile_status: passed
  runtime_consumed: false
  qa_observed: false

remaining_inventory_summary:
  required_capability_count: 59
  registered_capability_count: 59
  static_complete_supported_count: 59
  stage8_compile_status: passed
  next_atomic_step: stage9.consume_compiled_runtime_ir_in_runtime
  selection_failure: null

## Oracle Review

oracle_status: not_submitted
reviewed_commit_sha: not_created
reviewed_skill_bundle_digest: ed4e3ba1da435f24a527ca1a34f9374bfe1d7ca9e4d482a6d229c3518997dd72

## Exit Assessment

atomic_step_status: locally_validated
parent_stage_status: running
loop_status: running
global_exit_conditions_met: false
user_input_required: false
next_action: CONTINUE_PARENT_LOOP
next_atomic_step: stage9.consume_compiled_runtime_ir_in_runtime
