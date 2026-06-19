import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import type { CapabilitySynthesisAttemptManifest } from './candidate-sandbox.js';
import type {
  CapabilityScaffoldAllowedFileMap,
  CapabilityScaffoldReport,
  CapabilityScaffoldSourceManifest
} from './capability-scaffold.js';
import {
  CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
  validateCapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecision,
  type CapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecisionReceiptResolver
} from './capability-policy.js';

export const CANDIDATE_SOURCE_RESPONSE_SCHEMA_VERSION = 'step36.candidate-source-response.v1';
export const CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION = 'step36.candidate-source-artifact.v1';
export const CANDIDATE_SOURCE_RAW_RESPONSE_KIND = 'candidate_source_response.raw';
export const CANDIDATE_SOURCE_NORMALIZED_RESPONSE_KIND = 'candidate_source_response.normalized';
export const CANDIDATE_SOURCE_POLICY_PRECHECK_KIND = 'candidate_source_policy_precheck';
export const CANDIDATE_WRITTEN_SOURCE_MANIFEST_KIND = 'candidate_source_manifest';
export const CANDIDATE_SOURCE_PROVENANCE_KIND = 'candidate_source_provenance';
export const CANDIDATE_ASSUMPTIONS_KIND = 'candidate_assumptions';
export const CANDIDATE_UNIMPLEMENTED_REPORT_KIND = 'candidate_unimplemented_report';

export type CandidateSourceResponseFile = {
  path: string;
  content: string;
  purpose: string;
};

export type CandidateSourceResponse = {
  schemaVersion: typeof CANDIDATE_SOURCE_RESPONSE_SCHEMA_VERSION;
  files: CandidateSourceResponseFile[];
  assumptions: string[];
  unimplemented: string[];
};

export type CandidateSourceContext = {
  requestId: string;
  attemptId: string;
  specificationHash: string;
  decisionContextHash: string;
  policyDecisionHash: string;
  policyDecisionReceiptHash: string;
  attemptManifestHash: string;
  workspaceManifestHash: string;
  scaffoldReportHash: string;
  allowedFileMapHash: string;
  initialSourceManifestHash: string;
  sdkVersion: string;
  sdkHash?: string;
};

export type CandidateSourceModelProvenance = {
  provider: string;
  model: string;
  promptVersion: string;
  invocationId: string;
  fallbackUsed: boolean;
};

export type CandidateSourceIssue = {
  code:
    | 'SOURCE_RESPONSE_NOT_OBJECT'
    | 'SOURCE_RESPONSE_SCHEMA_INVALID'
    | 'SOURCE_RESPONSE_FILES_INVALID'
    | 'SOURCE_RESPONSE_FIELD_INVALID'
    | 'SOURCE_PATH_INVALID'
    | 'SOURCE_PATH_DUPLICATE'
    | 'SOURCE_PATH_NOT_WRITABLE'
    | 'SOURCE_CONTENT_BINARY'
    | 'SOURCE_CONTENT_BASE64'
    | 'SOURCE_CONTENT_OVERSIZED'
    | 'SOURCE_FORBIDDEN_API'
    | 'SOURCE_DIRECT_ENGINE_ACCESS'
    | 'SOURCE_ANY_ESCAPE'
    | 'SOURCE_PLACEHOLDER_IMPLEMENTATION'
    | 'SOURCE_REQUIRED_FILE_MISSING'
    | 'SOURCE_UNIMPLEMENTED_DECLARED'
    | 'SOURCE_POLICY_RECEIPT_INVALID'
    | 'SOURCE_CONTEXT_MISMATCH'
    | 'SOURCE_SCAFFOLD_REPORT_INVALID';
  message: string;
  path?: string;
};

export type CandidateSourceRawResponseArtifact = {
  artifactKind: typeof CANDIDATE_SOURCE_RAW_RESPONSE_KIND;
  schemaVersion: typeof CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION;
  context: CandidateSourceContext;
  rawResponseHash: string;
};

export type CandidateSourceNormalizedResponseArtifact = {
  artifactKind: typeof CANDIDATE_SOURCE_NORMALIZED_RESPONSE_KIND;
  schemaVersion: typeof CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION;
  context: CandidateSourceContext;
  response: CandidateSourceResponse;
  normalizedResponseHash: string;
};

