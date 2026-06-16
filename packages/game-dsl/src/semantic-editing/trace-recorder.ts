import {
  SemanticEditingTraceEventSchema,
  type SemanticEditingTraceEvent,
  type SemanticEditingTraceEventType
} from './trace-events.js';

export type SemanticEditingTraceSink = (event: SemanticEditingTraceEvent) => void;

export type SemanticEditingTraceRecorderOptions = {
  correlationId?: string;
  now?: () => Date;
  createEventId?: (type: SemanticEditingTraceEventType, sequence: number) => string;
  sink?: SemanticEditingTraceSink;
};

export type SemanticEditingTraceRecorder = {
  emit(event: Omit<SemanticEditingTraceEvent, 'id' | 'at' | 'correlationId'>): SemanticEditingTraceEvent;
  getEvents(): readonly SemanticEditingTraceEvent[];
  clear(): void;
  getSinkErrors(): readonly unknown[];
};

/**
 * Creates a deterministic in-memory semantic editing trace recorder with an optional forwarding sink.
 */
export function createSemanticEditingTraceRecorder(
  options: SemanticEditingTraceRecorderOptions = {}
): SemanticEditingTraceRecorder {
  const now = options.now ?? (() => new Date());
  const createEventId = options.createEventId ?? ((_, sequence) => `semantic_trace:${sequence}`);
  const events: SemanticEditingTraceEvent[] = [];
  const sinkErrors: unknown[] = [];
  let sequence = 0;

  return {
    emit(event) {
      sequence += 1;
      const parsedEvent = SemanticEditingTraceEventSchema.parse({
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

function cloneEvent(event: SemanticEditingTraceEvent): SemanticEditingTraceEvent {
  return structuredClone(event);
}
