# DeepSeek Authoritative DSL Consumption Continuous Loop Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `review-gated-delivery`, `code-change-discipline`, and test-first discipline for every implementation iteration. This plan is the decomposition layer; each implementation iteration must still freeze its own exact `FILE_LOCK` before editing code.

**Goal:** Drive `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` from frozen profile evidence to `READY_FOR_USER_VALIDATION` without legacy fallback success masking.

**Architecture:** Work proceeds as a sequence of one-gap iterations. Each iteration closes one dependency-coherent capability gap with a failing test, minimal implementation, targeted validation, Oracle review, ledger update, and one reviewed commit. The canonical ledger remains `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`.

**Tech Stack:** TypeScript, Zod schemas, Vitest contract tests, `packages/game-dsl`, `apps/maker-api`, Phaser runtime contracts, local git commits only.

---

## 1. Current Baseline

- `HEAD`: `e24c808e1a7a385d23da30b67364ad403da314d2`
- Branch: `main`
- Start ahead/behind: `0 2` for `origin/main...main`
- Worktree at loop start: clean
- Push: forbidden
- M1 commit: already exists and must not be amended, rewritten, split, or reimplemented
- Current blocker: M1 needs a ledger-only `Compatibility & Cutover` repair before implementation resumes

## 2. Source Of Truth

1. Actual repository state and production code
2. Authoritative schema, types, and validators
3. `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
4. Executable tests and runtime contracts
5. Historical plans and drafts

This plan decomposes execution. It does not replace the canonical ledger.

## 3. Loop Rules

- Select the smallest dependency-ready capability gap.
- Freeze an `ITERATION_CONTRACT` before editing.
- Freeze an exact `FILE_LOCK`; do not edit outside it.
- Write or locate the failing test first and record the failure signature.
- Implement only the minimal production behavior needed for the current gap.
- Update support evidence honestly:
  - `schema_expressible`
  - `normalized`
  - `compiled`
  - `runtime_consumed`
  - `qa_observed`
- Do not mark `complete_supported` unless all five dimensions are true.
- Run targeted validation, related regressions, typecheck, and `git diff --check`.
- Send the exact diff and evidence to Oracle.
- Commit only after Oracle PASS and fingerprint consistency.
- Do not push.

## 4. Iteration Contract Template

Each iteration must be recorded in the ledger with these fields before implementation:

```text
iteration_id:
capability_gap:
affected_requirement_ids:
affected_cluster_ids:
objective:
prerequisites:
file_lock:
acceptance_assertions:
expected_failing_tests:
expected_support_evidence_change:
targeted_tests:
regression_tests:
stop_conditions:
```

## 5. Dependency Decomposition

### D0: Ledger And Plan Repair

Purpose: make the current M1 state reviewable and restartable before implementation.

Files:

- `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
- `docs/plans/deepseek-authoritative-dsl-consumption-continuous-loop.md`

Acceptance:

- M1 `Compatibility & Cutover` table exists.
- Oracle P1 and preflight facts are recorded.
- This decomposition plan exists and points back to the canonical ledger.
- No production code changes.

### D1: Player Action-State Contract

Purpose: close the first M2 dependency-ready gap without touching weapons, lifecycle, boss, provider, or production default path.

Candidate scope:

- Register missing target-profile capability IDs for player action state as incomplete, not supported by default.
- Add authoritative schema or canonical system contract for left/right, jump, crouch, grounded fire, airborne fire, and damage invulnerability.
- Preserve fail-closed behavior for unsupported or partial action-state evidence.

Candidate files to inspect before freezing:

- `packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts`
- `packages/game-dsl/src/schemas/game-dsl-v0.2.schema.ts`
- `packages/game-dsl/src/canonical-capability-runtime-compiler.ts`
- `tests/contracts/deepseek-authoritative-dsl-support.test.ts`
- `tests/contracts/canonical-capability-runtime-compiler.test.ts`

Do not implement:

- Weapon lifecycle
- Retry/checkpoint lifecycle
- Enemy archetypes
- Boss lifecycle
- DeepSeek provider path
- Production default cutover

### D2: Weapon And Loadout Lifecycle

Purpose: represent and consume default weapon, spread weapon, rapid-fire weapon, replacement, and death reset.

Prerequisite: D1 completed or explicitly blocked with no action-state dependency.

Candidate files to inspect before freezing:

- Canonical DSL schema and compiler files under `packages/game-dsl/src`
- Relevant gameplay capability registry/package contracts
- Runtime plan and tests that already mention projectiles, pickups, or weapon cooldown

