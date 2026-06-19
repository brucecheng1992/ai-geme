import { z } from 'zod';

import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  GenerationCapabilityReadinessReportSchema,
  type GenerationCapabilityReadinessReport
} from './generation-capability-readiness.js';
import {
  GenerationCapabilityResolutionReportSchema,
  type GenerationCapabilityResolutionReport
} from './generation-capability-resolution.js';
import {
  GenerationCapabilityRuntimeReportSchema,
  type GenerationCapabilityRuntimeReport
} from './generation-capability-runtime.js';

export const GENERATION_CAPABILITY_GAP_REPORT_KIND = 'generation_capability_gap_report';
export const GENERATION_CAPABILITY_GAP_REPORT_SCHEMA_VERSION = 'generation_capability_gap_report.v0.1';
export const GENERATION_CAPABILITY_GAP_REPORT_PATH = 'generation_capability_gap_report.json';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);

export const GenerationCapabilityGapReportSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_CAPABILITY_GAP_REPORT_KIND),
  schemaVersion: z.literal(GENERATION_CAPABILITY_GAP_REPORT_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  normalizedGenre: z.string().min(1),
  profileId: z.string().min(1).optional(),
  targetPath: z.literal('capability_composed_v1'),
  selectedPath: z.enum(['legacy_template_v1', 'fail_closed_unsupported_intent']),
  shadowMode: z.literal(true),
  registrySnapshotHash: z.string().min(1),
  readinessReportHash: z.string().min(1),
  resolutionReportHash: z.string().min(1),
  runtimeReportHash: z.string().min(1),
  capabilityPathGate: z.enum([
    'blocked_before_provider',
    'blocked_integrity_mismatch',
    'ready_for_capability_provider',
    'unsupported_intent_fail_closed'
  ]),
  gapStatus: z.enum(['required_capability_gap', 'blocked_not_capability_gap', 'not_required', 'unsupported_intent']),
  providerInvocationPolicy: z.enum([
    'block_capability_provider_until_exact_lock',
    'ready_for_capability_provider',
    'unsupported_intent_not_sent_to_provider'
  ]),
  step36EscalationStatus: z.enum(['eligible_blocked_gap', 'blocked_not_capability_gap', 'not_required', 'not_applicable_unsupported_intent']),
  missingRequiredCapabilityIds: z.array(z.string().min(1)),
  missingRegistryCapabilityAliases: z.array(z.string().min(1)),
  resolverMissingCapabilityIds: z.array(z.string().min(1)),
  runtimeEvidenceBlockers: z.array(z.string().min(1)),
  installPolicy: z.strictObject({
    resolverPackageNamespace: z.literal('active_immutable_registry_snapshot'),
    uninstalledStep36CandidateAllowed: z.literal(false),
    approvedButNotInstalledCandidateAllowed: z.literal(false),
    installedPackagesRequireNewSnapshotAndRun: z.literal(true)
  }),
  productionMutation: z.strictObject({
    activeRegistryMutation: z.literal(false),
    activeExactLockMutation: z.literal(false),
    fixedTemplateFallbackOnGap: z.literal(false)
  }),
  attemptedCandidatePackageInputCount: z.number().int().min(0),
  attemptedCandidatePackageInputRejected: z.boolean(),
  step36EscalationPreconditions: z.strictObject({
    sourceRunBound: z.literal(true),
    profileResolutionBound: z.boolean(),
    capabilityRequirementsBound: z.literal(true),
    registrySnapshotBound: z.literal(true),
    blockedRequiredGapPresent: z.boolean(),
    activeInstallAllowedFromGenerationRun: z.literal(false)
  }),
  blockers: z.array(z.string().min(1)),
  reportHash: z.string().min(1)
});

export type GenerationCapabilityGapReport = z.infer<typeof GenerationCapabilityGapReportSchema>;

