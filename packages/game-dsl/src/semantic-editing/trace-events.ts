import { z } from 'zod';

const SEMANTIC_EDITING_TRACE_EVENT_TYPES = [
  'semantic_edit.intent.created',
  'semantic_edit.intent.resolved',
  'semantic_edit.intent.rejected',
  'semantic_edit.patch.proposed',
  'semantic_edit.patch.plan_failed',
  'semantic_edit.patch.validation_started',
  'semantic_edit.patch.validated',
  'semantic_edit.patch.rejected',
  'semantic_edit.patch.apply_started',
  'semantic_edit.patch.applied',
  'semantic_edit.patch.apply_failed',
  'semantic_edit.rollback.started',
  'semantic_edit.rollback.completed',
  'semantic_edit.rollback.failed',
  'semantic_edit.qa.false_playable.detected',
  'semantic_edit.qa.false_playable.not_detected',
  'semantic_edit.qa.false_playable.repair_completed',
  'semantic_edit.qa.false_playable.repair_failed'
] as const;

const SEMANTIC_EDITING_TRACE_SEVERITIES = ['debug', 'info', 'warning', 'error'] as const;

export const SemanticEditingTraceEventTypeSchema = z.enum(SEMANTIC_EDITING_TRACE_EVENT_TYPES);
export const SemanticEditingTraceSeveritySchema = z.enum(SEMANTIC_EDITING_TRACE_SEVERITIES);

export const SemanticEditingTraceEventSchema = z.object({
  id: z.string().min(1),
  type: SemanticEditingTraceEventTypeSchema,
  at: z.string().min(1),
  severity: SemanticEditingTraceSeveritySchema,
  correlationId: z.string().min(1).optional(),
  parentEventId: z.string().min(1).optional(),
  intentId: z.string().min(1).optional(),
  patchId: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown())
});

export type SemanticEditingTraceEventType = (typeof SEMANTIC_EDITING_TRACE_EVENT_TYPES)[number];
export type SemanticEditingTraceSeverity = (typeof SEMANTIC_EDITING_TRACE_SEVERITIES)[number];
export type SemanticEditingTraceEvent = z.infer<typeof SemanticEditingTraceEventSchema>;
