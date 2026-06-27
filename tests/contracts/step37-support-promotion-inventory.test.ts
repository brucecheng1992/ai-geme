import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND,
  STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37SupportPromotionInventory,
  parseStep37SupportPromotionInventoryArtifact,
  type DeepSeekRunAndGunProfileCapabilitySupport,
  type DeepSeekRunAndGunProfileSupportSummary,
  type Step37SupportPromotionCapabilityClosureRecord,
  type Step37SupportPromotionInventoryArtifact
} from '../../packages/game-dsl/src/index.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const currentRunId = 'run-step37-stage4-package-receipts';
const sourcePlanRevision = '0171ce6ef5c9bb7d7a45e4f21596a8dba6425477:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md';

describe('Step37 support-promotion per-capability inventory', () => {
  it('does not let aggregate observed 59/59 substitute for per-capability closure records', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const aggregateObservedIds = support.capabilities.map((capability) => capability.capabilityId);
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: aggregateObservedIds,
      currentRunId,
      capabilityClosureRecords: [],
      sourcePlanRevision
    });

    expect(report.artifactKind).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION);
    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.registeredCapabilityCount).toBe(59);
    expect(report.aggregateObservedCount).toBe(59);
    expect(report.machineParseableClosureCount).toBe(0);
    expect(report.missingClosureEntries).toHaveLength(59);
    expect(report.promotionEligibleCount).toBe(0);
    expect(report.supportPromotionInputStatus).toBe('blocked');
    expect(report.gapTypes).toContain('missing_per_capability_metadata');
    expect(report.gapTypes).toContain('aggregate_only_evidence');
    expect(report.stage5EntryAllowed).toBe(false);
  });

  it('classifies duplicate, stale, generic-only and wrong-package entries before promotion eligibility', () => {
    const support = supportSummary([
      capability('ready.alpha.v1'),
      capability('duplicate.beta.v1'),
      capability('stale.gamma.v1'),
      capability('generic.delta.v1'),
      capability('wrong.epsilon.v1'),
      capability('missing.zeta.v1')
    ]);
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: support.capabilities.map((capabilityItem) => capabilityItem.capabilityId),
      currentRunId,
      sourcePlanRevision,
      capabilityClosureRecords: [
        record('ready.alpha.v1'),
        record('duplicate.beta.v1', { checkpointId: 'stage4.duplicate_beta_v1.first' }),
        record('duplicate.beta.v1', { checkpointId: 'stage4.duplicate_beta_v1.second' }),
        record('stale.gamma.v1', { evidenceRunId: 'previous-run', evidenceRunScope: 'previous_run' }),
        record('generic.delta.v1', { evidenceScope: 'generic_only' }),
        record('wrong.epsilon.v1', { packageId: 'wrong.other_package.v1' })
      ]
    });

    expect(report.promotionEligibleEntries.map((entry) => entry.capabilityId)).toEqual(['ready.alpha.v1']);
    expect(report.duplicateEntries).toEqual([
      {
        capabilityId: 'duplicate.beta.v1',
        recordCount: 2,
        checkpointIds: ['stage4.duplicate_beta_v1.first', 'stage4.duplicate_beta_v1.second']
      }
    ]);
    expect(report.staleOrPreviousRunEntries.map((entry) => entry.capabilityId)).toEqual(['stale.gamma.v1']);
    expect(report.genericOnlyEvidenceEntries.map((entry) => entry.capabilityId)).toEqual(['generic.delta.v1']);
    expect(report.wrongPackageEntries).toEqual([
      {
        capabilityId: 'wrong.epsilon.v1',
        packageId: 'wrong.other_package.v1',
        expectedPackageId: 'wrong.epsilon.v1',
        checkpointId: 'stage4.wrong_epsilon_v1.complete_supported_package_slice'
      }
    ]);
    expect(report.missingClosureEntries).toEqual(['missing.zeta.v1']);
    expect(report.supportPromotionInputStatus).toBe('blocked');
    expect(report.stage5EntryAllowed).toBe(false);
  });

  it('requires the current Stage 4 support-promotion inventory to machine-verify every required capability without promoting static support', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const inventory = readStage4SupportPromotionInventory();
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: inventory.aggregateObservedCapabilityIds,
      currentRunId: inventory.currentRunId,
      sourcePlanRevision: inventory.sourcePlanRevision,
      capabilityClosureRecords: inventory.capabilityClosureRecords
    });

    expect(inventory.artifactKind).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND);
    expect(inventory.schemaVersion).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION);
    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.registeredCapabilityCount).toBe(59);
    expect(report.completeSupportedCount).toBe(0);
    expect(report.aggregateObservedCount).toBe(59);
    expect(report.machineParseableClosureCount).toBe(59);
    expect(report.missingClosureEntries).toEqual([]);
    expect(report.duplicateEntries).toEqual([]);
    expect(report.staleOrPreviousRunEntries).toEqual([]);
    expect(report.genericOnlyEvidenceEntries).toEqual([]);
    expect(report.wrongPackageEntries).toEqual([]);
    expect(report.promotionEligibleCount).toBe(59);
    expect(report.supportPromotionInputStatus).toBe('ready');
    expect(report.stage5EntryAllowed).toBe(false);
    for (const record of inventory.capabilityClosureRecords) {
      expect(record.receiptRef).toMatch(/^[0-9a-f]{40}$/);
      expect(gitObjectExists(record.receiptRef)).toBe(true);
    }
  });

  it('fails closed when the machine-readable artifact is missing required closure metadata', () => {
    const parsed = JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')) as Record<string, unknown>;
    const records = parsed.capability_closure_records as Array<Record<string, unknown>>;
    const [firstRecord, ...remainingRecords] = records;
    expect(firstRecord).toBeDefined();
    const { receipt_ref: _receiptRef, ...recordWithoutReceiptRef } = firstRecord;

    expect(() =>
      parseStep37SupportPromotionInventoryArtifact({
        ...parsed,
        capability_closure_records: [recordWithoutReceiptRef, ...remainingRecords]
      })
    ).toThrow(/STEP37_SUPPORT_PROMOTION_INVENTORY_STRING_REQUIRED field="receipt_ref"/);
  });
});

