import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import type { CapabilityApprovalRole, CapabilityOracleReviewFinding } from './candidate-approval.js';
import { canAnyCapabilitySynthesisRolePerform, type CapabilitySynthesisRole } from './permissions.js';
import type { RegistryInstallPrecheck } from './registry-install.js';

export const CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION = 'step36.capability-workbench-ux.v1';
export const CREATOR_CAPABILITY_STATUS_VIEW_KIND = 'creator_capability_status_view';
export const WORKBENCH_PREVIEW_LABEL_REPORT_KIND = 'workbench_preview_label_report';
export const MAINTAINER_CAPABILITY_REVIEW_DASHBOARD_KIND = 'maintainer_capability_review_dashboard';
export const CANDIDATE_SOURCE_REVIEW_VIEW_KIND = 'candidate_source_review_view';
export const CAPABILITY_EVIDENCE_PANEL_KIND = 'capability_evidence_panel';
export const APPROVAL_CONTROL_STATE_KIND = 'approval_control_state';
export const REGISTRY_INSTALL_CONTROL_STATE_KIND = 'registry_install_control_state';
export const REGISTRY_INSTALL_READINESS_EVIDENCE_KIND = 'registry_install_readiness_evidence';
export const REGISTRY_INSTALL_READINESS_RECEIPT_KIND = 'registry_install_readiness_receipt';
export const REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE = 'trusted-artifact-store:capability-workbench-install-readiness';
export const WORKBENCH_AUDIT_TIMELINE_KIND = 'workbench_audit_timeline';

const TRUSTED_INSTALL_READINESS_ISSUERS = new Set(['maker-api.workbench-install-readiness-orchestrator']);

export type WorkbenchPreviewSourceKind =
  | 'active_game'
  | 'step34_game_candidate'
  | 'capability_sandbox_preview'
  | 'installed_experimental_capability_preview'
  | 'supported_capability';

export type WorkbenchEvidenceStatus = 'passed' | 'failed' | 'missing' | 'inconclusive';
export type WorkbenchControlStatus = 'enabled' | 'disabled' | 'hidden';

export type CapabilityWorkbenchUxIssue = {
  code:
    | 'CREATOR_FORBIDDEN_SURFACE_EXPOSED'
    | 'CREATOR_FALSE_PROMISE_REJECTED'
    | 'PREVIEW_LABEL_HASH_MISSING'
    | 'PREVIEW_LABEL_UNSUPPORTED_PROMOTION'
    | 'DASHBOARD_ARTIFACT_REF_MISSING'
    | 'SOURCE_REVIEW_TRACE_MISSING'
    | 'EVIDENCE_ROW_INCOMPLETE'
    | 'APPROVAL_CONTROL_BACKEND_GATE_FAILED'
    | 'APPROVAL_CONTROL_FORBIDDEN_ROLE'
    | 'APPROVAL_CONTROL_LOCAL_STATE_IGNORED'
    | 'INSTALL_CONTROL_BACKEND_GATE_FAILED'
    | 'INSTALL_CONTROL_FORBIDDEN_ROLE'
    | 'INSTALL_CONTROL_LOCAL_STATE_IGNORED'
    | 'AUDIT_TIMELINE_EVENT_HASH_MISMATCH'
    | 'AUDIT_TIMELINE_MUTATION_FORBIDDEN';
  message: string;
  path?: string;
};

export type CreatorCapabilityStatusView = {
  artifactKind: typeof CREATOR_CAPABILITY_STATUS_VIEW_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  requestId: string;
  actorRoles: CapabilitySynthesisRole[];
  summary: string;
  reusableCapabilities: string[];
  missingCapability?: string;
  currentStage: string;
  waitingReason?: string;
  nextMaintainerAction?: string;
  rejectedUnsafeFallbacks: string[];
  visibleSurfaces: string[];
  hiddenSurfaces: string[];
  statusCopy: string[];
  issues: CapabilityWorkbenchUxIssue[];
  viewHash: string;
};

export type WorkbenchPreviewLabelReport = {
  artifactKind: typeof WORKBENCH_PREVIEW_LABEL_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  previews: Array<{
    previewId: string;
    sourceKind: WorkbenchPreviewSourceKind;
    label: string;
    textReason: string;
    sourceArtifactHash: string;
    supportedReadiness: boolean;
  }>;
  issues: CapabilityWorkbenchUxIssue[];
  reportHash: string;
};

export type MaintainerCapabilityReviewDashboard = {
  artifactKind: typeof MAINTAINER_CAPABILITY_REVIEW_DASHBOARD_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  requestId: string;
  visibleToRoles: CapabilitySynthesisRole[];
  artifactRefs: WorkbenchArtifactRef[];
  timelineHash: string;
  issues: CapabilityWorkbenchUxIssue[];
  dashboardHash: string;
};

export type CandidateSourceReviewView = {
  artifactKind: typeof CANDIDATE_SOURCE_REVIEW_VIEW_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  fileDiffs: Array<{ path: string; beforeHash?: string; afterHash: string; status: 'added' | 'modified' | 'removed' }>;
  forbiddenApiHighlights: Array<{ path: string; api: string; severity: 'blocked' | 'warning' }>;
  sdkCallGraphHash: string;
  ownershipMapHash: string;
  specToCodeTraceHash: string;
  testToRequirementTraceHash: string;
  modelProvenanceHash: string;
  attemptComparisonHash: string;
  issues: CapabilityWorkbenchUxIssue[];
  viewHash: string;
};

