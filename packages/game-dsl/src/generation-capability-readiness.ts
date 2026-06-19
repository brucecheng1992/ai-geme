import { z } from 'zod';

import {
  buildGameplayCapabilityRegistrySnapshot,
  listGameplayProfileRuntimeStatuses,
  type GameplayCapabilityRegistry,
  type GameplayCapabilityRegistrySnapshot
} from './gameplay-capabilities/registry.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';

export const GENERATION_CAPABILITY_READINESS_REPORT_KIND = 'generation_capability_readiness_report';
export const GENERATION_CAPABILITY_READINESS_REPORT_SCHEMA_VERSION = 'generation_capability_readiness_report.v0.1';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);

export const GenerationCapabilityReadinessReportSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_CAPABILITY_READINESS_REPORT_KIND),
  schemaVersion: z.literal(GENERATION_CAPABILITY_READINESS_REPORT_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  normalizedGenre: z.string().min(1),
  registrySnapshotHash: z.string().min(1),
  profileResolution: z.strictObject({
    status: z.enum(['resolved', 'unresolved']),
    profileId: z.string().min(1).optional(),
    runtimeGenre: z.string().min(1).optional(),
    runtimeSupportStatus: z.string().min(1),
    runtimeExecutable: z.boolean(),
    runtimeTemplateId: z.string().min(1).optional(),
    qaProfile: z.string().min(1).optional(),
    profileSupportStatus: z.enum(['capability_complete_supported', 'legacy_runtime_supported', 'unsupported']).optional()
  }),
  capabilityRequirements: z.strictObject({
    requiredCapabilityIds: z.array(z.string().min(1)),
    completeSupportedCapabilityIds: z.array(z.string().min(1)),
    incompleteCapabilityIds: z.array(z.string().min(1)),
    missingRegistryCapabilityAliases: z.array(z.string().min(1))
  }),
  targetDefaultPath: z.literal('capability_composed_v1'),
  selectedDefaultPath: z.enum(['legacy_template_v1', 'fail_closed_unsupported_intent']),
  capabilityPathReadiness: z.enum(['ready_for_resolver', 'blocked']),
  exactLockStatus: z.enum(['not_attempted_until_resolver_phase', 'not_attempted_requirements_incomplete', 'not_applicable_unsupported_intent']),
  blockers: z.array(z.string().min(1)),
  reportHash: z.string().min(1)
});

export type GenerationCapabilityReadinessReport = z.infer<typeof GenerationCapabilityReadinessReportSchema>;

export type GenerationCapabilityPreflightArtifacts = {
  registrySnapshot: GameplayCapabilityRegistrySnapshot;
  readinessReport: GenerationCapabilityReadinessReport;
};

export function buildGenerationCapabilityPreflight(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  registry?: GameplayCapabilityRegistry;
}): GenerationCapabilityPreflightArtifacts {
  const registrySnapshot = buildGameplayCapabilityRegistrySnapshot(input.registry);
  const profileStatus = listGameplayProfileRuntimeStatuses({ registry: input.registry }).find(
    (status) => status.runtimeGenre === input.normalizedGenre
  );
  const readiness = profileStatus?.profileSupportStatus === 'capability_complete_supported' ? 'ready_for_resolver' : 'blocked';
  const selectedDefaultPath = profileStatus?.runtimeExecutable === true ? 'legacy_template_v1' : 'fail_closed_unsupported_intent';
  const exactLockStatus =
    readiness === 'ready_for_resolver'
      ? 'not_attempted_until_resolver_phase'
      : profileStatus === undefined || !profileStatus.runtimeExecutable
        ? 'not_applicable_unsupported_intent'
        : 'not_attempted_requirements_incomplete';
  const blockers = buildReadinessBlockers(profileStatus);
  const payload: Omit<GenerationCapabilityReadinessReport, 'reportHash'> = {
    artifactKind: GENERATION_CAPABILITY_READINESS_REPORT_KIND,
    schemaVersion: GENERATION_CAPABILITY_READINESS_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    registrySnapshotHash: registrySnapshot.snapshotHash,
    profileResolution:
      profileStatus === undefined
        ? {
            status: 'unresolved',
            runtimeSupportStatus: 'unsupported',
            runtimeExecutable: false
          }
        : {
            status: 'resolved',
            profileId: profileStatus.profileId,
            runtimeGenre: profileStatus.runtimeGenre,
            runtimeSupportStatus: profileStatus.runtimeSupportStatus,
            runtimeExecutable: profileStatus.runtimeExecutable,
            ...(profileStatus.runtimeTemplateId === undefined ? {} : { runtimeTemplateId: profileStatus.runtimeTemplateId }),
            ...(profileStatus.qaProfile === undefined ? {} : { qaProfile: profileStatus.qaProfile }),
            profileSupportStatus: profileStatus.profileSupportStatus
          },
    capabilityRequirements: {
      requiredCapabilityIds: [...(profileStatus?.gameplayCapabilityIds ?? [])].sort(),
      completeSupportedCapabilityIds: [...(profileStatus?.completeSupportedCapabilityIds ?? [])].sort(),
      incompleteCapabilityIds: [...(profileStatus?.incompleteCapabilityIds ?? [])].sort(),
      missingRegistryCapabilityAliases: [...(profileStatus?.missingRegistryCapabilityAliases ?? [])].sort()
    },
    targetDefaultPath: 'capability_composed_v1',
    selectedDefaultPath,
    capabilityPathReadiness: readiness,
    exactLockStatus,
    blockers
  };

  return {
    registrySnapshot,
    readinessReport: GenerationCapabilityReadinessReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) })
  };
}

function buildReadinessBlockers(profileStatus: ReturnType<typeof listGameplayProfileRuntimeStatuses>[number] | undefined): string[] {
  if (profileStatus === undefined) {
    return ['runtime_profile_not_resolved'];
  }

  const blockers = [
    ...(profileStatus.runtimeExecutable ? [] : ['runtime_profile_not_executable']),
    ...profileStatus.missingRegistryCapabilityAliases.map((alias) => `missing_registry_alias:${alias}`),
    ...profileStatus.incompleteCapabilityIds.map((capabilityId) => `incomplete_capability:${capabilityId}`)
  ];

  return [...new Set(blockers)].sort();
}
