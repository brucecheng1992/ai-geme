# Artifact Storage Policy

## Generated Artifacts

Generated artifacts should stay under ignored paths such as `artifacts/`. Do not commit generated runtime, canary, comparison, or inventory artifacts unless a future step explicitly promotes a small deterministic fixture.

Committed reports must be:

- deterministic;
- small and reviewable;
- free of local absolute paths;
- free of timestamps unless the timestamp is deterministic fixture data;
- free of sensitive provenance, legal, prompt, seed, or review notes.

## Immutable Build Evidence Storage

Policy revision:

```txt
ENCRYPTION_POLICY_DECISION=APPROVED_SSE_OSS
SSE_KMS_REQUIRED=NO
APPROVED_ENCRYPTION_METHOD=SSE-OSS / AES256
DECISION_MAKER=Bruce
COMMIT_6_GATE=BLOCKED
```

Reason:

```txt
KMS service is not currently enabled. For the present immutable build
evidence, OSS-managed server-side encryption is accepted, combined with
private ACL, blocked public access, least-privilege RAM permissions,
versioning, audit logging, and locked 365-day BucketWorm.
```

Approved bucket:

```txt
BUCKET=together-game
REGION=cn-shanghai
ENCRYPTION_METHOD=SSE_OSS_AES256
```

Gate state at approval:

```txt
STORAGE_DECISION=APPROVED
ENCRYPTION_METHOD=SSE_OSS_AES256
ENCRYPTION_POLICY=APPROVED
SSE_OSS_CONFIGURATION=PENDING
BUCKET_WORM_365D_STATUS=NOT_CREATED_OR_LOCKED
EVIDENCE_PRESERVATION=NOT_STARTED
STORAGE_TECHNICAL_VERIFICATION=PENDING
COMMIT_6_GATE=BLOCKED
```

Storage technical status:

```txt
SSE_OSS_STATUS=PASS_AES256
BUCKET_WORM_STATUS=PASS_LOCKED_365_DAYS

RAM_LEAST_PRIVILEGE_STATUS=BLOCKED_MISSING_BUILDER_ROLE
ACTIONTRAIL_OSS_DATA_EVENTS_STATUS=BLOCKED_NO_SLS_TRAIL
HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=PENDING

STORAGE_TECHNICAL_VERIFICATION=PENDING
NEW_BUILD_RESULT=NOT_STARTED_BLOCKED
COMMIT_6_GATE=BLOCKED
```

Source commit effect:

```txt
HISTORICAL_DIAGNOSTIC_SOURCE_COMMIT=9171900
LOCAL_GOVERNANCE_COMMIT_EFFECT=FORMS_NEW_SOURCE_COMMIT_ONLY
CLOUD_GATE_EFFECT=DOES_NOT_UNBLOCK
NEW_BUILD_RESULT=NOT_STARTED_BLOCKED
OLD_CANDIDATE_DISPOSITION=FAILED_NON_RELEASABLE
```

Required gate sequence:

1. Commit the local governance documents and `evidence-loss-record.json`. This creates a new `SOURCE_COMMIT` only and does not clear any cloud gate.
2. A cloud administrator creates the `ai-game-maker-evidence-writer` RAM role and allows the build principal to assume it through STS temporary credentials. The RAM role itself must not use a long-term AccessKey.
3. The build role session sets `SourceIdentity=<build-run-id>` for audit traceability.
4. Create the ActionTrail OSS data event trail and deliver it to the approved SLS target. Long-term query and retention require a formal trail.
5. Complete preflight verification for upload, read, version query, denied deletion, and visible audit events.
6. Bruce approves the one-time evidence loss exception.
7. Authorize a brand-new trusted release build.

Observed blockers:

- RAM role lookup found no dedicated evidence writer role. The required role is `ai-game-maker-evidence-writer`, assumed through STS by the real CI or build principal, with access limited to `oss://together-game/ai-game-maker/release-evidence/*`.
- RAM role creation is blocked on the exact CI or build principal ARN. The default RAM role wizard only trusts the whole current cloud account `1213873316001482`; this is not accepted as the least-privilege trust boundary for the writer role.
- ActionTrail showed no active trail and no approved SLS Logstore delivery target. The required trail is `ai-game-maker-evidence-audit`, scoped to OSS data events for the `together-game` bucket in `cn-shanghai`, delivered to SLS in `cn-shanghai` with 365-day retention.
- The expected local evidence source files were not found under `/tmp`, `/var/folders`, `/Users/dahufa/Documents`, `/Users/dahufa/Desktop`, or `/Users/dahufa/Downloads`. Historical evidence preservation failed because the source files are missing.
- The historical `9171900` commit remains valid only as the source commit for historical diagnostics. A new release build must use a new Git commit after this policy change is committed, or this policy change must be reverted before the build.

Historical evidence loss:

