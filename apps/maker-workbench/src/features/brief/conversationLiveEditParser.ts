import type { LiveEditableField } from '../../live-edit-client.js';
import {
  buildUnknownLiveEditIntentDetails,
  detectUnsupportedLiveEditIntent,
  type UnsupportedLiveEditIntentDetails
} from './unsupportedLiveEditIntentDiagnostics.js';

export type ConversationLiveEditParseResult =
  | {
      ok: true;
      field: LiveEditableField;
      value: number | string;
      summary: string;
      edits: ConversationLiveEdit[];
    }
  | ConversationLiveEditParseFailure;

export type ConversationLiveEditParseFailure =
  | {
      ok: false;
      reason: 'empty_text' | 'missing_number' | 'no_enabled_fields' | 'ambiguous_field';
      message: string;
    }
  | ({
      ok: false;
      reason: 'unsupported_field';
    } & UnsupportedLiveEditIntentDetails);

export type ConversationLiveEdit = {
  field: LiveEditableField;
  value: number | string;
  summary: string;
};

type ParsedNumericChange =
  | { kind: 'set'; amount: number }
  | { kind: 'delta'; sign: 1 | -1; amount?: number };

type FieldKeywordGroup = {
  test: (field: LiveEditableField) => boolean;
  keywords: string[];
  defaultDelta: number;
  clamp: (value: number, field: LiveEditableField) => number;
};

const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/gu;
const EXACT_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/u;

const FIELD_KEYWORDS: FieldKeywordGroup[] = [
  {
    test: (field) => field.path === '/world/width',
    keywords: ['world width', 'game width', 'x axis', 'x-axis', 'width', 'wider', '横向', '横轴', 'x轴', 'x 轴', '宽度', '更宽', '变宽', '扩大'],
    defaultDelta: 160,
    clamp: (value) => clampInteger(value, 320, 24000)
  },
  {
    test: (field) => field.path.includes('/render/scale'),
    keywords: ['scale', 'size', 'bigger', 'smaller', '缩放', '大小', '体型', '变大', '变小', '大一点', '小一点'],
    defaultDelta: 0.1,
    clamp: (value) => clampNumber(roundTo(value, 2), 0.1, 5)
  },
  {
    test: (field) => field.path.includes('/physics/maxSpeed') || field.path.endsWith('/physics/speed') || field.path.endsWith('/speed'),
    keywords: ['speed', '速度', '移速', '更快', '变快', '跑快', '快一点', '慢一点', '减速'],
    defaultDelta: 20,
    clamp: (value) => clampInteger(value, 1, 2000)
  },
  {
    test: (field) => field.path.includes('/health/max'),
    keywords: ['health', 'hp', 'life', '血量', '生命', '生命值', '耐打'],
    defaultDelta: 1,
    clamp: (value, field) => clampInteger(value, 1, fieldMax(field, 50))
  },
  {
    test: (field) => field.path.endsWith('/damage'),
    keywords: ['damage', '攻击', '伤害', '威力', '火力', '更强'],
    defaultDelta: 1,
    clamp: (value) => clampInteger(value, 1, 50)
  },
  {
    test: (field) => field.path.includes('/level/waves/') && field.path.endsWith('/count'),
    keywords: ['count', 'number', 'amount', 'wave', 'more enemies', '敌人数量', '敌人个数', '数量', '个数', '多一点', '波次'],
    defaultDelta: 1,
    clamp: (value) => clampInteger(value, 1, 100)
  },
  {
    test: (field) => field.path.includes('/level/waves/') && field.path.endsWith('/x'),
    keywords: ['spawn', 'position', 'x', 'enemy spawn', '刷新', '生成', '出生', '位置', '地图末端', '关卡末端', '末端'],
    defaultDelta: 80,
    clamp: (value) => clampInteger(value, 0, 20000)
  }
];
const NON_COUNT_NUMERIC_KEYWORDS = [
  'speed',
  '速度',
  '移速',
  '更快',
  '变快',
  '跑快',
  '慢一点',
  '减速',
  'health',
  'hp',
  'life',
  '血量',
  '生命',
  '生命值',
  '耐打',
  'damage',
  '攻击',
  '伤害',
  '威力',
  '火力',
  '更强',
  'scale',
  'size',
  '缩放',
  '大小',
  '体型',
  '变大',
  '变小'
];

