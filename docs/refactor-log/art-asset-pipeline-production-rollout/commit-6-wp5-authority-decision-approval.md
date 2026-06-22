# WP5 / Commit 6 Authority Decision Approval

Record status: `PENDING_EXTERNAL_SIGNATURE`
Decision: `PENDING`
Approval type: `WP5_AUTHORITY_DECISION`
Prompt treated as formal approval: `NO`
Policy sponsor consent: `YES`

This document is a pending approval record. It is not effective until an independent authority signs or verifies it through an authoritative approval system.

## Proposed Decision Text

批准在 WP5 通过前，仅为取得 WP5 mandatory technical-verification evidence，在精确批准的非生产隔离环境执行一次受控 verification deploy、verification canary 和 rollback drill。

该授权仅用于 WP5 技术验证与证据采集，不构成 WP5 通过、WP6 启动、Commit 6 final gate、release authorization、生产部署、生产 canary 或生产流量变更授权。

只有在 Release/SRE Authority 与 Security/Compliance Authority 均完成独立审批，且职责分离检查通过后，本裁决才生效。

## Current State

- `AUTHORITY_DECISION_APPROVAL`: `PENDING`
- `GOVERNANCE_REQUIREMENT_CYCLE_CHECK`: `UNKNOWN_REQUIRES_AUTHORITY_DECISION`
- `VERIFICATION_ENVIRONMENT_AUTHORIZATION`: `NOT_APPROVED`
- `AUTHORIZED_VERIFICATION_DRILL_PERFORMED`: `NO`
- `WORK_PACKAGE_5`: `BLOCKED_GOVERNANCE_REQUIREMENT_AMBIGUITY`
- `WORK_PACKAGE_6`: `NOT_STARTED_BLOCKED`
- `RELEASE_AUTHORIZATION`: `false`
- `COMMIT_6_READY`: `false`
- `COMMIT_6_GATE`: `BLOCKED_PENDING_WP5_TECHNICAL_VERIFICATION`
- `PRODUCTION_DEPLOYMENT_PERFORMED`: `NO`
- `DEPLOYMENT_PERFORMED`: `NO`

## Bound Evidence

- Release source commit: `81f92081da94cface172267fed6b2835922e35e7`
- WP4 build run: `build_20260621T163428Z_7cc8af61`
- WP5 verification run: `wp5_20260622T061138Z_62d86211`
- Candidate artifact URI: `oss://together-game/ai-game-maker/release-evidence/trusted-build-artifacts/build_20260621T163428Z_7cc8af61/sha256-7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f/ai-game-maker-workbench-release_20260621T163428Z_7cc8af61.tar.gz`
- Candidate artifact SHA-256: `sha256:7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f`
- Candidate provenance URI: `oss://together-game/ai-game-maker/release-evidence/provenance/build_20260621T163428Z_7cc8af61/sha256-dd3f7550a41f4a57f0f10fdf7c9249929c4a38ef502047fc58858abdb5aebae8/trusted-build-provenance-20260621T163428Z-7cc8af61.json`
- Candidate provenance SHA-256: `sha256:dd3f7550a41f4a57f0f10fdf7c9249929c4a38ef502047fc58858abdb5aebae8`

## Required External Values

The authority record must provide exact values for `cloudAccountId`, `region`, `environmentName`, `platform`, `cluster`, `namespace`, `service`, `vpcOrNetworkBoundary`, `dataBoundary`, `secretSource`, `observabilitySource`, and `verificationOperatorRole`.

Until those values are signed and verified, `VERIFICATION_ENVIRONMENT_AUTHORIZATION` remains `NOT_APPROVED`.

## Signature Area

APPROVAL_TYPE:
`WP5_AUTHORITY_DECISION`

DECISION:
`<APPROVED | REJECTED - external authority only>`

APPROVER_PRINCIPAL:
`<must be filled by authority system or approver>`

APPROVER_ROLE:
`<must be filled by authority system or approver>`

AUTHORITY_SYSTEM:
`<authoritative approval system>`

AUTHORITY_RECORD_ID:
`<authoritative record id>`

ISSUED_AT:
`<UTC timestamp>`

EXPIRES_AT:
`<UTC timestamp>`

REVOCATION_STATUS:
`<NOT_REVOKED | REVOKED>`

SIGNATURE_OR_VERIFICATION:
`<signature or provider verification>`
