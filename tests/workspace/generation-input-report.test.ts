import { describe, expect, it } from 'vitest';

import {
  GenerationInputReportSchema,
  buildGenerationInputReport,
  resolvePromptOptimizationGenerationInput
} from '../../apps/maker-api/src/projects/generation-input-report.js';
import type { PromptOptimizationReport } from '../../apps/maker-api/src/projects/prompt-coach.contract.js';

const projectId = 'proj_20260615_generation_input';
const runId = 'run_20260615_generation_input';
const optimizationId = 'opt_proj_20260615_generation_input_abcdef123456';

describe('generation_input_report contract', () => {
  it('builds deterministic manual provenance without prompt optimization refs', () => {
    const first = buildGenerationInputReport({ projectId, runId, effectivePrompt: 'cat shooter' });
    const second = buildGenerationInputReport({ projectId, runId, effectivePrompt: 'cat shooter' });

    expect(first).toEqual(second);
    expect(first).toEqual({
      reportVersion: 'generation_input_report.v1',
      projectId,
      runId,
      source: 'manual',
      effectivePrompt: 'cat shooter',
      promptOptimizationRef: null,
      candidatePromptMatchesEffectivePrompt: false,
      checkedPaths: ['effectivePrompt', 'source'],
      status: 'accepted',
      warnings: [],
      errors: []
    });
    expect(GenerationInputReportSchema.parse(first)).toEqual(first);
    expect(JSON.stringify(first)).not.toContain('/Users/');
    expect(JSON.stringify(first)).not.toContain('raw provider');
  });

  it('builds candidate provenance with refs only and no copied Prompt Coach payload', () => {
    const report = makePromptOptimizationReport({ optimizedPrompt: 'Use a 2D cat shooter.' });
    const input = resolvePromptOptimizationGenerationInput({
      projectId,
      runId,
      promptOptimizationProjectId: projectId,
      optimizationId,
      effectivePrompt: 'Use a 2D cat shooter.',
      report
    });

    expect(input).toEqual({
      reportVersion: 'generation_input_report.v1',
      projectId,
      runId,
      source: 'prompt-coach-candidate',
      effectivePrompt: 'Use a 2D cat shooter.',
      promptOptimizationRef: {
        projectId,
        optimizationId,
        reportPath: `prompt-optimizations/${optimizationId}/prompt_optimization_report.json`,
        optimizedPromptPath: `prompt-optimizations/${optimizationId}/optimized_prompt.txt`,
        mode: 'mock',
        strategy: 'mock-v1',
        reportVersion: 'prompt_optimization_report.v1'
      },
      candidatePromptMatchesEffectivePrompt: true,
      checkedPaths: [
        'effectivePrompt',
        'promptOptimizationRef.optimizationId',
        'promptOptimizationRef.optimizedPrompt',
        'promptOptimizationRef.projectId',
        'source'
      ],
      status: 'accepted',
      warnings: [],
      errors: []
    });
    expect(JSON.stringify(input)).not.toContain('intentSummary');
    expect(JSON.stringify(input)).not.toContain('What is the win condition?');
    expect(JSON.stringify(input)).not.toContain('/Users/');
  });

  it('rejects prompt optimization provenance when ownership or effective prompt does not match', () => {
    expect(() =>
      resolvePromptOptimizationGenerationInput({
        projectId,
        runId,
        promptOptimizationProjectId: projectId,
        optimizationId,
        effectivePrompt: 'edited prompt',
        report: makePromptOptimizationReport({ optimizedPrompt: 'Use a 2D cat shooter.' })
      })
    ).toThrow('effectivePrompt must match prompt optimization optimizedPrompt.');
    expect(() =>
      resolvePromptOptimizationGenerationInput({
        projectId,
        runId,
        promptOptimizationProjectId: projectId,
        optimizationId,
        effectivePrompt: 'Use a 2D cat shooter.',
        report: makePromptOptimizationReport({ projectId: 'proj_other' })
      })
    ).toThrow('prompt optimization projectId does not match source project.');
    expect(() =>
      resolvePromptOptimizationGenerationInput({
        projectId,
        runId,
        promptOptimizationProjectId: projectId,
        optimizationId,
        effectivePrompt: 'Use a 2D cat shooter.',
        report: makePromptOptimizationReport({ optimizationId: 'opt_proj_20260615_generation_input_000000000000' })
      })
    ).toThrow('prompt optimization id does not match request.');
  });
});

function makePromptOptimizationReport(overrides: Partial<PromptOptimizationReport> = {}): PromptOptimizationReport {
  return {
    reportVersion: 'prompt_optimization_report.v1',
    projectId,
    optimizationId,
    runId,
    originalPrompt: 'cat shooter',
    optimizedPrompt: 'Use a 2D cat shooter.',
    intentSummary: 'Prepare a DSL-friendly 2D game brief.',
    dslFitWarnings: [],
    unsupportedRequests: [],
    suggestedQuestions: ['What is the win condition?'],
    supportedDslVersion: 'v1',
    capabilitiesUsed: ['prompt-coach'],
    status: 'prepared',
    applied: false,
    strategy: 'mock-v1',
    mode: 'mock',
    ...overrides
  };
}