export type CandidateSourcePolicyPrecheck = {
  artifactKind: typeof CANDIDATE_SOURCE_POLICY_PRECHECK_KIND;
  schemaVersion: typeof CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION;
  status: 'allowed' | 'blocked';
  context: CandidateSourceContext;
  writeMode: 'all_or_nothing';
  filesWritten: boolean;
  issues: CandidateSourceIssue[];
  normalizedResponseHash?: string;
  precheckHash: string;
};

export type CandidateSourceManifest = {
  artifactKind: typeof CANDIDATE_WRITTEN_SOURCE_MANIFEST_KIND;
  schemaVersion: typeof CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION;
  status: 'written' | 'blocked';
  context: CandidateSourceContext;
  allOrNothing: true;
  files: Array<{
    path: string;
    purpose: string;
    contentHash: string;
    byteLength: number;
  }>;
  sourceManifestHash: string;
};

export type CandidateSourceProvenance = {
  artifactKind: typeof CANDIDATE_SOURCE_PROVENANCE_KIND;
  schemaVersion: typeof CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION;
  context: CandidateSourceContext;
  model: CandidateSourceModelProvenance;
  inputHashes: {
    specificationHash: string;
    decisionContextHash: string;
    policyDecisionReceiptHash: string;
    attemptManifestHash: string;
    workspaceManifestHash: string;
    scaffoldReportHash: string;
    allowedFileMapHash: string;
    initialSourceManifestHash: string;
    sdkVersion: string;
    sdkHash?: string;
  };
  outputHash: string;
  provenanceHash: string;
};

export type CandidateAssumptionsArtifact = {
  artifactKind: typeof CANDIDATE_ASSUMPTIONS_KIND;
  schemaVersion: typeof CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION;
  context: CandidateSourceContext;
  assumptions: string[];
  assumptionsHash: string;
};

export type CandidateUnimplementedReport = {
  artifactKind: typeof CANDIDATE_UNIMPLEMENTED_REPORT_KIND;
  schemaVersion: typeof CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION;
  context: CandidateSourceContext;
  unimplemented: string[];
  reportHash: string;
};

export type CandidateSourceArtifacts = {
  rawResponse: CandidateSourceRawResponseArtifact;
  normalizedResponse?: CandidateSourceNormalizedResponseArtifact;
  policyPrecheck: CandidateSourcePolicyPrecheck;
  sourceManifest: CandidateSourceManifest;
  provenance: CandidateSourceProvenance;
  assumptions: CandidateAssumptionsArtifact;
  unimplementedReport: CandidateUnimplementedReport;
};

export function buildCandidateSourceArtifacts(input: {
  rawResponse: unknown;
  allowedFileMap: CapabilityScaffoldAllowedFileMap;
  initialSourceManifest: CapabilityScaffoldSourceManifest;
  scaffoldReport: CapabilityScaffoldReport;
  attemptManifest: CapabilitySynthesisAttemptManifest;
  policyDecision: CapabilitySynthesisPolicyDecision;
  trustedPolicyDecisionReceiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver;
  sdkVersion: string;
  sdkHash?: string;
  model: CandidateSourceModelProvenance;
  maxFileBytes?: number;
}): CandidateSourceArtifacts {
  const trustedReceipt = resolveTrustedPolicyDecisionReceipt({
    receiptRef: input.trustedPolicyDecisionReceiptRef,
    store: input.trustedPolicyDecisionStore
  });
  const context = buildCandidateSourceContext({ ...input, trustedReceipt });
  const rawResponse = buildRawResponseArtifact(context, input.rawResponse);
  const parsed = parseCandidateSourceResponse(input.rawResponse);
  const normalizedResponse = parsed.response === undefined ? undefined : buildNormalizedResponseArtifact(context, parsed.response);
  const issues = [
    ...contextIssues(input, trustedReceipt, context),
    ...parsed.issues,
    ...(parsed.response === undefined
      ? []
      : responsePolicyIssues({
          response: parsed.response,
          allowedFileMap: input.allowedFileMap,
          maxFileBytes: input.maxFileBytes ?? 256 * 1024
        }))
  ].sort(compareIssues);
  const blocked = issues.length > 0;
  const policyPrecheck = buildPolicyPrecheck({
    context,
    issues,
    normalizedResponseHash: normalizedResponse?.normalizedResponseHash,
    filesWritten: !blocked
  });
  const sourceManifest = buildSourceManifestArtifact({
    context,
    response: blocked ? undefined : parsed.response
  });
  const provenance = buildSourceProvenance({
    context,
    model: input.model,
    outputHash: normalizedResponse?.normalizedResponseHash ?? rawResponse.rawResponseHash
  });
  const assumptions = buildAssumptionsArtifact(context, parsed.response?.assumptions ?? []);
  const unimplementedReport = buildUnimplementedReport(context, parsed.response?.unimplemented ?? []);
  return {
    rawResponse,
    ...(normalizedResponse === undefined ? {} : { normalizedResponse }),
    policyPrecheck,
    sourceManifest,
    provenance,
    assumptions,
    unimplementedReport
  };
}

