import { createResolverV2 } from './resolver-v2.js';
import { buildResolverV2IrHandoffSummary } from './ir-gate-summaries.js';
import { mergeResolverV2IrGatePolicy, type ResolvedResolverV2IrGatePolicy } from './ir-gate-policy.js';
import {
  compareBlockers,
  createResolverResultBlockers,
  createResolverResultWarnings
} from './ir-gate-blockers.js';
import type {
  ResolverV2IrGateBlocker,
  ResolverV2IrGateRequest,
  ResolverV2IrGateResult,
  ResolverV2IrIntegrationGate,
  ResolverV2Result
} from './types.js';

type ResolvedGateInput = {
  resolverResult: ResolverV2Result;
  blockers: ResolverV2IrGateBlocker[];
  skipResolverResultPolicy: boolean;
};

export function evaluateResolverV2IrIntegrationGate(request: ResolverV2IrGateRequest): ResolverV2IrGateResult {
  const policy = mergeResolverV2IrGatePolicy(undefined, request.policy);
  return evaluateResolverV2IrIntegrationGateWithPolicy(request, policy);
}

export function createResolverV2IrIntegrationGate(defaultPolicy?: ResolverV2IrGateRequest['policy']): ResolverV2IrIntegrationGate {
  return {
    evaluate(request) {
      const policy = mergeResolverV2IrGatePolicy(defaultPolicy, request.policy);
      return evaluateResolverV2IrIntegrationGateWithPolicy(request, policy);
    }
  };
}

function evaluateResolverV2IrIntegrationGateWithPolicy(
  request: ResolverV2IrGateRequest,
  policy: ResolvedResolverV2IrGatePolicy
): ResolverV2IrGateResult {
  const resolvedInput = resolveGateInput(request);
  const policyBlockers = resolvedInput.skipResolverResultPolicy
    ? []
    : createResolverResultBlockers(resolvedInput.resolverResult, policy);
  const warnings = resolvedInput.skipResolverResultPolicy
    ? []
    : createResolverResultWarnings(resolvedInput.resolverResult, policy);
  const blockers = [...resolvedInput.blockers, ...policyBlockers].sort(compareBlockers);
  const status = blockers.length === 0 ? 'ready' : 'blocked';

  return {
    ok: status === 'ready' && blockers.length === 0,
    status,
    blockers,
    warnings,
    summary: buildResolverV2IrHandoffSummary({
      status,
      resolverResult: resolvedInput.resolverResult,
      document: request.document
    }),
    resolverResult: resolvedInput.resolverResult
  };
}

function resolveGateInput(request: ResolverV2IrGateRequest): ResolvedGateInput {
  if (request.resolverResult !== undefined) {
    return {
      resolverResult: request.resolverResult,
      blockers: [],
      skipResolverResultPolicy: false
    };
  }

  if (request.document === undefined || request.semanticIndex === undefined) {
    return {
      resolverResult: createEmptyResolverV2Result(),
      blockers: [
        {
          code: 'RESOLVER_V2_GATE_MISSING_INPUT',
          message: 'Resolver V2 IR gate requires either resolverResult or both document and semanticIndex.',
          severity: 'error'
        }
      ],
      skipResolverResultPolicy: true
    };
  }

  try {
    return {
      resolverResult: (request.resolver ?? createResolverV2()).resolve({
        document: request.document,
        semanticIndex: request.semanticIndex
      }),
      blockers: [],
      skipResolverResultPolicy: false
    };
  } catch {
    return {
      resolverResult: createEmptyResolverV2Result(),
      blockers: [
        {
          code: 'RESOLVER_V2_GATE_EXCEPTION',
          message: 'Resolver V2 IR gate failed while resolving the document.',
          severity: 'error'
        }
      ],
      skipResolverResultPolicy: true
    };
  }
}

function createEmptyResolverV2Result(): ResolverV2Result {
  return {
    ok: false,
    references: [],
    diagnostics: [],
    summary: {
      referenceCount: 0,
      resolvedCount: 0,
      unresolvedCount: 0,
      errorCount: 0,
      warningCount: 0
    }
  };
}