export function buildGenerationCapabilityGapReport(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  readinessReport: GenerationCapabilityReadinessReport;
  resolutionReport: GenerationCapabilityResolutionReport;
  runtimeReport: GenerationCapabilityRuntimeReport;
  attemptedCandidatePackageInputCount?: number;
}): GenerationCapabilityGapReport {
  const readinessReport = GenerationCapabilityReadinessReportSchema.parse(input.readinessReport);
  const resolutionReport = GenerationCapabilityResolutionReportSchema.parse(input.resolutionReport);
  const runtimeReport = GenerationCapabilityRuntimeReportSchema.parse(input.runtimeReport);
  const integrityBlockers = buildIntegrityBlockers(readinessReport, resolutionReport, runtimeReport);
  const missingRequiredCapabilityIds = uniqueSortedStrings(readinessReport.capabilityRequirements.incompleteCapabilityIds);
  const missingRegistryCapabilityAliases = uniqueSortedStrings(readinessReport.capabilityRequirements.missingRegistryCapabilityAliases);
  const resolverMissingCapabilityIds = uniqueSortedStrings(
    resolutionReport.resolverDiagnostics
      .filter((diagnostic) => diagnostic.code === 'MISSING_CAPABILITY')
      .map((diagnostic) => diagnostic.capabilityId)
  );
  const runtimeEvidenceBlockers = uniqueSortedStrings(runtimeReport.blockers);
  const attemptedCandidatePackageInputCount = input.attemptedCandidatePackageInputCount ?? 0;
  const attemptedCandidatePackageInputRejected = attemptedCandidatePackageInputCount > 0;
  const unsupportedIntent = resolutionReport.selectedPath === 'fail_closed_unsupported_intent' || readinessReport.profileResolution.status === 'unresolved';
  const blockedRequiredGapPresent =
    !unsupportedIntent && (missingRequiredCapabilityIds.length > 0 || missingRegistryCapabilityAliases.length > 0 || resolverMissingCapabilityIds.length > 0);
  const blockedWithoutCapabilityGap =
    !unsupportedIntent &&
    !blockedRequiredGapPresent &&
    (integrityBlockers.length > 0 || resolutionReport.blockers.length > 0 || runtimeReport.blockers.length > 0);
  const blockers = uniqueSortedStrings([
    ...integrityBlockers,
    ...missingRequiredCapabilityIds.map((capabilityId) => `missing_required_capability:${capabilityId}`),
    ...missingRegistryCapabilityAliases.map((alias) => `missing_registry_alias:${alias}`),
    ...resolverMissingCapabilityIds.map((capabilityId) => `resolver_missing_capability:${capabilityId}`),
    ...(attemptedCandidatePackageInputRejected ? ['candidate_package_input_forbidden'] : [])
  ]);

  const capabilityPathGate = deriveCapabilityPathGate({
    unsupportedIntent,
    blockedRequiredGapPresent,
    blockedWithoutCapabilityGap,
    integrityBlockers
  });
  const payload: Omit<GenerationCapabilityGapReport, 'reportHash'> = {
    artifactKind: GENERATION_CAPABILITY_GAP_REPORT_KIND,
    schemaVersion: GENERATION_CAPABILITY_GAP_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    ...(resolutionReport.profileId === undefined ? {} : { profileId: resolutionReport.profileId }),
    targetPath: 'capability_composed_v1',
    selectedPath: resolutionReport.selectedPath,
    shadowMode: true,
    registrySnapshotHash: readinessReport.registrySnapshotHash,
    readinessReportHash: readinessReport.reportHash,
    resolutionReportHash: resolutionReport.reportHash,
    runtimeReportHash: runtimeReport.reportHash,
    capabilityPathGate,
    gapStatus: deriveGapStatus({ unsupportedIntent, blockedRequiredGapPresent, blockedWithoutCapabilityGap }),
    providerInvocationPolicy: deriveProviderInvocationPolicy(capabilityPathGate),
    step36EscalationStatus: deriveStep36EscalationStatus({
      unsupportedIntent,
      blockedRequiredGapPresent,
      blockedWithoutCapabilityGap
    }),
    missingRequiredCapabilityIds,
    missingRegistryCapabilityAliases,
    resolverMissingCapabilityIds,
    runtimeEvidenceBlockers,
    installPolicy: {
      resolverPackageNamespace: 'active_immutable_registry_snapshot',
      uninstalledStep36CandidateAllowed: false,
      approvedButNotInstalledCandidateAllowed: false,
      installedPackagesRequireNewSnapshotAndRun: true
    },
    productionMutation: {
      activeRegistryMutation: false,
      activeExactLockMutation: false,
      fixedTemplateFallbackOnGap: false
    },
    attemptedCandidatePackageInputCount,
    attemptedCandidatePackageInputRejected,
    step36EscalationPreconditions: {
      sourceRunBound: true,
      profileResolutionBound: readinessReport.profileResolution.status === 'resolved',
      capabilityRequirementsBound: true,
      registrySnapshotBound: true,
      blockedRequiredGapPresent,
      activeInstallAllowedFromGenerationRun: false
    },
    blockers
  };

  return GenerationCapabilityGapReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) });
}