function buildCandidateSourceContext(input: {
  scaffoldReport: CapabilityScaffoldReport;
  attemptManifest: CapabilitySynthesisAttemptManifest;
  policyDecision: CapabilitySynthesisPolicyDecision;
  trustedReceipt: CapabilitySynthesisPolicyDecisionReceipt | undefined;
  allowedFileMap: CapabilityScaffoldAllowedFileMap;
  initialSourceManifest: CapabilityScaffoldSourceManifest;
  sdkVersion: string;
  sdkHash?: string;
}): CandidateSourceContext {
  return {
    requestId: input.attemptManifest.requestId,
    attemptId: input.attemptManifest.attemptId,
    specificationHash: input.scaffoldReport.specificationHash,
    decisionContextHash: input.trustedReceipt?.subject.decisionContextHash ?? input.policyDecision.decisionContextHash ?? '',
    policyDecisionHash: input.policyDecision.decisionHash,
    policyDecisionReceiptHash: input.trustedReceipt?.receiptHash ?? '',
    attemptManifestHash: input.attemptManifest.attemptManifestHash,
    workspaceManifestHash: input.attemptManifest.workspaceManifestHash,
    scaffoldReportHash: input.scaffoldReport.scaffoldReportHash,
    allowedFileMapHash: input.allowedFileMap.allowedFileMapHash,
    initialSourceManifestHash: input.initialSourceManifest.initialSourceManifestHash,
    sdkVersion: input.sdkVersion,
    ...(input.sdkHash === undefined ? {} : { sdkHash: input.sdkHash })
  };
}

function parseCandidateSourceResponse(rawResponse: unknown): {
  response?: CandidateSourceResponse;
  issues: CandidateSourceIssue[];
} {
  if (!isRecord(rawResponse)) {
    return { issues: [issue('SOURCE_RESPONSE_NOT_OBJECT', 'Candidate source response must be an object.')] };
  }
  const issues: CandidateSourceIssue[] = [];
  if (rawResponse.schemaVersion !== CANDIDATE_SOURCE_RESPONSE_SCHEMA_VERSION) {
    issues.push(issue('SOURCE_RESPONSE_SCHEMA_INVALID', 'Candidate source response schemaVersion is invalid.'));
  }
  if (!Array.isArray(rawResponse.files)) {
    issues.push(issue('SOURCE_RESPONSE_FILES_INVALID', 'Candidate source response files must be an array.'));
  }
  if (!Array.isArray(rawResponse.assumptions) || !rawResponse.assumptions.every((value) => typeof value === 'string')) {
    issues.push(issue('SOURCE_RESPONSE_FIELD_INVALID', 'Candidate source response assumptions must be a string array.'));
  }
  if (!Array.isArray(rawResponse.unimplemented) || !rawResponse.unimplemented.every((value) => typeof value === 'string')) {
    issues.push(issue('SOURCE_RESPONSE_FIELD_INVALID', 'Candidate source response unimplemented must be a string array.'));
  }
  const files = Array.isArray(rawResponse.files)
    ? rawResponse.files.map((file) => normalizeSourceFile(file, issues)).filter(isPresent)
    : [];
  const response: CandidateSourceResponse = {
    schemaVersion: CANDIDATE_SOURCE_RESPONSE_SCHEMA_VERSION,
    files,
    assumptions: Array.isArray(rawResponse.assumptions) ? uniqueStrings(rawResponse.assumptions.filter((value): value is string => typeof value === 'string')) : [],
    unimplemented: Array.isArray(rawResponse.unimplemented) ? uniqueStrings(rawResponse.unimplemented.filter((value): value is string => typeof value === 'string')) : []
  };
  return { response: issues.some((item) => item.code === 'SOURCE_RESPONSE_NOT_OBJECT') ? undefined : response, issues };
}

