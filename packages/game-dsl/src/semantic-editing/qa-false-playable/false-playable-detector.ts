import { isSemanticId, parseSemanticId } from '../semantic-address.js';
import type { SemanticId } from '../semantic-address.js';
import type { SemanticEditIntent } from '../types.js';
import type {
  CreateFalsePlayableRepairIntentOptions,
  DetectSemanticFalsePlayableOptions,
  SemanticFalsePlayableDetectionResult,
  SemanticFalsePlayableFinding,
  SemanticFalsePlayableSeverity
} from './false-playable-types.js';

type FindingCandidate = {
  value: Record<string, unknown>;
  index: number;
};

const EXPLICIT_FALSE_PLAYABLE_CODES = [
  'FALSE_PLAYABLE',
  'BLANK_PREVIEW',
  'PREVIEW_BLANK',
  'BLANK_CANVAS',
  'NO_VISIBLE_OUTPUT'
] as const;
const PLAYABLE_STATUS = 'PLAYABLE';
const DEFAULT_SCENE_TARGET = 'scene:main';
const UNSAFE_SCENE_TARGET_SEGMENTS = new Set(['src', 'generated', 'phaser', 'packages', 'apps', 'dist', 'build']);
const NEGATIVE_EXPLICIT_CODE_TOKENS = new Set([
  'NOT',
  'NO',
  'NON',
  'WITHOUT',
  'RESOLVED',
  'FIXED',
  'CLEARED',
  'SUPPRESSED'
]);

/**
 * Detects report-like false-playable QA findings without retaining screenshot,
 * canvas, or full report payloads in the result.
 */
export function detectSemanticFalsePlayableFindings(
  qaReport: unknown,
  options: DetectSemanticFalsePlayableOptions = {}
): SemanticFalsePlayableDetectionResult {
  const warnings: string[] = [];
  if (!isRecord(qaReport)) {
    return { detected: false, findings: [], warnings: ['QA_FALSE_PLAYABLE_REPORT_NOT_OBJECT'] };
  }

  const hasReportId = readString(qaReport, 'id') !== undefined || readString(qaReport, 'reportId') !== undefined;
  const candidates = collectCandidates(qaReport);
  const findings = candidates.flatMap((candidate) =>
    createFindingFromCandidate({
      candidate,
      qaReport,
      hasReportId,
      defaultSceneTarget: options.defaultSceneTarget ?? DEFAULT_SCENE_TARGET,
      warnings
    })
  );

  return {
    detected: findings.length > 0,
    findings,
    warnings
  };
}

/**
 * Converts a safe false-playable finding into the semantic edit intent consumed
 * by the existing fix_blank_preview repair pack.
 */
export function createFalsePlayableRepairIntent(
  finding: SemanticFalsePlayableFinding,
  options: CreateFalsePlayableRepairIntentOptions = {}
): SemanticEditIntent {
  return {
    id: options.createIntentId?.(finding, 0) ?? `semantic_edit:false_playable:${finding.id}`,
    kind: 'fix_blank_preview',
    target: finding.sceneTarget,
    reason: {
      source: 'qa',
      message: finding.message,
      qaFindingIds: [finding.id]
    },
    payload: {
      ensureRenderableEntity: true,
      ensureCameraSeesSpawn: true,
      ensureBackgroundVisible: true,
      ensureAssetBindings: true
    },
    constraints: {
      preserveGameplay: true,
      preserveAssets: true,
      noGeneratedCodeEdit: true
    }
  };
}

function collectCandidates(report: Record<string, unknown>): FindingCandidate[] {
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const candidateFindings = findings
    .map((finding, index) => ({ finding, index }))
    .filter((entry): entry is { finding: Record<string, unknown>; index: number } => isRecord(entry.finding))
    .map(({ finding, index }) => ({ value: finding, index }));

  return candidateFindings.length === 0 ? [{ value: report, index: 0 }] : candidateFindings;
}

