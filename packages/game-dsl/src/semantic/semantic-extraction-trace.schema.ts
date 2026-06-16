import { z } from 'zod';

import { GameplayRoleSchema, SemanticStrictnessSchema, VisualConceptSchema } from './semantic-model.schema.js';

export const ExtractionSourceSchema = z.enum(['manual_prompt', 'prompt_coach', 'llm', 'fallback_derivation']);

export const SemanticExtractionTraceEntrySchema = z.strictObject({
  sourceTerm: z.string().min(1),
  normalizedTerm: z.string().min(1).optional(),
  entityId: z.string().min(1),
  gameplayRole: GameplayRoleSchema,
  visualConcept: VisualConceptSchema,
  strictness: SemanticStrictnessSchema,
  confidence: z.number().min(0).max(1),
  extractionSource: ExtractionSourceSchema,
  inferred: z.boolean(),
  rationale: z.string().min(1).optional()
});

export const SemanticExtractionTraceSchema = z.strictObject({
  version: z.literal('semantic_extraction_trace.v1'),
  entries: z.array(SemanticExtractionTraceEntrySchema)
});

export const SemanticExtractionTraceReportSchema = z.strictObject({
  version: z.literal('semantic_extraction_trace_report.v1'),
  entryCount: z.number().int().min(0),
  entries: z.array(SemanticExtractionTraceEntrySchema)
}).refine((report) => report.entryCount === report.entries.length, {
  path: ['entryCount'],
  message: 'entryCount must match entries.length'
});

export type ExtractionSource = z.infer<typeof ExtractionSourceSchema>;
export type SemanticExtractionTraceEntry = z.infer<typeof SemanticExtractionTraceEntrySchema>;
export type SemanticExtractionTrace = z.infer<typeof SemanticExtractionTraceSchema>;
export type SemanticExtractionTraceReport = z.infer<typeof SemanticExtractionTraceReportSchema>;
