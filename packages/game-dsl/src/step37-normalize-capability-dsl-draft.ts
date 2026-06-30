import {
  CanonicalGameDslV02Schema,
  GameDslNormalizationReportSchema,
  normalizeCapabilityGameDslDraftToCanonicalV02,
  type CanonicalGameDslV02,
  type GameDslNormalizationReport
} from './schemas/game-dsl-v0.2.schema.js';
import { type GameplayCapabilityLock } from './gameplay-capabilities/capability-lock.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { type Step37CapabilityDslDraftReport } from './step37-capability-dsl-draft.js';
import { type Step37ComposedDslSchemaReport } from './step37-composed-dsl-schema.js';
import { type Step37ExactCapabilityLockReport } from './step37-exact-capability-lock.js';
import {
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';

export const STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND =
  'step37_normalized_capability_dsl_from_capability_dsl_draft';
export const STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION =
  'step37_normalized_capability_dsl_from_capability_dsl_draft.v0.1';
export const STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_PROJECT_ID = 'proj_step37_stage7_normalize';
export const STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_RUN_ID = 'run_step37_stage7_normalize';

export type Step37NormalizeCapabilityDslDraftStatus = 'passed' | 'blocked';

export type Step37NormalizeCapabilityDslDraftBlocker = {
  errorCode:
    | 'STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_AUDIT_HASH_MISMATCH'
    | 'STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_NOT_PASSED'
    | 'STAGE7_NORMALIZE_COMPOSED_SCHEMA_NOT_PASSED'
    | 'STAGE7_NORMALIZE_EXACT_LOCK_NOT_PASSED'
    | 'STAGE7_NORMALIZE_SOURCE_HASH_MISMATCH'
    | 'STAGE7_NORMALIZE_LOCK_ADAPTER_MISSING'
    | 'STAGE7_NORMALIZE_REPORT_BLOCKED'
    | 'STAGE7_NORMALIZE_CANONICAL_SCHEMA_INVALID'
    | 'STAGE7_NORMALIZE_COMPILATION_PREMATURE'
    | 'STAGE7_NORMALIZE_RUNTIME_CONSUMPTION_PREMATURE'
    | 'STAGE7_NORMALIZE_QA_OBSERVATION_PREMATURE'
    | 'STAGE7_NORMALIZE_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE7_NORMALIZE_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE7_NORMALIZE_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean | null;
  path?: string;
};

export type Step37NormalizeCapabilityDslDraftReport = {
  artifactKind: typeof STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID;
  parentStageId: 'stage7';
  sourceCapabilityDslDraftPath: string;
  sourceCapabilityDslDraftAuditHash: string;
  expectedCapabilityDslDraftAuditHash: string;
  capabilityDslDraftAuditHashMatches: boolean;
  sourceCapabilityDslDraftHash: string | null;
  sourceComposedSchemaAuditHash: string;
  sourceComposedSchemaHash: string | null;
  sourceExactCapabilityLockAuditHash: string;
  sourceExactCapabilityLockHash: string | null;
  sourceStage5EntryAuditHash: string;
  sourceStage4ExitAuditHash: string;
  sourceSupportViewHash: string;
  sourceInventoryHash: string;
  normalizationGameBriefHash: string;
  normalizationProfileResolutionHash: string;
  normalizationLockHash: string | null;
  normalizationLockProfileId: string | null;
  sourceExactLockProfileId: string | null;
  profileId: Step37CapabilityDslDraftReport['profileId'];
  draftProfileId: Step37CapabilityDslDraftReport['draftProfileId'];
  profileVersion: Step37CapabilityDslDraftReport['profileVersion'];
  runtimeFamily: Step37CapabilityDslDraftReport['runtimeFamily'];
  capabilityDslDraftStatus: Step37CapabilityDslDraftReport['draftStatus'];
  capabilityDslDraftProduced: boolean;
  capabilityDslDraftNextCheckpointId: Step37CapabilityDslDraftReport['nextCheckpointId'];
  requiredCapabilityCount: number;
  completeSupportedCount: number;
  packageCount: number;
  completeSupportedCapabilityIds: string[];
  normalizedCapabilityIds: string[];
  canonicalGameDsl: CanonicalGameDslV02 | null;
  canonicalDslHash: string | null;
  normalizationReport: GameDslNormalizationReport | null;
  normalizationReportHash: string | null;
  normalizationStatus: Step37NormalizeCapabilityDslDraftStatus;
  providerDraftProduced: boolean;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterNormalization: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID | null;
  blockers: Step37NormalizeCapabilityDslDraftBlocker[];
  auditHash: string;
};

export function buildStep37NormalizeCapabilityDslDraftReport(input: {
  capabilityDslDraftReport: Step37CapabilityDslDraftReport;
  composedSchemaReport: Step37ComposedDslSchemaReport;
  exactCapabilityLockReport: Step37ExactCapabilityLockReport;
  sourceCapabilityDslDraftPath: string;
  sourceCapabilityDslDraftAuditHash: string;
  expectedCapabilityDslDraftAuditHash: string;
  compiled?: boolean;
  runtimeConsumed?: boolean;
  qaObserved?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37NormalizeCapabilityDslDraftReport {
  const sourceCapabilityDslDraftPath = requireNonEmpty(input.sourceCapabilityDslDraftPath, 'sourceCapabilityDslDraftPath');
  const sourceCapabilityDslDraftAuditHash = requireNonEmpty(input.sourceCapabilityDslDraftAuditHash, 'sourceCapabilityDslDraftAuditHash');
  const expectedCapabilityDslDraftAuditHash = requireNonEmpty(
    input.expectedCapabilityDslDraftAuditHash,
    'expectedCapabilityDslDraftAuditHash'
  );
  const compiled = input.compiled ?? false;
  const runtimeConsumed = input.runtimeConsumed ?? false;
  const qaObserved = input.qaObserved ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const expectedCapabilityIds = [...input.capabilityDslDraftReport.completeSupportedCapabilityIds].sort();
  const normalizationLock = buildStep37NormalizationCapabilityLock(
    input.exactCapabilityLockReport.capabilityLock,
    input.capabilityDslDraftReport.draftProfileId
  );
  const normalizationGameBriefHash = input.capabilityDslDraftReport.sourceSupportViewHash;
  const normalizationProfileResolutionHash = hashStableJson({
    draftProfileId: input.capabilityDslDraftReport.draftProfileId,
    sourceExactCapabilityLockHash: input.capabilityDslDraftReport.sourceExactCapabilityLockHash,
    sourceComposedSchemaHash: input.capabilityDslDraftReport.sourceComposedSchemaHash
  });
  const normalization = normalizationLock === null
    ? {
        status: 'blocked' as const,
        normalizationReport: null,
        canonicalDsl: null
      }
    : normalizeCapabilityGameDslDraftToCanonicalV02({
        projectId: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_PROJECT_ID,
        runId: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_RUN_ID,
        draft: input.capabilityDslDraftReport.capabilityDslDraft,
        gameBriefHash: normalizationGameBriefHash,
        profileResolutionHash: normalizationProfileResolutionHash,
        capabilityLock: normalizationLock,
        composedSchemaIdentity: input.composedSchemaReport.composedSchemaIdentity
      });
  const canonicalGameDsl = normalization.status === 'normalized' ? normalization.canonicalDsl : null;
  const normalizationReport = normalization.normalizationReport;
  const canonicalParsed = canonicalGameDsl === null ? null : CanonicalGameDslV02Schema.safeParse(canonicalGameDsl);
  const reportParsed = normalizationReport === null ? null : GameDslNormalizationReportSchema.safeParse(normalizationReport);
  const blockers = buildNormalizeCapabilityDslDraftBlockers({
    capabilityDslDraftReport: input.capabilityDslDraftReport,
    composedSchemaReport: input.composedSchemaReport,
    exactCapabilityLockReport: input.exactCapabilityLockReport,
    sourceCapabilityDslDraftAuditHash,
    expectedCapabilityDslDraftAuditHash,
    normalizationLock,
    normalizationStatus: normalization.status,
    normalizationReport,
    canonicalSchemaValid: canonicalParsed?.success ?? false,
    normalizationReportValid: reportParsed?.success ?? false,
    compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const normalizationStatus: Step37NormalizeCapabilityDslDraftStatus =
    blockers.length === 0 && canonicalGameDsl !== null && normalizationReport !== null ? 'passed' : 'blocked';
  const normalizedCapabilityIds = canonicalGameDsl?.capability_ids !== undefined ? [...canonicalGameDsl.capability_ids].sort() : [];
  const payloadWithoutHash: Omit<Step37NormalizeCapabilityDslDraftReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
    parentStageId: 'stage7',
    sourceCapabilityDslDraftPath,
    sourceCapabilityDslDraftAuditHash,
    expectedCapabilityDslDraftAuditHash,
    capabilityDslDraftAuditHashMatches: sourceCapabilityDslDraftAuditHash === expectedCapabilityDslDraftAuditHash,
    sourceCapabilityDslDraftHash: input.capabilityDslDraftReport.draftHash,
    sourceComposedSchemaAuditHash: input.capabilityDslDraftReport.sourceComposedSchemaAuditHash,
    sourceComposedSchemaHash: input.capabilityDslDraftReport.sourceComposedSchemaHash,
    sourceExactCapabilityLockAuditHash: input.capabilityDslDraftReport.sourceExactCapabilityLockAuditHash,
    sourceExactCapabilityLockHash: input.capabilityDslDraftReport.sourceExactCapabilityLockHash,
    sourceStage5EntryAuditHash: input.capabilityDslDraftReport.sourceStage5EntryAuditHash,
    sourceStage4ExitAuditHash: input.capabilityDslDraftReport.sourceStage4ExitAuditHash,
    sourceSupportViewHash: input.capabilityDslDraftReport.sourceSupportViewHash,
    sourceInventoryHash: input.capabilityDslDraftReport.sourceInventoryHash,
    normalizationGameBriefHash,
    normalizationProfileResolutionHash,
    normalizationLockHash: normalizationLock?.lockHash ?? null,
    normalizationLockProfileId: normalizationLock?.profileId ?? null,
    sourceExactLockProfileId: input.exactCapabilityLockReport.capabilityLock?.profileId ?? null,
    profileId: input.capabilityDslDraftReport.profileId,
    draftProfileId: input.capabilityDslDraftReport.draftProfileId,
    profileVersion: input.capabilityDslDraftReport.profileVersion,
    runtimeFamily: input.capabilityDslDraftReport.runtimeFamily,
    capabilityDslDraftStatus: input.capabilityDslDraftReport.draftStatus,
    capabilityDslDraftProduced: input.capabilityDslDraftReport.capabilityDslDraftProduced,
    capabilityDslDraftNextCheckpointId: input.capabilityDslDraftReport.nextCheckpointId,
    requiredCapabilityCount: input.capabilityDslDraftReport.requiredCapabilityCount,
    completeSupportedCount: input.capabilityDslDraftReport.completeSupportedCount,
    packageCount: input.capabilityDslDraftReport.packageCount,
    completeSupportedCapabilityIds: expectedCapabilityIds,
    normalizedCapabilityIds,
    canonicalGameDsl: normalizationStatus === 'passed' ? canonicalGameDsl : null,
    canonicalDslHash: normalizationStatus === 'passed' ? hashStableJson(canonicalGameDsl) : null,
    normalizationReport: normalizationStatus === 'passed' ? normalizationReport : null,
    normalizationReportHash: normalizationStatus === 'passed' ? hashStableJson(normalizationReport) : null,
    normalizationStatus,
    providerDraftProduced: input.capabilityDslDraftReport.providerDraftProduced,
    normalized: normalizationStatus === 'passed',
    compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterNormalization: normalizationStatus === 'passed' ? 'running' : 'complete',
    nextCheckpointId: normalizationStatus === 'passed' ? STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildNormalizeCapabilityDslDraftBlockers(input: {
  capabilityDslDraftReport: Step37CapabilityDslDraftReport;
  composedSchemaReport: Step37ComposedDslSchemaReport;
  exactCapabilityLockReport: Step37ExactCapabilityLockReport;
  sourceCapabilityDslDraftAuditHash: string;
  expectedCapabilityDslDraftAuditHash: string;
  normalizationLock: GameplayCapabilityLock | null;
  normalizationStatus: 'normalized' | 'blocked';
  normalizationReport: GameDslNormalizationReport | null;
  canonicalSchemaValid: boolean;
  normalizationReportValid: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37NormalizeCapabilityDslDraftBlocker[] {
  const blockers: Step37NormalizeCapabilityDslDraftBlocker[] = [];
  if (input.sourceCapabilityDslDraftAuditHash !== input.expectedCapabilityDslDraftAuditHash) {
    blockers.push({
      errorCode: 'STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceCapabilityDslDraftAuditHash,
      expected: input.expectedCapabilityDslDraftAuditHash
    });
  }
  if (
    input.capabilityDslDraftReport.draftStatus !== 'passed' ||
    !input.capabilityDslDraftReport.capabilityDslDraftProduced ||
    input.capabilityDslDraftReport.capabilityDslDraft === null ||
    input.capabilityDslDraftReport.nextCheckpointId !== STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID
  ) {
    blockers.push({
      errorCode: 'STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_NOT_PASSED',
      capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds],
      actual: input.capabilityDslDraftReport.draftStatus,
      expected: 'passed'
    });
  }
  if (
    input.composedSchemaReport.composedSchemaStatus !== 'passed' ||
    !input.composedSchemaReport.composedSchemaProduced ||
    input.composedSchemaReport.composedSchemaIdentity === null
  ) {
    blockers.push({
      errorCode: 'STAGE7_NORMALIZE_COMPOSED_SCHEMA_NOT_PASSED',
      capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds],
      actual: input.composedSchemaReport.composedSchemaStatus,
      expected: 'passed'
    });
  }
  if (
    input.exactCapabilityLockReport.exactLockStatus !== 'passed' ||
    !input.exactCapabilityLockReport.exactLockProduced ||
    input.exactCapabilityLockReport.capabilityLock === null
  ) {
    blockers.push({
      errorCode: 'STAGE7_NORMALIZE_EXACT_LOCK_NOT_PASSED',
      capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds],
      actual: input.exactCapabilityLockReport.exactLockStatus,
      expected: 'passed'
    });
  }
  if (
    input.capabilityDslDraftReport.sourceComposedSchemaAuditHash !== input.composedSchemaReport.auditHash ||
    input.capabilityDslDraftReport.sourceComposedSchemaHash !== input.composedSchemaReport.composedSchemaHash ||
    input.capabilityDslDraftReport.sourceExactCapabilityLockAuditHash !== input.exactCapabilityLockReport.auditHash ||
    input.capabilityDslDraftReport.sourceExactCapabilityLockHash !== input.exactCapabilityLockReport.lockHash
  ) {
    blockers.push({
      errorCode: 'STAGE7_NORMALIZE_SOURCE_HASH_MISMATCH',
      capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds]
    });
  }
  if (input.normalizationLock === null) {
    blockers.push({
      errorCode: 'STAGE7_NORMALIZE_LOCK_ADAPTER_MISSING',
      capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds],
      actual: null,
      expected: input.capabilityDslDraftReport.draftProfileId
    });
  }
  if (input.normalizationStatus !== 'normalized' || input.normalizationReport?.status !== 'normalized') {
    for (const issue of input.normalizationReport?.issues ?? []) {
      blockers.push({
        errorCode: 'STAGE7_NORMALIZE_REPORT_BLOCKED',
        capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds],
        actual: issue.code,
        expected: 'normalized',
        path: issue.path
      });
    }
    if ((input.normalizationReport?.issues.length ?? 0) === 0) {
      blockers.push({
        errorCode: 'STAGE7_NORMALIZE_REPORT_BLOCKED',
        capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds],
        actual: input.normalizationStatus,
        expected: 'normalized'
      });
    }
  }
  if (!input.canonicalSchemaValid || !input.normalizationReportValid) {
    blockers.push({
      errorCode: 'STAGE7_NORMALIZE_CANONICAL_SCHEMA_INVALID',
      capabilityIds: [...input.capabilityDslDraftReport.completeSupportedCapabilityIds],
      actual: input.canonicalSchemaValid && input.normalizationReportValid,
      expected: true
    });
  }
  if (input.compiled) {
    blockers.push({ errorCode: 'STAGE7_NORMALIZE_COMPILATION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.runtimeConsumed) {
    blockers.push({ errorCode: 'STAGE7_NORMALIZE_RUNTIME_CONSUMPTION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.qaObserved) {
    blockers.push({ errorCode: 'STAGE7_NORMALIZE_QA_OBSERVATION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({ errorCode: 'STAGE7_NORMALIZE_PRODUCTION_CUTOVER_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({ errorCode: 'STAGE7_NORMALIZE_LEGACY_AUTHORITY_EXIT_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({ errorCode: 'STAGE7_NORMALIZE_FINAL_CLOSURE_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  return blockers;
}

export function buildStep37NormalizationCapabilityLock(lock: GameplayCapabilityLock | null, draftProfileId: string): GameplayCapabilityLock | null {
  if (lock === null) {
    return null;
  }
  const { lockHash: _lockHash, ...payload } = lock;
  const normalizedPayload = {
    ...payload,
    profileId: draftProfileId,
    capabilityIds: [...payload.capabilityIds].sort(),
    packages: [...payload.packages].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId))
  };
  return { ...normalizedPayload, lockHash: hashStableJson(normalizedPayload) };
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`STEP37_NORMALIZE_CAPABILITY_DSL_DRAFT_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
