import { z } from 'zod';

import {
  LEGACY_VS_COMPOSED_PARITY_REPORT_KIND,
  RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND,
  type RunAndGunCapabilityMigrationReport
} from './gameplay-capabilities/run-and-gun-reference-composition.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  GenerationCapabilityGapReportSchema,
  type GenerationCapabilityGapReport
} from './generation-capability-gap.js';
import {
  GenerationCapabilityRuntimeReportSchema,
  type GenerationCapabilityRuntimeReport
} from './generation-capability-runtime.js';

export const GENERATION_CAPABILITY_CUTOVER_REPORT_KIND = 'generation_capability_cutover_report';
export const GENERATION_CAPABILITY_CUTOVER_REPORT_SCHEMA_VERSION = 'generation_capability_cutover_report.v0.1';
export const GENERATION_CAPABILITY_CUTOVER_REPORT_PATH = 'generation_capability_cutover_report.json';
export const LEGACY_EXECUTION_AUTHORIZATION_SCHEMA_VERSION = 'step37.legacy-authorization.v1';
export const GENERATION_CAPABILITY_ROLLBACK_DRILL_KIND = 'generation_capability_rollback_drill_report';
export const GENERATION_CAPABILITY_ROLLBACK_DRILL_SCHEMA_VERSION = 'generation_capability_rollback_drill_report.v0.1';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);
const IsoTimestampSchema = z.string().datetime({ offset: true });

export const LegacyExecutionAuthorizationSchema = z.strictObject({
  schemaVersion: z.literal(LEGACY_EXECUTION_AUTHORIZATION_SCHEMA_VERSION),
  sourceRunId: RunIdSchema.optional(),
  newRunId: RunIdSchema,
  projectId: ProjectIdSchema,
  actorId: z.string().min(1),
  reasonCode: z.enum(['incident_rollback', 'parity_investigation', 'data_migration', 'approved_compatibility_exception']),
  reasonText: z.string().min(1),
  expiresAt: IsoTimestampSchema,
  createdAt: IsoTimestampSchema
});

export const GenerationCapabilityRollbackDrillReportSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_CAPABILITY_ROLLBACK_DRILL_KIND),
  schemaVersion: z.literal(GENERATION_CAPABILITY_ROLLBACK_DRILL_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  sourceRunId: RunIdSchema,
  rollbackRunId: RunIdSchema,
  status: z.enum(['passed', 'failed']),
  authorization: LegacyExecutionAuthorizationSchema,
  historicalArtifactsPreserved: z.boolean(),
  legacyOutputClearlyLabeled: z.boolean(),
  registryMutation: z.literal(false),
  exactLockPreserved: z.boolean(),
  issues: z.array(z.string().min(1)),
  drillHash: z.string().min(1)
});

export const GenerationCapabilityCutoverReportSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_CAPABILITY_CUTOVER_REPORT_KIND),
  schemaVersion: z.literal(GENERATION_CAPABILITY_CUTOVER_REPORT_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  normalizedGenre: z.string().min(1),
  profileId: z.string().min(1).optional(),
  targetPath: z.literal('capability_composed_v1'),
  activeSelectedPath: z.enum(['capability_composed_v1', 'legacy_template_v1', 'fail_closed_unsupported_intent']),
  defaultCutoverAllowed: z.boolean(),
  activePathMutation: z.literal(false),
  shadowOutputMutation: z.literal(false),
  cutoverStage: z.enum([
    'blocked_by_evidence_identity',
    'blocked_by_gap',
    'blocked_by_runtime_evidence',
    'blocked_by_parity',
    'blocked_by_rollback',
    'active_profile_authoritative',
    'candidate_canary_ready'
  ]),
  candidateCanaryStatus: z.enum([
    'blocked_evidence_identity',
    'not_started_gap_blocked',
    'not_started_runtime_blocked',
    'blocked_parity',
    'blocked_rollback',
    'ready'
  ]),
  parityStatus: z.enum([
    'not_required_active_profile',
    'not_comparable_evidence_identity',
    'not_comparable_gap_blocked',
    'not_comparable_runtime_blocked',
    'passed',
    'failed',
    'missing'
  ]),
  unresolvedParityP0Count: z.number().int().min(0),
  unresolvedParityP1Count: z.number().int().min(0),
  rollbackDrillStatus: z.enum(['not_required_active_profile', 'not_started_gap_blocked', 'not_started_runtime_blocked', 'passed', 'failed', 'missing']),
  legacyAuthorizationRequiredForRollback: z.literal(true),
  legacyAuthorizationExpiresBeforeDefault: z.boolean().optional(),
  gapReportHash: z.string().min(1),
  runtimeReportHash: z.string().min(1),
  migrationReportHash: z.string().min(1).optional(),
  parityReportHash: z.string().min(1).optional(),
  rollbackDrillHash: z.string().min(1).optional(),
  capabilityPathComparable: z.boolean(),
  canaryProfileIds: z.array(z.string().min(1)),
  requiredEvidenceRefs: z.array(z.string().min(1)),
  blockers: z.array(z.string().min(1)),
  reportHash: z.string().min(1)
});

