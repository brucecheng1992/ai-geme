import { describe, expect, it } from 'vitest';

import { buildSemanticExtractionTrace, buildSemanticExtractionTraceReport, validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

describe('Semantic extraction trace', () => {
  it('records explicit cat player and alien enemy terms from 小猫射击外星人', () => {
    const trace = traceShooter('小猫射击外星人', {
      playerLabel: '小猫',
      enemyId: 'enemy',
      enemyLabel: '外星人'
    });

    expect(trace.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceTerm: '小猫',
          entityId: 'player',
          gameplayRole: 'player',
          visualConcept: 'cat',
          extractionSource: 'manual_prompt',
          inferred: false
        }),
        expect.objectContaining({
          sourceTerm: '外星人',
          entityId: 'enemy',
          gameplayRole: 'enemy',
          visualConcept: 'alien',
          extractionSource: 'manual_prompt',
          inferred: false
        })
      ])
    );
  });

  it('records tank player semantics from 坦克大战 without generic tank guessing', () => {
    const trace = traceShooter('坦克大战', {
      playerLabel: '坦克',
      enemyLabel: 'Raider'
    });
    const player = findEntry(trace.entries, 'player');

    expect(player).toMatchObject({
      sourceTerm: '坦克',
      gameplayRole: 'player',
      visualConcept: 'tank',
      extractionSource: 'manual_prompt',
      inferred: false
    });
  });

  it('records human_character from Human Action Shooter', () => {
    const trace = traceShooter('Human Action Shooter', {
      playerLabel: 'Human',
      enemyLabel: 'Raider'
    });
    const player = findEntry(trace.entries, 'player');

    expect(player).toMatchObject({
      sourceTerm: 'human',
      gameplayRole: 'player',
      visualConcept: 'human_character',
      extractionSource: 'manual_prompt',
      inferred: false
    });
  });

  it('keeps Generic Shooter as generic_actor fallback and never promotes it to tank', () => {
    const trace = traceShooter('Generic Shooter', {
      playerLabel: 'Pilot',
      enemyLabel: 'Raider'
    });
    const player = findEntry(trace.entries, 'player');

    expect(player).toMatchObject({
      sourceTerm: 'player',
      gameplayRole: 'player',
      visualConcept: 'generic_actor',
      extractionSource: 'fallback_derivation',
      inferred: true
    });
    expect(player.visualConcept).not.toBe('tank');
  });

  it('does not match Latin aliases inside larger words', () => {
    const trace = traceShooter('Catapult Shooter', {
      playerLabel: 'Cat',
      enemyLabel: 'Raider'
    });
    const player = findEntry(trace.entries, 'player');

    expect(player).toMatchObject({
      sourceTerm: 'player',
      gameplayRole: 'player',
      visualConcept: 'cat',
      extractionSource: 'fallback_derivation',
      inferred: true
    });
  });

  it('builds a refs-ready extraction trace report with matching entryCount', () => {
    const report = buildSemanticExtractionTraceReport({
      originalPrompt: '小猫射击外星人',
      semanticModel: normalizeShooter({ playerLabel: '小猫', enemyId: 'enemy', enemyLabel: '外星人' })
    });

    expect(report).toMatchObject({
      version: 'semantic_extraction_trace_report.v1',
      entryCount: report.entries.length
    });
    expect(report.entryCount).toBeGreaterThan(0);
  });

  it('rejects mismatched trace report entryCount at the schema boundary', async () => {
    const { SemanticExtractionTraceReportSchema } = await import('../../packages/game-dsl/src/index.js');

    expect(() =>
      SemanticExtractionTraceReportSchema.parse({
        version: 'semantic_extraction_trace_report.v1',
        entryCount: 1,
        entries: []
      })
    ).toThrow('entryCount must match entries.length');
  });
});

function traceShooter(
  originalPrompt: string,
  options: { playerLabel: string; enemyLabel: string; enemyId?: string }
) {
  return buildSemanticExtractionTrace({
    originalPrompt,
    semanticModel: normalizeShooter(options)
  });
}

function normalizeShooter(options: { playerLabel: string; enemyLabel: string; enemyId?: string }) {
  const raw = createShooterRawDsl();
  const enemyId = options.enemyId ?? 'alien';
  const nextRaw = {
    ...raw,
    player: {
      ...raw.player,
      label: options.playerLabel
    },
    entities: raw.entities.map((entity) =>
      entity.kind === 'enemy'
        ? {
            ...entity,
            id: enemyId,
            label: options.enemyLabel
          }
        : entity
    ),
    rules: {
      collisions: raw.rules.collisions.map((collision) => ({
        ...collision,
        target: collision.target === 'alien' ? enemyId : collision.target
      }))
    }
  };
  const normalized = validateAndNormalizeRawGameDsl(nextRaw);

  expect(normalized.ok).toBe(true);
  if (!normalized.ok) {
    throw new Error('test fixture failed to normalize');
  }
  return normalized.ir.semanticModel;
}

function findEntry(entries: ReturnType<typeof buildSemanticExtractionTrace>['entries'], entityId: string) {
  const entry = entries.find((candidate) => candidate.entityId === entityId);
  expect(entry).toBeDefined();
  if (entry === undefined) {
    throw new Error(`missing trace entry for ${entityId}`);
  }
  return entry;
}
