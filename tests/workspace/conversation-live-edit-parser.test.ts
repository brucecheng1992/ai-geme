import { describe, expect, it } from 'vitest';

import { parseConversationLiveEditCommand } from '../../apps/maker-workbench/src/features/brief/conversationLiveEditParser.js';
import type { LiveEditableField } from '../../apps/maker-workbench/src/live-edit-client.js';

describe('conversation live edit parser', () => {
  it('treats enemy count requests as aggregate wave count edits across multiple waves', () => {
    const fields = multiWaveEnemyFields();

    expect(parseConversationLiveEditCommand({ text: '增加敌人数量', fields })).toMatchObject({
      ok: true,
      edits: [
        { value: 4, field: { path: '/level/waves/spawn_jungle_infantry_1/count' } },
        { value: 6, field: { path: '/level/waves/spawn_jungle_infantry_2/count' } }
      ]
    });
    expect(parseConversationLiveEditCommand({ text: '增加敌人', fields })).toMatchObject({
      ok: true,
      edits: [
        { value: 4, field: { path: '/level/waves/spawn_jungle_infantry_1/count' } },
        { value: 6, field: { path: '/level/waves/spawn_jungle_infantry_2/count' } }
      ]
    });
  });

  it('keeps explicit enemy parameter requests targeted instead of aggregating wave counts', () => {
    const fields = multiWaveEnemyFields();

    expect(parseConversationLiveEditCommand({ text: '敌人血量增加', fields })).toMatchObject({
      ok: true,
      edits: [{ value: 2, field: { path: '/enemyTypes/infantry_type/health/max' } }]
    });
    expect(parseConversationLiveEditCommand({ text: '敌人速度增加', fields })).toMatchObject({
      ok: true,
      edits: [{ value: 120, field: { path: '/enemyTypes/infantry_type/physics/speed' } }]
    });
    expect(parseConversationLiveEditCommand({ text: '敌人伤害增加', fields })).toMatchObject({
      ok: true,
      edits: [{ value: 2, field: { path: '/projectiles/enemy_bolt/damage' } }]
    });
  });

  it('moves enemy wave spawns to the map end from a natural-language position request', () => {
    const fields = multiWaveEnemyFields();

    expect(parseConversationLiveEditCommand({ text: '敌人不要凭空刷新在玩家面前，是指啊地图的末端', fields })).toMatchObject({
      ok: true,
      edits: [
        { value: 1200, field: { path: '/level/waves/spawn_jungle_infantry_1/x' } },
        { value: 1200, field: { path: '/level/waves/spawn_jungle_infantry_2/x' } }
      ]
    });
  });

  it('keeps generic enemy add requests on wave counts instead of spawn positions', () => {
    const fields = multiWaveEnemyFields();
    const parsed = parseConversationLiveEditCommand({ text: '增加敌人', fields });

    expect(parsed).toMatchObject({ ok: true });
    expect(parsed.ok && parsed.edits.map((edit) => edit.field.path)).toEqual([
      '/level/waves/spawn_jungle_infantry_1/count',
      '/level/waves/spawn_jungle_infantry_2/count'
    ]);
  });

  it('does not map negated map-end spawn requests to Spawn x', () => {
    const fields = multiWaveEnemyFields();
    const parsed = parseConversationLiveEditCommand({ text: '敌人不要刷新到地图末端', fields });

    expect(parsed).toMatchObject({ ok: false, reason: 'ambiguous_field' });
  });
});

function multiWaveEnemyFields(): LiveEditableField[] {
  return [
    testField({ path: '/world/width', label: 'World width', value: 1280, targetKind: 'world', aliases: ['world', '地图', '世界', '宽度'] }),
    testField({ path: '/enemyTypes/infantry_type/physics/speed', label: 'Speed', value: 100, targetKind: 'enemyType', aliases: ['enemy', '敌人', 'infantry_type', '步兵'] }),
    testField({ path: '/enemyTypes/infantry_type/health/max', label: 'Max health', value: 1, targetKind: 'enemyType', aliases: ['enemy', '敌人', 'infantry_type', '步兵'] }),
    testField({
      path: '/level/waves/spawn_jungle_infantry_1/count',
      label: 'Enemy count',
      value: 3,
      targetKind: 'wave',
      aliases: ['wave', 'enemy', 'enemies', '敌人', '敌人数量', '数量', 'spawn_jungle_infantry_1', 'infantry_type', '步兵']
    }),
    testField({
      path: '/level/waves/spawn_jungle_infantry_1/x',
      label: 'Spawn x',
      value: 640,
      targetKind: 'wave',
      aliases: ['wave', 'spawn', 'enemy', 'enemies', '敌人', '刷新', '位置', '地图末端', 'spawn_jungle_infantry_1', 'infantry_type', '步兵']
    }),
    testField({
      path: '/level/waves/spawn_jungle_infantry_2/count',
      label: 'Enemy count',
      value: 5,
      targetKind: 'wave',
      aliases: ['wave', 'enemy', 'enemies', '敌人', '敌人数量', '数量', 'spawn_jungle_infantry_2', 'infantry_type', '步兵']
    }),
    testField({
      path: '/level/waves/spawn_jungle_infantry_2/x',
      label: 'Spawn x',
      value: 1080,
      targetKind: 'wave',
      aliases: ['wave', 'spawn', 'enemy', 'enemies', '敌人', '刷新', '位置', '地图末端', 'spawn_jungle_infantry_2', 'infantry_type', '步兵']
    }),
    testField({
      path: '/projectiles/enemy_bolt/damage',
      label: 'Damage',
      value: 1,
      targetKind: 'projectile',
      aliases: ['enemy', '敌人', 'damage', '伤害', 'enemy_bolt']
    })
  ];
}

function testField(input: {
  path: string;
  label: string;
  value: number | string | undefined;
  targetKind: LiveEditableField['targetKind'];
  aliases: string[];
  valueKind?: LiveEditableField['valueKind'];
  applyMode?: LiveEditableField['applyMode'];
}): LiveEditableField {
  return {
    path: input.path,
    label: input.label,
    value: input.value,
    valueKind: input.valueKind ?? 'number',
    enabled: true,
    applyMode: input.applyMode ?? 'hot',
    targetKind: input.targetKind,
    aliases: input.aliases
  };
}
