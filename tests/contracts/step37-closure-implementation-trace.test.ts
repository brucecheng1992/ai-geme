import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { createHealthDamageInvulnerabilityPackageContract } from '../../packages/game-dsl/src/index.js';

const stage4PlanPath = 'docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md';
const healthDamageInvulnerabilityClosureTitle = '## Stage 4 Closure Implementation — Health Damage Invulnerability Package-Owned QA Slice';
const healthDamageInvulnerabilityCheckpointCommit = 'd8225bf1';
const movementCrouchAuditTitle = '## Stage 4 Audit — Movement Crouch Package-Owned QA Slice';
const movementCrouchAuditCheckpointCommit = '09c1ea60';
const auditBoundaryAndIdentifierGuardrailTitle = '## Stage 4 Improvement Log — Audit Boundary And Identifier Guardrails';
const auditBoundaryIdentifierClosureTitle = '## Stage 4 Closure Implementation — Audit Boundary And Identifier Guardrails';
const auditBoundaryIdentifierCheckpointCommit = '2d49b17e';
const cleanBaselineClosureGuardrailTitle = '## Stage 4 Improvement Log — Clean Baseline Closure Guardrail';
const timeoutDiagnosisGuardrailTitle = '## Stage 4 Improvement Log — Timeout Diagnosis Guardrail';
const movementCrouchClosureTitle = '## Stage 4 Closure Implementation — Movement Crouch Package-Owned QA Slice';
const movementCrouchCheckpointCommit = 'bdb01f36';
const runtimeStateAndClosureStatusGuardrailTitle = '## Stage 4 Improvement Log — Runtime State And Closure State Guardrails';
const runtimeStateAndClosureStatusClosureTitle = '## Stage 4 Closure Implementation — Runtime State And Closure State Guardrails';
const runtimeStateAndClosureStatusCheckpointCommit = '8075ca7c';
const structuredClosureFieldGuardrailTitle = '## Stage 4 Improvement Log — Structured Closure Field Guardrail';
const structuredClosureFieldClosureTitle = '## Stage 4 Closure Implementation — Structured Closure Field Guardrail';
const transitionErrorEnvelopeGuardrailTitle = '## Stage 4 Improvement Log — Transition Error Envelope Guardrail';
const transitionErrorEnvelopeClosureTitle = '## Stage 4 Closure Implementation — Transition Error Envelope Guardrail';
const transitionErrorEnvelopeCheckpointCommit = '22dd6ce4';
const oracleRevisionAlignmentGuardrailTitle = '## Stage 4 Improvement Log — Oracle Revision Alignment Guardrail';
const oracleRevisionAlignmentClosureTitle = '## Stage 4 Closure Implementation — Oracle Revision Alignment Guardrail';
const oracleRevisionAlignmentCheckpointCommit = '05b6932e';
const oracleRevisionAlignmentReceiptCommit = '7a160c5b';
const verificationFreshnessImmutableReviewGuardrailTitle = '## Stage 4 Improvement Log — Verification Freshness And Immutable Review Guardrail';
const verificationFreshnessImmutableReviewClosureTitle = '## Stage 4 Closure Implementation — Verification Freshness And Immutable Review Guardrail';
const codeChangeDisciplineSkillPath = '/Users/dahufa/.agents/skills/code-change-discipline/SKILL.md';
const codeChangeDisciplineSkillRoot = '/Users/dahufa/.agents/skills/code-change-discipline';
const codeChangeDisciplineSkillSha256 = 'ac0f7e7d033bf7b44e3e4fe13cc151ca2d240bf8bb871c27eaba2af963c6490f';
const codeChangeDisciplineSkillBundleDigest = 'd3c166ab08562696e099937e1036c51c81c9415cf8e0aef43a906c7acfb51aca';
const codeChangeDisciplineSkillManifest = [
  {
    relativePath: 'SKILL.md',
    fileType: 'file',
    byteLength: 35331,
    sha256: codeChangeDisciplineSkillSha256,
    symlinkTarget: '-',
    symlinkEscapesRoot: false
  }
] as const;

const claimedAuditBoundaryIdentifierPaths = [
  stage4PlanPath,
  'tests/contracts/step37-closure-implementation-trace.test.ts',
  'tests/contracts/art-asset-metadata-runtime-export-cli.test.ts'
];

const claimedHealthDamageInvulnerabilityPaths = [
  'packages/game-dsl/src/gameplay-capabilities/health-damage-invulnerability-package.ts',
  'packages/game-dsl/src/gameplay-capabilities/health-damage-invulnerability-runtime-module.ts',
  'packages/game-dsl/src/gameplay-capabilities/registry.ts',
  'packages/game-dsl/src/gameplay-capabilities/index.ts',
  'packages/runtime-core/src/telemetry/telemetry-event-v0.1.schema.ts',
  'apps/maker-api/src/projects/generation-pipeline.service.ts',
  'apps/maker-api/src/qa/playwright-browser-runner.ts',
  'apps/maker-api/src/qa/qa.types.ts',
  'templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts',
  'tests/contracts/gameplay-capability-package-contract.test.ts',
  'tests/contracts/gameplay-capability-registry.test.ts',
  'tests/contracts/generation-target-profile-runtime-support.test.ts',
  'tests/contracts/deepseek-authoritative-dsl-support.test.ts',
  'tests/contracts/phaser-templates.test.ts',
  'tests/workspace/generation-pipeline.service.test.ts',
  'tests/workspace/playwright-qa-runner.test.ts'
];

const claimedMovementCrouchPaths = [
  stage4PlanPath,
  'packages/game-dsl/src/gameplay-capabilities/movement-crouch-runtime-module.ts',
  'packages/game-dsl/src/gameplay-capabilities/movement-crouch-package.ts',
  'packages/game-dsl/src/gameplay-capabilities/index.ts',
  'packages/game-dsl/src/gameplay-capabilities/registry.ts',
  'packages/game-dsl/src/gameplay-capabilities/capability-qa-probes.ts',
  'apps/maker-api/src/qa/qa.types.ts',
  'apps/maker-api/src/qa/playwright-browser-runner.ts',
  'apps/maker-api/src/projects/generation-pipeline.service.ts',
  'packages/runtime-core/src/telemetry/telemetry-event-v0.1.schema.ts',
  'templates/phaser/shared/kernel.ts',
  'templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts',
  'templates/phaser/side_scrolling_run_and_gun/src/main.ts',
  'tests/contracts/gameplay-capability-package-contract.test.ts',
  'tests/contracts/gameplay-capability-registry.test.ts',
  'tests/contracts/generation-target-profile-runtime-support.test.ts',
  'tests/contracts/phaser-templates.test.ts',
  'tests/workspace/generation-pipeline.service.test.ts',
  'tests/workspace/playwright-qa-runner.test.ts'
];

