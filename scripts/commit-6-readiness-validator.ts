import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const COMMIT_6_READINESS_VALIDATOR_VERSION = 'commit-6-readiness-validator.v0.1' as const;
export const COMMIT_6_READINESS_SCHEMA_VERSION = 'commit_6_readiness_validator_result.v0.1' as const;

export const EXPECTED_RELEASE_SOURCE_COMMIT = '81f92081da94cface172267fed6b2835922e35e7' as const;
export const EXPECTED_BUILD_RUN_ID = 'build_20260621T163428Z_7cc8af61' as const;
export const EXPECTED_ARTIFACT_DIGEST = 'sha256:7fa8a2e85ad65d37efead3875a0ff4bcac40810a30350d90dae1ded8e2f7fa2f' as const;

type CheckStatus = 'PASS' | 'BLOCKED' | 'FAIL';
type ValidatorResultStatus = 'PASS' | 'BLOCKED' | 'FAIL';
type ApprovalStatus = 'APPROVED' | 'NOT_APPROVED' | 'INVALID' | 'EXPIRED' | 'MISSING' | 'PENDING' | 'UNKNOWN' | 'REVOKED';
type ReceiptStatus = 'VERIFIED' | 'MISSING' | 'INVALID' | 'NOT_AUTHORIZED' | 'PENDING' | 'UNKNOWN';
type VerificationStatus = 'PASS' | 'FAIL' | 'NOT_RUN' | 'NOT_APPROVED' | 'PENDING' | 'UNKNOWN';
type SourceImpactClassification = 'CONTROL_PLANE_ONLY' | 'RELEASE_SOURCE_IMPACTING' | 'UNKNOWN';

export type Commit6RunbookEvidence = {
  status: 'APPROVED' | 'REVIEW_REQUIRED' | 'DRAFT' | 'NOT_AVAILABLE' | 'MISSING' | 'UNKNOWN';
  path?: string;
  documentVersion?: string;
  sha256?: string;
  boundSourceCommit?: string;
  boundBuildRunId?: string;
  artifactDigest?: string;
};

export type Commit6ApprovalEvidence = {
  status: ApprovalStatus;
  approvalId?: string;
  approverRole?: string;
  separationOfDutiesCheck?: 'PASS' | 'FAIL' | 'UNKNOWN';
  boundSourceCommit?: string;
  boundBuildRunId?: string;
  boundArtifactDigest?: string;
  boundEnvironment?: string;
  issuedAt?: string;
  expiresAt?: string;
  revocationStatus?: 'NOT_REVOKED' | 'REVOKED' | 'UNKNOWN';
  evidenceUri?: string;
  baselineDigest?: string;
  rollbackTargetDigest?: string;
  maxTrafficPercentage?: number;
};

export type Commit6ReceiptEvidence = {
  status: ReceiptStatus;
  receiptId?: string;
  receiptSha256?: string;
  source: 'PLATFORM_NATIVE' | 'DRY_RUN' | 'FIXTURE' | 'SYNTHETIC' | 'HAND_WRITTEN' | 'UNKNOWN';
  operationId?: string;
  requestId?: string;
  actorPrincipal?: string;
  environment?: string;
  boundArtifactDigest?: string;
  boundSourceCommit?: string;
  boundBuildRunId?: string;
  targetScopeApproved?: boolean;
  providerGenerated?: boolean;
  auditCorrelation?: 'PASS' | 'FAIL' | 'NOT_RUN' | 'UNKNOWN';
  canaryTrafficPercentage?: number;
  rollbackTargetDigest?: string;
};

