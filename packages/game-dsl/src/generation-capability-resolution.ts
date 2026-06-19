import { z } from 'zod';

import { GameplayCapabilityLockSchema, type GameplayCapabilityLock } from './gameplay-capabilities/capability-lock.js';
import {
  resolveGameplayCapabilityGraph,
  type CapabilityResolutionDiagnostic,
  type GameplayCapabilityResolutionReport
} from './gameplay-capabilities/capability-resolver.js';
import {
  RuntimeFamilyIdSchema,
  type GameplayCapabilityRegistrySnapshot
} from './gameplay-capabilities/registry.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  GenerationCapabilityReadinessReportSchema,
  type GenerationCapabilityReadinessReport
} from './generation-capability-readiness.js';

export const GENERATION_CAPABILITY_RESOLUTION_REPORT_KIND = 'generation_capability_resolution_report';
export const GENERATION_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION = 'generation_capability_resolution_report.v0.1';
export const SHADOW_GAMEPLAY_CAPABILITY_LOCK_PATH = 'shadow_gameplay_capability_lock.json';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);

const CapabilityResolutionDiagnosticSchema: z.ZodType<CapabilityResolutionDiagnostic> = z.strictObject({
  code: z.enum([
    'MISSING_CAPABILITY',
    'VERSION_CONFLICT',
    'INCOMPATIBLE_CAPABILITIES',
    'DEPENDENCY_CYCLE',
    'RUNTIME_FAMILY_MISMATCH',
    'INCOMPLETE_PACKAGE'
  ]),
  requestedBy: z.array(z.string().min(1)),
  capabilityId: z.string().min(1),
  explanation: z.string().min(1),
  remediation: z.array(z.string().min(1))
});

export const GenerationCapabilityResolutionReportSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_CAPABILITY_RESOLUTION_REPORT_KIND),
  schemaVersion: z.literal(GENERATION_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  normalizedGenre: z.string().min(1),
  registrySnapshotHash: z.string().min(1),
  readinessReportHash: z.string().min(1),
  profileId: z.string().min(1).optional(),
  runtimeFamily: RuntimeFamilyIdSchema.optional(),
  requestedCapabilityIds: z.array(z.string().min(1)),
  targetPath: z.literal('capability_composed_v1'),
  selectedPath: z.enum(['legacy_template_v1', 'fail_closed_unsupported_intent']),
  shadowMode: z.literal(true),
  activeLockWritten: z.literal(false),
  candidatePackagePolicy: z.literal('approved_installed_packages_only'),
  approvedInstalledPackageCount: z.number().int().min(0),
  resolverAttempt: z.enum(['skipped_readiness_blocked', 'skipped_unsupported_intent', 'attempted']),
  resolutionStatus: z.enum(['resolved', 'blocked']),
  exactLockStatus: z.enum([
    'not_attempted_requirements_incomplete',
    'not_applicable_unsupported_intent',
    'blocked_runtime_family_ambiguous',
    'blocked_resolver_diagnostics',
    'shadow_lock_resolved'
  ]),
  selectedCapabilityIds: z.array(z.string().min(1)),
  deferredOptionalCapabilityIds: z.array(z.string().min(1)),
  resolverDiagnostics: z.array(CapabilityResolutionDiagnosticSchema),
  shadowLockRef: z.literal(SHADOW_GAMEPLAY_CAPABILITY_LOCK_PATH).optional(),
  shadowLock: GameplayCapabilityLockSchema.optional(),
  blockers: z.array(z.string().min(1)),
  reportHash: z.string().min(1)
});

export type GenerationCapabilityResolutionReport = z.infer<typeof GenerationCapabilityResolutionReportSchema>;

export type GenerationCapabilityResolutionShadowArtifacts = {
  resolutionReport: GenerationCapabilityResolutionReport;
  shadowGameplayCapabilityLock?: GameplayCapabilityLock;
};

