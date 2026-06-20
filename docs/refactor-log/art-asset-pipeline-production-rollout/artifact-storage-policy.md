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

STS_ASSUME_ROLE_STATUS=PASS
SOURCE_IDENTITY_STATUS=PASS

OSS_VERSIONED_OBJECT_ACCESS=PASS
OSS_ROUND_TRIP_SHA256_STATUS=PASS
OSS_OBJECT_SHA256=sha256:c67b1616fd7ed4e90c323c06e293e47af495acdfca7d01ac0d369f2473badcad
AUTHORITATIVE_OBJECT_VERSION_ID=CAEQTxiBgMDPz7yY9xkiIDg4Y2NjNDdlNGE5NDQ0N2NhZGUxMmMzZjAzZGEyYTA0
PREVIOUS_VERSION_ID_STATUS=INVALID_NOT_FOUND_SUPERSEDED

SLS_QUERY_PERMISSION_STATUS=PASS
ACTIONTRAIL_ROLE_SESSION_AUDIT=PASS
ACTIONTRAIL_OBJECT_DATA_EVENT_AUDIT=NOT_VERIFIED
PREFLIGHT_RESULT=PARTIAL_PASS_BLOCKED_OBJECT_DATA_EVENT_AUDIT

HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=PENDING

STORAGE_TECHNICAL_VERIFICATION=PENDING
NEW_BUILD_RESULT=NOT_STARTED_BLOCKED
ARTIFACT_SHA256=NOT_GENERATED
DEPLOYMENT_PERFORMED=NO
COMMIT_6_GATE=BLOCKED
```

Version ID correction event:

```txt
PREVIOUS_VERSION_ID_RECORD=RETAINED_AS_CORRECTION_EVENT
PREVIOUS_VERSION_ID_STATUS=INVALID_NOT_FOUND_SUPERSEDED
PREVIOUS_VERSION_ID_IN_VERSION_LIST=NO
PREVIOUS_VERSION_ID_CALL_ERROR=Invalid version id specified
AUTHORITATIVE_OBJECT_VERSION_ID=CAEQTxiBgMDPz7yY9xkiIDg4Y2NjNDdlNGE5NDQ0N2NhZGUxMmMzZjAzZGEyYTA0
AUTHORITATIVE_OBJECT_VERSION_ID_STATUS=ONLY_AUTHORITATIVE_VERSION_ID_FOR_THIS_PREFLIGHT_OBJECT
VERSIONED_BUCKET_UPLOAD_RULE=EACH_SUCCESSFUL_UPLOAD_GETS_UNIQUE_VERSION_ID
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
2. A cloud administrator allows the build principal to assume the evidence writer role through STS temporary credentials. The RAM role itself must not use a long-term AccessKey.
3. The build role session sets `SourceIdentity=<build-run-id>` for audit traceability.
4. Complete preflight verification for upload, read, version query, denied deletion, and request ID capture.
5. Correlate OSS request IDs to ActionTrail object data events in SLS after waiting up to approximately 10 minutes and expanding the query time range.
6. Generate and upload the preflight manifest after object data event correlation is complete.
7. Bruce approves the one-time evidence loss exception.
8. Authorize a brand-new trusted release build.

Observed blockers:

- STS AssumeRole and `SourceIdentity` passed for the current OSS preflight, but this is only identity evidence. It does not clear the storage gate until object data events are correlated and the preflight manifest is uploaded.
- OSS versioned object access and round-trip SHA-256 passed for `sha256:c67b1616fd7ed4e90c323c06e293e47af495acdfca7d01ac0d369f2473badcad`.
- The previous wrong Version ID record must stay in the history as a correction event. It was not present in the version list, and calls using it returned `Invalid version id specified`; `CAEQTxiBgMDPz7yY9xkiIDg4Y2NjNDdlNGE5NDQ0N2NhZGUxMmMzZjAzZGEyYTA0` is the only authoritative Version ID for this preflight object.
- SLS query permission and ActionTrail role session audit passed, but ActionTrail object data event audit is still `NOT_VERIFIED`.
- If object data events remain missing after the wait window, inspect the Trail data event selector. The Trail existing and being enabled is not sufficient proof that the selector is active for this bucket and event set.
- `AGMEvidenceWriterSLSRead20260621` is narrow enough for preflight Logstore reads, but it should move under a separate evidence-auditor role so the evidence writer does not verify its own audit logs.
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
- The OSS responses for `PutObject`, `HeadObject`, `GetObject`, and the version list request record their OSS Request IDs.
- ActionTrail data events are visible and correlated for `PutObject`, `GetObject`, `HeadObject`, `ListObjectVersions`, and `GetBucketVersions`.
- `GetBucketVersions` may be used as `ListObjectVersions` audit evidence only when its request ID matches the actual version list call and the bucket, region, role session, and resource identity match.
- Delete attempts are denied.
- BucketWorm retention remains locked.

ActionTrail object data event correlation requirements:

```txt
WAIT_BEFORE_SLS_REQUERY=UP_TO_APPROX_10_MINUTES
QUERY_TIME_RANGE=EXPANDED_AROUND_OSS_OPERATION_WINDOW
QUERY_EVENT_NAMES=PutObject,GetObject,HeadObject,ListObjectVersions,GetBucketVersions
CORRELATION_FIELDS=event.requestId,event.eventName,event.userIdentity,event.resourceName,event.referencedResources,event.acsRegion,event.eventTime
OBJECT_KEY_AS_SOLE_CRITERION=FORBIDDEN
GET_BUCKET_VERSIONS_ACCEPTANCE=REQUEST_ID_BUCKET_REGION_ROLE_SESSION_MATCH_REQUIRED
```

Required Trail data event selector if object-level events remain missing:

```txt
ServiceName=Oss
ReadWriteType=All
EventName=PutObject,GetObject,HeadObject,ListObjectVersions
ResourceArn=acs:oss:cn-shanghai:1213873316001482:bucket/together-game
```

Trusted release build authorization:

```txt
PREFLIGHT_RESULT=PARTIAL_PASS_BLOCKED_OBJECT_DATA_EVENT_AUDIT
STORAGE_TECHNICAL_VERIFICATION=PENDING
HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=PENDING
NEW_BUILD_RESULT=NOT_STARTED_BLOCKED
ARTIFACT_SHA256=NOT_GENERATED
DEPLOYMENT_PERFORMED=NO
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
VERIFY_OWN_AUDIT_LOGS=FORBIDDEN
AUDIT_LOG_READER_ROLE=evidence-auditor
SLS_PREFLIGHT_READ_ROLE_TO_MOVE=AGMEvidenceWriterSLSRead20260621
```

Evidence auditor role constraints:

```txt
ROLE_PURPOSE=VERIFY_EVIDENCE_AUDIT_LOGS
SLS_READ_SCOPE=APPROVED_ACTIONTRAIL_LOGSTORE_ONLY
WRITE_EVIDENCE_OBJECTS=FORBIDDEN
DELETE_EVIDENCE_OBJECTS=FORBIDDEN
CURRENT_PREFLIGHT_ROLE=AGMEvidenceWriterSLSRead20260621
TARGET_ROLE=evidence-auditor
```

ActionTrail data event trail constraints:

```txt
TRAIL_NAME=ai-game-maker-evidence-audit
REGION=cn-shanghai
MANAGEMENT_EVENTS=WRITE_EVENTS
DATA_EVENTS=SPECIFIED_RESOURCE
RESOURCE=OSS_BUCKET:together-game
EVENTS=PutObject,CompleteMultipartUpload,GetObject,HeadObject,DeleteObject,ListObjectVersions,GetBucketVersions
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
