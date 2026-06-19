import { z } from 'zod';

import { type CapabilityDrivenGameIr } from './gameplay-capabilities/capability-ir.js';
import {
  buildCapabilityRuntimeQaPlan,
  evaluateCapabilityQaReport,
  type CapabilityQaProbeResult,
  type CapabilityQaReport,
  type CapabilityRuntimeQaPlan
} from './gameplay-capabilities/capability-qa-probes.js';
import { GameplayCapabilityLockSchema, type GameplayCapabilityLock } from './gameplay-capabilities/capability-lock.js';
import {
  buildPhaserRuntimeSystemLoaderPlan,
  PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
  PhaserRuntimeSystemManifestSchema,
  type PhaserRuntimeLoaderReport,
  type PhaserRuntimeSystemManifest
} from './gameplay-capabilities/phaser-runtime-loader.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  GenerationCapabilityResolutionReportSchema,
  SHADOW_GAMEPLAY_CAPABILITY_LOCK_PATH,
  type GenerationCapabilityResolutionReport
} from './generation-capability-resolution.js';

export const GENERATION_CAPABILITY_RUNTIME_REPORT_KIND = 'generation_capability_runtime_report';
export const GENERATION_CAPABILITY_RUNTIME_REPORT_SCHEMA_VERSION = 'generation_capability_runtime_report.v0.1';
export const SHADOW_PHASER_RUNTIME_SYSTEM_MANIFEST_PATH = 'shadow_phaser_runtime_system_manifest.json';
export const SHADOW_PHASER_RUNTIME_LOADER_REPORT_PATH = 'shadow_phaser_runtime_loader_report.json';
export const SHADOW_CAPABILITY_QA_PLAN_PATH = 'shadow_capability_qa_plan.json';
export const SHADOW_CAPABILITY_QA_REPORT_PATH = 'shadow_capability_qa_report.json';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);

export const GenerationCapabilityRuntimeReportSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_CAPABILITY_RUNTIME_REPORT_KIND),
  schemaVersion: z.literal(GENERATION_CAPABILITY_RUNTIME_REPORT_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  normalizedGenre: z.string().min(1),
  resolutionReportHash: z.string().min(1),
  profileId: z.string().min(1).optional(),
  selectedPath: z.enum(['legacy_template_v1', 'fail_closed_unsupported_intent']),
  targetPath: z.literal('capability_composed_v1'),
  shadowMode: z.literal(true),
  activeRuntimeManifestWritten: z.literal(false),
  activeCapabilityQaWritten: z.literal(false),
  exactLockHash: z.string().min(1).optional(),
  lockCapabilityIds: z.array(z.string().min(1)),
  runtimeManifestStatus: z.enum(['not_attempted_no_shadow_lock', 'missing', 'exact_lock_match', 'lock_mismatch']),
  runtimeLoaderStatus: z.enum(['not_attempted', 'ready', 'invalid']),
  capabilityQaPlanStatus: z.enum(['not_attempted', 'ready', 'blocked']),
  capabilityQaReportStatus: z.enum(['not_attempted', 'passed', 'failed', 'passed_with_optional_failures']),
  runtimeEvidenceStatus: z.enum(['not_attempted', 'observed', 'missing_required_probe_results', 'blocked']),
  runtimeSystemCapabilityIds: z.array(z.string().min(1)),
  runtimeLoaderPlanHash: z.string().min(1).optional(),
  runtimeBindingReportHash: z.string().min(1).optional(),
  capabilityQaPlanHash: z.string().min(1).optional(),
  capabilityQaReportHash: z.string().min(1).optional(),
  shadowRuntimeSystemManifestRef: z.literal(SHADOW_PHASER_RUNTIME_SYSTEM_MANIFEST_PATH).optional(),
  shadowRuntimeLoaderReportRef: z.literal(SHADOW_PHASER_RUNTIME_LOADER_REPORT_PATH).optional(),
  shadowCapabilityQaPlanRef: z.literal(SHADOW_CAPABILITY_QA_PLAN_PATH).optional(),
  shadowCapabilityQaReportRef: z.literal(SHADOW_CAPABILITY_QA_REPORT_PATH).optional(),
  blockers: z.array(z.string().min(1)),
  reportHash: z.string().min(1)
});

