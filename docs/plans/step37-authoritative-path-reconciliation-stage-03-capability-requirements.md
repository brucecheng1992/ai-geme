# Step 37 Stage 3 Capability Requirements Audit

> - Parent plan: `docs/plans/step37-authoritative-path-reconciliation-audit.md`
> - Stage: 3 — Capability Requirements
> - Current status: closure Oracle PASS; checkpoint commit pending
> - Updated: 2026-06-25

## Scope Lock

- scope: Stage 3 read-only audit only.
- baseline: Stage 2 closure checkpoint commit `48a855bd` (`docs: close stage 2 profile resolution`).
- question: Are capability requirements derived from the resolved current-run profile, preserved with identity and provenance, and consumed downstream without pretending that complete packages or exact capability lock are already active?
- non-goals: no source code edit, no test edit, no capability evidence update, no exact-lock promotion, no complete package cutover, no composed schema, no runtime loader implementation, no production default cutover.
- starting conclusion: `Stage 2 Exit gate: MET`; `Stage 3 Implementation: NOT_ENTERED`.

## Verdict

`ACTIVE_REQUIREMENTS_HASH_BOUND_EXACT_LOCK_NOT_ENTERED`.

The production chain now derives behavior-bearing capability requirements from the resolved runtime profile, records them in `generation_capability_readiness_report.json`, hash-binds them in `active_profile_lock.json`, and exposes the same lock through `authority_bundle.json` for downstream Raw DSL, compiler, runtime, and QA authority checks. Stage 3 does not prove complete capability packages or exact capability lock consumption; those remain Stage 4 and Stage 5.

## Producer

- Requirement source: `RuntimeGenreRegistry.requiredCapabilities` supplies the executable runtime profile aliases.
- Mapping producer: `listGameplayProfileRuntimeStatuses` maps each required runtime alias to the owning `GameplayCapabilityRegistry` descriptor via `legacyRuntimeCapabilities`.
- Readiness producer: `buildGenerationCapabilityPreflight` writes the mapped `activeRequirementCapabilityIds` into `capabilityRequirements.requiredCapabilityIds`.
- Lock producer: `buildActiveProfileLock` copies the readiness capability requirements into `profileRequirements` and adds `requirementsHash`.

## Artifact

| Artifact | Role |
| --- | --- |
| `generation_capability_readiness_report.json` | Current-run profile resolution plus `capabilityRequirements.requiredCapabilityIds`, `completeSupportedCapabilityIds`, `incompleteCapabilityIds`, `missingRegistryCapabilityAliases`, and `declaredProfileCapabilityIds`. |
| `active_profile_lock.json` | Hash-bound source of truth for active runtime profile requirements; stores `profileRequirements.source: active_runtime_profile_requirements` and `requirementsHash`. |
| `authority_bundle.json` | Embeds the active profile lock so downstream consumers use the same requirement identity. |
| `generation_capability_resolution_report.json` | Shadow report copies `requestedCapabilityIds` from readiness and records `exactLockStatus: not_required_active_profile_bound` for the current active profile path. |

## Consumer

- `buildActiveProfileLock` rejects unresolved profile, missing active requirement, missing registry alias, or incomplete requirement state before authority bundle creation.
- `buildGenerationCapabilityResolutionShadow` copies `readinessReport.capabilityRequirements.requiredCapabilityIds` into `requestedCapabilityIds` and `selectedCapabilityIds` for active profile-bound resolution.
- Raw DSL provider, compiler, runtime templates, and Playwright QA consume or compare the embedded `active_profile_lock` through `authority_bundle.json`, as established by Stage 2.
- This Stage 3 audit does not prove field-level downstream behavior that independently reads and acts on `profileRequirements.requirementsHash` or each `requiredCapabilityIds` value beyond active profile lock availability.
- Receipt, artifact index, acceptance report, and Workbench evidence expose the same authority bundle and active profile lock refs.

## Actual Data Flow

1. Stage 2 resolves the current-run runtime profile from canonical GameBrief-derived genre.
2. `listGameplayProfileRuntimeStatuses` derives `activeRequirementCapabilityIds` from runtime required aliases and keeps broader declared profile capability IDs separate.
3. `buildGenerationCapabilityPreflight` persists those active requirements in readiness evidence and produces a deterministic report hash.
4. `buildActiveProfileLock` copies and sorts the requirements, records missing/incomplete requirement arrays, and hashes the requirement payload.
5. `authority_bundle.json` embeds the lock and therefore carries the same requirement set into Raw DSL, compiler, runtime authority, QA, receipt/index, and Workbench evidence.
6. The current active-profile path skips exact capability lock resolution with `exactLockStatus: not_required_active_profile_bound`; the exact-lock path is still a later package-composed stage.

