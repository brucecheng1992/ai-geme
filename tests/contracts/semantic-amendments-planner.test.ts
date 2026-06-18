import { describe, expect, it } from 'vitest';

import {
  buildAmendmentContextPack,
  buildGameDslArtifact,
  buildRuntimeCapabilityReport,
  GameAmendmentOperationSchema,
  planSemanticAmendment,
  RawGameDslSchema,
  StableTargetSelectorSchema,
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
      amendmentIr: {
        schemaVersion: 'step34.game-amendment-ir.v1',
        requestId: 'amend_player_speed',
        baseRunId: runId,
        baseArtifactHashes: { currentDsl: expect.stringMatching(/^[a-f0-9]{64}$/) },
        operations: [
          expect.objectContaining({
            operation: 'setComponentProperty',
            target: { scope: 'component', id: 'player.physics', role: 'player' },
            componentType: 'physics',
            property: 'speed',
            preconditions: expect.arrayContaining([
              expect.objectContaining({ kind: 'target_exists' }),
              expect.objectContaining({ kind: 'component_exists', componentType: 'physics' }),
              expect.objectContaining({ kind: 'current_value_equals', property: 'speed' })
            ]),
            requiresCapabilities: [expect.objectContaining({ capabilityId: 'amendment.set_component_property.player.speed.v1' })],
            expectedEffects: [expect.objectContaining({ kind: 'property_changed', property: 'speed' })]
          })
        ],
        operationDependencies: [{ operationId: 'op_0_stat_tuning', dependsOn: [] }]
      },
      understanding: {
        understood: true,
        intentClass: 'typed_edit',
        plannerProvenanceStatus: 'RULE_FALLBACK',
        modelInvocationId: 'rules_amend_player_speed',
        affectedDomains: ['player'],
        designDeltas: [expect.objectContaining({ kind: 'tune_stat', targetDomain: 'player', stat: 'speed' })]
      },
      execution: {
        mode: 'hot_runtime_patch',
        supportedNow: true,
        rejectedUnsafeFallbacks: []
      },
      executionPlan: {
        schemaVersion: 'step34.execution-plan.v1',
        proposalId: 'amend_player_speed',
        mode: 'hot_runtime_patch',
        runtimeSessionRequired: true,
        candidateRunRequired: false,
        previewReloadRequired: false,
        requiredCapabilities: expect.arrayContaining(['amendment.set_component_property.player.speed.v1', 'live_edit_path:/player/physics/maxSpeed']),
        availableCapabilities: expect.arrayContaining(['live_edit_path:/player/physics/maxSpeed']),
        missingCapabilities: [],
        incompatibleCapabilities: [],
        operationPlan: [
          expect.objectContaining({
            operationId: 'op_0_stat_tuning',
            compilerId: 'profile-backed.set-component-property.v1',
            patchAdapterId: 'dsl-json-patch.player.physics.maxSpeed.v1',
            executionMode: 'hot_runtime_patch'
          })
        ],
        verificationRequirements: [expect.objectContaining({ kind: 'property_changed', property: 'speed' })]
      },
      candidate: {
        dslPatch: {
          ops: [expect.objectContaining({ path: '/player/physics/maxSpeed', value: expect.any(Number) })]
        }
      }
    });
    expectCapabilityPlanClosed(proposal.executionPlan);
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
        requiresCandidateRun: true,
        rejectedUnsafeFallbacks: ['projectile.speed', 'projectile.damage']
      },
      executionPlan: {
        mode: 'dsl_patch_warm_restart',
        candidateRunRequired: true,
        previewReloadRequired: true
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
      intentClass: 'typed_edit',
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
    expect(proposal.executionPlan).toMatchObject({
      schemaVersion: 'step34.execution-plan.v1',
      mode: 'dsl_patch_warm_restart',
      candidateRunRequired: true,
      previewReloadRequired: true,
      runtimeSessionRequired: false,
      verificationRequirements: expect.arrayContaining([expect.objectContaining({ kind: 'property_changed' })])
    });
    expectCapabilityPlanClosed(proposal.executionPlan);
    expect(proposal.amendmentIr.operations.map((operation) => operation.id)).toEqual(['op_0_stat_tuning', 'op_1_stat_tuning', 'op_2_stat_tuning']);
    expect(proposal.amendmentIr.operationDependencies).toEqual([
      { operationId: 'op_0_stat_tuning', dependsOn: [] },
      { operationId: 'op_1_stat_tuning', dependsOn: ['op_0_stat_tuning'] },
      { operationId: 'op_2_stat_tuning', dependsOn: ['op_1_stat_tuning'] }
    ]);
    for (const operation of proposal.amendmentIr.operations) {
      expect(operation.preconditions.length).toBeGreaterThan(0);
      expect(operation.requiresCapabilities.length).toBeGreaterThan(0);
      expect(operation.expectedEffects.length).toBeGreaterThan(0);
      expect(JSON.stringify(operation.target)).not.toContain('/enemyTypes/0');
      expect(JSON.stringify(operation.target)).not.toContain('/projectiles/0');
    }
    expect(proposal.userMessage).not.toContain('没有找到');
  });

  it('rejects raw JSON Patch paths at the amendment IR contract boundary', () => {
    expect(() => StableTargetSelectorSchema.parse({ scope: 'component', id: '/enemyTypes/0/physics/speed' })).toThrow();
    expect(() => StableTargetSelectorSchema.parse({ scope: 'component', id: 'enemyTypes.0.physics' })).toThrow();
    expect(() =>
      GameAmendmentOperationSchema.parse({
        operation: 'setComponentProperty',
        id: 'op_raw_path',
        target: { scope: 'component', role: 'enemy' },
        path: '/enemyTypes/0/physics/speed',
        property: 'speed',
        preconditions: [{ kind: 'target_exists', target: { scope: 'component', role: 'enemy' } }],
        requiresCapabilities: [{ capabilityId: 'amendment.set_component_property.enemy.speed.v1', reason: 'test', required: true }],
        expectedEffects: [{ kind: 'property_changed', target: { scope: 'component', role: 'enemy' }, property: 'speed', comparison: 'increased' }]
      })
    ).toThrow();
    expect(() =>
      GameAmendmentOperationSchema.parse({
        operation: 'setComponentProperty',
        id: 'op_raw_property',
        target: { scope: 'component', role: 'enemy' },
        property: '/enemyTypes/0/physics/speed',
        preconditions: [{ kind: 'target_exists', target: { scope: 'component', role: 'enemy' } }],
        requiresCapabilities: [{ capabilityId: 'amendment.set_component_property.enemy.speed.v1', reason: 'test', required: true }],
        expectedEffects: [{ kind: 'property_changed', target: { scope: 'component', role: 'enemy' }, property: 'enemyTypes.0.physics', comparison: 'increased' }]
      })
    ).toThrow();
    expect(() =>
      GameAmendmentOperationSchema.parse({
        operation: 'setComponentProperty',
        id: 'op_missing_target',
        property: 'speed',
        preconditions: [{ kind: 'target_exists', target: { scope: 'component', role: 'enemy' } }],
        requiresCapabilities: [{ capabilityId: 'amendment.set_component_property.enemy.speed.v1', reason: 'test', required: true }],
        expectedEffects: [{ kind: 'property_changed', target: { scope: 'component', role: 'enemy' }, property: 'speed', comparison: 'increased' }]
      })
    ).toThrow();
    expect(() =>
      GameAmendmentOperationSchema.parse({
        operation: 'setComponentProperty',
        id: 'op_empty_preconditions',
        target: { scope: 'component', role: 'enemy' },
        property: 'speed',
        preconditions: [],
        requiresCapabilities: [{ capabilityId: 'amendment.set_component_property.enemy.speed.v1', reason: 'test', required: true }],
        expectedEffects: [{ kind: 'property_changed', target: { scope: 'component', role: 'enemy' }, property: 'speed', comparison: 'increased' }]
      })
    ).toThrow();
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
    expectCapabilityPlanClosed(proposal.executionPlan);
    expect(proposal.executionPlan.availableCapabilities).toContain('candidate_theme_player');
  });

  it('keeps structural genre regeneration behind missing candidate capability', () => {
    const proposal = planSemanticAmendment({
      projectId,
      runId,
      text: '切换为横版跑枪',
      context: buildContext({ generatorCapabilities: ['candidate_brief', 'candidate_dsl', 'candidate_run', 'candidate_theme_player'] }),
      now: fixedNow,
      createProposalId: () => 'amend_side_scrolling_genre'
    });

    expect(proposal).toMatchObject({
      understanding: {
        understood: true,
        intentClass: 'genre_or_system_edit',
        designDeltas: expect.arrayContaining([expect.objectContaining({ kind: 'change_genre_or_perspective', targetGenre: 'side_scrolling_run_and_gun' })])
      },
      execution: {
        mode: 'unsupported_capability',
        requiresCandidateRun: false,
        missingCapabilities: ['candidate_genre_side_scrolling_run_and_gun'],
        rejectedUnsafeFallbacks: ['top_down_shooter downgrade']
      },
      executionPlan: {
        mode: 'unsupported_capability',
        candidateRunRequired: false,
        requiredCapabilities: expect.arrayContaining(['candidate_genre_side_scrolling_run_and_gun']),
        missingCapabilities: expect.arrayContaining(['candidate_genre_side_scrolling_run_and_gun'])
      }
    });
    expect(proposal.executionPlan.requiredCapabilities).not.toContain('candidate_theme_player');
    expect(proposal.executionPlan.availableCapabilities).not.toContain('candidate_genre_side_scrolling_run_and_gun');
    expect(proposal.candidate?.candidateBrief).toBeUndefined();
    expectCapabilityPlanClosed(proposal.executionPlan);
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
    expectCapabilityPlanClosed(proposal.executionPlan);
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
        intentClass: 'ambiguous',
        plannerProvenanceStatus: 'RULE_FALLBACK',
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
    expectCapabilityPlanClosed(proposal.executionPlan);
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
    expectCapabilityPlanClosed(proposal.executionPlan);
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
    expectCapabilityPlanClosed(proposal.executionPlan);
    expect(proposal.executionPlan.availableCapabilities).not.toContain('candidate_theme_player');
    expect(proposal.executionPlan.missingCapabilities).toContain('candidate_theme_player');
  });
});