export type CapabilityEvidencePanel = {
  artifactKind: typeof CAPABILITY_EVIDENCE_PANEL_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  requestId: string;
  rows: CapabilityEvidencePanelRow[];
  overallStatus: WorkbenchEvidenceStatus;
  issues: CapabilityWorkbenchUxIssue[];
  panelHash: string;
};

export type CapabilityEvidencePanelRow = {
  requirementId: string;
  requirement: string;
  inputAction: string;
  observationSource: string;
  assertion: string;
  status: WorkbenchEvidenceStatus;
  evidenceArtifact: string;
  artifactHash: string;
};

export type ApprovalControlState = {
  artifactKind: typeof APPROVAL_CONTROL_STATE_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  status: WorkbenchControlStatus;
  requestedRole: CapabilityApprovalRole;
  actorRoles: CapabilitySynthesisRole[];
  serverDerived: true;
  reasons: string[];
  issues: CapabilityWorkbenchUxIssue[];
  controlHash: string;
};

export type RegistryInstallControlState = {
  artifactKind: typeof REGISTRY_INSTALL_CONTROL_STATE_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  packageId: string;
  packageVersion: string;
  packageHash: string;
  status: WorkbenchControlStatus;
  actorRoles: CapabilitySynthesisRole[];
  targetRegistryStatus: 'experimental_complete';
  beforeSnapshotHash: string;
  canaryPlanHash: string;
  rollbackTargetSnapshotHash: string;
  affectedProfiles: string[];
  oldLocksRemainUnchanged: boolean;
  serverDerived: true;
  reasons: string[];
  issues: CapabilityWorkbenchUxIssue[];
  controlHash: string;
};

export type RegistryInstallReadinessEvidence = {
  artifactKind: typeof REGISTRY_INSTALL_READINESS_EVIDENCE_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  status: 'ready' | 'blocked';
  requestId: string;
  attemptId: string;
  precheckHash: string;
  approvalValidityHash: string;
  approvalValidityReceiptHash: string;
  registryAdminAuthorizationHash: string;
  packageId: string;
  packageVersion: string;
  packageHash: string;
  beforeSnapshotHash: string;
  canaryPlanHash: string;
  rollbackTargetSnapshotHash: string;
  writerLockProofHash: string;
  currentRefsHash: string;
  oldLocksRemainUnchanged: boolean;
  issues: CapabilityWorkbenchUxIssue[];
  evidenceHash: string;
};

export type RegistryInstallReadinessReceipt = {
  artifactKind: typeof REGISTRY_INSTALL_READINESS_RECEIPT_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  receiptId: string;
  trustedArtifactRef: {
    namespace: typeof REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof REGISTRY_INSTALL_READINESS_RECEIPT_KIND | string;
  };
  subject: {
    requestId: string;
    attemptId: string;
    evidenceHash: string;
    precheckHash: string;
    approvalValidityHash: string;
    approvalValidityReceiptHash: string;
    registryAdminAuthorizationHash: string;
    packageId: string;
    packageVersion: string;
    packageHash: string;
    currentRefsHash: string;
  };
  issuer: {
    serviceId: string;
    keyId?: string;
    issuedAt: string;
  };
  receiptHash: string;
};

export type RegistryInstallReadinessReceiptResolver = {
  namespace: typeof REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE | string;
  resolveReceipt(ref: RegistryInstallReadinessReceipt['trustedArtifactRef']): RegistryInstallReadinessReceipt | undefined;
};

export type WorkbenchAuditTimeline = {
  artifactKind: typeof WORKBENCH_AUDIT_TIMELINE_KIND;
  schemaVersion: typeof CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION;
  requestId: string;
  previousTimelineHash?: string;
  previousLastEventHash?: string;
  entries: WorkbenchAuditTimelineEntry[];
  issues: CapabilityWorkbenchUxIssue[];
  timelineHash: string;
};

export type WorkbenchAuditTimelineEntry = {
  eventId: string;
  actorRole: CapabilitySynthesisRole;
  action: string;
  textReason: string;
  artifactRefs: WorkbenchArtifactRef[];
  previousEventHash?: string;
  correctionOfEventHash?: string;
  attemptedMutationOfEventHash?: string;
  eventHash: string;
};

export type WorkbenchArtifactRef = {
  artifactKind: string;
  path: string;
  artifactHash: string;
};

