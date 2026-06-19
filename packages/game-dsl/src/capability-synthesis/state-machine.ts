import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import {
  canAnyCapabilitySynthesisRolePerform,
  requiredCapabilitySynthesisActionForTransition,
  type CapabilitySynthesisAction,
  type CapabilitySynthesisRole
} from './permissions.js';

export const CAPABILITY_SYNTHESIS_STATES = [
  'RECEIVED',
  'DESIGN_SYNTHESIZING',
  'DESIGN_READY',
  'GAP_ANALYZING',
  'NO_NEW_CAPABILITY_REQUIRED',
  'SPEC_SYNTHESIZING',
  'SPEC_READY',
  'POLICY_BLOCKED',
  'MANUAL_REVIEW_REQUIRED',
  'SCAFFOLDING',
  'IMPLEMENTING',
  'STATIC_VALIDATING',
  'BUILDING',
  'CONTRACT_TESTING',
  'RUNTIME_QA_RUNNING',
  'SECURITY_QA_RUNNING',
  'REPAIRING',
  'VERIFIED_CANDIDATE',
  'ORACLE_REVIEWING',
  'HUMAN_REVIEW_PENDING',
  'APPROVED',
  'REJECTED',
  'INSTALLING',
  'CANARY_RUNNING',
  'INSTALLED_EXPERIMENTAL',
  'SUPPORTED_COMPLETE',
  'ROLLED_BACK',
  'FAILED',
  'QUARANTINED'
] as const;

export type CapabilitySynthesisState = (typeof CAPABILITY_SYNTHESIS_STATES)[number];

export type CapabilitySynthesisTransitionIssue = {
  code:
    | 'INVALID_STATE_TRANSITION'
    | 'TRANSITION_STALE_STATE'
    | 'TRANSITION_PERMISSION_DENIED'
    | 'TRANSITION_REQUIRED_APPROVAL_ROLE_MISSING'
    | 'TRANSITION_INSTALL_SOURCE_MISSING'
    | 'TRANSITION_INSTALL_SOURCE_FORBIDDEN'
    | 'TRANSITION_CANDIDATE_HASH_MISSING'
    | 'TRANSITION_CANDIDATE_HASH_MISMATCH'
    | 'TRANSITION_REGISTRY_SNAPSHOT_MISSING'
    | 'TRANSITION_REGISTRY_SNAPSHOT_MISMATCH'
    | 'TRANSITION_REQUIRED_EVIDENCE_MISSING'
    | 'TRANSITION_BLOCKING_DIAGNOSTIC'
    | 'TRANSITION_INSTALL_LOCK_TOKEN_MISSING'
    | 'TRANSITION_INSTALL_LOCK_CONFLICT';
  message: string;
};

export type CapabilitySynthesisTransitionRequestSource = 'step36_orchestrator' | 'step34_accept' | 'workbench_local_state' | 'candidate_workspace';

export type CapabilitySynthesisTransitionReport = {
  from: CapabilitySynthesisState;
  to: CapabilitySynthesisState;
  status: 'allowed' | 'blocked';
  requiredAction?: CapabilitySynthesisAction;
  issues: CapabilitySynthesisTransitionIssue[];
  transitionHash: string;
};

const DEFAULT_R2_APPROVAL_ROLES: readonly CapabilitySynthesisRole[] = ['capability_maintainer', 'runtime_code_owner'];

const IMPLEMENTATION_STATES = new Set<CapabilitySynthesisState>([
  'SCAFFOLDING',
  'IMPLEMENTING',
  'STATIC_VALIDATING',
  'BUILDING',
  'CONTRACT_TESTING',
  'RUNTIME_QA_RUNNING',
  'SECURITY_QA_RUNNING',
  'REPAIRING',
  'VERIFIED_CANDIDATE',
  'ORACLE_REVIEWING',
  'HUMAN_REVIEW_PENDING',
  'APPROVED',
  'INSTALLING',
  'CANARY_RUNNING',
  'INSTALLED_EXPERIMENTAL',
  'SUPPORTED_COMPLETE',
  'ROLLED_BACK',
  'QUARANTINED'
]);

