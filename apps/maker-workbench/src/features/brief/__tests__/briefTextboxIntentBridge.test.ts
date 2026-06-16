import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import type { SemanticIndex, SemanticIndexEntry } from '@ai-game-maker/game-dsl';

import {
  BRIEF_TEXTBOX_MAX_LENGTH,
  createBriefTextboxDraft,
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

    expect(source).not.toContain('onGenerate');
    expect(source).not.toContain('Generate');
  });

  it('keeps new-game prompt state separate from current-game semantic edit state', async () => {
    const source = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');

    expect(source).toContain("const [semanticEditText, setSemanticEditText] = useState('');");
    expect(source).toContain("const [briefMode, setBriefMode] = useState<BriefTextboxMode>('new_game');");
    expect(source).toContain("value={briefMode === 'new_game' ? idea : semanticEditText}");
    expect(source).toContain('disabled={loading || briefMode !== \'new_game\'}');
  });
});

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