export type LegacyExecutionAuthorization = z.infer<typeof LegacyExecutionAuthorizationSchema>;
export type GenerationCapabilityRollbackDrillReport = z.infer<typeof GenerationCapabilityRollbackDrillReportSchema>;
export type GenerationCapabilityCutoverReport = z.infer<typeof GenerationCapabilityCutoverReportSchema>;

export function buildGenerationCapabilityRollbackDrillReport(input: {
  projectId: string;
  sourceRunId: string;
  rollbackRunId: string;
  authorization: LegacyExecutionAuthorization;
  historicalArtifactsPreserved: boolean;
  legacyOutputClearlyLabeled: boolean;
  registryMutation?: false;
  exactLockPreserved: boolean;
}): GenerationCapabilityRollbackDrillReport {
  const authorization = LegacyExecutionAuthorizationSchema.parse(input.authorization);
  const issues = [
    ...(authorization.projectId === input.projectId ? [] : ['authorization_project_mismatch']),
    ...(authorization.sourceRunId === undefined || authorization.sourceRunId === input.sourceRunId ? [] : ['authorization_source_run_mismatch']),
    ...(authorization.newRunId === input.rollbackRunId ? [] : ['authorization_new_run_mismatch']),
    ...(Date.parse(authorization.expiresAt) > Date.parse(authorization.createdAt) ? [] : ['legacy_authorization_invalid_time_window']),
    ...(input.sourceRunId !== input.rollbackRunId ? [] : ['rollback_run_must_be_new_run']),
    ...(input.historicalArtifactsPreserved ? [] : ['historical_artifacts_not_preserved']),
    ...(input.legacyOutputClearlyLabeled ? [] : ['legacy_output_not_labeled']),
    ...(input.exactLockPreserved ? [] : ['exact_lock_not_preserved'])
  ].sort();
  const payload: Omit<GenerationCapabilityRollbackDrillReport, 'drillHash'> = {
    artifactKind: GENERATION_CAPABILITY_ROLLBACK_DRILL_KIND,
    schemaVersion: GENERATION_CAPABILITY_ROLLBACK_DRILL_SCHEMA_VERSION,
    projectId: input.projectId,
    sourceRunId: input.sourceRunId,
    rollbackRunId: input.rollbackRunId,
    status: issues.length === 0 ? 'passed' : 'failed',
    authorization,
    historicalArtifactsPreserved: input.historicalArtifactsPreserved,
    legacyOutputClearlyLabeled: input.legacyOutputClearlyLabeled,
    registryMutation: false,
    exactLockPreserved: input.exactLockPreserved,
    issues
  };
  return GenerationCapabilityRollbackDrillReportSchema.parse({ ...payload, drillHash: hashStableJson(payload) });
}

