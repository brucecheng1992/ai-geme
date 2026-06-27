import { type DeepSeekRunAndGunProfileSupportSummary } from './deepseek-run-and-gun-validation-profile-v1.js';

export const STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND = 'step37_support_promotion_per_capability_inventory';
export const STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION = 'step37_support_promotion_per_capability_inventory.v0.1';

export type Step37SupportPromotionEvidenceScope = 'capability_specific' | 'generic_only';
export type Step37SupportPromotionEvidenceRunScope = 'same_run' | 'previous_run';
export type Step37SupportPromotionClosureStatus = 'closed' | 'not_closed';
export type Step37SupportPromotionReceiptStatus = 'receipt_closed' | 'missing_receipt';
export type Step37SupportPromotionInputStatus = 'ready' | 'blocked';
export type Step37SupportPromotionGapType =
  | 'parser_marker_issue'
  | 'missing_per_capability_metadata'
  | 'missing_receipt'
  | 'aggregate_only_evidence'
  | 'real_capability_gap'
  | 'plan_inventory_identity_drift';

export type Step37SupportPromotionCapabilityClosureRecord = {
  capabilityId: string;
  packageId: string;
  checkpointId: string;
  parentStageId: string;
  closureStatus: Step37SupportPromotionClosureStatus;
  receiptStatus: Step37SupportPromotionReceiptStatus;
  receiptRef: string;
  sourceRevision: string;
  sourceSection: string;
  evidenceRunId: string;
  evidenceRunScope: Step37SupportPromotionEvidenceRunScope;
  evidenceScope: Step37SupportPromotionEvidenceScope;
};

export type Step37SupportPromotionInventoryInput = {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  aggregateObservedCapabilityIds?: readonly string[];
  currentRunId: string;
  capabilityClosureRecords: readonly Step37SupportPromotionCapabilityClosureRecord[];
  sourcePlanRevision: string;
};

export type Step37SupportPromotionInventoryArtifact = {
  artifactKind: typeof STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION;
  checkpointId: string;
  sourcePlanRevision: string;
  currentRunId: string;
  aggregateObservedCapabilityIds: string[];
  capabilityClosureRecords: Step37SupportPromotionCapabilityClosureRecord[];
};

export type Step37SupportPromotionDuplicateEntry = {
  capabilityId: string;
  recordCount: number;
  checkpointIds: string[];
};

export type Step37SupportPromotionStaleEntry = {
  capabilityId: string;
  checkpointId: string;
  expectedRunId: string;
  actualRunId: string;
  evidenceRunScope: Step37SupportPromotionEvidenceRunScope;
};

export type Step37SupportPromotionWrongPackageEntry = {
  capabilityId: string;
  packageId: string;
  expectedPackageId: string;
  checkpointId: string;
};

export type Step37SupportPromotionEligibleEntry = {
  capabilityId: string;
  packageId: string;
  checkpointId: string;
  receiptRef: string;
  sourceRevision: string;
  sourceSection: string;
};

export type Step37SupportPromotionInventoryReport = {
  artifactKind: typeof STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION;
  sourcePlanRevision: string;
  requiredCapabilityCount: number;
  registeredCapabilityCount: number;
  completeSupportedCount: number;
  aggregateObservedCount: number;
  machineParseableClosureCount: number;
  promotionEligibleCount: number;
  supportPromotionInputStatus: Step37SupportPromotionInputStatus;
  stage5EntryAllowed: false;
  missingClosureEntries: string[];
  duplicateEntries: Step37SupportPromotionDuplicateEntry[];
  staleOrPreviousRunEntries: Step37SupportPromotionStaleEntry[];
  genericOnlyEvidenceEntries: Step37SupportPromotionEligibleEntry[];
  wrongPackageEntries: Step37SupportPromotionWrongPackageEntry[];
  missingReceiptEntries: Step37SupportPromotionEligibleEntry[];
  unknownCapabilityEntries: Step37SupportPromotionEligibleEntry[];
  promotionEligibleEntries: Step37SupportPromotionEligibleEntry[];
  gapTypes: Step37SupportPromotionGapType[];
};

