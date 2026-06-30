export const STEP37_CONTRACT_FREEZE_TEST_TARGET = 'tests/contracts/contract-freeze.test.ts';
export const STEP37_TELEMETRY_EVENT_SCHEMA_PATH = 'packages/runtime-core/src/telemetry/telemetry-event-v0.1.schema.ts';

export const STEP37_TELEMETRY_SCHEMA_IMPACTS = [
  'event_identity_changed',
  'event_name_changed',
  'field_added',
  'field_removed',
  'field_renamed',
  'field_type_changed',
  'field_requiredness_changed',
  'enum_allowed_values_changed',
  'schema_version_changed',
  'producer_reader_field_shape_changed'
] as const;

export type Step37TelemetrySchemaImpact = (typeof STEP37_TELEMETRY_SCHEMA_IMPACTS)[number];
export type Step37OptionalTelemetryFieldPolicy = 'documented_compatible' | 'undocumented' | 'not_applicable';

export type Step37FocusedValidationSetInput = {
  changedPaths: readonly string[];
  telemetrySchemaImpacts?: readonly Step37TelemetrySchemaImpact[];
  focusedTestTargets: readonly string[];
  optionalTelemetryFieldPolicy?: Step37OptionalTelemetryFieldPolicy;
};

export type Step37FocusedValidationGateInput = {
  focusedContractsPassed: boolean;
  relatedContractsPassed: boolean;
  fullTestsPassed: boolean;
  typecheckPassed: boolean;
  diffCheckPassed: boolean;
  finalDiffScopeChecked: boolean;
  skillFreshnessChecked: boolean;
};

export type Step37FocusedValidationIssue = {
  code:
    | 'TELEMETRY_SCHEMA_FREEZE_REQUIRED'
    | 'TELEMETRY_OPTIONAL_FIELD_POLICY_REQUIRED'
    | 'FOCUSED_GREEN_INSUFFICIENT';
  field: string;
  actual: string;
  expected: string;
};

export function validateStep37FocusedValidationSet(input: Step37FocusedValidationSetInput): Step37FocusedValidationIssue[] {
  const issues: Step37FocusedValidationIssue[] = [];
  const focusedTargets = new Set(input.focusedTestTargets.map(normalizePath));
  const telemetryImpacts = input.telemetrySchemaImpacts ?? [];

  if (requiresTelemetryContractFreeze(input) && !focusedTargets.has(STEP37_CONTRACT_FREEZE_TEST_TARGET)) {
    issues.push({
      code: 'TELEMETRY_SCHEMA_FREEZE_REQUIRED',
      field: 'focusedTestTargets',
      actual: [...focusedTargets].sort().join(',') || '<empty>',
      expected: STEP37_CONTRACT_FREEZE_TEST_TARGET
    });
  }

  if (
    telemetryImpacts.includes('field_added') &&
    (input.optionalTelemetryFieldPolicy ?? 'not_applicable') !== 'documented_compatible'
  ) {
    issues.push({
      code: 'TELEMETRY_OPTIONAL_FIELD_POLICY_REQUIRED',
      field: 'optionalTelemetryFieldPolicy',
      actual: input.optionalTelemetryFieldPolicy ?? '<missing>',
      expected: 'documented_compatible'
    });
  }

  return issues;
}

export function validateStep37FullValidationGatesAfterFocusedGreen(
  input: Step37FocusedValidationGateInput
): Step37FocusedValidationIssue[] {
  if (!input.focusedContractsPassed) {
    return [];
  }

  const missingGates = [
    ...(input.relatedContractsPassed ? [] : ['relatedContractsPassed']),
    ...(input.fullTestsPassed ? [] : ['fullTestsPassed']),
    ...(input.typecheckPassed ? [] : ['typecheckPassed']),
    ...(input.diffCheckPassed ? [] : ['diffCheckPassed']),
    ...(input.finalDiffScopeChecked ? [] : ['finalDiffScopeChecked']),
    ...(input.skillFreshnessChecked ? [] : ['skillFreshnessChecked'])
  ];

  return missingGates.length === 0
    ? []
    : [
        {
          code: 'FOCUSED_GREEN_INSUFFICIENT',
          field: 'fullValidationGates',
          actual: missingGates.join(','),
          expected: 'relatedContractsPassed,fullTestsPassed,typecheckPassed,diffCheckPassed,finalDiffScopeChecked,skillFreshnessChecked'
        }
      ];
}

export function requiresTelemetryContractFreeze(input: Pick<Step37FocusedValidationSetInput, 'changedPaths' | 'telemetrySchemaImpacts'>): boolean {
  return (
    input.changedPaths.map(normalizePath).includes(STEP37_TELEMETRY_EVENT_SCHEMA_PATH) ||
    (input.telemetrySchemaImpacts ?? []).some((impact) => STEP37_TELEMETRY_SCHEMA_IMPACTS.includes(impact))
  );
}

export function canonicalizeStep37ContractFreezeSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeStep37ContractFreezeSnapshot);
  }
  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalizeStep37ContractFreezeSnapshot(child)])
  );
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