function normalizeSourceFile(file: unknown, issues: CandidateSourceIssue[]): CandidateSourceResponseFile | undefined {
  if (!isRecord(file) || typeof file.path !== 'string' || typeof file.content !== 'string' || typeof file.purpose !== 'string') {
    issues.push(issue('SOURCE_RESPONSE_FIELD_INVALID', 'Candidate source file entries require path, content and purpose strings.'));
    return undefined;
  }
  if (unsafeModelPath(file.path)) {
    issues.push(issue('SOURCE_PATH_INVALID', `Candidate source path ${file.path} is not a safe attempt-relative path.`, file.path));
  }
  return {
    path: normalizePath(file.path),
    content: normalizeLineEndings(file.content),
    purpose: file.purpose.trim()
  };
}

function responsePolicyIssues(input: {
  response: CandidateSourceResponse;
  allowedFileMap: CapabilityScaffoldAllowedFileMap;
  maxFileBytes: number;
}): CandidateSourceIssue[] {
  const issues: CandidateSourceIssue[] = [];
  const seen = new Set<string>();
  const writable = new Set(input.allowedFileMap.files.filter((file) => file.classification === 'writable_by_model').map((file) => file.path));
  for (const file of input.response.files) {
    if (seen.has(file.path)) {
      issues.push(issue('SOURCE_PATH_DUPLICATE', `Duplicate candidate source path ${file.path}.`, file.path));
    }
    seen.add(file.path);
  if (!writable.has(file.path)) {
      issues.push(issue('SOURCE_PATH_NOT_WRITABLE', `Candidate source path ${file.path} is not writable by model.`, file.path));
    }
    if (hardForbiddenOutputPath(file.path)) {
      issues.push(issue('SOURCE_PATH_NOT_WRITABLE', `Candidate source path ${file.path} is reserved for trusted artifacts.`, file.path));
    }
    issues.push(...contentPolicyIssues(file, input.maxFileBytes));
  }
  for (const requiredPath of writable) {
    if (!seen.has(requiredPath)) {
      issues.push(issue('SOURCE_REQUIRED_FILE_MISSING', `Required writable file ${requiredPath} is missing from candidate source response.`, requiredPath));
    }
  }
  if (input.response.unimplemented.length > 0) {
    issues.push(issue('SOURCE_UNIMPLEMENTED_DECLARED', 'Candidate source response declares unimplemented work.'));
  }
  return issues;
}

function contentPolicyIssues(file: CandidateSourceResponseFile, maxFileBytes: number): CandidateSourceIssue[] {
  const issues: CandidateSourceIssue[] = [];
  const byteLength = Buffer.byteLength(file.content, 'utf8');
  if (file.content.includes('\0')) {
    issues.push(issue('SOURCE_CONTENT_BINARY', `Candidate source file ${file.path} contains binary content.`, file.path));
  }
  if (looksLikeBase64(file.content) || containsEmbeddedBase64Payload(file.content)) {
    issues.push(issue('SOURCE_CONTENT_BASE64', `Candidate source file ${file.path} looks like base64 payload.`, file.path));
  }
  if (byteLength > maxFileBytes) {
    issues.push(issue('SOURCE_CONTENT_OVERSIZED', `Candidate source file ${file.path} exceeds the source size budget.`, file.path));
  }
  if (FORBIDDEN_API_PATTERNS.some((pattern) => pattern.test(file.content))) {
    issues.push(issue('SOURCE_FORBIDDEN_API', `Candidate source file ${file.path} uses a forbidden API.`, file.path));
  }
  if (DIRECT_ENGINE_PATTERNS.some((pattern) => pattern.test(file.content))) {
    issues.push(issue('SOURCE_DIRECT_ENGINE_ACCESS', `Candidate source file ${file.path} attempts direct engine access.`, file.path));
  }
  if (ANY_ESCAPE_PATTERNS.some((pattern) => pattern.test(file.content))) {
    issues.push(issue('SOURCE_ANY_ESCAPE', `Candidate source file ${file.path} uses a forbidden type escape.`, file.path));
  }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(file.content))) {
    issues.push(issue('SOURCE_PLACEHOLDER_IMPLEMENTATION', `Candidate source file ${file.path} contains placeholder implementation.`, file.path));
  }
  return issues;
}