function expectCapabilityPlanClosed(plan: {
  requiredCapabilities: string[];
  availableCapabilities: string[];
  missingCapabilities: string[];
  incompatibleCapabilities: string[];
}) {
  const available = new Set(plan.availableCapabilities);
  const missing = new Set(plan.missingCapabilities);
  const incompatible = new Set(plan.incompatibleCapabilities);
  expect(plan.availableCapabilities.filter((capability) => missing.has(capability))).toEqual([]);
  expect(plan.availableCapabilities.filter((capability) => incompatible.has(capability))).toEqual([]);
  expect(plan.missingCapabilities.filter((capability) => incompatible.has(capability))).toEqual([]);
  const resolvedCapabilities = new Set([...available, ...missing, ...incompatible]);
  expect(plan.requiredCapabilities.filter((capability) => !resolvedCapabilities.has(capability))).toEqual([]);
}

function buildContext(input: { generatorCapabilities?: string[] } = {}) {
  const gameDsl = buildGameDslArtifact({
    rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
    runId,
    intentPlan: { normalizedGenre: 'top_down_shooter' }
  });
  const runtimeCapabilityReport = buildRuntimeCapabilityReport({ runId, validatedDsl: gameDsl });
  return buildAmendmentContextPack({ projectId, runId, currentDsl: gameDsl, runtimeCapabilityReport, generatorCapabilities: input.generatorCapabilities });
}

function fixedNow(): Date {
  return new Date('2026-06-18T10:00:00.000Z');
}