describe('Step37 closure implementation traceability', () => {
  it('keeps the health damage invulnerability closure section evidence-backed', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, healthDamageInvulnerabilityClosureTitle);

    expect(section).toContain(`implementation checkpoint: \`${healthDamageInvulnerabilityCheckpointCommit}\``);
    expect(section).toContain('Stage 4 Health Damage Invulnerability Package-Owned QA Slice Implementation: CHECKPOINT_COMMITTED');
    expect(section).toContain('health.damage_invulnerability.v1.window.browser_qa.v1');
    expect(section).toContain('assertion.window_activated');
    expect(section).toContain('assertion.damage_blocked');
    expect(section).toContain('health.damage_invulnerability.blocked');
    expect(section).toContain('observedCompleteSupportedCount=9');
    expect(section).toContain('staticCompleteSupportedCount=0');
    expect(section).toContain('target_profile_runtime_support_incomplete:9/59');
    expect(section).toContain('exit code 0');
    expect(section).toContain('Full tests after Oracle P2 fix: `npm test` passed');
    expect(section).toContain('Typecheck: `npm run typecheck` passed');
    expect(section).toContain('Unresolved items:');
    expect(section).toContain('Stage 4 full package closure remains `NOT_MET`');
    expect(section).toContain('planned -> landed -> verified -> oracle_blocked_p2 -> fixed -> verified -> oracle_passed -> checkpoint_committed');
    expect(section).toContain('### Exit Assessment After Oracle');
  });

  it('requires every path claimed by the closure section to exist and belong to the checkpoint diff', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, healthDamageInvulnerabilityClosureTitle);
    const checkpointPaths = changedPathsForCommit(healthDamageInvulnerabilityCheckpointCommit);

    for (const path of claimedHealthDamageInvulnerabilityPaths) {
      expect(section).toContain(`\`${path}\``);
      expect(checkpointPaths).toContain(path);
      await expect(access(path)).resolves.toBeUndefined();
    }
  });

  it('requires validation receipts to keep commands, exit codes and execution results consistent', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, healthDamageInvulnerabilityClosureTitle);
    const receipts = parseValidationReceipts(section);

    expect(receipts.map((receipt) => receipt.command)).toEqual([
      'npx tsx --eval "... createHealthDamageInvulnerabilityPackageContract ..."',
      'npx vitest run tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/generation-target-profile-runtime-support.test.ts tests/workspace/generation-pipeline.service.test.ts -t "damage invulnerability|runtime-observed support|rewrites side-scrolling runtime scene binding report|routes supported side-scrolling"',
      'npx vitest run tests/contracts/gameplay-capability-package-contract.test.ts tests/contracts/gameplay-capability-registry.test.ts tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/generation-target-profile-runtime-support.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/playwright-qa-runner.test.ts tests/workspace/generation-pipeline.service.test.ts',
      'npm test',
      'npm run typecheck',
      'git diff --check'
    ]);
    expect(receipts.every((receipt) => receipt.exitCode === 0)).toBe(true);
    expect(receipts.every((receipt) => /\b(passed|resolved)\b/i.test(receipt.result))).toBe(true);
    expect(evaluateClosureGate({ validationReceipts: receipts, unresolvedItems: [], requestedStatus: 'closed' })).toBe('closed');
  });

  it('parses required evidence from the actual package contract, not only from prose', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, healthDamageInvulnerabilityClosureTitle);
    const probe = createHealthDamageInvulnerabilityPackageContract().qa.probes.find(
      (candidate) => candidate.id === 'health.damage_invulnerability.v1.window.browser_qa.v1'
    );

    expect(probe).toBeDefined();
    expect(probe?.severity).toBe('required');
    expect(probe?.observations.map((observation) => observation.ref).sort()).toEqual([
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked'
    ]);
    expect(probe?.assertions.map((assertion) => assertion.id).sort()).toEqual([
      'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.damage_blocked',
      'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.window_activated'
    ]);
    expect(section).toContain(probe?.id);
    for (const assertion of probe?.assertions ?? []) {
      expect(section).toContain(assertion.id.replace('health.damage_invulnerability.v1.window.browser_qa.v1.', ''));
    }
  });

  it('does not allow unresolved items or failed validations to be recorded as closed', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, healthDamageInvulnerabilityClosureTitle);
    const unresolvedItems = parseUnresolvedItems(section);
    const currentImplementationStatus = parseLastImplementationStatus(section);

    expect(unresolvedItems.length).toBeGreaterThan(0);
    expect(currentImplementationStatus).toBe('CHECKPOINT_COMMITTED');
    expect(currentImplementationStatus).not.toBe('CLOSED');
    expect(evaluateClosureGate({ validationReceipts: parseValidationReceipts(section), unresolvedItems, requestedStatus: 'closed' })).toBe('blocked');
    expect(
      evaluateClosureGate({
        validationReceipts: [{ command: 'npm test', exitCode: 1, result: 'failed' }],
        unresolvedItems: [],
        requestedStatus: 'closed'
      })
    ).toBe('incomplete');
  });

  it('keeps closure state transitions inside the allowed state machine', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, healthDamageInvulnerabilityClosureTitle);
    const states = parseStateTransition(section);

    expect(states).toEqual(['planned', 'landed', 'verified', 'oracle_blocked_p2', 'fixed', 'verified', 'oracle_passed', 'checkpoint_committed']);
    expect(validateStateTransition(states)).toEqual([]);
  });

  it('preserves the prior audit record instead of overwriting it', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const auditSection = extractSection(document, '## Stage 4 Review — Health Damage Invulnerability Package-Owned QA Slice');
    const implementationIndex = document.indexOf(healthDamageInvulnerabilityClosureTitle);
    const auditIndex = document.indexOf('## Stage 4 Review — Health Damage Invulnerability Package-Owned QA Slice');

    expect(auditIndex).toBeGreaterThanOrEqual(0);
    expect(implementationIndex).toBeGreaterThan(auditIndex);
    expect(auditSection).toContain('Stage 4 Health Damage Invulnerability Package-Owned QA Slice Audit: ORACLE_PASSED_AWAITING_COMMIT');
    expect(auditSection).toContain('Stage 4 Health Damage Invulnerability Package-Owned QA Slice Implementation: NOT_ENTERED');
    expect(auditSection).toContain('Stop marker: Stage 4 `health.damage_invulnerability.v1` package-owned QA slice audit passed Oracle');
  });

  it('records the current improvement log guardrails against false closure', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, '## Stage 4 Improvement Log — Evidence And Closure Guardrails');

    expect(section).toContain('prevents false passes that lack real runtime evidence');
    expect(section).toContain('prevents false failures caused only by array order drift');
    expect(section).toContain('claimed paths exist');
    expect(section).toContain('claimed modifications are visible in diff or commit history');
    expect(section).toContain('tests/contracts/step37-closure-implementation-trace.test.ts');
  });

  it('keeps the movement crouch audit checkpoint docs-only and implementation-free', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, movementCrouchAuditTitle);
    const checkpointPaths = changedPathsForCommit(movementCrouchAuditCheckpointCommit);

    expect(checkpointPaths).toEqual([stage4PlanPath]);
    expect(section).toContain('Current Stage review conclusion: `movement.crouch.v1`');
    expect(section).toContain('### Minimal Closure Requirements');
    expect(section).toContain('### Compatibility & Cutover');
    expect(section).toContain('### Audit Exit Assessment');
    expect(section).toContain('Stage 4 Movement Crouch Package-Owned QA Slice Implementation: NOT_ENTERED');
    expect(section).toContain('Stage 4 Exit gate: NOT_MET');
    expect(section).toContain('Stop marker: Stage 4 `movement.crouch.v1`');
    expect(section).toContain('Do not implement this slice');
    expect(section).toContain('NEW_CONSUMER_REQUIRED');
    expect(section).not.toContain('## Stage 4 Closure Implementation — Movement Crouch');
    expect(section).not.toContain('Actual code paths');
    expect(section).not.toContain('planned -> landed');
  });

  it('keeps the movement crouch implementation closure traceable to checkpoint evidence', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, movementCrouchClosureTitle);
    const checkpointPaths = changedPathsForCommit(movementCrouchCheckpointCommit);

    expect(section).toContain(`implementation checkpoint: \`${movementCrouchCheckpointCommit}\``);
    expect(section).toContain('implementation status: `CHECKPOINT_COMMITTED`');
    expect(section).toContain('local_validation: `passed`');
    expect(section).toContain('oracle_status: `passed`');
    for (const path of claimedMovementCrouchPaths) {
      expect(section).toContain(`\`${path}\``);
      expect(checkpointPaths).toContain(path);
      await expect(access(path)).resolves.toBeUndefined();
    }
    expect(section).toContain('movement.crouch.v1.state.browser_qa.v1');
    expect(section).toContain('movement.crouch.entered');
    expect(section).toContain('crouching=true');
    expect(section).toContain('heightScale=0.58');
    expect(section).toContain('observed support from `9/59` to `10/59`');
    expect(section).toContain('staticCompleteSupportedCount=0');
    expect(section).toContain('npx vitest run tests/contracts/step37-closure-implementation-trace.test.ts');
    expect(section).toContain('oracle_agent_id: `019effae-8aa2-7c22-b5ba-8c4b69f21d20`');
    expect(section).toContain('oracle_submission_id: `019f0013-d158-7b82-bd80-7678b7afab0d`');
    expect(section).toContain('result: `PASS / no P0/P1/P2 blocking findings`');
    expect(section).toContain('planned -> landed -> verified -> oracle_passed -> checkpoint_committed');
    expect(section).toContain('Stage 4 Movement Crouch Package-Owned QA Slice Implementation: CHECKPOINT_COMMITTED');
    expect(section).toContain('Stage 4 Exit gate: NOT_MET');
  });

  it('records runtime-state and closure-state guardrails without rewriting the crouch audit', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, runtimeStateAndClosureStatusGuardrailTitle);
    const auditIndex = document.indexOf(movementCrouchAuditTitle);
    const implementationIndex = document.indexOf(movementCrouchClosureTitle);
    const guardrailIndex = document.indexOf(runtimeStateAndClosureStatusGuardrailTitle);

    expect(auditIndex).toBeGreaterThanOrEqual(0);
    expect(implementationIndex).toBeGreaterThan(auditIndex);
    expect(guardrailIndex).toBeGreaterThan(implementationIndex);
    expect(section).toContain('Queued feedback discipline');
    expect(section).toContain('must stay queued');
    expect(section).toContain('Runtime state evidence');
    expect(section).toContain('not just the input or action event');
    expect(section).toContain('`crouching=true` and the required `heightScale`');
    expect(section).toContain('registry support evidence');
    expect(section).toContain('package/runtime probe');
    expect(section).toContain('QA evidence reader');
    expect(section).toContain('target-profile runtime overlay');
    expect(section).toContain('same-run evidence may update observed support only');
    expect(section).toContain('local_validation: passed');
    expect(section).toContain('oracle_status: pending');
    expect(section).toContain('`ORACLE_PENDING` cannot satisfy closed must-pass requirements');
    expect(section).toContain('rerun the related contract tests');
    expect(section).toContain('tests/contracts/step37-closure-implementation-trace.test.ts');
  });

  it('keeps the runtime-state guardrail closure traceable to its checkpoint', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, runtimeStateAndClosureStatusClosureTitle);
    const checkpointPaths = changedPathsForCommit(runtimeStateAndClosureStatusCheckpointCommit);

    expect(section).toContain(`implementation checkpoint: \`${runtimeStateAndClosureStatusCheckpointCommit}\``);
    expect(section).toContain('implementation status: `CHECKPOINT_COMMITTED`');
    expect(section).toContain('local_validation: `passed`');
    expect(section).toContain('oracle_status: `passed`');
    expect(checkpointPaths).toEqual([stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'].sort());
    expect(section).toContain('planned -> landed -> verified -> oracle_passed -> checkpoint_committed');
    expect(section).toContain('Stage 4 Runtime State And Closure State Guardrails: CHECKPOINT_COMMITTED');
    expect(section).toContain('Stage 4 Exit gate: NOT_MET');
  });

  it('records structured closure field guardrails as local-section contracts', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, structuredClosureFieldGuardrailTitle);
    const closureSection = extractSection(document, structuredClosureFieldClosureTitle);

    expect(section).toContain('Structured facts over near-synonyms');
    expect(section).toContain('machine-parseable key/value records');
    expect(section).toContain('focused contract fails');
    expect(section).toContain('fix the verified object instead of loosening the assertion');
    expect(section).toContain('Section-local validation');
    expect(section).toContain('missing fields, duplicate fields, conflicting statuses, invalid field values, and illegal state transitions');
    expect(section).toContain('actual parsed value');
    expect(section).toContain('rerun the same failed focused contract first');
    expect(section).toContain('focused GREEN proves only that local contract gap is fixed');
    expect(validateStructuredClosureSection(closureSection, structuredClosureFieldClosureTitle)).toEqual([]);
  });

  it('rejects ambiguous or conflicting structured closure fields with actionable errors', () => {
    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `ORACLE_PENDING`.',
          '- local_validation: `passed`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> landed -> verified -> oracle_pending',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'MISSING_FIELD section="## Stage 4 Closure Implementation — Example" field="oracle_status" actual="<missing>" allowed="not_submitted|pending|passed|approved|changes_required|blocked"'
    ]);

    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `ORACLE_PENDING`.',
          '- local_validation: `passed`.',
          '- oracle_status: `pending`.',
          '- oracle_status: `passed`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> landed -> verified -> oracle_pending',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'DUPLICATE_FIELD section="## Stage 4 Closure Implementation — Example" field="oracle_status" actual="pending,passed" allowed="not_submitted|pending|passed|approved|changes_required|blocked"'
    ]);

    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `CLOSED`.',
          '- local_validation: `passed`.',
          '- oracle_status: `pending`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> landed -> verified -> oracle_pending',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'CONFLICTING_STATUS section="## Stage 4 Closure Implementation — Example" field="oracle_status" actual="pending" allowed="passed|approved"'
    ]);

    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `ORACLE_PENDING`.',
          '- local_validation: `done`.',
          '- oracle_status: `pending`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> landed -> verified -> oracle_pending',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'INVALID_FIELD_VALUE section="## Stage 4 Closure Implementation — Example" field="local_validation" actual="done" allowed="passed|failed|not_run"'
    ]);

    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `CLOSED`.',
          '- local_validation: `passed`.',
          '- oracle_status: `passed`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> landed -> closed',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'ILLEGAL_STATE_TRANSITION section="## Stage 4 Closure Implementation — Example" field="state_transition" actual="landed -> closed" allowed="verified"'
    ]);
  });

  it('keeps transition validation specific to unknown, skip, reverse and legal paths', () => {
    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `LOCALLY_VALIDATED`.',
          '- local_validation: `passed`.',
          '- oracle_status: `not_submitted`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> unknown_state',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'UNKNOWN_STATE section="## Stage 4 Closure Implementation — Example" field="state_transition" actual="unknown_state" allowed="planned|landed|verified|oracle_pending|oracle_blocked_p2|fixed|oracle_passed|awaiting_checkpoint|checkpoint_committed|closed"'
    ]);

    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `LOCALLY_VALIDATED`.',
          '- local_validation: `passed`.',
          '- oracle_status: `not_submitted`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> verified',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'ILLEGAL_STATE_TRANSITION section="## Stage 4 Closure Implementation — Example" field="state_transition" actual="planned -> verified" allowed="landed"'
    ]);

    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `LOCALLY_VALIDATED`.',
          '- local_validation: `passed`.',
          '- oracle_status: `not_submitted`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> landed -> verified -> landed',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([
      'ILLEGAL_STATE_TRANSITION section="## Stage 4 Closure Implementation — Example" field="state_transition" actual="verified -> landed" allowed="oracle_pending|oracle_blocked_p2|oracle_passed"'
    ]);

    expect(
      validateStructuredClosureSection(
        [
          '## Stage 4 Closure Implementation — Example',
          '- implementation status: `CHECKPOINT_COMMITTED`.',
          '- local_validation: `passed`.',
          '- oracle_status: `passed`.',
          '',
          'State transition:',
          '',
          '```text',
          'planned -> landed -> verified -> oracle_pending -> oracle_passed -> awaiting_checkpoint -> checkpoint_committed',
          '```'
        ].join('\n'),
        '## Stage 4 Closure Implementation — Example'
      )
    ).toEqual([]);
  });

  it('records transition error envelope guardrails without changing runtime scope', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, transitionErrorEnvelopeGuardrailTitle);
    const closureSection = extractSection(document, transitionErrorEnvelopeClosureTitle);

    expect(section).toContain('Shared envelope');
    expect(section).toContain('Type-specific context');
    expect(section).toContain('`actual` must include the current and target states as `A -> B`');
    expect(section).toContain('Allowed next states');
    expect(section).toContain('not every possible state or every possible transition');
    expect(section).toContain('unknown state, skip transition, and reverse transition');
    expect(section).toContain('legal transitions');
    expect(section).toContain('canonical state map');
    expect(section).toContain('validation failures, not warnings');
    expect(closureSection).toContain('no runtime, schema, compiler, QA runner behavior');
    expect(closureSection).toContain('state-machine expansion');
    expect(closureSection).toContain('actual` is `A -> B`');
    expect(closureSection).toContain('canonical next-state `allowed`');
    expect(validateStructuredClosureSection(closureSection, transitionErrorEnvelopeClosureTitle)).toEqual([]);
  });

  it('keeps the transition-envelope guardrail closure linked to its checkpoint commit', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, transitionErrorEnvelopeClosureTitle);
    const checkpointPaths = changedPathsForCommit(transitionErrorEnvelopeCheckpointCommit);

    expect(section).toContain(`implementation checkpoint: \`${transitionErrorEnvelopeCheckpointCommit}\``);
    expect(section).toContain('implementation status: `CHECKPOINT_COMMITTED`');
    expect(checkpointPaths).toEqual([stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'].sort());
    expect(validateStructuredClosureSection(section, transitionErrorEnvelopeClosureTitle)).toEqual([]);
  });

  it('records Oracle revision alignment guardrails as reproducible line evidence', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, oracleRevisionAlignmentGuardrailTitle);
    const closureSection = extractSection(document, oracleRevisionAlignmentClosureTitle);

    expect(section).toContain('same repository, worktree, branch, commit SHA, file path, and checkpoint identity');
    expect(section).toContain('rg` search command and result');
    expect(section).toContain('`nl` line range');
    expect(section).toContain('current value versus Oracle quoted stale value');
    expect(section).toContain('must request re-review against the current revision');
    expect(closureSection).toContain('review evidence bundle');
    expect(closureSection).toContain('oracle_status: `approved`');
    expect(closureSection).toContain('oracle_agent_id: `019effae-8aa2-7c22-b5ba-8c4b69f21d20`');
    expect(closureSection).toContain('oracle_initial_submission_id: `019f0047-9493-7ff0-ae26-011e06111559`');
    expect(closureSection).toContain('oracle_rereview_submission_id: `019f004d-640e-77e0-9dca-0742391e25bd`');
    expect(closureSection).toContain('source: existing Oracle agent handle');
    expect(closureSection).toContain('source: first `send_input` response');
    expect(closureSection).toContain('source: second `send_input` response');
    expect(closureSection).toContain('no runtime, schema, compiler, QA runner behavior');
    expect(validateStructuredClosureSection(closureSection, oracleRevisionAlignmentClosureTitle)).toEqual([]);
  });

  it('validates Oracle revision evidence before treating stale review findings as current', () => {
    expect(
      validateOracleRevisionEvidenceBundle({
        repository: 'ai-game-maker',
        expectedRepository: 'ai-game-maker',
        worktree: '/Users/dahufa/Documents/workspace/ai-game-maker',
        expectedWorktree: '/Users/dahufa/Documents/workspace/ai-game-maker',
        branch: 'main',
        expectedBranch: 'main',
        currentCommitSha: transitionErrorEnvelopeCheckpointCommit,
        oracleCommitSha: transitionErrorEnvelopeCheckpointCommit,
        filePath: stage4PlanPath,
        oracleFilePath: stage4PlanPath,
        sectionId: 'transition_error_envelope_guardrail',
        oracleSectionId: 'transition_error_envelope_guardrail',
        rgCommand: 'rg -n "22 tests|1083 tests|23 tests|1084 tests" docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md',
        rgResults: ['2920:result=PASS: 23 tests passed', '2924:result=PASS: contracts 95 files / 1084 tests; workspace 34 files / 408 tests'],
        nlRange: '2910,2930',
        currentValue: '23 tests / 1084 tests',
        oracleQuotedValue: '22 tests / 1083 tests'
      })
    ).toEqual([]);

    expect(
      validateOracleRevisionEvidenceBundle({
        repository: 'ai-game-maker',
        expectedRepository: 'other-repo',
        worktree: '/Users/dahufa/Documents/workspace/ai-game-maker',
        expectedWorktree: '/tmp/stale-ai-game-maker',
        branch: 'main',
        expectedBranch: 'stale-review-branch',
        currentCommitSha: transitionErrorEnvelopeCheckpointCommit,
        oracleCommitSha: 'stale-sha',
        filePath: stage4PlanPath,
        oracleFilePath: 'docs/plans/stale-step37-receipt.md',
        sectionId: 'transition_error_envelope_guardrail',
        oracleSectionId: 'other_guardrail',
        rgCommand: '',
        rgResults: [],
        nlRange: '',
        currentValue: '23 tests / 1084 tests',
        oracleQuotedValue: '22 tests / 1083 tests'
      })
    ).toEqual([
      'REVISION_MISMATCH field="repository" actual="ai-game-maker" expected="other-repo"',
      'REVISION_MISMATCH field="worktree" actual="/Users/dahufa/Documents/workspace/ai-game-maker" expected="/tmp/stale-ai-game-maker"',
      'REVISION_MISMATCH field="branch" actual="main" expected="stale-review-branch"',
      'REVISION_MISMATCH field="commit_sha" actual="22dd6ce4" expected="stale-sha"',
      'REVISION_MISMATCH field="file_path" actual="docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md" expected="docs/plans/stale-step37-receipt.md"',
      'REVISION_MISMATCH field="section_id" actual="transition_error_envelope_guardrail" expected="other_guardrail"',
      'MISSING_REVIEW_EVIDENCE field="rgCommand" actual="<missing>" expected="present"',
      'MISSING_REVIEW_EVIDENCE field="rgResults" actual="<missing>" expected="present"',
      'MISSING_REVIEW_EVIDENCE field="nlRange" actual="<missing>" expected="present"'
    ]);
  });

  it('fails checkpoint trace links when log, closure, identity, commit or workspace state is ambiguous', () => {
    expect(
      validateGuardrailCheckpointTrace({
        logExists: true,
        closureExists: true,
        logIdentity: 'transition_error_envelope_guardrail',
        closureIdentity: 'transition_error_envelope_guardrail',
        commitSha: transitionErrorEnvelopeCheckpointCommit,
        commitExists: true,
        committedPaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        expectedCommittedPaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        closureStatus: 'CHECKPOINT_COMMITTED',
        unexplainedImplementationDiffPaths: []
      })
    ).toEqual([]);

    expect(
      validateGuardrailCheckpointTrace({
        logExists: false,
        closureExists: true,
        logIdentity: 'transition_error_envelope_guardrail',
        closureIdentity: 'transition_error_envelope_guardrail',
        commitSha: transitionErrorEnvelopeCheckpointCommit,
        commitExists: true,
        committedPaths: [stage4PlanPath],
        expectedCommittedPaths: [stage4PlanPath],
        closureStatus: 'CHECKPOINT_COMMITTED',
        unexplainedImplementationDiffPaths: []
      })
    ).toEqual(['MISSING_IMPROVEMENT_LOG identity="transition_error_envelope_guardrail"']);

    expect(
      validateGuardrailCheckpointTrace({
        logExists: true,
        closureExists: false,
        logIdentity: 'transition_error_envelope_guardrail',
        closureIdentity: 'transition_error_envelope_guardrail',
        commitSha: transitionErrorEnvelopeCheckpointCommit,
        commitExists: true,
        committedPaths: [stage4PlanPath],
        expectedCommittedPaths: [stage4PlanPath],
        closureStatus: 'CHECKPOINT_COMMITTED',
        unexplainedImplementationDiffPaths: []
      })
    ).toEqual(['MISSING_CLOSURE_RECORD identity="transition_error_envelope_guardrail"']);

    expect(
      validateGuardrailCheckpointTrace({
        logExists: true,
        closureExists: true,
        logIdentity: 'transition_error_envelope_guardrail',
        closureIdentity: 'structured_field_guardrail',
        commitSha: transitionErrorEnvelopeCheckpointCommit,
        commitExists: true,
        committedPaths: [stage4PlanPath],
        expectedCommittedPaths: [stage4PlanPath],
        closureStatus: 'CHECKPOINT_COMMITTED',
        unexplainedImplementationDiffPaths: []
      })
    ).toEqual(['CHECKPOINT_IDENTITY_MISMATCH log="transition_error_envelope_guardrail" closure="structured_field_guardrail"']);

    expect(
      validateGuardrailCheckpointTrace({
        logExists: true,
        closureExists: true,
        logIdentity: 'transition_error_envelope_guardrail',
        closureIdentity: 'transition_error_envelope_guardrail',
        commitSha: 'deadbeef',
        commitExists: false,
        committedPaths: [],
        expectedCommittedPaths: [stage4PlanPath],
        closureStatus: 'CHECKPOINT_COMMITTED',
        unexplainedImplementationDiffPaths: []
      })
    ).toEqual(['COMMIT_NOT_FOUND commit="deadbeef"']);

    expect(
      validateGuardrailCheckpointTrace({
        logExists: true,
        closureExists: true,
        logIdentity: 'transition_error_envelope_guardrail',
        closureIdentity: 'transition_error_envelope_guardrail',
        commitSha: transitionErrorEnvelopeCheckpointCommit,
        commitExists: true,
        committedPaths: [],
        expectedCommittedPaths: [stage4PlanPath],
        closureStatus: 'CHECKPOINT_COMMITTED',
        unexplainedImplementationDiffPaths: []
      })
    ).toEqual([`COMMIT_PATH_MISSING commit="${transitionErrorEnvelopeCheckpointCommit}" path="${stage4PlanPath}"`]);

    expect(
      validateGuardrailCheckpointTrace({
        logExists: true,
        closureExists: true,
        logIdentity: 'transition_error_envelope_guardrail',
        closureIdentity: 'transition_error_envelope_guardrail',
        commitSha: transitionErrorEnvelopeCheckpointCommit,
        commitExists: true,
        committedPaths: [stage4PlanPath],
        expectedCommittedPaths: [stage4PlanPath],
        closureStatus: 'CHECKPOINT_COMMITTED',
        unexplainedImplementationDiffPaths: ['templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts']
      })
    ).toEqual(['UNEXPLAINED_IMPLEMENTATION_DIFF path="templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts"']);
  });

  it('records verification freshness and immutable review guardrails as an implementing pre-candidate flow', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, verificationFreshnessImmutableReviewGuardrailTitle);
    const closureSection = extractSection(document, verificationFreshnessImmutableReviewClosureTitle);
    const skillBytes = await readFile(codeChangeDisciplineSkillPath);
    const closurePhase = parseVerificationFreshnessClosurePhase(closureSection);

    expect(section).toContain('Context memory is not validation evidence');
    expect(section).toContain('validator, state enum, shared contract helper, or closure schema changes invalidate prior gates');
    expect(section).toContain('Oracle review must bind to an immutable candidate commit');
    expect(section).toContain('receipt-only commit');
    expect(validateVerificationFreshnessClosurePhase(closureSection, closurePhase)).toEqual([]);
    expect(closureSection).toContain(closurePhase === 'receipt' ? 'oracle_status: `approved`' : 'oracle_status: `not_submitted`');
    expect(closureSection).toContain(`reviewed_skill_revision: \`${codeChangeDisciplineSkillBundleDigest}\``);
    expect(closureSection).toContain(`skill_bundle_root: \`${codeChangeDisciplineSkillRoot}\``);
    expect(closureSection).toContain(`skill_bundle_file: \`${codeChangeDisciplineSkillPath}\``);
    expect(closureSection).toContain('skill_bundle_file_relative_path: `SKILL.md`');
    expect(closureSection).toContain('skill_bundle_file_type: `file`');
    expect(closureSection).toContain('skill_bundle_file_byte_length: `35331`');
    expect(closureSection).toContain(`skill_bundle_file_sha256: \`${codeChangeDisciplineSkillSha256}\``);
    expect(closureSection).toContain('skill_bundle_generation_exit_code: `0`');
    expect(skillBytes.byteLength).toBe(35331);
    expect(sha256Hex(skillBytes)).toBe(codeChangeDisciplineSkillSha256);
    expect(digestSkillBundleManifest(codeChangeDisciplineSkillManifest)).toBe(codeChangeDisciplineSkillBundleDigest);
    expect(closureSection).toContain('no runtime, schema, compiler, QA runner behavior');
    expect(validateStructuredClosureSection(closureSection, verificationFreshnessImmutableReviewClosureTitle)).toEqual([]);
  });

  it('validates verification freshness closure phases with exact stage-specific records', () => {
    const implementingClosure = verificationFreshnessClosureFixture({
      closurePhase: 'implementing',
      implementationStatus: 'implementing',
      localValidation: 'not_run',
      localValidationStatus: 'pending',
      oracleStatus: 'not_submitted',
      candidateStatus: 'not_created',
      candidateCommitSha: 'pending until candidate checkpoint commit is created',
      reviewedCommitSha: 'pending until Oracle reviews the candidate commit'
    });
    const candidateClosure = verificationFreshnessClosureFixture({
      closurePhase: 'candidate',
      implementationStatus: 'complete',
      localValidation: 'passed',
      localValidationStatus: 'passed',
      oracleStatus: 'not_submitted',
      candidateStatus: 'ready_for_commit',
      candidateCommitSha: 'pending until candidate checkpoint commit is created',
      reviewedCommitSha: 'pending until Oracle reviews the candidate commit'
    });
    const receiptClosure = verificationFreshnessClosureFixture({
      closurePhase: 'receipt',
      implementationStatus: 'receipt',
      localValidation: 'passed',
      localValidationStatus: 'passed',
      oracleStatus: 'approved',
      candidateStatus: 'ready_for_commit',
      candidateCommitSha: 'candidate-sha',
      reviewedCommitSha: 'candidate-sha',
      closureStatus: 'closed'
    });

    expect(validateVerificationFreshnessClosurePhase(implementingClosure, 'implementing')).toEqual([]);
    expect(validateVerificationFreshnessClosurePhase(candidateClosure, 'candidate')).toEqual([]);
    expect(validateVerificationFreshnessClosurePhase(receiptClosure, 'receipt')).toEqual([]);

    expect(validateVerificationFreshnessClosurePhase(candidateClosure, 'implementing')).toEqual([
      'CLOSURE_PHASE_FIELD_MISMATCH phase="implementing" field="closure_phase" actual="candidate" expected="implementing"',
      'CLOSURE_PHASE_FIELD_MISMATCH phase="implementing" field="implementation_status" actual="complete" expected="implementing"',
      'CLOSURE_PHASE_FIELD_MISMATCH phase="implementing" field="local_validation" actual="passed" expected="not_run"',
      'CLOSURE_PHASE_FIELD_MISMATCH phase="implementing" field="local_validation_status" actual="passed" expected="pending"',
      'CLOSURE_PHASE_FIELD_MISMATCH phase="implementing" field="candidate_status" actual="ready_for_commit" expected="not_created"'
    ]);
    expect(
      validateVerificationFreshnessClosurePhase(
        verificationFreshnessClosureFixture({
          closurePhase: 'candidate',
          implementationStatus: 'complete',
          localValidation: 'not_run',
          localValidationStatus: 'pending',
          oracleStatus: 'not_submitted',
          candidateStatus: 'ready_for_commit',
          candidateCommitSha: 'pending until candidate checkpoint commit is created',
          reviewedCommitSha: 'pending until Oracle reviews the candidate commit'
        }),
        'candidate'
      )
    ).toContain('CANDIDATE_READY_BEFORE_LOCAL_VALIDATION status="pending"');
    expect(
      validateVerificationFreshnessClosurePhase(
        verificationFreshnessClosureFixture({
          closurePhase: 'receipt',
          implementationStatus: 'receipt',
          localValidation: 'passed',
          localValidationStatus: 'passed',
          oracleStatus: 'approved',
          candidateStatus: 'ready_for_commit',
          candidateCommitSha: 'receipt-sha',
          reviewedCommitSha: 'receipt-sha',
          closureStatus: 'closed'
        }),
        'receipt',
        { receiptCommitSha: 'receipt-sha' }
      )
    ).toContain('RECEIPT_SELF_REFERENCE_FORBIDDEN receipt="receipt-sha"');
  });

  it('keeps candidate status, external Oracle pending state, and receipt closure separate', () => {
    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'implementing',
        localValidationStatus: 'pending',
        localGates: { focusedContract: false, fullTests: false, typecheck: false, diffCheck: false, finalDiffScope: false },
        reviewRequired: true,
        candidateStatus: 'not_created',
        oracleRequestSubmitted: false,
        oracleRunStatus: 'not_submitted',
        candidateCommitSha: undefined,
        candidateFrozen: false,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: undefined,
        oracleResult: undefined,
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'open'
      })
    ).toEqual([]);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'complete',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ready_for_commit',
        oracleRequestSubmitted: false,
        oracleRunStatus: 'not_submitted',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: true,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: undefined,
        oracleResult: undefined,
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'open'
      })
    ).toEqual([]);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'complete',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ready_for_commit',
        oracleRequestSubmitted: true,
        oracleRunStatus: 'pending',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: true,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: 'candidate-sha',
        oracleResult: undefined,
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'open'
      })
    ).toEqual([]);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'receipt',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ready_for_commit',
        oracleRequestSubmitted: true,
        oracleRunStatus: 'approved',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: true,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: 'candidate-sha',
        oracleResult: 'PASS / no P0/P1/P2 blocking findings',
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [stage4PlanPath],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'closed'
      })
    ).toEqual([]);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'complete',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ORACLE_PENDING',
        oracleRequestSubmitted: false,
        oracleRunStatus: 'not_submitted',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: true,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: undefined,
        oracleResult: undefined,
        oraclePendingWrittenToCandidate: true,
        receiptPaths: [],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'open'
      })
    ).toEqual([
      'CANDIDATE_MUST_NOT_RECORD_ORACLE_PENDING status="ORACLE_PENDING"',
      'ORACLE_PENDING_WITHOUT_SUBMISSION checkpoint="candidate-sha"',
      'ORACLE_PENDING_WRITTEN_TO_FROZEN_CANDIDATE checkpoint="candidate-sha"'
    ]);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'complete',
        localValidationStatus: 'pending',
        localGates: { focusedContract: true, fullTests: false, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ready_for_commit',
        oracleRequestSubmitted: false,
        oracleRunStatus: 'not_submitted',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: false,
        candidateDocumentWritesOwnSha: true,
        reviewedCommitSha: undefined,
        oracleResult: undefined,
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'open'
      })
    ).toEqual([
      'IMPLEMENTATION_COMPLETE_BEFORE_LOCAL_VALIDATION status="pending"',
      'CANDIDATE_READY_BEFORE_LOCAL_VALIDATION status="pending"',
      'LOCAL_VALIDATION_PASSED_BEFORE_FULL_GATES gates="focusedContract,typecheck,diffCheck,finalDiffScope"',
      'CANDIDATE_NOT_FROZEN checkpoint="candidate-sha"',
      'CANDIDATE_SELF_SHA_WRITE_FORBIDDEN checkpoint="candidate-sha"'
    ]);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'complete',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: false, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'not_created',
        oracleRequestSubmitted: false,
        oracleRunStatus: 'not_submitted',
        candidateCommitSha: undefined,
        candidateFrozen: false,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: undefined,
        oracleResult: undefined,
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'open'
      })
    ).toEqual(['LOCAL_VALIDATION_PASSED_BEFORE_FULL_GATES gates="focusedContract,fullTests,diffCheck,finalDiffScope"']);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'receipt',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ready_for_commit',
        oracleRequestSubmitted: true,
        oracleRunStatus: 'pending',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: true,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: 'candidate-sha',
        oracleResult: undefined,
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [stage4PlanPath],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'closed'
      })
    ).toEqual(['RECEIPT_CLOSED_WITHOUT_ORACLE_APPROVAL status="pending"']);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'receipt',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ready_for_commit',
        oracleRequestSubmitted: false,
        oracleRunStatus: 'approved',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: true,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: undefined,
        oracleResult: 'PASS / no P0/P1/P2 blocking findings',
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [stage4PlanPath],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: false,
        closureStatus: 'closed'
      })
    ).toEqual([
      'ORACLE_APPROVED_WITHOUT_ACCEPTED_REQUEST checkpoint="candidate-sha"',
      'RECEIPT_REVIEWED_SHA_MISSING actual="<missing>"'
    ]);

    expect(
      validateCandidateReceiptStateMachine({
        implementationStatus: 'receipt',
        localValidationStatus: 'passed',
        localGates: { focusedContract: true, fullTests: true, typecheck: true, diffCheck: true, finalDiffScope: true },
        reviewRequired: true,
        candidateStatus: 'ready_for_commit',
        oracleRequestSubmitted: true,
        oracleRunStatus: 'approved',
        candidateCommitSha: 'candidate-sha',
        candidateFrozen: true,
        candidateDocumentWritesOwnSha: false,
        reviewedCommitSha: 'different-sha',
        oracleResult: 'PASS / no P0/P1/P2 blocking findings',
        oraclePendingWrittenToCandidate: false,
        receiptPaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesSubstantiveContent: true,
        closureStatus: 'closed'
      })
    ).toEqual([
      'ORACLE_REVIEW_SHA_MISMATCH actual="different-sha" expected="candidate-sha"',
      'RECEIPT_SCOPE_VIOLATION path="tests/contracts/step37-closure-implementation-trace.test.ts" allowed="docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md"',
      'RECEIPT_MUTATES_SUBSTANTIVE_CONTENT checkpoint="candidate-sha"'
    ]);
  });

  it('validates candidate-to-receipt lifecycle transitions with no skips or reversals', () => {
    expect(
      validateCandidateReceiptLifecycle([
        'implementing',
        'locally_validated',
        'candidate_created',
        'oracle_pending',
        'oracle_approved',
        'receipt_committed',
        'closed'
      ])
    ).toEqual([]);

    expect(validateCandidateReceiptLifecycle(['implementing', 'candidate_created'])).toEqual([
      'ILLEGAL_CANDIDATE_RECEIPT_TRANSITION actual="implementing -> candidate_created" allowed="locally_validated"'
    ]);
    expect(validateCandidateReceiptLifecycle(['implementing', 'locally_validated', 'implementing'])).toEqual([
      'ILLEGAL_CANDIDATE_RECEIPT_TRANSITION actual="locally_validated -> implementing" allowed="candidate_created"'
    ]);
    expect(validateCandidateReceiptLifecycle(['implementing', 'locally_validated', 'candidate_created', 'closed'])).toEqual([
      'ILLEGAL_CANDIDATE_RECEIPT_TRANSITION actual="candidate_created -> closed" allowed="oracle_pending"'
    ]);
  });

  it('binds repo candidates to deterministic external Skill revisions', () => {
    expect(
      validateSkillRevisionEvidence({
        skillRoot: codeChangeDisciplineSkillRoot,
        normalizedSkillRoot: codeChangeDisciplineSkillRoot,
        revisionType: 'sha256_bundle',
        gitRepositoryRoot: undefined,
        gitCommitSha: undefined,
        gitStatusPorcelain: undefined,
        allowDirtySnapshot: false,
        manifestEntries: codeChangeDisciplineSkillManifest,
        requiredRelativePaths: ['SKILL.md'],
        bundleDigest: codeChangeDisciplineSkillBundleDigest,
        expectedBundleDigest: codeChangeDisciplineSkillBundleDigest,
        generationCommand: "python3 - <<'PY' ... deterministic relative-path sha256 manifest",
        generationExitCode: 0
      })
    ).toEqual([]);

    expect(
      validateSkillRevisionEvidence({
        skillRoot: '/skills/example',
        normalizedSkillRoot: '/skills/example',
        revisionType: 'git_commit',
        gitRepositoryRoot: '/skills',
        gitCommitSha: 'abc123',
        gitStatusPorcelain: ' M code-change-discipline/SKILL.md',
        allowDirtySnapshot: false,
        manifestEntries: [],
        requiredRelativePaths: [],
        bundleDigest: undefined,
        expectedBundleDigest: undefined,
        generationCommand: undefined,
        generationExitCode: undefined
      })
    ).toEqual(['DIRTY_GIT_SKILL_REQUIRES_BUNDLE status=" M code-change-discipline/SKILL.md"']);

    expect(
      validateSkillRevisionEvidence({
        skillRoot: '/skills/example',
        normalizedSkillRoot: '/skills/example',
        revisionType: 'sha256_bundle',
        gitRepositoryRoot: undefined,
        gitCommitSha: undefined,
        gitStatusPorcelain: undefined,
        allowDirtySnapshot: false,
        manifestEntries: [
          {
            relativePath: 'SKILL.md',
            fileType: 'file',
            byteLength: 10,
            sha256: 'skill-sha',
            symlinkTarget: '-',
            symlinkEscapesRoot: false
          }
        ],
        requiredRelativePaths: ['SKILL.md', 'scripts/build.js', 'references/rules.md'],
        bundleDigest: 'digest-a',
        expectedBundleDigest: 'digest-b',
        generationCommand: '',
        generationExitCode: 1
      })
    ).toEqual([
      'SKILL_BUNDLE_MISSING_FILE path="scripts/build.js"',
      'SKILL_BUNDLE_MISSING_FILE path="references/rules.md"',
      'SKILL_BUNDLE_DIGEST_MISMATCH actual="digest-a" expected="digest-b"',
      'SKILL_BUNDLE_GENERATION_COMMAND_MISSING',
      'SKILL_BUNDLE_GENERATION_FAILED exitCode=1'
    ]);

    expect(
      validateSkillRevisionEvidence({
        skillRoot: '/skills/example',
        normalizedSkillRoot: '/skills/example',
        revisionType: 'sha256_bundle',
        gitRepositoryRoot: undefined,
        gitCommitSha: undefined,
        gitStatusPorcelain: undefined,
        allowDirtySnapshot: false,
        manifestEntries: [
          { relativePath: 'references/rules.md', fileType: 'file', byteLength: 20, sha256: 'ref-sha', symlinkTarget: '-', symlinkEscapesRoot: false },
          { relativePath: 'SKILL.md', fileType: 'file', byteLength: undefined, sha256: 'skill-sha', symlinkTarget: undefined, symlinkEscapesRoot: false }
        ],
        requiredRelativePaths: ['SKILL.md', 'references/rules.md'],
        bundleDigest: 'digest',
        expectedBundleDigest: 'digest',
        generationCommand: 'generate-bundle',
        generationExitCode: 0
      })
    ).toEqual([
      'SKILL_BUNDLE_MANIFEST_UNSORTED actual="references/rules.md,SKILL.md" expected="SKILL.md,references/rules.md"',
      'SKILL_BUNDLE_ENTRY_MISSING_BYTE_LENGTH path="SKILL.md"',
      'SKILL_BUNDLE_ENTRY_MISSING_SYMLINK_TARGET path="SKILL.md"'
    ]);
  });

  it('rejects memory-only or stale validation evidence before local validation can be reused', () => {
    expect(
      validateValidationEvidenceFreshness({
        evidenceSource: 'command',
        repository: 'ai-game-maker',
        expectedRepository: 'ai-game-maker',
        worktree: '/Users/dahufa/Documents/workspace/ai-game-maker',
        expectedWorktree: '/Users/dahufa/Documents/workspace/ai-game-maker',
        branch: 'main',
        expectedBranch: 'main',
        currentCommitSha: oracleRevisionAlignmentReceiptCommit,
        validatedCommitSha: oracleRevisionAlignmentReceiptCommit,
        currentSkillRevision: codeChangeDisciplineSkillBundleDigest,
        validatedSkillRevision: codeChangeDisciplineSkillBundleDigest,
        skillPath: codeChangeDisciplineSkillPath,
        expectedSkillPath: codeChangeDisciplineSkillPath,
        skillFileSha256: codeChangeDisciplineSkillSha256,
        expectedSkillFileSha256: codeChangeDisciplineSkillSha256,
        checkpointId: 'verification_freshness_immutable_review_guardrail',
        expectedCheckpointId: 'verification_freshness_immutable_review_guardrail',
        validationCommands: [
          { command: 'npm test', exitCode: 0, executedAt: '2026-06-26T03:55:00+08:00' },
          { command: 'npm run typecheck', exitCode: 0, executedAt: '2026-06-26T03:55:00+08:00' }
        ],
        relevantFilesChangedAfterValidation: false,
        validatorOrClosureSchemaChangedAfterValidation: false,
        fullGateRerunAfterValidatorChange: true,
        requestedStatus: 'LOCALLY_VALIDATED'
      })
    ).toEqual([]);

    expect(
      validateValidationEvidenceFreshness({
        evidenceSource: 'memory',
        repository: 'ai-game-maker',
        expectedRepository: 'ai-game-maker',
        worktree: '/Users/dahufa/Documents/workspace/ai-game-maker',
        expectedWorktree: '/tmp/stale-worktree',
        branch: 'main',
        expectedBranch: 'stale-branch',
        currentCommitSha: oracleRevisionAlignmentReceiptCommit,
        validatedCommitSha: oracleRevisionAlignmentCheckpointCommit,
        currentSkillRevision: 'changed-skill-bundle-digest',
        validatedSkillRevision: codeChangeDisciplineSkillBundleDigest,
        skillPath: codeChangeDisciplineSkillPath,
        expectedSkillPath: '/tmp/stale-skill/SKILL.md',
        skillFileSha256: 'changed-skill-file-sha',
        expectedSkillFileSha256: codeChangeDisciplineSkillSha256,
        checkpointId: 'verification_freshness_immutable_review_guardrail',
        expectedCheckpointId: 'other_checkpoint',
        validationCommands: [{ command: 'npm test' }],
        relevantFilesChangedAfterValidation: true,
        validatorOrClosureSchemaChangedAfterValidation: true,
        fullGateRerunAfterValidatorChange: false,
        requestedStatus: 'CLOSED'
      })
    ).toEqual([
      'MEMORY_IS_NOT_VALIDATION_EVIDENCE checkpoint="verification_freshness_immutable_review_guardrail"',
      'BASELINE_MISMATCH field="worktree" actual="/Users/dahufa/Documents/workspace/ai-game-maker" expected="/tmp/stale-worktree"',
      'BASELINE_MISMATCH field="branch" actual="main" expected="stale-branch"',
      'BASELINE_MISMATCH field="commit_sha" actual="7a160c5b" expected="05b6932e"',
      `BASELINE_MISMATCH field="skill_revision" actual="changed-skill-bundle-digest" expected="${codeChangeDisciplineSkillBundleDigest}"`,
      'BASELINE_MISMATCH field="skill_path" actual="/Users/dahufa/.agents/skills/code-change-discipline/SKILL.md" expected="/tmp/stale-skill/SKILL.md"',
      `BASELINE_MISMATCH field="skill_file_sha256" actual="changed-skill-file-sha" expected="${codeChangeDisciplineSkillSha256}"`,
      'BASELINE_MISMATCH field="checkpoint_id" actual="verification_freshness_immutable_review_guardrail" expected="other_checkpoint"',
      'MISSING_VALIDATION_EXIT_CODE command="npm test"',
      'MISSING_VALIDATION_EXECUTION_TIME command="npm test"',
      'VALIDATION_STALE_AFTER_FILE_CHANGE checkpoint="verification_freshness_immutable_review_guardrail"',
      'VALIDATION_STALE_AFTER_VALIDATOR_CHANGE checkpoint="verification_freshness_immutable_review_guardrail"',
      'PREMATURE_CLOSURE_STATUS requested="CLOSED" allowed="implementing|validating|incomplete|blocked"'
    ]);
  });

  it('requires Oracle review to bind an immutable candidate commit and keeps receipt commits docs-only', () => {
    const candidatePaths = changedPathsForCommit(oracleRevisionAlignmentCheckpointCommit);
    const receiptPaths = changedPathsForCommit(oracleRevisionAlignmentReceiptCommit);
    const receiptSection = execFileSync('git', ['show', `${oracleRevisionAlignmentReceiptCommit}:${stage4PlanPath}`], { encoding: 'utf8' });
    const postCommitReceiptSection = extractSection(receiptSection, oracleRevisionAlignmentClosureTitle);

    expect(candidatePaths).toEqual([stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'].sort());
    expect(receiptPaths).toEqual([stage4PlanPath]);
    expect(isAncestorCommit(oracleRevisionAlignmentCheckpointCommit, oracleRevisionAlignmentReceiptCommit)).toBe(true);
    expect(postCommitReceiptSection).toContain(`reviewed_commit_sha: \`${oracleRevisionAlignmentCheckpointCommit}`);
    expect(postCommitReceiptSection).not.toContain(`reviewed_commit_sha: \`${oracleRevisionAlignmentReceiptCommit}`);
    expect(postCommitReceiptSection).not.toContain('receipt_commit_sha:');
    expect(validateReceiptOnlyCommit({
      candidateCommitSha: oracleRevisionAlignmentCheckpointCommit,
      receiptCommitSha: oracleRevisionAlignmentReceiptCommit,
      receiptParentSha: execFileSync('git', ['rev-parse', `${oracleRevisionAlignmentReceiptCommit}^`], { encoding: 'utf8' }).trim().slice(0, 8),
      reviewedCommitSha: oracleRevisionAlignmentCheckpointCommit,
      receiptPaths,
      allowedReceiptPaths: [stage4PlanPath],
      receiptDiff: execFileSync('git', ['diff', `${oracleRevisionAlignmentCheckpointCommit}..${oracleRevisionAlignmentReceiptCommit}`, '--', stage4PlanPath], { encoding: 'utf8' }),
      requiredClosureTitle: oracleRevisionAlignmentClosureTitle,
      forbiddenPatterns: ['validateOracleRevisionEvidenceBundle', 'validateGuardrailCheckpointTrace', 'structuredOracleStatuses', 'receipt_commit_sha:'],
      postCommitHead: oracleRevisionAlignmentReceiptCommit,
      expectedPostCommitHead: oracleRevisionAlignmentReceiptCommit,
      postCommitStatusShort: '',
      focusedContractExitCode: 0,
      showCheckExitCode: 0
    })).toEqual([]);

    expect(validateReceiptOnlyCommit({
      candidateCommitSha: 'abc12345',
      receiptCommitSha: 'def67890',
      receiptParentSha: 'abc12345',
      reviewedCommitSha: 'abc12345',
      receiptPaths: [stage4PlanPath],
      allowedReceiptPaths: [stage4PlanPath],
      receiptDiff: [
        `diff --git a/${stage4PlanPath} b/${stage4PlanPath}`,
        ` ## Stage 4 Closure Implementation — Example`,
        '- oracle_status: `pending`.',
        '+ oracle_status: `approved`.'
      ].join('\n'),
      requiredClosureTitle: '## Stage 4 Closure Implementation — Example',
      forbiddenPatterns: ['receipt_commit_sha:'],
      postCommitHead: 'def67890',
      expectedPostCommitHead: 'def67890',
      postCommitStatusShort: '',
      focusedContractExitCode: 0,
      showCheckExitCode: 0
    })).toEqual([]);
    expect(
      validateImmutableOracleReviewFlow({
        candidateCommitSha: oracleRevisionAlignmentCheckpointCommit,
        reviewedCommitSha: oracleRevisionAlignmentCheckpointCommit,
        candidateSkillRevision: codeChangeDisciplineSkillBundleDigest,
        reviewedSkillRevision: codeChangeDisciplineSkillBundleDigest,
        checkpointId: 'oracle_revision_alignment_guardrail',
        fileScope: candidatePaths,
        validationReceipts: [{ command: 'npm test', exitCode: 0, result: 'passed' }],
        oracleSubmissionId: '019f0055-c12d-7b03-9f36-abe7e331496e',
        oracleAgentId: '019effae-8aa2-7c22-b5ba-8c4b69f21d20',
        reviewedFilesChangedAfterOracleSubmission: false,
        oracleResult: 'PASS / no P0/P1/P2 blocking findings',
        oracleStatus: 'approved',
        receiptCommitPaths: receiptPaths,
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesValidationLogic: false
      })
    ).toEqual([]);

    expect(
      validateImmutableOracleReviewFlow({
        candidateCommitSha: oracleRevisionAlignmentCheckpointCommit,
        reviewedCommitSha: 'stale-review-sha',
        candidateSkillRevision: codeChangeDisciplineSkillBundleDigest,
        reviewedSkillRevision: 'stale-skill-revision',
        checkpointId: 'oracle_revision_alignment_guardrail',
        fileScope: candidatePaths,
        validationReceipts: [{ command: 'npm test', exitCode: 1, result: 'failed' }],
        oracleSubmissionId: undefined,
        oracleAgentId: undefined,
        reviewedFilesChangedAfterOracleSubmission: true,
        oracleResult: 'PASS / no P0/P1/P2 blocking findings',
        oracleStatus: 'approved',
        receiptCommitPaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        allowedReceiptPaths: [stage4PlanPath],
        receiptMutatesValidationLogic: true
      })
    ).toEqual([
      'REVIEW_NOT_BOUND_TO_CANDIDATE_COMMIT checkpoint="oracle_revision_alignment_guardrail" actual="stale-review-sha" expected="05b6932e"',
      `REVIEW_NOT_BOUND_TO_SKILL_REVISION checkpoint="oracle_revision_alignment_guardrail" actual="stale-skill-revision" expected="${codeChangeDisciplineSkillBundleDigest}"`,
      'MISSING_ORACLE_ID field="submission_id"',
      'MISSING_ORACLE_ID field="agent_id"',
      'VALIDATION_RECEIPT_FAILED command="npm test" exitCode=1',
      'REVIEW_STALE_AFTER_FILE_CHANGE checkpoint="oracle_revision_alignment_guardrail"',
      'RECEIPT_SCOPE_VIOLATION path="tests/contracts/step37-closure-implementation-trace.test.ts" allowed="docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md"',
      'RECEIPT_MUTATES_VALIDATION_LOGIC checkpoint="oracle_revision_alignment_guardrail"'
    ]);

    expect(
      validateReceiptOnlyCommit({
        candidateCommitSha: oracleRevisionAlignmentCheckpointCommit,
        receiptCommitSha: oracleRevisionAlignmentReceiptCommit,
        receiptParentSha: 'intermediate-sha',
        reviewedCommitSha: oracleRevisionAlignmentReceiptCommit,
        receiptPaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        allowedReceiptPaths: [stage4PlanPath],
        receiptDiff: [
          `diff --git a/${stage4PlanPath} b/${stage4PlanPath}`,
          '+- receipt_commit_sha: `7a160c5b`',
          `diff --git a/tests/contracts/step37-closure-implementation-trace.test.ts b/tests/contracts/step37-closure-implementation-trace.test.ts`,
          '+const structuredOracleStatuses = [] as const;'
        ].join('\n'),
        requiredClosureTitle: oracleRevisionAlignmentClosureTitle,
        forbiddenPatterns: ['structuredOracleStatuses', 'receipt_commit_sha:'],
        postCommitHead: 'unexpected-head',
        expectedPostCommitHead: oracleRevisionAlignmentReceiptCommit,
        postCommitStatusShort: ' M tests/contracts/step37-closure-implementation-trace.test.ts',
        focusedContractExitCode: 1,
        showCheckExitCode: 1
      })
    ).toEqual([
      'RECEIPT_REVIEWED_SHA_MISMATCH actual="7a160c5b" expected="05b6932e"',
      'RECEIPT_PARENT_NOT_CANDIDATE actual="intermediate-sha" expected="05b6932e"',
      'RECEIPT_SELF_REFERENCE_FORBIDDEN receipt="7a160c5b"',
      'RECEIPT_SCOPE_VIOLATION path="tests/contracts/step37-closure-implementation-trace.test.ts" allowed="docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md"',
      'RECEIPT_DIFF_OUTSIDE_TARGET_SECTION section="## Stage 4 Closure Implementation — Oracle Revision Alignment Guardrail"',
      'RECEIPT_FORBIDDEN_PATTERN pattern="structuredOracleStatuses"',
      'RECEIPT_FORBIDDEN_PATTERN pattern="receipt_commit_sha:"',
      'POST_COMMIT_HEAD_MISMATCH actual="unexpected-head" expected="7a160c5b"',
      'POST_COMMIT_STATUS_NOT_CLEAN actual=" M tests/contracts/step37-closure-implementation-trace.test.ts"',
      'POST_COMMIT_FOCUSED_CONTRACT_FAILED exitCode=1',
      'POST_COMMIT_SHOW_CHECK_FAILED exitCode=1'
    ]);
  });

  it('does not allow global field matches to satisfy a different closure section', () => {
    const document = [
      '## Stage 4 Closure Implementation — Other',
      '- oracle_status: `pending`.',
      '',
      '## Stage 4 Closure Implementation — Target',
      '- implementation status: `ORACLE_PENDING`.',
      '- local_validation: `passed`.',
      '',
      'State transition:',
      '',
      '```text',
      'planned -> landed -> verified -> oracle_pending',
      '```'
    ].join('\n');
    const section = extractSection(document, '## Stage 4 Closure Implementation — Target');

    expect(validateStructuredClosureSection(section, '## Stage 4 Closure Implementation — Target')).toEqual([
      'MISSING_FIELD section="## Stage 4 Closure Implementation — Target" field="oracle_status" actual="<missing>" allowed="not_submitted|pending|passed|approved|changes_required|blocked"'
    ]);
  });

  it('keeps Oracle-gated closure status fail-closed until review evidence exists', () => {
    expect(
      evaluateOracleGatedClosureState({
        localValidation: 'passed',
        oracleStatus: 'not_submitted',
        requestedStatus: 'CLOSED',
        validationReceipts: [{ command: 'npm test', exitCode: 0, result: 'passed' }],
        diffScopePaths: [stage4PlanPath],
        reviewRequestId: undefined,
        oracleConclusion: undefined,
        unresolvedItems: []
      })
    ).toBe('blocked_missing_oracle_pass');

    expect(
      evaluateOracleGatedClosureState({
        localValidation: 'passed',
        oracleStatus: 'pending',
        requestedStatus: 'CLOSED',
        validationReceipts: [{ command: 'npm test', exitCode: 0, result: 'passed' }],
        diffScopePaths: [stage4PlanPath],
        reviewRequestId: '019f0013-d158-7b82-bd80-7678b7afab0d',
        oracleConclusion: undefined,
        unresolvedItems: []
      })
    ).toBe('blocked_oracle_pending_not_closed');

    expect(
      evaluateOracleGatedClosureState({
        localValidation: 'passed',
        oracleStatus: 'pending',
        requestedStatus: 'ORACLE_PENDING',
        validationReceipts: [
          { command: 'npm test', exitCode: 0, result: 'passed' },
          { command: 'npm run typecheck', exitCode: 0, result: 'passed' }
        ],
        diffScopePaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        reviewRequestId: '019f0013-d158-7b82-bd80-7678b7afab0d',
        oracleConclusion: undefined,
        unresolvedItems: []
      })
    ).toBe('oracle_pending');

    expect(
      evaluateOracleGatedClosureState({
        localValidation: 'passed',
        oracleStatus: 'pending',
        requestedStatus: 'ORACLE_PENDING',
        validationReceipts: [{ command: 'npm test', exitCode: 0, result: 'passed' }],
        diffScopePaths: [],
        reviewRequestId: undefined,
        oracleConclusion: undefined,
        unresolvedItems: []
      })
    ).toBe('blocked_missing_oracle_pending_trace');

    expect(
      evaluateOracleGatedClosureState({
        localValidation: 'passed',
        oracleStatus: 'passed',
        requestedStatus: 'CLOSED',
        validationReceipts: [{ command: 'npm test', exitCode: 0, result: 'passed' }],
        diffScopePaths: [stage4PlanPath],
        reviewRequestId: '019f0013-d158-7b82-bd80-7678b7afab0d',
        oracleConclusion: 'PASS / no P0/P1/P2 blocking findings',
        unresolvedItems: []
      })
    ).toBe('closed');

    expect(
      evaluateOracleGatedClosureState({
        localValidation: 'passed',
        oracleStatus: 'passed',
        requestedStatus: 'CLOSED',
        validationReceipts: [{ command: 'npm test', exitCode: 0, result: 'passed' }],
        diffScopePaths: [stage4PlanPath],
        reviewRequestId: '019f0013-d158-7b82-bd80-7678b7afab0d',
        oracleConclusion: undefined,
        unresolvedItems: []
      })
    ).toBe('blocked_missing_oracle_pass');

    expect(
      evaluateOracleGatedClosureState({
        localValidation: 'passed',
        oracleStatus: 'changes_required',
        requestedStatus: 'CLOSED',
        validationReceipts: [{ command: 'npm test', exitCode: 0, result: 'passed' }],
        diffScopePaths: [stage4PlanPath],
        reviewRequestId: '019f0013-d158-7b82-bd80-7678b7afab0d',
        oracleConclusion: 'CHANGES_REQUIRED: missing validation',
        unresolvedItems: []
      })
    ).toBe('changes_required');
  });

  it('records audit boundary and typed identifier guardrails as traceable process contracts', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, auditBoundaryAndIdentifierGuardrailTitle);

    expect(section).toContain('audit steps produce traceable conclusions');
    expect(section).toContain('implementation steps modify code and verify behavior');
    expect(section).toContain('Runtime/test/source edits belong to a later implementation step');
    expect(section).toContain('Existing audit history must not be rewritten');
    expect(section).toContain('submission_id');
    expect(section).toContain('agent_id');
    expect(section).toContain('run_id');
    expect(section).toContain('wait_agent` requires an `agent_id`');
    expect(section).toContain('send_input` returns a `submission_id`');
    expect(section).toContain('submission/agent relationship');
  });

  it('rejects using submission identifiers for agent polling and binds results to the original mapping', () => {
    const correctPollingIssues = validateOraclePollingIdentifierLink({
      oracleSubmissionId: 'submission_019effe6',
      oracleAgentId: 'agent_019effae',
      waitTargetFieldName: 'agent_id',
      waitTargetValue: 'agent_019effae',
      waitTargetSource: 'spawn_agent.agent_id',
      logEntries: [
        { fieldName: 'submission_id', value: 'submission_019effe6', source: 'send_input.submission_id' },
        { fieldName: 'agent_id', value: 'agent_019effae', source: 'spawn_agent.agent_id' }
      ]
    });

    expect(correctPollingIssues).toEqual([]);

    const wrongPollingIssues = validateOraclePollingIdentifierLink({
      oracleSubmissionId: 'submission_019effe6',
      oracleAgentId: 'agent_019effae',
      waitTargetFieldName: 'agent_id',
      waitTargetValue: 'submission_019effe6',
      waitTargetSource: 'send_input.submission_id',
      logEntries: [
        { fieldName: 'submission_id', value: 'submission_019effe6', source: 'send_input.submission_id' },
        { fieldName: 'agent_id', value: 'agent_019effae', source: 'spawn_agent.agent_id' }
      ]
    });

    expect(wrongPollingIssues).toEqual(['SUBMISSION_ID_USED_AS_AGENT_ID', 'AGENT_ID_POLL_TARGET_MISMATCH']);

    expect(
      validateOraclePollingResultBinding({
        oracleSubmissionId: 'submission_019effe6',
        oracleAgentId: 'agent_019effae',
        resultAgentId: 'agent_019effae',
        resultSubmissionId: 'submission_019effe6'
      })
    ).toEqual([]);
    expect(
      validateOraclePollingResultBinding({
        oracleSubmissionId: 'submission_019effe6',
        oracleAgentId: 'agent_019effae',
        resultAgentId: 'agent_other',
        resultSubmissionId: 'submission_019effe6'
      })
    ).toEqual(['ORACLE_RESULT_AGENT_MISMATCH']);
    expect(
      validateOraclePollingResultBinding({
        oracleSubmissionId: 'submission_019effe6',
        oracleAgentId: 'agent_019effae',
        resultAgentId: 'agent_019effae',
        resultSubmissionId: 'submission_other'
      })
    ).toEqual(['ORACLE_RESULT_SUBMISSION_MISMATCH']);
  });

  it('keeps the audit boundary and identifier guardrail closure traceable to checkpoint evidence', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, auditBoundaryIdentifierClosureTitle);
    const checkpointPaths = changedPathsForCommit(auditBoundaryIdentifierCheckpointCommit);

    expect(section).toContain(`implementation checkpoint: \`${auditBoundaryIdentifierCheckpointCommit}\``);
    expect(section).toContain('implementation status: `CHECKPOINT_COMMITTED`');
    for (const path of claimedAuditBoundaryIdentifierPaths) {
      expect(section).toContain(`\`${path}\``);
      expect(checkpointPaths).toContain(path);
    }
    expect(section).toContain('a `submission_id` cannot satisfy an `agent_id` polling path');
    expect(section).toContain('movement.crouch.v1` audit checkpoint `09c1ea60` changed only this Stage 4 plan document');
    expect(section).toContain('Original full command: `npm test`');
    expect(section).toContain('exitCode: 1');
    expect(section).toContain('Equivalent full-contract command with only timeout changed');
    expect(section).toContain('does not change global timeout');
    expect(section).toContain('npm test\nexitCode=0');
    expect(section).toContain('npm run typecheck\nexitCode=0');
    expect(section).toContain('git diff --check\nexitCode=0');
    expect(section).toContain('Oracle PASS / no P0/P1/P2 blocking findings');
    expect(section).toContain('The generalized "testing timeout diagnosis" rule is intentionally deferred');
    expect(section).toContain('planned -> landed -> verified -> oracle_passed -> checkpoint_committed');
    expect(section).toContain('Stage 4 Exit gate: NOT_MET');
  });

  it('records clean-baseline closure checks before adding new closure diff', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, cleanBaselineClosureGuardrailTitle);

    expect(section).toContain('Baseline before closure');
    expect(section).toContain('confirm `HEAD` is the expected checkpoint');
    expect(section).toContain('staged, unstaged, untracked');
    expect(section).toContain('Directed cleanup only');
    expect(section).toContain('Do not use destructive broad commands');
    expect(section).toContain('Range-controlled closure diff');
    expect(section).toContain('Post-write status verification');
    expect(section).toContain('Clean baseline is not closure');
    expect(section).toContain('Audit history preservation');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '7848af42',
        stagedPaths: [],
        unstagedPaths: [],
        untrackedPaths: [],
        diffCheckPassed: true,
        cleanupActions: [{ kind: 'directed_fix', command: 'apply_patch', reason: 'removed withdrawn draft blank line' }],
        closureDiffPaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        allowedClosurePaths: [stage4PlanPath, 'tests/contracts/step37-closure-implementation-trace.test.ts'],
        postWriteStatusChecked: true,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: true,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('ready_for_closure');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '7848af42',
        stagedPaths: [],
        unstagedPaths: ['templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts'],
        untrackedPaths: [],
        diffCheckPassed: true,
        cleanupActions: [],
        closureDiffPaths: [stage4PlanPath],
        allowedClosurePaths: [stage4PlanPath],
        postWriteStatusChecked: true,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: true,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('blocked_dirty_baseline');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '7848af42',
        stagedPaths: [],
        unstagedPaths: [],
        untrackedPaths: [],
        diffCheckPassed: true,
        cleanupActions: [{ kind: 'destructive_command', command: 'git reset --hard', reason: 'clear worktree' }],
        closureDiffPaths: [stage4PlanPath],
        allowedClosurePaths: [stage4PlanPath],
        postWriteStatusChecked: true,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: true,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('blocked_destructive_cleanup');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '7848af42',
        stagedPaths: [],
        unstagedPaths: [],
        untrackedPaths: [],
        diffCheckPassed: true,
        cleanupActions: [],
        closureDiffPaths: [stage4PlanPath, 'templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts'],
        allowedClosurePaths: [stage4PlanPath],
        postWriteStatusChecked: true,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: true,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('blocked_unexpected_closure_diff');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '2d49b17e',
        stagedPaths: [],
        unstagedPaths: [],
        untrackedPaths: [],
        diffCheckPassed: true,
        cleanupActions: [],
        closureDiffPaths: [stage4PlanPath],
        allowedClosurePaths: [stage4PlanPath],
        postWriteStatusChecked: true,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: true,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('blocked_head_mismatch');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '7848af42',
        stagedPaths: [],
        unstagedPaths: [],
        untrackedPaths: [],
        diffCheckPassed: false,
        cleanupActions: [],
        closureDiffPaths: [stage4PlanPath],
        allowedClosurePaths: [stage4PlanPath],
        postWriteStatusChecked: true,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: true,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('blocked_diff_format');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '7848af42',
        stagedPaths: [],
        unstagedPaths: [],
        untrackedPaths: [],
        diffCheckPassed: true,
        cleanupActions: [],
        closureDiffPaths: [stage4PlanPath],
        allowedClosurePaths: [stage4PlanPath],
        postWriteStatusChecked: false,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: true,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('blocked_missing_post_write_status');

    expect(
      evaluateClosureBaseline({
        expectedHead: '7848af42',
        actualHead: '7848af42',
        stagedPaths: [],
        unstagedPaths: [],
        untrackedPaths: [],
        diffCheckPassed: true,
        cleanupActions: [],
        closureDiffPaths: [stage4PlanPath],
        allowedClosurePaths: [stage4PlanPath],
        postWriteStatusChecked: true,
        postWriteDiffStatChecked: true,
        postWriteDiffCheckPassed: true,
        validationReceiptsPresent: false,
        oracleConclusionPresent: true,
        exitAssessmentPresent: true
      })
    ).toEqual('blocked_missing_closure_evidence');
  });

  it('records timeout diagnosis as isolation evidence instead of immediate threshold relaxation', async () => {
    const document = await readFile(stage4PlanPath, 'utf8');
    const section = extractSection(document, timeoutDiagnosisGuardrailTitle);

    expect(section).toContain('Timeout as signal');
    expect(section).toContain('Required isolation sequence');
    expect(section).toContain('Equivalent-command discipline');
    expect(section).toContain('timeout is the only changed variable');
    expect(section).toContain('Locality');
    expect(section).toContain('inconclusive');
    expect(section).toContain('blocked');
    expect(section).toContain('contracts, workspace tests, typecheck, and diff-check');

    expect(
      evaluateSuiteTimeoutDiagnosis({
        originalFullRun: timeoutObservation('npm test', 'failed', 5_000, 5_014),
        isolatedRun: timeoutObservation(
          'npx vitest run tests/contracts/art-asset-metadata-runtime-export-cli.test.ts -t "returns exit code 2 for usage errors"',
          'passed',
          5_000,
          2_208
        ),
        equivalentTimeoutOnlyRun: {
          ...timeoutObservation('npx vitest run tests/contracts --testTimeout=10000', 'passed', 10_000, 4_458),
          changedVariables: ['timeout']
        },
        proposedAdjustment: { scope: 'test', timeoutMs: 10_000, performanceGuardrail: false, removableWaitChecked: true },
        closureValidation: { contractsPassed: true, workspacePassed: true, typecheckPassed: true, diffCheckPassed: true }
      })
    ).toEqual('local_timeout_adjustment_supported');

    expect(
      evaluateSuiteTimeoutDiagnosis({
        originalFullRun: timeoutObservation('npm test', 'failed', 5_000, 5_014),
        isolatedRun: undefined,
        equivalentTimeoutOnlyRun: {
          ...timeoutObservation('npx vitest run tests/contracts --testTimeout=10000', 'passed', 10_000, 4_458),
          changedVariables: ['timeout']
        },
        proposedAdjustment: { scope: 'test', timeoutMs: 10_000, performanceGuardrail: false, removableWaitChecked: true },
        closureValidation: { contractsPassed: true, workspacePassed: true, typecheckPassed: true, diffCheckPassed: true }
      })
    ).toEqual('blocked_missing_isolation_evidence');

    expect(
      evaluateSuiteTimeoutDiagnosis({
        originalFullRun: timeoutObservation('npm test', 'failed', 5_000, 5_014),
        isolatedRun: timeoutObservation(
          'npx vitest run tests/contracts/art-asset-metadata-runtime-export-cli.test.ts -t "returns exit code 2 for usage errors"',
          'passed',
          5_000,
          2_208
        ),
        equivalentTimeoutOnlyRun: {
          ...timeoutObservation('npx vitest run tests/contracts --testTimeout=10000 --pool=forks', 'passed', 10_000, 4_458),
          changedVariables: ['timeout', 'concurrency']
        },
        proposedAdjustment: { scope: 'test', timeoutMs: 10_000, performanceGuardrail: false, removableWaitChecked: true },
        closureValidation: { contractsPassed: true, workspacePassed: true, typecheckPassed: true, diffCheckPassed: true }
      })
    ).toEqual('blocked_non_equivalent_timeout_run');

    expect(
      evaluateSuiteTimeoutDiagnosis({
        originalFullRun: timeoutObservation('npm test', 'failed', 5_000, 5_014),
        isolatedRun: timeoutObservation(
          'npx vitest run tests/contracts/art-asset-metadata-runtime-export-cli.test.ts -t "returns exit code 2 for usage errors"',
          'passed',
          5_000,
          2_208
        ),
        equivalentTimeoutOnlyRun: {
          ...timeoutObservation('npx vitest run tests/contracts --testTimeout=10000', 'passed', 10_000, 4_458),
          changedVariables: ['timeout']
        },
        proposedAdjustment: { scope: 'global', timeoutMs: 120_000, performanceGuardrail: false, removableWaitChecked: true },
        closureValidation: { contractsPassed: true, workspacePassed: true, typecheckPassed: true, diffCheckPassed: true }
      })
    ).toEqual('blocked_overbroad_timeout_adjustment');

    expect(
      evaluateSuiteTimeoutDiagnosis({
        originalFullRun: timeoutObservation('npm test', 'failed', 5_000, 5_014),
        isolatedRun: timeoutObservation(
          'npx vitest run tests/contracts/art-asset-metadata-runtime-export-cli.test.ts -t "returns exit code 2 for usage errors"',
          'passed',
          5_000,
          2_208
        ),
        equivalentTimeoutOnlyRun: {
          ...timeoutObservation('npx vitest run tests/contracts --testTimeout=10000', 'passed', 10_000, 4_458),
          changedVariables: ['timeout']
        },
        proposedAdjustment: { scope: 'test', timeoutMs: 10_000, performanceGuardrail: false, removableWaitChecked: true },
        closureValidation: { contractsPassed: true, workspacePassed: false, typecheckPassed: true, diffCheckPassed: true }
      })
    ).toEqual('blocked_missing_closure_validation');
  });
});

