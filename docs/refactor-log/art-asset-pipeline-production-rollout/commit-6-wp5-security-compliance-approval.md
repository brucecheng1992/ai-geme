# WP5 / Commit 6 Security/Compliance Approval

Record status: `PENDING_EXTERNAL_SIGNATURE`
Decision: `PENDING`
Approval type: `WP5_SECURITY_COMPLIANCE_AUTHORIZATION`

This document is a pending Security/Compliance approval record. It does not authorize evidence upload, SourceIdentity compensation, WP5 PASS, WP6, final gate, release authorization, or production deployment.

## Required Security/Compliance Decisions

- `EVIDENCE_WRITER_SESSION_AUTHORIZATION`: `PENDING`
- `BLOCKED_EVIDENCE_WORM_RETENTION`: `PENDING`
- `SUCCESS_EVIDENCE_WORM_RETENTION`: `PENDING`
- `WP5_SLS_CORRELATION_REQUIREMENT`: `PENDING`
- `WP5_SOURCE_IDENTITY_REQUIREMENT`: `PENDING`
- `WP5_SOURCE_IDENTITY_COMPENSATING_CORRELATION`: `PENDING`
- `PROVIDER_TICKET_HANDLING`: `PENDING`

## Evidence Writer Scope

- Suggested role: `ai-game-maker-evidence-writer`
- Role session name: `wp5-wp5_20260622T061138Z_62d86211`
- Session duration: `3600_SECONDS`
- Allowed bucket: `together-game`
- Allowed prefix: `ai-game-maker/release-evidence/wp5/wp5_20260622T061138Z_62d86211/`
- Allowed actions: `PutObject`, `HeadObject`, `GetObject`
- Denied actions: delete object/version, modify bucket policy, modify WORM policy, write other run prefixes, manage RAM, modify audit configuration.

The above is a requested scope only. `EVIDENCE_WRITER_SESSION_AUTHORIZATION` remains `NOT_APPROVED` until independently signed and verified.

## WORM and SourceIdentity

- Blocked evidence WORM required: `true`
- Success evidence WORM required: `true`
- Blocked path template: `release-evidence/wp5/blocked/wp5_20260622T061138Z_62d86211/sha256-<digest>/`
- Success path template: `release-evidence/wp5/success/wp5_20260622T061138Z_62d86211/sha256-<digest>/`
- Native SourceIdentity required: `true`
- WP5 compensating correlation: `NOT_APPROVED_FOR_WP5`
- WP4 compensating correlation reusable for WP5: `false`
- Provider ticket: `00AWWPRR6J`
- Provider ticket status: `NOT_RECHECKED`

## Candidate Binding

- Release source commit: `81f92081da94cface172267fed6b2835922e35e7`
- WP4 build run: `build_20260621T163428Z_7cc8af61`
- WP5 verification run: `wp5_20260622T061138Z_62d86211`
- Candidate artifact URI: `oss://together-game/ai-game-maker/release-evidence/trusted-build-artifacts/build_20260621T163428Z_7cc8af61/sha256-7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f/ai-game-maker-workbench-release_20260621T163428Z_7cc8af61.tar.gz`
- Candidate artifact SHA-256: `sha256:7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f`

## Signature Area

APPROVAL_TYPE:
`WP5_SECURITY_COMPLIANCE_AUTHORIZATION`

DECISION:
`<APPROVED | REJECTED - external authority only>`

APPROVER_PRINCIPAL:
`<independent Security/Compliance approver>`

APPROVER_ROLE:
`SECURITY_COMPLIANCE_AUTHORITY`

EVIDENCE_WRITER_CALLER:
`<actual least-privilege evidence writer principal>`

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
