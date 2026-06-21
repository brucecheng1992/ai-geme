# Commit 6 Deployment Runbook

documentVersion: `commit-6-deployment-runbook.v0.1`
schemaVersion: `commit_6_deployment_runbook.v0.1`
status: `REVIEW_REQUIRED`

This runbook is a versioned control-plane draft for WP5 technical verification. It does not authorize deployment, canary traffic, release promotion, rollback, rollback drill, or Commit 6 final gate execution.

## Bound Release

```txt
RELEASE_SOURCE_COMMIT=81f92081da94cface172267fed6b2835922e35e7
WP4_BUILD_RUN_ID=build_20260621T163428Z_7cc8af61
WP4_BUILD_ATTEMPT_ID=attempt_20260621T163428Z_7cc8af61
CANDIDATE_ID=candidate_20260621T163428Z_7cc8af61
RELEASE_ID=release_20260621T163428Z_7cc8af61
ARTIFACT_URI=oss://together-game/ai-game-maker/release-evidence/trusted-build-artifacts/build_20260621T163428Z_7cc8af61/sha256-7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f/ai-game-maker-workbench-release_20260621T163428Z_7cc8af61.tar.gz
ARTIFACT_SHA256=sha256:7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f
ARTIFACT_VERSION_ID=CAEQTXiBgMDt0.Os9xkiIGI4MGU1NDdiYmM2YjQwMzE4MDhmYTU3NGFlNzRlNDE3
GATE_INPUT_MANIFEST_URI=oss://together-game/ai-game-maker/release-evidence/gate-input-manifests/build_20260621T163428Z_7cc8af61/sha256-3104bcf40cd1d468c47420e771eefe7cee398d28584c7e2f90e148b174c063d4/gate-input-manifest-20260621T163428Z-7cc8af61.json
GATE_INPUT_MANIFEST_SHA256=sha256:3104bcf40cd1d468c47420e771eefe7cee398d28584c7e2f90e148b174c063d4
PROVENANCE_URI=oss://together-game/ai-game-maker/release-evidence/provenance/build_20260621T163428Z_7cc8af61/sha256-dd3f7550a41f4a57f0f10fdf7c9249929c4a38ef502047fc58858abdb5aebae8/trusted-build-provenance-20260621T163428Z-7cc8af61.json
PROVENANCE_SHA256=sha256:dd3f7550a41f4a57f0f10fdf7c9249929c4a38ef502047fc58858abdb5aebae8
```

## Target Scope

```txt
PRODUCTION_PLATFORM=NOT_APPROVED
PRODUCTION_ACCOUNT=NOT_APPROVED
PRODUCTION_REGION=NOT_APPROVED
PRODUCTION_CLUSTER=NOT_APPROVED
PRODUCTION_NAMESPACE=NOT_APPROVED
PRODUCTION_SERVICE=NOT_APPROVED
VERIFICATION_ENVIRONMENT=REQUIRES_EXTERNAL_APPROVAL
VERIFICATION_ACCOUNT=NOT_APPROVED
VERIFICATION_REGION=NOT_APPROVED
VERIFICATION_CLUSTER=NOT_APPROVED
VERIFICATION_NAMESPACE=NOT_APPROVED
VERIFICATION_SERVICE=NOT_APPROVED
```

Production and verification/non-production environments must remain strictly separated. A verification drill is not a production deployment and must not be described as release authorization.

## Roles And Approvals

```txt
DEPLOY_EXECUTION_ROLE=REQUIRES_EXTERNAL_APPROVAL
CANARY_EXECUTION_ROLE=REQUIRES_EXTERNAL_APPROVAL
EVIDENCE_WRITER_ROLE=ai-game-maker-evidence-writer
EVIDENCE_AUDITOR_ROLE=REQUIRES_SEPARATE_AUDITOR_ROLE
APPROVED_BASELINE=NOT_APPROVED
APPROVED_ROLLBACK_TARGET=NOT_APPROVED
APPROVED_CANARY_SCOPE=NOT_APPROVED
SAFE_ROLLBACK_AUTHORIZATION=NOT_APPROVED
ROLLBACK_DRILL_AUTHORIZATION=NOT_APPROVED
RELEASE_AUTHORIZATION=false
```

Required approvals must be independent of the current agent, git author, root Cloud Shell caller, OSS writer role, and SLS reader role.

## Tooling Preconditions

1. Run `git rev-parse HEAD` and confirm the governance worktree is at the expected control-plane commit for the operation.
2. Run `git status --short` and require an empty worktree before collecting final evidence.
3. Run `node --version`, `npm --version`, and platform CLI version commands when the approved platform is known.
4. Confirm caller identity with the approved platform identity command. The caller must match the approved execution role.
5. Do not print secrets, STS tokens, cookies, or Authorization headers.
6. Confirm the platform target is non-production for verification drills unless a later independent production deployment authorization exists.