export function buildGenerationCapabilityCutoverReport(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  gapReport: GenerationCapabilityGapReport;
  runtimeReport: GenerationCapabilityRuntimeReport;
  migrationReport?: RunAndGunCapabilityMigrationReport;
  rollbackDrillReport?: GenerationCapabilityRollbackDrillReport;
}): GenerationCapabilityCutoverReport {
  const gapReport = GenerationCapabilityGapReportSchema.parse(input.gapReport);
  const runtimeReport = GenerationCapabilityRuntimeReportSchema.parse(input.runtimeReport);
  const migration = input.migrationReport;
  const rollback = input.rollbackDrillReport === undefined ? undefined : GenerationCapabilityRollbackDrillReportSchema.parse(input.rollbackDrillReport);
  const evidenceIdentityBlockers = buildEvidenceIdentityBlockers({
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    gapReport,
    runtimeReport,
    migration,
    rollback
  });
  const evidenceIdentityBlocked = evidenceIdentityBlockers.length > 0;
  const gapBlocked = !evidenceIdentityBlocked && gapReport.gapStatus !== 'not_required';
  const runtimeBlocked = !evidenceIdentityBlocked && !gapBlocked && runtimeReport.runtimeEvidenceStatus !== 'observed';
  const activeProfileAuthoritative =
    !evidenceIdentityBlocked &&
    !gapBlocked &&
    !runtimeBlocked &&
    gapReport.selectedPath === 'capability_composed_v1' &&
    runtimeReport.selectedPath === 'capability_composed_v1';
  const parity = migration?.parityReport;
  const unresolvedParityP1Count =
    parity === undefined
      ? 0
      : parity.failedGateIds.length +
        parity.missingGateIds.length +
        parity.invalidGateIds.length +
        parity.failedAmendmentScenarioIds.length +
        parity.missingAmendmentScenarioIds.length +
        parity.invalidAmendmentScenarioIds.length;
  const migrationReady =
    migration !== undefined &&
    migration.artifactKind === RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND &&
    migration.status === 'ready' &&
    parity?.artifactKind === LEGACY_VS_COMPOSED_PARITY_REPORT_KIND &&
    parity.status === 'passed' &&
    unresolvedParityP1Count === 0;
  const rollbackPassed = rollback?.status === 'passed';
  const blockers = buildCutoverBlockers({
    activeProfileAuthoritative,
    gapBlocked,
    runtimeBlocked,
    evidenceIdentityBlockers,
    migration,
    migrationReady,
    unresolvedParityP1Count,
    rollback,
    rollbackPassed
  });
  const cutoverStage = deriveCutoverStage({ evidenceIdentityBlocked, gapBlocked, runtimeBlocked, activeProfileAuthoritative, migrationReady, rollbackPassed });
  const payload: Omit<GenerationCapabilityCutoverReport, 'reportHash'> = {
    artifactKind: GENERATION_CAPABILITY_CUTOVER_REPORT_KIND,
    schemaVersion: GENERATION_CAPABILITY_CUTOVER_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    normalizedGenre: input.normalizedGenre,
    ...(gapReport.profileId === undefined ? {} : { profileId: gapReport.profileId }),
    targetPath: 'capability_composed_v1',
    activeSelectedPath: gapReport.selectedPath,
    defaultCutoverAllowed: activeProfileAuthoritative,
    activePathMutation: false,
    shadowOutputMutation: false,
    cutoverStage,
    candidateCanaryStatus: deriveCanaryStatus(cutoverStage),
    parityStatus: deriveParityStatus({ evidenceIdentityBlocked, gapBlocked, runtimeBlocked, activeProfileAuthoritative, migration }),
    unresolvedParityP0Count: 0,
    unresolvedParityP1Count,
    rollbackDrillStatus: deriveRollbackStatus({ gapBlocked, runtimeBlocked, activeProfileAuthoritative, rollback }),
    legacyAuthorizationRequiredForRollback: true,
    ...(rollback === undefined ? {} : { legacyAuthorizationExpiresBeforeDefault: true }),
    gapReportHash: gapReport.reportHash,
    runtimeReportHash: runtimeReport.reportHash,
    ...(migration === undefined ? {} : { migrationReportHash: migration.reportHash }),
    ...(parity === undefined ? {} : { parityReportHash: parity.reportHash }),
    ...(rollback === undefined ? {} : { rollbackDrillHash: rollback.drillHash }),
    capabilityPathComparable: !evidenceIdentityBlocked && !gapBlocked && !runtimeBlocked && migrationReady,
    canaryProfileIds: !evidenceIdentityBlocked && migrationReady ? [migration.profileId] : [],
    requiredEvidenceRefs: buildRequiredEvidenceRefs({ migration, rollback }),
    blockers
  };

  return GenerationCapabilityCutoverReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) });
}