const EVIDENCE_REQUIRED_TO_STATES = new Set<CapabilitySynthesisState>([
  'VERIFIED_CANDIDATE',
  'ORACLE_REVIEWING',
  'HUMAN_REVIEW_PENDING',
  'APPROVED',
  'INSTALLING',
  'CANARY_RUNNING',
  'INSTALLED_EXPERIMENTAL',
  'SUPPORTED_COMPLETE'
]);

const ALLOWED_TRANSITIONS: Record<CapabilitySynthesisState, readonly CapabilitySynthesisState[]> = {
  RECEIVED: ['DESIGN_SYNTHESIZING', 'FAILED'],
  DESIGN_SYNTHESIZING: ['DESIGN_READY', 'FAILED'],
  DESIGN_READY: ['GAP_ANALYZING', 'FAILED'],
  GAP_ANALYZING: ['NO_NEW_CAPABILITY_REQUIRED', 'SPEC_SYNTHESIZING', 'POLICY_BLOCKED', 'MANUAL_REVIEW_REQUIRED', 'FAILED'],
  NO_NEW_CAPABILITY_REQUIRED: [],
  SPEC_SYNTHESIZING: ['SPEC_READY', 'FAILED'],
  SPEC_READY: ['POLICY_BLOCKED', 'MANUAL_REVIEW_REQUIRED', 'SCAFFOLDING', 'FAILED'],
  POLICY_BLOCKED: [],
  MANUAL_REVIEW_REQUIRED: [],
  SCAFFOLDING: ['IMPLEMENTING', 'FAILED'],
  IMPLEMENTING: ['STATIC_VALIDATING', 'FAILED', 'QUARANTINED'],
  STATIC_VALIDATING: ['BUILDING', 'REPAIRING', 'FAILED', 'QUARANTINED'],
  BUILDING: ['CONTRACT_TESTING', 'REPAIRING', 'FAILED'],
  CONTRACT_TESTING: ['RUNTIME_QA_RUNNING', 'REPAIRING', 'FAILED'],
  RUNTIME_QA_RUNNING: ['SECURITY_QA_RUNNING', 'REPAIRING', 'FAILED'],
  SECURITY_QA_RUNNING: ['VERIFIED_CANDIDATE', 'REPAIRING', 'FAILED', 'QUARANTINED'],
  REPAIRING: ['STATIC_VALIDATING', 'FAILED', 'QUARANTINED'],
  VERIFIED_CANDIDATE: ['ORACLE_REVIEWING', 'REPAIRING', 'REJECTED'],
  ORACLE_REVIEWING: ['HUMAN_REVIEW_PENDING', 'REPAIRING', 'REJECTED'],
  HUMAN_REVIEW_PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['INSTALLING'],
  REJECTED: [],
  INSTALLING: ['CANARY_RUNNING', 'ROLLED_BACK', 'FAILED'],
  CANARY_RUNNING: ['INSTALLED_EXPERIMENTAL', 'ROLLED_BACK', 'FAILED'],
  INSTALLED_EXPERIMENTAL: ['SUPPORTED_COMPLETE', 'ROLLED_BACK'],
  SUPPORTED_COMPLETE: [],
  ROLLED_BACK: [],
  FAILED: [],
  QUARANTINED: []
};