export function buildStep37SupportPromotionInventory(
  input: Step37SupportPromotionInventoryInput
): Step37SupportPromotionInventoryReport {
  const sourcePlanRevision = requireNonEmpty(input.sourcePlanRevision, 'sourcePlanRevision');
  const currentRunId = requireNonEmpty(input.currentRunId, 'currentRunId');
  const requiredCapabilityIds = input.supportSummary.capabilities.map((capability) => capability.capabilityId).sort();
  const requiredCapabilitySet = new Set(requiredCapabilityIds);
  const records = input.capabilityClosureRecords.map(normalizeRecord).sort((left, right) => {
    return left.capabilityId.localeCompare(right.capabilityId) || left.checkpointId.localeCompare(right.checkpointId);
  });
  const closedRecords = records.filter((record) => record.closureStatus === 'closed');
  const recordsByCapability = groupRecordsByCapability(closedRecords);
  const duplicateEntries = buildDuplicateEntries(recordsByCapability);
  const duplicateCapabilityIds = new Set(duplicateEntries.map((entry) => entry.capabilityId));
  const missingClosureEntries = requiredCapabilityIds.filter((capabilityId) => (recordsByCapability.get(capabilityId) ?? []).length === 0);
  const aggregateObservedCapabilityIds = new Set(input.aggregateObservedCapabilityIds ?? []);
  const staleOrPreviousRunEntries = closedRecords
    .filter((record) => record.evidenceRunScope !== 'same_run' || record.evidenceRunId !== currentRunId)
    .map((record) => ({
      capabilityId: record.capabilityId,
      checkpointId: record.checkpointId,
      expectedRunId: currentRunId,
      actualRunId: record.evidenceRunId,
      evidenceRunScope: record.evidenceRunScope
    }));
  const genericOnlyEvidenceEntries = closedRecords
    .filter((record) => record.evidenceScope === 'generic_only')
    .map(toEligibleEntry);
  const wrongPackageEntries = closedRecords
    .filter((record) => record.packageId !== record.capabilityId)
    .map((record) => ({
      capabilityId: record.capabilityId,
      packageId: record.packageId,
      expectedPackageId: record.capabilityId,
      checkpointId: record.checkpointId
    }));
  const missingReceiptEntries = closedRecords
    .filter((record) => record.receiptStatus !== 'receipt_closed')
    .map(toEligibleEntry);
  const unknownCapabilityEntries = closedRecords
    .filter((record) => !requiredCapabilitySet.has(record.capabilityId))
    .map(toEligibleEntry);

  const staleCapabilityIds = new Set(staleOrPreviousRunEntries.map((entry) => entry.capabilityId));
  const genericCapabilityIds = new Set(genericOnlyEvidenceEntries.map((entry) => entry.capabilityId));
  const wrongPackageCapabilityIds = new Set(wrongPackageEntries.map((entry) => entry.capabilityId));
  const missingReceiptCapabilityIds = new Set(missingReceiptEntries.map((entry) => entry.capabilityId));
  const unknownCapabilityIds = new Set(unknownCapabilityEntries.map((entry) => entry.capabilityId));
  const promotionEligibleEntries = requiredCapabilityIds
    .map((capabilityId) => {
      const capabilityRecords = recordsByCapability.get(capabilityId) ?? [];
      return capabilityRecords.length === 1 ? capabilityRecords[0] : null;
    })
    .filter((record): record is Step37SupportPromotionCapabilityClosureRecord => record !== null)
    .filter((record) => !duplicateCapabilityIds.has(record.capabilityId))
    .filter((record) => !staleCapabilityIds.has(record.capabilityId))
    .filter((record) => !genericCapabilityIds.has(record.capabilityId))
    .filter((record) => !wrongPackageCapabilityIds.has(record.capabilityId))
    .filter((record) => !missingReceiptCapabilityIds.has(record.capabilityId))
    .filter((record) => !unknownCapabilityIds.has(record.capabilityId))
    .map(toEligibleEntry);

  const supportPromotionInputStatus =
    promotionEligibleEntries.length === requiredCapabilityIds.length &&
    input.supportSummary.summary.registeredCapabilityCount === input.supportSummary.summary.requiredCapabilityCount &&
    missingClosureEntries.length === 0 &&
    duplicateEntries.length === 0 &&
    staleOrPreviousRunEntries.length === 0 &&
    genericOnlyEvidenceEntries.length === 0 &&
    wrongPackageEntries.length === 0 &&
    missingReceiptEntries.length === 0 &&
    unknownCapabilityEntries.length === 0
      ? 'ready'
      : 'blocked';

  return {
    artifactKind: STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND,
    schemaVersion: STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION,
    sourcePlanRevision,
    requiredCapabilityCount: input.supportSummary.summary.requiredCapabilityCount,
    registeredCapabilityCount: input.supportSummary.summary.registeredCapabilityCount,
    completeSupportedCount: input.supportSummary.summary.completeSupportedCount,
    aggregateObservedCount: [...aggregateObservedCapabilityIds].filter((capabilityId) => requiredCapabilitySet.has(capabilityId)).length,
    machineParseableClosureCount: [...recordsByCapability.keys()].filter((capabilityId) => requiredCapabilitySet.has(capabilityId)).length,
    promotionEligibleCount: promotionEligibleEntries.length,
    supportPromotionInputStatus,
    stage5EntryAllowed: false,
    missingClosureEntries,
    duplicateEntries,
    staleOrPreviousRunEntries,
    genericOnlyEvidenceEntries,
    wrongPackageEntries,
    missingReceiptEntries,
    unknownCapabilityEntries,
    promotionEligibleEntries,
    gapTypes: deriveGapTypes({
      requiredCapabilityCount: input.supportSummary.summary.requiredCapabilityCount,
      registeredCapabilityCount: input.supportSummary.summary.registeredCapabilityCount,
      aggregateObservedCount: [...aggregateObservedCapabilityIds].filter((capabilityId) => requiredCapabilitySet.has(capabilityId)).length,
      machineParseableClosureCount: [...recordsByCapability.keys()].filter((capabilityId) => requiredCapabilitySet.has(capabilityId)).length,
      missingClosureEntries,
      missingReceiptEntries,
      staleOrPreviousRunEntries,
      genericOnlyEvidenceEntries,
      wrongPackageEntries,
      unknownCapabilityEntries,
      duplicateEntries
    })
  };
}