function buildIntegrityBlockers(
  readinessReport: GenerationCapabilityReadinessReport,
  resolutionReport: GenerationCapabilityResolutionReport,
  runtimeReport: GenerationCapabilityRuntimeReport
): string[] {
  return [
    ...(resolutionReport.registrySnapshotHash === readinessReport.registrySnapshotHash ? [] : ['hash_mismatch:registry_snapshot']),
    ...(resolutionReport.readinessReportHash === readinessReport.reportHash ? [] : ['hash_mismatch:readiness_report']),
    ...(runtimeReport.resolutionReportHash === resolutionReport.reportHash ? [] : ['hash_mismatch:resolution_report'])
  ];
}

function deriveCapabilityPathGate(input: {
  unsupportedIntent: boolean;
  blockedRequiredGapPresent: boolean;
  blockedWithoutCapabilityGap: boolean;
  integrityBlockers: readonly string[];
}): GenerationCapabilityGapReport['capabilityPathGate'] {
  if (input.unsupportedIntent) {
    return 'unsupported_intent_fail_closed';
  }
  if (input.integrityBlockers.length > 0) {
    return 'blocked_integrity_mismatch';
  }
  if (input.blockedRequiredGapPresent || input.blockedWithoutCapabilityGap) {
    return 'blocked_before_provider';
  }
  return 'ready_for_capability_provider';
}

function deriveGapStatus(input: {
  unsupportedIntent: boolean;
  blockedRequiredGapPresent: boolean;
  blockedWithoutCapabilityGap: boolean;
}): GenerationCapabilityGapReport['gapStatus'] {
  if (input.unsupportedIntent) {
    return 'unsupported_intent';
  }
  if (input.blockedRequiredGapPresent) {
    return 'required_capability_gap';
  }
  if (input.blockedWithoutCapabilityGap) {
    return 'blocked_not_capability_gap';
  }
  return 'not_required';
}

function deriveProviderInvocationPolicy(
  capabilityPathGate: GenerationCapabilityGapReport['capabilityPathGate']
): GenerationCapabilityGapReport['providerInvocationPolicy'] {
  if (capabilityPathGate === 'unsupported_intent_fail_closed') {
    return 'unsupported_intent_not_sent_to_provider';
  }
  if (capabilityPathGate === 'ready_for_capability_provider') {
    return 'ready_for_capability_provider';
  }
  return 'block_capability_provider_until_exact_lock';
}

function deriveStep36EscalationStatus(input: {
  unsupportedIntent: boolean;
  blockedRequiredGapPresent: boolean;
  blockedWithoutCapabilityGap: boolean;
}): GenerationCapabilityGapReport['step36EscalationStatus'] {
  if (input.unsupportedIntent) {
    return 'not_applicable_unsupported_intent';
  }
  if (input.blockedRequiredGapPresent) {
    return 'eligible_blocked_gap';
  }
  if (input.blockedWithoutCapabilityGap) {
    return 'blocked_not_capability_gap';
  }
  return 'not_required';
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
