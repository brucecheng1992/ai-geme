import { describe, expect, it } from 'vitest';

import {
  buildSemanticIndex,
  createLiveSemanticEditHandlers,
  createSemanticPatchApplier,
  createSemanticPatchPlanner,
  hashSemanticPatchDocument,
  validateRawGameDsl,
  type RawGameDsl,
  type SemanticEditIntent
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

describe('Live semantic editing feedback configuration', () => {
  it('plans and applies a configure_feedback patch without mutating the input Raw DSL', () => {
    const document = createShooterRawDsl();
    const before = structuredClone(document);
    const semanticIndex = buildSemanticIndex(document);
    const intent = createConfigureFeedbackIntent({
      cameraShake: { enabled: true, intensity: 0.5, durationMs: 500 },
      hitFlash: { enabled: true, durationMs: 900, flashCount: 6 },
      invulnerabilityFrames: { durationMs: 1200, flashEnabled: true },
      explosion: {
        enabled: true,
        scale: 1.5,
        durationMs: 800,
        audioEvent: 'explosion',
        cameraShake: { enabled: true, intensity: 0.35, durationMs: 300 }
      },
      audioEvents: {
        warning: { assetRef: 'asset:warning_sfx', volume: 0.85, enabled: true }
      },
      warningBanner: { enabled: true, text: 'WARNING', durationMs: 1200 }
    });

    const plan = createSemanticPatchPlanner(createLiveSemanticEditHandlers({ document })).plan({
      intent,
      semanticIndex,
      beforeHash: hashSemanticPatchDocument(document),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      createPatchId: () => 'semantic_patch:configure_feedback'
    });

    if (!plan.ok) {
      const cause = plan.error.cause instanceof Error ? `: ${plan.error.cause.message}` : '';
      throw new Error(`expected configure_feedback plan success, got ${plan.error.code}${cause}`);
    }
    expect(plan.patch).toMatchObject({
      id: 'semantic_patch:configure_feedback',
      intentId: intent.id,
      target: 'project:default',
      status: 'proposed'
    });
    expect(plan.patch.operations.map((operation) => operation.path)).toEqual([
      '/feedback',
      '/feedback/cameraShake',
      '/feedback/hitFlash',
      '/player/invulnerabilityFrames',
      '/effects',
      '/effects/explosion',
      '/audio',
      '/audio/events',
      '/audio/events/warning',
      '/ui/warningBanner'
    ]);

    const apply = createSemanticPatchApplier().apply({
      document,
      patch: plan.patch,
      intent,
      semanticIndex
    });

    expect(apply.ok).toBe(true);
    if (!apply.ok) {
      throw new Error(`expected configure_feedback apply success, got ${apply.error.code}`);
    }

    const edited = apply.document as RawGameDsl;
    expect(validateRawGameDsl(edited).ok).toBe(true);
    expect(edited.feedback?.cameraShake).toEqual({ enabled: true, intensity: 0.5, durationMs: 500 });
    expect(edited.feedback?.hitFlash).toEqual({ enabled: true, durationMs: 900, flashCount: 6 });
    expect(edited.player.invulnerabilityFrames).toEqual({ durationMs: 1200, flashEnabled: true });
    expect(edited.effects?.explosion?.audioEvent).toBe('explosion');
    expect(edited.audio?.events.warning).toEqual({ assetRef: 'asset:warning_sfx', volume: 0.85, enabled: true });
    expect(edited.ui.warningBanner).toEqual({ enabled: true, text: 'WARNING', durationMs: 1200 });
    expect(document).toEqual(before);
  });

  it('rejects unsafe configure_feedback targets and payloads', () => {
    const document = createShooterRawDsl();
    const semanticIndex = buildSemanticIndex(document);
    const planner = createSemanticPatchPlanner(createLiveSemanticEditHandlers({ document }));

    expect(
      planner.plan({
        intent: createConfigureFeedbackIntent(
          { cameraShake: { enabled: true, intensity: 0.5, durationMs: 500 } },
          { target: 'entity:player' }
        ),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureFeedbackIntent({}),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureFeedbackIntent({ cameraShake: { enabled: true, intensity: 0.5, durationMs: 500 }, script: true }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureFeedbackIntent({
          cameraShake: { enabled: true, intensity: 0.5, durationMs: 500, easing: 'linear' }
        }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureFeedbackIntent({ cameraShake: { enabled: true, intensity: 2, durationMs: 500 } }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureFeedbackIntent({
          audioEvents: {
            screenShake: { volume: 0.8, enabled: true }
          }
        }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureFeedbackIntent({
          audioEvents: {
            warning: { assetRef: '../warning.mp3', volume: 0.8, enabled: true }
          }
        }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });
});

function createConfigureFeedbackIntent(
  payload: Record<string, unknown>,
  overrides: Partial<SemanticEditIntent> = {}
): SemanticEditIntent {
  return {
    id: 'edit_configure_feedback',
    kind: 'configure_feedback',
    target: 'project:default',
    reason: {
      source: 'workbench',
      message: 'Configure feedback semantics.'
    },
    payload,
    constraints: {
      noGeneratedCodeEdit: true
    },
    ...overrides
  };
}
