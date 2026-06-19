import { GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION } from '../gameplay-capabilities/package-contract.js';
import { hashStableJson } from '../gameplay-capabilities/stable-json.js';

export const STEP36_READINESS_REPORT_KIND = 'step36_readiness_report';
export const STEP36_READINESS_REPORT_SCHEMA_VERSION = 'step36.readiness-report.v1';

export const STEP36_READINESS_STATUSES = ['READY', 'DESIGN_ONLY', 'BLOCKED', 'MISCONFIGURED'] as const;

export type CapabilitySynthesisFeatureFlags = {
  CAPABILITY_SYNTHESIS_ENABLED: boolean;
  CAPABILITY_SYNTHESIS_IMPLEMENTATION_ENABLED: boolean;
  CAPABILITY_SYNTHESIS_TYPED_MODULES_ENABLED: boolean;
  CAPABILITY_SYNTHESIS_REGISTRY_INSTALL_ENABLED: boolean;
  CAPABILITY_SYNTHESIS_REFERENCE_ONLY: boolean;
};

export const DEFAULT_CAPABILITY_SYNTHESIS_FEATURE_FLAGS: CapabilitySynthesisFeatureFlags = {
  CAPABILITY_SYNTHESIS_ENABLED: false,
  CAPABILITY_SYNTHESIS_IMPLEMENTATION_ENABLED: false,
  CAPABILITY_SYNTHESIS_TYPED_MODULES_ENABLED: false,
  CAPABILITY_SYNTHESIS_REGISTRY_INSTALL_ENABLED: false,
  CAPABILITY_SYNTHESIS_REFERENCE_ONLY: true
};

export type Step36ReadinessStatus = (typeof STEP36_READINESS_STATUSES)[number];

export type Step36ReadinessDiagnostic = {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
};

export type Step36ReadinessReport = {
  artifactKind: typeof STEP36_READINESS_REPORT_KIND;
  schemaVersion: typeof STEP36_READINESS_REPORT_SCHEMA_VERSION;
  status: Step36ReadinessStatus;
  step35RegistryReady: boolean;
  packageContractVersion: typeof GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION | string;
  sandboxAvailable: boolean;
  networkIsolationVerified: boolean;
  candidateStoreAvailable: boolean;
  oracleReviewConfigured: boolean;
  humanApprovalConfigured: boolean;
  registryInstallTransactionsAvailable: boolean;
  featureFlags: CapabilitySynthesisFeatureFlags;
  diagnostics: Step36ReadinessDiagnostic[];
  reportHash: string;
};

export type Step36ReadinessReportIntegrityIssue = {
  code:
    | 'STEP36_READINESS_ARTIFACT_KIND_INVALID'
    | 'STEP36_READINESS_SCHEMA_VERSION_INVALID'
    | 'STEP36_READINESS_PACKAGE_CONTRACT_INVALID'
    | 'STEP36_READINESS_ERROR_DIAGNOSTIC_PRESENT'
    | 'STEP36_READINESS_STATUS_DERIVATION_MISMATCH'
    | 'STEP36_READINESS_REPORT_HASH_MISMATCH';
  message: string;
};

export type Step36ReadinessReportIntegrity = {
  status: 'valid' | 'invalid';
  issues: Step36ReadinessReportIntegrityIssue[];
  expectedStatus: Step36ReadinessStatus;
  expectedReportHash: string;
};

export function canStep36ReadinessEnterImplementation(report: Step36ReadinessReport): boolean {
  const integrity = validateStep36ReadinessReportIntegrity(report);
  return (
    integrity.status === 'valid' &&
    report.status === 'READY' &&
    report.step35RegistryReady &&
    report.sandboxAvailable &&
    report.networkIsolationVerified &&
    report.candidateStoreAvailable &&
    report.oracleReviewConfigured &&
    report.humanApprovalConfigured &&
    report.registryInstallTransactionsAvailable &&
    report.featureFlags.CAPABILITY_SYNTHESIS_ENABLED &&
    report.featureFlags.CAPABILITY_SYNTHESIS_IMPLEMENTATION_ENABLED &&
    report.featureFlags.CAPABILITY_SYNTHESIS_TYPED_MODULES_ENABLED &&
    report.featureFlags.CAPABILITY_SYNTHESIS_REGISTRY_INSTALL_ENABLED &&
    !report.featureFlags.CAPABILITY_SYNTHESIS_REFERENCE_ONLY
  );
}