function createFindingFromCandidate(input: {
  candidate: FindingCandidate;
  qaReport: Record<string, unknown>;
  hasReportId: boolean;
  defaultSceneTarget: string;
  warnings: string[];
}): SemanticFalsePlayableFinding[] {
  const evidenceCodes = collectEvidenceCodes(input.candidate.value, input.qaReport);
  if (evidenceCodes.length === 0) {
    return [];
  }

  const sceneTarget = inferSceneTarget(input.candidate.value, input.qaReport, input.defaultSceneTarget);
  if (!sceneTarget.ok) {
    input.warnings.push(sceneTarget.warning);
    return [];
  }

  const hasFindingId =
    readString(input.candidate.value, 'id') !== undefined || readString(input.candidate.value, 'findingId') !== undefined;
  return [
    {
      id: `false_playable:${input.candidate.index}`,
      code: 'FALSE_PLAYABLE',
      severity: readSeverity(input.candidate.value) ?? 'error',
      message: readMessage(input.candidate.value, input.qaReport),
      sceneTarget: sceneTarget.value,
      source: {
        ...(input.hasReportId ? { hasReportId: true } : {}),
        ...(hasFindingId ? { hasFindingId: true } : {}),
        ...optionalStatus(input.qaReport, input.candidate.value, 'status'),
        ...optionalStatus(input.qaReport, input.candidate.value, 'previewStatus'),
        evidenceCodes,
        hasScreenshot: hasReportField(input.candidate.value, input.qaReport, ['screenshot', 'screenshot_path', 'screenshotPath']),
        hasCanvasSnapshot: hasReportField(input.candidate.value, input.qaReport, ['canvasSnapshot', 'canvas_snapshot', 'canvasData'])
      }
    }
  ];
}

function collectEvidenceCodes(candidate: Record<string, unknown>, report: Record<string, unknown>): string[] {
  const explicitCodes = collectExplicitCodes(candidate, report);
  if (explicitCodes.length > 0) {
    return uniqueStrings(explicitCodes);
  }

  const playable = hasPlayableStatus(candidate) || hasPlayableStatus(report);
  if (!playable) {
    return [];
  }

  return uniqueStrings([...collectBlankEvidence(candidate), ...collectBlankEvidence(report)]);
}

function collectExplicitCodes(...records: Record<string, unknown>[]): string[] {
  return records.flatMap((record) =>
    ['code', 'kind', 'type'].flatMap((key) => {
      const value = readString(record, key);
      if (value === undefined) {
        return [];
      }

      return EXPLICIT_FALSE_PLAYABLE_CODES.filter((code) => hasExplicitCodeTokenSequence(value, code));
    })
  );
}

function hasExplicitCodeTokenSequence(value: string, expectedCode: string): boolean {
  const tokens = tokenizeCode(value);
  const expectedTokens = expectedCode.split('_');
  const lastStart = tokens.length - expectedTokens.length;

  for (let start = 0; start <= lastStart; start += 1) {
    const matches = expectedTokens.every((token, offset) => tokens[start + offset] === token);
    if (matches && !hasNegatingToken(tokens, start, expectedTokens.length)) {
      return true;
    }
  }

  return false;
}

function tokenizeCode(value: string): string[] {
  return value
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((token) => token.length > 0);
}

function hasNegatingToken(tokens: string[], start: number, length: number): boolean {
  const previous = tokens[start - 1];
  const next = tokens[start + length];
  return (
    (previous !== undefined && NEGATIVE_EXPLICIT_CODE_TOKENS.has(previous)) ||
    (next !== undefined && NEGATIVE_EXPLICIT_CODE_TOKENS.has(next))
  );
}

function hasPlayableStatus(record: Record<string, unknown>): boolean {
  return ['status', 'previewStatus', 'playableStatus', 'resultStatus', 'overall_status', 'overallStatus'].some((key) => {
    const value = readString(record, key);
    return value?.toUpperCase() === PLAYABLE_STATUS;
  });
}

