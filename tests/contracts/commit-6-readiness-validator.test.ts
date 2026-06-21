import { describe, expect, it } from 'vitest';

import {
  EXPECTED_ARTIFACT_DIGEST,
  EXPECTED_BUILD_RUN_ID,
  EXPECTED_RELEASE_SOURCE_COMMIT,
  validateCommit6Readiness,
  type Commit6ReadinessValidatorInput
} from '../../scripts/commit-6-readiness-validator.js';

const EVALUATED_AT = '2026-06-21T19:07:16Z';
const FUTURE_EXPIRY = '2026-12-31T00:00:00Z';
const VALID_DIGEST = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const ROLLBACK_DIGEST = 'sha256:2222222222222222222222222222222222222222222222222222222222222222';

describe('Commit 6 readiness validator', () => {
  it('fails closed for the current missing-approval WP5 input shape', () => {
    const result = validateCommit6Readiness(currentBlockedInput(), { evaluatedAt: EVALUATED_AT, validatorCommit: 'test' });

    expect(result.result).toBe('BLOCKED');
    expect(result.exitCode).toBe(1);
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining([
        'DEPLOYMENT_RUNBOOK_NOT_APPROVED',
        'ROLLBACK_RUNBOOK_NOT_APPROVED',
        'SLI_PARITY_CRITERIA_NOT_APPROVED',
        'APPROVEDBASELINE_NOT_APPROVED',
        'APPROVEDROLLBACKTARGET_NOT_APPROVED',
        'APPROVEDCANARYSCOPE_NOT_APPROVED',
        'SAFEROLLBACKAUTHORIZATION_NOT_APPROVED',
        'ROLLBACKDRILLAUTHORIZATION_NOT_APPROVED',
        'DEPLOY_RECEIPT_MISSING',
        'CANARY_RECEIPT_MISSING',
        'ROLLBACK_RECEIPT_MISSING'
      ])
    );
    expect(result.releaseAuthorization).toBe(false);
    expect(result.commit6GateAuthorized).toBe(false);
  });

  it('fails when baseline approval is missing', () => {
    expect(reasonCodes({ approvals: { approvedBaseline: { status: 'MISSING' } } })).toContain('APPROVEDBASELINE_MISSING');
  });

  it('fails when rollback target approval is missing', () => {
    expect(reasonCodes({ approvals: { approvedRollbackTarget: { status: 'MISSING' } } })).toContain('APPROVEDROLLBACKTARGET_MISSING');
  });

  it('fails when canary scope approval is missing', () => {
    expect(reasonCodes({ approvals: { approvedCanaryScope: { status: 'MISSING' } } })).toContain('APPROVEDCANARYSCOPE_MISSING');
  });

  it('fails when safe rollback authorization is missing', () => {
    expect(reasonCodes({ approvals: { safeRollbackAuthorization: { status: 'MISSING' } } })).toContain('SAFEROLLBACKAUTHORIZATION_MISSING');
  });

  it('fails when rollback drill authorization is missing', () => {
    expect(reasonCodes({ approvals: { rollbackDrillAuthorization: { status: 'MISSING' } } })).toContain('ROLLBACKDRILLAUTHORIZATION_MISSING');
  });

  it('fails when an approval is expired', () => {
    expect(reasonCodes({ approvals: { approvedBaseline: { expiresAt: '2026-01-01T00:00:00Z' } } })).toContain('APPROVEDBASELINE_EXPIRED');
  });

  it('fails on wrong source commit', () => {
    expect(reasonCodes({ releaseSourceCommit: '917190059c2f8ca50f246183d9dd021a0e199911' })).toContain('SOURCE_COMMIT_MISMATCH');
  });

  it('fails on wrong artifact hash', () => {
    expect(reasonCodes({ artifactDigest: VALID_DIGEST })).toContain('ARTIFACT_DIGEST_MISMATCH');
  });

  it('fails on wrong build run ID', () => {
    expect(reasonCodes({ buildRunId: 'build_wrong' })).toContain('BUILD_RUN_ID_MISMATCH');
  });

  it('fails on synthetic receipts', () => {
    expect(reasonCodes({ receipts: { deploy: { source: 'SYNTHETIC', providerGenerated: false } } })).toContain('DEPLOY_RECEIPT_NOT_PLATFORM_NATIVE');
  });

  it('fails on dry-run receipts', () => {
    expect(reasonCodes({ receipts: { deploy: { source: 'DRY_RUN', providerGenerated: false } } })).toContain('DEPLOY_RECEIPT_NOT_PLATFORM_NATIVE');
  });

  it('fails on test fixture receipts', () => {
    expect(reasonCodes({ receipts: { deploy: { source: 'FIXTURE', providerGenerated: false } } })).toContain('DEPLOY_RECEIPT_NOT_PLATFORM_NATIVE');
  });

  it('fails on wrong environment receipt', () => {
    expect(reasonCodes({ receipts: { deploy: { targetScopeApproved: false } } })).toContain('DEPLOY_TARGET_SCOPE_NOT_APPROVED');
  });

  it('fails when receipt operation ID is missing', () => {
    expect(reasonCodes({ receipts: { deploy: { operationId: '', requestId: '' } } })).toContain('DEPLOY_OPERATION_ID_MISSING');
  });

  it('fails when canary scope exceeds approval', () => {
    expect(
      reasonCodes({
        approvals: { approvedCanaryScope: { maxTrafficPercentage: 5 } },
        receipts: { canary: { canaryTrafficPercentage: 10 } }
      })
    ).toContain('CANARY_SCOPE_EXCEEDED');
  });

  it('fails when rollback receipt is missing', () => {
    expect(reasonCodes({ receipts: { rollback: { status: 'MISSING' } } })).toContain('ROLLBACK_RECEIPT_MISSING');
  });

  it('fails on hash mismatch between rollback target approval and receipt', () => {
    expect(
      reasonCodes({
        approvals: { approvedRollbackTarget: { rollbackTargetDigest: ROLLBACK_DIGEST } },
        receipts: { rollback: { rollbackTargetDigest: VALID_DIGEST } }
      })
    ).toContain('ROLLBACK_TARGET_DIGEST_MISMATCH');
  });

  it('passes only for a complete valid unit-test fixture', () => {
    const result = validateCommit6Readiness(validInput(), { evaluatedAt: EVALUATED_AT, validatorCommit: 'test' });

    expect(result.result).toBe('PASS');
    expect(result.exitCode).toBe(0);
    expect(result.reasonCodes).toEqual([]);
    expect(result.productionDeploymentAuthorized).toBe(false);
    expect(result.releaseAuthorization).toBe(false);
    expect(result.commit6GateAuthorized).toBe(false);
  });
});

