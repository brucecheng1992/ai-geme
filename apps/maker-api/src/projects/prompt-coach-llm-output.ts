import { z } from 'zod';

import { ProjectRequestError } from './project-request.error.js';

const PromptCoachLlmPayloadSchema = z
  .strictObject({
    optimizedPrompt: z.string().min(1).max(2000),
    intentSummary: z.string().min(1).max(500),
    dslFitWarnings: z.array(z.string().max(120)).max(8),
    unsupportedRequests: z.array(z.string().max(120)).max(8),
    suggestedQuestions: z.array(z.string().max(200)).max(6),
    capabilitiesUsed: z.array(z.string().max(120)).max(8)
  })
  .superRefine((value, context) => {
    for (const [field, text] of collectLlmTextFields(value)) {
      if (containsDangerousText(normalizeLlmText(text))) {
        context.addIssue({ code: 'custom', path: field.split('.'), message: 'LLM output contains disallowed implementation, secret, or artifact text.' });
      }
    }
  });

export type PromptCoachLlmPayload = z.infer<typeof PromptCoachLlmPayloadSchema>;

export function parsePromptCoachLlmPayload(value: unknown): PromptCoachLlmPayload {
  const parsed = PromptCoachLlmPayloadSchema.safeParse(value);
  if (!parsed.success) {
    throw new ProjectRequestError('Prompt Coach LLM output failed validation.');
  }

  return {
    optimizedPrompt: normalizeRequiredLlmText(parsed.data.optimizedPrompt),
    intentSummary: normalizeRequiredLlmText(parsed.data.intentSummary),
    dslFitWarnings: normalizeLlmArray(parsed.data.dslFitWarnings),
    unsupportedRequests: normalizeLlmArray(parsed.data.unsupportedRequests),
    suggestedQuestions: normalizeLlmArray(parsed.data.suggestedQuestions),
    capabilitiesUsed: normalizeLlmArray(parsed.data.capabilitiesUsed)
  };
}

function normalizeRequiredLlmText(value: string): string {
  const normalized = normalizeLlmText(value);
  if (normalized.length === 0) {
    throw new ProjectRequestError('Prompt Coach LLM output failed validation.');
  }
  return normalized;
}

function normalizeLlmText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeLlmArray(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeLlmText(value)).filter((value) => value.length > 0))].sort((left, right) => left.localeCompare(right));
}

function containsDangerousText(value: string): boolean {
  return /```|game_dsl|asset manifest|runtime patch|api key|authorization|secret|[A-Z][A-Z0-9_]*API_KEY|process\.env\.|Bearer\s+|(?:access|refresh|api|bearer)\s+token|token\s*[:=]|raw provider|\/(?:Users|home|tmp|var\/folders)\/|[A-Za-z]:[\\/]/i.test(value);
}

function collectLlmTextFields(value: z.infer<typeof PromptCoachLlmPayloadSchema>): Array<[string, string]> {
  return [
    ['optimizedPrompt', value.optimizedPrompt],
    ['intentSummary', value.intentSummary],
    ...value.dslFitWarnings.map((text, index) => [`dslFitWarnings.${index}`, text] as [string, string]),
    ...value.unsupportedRequests.map((text, index) => [`unsupportedRequests.${index}`, text] as [string, string]),
    ...value.suggestedQuestions.map((text, index) => [`suggestedQuestions.${index}`, text] as [string, string]),
    ...value.capabilitiesUsed.map((text, index) => [`capabilitiesUsed.${index}`, text] as [string, string])
  ];
}