export type GenerationCapabilityRuntimeReport = z.infer<typeof GenerationCapabilityRuntimeReportSchema>;

export type GenerationCapabilityRuntimeShadowArtifacts = {
  runtimeReport: GenerationCapabilityRuntimeReport;
  shadowRuntimeSystemManifest?: PhaserRuntimeSystemManifest;
  shadowRuntimeLoaderReport?: PhaserRuntimeLoaderReport;
  shadowCapabilityQaPlan?: CapabilityRuntimeQaPlan;
  shadowCapabilityQaReport?: CapabilityQaReport;
};

export function buildGenerationCapabilityRuntimeShadow(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  resolutionReport: GenerationCapabilityResolutionReport;
  runtimeSystemManifest?: unknown;
  approvedInstalledPackages?: readonly unknown[];
  capabilityQaProbeResults?: readonly CapabilityQaProbeResult[];
}): GenerationCapabilityRuntimeShadowArtifacts {
  const resolutionReport = GenerationCapabilityResolutionReportSchema.parse(input.resolutionReport);
  const base = {
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    resolutionReportHash: resolutionReport.reportHash,
    ...(resolutionReport.profileId === undefined ? {} : { profileId: resolutionReport.profileId }),
    selectedPath: resolutionReport.selectedPath,
    targetPath: resolutionReport.targetPath,
    shadowMode: true as const,
    activeRuntimeManifestWritten: false as const,
    activeCapabilityQaWritten: false as const
  };

  if (resolutionReport.shadowLock === undefined) {
    return buildRuntimeReport({
      ...base,
      lockCapabilityIds: [],
      runtimeManifestStatus: 'not_attempted_no_shadow_lock',
      runtimeLoaderStatus: 'not_attempted',
      capabilityQaPlanStatus: 'not_attempted',
      capabilityQaReportStatus: 'not_attempted',
      runtimeEvidenceStatus: 'not_attempted',
      runtimeSystemCapabilityIds: [],
      blockers: resolutionReport.blockers.length === 0 ? ['shadow_lock_not_resolved'] : resolutionReport.blockers
    });
  }

  const lock = GameplayCapabilityLockSchema.parse(resolutionReport.shadowLock);
  const manifest = PhaserRuntimeSystemManifestSchema.safeParse(input.runtimeSystemManifest);
  if (!manifest.success) {
    return buildRuntimeReport({
      ...base,
      exactLockHash: lock.lockHash,
      lockCapabilityIds: lock.capabilityIds,
      runtimeManifestStatus: 'missing',
      runtimeLoaderStatus: 'not_attempted',
      capabilityQaPlanStatus: 'not_attempted',
      capabilityQaReportStatus: 'not_attempted',
      runtimeEvidenceStatus: 'not_attempted',
      runtimeSystemCapabilityIds: [],
      blockers: ['runtime_manifest_missing_or_invalid']
    });
  }

  const runtimeSystemCapabilityIds = uniqueSortedStrings(manifest.data.systems.map((system) => system.capabilityId));
  const manifestLockBlockers = compareManifestCapabilityOwners(lock, runtimeSystemCapabilityIds);
  const gameIr = buildRuntimeSliceFromManifest({
    profileId: lock.profileId,
    runtimeSystemManifest: manifest.data
  });
  const loaderReport = buildPhaserRuntimeSystemLoaderPlan({
    gameIr,
    manifest: manifest.data,
    capabilityLock: {
      ref: SHADOW_GAMEPLAY_CAPABILITY_LOCK_PATH,
      hash: lock.lockHash,
      capabilityIds: lock.capabilityIds
    }
  });
  const qaPlan = buildCapabilityRuntimeQaPlan({
    profileId: lock.profileId,
    capabilityLock: lock,
    packages: input.approvedInstalledPackages ?? []
  });
  const qaReport = evaluateCapabilityQaReport({
    plan: qaPlan,
    probeResults: input.capabilityQaProbeResults ?? []
  });
  const blockers = [
    ...manifestLockBlockers,
    ...(loaderReport.status === 'ready' ? [] : loaderReport.issues.map((issue) => `runtime_loader:${issue.code}:${issue.systemId ?? issue.path}`)),
    ...(qaPlan.status === 'ready' ? [] : qaPlan.diagnostics.map((diagnostic) => `capability_qa_plan:${diagnostic.code}:${diagnostic.capabilityId ?? diagnostic.probeId ?? '<profile>'}`)),
    ...(qaReport.status === 'failed' ? qaReport.missingRequiredProbeIds.map((probeId) => `capability_qa_report:missing_required_probe:${probeId}`) : [])
  ];
  const runtimeEvidenceStatus =
    blockers.length > 0 ? (qaReport.status === 'failed' ? 'missing_required_probe_results' : 'blocked') : 'observed';
  const runtimeReport = buildRuntimeReport({
    ...base,
    exactLockHash: lock.lockHash,
    lockCapabilityIds: lock.capabilityIds,
    runtimeManifestStatus: manifestLockBlockers.length === 0 ? 'exact_lock_match' : 'lock_mismatch',
    runtimeLoaderStatus: loaderReport.status,
    capabilityQaPlanStatus: qaPlan.status,
    capabilityQaReportStatus: qaReport.status,
    runtimeEvidenceStatus,
    runtimeSystemCapabilityIds,
    runtimeLoaderPlanHash: loaderReport.planHash,
    runtimeBindingReportHash: loaderReport.bindingReportHash,
    capabilityQaPlanHash: qaPlan.planHash,
    capabilityQaReportHash: qaReport.reportHash,
    shadowRuntimeSystemManifestRef: SHADOW_PHASER_RUNTIME_SYSTEM_MANIFEST_PATH,
    shadowRuntimeLoaderReportRef: SHADOW_PHASER_RUNTIME_LOADER_REPORT_PATH,
    shadowCapabilityQaPlanRef: SHADOW_CAPABILITY_QA_PLAN_PATH,
    shadowCapabilityQaReportRef: SHADOW_CAPABILITY_QA_REPORT_PATH,
    blockers
  }).runtimeReport;

  return {
    runtimeReport,
    shadowRuntimeSystemManifest: manifest.data,
    shadowRuntimeLoaderReport: loaderReport,
    shadowCapabilityQaPlan: qaPlan,
    shadowCapabilityQaReport: qaReport
  };
}

