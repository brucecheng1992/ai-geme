import { z } from 'zod';

import {
  DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_ID,
  DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_VERSION,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  type DeepSeekRunAndGunProfileCapabilitySupport,
  type DeepSeekRunAndGunProfileSupportSummary
} from './deepseek-run-and-gun-validation-profile-v1.js';
import {
  GameplayCapabilityDerivedSupportClassificationSchema,
  GameplayCapabilityRegistry as DEFAULT_GAMEPLAY_CAPABILITY_REGISTRY,
  GameplayCapabilitySupportEvidenceDimensionsSchema,
  findGameplayCapability,
  isCompleteSupportedEvidenceDimensions,
  type GameplayCapabilityRegistry,
  type GameplayCapabilitySupportEvidenceDimensions
} from './gameplay-capabilities/registry.js';
import { type CapabilityQaProbeResult, type CapabilityQaReport } from './gameplay-capabilities/capability-qa-probes.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';

export const GENERATION_TARGET_PROFILE_RUNTIME_SUPPORT_REPORT_KIND = 'generation_target_profile_runtime_support_report';
export const GENERATION_TARGET_PROFILE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION = 'generation_target_profile_runtime_support_report.v0.1';
export const GENERATION_TARGET_PROFILE_RUNTIME_SUPPORT_REPORT_PATH = 'generation_target_profile_runtime_support_report.json';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);

export const GenerationTargetProfileRuntimeSupportCapabilitySchema = z.strictObject({
  capabilityId: z.string().min(1),
  registered: z.boolean(),
  classification: GameplayCapabilityDerivedSupportClassificationSchema,
  staticEvidenceDimensions: GameplayCapabilitySupportEvidenceDimensionsSchema,
  observedEvidenceDimensions: GameplayCapabilitySupportEvidenceDimensionsSchema,
  missingStaticEvidenceDimensions: z.array(z.string().min(1)),
  missingSupportEvidencePrerequisites: z.array(z.string().min(1)),
  staticCompleteSupported: z.boolean(),
  requiredProbeIds: z.array(z.string().min(1)),
  verifiedRequiredProbeIds: z.array(z.string().min(1)),
  missingRequiredProbeIds: z.array(z.string().min(1)),
  dependencyRequiredProbeIds: z.array(z.string().min(1)),
  verifiedDependencyRequiredProbeIds: z.array(z.string().min(1)),
  missingDependencyRequiredProbeIds: z.array(z.string().min(1)),
  runtimeVerified: z.boolean(),
  observedCompleteSupported: z.boolean(),
  legacyBacked: z.boolean()
});

export const GenerationTargetProfileRuntimeSupportReportSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_TARGET_PROFILE_RUNTIME_SUPPORT_REPORT_KIND),
  schemaVersion: z.literal(GENERATION_TARGET_PROFILE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  profileId: z.literal(DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_ID),
  profileVersion: z.literal(DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_VERSION),
  staticSupportHash: z.string().min(1),
  capabilityQaReportHash: z.string().min(1).optional(),
  requiredCapabilityCount: z.number().int().nonnegative(),
  staticCompleteSupportedCount: z.number().int().nonnegative(),
  observedCompleteSupportedCount: z.number().int().nonnegative(),
  targetProfileCompleteSupported: z.boolean(),
  status: z.enum(['blocked_incomplete_target_profile', 'observed_target_profile_complete']),
  observedCapabilityIds: z.array(z.string().min(1)),
  blockers: z.array(z.string().min(1)),
  capabilities: z.array(GenerationTargetProfileRuntimeSupportCapabilitySchema),
  reportHash: z.string().min(1)
});

export type GenerationTargetProfileRuntimeSupportCapability = z.infer<typeof GenerationTargetProfileRuntimeSupportCapabilitySchema>;
export type GenerationTargetProfileRuntimeSupportReport = z.infer<typeof GenerationTargetProfileRuntimeSupportReportSchema>;

type RuntimeSupportQaContext = {
  passedRequiredProbeIds: ReadonlySet<string>;
  requiredProbeIdsByCapabilityId: ReadonlyMap<string, readonly string[]>;
  dependencyCapabilityIdsByCapabilityId: ReadonlyMap<string, readonly string[]>;
};

/**
 * Builds a same-run runtime-observed overlay for the frozen DeepSeek target profile.
 * This report never mutates the static registry support evidence; it only records
 * which static QA blockers are cleared by the supplied package-owned QA report.
 */
