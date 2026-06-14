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

export type PromptOptimizationMode = 'mock' | 'llm';
export type PromptOptimizationStrategy = 'mock-v1' | 'llm-v1';

export type PromptOptimizationReport = {
  reportVersion: 'prompt_optimization_report.v1';
  projectId: string;
  optimizationId: string;
  runId?: string;
  originalPrompt: string;
  optimizedPrompt: string;
  intentSummary: string;
  dslFitWarnings: string[];
  unsupportedRequests: string[];
  suggestedQuestions: string[];
  supportedDslVersion: 'v1';
  capabilitiesUsed: string[];
  status: 'prepared';
  applied: false;
  strategy: PromptOptimizationStrategy;
  mode: PromptOptimizationMode;
  modelProfile?: string;
};

export type PromptOptimizationArtifactRef = {
  id: 'promptOptimizationReport' | 'optimizedPrompt';
  artifactRoot: 'model-output';
  path: string;
  format: 'json' | 'txt';
};

export type PreparePromptOptimizationResponse = {
  ok: true;
  report: PromptOptimizationReport;
  artifacts: PromptOptimizationArtifactRef[];
};

export type LiveVersionRecord = {
  versionId: string;
  baseVersionId?: string;
  dslId: string;
  dslArtifactPath: string;
  updatedAt: string;
};

export type GameDslArtifact = {
  dslId: string;
  runId: string;
  genre: string;
  player: {
    id: string;
    label?: string;
    controller?: string;
    render?: { scale?: number };
    physics?: { maxSpeed?: number };
    health?: { max?: number };
  };
  enemyTypes: Record<string, { id: string; label?: string; physics?: { speed?: number }; health?: { max?: number } }>;
  projectiles: Record<string, { id: string; label?: string; speed?: number; damage?: number }>;
  level: { id: string; waves?: Array<{ id: string }> | Record<string, { id: string }> };
};

export type LiveUpdatePlanStatus = 'hot_patchable' | 'warm_restart_required' | 'rebuild_required' | 'unsupported' | 'failed_validation';
export type LiveUpdateApplyMode = 'hot' | 'warm_restart' | 'rebuild' | 'none';
export type RuntimeIssue = { code: string; path: string; message: string };
export type DslPatchOp = { op: 'replace' | 'add' | 'remove'; path: string; value?: unknown };
export type LiveEditCapabilities = { hot: string[]; assetSwap: string[]; warmRestart: string[]; rebuildRequired: string[] };
export type RuntimeCapabilityReport = {
  status: 'supported' | 'unsupported';
  liveEditCapabilities: LiveEditCapabilities;
};
export type RuntimePatch = {
  player?: { scale?: number; maxSpeed?: number; maxHealth?: number };
  enemyTypes?: Record<string, { speed?: number; maxHealth?: number }>;
  projectiles?: Record<string, { speed?: number; damage?: number }>;
};

export type PreparedDeterministicPatch = {
  ok: true;
  patch_id: string;
  status: LiveUpdatePlanStatus;
  apply_mode: LiveUpdateApplyMode;
  runtime_patch?: RuntimePatch;
  live_update_plan_ref: { artifact: string; patchId: string };
  validation_report?: { status: 'valid' | 'invalid'; errors: RuntimeIssue[] };
  live_update_plan?: { status: LiveUpdatePlanStatus; applyMode: LiveUpdateApplyMode; reason?: string; affectedPaths: string[] };
  artifact_refs?: Record<string, string>;
};

export type RuntimePatchResult = {
  status: 'applied_hot' | 'failed_runtime_apply' | 'unsupported';
  applyMode: 'hot' | 'none';
  runtimeTarget: string;
  appliedPaths: string[];
  warnings: RuntimeIssue[];
  errors: RuntimeIssue[];
};

export type RuntimeApplyReport = {
  artifactKind: 'runtime_apply_report';
  schemaVersion: 'runtime_apply_report.v1';
  runId: string;
  patchId: string;
  liveUpdatePlanRef: PreparedDeterministicPatch['live_update_plan_ref'];
  status: 'applied_hot' | 'applied_warm_restart' | 'failed_runtime_apply' | 'unsupported' | 'requires_rebuild';
  applyMode: LiveUpdateApplyMode;
  runtimeTarget: string;
  appliedPaths: string[];
  warnings: RuntimeIssue[];
  errors: RuntimeIssue[];
};

export type RuntimeApplyResponse = {
  ok: true;
  patch_id: string;
  status: RuntimeApplyReport['status'];
  apply_mode: RuntimeApplyReport['applyMode'];
  version_id?: string;
  runtime_apply_report: RuntimeApplyReport;
};

export type LiveCurrentResponse = {
  ok: true;
  current_version: LiveVersionRecord;
  game_dsl: GameDslArtifact;
  runtime_capability_report: RuntimeCapabilityReport;
  live_edit_capabilities: LiveEditCapabilities;
  patch_history: Array<{ patchId: string; versionId: string; baseVersionId: string; status: string; ops?: DslPatchOp[]; artifactRefs?: Record<string, string> }>;
  edit_audit_log: Array<{
    patchId: string;
    baseVersionId: string;
    status: string;
    applyMode: LiveUpdateApplyMode;
    ops?: DslPatchOp[];
    errors?: RuntimeIssue[];
    artifactRefs?: Record<string, string>;
    createdAt: string;
  }>;
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
