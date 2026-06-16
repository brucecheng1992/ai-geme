import { buildResolverV2IrHandoffSummary } from './ir-gate-summaries.js';
import {
  summarizeResolverV2BlockersForTrace,
  summarizeResolverV2DiagnosticsForTrace,
  summarizeResolverV2GateResultForTrace,
  summarizeResolverV2ResultForTrace
} from './trace-summaries.js';
import type { ResolverV2TraceRecorder } from './trace-recorder.js';
import type {
  ResolverV2,
  ResolverV2IrGateBlocker,
  ResolverV2IrGateRequest,
  ResolverV2IrGateResult,
  ResolverV2IrIntegrationGate,
  ResolverV2Request,
  ResolverV2Result
} from './types.js';

export type TraceResolverV2ResolveRequest = {
  resolver: ResolverV2;
  request: ResolverV2Request;
  trace: ResolverV2TraceRecorder;
  resolverRunId?: string;
};

export type TraceResolverV2IrGateRequest = {
  gate: ResolverV2IrIntegrationGate;
  request: ResolverV2IrGateRequest;
  trace: ResolverV2TraceRecorder;
  gateRunId?: string;
};

export function traceResolverV2Resolve(input: TraceResolverV2ResolveRequest): ResolverV2Result {
  input.trace.emit({
    type: 'resolver_v2.resolve.started',
    severity: 'info',
    ...(input.resolverRunId === undefined ? {} : { resolverRunId: input.resolverRunId }),
    payload: {
      resolverRunId: input.resolverRunId ?? null,
      hasSemanticIndex: true
    }
  });

  try {
    const result = input.resolver.resolve(input.request);
    input.trace.emit({
      type: 'resolver_v2.resolve.completed',
      severity: 'info',
      ...(input.resolverRunId === undefined ? {} : { resolverRunId: input.resolverRunId }),
      payload: {
        resolverRunId: input.resolverRunId ?? null,
        resolver: summarizeResolverV2ResultForTrace(result)
      }
    });

    if (result.diagnostics.length > 0) {
      input.trace.emit({
        type: 'resolver_v2.diagnostics.reported',
        severity: result.summary.errorCount > 0 ? 'error' : 'warning',
        ...(input.resolverRunId === undefined ? {} : { resolverRunId: input.resolverRunId }),
        payload: {
          resolverRunId: input.resolverRunId ?? null,
          resolver: summarizeResolverV2ResultForTrace(result),
          diagnostics: summarizeResolverV2DiagnosticsForTrace(result.diagnostics)
        }
      });
    }

    return result;
  } catch {
    const result = createResolverV2TraceFailureResult();
    input.trace.emit({
      type: 'resolver_v2.resolve.failed',
      severity: 'error',
      ...(input.resolverRunId === undefined ? {} : { resolverRunId: input.resolverRunId }),
      payload: {
        resolverRunId: input.resolverRunId ?? null,
        resolver: summarizeResolverV2ResultForTrace(result)
      }
    });
    return result;
  }
}

export function traceResolverV2IrGate(input: TraceResolverV2IrGateRequest): ResolverV2IrGateResult {
  input.trace.emit({
    type: 'resolver_v2.ir_gate.started',
    severity: 'info',
    ...(input.gateRunId === undefined ? {} : { gateRunId: input.gateRunId }),
    payload: {
      gateRunId: input.gateRunId ?? null,
      hasResolverResult: input.request.resolverResult !== undefined,
      hasSemanticIndex: input.request.semanticIndex !== undefined
    }
  });

  try {
    const result = input.gate.evaluate(input.request);
    emitGateCompletion({ result, trace: input.trace, gateRunId: input.gateRunId });
    return result;
  } catch {
    const result = createResolverV2TraceGateExceptionResult(input.request.resolverResult);
    emitGateCompletion({ result, trace: input.trace, gateRunId: input.gateRunId });
    return result;
  }
}

function emitGateCompletion(input: {
  result: ResolverV2IrGateResult;
  trace: ResolverV2TraceRecorder;
  gateRunId?: string;
}): void {
  const blocked = input.result.status === 'blocked';
  input.trace.emit({
    type: blocked ? 'resolver_v2.ir_gate.blocked' : 'resolver_v2.ir_gate.completed',
    severity: blocked ? 'warning' : 'info',
    ...(input.gateRunId === undefined ? {} : { gateRunId: input.gateRunId }),
    payload: {
      gateRunId: input.gateRunId ?? null,
      gate: summarizeResolverV2GateResultForTrace(input.result),
      ...(input.result.blockers.length === 0 ? {} : { blockers: summarizeResolverV2BlockersForTrace(input.result.blockers) })
    }
  });
}

function createResolverV2TraceFailureResult(): ResolverV2Result {
  return {
    ok: false,
    references: [],
    diagnostics: [
      {
        severity: 'error',
        code: 'RESOLVER_REFERENCE_EXTRACTION_FAILED',
        message: 'Resolver V2 resolve failed while tracing.'
      }
    ],
    summary: {
      referenceCount: 0,
      resolvedCount: 0,
      unresolvedCount: 0,
      errorCount: 1,
      warningCount: 0
    }
  };
}

function createResolverV2TraceGateExceptionResult(resolverResult?: ResolverV2Result): ResolverV2IrGateResult {
  const fallbackResolverResult = resolverResult ?? createResolverV2TraceFailureResult();
  const blockers: ResolverV2IrGateBlocker[] = [
    {
      code: 'RESOLVER_V2_GATE_EXCEPTION',
      message: 'Resolver V2 IR gate failed while tracing.',
      severity: 'error'
    }
  ];

  return {
    ok: false,
    status: 'blocked',
    blockers,
    warnings: [],
    summary: buildResolverV2IrHandoffSummary({
      status: 'blocked',
      resolverResult: fallbackResolverResult
    }),
    resolverResult: fallbackResolverResult
  };
}
