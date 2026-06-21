# Commit 6 Rollback Runbook

documentVersion: `commit-6-rollback-runbook.v0.1`
schemaVersion: `commit_6_rollback_runbook.v0.1`
status: `REVIEW_REQUIRED`

This rollback runbook is a WP5 control-plane draft bound to the current Commit 6 candidate. It does not authorize rollback, rollback drill, production deployment, canary traffic, release promotion, or Commit 6 final gate execution.

## Bound Candidate

```txt
RELEASE_SOURCE_COMMIT=81f92081da94cface172267fed6b2835922e35e7
WP4_BUILD_RUN_ID=build_20260621T163428Z_7cc8af61
CURRENT_CANDIDATE_RELEASE_ID=release_20260621T163428Z_7cc8af61
CURRENT_CANDIDATE_ARTIFACT_URI=oss://together-game/ai-game-maker/release-evidence/trusted-build-artifacts/build_20260621T163428Z_7cc8af61/sha256-7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f/ai-game-maker-workbench-release_20260621T163428Z_7cc8af61.tar.gz
CURRENT_CANDIDATE_ARTIFACT_SHA256=sha256:7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f
CURRENT_CANDIDATE_PROVENANCE_SHA256=sha256:dd3f7550a41f4a57f0f10fdf7c9249929c4a38ef502047fc58858abdb5aebae8
```

## Rollback Target Status

```txt
APPROVED_ROLLBACK_TARGET=NOT_APPROVED
ROLLBACK_TARGET_RELEASE_ID=NOT_APPROVED
ROLLBACK_TARGET_ARTIFACT_URI=NOT_APPROVED
ROLLBACK_TARGET_ARTIFACT_SHA256=NOT_APPROVED
ROLLBACK_TARGET_PROVENANCE=NOT_APPROVED
ROLLBACK_TARGET_COMPATIBILITY_STATUS=NOT_APPROVED
ROLLBACK_TARGET_DEPLOYABILITY_STATUS=NOT_APPROVED
ROLLBACK_TARGET_RECOVERABILITY_EVIDENCE=NOT_APPROVED
```

Rollback must fail closed when the rollback target is missing, unapproved, unverifiable, expired, revoked, or not bound to a digest and provenance record.

## Approval Requirements

Rollback target approval must include:

- rollback release/version;
- artifact URI;
- artifact digest;
- provenance reference and digest;
- compatibility status;
- deployability status;
- recoverability evidence;
- approver principal and role;
- separation-of-duties check;
- issuedAt and expiresAt;
- revocation status;
- evidence URI or authoritative system record ID.

Safe rollback authorization and rollback drill authorization are separate required approvals unless a future authoritative governance policy explicitly permits one record to cover both with exact scope.

```txt
SAFE_ROLLBACK_AUTHORIZATION=NOT_APPROVED
ROLLBACK_DRILL_AUTHORIZATION=NOT_APPROVED
PRODUCTION_ROLLBACK_AUTHORIZATION=NOT_APPROVED
```

## Compatibility Analysis

Current compatibility evidence is not approved for production rollback.

```txt
DATABASE_COMPATIBILITY=NOT_AVAILABLE
SCHEMA_COMPATIBILITY=NOT_AVAILABLE
CACHE_COMPATIBILITY=NOT_AVAILABLE
QUEUE_COMPATIBILITY=NOT_AVAILABLE
ASSET_COMPATIBILITY=NOT_AVAILABLE
STATE_COMPATIBILITY=NOT_AVAILABLE
IRREVERSIBLE_CHANGE_CHECK=NOT_AVAILABLE
```

Before a rollback can be approved, the owner must prove either that the candidate has no irreversible state changes or that every state change has a tested recovery path.

## Forward Fix Versus Rollback

Choose rollback when approved SLI/parity thresholds breach, the active artifact digest is wrong, the canary scope exceeds approval, or user-facing health cannot be restored inside the maximum decision window. Choose forward fix only when rollback target is unavailable and the incident owner explicitly records why rollback would increase risk.

Current maximum decision time and recovery time objective are not approved:

```txt
MAX_DECISION_TIME=REQUIRES_EXTERNAL_APPROVAL
MAX_RECOVERY_TIME_OBJECTIVE=REQUIRES_EXTERNAL_APPROVAL
```

## Trigger Conditions

Rollback may be considered only when one of the approved triggers occurs:

- approved SLI threshold breach;
- approved parity failure;
- deployment health failure;
- artifact digest mismatch;
- canary abort threshold breach;
- platform health monitoring failure.

All triggers are currently `REQUIRES_EXTERNAL_APPROVAL` because the Commit 6 SLI/parity criteria are not approved.

## Rollback Sequence

No exact rollback command is approved yet.

When an external platform owner approves the rollback target and command:

1. Verify caller identity and approved rollback execution role.
2. Verify the rollback target release ID, artifact URI, artifact digest, and provenance.
3. Verify rollback authorization has not expired or been revoked.
4. Verify target account, region, cluster, namespace, service, and environment are inside approval scope.
5. Verify rollback trigger is present and in scope.
6. Submit rollback using the approved platform command.
7. Capture platform operation/request ID.
8. Capture actor principal, target resource, current candidate digest, rollback target digest, start time, completion time, and final status.
9. Export platform-native rollback receipt.
10. Compute rollback receipt SHA-256.
11. Run post-rollback health checks.
12. Run post-rollback parity checks.
13. Query platform audit logs for the operation ID.
14. Preserve the rollback receipt and audit query result according to `artifact-storage-policy.md`.

## Health And Parity After Rollback

Post-rollback validation must include:

- service availability;
- error rate;
- latency;
- runtime health;
- functional parity;
- rendering parity where applicable;
- rollback target artifact digest verification;
- active pointer or platform state verification;
- audit receipt verification.

SLI and parity thresholds must come from the approved Commit 6 criteria. Current criteria are `REVIEW_REQUIRED`, so rollback validation cannot pass yet.

## Safe Abort Conditions

Abort rollback or rollback drill if:

- rollback target is not approved;
- rollback target digest cannot be verified;
- caller identity differs from approved role;
- target environment differs from approved scope;
- platform command cannot produce operation ID;
- receipt is a dry-run, fixture, screenshot, local log, or hand-written JSON;
- post-rollback health or parity data is missing beyond approved policy;
- audit correlation cannot be obtained.

## Drill Policy

Rollback drill requires independent authorization and a non-production scope unless a later production incident policy explicitly says otherwise.

```txt
ROLLBACK_DRILL_ENVIRONMENT=NOT_APPROVED
ROLLBACK_DRILL_TARGET=NOT_APPROVED
ROLLBACK_DRILL_AUTHORIZATION=NOT_APPROVED
```

## Non-Authorization Statement

This runbook is not rollback authorization. It is a versioned technical procedure draft. Rollback, rollback drill, production deployment, and Commit 6 final gate remain blocked until proper approvals and platform-native receipts exist.