export function validateCapabilitySynthesisTransition(input: {
  from: CapabilitySynthesisState;
  to: CapabilitySynthesisState;
  currentState?: CapabilitySynthesisState;
  expectedPreviousState?: CapabilitySynthesisState;
  actorRoles: readonly CapabilitySynthesisRole[];
  approvalEvidenceRoles?: readonly CapabilitySynthesisRole[];
  requiredApprovalRoles?: readonly CapabilitySynthesisRole[];
  requestSource?: CapabilitySynthesisTransitionRequestSource;
  candidateHash?: string;
  expectedCandidateHash?: string;
  baseRegistrySnapshotHash?: string;
  expectedBaseRegistrySnapshotHash?: string;
  requiredEvidenceRefs?: readonly string[];
  blockingDiagnostics?: readonly string[];
  activeInstallTransactionId?: string;
  currentInstallTransactionId?: string;
}): CapabilitySynthesisTransitionReport {
  const requiredAction = requiredCapabilitySynthesisActionForTransition(input.to);
  const issues: CapabilitySynthesisTransitionIssue[] = [
    ...transitionShapeIssues(input.from, input.to),
    ...staleStateIssues(input.from, input.currentState, input.expectedPreviousState),
    ...permissionIssues(input.actorRoles, requiredAction),
    ...approvalRoleIssues(input.to, input.approvalEvidenceRoles, input.requiredApprovalRoles),
    ...installSourceIssues(input.to, input.requestSource),
    ...hashIssues(input),
    ...evidenceIssues(input.to, input.requiredEvidenceRefs),
    ...diagnosticIssues(input.blockingDiagnostics ?? []),
    ...installLockIssues(input.to, input.activeInstallTransactionId, input.currentInstallTransactionId)
  ].sort(compareIssues);
  const payload = {
    from: input.from,
    to: input.to,
    issueCodes: issues.map((issue) => issue.code),
    ...(requiredAction === undefined ? {} : { requiredAction }),
    ...(input.currentState === undefined ? {} : { currentState: input.currentState }),
    ...(input.expectedPreviousState === undefined ? {} : { expectedPreviousState: input.expectedPreviousState }),
    ...(input.requestSource === undefined ? {} : { requestSource: input.requestSource }),
    ...(input.approvalEvidenceRoles === undefined ? {} : { approvalEvidenceRoles: [...input.approvalEvidenceRoles].sort() }),
    ...(input.requiredApprovalRoles === undefined ? {} : { requiredApprovalRoles: [...input.requiredApprovalRoles].sort() }),
    ...(input.candidateHash === undefined ? {} : { candidateHash: input.candidateHash }),
    ...(input.baseRegistrySnapshotHash === undefined ? {} : { baseRegistrySnapshotHash: input.baseRegistrySnapshotHash })
  };
  return {
    from: input.from,
    to: input.to,
    status: issues.length === 0 ? 'allowed' : 'blocked',
    ...(requiredAction === undefined ? {} : { requiredAction }),
    issues,
    transitionHash: hashStableJson(payload)
  };
}