function collectBlankEvidence(record: Record<string, unknown>): string[] {
  return [
    ...booleanEvidence(record, ['visual'], 'blank', 'visual.blank'),
    ...booleanEvidence(record, ['visual'], 'isBlank', 'visual.isBlank'),
    ...booleanEvidence(record, ['visual'], 'blankCanvas', 'visual.blankCanvas'),
    ...booleanEvidence(record, ['preview'], 'blank', 'preview.blank'),
    ...booleanEvidence(record, ['canvas'], 'blank', 'canvas.blank'),
    ...booleanEvidence(record, ['observable'], 'blank', 'observable.blank'),
    ...countEvidence(record, 'renderableCount'),
    ...countEvidence(record, 'visibleRenderableCount'),
    ...messageEvidence(record)
  ];
}

function booleanEvidence(record: Record<string, unknown>, path: string[], key: string, evidenceCode: string): string[] {
  const parent = path.reduce<unknown>((current, segment) => (isRecord(current) ? current[segment] : undefined), record);
  return isRecord(parent) && parent[key] === true ? [evidenceCode] : [];
}

function countEvidence(record: Record<string, unknown>, key: string): string[] {
  return record[key] === 0 ? [key] : [];
}

function messageEvidence(record: Record<string, unknown>): string[] {
  const message = readString(record, 'message');
  if (message === undefined) {
    return [];
  }

  return /blank preview|blank canvas|no visible output|false playable/i.test(message) ? ['message.false_playable'] : [];
}

function inferSceneTarget(
  candidate: Record<string, unknown>,
  report: Record<string, unknown>,
  defaultSceneTarget: string
): { ok: true; value: SemanticId } | { ok: false; warning: string } {
  const targetCandidates = [
    readString(candidate, 'target'),
    readString(candidate, 'sceneTarget'),
    sceneKeyToTarget(readString(candidate, 'sceneId')),
    sceneKeyToTarget(readString(candidate, 'sceneKey')),
    sceneKeyToTarget(readString(candidate, 'scene')),
    readString(report, 'sceneTarget'),
    sceneKeyToTarget(readString(report, 'sceneId')),
    sceneKeyToTarget(readString(report, 'sceneKey')),
    sceneKeyToTarget(readString(report, 'scene')),
    defaultSceneTarget
  ].filter((value): value is string => value !== undefined);

  for (const target of targetCandidates) {
    if (isSafeSceneTarget(target)) {
      return { ok: true, value: target };
    }
    return { ok: false, warning: 'QA_FALSE_PLAYABLE_UNSAFE_SCENE_TARGET' };
  }

  return { ok: false, warning: 'QA_FALSE_PLAYABLE_MISSING_SCENE_TARGET' };
}

function isSafeSceneTarget(target: string): target is SemanticId {
  if (!isSemanticId(target)) {
    return false;
  }

  const parsed = parseSemanticId(target);
  if (parsed?.kind !== 'scene') {
    return false;
  }

  if (target.includes('/') || target.includes('\\') || target.includes('..') || target.includes('\0')) {
    return false;
  }

  const normalizedParts = parsed.name.split('_');
  return (
    !normalizedParts.some((part) => UNSAFE_SCENE_TARGET_SEGMENTS.has(part)) &&
    !/\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(parsed.name)
  );
}

function sceneKeyToTarget(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.startsWith('scene:') ? value : `scene:${value}`;
}

function readSeverity(record: Record<string, unknown>): SemanticFalsePlayableSeverity | undefined {
  const value = readString(record, 'severity')?.toLowerCase();
  return value === 'info' || value === 'warning' || value === 'error' ? value : undefined;
}

function readMessage(candidate: Record<string, unknown>, report: Record<string, unknown>): string {
  return (
    readString(candidate, 'message') ??
    readString(report, 'message') ??
    'QA report indicates a false-playable blank preview.'
  );
}

function optionalStatus(
  report: Record<string, unknown>,
  candidate: Record<string, unknown>,
  key: 'status' | 'previewStatus'
): { status?: string; previewStatus?: string } {
  const value = readString(candidate, key) ?? readString(report, key);
  return value === undefined ? {} : { [key]: value };
}

function hasReportField(candidate: Record<string, unknown>, report: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => hasOwn(candidate, key) || hasOwn(report, key));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
