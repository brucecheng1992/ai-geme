import { describe, expect, it } from 'vitest';

import {
  buildGameDslArtifact,
  DslValidationReportSchema,
  RawGameDslSchema,
  validateGameDslArtifact
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from '../contracts/fixtures.js';

const runId = 'run_20260615_dsl_report';

describe('DSL validation report contract', () => {
  it('builds a deterministic valid report with stable id and object count summaries', () => {
    const artifact = buildShooterArtifact();
    const first = DslValidationReportSchema.parse(validateGameDslArtifact(artifact).report);
    const second = DslValidationReportSchema.parse(validateGameDslArtifact(artifact).report);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first).toMatchObject({
      artifactKind: 'dsl_validation_report',
      reportVersion: 'dsl-validation-report-v1',
      schemaVersion: 'dsl_validation_report.v1',
      runId,
      sourceArtifact: 'game_dsl.json',
      validatedArtifact: { artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', dslId: artifact.dslId },
      status: 'valid',
      valid: true,
      errorCount: 0,
      warningCount: 0,
      objectCounts: {
        player: 1,
        playerActions: 1,
        enemyTypes: 1,
        projectiles: 1,
        waves: 1
      },
      stableIdSummary: {
        duplicateIds: [],
        checked: expect.arrayContaining([
          { path: 'player.id', id: 'player' },
          { path: 'enemyTypes.alien.id', id: 'alien' },
          { path: 'projectiles.bolt.id', id: 'bolt' },
          { path: 'level.waves.alien_wave.id', id: 'alien_wave' }
        ])
      }
    });
    expect(first.checkedPaths).toEqual([...first.checkedPaths].sort());
    expect(first.checkedPaths).toEqual(expect.arrayContaining(['schemaVersion', 'player.id', 'projectiles.bolt.id', 'semanticChecks.duplicate_ids']));
  });

  it('reports deterministic schema errors for missing required fields', () => {
    const artifact = buildShooterArtifact();
    const result = validateGameDslArtifact({ ...artifact, player: undefined });

    expect(result).toMatchObject({
      ok: false,
      report: {
        status: 'invalid',
        valid: false,
        sourceArtifact: 'game_dsl.json',
        objectCounts: {
          player: 0,
          enemyTypes: 0,
          projectiles: 0,
          waves: 0
        },
        errors: [expect.objectContaining({ code: 'SCHEMA_VALIDATION_FAILED', path: 'player' })]
      }
    });
    expect(result.report.errors).toEqual([...result.report.errors].sort(compareIssues));
  });

  it('reports duplicate stable IDs in both errors and stableIdSummary', () => {
    const artifact = buildShooterArtifact();
    const result = validateGameDslArtifact({
      ...artifact,
      player: { ...artifact.player, actions: [{ ...artifact.player.actions[0], id: artifact.level.id }] }
    });

    expect(result).toMatchObject({
      ok: false,
      report: {
        status: 'invalid',
        valid: false,
        errors: expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_ID', path: 'player.actions.0.id' })]),
        stableIdSummary: {
          duplicateIds: [artifact.level.id]
        }
      }
    });
  });

  it('reports dangling references without silently passing validation', () => {
    const artifact = buildShooterArtifact();
    const result = validateGameDslArtifact({
      ...artifact,
      level: {
        ...artifact.level,
        waves: { alien_wave: { ...artifact.level.waves.alien_wave, enemyTypeRef: 'ghost_enemy' } }
      }
    });

    expect(result).toMatchObject({
      ok: false,
      report: {
        status: 'invalid',
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ code: 'UNRESOLVED_ENEMY_TYPE_REFERENCE', path: 'level.waves.alien_wave.enemyTypeRef' })
        ]),
        checkedPaths: expect.arrayContaining(['level.waves.alien_wave.enemyTypeRef', 'semanticChecks.enemy_type_references'])
      }
    });
  });

  it('rejects internally inconsistent validation reports at the schema boundary', () => {
    const artifact = buildShooterArtifact();
    const report = validateGameDslArtifact(artifact).report;

    expect(() => DslValidationReportSchema.parse({ ...report, status: 'valid', valid: false })).toThrow();
    expect(() => DslValidationReportSchema.parse({ ...report, status: 'invalid', valid: false })).toThrow();
    expect(() => DslValidationReportSchema.parse({ ...report, errorCount: 1 })).toThrow();
    expect(() => DslValidationReportSchema.parse({ ...report, warningCount: 1 })).toThrow();
  });
});

function buildShooterArtifact() {
  return buildGameDslArtifact({
    rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
    runId,
    intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
  });
}

function compareIssues(left: { path: string; code: string; message: string }, right: { path: string; code: string; message: string }): number {
  const leftKey = `${left.path}\u0000${left.code}\u0000${left.message}`;
  const rightKey = `${right.path}\u0000${right.code}\u0000${right.message}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}
