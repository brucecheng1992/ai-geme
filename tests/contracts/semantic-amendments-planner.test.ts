import { describe, expect, it } from 'vitest';

import {
  buildAmendmentContextPack,
  buildGameDslArtifact,
  buildRuntimeCapabilityReport,
  planSemanticAmendment,
  RawGameDslSchema,
  SemanticEditProposalSchema
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

const projectId = 'proj_20260618_100000_step32';
const runId = 'run_20260618_100000_step32';

describe('semantic amendment planner', () => {
  it('routes player speed through the hot runtime patch path', () => {
    const context = buildContext();

    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '提高玩家速度',
      context,
      now: fixedNow,
      createProposalId: () => 'amend_player_speed'
    });

    expect(SemanticEditProposalSchema.parse(proposal)).toMatchObject({
      id: 'amend_player_speed',
      understanding: {
        understood: true,
        affectedDomains: ['player'],
        designDeltas: [expect.objectContaining({ kind: 'tune_stat', targetDomain: 'player', stat: 'speed' })]
      },
      execution: {
        mode: 'hot_runtime_patch',
        supportedNow: true,
        rejectedUnsafeFallbacks: []
      },
      candidate: {
        dslPatch: {
          ops: [expect.objectContaining({ path: '/player/physics/maxSpeed', value: expect.any(Number) })]
        }
      }
    });
  });

  it('routes direct combat stat amendments through explicit hot runtime paths', () => {
    const cases = [
      {
        text: '提高敌人速度',
        proposalId: 'amend_enemy_speed',
        targetDomain: 'enemy',
        stat: 'speed',
        path: '/enemyTypes/alien/physics/speed'
      },
      {
        text: '提高敌人生命值',
        proposalId: 'amend_enemy_health',
        targetDomain: 'enemy',
        stat: 'health',
        path: '/enemyTypes/alien/health/max'
      },
      {
        text: '提高玩家生命值',
        proposalId: 'amend_player_health',
        targetDomain: 'player',
        stat: 'health',
        path: '/player/health/max'
      }
    ];

    for (const testCase of cases) {
      const proposal = planSemanticAmendment({
        projectId,
        runId,
        text: testCase.text,
        context: buildContext(),
        now: fixedNow,
        createProposalId: () => testCase.proposalId
      });

      expect(proposal).toMatchObject({
        id: testCase.proposalId,
        understanding: {
          understood: true,
          designDeltas: [expect.objectContaining({ kind: 'tune_stat', targetDomain: testCase.targetDomain, stat: testCase.stat })]
        },
        execution: {
          mode: 'hot_runtime_patch',
          supportedNow: true,
          rejectedUnsafeFallbacks: []
        },
        candidate: {
          dslPatch: {
            ops: [expect.objectContaining({ path: testCase.path, value: expect.any(Number) })]
          }
        }
      });
    }
  });

  it('understands weapon fire rate as a warm restart patch without projectile fallback', () => {
    const context = buildContext();

    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '增加武器射速',
      context,
      now: fixedNow,
      createProposalId: () => 'amend_weapon_fire_rate'
    });

    expect(proposal).toMatchObject({
      understanding: {
        summary: '提高玩家主武器射速',
        affectedDomains: ['weapon'],
        designDeltas: [expect.objectContaining({ kind: 'tune_stat', targetDomain: 'weapon', stat: 'fireRate' })],
        operations: [expect.objectContaining({ kind: 'stat_tuning', target: 'player.primaryWeapon', stat: 'fireRate' })]
      },
      execution: {
        mode: 'dsl_patch_warm_restart',
        rejectedUnsafeFallbacks: ['projectile.speed', 'projectile.damage']
      },
      candidate: {
        dslPatch: {
          ops: [expect.objectContaining({ path: '/player/actions/0/cooldownMs', value: 225 })]
        }
      }
    });
  });

  it('turns open pacing language into a multi-delta amendment instead of a field lookup failure', () => {
    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '让游戏更紧张',
      context: buildContext(),
      now: fixedNow,
      createProposalId: () => 'amend_pacing'
    });

    expect(proposal.understanding).toMatchObject({
      understood: true,
      affectedDomains: ['difficulty', 'pacing', 'enemy', 'projectile'],
      designDeltas: [
        expect.objectContaining({
          kind: 'modify_pacing',
          inferredDeltas: expect.arrayContaining([
            expect.objectContaining({ kind: 'tune_stat', targetDomain: 'enemy', stat: 'count' }),
            expect.objectContaining({ kind: 'tune_stat', targetDomain: 'enemy', stat: 'speed' }),
            expect.objectContaining({ kind: 'tune_stat', targetDomain: 'projectile', stat: 'speed' })
          ])
        })
      ]
    });
    expect(proposal.execution.mode).toBe('dsl_patch_warm_restart');
    expect(proposal.userMessage).not.toContain('没有找到');
  });

  it('routes player cat reskin to candidate regeneration and blocks scale-only fallback', () => {
    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '把玩家变成小猫',
      context: buildContext(),
      now: fixedNow,
      createProposalId: () => 'amend_cat_player'
    });

    expect(proposal).toMatchObject({
      understanding: {
        designDeltas: [expect.objectContaining({ kind: 'reskin_or_theme', target: 'player' })]
      },
      execution: {
        mode: 'candidate_regeneration',
        requiresCandidateRun: true,
        rejectedUnsafeFallbacks: ['player.scale']
      },
      candidate: {
        candidateBrief: expect.objectContaining({ preserveGameplay: true })
      }
    });
  });

  it('keeps understood unsupported Boss feedback separate from nearby numeric fields', () => {
    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: 'Boss 登场时屏幕震动并播放警告音',
      context: buildContext(),
      now: fixedNow,
      createProposalId: () => 'amend_boss_intro'
    });

    expect(proposal).toMatchObject({
      understanding: {
        understood: true,
        affectedDomains: ['boss', 'camera', 'audio', 'ui'],
        operations: [expect.objectContaining({ kind: 'event_action', event: 'boss_intro' })]
      },
      execution: {
        mode: 'unsupported_capability',
        missingCapabilities: ['boss_lifecycle_event', 'camera_shake_runtime_effect', 'warning_audio_event_binding'],
        rejectedUnsafeFallbacks: ['enemy.count', 'enemy.speed', 'projectile.damage']
      }
    });
    expect(proposal.userMessage).not.toContain('没有找到');
  });

  it('asks for clarification for vague requests instead of returning no editable field', () => {
    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '改好玩点',
      context: buildContext(),
      now: fixedNow,
      createProposalId: () => 'amend_vague'
    });

    expect(proposal).toMatchObject({
      understanding: {
        understood: false,
        clarificationQuestion: expect.stringContaining('更快')
      },
      execution: { mode: 'needs_clarification' }
    });
    expect(proposal.userMessage).not.toContain('没有找到');
  });

  it('reports executable context gaps as unsupported instead of clarification', () => {
    const context = buildAmendmentContextPack({ projectId, runId });

    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '提高玩家速度',
      context,
      now: fixedNow,
      createProposalId: () => 'amend_missing_context'
    });

    expect(proposal).toMatchObject({
      understanding: { understood: true },
      execution: {
        mode: 'unsupported_capability',
        missingCapabilities: ['current_dsl_context']
      }
    });
    expect(proposal.userMessage).toContain('current_dsl_context');
  });

  it('reports missing weapon fire action as unsupported without pretending the request is unclear', () => {
    const context = buildContext();
    if (context.currentDsl === undefined) {
      throw new Error('expected test context to include currentDsl');
    }
    context.currentDsl.player.actions = [];

    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '增加武器射速',
      context,
      now: fixedNow,
      createProposalId: () => 'amend_missing_fire_action'
    });

    expect(proposal).toMatchObject({
      understanding: {
        understood: true,
        designDeltas: [expect.objectContaining({ targetDomain: 'weapon', stat: 'fireRate' })]
      },
      execution: {
        mode: 'unsupported_capability',
        missingCapabilities: ['weapon_fire_rate_action'],
        rejectedUnsafeFallbacks: ['projectile.speed', 'projectile.damage']
      }
    });
    expect(proposal.userMessage).toContain('weapon_fire_rate_action');
  });

  it('gates candidate regeneration on current generator capabilities', () => {
    const context = buildContext();
    context.generatorCapabilities = [];

    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '把玩家变成小猫',
      context,
      now: fixedNow,
      createProposalId: () => 'amend_cat_without_generator'
    });

    expect(proposal).toMatchObject({
      understanding: { understood: true },
      execution: {
        mode: 'unsupported_capability',
        missingCapabilities: ['candidate_brief', 'candidate_dsl', 'candidate_run', 'candidate_theme_player'],
        rejectedUnsafeFallbacks: ['player.scale']
      }
    });
    expect(proposal.userMessage).toContain('candidate_brief');
  });
});

function buildContext() {
  const gameDsl = buildGameDslArtifact({
    rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
    runId,
    intentPlan: { normalizedGenre: 'top_down_shooter' }
  });
  const runtimeCapabilityReport = buildRuntimeCapabilityReport({ runId, validatedDsl: gameDsl });
  return buildAmendmentContextPack({ projectId, runId, currentDsl: gameDsl, runtimeCapabilityReport });
}

function fixedNow(): Date {
  return new Date('2026-06-18T10:00:00.000Z');
}