export function buildGenerationTargetProfileRuntimeSupportReport(input: {
  projectId: string;
  runId: string;
  capabilityQaReport?: CapabilityQaReport;
  registry?: GameplayCapabilityRegistry;
  supportSummary?: DeepSeekRunAndGunProfileSupportSummary;
}): GenerationTargetProfileRuntimeSupportReport {
  const registry = input.registry ?? DEFAULT_GAMEPLAY_CAPABILITY_REGISTRY;
  const supportSummary = input.supportSummary ?? buildDeepSeekRunAndGunValidationProfileSupportSummary(registry);
  const qaContext = buildRuntimeSupportQaContext(input.capabilityQaReport);
  const capabilities = supportSummary.capabilities
    .map((support) => buildRuntimeSupportCapability(support, registry, qaContext))
    .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
  const requiredCapabilityCount = supportSummary.summary.requiredCapabilityCount;
  const observedCompleteSupportedCount = capabilities.filter((capability) => capability.observedCompleteSupported).length;
  const targetProfileCompleteSupported = requiredCapabilityCount > 0 && observedCompleteSupportedCount === requiredCapabilityCount;
  const payload: Omit<GenerationTargetProfileRuntimeSupportReport, 'reportHash'> = {
    artifactKind: GENERATION_TARGET_PROFILE_RUNTIME_SUPPORT_REPORT_KIND,
    schemaVersion: GENERATION_TARGET_PROFILE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    profileId: supportSummary.profileId,
    profileVersion: supportSummary.profileVersion,
    staticSupportHash: hashStableJson(supportSummary),
    ...(input.capabilityQaReport === undefined ? {} : { capabilityQaReportHash: input.capabilityQaReport.reportHash }),
    requiredCapabilityCount,
    staticCompleteSupportedCount: supportSummary.summary.completeSupportedCount,
    observedCompleteSupportedCount,
    targetProfileCompleteSupported,
    status: targetProfileCompleteSupported ? 'observed_target_profile_complete' : 'blocked_incomplete_target_profile',
    observedCapabilityIds: capabilities.filter((capability) => capability.runtimeVerified).map((capability) => capability.capabilityId),
    blockers: buildRuntimeSupportBlockers(input.capabilityQaReport, requiredCapabilityCount, observedCompleteSupportedCount),
    capabilities
  };

  return GenerationTargetProfileRuntimeSupportReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) });
}

function buildRuntimeSupportCapability(
  support: DeepSeekRunAndGunProfileCapabilitySupport,
  registry: GameplayCapabilityRegistry,
  qaContext: RuntimeSupportQaContext
): GenerationTargetProfileRuntimeSupportCapability {
  const descriptor = findGameplayCapability(support.capabilityId, registry);
  const requiredProbeIds = [...(descriptor?.qa.requiredProbeIds ?? [])].sort();
  const verifiedRequiredProbeIds = requiredProbeIds.filter((probeId) => qaContext.passedRequiredProbeIds.has(probeId));
  const missingRequiredProbeIds = requiredProbeIds.filter((probeId) => !qaContext.passedRequiredProbeIds.has(probeId));
  const dependencyRequiredProbeIds = collectDependencyRequiredProbeIds(support.capabilityId, qaContext);
  const verifiedDependencyRequiredProbeIds = dependencyRequiredProbeIds.filter((probeId) => qaContext.passedRequiredProbeIds.has(probeId));
  const missingDependencyRequiredProbeIds = dependencyRequiredProbeIds.filter((probeId) => !qaContext.passedRequiredProbeIds.has(probeId));
  const runtimeVerified =
    requiredProbeIds.length > 0 && missingRequiredProbeIds.length === 0 && missingDependencyRequiredProbeIds.length === 0;
  const observedEvidenceDimensions: GameplayCapabilitySupportEvidenceDimensions = {
    ...support.evidenceDimensions,
    qa_observed: support.evidenceDimensions.qa_observed || runtimeVerified
  };

  return {
    capabilityId: support.capabilityId,
    registered: support.registered,
    classification: support.classification,
    staticEvidenceDimensions: support.evidenceDimensions,
    observedEvidenceDimensions,
    missingStaticEvidenceDimensions: support.missingEvidenceDimensions,
    missingSupportEvidencePrerequisites: support.missingSupportEvidencePrerequisites,
    staticCompleteSupported: support.completeSupported,
    requiredProbeIds,
    verifiedRequiredProbeIds,
    missingRequiredProbeIds,
    dependencyRequiredProbeIds,
    verifiedDependencyRequiredProbeIds,
    missingDependencyRequiredProbeIds,
    runtimeVerified,
    observedCompleteSupported: isCompleteSupportedEvidenceDimensions(observedEvidenceDimensions),
    legacyBacked: support.legacyBacked
  };
}