function buildRuntimeReport(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  resolutionReportHash: string;
  profileId?: string;
  selectedPath: GenerationCapabilityRuntimeReport['selectedPath'];
  targetPath: 'capability_composed_v1';
  shadowMode: true;
  activeRuntimeManifestWritten: false;
  activeCapabilityQaWritten: false;
  exactLockHash?: string;
  lockCapabilityIds: readonly string[];
  runtimeManifestStatus: GenerationCapabilityRuntimeReport['runtimeManifestStatus'];
  runtimeLoaderStatus: GenerationCapabilityRuntimeReport['runtimeLoaderStatus'];
  capabilityQaPlanStatus: GenerationCapabilityRuntimeReport['capabilityQaPlanStatus'];
  capabilityQaReportStatus: GenerationCapabilityRuntimeReport['capabilityQaReportStatus'];
  runtimeEvidenceStatus: GenerationCapabilityRuntimeReport['runtimeEvidenceStatus'];
  runtimeSystemCapabilityIds: readonly string[];
  runtimeLoaderPlanHash?: string;
  runtimeBindingReportHash?: string;
  capabilityQaPlanHash?: string;
  capabilityQaReportHash?: string;
  shadowRuntimeSystemManifestRef?: typeof SHADOW_PHASER_RUNTIME_SYSTEM_MANIFEST_PATH;
  shadowRuntimeLoaderReportRef?: typeof SHADOW_PHASER_RUNTIME_LOADER_REPORT_PATH;
  shadowCapabilityQaPlanRef?: typeof SHADOW_CAPABILITY_QA_PLAN_PATH;
  shadowCapabilityQaReportRef?: typeof SHADOW_CAPABILITY_QA_REPORT_PATH;
  blockers: readonly string[];
}): GenerationCapabilityRuntimeShadowArtifacts {
  const payload: Omit<GenerationCapabilityRuntimeReport, 'reportHash'> = {
    artifactKind: GENERATION_CAPABILITY_RUNTIME_REPORT_KIND,
    schemaVersion: GENERATION_CAPABILITY_RUNTIME_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    resolutionReportHash: input.resolutionReportHash,
    ...(input.profileId === undefined ? {} : { profileId: input.profileId }),
    selectedPath: input.selectedPath,
    targetPath: input.targetPath,
    shadowMode: input.shadowMode,
    activeRuntimeManifestWritten: input.activeRuntimeManifestWritten,
    activeCapabilityQaWritten: input.activeCapabilityQaWritten,
    ...(input.exactLockHash === undefined ? {} : { exactLockHash: input.exactLockHash }),
    lockCapabilityIds: [...input.lockCapabilityIds].sort(),
    runtimeManifestStatus: input.runtimeManifestStatus,
    runtimeLoaderStatus: input.runtimeLoaderStatus,
    capabilityQaPlanStatus: input.capabilityQaPlanStatus,
    capabilityQaReportStatus: input.capabilityQaReportStatus,
    runtimeEvidenceStatus: input.runtimeEvidenceStatus,
    runtimeSystemCapabilityIds: [...input.runtimeSystemCapabilityIds].sort(),
    ...(input.runtimeLoaderPlanHash === undefined ? {} : { runtimeLoaderPlanHash: input.runtimeLoaderPlanHash }),
    ...(input.runtimeBindingReportHash === undefined ? {} : { runtimeBindingReportHash: input.runtimeBindingReportHash }),
    ...(input.capabilityQaPlanHash === undefined ? {} : { capabilityQaPlanHash: input.capabilityQaPlanHash }),
    ...(input.capabilityQaReportHash === undefined ? {} : { capabilityQaReportHash: input.capabilityQaReportHash }),
    ...(input.shadowRuntimeSystemManifestRef === undefined ? {} : { shadowRuntimeSystemManifestRef: input.shadowRuntimeSystemManifestRef }),
    ...(input.shadowRuntimeLoaderReportRef === undefined ? {} : { shadowRuntimeLoaderReportRef: input.shadowRuntimeLoaderReportRef }),
    ...(input.shadowCapabilityQaPlanRef === undefined ? {} : { shadowCapabilityQaPlanRef: input.shadowCapabilityQaPlanRef }),
    ...(input.shadowCapabilityQaReportRef === undefined ? {} : { shadowCapabilityQaReportRef: input.shadowCapabilityQaReportRef }),
    blockers: [...new Set(input.blockers)].sort()
  };
  return {
    runtimeReport: GenerationCapabilityRuntimeReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) })
  };
}

