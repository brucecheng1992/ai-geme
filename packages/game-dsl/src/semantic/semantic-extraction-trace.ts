import type { EntitySemanticProfile, GameSemanticModel, GameplayRole, VisualConcept } from './semantic-model.schema.js';
import {
  SemanticExtractionTraceReportSchema,
  SemanticExtractionTraceSchema,
  type ExtractionSource,
  type SemanticExtractionTrace,
  type SemanticExtractionTraceEntry,
  type SemanticExtractionTraceReport
} from './semantic-extraction-trace.schema.js';

export type BuildSemanticExtractionTraceInput = {
  originalPrompt?: string;
  brief?: unknown;
  semanticModel?: GameSemanticModel;
};

const CONCEPT_ALIASES: Record<VisualConcept, string[]> = {
  generic_actor: [],
  human_character: ['human', 'person', '人类', '人'],
  cat: ['cat', 'kitten', 'kitty', 'feline', '猫', '小猫', '猫咪', '猫猫'],
  dog: ['dog', 'puppy', 'canine', '狗', '小狗', '狗狗'],
  alien: ['alien', 'extraterrestrial', 'ufo creature', 'space creature', 'ufo', '外星人', '外星怪物', '外星', '异星人', '异星怪物'],
  tank: ['armored vehicle', 'armoured vehicle', 'tank', 'turret', '坦克', '战车', '装甲车'],
  fishbone: ['fishbone', 'fish bone', 'fish_bone', '鱼骨头子弹', '鱼骨子弹', '鱼骨头', '鱼骨'],
  bullet: ['bullet', 'projectile', 'bolt', 'laser', '子弹', '弹丸'],
  collectible: ['collectible', 'gem', 'coin', 'pickup', '收集物', '宝石', '金币'],
  hazard: ['hazard', 'obstacle', 'trap', '危险', '障碍'],
  background: ['background', 'scene', 'world', '背景', '场景'],
  pickup: ['pickup', 'powerup', 'power-up', '道具']
};

const ROLE_FALLBACK_TERMS: Record<GameplayRole, string> = {
  player: 'player',
  enemy: 'enemy',
  projectile: 'projectile',
  collectible: 'collectible',
  hazard: 'hazard',
  background: 'background',
  pickup: 'pickup'
};

export function buildSemanticExtractionTrace(input: BuildSemanticExtractionTraceInput): SemanticExtractionTrace {
  const semanticModel = input.semanticModel;
  if (semanticModel === undefined) {
    return SemanticExtractionTraceSchema.parse({ version: 'semantic_extraction_trace.v1', entries: [] });
  }

  const promptText = input.originalPrompt ?? '';
  const briefText = stringifyBrief(input.brief);
  const entries = semanticModel.entities.map((profile) => buildEntry(profile, promptText, briefText));

  return SemanticExtractionTraceSchema.parse({
    version: 'semantic_extraction_trace.v1',
    entries
  });
}

export function buildSemanticExtractionTraceReport(input: BuildSemanticExtractionTraceInput): SemanticExtractionTraceReport {
  const trace = buildSemanticExtractionTrace(input);

  return SemanticExtractionTraceReportSchema.parse({
    version: 'semantic_extraction_trace_report.v1',
    entryCount: trace.entries.length,
    entries: trace.entries
  });
}

function buildEntry(profile: EntitySemanticProfile, promptText: string, briefText: string): SemanticExtractionTraceEntry {
  const promptMatch = findConceptMatch(promptText, profile.concept);
  if (promptMatch !== undefined) {
    return explicitEntry(profile, promptMatch, 'manual_prompt', 'Semantic concept matched explicit wording in the original prompt.');
  }

  const briefMatch = findConceptMatch(briefText, profile.concept);
  if (briefMatch !== undefined) {
    return explicitEntry(profile, briefMatch, 'prompt_coach', 'Semantic concept matched explicit wording in the generated brief.');
  }

  if (profile.source === 'model_explicit') {
    const sourceTerm = firstUsefulProfileTerm(profile);
    return {
      sourceTerm,
      normalizedTerm: normalizeTerm(sourceTerm),
      entityId: profile.entityId,
      gameplayRole: profile.role,
      visualConcept: profile.concept,
      strictness: profile.strictness,
      confidence: 0.9,
      extractionSource: 'llm',
      inferred: false,
      rationale: 'Semantic profile was supplied explicitly by the DSL model.'
    };
  }

  const sourceTerm = ROLE_FALLBACK_TERMS[profile.role];
  return {
    sourceTerm,
    normalizedTerm: normalizeTerm(sourceTerm),
    entityId: profile.entityId,
    gameplayRole: profile.role,
    visualConcept: profile.concept,
    strictness: profile.strictness,
    confidence: 0.5,
    extractionSource: 'fallback_derivation',
    inferred: true,
    rationale: 'No explicit prompt or brief term matched; semantic profile came from conservative DSL fallback derivation.'
  };
}

function explicitEntry(profile: EntitySemanticProfile, sourceTerm: string, extractionSource: ExtractionSource, rationale: string): SemanticExtractionTraceEntry {
  return {
    sourceTerm,
    normalizedTerm: normalizeTerm(sourceTerm),
    entityId: profile.entityId,
    gameplayRole: profile.role,
    visualConcept: profile.concept,
    strictness: profile.strictness,
    confidence: extractionSource === 'manual_prompt' ? 0.95 : 0.85,
    extractionSource,
    inferred: false,
    rationale
  };
}

function findConceptMatch(text: string, concept: VisualConcept): string | undefined {
  const aliases = CONCEPT_ALIASES[concept];
  if (text.trim().length === 0 || aliases.length === 0) {
    return undefined;
  }

  const sortedAliases = [...aliases].sort((left, right) => right.length - left.length);
  return sortedAliases.find((alias) => matchesAlias(text, alias));
}

function firstUsefulProfileTerm(profile: EntitySemanticProfile): string {
  return profile.tags.find((tag) => tag.trim().length > 0) ?? profile.concept;
}

function normalizeTerm(term: string): string {
  return term.trim().toLocaleLowerCase();
}

function stringifyBrief(brief: unknown): string {
  if (brief === undefined || brief === null) {
    return '';
  }
  if (typeof brief === 'string') {
    return brief;
  }
  try {
    return JSON.stringify(brief);
  } catch {
    return '';
  }
}

function matchesAlias(text: string, alias: string): boolean {
  if (isLatinAlias(alias)) {
    return new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(alias)}(?=$|[^A-Za-z0-9_])`, 'i').test(text);
  }
  return text.toLocaleLowerCase().includes(alias.toLocaleLowerCase());
}

function isLatinAlias(alias: string): boolean {
  return /^[A-Za-z0-9 _-]+$/.test(alias);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