export type Commit6ReadinessValidatorInput = {
  schemaVersion: 'commit_6_readiness_validator_input.v0.1';
  verificationRunId: string;
  releaseSourceCommit: string;
  buildRunId: string;
  artifactDigest: string;
  wp4Status: string;
  wp4SlsCorrelation: string;
  sourceImpactClassification: SourceImpactClassification;
  deploymentRunbook: Commit6RunbookEvidence;
  rollbackRunbook: Commit6RunbookEvidence;
  sliParityCriteria: Commit6RunbookEvidence & { baselineStatus?: ApprovalStatus };
  approvals: {
    approvedBaseline: Commit6ApprovalEvidence;
    approvedRollbackTarget: Commit6ApprovalEvidence;
    approvedCanaryScope: Commit6ApprovalEvidence;
    safeRollbackAuthorization: Commit6ApprovalEvidence;
    rollbackDrillAuthorization: Commit6ApprovalEvidence;
  };
  receipts: {
    deploy: Commit6ReceiptEvidence;
    canary: Commit6ReceiptEvidence;
    rollback: Commit6ReceiptEvidence;
  };
  sliVerification: VerificationStatus;
  parityVerification: VerificationStatus;
  productionDeploymentPerformed: boolean;
};

export type Commit6ReadinessCheck = {
  id: string;
  status: CheckStatus;
  reasonCode?: string;
  message: string;
};

export type Commit6ReadinessValidatorResult = {
  schemaVersion: typeof COMMIT_6_READINESS_SCHEMA_VERSION;
  validatorVersion: typeof COMMIT_6_READINESS_VALIDATOR_VERSION;
  validatorCommit: string;
  verificationRunId: string;
  evaluatedAt: string;
  releaseSourceCommit: string;
  buildRunId: string;
  artifactDigest: string;
  result: ValidatorResultStatus;
  exitCode: number;
  checks: Commit6ReadinessCheck[];
  reasonCodes: string[];
  missingEvidence: string[];
  invalidEvidence: string[];
  approvalSummary: Record<keyof Commit6ReadinessValidatorInput['approvals'], ApprovalStatus>;
  receiptSummary: Record<keyof Commit6ReadinessValidatorInput['receipts'], ReceiptStatus>;
  sourceImpactClassification: SourceImpactClassification;
  productionDeploymentAuthorized: false;
  releaseAuthorization: false;
  commit6GateAuthorized: false;
};

type ValidateOptions = {
  evaluatedAt?: string;
  validatorCommit?: string;
};

const REQUIRED_APPROVALS: Array<keyof Commit6ReadinessValidatorInput['approvals']> = [
  'approvedBaseline',
  'approvedRollbackTarget',
  'approvedCanaryScope',
  'safeRollbackAuthorization',
  'rollbackDrillAuthorization'
];

const REQUIRED_RECEIPTS: Array<keyof Commit6ReadinessValidatorInput['receipts']> = ['deploy', 'canary', 'rollback'];

