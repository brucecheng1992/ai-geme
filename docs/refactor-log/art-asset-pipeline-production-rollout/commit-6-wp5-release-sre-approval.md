# WP5 / Commit 6 Release/SRE Approval

Record status: `PENDING_EXTERNAL_SIGNATURE`
Decision: `PENDING`
Approval type: `WP5_RELEASE_SRE_AUTHORIZATION`

This document is a pending Release/SRE approval record. It does not authorize verification deploy, verification canary, rollback drill, WP5 PASS, WP6, final gate, release authorization, or production deployment.

## Required Release/SRE Decisions

- `DEPLOYMENT_RUNBOOK_APPROVAL`: `PENDING`
- `ROLLBACK_RUNBOOK_APPROVAL`: `PENDING`
- `SLI_PARITY_CRITERIA_APPROVAL`: `PENDING`
- `APPROVED_BASELINE`: `PENDING`
- `APPROVED_ROLLBACK_TARGET`: `PENDING`
- `APPROVED_CANARY_SCOPE`: `PENDING`
- `SAFE_ROLLBACK_AUTHORIZATION`: `PENDING`
- `ROLLBACK_DRILL_AUTHORIZATION`: `PENDING`
- `VERIFICATION_ENVIRONMENT_AUTHORIZATION`: `PENDING`

## Bound Documents

- Deployment runbook: `docs/refactor-log/art-asset-pipeline-production-rollout/commit-6-deployment-runbook.md`
- Deployment runbook SHA-256: `sha256:c93f458916b88b0964fb52b8ef5a21f0ad9ad2ee9403a80a67e191121067d9f8`
- Rollback runbook: `docs/refactor-log/art-asset-pipeline-production-rollout/commit-6-rollback-runbook.md`
- Rollback runbook SHA-256: `sha256:f1b88f109554dc7158035bf48a3daecde529f83502709f9b67b60fa4c4beee3a`
- SLI/parity criteria: `docs/refactor-log/art-asset-pipeline-production-rollout/commit-6-sli-parity-criteria.json`
- SLI/parity criteria SHA-256: `sha256:bc905e93d0fb8c0a00511701126147acf6e3b546d9a5345c9a4cca8b55e592e6`

Any change to these digests invalidates this pending package and requires renewed approval.

## Candidate Binding

- Release source commit: `81f92081da94cface172267fed6b2835922e35e7`
- WP4 build run: `build_20260621T163428Z_7cc8af61`
- WP5 verification run: `wp5_20260622T061138Z_62d86211`
- Candidate artifact URI: `oss://together-game/ai-game-maker/release-evidence/trusted-build-artifacts/build_20260621T163428Z_7cc8af61/sha256-7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f/ai-game-maker-workbench-release_20260621T163428Z_7cc8af61.tar.gz`
- Candidate artifact SHA-256: `sha256:7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f`

## Pending Canary Limits

- Maximum canary replicas: `1`
- Maximum canary traffic: `5_PERCENT_OF_NON_PRODUCTION_SYNTHETIC_OR_REPLAYED_TRAFFIC`
- Minimum observation window: `30_MINUTES`
- Minimum sample size: `500_REQUESTS`
- Production traffic: `0_PERCENT`

These values are suggested upper bounds only. They are not approved until signed by the Release/SRE authority.

## Signature Area

APPROVAL_TYPE:
`WP5_RELEASE_SRE_AUTHORIZATION`

DECISION:
`<APPROVED | REJECTED - external authority only>`

APPROVER_PRINCIPAL:
`<independent Release/SRE approver>`

APPROVER_ROLE:
`RELEASE_SRE_AUTHORITY`

EXECUTOR_PRINCIPAL:
`<Platform Verification Operator>`

SEPARATION_OF_DUTIES_CHECK:
`<PASS | FAIL>`

AUTHORITY_RECORD_ID:
`<authoritative system record id>`

ISSUED_AT:
`<UTC timestamp>`

EXPIRES_AT:
`<UTC timestamp>`

SIGNATURE_OR_VERIFICATION:
`<signature or provider verification>`