function reasonCodes(overrides: DeepPartial<Commit6ReadinessValidatorInput>): string[] {
  return validateCommit6Readiness(merge(validInput(), overrides), { evaluatedAt: EVALUATED_AT, validatorCommit: 'test' }).reasonCodes;
}

function currentBlockedInput(): Commit6ReadinessValidatorInput {
  const blocked = validInput();
  blocked.deploymentRunbook.status = 'REVIEW_REQUIRED';
  blocked.rollbackRunbook.status = 'REVIEW_REQUIRED';
  blocked.sliParityCriteria.status = 'REVIEW_REQUIRED';
  blocked.sliParityCriteria.baselineStatus = 'NOT_APPROVED';
  for (const key of Object.keys(blocked.approvals) as Array<keyof Commit6ReadinessValidatorInput['approvals']>) {
    blocked.approvals[key].status = 'NOT_APPROVED';
  }
  for (const key of Object.keys(blocked.receipts) as Array<keyof Commit6ReadinessValidatorInput['receipts']>) {
    blocked.receipts[key].status = 'MISSING';
  }
  blocked.sliVerification = 'NOT_APPROVED';
  blocked.parityVerification = 'NOT_APPROVED';
  return blocked;
}

function validInput(): Commit6ReadinessValidatorInput {
  return {
    schemaVersion: 'commit_6_readiness_validator_input.v0.1',
    verificationRunId: 'wp5_20260621T190716Z_d969e49b',
    releaseSourceCommit: EXPECTED_RELEASE_SOURCE_COMMIT,
    buildRunId: EXPECTED_BUILD_RUN_ID,
    artifactDigest: EXPECTED_ARTIFACT_DIGEST,
    wp4Status: 'PASS_WITH_APPROVED_COMPENSATING_CORRELATION',
    wp4SlsCorrelation: 'PASS_9_OF_9_WITH_REQUEST_ID_CORRECTION',
    sourceImpactClassification: 'CONTROL_PLANE_ONLY',
    deploymentRunbook: approvedDocument('docs/refactor-log/art-asset-pipeline-production-rollout/commit-6-deployment-runbook.md'),
    rollbackRunbook: approvedDocument('docs/refactor-log/art-asset-pipeline-production-rollout/commit-6-rollback-runbook.md'),
    sliParityCriteria: {
      ...approvedDocument('docs/refactor-log/art-asset-pipeline-production-rollout/commit-6-sli-parity-criteria.json'),
      baselineStatus: 'APPROVED'
    },
    approvals: {
      approvedBaseline: approval({ baselineDigest: VALID_DIGEST }),
      approvedRollbackTarget: approval({ rollbackTargetDigest: ROLLBACK_DIGEST }),
      approvedCanaryScope: approval({ maxTrafficPercentage: 10 }),
      safeRollbackAuthorization: approval(),
      rollbackDrillAuthorization: approval()
    },
    receipts: {
      deploy: receipt({ receiptId: 'deploy-receipt', operationId: 'op-deploy' }),
      canary: receipt({ receiptId: 'canary-receipt', operationId: 'op-canary', canaryTrafficPercentage: 5 }),
      rollback: receipt({ receiptId: 'rollback-receipt', operationId: 'op-rollback', rollbackTargetDigest: ROLLBACK_DIGEST })
    },
    sliVerification: 'PASS',
    parityVerification: 'PASS',
    productionDeploymentPerformed: false
  };
}

