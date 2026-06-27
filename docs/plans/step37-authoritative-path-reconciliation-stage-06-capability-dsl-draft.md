# Step 37 Stage 6 Capability DSL Draft

## Stage 6 Capability DSL Draft — From Composed Schema

Checkpoint identity:

```text
checkpoint_id=stage6.capability_dsl_draft_from_composed_schema
parent_stage_id=stage6
closure_scope=atomic_step
implementation_status=complete
local_validation_status=passed
candidate_status=ready_for_commit
oracle_status=not_submitted
review_required=true
closure_status=not_closed
atomic_step_status=locally_validated
parent_stage_status=running
parent_loop_status=running
global_exit_conditions_met=false
user_input_required=false
next_action=CONTINUE_PARENT_LOOP
next_atomic_step=stage7.normalize_capability_dsl_draft_from_composed_schema
next_atomic_step_label=Stage 7 normalize capability DSL draft from composed schema atomic step
stage6_schema_expressible=true
capability_dsl_draft_produced=true
provider_draft_produced=false
normalized=false
compiled=false
runtime_consumed=false
qa_observed=false
production_default_cutover_active=false
legacy_authoritative_path_exited=false
final_closure_not_blocked=false
```

Current implementation conclusion:

- Stage 6 composed schema audit hash `fnv1a_038b3e6b` and composed schema hash `fnv1a_a732fea7` are the authority for this atom.
- This atom produces a deterministic system-owned `capability-game-dsl-draft.v1` artifact from the exact 59/59 composed schema capability set.
- The draft carries the valid gameplay draft profile id `side_scrolling_run_and_gun.v1` and preserves the source support profile `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` as provenance.
- This atom does not call a provider, does not normalize, does not compile, does not consume runtime, does not run QA, does not activate production default cutover, does not exit the legacy authoritative path, and does not mark final closure.
- Parent Loop continuation after this atom is the Stage 7 normalization checkpoint. The current atom is not Stage 7, not production cutover, and not final Step37 closure.

Machine-readable capability DSL draft artifact:

```text
artifact_path=docs/plans/step37-capability-dsl-draft-from-composed-schema.v0.1.json
artifact_kind=step37_capability_dsl_draft_from_composed_schema
schema_version=step37_capability_dsl_draft_from_composed_schema.v0.1
audit_hash=fnv1a_02de3f9c
draft_hash=fnv1a_20b25721
source_composed_schema_path=docs/plans/step37-composed-dsl-schema-from-exact-capability-lock.v0.1.json
source_composed_schema_audit_hash=fnv1a_038b3e6b
expected_composed_schema_audit_hash=fnv1a_038b3e6b
source_composed_schema_hash=fnv1a_a732fea7
source_exact_capability_lock_audit_hash=fnv1a_20dd2264
source_exact_capability_lock_hash=fnv1a_0c570c26
source_stage5_entry_audit_hash=fnv1a_2a121281
source_stage4_exit_audit_hash=fnv1a_be5c51cd
source_support_view_hash=fnv1a_37453024
source_inventory_hash=fnv1a_a883bf43
profile_id=DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1
draft_profile_id=side_scrolling_run_and_gun.v1
required_capability_count=59
complete_supported_count=59
package_count=59
draft_status=passed
capability_dsl_draft_produced=true
schema_expressible=true
provider_draft_produced=false
normalized=false
compiled=false
runtime_consumed=false
qa_observed=false
production_default_cutover_active=false
legacy_authoritative_path_exited=false
final_closure_not_blocked=false
global_exit_conditions_met=false
next_checkpoint_id=stage7.normalize_capability_dsl_draft_from_composed_schema
blockers=[]
```

Modified paths:

- `packages/game-dsl/src/step37-capability-dsl-draft.ts`
- `packages/game-dsl/src/step37-remaining-inventory-driver.ts`
- `packages/game-dsl/src/index.ts`
- `tests/contracts/step37-stage6-capability-dsl-draft.test.ts`
- `tests/contracts/step37-remaining-inventory-driver.test.ts`
- `docs/plans/step37-capability-dsl-draft-from-composed-schema.v0.1.json`
- `docs/plans/step37-authoritative-path-reconciliation-stage-06-capability-dsl-draft.md`

Compatibility & Cutover:

| Check | Required answer |
| --- | --- |
| Producer change | Adds a machine-readable Stage 6 capability DSL draft artifact/helper and extends the remaining-inventory Driver to route from a passed draft to the next normalization checkpoint. |
| Consumer list | `buildStep37CapabilityDslDraftReport`, `CapabilityGameDslDraftV1Schema`, Stage 6 capability-draft contract, remaining-inventory Driver contract, Parent Loop Driver input. |
| Compatibility type | `LOSSLESS_COMPATIBLE`: the atom consumes the composed schema and produces a system-owned draft artifact without changing runtime, package QA, provider output, normalization, compiler, production default cutover, or legacy authority. |
| Authority | Composed schema audit hash `fnv1a_038b3e6b`, composed schema hash `fnv1a_a732fea7`, exact lock audit hash `fnv1a_20dd2264`, exact lock hash `fnv1a_0c570c26`, Stage 5 entry audit hash `fnv1a_2a121281`, Stage 4 exit audit hash `fnv1a_be5c51cd`, support view hash `fnv1a_37453024`, and inventory hash `fnv1a_a883bf43`. |
| Legacy strategy | Legacy authoritative path remains active. This atom only creates a draft artifact and forbids production cutover or legacy exit. |
| Failure policy | Missing or mismatched composed-schema audit hash, stale composed-schema hash, invalid draft schema, profile mismatch, capability-id drift, premature provider/normalization/compile/runtime/QA/cutover/legacy/final state, or missing Stage 7 normalization checkpoint authority blocks progression. |
| Evidence | Focused contracts prove the 59/59 positive path, composed-schema audit hash drift failure, capability ID drift failure, trusted evidence smuggling failure, premature downstream-transition failure, persisted artifact shape, Driver continuation to normalization only after draft pass, and Driver fail-closed on missing/wrong/stale normalization checkpoint authority. |
| Rollback | Reverting this atom removes only the Stage 6 draft helper, artifact, Driver transition, tests, and this record; the Stage 6 composed schema remains intact and still routes to the capability DSL draft checkpoint. |

Validation status:

```text
focused_stage6_capability_draft_contracts_command=/usr/bin/time -p npx vitest run tests/contracts/step37-stage6-capability-dsl-draft.test.ts tests/contracts/step37-remaining-inventory-driver.test.ts
focused_stage6_capability_draft_contracts_initial_exitCode=1
focused_stage6_capability_draft_contracts_initial_result=RED: helper missing before implementation, then persisted artifact missing before artifact generation.
focused_stage6_capability_draft_contracts_green_exitCode=0
focused_stage6_capability_draft_contracts_green_result=PASS: 2 files / 39 tests.

related_contracts_command=/usr/bin/time -p npx vitest run tests/contracts/capability-game-dsl-draft-v1.test.ts tests/contracts/game-dsl-v0.2.test.ts tests/contracts/step37-stage6-composed-dsl-schema.test.ts tests/contracts/step37-stage6-capability-dsl-draft.test.ts tests/contracts/step37-remaining-inventory-driver.test.ts tests/contracts/step37-parent-loop-driver.test.ts
related_contracts_exitCode=0
related_contracts_result=PASS: 6 files / 88 tests.

full_contracts_command=/usr/bin/time -p npm run test:contracts
full_contracts_exitCode=0
full_contracts_result=PASS: 104 files / 1416 tests.

npm_test_command=/usr/bin/time -p npm test
npm_test_exitCode=0
npm_test_result=PASS: contracts 104 files / 1416 tests; workspace 34 files / 410 tests.

typecheck_command=/usr/bin/time -p npm run typecheck
typecheck_exitCode=0
typecheck_result=PASS: root, maker-api, and maker-workbench TypeScript checks passed.

skill_freshness_command=/usr/bin/time -p node --input-type=module <<'NODE' ... current code-change-discipline + review-gated-delivery Skill bundle ... NODE
skill_freshness_exitCode=0
skill_revision_type=sha256_bundle
skill_bundle_format=step37_manifest_v1_path_type_size_mode_sha_symlink
skill_file_count=8
skill_bundle_digest=4bcbfdc92cd3861171d2ea3424f57759ef37eebc9a4330abdc7438407c8cde9f
code_change_discipline_skill_sha256=dd5abe3945818f6feefbe77e30c02432b014a76bacb7e39afe814103659100db
review_gated_delivery_skill_sha256=27303f4b666d053c6d08e93a4b6ba7a6dbb7041ab7a264425bfaaae0bebab167
```

Exit assessment before candidate:

```text
local_validation_status=passed
candidate_status=ready_for_commit
oracle_status=not_submitted
closure_status=not_closed
atomic_step_status=locally_validated
exit_assessment=ready_for_candidate_commit
reviewed_commit_sha=not_created_yet
reviewed_skill_revision=4bcbfdc92cd3861171d2ea3424f57759ef37eebc9a4330abdc7438407c8cde9f
reviewed_composed_schema_audit_hash=fnv1a_038b3e6b
reviewed_composed_schema_hash=fnv1a_a732fea7
reviewed_capability_dsl_draft_audit_hash=fnv1a_02de3f9c
reviewed_capability_dsl_draft_hash=fnv1a_20b25721
parent_loop_after_candidate=running
next_action=CONTINUE_PARENT_LOOP
next_atomic_step=stage7.normalize_capability_dsl_draft_from_composed_schema
```