function extractSection(document: string, title: string): string {
  const start = document.indexOf(title);
  if (start < 0) {
    throw new Error(`Missing section ${title}`);
  }

  const next = document.indexOf('\n## ', start + title.length);
  return next < 0 ? document.slice(start) : document.slice(start, next);
}

function verificationFreshnessClosureFixture(input: {
  closurePhase: VerificationFreshnessClosurePhase;
  implementationStatus: string;
  localValidation: string;
  localValidationStatus: string;
  oracleStatus: string;
  candidateStatus: string;
  candidateCommitSha: string;
  reviewedCommitSha: string;
  closureStatus?: string;
}): string {
  return [
    verificationFreshnessImmutableReviewClosureTitle,
    '',
    `- closure_phase: \`${input.closurePhase}\`.`,
    `- implementation_status: \`${input.implementationStatus}\`.`,
    `- local_validation: \`${input.localValidation}\`.`,
    `- local_validation_status: \`${input.localValidationStatus}\`.`,
    `- oracle_status: \`${input.oracleStatus}\`.`,
    '- review_required: `true`.',
    `- candidate_status: \`${input.candidateStatus}\`.`,
    `- candidate_commit_sha: \`${input.candidateCommitSha}\`.`,
    `- reviewed_commit_sha: \`${input.reviewedCommitSha}\`.`,
    input.closureStatus === undefined ? '' : `- closure_status: \`${input.closureStatus}\`.`
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

function validateVerificationFreshnessClosurePhase(
  section: string,
  phase: VerificationFreshnessClosurePhase,
  options: { receiptCommitSha?: string } = {}
): string[] {
  const fields = parseBulletFields(section);
  const issues: string[] = [];
  const expectedFields: Record<VerificationFreshnessClosurePhase, Record<string, string>> = {
    implementing: {
      closure_phase: 'implementing',
      implementation_status: 'implementing',
      local_validation: 'not_run',
      local_validation_status: 'pending',
      oracle_status: 'not_submitted',
      candidate_status: 'not_created'
    },
    candidate: {
      closure_phase: 'candidate',
      implementation_status: 'complete',
      local_validation: 'passed',
      local_validation_status: 'passed',
      oracle_status: 'not_submitted',
      candidate_status: 'ready_for_commit'
    },
    receipt: {
      closure_phase: 'receipt',
      implementation_status: 'receipt',
      local_validation: 'passed',
      local_validation_status: 'passed',
      oracle_status: 'approved',
      candidate_status: 'ready_for_commit',
      closure_status: 'closed'
    }
  };

  for (const [fieldName, expectedValue] of Object.entries(expectedFields[phase])) {
    const actualValue = fields.get(fieldName) ?? '<missing>';
    if (actualValue !== expectedValue) {
      issues.push(
        `CLOSURE_PHASE_FIELD_MISMATCH phase="${phase}" field="${fieldName}" actual="${actualValue}" expected="${expectedValue}"`
      );
    }
  }

  const localValidationStatus = fields.get('local_validation_status') ?? '<missing>';
  const candidateStatus = fields.get('candidate_status') ?? '<missing>';
  const oracleStatus = fields.get('oracle_status') ?? '<missing>';
  const reviewedCommitSha = fields.get('reviewed_commit_sha') ?? '<missing>';
  const candidateCommitSha = fields.get('candidate_commit_sha') ?? '<missing>';
  const closureStatus = fields.get('closure_status');

  if (candidateStatus === 'ready_for_commit' && localValidationStatus !== 'passed') {
    issues.push(`CANDIDATE_READY_BEFORE_LOCAL_VALIDATION status="${localValidationStatus}"`);
  }
  if (candidateStatus === 'ORACLE_PENDING') {
    issues.push(`CANDIDATE_MUST_NOT_RECORD_ORACLE_PENDING status="${candidateStatus}"`);
  }
  if (phase === 'candidate' && closureStatus === 'closed') {
    issues.push('CANDIDATE_CLOSURE_MUST_NOT_BE_CLOSED');
  }
  if (phase === 'receipt') {
    if (oracleStatus !== 'approved') {
      issues.push(`RECEIPT_CLOSED_WITHOUT_ORACLE_APPROVAL status="${oracleStatus}"`);
    }
    if (reviewedCommitSha === '<missing>' || reviewedCommitSha.startsWith('pending')) {
      issues.push(`RECEIPT_REVIEWED_SHA_MISSING actual="${reviewedCommitSha}"`);
    }
    if (options.receiptCommitSha !== undefined && reviewedCommitSha === options.receiptCommitSha) {
      issues.push(`RECEIPT_SELF_REFERENCE_FORBIDDEN receipt="${options.receiptCommitSha}"`);
    }
    if (reviewedCommitSha !== '<missing>' && !reviewedCommitSha.startsWith('pending') && candidateCommitSha !== reviewedCommitSha) {
      issues.push(`RECEIPT_REVIEWED_SHA_MISMATCH actual="${reviewedCommitSha}" expected="${candidateCommitSha}"`);
    }
  }
  return issues;
}

type VerificationFreshnessClosurePhase = 'implementing' | 'candidate' | 'receipt';

function parseVerificationFreshnessClosurePhase(section: string): VerificationFreshnessClosurePhase {
  const phase = parseBulletFields(section).get('closure_phase');
  if (phase !== 'implementing' && phase !== 'candidate' && phase !== 'receipt') {
    throw new Error(`Invalid verification freshness closure_phase: ${phase ?? '<missing>'}`);
  }
  return phase;
}

function parseBulletFields(section: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const match of section.matchAll(/^- (?<field>[a-zA-Z_ ]+): `(?<value>[^`]+)`\.?$/gm)) {
    const field = match.groups?.field;
    const value = match.groups?.value;
    if (field !== undefined && value !== undefined) {
      fields.set(field, value);
    }
  }
  return fields;
}

function changedPathsForCommit(commit: string): string[] {
  return execFileSync('git', ['show', '--name-only', '--format=', commit], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort();
}

function isAncestorCommit(ancestor: string, descendant: string): boolean {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function digestSkillBundleManifest(entries: readonly SkillBundleManifestEntry[]): string {
  const source = entries
    .map((entry) =>
      [
        entry.relativePath,
        entry.fileType,
        entry.byteLength,
        entry.sha256,
        entry.symlinkTarget,
        String(entry.symlinkEscapesRoot).replace('false', 'False').replace('true', 'True')
      ].join('\t')
    )
    .join('\n');
  return createHash('sha256').update(source).digest('hex');
}

function parseValidationReceipts(section: string): ValidationReceipt[] {
  const receiptPattern = /- command: `(?<command>[^`]+)`\n  exitCode: (?<exitCode>\d+)\n  result: (?<result>[^\n]+)/g;
  return [...section.matchAll(receiptPattern)].map((match) => ({
    command: match.groups?.command ?? '',
    exitCode: Number(match.groups?.exitCode ?? Number.NaN),
    result: match.groups?.result ?? ''
  }));
}

function parseUnresolvedItems(section: string): string[] {
  const unresolvedStart = section.indexOf('Unresolved items:');
  const stateStart = section.indexOf('State transition:', unresolvedStart);
  if (unresolvedStart < 0 || stateStart < 0) {
    return [];
  }

  return section
    .slice(unresolvedStart, stateStart)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2));
}

function parseLastImplementationStatus(section: string): string {
  const matches = [...section.matchAll(/Stage 4 Health Damage Invulnerability Package-Owned QA Slice Implementation: ([A-Z_]+)/g)];
  return matches.at(-1)?.[1] ?? '';
}

function parseStateTransition(section: string): string[] {
  const match = section.match(/State transition:\n\n```text\n(?<transition>[^`]+)\n```/);
  return (match?.groups?.transition ?? '')
    .trim()
    .split('->')
    .map((state) => state.trim())
    .filter(Boolean);
}

function validateStateTransition(states: readonly string[]): string[] {
  const allowedTransitions = new Set([
    'planned->landed',
    'landed->verified',
    'verified->oracle_blocked_p2',
    'oracle_blocked_p2->fixed',
    'fixed->verified',
    'verified->oracle_passed',
    'oracle_passed->awaiting_checkpoint',
    'oracle_passed->checkpoint_committed',
    'awaiting_checkpoint->checkpoint_committed',
    'verified->closed'
  ]);
  const invalidEdges: string[] = [];
  for (let index = 0; index < states.length - 1; index += 1) {
    const edge = `${states[index]}->${states[index + 1]}`;
    if (!allowedTransitions.has(edge)) {
      invalidEdges.push(edge);
    }
  }
  return invalidEdges;
}

function evaluateClosureGate(input: {
  validationReceipts: readonly ValidationReceipt[];
  unresolvedItems: readonly string[];
  requestedStatus: 'closed' | 'incomplete' | 'blocked';
}): 'closed' | 'incomplete' | 'blocked' {
  if (input.validationReceipts.some((receipt) => receipt.exitCode !== 0)) {
    return 'incomplete';
  }

  if (input.unresolvedItems.length > 0) {
    return 'blocked';
  }

  return input.requestedStatus;
}

type ValidationReceipt = {
  command: string;
  exitCode: number;
  result: string;
};

function validateOraclePollingIdentifierLink(input: OraclePollingIdentifierLink): string[] {
  const issues: string[] = [];
  if (input.waitTargetFieldName !== 'agent_id') {
    issues.push('WAIT_TARGET_FIELD_NOT_AGENT_ID');
  }
  if (input.waitTargetValue === input.oracleSubmissionId) {
    issues.push('SUBMISSION_ID_USED_AS_AGENT_ID');
  }
  if (input.waitTargetValue !== input.oracleAgentId) {
    issues.push('AGENT_ID_POLL_TARGET_MISMATCH');
  }
  if (input.waitTargetSource.length === 0) {
    issues.push('WAIT_TARGET_SOURCE_MISSING');
  }

  for (const requiredFieldName of ['submission_id', 'agent_id']) {
    const matchingLogEntry = input.logEntries.find((entry) => entry.fieldName === requiredFieldName);
    if (matchingLogEntry === undefined || matchingLogEntry.value.length === 0 || matchingLogEntry.source.length === 0) {
      issues.push(`ID_LOG_MISSING_${requiredFieldName.toUpperCase()}`);
    }
  }

  return issues;
}

function validateOraclePollingResultBinding(input: OraclePollingResultBinding): string[] {
  const issues: string[] = [];
  if (input.resultAgentId !== input.oracleAgentId) {
    issues.push('ORACLE_RESULT_AGENT_MISMATCH');
  }
  if (input.resultSubmissionId !== input.oracleSubmissionId) {
    issues.push('ORACLE_RESULT_SUBMISSION_MISMATCH');
  }
  return issues;
}

type OraclePollingIdentifierLink = {
  oracleSubmissionId: string;
  oracleAgentId: string;
  waitTargetFieldName: 'agent_id' | 'submission_id' | 'run_id';
  waitTargetValue: string;
  waitTargetSource: string;
  logEntries: readonly IdentifierLogEntry[];
};

type OraclePollingResultBinding = {
  oracleSubmissionId: string;
  oracleAgentId: string;
  resultSubmissionId: string;
  resultAgentId: string;
};

type IdentifierLogEntry = {
  fieldName: 'submission_id' | 'agent_id' | 'run_id' | 'thread_id' | 'operation_id';
  value: string;
  source: string;
};

function evaluateClosureBaseline(input: ClosureBaselineRecord): ClosureBaselineDecision {
  if (input.actualHead !== input.expectedHead) {
    return 'blocked_head_mismatch';
  }
  if (input.stagedPaths.length > 0 || input.unstagedPaths.length > 0 || input.untrackedPaths.length > 0) {
    return 'blocked_dirty_baseline';
  }
  if (!input.diffCheckPassed) {
    return 'blocked_diff_format';
  }
  if (input.cleanupActions.some((action) => action.kind === 'destructive_command')) {
    return 'blocked_destructive_cleanup';
  }
  if (input.closureDiffPaths.some((path) => !input.allowedClosurePaths.includes(path))) {
    return 'blocked_unexpected_closure_diff';
  }
  if (!input.postWriteStatusChecked || !input.postWriteDiffStatChecked || !input.postWriteDiffCheckPassed) {
    return 'blocked_missing_post_write_status';
  }
  if (!input.validationReceiptsPresent || !input.oracleConclusionPresent || !input.exitAssessmentPresent) {
    return 'blocked_missing_closure_evidence';
  }
  return 'ready_for_closure';
}

type ClosureBaselineRecord = {
  expectedHead: string;
  actualHead: string;
  stagedPaths: readonly string[];
  unstagedPaths: readonly string[];
  untrackedPaths: readonly string[];
  diffCheckPassed: boolean;
  cleanupActions: readonly ClosureCleanupAction[];
  closureDiffPaths: readonly string[];
  allowedClosurePaths: readonly string[];
  postWriteStatusChecked: boolean;
  postWriteDiffStatChecked: boolean;
  postWriteDiffCheckPassed: boolean;
  validationReceiptsPresent: boolean;
  oracleConclusionPresent: boolean;
  exitAssessmentPresent: boolean;
};

type ClosureCleanupAction = {
  kind: 'directed_fix' | 'destructive_command';
  command: string;
  reason: string;
};

type ClosureBaselineDecision =
  | 'ready_for_closure'
  | 'blocked_head_mismatch'
  | 'blocked_dirty_baseline'
  | 'blocked_diff_format'
  | 'blocked_destructive_cleanup'
  | 'blocked_unexpected_closure_diff'
  | 'blocked_missing_post_write_status'
  | 'blocked_missing_closure_evidence';

function evaluateOracleGatedClosureState(input: OracleGatedClosureRecord): OracleGatedClosureDecision {
  if (input.validationReceipts.length === 0 || input.validationReceipts.some((receipt) => receipt.exitCode !== 0)) {
    return 'incomplete_local_validation';
  }
  if (input.localValidation !== 'passed') {
    return 'incomplete_local_validation';
  }
  if (input.oracleStatus === 'changes_required') {
    return 'changes_required';
  }
  if (input.oracleStatus === 'blocked') {
    return 'blocked';
  }
  if (input.oracleStatus === 'pending') {
    if (input.reviewRequestId === undefined || input.reviewRequestId.length === 0 || input.diffScopePaths.length === 0) {
      return 'blocked_missing_oracle_pending_trace';
    }
    return input.requestedStatus === 'CLOSED' ? 'blocked_oracle_pending_not_closed' : 'oracle_pending';
  }
  if (input.requestedStatus === 'CLOSED') {
    if (!isOracleApproved(input.oracleStatus) || input.oracleConclusion === undefined || !/\bPASS\b/i.test(input.oracleConclusion)) {
      return 'blocked_missing_oracle_pass';
    }
    if (input.unresolvedItems.length > 0) {
      return 'blocked_unresolved_items';
    }
    return 'closed';
  }

  return isOracleApproved(input.oracleStatus) ? 'oracle_passed' : 'blocked_missing_oracle_pass';
}

type OracleGatedClosureRecord = {
  localValidation: 'passed' | 'failed' | 'not_run';
  oracleStatus: 'not_submitted' | 'pending' | 'passed' | 'approved' | 'changes_required' | 'blocked';
  requestedStatus: 'LOCALLY_VALIDATED' | 'ORACLE_PENDING' | 'CLOSED';
  validationReceipts: readonly ValidationReceipt[];
  diffScopePaths: readonly string[];
  reviewRequestId?: string;
  oracleConclusion?: string;
  unresolvedItems: readonly string[];
};

type OracleGatedClosureDecision =
  | 'closed'
  | 'oracle_passed'
  | 'oracle_pending'
  | 'changes_required'
  | 'blocked'
  | 'blocked_missing_oracle_pass'
  | 'blocked_oracle_pending_not_closed'
  | 'blocked_missing_oracle_pending_trace'
  | 'blocked_unresolved_items'
  | 'incomplete_local_validation';

function validateStructuredClosureSection(section: string, sectionTitle: string): string[] {
  const issues: string[] = [];
  const implementationStatus = readStructuredField(section, sectionTitle, 'implementation status', structuredImplementationStatuses);
  const localValidation = readStructuredField(section, sectionTitle, 'local_validation', structuredLocalValidationStatuses);
  const oracleStatus = readStructuredField(section, sectionTitle, 'oracle_status', structuredOracleStatuses);
  issues.push(...implementationStatus.issues, ...localValidation.issues, ...oracleStatus.issues);

  if (oracleStatus.issues.length === 0 && implementationStatus.value === 'CLOSED' && !isOracleApproved(oracleStatus.value)) {
    issues.push(
      structuredFieldIssue({
        kind: 'CONFLICTING_STATUS',
        sectionTitle,
        fieldName: 'oracle_status',
        actual: oracleStatus.value ?? '<missing>',
        allowedValues: ['passed', 'approved']
      })
    );
  }
  if (oracleStatus.issues.length === 0 && implementationStatus.value === 'ORACLE_PENDING' && oracleStatus.value !== 'pending') {
    issues.push(
      structuredFieldIssue({
        kind: 'CONFLICTING_STATUS',
        sectionTitle,
        fieldName: 'oracle_status',
        actual: oracleStatus.value ?? '<missing>',
        allowedValues: ['pending']
      })
    );
  }
  if (localValidation.issues.length === 0 && implementationStatus.value === 'LOCALLY_VALIDATED' && localValidation.value !== 'passed') {
    issues.push(
      structuredFieldIssue({
        kind: 'CONFLICTING_STATUS',
        sectionTitle,
        fieldName: 'local_validation',
        actual: localValidation.value ?? '<missing>',
        allowedValues: ['passed']
      })
    );
  }

  issues.push(...validateOracleGatedStateTransition(parseStateTransition(section), sectionTitle));

  return issues;
}

function readStructuredField(
  section: string,
  sectionTitle: string,
  fieldName: string,
  allowedValues: readonly string[]
): { value?: string; issues: string[] } {
  const matches = [...section.matchAll(new RegExp(`^- ${escapeRegExp(fieldName)}: \`([^\\\`]+)\`\\.?$`, 'gm'))].map((match) => match[1] ?? '');
  if (matches.length === 0) {
    return {
      issues: [
        structuredFieldIssue({
          kind: 'MISSING_FIELD',
          sectionTitle,
          fieldName,
          actual: '<missing>',
          allowedValues
        })
      ]
    };
  }
  if (matches.length > 1) {
    return {
      value: matches[0],
      issues: [
        structuredFieldIssue({
          kind: 'DUPLICATE_FIELD',
          sectionTitle,
          fieldName,
          actual: matches.join(','),
          allowedValues
        })
      ]
    };
  }
  const value = matches[0];
  if (!allowedValues.includes(value)) {
    return {
      value,
      issues: [
        structuredFieldIssue({
          kind: 'INVALID_FIELD_VALUE',
          sectionTitle,
          fieldName,
          actual: value,
          allowedValues
        })
      ]
    };
  }
  return { value, issues: [] };
}