export function validateStep36ReadinessReportIntegrity(report: Step36ReadinessReport): Step36ReadinessReportIntegrity {
  const expectedStatus = deriveReadinessStatus(report);
  const expectedReportHash = hashStableJson(readinessReportPayload(report));
  const issues: Step36ReadinessReportIntegrityIssue[] = [
    ...(report.artifactKind === STEP36_READINESS_REPORT_KIND
      ? []
      : [
          {
            code: 'STEP36_READINESS_ARTIFACT_KIND_INVALID' as const,
            message: `Expected artifact kind ${STEP36_READINESS_REPORT_KIND}, received ${report.artifactKind}.`
          }
        ]),
    ...(report.schemaVersion === STEP36_READINESS_REPORT_SCHEMA_VERSION
      ? []
      : [
          {
            code: 'STEP36_READINESS_SCHEMA_VERSION_INVALID' as const,
            message: `Expected schema version ${STEP36_READINESS_REPORT_SCHEMA_VERSION}, received ${report.schemaVersion}.`
          }
        ]),
    ...(report.packageContractVersion === GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
      ? []
      : [
          {
            code: 'STEP36_READINESS_PACKAGE_CONTRACT_INVALID' as const,
            message: `Expected package contract ${GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION}, received ${report.packageContractVersion}.`
          }
        ]),
    ...(report.diagnostics.some((diagnostic) => diagnostic.severity === 'error')
      ? [
          {
            code: 'STEP36_READINESS_ERROR_DIAGNOSTIC_PRESENT' as const,
            message: 'Readiness report contains error diagnostics.'
          }
        ]
      : []),
    ...(report.status === expectedStatus
      ? []
      : [
          {
            code: 'STEP36_READINESS_STATUS_DERIVATION_MISMATCH' as const,
            message: `Readiness status ${report.status} does not match derived status ${expectedStatus}.`
          }
        ]),
    ...(report.reportHash === expectedReportHash
      ? []
      : [
          {
            code: 'STEP36_READINESS_REPORT_HASH_MISMATCH' as const,
            message: 'Readiness report hash does not match report payload.'
          }
        ])
  ].sort(compareIntegrityIssues);
  return {
    status: issues.length === 0 ? 'valid' : 'invalid',
    issues,
    expectedStatus,
    expectedReportHash
  };
}

