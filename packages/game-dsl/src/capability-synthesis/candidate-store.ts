import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import { isCapabilitySynthesisAttemptId, isCapabilitySynthesisAttemptIdForRequest, isCapabilitySynthesisRequestId } from './request-id.js';

export const CAPABILITY_SYNTHESIS_CANDIDATE_STORE_ROOT = 'local-data/capability-synthesis';

export type CapabilityCandidateStoreIssue = {
  code:
    | 'CANDIDATE_STORE_INVALID_REQUEST_ID'
    | 'CANDIDATE_STORE_INVALID_ATTEMPT_ID'
    | 'CANDIDATE_STORE_ATTEMPT_REQUEST_MISMATCH'
    | 'CANDIDATE_STORE_PATH_EMPTY'
    | 'CANDIDATE_STORE_PATH_ABSOLUTE'
    | 'CANDIDATE_STORE_PATH_BACKSLASH'
    | 'CANDIDATE_STORE_PATH_TRAVERSAL'
    | 'CANDIDATE_STORE_OUTSIDE_ATTEMPT_NAMESPACE'
    | 'CANDIDATE_STORE_FORBIDDEN_ACTIVE_ARTIFACTS'
    | 'CANDIDATE_STORE_FORBIDDEN_GENERATED_PROJECT'
    | 'CANDIDATE_STORE_FORBIDDEN_SOURCE_TREE'
    | 'CANDIDATE_STORE_FORBIDDEN_PACKAGE_JSON'
    | 'CANDIDATE_STORE_FORBIDDEN_REGISTRY_PATH';
  message: string;
  path?: string;
};

export type CapabilityCandidateStoreWriteReport = {
  status: 'allowed' | 'blocked';
  requestId: string;
  attemptId: string;
  namespaceRoot: string;
  requestedPath: string;
  normalizedPath?: string;
  issues: CapabilityCandidateStoreIssue[];
  reportHash: string;
};

type ForbiddenPathRule = {
  code: CapabilityCandidateStoreIssue['code'];
  message: string;
  matches: (normalizedPath: string) => boolean;
};

const FORBIDDEN_PATH_RULES: readonly ForbiddenPathRule[] = [
  {
    code: 'CANDIDATE_STORE_FORBIDDEN_PACKAGE_JSON',
    message: 'Candidate store cannot write package.json files.',
    matches: (path) => path === 'package.json' || path.endsWith('/package.json')
  },
  {
    code: 'CANDIDATE_STORE_FORBIDDEN_SOURCE_TREE',
    message: 'Candidate store cannot write source tree paths.',
    matches: (path) => path.startsWith('apps/') || path.startsWith('packages/') || path.startsWith('scripts/')
  },
  {
    code: 'CANDIDATE_STORE_FORBIDDEN_REGISTRY_PATH',
    message: 'Candidate store cannot write active gameplay capability registry paths.',
    matches: (path) =>
      path.startsWith('packages/game-dsl/src/gameplay-capabilities/') ||
      path.startsWith('local-data/gameplay-capability-registry/') ||
      path.startsWith('local-data/capability-registry/')
  },
  {
    code: 'CANDIDATE_STORE_FORBIDDEN_ACTIVE_ARTIFACTS',
    message: 'Candidate store cannot write active artifact paths.',
    matches: (path) => path.startsWith('artifacts/') || path.startsWith('data/artifacts/')
  },
  {
    code: 'CANDIDATE_STORE_FORBIDDEN_GENERATED_PROJECT',
    message: 'Candidate store cannot write generated project paths.',
    matches: (path) => path.startsWith('generated-projects/') || path.startsWith('data/generated-projects/')
  }
];

export function buildCapabilityCandidateStoreNamespace(input: { requestId: string; attemptId: string }): string {
  return `${CAPABILITY_SYNTHESIS_CANDIDATE_STORE_ROOT}/${input.requestId}/${input.attemptId}`;
}