function supportSummary(capabilities: DeepSeekRunAndGunProfileCapabilitySupport[]): DeepSeekRunAndGunProfileSupportSummary {
  return {
    profileId: 'DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1',
    profileVersion: 'v1',
    summary: {
      requirementCount: capabilities.length,
      capabilityClusterCount: 1,
      requiredCapabilityCount: capabilities.length,
      registeredCapabilityCount: capabilities.length,
      completeSupportedCount: 0,
      legacyBackedCapabilityCount: 0
    },
    capabilities
  };
}

function capability(capabilityId: string): DeepSeekRunAndGunProfileCapabilitySupport {
  return {
    capabilityId,
    registered: true,
    classification: 'DEFERRED',
    evidenceDimensions: {
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    },
    missingEvidenceDimensions: ['qa_observed'],
    missingSupportEvidencePrerequisites: ['requiredProbesVerified'],
    completeSupported: false,
    legacyBacked: false
  };
}

function record(
  capabilityId: string,
  overrides: Partial<Step37SupportPromotionCapabilityClosureRecord> = {}
): Step37SupportPromotionCapabilityClosureRecord {
  const checkpointId = `stage4.${capabilityId.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()}.complete_supported_package_slice`;
  return {
    capabilityId,
    packageId: capabilityId,
    checkpointId,
    parentStageId: 'stage4',
    closureStatus: 'closed',
    receiptStatus: 'receipt_closed',
    receiptRef: `receipt.${capabilityId}`,
    sourceRevision: `commit.${capabilityId}:docs/plans/stage4.md`,
    sourceSection: `Stage 4 ${capabilityId} closure`,
    evidenceRunId: currentRunId,
    evidenceRunScope: 'same_run',
    evidenceScope: 'capability_specific',
    ...overrides
  };
}

function readStage4SupportPromotionInventory(): Step37SupportPromotionInventoryArtifact {
  return parseStep37SupportPromotionInventoryArtifact(JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')));
}

function gitObjectExists(commitSha: string): boolean {
  try {
    execFileSync('git', ['cat-file', '-e', `${commitSha}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