export function buildGenerationCapabilityResolutionShadow(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  registrySnapshot: GameplayCapabilityRegistrySnapshot;
  readinessReport: GenerationCapabilityReadinessReport;
  approvedInstalledPackages?: readonly unknown[];
}): GenerationCapabilityResolutionShadowArtifacts {
  const readinessReport = GenerationCapabilityReadinessReportSchema.parse(input.readinessReport);
  const requestedCapabilityIds = [...readinessReport.capabilityRequirements.requiredCapabilityIds].sort();
  const base = {
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    registrySnapshotHash: input.registrySnapshot.snapshotHash,
    readinessReportHash: readinessReport.reportHash,
    ...(readinessReport.profileResolution.profileId === undefined ? {} : { profileId: readinessReport.profileResolution.profileId }),
    requestedCapabilityIds,
    targetPath: 'capability_composed_v1' as const,
    selectedPath: readinessReport.selectedDefaultPath,
    shadowMode: true as const,
    activeLockWritten: false as const,
    candidatePackagePolicy: 'approved_installed_packages_only' as const,
    approvedInstalledPackageCount: input.approvedInstalledPackages?.length ?? 0
  };

  if (readinessReport.profileResolution.status === 'unresolved' || readinessReport.selectedDefaultPath === 'fail_closed_unsupported_intent') {
    return buildBlockedReport({
      ...base,
      resolverAttempt: 'skipped_unsupported_intent',
      exactLockStatus: 'not_applicable_unsupported_intent',
      blockers: readinessReport.blockers.length === 0 ? ['runtime_profile_not_resolved'] : readinessReport.blockers
    });
  }

  if (readinessReport.capabilityPathReadiness !== 'ready_for_resolver') {
    return buildBlockedReport({
      ...base,
      resolverAttempt: 'skipped_readiness_blocked',
      exactLockStatus: 'not_attempted_requirements_incomplete',
      blockers: readinessReport.blockers.length === 0 ? ['capability_requirements_not_ready'] : readinessReport.blockers
    });
  }

  const runtimeFamily = deriveSingleRuntimeFamily(input.registrySnapshot, requestedCapabilityIds);
  if (runtimeFamily.ok === false) {
    return buildBlockedReport({
      ...base,
      resolverAttempt: 'attempted',
      exactLockStatus: 'blocked_runtime_family_ambiguous',
      blockers: runtimeFamily.blockers
    });
  }

  const resolverReport = resolveGameplayCapabilityGraph({
    requestedCapabilities: requestedCapabilityIds,
    packages: input.approvedInstalledPackages ?? [],
    runtimeFamily: runtimeFamily.runtimeFamily
  });

  if (resolverReport.status !== 'resolved' || resolverReport.lock === undefined) {
    return buildBlockedReport({
      ...base,
      runtimeFamily: runtimeFamily.runtimeFamily,
      resolverAttempt: 'attempted',
      exactLockStatus: 'blocked_resolver_diagnostics',
      selectedCapabilityIds: resolverReport.selectedCapabilityIds,
      deferredOptionalCapabilityIds: resolverReport.deferredOptionalCapabilityIds,
      resolverDiagnostics: resolverReport.diagnostics,
      blockers: resolverReport.diagnostics.map((diagnostic) => `resolver:${diagnostic.code}:${diagnostic.capabilityId}`)
    });
  }

  const shadowLock = bindShadowLockToProfile(resolverReport.lock, readinessReport.profileResolution.profileId);
  return buildResolvedReport({
    ...base,
    runtimeFamily: runtimeFamily.runtimeFamily,
    resolverReport,
    shadowLock
  });
}

function buildResolvedReport(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  registrySnapshotHash: string;
  readinessReportHash: string;
  profileId?: string;
  runtimeFamily: string;
  requestedCapabilityIds: string[];
  targetPath: 'capability_composed_v1';
  selectedPath: GenerationCapabilityResolutionReport['selectedPath'];
  shadowMode: true;
  activeLockWritten: false;
  candidatePackagePolicy: 'approved_installed_packages_only';
  approvedInstalledPackageCount: number;
  resolverReport: GameplayCapabilityResolutionReport;
  shadowLock: GameplayCapabilityLock;
}): GenerationCapabilityResolutionShadowArtifacts {
  const payload: Omit<GenerationCapabilityResolutionReport, 'reportHash'> = {
    artifactKind: GENERATION_CAPABILITY_RESOLUTION_REPORT_KIND,
    schemaVersion: GENERATION_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    registrySnapshotHash: input.registrySnapshotHash,
    readinessReportHash: input.readinessReportHash,
    ...(input.profileId === undefined ? {} : { profileId: input.profileId }),
    runtimeFamily: input.runtimeFamily,
    requestedCapabilityIds: input.requestedCapabilityIds,
    targetPath: input.targetPath,
    selectedPath: input.selectedPath,
    shadowMode: input.shadowMode,
    activeLockWritten: input.activeLockWritten,
    candidatePackagePolicy: input.candidatePackagePolicy,
    approvedInstalledPackageCount: input.approvedInstalledPackageCount,
    resolverAttempt: 'attempted',
    resolutionStatus: 'resolved',
    exactLockStatus: 'shadow_lock_resolved',
    selectedCapabilityIds: [...input.resolverReport.selectedCapabilityIds].sort(),
    deferredOptionalCapabilityIds: [...input.resolverReport.deferredOptionalCapabilityIds].sort(),
    resolverDiagnostics: [],
    shadowLockRef: SHADOW_GAMEPLAY_CAPABILITY_LOCK_PATH,
    shadowLock: input.shadowLock,
    blockers: []
  };
  return {
    resolutionReport: GenerationCapabilityResolutionReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) }),
    shadowGameplayCapabilityLock: input.shadowLock
  };
}

