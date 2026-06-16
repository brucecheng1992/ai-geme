import type { RawGameDsl } from '../schemas/raw-game-dsl-v0.1.schema.js';
import { GameSemanticModelSchema, type GameSemanticModel, type GameplayRole, type SemanticStrictness, type VisualConcept } from './semantic-model.schema.js';

export function buildGameSemanticModel(raw: RawGameDsl): GameSemanticModel {
  if (raw.semanticModel !== undefined) {
    return raw.semanticModel;
  }

  return GameSemanticModelSchema.parse({
    schemaVersion: 'game-semantic-model-v0.1',
    entities: [
      buildEntitySemanticProfile({
        entityId: raw.player.id,
        role: 'player',
        label: raw.player.label,
        sourcePaths: ['player.id', 'player.label']
      }),
      ...raw.entities.map((entity, index) =>
        buildEntitySemanticProfile({
          entityId: entity.id,
          role: toGameplayRole(entity.kind),
          label: entity.label,
          sourcePaths: [`entities.${index}.id`, `entities.${index}.kind`, `entities.${index}.label`]
        })
      )
    ]
  });
}

function buildEntitySemanticProfile(input: {
  entityId: string;
  role: GameplayRole;
  label: string;
  sourcePaths: string[];
}): GameSemanticModel['entities'][number] {
  const concept = inferVisualConcept(input.role, input.label);
  return {
    entityId: input.entityId,
    role: input.role,
    concept,
    tags: tagsForConcept(concept),
    strictness: strictnessForConcept(concept),
    source: 'normalizer_default',
    sourcePaths: input.sourcePaths
  };
}

function toGameplayRole(kind: RawGameDsl['entities'][number]['kind']): GameplayRole {
  if (kind === 'collectible') {
    return 'collectible';
  }
  return kind;
}

function inferVisualConcept(role: GameplayRole, label: string): VisualConcept {
  const normalized = normalizeSemanticText(label);

  if (matchesAny(normalized, ['cat', 'kitten', 'feline', '小猫', '猫'])) {
    return 'cat';
  }
  if (matchesAny(normalized, ['alien', 'extraterrestrial', 'ufo', '外星人', '外星', '异星人', '异星'])) {
    return 'alien';
  }
  if (matchesAny(normalized, ['human', 'person', '人类', '英雄'])) {
    return 'human_character';
  }
  if (matchesAny(normalized, ['tank', 'turret', 'armored vehicle', 'armoured vehicle', '坦克', '战车', '装甲车'])) {
    return 'tank';
  }
  if (matchesAny(normalized, ['fishbone', 'fish bone', 'fish_bone', '鱼骨', '鱼骨头', '鱼骨子弹', '鱼骨头子弹'])) {
    return 'fishbone';
  }

  if (role === 'projectile') {
    return 'bullet';
  }
  if (role === 'collectible') {
    return 'collectible';
  }
  if (role === 'hazard') {
    return 'hazard';
  }
  if (role === 'background') {
    return 'background';
  }
  if (role === 'pickup') {
    return 'pickup';
  }
  return 'generic_actor';
}

function tagsForConcept(concept: VisualConcept): string[] {
  const tagsByConcept: Record<VisualConcept, string[]> = {
    generic_actor: ['generic_actor'],
    human_character: ['human', 'person', 'hero'],
    cat: ['cat', 'kitten', 'feline'],
    alien: ['alien', 'extraterrestrial', 'ufo_creature'],
    tank: ['tank', 'vehicle'],
    fishbone: ['fishbone', 'projectile'],
    bullet: ['bullet', 'projectile'],
    collectible: ['collectible'],
    hazard: ['hazard'],
    background: ['background'],
    pickup: ['pickup']
  };
  return tagsByConcept[concept];
}

function strictnessForConcept(concept: VisualConcept): SemanticStrictness {
  if (concept === 'generic_actor' || concept === 'collectible' || concept === 'hazard' || concept === 'background' || concept === 'pickup') {
    return 'soft';
  }
  if (concept === 'bullet' || concept === 'fishbone') {
    return 'medium';
  }
  return 'hard';
}

function normalizeSemanticText(value: string): string {
  return value.trim().toLowerCase().replaceAll(/[^a-z0-9_\u4e00-\u9fff]+/g, ' ');
}

function matchesAny(normalizedText: string, aliases: string[]): boolean {
  const tokens = normalizedText.split(' ').filter((token) => token.length > 0);
  return aliases.some((alias) => matchesAlias(normalizedText, tokens, alias));
}

function matchesAlias(normalizedText: string, tokens: string[], alias: string): boolean {
  const normalizedAlias = normalizeSemanticText(alias);
  const aliasTokens = normalizedAlias.split(' ').filter((token) => token.length > 0);
  if (aliasTokens.length === 0) {
    return false;
  }
  if (aliasTokens.every((token) => /^[a-z0-9_]+$/.test(token))) {
    return tokens.some((_, index) => aliasTokens.every((token, offset) => tokens[index + offset] === token));
  }
  return normalizedText.includes(normalizedAlias);
}
