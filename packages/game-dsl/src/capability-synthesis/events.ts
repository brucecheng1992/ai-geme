import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import type { CapabilitySynthesisRole } from './permissions.js';
import {
  isCapabilitySynthesisStateTransitionAllowed,
  validateCapabilitySynthesisTransition,
  type CapabilitySynthesisState,
  type CapabilitySynthesisTransitionRequestSource
} from './state-machine.js';

export const CAPABILITY_SYNTHESIS_EVENT_SCHEMA_VERSION = 'step36.capability-synthesis-event.v1';
export const CAPABILITY_SYNTHESIS_GENESIS_EVENT_HASH = 'genesis';

export type CapabilitySynthesisEventArtifactRef = {
  artifactKind: string;
  path: string;
  reportHash?: string;
};

export type CapabilitySynthesisEventActor = {
  actorId: string;
  roles: readonly CapabilitySynthesisRole[];
};

export type CapabilitySynthesisStateEvent = {
  schemaVersion: typeof CAPABILITY_SYNTHESIS_EVENT_SCHEMA_VERSION;
  requestId: string;
  eventId: string;
  eventType: string;
  actor: CapabilitySynthesisEventActor;
  fromState?: CapabilitySynthesisState;
  toState: CapabilitySynthesisState;
  previousEventHash: string;
  transitionHash?: string;
  artifactRefs: CapabilitySynthesisEventArtifactRef[];
  createdAt: string;
  eventHash: string;
};

export type CapabilitySynthesisEventHistoryIssue = {
  code:
    | 'EVENT_ACTOR_MISSING'
    | 'EVENT_ARTIFACT_REFS_MISSING'
    | 'EVENT_CREATED_AT_INVALID'
    | 'EVENT_REQUEST_ID_MISMATCH'
    | 'EVENT_INVALID_INITIAL_STATE'
    | 'EVENT_FROM_STATE_MISSING'
    | 'EVENT_INVALID_STATE_TRANSITION'
    | 'EVENT_TRANSITION_HASH_MISSING'
    | 'EVENT_TRANSITION_GUARD_BLOCKED'
    | 'EVENT_PREVIOUS_HASH_MISMATCH'
    | 'EVENT_HASH_MISMATCH'
    | 'EVENT_ID_MISMATCH'
    | 'EVENT_STATE_CONTINUITY_MISMATCH'
    | 'EVENT_APPEND_STALE';
  message: string;
  eventIndex?: number;
};

export type CapabilitySynthesisEventTransitionContext = {
  currentState?: CapabilitySynthesisState;
  expectedPreviousState?: CapabilitySynthesisState;
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
};

export type CapabilitySynthesisEventHistoryReport = {
  status: 'valid' | 'invalid';
  eventCount: number;
  headEventHash: string;
  issues: CapabilitySynthesisEventHistoryIssue[];
  reportHash: string;
};

export type CapabilitySynthesisEventAppendReport = {
  status: 'appended' | 'blocked';
  event?: CapabilitySynthesisStateEvent;
  events: CapabilitySynthesisStateEvent[];
  issues: CapabilitySynthesisEventHistoryIssue[];
  headEventHash: string;
  reportHash: string;
};

function createCapabilitySynthesisStateEvent(input: {
  requestId: string;
  eventType: string;
  actor: CapabilitySynthesisEventActor;
  fromState?: CapabilitySynthesisState;
  toState: CapabilitySynthesisState;
  previousEventHash: string;
  transitionHash?: string;
  artifactRefs: readonly CapabilitySynthesisEventArtifactRef[];
  createdAt: string;
}): CapabilitySynthesisStateEvent {
  const payload = eventHashPayload({
    schemaVersion: CAPABILITY_SYNTHESIS_EVENT_SCHEMA_VERSION,
    requestId: input.requestId,
    eventType: input.eventType,
    actor: normalizeActor(input.actor),
    ...(input.fromState === undefined ? {} : { fromState: input.fromState }),
    toState: input.toState,
    previousEventHash: input.previousEventHash,
    ...(input.transitionHash === undefined ? {} : { transitionHash: input.transitionHash }),
    artifactRefs: normalizeArtifactRefs(input.artifactRefs),
    createdAt: input.createdAt
  });
  const eventHash = hashStableJson(payload);
  return {
    ...payload,
    eventId: `capsyn_evt_${eventHash.slice('fnv1a_'.length)}`,
    eventHash
  };
}

