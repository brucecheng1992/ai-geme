import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  STEP37_CONTRACT_FREEZE_TEST_TARGET,
  STEP37_TELEMETRY_EVENT_SCHEMA_PATH,
  canonicalizeStep37ContractFreezeSnapshot,
  requiresTelemetryContractFreeze,
  validateStep37FocusedValidationSet,
  validateStep37FullValidationGatesAfterFocusedGreen
} from '../../packages/game-dsl/src/index.js';

describe('Step37 focused validation selection', () => {
  it('records the focused validation scope rule in AGENTS and the active Skill', async () => {
    const [agents, skill] = await Promise.all([
      readFile('AGENTS.md', 'utf8'),
      readFile('/Users/dahufa/.agents/skills/code-change-discipline/SKILL.md', 'utf8')
    ]);

    expect(agents).toContain('Focused validation must follow the actual diff impact');
    expect(agents).toContain('tests/contracts/contract-freeze.test.ts');
    expect(skill).toContain('Focused 验证范围与 telemetry schema freeze');
    expect(skill).toContain('focused GREEN 只证明局部契约满足');
    expect(skill).toContain('tests/contracts/contract-freeze.test.ts');
  });

  it('requires contract-freeze when the telemetry event schema file changes', () => {
    expect(
      validateStep37FocusedValidationSet({
        changedPaths: [STEP37_TELEMETRY_EVENT_SCHEMA_PATH],
        focusedTestTargets: ['tests/contracts/gameplay-capability-package-contract.test.ts']
      })
    ).toEqual([
      {
        code: 'TELEMETRY_SCHEMA_FREEZE_REQUIRED',
        field: 'focusedTestTargets',
        actual: 'tests/contracts/gameplay-capability-package-contract.test.ts',
        expected: STEP37_CONTRACT_FREEZE_TEST_TARGET
      }
    ]);

    expect(
      validateStep37FocusedValidationSet({
        changedPaths: [STEP37_TELEMETRY_EVENT_SCHEMA_PATH],
        focusedTestTargets: [STEP37_CONTRACT_FREEZE_TEST_TARGET]
      })
    ).toEqual([]);
  });

  it('requires contract-freeze when producer or reader field semantics change even outside the schema file', () => {
    expect(
      requiresTelemetryContractFreeze({
        changedPaths: ['apps/maker-api/src/qa/playwright-browser-runner.ts'],
        telemetrySchemaImpacts: ['producer_reader_field_shape_changed']
      })
    ).toBe(true);

    expect(
      validateStep37FocusedValidationSet({
        changedPaths: ['apps/maker-api/src/qa/playwright-browser-runner.ts'],
        telemetrySchemaImpacts: ['field_renamed'],
        focusedTestTargets: ['tests/workspace/playwright-qa-runner.test.ts']
      })
    ).toEqual([
      {
        code: 'TELEMETRY_SCHEMA_FREEZE_REQUIRED',
        field: 'focusedTestTargets',
        actual: 'tests/workspace/playwright-qa-runner.test.ts',
        expected: STEP37_CONTRACT_FREEZE_TEST_TARGET
      }
    ]);
  });

  it('does not require contract-freeze for unrelated focused changes', () => {
    expect(
      validateStep37FocusedValidationSet({
        changedPaths: ['templates/phaser/side_scrolling_run_and_gun/src/GameScene.ts'],
        focusedTestTargets: ['tests/contracts/phaser-templates.test.ts']
      })
    ).toEqual([]);
  });

  it('requires an explicit compatibility policy for newly added optional telemetry fields', () => {
    expect(
      validateStep37FocusedValidationSet({
        changedPaths: [STEP37_TELEMETRY_EVENT_SCHEMA_PATH],
        telemetrySchemaImpacts: ['field_added'],
        focusedTestTargets: [STEP37_CONTRACT_FREEZE_TEST_TARGET],
        optionalTelemetryFieldPolicy: 'undocumented'
      })
    ).toEqual([
      {
        code: 'TELEMETRY_OPTIONAL_FIELD_POLICY_REQUIRED',
        field: 'optionalTelemetryFieldPolicy',
        actual: 'undocumented',
        expected: 'documented_compatible'
      }
    ]);

    expect(
      validateStep37FocusedValidationSet({
        changedPaths: [STEP37_TELEMETRY_EVENT_SCHEMA_PATH],
        telemetrySchemaImpacts: ['field_added'],
        focusedTestTargets: [STEP37_CONTRACT_FREEZE_TEST_TARGET],
        optionalTelemetryFieldPolicy: 'documented_compatible'
      })
    ).toEqual([]);
  });

  it('does not let focused GREEN replace the remaining validation gates', () => {
    expect(
      validateStep37FullValidationGatesAfterFocusedGreen({
        focusedContractsPassed: true,
        relatedContractsPassed: true,
        fullTestsPassed: false,
        typecheckPassed: true,
        diffCheckPassed: true,
        finalDiffScopeChecked: false,
        skillFreshnessChecked: false
      })
    ).toEqual([
      {
        code: 'FOCUSED_GREEN_INSUFFICIENT',
        field: 'fullValidationGates',
        actual: 'fullTestsPassed,finalDiffScopeChecked,skillFreshnessChecked',
        expected: 'relatedContractsPassed,fullTestsPassed,typecheckPassed,diffCheckPassed,finalDiffScopeChecked,skillFreshnessChecked'
      }
    ]);

    expect(
      validateStep37FullValidationGatesAfterFocusedGreen({
        focusedContractsPassed: true,
        relatedContractsPassed: true,
        fullTestsPassed: true,
        typecheckPassed: true,
        diffCheckPassed: true,
        finalDiffScopeChecked: true,
        skillFreshnessChecked: true
      })
    ).toEqual([]);
  });

  it('canonicalizes object key order without hiding field or type changes', () => {
    const left = {
      event: {
        payload: { frame: 'number', type: 'string' },
        required: ['type', 'timestamp_ms', 'frame']
      }
    };
    const sameDifferentOrder = {
      event: {
        required: ['type', 'timestamp_ms', 'frame'],
        payload: { type: 'string', frame: 'number' }
      }
    };
    const changedFieldType = {
      event: {
        required: ['type', 'timestamp_ms', 'frame'],
        payload: { type: 'string', frame: 'string' }
      }
    };

    expect(canonicalizeStep37ContractFreezeSnapshot(left)).toEqual(canonicalizeStep37ContractFreezeSnapshot(sameDifferentOrder));
    expect(canonicalizeStep37ContractFreezeSnapshot(left)).not.toEqual(canonicalizeStep37ContractFreezeSnapshot(changedFieldType));
  });
});