export function buildCreatorCapabilityStatusView(input: {
  requestId: string;
  actorRoles: readonly CapabilitySynthesisRole[];
  summary: string;
  reusableCapabilities?: readonly string[];
  missingCapability?: string;
  currentStage: string;
  waitingReason?: string;
  nextMaintainerAction?: string;
  rejectedUnsafeFallbacks?: readonly string[];
  requestedVisibleSurfaces?: readonly string[];
  untrustedStatusClaims?: readonly string[];
}): CreatorCapabilityStatusView {
  const actorRoles = uniqueStrings(input.actorRoles) as CapabilitySynthesisRole[];
  const requestedSurfaces = uniqueStrings(input.requestedVisibleSurfaces ?? []);
  const forbiddenSurfaces = requestedSurfaces.filter((surface) => CREATOR_FORBIDDEN_SURFACES.has(surface));
  const falsePromises = uniqueStrings(input.untrustedStatusClaims ?? []).filter(isFalsePromise);
  const issues = [
    ...forbiddenSurfaces.map((surface) =>
      issue('CREATOR_FORBIDDEN_SURFACE_EXPOSED', `Creator view cannot expose ${surface}.`, surface)
    ),
    ...falsePromises.map((claim) =>
      issue('CREATOR_FALSE_PROMISE_REJECTED', `Creator view rejected false promise: ${claim}.`, claim)
    )
  ].sort(compareIssues);
  const hiddenSurfaces = uniqueStrings([...CREATOR_FORBIDDEN_SURFACES]);
  const payload: Omit<CreatorCapabilityStatusView, 'viewHash'> = {
    artifactKind: CREATOR_CAPABILITY_STATUS_VIEW_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    requestId: input.requestId,
    actorRoles,
    summary: input.summary,
    reusableCapabilities: uniqueStrings(input.reusableCapabilities ?? []),
    ...(hasText(input.missingCapability) ? { missingCapability: input.missingCapability.trim() } : {}),
    currentStage: input.currentStage,
    ...(hasText(input.waitingReason) ? { waitingReason: input.waitingReason.trim() } : {}),
    ...(hasText(input.nextMaintainerAction) ? { nextMaintainerAction: input.nextMaintainerAction.trim() } : {}),
    rejectedUnsafeFallbacks: uniqueStrings(input.rejectedUnsafeFallbacks ?? []),
    visibleSurfaces: ['capability_status', 'reuse_summary', 'missing_capability', 'waiting_reason', 'rejected_unsafe_fallbacks'],
    hiddenSurfaces,
    statusCopy: creatorStatusCopy(input),
    issues
  };
  return { ...payload, viewHash: hashStableJson(payload) };
}

