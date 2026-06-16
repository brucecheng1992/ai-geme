import { z } from 'zod';

import { GameSemanticModelSchema, type GameSemanticModel } from './semantic-model.schema.js';

export const SEMANTIC_MODEL_REPORT_VERSION = 'semantic-model-report-v0.1';

export const SemanticModelReportSchema = z.strictObject({
  reportVersion: z.literal(SEMANTIC_MODEL_REPORT_VERSION),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  source: z.literal('ir.semanticModel'),
  status: z.enum(['present', 'missing']),
  profileCount: z.number().int().min(0),
  semanticTracePresent: z.boolean().optional(),
  semanticTraceRef: z.strictObject({
    artifact: z.literal('semantic_extraction_trace_report.json')
  }).optional(),
  semanticModel: GameSemanticModelSchema.optional()
});

export type SemanticModelReport = z.infer<typeof SemanticModelReportSchema>;

export function buildSemanticModelReport(input: {
  projectId: string;
  runId: string;
  semanticModel?: GameSemanticModel;
  semanticTracePresent?: boolean;
}): SemanticModelReport {
  const semanticTracePresent = input.semanticTracePresent === true;

  return SemanticModelReportSchema.parse({
    reportVersion: SEMANTIC_MODEL_REPORT_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    source: 'ir.semanticModel',
    status: input.semanticModel === undefined ? 'missing' : 'present',
    profileCount: input.semanticModel?.entities.length ?? 0,
    semanticTracePresent,
    ...(semanticTracePresent ? { semanticTraceRef: { artifact: 'semantic_extraction_trace_report.json' } } : {}),
    ...(input.semanticModel === undefined ? {} : { semanticModel: input.semanticModel })
  });
}