export function validateCommit6Readiness(input: Commit6ReadinessValidatorInput, options: ValidateOptions = {}): Commit6ReadinessValidatorResult {
  const checks: Commit6ReadinessCheck[] = [];
  const evaluatedAt = options.evaluatedAt ?? new Date().toISOString();

  checks.push(requiredEqual('release_source_commit', input.releaseSourceCommit, EXPECTED_RELEASE_SOURCE_COMMIT, 'SOURCE_COMMIT_MISMATCH'));
  checks.push(requiredEqual('build_run_id', input.buildRunId, EXPECTED_BUILD_RUN_ID, 'BUILD_RUN_ID_MISMATCH'));
  checks.push(requiredEqual('artifact_digest', input.artifactDigest, EXPECTED_ARTIFACT_DIGEST, 'ARTIFACT_DIGEST_MISMATCH'));
  checks.push(
    passOrBlock(
      'wp4_status',
      input.wp4Status === 'PASS_WITH_APPROVED_COMPENSATING_CORRELATION',
      'WP4_STATUS_NOT_ALLOWED',
      `WP4 status is ${input.wp4Status}.`
    )
  );
  checks.push(
    passOrBlock(
      'wp4_sls_correlation',
      input.wp4SlsCorrelation === 'PASS_9_OF_9_WITH_REQUEST_ID_CORRECTION',
      'WP4_SLS_CORRELATION_NOT_PASS',
      `WP4 SLS correlation is ${input.wp4SlsCorrelation}.`
    )
  );
  checks.push(validateSourceImpact(input.sourceImpactClassification));
  checks.push(validateRunbook('deployment_runbook', input.deploymentRunbook));
  checks.push(validateRunbook('rollback_runbook', input.rollbackRunbook));
  checks.push(validateRunbook('sli_parity_criteria', input.sliParityCriteria));
  checks.push(
    passOrBlock(
      'sli_parity_baseline_status',
      input.sliParityCriteria.baselineStatus === 'APPROVED',
      'SLI_PARITY_BASELINE_NOT_APPROVED',
      `SLI/parity baseline status is ${input.sliParityCriteria.baselineStatus ?? 'MISSING'}.`
    )
  );

  for (const key of REQUIRED_APPROVALS) {
    checks.push(validateApproval(key, input.approvals[key], evaluatedAt));
  }

  checks.push(validateCanaryScope(input.approvals.approvedCanaryScope, input.receipts.canary));
  checks.push(validateRollbackTarget(input.approvals.approvedRollbackTarget, input.receipts.rollback));

  for (const key of REQUIRED_RECEIPTS) {
    checks.push(validateReceipt(key, input.receipts[key]));
  }

  checks.push(validateVerificationStatus('sli_verification', input.sliVerification, 'SLI_VERIFICATION_NOT_PASS'));
  checks.push(validateVerificationStatus('parity_verification', input.parityVerification, 'PARITY_VERIFICATION_NOT_PASS'));
  checks.push(
    passOrFail(
      'production_deployment_not_performed',
      input.productionDeploymentPerformed === false,
      'PRODUCTION_DEPLOYMENT_ALREADY_PERFORMED',
      'Production deployment must not be performed during WP5.'
    )
  );

  const reasonCodes = checks.filter((check) => check.status !== 'PASS').map((check) => check.reasonCode ?? `${check.id.toUpperCase()}_${check.status}`);
  const invalidEvidence = checks.filter((check) => check.status === 'FAIL').map((check) => check.reasonCode ?? check.id);
  const missingEvidence = checks.filter((check) => check.status === 'BLOCKED').map((check) => check.reasonCode ?? check.id);
  const result: ValidatorResultStatus = checks.every((check) => check.status === 'PASS') ? 'PASS' : invalidEvidence.length > 0 ? 'FAIL' : 'BLOCKED';

  return {
    schemaVersion: COMMIT_6_READINESS_SCHEMA_VERSION,
    validatorVersion: COMMIT_6_READINESS_VALIDATOR_VERSION,
    validatorCommit: options.validatorCommit ?? 'WORKTREE',
    verificationRunId: input.verificationRunId,
    evaluatedAt,
    releaseSourceCommit: input.releaseSourceCommit,
    buildRunId: input.buildRunId,
    artifactDigest: input.artifactDigest,
    result,
    exitCode: result === 'PASS' ? 0 : 1,
    checks,
    reasonCodes,
    missingEvidence,
    invalidEvidence,
    approvalSummary: {
      approvedBaseline: input.approvals.approvedBaseline.status,
      approvedRollbackTarget: input.approvals.approvedRollbackTarget.status,
      approvedCanaryScope: input.approvals.approvedCanaryScope.status,
      safeRollbackAuthorization: input.approvals.safeRollbackAuthorization.status,
      rollbackDrillAuthorization: input.approvals.rollbackDrillAuthorization.status
    },
    receiptSummary: {
      deploy: input.receipts.deploy.status,
      canary: input.receipts.canary.status,
      rollback: input.receipts.rollback.status
    },
    sourceImpactClassification: input.sourceImpactClassification,
    productionDeploymentAuthorized: false,
    releaseAuthorization: false,
    commit6GateAuthorized: false
  };
}

