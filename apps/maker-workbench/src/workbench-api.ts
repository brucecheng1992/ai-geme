export const API_BASE = 'http://localhost:3000';

export type ProjectStatus = {
  ok: true;
  project: {
    project_id: string;
    idea: string;
    language: string;
    status: string;
    latest_run_id: string;
    title?: string;
    genre?: string;
    preview_url?: string;
  };
  latest_run: {
    run_id: string;
    status: string;
    steps: Array<{ name: string; status: string }>;
  };
};

export type RunEvents = { ok: true; events: Array<{ timestamp: string; type: string; message: string }> };
export type RuntimeStatus = 'PASSED' | 'FAILED';
export type AssetSemanticStatus = 'PASSED' | 'WARNING' | 'FAILED';
export type OverallStatus = 'PLAYABLE' | 'PLAYABLE_WITH_FALLBACK_ASSETS' | 'PLAYABLE_WITH_ART_WARNINGS' | 'NEEDS_ASSET_REPAIR' | 'QA_FAILED';
export { formatAssetSemanticFitSummary, getWorkbenchStatusTone, resolveWorkbenchDisplayStatus } from './workbench-status.js';
export type { WorkbenchStatusTone } from './workbench-status.js';

export type QaReport = {
  status?: string;
  runtime_status?: RuntimeStatus;
  asset_semantic_status?: AssetSemanticStatus;
  overall_status?: OverallStatus;
  visual_status?: string;
  observed_events?: string[];
  missing_events?: string[];
  missing_any_groups?: string[][];
  console_errors?: string[];
  code?: string;
  asset_report?: QaAssetReport;
};

export type QaAssetRuntimeTelemetry = {
  manifest_loaded: boolean;
  required: string[];
  loaded: string[];
  failed: string[];
  fallback_used: string[];
  placeholder_used: string[];
  missing: string[];
  missing_required_roles: string[];
};

export type QaAssetReport = {
  manifest_summary?: {
    required: number;
    ready: number;
    fallback_used: number;
    placeholder_used: number;
    missing: number;
  };
  semantic_status?: AssetSemanticStatus;
  required: string[];
  ready: string[];
  fallback_used: string[];
  placeholder_used: string[];
  missing: string[];
  runtime?: QaAssetRuntimeTelemetry;
  assets?: QaAssetSemanticSummary[];
  semantic_issues?: QaAssetSemanticIssue[];
  sources?: Array<{
    source_pack: string;
    license_id: string;
    license_name: string;
    attribution: string;
    source_url: string;
  }>;
  failures: Array<{
    code: 'ASSET_MANIFEST_INVALID' | 'ASSET_MISSING' | 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED' | 'ASSET_LOAD_FAILED';
    message: string;
    asset_ids: string[];
    roles: string[];
  }>;
};

export type QaAssetSemanticSummary = {
  id: string;
  role: string;
  source: 'local_asset_pack' | 'runtime_asset' | 'template_svg' | 'placeholder';
  source_pack?: string;
  semantic_status: AssetSemanticStatus;
  semantic_fit?: QaAssetSemanticFit;
};

export type QaAssetSemanticFit = {
  status: 'exact' | 'compatible' | 'fallback_generated' | 'not_applicable' | 'unknown' | 'mismatch';
  confidence: number;
  strictness?: 'hard' | 'medium' | 'soft';
  expectedConcept?: string;
  expectedAnyTags?: string[];
  actualTags?: string[];
  missingTags?: string[];
  conflictingTags?: string[];
  reason?: string;
};

export type QaAssetSemanticIssue = {
  severity: 'warning' | 'failure';
  asset_id: string;
  role: string;
  semantic_fit_status: QaAssetSemanticFit['status'];
  strictness?: 'hard' | 'medium' | 'soft';
  expected_concept?: string;
  missing_tags: string[];
  conflicting_tags: string[];
  reason: string;
};
export type RepairReport = { status?: string; message?: string; attempts?: Array<{ attempt: number; reason: string }> };

export type ArtAssetWorkbenchPreview = {
  preview_version: '0.1';
  source: 'small-library-runtime-safe-export';
  fixture: 'tests/fixtures/art-library-small-v0.1';
  read_only: true;
  ok: boolean;
  runtime_metadata_version: string;
  generated_by: string;
  asset_count: number;
  allowed_fields: readonly string[];
  blocked_fields: readonly string[];
  assets: ArtAssetWorkbenchPreviewAsset[];
  diagnostics: {
    bridge: {
      ok: boolean;
      matched_count: number;
      diagnostic_count: number;
      items: ArtAssetWorkbenchPreviewDiagnostic[];
    };
    resolver: {
      ok: boolean;
      resolved_count: number;
      diagnostic_count: number;
      items: ArtAssetWorkbenchPreviewDiagnostic[];
    };
  };
};

export type ArtAssetWorkbenchPreviewAsset = {
  asset_id: string;
  asset_type: string;
  title: string;
  description: string;
  status: string;
  version: string;
  semantic: {
    tags: string[];
    visual_style: string[];
    world: string;
    mood?: string[];
  };
  gameplay: {
    role: string[];
    affordances: string[];
    allowed_contexts: string[];
    blocked_contexts: string[];
  };
  technical: {
    file_format: string;
    thumbnail_path: string;
    texture_resolution?: string;
    polycount_lod0?: number;
    platform_budget?: string[];
  };
  relations?: {
    variant_of?: string;
    compatible_with?: string[];
  };
};

export type ArtAssetWorkbenchPreviewDiagnostic = {
  source: 'bridge' | 'resolver';
  severity: 'error' | 'warning';
  code: string;
  message: string;
  assetId?: string;
  jsonPath?: string;
  safePath?: string;
};

export type DashboardData = {
  project?: ProjectStatus;
  events: RunEvents['events'];
  qaReport?: QaReport;
  repairReport?: RepairReport;
  buildLog?: string;
  artAssetPreview?: ArtAssetWorkbenchPreview;
};

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function optionalJson<T>(url: string): Promise<T | undefined> {
  try {
    return await requestJson<T>(url);
  } catch {
    return undefined;
  }
}

export function countEvents(events: string[]): Array<[string, number]> {
  return [...events.reduce((counts, event) => counts.set(event, (counts.get(event) ?? 0) + 1), new Map<string, number>())];
}

export function fallbackSteps(status: string | undefined): Array<{ name: string; status: string }> {
  return [{ name: 'Run', status: status ?? 'PENDING' }];
}

export function shouldLoadBuildLog(status: string | undefined): boolean {
  return hasReached(status, [
    'BUILDING',
    'BUILD_FAILED',
    'PREVIEW_ARTIFACT_MISSING',
    'PREVIEW_READY',
    'QA_RUNNING',
    'QA_FAILED',
    'PLAYABLE',
    'NEEDS_ASSET_REPAIR',
    'PLAYABLE_WITH_FALLBACK_ASSETS',
    'PLAYABLE_WITH_ART_WARNINGS'
  ]);
}

export function shouldLoadQaReport(status: string | undefined): boolean {
  return hasReached(status, ['QA_RUNNING', 'QA_FAILED', 'PLAYABLE', 'NEEDS_ASSET_REPAIR', 'PLAYABLE_WITH_FALLBACK_ASSETS', 'PLAYABLE_WITH_ART_WARNINGS']);
}

export function shouldLoadRepairReport(status: string | undefined): boolean {
  return hasReached(status, ['REPAIR_REQUIRED', 'REPAIR_RUNNING', 'REPAIR_FAILED']);
}

function hasReached(status: string | undefined, candidates: string[]): boolean {
  return status !== undefined && candidates.includes(status);
}