function contextIssues(
  input: {
    scaffoldReport: CapabilityScaffoldReport;
    attemptManifest: CapabilitySynthesisAttemptManifest;
    policyDecision: CapabilitySynthesisPolicyDecision;
    trustedPolicyDecisionReceiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
    trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver;
    allowedFileMap: CapabilityScaffoldAllowedFileMap;
    initialSourceManifest: CapabilityScaffoldSourceManifest;
    sdkVersion: string;
  },
  trustedReceipt: CapabilitySynthesisPolicyDecisionReceipt | undefined,
  context: CandidateSourceContext
): CandidateSourceIssue[] {
  const receiptValid = validateCapabilitySynthesisPolicyDecisionReceipt({
    decision: input.policyDecision,
    receipt: trustedReceipt,
    receiptRef: input.trustedPolicyDecisionReceiptRef,
    trustedPolicyDecisionStore: input.trustedPolicyDecisionStore
  });
  return [
    ...(receiptValid ? [] : [issue('SOURCE_POLICY_RECEIPT_INVALID', 'Candidate source requires a trusted policy decision receipt.')]),
    ...(input.scaffoldReport.status === 'generated' &&
    input.scaffoldReport.scaffoldReportHash === recomputeScaffoldReportHash(input.scaffoldReport)
      ? []
      : [issue('SOURCE_SCAFFOLD_REPORT_INVALID', 'Candidate source requires a generated scaffold report with valid hash.')]),
    ...(input.attemptManifest.attemptManifestHash === recomputeAttemptManifestHash(input.attemptManifest) &&
    input.allowedFileMap.allowedFileMapHash === recomputeAllowedFileMapHash(input.allowedFileMap) &&
    input.initialSourceManifest.initialSourceManifestHash === recomputeInitialSourceManifestHash(input.initialSourceManifest)
      ? []
      : [issue('SOURCE_CONTEXT_MISMATCH', 'Candidate source child artifact hash does not match its payload.')]),
    ...(input.scaffoldReport.decisionContextHash === context.decisionContextHash &&
    input.scaffoldReport.policyDecisionHash === input.policyDecision.decisionHash &&
    input.scaffoldReport.attemptManifestHash === input.attemptManifest.attemptManifestHash &&
    input.scaffoldReport.workspaceManifestHash === input.attemptManifest.workspaceManifestHash &&
    input.scaffoldReport.allowedFileMapHash === input.allowedFileMap.allowedFileMapHash &&
    input.scaffoldReport.initialSourceManifestHash === input.initialSourceManifest.initialSourceManifestHash &&
    input.scaffoldReport.sdkVersion === input.sdkVersion
      ? []
      : [issue('SOURCE_CONTEXT_MISMATCH', 'Candidate source context does not match scaffold, attempt, policy receipt or allowed files.')])
  ];
}

function buildRawResponseArtifact(context: CandidateSourceContext, rawResponse: unknown): CandidateSourceRawResponseArtifact {
  const payload: Omit<CandidateSourceRawResponseArtifact, 'rawResponseHash'> = {
    artifactKind: CANDIDATE_SOURCE_RAW_RESPONSE_KIND,
    schemaVersion: CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION,
    context
  };
  return { ...payload, rawResponseHash: hashStableJson({ context, rawResponse }) };
}

function buildNormalizedResponseArtifact(context: CandidateSourceContext, response: CandidateSourceResponse): CandidateSourceNormalizedResponseArtifact {
  const payload: Omit<CandidateSourceNormalizedResponseArtifact, 'normalizedResponseHash'> = {
    artifactKind: CANDIDATE_SOURCE_NORMALIZED_RESPONSE_KIND,
    schemaVersion: CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION,
    context,
    response: {
      ...response,
      files: [...response.files].sort((left, right) => left.path.localeCompare(right.path))
    }
  };
  return { ...payload, normalizedResponseHash: hashStableJson(payload) };
}

function buildPolicyPrecheck(input: {
  context: CandidateSourceContext;
  issues: CandidateSourceIssue[];
  normalizedResponseHash?: string;
  filesWritten: boolean;
}): CandidateSourcePolicyPrecheck {
  const payload: Omit<CandidateSourcePolicyPrecheck, 'precheckHash'> = {
    artifactKind: CANDIDATE_SOURCE_POLICY_PRECHECK_KIND,
    schemaVersion: CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION,
    status: input.issues.length === 0 ? 'allowed' : 'blocked',
    context: input.context,
    writeMode: 'all_or_nothing',
    filesWritten: input.filesWritten,
    issues: [...input.issues].sort(compareIssues),
    ...(input.normalizedResponseHash === undefined ? {} : { normalizedResponseHash: input.normalizedResponseHash })
  };
  return { ...payload, precheckHash: hashStableJson(payload) };
}