## Authority

`active_profile_lock.profileRequirements.requirementsHash` is the Stage 3 authority for behavior-bearing active profile requirements. Its upstream authority is the readiness report hash plus registry snapshot hash. `declaredProfileCapabilityIds` remain visible but do not override `requiredCapabilityIds`.

## Fail Closed

- Unknown runtime profile fails closed before capability requirements are considered.
- Missing registry alias appears as `missingRegistryCapabilityAliases` and blocks active profile lock creation.
- Empty active requirement set blocks active profile lock creation.
- Incomplete requirement state blocks active profile lock creation when readiness has not promoted the profile to active/complete support.
- Exact lock is not silently fabricated for active-profile-bound production; resolution records `not_required_active_profile_bound`.

## Fallback

No legacy authoritative requirement path is used for successful active profiles. The mapping still starts from runtime profile aliases for the active profile path, but those aliases are resolved into registry-owned capability IDs and hash-bound in the active profile lock. Complete package and exact lock fallback are not claimed.

## Gate Matrix

| Gate | Result | Evidence | Missing proof |
| --- | --- | --- | --- |
| A. Requirements come from resolved profile | YES | Current run reruns preflight after canonical GameBrief and derives readiness from normalized runtime genre. | Full DeepSeek 59-capability target profile mapping is not audited here. |
| B. Runtime aliases map to registry capability IDs | YES | `listGameplayProfileRuntimeStatuses` resolves `RuntimeGenreRegistry.requiredCapabilities` through `legacyRuntimeCapabilities`. | Need Stage 4 package completeness for five-dimensional support. |
| C. Requirements have stable identity/provenance | YES | Readiness has `registrySnapshotHash` and `reportHash`; active profile lock stores refs and `requirementsHash`. | Exact capability lock hash is not present on active-profile-bound path. |
| D. Declared profile gaps do not mask active requirements | YES | `activeRequirementCapabilityIds` and `declaredProfileCapabilityIds` are separate; tests cover planned profile-owned gaps remaining visible. | Declared profile gap closure is Stage 4+. |
| E. Downstream consumers receive the requirement authority lock | PARTIAL: yes for active lock availability; not proven for field-level requirement action | Authority bundle embeds active profile lock; Stage 2 verified Raw DSL, compiler, runtime, and QA consume or compare the bundle/lock identity. | No downstream runtime/QA consumer proof shows `profileRequirements.requirementsHash` or `requiredCapabilityIds` being independently read and acted on beyond active profile lock availability; this also does not prove composed schema, canonical DSL, runtime loader, or real capability-owned QA. |
| F. Exact capability lock consumption | NOT ENTERED | Active profile-bound resolution records `exactLockStatus: not_required_active_profile_bound`; resolver exact lock exists only in shadow/package path tests. | Stage 5 must prove exact lock from complete packages before claiming lock-driven package composition. |

## Findings

No Stage 3 blocker was found for active runtime profile requirement identity and downstream authority binding.

Boundary finding: Stage 3 is only closed for `active_runtime_profile_requirements`. It must not be read as complete package support, exact lock consumption, composed schema generation, canonical DSL closure, runtime loader consumption, or final production default cutover.

## Missing Proof

- Complete package evidence and five-dimensional `completeSupported` remain Stage 4.
- Exact capability lock production and downstream consumption remain Stage 5.
- Full `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` 59-capability target coverage is not proven by active runtime requirements.
- No downstream runtime/QA consumer proof shows `profileRequirements.requirementsHash` or `requiredCapabilityIds` being independently read and acted on beyond active profile lock availability.
- This audit does not run a new provider/browser production artifact; it relies on source, committed tests, and previously verified authority chain evidence.

## Source References

