import {
  ResolverV2TraceEventSchema,
  type ResolverV2TraceEvent,
  type ResolverV2TraceEventType
} from './trace-events.js';

export type ResolverV2TraceSink = (event: ResolverV2TraceEvent) => void;

export type ResolverV2TraceRecorderOptions = {
  correlationId?: string;
  now?: () => Date;
  createEventId?: (type: ResolverV2TraceEventType, sequence: number) => string;
  sink?: ResolverV2TraceSink;
};

export type ResolverV2TraceRecorder = {
  emit(event: Omit<ResolverV2TraceEvent, 'id' | 'at' | 'correlationId'>): ResolverV2TraceEvent;
  getEvents(): readonly ResolverV2TraceEvent[];
  clear(): void;
  getSinkErrors(): readonly unknown[];
};

/**
 * Creates a deterministic in-memory Resolver V2 trace recorder with an optional forwarding sink.
 */
export function createResolverV2TraceRecorder(
  options: ResolverV2TraceRecorderOptions = {}
): ResolverV2TraceRecorder {
  const now = options.now ?? (() => new Date());
  const createEventId = options.createEventId ?? ((_, sequence) => `resolver_v2_trace:${sequence}`);
  const events: ResolverV2TraceEvent[] = [];
  const sinkErrors: unknown[] = [];
  let sequence = 0;

  return {
    emit(event) {
      sequence += 1;
      const parsedEvent = ResolverV2TraceEventSchema.parse({
        ...event,
        id: createEventId(event.type, sequence),
        at: now().toISOString(),
        ...(options.correlationId === undefined ? {} : { correlationId: options.correlationId })
      });

      events.push(cloneEvent(parsedEvent));

      try {
        options.sink?.(cloneEvent(parsedEvent));
      } catch (error) {
        sinkErrors.push(error);
      }

      return cloneEvent(parsedEvent);
    },

    getEvents() {
      return events.map(cloneEvent);
    },

    clear() {
      events.length = 0;
      sinkErrors.length = 0;
      sequence = 0;
    },

    getSinkErrors() {
      return [...sinkErrors];
    }
  };
}

function cloneEvent(event: ResolverV2TraceEvent): ResolverV2TraceEvent {
  return structuredClone(event);
}
