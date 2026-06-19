import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import {
  buildLegacyDslAdapterReport,
  validateCapabilityBackedGameDsl,
  type CapabilityDslSchemaFragment
} from '../../packages/game-dsl/src/index.js';

describe('Capability-backed component / behavior / ECA DSL', () => {
  it('validates a capability-backed DSL through base envelope and owner schema fragments', () => {
    const report = validateCapabilityBackedGameDsl({ dsl: createCapabilityDsl(), schemaFragments: testSchemaFragments() });

    expect(report.status).toBe('valid');
    expect(report.pass1).toBe('passed');
    expect(report.pass2).toBe('passed');
    expect(report.ownedNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeKind: 'component', ownerCapabilityId: 'movement.run_jump.v1', status: 'owned' }),
        expect.objectContaining({ nodeKind: 'action', ownerCapabilityId: 'rules.restart_loop.v1', status: 'owned' })
      ])
    );
    expect(report.dslHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
  });

  it('rejects unknown or undeclared capability types during pass 2', () => {
    const unknown = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({
        componentType: 'movement.wall_jump.v1',
        capabilities: ['movement.run_jump.v1', 'rules.restart_loop.v1']
      }),
      schemaFragments: testSchemaFragments()
    });
    const undeclared = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({
        componentType: 'movement.run_jump.v1',
        capabilities: ['rules.restart_loop.v1']
      }),
      schemaFragments: testSchemaFragments()
    });

    expect(unknown.status).toBe('invalid');
    expect(unknown.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_NOT_DECLARED' })]));
    expect(unknown.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_CAPABILITY' })]));
    expect(undeclared.status).toBe('invalid');
    expect(undeclared.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_NOT_DECLARED' })]));
  });

  it('validates component config with the owner capability schema fragment', () => {
    const report = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({ componentConfig: { moveSpeed: 'fast', jumpVelocity: 420 } }),
      schemaFragments: testSchemaFragments()
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CONFIG_SCHEMA_INVALID', capabilityId: 'movement.run_jump.v1' })]));
  });

  it('rejects rule actions without a registered owner schema fragment', () => {
    const report = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({ actionType: 'rules.restart_loop.v1' }),
      schemaFragments: testSchemaFragments().filter((fragment) => !fragment.nodeKinds.includes('action'))
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SCHEMA_FRAGMENT_MISSING', capabilityId: 'rules.restart_loop.v1' })]));
  });

  it('rejects duplicate owner schema fragments instead of allowing schema override', () => {
    const report = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({ componentConfig: { moveSpeed: 'fast', jumpVelocity: 420 } }),
      schemaFragments: [
        ...testSchemaFragments(),
        {
          capabilityId: 'movement.run_jump.v1',
          nodeKinds: ['component'],
          configSchema: z.record(z.string(), z.unknown())
        }
      ]
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SCHEMA_FRAGMENT_DUPLICATE', capabilityId: 'movement.run_jump.v1' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CONFIG_SCHEMA_INVALID', capabilityId: 'movement.run_jump.v1' })]));
  });

  it('rejects unstable IDs and arbitrary script-like config during pass 1', () => {
    const unstableId = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({ componentId: '0' }),
      schemaFragments: testSchemaFragments()
    });
    const scriptConfig = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({ componentConfig: { moveSpeed: 220, jumpVelocity: 420, script: 'player.x += 1' } }),
      schemaFragments: testSchemaFragments()
    });
    const onClickConfig = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({ componentConfig: { moveSpeed: 220, jumpVelocity: 420, on_click: 'player.x += 1' } }),
      schemaFragments: testSchemaFragments()
    });

    expect(unstableId.status).toBe('invalid');
    expect(unstableId.pass1).toBe('failed');
    expect(scriptConfig.status).toBe('invalid');
    expect(scriptConfig.pass1).toBe('failed');
    expect(scriptConfig.issues.some((issue) => issue.path.includes('script'))).toBe(true);
    expect(onClickConfig.status).toBe('invalid');
    expect(onClickConfig.pass1).toBe('failed');
    expect(onClickConfig.issues.some((issue) => issue.path.includes('on_click'))).toBe(true);
  });

  it('reports duplicate stable IDs so authoritative nodes cannot be silently ignored', () => {
    const report = validateCapabilityBackedGameDsl({
      dsl: createCapabilityDsl({ duplicateActionId: true }),
      schemaFragments: testSchemaFragments()
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_STABLE_ID' })]));
    expect(report.ownedNodes.some((node) => node.path === '/rules/0/actions/0')).toBe(true);
  });

  it('builds a deterministic legacy adapter report for compatibility mapping evidence', () => {
    const first = buildLegacyDslAdapterReport([
      {
        legacyPath: '/player/movement/speed_px_per_sec',
        capabilityPath: '/entities/player/components/movement.run_jump/config/moveSpeed',
        capabilityId: 'movement.run_jump.v1',
        status: 'mapped'
      }
    ]);
    const second = buildLegacyDslAdapterReport([...first.mappings]);

    expect(first.status).toBe('valid');
    expect(first.artifactKind).toBe('legacy_dsl_adapter_report');
    expect(first.reportHash).toBe(second.reportHash);
  });

  it('keeps invalid legacy adapter report errors deterministic across mapping order', () => {
    const mappings = [
      {
        legacyPath: 'player.speed',
        capabilityPath: '/entities/player/components/movement.run_jump/config/moveSpeed',
        capabilityId: 'movement.run_jump.v1',
        status: 'mapped' as const
      },
      {
        legacyPath: '/player/unknown',
        capabilityPath: 'entities/player/components/unknown',
        capabilityId: 'movement.wall_jump.v1',
        status: 'mapped' as const
      }
    ];
    const first = buildLegacyDslAdapterReport(mappings);
    const second = buildLegacyDslAdapterReport([...mappings].reverse());

    expect(first.status).toBe('invalid');
    expect(first.reportHash).toBe(second.reportHash);
    expect(first.errors).toEqual([...first.errors].sort((left, right) => `${left.path}:${left.message}`.localeCompare(`${right.path}:${right.message}`)));
  });
});