- `apps/maker-api/src/projects/generation-pipeline.service.ts:249`
- `apps/maker-api/src/projects/generation-pipeline.service.ts:254`
- `apps/maker-api/src/projects/generation-pipeline.service.ts:255`
- `apps/maker-api/src/projects/generation-pipeline.service.ts:1009`
- `apps/maker-api/src/projects/generation-pipeline.service.ts:1023`
- `packages/game-dsl/src/generation-capability-readiness.ts:68`
- `packages/game-dsl/src/generation-capability-readiness.ts:109`
- `packages/game-dsl/src/generation-capability-readiness.ts:121`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts:583`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts:594`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts:620`
- `packages/game-dsl/src/active-profile-lock.ts:95`
- `packages/game-dsl/src/active-profile-lock.ts:126`
- `packages/game-dsl/src/active-profile-lock.ts:148`
- `packages/game-dsl/src/generation-capability-resolution.ts:92`
- `packages/game-dsl/src/generation-capability-resolution.ts:119`
- `tests/contracts/generation-capability-readiness.test.ts:11`
- `tests/contracts/generation-capability-resolution.test.ts:11`
- `tests/contracts/gameplay-capability-registry.test.ts:171`
- `tests/workspace/generation-pipeline.service.test.ts:687`

## Verification

```text
npx vitest run tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/workspace/generation-pipeline.service.test.ts
# PASS, 4 files / 52 tests

git diff --check
# PASS

rg -n "[ \t]+$" docs/plans/step37-authoritative-path-reconciliation-audit.md docs/plans/step37-authoritative-path-reconciliation-stage-03-capability-requirements.md
# PASS, no matches
```

## Oracle Review

- first review: P1 wording finding.
- finding: `Consumer` and Gate Matrix E were too strong because they could read Stage 2 bundle/lock consumption as field-level `profileRequirements.requirementsHash` / `requiredCapabilityIds` downstream action.
- remediation: narrowed Consumer and Gate Matrix E to active lock availability, and moved field-level downstream action into Missing Proof.
- re-review status: PASS.
- agent: `019efe93-5544-7952-9009-8c265ff0d037`.
- findings after remediation: P0/P1/P2/P3 none.
- checkpoint decision: Stage 3 audit may enter checkpoint commit; this does not approve complete package, exact lock, composed schema, canonical DSL, runtime loader, capability-owned QA, or final production default cutover.

## Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3 Audit: ACTIVE_REQUIREMENTS_HASH_BOUND_EXACT_LOCK_NOT_ENTERED
Stage 3 Audit Gate: ORACLE_PASSED_AWAITING_COMMIT
Stage 3 Implementation: NOT_ENTERED
Next: Stage 3 audit checkpoint; do not enter Stage 3 implementation or Stage 4 before checkpoint
```

Stop marker: Stage 3 Capability Requirements audit passed Oracle re-review. Do not implement Stage 3 or proceed to Stage 4 until this audit receives a checkpoint commit.

## Stage 3 Closure Implementation — Active Requirements Exit Gate

### Scope Lock

- scope: Stage 3 closure only. This does not reopen Stage 1 or Stage 2 and does not enter Stage 4 Complete Capability Packages.
- implementation type: no-code closure implementation.
- baseline: Stage 3 audit checkpoint commit `d7af70b9` (`docs: record stage 3 capability requirements audit`).
- starting conclusion: `Stage 3 Audit: ACTIVE_REQUIREMENTS_HASH_BOUND_EXACT_LOCK_NOT_ENTERED`; `Stage 3 Implementation: NOT_ENTERED`.
- non-goals: no producer contract change, no source/test/runtime/QA/capability-evidence edit, no complete package promotion, no exact lock creation, no composed schema, no canonical DSL, no runtime loader, no production default cutover.

### Minimal Closure Requirements

1. Close Stage 3 only for `active_runtime_profile_requirements` source, identity, provenance, and hash-bound active lock availability.
2. Preserve the narrowed Oracle boundary: downstream consumers receive or compare the active profile lock, but field-level action on `profileRequirements.requirementsHash` or `requiredCapabilityIds` is not proven in Stage 3.
3. Keep Stage 4 and Stage 5 unopened: `completeSupported`, complete packages, exact capability lock, package-composed schema, and lock-driven runtime consumption remain future stages.
4. Re-run Stage 3 focused verification plus full tests and typecheck before claiming exit gate.
5. Re-submit the no-code closure diff and validation evidence to Oracle before checkpoint commit.

### Implemented Scope