export function parseStep37SupportPromotionInventoryArtifact(value: unknown): Step37SupportPromotionInventoryArtifact {
  const object = requireObject(value, 'artifact');
  const artifactKind = requireStringField(object, 'artifact_kind');
  if (artifactKind !== STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND) {
    throw new Error(
      `STEP37_SUPPORT_PROMOTION_INVENTORY_INVALID_ARTIFACT_KIND actual="${artifactKind}" expected="${STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND}"`
    );
  }
  const schemaVersion = requireStringField(object, 'schema_version');
  if (schemaVersion !== STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION) {
    throw new Error(
      `STEP37_SUPPORT_PROMOTION_INVENTORY_INVALID_SCHEMA_VERSION actual="${schemaVersion}" expected="${STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION}"`
    );
  }
  const rawRecords = requireArrayField(object, 'capability_closure_records');
  return {
    artifactKind: STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND,
    schemaVersion: STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION,
    checkpointId: requireStringField(object, 'checkpoint_id'),
    sourcePlanRevision: requireStringField(object, 'source_plan_revision'),
    currentRunId: requireStringField(object, 'current_run_id'),
    aggregateObservedCapabilityIds: requireStringArrayField(object, 'aggregate_observed_capability_ids'),
    capabilityClosureRecords: rawRecords.map((record, index) => parseCapabilityClosureRecord(record, index))
  };
}

function parseCapabilityClosureRecord(value: unknown, index: number): Step37SupportPromotionCapabilityClosureRecord {
  const object = requireObject(value, `capability_closure_records[${index}]`);
  return {
    capabilityId: requireStringField(object, 'capability_id'),
    packageId: requireStringField(object, 'package_id'),
    checkpointId: requireStringField(object, 'checkpoint_id'),
    parentStageId: requireStringField(object, 'parent_stage_id'),
    closureStatus: requireClosureStatus(requireStringField(object, 'closure_status'), index),
    receiptStatus: requireReceiptStatus(requireStringField(object, 'receipt_status'), index),
    receiptRef: requireStringField(object, 'receipt_ref'),
    sourceRevision: requireStringField(object, 'source_revision'),
    sourceSection: requireStringField(object, 'source_section'),
    evidenceRunId: requireStringField(object, 'evidence_run_id'),
    evidenceRunScope: requireEvidenceRunScope(requireStringField(object, 'evidence_run_scope'), index),
    evidenceScope: requireEvidenceScope(requireStringField(object, 'evidence_scope'), index)
  };
}

function normalizeRecord(record: Step37SupportPromotionCapabilityClosureRecord): Step37SupportPromotionCapabilityClosureRecord {
  return {
    capabilityId: requireNonEmpty(record.capabilityId, 'capabilityId'),
    packageId: requireNonEmpty(record.packageId, 'packageId'),
    checkpointId: requireNonEmpty(record.checkpointId, 'checkpointId'),
    parentStageId: requireNonEmpty(record.parentStageId, 'parentStageId'),
    closureStatus: record.closureStatus,
    receiptStatus: record.receiptStatus,
    receiptRef: requireNonEmpty(record.receiptRef, 'receiptRef'),
    sourceRevision: requireNonEmpty(record.sourceRevision, 'sourceRevision'),
    sourceSection: requireNonEmpty(record.sourceSection, 'sourceSection'),
    evidenceRunId: requireNonEmpty(record.evidenceRunId, 'evidenceRunId'),
    evidenceRunScope: record.evidenceRunScope,
    evidenceScope: record.evidenceScope
  };
}

function groupRecordsByCapability(
  records: readonly Step37SupportPromotionCapabilityClosureRecord[]
): Map<string, Step37SupportPromotionCapabilityClosureRecord[]> {
  const grouped = new Map<string, Step37SupportPromotionCapabilityClosureRecord[]>();
  for (const record of records) {
    grouped.set(record.capabilityId, [...(grouped.get(record.capabilityId) ?? []), record]);
  }
  return grouped;
}