export function appendCapabilitySynthesisStateEvent(input: {
  history: readonly CapabilitySynthesisStateEvent[];
  expectedPreviousEventHash?: string;
  requestId: string;
  eventType: string;
  actor: CapabilitySynthesisEventActor;
  fromState?: CapabilitySynthesisState;
  toState: CapabilitySynthesisState;
  transitionContext?: CapabilitySynthesisEventTransitionContext;
  artifactRefs: readonly CapabilitySynthesisEventArtifactRef[];
  createdAt: string;
}): CapabilitySynthesisEventAppendReport {
  const currentHeadHash = input.history.at(-1)?.eventHash ?? CAPABILITY_SYNTHESIS_GENESIS_EVENT_HASH;
  const expectedPreviousEventHash = input.expectedPreviousEventHash ?? currentHeadHash;
  if (expectedPreviousEventHash !== currentHeadHash) {
    const issues: CapabilitySynthesisEventHistoryIssue[] = [
      {
        code: 'EVENT_APPEND_STALE',
        message: `Expected previous event hash ${expectedPreviousEventHash}, current head is ${currentHeadHash}.`
      }
    ];
    return buildAppendReport({ status: 'blocked', events: [...input.history], issues });
  }
  const transitionReport = input.fromState === undefined
    ? undefined
    : validateCapabilitySynthesisTransition({
        from: input.fromState,
        to: input.toState,
        currentState: input.transitionContext?.currentState ?? input.fromState,
        expectedPreviousState: input.transitionContext?.expectedPreviousState ?? input.fromState,
        actorRoles: input.actor.roles,
        approvalEvidenceRoles: input.transitionContext?.approvalEvidenceRoles,
        requiredApprovalRoles: input.transitionContext?.requiredApprovalRoles,
        requestSource: input.transitionContext?.requestSource,
        candidateHash: input.transitionContext?.candidateHash,
        expectedCandidateHash: input.transitionContext?.expectedCandidateHash,
        baseRegistrySnapshotHash: input.transitionContext?.baseRegistrySnapshotHash,
        expectedBaseRegistrySnapshotHash: input.transitionContext?.expectedBaseRegistrySnapshotHash,
        requiredEvidenceRefs: input.transitionContext?.requiredEvidenceRefs,
        blockingDiagnostics: input.transitionContext?.blockingDiagnostics,
        activeInstallTransactionId: input.transitionContext?.activeInstallTransactionId,
        currentInstallTransactionId: input.transitionContext?.currentInstallTransactionId
      });
  if (transitionReport?.status === 'blocked') {
    return buildAppendReport({
      status: 'blocked',
      events: [...input.history],
      issues: [
        {
          code: 'EVENT_TRANSITION_GUARD_BLOCKED',
          message: `Transition guard blocked event append: ${transitionReport.issues.map((issue) => issue.code).join(', ')}.`
        }
      ]
    });
  }
  const event = createCapabilitySynthesisStateEvent({
    requestId: input.requestId,
    eventType: input.eventType,
    actor: input.actor,
    fromState: input.fromState,
    toState: input.toState,
    previousEventHash: currentHeadHash,
    transitionHash: transitionReport?.transitionHash,
    artifactRefs: input.artifactRefs,
    createdAt: input.createdAt
  });
  const events = [...input.history, event];
  const historyReport = validateCapabilitySynthesisEventHistory(events);
  return buildAppendReport({
    status: historyReport.status === 'valid' ? 'appended' : 'blocked',
    event: historyReport.status === 'valid' ? event : undefined,
    events: historyReport.status === 'valid' ? events : [...input.history],
    issues: historyReport.issues
  });
}