function structuredFieldIssue(input: {
  kind: 'MISSING_FIELD' | 'DUPLICATE_FIELD' | 'INVALID_FIELD_VALUE' | 'CONFLICTING_STATUS';
  sectionTitle: string;
  fieldName: string;
  actual: string;
  allowedValues: readonly string[];
}): string {
  return `${input.kind} section="${input.sectionTitle}" field="${input.fieldName}" actual="${input.actual}" allowed="${input.allowedValues.join('|')}"`;
}

function validateOracleGatedStateTransition(states: readonly string[], sectionTitle: string): string[] {
  const issues: string[] = [];
  for (let index = 0; index < states.length - 1; index += 1) {
    const currentState = states[index] ?? '';
    const nextState = states[index + 1] ?? '';
    const allowedNextStates = oracleGatedAllowedNextStates[currentState];
    if (allowedNextStates === undefined) {
      issues.push(
        `UNKNOWN_STATE section="${sectionTitle}" field="state_transition" actual="${currentState}" allowed="${oracleGatedKnownStates.join('|')}"`
      );
      continue;
    }
    if (!oracleGatedKnownStateSet.has(nextState)) {
      issues.push(`UNKNOWN_STATE section="${sectionTitle}" field="state_transition" actual="${nextState}" allowed="${oracleGatedKnownStates.join('|')}"`);
      continue;
    }
    if (!allowedNextStates.includes(nextState)) {
      issues.push(
        `ILLEGAL_STATE_TRANSITION section="${sectionTitle}" field="state_transition" actual="${currentState} -> ${nextState}" allowed="${allowedNextStates.join('|')}"`
      );
    }
  }
  return issues;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const structuredImplementationStatuses = [
  'implementing',
  'complete',
  'receipt',
  'LANDED_PENDING_VALIDATION',
  'LOCALLY_VALIDATED',
  'ORACLE_PENDING',
  'ORACLE_PASSED_AWAITING_COMMIT',
  'CHECKPOINT_COMMITTED',
  'CLOSED',
  'CHANGES_REQUIRED',
  'BLOCKED'
] as const;
const structuredLocalValidationStatuses = ['passed', 'failed', 'not_run'] as const;
const structuredOracleStatuses = ['not_submitted', 'pending', 'passed', 'approved', 'changes_required', 'blocked'] as const;

function isOracleApproved(status: string | undefined): boolean {
  return status === 'passed' || status === 'approved';
}
const oracleGatedAllowedNextStates: Record<string, readonly string[]> = {
  planned: ['landed'],
  landed: ['verified'],
  verified: ['oracle_pending', 'oracle_blocked_p2', 'oracle_passed'],
  oracle_pending: ['oracle_passed'],
  oracle_blocked_p2: ['fixed'],
  fixed: ['verified'],
  oracle_passed: ['awaiting_checkpoint', 'checkpoint_committed', 'closed'],
  awaiting_checkpoint: ['checkpoint_committed'],
  checkpoint_committed: [],
  closed: []
};
const oracleGatedKnownStates = Object.keys(oracleGatedAllowedNextStates);
const oracleGatedKnownStateSet = new Set<string>(oracleGatedKnownStates);

function validateOracleRevisionEvidenceBundle(input: OracleRevisionEvidenceBundle): string[] {
  const issues: string[] = [];
  for (const [field, actual, expected] of [
    ['repository', input.repository, input.expectedRepository],
    ['worktree', input.worktree, input.expectedWorktree],
    ['branch', input.branch, input.expectedBranch],
    ['commit_sha', input.currentCommitSha, input.oracleCommitSha],
    ['file_path', input.filePath, input.oracleFilePath],
    ['section_id', input.sectionId, input.oracleSectionId]
  ] as const) {
    if (actual !== expected) {
      issues.push(`REVISION_MISMATCH field="${field}" actual="${actual}" expected="${expected}"`);
    }
  }
  if (input.rgCommand.length === 0) {
    issues.push('MISSING_REVIEW_EVIDENCE field="rgCommand" actual="<missing>" expected="present"');
  }
  if (input.rgResults.length === 0) {
    issues.push('MISSING_REVIEW_EVIDENCE field="rgResults" actual="<missing>" expected="present"');
  }
  if (input.nlRange.length === 0) {
    issues.push('MISSING_REVIEW_EVIDENCE field="nlRange" actual="<missing>" expected="present"');
  }
  if (input.currentValue === input.oracleQuotedValue) {
    issues.push(`STALE_VALUE_NOT_DISTINGUISHED actual="${input.currentValue}" expectedDifferentFrom="${input.oracleQuotedValue}"`);
  }
  return issues;
}

type OracleRevisionEvidenceBundle = {
  repository: string;
  expectedRepository: string;
  worktree: string;
  expectedWorktree: string;
  branch: string;
  expectedBranch: string;
  currentCommitSha: string;
  oracleCommitSha: string;
  filePath: string;
  oracleFilePath: string;
  sectionId: string;
  oracleSectionId: string;
  rgCommand: string;
  rgResults: readonly string[];
  nlRange: string;
  currentValue: string;
  oracleQuotedValue: string;
};

function validateGuardrailCheckpointTrace(input: GuardrailCheckpointTrace): string[] {
  const issues: string[] = [];
  if (!input.logExists) {
    issues.push(`MISSING_IMPROVEMENT_LOG identity="${input.logIdentity}"`);
  }
  if (!input.closureExists) {
    issues.push(`MISSING_CLOSURE_RECORD identity="${input.closureIdentity}"`);
  }
  if (input.logIdentity !== input.closureIdentity) {
    issues.push(`CHECKPOINT_IDENTITY_MISMATCH log="${input.logIdentity}" closure="${input.closureIdentity}"`);
  }
  if (!input.commitExists) {
    issues.push(`COMMIT_NOT_FOUND commit="${input.commitSha}"`);
    return issues;
  }
  for (const path of input.expectedCommittedPaths) {
    if (!input.committedPaths.includes(path)) {
      issues.push(`COMMIT_PATH_MISSING commit="${input.commitSha}" path="${path}"`);
    }
  }
  if (input.closureStatus === 'CHECKPOINT_COMMITTED') {
    for (const path of input.unexplainedImplementationDiffPaths) {
      issues.push(`UNEXPLAINED_IMPLEMENTATION_DIFF path="${path}"`);
    }
  }
  return issues;
}

type GuardrailCheckpointTrace = {
  logExists: boolean;
  closureExists: boolean;
  logIdentity: string;
  closureIdentity: string;
  commitSha: string;
  commitExists: boolean;
  committedPaths: readonly string[];
  expectedCommittedPaths: readonly string[];
  closureStatus: 'LOCALLY_VALIDATED' | 'ORACLE_PENDING' | 'ORACLE_PASSED_AWAITING_COMMIT' | 'CHECKPOINT_COMMITTED';
  unexplainedImplementationDiffPaths: readonly string[];
};

function validateCandidateReceiptStateMachine(input: CandidateReceiptState): string[] {
  const issues: string[] = [];
  const passedGateNames = Object.entries(input.localGates)
    .filter(([, passed]) => passed)
    .map(([gateName]) => gateName)
    .join(',');
  if (input.candidateStatus === 'ORACLE_PENDING') {
    issues.push(`CANDIDATE_MUST_NOT_RECORD_ORACLE_PENDING status="${input.candidateStatus}"`);
    if (!input.oracleRequestSubmitted) {
      issues.push(`ORACLE_PENDING_WITHOUT_SUBMISSION checkpoint="${input.candidateCommitSha ?? '<missing>'}"`);
    }
  }
  if (input.oracleRunStatus === 'pending' && !input.oracleRequestSubmitted) {
    issues.push(`ORACLE_PENDING_WITHOUT_SUBMISSION checkpoint="${input.candidateCommitSha ?? '<missing>'}"`);
  }
  if (input.oracleRunStatus === 'approved' && !input.oracleRequestSubmitted) {
    issues.push(`ORACLE_APPROVED_WITHOUT_ACCEPTED_REQUEST checkpoint="${input.candidateCommitSha ?? '<missing>'}"`);
  }
  if (input.implementationStatus === 'complete' && input.localValidationStatus !== 'passed') {
    issues.push(`IMPLEMENTATION_COMPLETE_BEFORE_LOCAL_VALIDATION status="${input.localValidationStatus}"`);
  }
  if (input.candidateStatus === 'ready_for_commit' && input.localValidationStatus !== 'passed') {
    issues.push(`CANDIDATE_READY_BEFORE_LOCAL_VALIDATION status="${input.localValidationStatus}"`);
  }
  if (input.localValidationStatus === 'passed' || input.candidateStatus === 'ready_for_commit') {
    if (!allLocalGatesPassed(input.localGates)) {
      issues.push(`LOCAL_VALIDATION_PASSED_BEFORE_FULL_GATES gates="${passedGateNames}"`);
    }
  }
  if (input.candidateStatus === 'ready_for_commit' && !input.candidateFrozen) {
    issues.push(`CANDIDATE_NOT_FROZEN checkpoint="${input.candidateCommitSha ?? '<missing>'}"`);
  }
  if (input.candidateDocumentWritesOwnSha) {
    issues.push(`CANDIDATE_SELF_SHA_WRITE_FORBIDDEN checkpoint="${input.candidateCommitSha ?? '<missing>'}"`);
  }
  if (input.oraclePendingWrittenToCandidate) {
    issues.push(`ORACLE_PENDING_WRITTEN_TO_FROZEN_CANDIDATE checkpoint="${input.candidateCommitSha ?? '<missing>'}"`);
  }
  if (input.reviewedCommitSha !== undefined && input.candidateCommitSha !== undefined && input.reviewedCommitSha !== input.candidateCommitSha) {
    issues.push(`ORACLE_REVIEW_SHA_MISMATCH actual="${input.reviewedCommitSha}" expected="${input.candidateCommitSha}"`);
  }
  if (input.closureStatus === 'closed') {
    if (input.oracleRunStatus !== 'approved' || input.oracleResult === undefined || !/\bPASS\b/i.test(input.oracleResult)) {
      issues.push(`RECEIPT_CLOSED_WITHOUT_ORACLE_APPROVAL status="${input.oracleRunStatus}"`);
    }
    if (input.reviewedCommitSha === undefined || input.reviewedCommitSha.startsWith('pending')) {
      issues.push(`RECEIPT_REVIEWED_SHA_MISSING actual="${input.reviewedCommitSha ?? '<missing>'}"`);
    }
    for (const path of input.receiptPaths) {
      if (!input.allowedReceiptPaths.includes(path)) {
        issues.push(`RECEIPT_SCOPE_VIOLATION path="${path}" allowed="${input.allowedReceiptPaths.join('|')}"`);
      }
    }
    if (input.receiptMutatesSubstantiveContent) {
      issues.push(`RECEIPT_MUTATES_SUBSTANTIVE_CONTENT checkpoint="${input.candidateCommitSha ?? '<missing>'}"`);
    }
  }
  return issues;
}

type CandidateReceiptState = {
  implementationStatus: 'implementing' | 'complete' | 'receipt';
  localValidationStatus: 'pending' | 'passed' | 'failed';
  localGates: LocalValidationGates;
  reviewRequired: boolean;
  candidateStatus: 'not_created' | 'ready_for_commit' | 'ORACLE_PENDING';
  oracleRequestSubmitted: boolean;
  oracleRunStatus: 'not_submitted' | 'pending' | 'approved' | 'changes_required' | 'blocked';
  candidateCommitSha?: string;
  candidateFrozen: boolean;
  candidateDocumentWritesOwnSha: boolean;
  reviewedCommitSha?: string;
  oracleResult?: string;
  oraclePendingWrittenToCandidate: boolean;
  receiptPaths: readonly string[];
  allowedReceiptPaths: readonly string[];
  receiptMutatesSubstantiveContent: boolean;
  closureStatus: 'open' | 'closed';
};

type LocalValidationGates = {
  focusedContract: boolean;
  fullTests: boolean;
  typecheck: boolean;
  diffCheck: boolean;
  finalDiffScope: boolean;
};

function allLocalGatesPassed(gates: LocalValidationGates): boolean {
  return gates.focusedContract && gates.fullTests && gates.typecheck && gates.diffCheck && gates.finalDiffScope;
}

function validateCandidateReceiptLifecycle(states: readonly CandidateReceiptLifecycleState[]): string[] {
  const issues: string[] = [];
  for (let index = 0; index < states.length - 1; index += 1) {
    const currentState = states[index] ?? '';
    const nextState = states[index + 1] ?? '';
    const allowedNextState = candidateReceiptLifecycleNext[currentState];
    if (allowedNextState !== nextState) {
      issues.push(`ILLEGAL_CANDIDATE_RECEIPT_TRANSITION actual="${currentState} -> ${nextState}" allowed="${allowedNextState ?? '<none>'}"`);
    }
  }
  return issues;
}

type CandidateReceiptLifecycleState =
  | 'implementing'
  | 'locally_validated'
  | 'candidate_created'
  | 'oracle_pending'
  | 'oracle_approved'
  | 'receipt_committed'
  | 'closed';

const candidateReceiptLifecycleNext: Partial<Record<CandidateReceiptLifecycleState, CandidateReceiptLifecycleState>> = {
  implementing: 'locally_validated',
  locally_validated: 'candidate_created',
  candidate_created: 'oracle_pending',
  oracle_pending: 'oracle_approved',
  oracle_approved: 'receipt_committed',
  receipt_committed: 'closed'
};

function validateSkillRevisionEvidence(input: SkillRevisionEvidence): string[] {
  const issues: string[] = [];
  if (input.skillRoot !== input.normalizedSkillRoot) {
    issues.push(`SKILL_ROOT_NOT_NORMALIZED actual="${input.skillRoot}" expected="${input.normalizedSkillRoot}"`);
  }
  if (input.revisionType === 'git_commit') {
    if (input.gitCommitSha === undefined || input.gitCommitSha.length === 0) {
      issues.push('GIT_SKILL_COMMIT_MISSING');
    }
    if ((input.gitStatusPorcelain ?? '').length > 0 && !input.allowDirtySnapshot) {
      issues.push(`DIRTY_GIT_SKILL_REQUIRES_BUNDLE status="${input.gitStatusPorcelain}"`);
    }
    return issues;
  }

  const manifestPaths = input.manifestEntries.map((entry) => entry.relativePath);
  const sortedManifestPaths = [...manifestPaths].sort();
  if (manifestPaths.join('\n') !== sortedManifestPaths.join('\n')) {
    issues.push(`SKILL_BUNDLE_MANIFEST_UNSORTED actual="${manifestPaths.join(',')}" expected="${sortedManifestPaths.join(',')}"`);
  }
  for (const requiredPath of input.requiredRelativePaths) {
    if (!manifestPaths.includes(requiredPath)) {
      issues.push(`SKILL_BUNDLE_MISSING_FILE path="${requiredPath}"`);
    }
  }
  for (const entry of input.manifestEntries) {
    if (entry.byteLength === undefined) {
      issues.push(`SKILL_BUNDLE_ENTRY_MISSING_BYTE_LENGTH path="${entry.relativePath}"`);
    }
    if (entry.fileType.length === 0) {
      issues.push(`SKILL_BUNDLE_ENTRY_MISSING_FILE_TYPE path="${entry.relativePath}"`);
    }
    if (entry.symlinkTarget === undefined) {
      issues.push(`SKILL_BUNDLE_ENTRY_MISSING_SYMLINK_TARGET path="${entry.relativePath}"`);
    }
    if (entry.symlinkEscapesRoot) {
      issues.push(`SKILL_BUNDLE_SYMLINK_ESCAPES_ROOT path="${entry.relativePath}" target="${entry.symlinkTarget ?? '<missing>'}"`);
    }
  }
  if (input.bundleDigest !== input.expectedBundleDigest) {
    issues.push(`SKILL_BUNDLE_DIGEST_MISMATCH actual="${input.bundleDigest ?? '<missing>'}" expected="${input.expectedBundleDigest ?? '<missing>'}"`);
  }
  if ((input.generationCommand ?? '').length === 0) {
    issues.push('SKILL_BUNDLE_GENERATION_COMMAND_MISSING');
  }
  if (input.generationExitCode !== 0) {
    issues.push(`SKILL_BUNDLE_GENERATION_FAILED exitCode=${input.generationExitCode ?? '<missing>'}`);
  }
  return issues;
}

type SkillRevisionEvidence = {
  skillRoot: string;
  normalizedSkillRoot: string;
  revisionType: 'git_commit' | 'sha256_bundle' | 'dirty_snapshot';
  gitRepositoryRoot?: string;
  gitCommitSha?: string;
  gitStatusPorcelain?: string;
  allowDirtySnapshot: boolean;
  manifestEntries: readonly SkillBundleManifestEntry[];
  requiredRelativePaths: readonly string[];
  bundleDigest?: string;
  expectedBundleDigest?: string;
  generationCommand?: string;
  generationExitCode?: number;
};

type SkillBundleManifestEntry = {
  relativePath: string;
  fileType: 'file' | 'symlink';
  byteLength?: number;
  sha256: string;
  symlinkTarget?: string;
  symlinkEscapesRoot: boolean;
};

function validateValidationEvidenceFreshness(input: ValidationEvidenceFreshnessRecord): string[] {
  const issues: string[] = [];
  if (input.evidenceSource === 'memory') {
    issues.push(`MEMORY_IS_NOT_VALIDATION_EVIDENCE checkpoint="${input.checkpointId}"`);
  }
  for (const [field, actual, expected] of [
    ['repository', input.repository, input.expectedRepository],
    ['worktree', input.worktree, input.expectedWorktree],
    ['branch', input.branch, input.expectedBranch],
    ['commit_sha', input.currentCommitSha, input.validatedCommitSha],
    ['skill_revision', input.currentSkillRevision, input.validatedSkillRevision],
    ['skill_path', input.skillPath, input.expectedSkillPath],
    ['skill_file_sha256', input.skillFileSha256, input.expectedSkillFileSha256],
    ['checkpoint_id', input.checkpointId, input.expectedCheckpointId]
  ] as const) {
    if (actual !== expected) {
      issues.push(`BASELINE_MISMATCH field="${field}" actual="${actual}" expected="${expected}"`);
    }
  }
  for (const receipt of input.validationCommands) {
    if (receipt.exitCode === undefined) {
      issues.push(`MISSING_VALIDATION_EXIT_CODE command="${receipt.command}"`);
    }
    if (receipt.executedAt === undefined) {
      issues.push(`MISSING_VALIDATION_EXECUTION_TIME command="${receipt.command}"`);
    }
  }
  if (input.relevantFilesChangedAfterValidation) {
    issues.push(`VALIDATION_STALE_AFTER_FILE_CHANGE checkpoint="${input.checkpointId}"`);
  }
  if (input.validatorOrClosureSchemaChangedAfterValidation && !input.fullGateRerunAfterValidatorChange) {
    issues.push(`VALIDATION_STALE_AFTER_VALIDATOR_CHANGE checkpoint="${input.checkpointId}"`);
  }
  if (issues.length > 0 && (input.requestedStatus === 'LOCALLY_VALIDATED' || input.requestedStatus === 'CLOSED')) {
    issues.push(`PREMATURE_CLOSURE_STATUS requested="${input.requestedStatus}" allowed="implementing|validating|incomplete|blocked"`);
  }
  return issues;
}

type ValidationEvidenceFreshnessRecord = {
  evidenceSource: 'command' | 'memory';
  repository: string;
  expectedRepository: string;
  worktree: string;
  expectedWorktree: string;
  branch: string;
  expectedBranch: string;
  currentCommitSha: string;
  validatedCommitSha: string;
  currentSkillRevision: string;
  validatedSkillRevision: string;
  skillPath: string;
  expectedSkillPath: string;
  skillFileSha256: string;
  expectedSkillFileSha256: string;
  checkpointId: string;
  expectedCheckpointId: string;
  validationCommands: readonly {
    command: string;
    exitCode?: number;
    executedAt?: string;
  }[];
  relevantFilesChangedAfterValidation: boolean;
  validatorOrClosureSchemaChangedAfterValidation: boolean;
  fullGateRerunAfterValidatorChange: boolean;
  requestedStatus: 'implementing' | 'validating' | 'incomplete' | 'blocked' | 'LOCALLY_VALIDATED' | 'CLOSED';
};

function validateImmutableOracleReviewFlow(input: ImmutableOracleReviewFlow): string[] {
  const issues: string[] = [];
  if (input.reviewedCommitSha !== input.candidateCommitSha) {
    issues.push(
      `REVIEW_NOT_BOUND_TO_CANDIDATE_COMMIT checkpoint="${input.checkpointId}" actual="${input.reviewedCommitSha}" expected="${input.candidateCommitSha}"`
    );
  }
  if (input.reviewedSkillRevision !== input.candidateSkillRevision) {
    issues.push(
      `REVIEW_NOT_BOUND_TO_SKILL_REVISION checkpoint="${input.checkpointId}" actual="${input.reviewedSkillRevision}" expected="${input.candidateSkillRevision}"`
    );
  }
  if (input.oracleSubmissionId === undefined) {
    issues.push('MISSING_ORACLE_ID field="submission_id"');
  }
  if (input.oracleAgentId === undefined) {
    issues.push('MISSING_ORACLE_ID field="agent_id"');
  }
  for (const receipt of input.validationReceipts) {
    if (receipt.exitCode !== 0) {
      issues.push(`VALIDATION_RECEIPT_FAILED command="${receipt.command}" exitCode=${receipt.exitCode}`);
    }
  }
  if (input.reviewedFilesChangedAfterOracleSubmission) {
    issues.push(`REVIEW_STALE_AFTER_FILE_CHANGE checkpoint="${input.checkpointId}"`);
  }
  if (input.oracleStatus === 'approved' && !/\bPASS\b/i.test(input.oracleResult)) {
    issues.push(`APPROVED_WITHOUT_ORACLE_PASS checkpoint="${input.checkpointId}"`);
  }
  for (const path of input.receiptCommitPaths) {
    if (!input.allowedReceiptPaths.includes(path)) {
      issues.push(`RECEIPT_SCOPE_VIOLATION path="${path}" allowed="${input.allowedReceiptPaths.join('|')}"`);
    }
  }
  if (input.receiptMutatesValidationLogic) {
    issues.push(`RECEIPT_MUTATES_VALIDATION_LOGIC checkpoint="${input.checkpointId}"`);
  }
  return issues;
}

type ImmutableOracleReviewFlow = {
  candidateCommitSha: string;
  reviewedCommitSha: string;
  candidateSkillRevision: string;
  reviewedSkillRevision: string;
  checkpointId: string;
  fileScope: readonly string[];
  validationReceipts: readonly ValidationReceipt[];
  oracleSubmissionId?: string;
  oracleAgentId?: string;
  reviewedFilesChangedAfterOracleSubmission: boolean;
  oracleResult: string;
  oracleStatus: 'pending' | 'approved' | 'changes_required' | 'blocked';
  receiptCommitPaths: readonly string[];
  allowedReceiptPaths: readonly string[];
  receiptMutatesValidationLogic: boolean;
};

function validateReceiptOnlyCommit(input: ReceiptOnlyCommit): string[] {
  const issues: string[] = [];
  if (input.reviewedCommitSha !== input.candidateCommitSha) {
    issues.push(`RECEIPT_REVIEWED_SHA_MISMATCH actual="${input.reviewedCommitSha}" expected="${input.candidateCommitSha}"`);
  }
  if (input.receiptParentSha !== input.candidateCommitSha) {
    issues.push(`RECEIPT_PARENT_NOT_CANDIDATE actual="${input.receiptParentSha}" expected="${input.candidateCommitSha}"`);
  }
  if (input.reviewedCommitSha === input.receiptCommitSha || input.receiptDiff.includes('receipt_commit_sha:')) {
    issues.push(`RECEIPT_SELF_REFERENCE_FORBIDDEN receipt="${input.receiptCommitSha}"`);
  }
  for (const path of input.receiptPaths) {
    if (!input.allowedReceiptPaths.includes(path)) {
      issues.push(`RECEIPT_SCOPE_VIOLATION path="${path}" allowed="${input.allowedReceiptPaths.join('|')}"`);
    }
  }
  if (!receiptDiffOnlyTouchesSection(input.receiptDiff, input.requiredClosureTitle)) {
    issues.push(`RECEIPT_DIFF_OUTSIDE_TARGET_SECTION section="${input.requiredClosureTitle}"`);
  }
  for (const pattern of input.forbiddenPatterns) {
    if (input.receiptDiff.includes(pattern)) {
      issues.push(`RECEIPT_FORBIDDEN_PATTERN pattern="${pattern}"`);
    }
  }
  if (input.postCommitHead !== input.expectedPostCommitHead) {
    issues.push(`POST_COMMIT_HEAD_MISMATCH actual="${input.postCommitHead}" expected="${input.expectedPostCommitHead}"`);
  }
  if (input.postCommitStatusShort.length > 0) {
    issues.push(`POST_COMMIT_STATUS_NOT_CLEAN actual="${input.postCommitStatusShort}"`);
  }
  if (input.focusedContractExitCode !== 0) {
    issues.push(`POST_COMMIT_FOCUSED_CONTRACT_FAILED exitCode=${input.focusedContractExitCode}`);
  }
  if (input.showCheckExitCode !== 0) {
    issues.push(`POST_COMMIT_SHOW_CHECK_FAILED exitCode=${input.showCheckExitCode}`);
  }
  return issues;
}

function receiptDiffOnlyTouchesSection(diff: string, sectionTitle: string): boolean {
  const lines = diff.split('\n');
  let sawTargetSection = false;
  let inTargetSection = false;
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      inTargetSection = false;
      continue;
    }
    if (line.startsWith('@@')) {
      continue;
    }
    const content = line.replace(/^[+\- ]/, '');
    if (content.startsWith('## ')) {
      inTargetSection = content === sectionTitle;
      sawTargetSection ||= inTargetSection;
      continue;
    }
    if (!line.startsWith('+') && !line.startsWith('-')) {
      continue;
    }
    if (line.startsWith('+++') || line.startsWith('---')) {
      continue;
    }
    if (!inTargetSection) {
      return false;
    }
  }
  return sawTargetSection;
}

