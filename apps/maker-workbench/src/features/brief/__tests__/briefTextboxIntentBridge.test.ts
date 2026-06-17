import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import type { SemanticIndex, SemanticIndexEntry } from '@ai-game-maker/game-dsl';

import {
  BRIEF_TEXTBOX_MAX_LENGTH,
  createBriefTextboxDraft,
  parseConversationLiveEditCommand,
  previewBriefTextboxSemanticPatch,
  validateBriefTextboxDraft
} from '../index.js';

describe('Brief textbox semantic editing bridge', () => {
  it('previews a semantic patch without applying it or mutating the input document', () => {
    const document = createDocument();
    const before = structuredClone(document);
    const draft = createDraft({ text: 'move player to 160, 320' });

    const result = previewBriefTextboxSemanticPatch({
      draft,
      context: { projectId: draft.projectId, runId: draft.runId },
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      ...deterministicOptions()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected preview success');
    }

    expect(result.intent.kind).toBe('move_entity');
    expect(result.patch.status).toBe('proposed');
    expect(result.result.stage).toBe('validated');
    expect(result.result.apply).toBeUndefined();
    expect(result.handoff.patchId).toBe('patch:move_entity');
    expect(result.canAccept).toBe(true);
    expect(document).toEqual(before);
  });

  it('rejects invalid target ids before patch preview', () => {
    const draft = createDraft({ target: '/scenes/main/entities/player' });
    const result = previewBriefTextboxSemanticPatch({
      draft,
      context: { projectId: draft.projectId, runId: draft.runId },
      document: createDocument(),
      semanticIndex: createSemanticIndexForDocument(createDocument()),
      ...deterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      canAccept: false,
      error: { code: 'BRIEF_TEXTBOX_TARGET_INVALID' }
    });
    expect(result.handoff).toBeUndefined();
    expect(result.result).toBeUndefined();
  });

  it('rejects empty and too-long drafts', () => {
    const empty = validateBriefTextboxDraft(createDraft({ text: '' }));
    const tooLong = validateBriefTextboxDraft(createDraft({ text: 'x'.repeat(BRIEF_TEXTBOX_MAX_LENGTH + 1) }));

    expect(empty.errors.map((issue) => issue.code)).toContain('BRIEF_TEXTBOX_TEXT_EMPTY');
    expect(tooLong.errors.map((issue) => issue.code)).toContain('BRIEF_TEXTBOX_TEXT_TOO_LONG');
  });

  it('marks project or run changes as stale and blocks handoff', () => {
    const draft = createDraft({ projectId: 'proj_previous', runId: 'run_previous', text: 'move player to 160, 320' });

    const result = previewBriefTextboxSemanticPatch({
      draft,
      context: { projectId: 'proj_current', runId: 'run_current' },
      document: createDocument(),
      semanticIndex: createSemanticIndexForDocument(createDocument()),
      ...deterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      canAccept: false,
      validation: { stale: true },
      error: { code: 'BRIEF_TEXTBOX_DRAFT_STALE' }
    });
    expect(result.handoff).toBeUndefined();
  });

  it('keeps new game mode distinct from current-game patch preview', () => {
    const document = createDocument();
    const before = structuredClone(document);
    const draft = createDraft({ mode: 'new_game', text: 'move player to 160, 320' });

    const result = previewBriefTextboxSemanticPatch({
      draft,
      context: { projectId: draft.projectId, runId: draft.runId },
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      ...deterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      canAccept: false,
      error: { code: 'BRIEF_TEXTBOX_PREVIEW_REQUIRES_EDIT_MODE' }
    });
    expect(result.handoff).toBeUndefined();
    expect(document).toEqual(before);
  });

  it('emits audit-safe trace metadata with draft, intent, and patch ids', () => {
    const secretText = 'move player to 160, 320 DO_NOT_LOG_FULL_BRIEF';
    const draft = createDraft({ text: secretText });
    const result = previewBriefTextboxSemanticPatch({
      draft,
      context: { projectId: draft.projectId, runId: draft.runId },
      document: createDocument(),
      semanticIndex: createSemanticIndexForDocument(createDocument()),
      ...deterministicOptions()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected preview success');
    }

    expect(result.traceEvents.map((event) => event.status)).toEqual(['requested', 'preview_ready']);
    expect(result.traceEvents[0]?.draftHash).toBe(result.validation.draftHash);
    expect(result.traceEvents[1]).toMatchObject({
      draftHash: result.validation.draftHash,
      intentId: 'intent:move_entity:0',
      patchId: 'patch:move_entity'
    });
    expect(result.traceEvents.every((event) => Object.keys(event).every((key) => ['draftHash', 'intentId', 'patchId', 'status'].includes(key)))).toBe(true);
    expect(JSON.stringify(result.traceEvents)).not.toContain('DO_NOT_LOG_FULL_BRIEF');
  });

  it('keeps project generation out of the brief semantic preview panel', async () => {
    const source = await readFile(new URL('../BriefTextboxPanel.tsx', import.meta.url), 'utf8');

    expect(source).toContain('primaryAction');
    expect(source).toContain('ConversationHistory');
    expect(source).not.toContain('onGenerate');
    expect(source).not.toContain('Generate');
  });

  it('keeps generation and current-game edits in one conversation composer', async () => {
    const appSource = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');
    const textboxSource = await readFile(new URL('../BriefTextbox.tsx', import.meta.url), 'utf8');

    expect(appSource).toContain('conversationMessages={gameConversationMessages}');
    expect(appSource).toContain('onSubmitEdit={submitConversationEdit}');
    expect(appSource).toContain("setBriefMode('edit_current_game')");
    expect(appSource).toContain('primaryAction={');
    expect(appSource).toContain('{loading ? \'Working\' : \'Generate\'}');
    expect(appSource).not.toContain('New game action');
    expect(textboxSource).not.toContain('Semantic target');
    expect(textboxSource).not.toContain('value=\"edit_current_game\"');
    expect(textboxSource).not.toContain('value=\"new_game\"');
  });

  it('keeps new-game prompt state separate while auto-switching the same composer for current-game edits', async () => {
    const source = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');

    expect(source).toContain("const [semanticEditText, setSemanticEditText] = useState('');");
    expect(source).toContain("const [briefMode, setBriefMode] = useState<BriefTextboxMode>('new_game');");
    expect(source).toContain('const nextMode: BriefTextboxMode = canEditCurrentGame ? \'edit_current_game\' : \'new_game\';');
    expect(source).toContain("value={briefMode === 'new_game' ? idea : semanticEditText}");
    expect(source).toContain('disabled={loading || briefMode !== \'new_game\'}');
  });

  it('keeps label fields as text edits in the live inspector', async () => {
    const source = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');

    expect(source).toContain("type={field.valueKind === 'number' ? 'number' : 'text'}");
    expect(source).toContain('readInspectorFieldValue(field');
    expect(source).toContain("field.valueKind === 'label' ? String(rawValue).trim() : Number(rawValue)");
  });

  it('keeps failed conversation edits in the composer', async () => {
    const panelSource = await readFile(new URL('../BriefTextboxPanel.tsx', import.meta.url), 'utf8');
    const appSource = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');

    expect(panelSource).toContain("if (submitResult === 'blocked')");
    expect(appSource).toContain("return (await applyLiveEdits(parsed.edits, text)) ? 'handled' : 'blocked';");
  });

  it('parses conversation messages into current hot-edit fields', () => {
    const result = parseConversationLiveEditCommand({
      text: '把玩家速度改成 320',
      fields: [
        testField({ path: '/player/render/scale', label: 'Scale', value: 1, targetKind: 'player', aliases: ['玩家'] }),
        testField({ path: '/player/physics/maxSpeed', label: 'Max speed', value: 300, targetKind: 'player', aliases: ['玩家'] }),
        testField({ path: '/player/health/max', label: 'Max health', value: 3, targetKind: 'player', aliases: ['玩家'] })
      ]
    });

    expect(result).toMatchObject({
      ok: true,
      value: 320,
      field: { path: '/player/physics/maxSpeed' }
    });
  });

  it('does not parse unsupported conversation edits as successful live updates', () => {
    const result = parseConversationLiveEditCommand({
      text: '让背景变成银河',
      fields: [
        testField({ path: '/player/render/scale', label: 'Scale', value: 1, targetKind: 'player', aliases: ['玩家'] }),
        testField({ path: '/player/physics/maxSpeed', label: 'Max speed', value: 300, targetKind: 'player', aliases: ['玩家'] })
      ]
    });

    expect(result).toMatchObject({ ok: false, reason: 'unsupported_field' });
  });

  it('parses relative natural-language edits against current DSL candidates', () => {
    const fields = [
      testField({ path: '/world/width', label: 'World width', value: 960, targetKind: 'world', aliases: ['游戏', '世界', 'x轴', '横向', '宽度'], applyMode: 'warm_restart' }),
      testField({ path: '/enemyTypes/alien/health/max', label: 'Max health', value: 1, targetKind: 'enemyType', aliases: ['敌人', '外星人'] }),
      testField({ path: '/projectiles/fish_bolt/damage', label: 'Damage', value: 1, targetKind: 'projectile', aliases: ['子弹', '鱼雷'] }),
      testField({ path: '/level/waves/alien_wave/count', label: 'Enemy count', value: 8, targetKind: 'wave', aliases: ['敌人', '外星人', 'alien_wave'], applyMode: 'warm_restart' })
    ];

    expect(parseConversationLiveEditCommand({ text: '增加敌人数量', fields })).toMatchObject({
      ok: true,
      value: 9,
      field: { path: '/level/waves/alien_wave/count', applyMode: 'warm_restart' }
    });
    expect(parseConversationLiveEditCommand({ text: '让子弹伤害增加 2', fields })).toMatchObject({
      ok: true,
      value: 3,
      field: { path: '/projectiles/fish_bolt/damage' }
    });
    expect(parseConversationLiveEditCommand({ text: '把敌人血量改成 4', fields })).toMatchObject({
      ok: true,
      value: 4,
      field: { path: '/enemyTypes/alien/health/max' }
    });
    expect(parseConversationLiveEditCommand({ text: '增加游戏x轴', fields })).toMatchObject({
      ok: true,
      value: 1120,
      field: { path: '/world/width', applyMode: 'warm_restart' }
    });
  });

  it('parses one natural-language command into multiple current-game edits', () => {
    const result = parseConversationLiveEditCommand({
      text: '增加敌人数量，增加游戏x轴',
      fields: [
        testField({ path: '/world/width', label: 'World width', value: 960, targetKind: 'world', aliases: ['游戏', '世界', 'x轴', '横向', '宽度'], applyMode: 'warm_restart' }),
        testField({ path: '/level/waves/alien_wave/count', label: 'Enemy count', value: 8, targetKind: 'wave', aliases: ['敌人', '外星人', 'alien_wave'], applyMode: 'warm_restart' })
      ]
    });

    expect(result).toMatchObject({
      ok: true,
      edits: [
        { value: 9, field: { path: '/level/waves/alien_wave/count' } },
        { value: 1120, field: { path: '/world/width' } }
      ]
    });
  });

  it('covers a 20-50 phrase live-edit vocabulary without collapsing future intents into wrong fields', () => {
    const fields = liveEditVocabularyFields();
    const positiveCases: Array<{ text: string; path: string; value: number }> = [
      { text: '增加敌人数量', path: '/level/waves/alien_wave/count', value: 9 },
      { text: '敌人个数更多', path: '/level/waves/alien_wave/count', value: 9 },
      { text: '多一点敌人', path: '/level/waves/alien_wave/count', value: 9 },
      { text: 'enemy count up', path: '/level/waves/alien_wave/count', value: 9 },
      { text: 'increase wave count', path: '/level/waves/alien_wave/count', value: 9 },
      { text: '把敌人数量改成 12', path: '/level/waves/alien_wave/count', value: 12 },
      { text: '增加游戏x轴', path: '/world/width', value: 1120 },
      { text: '扩大横向宽度', path: '/world/width', value: 1120 },
      { text: '让世界更宽', path: '/world/width', value: 1120 },
      { text: 'increase x axis', path: '/world/width', value: 1120 },
      { text: 'make world wider', path: '/world/width', value: 1120 },
      { text: '把世界宽度改成 1280', path: '/world/width', value: 1280 },
      { text: '玩家速度提高', path: '/player/physics/maxSpeed', value: 280 },
      { text: '主角移速更快', path: '/player/physics/maxSpeed', value: 280 },
      { text: 'player speed increase', path: '/player/physics/maxSpeed', value: 280 },
      { text: '把玩家速度改成 320', path: '/player/physics/maxSpeed', value: 320 },
      { text: '敌人速度增加', path: '/enemyTypes/alien/physics/speed', value: 140 },
      { text: '怪物变快', path: '/enemyTypes/alien/physics/speed', value: 140 },
      { text: 'enemy speed higher', path: '/enemyTypes/alien/physics/speed', value: 140 },
      { text: '玩家血量增加', path: '/player/health/max', value: 4 },
      { text: '主角生命值提高', path: '/player/health/max', value: 4 },
      { text: 'player hp more', path: '/player/health/max', value: 4 },
      { text: '敌人血量增加', path: '/enemyTypes/alien/health/max', value: 2 },
      { text: '怪物生命值提高', path: '/enemyTypes/alien/health/max', value: 2 },
      { text: '子弹伤害增加', path: '/projectiles/fish_bolt/damage', value: 2 },
      { text: '提高鱼雷威力', path: '/projectiles/fish_bolt/damage', value: 2 },
      { text: 'bullet damage stronger', path: '/projectiles/fish_bolt/damage', value: 2 },
      { text: '子弹速度提高', path: '/projectiles/fish_bolt/speed', value: 540 },
      { text: '飞弹更快', path: '/projectiles/fish_bolt/speed', value: 540 },
      { text: 'projectile speed increase', path: '/projectiles/fish_bolt/speed', value: 540 },
      { text: '玩家变大一点', path: '/player/render/scale', value: 1.1 },
      { text: '主角体型增加', path: '/player/render/scale', value: 1.1 },
      { text: 'make player bigger', path: '/player/render/scale', value: 1.1 }
    ];
    const futureUnsupportedCases = ['增加障碍物数量', '添加障碍物', '射击进入下一关卡', '增加下一关', '增加爆炸特效', '添加粒子效果', '加屏幕震动'];

    expect(positiveCases.length).toBeGreaterThanOrEqual(20);
    expect(positiveCases.length).toBeLessThanOrEqual(50);

    for (const testCase of positiveCases) {
      expect(parseConversationLiveEditCommand({ text: testCase.text, fields })).toMatchObject({
        ok: true,
        field: { path: testCase.path },
        value: testCase.value
      });
    }

    for (const text of futureUnsupportedCases) {
      expect(parseConversationLiveEditCommand({ text, fields })).toMatchObject({ ok: false, reason: 'unsupported_field' });
    }
  });

  it('parses semantic entity replacement from a multi-segment natural-language edit', () => {
    const result = parseConversationLiveEditCommand({
      text: '把敌人从外星人修改成猫',
      fields: [
        testField({
          path: '/enemyTypes/alien/label',
          label: 'Enemy concept',
          value: '外星人',
          valueKind: 'label',
          targetKind: 'enemyType',
          aliases: ['敌人', '外星人', 'alien'],
          applyMode: 'warm_restart'
        }),
        testField({ path: '/enemyTypes/alien/health/max', label: 'Max health', value: 1, targetKind: 'enemyType', aliases: ['敌人', '外星人'] }),
        testField({ path: '/level/waves/alien_wave/count', label: 'Enemy count', value: 8, targetKind: 'wave', aliases: ['敌人', '外星人'], applyMode: 'warm_restart' })
      ]
    });

    expect(result).toMatchObject({
      ok: true,
      value: '猫',
      field: { path: '/enemyTypes/alien/label', applyMode: 'warm_restart' }
    });
  });

  it('parses player character replacement from natural language', () => {
    const result = parseConversationLiveEditCommand({
      text: '把玩家角色改成小猫',
      fields: [
        testField({
          path: '/player/label',
          label: 'Player concept',
          value: '坦克',
          valueKind: 'label',
          targetKind: 'player',
          aliases: ['玩家', '玩家角色', '主角', '角色'],
          applyMode: 'warm_restart'
        }),
        testField({
          path: '/enemyTypes/tank_basic/label',
          label: 'Enemy concept',
          value: '坦克',
          valueKind: 'label',
          targetKind: 'enemyType',
          aliases: ['敌人', '坦克'],
          applyMode: 'warm_restart'
        }),
        testField({ path: '/player/physics/maxSpeed', label: 'Max speed', value: 260, targetKind: 'player', aliases: ['玩家'] })
      ]
    });

    expect(result).toMatchObject({
      ok: true,
      value: '小猫',
      field: { path: '/player/label', applyMode: 'warm_restart' }
    });
  });

  it('does not turn movement placement requests into label replacements', () => {
    const fields = [
      testField({
        path: '/player/label',
        label: 'Player concept',
        value: '坦克',
        valueKind: 'label',
        targetKind: 'player',
        aliases: ['玩家', '玩家角色', '主角', '坦克'],
        applyMode: 'warm_restart'
      }),
      testField({ path: '/player/physics/maxSpeed', label: 'Max speed', value: 260, targetKind: 'player', aliases: ['玩家', '坦克'] }),
      testField({ path: '/player/render/scale', label: 'Scale', value: 1, targetKind: 'player', aliases: ['玩家', '坦克'] })
    ];

    expect(parseConversationLiveEditCommand({ text: '把玩家移动到左边', fields })).toMatchObject({ ok: false });
    expect(parseConversationLiveEditCommand({ text: '把玩家放到屏幕中央', fields })).toMatchObject({ ok: false });
  });
});

function testField(input: {
  path: string;
  label: string;
  value: number | string;
  valueKind?: 'number' | 'label';
  targetKind: 'world' | 'player' | 'enemyType' | 'projectile' | 'wave';
  aliases: string[];
  applyMode?: 'hot' | 'warm_restart' | 'none';
}) {
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

function liveEditVocabularyFields() {
  return [
    testField({ path: '/world/width', label: 'World width', value: 960, targetKind: 'world', aliases: ['游戏', '世界', 'x轴', 'x axis', '横向', '宽度', 'world'] }),
    testField({ path: '/player/render/scale', label: 'Scale', value: 1, targetKind: 'player', aliases: ['玩家', '主角', 'player'] }),
    testField({ path: '/player/physics/maxSpeed', label: 'Max speed', value: 260, targetKind: 'player', aliases: ['玩家', '主角', 'player'] }),
    testField({ path: '/player/health/max', label: 'Max health', value: 3, targetKind: 'player', aliases: ['玩家', '主角', 'player'] }),
    testField({ path: '/enemyTypes/alien/physics/speed', label: 'Speed', value: 120, targetKind: 'enemyType', aliases: ['敌人', '怪物', '外星人', 'enemy'] }),
    testField({ path: '/enemyTypes/alien/health/max', label: 'Max health', value: 1, targetKind: 'enemyType', aliases: ['敌人', '怪物', '外星人', 'enemy'] }),
    testField({ path: '/projectiles/fish_bolt/speed', label: 'Speed', value: 520, targetKind: 'projectile', aliases: ['子弹', '鱼雷', '飞弹', 'bullet', 'projectile'] }),
    testField({ path: '/projectiles/fish_bolt/damage', label: 'Damage', value: 1, targetKind: 'projectile', aliases: ['子弹', '鱼雷', '飞弹', 'bullet', 'projectile'] }),
    testField({ path: '/level/waves/alien_wave/count', label: 'Enemy count', value: 8, targetKind: 'wave', aliases: ['敌人', '怪物', '外星人', 'alien_wave', 'enemy'] })
  ];
}

type TestDocument = {
  scenes: {
    main: {
      entities: {
        player: {
          id: 'entity:player';
          kind: 'entity';
          components: {
            transform: Record<string, unknown>;
          };
        };
      };
    };
  };
};

function createDraft(input: {
  projectId?: string;
  runId?: string;
  text?: string;
  target?: string;
  mode?: 'new_game' | 'edit_current_game';
}) {
  return createBriefTextboxDraft({
    projectId: input.projectId ?? 'proj_current',
    runId: input.runId ?? 'run_current',
    text: input.text ?? 'move player to 160, 320',
    target: input.target ?? 'entity:player',
    mode: input.mode ?? 'edit_current_game',
    dirty: true,
    now: () => new Date('2026-01-01T00:00:00.000Z')
  });
}

function createDocument(): TestDocument {
  return {
    scenes: {
      main: {
        entities: {
          player: {
            id: 'entity:player',
            kind: 'entity',
            components: {
              transform: {
                x: 120,
                y: 300
              }
            }
          }
        }
      }
    }
  };
}

function createSemanticIndexForDocument(document: TestDocument): SemanticIndex {
  const entries: SemanticIndexEntry[] = [
    { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: document.scenes.main },
    { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: document.scenes.main.entities.player }
  ];

  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    resolve(id) {
      return entryMap.get(id) ?? null;
    },
    has(id) {
      return entryMap.has(id);
    },
    list(kind) {
      const values = [...entryMap.values()];
      return kind === undefined ? values : values.filter((entry) => entry.kind === kind);
    }
  };
}

function deterministicOptions() {
  return {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createIntentId: (command: { kind: string }, sequence: number) => `intent:${command.kind}:${sequence}`,
    createPatchId: (intent: { kind: string }) => `patch:${intent.kind}`
  };
}