export function validateCapabilitySynthesisEventHistory(events: readonly CapabilitySynthesisStateEvent[]): CapabilitySynthesisEventHistoryReport {
  const rootRequestId = events[0]?.requestId;
  const issues = events.flatMap((event, index) => eventIssues(event, index, events[index - 1], rootRequestId)).sort(compareIssues);
  const headEventHash = events.at(-1)?.eventHash ?? CAPABILITY_SYNTHESIS_GENESIS_EVENT_HASH;
  const payload: Omit<CapabilitySynthesisEventHistoryReport, 'reportHash'> = {
    status: issues.length === 0 ? 'valid' : 'invalid',
    eventCount: events.length,
    headEventHash,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function buildAppendReport(input: {
  status: 'appended' | 'blocked';
  event?: CapabilitySynthesisStateEvent;
  events: CapabilitySynthesisStateEvent[];
  issues: CapabilitySynthesisEventHistoryIssue[];
}): CapabilitySynthesisEventAppendReport {
  const headEventHash = input.events.at(-1)?.eventHash ?? CAPABILITY_SYNTHESIS_GENESIS_EVENT_HASH;
  const payload: Omit<CapabilitySynthesisEventAppendReport, 'reportHash'> = {
    status: input.status,
    ...(input.event === undefined ? {} : { event: input.event }),
    events: input.events,
    issues: input.issues,
    headEventHash
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function eventIssues(
  event: CapabilitySynthesisStateEvent,
  index: number,
  previousEvent: CapabilitySynthesisStateEvent | undefined,
  rootRequestId: string | undefined
): CapabilitySynthesisEventHistoryIssue[] {
  const issues: CapabilitySynthesisEventHistoryIssue[] = [];
  if (rootRequestId !== undefined && event.requestId !== rootRequestId) {
    issues.push({ code: 'EVENT_REQUEST_ID_MISMATCH', message: 'State event requestId does not match the history root requestId.', eventIndex: index });
  }
  if (event.actor.actorId.trim().length === 0 || event.actor.roles.length === 0) {
    issues.push({ code: 'EVENT_ACTOR_MISSING', message: 'State event requires actor ID and roles.', eventIndex: index });
  }
  if (event.artifactRefs.length === 0 || event.artifactRefs.some((ref) => ref.artifactKind.trim().length === 0 || ref.path.trim().length === 0)) {
    issues.push({ code: 'EVENT_ARTIFACT_REFS_MISSING', message: 'State event requires non-empty artifact refs.', eventIndex: index });
  }
  if (event.createdAt.trim().length === 0 || Number.isNaN(Date.parse(event.createdAt))) {
    issues.push({ code: 'EVENT_CREATED_AT_INVALID', message: 'State event requires a valid createdAt timestamp.', eventIndex: index });
  }
  const expectedPreviousHash = previousEvent?.eventHash ?? CAPABILITY_SYNTHESIS_GENESIS_EVENT_HASH;
  if (event.previousEventHash !== expectedPreviousHash) {
    issues.push({ code: 'EVENT_PREVIOUS_HASH_MISMATCH', message: 'State event previous hash does not match history head.', eventIndex: index });
  }
  if (previousEvent === undefined) {
    if (event.fromState !== undefined || event.toState !== 'RECEIVED') {
      issues.push({ code: 'EVENT_INVALID_INITIAL_STATE', message: 'First state event must enter RECEIVED from genesis.', eventIndex: index });
    }
  } else {
    if (event.fromState === undefined) {
      issues.push({ code: 'EVENT_FROM_STATE_MISSING', message: 'Non-initial state event requires fromState.', eventIndex: index });
    }
    if (event.transitionHash === undefined) {
      issues.push({ code: 'EVENT_TRANSITION_HASH_MISSING', message: 'Non-initial state event requires transition hash.', eventIndex: index });
    }
    if (event.fromState !== undefined) {
      if (event.fromState !== previousEvent.toState) {
        issues.push({ code: 'EVENT_STATE_CONTINUITY_MISMATCH', message: 'State event fromState does not match previous toState.', eventIndex: index });
      }
      if (!isCapabilitySynthesisStateTransitionAllowed(event.fromState, event.toState)) {
        issues.push({
          code: 'EVENT_INVALID_STATE_TRANSITION',
          message: `State event transition ${event.fromState} -> ${event.toState} is not allowed.`,
          eventIndex: index
        });
      }
    }
  }
  const expectedEventHash = hashStableJson(eventHashPayload(event));
  if (event.eventHash !== expectedEventHash) {
    issues.push({ code: 'EVENT_HASH_MISMATCH', message: 'State event hash does not match event payload.', eventIndex: index });
  }
  if (event.eventId !== `capsyn_evt_${expectedEventHash.slice('fnv1a_'.length)}`) {
    issues.push({ code: 'EVENT_ID_MISMATCH', message: 'State event ID does not match event hash.', eventIndex: index });
  }
  return issues;
}

function eventHashPayload(input: Omit<CapabilitySynthesisStateEvent, 'eventId' | 'eventHash'>): Omit<CapabilitySynthesisStateEvent, 'eventId' | 'eventHash'> {
  return {
    schemaVersion: input.schemaVersion,
    requestId: input.requestId,
    eventType: input.eventType,
    actor: normalizeActor(input.actor),
    ...(input.fromState === undefined ? {} : { fromState: input.fromState }),
    toState: input.toState,
    previousEventHash: input.previousEventHash,
    ...(input.transitionHash === undefined ? {} : { transitionHash: input.transitionHash }),
    artifactRefs: normalizeArtifactRefs(input.artifactRefs),
    createdAt: input.createdAt
  };
}

function normalizeActor(actor: CapabilitySynthesisEventActor): CapabilitySynthesisEventActor {
  return {
    actorId: actor.actorId.trim(),
    roles: [...new Set(actor.roles)].sort()
  };
}

function normalizeArtifactRefs(refs: readonly CapabilitySynthesisEventArtifactRef[]): CapabilitySynthesisEventArtifactRef[] {
  return refs
    .map((ref) => ({
      artifactKind: ref.artifactKind.trim(),
      path: ref.path.trim(),
      ...(ref.reportHash === undefined ? {} : { reportHash: ref.reportHash })
    }))
    .sort((left, right) => `${left.artifactKind}:${left.path}:${left.reportHash ?? ''}`.localeCompare(`${right.artifactKind}:${right.path}:${right.reportHash ?? ''}`));
}

function compareIssues(left: CapabilitySynthesisEventHistoryIssue, right: CapabilitySynthesisEventHistoryIssue): number {
  return `${left.eventIndex ?? -1}:${left.code}`.localeCompare(`${right.eventIndex ?? -1}:${right.code}`);
}