function buildRuntimeSliceFromManifest(input: {
  profileId: string;
  runtimeSystemManifest: PhaserRuntimeSystemManifest;
}): CapabilityDrivenGameIr {
  return {
    contractVersion: 'capability-game-ir.v0.1',
    runtimeFamily: PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
    profileId: input.profileId,
    capabilityLockRef: SHADOW_GAMEPLAY_CAPABILITY_LOCK_PATH,
    runtimeSystemConfigs: input.runtimeSystemManifest.systems.map((system) => ({
      id: system.id,
      capabilityId: system.capabilityId,
      config: {}
    })),
    entityComponents: [],
    rules: [],
    goals: [],
    assetRequirements: [],
    telemetryRequirements: [],
    assetManifestRef: 'asset_manifest.json',
    telemetryPlanRef: 'telemetry_plan.json',
    qaPlanRef: SHADOW_CAPABILITY_QA_PLAN_PATH
  };
}

function compareManifestCapabilityOwners(lock: GameplayCapabilityLock, runtimeSystemCapabilityIds: readonly string[]): string[] {
  const locked = new Set(lock.capabilityIds);
  const runtime = new Set(runtimeSystemCapabilityIds);
  return [
    ...[...locked].filter((capabilityId) => !runtime.has(capabilityId)).map((capabilityId) => `runtime_manifest_missing_capability:${capabilityId}`),
    ...[...runtime].filter((capabilityId) => !locked.has(capabilityId)).map((capabilityId) => `runtime_manifest_extra_capability:${capabilityId}`)
  ].sort();
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