function validateSourceImpact(value: SourceImpactClassification): Commit6ReadinessCheck {
  if (value === 'CONTROL_PLANE_ONLY') {
    return pass('source_impact_classification', 'Source impact is control-plane only.');
  }

  const reasonCode = value === 'RELEASE_SOURCE_IMPACTING' ? 'WP4_RERUN_REQUIRED_SOURCE_IMPACT' : 'SOURCE_IMPACT_UNKNOWN';
  return {
    id: 'source_impact_classification',
    status: value === 'RELEASE_SOURCE_IMPACTING' ? 'FAIL' : 'BLOCKED',
    reasonCode,
    message: `Source impact classification is ${value}.`
  };
}

function validateRunbook(id: string, evidence: Commit6RunbookEvidence): Commit6ReadinessCheck {
  if (evidence.status !== 'APPROVED') {
    return {
      id,
      status: 'BLOCKED',
      reasonCode: `${id.toUpperCase()}_NOT_APPROVED`,
      message: `${id} status is ${evidence.status}.`
    };
  }

  for (const [field, expected] of [
    ['boundSourceCommit', EXPECTED_RELEASE_SOURCE_COMMIT],
    ['boundBuildRunId', EXPECTED_BUILD_RUN_ID],
    ['artifactDigest', EXPECTED_ARTIFACT_DIGEST]
  ] as const) {
    if (evidence[field] !== expected) {
      return {
        id,
        status: 'FAIL',
        reasonCode: `${id.toUpperCase()}_${field.toUpperCase()}_MISMATCH`,
        message: `${id} ${field} is ${evidence[field] ?? 'MISSING'}.`
      };
    }
  }

  if (!isSha256(evidence.sha256)) {
    return {
      id,
      status: 'BLOCKED',
      reasonCode: `${id.toUpperCase()}_DIGEST_MISSING`,
      message: `${id} must include a sha256 digest.`
    };
  }

  if (isBlank(evidence.path) || isBlank(evidence.documentVersion)) {
    return {
      id,
      status: 'BLOCKED',
      reasonCode: `${id.toUpperCase()}_VERSIONED_LOCATION_MISSING`,
      message: `${id} must include a versioned path and document version.`
    };
  }

  return pass(id, `${id} is approved and bound to the expected release evidence.`);
}

function validateApproval(id: keyof Commit6ReadinessValidatorInput['approvals'], evidence: Commit6ApprovalEvidence, evaluatedAt: string): Commit6ReadinessCheck {
  if (evidence.status !== 'APPROVED') {
    return {
      id,
      status: evidence.status === 'INVALID' || evidence.status === 'REVOKED' ? 'FAIL' : 'BLOCKED',
      reasonCode: `${id.toUpperCase()}_${evidence.status}`,
      message: `${id} approval status is ${evidence.status}.`
    };
  }

  if (evidence.separationOfDutiesCheck !== 'PASS') {
    return fail(id, `${id.toUpperCase()}_SEPARATION_OF_DUTIES_NOT_PASS`, `${id} separation-of-duties check is not PASS.`);
  }

  if (evidence.revocationStatus !== 'NOT_REVOKED') {
    return fail(id, `${id.toUpperCase()}_REVOKED_OR_UNKNOWN`, `${id} revocation status is ${evidence.revocationStatus ?? 'MISSING'}.`);
  }

  if (evidence.boundSourceCommit !== EXPECTED_RELEASE_SOURCE_COMMIT) {
    return fail(id, `${id.toUpperCase()}_SOURCE_COMMIT_MISMATCH`, `${id} source commit binding does not match.`);
  }

  if (evidence.boundBuildRunId !== EXPECTED_BUILD_RUN_ID) {
    return fail(id, `${id.toUpperCase()}_BUILD_RUN_MISMATCH`, `${id} build run binding does not match.`);
  }

  if (evidence.boundArtifactDigest !== EXPECTED_ARTIFACT_DIGEST) {
    return fail(id, `${id.toUpperCase()}_ARTIFACT_DIGEST_MISMATCH`, `${id} artifact digest binding does not match.`);
  }

  if (isBlank(evidence.approvalId) || isBlank(evidence.approverRole) || isBlank(evidence.evidenceUri) || isBlank(evidence.boundEnvironment)) {
    return block(id, `${id.toUpperCase()}_AUTHORITY_REFERENCE_MISSING`, `${id} approval must include approver role, environment, and authority reference.`);
  }

  if (!isValidDate(evidence.issuedAt) || !isValidDate(evidence.expiresAt)) {
    return block(id, `${id.toUpperCase()}_DATE_MISSING`, `${id} approval issuedAt/expiresAt must be valid date-time strings.`);
  }

  if (new Date(evidence.expiresAt) <= new Date(evaluatedAt)) {
    return block(id, `${id.toUpperCase()}_EXPIRED`, `${id} approval expired at ${evidence.expiresAt}.`);
  }

  return pass(id, `${id} approval is valid.`);
}

