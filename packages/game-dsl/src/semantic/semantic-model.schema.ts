import { z } from 'zod';

const DslIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const SemanticTagSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);

export const GameplayRoleSchema = z.enum(['player', 'enemy', 'projectile', 'collectible', 'hazard', 'background', 'pickup']);
export const VisualConceptSchema = z.enum([
  'generic_actor',
  'human_character',
  'cat',
  'dog',
  'alien',
  'tank',
  'fishbone',
  'bullet',
  'collectible',
  'hazard',
  'background',
  'pickup'
]);
export const SemanticStrictnessSchema = z.enum(['hard', 'medium', 'soft']);
export const SemanticProfileSourceSchema = z.enum(['model_explicit', 'normalizer_default']);

export const EntitySemanticProfileSchema = z.strictObject({
  entityId: DslIdSchema,
  role: GameplayRoleSchema,
  concept: VisualConceptSchema,
  tags: z.array(SemanticTagSchema).min(1).max(12),
  strictness: SemanticStrictnessSchema,
  source: SemanticProfileSourceSchema,
  sourcePaths: z.array(z.string().min(1).max(120)).min(1).max(8)
});

/** Game-level semantic source of truth consumed by IR and downstream asset planning. */
export const GameSemanticModelSchema = z
  .strictObject({
    schemaVersion: z.literal('game-semantic-model-v0.1'),
    entities: z.array(EntitySemanticProfileSchema).min(1).max(24)
  })
  .superRefine((model, ctx) => {
    const seen = new Set<string>();
    for (const [index, entity] of model.entities.entries()) {
      if (seen.has(entity.entityId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entities', index, 'entityId'],
          message: `Duplicate semantic profile for entity "${entity.entityId}"`
        });
      }
      seen.add(entity.entityId);
    }
  });

export type GameplayRole = z.infer<typeof GameplayRoleSchema>;
export type VisualConcept = z.infer<typeof VisualConceptSchema>;
export type SemanticStrictness = z.infer<typeof SemanticStrictnessSchema>;
export type EntitySemanticProfile = z.infer<typeof EntitySemanticProfileSchema>;
export type GameSemanticModel = z.infer<typeof GameSemanticModelSchema>;
