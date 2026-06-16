import type {
  CreateSemanticPatchDiffViewModelOptions,
  SemanticPatchDiffViewModel
} from '../patch-diff.js';
import type {
  SemanticPatchApplier,
  SemanticPatchApplyResult
} from '../patch-applier-types.js';
import type { SemanticPatchPlanResult } from '../patch-planner.js';
import type { SemanticPatchValidator } from '../patch-validator.js';
import type { FixBlankPreviewRepairPayload } from '../repair-packs/index.js';
import type { SemanticIndex } from '../semantic-index.js';
import type { SemanticId } from '../semantic-address.js';
import type { SemanticEditingTraceEvent, SemanticEditingTraceEventType } from '../trace-events.js';
import type { SemanticEditingTraceRecorder } from '../trace-recorder.js';
import type { SemanticEditIntent, SemanticPatch, SemanticPatchValidationResult } from '../types.js';

export type SemanticFalsePlayableSeverity = 'info' | 'warning' | 'error';

export type SemanticFalsePlayableFinding = {
  id: string;
  code: 'FALSE_PLAYABLE';
  severity: SemanticFalsePlayableSeverity;
  message: string;
  sceneTarget: SemanticId;
  source: {
    hasReportId?: boolean;
    hasFindingId?: boolean;
    status?: string;
    previewStatus?: string;
    evidenceCodes: string[];
    hasScreenshot?: boolean;
    hasCanvasSnapshot?: boolean;
  };
};

export type SemanticFalsePlayableDetectionResult = {
  detected: boolean;
  findings: SemanticFalsePlayableFinding[];
  warnings: string[];
};

export type DetectSemanticFalsePlayableOptions = {
  defaultSceneTarget?: string;
};

export type CreateFalsePlayableRepairIntentOptions = {
  createIntentId?: (finding: SemanticFalsePlayableFinding, sequence: number) => string;
};

export type SemanticFalsePlayableRepairLoopStage =
  | 'not_detected'
  | 'plan_failed'
  | 'validation_failed'
  | 'apply_failed'
  | 'repaired';

export type SemanticFalsePlayableRepairLoopError = {
  code:
    | 'NO_FALSE_PLAYABLE_FINDING'
    | 'FALSE_PLAYABLE_PLAN_FAILED'
    | 'FALSE_PLAYABLE_VALIDATION_FAILED'
    | 'FALSE_PLAYABLE_APPLY_FAILED'
    | 'FALSE_PLAYABLE_LOOP_EXCEPTION';
  message: string;
  stage: SemanticFalsePlayableRepairLoopStage;
  cause?: unknown;
};

export type RunSemanticFalsePlayableRepairLoopRequest = {
  qaReport: unknown;
  document: unknown;
  semanticIndex: SemanticIndex;
  defaultSceneTarget?: string;
  scenePath?: string;
  repairDefaults?: Partial<FixBlankPreviewRepairPayload>;
  now?: () => Date;
  createIntentId?: (finding: SemanticFalsePlayableFinding, sequence: number) => string;
  createPatchId?: (intent: SemanticEditIntent) => string;
  createRollbackPatchId?: (patch: SemanticPatch) => string;
  correlationId?: string;
  createTraceEventId?: (type: SemanticEditingTraceEventType, sequence: number) => string;
  trace?: SemanticEditingTraceRecorder;
  validator?: SemanticPatchValidator;
  applier?: SemanticPatchApplier;
  patchDiffOptions?: CreateSemanticPatchDiffViewModelOptions;
};

export type SemanticFalsePlayableRepairLoopSuccess = {
  ok: true;
  stage: 'repaired';
  detection: SemanticFalsePlayableDetectionResult;
  finding: SemanticFalsePlayableFinding;
  intent: SemanticEditIntent;
  plan: SemanticPatchPlanResult & { ok: true };
  validation: SemanticPatchValidationResult;
  apply: SemanticPatchApplyResult & { ok: true };
  diff: SemanticPatchDiffViewModel;
  traceEvents: readonly SemanticEditingTraceEvent[];
};

export type SemanticFalsePlayableRepairLoopNoop = {
  ok: true;
  stage: 'not_detected';
  detection: SemanticFalsePlayableDetectionResult;
  traceEvents: readonly SemanticEditingTraceEvent[];
  reason: 'NO_FALSE_PLAYABLE_FINDING';
};

export type SemanticFalsePlayableRepairLoopFailure = {
  ok: false;
  stage: 'plan_failed' | 'validation_failed' | 'apply_failed';
  detection: SemanticFalsePlayableDetectionResult;
  finding?: SemanticFalsePlayableFinding;
  intent?: SemanticEditIntent;
  plan?: SemanticPatchPlanResult;
  validation?: SemanticPatchValidationResult;
  apply?: SemanticPatchApplyResult;
  diff?: SemanticPatchDiffViewModel;
  traceEvents: readonly SemanticEditingTraceEvent[];
  error: SemanticFalsePlayableRepairLoopError;
};

export type SemanticFalsePlayableRepairLoopResult =
  | SemanticFalsePlayableRepairLoopSuccess
  | SemanticFalsePlayableRepairLoopNoop
  | SemanticFalsePlayableRepairLoopFailure;