const INCREASE_KEYWORDS = [
  'increase',
  'more',
  'bigger',
  'faster',
  'stronger',
  'higher',
  'wider',
  'widen',
  'up',
  '加',
  '增加',
  '增多',
  '更多',
  '多一点',
  '变多',
  '提高',
  '提升',
  '加强',
  '扩大',
  '更快',
  '变快',
  '更强',
  '更宽',
  '变宽',
  '变大',
  '大一点'
];
const DECREASE_KEYWORDS = ['decrease', 'less', 'smaller', 'slower', 'lower', 'reduce', '减少', '降低', '变少', '更少', '减弱', '变慢', '慢一点', '变小', '小一点'];
const SET_KEYWORDS = ['set', 'change to', 'make it', 'make', '改成', '设为', '设置为', '变成', '调成', '改为', '到'];
const REPLACE_KEYWORDS = ['change into', 'change to', 'replace with', 'turn into', 'make it', 'make', '修改成', '改成', '变成', '换成', '改为', '设为', '设置为', '成为'];
const TRAILING_FILLER_PATTERN = /[。.!！?？,，;；\s]*(了|吧|吗)?[。.!！?？,，;；\s]*$/u;
const EDIT_CLAUSE_SPLIT_PATTERN = /[。.!！?？,，;；]+|还有|以及|并且|同时/u;

/**
 * Turns the Workbench conversation text into a concrete DSL edit by scoring the
 * current live DSL fields. Deterministic parsing is deliberately bounded: when
 * text cannot be safely mapped, the caller should route it to the semantic
 * resolver instead of treating a guessed field as a valid edit.
 */
export function parseConversationLiveEditCommand(input: { text: string; fields: LiveEditableField[] }): ConversationLiveEditParseResult {
  const text = input.text.trim();
  if (text.length === 0) {
    return { ok: false, reason: 'empty_text', message: '输入为空，无法生成实时编辑。' };
  }

  const enabledFields = input.fields.filter((field) => field.enabled);
  if (enabledFields.length === 0) {
    return { ok: false, reason: 'no_enabled_fields', message: '当前游戏没有可实时编辑的字段。' };
  }

  const normalized = normalizeText(text);
  const unsupportedIntent = detectUnsupportedLiveEditIntent({ normalizedText: normalized, fields: enabledFields });
  if (unsupportedIntent !== undefined) {
    return unsupportedFailure(unsupportedIntent);
  }

  const spawnPositionEdit = parseSpawnPositionEdit(normalized, enabledFields);
  if (spawnPositionEdit !== undefined) {
    return spawnPositionEdit;
  }

  const semanticReplacement = parseSemanticReplacement(text, normalized, enabledFields);
  if (semanticReplacement !== undefined) {
    return semanticReplacement;
  }

  const clauses = splitEditClauses(text);
  if (clauses.length > 1) {
    const edits: ConversationLiveEdit[] = [];
    for (const clause of clauses) {
      const parsed = parseNumericEdit(normalizeText(clause), enabledFields);
      if (!parsed.ok) {
        return parsed;
      }
      edits.push(...parsed.edits);
    }
    return success(edits);
  }

  const parsed = parseNumericEdit(normalized, enabledFields);
  return parsed.ok ? success(parsed.edits) : parsed;
}