function buildRuntimeSupportQaContext(report: CapabilityQaReport | undefined): RuntimeSupportQaContext {
  return {
    passedRequiredProbeIds: buildPassedRequiredProbeIds(report),
    requiredProbeIdsByCapabilityId: buildRequiredProbeIdsByCapabilityId(report),
    dependencyCapabilityIdsByCapabilityId: buildDependencyCapabilityIdsByCapabilityId(report)
  };
}

function buildPassedRequiredProbeIds(report: CapabilityQaReport | undefined): ReadonlySet<string> {
  if (report === undefined || report.planStatus !== 'ready') {
    return new Set();
  }

  const missingRequiredProbeIds = new Set(report.missingRequiredProbeIds);
  return new Set(
    report.requiredResults
      .filter((result) => !missingRequiredProbeIds.has(result.probeId) && requiredProbeResultPassed(result))
      .map((result) => result.probeId)
  );
}

function buildRequiredProbeIdsByCapabilityId(report: CapabilityQaReport | undefined): ReadonlyMap<string, readonly string[]> {
  const byCapability = new Map<string, string[]>();
  for (const result of report?.requiredResults ?? []) {
    if (result.capabilityId === undefined) {
      continue;
    }
    byCapability.set(result.capabilityId, [...(byCapability.get(result.capabilityId) ?? []), result.probeId]);
  }
  return new Map([...byCapability.entries()].map(([capabilityId, probeIds]) => [capabilityId, uniqueSorted(probeIds)]));
}

function buildDependencyCapabilityIdsByCapabilityId(report: CapabilityQaReport | undefined): ReadonlyMap<string, readonly string[]> {
  return new Map(
    (report?.capabilityDependencies ?? []).map((entry) => [entry.capabilityId, uniqueSorted(entry.dependencyCapabilityIds)])
  );
}

function collectDependencyRequiredProbeIds(capabilityId: string, context: RuntimeSupportQaContext): string[] {
  const collected: string[] = [];
  const visited = new Set<string>();

  function visit(currentCapabilityId: string): void {
    for (const dependencyCapabilityId of context.dependencyCapabilityIdsByCapabilityId.get(currentCapabilityId) ?? []) {
      if (visited.has(dependencyCapabilityId)) {
        continue;
      }
      visited.add(dependencyCapabilityId);
      collected.push(...(context.requiredProbeIdsByCapabilityId.get(dependencyCapabilityId) ?? []));
      visit(dependencyCapabilityId);
    }
  }

  visit(capabilityId);
  return uniqueSorted(collected);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function requiredProbeResultPassed(result: CapabilityQaProbeResult): boolean {
  return (
    result.status === 'passed' &&
    result.assertionResults !== undefined &&
    result.assertionResults.length > 0 &&
    result.assertionResults.every((assertion) => assertion.status === 'passed')
  );
}

function buildRuntimeSupportBlockers(
  report: CapabilityQaReport | undefined,
  requiredCapabilityCount: number,
  observedCompleteSupportedCount: number
): string[] {
  const blockers = [
    ...(report === undefined ? ['capability_qa_report_missing'] : []),
    ...(report !== undefined && report.planStatus !== 'ready' ? [`capability_qa_plan_not_ready:${report.planStatus}`] : []),
    ...(report !== undefined && report.status === 'failed' && report.missingRequiredProbeIds.length === 0 ? ['capability_qa_report_failed'] : []),
    ...(report?.missingRequiredProbeIds.map((probeId) => `capability_qa_report_missing_required_probe:${probeId}`) ?? []),
    ...(observedCompleteSupportedCount === requiredCapabilityCount
      ? []
      : [`target_profile_runtime_support_incomplete:${observedCompleteSupportedCount}/${requiredCapabilityCount}`])
  ];
  return [...new Set(blockers)].sort();
}
