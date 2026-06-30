import { z } from 'zod';

import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { GAME_BRIEF_V02_SCHEMA_VERSION, GameBriefV02Schema, type GameBriefV02 } from './schemas/game-brief-v0.2.schema.js';
import type { GameBriefIngressResult } from './schemas/game-brief-ingress.js';

export const CANONICAL_GAME_BRIEF_ARTIFACT_KIND = 'canonical_game_brief';
export const CANONICAL_GAME_BRIEF_SCHEMA_VERSION = 'canonical_game_brief.v1';
export const CANONICAL_GAME_BRIEF_PATH = 'canonical_game_brief.json';
export const GAME_BRIEF_RAW_MODEL_OUTPUT_KIND = 'game_brief_raw_model_output';
export const GAME_BRIEF_RAW_MODEL_OUTPUT_PATH = 'game-brief.raw.json';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);

export const CanonicalGameBriefArtifactSchema = z.strictObject({
  artifactKind: z.literal(CANONICAL_GAME_BRIEF_ARTIFACT_KIND),
  schemaVersion: z.literal(CANONICAL_GAME_BRIEF_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  briefSchemaVersion: z.literal(GAME_BRIEF_V02_SCHEMA_VERSION),
  sourceFormat: z.enum(['v0.2', 'legacy-open-duration']),
  rawOutputRef: z.strictObject({
    artifactKind: z.literal(GAME_BRIEF_RAW_MODEL_OUTPUT_KIND),
    path: z.literal(GAME_BRIEF_RAW_MODEL_OUTPUT_PATH)
  }),
  canonicalBrief: GameBriefV02Schema,
  contentHash: z.string().regex(/^fnv1a_[0-9a-f]{8}$/)
});

export type CanonicalGameBriefArtifact = z.infer<typeof CanonicalGameBriefArtifactSchema>;

export function buildCanonicalGameBriefArtifact(input: {
  projectId: string;
  runId: string;
  canonicalBrief: GameBriefV02;
  sourceFormat: GameBriefIngressResult['sourceFormat'];
}): CanonicalGameBriefArtifact {
  return CanonicalGameBriefArtifactSchema.parse({
    artifactKind: CANONICAL_GAME_BRIEF_ARTIFACT_KIND,
    schemaVersion: CANONICAL_GAME_BRIEF_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    briefSchemaVersion: GAME_BRIEF_V02_SCHEMA_VERSION,
    sourceFormat: input.sourceFormat,
    rawOutputRef: {
      artifactKind: GAME_BRIEF_RAW_MODEL_OUTPUT_KIND,
      path: GAME_BRIEF_RAW_MODEL_OUTPUT_PATH
    },
    canonicalBrief: input.canonicalBrief,
    contentHash: hashStableJson(input.canonicalBrief)
  });
}
