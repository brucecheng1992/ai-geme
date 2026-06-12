import type { TelemetryEvent } from '../../../../packages/runtime-core/src/index.js';
import type { AssetManifest } from '../../../../packages/asset-pipeline/src/index.js';

export type QaGenre = 'collector' | 'dodger' | 'shooter';
export type QaStatus = 'PASSED' | 'QA_FAILED';
export type RuntimeStatus = 'PASSED' | 'FAILED';
export type AssetSemanticStatus = 'PASSED' | 'WARNING' | 'FAILED';
export type OverallStatus = 'PLAYABLE' | 'PLAYABLE_WITH_FALLBACK_ASSETS' | 'PLAYABLE_WITH_ART_WARNINGS' | 'NEEDS_ASSET_REPAIR' | 'QA_FAILED';
export type QaVisualStatus = 'PASSED' | 'VISUAL_QA_FAILED';

export type QaFailureCode =
  | 'ASSET_MANIFEST_INVALID'
  | 'ASSET_MISSING'
  | 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED'
  | 'ASSET_LOAD_FAILED'
  | 'PREVIEW_LOAD_FAILED'
  | 'CANVAS_NOT_FOUND'
  | 'CANVAS_ZERO_SIZE'
  | 'PREVIEW_BLANK_SCREEN'
  | 'FATAL_CONSOLE_ERROR'
  | 'QA_BRIDGE_MISSING'
  | 'REQUIRED_TELEMETRY_MISSING'
  | 'QA_RUNNER_FAILED';

export type QaRequiredEvents = {
  all: string[];
  any_groups: string[][];
};

export type QaGateEvaluation = {
  passed: boolean;
  missing_events: string[];
  missing_any_groups: string[][];
};

export type QaBrowserResult = {
  ok: boolean;
  visual_ok: boolean;
  interaction_ok: boolean;
  observed_events: string[];
  telemetry: TelemetryEvent[];
  snapshot?: unknown;
  console_errors: string[];
  failure_code?: QaFailureCode;
  message?: string;
  screenshot_path?: string;
  visual_metrics?: QaVisualMetrics;
  asset_runtime?: QaAssetRuntimeTelemetry;
};

export type RunQaInput = {
  projectId: string;
  runId: string;
  genre: QaGenre;
  previewUrl: string;
  seed?: string;
  timeoutMs?: number;
  screenshotPath?: string;
};

export type QaVisualMetrics = {
  canvas_width: number;
  canvas_height: number;
  screenshot_width: number;
  screenshot_height: number;
  non_background_pixel_ratio: number;
  varied_pixel_ratio: number;
  transparent_pixel_ratio: number;
};

export type QaReport = {
  status: QaStatus;
  runtime_status: RuntimeStatus;
  asset_semantic_status: AssetSemanticStatus;
  overall_status: OverallStatus;
  project_id: string;
  run_id: string;
  genre: QaGenre;
  preview_url: string;
  seed: string;
  required_events: QaRequiredEvents;
  observed_events: string[];
  missing_events: string[];
  missing_any_groups: string[][];
  console_errors: string[];
  snapshot?: unknown;
  code?: QaFailureCode;
  message?: string;
  visual_status?: QaVisualStatus;
  asset_manifest_summary?: AssetManifest['summary'];
  asset_report?: QaAssetReport;
  screenshot_path?: string;
  visual_metrics?: QaVisualMetrics;
  started_at: string;
  completed_at: string;
};

export type QaBrowserRunner = (input: RunQaInput, requiredEvents: QaRequiredEvents) => Promise<QaBrowserResult>;

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
  manifest_summary?: AssetManifest['summary'];
  semantic_status: AssetSemanticStatus;
  required: string[];
  ready: string[];
  fallback_used: string[];
  placeholder_used: string[];
  missing: string[];
  runtime?: QaAssetRuntimeTelemetry;
  assets: QaAssetSemanticSummary[];
  semantic_issues: QaAssetSemanticIssue[];
  sources?: QaAssetSource[];
  failures: QaAssetFailure[];
};

export type QaAssetSemanticSummary = {
  id: string;
  role: AssetManifest['assets'][number]['role'];
  source: AssetManifest['assets'][number]['source'];
  source_pack?: string;
  semantic_status: AssetSemanticStatus;
  semantic_fit?: NonNullable<AssetManifest['assets'][number]['semanticFit']>;
};

export type QaAssetSemanticIssue = {
  severity: 'warning' | 'failure';
  asset_id: string;
  role: AssetManifest['assets'][number]['role'];
  semantic_fit_status: NonNullable<AssetManifest['assets'][number]['semanticFit']>['status'];
  strictness?: 'hard' | 'medium' | 'soft';
  expected_concept?: string;
  missing_tags: string[];
  conflicting_tags: string[];
  reason: string;
};

export type QaAssetSource = {
  source_pack: string;
  license_id: string;
  license_name: string;
  attribution: string;
  source_url: string;
};

export type QaAssetFailure = {
  code: Extract<QaFailureCode, 'ASSET_MANIFEST_INVALID' | 'ASSET_MISSING' | 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED' | 'ASSET_LOAD_FAILED'>;
  message: string;
  asset_ids: string[];
  roles: string[];
};
