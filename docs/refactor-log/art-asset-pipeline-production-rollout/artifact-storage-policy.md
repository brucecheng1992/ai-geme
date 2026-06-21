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
ACTIONTRAIL_OBJECT_DATA_EVENT_AUDIT=PASS_WITH_APPROVED_COMPENSATING_CORRELATION
SOURCE_IDENTITY_AUDIT=PASS_WITH_APPROVED_COMPENSATING_CORRELATION
RESOURCE_EVENT_SOURCE_IDENTITY_FIELD=FAIL_MISSING

DIAGNOSTIC_EVIDENCE_UPLOAD=PASS
DIAGNOSTIC_EVIDENCE_WORM_PRESERVATION=PASS
DIAGNOSTIC_EVIDENCE_DOWNLOAD_VERIFICATION=PASS
DIAGNOSTIC_EVIDENCE_OBJECT_URI=oss://together-game/ai-game-maker/release-evidence/diagnostics/source-identity/preflight_20260620T201848Z_3eccf398/sha256-69e0239ee8f51e9e9074d52a89088944b59bbff4aed66cb0a3b939e572e6411d/source-identity-propagation-diagnostic-20260621T104744Z-921f7ccb.json
DIAGNOSTIC_EVIDENCE_VERSION_ID=CAEQTxiBgICRo5an9xkiIDU4Yjg2OTI1Y2VkNDQ0ODRiYzYwZjNtYWY0ZTU2MTMw
DIAGNOSTIC_EVIDENCE_SHA256=sha256:69e0239ee8f51e9e9074d52a89088944b59bbff4aed66cb0a3b939e572e6411d
DIAGNOSTIC_EVIDENCE_PUTOBJECT_REQUEST_ID=6A37C1509BFB6E38305BBC35
DIAGNOSTIC_EVIDENCE_HEADOBJECT_REQUEST_ID=6A37C1500475283734E1167F
DIAGNOSTIC_EVIDENCE_GETOBJECT_REQUEST_ID=6A37C150498ADD3237BF2A29
DIAGNOSTIC_EVIDENCE_SOURCE_IDENTITY=evidence_preservation_20260621T104744Z_921f7ccb
PROVIDER_TICKET_ID=00AWWPRR6J
PROVIDER_TICKET_STATUS=PENDING_RESPONSE

PREFLIGHT_MANIFEST_STATUS=GENERATED_UPLOADED_WORM_VERIFIED
PREFLIGHT_RESULT=PASS_WITH_APPROVED_COMPENSATING_CORRELATION
PREFLIGHT_MANIFEST_URI=oss://together-game/ai-game-maker/release-evidence/preflight-manifests/preflight_20260620T201848Z_3eccf398/sha256-4b6700091f7ee368c14224a38067e4fed20d64887d844f1b9a93d78337df5322/evidence-storage-preflight-manifest-20260621T122718Z-a207f737.json
PREFLIGHT_MANIFEST_VERSION_ID=CAEQTxiBgIDPvyg9xkjIGV1Y2RhZWUxNDhmODRkNzI5MzY4N2FiODE0ZTRiYTI1
PREFLIGHT_MANIFEST_SHA256=sha256:4b6700091f7ee368c14224a38067e4fed20d64887d844f1b9a93d78337df5322
PREFLIGHT_MANIFEST_PUTOBJECT_REQUEST_ID=6A37D8A69B18ED3536745776
PREFLIGHT_MANIFEST_HEADOBJECT_REQUEST_ID=6A37D8A69B18ED3536925776
PREFLIGHT_MANIFEST_GETOBJECT_REQUEST_ID=6A37D8A6A1570F3933D8EE6B
PREFLIGHT_MANIFEST_SOURCE_IDENTITY=preflight_manifest_20260621T122718Z_a207f737
PREFLIGHT_MANIFEST_ASSUME_ROLE_REQUEST_ID=593E05DD-1C91-58EE-ACD0-C72F3DCF19ED
PREFLIGHT_MANIFEST_ACCESS_KEY_ID_SHA256=sha256:86c7cc1d97857e3ce3244846844254abc03c2129bd6aeeb3c1d386c065b3741f
PREFLIGHT_MANIFEST_UPLOAD_RECEIPT_SHA256=sha256:789a84c59c7628801bdf404019b36dc2e8f58de3e7f36d123f8dd411b0475d0f
SLS_PREFLIGHT_MANIFEST_CORRELATION_SHA256=sha256:02e23c40a6ff0933c1a565f97d08173c6055985b4d0d894782e272995397743a
SLS_PREFLIGHT_MANIFEST_AUDIT=PASS
SLS_PREFLIGHT_MANIFEST_ACCESS_KEY_HASH_MATCH=PASS
SLS_PREFLIGHT_MANIFEST_RESOURCE_EVENT_SOURCE_IDENTITY=FAIL_MISSING

HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=APPROVED_ONE_TIME
EVIDENCE_LOSS_EXCEPTION_DECISION=APPROVE_ONE_TIME_HISTORICAL_EVIDENCE_LOSS
EVIDENCE_LOSS_EXCEPTION_APPROVED_AT=2026-06-21T12:40:54Z

