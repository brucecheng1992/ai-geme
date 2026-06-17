import {
  describeRuntimeGenreCapability,
  findRuntimeGenreCapability,
  isRuntimeGenreExecutable,
  type GameBrief,
  type RuntimeSupportStatus
} from '../../../../packages/game-dsl/src/index.js';

export const NORMALIZED_2D_GENRES = [
  'top_down_shooter',
  'side_scrolling_platformer',
  'side_scrolling_run_and_gun',
  'vertical_shooter',
  'dodger_collector',
  'breakout',
  'maze_chase'
] as const;

export type Normalized2dGenre = (typeof NORMALIZED_2D_GENRES)[number];
type IntentNormalizedGenre = Normalized2dGenre | 'unrecognized_2d_genre';

export type IntentPlan = {
  schemaVersion: 'intent-plan-v0.1';
  sourcePrompt: string;
  normalizedGenre: IntentNormalizedGenre;
  matchedAlias?: string;
  language: 'zh' | 'en';
  runtimeDslSupport: 'supported' | 'unsupported';
  runtimeSupportStatus: RuntimeSupportStatus;
  runtimeSupportReason: string;
  runtimeTemplateId?: string;
  qaProfile?: string;
  unsupportedCapabilities: string[];
};

type Language = 'zh' | 'en';

const genreAliases: ReadonlyArray<{ genre: Normalized2dGenre; aliases: readonly string[] }> = [
  { genre: 'top_down_shooter', aliases: ['小猫大战坦克', 'tank shooter', 'top down shooter', '俯视角射击'] },
  { genre: 'side_scrolling_run_and_gun', aliases: ['魂斗罗', '魂斗罗式', '横版跑枪', '横版射击', 'run and gun', 'contra-like'] },
  { genre: 'vertical_shooter', aliases: ['飞机大战', 'vertical shooter'] },
  { genre: 'side_scrolling_platformer', aliases: ['马里奥式', '平台跳跃', 'platformer'] },
  { genre: 'breakout', aliases: ['打砖块', 'breakout'] },
  { genre: 'maze_chase', aliases: ['迷宫追逐', 'maze chase'] }
];

const copyrightedRunAndGunTerms = ['魂斗罗', 'contra'];

export function buildIntentPlan(params: { idea: string; language: Language }): IntentPlan {
  const match = matchGenreAlias(params.idea);
  const normalizedGenre = match?.genre ?? defaultGenreForPrompt(params.idea);
  const runtimeCapability = findRuntimeGenreCapability(normalizedGenre);
  const runtimeExecutable = runtimeCapability !== undefined && isRuntimeGenreExecutable(runtimeCapability);

  return {
    schemaVersion: 'intent-plan-v0.1',
    sourcePrompt: params.idea,
    normalizedGenre,
    matchedAlias: match?.alias,
    language: params.language,
    runtimeDslSupport: runtimeExecutable ? 'supported' : 'unsupported',
    runtimeSupportStatus: runtimeCapability?.status ?? 'unsupported',
    runtimeSupportReason: describeRuntimeGenreCapability(runtimeCapability),
    ...(runtimeExecutable && runtimeCapability.templateId !== undefined ? { runtimeTemplateId: runtimeCapability.templateId } : {}),
    ...(runtimeExecutable && runtimeCapability.qaProfile !== undefined ? { qaProfile: runtimeCapability.qaProfile } : {}),
    unsupportedCapabilities: runtimeExecutable ? [] : runtimeCapability?.missingCapabilities ?? ['recognized_2d_genre']
  };
}

export function normalizeBriefWithIntentPlan(brief: GameBrief, plan: IntentPlan): GameBrief {
  if (plan.normalizedGenre === 'side_scrolling_run_and_gun') {
    return {
      ...brief,
      title: sanitizeRunAndGunTitle(brief.title),
      genre: 'side_scrolling_run_and_gun',
      camera: 'side_view',
      core_loop: [
        'Run through side-view platform segments.',
        'Jump across terrain while avoiding enemy fire.',
        'Shoot generic enemies and reach the exit.'
      ]
    };
  }

  if (plan.normalizedGenre === 'top_down_shooter') {
    return {
      ...brief,
      genre: 'shooter',
      camera: 'top_down',
      core_loop: ['Move in a top-down arena.', 'Fire projectiles at generic enemies.', 'Clear enemies to win.']
    };
  }

  return brief;
}

function matchGenreAlias(idea: string): { genre: Normalized2dGenre; alias: string } | undefined {
  const normalizedIdea = idea.toLowerCase();

  for (const entry of genreAliases) {
    const alias = entry.aliases.find((candidate) => normalizedIdea.includes(candidate.toLowerCase()));
    if (alias !== undefined) {
      return { genre: entry.genre, alias };
    }
  }

  return undefined;
}

function defaultGenreForPrompt(idea: string): IntentNormalizedGenre {
  const normalizedIdea = idea.toLowerCase();

  if (normalizedIdea.includes('collect') || normalizedIdea.includes('收集') || normalizedIdea.includes('躲')) {
    return 'dodger_collector';
  }

  if (normalizedIdea.includes('shooter') || normalizedIdea.includes('射击') || normalizedIdea.includes('坦克') || normalizedIdea.includes('tank')) {
    return 'top_down_shooter';
  }

  return 'unrecognized_2d_genre';
}

function sanitizeRunAndGunTitle(title: string): string {
  let sanitized = title;
  for (const term of copyrightedRunAndGunTerms) {
    sanitized = sanitized.replace(new RegExp(term, 'gi'), 'Run And Gun');
  }

  return sanitized.trim() || 'Run And Gun';
}