type ReceiptOnlyCommit = {
  candidateCommitSha: string;
  receiptCommitSha: string;
  receiptParentSha: string;
  reviewedCommitSha: string;
  receiptPaths: readonly string[];
  allowedReceiptPaths: readonly string[];
  receiptDiff: string;
  requiredClosureTitle: string;
  forbiddenPatterns: readonly string[];
  postCommitHead: string;
  expectedPostCommitHead: string;
  postCommitStatusShort: string;
  focusedContractExitCode: number;
  showCheckExitCode: number;
};

function timeoutObservation(command: string, status: TimeoutObservation['status'], timeoutMs: number, durationMs: number): TimeoutObservation {
  return { command, status, timeoutMs, durationMs, environment: 'local-vitest-node' };
}

function evaluateSuiteTimeoutDiagnosis(input: SuiteTimeoutDiagnosis): TimeoutDiagnosisDecision {
  if (input.originalFullRun.status !== 'failed') {
    return 'inconclusive';
  }
  if (input.isolatedRun === undefined || input.equivalentTimeoutOnlyRun === undefined) {
    return 'blocked_missing_isolation_evidence';
  }
  if (
    input.isolatedRun.status !== 'passed' ||
    input.equivalentTimeoutOnlyRun.status !== 'passed' ||
    input.equivalentTimeoutOnlyRun.changedVariables.length !== 1 ||
    input.equivalentTimeoutOnlyRun.changedVariables[0] !== 'timeout'
  ) {
    return 'blocked_non_equivalent_timeout_run';
  }
  if (input.proposedAdjustment.scope === 'global' || input.proposedAdjustment.timeoutMs > 30_000) {
    return 'blocked_overbroad_timeout_adjustment';
  }
  if (input.proposedAdjustment.performanceGuardrail || !input.proposedAdjustment.removableWaitChecked) {
    return 'inconclusive';
  }
  if (
    !input.closureValidation.contractsPassed ||
    !input.closureValidation.workspacePassed ||
    !input.closureValidation.typecheckPassed ||
    !input.closureValidation.diffCheckPassed
  ) {
    return 'blocked_missing_closure_validation';
  }

  return 'local_timeout_adjustment_supported';
}