function buildSourceManifestArtifact(input: {
  context: CandidateSourceContext;
  response: CandidateSourceResponse | undefined;
}): CandidateSourceManifest {
  const payload: Omit<CandidateSourceManifest, 'sourceManifestHash'> = {
    artifactKind: CANDIDATE_WRITTEN_SOURCE_MANIFEST_KIND,
    schemaVersion: CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION,
    status: input.response === undefined ? 'blocked' : 'written',
    context: input.context,
    allOrNothing: true,
    files: input.response === undefined
      ? []
      : input.response.files
          .map((file) => ({
            path: file.path,
            purpose: file.purpose,
            contentHash: hashStableJson({ path: file.path, content: file.content }),
            byteLength: Buffer.byteLength(file.content, 'utf8')
          }))
          .sort((left, right) => left.path.localeCompare(right.path))
  };
  return { ...payload, sourceManifestHash: hashStableJson(payload) };
}

function buildSourceProvenance(input: {
  context: CandidateSourceContext;
  model: CandidateSourceModelProvenance;
  outputHash: string;
}): CandidateSourceProvenance {
  const payload: Omit<CandidateSourceProvenance, 'provenanceHash'> = {
    artifactKind: CANDIDATE_SOURCE_PROVENANCE_KIND,
    schemaVersion: CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION,
    context: input.context,
    model: input.model,
    inputHashes: {
      specificationHash: input.context.specificationHash,
      decisionContextHash: input.context.decisionContextHash,
      policyDecisionReceiptHash: input.context.policyDecisionReceiptHash,
      attemptManifestHash: input.context.attemptManifestHash,
      workspaceManifestHash: input.context.workspaceManifestHash,
      scaffoldReportHash: input.context.scaffoldReportHash,
      allowedFileMapHash: input.context.allowedFileMapHash,
      initialSourceManifestHash: input.context.initialSourceManifestHash,
      sdkVersion: input.context.sdkVersion,
      ...(input.context.sdkHash === undefined ? {} : { sdkHash: input.context.sdkHash })
    },
    outputHash: input.outputHash
  };
  return { ...payload, provenanceHash: hashStableJson(payload) };
}

function buildAssumptionsArtifact(context: CandidateSourceContext, assumptions: string[]): CandidateAssumptionsArtifact {
  const payload: Omit<CandidateAssumptionsArtifact, 'assumptionsHash'> = {
    artifactKind: CANDIDATE_ASSUMPTIONS_KIND,
    schemaVersion: CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION,
    context,
    assumptions: uniqueStrings(assumptions)
  };
  return { ...payload, assumptionsHash: hashStableJson(payload) };
}