function testSchemaFragments(): CapabilityDslSchemaFragment[] {
  return [
    {
      capabilityId: 'movement.run_jump.v1',
      nodeKinds: ['component'],
      configSchema: z.strictObject({
        moveSpeed: z.number().int().min(1).max(1000),
        jumpVelocity: z.number().int().min(1).max(2000)
      })
    },
    {
      capabilityId: 'rules.restart_loop.v1',
      nodeKinds: ['action'],
      configSchema: z.strictObject({ checkpointId: z.string().min(1) })
    }
  ];
}

function createCapabilityDsl(
  input: {
    capabilities?: string[];
    componentId?: string;
    componentType?: string;
    componentConfig?: unknown;
    actionType?: string;
    duplicateActionId?: boolean;
  } = {}
): unknown {
  const actionId = input.duplicateActionId === true ? input.componentId ?? 'player_movement' : 'restart_action';
  return {
    contractVersion: 'capability-game-dsl.v0.1',
    profile: { id: 'side_scrolling_run_and_gun.v1' },
    capabilities: input.capabilities ?? ['movement.run_jump.v1', 'rules.restart_loop.v1'],
    scenes: [{ id: 'main_scene' }],
    entities: [
      {
        id: 'player',
        role: 'player',
        tags: ['hero'],
        components: [
          {
            id: input.componentId ?? 'player_movement',
            type: input.componentType ?? 'movement.run_jump.v1',
            config: input.componentConfig ?? { moveSpeed: 220, jumpVelocity: 420 }
          }
        ],
        behaviors: []
      }
    ],
    rules: [
      {
        id: 'restart_rule',
        when: { event: 'player.defeated', sourceSelector: { role: 'player' } },
        conditions: [],
        actions: [{ id: actionId, type: input.actionType ?? 'rules.restart_loop.v1', config: { checkpointId: 'start' } }]
      }
    ],
    goals: [],
    assets: {},
    ui: {},
    metadata: { title: 'Capability DSL Test' }
  };
}