function buildCutoverBlockers(input: {
  activeProfileAuthoritative: boolean;
  gapBlocked: boolean;
  runtimeBlocked: boolean;
  evidenceIdentityBlockers: readonly string[];
  migration: RunAndGunCapabilityMigrationReport | undefined;
  migrationReady: boolean;
  unresolvedParityP1Count: number;
  rollback: GenerationCapabilityRollbackDrillReport | undefined;
  rollbackPassed: boolean;
}): string[] {
  if (input.evidenceIdentityBlockers.length > 0) {
    return [...input.evidenceIdentityBlockers].sort();
  }
  if (input.gapBlocked) {
    return ['capability_gap_not_resolved'];
  }
  if (input.runtimeBlocked) {
    return ['runtime_evidence_not_observed'];
  }
  if (input.activeProfileAuthoritative) {
    return [];
  }
  return [
    ...(input.migration === undefined ? ['run_and_gun_migration_report_missing'] : []),
    ...(input.migration !== undefined && !input.migrationReady ? ['run_and_gun_migration_not_ready'] : []),
    ...(input.unresolvedParityP1Count > 0 ? ['legacy_vs_composed_parity_unresolved_p1'] : []),
    ...(input.rollback === undefined ? ['rollback_drill_missing'] : []),
    ...(input.rollback !== undefined && !input.rollbackPassed ? ['rollback_drill_failed'] : [])
  ].sort();
}

function deriveCutoverStage(input: {
  evidenceIdentityBlocked: boolean;
  gapBlocked: boolean;
  runtimeBlocked: boolean;
  activeProfileAuthoritative: boolean;
  migrationReady: boolean;
  rollbackPassed: boolean;
}): GenerationCapabilityCutoverReport['cutoverStage'] {
  if (input.evidenceIdentityBlocked) {
    return 'blocked_by_evidence_identity';
  }
  if (input.gapBlocked) {
    return 'blocked_by_gap';
  }
  if (input.runtimeBlocked) {
    return 'blocked_by_runtime_evidence';
  }
  if (input.activeProfileAuthoritative) {
    return 'active_profile_authoritative';
  }
  if (!input.migrationReady) {
    return 'blocked_by_parity';
  }
  if (!input.rollbackPassed) {
    return 'blocked_by_rollback';
  }
  return 'candidate_canary_ready';
}

function deriveCanaryStatus(cutoverStage: GenerationCapabilityCutoverReport['cutoverStage']): GenerationCapabilityCutoverReport['candidateCanaryStatus'] {
  if (cutoverStage === 'blocked_by_evidence_identity') {
    return 'blocked_evidence_identity';
  }
  if (cutoverStage === 'blocked_by_gap') {
    return 'not_started_gap_blocked';
  }
  if (cutoverStage === 'blocked_by_runtime_evidence') {
    return 'not_started_runtime_blocked';
  }
  if (cutoverStage === 'blocked_by_parity') {
    return 'blocked_parity';
  }
  if (cutoverStage === 'blocked_by_rollback') {
    return 'blocked_rollback';
  }
  return 'ready';
}

function deriveParityStatus(input: {
  evidenceIdentityBlocked: boolean;
  gapBlocked: boolean;
  runtimeBlocked: boolean;
  activeProfileAuthoritative: boolean;
  migration: RunAndGunCapabilityMigrationReport | undefined;
}): GenerationCapabilityCutoverReport['parityStatus'] {
  if (input.activeProfileAuthoritative) {
    return 'not_required_active_profile';
  }
  if (input.evidenceIdentityBlocked) {
    return 'not_comparable_evidence_identity';
  }
  if (input.gapBlocked) {
    return 'not_comparable_gap_blocked';
  }
  if (input.runtimeBlocked) {
    return 'not_comparable_runtime_blocked';
  }
  if (input.migration === undefined) {
    return 'missing';
  }
  return input.migration.parityReport.status === 'passed' ? 'passed' : 'failed';
}