export function isCapabilitySynthesisStateTransitionAllowed(from: CapabilitySynthesisState, to: CapabilitySynthesisState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function transitionShapeIssues(from: CapabilitySynthesisState, to: CapabilitySynthesisState): CapabilitySynthesisTransitionIssue[] {
  return isCapabilitySynthesisStateTransitionAllowed(from, to)
    ? []
    : [{ code: 'INVALID_STATE_TRANSITION', message: `Transition ${from} -> ${to} is not allowed.` }];
}

function staleStateIssues(
  from: CapabilitySynthesisState,
  currentState: CapabilitySynthesisState | undefined,
  expectedPreviousState: CapabilitySynthesisState | undefined
): CapabilitySynthesisTransitionIssue[] {
  const issues: CapabilitySynthesisTransitionIssue[] = [];
  if (currentState !== undefined && currentState !== from) {
    issues.push({ code: 'TRANSITION_STALE_STATE', message: `Current state is ${currentState}, not ${from}.` });
  }
  if (expectedPreviousState !== undefined && expectedPreviousState !== from) {
    issues.push({ code: 'TRANSITION_STALE_STATE', message: `Expected previous state is ${expectedPreviousState}, not ${from}.` });
  }
  return issues;
}

function permissionIssues(roles: readonly CapabilitySynthesisRole[], requiredAction: CapabilitySynthesisAction | undefined): CapabilitySynthesisTransitionIssue[] {
  if (requiredAction === undefined) {
    return [];
  }
  return canAnyCapabilitySynthesisRolePerform(roles, requiredAction)
    ? []
    : [{ code: 'TRANSITION_PERMISSION_DENIED', message: `Transition requires ${requiredAction}.` }];
}

function approvalRoleIssues(
  to: CapabilitySynthesisState,
  approvalEvidenceRoles: readonly CapabilitySynthesisRole[] | undefined,
  requiredApprovalRoles: readonly CapabilitySynthesisRole[] | undefined
): CapabilitySynthesisTransitionIssue[] {
  if (to !== 'APPROVED') {
    return [];
  }
  const evidenceRoles = new Set(approvalEvidenceRoles ?? []);
  const missingRoles = [...(requiredApprovalRoles ?? DEFAULT_R2_APPROVAL_ROLES)].filter((role) => !evidenceRoles.has(role));
  return missingRoles.map((role) => ({
    code: 'TRANSITION_REQUIRED_APPROVAL_ROLE_MISSING' as const,
    message: `Transition to APPROVED requires ${role} approval evidence.`
  }));
}

function installSourceIssues(
  to: CapabilitySynthesisState,
  requestSource: CapabilitySynthesisTransitionRequestSource | undefined
): CapabilitySynthesisTransitionIssue[] {
  if (to !== 'INSTALLING') {
    return [];
  }
  if (requestSource === undefined) {
    return [
      {
        code: 'TRANSITION_INSTALL_SOURCE_MISSING',
        message: 'Transition to INSTALLING requires explicit step36_orchestrator request source.'
      }
    ];
  }
  if (requestSource === 'step36_orchestrator') {
    return [];
  }
  return [
    {
      code: 'TRANSITION_INSTALL_SOURCE_FORBIDDEN',
      message: `${requestSource} cannot install registry packages.`
    }
  ];
}

function hashIssues(input: {
  to: CapabilitySynthesisState;
  candidateHash?: string;
  expectedCandidateHash?: string;
  baseRegistrySnapshotHash?: string;
  expectedBaseRegistrySnapshotHash?: string;
}): CapabilitySynthesisTransitionIssue[] {
  const issues: CapabilitySynthesisTransitionIssue[] = [];
  if (IMPLEMENTATION_STATES.has(input.to) && input.candidateHash === undefined) {
    issues.push({ code: 'TRANSITION_CANDIDATE_HASH_MISSING', message: `Transition to ${input.to} requires candidate hash.` });
  }
  if (input.expectedCandidateHash !== undefined && input.candidateHash !== input.expectedCandidateHash) {
    issues.push({ code: 'TRANSITION_CANDIDATE_HASH_MISMATCH', message: 'Candidate hash does not match expected hash.' });
  }
  if (IMPLEMENTATION_STATES.has(input.to) && input.baseRegistrySnapshotHash === undefined) {
    issues.push({ code: 'TRANSITION_REGISTRY_SNAPSHOT_MISSING', message: `Transition to ${input.to} requires base registry snapshot hash.` });
  }
  if (input.expectedBaseRegistrySnapshotHash !== undefined && input.baseRegistrySnapshotHash !== input.expectedBaseRegistrySnapshotHash) {
    issues.push({ code: 'TRANSITION_REGISTRY_SNAPSHOT_MISMATCH', message: 'Base registry snapshot hash does not match expected hash.' });
  }
  return issues;
}

function evidenceIssues(to: CapabilitySynthesisState, refs: readonly string[] | undefined): CapabilitySynthesisTransitionIssue[] {
  return EVIDENCE_REQUIRED_TO_STATES.has(to) && (refs === undefined || refs.length === 0 || refs.some((ref) => ref.length === 0))
    ? [{ code: 'TRANSITION_REQUIRED_EVIDENCE_MISSING', message: `Transition to ${to} requires evidence refs.` }]
    : [];
}

function diagnosticIssues(blockingDiagnostics: readonly string[]): CapabilitySynthesisTransitionIssue[] {
  return blockingDiagnostics.length === 0
    ? []
    : [
        {
          code: 'TRANSITION_BLOCKING_DIAGNOSTIC',
          message: `Transition has blocking diagnostics: ${[...blockingDiagnostics].sort().join(', ')}.`
        }
      ];
}

function installLockIssues(
  to: CapabilitySynthesisState,
  activeInstallTransactionId: string | undefined,
  currentInstallTransactionId: string | undefined
): CapabilitySynthesisTransitionIssue[] {
  if (to !== 'INSTALLING') {
    return [];
  }
  if (currentInstallTransactionId === undefined) {
    return [{ code: 'TRANSITION_INSTALL_LOCK_TOKEN_MISSING', message: 'Transition to INSTALLING requires current install transaction token.' }];
  }
  if (activeInstallTransactionId !== undefined && activeInstallTransactionId !== currentInstallTransactionId) {
    return [{ code: 'TRANSITION_INSTALL_LOCK_CONFLICT', message: `Install transaction ${activeInstallTransactionId} is already active.` }];
  }
  return [];
}

function compareIssues(left: CapabilitySynthesisTransitionIssue, right: CapabilitySynthesisTransitionIssue): number {
  return `${left.code}:${left.message}`.localeCompare(`${right.code}:${right.message}`);
}