type SuiteTimeoutDiagnosis = {
  originalFullRun: TimeoutObservation;
  isolatedRun?: TimeoutObservation;
  equivalentTimeoutOnlyRun?: TimeoutObservation & { changedVariables: readonly TimeoutRunVariable[] };
  proposedAdjustment: {
    scope: 'test' | 'test_group' | 'global';
    timeoutMs: number;
    performanceGuardrail: boolean;
    removableWaitChecked: boolean;
  };
  closureValidation: {
    contractsPassed: boolean;
    workspacePassed: boolean;
    typecheckPassed: boolean;
    diffCheckPassed: boolean;
  };
};

type TimeoutObservation = {
  command: string;
  status: 'passed' | 'failed' | 'timed_out';
  timeoutMs: number;
  durationMs: number;
  environment: string;
};

type TimeoutRunVariable = 'timeout' | 'test_collection' | 'config' | 'environment' | 'setup' | 'concurrency' | 'exit_semantics';

type TimeoutDiagnosisDecision =
  | 'local_timeout_adjustment_supported'
  | 'blocked_missing_isolation_evidence'
  | 'blocked_non_equivalent_timeout_run'
  | 'blocked_overbroad_timeout_adjustment'
  | 'blocked_missing_closure_validation'
  | 'inconclusive';