function parseNumericEdit(
  normalized: string,
  enabledFields: LiveEditableField[]
): { ok: true; edits: ConversationLiveEdit[] } | ConversationLiveEditParseFailure {
  const numericFields = enabledFields.filter((field) => field.valueKind === 'number');
  const scored = numericFields
    .map((field) => ({ field, score: scoreField(field, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) {
    return unsupportedFailure(buildUnknownLiveEditIntentDetails({ fields: enabledFields, message: '没有找到这句话对应的可编辑游戏字段。' }));
  }
  if (scored.length > 1 && scored[0]!.score === scored[1]!.score) {
    const aggregateEdits = buildAggregateNumericEdits(scored, normalized);
    if (aggregateEdits !== undefined) {
      return { ok: true, edits: aggregateEdits };
    }
    return { ok: false, reason: 'ambiguous_field', message: '这句话同时匹配了多个字段，请补充对象或属性。' };
  }

  const field = scored[0]!.field;
  const change = parseNumericChange(normalized);
  if (change === undefined) {
    return { ok: false, reason: 'missing_number', message: '没有识别到数值或增减意图。' };
  }

  const value = resolveNextValue(field, change);
  if (value === undefined) {
    return { ok: false, reason: 'missing_number', message: '这个字段缺少当前值，请输入一个明确数值。' };
  }

  return {
    ok: true,
    edits: [buildConversationEdit(field, value)]
  };
}

function buildAggregateNumericEdits(scored: Array<{ field: LiveEditableField; score: number }>, normalized: string): ConversationLiveEdit[] | undefined {
  if (!isEnemyCountAggregateIntent(normalized)) {
    return undefined;
  }

  const topScore = scored[0]?.score;
  const topFields = scored.filter((entry) => entry.score === topScore).map((entry) => entry.field);
  const waveCountFields = topFields.filter(isWaveCountField);
  if (waveCountFields.length === 0) {
    return undefined;
  }

  const change = parseNumericChange(normalized);
  if (change === undefined) {
    return undefined;
  }

  const edits: ConversationLiveEdit[] = [];
  for (const field of waveCountFields) {
    const value = resolveNextValue(field, change);
    if (value === undefined) {
      return undefined;
    }
    edits.push(buildConversationEdit(field, value));
  }
  return edits;
}

function isWaveCountField(field: LiveEditableField): boolean {
  return field.path.includes('/level/waves/') && field.path.endsWith('/count');
}

function isEnemyCountAggregateIntent(normalized: string): boolean {
  const hasEnemySubject = ['enemy', 'enemies', '敌人', '怪物', '外星人', 'alien'].some((keyword) => normalized.includes(keyword));
  const hasCountIntent = ['count', 'number', 'amount', 'wave', 'more enemies', '敌人数量', '敌人个数', '数量', '个数', '波次', '更多敌人', '多一点敌人'].some((keyword) =>
    normalized.includes(keyword)
  );
  const hasAddEnemyIntent = hasEnemySubject && INCREASE_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const hasExplicitNonCountProperty = NON_COUNT_NUMERIC_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));

  return (hasCountIntent || hasAddEnemyIntent) && !hasExplicitNonCountProperty;
}

function buildConversationEdit(field: LiveEditableField, value: number | string): ConversationLiveEdit {
  return {
    field,
    value,
    summary: `${field.label}: ${field.value ?? 'unknown'} -> ${value}`
  };
}

function parseSpawnPositionEdit(normalized: string, enabledFields: LiveEditableField[]): ConversationLiveEditParseResult | undefined {
  if (!isEnemySpawnEndIntent(normalized)) {
    return undefined;
  }

  const wavePositionFields = enabledFields.filter((field) => field.valueKind === 'number' && isWavePositionField(field));
  if (wavePositionFields.length === 0) {
    return undefined;
  }

  const value = resolveMapEndX(enabledFields);
  return success(wavePositionFields.map((field) => buildConversationEdit(field, value)));
}

function isWavePositionField(field: LiveEditableField): boolean {
  return field.path.includes('/level/waves/') && field.path.endsWith('/x');
}

function isEnemySpawnEndIntent(normalized: string): boolean {
  if (isNegatedMapEndSpawnIntent(normalized)) {
    return false;
  }

  const hasEnemySubject = ['enemy', 'enemies', '敌人', '怪物', '外星人', 'alien'].some((keyword) => normalized.includes(keyword));
  const hasSpawnIntent = ['spawn', 'refresh', '生成', '刷新', '出生', '刷怪', '位置', '刷在'].some((keyword) => normalized.includes(keyword));
  const hasEndIntent = ['map end', 'end of the map', 'level end', '地图末端', '地图的末端', '地图尽头', '关卡末端', '关卡尽头', '末端', '尽头'].some((keyword) =>
    normalized.includes(keyword)
  );

  return hasEnemySubject && hasSpawnIntent && hasEndIntent;
}

function isNegatedMapEndSpawnIntent(normalized: string): boolean {
  const compact = normalized.replace(/\s+/gu, '');
  const negatedSpawnPrefixes = ['不要刷新到', '不要刷新在', '不要刷在', '不要生成到', '不要生成在', '别刷新到', '别刷新在', '别刷在', '不能刷新到', '不能刷新在'];
  const mapEndTerms = ['地图末端', '地图的末端', '地图尽头', '关卡末端', '关卡尽头'];
  return negatedSpawnPrefixes.some((prefix) => mapEndTerms.some((term) => compact.includes(`${prefix}${term}`)));
}

function resolveMapEndX(fields: LiveEditableField[]): number {
  const worldWidth = fields.find((field) => field.path === '/world/width' && typeof field.value === 'number')?.value;
  if (typeof worldWidth === 'number') {
    return clampInteger(worldWidth - 80, 0, 20000);
  }

  const wavePositions = fields.filter(isWavePositionField).map((field) => field.value).filter((value): value is number => typeof value === 'number');
  return clampInteger(Math.max(0, ...wavePositions), 0, 20000);
}

function parseSemanticReplacement(text: string, normalizedText: string, fields: LiveEditableField[]): ConversationLiveEditParseResult | undefined {
  const replacement = extractReplacement(text, normalizedText);
  if (replacement === undefined) {
    return undefined;
  }

  const labelFields = fields.filter((field) => field.valueKind === 'label');
  if (labelFields.length === 0) {
    return undefined;
  }

  const scored = labelFields
    .map((field) => ({ field, score: scoreSemanticField(field, replacement.normalizedTargetText) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) {
    return undefined;
  }
  if (scored.length > 1 && scored[0]!.score === scored[1]!.score) {
    return { ok: false, reason: 'ambiguous_field', message: '这句话匹配了多个可编辑对象，请补充要修改的对象。' };
  }

  const field = scored[0]!.field;
  return {
    ok: true,
    field,
    value: replacement.value,
    summary: `${field.label}: ${field.value ?? 'unknown'} -> ${replacement.value}`,
    edits: [{ field, value: replacement.value, summary: `${field.label}: ${field.value ?? 'unknown'} -> ${replacement.value}` }]
  };
}

function extractReplacement(text: string, normalizedText: string): { value: string; normalizedTargetText: string } | undefined {
  const markers = [...REPLACE_KEYWORDS].sort((left, right) => right.length - left.length);
  const marker = markers
    .map((keyword) => ({ keyword, index: normalizedText.lastIndexOf(keyword) }))
    .filter((entry) => entry.index >= 0)
    .sort((left, right) => right.index - left.index)[0];
  if (marker === undefined) {
    return undefined;
  }

  const rawValue = text.slice(marker.index + marker.keyword.length).split(/[\n。.!！?？,，;；]/u)[0]?.trim() ?? '';
  const value = rawValue.replace(TRAILING_FILLER_PATTERN, '').trim();
  if (value.length === 0 || value.length > 40 || EXACT_NUMBER_PATTERN.test(value)) {
    return undefined;
  }

  return {
    value,
    normalizedTargetText: normalizedText.slice(0, marker.index)
  };
}

function parseNumericChange(normalizedText: string): ParsedNumericChange | undefined {
  const number = readLastFiniteNumber(normalizedText);
  const increases = INCREASE_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
  const decreases = DECREASE_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
  const sets = SET_KEYWORDS.some((keyword) => normalizedText.includes(keyword));

  if (sets && number !== undefined) {
    return { kind: 'set', amount: number };
  }
  if (increases && !decreases) {
    return { kind: 'delta', sign: 1, amount: number };
  }
  if (decreases && !increases) {
    return { kind: 'delta', sign: -1, amount: number };
  }
  return number === undefined ? undefined : { kind: 'set', amount: number };
}

function resolveNextValue(field: LiveEditableField, change: ParsedNumericChange): number | undefined {
  const group = FIELD_KEYWORDS.find((candidate) => candidate.test(field));
  if (change.kind === 'set') {
    return group?.clamp(change.amount, field) ?? change.amount;
  }
  if (typeof field.value !== 'number') {
    return undefined;
  }

  const delta = change.amount ?? group?.defaultDelta;
  if (delta === undefined) {
    return undefined;
  }

  const nextValue = field.value + change.sign * delta;
  return group?.clamp(nextValue, field) ?? nextValue;
}

function readLastFiniteNumber(text: string): number | undefined {
  const values = [...text.matchAll(NUMBER_PATTERN)].map((match) => Number(match[0])).filter(Number.isFinite);
  return values.at(-1);
}

function scoreField(field: LiveEditableField, normalizedText: string): number {
  const label = normalizeText(field.label);
  const aliasScore = field.aliases.some((alias) => normalizedText.includes(normalizeText(alias))) ? 4 : 0;
  const labelScore = label.length > 0 && normalizedText.includes(label) ? 2 : 0;
  const kindScore = targetKindKeywords(field.targetKind).some((keyword) => normalizedText.includes(keyword)) ? 2 : 0;
  const fieldScore = FIELD_KEYWORDS.reduce((score, group) => {
    if (!group.test(field)) {
      return score;
    }
    return score + (group.keywords.some((keyword) => normalizedText.includes(normalizeText(keyword))) ? 6 : 0);
  }, 0);

  return aliasScore + labelScore + kindScore + fieldScore;
}

function scoreSemanticField(field: LiveEditableField, normalizedTargetText: string): number {
  const value = typeof field.value === 'string' ? normalizeText(field.value) : '';
  const currentValueScore = value.length > 0 && normalizedTargetText.includes(value) ? 5 : 0;
  const aliasScore = field.aliases.some((alias) => normalizedTargetText.includes(normalizeText(alias))) ? 4 : 0;
  const kindScore = targetKindKeywords(field.targetKind).some((keyword) => normalizedTargetText.includes(keyword)) ? 3 : 0;
  const label = normalizeText(field.label);
  const labelScore = label.length > 0 && normalizedTargetText.includes(label) ? 1 : 0;

  return currentValueScore + aliasScore + kindScore + labelScore;
}

function targetKindKeywords(kind: LiveEditableField['targetKind']): string[] {
  if (kind === 'player') {
    return ['player', '玩家', '玩家角色', '主角', '角色'];
  }
  if (kind === 'world') {
    return ['world', 'game', '游戏', '世界', 'x轴', 'x axis', '横向', '宽度'];
  }
  if (kind === 'enemyType' || kind === 'wave') {
    return ['enemy', 'enemies', '敌人', '外星人', '怪物', 'alien'];
  }
  if (kind === 'projectile') {
    return ['projectile', 'bullet', '子弹', '飞弹', '鱼雷', '炮弹'];
  }
  return [];
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function success(edits: ConversationLiveEdit[]): Extract<ConversationLiveEditParseResult, { ok: true }> {
  const [first] = edits;
  if (first === undefined) {
    throw new Error('Conversation live edit success requires at least one edit.');
  }
  return {
    ok: true,
    field: first.field,
    value: first.value,
    summary: edits.map((edit) => edit.summary).join('; '),
    edits
  };
}

function splitEditClauses(text: string): string[] {
  return text
    .split(EDIT_CLAUSE_SPLIT_PATTERN)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function unsupportedFailure(details: UnsupportedLiveEditIntentDetails): Extract<ConversationLiveEditParseFailure, { reason: 'unsupported_field' }> {
  return {
    ok: false,
    reason: 'unsupported_field',
    ...details
  };
}

function fieldMax(field: LiveEditableField, fallback: number): number {
  return field.targetKind === 'player' ? 20 : fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.round(clampNumber(value, min, max));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
