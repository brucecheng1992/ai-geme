import { hasFallbackAssets, resolveQaOverallStatus, runtimeStatusFromQaStatus } from './asset-semantic-qa.js';
import type { QaAssetReport, QaAssetSemanticIssue, QaAssetSemanticSummary, QaReport } from './qa.types.js';

const qaStatuses = ['PASSED', 'QA_FAILED'] as const;
const runtimeStatuses = ['PASSED', 'FAILED'] as const;
const assetSemanticStatuses = ['PASSED', 'WARNING', 'FAILED'] as const;
const overallStatuses = ['PLAYABLE', 'PLAYABLE_WITH_FALLBACK_ASSETS', 'PLAYABLE_WITH_ART_WARNINGS', 'NEEDS_ASSET_REPAIR', 'QA_FAILED'] as const;

export function normalizePersistedQaReport(raw: unknown): QaReport {
  if (!isRecord(raw)) {
    throw new Error('QA report must be an object.');
  }

  const assetReport = normalizePersistedAssetReport(raw.asset_report);
  const status = isOneOf(raw.status, qaStatuses) ? raw.status : 'QA_FAILED';
  const runtimeStatus = isOneOf(raw.runtime_status, runtimeStatuses) ? raw.runtime_status : runtimeStatusFromQaStatus(status);
  const assetSemanticStatus = isOneOf(raw.asset_semantic_status, assetSemanticStatuses) ? raw.asset_semantic_status : (assetReport?.semantic_status ?? 'PASSED');

  return {
    ...raw,
    status,
    runtime_status: runtimeStatus,
    asset_semantic_status: assetSemanticStatus,
    overall_status: isOneOf(raw.overall_status, overallStatuses)
      ? raw.overall_status
      : resolveQaOverallStatus({
          runtimeStatus,
          assetSemanticStatus,
          hasFallbackAssets: assetReport === undefined ? false : hasFallbackAssets(assetReport)
        }),
    ...(assetReport === undefined ? {} : { asset_report: assetReport })
  } as QaReport;
}

function normalizePersistedAssetReport(raw: unknown): QaAssetReport | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const semanticStatus = isOneOf(raw.semantic_status, assetSemanticStatuses) ? raw.semantic_status : 'PASSED';
  return {
    ...raw,
    semantic_status: semanticStatus,
    required: toStringArray(raw.required),
    ready: toStringArray(raw.ready),
    fallback_used: toStringArray(raw.fallback_used),
    placeholder_used: toStringArray(raw.placeholder_used),
    missing: toStringArray(raw.missing),
    assets: Array.isArray(raw.assets) ? (raw.assets as QaAssetSemanticSummary[]) : [],
    semantic_issues: Array.isArray(raw.semantic_issues) ? (raw.semantic_issues as QaAssetSemanticIssue[]) : [],
    failures: Array.isArray(raw.failures) ? raw.failures : []
  } as QaAssetReport;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(value: unknown, candidates: T): value is T[number] {
  return typeof value === 'string' && candidates.includes(value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