function validateReceipt(id: keyof Commit6ReadinessValidatorInput['receipts'], evidence: Commit6ReceiptEvidence): Commit6ReadinessCheck {
  if (evidence.status !== 'VERIFIED') {
    return {
      id: `${id}_receipt`,
      status: evidence.status === 'INVALID' ? 'FAIL' : 'BLOCKED',
      reasonCode: `${id.toUpperCase()}_RECEIPT_${evidence.status}`,
      message: `${id} receipt status is ${evidence.status}.`
    };
  }

  if (evidence.source !== 'PLATFORM_NATIVE' || evidence.providerGenerated !== true) {
    return fail(`${id}_receipt`, `${id.toUpperCase()}_RECEIPT_NOT_PLATFORM_NATIVE`, `${id} receipt source is ${evidence.source}.`);
  }

  if (isBlank(evidence.operationId) && isBlank(evidence.requestId)) {
    return fail(`${id}_receipt`, `${id.toUpperCase()}_OPERATION_ID_MISSING`, `${id} receipt must include operationId or requestId.`);
  }

  if (evidence.boundArtifactDigest !== EXPECTED_ARTIFACT_DIGEST) {
    return fail(`${id}_receipt`, `${id.toUpperCase()}_ARTIFACT_DIGEST_MISMATCH`, `${id} receipt artifact digest does not match.`);
  }

  if (evidence.boundSourceCommit !== EXPECTED_RELEASE_SOURCE_COMMIT) {
    return fail(`${id}_receipt`, `${id.toUpperCase()}_SOURCE_COMMIT_MISMATCH`, `${id} receipt source commit does not match.`);
  }

  if (evidence.boundBuildRunId !== EXPECTED_BUILD_RUN_ID) {
    return fail(`${id}_receipt`, `${id.toUpperCase()}_BUILD_RUN_MISMATCH`, `${id} receipt build run does not match.`);
  }

  if (evidence.targetScopeApproved !== true) {
    return fail(`${id}_receipt`, `${id.toUpperCase()}_TARGET_SCOPE_NOT_APPROVED`, `${id} receipt target scope is not approved.`);
  }

  if (!isSha256(evidence.receiptSha256) || isBlank(evidence.receiptId) || isBlank(evidence.actorPrincipal) || isBlank(evidence.environment)) {
    return block(`${id}_receipt`, `${id.toUpperCase()}_RECEIPT_METADATA_MISSING`, `${id} receipt metadata is incomplete.`);
  }

  return pass(`${id}_receipt`, `${id} receipt is verified.`);
}

function validateCanaryScope(approval: Commit6ApprovalEvidence, receipt: Commit6ReceiptEvidence): Commit6ReadinessCheck {
  if (approval.status !== 'APPROVED' || receipt.status !== 'VERIFIED') {
    return block('canary_scope_limit', 'CANARY_SCOPE_OR_RECEIPT_NOT_READY', 'Canary scope limit cannot be evaluated until approval and receipt are verified.');
  }

  if (approval.maxTrafficPercentage === undefined || receipt.canaryTrafficPercentage === undefined) {
    return block('canary_scope_limit', 'CANARY_TRAFFIC_SCOPE_MISSING', 'Canary traffic scope must be present in both approval and receipt.');
  }

  if (receipt.canaryTrafficPercentage > approval.maxTrafficPercentage) {
    return fail('canary_scope_limit', 'CANARY_SCOPE_EXCEEDED', 'Canary traffic percentage exceeds approval scope.');
  }

  return pass('canary_scope_limit', 'Canary scope is within approval.');
}

