import { hashStableJson } from '../gameplay-capabilities/stable-json.js';

export const CAPABILITY_SYNTHESIS_REQUEST_ID_PREFIX = 'capsyn_req_';
export const CAPABILITY_SYNTHESIS_ATTEMPT_ID_PREFIX = 'capsyn_attempt_';

export type CapabilitySynthesisRequestIdentity = {
  requestId: string;
  requestHash: string;
  dedupeKey: {
    projectId: string;
    requesterId: string;
    normalizedRequest: string;
    linkedAmendmentId?: string;
  };
};

export function buildCapabilitySynthesisRequestIdentity(input: {
  projectId: string;
  requesterId: string;
  requestText: string;
  linkedAmendmentId?: string;
}): CapabilitySynthesisRequestIdentity {
  const dedupeKey = {
    projectId: normalizeIdentifier(input.projectId),
    requesterId: normalizeIdentifier(input.requesterId),
    normalizedRequest: normalizeRequestText(input.requestText),
    ...(input.linkedAmendmentId === undefined ? {} : { linkedAmendmentId: normalizeIdentifier(input.linkedAmendmentId) })
  };
  const requestHash = hashStableJson(dedupeKey);
  return {
    requestId: `${CAPABILITY_SYNTHESIS_REQUEST_ID_PREFIX}${requestHash.slice('fnv1a_'.length)}`,
    requestHash,
    dedupeKey
  };
}

export function buildCapabilitySynthesisAttemptId(input: { requestId: string; attemptNumber: number }): string {
  if (!isCapabilitySynthesisRequestId(input.requestId)) {
    throw new Error(`Invalid capability synthesis request ID: ${input.requestId}.`);
  }
  if (!Number.isInteger(input.attemptNumber) || input.attemptNumber < 1) {
    throw new Error(`Invalid capability synthesis attempt number: ${input.attemptNumber}.`);
  }
  return `${CAPABILITY_SYNTHESIS_ATTEMPT_ID_PREFIX}${input.attemptNumber}_${hashStableJson(input).slice('fnv1a_'.length)}`;
}

export function isCapabilitySynthesisRequestId(value: string): boolean {
  return new RegExp(`^${CAPABILITY_SYNTHESIS_REQUEST_ID_PREFIX}[a-f0-9]{8}$`).test(value);
}

export function isCapabilitySynthesisAttemptId(value: string): boolean {
  return new RegExp(`^${CAPABILITY_SYNTHESIS_ATTEMPT_ID_PREFIX}[1-9][0-9]*_[a-f0-9]{8}$`).test(value);
}

export function parseCapabilitySynthesisAttemptId(value: string): { attemptNumber: number } | undefined {
  const match = new RegExp(`^${CAPABILITY_SYNTHESIS_ATTEMPT_ID_PREFIX}([1-9][0-9]*)_[a-f0-9]{8}$`).exec(value);
  return match === null ? undefined : { attemptNumber: Number(match[1]) };
}

export function isCapabilitySynthesisAttemptIdForRequest(value: string, requestId: string): boolean {
  const parsed = parseCapabilitySynthesisAttemptId(value);
  return parsed !== undefined && isCapabilitySynthesisRequestId(requestId) && buildCapabilitySynthesisAttemptId({ requestId, attemptNumber: parsed.attemptNumber }) === value;
}

function normalizeIdentifier(value: string): string {
  return value.trim();
}

function normalizeRequestText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
