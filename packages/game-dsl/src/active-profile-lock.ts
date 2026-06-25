import { z } from 'zod';

import {
  CANONICAL_GAME_BRIEF_ARTIFACT_KIND,
  CANONICAL_GAME_BRIEF_PATH,
  type CanonicalGameBriefArtifact
} from './canonical-game-brief-artifact.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  GENERATION_CAPABILITY_READINESS_REPORT_KIND,
  GenerationCapabilityReadinessReportSchema,
  type GenerationCapabilityReadinessReport
} from './generation-capability-readiness.js';
import { GenerationScopePlanSchema, type GenerationScopePlan } from './generation-scope-plan.js';

export const ACTIVE_PROFILE_LOCK_ARTIFACT_KIND = 'active_profile_lock';
export const ACTIVE_PROFILE_LOCK_SCHEMA_VERSION = 'step37.active-profile-lock.v1';
export const ACTIVE_PROFILE_LOCK_PATH = 'active_profile_lock.json';
export const GENERATION_SCOPE_PLAN_ARTIFACT_KIND = 'generation_scope_plan';
export const GENERATION_SCOPE_PLAN_PATH = 'generation_scope_plan.json';
export const GENERATION_CAPABILITY_READINESS_REPORT_PATH = 'generation_capability_readiness_report.json';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);