export function validateCapabilityCandidateStoreWrite(input: {
  requestId: string;
  attemptId: string;
  requestedPath: string;
}): CapabilityCandidateStoreWriteReport {
  const namespaceRoot = buildCapabilityCandidateStoreNamespace({ requestId: input.requestId, attemptId: input.attemptId });
  const normalizedPathResult = normalizeWorkspaceRelativePath(input.requestedPath);
  const normalizedPath = normalizedPathResult.normalizedPath;
  const issues = [
    ...identityIssues(input.requestId, input.attemptId),
    ...normalizedPathResult.issues,
    ...(normalizedPath === undefined ? [] : forbiddenPathIssues(normalizedPath, namespaceRoot))
  ].sort(compareIssues);
  const payload: Omit<CapabilityCandidateStoreWriteReport, 'reportHash'> = {
    status: issues.length === 0 ? 'allowed' : 'blocked',
    requestId: input.requestId,
    attemptId: input.attemptId,
    namespaceRoot,
    requestedPath: input.requestedPath,
    ...(normalizedPath === undefined ? {} : { normalizedPath }),
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function identityIssues(requestId: string, attemptId: string): CapabilityCandidateStoreIssue[] {
  const issues: CapabilityCandidateStoreIssue[] = [];
  if (!isCapabilitySynthesisRequestId(requestId)) {
    issues.push({ code: 'CANDIDATE_STORE_INVALID_REQUEST_ID', message: `Invalid capability synthesis request ID: ${requestId}.` });
  }
  if (!isCapabilitySynthesisAttemptId(attemptId)) {
    issues.push({ code: 'CANDIDATE_STORE_INVALID_ATTEMPT_ID', message: `Invalid capability synthesis attempt ID: ${attemptId}.` });
  } else if (isCapabilitySynthesisRequestId(requestId) && !isCapabilitySynthesisAttemptIdForRequest(attemptId, requestId)) {
    issues.push({
      code: 'CANDIDATE_STORE_ATTEMPT_REQUEST_MISMATCH',
      message: `Capability synthesis attempt ID ${attemptId} does not belong to request ID ${requestId}.`
    });
  }
  return issues;
}

function normalizeWorkspaceRelativePath(path: string): {
  normalizedPath?: string;
  issues: CapabilityCandidateStoreIssue[];
} {
  const issues: CapabilityCandidateStoreIssue[] = [];
  const trimmedPath = path.trim();
  if (trimmedPath.length === 0) {
    return { issues: [{ code: 'CANDIDATE_STORE_PATH_EMPTY', message: 'Candidate store path is empty.' }] };
  }
  if (trimmedPath.startsWith('/')) {
    issues.push({ code: 'CANDIDATE_STORE_PATH_ABSOLUTE', message: 'Candidate store path must be workspace-relative.', path: trimmedPath });
  }
  if (trimmedPath.includes('\\')) {
    issues.push({ code: 'CANDIDATE_STORE_PATH_BACKSLASH', message: 'Candidate store path must use POSIX separators.', path: trimmedPath });
  }
  const segments = trimmedPath.split('/').filter((segment) => segment.length > 0 && segment !== '.');
  if (segments.includes('..')) {
    issues.push({ code: 'CANDIDATE_STORE_PATH_TRAVERSAL', message: 'Candidate store path cannot contain traversal segments.', path: trimmedPath });
  }
  if (issues.length > 0) {
    return { issues };
  }
  return { normalizedPath: segments.join('/'), issues: [] };
}

function forbiddenPathIssues(normalizedPath: string, namespaceRoot: string): CapabilityCandidateStoreIssue[] {
  const issues = FORBIDDEN_PATH_RULES.flatMap((rule) =>
    rule.matches(normalizedPath) ? [{ code: rule.code, message: rule.message, path: normalizedPath }] : []
  );
  if (normalizedPath !== namespaceRoot && !normalizedPath.startsWith(`${namespaceRoot}/`)) {
    issues.push({
      code: 'CANDIDATE_STORE_OUTSIDE_ATTEMPT_NAMESPACE',
      message: `Candidate store writes must stay under ${namespaceRoot}.`,
      path: normalizedPath
    });
  }
  return issues;
}

function compareIssues(left: CapabilityCandidateStoreIssue, right: CapabilityCandidateStoreIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}