function buildBlockedReport(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  registrySnapshotHash: string;
  readinessReportHash: string;
  profileId?: string;
  runtimeFamily?: string;
  requestedCapabilityIds: string[];
  targetPath: 'capability_composed_v1';
  selectedPath: GenerationCapabilityResolutionReport['selectedPath'];
  shadowMode: true;
  activeLockWritten: false;
  candidatePackagePolicy: 'approved_installed_packages_only';
  approvedInstalledPackageCount: number;
  resolverAttempt: GenerationCapabilityResolutionReport['resolverAttempt'];
  exactLockStatus: Exclude<GenerationCapabilityResolutionReport['exactLockStatus'], 'shadow_lock_resolved'>;
  selectedCapabilityIds?: string[];
  deferredOptionalCapabilityIds?: string[];
  resolverDiagnostics?: CapabilityResolutionDiagnostic[];
  blockers: string[];
}): GenerationCapabilityResolutionShadowArtifacts {
  const payload: Omit<GenerationCapabilityResolutionReport, 'reportHash'> = {
    artifactKind: GENERATION_CAPABILITY_RESOLUTION_REPORT_KIND,
    schemaVersion: GENERATION_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    registrySnapshotHash: input.registrySnapshotHash,
    readinessReportHash: input.readinessReportHash,
    ...(input.profileId === undefined ? {} : { profileId: input.profileId }),
    ...(input.runtimeFamily === undefined ? {} : { runtimeFamily: input.runtimeFamily }),
    requestedCapabilityIds: input.requestedCapabilityIds,
    targetPath: input.targetPath,
    selectedPath: input.selectedPath,
    shadowMode: input.shadowMode,
    activeLockWritten: input.activeLockWritten,
    candidatePackagePolicy: input.candidatePackagePolicy,
    approvedInstalledPackageCount: input.approvedInstalledPackageCount,
    resolverAttempt: input.resolverAttempt,
    resolutionStatus: 'blocked',
    exactLockStatus: input.exactLockStatus,
    selectedCapabilityIds: [...(input.selectedCapabilityIds ?? [])].sort(),
    deferredOptionalCapabilityIds: [...(input.deferredOptionalCapabilityIds ?? [])].sort(),
    resolverDiagnostics: [...(input.resolverDiagnostics ?? [])],
    blockers: [...new Set(input.blockers)].sort()
  };
  return {
    resolutionReport: GenerationCapabilityResolutionReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) })
  };
}

function deriveSingleRuntimeFamily(
  registrySnapshot: GameplayCapabilityRegistrySnapshot,
  capabilityIds: readonly string[]
): { ok: true; runtimeFamily: string } | { ok: false; blockers: string[] } {
  const entries = new Map(registrySnapshot.entries.map((entry) => [entry.id, entry]));
  const runtimeFamiliesByCapability = capabilityIds.map((capabilityId) => ({
    capabilityId,
    runtimeFamilies: entries.get(capabilityId)?.runtimeFamilies ?? []
  }));
  const missingCapabilities = runtimeFamiliesByCapability.filter((entry) => entry.runtimeFamilies.length === 0).map((entry) => entry.capabilityId);
  if (missingCapabilities.length > 0) {
    return {
      ok: false,
      blockers: missingCapabilities.map((capabilityId) => `runtime_family_missing:${capabilityId}`).sort()
    };
  }

  const intersection = runtimeFamiliesByCapability.reduce<string[] | undefined>((current, entry) => {
    if (current === undefined) {
      return [...entry.runtimeFamilies].sort();
    }
    return current.filter((runtimeFamily) => entry.runtimeFamilies.includes(runtimeFamily)).sort();
  }, undefined);
  const runtimeFamilies = [...new Set(intersection ?? [])].filter((runtimeFamily) => RuntimeFamilyIdSchema.safeParse(runtimeFamily).success).sort();

  if (runtimeFamilies.length !== 1) {
    return {
      ok: false,
      blockers: [`runtime_family_${runtimeFamilies.length === 0 ? 'unresolved' : 'ambiguous'}:${runtimeFamilies.join(',') || '<none>'}`]
    };
  }

  return { ok: true, runtimeFamily: runtimeFamilies[0] };
}

function bindShadowLockToProfile(lock: GameplayCapabilityLock, profileId: string | undefined): GameplayCapabilityLock {
  const payload: Omit<GameplayCapabilityLock, 'lockHash'> = {
    artifactKind: lock.artifactKind,
    schemaVersion: lock.schemaVersion,
    profileId: profileId ?? lock.profileId,
    runtimeFamily: lock.runtimeFamily,
    capabilityIds: [...lock.capabilityIds].sort(),
    packages: [...lock.packages].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId))
  };
  return GameplayCapabilityLockSchema.parse({ ...payload, lockHash: hashStableJson(payload) });
}