function approvedDocument(path: string): Commit6ReadinessValidatorInput['deploymentRunbook'] {
  return {
    status: 'APPROVED',
    path,
    documentVersion: 'v0.1',
    sha256: VALID_DIGEST,
    boundSourceCommit: EXPECTED_RELEASE_SOURCE_COMMIT,
    boundBuildRunId: EXPECTED_BUILD_RUN_ID,
    artifactDigest: EXPECTED_ARTIFACT_DIGEST
  };
}

function approval(overrides: Partial<Commit6ReadinessValidatorInput['approvals']['approvedBaseline']> = {}): Commit6ReadinessValidatorInput['approvals']['approvedBaseline'] {
  return {
    status: 'APPROVED',
    approvalId: 'approval-fixture',
    approverRole: 'release-governance-fixture',
    separationOfDutiesCheck: 'PASS',
    boundSourceCommit: EXPECTED_RELEASE_SOURCE_COMMIT,
    boundBuildRunId: EXPECTED_BUILD_RUN_ID,
    boundArtifactDigest: EXPECTED_ARTIFACT_DIGEST,
    boundEnvironment: 'non-production-fixture',
    issuedAt: '2026-06-21T00:00:00Z',
    expiresAt: FUTURE_EXPIRY,
    revocationStatus: 'NOT_REVOKED',
    evidenceUri: 'fixture://approval',
    ...overrides
  };
}

function receipt(overrides: Partial<Commit6ReadinessValidatorInput['receipts']['deploy']> = {}): Commit6ReadinessValidatorInput['receipts']['deploy'] {
  return {
    status: 'VERIFIED',
    receiptId: 'receipt-fixture',
    receiptSha256: VALID_DIGEST,
    source: 'PLATFORM_NATIVE',
    operationId: 'op-fixture',
    requestId: 'request-fixture',
    actorPrincipal: 'fixture-platform-role',
    environment: 'non-production-fixture',
    boundArtifactDigest: EXPECTED_ARTIFACT_DIGEST,
    boundSourceCommit: EXPECTED_RELEASE_SOURCE_COMMIT,
    boundBuildRunId: EXPECTED_BUILD_RUN_ID,
    targetScopeApproved: true,
    providerGenerated: true,
    auditCorrelation: 'PASS',
    ...overrides
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function merge<T>(base: T, overrides: DeepPartial<T>): T {
  if (!isRecord(base) || !isRecord(overrides)) {
    return (overrides === undefined ? base : overrides) as T;
  }

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key];
    result[key] = isRecord(current) && isRecord(value) ? merge(current, value) : value;
  }
  return result as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
