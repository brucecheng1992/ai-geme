import { execFileSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { createHealthDamageInvulnerabilityPackageContract } from '../../packages/game-dsl/src/index.js';

const stage4PlanPath = 'docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md';
const healthDamageInvulnerabilityClosureTitle = '## Stage 4 Closure Implementation — Health Damage Invulnerability Package-Owned QA Slice';
const healthDamageInvulnerabilityCheckpointCommit = 'd8225bf1';

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
