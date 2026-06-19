import { describe, expect, it } from 'vitest';

import { GenerationPathReceiptSchema, buildGenerationPathReceipt } from '../../packages/game-dsl/src/index.js';

describe('Step 37 generation path receipt', () => {
  it('records the actual path while declaring capability-composed as the supported-profile default target', () => {
    const first = buildGenerationPathReceipt({
      projectId: 'proj_20260619_path_receipt',
      runId: 'run_20260619_path_receipt',
      selectedPath: 'legacy_template_v1',
      dslSource: 'model_provider',
      selectionReason: 'Legacy template path is the current compiled path before capability cutover.',
      profileId: 'side_scrolling_run_and_gun.v1',
      artifactRefs: [
        { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' },
        { artifactKind: 'game_dsl', path: 'game_dsl.json' }
      ]
    });
    const second = buildGenerationPathReceipt({
      projectId: 'proj_20260619_path_receipt',
      runId: 'run_20260619_path_receipt',
      selectedPath: 'legacy_template_v1',
      dslSource: 'model_provider',
      selectionReason: 'Legacy template path is the current compiled path before capability cutover.',
      profileId: 'side_scrolling_run_and_gun.v1',
      artifactRefs: [
        { artifactKind: 'game_dsl', path: 'game_dsl.json' },
        { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
      ]
    });

    expect(GenerationPathReceiptSchema.parse(first)).toEqual(first);
    expect(first.receiptHash).toBe(second.receiptHash);
    expect(first).toMatchObject({
      artifactKind: 'generation_path_receipt',
      schemaVersion: 'generation_path_receipt.v0.1',
      selectedPath: 'legacy_template_v1',
      dslSource: 'model_provider',
      defaultPathForSupportedProfiles: 'capability_composed_v1',
      legacyPathPolicy: { auditable: true, rollbackOnlyWhenCapabilityReady: false },
      capabilityReadiness: 'not_evaluated',
      artifactRefs: [
        { artifactKind: 'game_dsl', path: 'game_dsl.json' },
        { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
      ]
    });
  });

  it('keeps model failures and deterministic fallback sources auditable', () => {
    const fallback = buildGenerationPathReceipt({
      projectId: 'proj_20260619_path_receipt',
      runId: 'run_20260619_fallback',
      selectedPath: 'legacy_template_v1',
      dslSource: 'deterministic_local_fallback',
      selectionReason: 'Legacy template compiled a deterministic fallback DSL.',
      artifactRefs: [
        { artifactKind: 'raw_game_dsl_fallback', path: 'raw-game-dsl.raw.json' },
        { artifactKind: 'game_dsl', path: 'game_dsl.json' }
      ]
    });
    const failed = buildGenerationPathReceipt({
      projectId: 'proj_20260619_path_receipt',
      runId: 'run_20260619_model_failed',
      selectedPath: 'fail_closed_model_generation_failed',
      dslSource: 'not_generated',
      selectionReason: 'Model generation failed: MODEL_SCHEMA_VALIDATION_FAILED: Game Brief schema validation failed.',
      modelFailureCode: 'MODEL_SCHEMA_VALIDATION_FAILED',
      capabilityReadiness: 'not_evaluated'
    });

    expect(GenerationPathReceiptSchema.parse(fallback)).toMatchObject({
      selectedPath: 'legacy_template_v1',
      dslSource: 'deterministic_local_fallback',
      artifactRefs: [
        { artifactKind: 'game_dsl', path: 'game_dsl.json' },
        { artifactKind: 'raw_game_dsl_fallback', path: 'raw-game-dsl.raw.json' }
      ]
    });
    expect(GenerationPathReceiptSchema.parse(failed)).toMatchObject({
      selectedPath: 'fail_closed_model_generation_failed',
      dslSource: 'not_generated',
      modelFailureCode: 'MODEL_SCHEMA_VALIDATION_FAILED'
    });
  });

  it('records legacy DSL nonrepresentability as a blocked precondition instead of a model failure', () => {
    const receipt = buildGenerationPathReceipt({
      projectId: 'proj_20260619_path_receipt',
      runId: 'run_20260619_legacy_nonrepresentable',
      selectedPath: 'blocked',
      targetPath: 'capability_composed_v1',
      dslSource: 'not_generated',
      selectionReason: 'DSL generation blocked before legacy Raw DSL v0.1: LEGACY_DSL_NONREPRESENTABLE',
      legacyRepresentable: false,
      blocker: 'CAPABILITY_COMPOSED_PATH_NOT_ACTIVE',
      capabilityReadiness: 'blocked'
    });

    expect(GenerationPathReceiptSchema.parse(receipt)).toMatchObject({
      selectedPath: 'blocked',
      targetPath: 'capability_composed_v1',
      dslSource: 'not_generated',
      legacyRepresentable: false,
      blocker: 'CAPABILITY_COMPOSED_PATH_NOT_ACTIVE',
      capabilityReadiness: 'blocked'
    });
    expect(receipt).not.toHaveProperty('modelFailureCode');
  });
});