function validateRollbackTarget(approval: Commit6ApprovalEvidence, receipt: Commit6ReceiptEvidence): Commit6ReadinessCheck {
  if (approval.status !== 'APPROVED' || receipt.status !== 'VERIFIED') {
    return block('rollback_target_binding', 'ROLLBACK_TARGET_OR_RECEIPT_NOT_READY', 'Rollback target binding cannot be evaluated until approval and receipt are verified.');
  }

  if (isBlank(approval.rollbackTargetDigest) || isBlank(receipt.rollbackTargetDigest)) {
    return block('rollback_target_binding', 'ROLLBACK_TARGET_DIGEST_MISSING', 'Rollback target digest must be present in approval and receipt.');
  }

  if (approval.rollbackTargetDigest !== receipt.rollbackTargetDigest) {
    return fail('rollback_target_binding', 'ROLLBACK_TARGET_DIGEST_MISMATCH', 'Rollback target digest differs between approval and receipt.');
  }

  return pass('rollback_target_binding', 'Rollback target digest is verified.');
}

function validateVerificationStatus(id: string, value: VerificationStatus, reasonCode: string): Commit6ReadinessCheck {
  if (value === 'PASS') {
    return pass(id, `${id} passed.`);
  }

  return {
    id,
    status: value === 'FAIL' ? 'FAIL' : 'BLOCKED',
    reasonCode,
    message: `${id} status is ${value}.`
  };
}

function requiredEqual(id: string, actual: string, expected: string, reasonCode: string): Commit6ReadinessCheck {
  return passOrFail(id, actual === expected, reasonCode, `${id} expected ${expected} but received ${actual}.`);
}

function pass(id: string, message: string): Commit6ReadinessCheck {
  return { id, status: 'PASS', message };
}

function block(id: string, reasonCode: string, message: string): Commit6ReadinessCheck {
  return { id, status: 'BLOCKED', reasonCode, message };
}

function fail(id: string, reasonCode: string, message: string): Commit6ReadinessCheck {
  return { id, status: 'FAIL', reasonCode, message };
}

function passOrBlock(id: string, condition: boolean, reasonCode: string, message: string): Commit6ReadinessCheck {
  return condition ? pass(id, message) : block(id, reasonCode, message);
}

function passOrFail(id: string, condition: boolean, reasonCode: string, message: string): Commit6ReadinessCheck {
  return condition ? pass(id, message) : fail(id, reasonCode, message);
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

function isSha256(value: string | undefined): boolean {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isValidDate(value: string | undefined): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function parseArgs(argv: string[]): { inputPath?: string; outputPath?: string; evaluatedAt?: string; validatorCommit?: string } {
  const parsed: { inputPath?: string; outputPath?: string; evaluatedAt?: string; validatorCommit?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--input') {
      parsed.inputPath = next;
      index += 1;
    } else if (arg === '--out') {
      parsed.outputPath = next;
      index += 1;
    } else if (arg === '--evaluated-at') {
      parsed.evaluatedAt = next;
      index += 1;
    } else if (arg === '--validator-commit') {
      parsed.validatorCommit = next;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function readInput(path: string): Commit6ReadinessValidatorInput {
  return JSON.parse(readFileSync(path, 'utf8')) as Commit6ReadinessValidatorInput;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.inputPath === undefined) {
    throw new Error('Missing required --input path.');
  }

  const result = validateCommit6Readiness(readInput(args.inputPath), {
    evaluatedAt: args.evaluatedAt,
    validatorCommit: args.validatorCommit
  });

  if (args.outputPath !== undefined) {
    writeJson(args.outputPath, result);
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }

  process.exitCode = result.exitCode;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
  });
}
