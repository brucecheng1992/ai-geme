import { z } from 'zod';

const RESOLVER_V2_TRACE_EVENT_TYPES = [
  'resolver_v2.resolve.started',
  'resolver_v2.resolve.completed',
  'resolver_v2.resolve.failed',
  'resolver_v2.ir_gate.started',
  'resolver_v2.ir_gate.completed',
  'resolver_v2.ir_gate.blocked',
  'resolver_v2.diagnostics.reported'
] as const;

const RESOLVER_V2_TRACE_SEVERITIES = ['debug', 'info', 'warning', 'error'] as const;

export const ResolverV2TraceEventTypeSchema = z.enum(RESOLVER_V2_TRACE_EVENT_TYPES);
export const ResolverV2TraceSeveritySchema = z.enum(RESOLVER_V2_TRACE_SEVERITIES);

export const ResolverV2TraceEventSchema = z.object({
  id: z.string().min(1),
  type: ResolverV2TraceEventTypeSchema,
  at: z.string().min(1),
  severity: ResolverV2TraceSeveritySchema,
  correlationId: z.string().min(1).optional(),
  parentEventId: z.string().min(1).optional(),
  resolverRunId: z.string().min(1).optional(),
  gateRunId: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown())
});

export type ResolverV2TraceEventType = (typeof RESOLVER_V2_TRACE_EVENT_TYPES)[number];
export type ResolverV2TraceSeverity = (typeof RESOLVER_V2_TRACE_SEVERITIES)[number];
export type ResolverV2TraceEvent = z.infer<typeof ResolverV2TraceEventSchema>;