Do not implement:

- Player retry/checkpoint lifecycle
- Boss behavior
- Provider integration

### D3: Player Lifecycle

Purpose: represent and consume health, retries, checkpoint restore, failure, and restart.

Prerequisite: D1 completed; D2 only if death reset depends on weapon state.

Candidate focus:

- Lifecycle schema
- Canonical compiler evidence
- Runtime plan or manifest consumer contract
- Positive and negative lifecycle tests

### D4: Ordered Level Progression

Purpose: represent and consume named segments, camera boundaries, entrance closure, ordered waves, and boss unlock.

Prerequisite: D1 completed; D3 if checkpoint placement is required by progression tests.

Candidate focus:

- Existing Scene IR and runtime-plan authority tests
- Canonical progression segments
- Wave ordering and boss unlock contract

### D5: Enemy, Hazard, And Supply Archetypes

Purpose: represent and consume patrol infantry, turret, flying enemy entry, timed explosion, and weapon supply.

Prerequisite: D4 completed.

Candidate focus:

- Enemy archetype schema
- Hazard timing contract
- Runtime plan/manifest consumer assertions

### D6: Boss Lifecycle

Purpose: represent and consume boss identity, phases, HP threshold transition, speed changes, alternating attacks, falling hazards, and stop-spawn-on-defeat.

Prerequisite: D4 and D5 completed.

Candidate focus:

- Boss schema
- State machine contract
- Runtime plan and QA evidence

### D7: HUD, State Transitions, Feedback, And Presentation

Purpose: represent and consume HUD fields, win/failure transitions, feedback declarations, and visual metadata.

Prerequisite: D2, D3, and D6 completed.

Candidate focus:

- UI/HUD schema
- Terminal transition contract
- Artifact-verifiable presentation metadata

### D8: DeepSeek Structured Authoritative Draft Path

Purpose: connect DeepSeek structured response handling to authoritative draft validation and canonicalization without live-model requirement.

Prerequisite: machine-verifiable target constructs from D1-D7 exist.

Candidate files to inspect before freezing:

- `apps/maker-api/src/model-provider/**`
- `apps/maker-api/src/projects/generation-pipeline.service.ts`
- `packages/game-dsl/src/schemas/capability-game-dsl-draft-v1.schema.ts`
- Provider and workspace tests

Do not:

- Print secrets
- Require live paid calls
- Fall back to legacy raw DSL success

### D9: Canonicalization, Runtime Plan, Manifest, And Artifact Binding

Purpose: prove canonical semantic preservation, runtime plan consumption, runtime manifest binding, artifact hashes, and declared-module loading.

Prerequisite: D8 completed.

Candidate focus:

- Canonical semantic hash
- Replay stability
- Runtime plan validators
- Runtime manifest loader
- Pipeline artifact index

### D10: Validation Suite And User Package

Purpose: complete negative, metamorphic, replay, holdout, fixed-prompt validation, final Oracle review, and `USER_VALIDATION_PACKAGE`.

Prerequisite: D1-D9 completed.

Candidate focus:

- Fixed prompt identity check
- 60-requirement traceability
- Golden validation
- Negative fail-closed validation
- Metamorphic equivalence
- Replay hash stability
- Holdout fixture
- Manual validation package

## 6. First Implementation Candidate After Docs Checkpoint

Do not start this until D0 has Oracle PASS and a clean commit.

Candidate iteration:

```text
iteration_id: CONTINUOUS-M2-ACTION-STATE-CONTRACT-001
capability_gap: target profile references missing or incomplete player action-state capability contracts
affected_requirement_ids: R008, R009, R010, R011, R012, R013
affected_cluster_ids: M2
objective: make player action-state requirements explicitly represented and fail-closed in authoritative support evidence without claiming runtime completion
expected_support_evidence_change: schema/registry evidence may increase only for explicitly implemented dimensions; runtime_consumed and qa_observed remain false until consumer evidence exists
```

Expected test-first direction:

- Add a failing contract assertion that the M2 capabilities referenced by the target profile are registered and derive below `complete_supported`.
- Add a failing canonical/compiler assertion only if the iteration freezes a canonical action-state contract and a real compiler consumer.
- The first passing implementation must not mark M2 complete.

## 7. Documentation Promotion

- Mutable execution state stays in `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`.
- This file stays as the decomposition plan.
- Implementation facts, commands, Oracle findings, commit SHA, and remaining gaps are written back to the canonical ledger after every iteration.
- Durable repo rules move to `AGENTS.md` only if the same failure repeats across steps. Current rule coverage is sufficient.