function buildDuplicateEntries(
  recordsByCapability: ReadonlyMap<string, readonly Step37SupportPromotionCapabilityClosureRecord[]>
): Step37SupportPromotionDuplicateEntry[] {
  return [...recordsByCapability.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([capabilityId, records]) => ({
      capabilityId,
      recordCount: records.length,
      checkpointIds: records.map((record) => record.checkpointId).sort()
    }))
    .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
}

function toEligibleEntry(record: Step37SupportPromotionCapabilityClosureRecord): Step37SupportPromotionEligibleEntry {
  return {
    capabilityId: record.capabilityId,
    packageId: record.packageId,
    checkpointId: record.checkpointId,
    receiptRef: record.receiptRef,
    sourceRevision: record.sourceRevision,
    sourceSection: record.sourceSection
  };
}

function deriveGapTypes(input: {
  requiredCapabilityCount: number;
  registeredCapabilityCount: number;
  aggregateObservedCount: number;
  machineParseableClosureCount: number;
  missingClosureEntries: readonly string[];
  missingReceiptEntries: readonly Step37SupportPromotionEligibleEntry[];
  staleOrPreviousRunEntries: readonly Step37SupportPromotionStaleEntry[];
  genericOnlyEvidenceEntries: readonly Step37SupportPromotionEligibleEntry[];
  wrongPackageEntries: readonly Step37SupportPromotionWrongPackageEntry[];
  unknownCapabilityEntries: readonly Step37SupportPromotionEligibleEntry[];
  duplicateEntries: readonly Step37SupportPromotionDuplicateEntry[];
}): Step37SupportPromotionGapType[] {
  const gapTypes = new Set<Step37SupportPromotionGapType>();
  if (input.machineParseableClosureCount < input.requiredCapabilityCount) {
    gapTypes.add('missing_per_capability_metadata');
  }
  if (input.aggregateObservedCount === input.requiredCapabilityCount && input.machineParseableClosureCount < input.requiredCapabilityCount) {
    gapTypes.add('aggregate_only_evidence');
    gapTypes.add('parser_marker_issue');
  }
  if (input.missingReceiptEntries.length > 0) {
    gapTypes.add('missing_receipt');
  }
  if (input.registeredCapabilityCount < input.requiredCapabilityCount || input.unknownCapabilityEntries.length > 0) {
    gapTypes.add('plan_inventory_identity_drift');
  }
  if (
    input.staleOrPreviousRunEntries.length > 0 ||
    input.genericOnlyEvidenceEntries.length > 0 ||
    input.wrongPackageEntries.length > 0 ||
    input.duplicateEntries.length > 0
  ) {
    gapTypes.add('real_capability_gap');
  }
  return [...gapTypes].sort();
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_OBJECT_REQUIRED field="${field}"`);
  }
  return value as Record<string, unknown>;
}

function requireArrayField(object: Record<string, unknown>, field: string): unknown[] {
  const value = object[field];
  if (!Array.isArray(value)) {
    throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_ARRAY_REQUIRED field="${field}"`);
  }
  return value;
}

function requireStringArrayField(object: Record<string, unknown>, field: string): string[] {
  return requireArrayField(object, field).map((value, index) => {
    if (typeof value !== 'string') {
      throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_STRING_REQUIRED field="${field}[${index}]"`);
    }
    return requireNonEmpty(value, `${field}[${index}]`);
  });
}

function requireStringField(object: Record<string, unknown>, field: string): string {
  const value = object[field];
  if (typeof value !== 'string') {
    throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_STRING_REQUIRED field="${field}"`);
  }
  return requireNonEmpty(value, field);
}

function requireClosureStatus(value: string, index: number): Step37SupportPromotionClosureStatus {
  if (value === 'closed' || value === 'not_closed') {
    return value;
  }
  throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_INVALID_CLOSURE_STATUS index="${index}" actual="${value}"`);
}

function requireReceiptStatus(value: string, index: number): Step37SupportPromotionReceiptStatus {
  if (value === 'receipt_closed' || value === 'missing_receipt') {
    return value;
  }
  throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_INVALID_RECEIPT_STATUS index="${index}" actual="${value}"`);
}

function requireEvidenceRunScope(value: string, index: number): Step37SupportPromotionEvidenceRunScope {
  if (value === 'same_run' || value === 'previous_run') {
    return value;
  }
  throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_INVALID_EVIDENCE_RUN_SCOPE index="${index}" actual="${value}"`);
}

function requireEvidenceScope(value: string, index: number): Step37SupportPromotionEvidenceScope {
  if (value === 'capability_specific' || value === 'generic_only') {
    return value;
  }
  throw new Error(`STEP37_SUPPORT_PROMOTION_INVENTORY_INVALID_EVIDENCE_SCOPE index="${index}" actual="${value}"`);
}