```txt
ORIGINAL_FAILURE_EVIDENCE_STATUS=MISSING
DIAGNOSTIC_EVIDENCE_STATUS=MISSING
HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=PENDING
ORIGINAL_EVIDENCE_RECONSTRUCTION_AUTHORIZED=NO
OLD_CANDIDATE_USABLE_FOR_RELEASE=NO
OLD_CANDIDATE_DISPOSITION=FAILED_NON_RELEASABLE
OLD_RELEASE_USABLE_FOR_RELEASE=NO
```

Evidence loss exception decision record:

```txt
DECISION_NAME=EVIDENCE_LOSS_EXCEPTION_DECISION
DECISION_MAKER=Bruce
DECISION=PENDING
HISTORICAL_EVIDENCE_STATUS=FAILED_SOURCE_MISSING
ORIGINAL_EVIDENCE_RECONSTRUCTION_AUTHORIZED=NO
OLD_CANDIDATE_USABLE_FOR_RELEASE=NO
OLD_CANDIDATE_DISPOSITION=FAILED_NON_RELEASABLE
OLD_RELEASE_USABLE_FOR_RELEASE=NO
EXCEPTION_SCOPE=ONLY_THE_TWO_MISSING_MANIFESTS_FROM_THE_FAILED_AND_DIAGNOSTIC_RUNS
COMMIT_6_GATE=BLOCKED
```

Storage gate release prerequisites:

- RAM writer role exists and the build principal can assume it through STS.
- Test upload uses the STS role session with `SourceIdentity=<build-run-id>`.
- Test download verifies the expected SHA-256 digest.
- ActionTrail data events are visible for `PutObject`, `GetObject`, `HeadObject`, and `ListObjectVersions`.
- Delete attempts are denied.
- BucketWorm retention remains locked.

Trusted release build authorization:

```txt
STORAGE_TECHNICAL_VERIFICATION=PENDING
HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=PENDING
NEW_BUILD_RESULT=NOT_STARTED_BLOCKED
NEW_TRUSTED_BUILD_AUTHORIZATION=BLOCKED_UNTIL_CLOUD_PREFLIGHT_AND_BRUCE_APPROVAL
COMMIT_6_GATE=BLOCKED
```

The `COMMIT_6_GATE` must remain blocked until the new artifact, dual SHA-256 verification, Gate Input Manifest, and downstream release approval are complete.

Evidence writer role constraints:

```txt
ROLE_NAME=ai-game-maker-evidence-writer
AUTHENTICATION=STS_ASSUME_ROLE_ONLY
LONG_TERM_ACCESS_KEY=FORBIDDEN
SOURCE_IDENTITY=<build-run-id>
RESOURCE=acs:oss:*:*:together-game/ai-game-maker/release-evidence/*
ALLOW=oss:PutObject,oss:GetObject,oss:GetObjectVersion,oss:ListObjectVersions
DENY=oss:DeleteObject,oss:DeleteObjectVersion,oss:PutObjectAcl
FORBID_BUCKET_MANAGEMENT=YES
FORBID_WORM_ENCRYPTION_VERSIONING_CHANGES=YES
```

ActionTrail data event trail constraints:

```txt
TRAIL_NAME=ai-game-maker-evidence-audit
REGION=cn-shanghai
MANAGEMENT_EVENTS=WRITE_EVENTS
DATA_EVENTS=SPECIFIED_RESOURCE
RESOURCE=OSS_BUCKET:together-game
EVENTS=PutObject,CompleteMultipartUpload,GetObject,HeadObject,DeleteObject,ListObjectVersions
DELIVERY_TARGET=SLS_LOGSTORE:cn-shanghai
RETENTION=365_DAYS
SCOPE=ONLY_TOGETHER_GAME
MINIMUM_VERIFIED_EVENTS=PutObject,GetObject,HeadObject,ListObjectVersions
```

Notes:

- KMS purchase is not required for this gate revision.
- Server-side encryption set to `None` is not acceptable for the current storage gate.
- BucketWorm is bucket-wide, not prefix-scoped. After the 365-day retention policy is locked, `together-game` must be dedicated to immutable evidence and must not store normal game resources that need frequent overwrite or deletion.

## Small Fixture Assets

Approved small fixture path:

```txt
tests/fixtures/art-library-small-v0.1/
```

Current policy:

- target size: 10-30 assets;
- maximum size: 50 assets;
- sidecar metadata required for every asset;
- no production asset dump;
- no large source files unless explicitly approved.

## Large Library Assets

The large art library remains forbidden until Step 13A completes. Step 13A must define:

- storage location;
- per-file and total-size limits;
- allowed formats;
- thumbnail policy;
- Git LFS or external artifact-store policy;
- rights/licensing handling;
- rollback policy.

## Runtime-Safe Metadata

Runtime-safe metadata artifacts must exclude:

- prompts;
- seeds;
- raw AI generation parameters;
- internal review notes;
- copyright/legal notes;
- creator/credit fields unless separately approved;
- absolute local paths.

## Repair Output

Repair-enabled paths must not write back to source metadata unless a future explicit gate approves it.

Current policy:

```txt
repair writeback: forbidden
repair-enabled default: forbidden
```