function deriveRollbackStatus(input: {
  gapBlocked: boolean;
  runtimeBlocked: boolean;
  activeProfileAuthoritative: boolean;
  rollback: GenerationCapabilityRollbackDrillReport | undefined;
}): GenerationCapabilityCutoverReport['rollbackDrillStatus'] {
  if (input.activeProfileAuthoritative) {
    return 'not_required_active_profile';
  }
  if (input.gapBlocked) {
    return 'not_started_gap_blocked';
  }
  if (input.runtimeBlocked) {
    return 'not_started_runtime_blocked';
  }
  if (input.rollback === undefined) {
    return 'missing';
  }
  return input.rollback.status;
}

function buildEvidenceIdentityBlockers(input: {
  projectId: string;
  runId: string;
  normalizedGenre: string;
  gapReport: GenerationCapabilityGapReport;
  runtimeReport: GenerationCapabilityRuntimeReport;
  migration: RunAndGunCapabilityMigrationReport | undefined;
  rollback: GenerationCapabilityRollbackDrillReport | undefined;
}): string[] {
  return [
    ...(input.gapReport.projectId === input.projectId ? [] : ['evidence_identity_mismatch:gap_project']),
    ...(input.gapReport.runId === input.runId ? [] : ['evidence_identity_mismatch:gap_run']),
    ...(input.gapReport.normalizedGenre === input.normalizedGenre ? [] : ['evidence_identity_mismatch:gap_genre']),
    ...(input.runtimeReport.projectId === input.projectId ? [] : ['evidence_identity_mismatch:runtime_project']),
    ...(input.runtimeReport.runId === input.runId ? [] : ['evidence_identity_mismatch:runtime_run']),
    ...(input.runtimeReport.normalizedGenre === input.normalizedGenre ? [] : ['evidence_identity_mismatch:runtime_genre']),
    ...(input.gapReport.runtimeReportHash === input.runtimeReport.reportHash ? [] : ['evidence_identity_mismatch:runtime_report_hash']),
    ...buildProfileIdentityBlockers(input.gapReport, input.runtimeReport, input.migration),
    ...buildRollbackIdentityBlockers(input)
  ].sort();
}

function buildProfileIdentityBlockers(
  gapReport: GenerationCapabilityGapReport,
  runtimeReport: GenerationCapabilityRuntimeReport,
  migration: RunAndGunCapabilityMigrationReport | undefined
): string[] {
  return [
    ...(gapReport.profileId !== undefined && runtimeReport.profileId === undefined ? ['evidence_identity_mismatch:runtime_profile'] : []),
    ...(gapReport.profileId !== undefined && runtimeReport.profileId !== undefined && gapReport.profileId !== runtimeReport.profileId
      ? ['evidence_identity_mismatch:runtime_profile']
      : []),
    ...(migration !== undefined && gapReport.profileId === undefined ? ['evidence_identity_mismatch:migration_profile_without_gap_profile'] : []),
    ...(migration !== undefined && gapReport.profileId !== undefined && migration.profileId !== gapReport.profileId
      ? ['evidence_identity_mismatch:migration_profile']
      : [])
  ];
}

function buildRollbackIdentityBlockers(input: {
  projectId: string;
  runId: string;
  rollback: GenerationCapabilityRollbackDrillReport | undefined;
}): string[] {
  if (input.rollback === undefined) {
    return [];
  }

  return [
    ...(input.rollback.projectId === input.projectId ? [] : ['evidence_identity_mismatch:rollback_project']),
    ...(input.rollback.sourceRunId === input.runId ? [] : ['evidence_identity_mismatch:rollback_source_run'])
  ];
}

function buildRequiredEvidenceRefs(input: {
  migration: RunAndGunCapabilityMigrationReport | undefined;
  rollback: GenerationCapabilityRollbackDrillReport | undefined;
}): string[] {
  return [
    ...(input.migration?.artifactRefs.map((ref) => ref.path) ?? []),
    ...(input.rollback === undefined ? [] : [`rollback:${input.rollback.drillHash}`])
  ].sort();
}