function buildUnimplementedReport(context: CandidateSourceContext, unimplemented: string[]): CandidateUnimplementedReport {
  const payload: Omit<CandidateUnimplementedReport, 'reportHash'> = {
    artifactKind: CANDIDATE_UNIMPLEMENTED_REPORT_KIND,
    schemaVersion: CANDIDATE_SOURCE_ARTIFACT_SCHEMA_VERSION,
    context,
    unimplemented: uniqueStrings(unimplemented)
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function resolveTrustedPolicyDecisionReceipt(input: {
  receiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  store: CapabilitySynthesisPolicyDecisionReceiptResolver;
}): CapabilitySynthesisPolicyDecisionReceipt | undefined {
  return input.store.namespace === CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE
    ? input.store.resolveReceipt(input.receiptRef)
    : undefined;
}

function recomputeScaffoldReportHash(report: CapabilityScaffoldReport): string {
  const { scaffoldReportHash: _scaffoldReportHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputeAttemptManifestHash(manifest: CapabilitySynthesisAttemptManifest): string {
  const { attemptManifestHash: _attemptManifestHash, ...payload } = manifest;
  return hashStableJson(payload);
}

function recomputeAllowedFileMapHash(allowedFileMap: CapabilityScaffoldAllowedFileMap): string {
  const { allowedFileMapHash: _allowedFileMapHash, ...payload } = allowedFileMap;
  return hashStableJson(payload);
}

function recomputeInitialSourceManifestHash(sourceManifest: CapabilityScaffoldSourceManifest): string {
  const { initialSourceManifestHash: _initialSourceManifestHash, ...payload } = sourceManifest;
  return hashStableJson(payload);
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

function unsafeModelPath(path: string): boolean {
  const trimmed = path.trim();
  return trimmed.length === 0 ||
    trimmed.startsWith('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0') ||
    trimmed.split('/').some((segment) => segment === '..' || segment.startsWith('.'));
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

function looksLikeBase64(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.length >= 80 && trimmed.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed);
}

function containsEmbeddedBase64Payload(content: string): boolean {
  return /data:[^'"\s;]+;base64,/i.test(content) || /['"`][A-Za-z0-9+/]{80,}={0,2}['"`]/.test(content);
}

function hardForbiddenOutputPath(path: string): boolean {
  return path === 'manifest.json' ||
    path === 'specification.json' ||
    path === 'package.json' ||
    path === 'tsconfig.json' ||
    path === 'README.candidate.md' ||
    path === 'provenance.json' ||
    path === 'allowed-files.json' ||
    path.startsWith('tests/external/') ||
    path.includes('/.') ||
    path.endsWith('.sh') ||
    path.endsWith('.wasm') ||
    path.endsWith('.node') ||
    path.endsWith('/Dockerfile') ||
    path === 'Dockerfile' ||
    path.endsWith('/docker-compose.yml') ||
    path === 'docker-compose.yml' ||
    path.endsWith('package-lock.json') ||
    path.endsWith('pnpm-lock.yaml') ||
    path.endsWith('yarn.lock');
}

function issue(code: CandidateSourceIssue['code'], message: string, path?: string): CandidateSourceIssue {
  return { code, message, ...(path === undefined ? {} : { path }) };
}

function compareIssues(left: CandidateSourceIssue, right: CandidateSourceIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}

const FORBIDDEN_API_PATTERNS = [
  /\bfrom\s+['"]node:/,
  /\bimport\s+['"](?![./])[^'"]+['"]/,
  /\bfrom\s+['"](?![./])[^'"]+['"]/,
  /\bfrom\s+['"](fs|path|os|net|tls|http|https|child_process|worker_threads|crypto)['"]/,
  /\brequire\s*\(/,
  /\bimport\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\bglobalThis\b/,
  /\blocalStorage\b/,
  /\bindexedDB\b/,
  /\bnavigator\b/,
  /\bprocess\.env\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bsetTimeout\s*\(/,
  /\bsetInterval\s*\(/,
  /\bDate\.now\b/,
  /\bnew\s+Date\s*\(/,
  /\bMath\.random\b/,
  /\bperformance\.now\b/,
  /\bcrypto\b/,
  /\bgetRandomValues\b/,
  /\brandomUUID\b/,
  /\bSubtleCrypto\b/,
  /\bprototype\b/,
  /\bObject\.defineProperty\s*\(\s*(globalThis|window|document)/,
  /\bWebAssembly\b/,
  /\bnew\s+Worker\s*\(/
];

const DIRECT_ENGINE_PATTERNS = [
  /\bfrom\s+['"]phaser['"]/i,
  /\bimport\s+\*\s+as\s+Phaser\b/,
  /\bPhaser\./,
  /\bgame\.scene\b/,
  /\bscene\.physics\b/,
  /\bscene\.add\b/,
  /\bscene\.tweens\b/,
  /\bscene\.cameras\b/,
  /\bthis\.physics\b/,
  /\bthis\.scene\b/,
  /\bthis\.game\b/,
  /\bthis\.add\b/,
  /\bthis\.tweens\b/
];

const ANY_ESCAPE_PATTERNS = [
  /:\s*any\b/,
  /\bas\s+any\b/,
  /\bas\s+unknown\s+as\b/,
  /<any>/,
  /<[^>\n]*\bany\b[^>\n]*>/,
  /@ts-ignore/,
  /@ts-expect-error/,
  /eslint-disable/,
  /!\./
];

const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /not implemented/i,
  /throw\s+new\s+Error\s*\(\s*['"]not implemented['"]\s*\)/i,
  /return\s+undefined\s*;/,
  /catch\s*(?:\([^)]*\))?\s*\{\s*\}/
];