export const ActiveProfileLockSchema = z.strictObject({
  artifactKind: z.literal(ACTIVE_PROFILE_LOCK_ARTIFACT_KIND),
  schemaVersion: z.literal(ACTIVE_PROFILE_LOCK_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  profileId: z.string().min(1),
  runtimeGenre: z.string().min(1),
  runtimeTemplateId: z.string().min(1),
  runtimeTemplateManifestId: z.string().min(1),
  qaProfile: z.string().min(1),
  profileSupportStatus: z.enum(['capability_complete_supported', 'active_profile_supported', 'legacy_runtime_supported']),
  selectedPath: z.literal('capability_composed_v1'),
  legacyAdapterPolicy: z.literal('legacy_forbidden'),
  profileRequirements: z.strictObject({
    source: z.literal('active_runtime_profile_requirements'),
    requiredCapabilityIds: z.array(z.string().min(1)),
    completeSupportedCapabilityIds: z.array(z.string().min(1)),
    incompleteCapabilityIds: z.array(z.string().min(1)),
    missingRegistryCapabilityAliases: z.array(z.string().min(1)),
    declaredProfileCapabilityIds: z.array(z.string().min(1)),
    requirementsHash: z.string().min(1)
  }),
  canonicalBriefRef: z.strictObject({
    artifactKind: z.literal(CANONICAL_GAME_BRIEF_ARTIFACT_KIND),
    path: z.literal(CANONICAL_GAME_BRIEF_PATH),
    contentHash: z.string().min(1)
  }),
  generationScopePlanRef: z.strictObject({
    artifactKind: z.literal(GENERATION_SCOPE_PLAN_ARTIFACT_KIND),
    path: z.literal(GENERATION_SCOPE_PLAN_PATH),
    contentHash: z.string().min(1)
  }),
  readinessReportRef: z.strictObject({
    artifactKind: z.literal(GENERATION_CAPABILITY_READINESS_REPORT_KIND),
    path: z.literal(GENERATION_CAPABILITY_READINESS_REPORT_PATH),
    reportHash: z.string().min(1)
  }),
  lockHash: z.string().min(1)
});

export type ActiveProfileLock = z.infer<typeof ActiveProfileLockSchema>;

export type BuildActiveProfileLockResult =
  | { ok: true; value: ActiveProfileLock }
  | { ok: false; issues: string[] };

export function buildActiveProfileLock(input: {
  projectId: string;
  runId: string;
  canonicalBrief: CanonicalGameBriefArtifact;
  generationScopePlan: GenerationScopePlan;
  readinessReport: GenerationCapabilityReadinessReport;
}): BuildActiveProfileLockResult {
  const generationScopePlan = GenerationScopePlanSchema.parse(input.generationScopePlan);
  const readinessReport = GenerationCapabilityReadinessReportSchema.parse(input.readinessReport);
  const profile = readinessReport.profileResolution;
  const issues = [
    ...(profile.status === 'resolved' ? [] : ['profileResolution.status: unresolved']),
    ...(profile.runtimeExecutable ? [] : ['profileResolution.runtimeExecutable: false']),
    ...(profile.profileId === undefined ? ['profileResolution.profileId: required'] : []),
    ...(profile.runtimeGenre === undefined ? ['profileResolution.runtimeGenre: required'] : []),
    ...(profile.runtimeTemplateId === undefined ? ['profileResolution.runtimeTemplateId: required'] : []),
    ...(profile.runtimeTemplateManifestId === undefined ? ['profileResolution.runtimeTemplateManifestId: required'] : []),
    ...(profile.qaProfile === undefined ? ['profileResolution.qaProfile: required'] : []),
    ...(profile.profileSupportStatus === undefined ||
    profile.profileSupportStatus === 'unsupported' ||
    profile.profileSupportStatus === 'legacy_runtime_supported'
      ? ['profileResolution.profileSupportStatus: active or complete profile support required']
      : []),
    ...(readinessReport.capabilityRequirements.requiredCapabilityIds.length > 0
      ? []
      : ['capabilityRequirements.requiredCapabilityIds: at least one active profile requirement is required']),
    ...(readinessReport.capabilityRequirements.missingRegistryCapabilityAliases.length === 0
      ? []
      : readinessReport.capabilityRequirements.missingRegistryCapabilityAliases.map((alias) => `capabilityRequirements.missingRegistryCapabilityAliases:${alias}`)),
    ...(readinessReport.capabilityRequirements.incompleteCapabilityIds.length === 0
      ? []
      : readinessReport.capabilityRequirements.incompleteCapabilityIds.map((capabilityId) => `capabilityRequirements.incompleteCapabilityIds:${capabilityId}`))
  ];

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  if (
    profile.profileId === undefined ||
    profile.runtimeGenre === undefined ||
    profile.runtimeTemplateId === undefined ||
    profile.runtimeTemplateManifestId === undefined ||
    profile.qaProfile === undefined ||
    profile.profileSupportStatus === undefined ||
    profile.profileSupportStatus === 'unsupported' ||
    profile.profileSupportStatus === 'legacy_runtime_supported'
  ) {
    return {
      ok: false,
      issues: ['profileResolution: supported executable profile fields are required for active profile lock']
    };
  }

  const profileRequirementsPayload = {
    source: 'active_runtime_profile_requirements' as const,
    requiredCapabilityIds: [...readinessReport.capabilityRequirements.requiredCapabilityIds].sort(),
    completeSupportedCapabilityIds: [...readinessReport.capabilityRequirements.completeSupportedCapabilityIds].sort(),
    incompleteCapabilityIds: [...readinessReport.capabilityRequirements.incompleteCapabilityIds].sort(),
    missingRegistryCapabilityAliases: [...readinessReport.capabilityRequirements.missingRegistryCapabilityAliases].sort(),
    declaredProfileCapabilityIds: [...readinessReport.capabilityRequirements.declaredProfileCapabilityIds].sort()
  };

  const payload: Omit<ActiveProfileLock, 'lockHash'> = {
    artifactKind: ACTIVE_PROFILE_LOCK_ARTIFACT_KIND,
    schemaVersion: ACTIVE_PROFILE_LOCK_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    profileId: profile.profileId,
    runtimeGenre: profile.runtimeGenre,
    runtimeTemplateId: profile.runtimeTemplateId,
    runtimeTemplateManifestId: profile.runtimeTemplateManifestId,
    qaProfile: profile.qaProfile,
    profileSupportStatus: profile.profileSupportStatus,
    selectedPath: 'capability_composed_v1',
    legacyAdapterPolicy: 'legacy_forbidden',
    profileRequirements: {
      ...profileRequirementsPayload,
      requirementsHash: hashStableJson(profileRequirementsPayload)
    },
    canonicalBriefRef: {
      artifactKind: CANONICAL_GAME_BRIEF_ARTIFACT_KIND,
      path: CANONICAL_GAME_BRIEF_PATH,
      contentHash: input.canonicalBrief.contentHash
    },
    generationScopePlanRef: {
      artifactKind: GENERATION_SCOPE_PLAN_ARTIFACT_KIND,
      path: GENERATION_SCOPE_PLAN_PATH,
      contentHash: hashStableJson(generationScopePlan)
    },
    readinessReportRef: {
      artifactKind: GENERATION_CAPABILITY_READINESS_REPORT_KIND,
      path: GENERATION_CAPABILITY_READINESS_REPORT_PATH,
      reportHash: readinessReport.reportHash
    }
  };

  return { ok: true, value: ActiveProfileLockSchema.parse({ ...payload, lockHash: hashStableJson(payload) }) };
}