export function buildStep36ReadinessReport(input: {
  step35RegistryReady: boolean;
  packageContractVersion?: string;
  sandboxAvailable: boolean;
  networkIsolationVerified: boolean;
  candidateStoreAvailable: boolean;
  oracleReviewConfigured: boolean;
  humanApprovalConfigured: boolean;
  registryInstallTransactionsAvailable: boolean;
  featureFlags?: Partial<CapabilitySynthesisFeatureFlags>;
  diagnostics?: readonly Step36ReadinessDiagnostic[];
}): Step36ReadinessReport {
  const featureFlags = { ...DEFAULT_CAPABILITY_SYNTHESIS_FEATURE_FLAGS, ...input.featureFlags };
  const diagnostics = [
    ...contractDiagnostics(input.packageContractVersion ?? GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION),
    ...disabledDiagnostics(featureFlags),
    ...serviceDiagnostics(input),
    ...(input.diagnostics ?? [])
  ].sort(compareDiagnostics);
  const status = deriveReadinessStatus({
    ...input,
    packageContractVersion: input.packageContractVersion ?? GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
    featureFlags,
    diagnostics
  });
  const payload: Omit<Step36ReadinessReport, 'reportHash'> = {
    artifactKind: STEP36_READINESS_REPORT_KIND,
    schemaVersion: STEP36_READINESS_REPORT_SCHEMA_VERSION,
    status,
    step35RegistryReady: input.step35RegistryReady,
    packageContractVersion: input.packageContractVersion ?? GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
    sandboxAvailable: input.sandboxAvailable,
    networkIsolationVerified: input.networkIsolationVerified,
    candidateStoreAvailable: input.candidateStoreAvailable,
    oracleReviewConfigured: input.oracleReviewConfigured,
    humanApprovalConfigured: input.humanApprovalConfigured,
    registryInstallTransactionsAvailable: input.registryInstallTransactionsAvailable,
    featureFlags,
    diagnostics
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function readinessReportPayload(report: Step36ReadinessReport): Omit<Step36ReadinessReport, 'reportHash'> {
  return {
    artifactKind: report.artifactKind,
    schemaVersion: report.schemaVersion,
    status: report.status,
    step35RegistryReady: report.step35RegistryReady,
    packageContractVersion: report.packageContractVersion,
    sandboxAvailable: report.sandboxAvailable,
    networkIsolationVerified: report.networkIsolationVerified,
    candidateStoreAvailable: report.candidateStoreAvailable,
    oracleReviewConfigured: report.oracleReviewConfigured,
    humanApprovalConfigured: report.humanApprovalConfigured,
    registryInstallTransactionsAvailable: report.registryInstallTransactionsAvailable,
    featureFlags: report.featureFlags,
    diagnostics: report.diagnostics
  };
}

function deriveReadinessStatus(input: {
  step35RegistryReady: boolean;
  packageContractVersion: string;
  sandboxAvailable: boolean;
  networkIsolationVerified: boolean;
  candidateStoreAvailable: boolean;
  oracleReviewConfigured: boolean;
  humanApprovalConfigured: boolean;
  registryInstallTransactionsAvailable: boolean;
  featureFlags: CapabilitySynthesisFeatureFlags;
  diagnostics: readonly Step36ReadinessDiagnostic[];
}): Step36ReadinessStatus {
  if (input.packageContractVersion !== GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION || input.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return 'MISCONFIGURED';
  }
  if (!input.featureFlags.CAPABILITY_SYNTHESIS_ENABLED) {
    return 'BLOCKED';
  }
  if (
    !input.step35RegistryReady ||
    !input.featureFlags.CAPABILITY_SYNTHESIS_IMPLEMENTATION_ENABLED ||
    !input.featureFlags.CAPABILITY_SYNTHESIS_TYPED_MODULES_ENABLED ||
    !input.featureFlags.CAPABILITY_SYNTHESIS_REGISTRY_INSTALL_ENABLED ||
    !input.sandboxAvailable ||
    !input.networkIsolationVerified ||
    !input.candidateStoreAvailable ||
    !input.oracleReviewConfigured ||
    !input.humanApprovalConfigured ||
    !input.registryInstallTransactionsAvailable
  ) {
    return 'DESIGN_ONLY';
  }
  return 'READY';
}

function contractDiagnostics(packageContractVersion: string): Step36ReadinessDiagnostic[] {
  return packageContractVersion === GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    ? []
    : [
        {
          code: 'CAP_SYNTH_PACKAGE_CONTRACT_VERSION_MISMATCH',
          severity: 'error',
          message: `Expected ${GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION}, received ${packageContractVersion}.`
        }
      ];
}

function disabledDiagnostics(flags: CapabilitySynthesisFeatureFlags): Step36ReadinessDiagnostic[] {
  return Object.entries(flags).flatMap(([flag, value]) => {
    if (flag === 'CAPABILITY_SYNTHESIS_REFERENCE_ONLY') {
      return [];
    }
    return value ? [] : [{ code: `${flag}_DISABLED`, severity: 'info' as const, message: `${flag} is disabled.` }];
  });
}

function serviceDiagnostics(input: {
  step35RegistryReady: boolean;
  sandboxAvailable: boolean;
  networkIsolationVerified: boolean;
  candidateStoreAvailable: boolean;
  oracleReviewConfigured: boolean;
  humanApprovalConfigured: boolean;
  registryInstallTransactionsAvailable: boolean;
}): Step36ReadinessDiagnostic[] {
  const entries = [
    ['CAP_SYNTH_STEP35_REGISTRY_NOT_READY', input.step35RegistryReady],
    ['CAP_SYNTH_SANDBOX_UNAVAILABLE', input.sandboxAvailable],
    ['CAP_SYNTH_NETWORK_ISOLATION_UNVERIFIED', input.networkIsolationVerified],
    ['CAP_SYNTH_CANDIDATE_STORE_UNAVAILABLE', input.candidateStoreAvailable],
    ['CAP_SYNTH_ORACLE_REVIEW_UNCONFIGURED', input.oracleReviewConfigured],
    ['CAP_SYNTH_HUMAN_APPROVAL_UNCONFIGURED', input.humanApprovalConfigured],
    ['CAP_SYNTH_REGISTRY_INSTALL_TX_UNAVAILABLE', input.registryInstallTransactionsAvailable]
  ] as const;
  return entries.flatMap(([code, ok]) => (ok ? [] : [{ code, severity: 'warning' as const, message: `${code} blocks implementation mode.` }]));
}

function compareDiagnostics(left: Step36ReadinessDiagnostic, right: Step36ReadinessDiagnostic): number {
  return `${left.severity}:${left.code}`.localeCompare(`${right.severity}:${right.code}`);
}

function compareIntegrityIssues(left: Step36ReadinessReportIntegrityIssue, right: Step36ReadinessReportIntegrityIssue): number {
  return `${left.code}:${left.message}`.localeCompare(`${right.code}:${right.message}`);
}
