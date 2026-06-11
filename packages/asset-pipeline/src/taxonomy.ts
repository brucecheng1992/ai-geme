import type { AssetPlanItem, AssetSemanticConstraint } from './schemas.js';

type SemanticRule = {
  concept: string;
  tags: string[];
  forbiddenTags: string[];
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
  extraterrestrial: 'alien',
  ufo: 'alien',
  坦克: 'tank',
  战车: 'tank',
  turret: 'tank',
  太空: 'space',
  宇宙: 'space',
  星星: 'space',
  galaxy: 'space',
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
  const tokens = normalized.split(' ').filter((token) => token.length > 0);
  const matched = rulesForRole(input.role).find((rule) => hasConcept(searchText, tokens, rule.concept));

  if (matched !== undefined) {
    return {
      expectedConcept: matched.concept,
      expectedAnyTags: matched.tags,
      forbiddenTags: matched.forbiddenTags,
      strictness: input.role === 'background' ? 'medium' : 'hard'
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

  return [];
}

function hasConcept(rawText: string, tokens: string[], concept: string): boolean {
  if (tokens.includes(concept)) {
    return true;
  }

  return Object.entries(SYNONYMS).some(([alias, canonical]) => {
    if (canonical !== concept) {
      return false;
    }

    return isAsciiSemanticTerm(alias) ? tokens.includes(alias) : rawText.includes(alias);
  });
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replaceAll(/[^a-z0-9_\u4e00-\u9fff]+/g, ' ');
}

function isAsciiSemanticTerm(value: string): boolean {
  return /^[a-z0-9_]+$/.test(value);
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