- No production code, test, schema, runtime, QA, support-summary, or capability evidence files changed.
- Stage 3 exit is limited to the documented audit boundary: behavior-bearing active requirements are derived from resolved runtime profile aliases, mapped to registry-owned IDs, persisted in readiness evidence, and hash-bound in `active_profile_lock.profileRequirements`.
- The closure explicitly keeps Gate E partial for field-level downstream action.
- Exact lock remains `NOT_ENTERED` and belongs to Stage 5.

### Compatibility & Cutover

| Check | Required answer |
| --- | --- |
| Producer change | None. This closure records Stage 3 status only; no contract, field, artifact, runtime behavior, or QA evidence producer changed. |
| Consumer list | Existing active-profile consumers remain `buildActiveProfileLock`, `buildGenerationCapabilityResolutionShadow`, `authority_bundle.json` readers, receipt/index/acceptance/Workbench evidence, and Stage 2 verified Raw DSL/compiler/runtime/QA authority identity checks. |
| Compatibility type | `LOSSLESS_COMPATIBLE`: no producer or consumer shape changed. |
| Authority | `active_profile_lock.profileRequirements.requirementsHash` is the Stage 3 authority for active runtime requirements; readiness report hash and registry snapshot hash remain upstream provenance. |
| Legacy strategy | Legacy authoritative requirement fallback is forbidden for successful active profiles. Runtime aliases are only the profile-owned source vocabulary before mapping to registry capability IDs. |
| Failure policy | Existing fail-closed behavior remains unchanged for unresolved profile, empty active requirements, missing aliases, incomplete active requirement state, forged refs, and missing/mismatched authority bundle or lock evidence. |
| Evidence | Stage 3 focused suite, full `npm test`, full `npm run typecheck`, `git diff --check`, and Oracle closure review must pass before checkpoint commit. |
| Rollback | Reverting this closure record returns Stage 3 to audit-only status without changing source artifacts, runtime behavior, or capability evidence. |

Compatibility disposition:

```ts
const STAGE_3_CAPABILITY_REQUIREMENTS_CLOSURE_DISPOSITION = "LOSSLESS_COMPATIBLE";
```

### Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3 Audit: ACTIVE_REQUIREMENTS_HASH_BOUND_EXACT_LOCK_NOT_ENTERED
Stage 3 Implementation: LOCAL_VALIDATED_AWAITING_ORACLE
Stage 3 Exit gate: PENDING_ORACLE
Next: Stage 4 Complete Capability Packages audit only after Stage 3 closure checkpoint
```

### Validation

```text
npx vitest run tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/workspace/generation-pipeline.service.test.ts
# PASS, 4 files / 52 tests

npm test
# PASS, contracts 93 files / 1036 tests; workspace 34 files / 398 tests

npm run typecheck
# PASS

git diff --check
# PASS

rg -n "[ \t]+$" docs/plans/step37-authoritative-path-reconciliation-audit.md docs/plans/step37-authoritative-path-reconciliation-stage-03-capability-requirements.md
# PASS, no matches
```

Stop marker: Stage 3 closure implementation locally validated. Do not proceed to Stage 4 until Oracle review and checkpoint commit complete.

### Closure Oracle Review

- first review: P1.
- finding: parent plan still listed `Stage 3 Capability Requirements 尚未审计` as an unresolved risk after the Stage 3 audit checkpoint.
- remediation: parent plan unresolved risks now state that Stage 4 Complete Capability Packages and Stage 5 Exact Capability Lock have not started, Stage 3 Gate E still does not prove field-level downstream action, and existing non-blocking debts remain.
- re-review status: PASS.
- agent: `019efe98-56e0-7b80-95ae-89c999115729`.
- findings after remediation: P0/P1/P2/P3 none.
- checkpoint decision: Stage 3 closure may enter checkpoint commit; this does not approve complete package, exact lock, composed schema, canonical DSL, runtime loader, capability-owned QA, or production default cutover.

### Closure Exit Assessment

```text
Stage 1: AUTHORITATIVE_AND_CONNECTED
Stage 2: PROFILE_RESOLUTION_CLOSED
Stage 3 Audit: ACTIVE_REQUIREMENTS_HASH_BOUND_EXACT_LOCK_NOT_ENTERED
Stage 3 Implementation: ORACLE_PASSED_AWAITING_COMMIT
Stage 3 Exit gate: MET
Next: Stage 4 Complete Capability Packages audit after Stage 3 closure checkpoint
```

Stop marker: Stage 3 closure passed Oracle re-review. Do not proceed to Stage 4 until checkpoint commit completes.
