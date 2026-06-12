import type { AssetPlanItem, AssetSemanticConstraint } from './schemas.js';

type SemanticRule = {
  concept: string;
  tags: string[];
  forbiddenTags: string[];
  strictness?: AssetSemanticConstraint['strictness'];
};

const CORE_ENTITY_RULES: SemanticRule[] = [
  {
    concept: 'cat',
    tags: ['cat', 'kitten', 'feline'],
    forbiddenTags: ['tank', 'vehicle', 'spaceship', 'robot', 'turret']
  },
  {
    concept: 'alien',
    tags: ['alien', 'extraterrestrial', 'ufo_creature'],
    forbiddenTags: ['tank', 'vehicle', 'soldier', 'turret']
  },
  {
    concept: 'tank',
    tags: ['tank', 'vehicle'],
    forbiddenTags: ['cat', 'kitten', 'feline', 'alien', 'extraterrestrial']
  }
];

const PROJECTILE_RULES: SemanticRule[] = [
  {
    concept: 'fishbone',
    tags: ['fishbone', 'projectile'],
    forbiddenTags: ['shell', 'tank_bullet', 'missile', 'alien', 'extraterrestrial'],
    strictness: 'medium'
  }
];

const BACKGROUND_RULES: SemanticRule[] = [
  {
    concept: 'space',
    tags: ['space', 'stars', 'galaxy', 'cosmic'],
    forbiddenTags: ['battlefield', 'road', 'grassland']
  },
  {
    concept: 'battlefield',
    tags: ['battlefield', 'road', 'grassland'],
    forbiddenTags: ['space', 'stars', 'galaxy', 'cosmic']
  }
];

const SYNONYMS: Record<string, string> = {
  kitty: 'cat',
  kitten: 'cat',
  feline: 'cat',
  小猫: 'cat',
  猫: 'cat',
  外星人: 'alien',
  外星: 'alien',
  异星人: 'alien',
  异星: 'alien',
  外星怪物: 'alien',
  异星怪物: 'alien',
  extraterrestrial: 'alien',
  ufo: 'alien',
  ufo_creature: 'alien',
  'ufo creature': 'alien',
  space_creature: 'alien',
  'space creature': 'alien',
  坦克: 'tank',
  战车: 'tank',
  装甲车: 'tank',
  armored_vehicle: 'tank',
  'armored vehicle': 'tank',
  armoured_vehicle: 'tank',
  'armoured vehicle': 'tank',
  turret: 'tank',
  鱼骨: 'fishbone',
  鱼骨头: 'fishbone',
  鱼骨头子弹: 'fishbone',
  鱼骨子弹: 'fishbone',
  fishbone: 'fishbone',
  fish_bone: 'fishbone',
  'fish bone': 'fishbone',
  太空: 'space',
  宇宙: 'space',
  星空: 'space',
  银河: 'space',
  星海: 'space',
  星星: 'space',
  stars: 'space',
  starfield: 'space',
  star_field: 'space',
  'star field': 'space',
  galaxy: 'space',
  cosmic: 'space',
  battlefield: 'battlefield',
  战场: 'battlefield'
};

/** Builds serializable semantic hints for later resolver gates without changing selection behavior. */
export function inferAssetSemanticConstraint(input: {
  role: AssetPlanItem['role'];
  subject: string;
  styleTheme?: string;
}): AssetSemanticConstraint {
  const searchText = `${input.subject} ${input.styleTheme ?? ''}`;
  const normalized = normalizeSearchText(searchText);
  const tokens = tokenizeSearchText(normalized);
  const matched = rulesForRole(input.role).find((rule) => hasConcept(normalized, tokens, rule.concept));

  if (matched !== undefined) {
    return {
      expectedConcept: matched.concept,
      expectedAnyTags: matched.tags,
      forbiddenTags: matched.forbiddenTags,
      strictness: matched.strictness ?? defaultStrictness(input.role)
    };
  }

  return {
    expectedConcept: fallbackConcept(input.role),
    expectedAnyTags: [fallbackConcept(input.role)],
    forbiddenTags: [],
    strictness: input.role === 'background' ? 'medium' : 'soft'
  };
}

function rulesForRole(role: AssetPlanItem['role']): SemanticRule[] {
  if (role === 'background') {
    return BACKGROUND_RULES;
  }

  if (role === 'player_character' || role === 'enemy') {
    return CORE_ENTITY_RULES;
  }

  if (role === 'projectile') {
    return PROJECTILE_RULES;
  }

  return [];
}

function hasConcept(normalizedText: string, tokens: string[], concept: string): boolean {
  if (matchesSemanticAlias(normalizedText, tokens, concept)) {
    return true;
  }

  return Object.entries(SYNONYMS).some(([alias, canonical]) => {
    if (canonical !== concept) {
      return false;
    }

    return matchesSemanticAlias(normalizedText, tokens, alias);
  });
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replaceAll(/[^a-z0-9_\u4e00-\u9fff]+/g, ' ');
}

function tokenizeSearchText(value: string): string[] {
  return value.split(' ').filter((token) => token.length > 0);
}

function matchesSemanticAlias(normalizedText: string, tokens: string[], alias: string): boolean {
  const normalizedAlias = normalizeSearchText(alias);
  const aliasTokens = tokenizeSearchText(normalizedAlias);
  if (aliasTokens.length === 0) {
    return false;
  }

  if (aliasTokens.every(isAsciiSemanticToken)) {
    return includesTokenSequence(tokens, aliasTokens);
  }

  return normalizedText.includes(normalizedAlias);
}

function isAsciiSemanticToken(value: string): boolean {
  return /^[a-z0-9_]+$/.test(value);
}

function includesTokenSequence(tokens: string[], sequence: string[]): boolean {
  if (sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) => sequence.every((token, offset) => tokens[index + offset] === token));
}

function defaultStrictness(role: AssetPlanItem['role']): AssetSemanticConstraint['strictness'] {
  return role === 'background' ? 'medium' : 'hard';
}

function fallbackConcept(role: AssetPlanItem['role']): string {
  if (role === 'player_character') {
    return 'player';
  }

  if (role === 'ui_panel') {
    return 'ui';
  }

  return role;
}
