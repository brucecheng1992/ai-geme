# Step 37 Stage 7 Normalized Capability DSL

## Stage 7 Normalize Capability DSL Draft — From Stage 6 Draft

Checkpoint identity:

```text
checkpoint_id=stage7.normalize_capability_dsl_draft_from_composed_schema
parent_stage_id=stage7
closure_scope=atomic_step
implementation_status=complete
local_validation_status=passed
candidate_status=committed
candidate_commit=fc05b557fc68aeb7029a25b9b8bcd49c51cdd76c
candidate_tree=5dece1b94c2eddf87ac552c79b8f3e28688a2b8e
oracle_status=approved
oracle_submission_id=019f0897-eca8-7500-8b6d-aa923d29a02c
oracle_agent_id=019f0813-ed9a-7ad0-8341-50ababd44fea
oracle_review_result=APPROVED_FOR_RECEIPT
oracle_p0_count=0
oracle_p1_count=0
oracle_p2_count=0
review_required=true
closure_status=closed
atomic_step_status=closed
parent_stage_status=running
parent_loop_status=running
global_exit_conditions_met=false
user_input_required=false
next_action=CONTINUE_PARENT_LOOP
next_atomic_step=stage8.compile_normalized_capability_dsl_to_runtime_ir
next_atomic_step_label=Stage 8 compile normalized capability DSL to runtime IR atomic step
stage6_schema_expressible=true
capability_dsl_draft_produced=true
normalized=true
compiled=false
runtime_consumed=false
qa_observed=false
production_default_cutover_active=false
legacy_authoritative_path_exited=false
final_closure_not_blocked=false
```

Current implementation conclusion:

- Stage 6 capability DSL draft audit hash `fnv1a_02de3f9c` and draft hash `fnv1a_20b25721` are the authority for this atom.
- This atom reuses `normalizeCapabilityGameDslDraftToCanonicalV02` to produce canonical `game-dsl.v0.2` plus a normalization report from the Stage 6 draft, composed schema identity, and exact capability package set.
- The closed exact lock remains unchanged. Because the exact lock resolver profile id is `resolved_capability_graph` while the composed schema and draft profile is `side_scrolling_run_and_gun.v1`, this atom creates a normalization-only adapter lock with the same package/capability set and runtime family, profile-bound to `side_scrolling_run_and_gun.v1`.
- The adapter lock is provenance, not a rewrite of the Stage 5 exact lock. The artifact records both `source_exact_capability_lock_hash=fnv1a_0c570c26` and `normalization_lock_hash=fnv1a_bc2dcb21`.
- This atom does not compile, does not consume runtime, does not run QA, does not activate production default cutover, does not exit the legacy authoritative path, and does not mark final closure.
- Parent Loop continuation after this atom is the Stage 8 compile checkpoint. The current atom is not compiler implementation, not runtime consumption, not QA observation, not production cutover, and not final Step37 closure.

Machine-readable normalized DSL artifact:

```text
artifact_path=docs/plans/step37-normalized-capability-dsl-from-draft.v0.1.json
artifact_kind=step37_normalized_capability_dsl_from_capability_dsl_draft
schema_version=step37_normalized_capability_dsl_from_capability_dsl_draft.v0.1
audit_hash=fnv1a_4c046453
canonical_dsl_hash=fnv1a_4f9c3411
normalization_report_hash=fnv1a_d9d4f570
source_capability_dsl_draft_path=docs/plans/step37-capability-dsl-draft-from-composed-schema.v0.1.json
source_capability_dsl_draft_audit_hash=fnv1a_02de3f9c
expected_capability_dsl_draft_audit_hash=fnv1a_02de3f9c
source_capability_dsl_draft_hash=fnv1a_20b25721
source_composed_schema_audit_hash=fnv1a_038b3e6b
source_composed_schema_hash=fnv1a_a732fea7
source_exact_capability_lock_audit_hash=fnv1a_20dd2264
source_exact_capability_lock_hash=fnv1a_0c570c26
source_stage5_entry_audit_hash=fnv1a_2a121281
source_stage4_exit_audit_hash=fnv1a_be5c51cd
source_support_view_hash=fnv1a_37453024
source_inventory_hash=fnv1a_a883bf43
normalization_game_brief_hash=fnv1a_37453024
normalization_profile_resolution_hash=fnv1a_6e06106f
normalization_lock_hash=fnv1a_bc2dcb21
source_exact_lock_profile_id=resolved_capability_graph
normalization_lock_profile_id=side_scrolling_run_and_gun.v1
profile_id=DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1
draft_profile_id=side_scrolling_run_and_gun.v1
required_capability_count=59
complete_supported_count=59
package_count=59
normalization_status=passed
normalized=true
compiled=false
runtime_consumed=false
qa_observed=false
production_default_cutover_active=false
legacy_authoritative_path_exited=false
final_closure_not_blocked=false
global_exit_conditions_met=false
next_checkpoint_id=stage8.compile_normalized_capability_dsl_to_runtime_ir
blockers=[]
```