## Preflight Checks

1. Download or resolve the artifact by exact OSS URI and Version ID.
2. Compute SHA-256 locally and require `sha256:7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f`.
3. Download the Gate Input Manifest and require `sha256:3104bcf40cd1d468c47420e771eefe7cee398d28584c7e2f90e148b174c063d4`.
4. Download provenance and require `sha256:dd3f7550a41f4a57f0f10fdf7c9249929c4a38ef502047fc58858abdb5aebae8`.
5. Run the Commit 6 readiness validator against the real WP5 evidence input.
6. Stop unless the only remaining blocker is the approved platform receipt collection step.
7. Stop if any approval is `PENDING`, `UNKNOWN`, `NOT_APPROVED`, `EXPIRED`, or scoped to a different artifact digest.

## Configuration And Secret Handling

Configuration references must use the approved platform secret reference mechanism. The runbook must never require printing, copying, or storing plaintext secrets in git, shell output, screenshots, evidence manifests, or WORM objects.

## Dry-Run Versus Execution

Dry-run output may validate command shape only. Dry-run output is not a deploy receipt, canary receipt, rollback receipt, platform-native receipt, release authorization, or Commit 6 gate evidence.

## Deployment Sequence

No exact deployment command is approved yet.

When an external platform owner provides the approved target and command, the sequence must be:

1. Verify caller identity and approved execution role.
2. Verify target account, region, environment, cluster, namespace, and service are inside the approved scope.
3. Resolve the artifact by exact digest and immutable URI.
4. Submit the deployment operation using the approved platform command.
5. Capture provider-generated operation/request ID.
6. Capture start time, completion time, final platform status, actor principal, target scope, artifact identifier, and artifact digest.
7. Export the platform-native receipt without secrets.
8. Compute SHA-256 for the exported receipt.
9. Query platform audit logs for the operation ID.
10. Save evidence through the approved evidence writer session and then verify readback.

## Canary Sequence

No canary scope is approved yet.

When approved, the canary sequence must record:

```txt
CANARY_ENVIRONMENT=<approved value>
CANARY_CLUSTER=<approved value>
CANARY_TRAFFIC_PERCENTAGE_OR_SCOPE=<approved value>
CANARY_COHORT=<approved value>
CANARY_START_CONDITION=<approved value>
CANARY_OBSERVATION_WINDOW=<approved value>
CANARY_ABORT_THRESHOLDS=<approved value>
CANARY_ROLLBACK_TRIGGER=<approved value>
```

The canary must collect availability, error rate, latency, functional parity, rendering parity where applicable, build/runtime health, and rollback health according to the approved SLI/parity criteria.

## Abort And Rollback Triggers

Abort if any approved SLI or parity criterion fails, if metric data is missing beyond the approved missing-data policy, if the platform receipt is incomplete, if the artifact digest differs, or if the actor or environment falls outside approval scope.

Rollback trigger must be the approved trigger in the Commit 6 rollback runbook. Current rollback trigger status is `REQUIRES_EXTERNAL_APPROVAL`.

## Receipt And Evidence Collection

Each platform-native receipt must include:

- provider/platform;
- account;
- region;
- environment;
- service/resource;
- operation type;
- operation/request ID;
- actor principal;
- source identity if the platform provides it;
- artifact/release identifier;
- artifact digest;
- start time;
- completion time;
- final status;
- target scope;
- provider-generated metadata.

Each uploaded evidence object must record URI, Version ID, PutObject Request ID, HeadObject Request ID, GetObject Request ID, downloaded SHA-256, and SLS correlation status according to `artifact-storage-policy.md`.

## Audit Query Steps

Audit query steps depend on the approved platform. The current ActionTrail/SLS evidence path applies to OSS evidence objects only and does not prove deployment-platform audit logging. Deployment audit query commands are `NOT_AVAILABLE` until the platform is approved.

## Fail-Closed Behavior

Stop and keep WP5 blocked if:

- any required approval is missing, expired, revoked, scoped incorrectly, or unverifiable;
- the caller identity differs from the approved execution role;
- the target environment differs from approval scope;
- artifact digest or Version ID does not match WP4 evidence;
- platform command has no provider operation ID;
- a dry-run or hand-written receipt is offered as real receipt;
- SLI/parity criteria are not approved;
- rollback authorization or rollback drill authorization is missing;
- evidence upload, readback, or audit correlation fails.

## Non-Authorization Statement

This runbook is not deployment authorization. It is a versioned technical procedure draft for WP5 readiness verification. Production deployment remains forbidden until WP6 and final approval explicitly authorize it.