STORAGE_TECHNICAL_VERIFICATION=PASS_WITH_APPROVED_EXCEPTION
RELEASE_AUTHORIZATION=false
NEW_BUILD_RESULT=NOT_STARTED_READY_FOR_WORK_PACKAGE_4
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

1. Preserve the failed source-identity diagnostic record in WORM OSS and audit its `PutObject`, `HeadObject`, and `GetObject` events.
2. Generate `evidence-storage-preflight-manifest.json`, upload it through `ai-game-maker-evidence-writer` STS credentials, verify versioned readback, and audit its `PutObject`, `HeadObject`, and `GetObject` events.
3. Commit the local governance documents and `evidence-loss-record.json`. This creates a new `SOURCE_COMMIT` only and does not clear the release gate.
4. Bruce approved the one-time historical evidence loss exception using the exact phrase `APPROVE_ONE_TIME_HISTORICAL_EVIDENCE_LOSS`.
5. A brand-new trusted release build may start only from the governance commit created after this policy change.

Observed blockers:

- STS AssumeRole and `SourceIdentity` passed for the current OSS preflight, and the diagnostic/preflight manifest objects were preserved in WORM OSS with SLS audit correlation.
- OSS resource events still omit `userIdentity.sessionContext.sourceIdentity`; this is accepted only under `APPROVE_COMPENSATING_CORRELATION`, with Alibaba support ticket `00AWWPRR6J` pending provider response.
- OSS versioned object access and round-trip SHA-256 passed for `sha256:c67b1616fd7ed4e90c323c06e293e47af495acdfca7d01ac0d369f2473badcad`.
- The previous wrong Version ID record must stay in the history as a correction event. It was not present in the version list, and calls using it returned `Invalid version id specified`; `CAEQTxiBgMDPz7yY9xkiIDg4Y2NjNDdlNGE5NDQ0N2NhZGUxMmMzZjAzZGEyYTA0` is the only authoritative Version ID for this preflight object.
- SLS query permission, ActionTrail role session audit, diagnostic object data event audit, and preflight manifest object data event audit passed for observed `PutObject`, `HeadObject`, and `GetObject` operations.
- `AGMEvidenceWriterSLSRead20260621` is narrow enough for preflight Logstore reads, but it should move under a separate evidence-auditor role so the evidence writer does not verify its own audit logs.
- The expected local evidence source files were not found under `/tmp`, `/var/folders`, `/Users/dahufa/Documents`, `/Users/dahufa/Desktop`, or `/Users/dahufa/Downloads`. Historical evidence preservation failed because the source files are missing.
- The historical `9171900` commit remains valid only as the source commit for historical diagnostics. A new release build must use a new Git commit after this policy change is committed.

Historical evidence loss:

```txt
ORIGINAL_FAILURE_EVIDENCE_STATUS=MISSING
DIAGNOSTIC_EVIDENCE_STATUS=MISSING
HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=APPROVED_ONE_TIME
EVIDENCE_LOSS_EXCEPTION_DECISION=APPROVE_ONE_TIME_HISTORICAL_EVIDENCE_LOSS
EVIDENCE_LOSS_EXCEPTION_APPROVED_AT=2026-06-21T12:40:54Z
ORIGINAL_EVIDENCE_RECONSTRUCTION_AUTHORIZED=NO
OLD_CANDIDATE_USABLE_FOR_RELEASE=NO
OLD_CANDIDATE_DISPOSITION=FAILED_NON_RELEASABLE
OLD_RELEASE_USABLE_FOR_RELEASE=NO
```

Evidence loss exception decision record:

```txt
DECISION_NAME=EVIDENCE_LOSS_EXCEPTION_DECISION
DECISION_MAKER=Bruce
DECISION=APPROVE_ONE_TIME_HISTORICAL_EVIDENCE_LOSS
DECISION_STATUS=APPROVED_ONE_TIME
DECISION_RECORDED_AT=2026-06-21T12:40:54Z
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
PREFLIGHT_RESULT=PASS_WITH_APPROVED_COMPENSATING_CORRELATION
STORAGE_TECHNICAL_VERIFICATION=PASS_WITH_APPROVED_EXCEPTION
HISTORICAL_EVIDENCE_PRESERVATION=FAILED_SOURCE_MISSING
EVIDENCE_LOSS_EXCEPTION=APPROVED_ONE_TIME
EVIDENCE_LOSS_EXCEPTION_DECISION=APPROVE_ONE_TIME_HISTORICAL_EVIDENCE_LOSS
WORK_PACKAGE_3=PASS
NEW_BUILD_RESULT=NOT_STARTED_READY_FOR_WORK_PACKAGE_4
ARTIFACT_SHA256=NOT_GENERATED
DEPLOYMENT_PERFORMED=NO
RELEASE_AUTHORIZATION=false
NEW_TRUSTED_BUILD_AUTHORIZATION=READY_TO_START_WORK_PACKAGE_4_FROM_NEW_GOVERNANCE_COMMIT
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