Modified paths:

- `packages/game-dsl/src/step37-normalize-capability-dsl-draft.ts`
- `packages/game-dsl/src/step37-remaining-inventory-driver.ts`
- `packages/game-dsl/src/index.ts`
- `tests/contracts/step37-stage7-normalize-capability-dsl-draft.test.ts`
- `tests/contracts/step37-remaining-inventory-driver.test.ts`
- `docs/plans/step37-normalized-capability-dsl-from-draft.v0.1.json`
- `docs/plans/step37-authoritative-path-reconciliation-stage-07-normalized-capability-dsl.md`

Compatibility & Cutover:

| Check | Required answer |
| --- | --- |
| Producer change | Adds a machine-readable Stage 7 normalized canonical DSL artifact/helper and extends the remaining-inventory Driver to route from passed normalization to the next compile checkpoint. |
| Consumer list | `buildStep37NormalizeCapabilityDslDraftReport`, `normalizeCapabilityGameDslDraftToCanonicalV02`, `CanonicalGameDslV02Schema`, `GameDslNormalizationReportSchema`, Stage 7 normalization contract, remaining-inventory Driver contract, Parent Loop Driver input. |
| Compatibility type | `LOSSLESS_COMPATIBLE`: the atom consumes the Stage 6 draft and produces canonical `game-dsl.v0.2` without changing runtime, package QA, compiler, production default cutover, or legacy authority. |
| Authority | Stage 6 draft audit hash `fnv1a_02de3f9c`, draft hash `fnv1a_20b25721`, composed schema audit hash `fnv1a_038b3e6b`, composed schema hash `fnv1a_a732fea7`, exact lock audit hash `fnv1a_20dd2264`, exact lock hash `fnv1a_0c570c26`, support view hash `fnv1a_37453024`, and inventory hash `fnv1a_a883bf43`. |
| Legacy strategy | Legacy authoritative path remains active. This atom only creates canonical normalized DSL and forbids compiler/runtime/QA/cutover/legacy exit. |
| Failure policy | Missing or mismatched Stage 6 draft audit hash, stale draft/composed/exact-lock source hashes, invalid draft/composed/lock inputs, normalizer blocked report, invalid canonical/report schema, premature compile/runtime/QA/cutover/legacy/final state, or missing Stage 8 compile checkpoint authority blocks progression. |
| Evidence | Focused contracts prove the 59/59 positive normalization path, Stage 6 draft audit hash drift failure, premature downstream-transition failure, persisted artifact shape, adapter lock provenance, Driver continuation to compile only after normalization pass, and Driver fail-closed on missing/wrong/stale compile checkpoint authority. |
| Rollback | Reverting this atom removes only the Stage 7 helper, artifact, Driver transition, tests, and this record; the Stage 6 capability DSL draft remains intact and still routes to the normalization checkpoint. |

Validation status:

