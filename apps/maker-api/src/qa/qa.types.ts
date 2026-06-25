import type { TelemetryEvent } from '../../../../packages/runtime-core/src/index.js';
import type { AssetManifest } from '../../../../packages/asset-pipeline/src/index.js';
import type { AuthorityBundleRef } from '../../../../packages/game-dsl/src/index.js';

export type QaGenre = 'collector' | 'dodger' | 'shooter' | 'side_scrolling_run_and_gun';
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
  | 'RUNTIME_AUTHORITY_MISMATCH'
  | 'CAPABILITY_RUNTIME_MISMATCH'
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
  runtime_authority?: QaRuntimeAuthorityEvidence;
  capability_runtime?: QaCapabilityRuntimeEvidence;
};

export type RunQaInput = {
  projectId: string;
  runId: string;
  genre: QaGenre;
  previewUrl: string;
  seed?: string;
  timeoutMs?: number;
  screenshotPath?: string;
  expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation;
  expectedCapabilityRuntime?: QaCapabilityRuntimeExpectation;
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
  render_fidelity?: QaRenderFidelitySummary;
  asset_manifest_summary?: AssetManifest['summary'];
  asset_report?: QaAssetReport;
  screenshot_path?: string;
  visual_metrics?: QaVisualMetrics;
  asset_semantic_repair?: QaAssetSemanticRepairReport;
  runtime_authority?: QaRuntimeAuthorityEvidence;
  capability_runtime?: QaCapabilityRuntimeEvidence;
  started_at: string;
  completed_at: string;
};

export type QaRuntimeAuthorityExpectation = {
  authorityBundleRef: AuthorityBundleRef;
  activeProfileLockRef: { artifactKind: 'active_profile_lock'; path: 'active_profile_lock.json'; lockHash: string };
  profileId: string;
  runtimeTemplateId: string;
  runtimeTemplateManifestId: string;
  qaProfile: string;
};

export type QaRuntimeAuthorityEvidence = {
  status: 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
  expected?: QaRuntimeAuthorityExpectation;
  observed?: Partial<QaRuntimeAuthorityExpectation>;
  mismatches: string[];
};

export type QaCapabilityRuntimeProbeExpectation = {
  capabilityId: string;
  probeId: string;
  action: string;
  eventType: string;
  projectileEntityId?: string;
};

export type QaCapabilityRuntimeExpectation = {
  requiredProbes: QaCapabilityRuntimeProbeExpectation[];
};

export type QaCapabilityRuntimeObservedProbe = QaCapabilityRuntimeProbeExpectation & {
  runtimeModuleId?: string;
  projectileId?: string;
  sourceRef?: string;
  status?: string;
  observedIn: Array<'snapshot' | 'telemetry'>;
};

export type QaCapabilityRuntimeEvidence = {
  status: 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
  expected?: QaCapabilityRuntimeExpectation;
  observed: QaCapabilityRuntimeObservedProbe[];
  missingProbeIds: string[];
  mismatches: string[];
};

export type QaRenderFidelitySummary = {
  status: 'PASSED' | 'PASSED_WITH_OPTIONAL_FALLBACKS' | 'VISUALLY_DEGRADED' | 'FAILED';
  reason: string;
  expected: string[];
  observed: string[];
  missing: string[];
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

export type QaAssetSemanticRepairSkippedReason =
  | 'asset_semantic_repair_disabled'
  | 'no_asset_semantic_repair_needed'
  | 'runtime_failed_not_asset_semantic_repair'
  | 'runtime_asset_failure_not_asset_semantic_repair'
  | 'max_attempts_exhausted'
  | 'asset_repair_artifacts_unreadable'
  | 'no_executable_repair_items'
  | 'repair_execution_not_repaired'
  | 'repair_execution_failed'
  | 'repair_rebuild_failed';

export type QaAssetSemanticRepairReport = {
  enabled: boolean;
  attempted: boolean;
  skippedReason?: QaAssetSemanticRepairSkippedReason;
  attemptCount: number;
  maxAttempts: number;
  repairPlanTriggered?: boolean;
  executableItemCount?: number;
  beforeOverallStatus?: OverallStatus;
  beforeAssetSemanticStatus?: AssetSemanticStatus;
  afterOverallStatus?: OverallStatus;
  afterAssetSemanticStatus?: AssetSemanticStatus;
  repairedRequirements?: QaAssetSemanticRepairRequirement[];
  failureReasons?: string[];
};

export type QaAssetSemanticRepairRequirement = {
  requirementId: string;
  role: string;
  expectedConcept?: string;
  previousAssetId?: string;
  previousSource?: AssetManifest['assets'][number]['source'];
  previousSemanticFitStatus?: string;
  action?: string;
  newAssetId?: string;
  newSource?: AssetManifest['assets'][number]['source'];
  newSemanticFitStatus?: string;
};
