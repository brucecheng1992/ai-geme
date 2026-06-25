import { execFileSync } from 'node:child_process';
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

function changedPathsForCommit(commit: string): string[] {
  return execFileSync('git', ['show', '--name-only', '--format=', commit], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort();
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
    if (input.oracleStatus !== 'passed' || input.oracleConclusion === undefined || !/\bPASS\b/i.test(input.oracleConclusion)) {
      return 'blocked_missing_oracle_pass';
    }
    if (input.unresolvedItems.length > 0) {
      return 'blocked_unresolved_items';
    }
    return 'closed';
  }

  return input.oracleStatus === 'passed' ? 'oracle_passed' : 'blocked_missing_oracle_pass';
}

type OracleGatedClosureRecord = {
  localValidation: 'passed' | 'failed' | 'not_run';
  oracleStatus: 'not_submitted' | 'pending' | 'passed' | 'changes_required' | 'blocked';
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