```text
focused_stage7_normalization_contracts_command=/usr/bin/time -p npx vitest run tests/contracts/step37-stage7-normalize-capability-dsl-draft.test.ts tests/contracts/step37-remaining-inventory-driver.test.ts
focused_stage7_normalization_contracts_initial_exitCode=1
focused_stage7_normalization_contracts_initial_result=RED: persisted normalized artifact missing, then artifact provenance drift exposed wrong Stage 4 path in generation command.
focused_stage7_normalization_contracts_green_exitCode=0
focused_stage7_normalization_contracts_green_result=PASS: 2 files / 40 tests.

related_contracts_command=/usr/bin/time -p npx vitest run tests/contracts/capability-game-dsl-draft-v1.test.ts tests/contracts/game-dsl-v0.2.test.ts tests/contracts/step37-stage6-composed-dsl-schema.test.ts tests/contracts/step37-stage6-capability-dsl-draft.test.ts tests/contracts/step37-stage7-normalize-capability-dsl-draft.test.ts tests/contracts/step37-remaining-inventory-driver.test.ts tests/contracts/step37-parent-loop-driver.test.ts
related_contracts_exitCode=0
related_contracts_result=PASS: 7 files / 95 tests.

typecheck_command=/usr/bin/time -p npm run typecheck
typecheck_exitCode=0
typecheck_result=PASS: root, maker-api, and maker-workbench TypeScript checks passed.

skill_freshness_command=/usr/bin/time -p sh -c '{ for f in /Users/dahufa/.agents/skills/code-change-discipline/SKILL.md /Users/dahufa/.agents/skills/review-gated-delivery/SKILL.md /Users/dahufa/.agents/skills/review-gated-delivery/assets/*.txt /Users/dahufa/.agents/skills/review-gated-delivery/assets/*.md; do case "$f" in /Users/dahufa/.agents/skills/code-change-discipline/*) rel="code-change-discipline/${f#/Users/dahufa/.agents/skills/code-change-discipline/}" ;; /Users/dahufa/.agents/skills/review-gated-delivery/*) rel="review-gated-delivery/${f#/Users/dahufa/.agents/skills/review-gated-delivery/}" ;; *) exit 2 ;; esac; size=$(wc -c < "$f" | tr -d " "); sha=$(shasum -a 256 "$f" | awk '\''{print $1}'\''); printf "%s\t%s\t%s\n" "$rel" "$size" "$sha"; done; } | LC_ALL=C sort > /tmp/step37_skill_manifest.tsv && wc -l /tmp/step37_skill_manifest.tsv && shasum -a 256 /tmp/step37_skill_manifest.tsv && cat /tmp/step37_skill_manifest.tsv'
skill_freshness_exitCode=0
skill_revision_type=sha256_bundle
skill_bundle_format=step37_manifest_v1_path_size_sha
skill_file_count=8
skill_bundle_digest=ed4e3ba1da435f24a527ca1a34f9374bfe1d7ca9e4d482a6d229c3518997dd72
code_change_discipline_skill_sha256=dd5abe3945818f6feefbe77e30c02432b014a76bacb7e39afe814103659100db
review_gated_delivery_skill_sha256=27303f4b666d053c6d08e93a4b6ba7a6dbb7041ab7a264425bfaaae0bebab167
```

Local validation assessment before candidate:

```text
local_validation_status=passed
candidate_status=ready_for_commit
oracle_status=not_submitted
closure_status=not_closed
atomic_step_status=locally_validated
exit_assessment=ready_for_candidate_commit
reviewed_commit_sha=not_created_yet
reviewed_skill_revision=ed4e3ba1da435f24a527ca1a34f9374bfe1d7ca9e4d482a6d229c3518997dd72
reviewed_capability_dsl_draft_audit_hash=fnv1a_02de3f9c
reviewed_capability_dsl_draft_hash=fnv1a_20b25721
reviewed_normalized_dsl_audit_hash=fnv1a_4c046453
reviewed_canonical_dsl_hash=fnv1a_4f9c3411
reviewed_normalization_report_hash=fnv1a_d9d4f570
parent_loop_after_candidate=running
next_action=CONTINUE_PARENT_LOOP
next_atomic_step=stage8.compile_normalized_capability_dsl_to_runtime_ir
```

Receipt closure:

```text
closure_scope=atomic_step
atomic_step_id=stage7.normalize_capability_dsl_draft_from_composed_schema
atomic_step_status=closed
candidate_commit=fc05b557fc68aeb7029a25b9b8bcd49c51cdd76c
candidate_tree=5dece1b94c2eddf87ac552c79b8f3e28688a2b8e
reviewed_commit_sha=fc05b557fc68aeb7029a25b9b8bcd49c51cdd76c
reviewed_tree_sha=5dece1b94c2eddf87ac552c79b8f3e28688a2b8e
reviewed_skill_revision_type=sha256_bundle
reviewed_skill_revision=ed4e3ba1da435f24a527ca1a34f9374bfe1d7ca9e4d482a6d229c3518997dd72
oracle_submission_id=019f0897-eca8-7500-8b6d-aa923d29a02c
oracle_agent_id=019f0813-ed9a-7ad0-8341-50ababd44fea
oracle_review_result=APPROVED_FOR_RECEIPT
oracle_status=approved
oracle_p0_count=0
oracle_p1_count=0
oracle_p2_count=0
oracle_p3_count=1
oracle_p3_summary=Non-blocking explicit wrong Stage8 checkpoint test suggestion; existing code path fails closed and this receipt does not change tested semantics.
receipt_scope=docs_only_closure_metadata
receipt_self_reference_policy=receipt_commit_sha_not_written_to_file; derive receipt commit from Git history to avoid self-reference loop.
closure_status=closed
parent_stage_status=running
parent_loop_status=running
global_exit_conditions_met=false
user_input_required=false
next_action=CONTINUE_PARENT_LOOP
next_atomic_step=stage8.compile_normalized_capability_dsl_to_runtime_ir
receipt_forbidden_changes=runtime,qa,package_registry,capability_registry,driver_semantics,validator,contracts,tests,Skill,AGENTS,production_cutover,legacy_exit,final_closure
```