export function buildWorkbenchPreviewLabelReport(input: {
  previews: ReadonlyArray<{
    previewId: string;
    sourceKind: WorkbenchPreviewSourceKind;
    sourceArtifactHash: string;
    localLabelOverride?: string;
  }>;
}): WorkbenchPreviewLabelReport {
  const previews = input.previews
    .map((preview) => {
      const label = previewLabel(preview.sourceKind);
      return {
        previewId: preview.previewId,
        sourceKind: preview.sourceKind,
        label,
        textReason: previewTextReason(preview.sourceKind),
        sourceArtifactHash: preview.sourceArtifactHash.trim(),
        supportedReadiness: preview.sourceKind === 'supported_capability'
      };
    })
    .sort((left, right) => left.previewId.localeCompare(right.previewId));
  const issues = input.previews.flatMap((preview, index) => [
    ...(hasText(preview.sourceArtifactHash)
      ? []
      : [issue('PREVIEW_LABEL_HASH_MISSING', 'Preview label requires a source artifact hash.', `previews.${index}.sourceArtifactHash`)]),
    ...(preview.sourceKind !== 'supported_capability' && preview.localLabelOverride === 'SUPPORTED CAPABILITY'
      ? [issue('PREVIEW_LABEL_UNSUPPORTED_PROMOTION', 'Local label cannot promote candidate, sandbox or experimental preview to supported.', preview.previewId)]
      : [])
  ]).sort(compareIssues);
  const payload: Omit<WorkbenchPreviewLabelReport, 'reportHash'> = {
    artifactKind: WORKBENCH_PREVIEW_LABEL_REPORT_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    previews,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildMaintainerCapabilityReviewDashboard(input: {
  requestId: string;
  actorRoles: readonly CapabilitySynthesisRole[];
  artifactRefs: readonly WorkbenchArtifactRef[];
}): MaintainerCapabilityReviewDashboard {
  const artifactRefs = normalizeArtifactRefs(input.artifactRefs);
  const issues = missingArtifactRefIssues(artifactRefs, 'DASHBOARD_ARTIFACT_REF_MISSING');
  const payload: Omit<MaintainerCapabilityReviewDashboard, 'dashboardHash'> = {
    artifactKind: MAINTAINER_CAPABILITY_REVIEW_DASHBOARD_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    requestId: input.requestId,
    visibleToRoles: uniqueStrings(input.actorRoles).filter((role) => role !== 'creator') as CapabilitySynthesisRole[],
    artifactRefs,
    timelineHash: hashStableJson(artifactRefs),
    issues
  };
  return { ...payload, dashboardHash: hashStableJson(payload) };
}

export function buildCandidateSourceReviewView(input: {
  requestId: string;
  attemptId: string;
  fileDiffs: CandidateSourceReviewView['fileDiffs'];
  forbiddenApiHighlights?: CandidateSourceReviewView['forbiddenApiHighlights'];
  sdkCallGraphHash: string;
  ownershipMapHash: string;
  specToCodeTraceHash: string;
  testToRequirementTraceHash: string;
  modelProvenanceHash: string;
  attemptComparisonHash: string;
}): CandidateSourceReviewView {
  const issues = nonEmptyHashIssues({
    sdkCallGraphHash: input.sdkCallGraphHash,
    ownershipMapHash: input.ownershipMapHash,
    specToCodeTraceHash: input.specToCodeTraceHash,
    testToRequirementTraceHash: input.testToRequirementTraceHash,
    modelProvenanceHash: input.modelProvenanceHash,
    attemptComparisonHash: input.attemptComparisonHash
  }, 'SOURCE_REVIEW_TRACE_MISSING');
  const payload: Omit<CandidateSourceReviewView, 'viewHash'> = {
    artifactKind: CANDIDATE_SOURCE_REVIEW_VIEW_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    fileDiffs: [...input.fileDiffs].sort((left, right) => left.path.localeCompare(right.path)),
    forbiddenApiHighlights: [...(input.forbiddenApiHighlights ?? [])].sort((left, right) => `${left.path}:${left.api}`.localeCompare(`${right.path}:${right.api}`)),
    sdkCallGraphHash: input.sdkCallGraphHash,
    ownershipMapHash: input.ownershipMapHash,
    specToCodeTraceHash: input.specToCodeTraceHash,
    testToRequirementTraceHash: input.testToRequirementTraceHash,
    modelProvenanceHash: input.modelProvenanceHash,
    attemptComparisonHash: input.attemptComparisonHash,
    issues
  };
  return { ...payload, viewHash: hashStableJson(payload) };
}

export function buildCapabilityEvidencePanel(input: {
  requestId: string;
  rows: readonly CapabilityEvidencePanelRow[];
}): CapabilityEvidencePanel {
  const rows = [...input.rows].sort((left, right) => left.requirementId.localeCompare(right.requirementId));
  const issues = rows.flatMap((row, index) => evidenceRowIssues(row, index)).sort(compareIssues);
  const overallStatus = issues.length > 0 || rows.some((row) => row.status === 'missing')
    ? 'missing'
    : rows.some((row) => row.status === 'failed')
      ? 'failed'
      : rows.some((row) => row.status === 'inconclusive')
        ? 'inconclusive'
        : 'passed';
  const payload: Omit<CapabilityEvidencePanel, 'panelHash'> = {
    artifactKind: CAPABILITY_EVIDENCE_PANEL_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    requestId: input.requestId,
    rows,
    overallStatus,
    issues
  };
  return { ...payload, panelHash: hashStableJson(payload) };
}

export function buildApprovalControlState(input: {
  requestId: string;
  attemptId: string;
  actorRoles: readonly CapabilitySynthesisRole[];
  requestedRole: CapabilityApprovalRole;
  lifecycleState: string;
  verificationStatus: 'PASSED' | 'FAILED' | 'INCONCLUSIVE';
  oracleFindings?: readonly CapabilityOracleReviewFinding[];
  candidateHashCurrent: boolean;
  latestRefsCurrent?: boolean;
  localOverrideEnabled?: boolean;
}): ApprovalControlState {
  const actorRoles = uniqueStrings(input.actorRoles) as CapabilitySynthesisRole[];
  const unresolvedBlockingFindings = (input.oracleFindings ?? []).filter(
    (finding) => (finding.severity === 'P0' || finding.severity === 'P1') && finding.resolved !== true
  );
  const roleAllowed = actorRoles.includes(input.requestedRole);
  const backendReasons = [
    ...(input.lifecycleState === 'HUMAN_REVIEW_PENDING' ? [] : ['lifecycle_not_human_review_pending']),
    ...(input.verificationStatus === 'PASSED' ? [] : ['verification_not_passed']),
    ...(unresolvedBlockingFindings.length === 0 ? [] : ['oracle_p0_or_p1_unresolved']),
    ...(input.candidateHashCurrent ? [] : ['candidate_hash_stale']),
    ...(input.latestRefsCurrent === true ? [] : ['latest_refs_missing_or_stale'])
  ];
  const issues = [
    ...(roleAllowed ? [] : [issue('APPROVAL_CONTROL_FORBIDDEN_ROLE', 'Actor does not hold the requested approval role.', input.requestedRole)]),
    ...(backendReasons.length === 0 ? [] : backendReasons.map((reason) => issue('APPROVAL_CONTROL_BACKEND_GATE_FAILED', `Approval disabled by server gate: ${reason}.`, reason))),
    ...(input.localOverrideEnabled === true
      ? [issue('APPROVAL_CONTROL_LOCAL_STATE_IGNORED', 'Workbench local state cannot enable human approval.', 'localOverrideEnabled')]
      : [])
  ].sort(compareIssues);
  const status: WorkbenchControlStatus = roleAllowed ? (backendReasons.length === 0 ? 'enabled' : 'disabled') : 'hidden';
  const payload: Omit<ApprovalControlState, 'controlHash'> = {
    artifactKind: APPROVAL_CONTROL_STATE_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    status,
    requestedRole: input.requestedRole,
    actorRoles,
    serverDerived: true,
    reasons: [...backendReasons, ...(roleAllowed ? [] : ['actor_role_forbidden'])].sort(),
    issues
  };
  return { ...payload, controlHash: hashStableJson(payload) };
}

export function buildRegistryInstallReadinessEvidence(input: {
  requestId: string;
  attemptId: string;
  precheck: RegistryInstallPrecheck;
  approvalValidityStatus: 'valid' | 'invalid';
  approvalValidityReceiptTrusted: boolean;
  registryAdminAuthorizationHash?: string;
  writerLockProofHash?: string;
  currentRefsHash?: string;
  packageHash: string;
  beforeSnapshotHash: string;
  canaryPlanHash: string;
  rollbackTargetSnapshotHash: string;
  oldLocksRemainUnchanged: boolean;
}): RegistryInstallReadinessEvidence {
  const issues = registryInstallReadinessIssues(input).sort(compareIssues);
  const payload: Omit<RegistryInstallReadinessEvidence, 'evidenceHash'> = {
    artifactKind: REGISTRY_INSTALL_READINESS_EVIDENCE_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    status: issues.length === 0 ? 'ready' : 'blocked',
    requestId: input.requestId,
    attemptId: input.attemptId,
    precheckHash: input.precheck.precheckHash,
    approvalValidityHash: input.precheck.approvalValidityHash,
    approvalValidityReceiptHash: input.precheck.approvalValidityReceiptHash ?? '',
    registryAdminAuthorizationHash: input.registryAdminAuthorizationHash?.trim() ?? '',
    packageId: input.precheck.packageId,
    packageVersion: input.precheck.packageVersion,
    packageHash: input.packageHash,
    beforeSnapshotHash: input.beforeSnapshotHash,
    canaryPlanHash: input.canaryPlanHash,
    rollbackTargetSnapshotHash: input.rollbackTargetSnapshotHash,
    writerLockProofHash: input.writerLockProofHash?.trim() ?? '',
    currentRefsHash: input.currentRefsHash?.trim() ?? '',
    oldLocksRemainUnchanged: input.oldLocksRemainUnchanged,
    issues
  };
  return { ...payload, evidenceHash: hashStableJson(payload) };
}

export function buildRegistryInstallReadinessReceipt(input: {
  evidence: RegistryInstallReadinessEvidence;
  issuer?: Partial<RegistryInstallReadinessReceipt['issuer']>;
}): RegistryInstallReadinessReceipt {
  const subject = registryInstallReadinessReceiptSubject(input.evidence);
  const receiptPayloadWithoutId: Omit<RegistryInstallReadinessReceipt, 'receiptId' | 'trustedArtifactRef' | 'receiptHash'> & {
    trustedArtifactRef: Omit<RegistryInstallReadinessReceipt['trustedArtifactRef'], 'artifactId'>;
  } = {
    artifactKind: REGISTRY_INSTALL_READINESS_RECEIPT_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE,
      artifactKind: REGISTRY_INSTALL_READINESS_RECEIPT_KIND
    },
    subject,
    issuer: {
      serviceId: input.issuer?.serviceId ?? 'maker-api.workbench-install-readiness-orchestrator',
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    }
  };
  const receiptId = `install_ready_receipt_${hashStableJson(receiptPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<RegistryInstallReadinessReceipt, 'receiptHash'> = {
    ...receiptPayloadWithoutId,
    receiptId,
    trustedArtifactRef: {
      ...receiptPayloadWithoutId.trustedArtifactRef,
      artifactId: receiptId
    }
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function validateRegistryInstallReadinessReceipt(input: {
  evidence: RegistryInstallReadinessEvidence;
  receiptRef?: RegistryInstallReadinessReceipt['trustedArtifactRef'];
  trustedInstallReadinessStore?: RegistryInstallReadinessReceiptResolver;
}): boolean {
  const receipt = input.receiptRef === undefined || input.trustedInstallReadinessStore === undefined
    ? undefined
    : input.trustedInstallReadinessStore.resolveReceipt(input.receiptRef);
  return receipt !== undefined &&
    input.trustedInstallReadinessStore?.namespace === REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE &&
    sameTrustedArtifactRef(input.receiptRef, receipt.trustedArtifactRef) &&
    receipt.trustedArtifactRef.namespace === REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE &&
    receipt.trustedArtifactRef.artifactKind === REGISTRY_INSTALL_READINESS_RECEIPT_KIND &&
    receipt.trustedArtifactRef.artifactId === receipt.receiptId &&
    TRUSTED_INSTALL_READINESS_ISSUERS.has(receipt.issuer.serviceId) &&
    receipt.receiptHash === recomputeRegistryInstallReadinessReceiptHash(receipt) &&
    hashStableJson(receipt.subject) === hashStableJson(registryInstallReadinessReceiptSubject(input.evidence));
}

export function buildRegistryInstallControlState(input: {
  requestId: string;
  attemptId: string;
  actorRoles: readonly CapabilitySynthesisRole[];
  precheck: RegistryInstallPrecheck;
  readinessEvidence?: RegistryInstallReadinessEvidence;
  readinessReceiptRef?: RegistryInstallReadinessReceipt['trustedArtifactRef'];
  trustedInstallReadinessStore?: RegistryInstallReadinessReceiptResolver;
  packageHash: string;
  beforeSnapshotHash: string;
  canaryPlanHash: string;
  rollbackTargetSnapshotHash: string;
  affectedProfiles?: readonly string[];
  oldLocksRemainUnchanged: boolean;
  localOverrideEnabled?: boolean;
}): RegistryInstallControlState {
  const actorRoles = uniqueStrings(input.actorRoles) as CapabilitySynthesisRole[];
  const roleAllowed = canAnyCapabilitySynthesisRolePerform(actorRoles, 'install_registry');
  const backendReasons = registryInstallControlBackendReasons(input);
  const issues = [
    ...(roleAllowed ? [] : [issue('INSTALL_CONTROL_FORBIDDEN_ROLE', 'Only registry admin can see registry install controls.', 'actorRoles')]),
    ...(backendReasons.length === 0 ? [] : backendReasons.map((reason) => issue('INSTALL_CONTROL_BACKEND_GATE_FAILED', `Install disabled by server gate: ${reason}.`, reason))),
    ...(input.localOverrideEnabled === true
      ? [issue('INSTALL_CONTROL_LOCAL_STATE_IGNORED', 'Workbench local state cannot enable registry install.', 'localOverrideEnabled')]
      : [])
  ].sort(compareIssues);
  const status: WorkbenchControlStatus = roleAllowed ? (backendReasons.length === 0 ? 'enabled' : 'disabled') : 'hidden';
  const payload: Omit<RegistryInstallControlState, 'controlHash'> = {
    artifactKind: REGISTRY_INSTALL_CONTROL_STATE_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    packageId: input.precheck.packageId,
    packageVersion: input.precheck.packageVersion,
    packageHash: input.packageHash,
    status,
    actorRoles,
    targetRegistryStatus: 'experimental_complete',
    beforeSnapshotHash: input.beforeSnapshotHash,
    canaryPlanHash: input.canaryPlanHash,
    rollbackTargetSnapshotHash: input.rollbackTargetSnapshotHash,
    affectedProfiles: uniqueStrings(input.affectedProfiles ?? []),
    oldLocksRemainUnchanged: input.oldLocksRemainUnchanged,
    serverDerived: true,
    reasons: [...backendReasons, ...(roleAllowed ? [] : ['actor_role_forbidden'])].sort(),
    issues
  };
  return { ...payload, controlHash: hashStableJson(payload) };
}

export function buildWorkbenchAuditTimeline(input: {
  requestId: string;
  previousTimelineHash?: string;
  previousLastEventHash?: string;
  entries: readonly Omit<WorkbenchAuditTimelineEntry, 'eventHash'>[];
}): WorkbenchAuditTimeline {
  let previousEventHash: string | undefined = input.previousLastEventHash;
  const anchorIssues = input.previousTimelineHash !== undefined && input.previousLastEventHash === undefined
    ? [issue('AUDIT_TIMELINE_EVENT_HASH_MISMATCH', 'Appending to a previous timeline requires the previous last event hash.', 'previousLastEventHash')]
    : [];
  const entries = input.entries.map((entry) => {
    const payload: Omit<WorkbenchAuditTimelineEntry, 'eventHash'> = {
      ...entry,
      artifactRefs: normalizeArtifactRefs(entry.artifactRefs),
      ...(previousEventHash === undefined ? {} : { previousEventHash })
    };
    const eventHash = hashStableJson(payload);
    previousEventHash = eventHash;
    return { ...payload, eventHash };
  });
  const issues = [
    ...anchorIssues,
    ...entries.flatMap((entry, index) => auditTimelineEntryIssues(entry, index)),
    ...input.entries.flatMap((entry, index) =>
      entry.previousEventHash !== undefined &&
      (index === 0 ? input.previousLastEventHash : entries[index - 1]?.eventHash) !== undefined &&
      entry.previousEventHash !== (index === 0 ? input.previousLastEventHash : entries[index - 1]?.eventHash)
        ? [issue('AUDIT_TIMELINE_EVENT_HASH_MISMATCH', 'Audit timeline append attempted to use a stale or mutated previous event hash.', `entries.${index}.previousEventHash`)]
        : []
    ),
    ...entries.flatMap((entry) =>
      hasText(entry.attemptedMutationOfEventHash)
        ? [issue('AUDIT_TIMELINE_MUTATION_FORBIDDEN', 'Review notes are immutable after decision; append a correction event instead.', entry.eventId)]
        : []
    )
  ].sort(compareIssues);
  const payload: Omit<WorkbenchAuditTimeline, 'timelineHash'> = {
    artifactKind: WORKBENCH_AUDIT_TIMELINE_KIND,
    schemaVersion: CAPABILITY_WORKBENCH_UX_SCHEMA_VERSION,
    requestId: input.requestId,
    ...(input.previousTimelineHash === undefined ? {} : { previousTimelineHash: input.previousTimelineHash }),
    ...(input.previousLastEventHash === undefined ? {} : { previousLastEventHash: input.previousLastEventHash }),
    entries,
    issues
  };
  return { ...payload, timelineHash: hashStableJson(payload) };
}

const CREATOR_FORBIDDEN_SURFACES = new Set([
  'candidate_source',
  'approval_control',
  'install_control',
  'registry_admin_actions',
  'sandbox_internals',
  'bypass_sensitive_security_details'
]);

const FALSE_PROMISE_PATTERNS = [
  'ai learned',
  'auto-upgraded',
  'auto upgraded',
  'capability supported',
  'ready to publish',
  'supported production',
  'engine upgraded',
  'already supported'
];

function creatorStatusCopy(input: {
  summary: string;
  reusableCapabilities?: readonly string[];
  missingCapability?: string;
  waitingReason?: string;
  nextMaintainerAction?: string;
  rejectedUnsafeFallbacks?: readonly string[];
}): string[] {
  return [
    `Understood: ${input.summary}`,
    ...(input.reusableCapabilities?.length ? [`Existing reusable capabilities: ${uniqueStrings(input.reusableCapabilities).join(', ')}`] : []),
    ...(hasText(input.missingCapability) ? [`Missing capability: ${input.missingCapability.trim()}`] : []),
    ...(hasText(input.waitingReason) ? [`Current status: ${input.waitingReason.trim()}`] : []),
    ...(hasText(input.nextMaintainerAction) ? [`Next maintainer action: ${input.nextMaintainerAction.trim()}`] : []),
    ...(input.rejectedUnsafeFallbacks?.length ? [`Rejected unsafe fallbacks: ${uniqueStrings(input.rejectedUnsafeFallbacks).join(', ')}`] : [])
  ];
}

function previewLabel(sourceKind: WorkbenchPreviewSourceKind): string {
  switch (sourceKind) {
    case 'active_game':
      return 'ACTIVE GAME';
    case 'step34_game_candidate':
      return 'STEP 34 GAME CANDIDATE';
    case 'capability_sandbox_preview':
      return 'UNTRUSTED CAPABILITY SANDBOX PREVIEW';
    case 'installed_experimental_capability_preview':
      return 'INSTALLED EXPERIMENTAL CAPABILITY PREVIEW';
    case 'supported_capability':
      return 'SUPPORTED CAPABILITY';
  }
}

function previewTextReason(sourceKind: WorkbenchPreviewSourceKind): string {
  switch (sourceKind) {
    case 'active_game':
      return 'Current accepted game artifacts and active project lock.';
    case 'step34_game_candidate':
      return 'Reviewable Step34 game candidate; not active until user Accept.';
    case 'capability_sandbox_preview':
      return 'Maintainer evidence only; not promotable into Step34 or active game state.';
    case 'installed_experimental_capability_preview':
      return 'Registry package installed as experimental; not supported production readiness.';
    case 'supported_capability':
      return 'Supported only after evidence-backed support promotion.';
  }
}

function evidenceRowIssues(row: CapabilityEvidencePanelRow, index: number): CapabilityWorkbenchUxIssue[] {
  return [
    ...nonEmptyStringIssue(row.requirementId, `rows.${index}.requirementId`),
    ...nonEmptyStringIssue(row.requirement, `rows.${index}.requirement`),
    ...nonEmptyStringIssue(row.inputAction, `rows.${index}.inputAction`),
    ...nonEmptyStringIssue(row.observationSource, `rows.${index}.observationSource`),
    ...nonEmptyStringIssue(row.assertion, `rows.${index}.assertion`),
    ...nonEmptyStringIssue(row.evidenceArtifact, `rows.${index}.evidenceArtifact`),
    ...nonEmptyStringIssue(row.artifactHash, `rows.${index}.artifactHash`)
  ];
}

function auditTimelineEntryIssues(entry: WorkbenchAuditTimelineEntry, index: number): CapabilityWorkbenchUxIssue[] {
  const { eventHash: _eventHash, ...payload } = entry;
  return [
    ...(entry.eventHash === hashStableJson(payload)
      ? []
      : [issue('AUDIT_TIMELINE_EVENT_HASH_MISMATCH', 'Audit timeline event hash does not match payload.', `entries.${index}.eventHash`)]),
    ...missingArtifactRefIssues(entry.artifactRefs, 'DASHBOARD_ARTIFACT_REF_MISSING')
  ];
}

function recomputeRegistryInstallPrecheckHash(precheck: RegistryInstallPrecheck): string {
  const { precheckHash: _precheckHash, ...payload } = precheck;
  return hashStableJson(payload);
}

function registryInstallReadinessIssues(input: {
  precheck: RegistryInstallPrecheck;
  approvalValidityStatus: 'valid' | 'invalid';
  approvalValidityReceiptTrusted: boolean;
  registryAdminAuthorizationHash?: string;
  writerLockProofHash?: string;
  currentRefsHash?: string;
  packageHash: string;
  beforeSnapshotHash: string;
  canaryPlanHash: string;
  rollbackTargetSnapshotHash: string;
  oldLocksRemainUnchanged: boolean;
}): CapabilityWorkbenchUxIssue[] {
  return registryInstallReadinessReasons(input)
    .map((reason) => issue('INSTALL_CONTROL_BACKEND_GATE_FAILED', `Install readiness evidence blocked by server gate: ${reason}.`, reason));
}

function registryInstallReadinessReasons(input: {
  precheck: RegistryInstallPrecheck;
  approvalValidityStatus: 'valid' | 'invalid';
  approvalValidityReceiptTrusted: boolean;
  registryAdminAuthorizationHash?: string;
  writerLockProofHash?: string;
  currentRefsHash?: string;
  packageHash: string;
  beforeSnapshotHash: string;
  canaryPlanHash: string;
  rollbackTargetSnapshotHash: string;
  oldLocksRemainUnchanged: boolean;
}): string[] {
  return [
    ...(input.precheck.status === 'passed' ? [] : ['install_precheck_not_passed']),
    ...(input.precheck.precheckHash === recomputeRegistryInstallPrecheckHash(input.precheck) ? [] : ['install_precheck_hash_mismatch']),
    ...(input.approvalValidityStatus === 'valid' ? [] : ['approval_validity_invalid']),
    ...(input.approvalValidityReceiptTrusted ? [] : ['approval_validity_receipt_untrusted']),
    ...(hasText(input.precheck.approvalValidityReceiptHash) ? [] : ['approval_validity_receipt_missing']),
    ...(hasText(input.registryAdminAuthorizationHash) ? [] : ['registry_admin_authorization_missing']),
    ...(input.precheck.registryAdminAuthorizationHash === input.registryAdminAuthorizationHash ? [] : ['registry_admin_authorization_mismatch']),
    ...(hasText(input.writerLockProofHash) ? [] : ['writer_lock_proof_missing']),
    ...(hasText(input.currentRefsHash) ? [] : ['current_refs_hash_missing']),
    ...(hasText(input.packageHash) ? [] : ['package_hash_missing']),
    ...(input.packageHash === input.precheck.candidatePackageHash ? [] : ['package_hash_mismatch']),
    ...(hasText(input.beforeSnapshotHash) ? [] : ['before_snapshot_missing']),
    ...(hasText(input.canaryPlanHash) ? [] : ['canary_plan_missing']),
    ...(hasText(input.rollbackTargetSnapshotHash) ? [] : ['rollback_target_missing']),
    ...(input.oldLocksRemainUnchanged ? [] : ['old_lock_stability_missing'])
  ];
}

function registryInstallControlBackendReasons(input: {
  requestId: string;
  attemptId: string;
  precheck: RegistryInstallPrecheck;
  readinessEvidence?: RegistryInstallReadinessEvidence;
  readinessReceiptRef?: RegistryInstallReadinessReceipt['trustedArtifactRef'];
  trustedInstallReadinessStore?: RegistryInstallReadinessReceiptResolver;
  packageHash: string;
  beforeSnapshotHash: string;
  canaryPlanHash: string;
  rollbackTargetSnapshotHash: string;
  oldLocksRemainUnchanged: boolean;
}): string[] {
  if (input.readinessEvidence === undefined) {
    return ['install_readiness_evidence_missing'];
  }
  return [
    ...(input.readinessEvidence.status === 'ready' ? [] : ['install_readiness_evidence_blocked']),
    ...(input.readinessEvidence.evidenceHash === recomputeRegistryInstallReadinessEvidenceHash(input.readinessEvidence)
      ? []
      : ['install_readiness_evidence_hash_mismatch']),
    ...(validateRegistryInstallReadinessReceipt({
      evidence: input.readinessEvidence,
      receiptRef: input.readinessReceiptRef,
      trustedInstallReadinessStore: input.trustedInstallReadinessStore
    })
      ? []
      : ['install_readiness_receipt_invalid']),
    ...(input.readinessEvidence.precheckHash === input.precheck.precheckHash ? [] : ['install_readiness_precheck_mismatch']),
    ...(input.readinessEvidence.requestId === input.requestId && input.readinessEvidence.attemptId === input.attemptId
      ? []
      : ['install_readiness_context_mismatch']),
    ...(input.readinessEvidence.packageId === input.precheck.packageId && input.readinessEvidence.packageVersion === input.precheck.packageVersion
      ? []
      : ['install_readiness_package_identity_mismatch']),
    ...(input.readinessEvidence.packageHash === input.packageHash ? [] : ['install_readiness_package_hash_mismatch']),
    ...(input.readinessEvidence.beforeSnapshotHash === input.beforeSnapshotHash ? [] : ['install_readiness_before_snapshot_mismatch']),
    ...(input.readinessEvidence.canaryPlanHash === input.canaryPlanHash ? [] : ['install_readiness_canary_plan_mismatch']),
    ...(input.readinessEvidence.rollbackTargetSnapshotHash === input.rollbackTargetSnapshotHash ? [] : ['install_readiness_rollback_target_mismatch']),
    ...(input.readinessEvidence.oldLocksRemainUnchanged === input.oldLocksRemainUnchanged && input.oldLocksRemainUnchanged
      ? []
      : ['install_readiness_old_lock_stability_mismatch'])
  ];
}

function registryInstallReadinessReceiptSubject(evidence: RegistryInstallReadinessEvidence): RegistryInstallReadinessReceipt['subject'] {
  return {
    requestId: evidence.requestId,
    attemptId: evidence.attemptId,
    evidenceHash: evidence.evidenceHash,
    precheckHash: evidence.precheckHash,
    approvalValidityHash: evidence.approvalValidityHash,
    approvalValidityReceiptHash: evidence.approvalValidityReceiptHash,
    registryAdminAuthorizationHash: evidence.registryAdminAuthorizationHash,
    packageId: evidence.packageId,
    packageVersion: evidence.packageVersion,
    packageHash: evidence.packageHash,
    currentRefsHash: evidence.currentRefsHash
  };
}

function recomputeRegistryInstallReadinessEvidenceHash(evidence: RegistryInstallReadinessEvidence): string {
  const { evidenceHash: _evidenceHash, ...payload } = evidence;
  return hashStableJson(payload);
}

function recomputeRegistryInstallReadinessReceiptHash(receipt: RegistryInstallReadinessReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function sameTrustedArtifactRef(
  left: RegistryInstallReadinessReceipt['trustedArtifactRef'] | undefined,
  right: RegistryInstallReadinessReceipt['trustedArtifactRef']
): boolean {
  return left !== undefined &&
    left.namespace === right.namespace &&
    left.artifactId === right.artifactId &&
    left.artifactKind === right.artifactKind;
}

function nonEmptyStringIssue(value: string, path: string): CapabilityWorkbenchUxIssue[] {
  return hasText(value) ? [] : [issue('EVIDENCE_ROW_INCOMPLETE', `Evidence row is missing ${path}.`, path)];
}

function missingArtifactRefIssues(
  artifactRefs: readonly WorkbenchArtifactRef[],
  code: Extract<CapabilityWorkbenchUxIssue['code'], 'DASHBOARD_ARTIFACT_REF_MISSING'>
): CapabilityWorkbenchUxIssue[] {
  return artifactRefs.flatMap((ref, index) => [
    ...(hasText(ref.artifactKind) && hasText(ref.path) && hasText(ref.artifactHash)
      ? []
      : [issue(code, 'Workbench artifact refs must include kind, path and hash.', `artifactRefs.${index}`)])
  ]);
}

function nonEmptyHashIssues(
  values: Record<string, string>,
  code: Extract<CapabilityWorkbenchUxIssue['code'], 'SOURCE_REVIEW_TRACE_MISSING'>
): CapabilityWorkbenchUxIssue[] {
  return Object.entries(values)
    .filter(([, value]) => !hasText(value))
    .map(([path]) => issue(code, `Candidate source review is missing ${path}.`, path));
}

function normalizeArtifactRefs(refs: readonly WorkbenchArtifactRef[]): WorkbenchArtifactRef[] {
  return refs
    .map((ref) => ({
      artifactKind: ref.artifactKind.trim(),
      path: ref.path.trim(),
      artifactHash: ref.artifactHash.trim()
    }))
    .sort((left, right) => `${left.artifactKind}:${left.path}`.localeCompare(`${right.artifactKind}:${right.path}`));
}

function isFalsePromise(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return FALSE_PROMISE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function hasText(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function issue(code: CapabilityWorkbenchUxIssue['code'], message: string, path?: string): CapabilityWorkbenchUxIssue {
  return {
    code,
    message,
    ...(path === undefined ? {} : { path })
  };
}

function compareIssues(left: CapabilityWorkbenchUxIssue, right: CapabilityWorkbenchUxIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}
