import type { TelemetryEvent } from '../../../../packages/runtime-core/src/index.js';
import type { AssetManifest } from '../../../../packages/asset-pipeline/src/index.js';

export type QaGenre = 'collector' | 'dodger' | 'shooter';
export type QaStatus = 'PASSED' | 'QA_FAILED';
export type QaVisualStatus = 'PASSED' | 'VISUAL_QA_FAILED';

export type QaFailureCode =
  | 'ASSET_MANIFEST_INVALID'
  | 'ASSET_MISSING'
  | 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED'
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
  screenshot_path?: string;
  visual_metrics?: QaVisualMetrics;
  started_at: string;
  completed_at: string;
};

export type QaBrowserRunner = (input: RunQaInput, requiredEvents: QaRequiredEvents) => Promise<QaBrowserResult>;
