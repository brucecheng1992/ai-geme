import type {
  ResolverV2,
  ResolverV2DiagnosticsViewModel,
  ResolverV2IrGateResult,
  ResolverV2IrIntegrationGate,
  ResolverV2Result,
  ResolverV2TraceEvent
} from '../resolver-v2/index.js';
import type {
  SemanticEditingTraceEvent,
  SemanticEditIntent,
  SemanticId,
  SemanticIndex,
  SemanticPatch,
  SemanticPatchApplyResult,
  SemanticPatchApplier,
  SemanticPatchDiffViewModel,
  SemanticPatchPlanResult,
  SemanticPatchPlanner,
  SemanticPatchPlannerHandlers,
  SemanticPatchValidationResult,
  SemanticPatchValidator
} from '../semantic-editing/index.js';
import type { CreateSemanticPatchDiffViewModelOptions } from '../semantic-editing/patch-diff-types.js';

export type LiveSemanticEditCommandKind =
  | 'fix_blank_preview'
  | 'move_entity'
  | 'adjust_camera'
  | 'bind_asset'
  | 'unsupported';

export type LiveSemanticEditConfidence = 'high' | 'medium' | 'low';

export type LiveSemanticEditCommand = {
  kind: LiveSemanticEditCommandKind;
  target?: SemanticId;
  sceneTarget?: `scene:${string}`;
  entityId?: `entity:${string}`;
  assetId?: `asset:${string}`;
  x?: number;
  y?: number;
  message?: string;
  confidence: LiveSemanticEditConfidence;
  warnings: string[];
};

export type LiveSemanticEditParseFailureReason =
  | 'empty_input'
  | 'unsupported_command'
  | 'ambiguous_command'
  | 'unsafe_target'
  | 'parse_error';

export type LiveSemanticEditParseSuccess = {
  ok: true;
  command: LiveSemanticEditCommand;
};

export type LiveSemanticEditParseFailure = {
  ok: false;
  reason: LiveSemanticEditParseFailureReason;
  message: string;
  warnings: string[];
};

export type LiveSemanticEditParseResult = LiveSemanticEditParseSuccess | LiveSemanticEditParseFailure;

export type ParseLiveSemanticEditTextOptions = {
  defaultSceneTarget?: `scene:${string}`;
  defaultEntityId?: `entity:${string}`;
};

export type CreateLiveSemanticEditIntentOptions = {
  createIntentId?: (command: LiveSemanticEditCommand, sequence: number) => string;
  sequence?: number;
};

export type CreateLiveSemanticEditHandlersOptions = {
  document: unknown;
  scenePath?: string;
};

export type LiveSemanticEditStage =
  | 'parse_failed'
  | 'plan_failed'
  | 'validation_failed'
  | 'validated'
  | 'apply_failed'
  | 'resolver_blocked'
  | 'applied';

export type LiveSemanticEditError = {
  code: string;
  message: string;
  reason?: LiveSemanticEditParseFailureReason;
};

export type RunLiveSemanticEditRequest = {
  text: string;
  document: unknown;
  semanticIndex: SemanticIndex;
  defaultSceneTarget?: `scene:${string}`;
  defaultEntityId?: `entity:${string}`;
  now?: () => Date;
  createIntentId?: (command: LiveSemanticEditCommand, sequence: number) => string;
  createPatchId?: (intent: SemanticEditIntent) => string;
  createRollbackPatchId?: (patch: SemanticPatch) => string;
  createTraceEventId?: (type: string, sequence: number) => string;
  createResolverTraceEventId?: (type: string, sequence: number) => string;
  correlationId?: string;
  autoApply?: boolean;
  resolver?: ResolverV2;
  irGate?: ResolverV2IrIntegrationGate;
  planner?: SemanticPatchPlanner;
  handlers?: SemanticPatchPlannerHandlers;
  validator?: SemanticPatchValidator;
  applier?: SemanticPatchApplier;
  patchDiffOptions?: CreateSemanticPatchDiffViewModelOptions;
};

export type LiveSemanticEditResultBase = {
  ok: boolean;
  stage: LiveSemanticEditStage;
  parse: LiveSemanticEditParseResult;
  command?: LiveSemanticEditCommand;
  intent?: SemanticEditIntent;
  plan?: SemanticPatchPlanResult;
  validation?: SemanticPatchValidationResult;
  apply?: SemanticPatchApplyResult;
  resolver?: ResolverV2Result;
  irGate?: ResolverV2IrGateResult;
  diff?: SemanticPatchDiffViewModel;
  diagnostics?: ResolverV2DiagnosticsViewModel;
  document?: unknown;
  traceEvents: readonly SemanticEditingTraceEvent[];
  resolverTraceEvents: readonly ResolverV2TraceEvent[];
  warnings: string[];
  error?: LiveSemanticEditError;
};

export type LiveSemanticEditSuccess = LiveSemanticEditResultBase & {
  ok: true;
  stage: 'applied' | 'validated';
};

export type LiveSemanticEditFailure = LiveSemanticEditResultBase & {
  ok: false;
  stage: Exclude<LiveSemanticEditStage, 'applied' | 'validated'>;
  error: LiveSemanticEditError;
};

export type LiveSemanticEditResult = LiveSemanticEditSuccess | LiveSemanticEditFailure;
