import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_REMAINING_INVENTORY_ARTIFACT_KIND,
  STEP37_REMAINING_INVENTORY_SCHEMA_VERSION,
  STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
  STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_NEXT_ATOMIC_STEP,
  STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
  STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_NEXT_ATOMIC_STEP,
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP,
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_NEXT_ATOMIC_STEP,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP,
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_NEXT_ATOMIC_STEP,
  STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
  STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_NEXT_ATOMIC_STEP,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_NEXT_ATOMIC_STEP,
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_NEXT_ATOMIC_STEP,
  STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
  STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_NEXT_ATOMIC_STEP,
  STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
  STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_NEXT_ATOMIC_STEP,
  STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
  STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP,
  buildStep37ActivateProductionDefaultCutoverReport,
  buildStep37CapabilityDslDraftReport,
  buildStep37ComposedDslSchemaReport,
  buildStep37NormalizeCapabilityDslDraftReport,
  buildStep37PromotedSupportSummary,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37RemainingCompleteSupportedInventory,
  buildStep37Stage4ExitAuditReport,
  buildStep37Stage5EntryAuditReport,
  buildStep37SupportPromotionApplicationReport,
  buildStep37SupportPromotionInventory,
  deriveStep37RemainingCapabilityState,
  hashStep37SupportPromotionInventoryArtifact,
  parseStep37SupportPromotionInventoryArtifact,
  type DeepSeekRunAndGunProfileCapabilitySupport,
  type DeepSeekRunAndGunProfileSupportSummary,
  type Step37CheckpointInventoryItem,
  type Step37CommittedCapabilityClosure,
  type Step37Stage4ExitAuditReport,
  type Step37Stage5EntryAuditReport,
  type Step37ComposedDslSchemaReport,
  type Step37ExactCapabilityLockReport,
  type Step37CapabilityDslDraftReport,
  type Step37NormalizeCapabilityDslDraftReport,
  type Step37CompileNormalizedCapabilityDslReport,
  type Step37ConsumeCompiledRuntimeIrReport,
  type Step37ActivateProductionDefaultCutoverReport,
  type Step37ObserveRuntimeConsumedIrWithQaReport,
  type Step37SupportPromotionApplicationReport
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const sourcePlanRevision = 'HEAD:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md';
const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';

describe('Step37 remaining complete-supported inventory driver', () => {
  it('distinguishes every required Stage 4 remaining-inventory state without promoting static completeSupported', () => {
    const summary = supportSummary([
      capability({ capabilityId: 'complete.capability.v1', completeSupported: true, evidenceDimensions: allEvidence(true) }),
      capability({
        capabilityId: 'observed.only.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      }),
      capability({
        capabilityId: 'probe.missing.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      }),
      capability({ capabilityId: 'qa.false.v1', missingSupportEvidencePrerequisites: [] }),
      capability({
        capabilityId: 'legacy.backed.v1',
        classification: 'CONDITIONAL_LEGACY_BACKED',
        legacyBacked: true,
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      }),
      capability({ capabilityId: 'unsupported.v1', registered: false, classification: 'UNSUPPORTED' })
    ]);

    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: summary,
      observedCapabilityIds: ['observed.only.v1'],
      sourcePlanRevision
    });

    expect(report.artifactKind).toBe(STEP37_REMAINING_INVENTORY_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_REMAINING_INVENTORY_SCHEMA_VERSION);
    expect(report.staticCompleteSupportedCount).toBe(1);
    expect(report.sameRunObservedOnlyCount).toBe(1);
    expect(report.stateCounts).toMatchObject({
      complete_supported: 1,
      same_run_observed_only: 1,
      registered_without_required_probe_verification: 1,
      registered_static_qa_observed_false: 1,
      legacy_backed: 1,
      unsupported_unregistered: 1
    });
    expect(report.capabilities.find((item) => item.capabilityId === 'observed.only.v1')).toMatchObject({
      state: 'same_run_observed_only',
      sameRunObserved: true,
      staticCompleteSupported: false
    });
    expect(report.requiredCapabilityCount).toBe(6);
    expect(report.nextCheckpoint?.checkpoint_id).toBe('stage4.probe_missing_v1.complete_supported_package_slice');
  });

  it('keeps closed capability slices out of next checkpoint selection while preserving their incomplete static state', () => {
    const committedClosures: Step37CommittedCapabilityClosure[] = [
      {
        capabilityId: 'probe.alpha.v1',
        checkpointId: 'stage4.probe_alpha_v1.closed_slice',
        sourceRevision: 'commit-a:docs/plans/stage4.md'
      }
    ];
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: supportSummary([
        capability({
          capabilityId: 'probe.alpha.v1',
          missingSupportEvidencePrerequisites: ['requiredProbesVerified']
        }),
        capability({
          capabilityId: 'probe.beta.v1',
          missingSupportEvidencePrerequisites: ['requiredProbesVerified']
        })
      ]),
      committedCapabilityClosures: committedClosures,
      sourcePlanRevision
    });

    expect(report.capabilities.find((item) => item.capabilityId === 'probe.alpha.v1')).toMatchObject({
      staticCompleteSupported: false,
      closedInCommittedHistory: true,
      closedByCheckpointIds: ['stage4.probe_alpha_v1.closed_slice']
    });
    expect(report.checkpointInventory.map((checkpoint) => checkpoint.checkpoint_id)).toEqual([
      'stage4.probe_beta_v1.complete_supported_package_slice'
    ]);
    expect(report.nextCheckpoint?.checkpoint_id).toBe('stage4.probe_beta_v1.complete_supported_package_slice');
  });

  it('fails closed when static complete support is still unmet but closure history leaves no executable next checkpoint', () => {
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: supportSummary([
        capability({
          capabilityId: 'closed.incomplete.v1',
          missingSupportEvidencePrerequisites: ['requiredProbesVerified']
        })
      ]),
      committedCapabilityClosures: [
        {
          capabilityId: 'closed.incomplete.v1',
          checkpointId: 'stage4.closed_incomplete_v1.closed_slice',
          sourceRevision: 'commit-a:docs/plans/stage4.md'
        }
      ],
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'NEXT_ATOMIC_STEP_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'running',
      unmet_static_complete_supported_count: 1
    });
  });

  it('selects the support promotion atom when package inventory is exhausted but static support is still unmet', () => {
    const capabilities = [
      capability({
        capabilityId: 'observed.alpha.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      }),
      capability({
        capabilityId: 'observed.beta.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      })
    ];
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: supportSummary(capabilities),
      observedCapabilityIds: capabilities.map((item) => item.capabilityId),
      committedCapabilityClosures: capabilities.map((item) => ({
        capabilityId: item.capabilityId,
        checkpointId: `stage4.${item.capabilityId.replaceAll('.', '_')}.complete_supported_package_slice`,
        sourceRevision: 'commit-a:docs/plans/stage4.md'
      })),
      supportPromotionCheckpoint: supportPromotionCheckpoint({
        unmet_reason:
          'Stage 4 package inventory is exhausted with same-run observed package receipts, but static completeSupported remains 0/2; support promotion must audit whether observed package evidence can become closure authority before Stage 5 entry.'
      }),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(0);
    expect(report.committedClosedCapabilityCount).toBe(2);
    expect(report.sameRunObservedOnlyCount).toBe(2);
    expect(report.selectionFailure).toBeNull();
    expect(report.checkpointInventory).toHaveLength(1);
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
      parent_stage_id: 'stage4',
      next_atomic_step: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.unmet_reason).toContain('support promotion must audit');
  });

  it('fails closed when observed package inventory is exhausted but the authoritative support-promotion checkpoint is missing', () => {
    const capabilities = [
      capability({
        capabilityId: 'observed.alpha.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      }),
      capability({
        capabilityId: 'observed.beta.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      })
    ];
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: supportSummary(capabilities),
      observedCapabilityIds: capabilities.map((item) => item.capabilityId),
      committedCapabilityClosures: capabilities.map((item) => ({
        capabilityId: item.capabilityId,
        checkpointId: `stage4.${item.capabilityId.replaceAll('.', '_')}.complete_supported_package_slice`,
        sourceRevision: 'commit-a:docs/plans/stage4.md'
      })),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(0);
    expect(report.committedClosedCapabilityCount).toBe(2);
    expect(report.sameRunObservedOnlyCount).toBe(2);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'running',
      stage5_entry_allowed: false,
      unmet_static_complete_supported_count: 2,
      reason: 'observed inventory exhausted but static support promotion not consumed',
      expected_checkpoint_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
    expect(report.checkpointInventory).toEqual([]);
  });

  it('rejects a structurally valid but wrong support-promotion checkpoint identity instead of selecting Stage 5', () => {
    const capabilities = [
      capability({
        capabilityId: 'observed.alpha.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      })
    ];
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: supportSummary(capabilities),
      observedCapabilityIds: ['observed.alpha.v1'],
      committedCapabilityClosures: [
        {
          capabilityId: 'observed.alpha.v1',
          checkpointId: 'stage4.observed_alpha_v1.complete_supported_package_slice',
          sourceRevision: 'commit-a:docs/plans/stage4.md'
        }
      ],
      supportPromotionCheckpoint: supportPromotionCheckpoint({
        checkpoint_id: 'stage5.exact_lock_entry_audit',
        parent_stage_id: 'stage5',
        next_atomic_step: 'Stage 5 exact lock entry audit'
      }),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.checkpointInventory).toEqual([]);
    expect(report.selectionFailure).toMatchObject({
      error_code: 'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED',
      stage5_entry_allowed: false,
      reason: 'observed inventory exhausted but supplied support promotion checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
      expected_parent_stage_id: 'stage4',
      expected_next_atomic_step: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: 'stage5.exact_lock_entry_audit',
      invalid_fields: ['checkpoint_id', 'parent_stage_id', 'next_atomic_step']
    });
  });

  it('rejects support-promotion checkpoint authority when the caller tries to move the Stage 4 gate under Stage 5', () => {
    const capabilities = [
      capability({
        capabilityId: 'observed.alpha.v1',
        missingSupportEvidencePrerequisites: ['requiredProbesVerified']
      })
    ];
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: supportSummary(capabilities),
      observedCapabilityIds: ['observed.alpha.v1'],
      committedCapabilityClosures: [
        {
          capabilityId: 'observed.alpha.v1',
          checkpointId: 'stage4.observed_alpha_v1.complete_supported_package_slice',
          sourceRevision: 'commit-a:docs/plans/stage4.md'
        }
      ],
      supportPromotionCheckpoint: supportPromotionCheckpoint({
        parent_stage_id: 'stage5'
      }),
      parentStageId: 'stage5',
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED',
      stage5_entry_allowed: false,
      expected_parent_stage_id: 'stage4',
      actual_checkpoint_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
      invalid_fields: ['parent_stage_id']
    });
  });

  it('derives the current Stage 4 inventory from the real support summary and explicit committed closure history', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const closedCapabilityIds = new Set([
      'camera.side_follow.v1',
      'collision.platform.v1',
      'combat.airborne_fire.v1',
      'combat.projectile.v1',
      'artifact.lineage_no_manual_patch.v1',
      'artifact.no_hidden_script.v1',
      'camera.bounds_clamp.v1',
      'canonical.semantic_preservation.v1',
      'collision.damage_affinity_matrix.v1',
      'enemy.boss_attack_pattern.v1',
      'enemy.boss_lifecycle.v1',
      'enemy.boss_phase_transition.v1',
      'enemy.fixed_turret.v1',
      'enemy.flying_right_entry.v1',
      'enemy.patrol_infantry.v1',
      'feedback.victory_declaration.v1',
      'generation.fallback_policy_fail_closed.v1',
      'goal.boss_unlock.v1',
      'hazard.falling_area.v1',
      'hazard.timed_explosion.v1',
      'health.damage_invulnerability.v1',
      'health.player_health_points.v1',
      'metadata.fixed_prompt_binding.v1',
      'movement.crouch.v1',
      'movement.run_jump.v1',
      'pickup.collectible.v1',
      'pickup.weapon_supply.v1',
      'profile.deepseek_run_and_gun_validation.v1',
      'provider.deepseek_authoritative_draft.v1',
      'review.oracle_final_gate.v1',
      'rules.checkpoint_restore.v1',
      'rules.encounter_gate.v1',
      'rules.retry_count.v1',
      'rules.state_transition_graph.v1',
      'runtime.manifest_binding.v1',
      'runtime.module_load_receipt.v1',
      'runtime.plan_coverage.v1',
      'scene.ordered_segments.v1',
      'scene.visual_presentation_metadata.v1',
      'spawn.enemy_wave.v1',
      'spawn.explicit_declarations.v1',
      'spawn.static.v1',
      'spawn.stop_on_boss_defeat.v1',
      'ui.hud_boss_health.v1',
      'ui.hud_current_weapon.v1',
      'ui.failure_restart.v1',
      'weapon.death_reset.v1',
      'weapon.default_straight_single.v1',
      'weapon.rapid_fire.v1',
      'weapon.replacement_rule.v1',
      'weapon.spread_shot.v1'
    ]);
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: support,
      observedCapabilityIds: [...closedCapabilityIds],
      committedCapabilityClosures: [...closedCapabilityIds].map((capabilityId) => ({
        capabilityId,
        checkpointId: `closed.${capabilityId}`,
        sourceRevision: 'committed-history:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md'
      })),
      sourcePlanRevision
    });

    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.registeredCapabilityCount).toBe(59);
    expect(report.staticCompleteSupportedCount).toBe(0);
    expect(report.stateCounts.unsupported_unregistered).toBe(0);
    expect(report.committedClosedCapabilityCount).toBe(51);
    expect(report.capabilities.find((item) => item.capabilityId === 'runtime.module_load_receipt.v1')).toMatchObject({
      closedInCommittedHistory: true,
      closedByCheckpointIds: ['closed.runtime.module_load_receipt.v1']
    });
    expect(report.nextCheckpoint).not.toBeNull();
    expect(report.nextCheckpoint?.checkpoint_id).toBe('stage4.ui_hud_player_health_v1.complete_supported_package_slice');
    expect(report.nextCheckpoint?.next_atomic_step).toBe(
      'Stage 4 ui.hud_player_health.v1 complete-supported package slice implementation atomic step'
    );
    expect(report.checkpointInventory.map((checkpoint) => checkpoint.checkpoint_id)).not.toContain(
      'stage4.runtime_module_load_receipt_v1.complete_supported_package_slice'
    );
    expect(report.checkpointInventory.map((checkpoint) => checkpoint.checkpoint_id)).not.toContain(
      'stage4.runtime_plan_coverage_v1.complete_supported_package_slice'
    );
  });

  it('routes the current exhausted Stage 4 package inventory to support promotion instead of running/null', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const closedCapabilityIds = support.capabilities.map((capability) => capability.capabilityId).sort();
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: support,
      observedCapabilityIds: closedCapabilityIds,
      committedCapabilityClosures: closedCapabilityIds.map((capabilityId) => ({
        capabilityId,
        checkpointId: `closed.${capabilityId}`,
        sourceRevision: 'HEAD:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md'
      })),
      supportPromotionCheckpoint: supportPromotionCheckpoint({
        unmet_reason: 'Stage 4 package inventory is exhausted with same-run observed package receipts, but static completeSupported remains 0/59.'
      }),
      sourcePlanRevision
    });

    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.registeredCapabilityCount).toBe(59);
    expect(report.staticCompleteSupportedCount).toBe(0);
    expect(report.committedClosedCapabilityCount).toBe(59);
    expect(report.sameRunObservedOnlyCount).toBe(59);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint?.checkpoint_id).toBe(STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID);
    expect(report.nextCheckpoint?.next_atomic_step).toBe(STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP);
    expect(report.nextCheckpoint?.unmet_reason).toContain('static completeSupported remains 0/59');
  });

  it('rejects current 59/59 observed and closed exhaustion when the support-promotion checkpoint is not in authoritative inventory', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const closedCapabilityIds = support.capabilities.map((capability) => capability.capabilityId).sort();
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: support,
      observedCapabilityIds: closedCapabilityIds,
      committedCapabilityClosures: closedCapabilityIds.map((capabilityId) => ({
        capabilityId,
        checkpointId: `closed.${capabilityId}`,
        sourceRevision: 'HEAD:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md'
      })),
      sourcePlanRevision
    });

    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.registeredCapabilityCount).toBe(59);
    expect(report.staticCompleteSupportedCount).toBe(0);
    expect(report.committedClosedCapabilityCount).toBe(59);
    expect(report.sameRunObservedOnlyCount).toBe(59);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED',
      stage5_entry_allowed: false,
      reason: 'observed inventory exhausted but static support promotion not consumed',
      expected_checkpoint_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('fails closed when support promotion was applied but the support summary consumer did not consume it', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: support,
      observedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1'],
      committedCapabilityClosures: ['promoted.alpha.v1', 'promoted.beta.v1'].map((capabilityId) => ({
        capabilityId,
        checkpointId: `stage4.${capabilityId.replaceAll('.', '_')}.complete_supported_package_slice`,
        sourceRevision: 'commit-a:docs/plans/stage4.md'
      })),
      supportPromotionApplicationReport: application,
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(0);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'SUPPORT_SUMMARY_CONSUMER_NOT_CONSUMED_PROMOTION_INVENTORY',
      expected_complete_supported_count: 2,
      actual_complete_supported_count: 0,
      promotion_application_status: 'applied',
      source_inventory_hash: 'fnv1a_inventory'
    });
  });

  it('requires a Stage 4 exit audit checkpoint after support promotion is consumed', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(1);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE4_EXIT_AUDIT_CHECKPOINT_REQUIRED',
      stage5_entry_allowed: false,
      expected_checkpoint_id: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to Stage 4 exit audit, not Stage 5, after support promotion is consumed', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditCheckpoint: stage4ExitAuditCheckpoint(),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(2);
    expect(report.stateCounts.complete_supported).toBe(2);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
      parent_stage_id: 'stage4',
      next_atomic_step: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toContain('stage5');
  });

  it('requires a Stage 5 entry-audit checkpoint after Stage 4 exit audit passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: stage4ExitAuditReport({ supportSummary: promotedSupport, application }),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(1);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE5_ENTRY_AUDIT_CHECKPOINT_REQUIRED',
      parent_stage_status: 'complete',
      stage5_entry_allowed: true,
      expected_checkpoint_id: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to Stage 5 entry audit only after Stage 4 exit audit passes and supplies authoritative next checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: stage4ExitAuditReport({ supportSummary: promotedSupport, application }),
      stage5EntryAuditCheckpoint: stage5EntryAuditCheckpoint(),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(2);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
      parent_stage_id: 'stage5',
      next_atomic_step: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
  });

  it('routes the current verified 59/59 promotion inventory to Stage 4 exit audit after support consumption', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const inventory = parseStep37SupportPromotionInventoryArtifact(JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')));
    const inventoryReport = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: inventory.aggregateObservedCapabilityIds,
      currentRunId: inventory.currentRunId,
      sourcePlanRevision: inventory.sourcePlanRevision,
      capabilityClosureRecords: inventory.capabilityClosureRecords
    });
    const inventoryHash = hashStep37SupportPromotionInventoryArtifact(inventory);
    const application = buildStep37SupportPromotionApplicationReport({
      supportSummary: support,
      inventoryReport,
      sourceInventoryPath: supportPromotionInventoryPath,
      sourceInventoryHash: inventoryHash,
      expectedInventoryHash: inventoryHash
    });
    const promotedSupport = buildStep37PromotedSupportSummary({ supportSummary: support, promotionApplicationReport: application });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditCheckpoint: stage4ExitAuditCheckpoint({
        unmet_reason:
          'Current Stage 4 support promotion consumed 59/59 same-run observed package receipts; run Stage 4 exit audit before Stage 5 entry.'
      }),
      sourcePlanRevision
    });

    expect(application.applicationStatus).toBe('applied');
    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.staticCompleteSupportedCount).toBe(59);
    expect(report.stateCounts.complete_supported).toBe(59);
    expect(report.sameRunObservedOnlyCount).toBe(0);
    expect(report.committedClosedCapabilityCount).toBe(0);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint?.checkpoint_id).toBe(STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID);
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID);
  });

  it('routes the current verified 59/59 Stage 4 exit audit to Stage 5 entry audit after support promotion', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const inventory = parseStep37SupportPromotionInventoryArtifact(JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')));
    const inventoryReport = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: inventory.aggregateObservedCapabilityIds,
      currentRunId: inventory.currentRunId,
      sourcePlanRevision: inventory.sourcePlanRevision,
      capabilityClosureRecords: inventory.capabilityClosureRecords
    });
    const inventoryHash = hashStep37SupportPromotionInventoryArtifact(inventory);
    const application = buildStep37SupportPromotionApplicationReport({
      supportSummary: support,
      inventoryReport,
      sourceInventoryPath: supportPromotionInventoryPath,
      sourceInventoryHash: inventoryHash,
      expectedInventoryHash: inventoryHash
    });
    const promotedSupport = buildStep37PromotedSupportSummary({ supportSummary: support, promotionApplicationReport: application });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditCheckpoint: stage5EntryAuditCheckpoint({
        unmet_reason: 'Stage 4 exit audit passed after 59/59 support promotion; audit Stage 5 entry before exact lock or cutover.'
      }),
      sourcePlanRevision
    });

    expect(exitAudit.stage4ExitStatus).toBe('passed');
    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.staticCompleteSupportedCount).toBe(59);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint?.checkpoint_id).toBe(STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID);
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID);
  });

  it('requires the exact capability lock checkpoint after Stage 5 entry audit passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      sourcePlanRevision
    });

    expect(entryAudit.stage5EntryStatus).toBe('passed');
    expect(report.staticCompleteSupportedCount).toBe(1);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE5_EXACT_LOCK_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      stage5_entry_allowed: true,
      stage5_exact_lock_implementation_allowed: true,
      expected_checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to exact capability lock only after Stage 5 entry audit passes and supplies authoritative next checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactLockCheckpoint: stage5ExactLockCheckpoint(),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(2);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
      parent_stage_id: 'stage5',
      next_atomic_step: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID);
  });

  it('rejects wrong exact-lock checkpoint identity instead of completing Step37 after Stage 5 entry audit', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactLockCheckpoint: stage5ExactLockCheckpoint({
        checkpoint_id: 'stage5.composed_schema_after_exact_lock',
        next_atomic_step: 'Stage 6 composed schema after exact lock atomic step'
      }),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE5_EXACT_LOCK_CHECKPOINT_REQUIRED',
      reason: 'Stage 5 entry audit passed but supplied exact capability lock checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
      expected_next_atomic_step: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: 'stage5.composed_schema_after_exact_lock',
      invalid_fields: ['checkpoint_id', 'next_atomic_step']
    });
  });

  it('requires a composed schema checkpoint after exact capability lock passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      sourcePlanRevision
    });

    expect(exactLock.exactLockStatus).toBe('passed');
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE6_COMPOSED_DSL_SCHEMA_CHECKPOINT_REQUIRED',
      parent_stage_status: 'complete',
      stage5_exact_lock_produced: true,
      expected_checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to composed DSL schema only after exact capability lock passes and supplies authoritative next checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaCheckpoint: stage6ComposedDslSchemaCheckpoint(),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(2);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
      parent_stage_id: 'stage6',
      next_atomic_step: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID);
  });

  it('does not continue to composed DSL schema when the exact lock does not match current complete-supported identities', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const capabilityLock = exactLock.capabilityLock;
    if (capabilityLock === null) {
      throw new Error('expected driver fixture exact capability lock to be produced');
    }
    const staleExactLock: Step37ExactCapabilityLockReport = {
      ...exactLock,
      completeSupportedCapabilityIds: ['promoted.old.v1'],
      packageCapabilityIds: ['promoted.old.v1'],
      selectedCapabilityIds: ['promoted.old.v1'],
      capabilityLock: {
        ...capabilityLock,
        capabilityIds: ['promoted.old.v1'],
        packages: [
          {
            capabilityId: 'promoted.old.v1',
            packageVersion: '1.0.0',
            packageHash: 'fnv1a_promoted_old_v1'
          }
        ]
      }
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: staleExactLock,
      stage6ComposedDslSchemaCheckpoint: stage6ComposedDslSchemaCheckpoint(),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE5_EXACT_LOCK_CHECKPOINT_REQUIRED',
      expected_checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('rejects wrong composed-schema checkpoint identity instead of completing Step37 after exact lock', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaCheckpoint: stage6ComposedDslSchemaCheckpoint({
        checkpoint_id: 'stage5.production_default_cutover',
        parent_stage_id: 'stage5',
        next_atomic_step: 'Stage 5 production default cutover'
      }),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE6_COMPOSED_DSL_SCHEMA_CHECKPOINT_REQUIRED',
      reason: 'Stage 5 exact capability lock passed but supplied composed DSL schema checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
      expected_next_atomic_step: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: 'stage5.production_default_cutover',
      invalid_fields: ['checkpoint_id', 'parent_stage_id', 'next_atomic_step']
    });
  });

  it('requires a capability DSL draft checkpoint after the Stage 6 composed schema passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      sourcePlanRevision
    });

    expect(composedSchema.composedSchemaStatus).toBe('passed');
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE6_CAPABILITY_DSL_DRAFT_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      composed_schema_produced: true,
      expected_checkpoint_id: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to capability DSL draft only after Stage 6 composed schema passes and supplies authoritative next checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftCheckpoint: stage6CapabilityDslDraftCheckpoint(),
      sourcePlanRevision
    });

    expect(report.staticCompleteSupportedCount).toBe(2);
    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      parent_stage_id: 'stage6',
      next_atomic_step: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID);
  });

  it('rejects wrong capability-draft checkpoint identity after composed schema passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftCheckpoint: stage6CapabilityDslDraftCheckpoint({
        checkpoint_id: 'stage7.normalization_from_composed_schema',
        parent_stage_id: 'stage7',
        next_atomic_step: 'Stage 7 normalization from composed schema'
      }),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE6_CAPABILITY_DSL_DRAFT_CHECKPOINT_REQUIRED',
      reason: 'Stage 6 composed DSL schema passed but supplied capability DSL draft checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      expected_next_atomic_step: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: 'stage7.normalization_from_composed_schema',
      invalid_fields: ['checkpoint_id', 'parent_stage_id', 'next_atomic_step']
    });
  });

  it('does not continue to capability DSL draft when composed schema evidence is stale', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const staleComposedSchema: Step37ComposedDslSchemaReport = {
      ...composedSchema,
      sourceExactCapabilityLockAuditHash: 'fnv1a_stale_exact_lock'
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: staleComposedSchema,
      stage6CapabilityDslDraftCheckpoint: stage6CapabilityDslDraftCheckpoint(),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE6_COMPOSED_DSL_SCHEMA_CHECKPOINT_REQUIRED',
      expected_checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('requires a normalization checkpoint after the Stage 6 capability DSL draft passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      sourcePlanRevision
    });

    expect(draftReport.draftStatus).toBe('passed');
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      capability_dsl_draft_produced: true,
      expected_checkpoint_id: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to normalization only after draft evidence passes and supplies authoritative Stage 7 checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftCheckpoint: stage7NormalizeCapabilityDslDraftCheckpoint(),
      sourcePlanRevision
    });

    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      parent_stage_id: 'stage7',
      next_atomic_step: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
  });

  it('does not continue to normalization when capability draft evidence is stale', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const staleDraftReport: Step37CapabilityDslDraftReport = {
      ...capabilityDslDraftReport({ composedSchema }),
      sourceComposedSchemaAuditHash: 'fnv1a_stale_composed_schema'
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: staleDraftReport,
      stage6CapabilityDslDraftCheckpoint: stage6CapabilityDslDraftCheckpoint(),
      stage7NormalizeCapabilityDslDraftCheckpoint: stage7NormalizeCapabilityDslDraftCheckpoint(),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('requires a compile checkpoint after the Stage 7 normalization passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      sourcePlanRevision
    });

    expect(normalizeReport.normalizationStatus).toBe('passed');
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      normalized: true,
      expected_checkpoint_id: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to compile only after normalization evidence passes and supplies authoritative Stage 8 checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslCheckpoint: stage8CompileNormalizedCapabilityDslCheckpoint(),
      sourcePlanRevision
    });

    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
      parent_stage_id: 'stage8',
      next_atomic_step: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
  });

  it('does not continue to compile when normalization evidence is stale', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const staleNormalizeReport: Step37NormalizeCapabilityDslDraftReport = {
      ...normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock }),
      sourceCapabilityDslDraftAuditHash: 'fnv1a_stale_draft'
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: staleNormalizeReport,
      stage7NormalizeCapabilityDslDraftCheckpoint: stage7NormalizeCapabilityDslDraftCheckpoint(),
      stage8CompileNormalizedCapabilityDslCheckpoint: stage8CompileNormalizedCapabilityDslCheckpoint(),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('requires a runtime consumption checkpoint after Stage 8 compile passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      sourcePlanRevision
    });

    expect(compileReport.compileStatus).toBe('passed');
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE9_CONSUME_COMPILED_RUNTIME_IR_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      compiled: true,
      expected_checkpoint_id: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to runtime consumption only after Stage 8 compile passes and supplies authoritative Stage 9 checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrCheckpoint: stage9ConsumeCompiledRuntimeIrCheckpoint(),
      sourcePlanRevision
    });

    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
      parent_stage_id: 'stage9',
      next_atomic_step: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID);
  });

  it('does not continue to runtime consumption when Stage 8 compile evidence is stale', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const staleCompileReport: Step37CompileNormalizedCapabilityDslReport = {
      ...compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport }),
      sourceNormalizedCapabilityDslAuditHash: 'fnv1a_stale_normalized_dsl'
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: staleCompileReport,
      stage8CompileNormalizedCapabilityDslCheckpoint: stage8CompileNormalizedCapabilityDslCheckpoint(),
      stage9ConsumeCompiledRuntimeIrCheckpoint: stage9ConsumeCompiledRuntimeIrCheckpoint(),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('requires a QA observation checkpoint after Stage 9 runtime consumption passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      sourcePlanRevision
    });

    expect(runtimeConsumptionReport.runtimeConsumptionStatus).toBe('passed');
    expect(runtimeConsumptionReport.runtimeConsumed).toBe(true);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE10_QA_OBSERVATION_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      runtime_consumed: true,
      expected_checkpoint_id: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to QA observation only after Stage 9 runtime consumption passes and supplies authoritative Stage 10 checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaCheckpoint: stage10ObserveRuntimeConsumedIrWithQaCheckpoint(),
      sourcePlanRevision
    });

    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
      parent_stage_id: 'stage10',
      next_atomic_step: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID);
  });

  it('does not continue to QA observation when Stage 9 runtime consumption evidence is stale', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const staleRuntimeConsumptionReport: Step37ConsumeCompiledRuntimeIrReport = {
      ...consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport }),
      sourceCompiledRuntimeIrAuditHash: 'fnv1a_stale_compiled_runtime_ir'
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: staleRuntimeConsumptionReport,
      stage9ConsumeCompiledRuntimeIrCheckpoint: stage9ConsumeCompiledRuntimeIrCheckpoint(),
      stage10ObserveRuntimeConsumedIrWithQaCheckpoint: stage10ObserveRuntimeConsumedIrWithQaCheckpoint(),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('requires production default cutover checkpoint after Stage 10 QA observation passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      sourcePlanRevision
    });

    expect(qaObservationReport.qaObservationStatus).toBe('passed');
    expect(qaObservationReport.qaObserved).toBe(true);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE11_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      runtime_consumed: true,
      qa_observed: true,
      expected_checkpoint_id: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to production default cutover only after Stage 10 QA observation passes and supplies authoritative Stage 11 checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      stage11ActivateProductionDefaultCutoverCheckpoint: stage11ActivateProductionDefaultCutoverCheckpoint(),
      sourcePlanRevision
    });

    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
      parent_stage_id: 'stage11',
      next_atomic_step: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID);
  });

  it('does not continue to production default cutover when Stage 10 QA observation evidence is stale', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const staleQaObservationReport: Step37ObserveRuntimeConsumedIrWithQaReport = {
      ...observedRuntimeQaReport({ runtimeConsumptionReport }),
      sourceRuntimeConsumptionAuditHash: 'fnv1a_stale_runtime_consumption'
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: staleQaObservationReport,
      stage10ObserveRuntimeConsumedIrWithQaCheckpoint: stage10ObserveRuntimeConsumedIrWithQaCheckpoint(),
      stage11ActivateProductionDefaultCutoverCheckpoint: stage11ActivateProductionDefaultCutoverCheckpoint(),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('does not continue to production default cutover when Stage 10 report content changes without refreshing its report hash', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const staleQaObservationReport: Step37ObserveRuntimeConsumedIrWithQaReport = {
      ...observedRuntimeQaReport({ runtimeConsumptionReport }),
      observedProbeIds: ['probe.promoted_alpha_v1', 'probe.unreviewed_extra']
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: staleQaObservationReport,
      stage10ObserveRuntimeConsumedIrWithQaCheckpoint: stage10ObserveRuntimeConsumedIrWithQaCheckpoint(),
      stage11ActivateProductionDefaultCutoverCheckpoint: stage11ActivateProductionDefaultCutoverCheckpoint(),
      sourcePlanRevision
    });

    expect(staleQaObservationReport.qaObservationStatus).toBe('passed');
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('fails closed when Stage 11 checkpoint identity is present but not authoritative', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      stage11ActivateProductionDefaultCutoverCheckpoint: stage11ActivateProductionDefaultCutoverCheckpoint({
        checkpoint_id: 'stage11.activate_default_cutover_typo',
        parent_stage_id: 'stage10'
      }),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE11_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_REQUIRED',
      expected_checkpoint_id: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
      actual_checkpoint_id: 'stage11.activate_default_cutover_typo',
      invalid_fields: expect.arrayContaining(['checkpoint_id', 'parent_stage_id'])
    });
  });

  it('requires legacy authoritative path exit checkpoint after Stage 11 production default cutover passes', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const cutoverReport = productionDefaultCutoverReport({ qaObservationReport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      stage11ActivateProductionDefaultCutoverReport: cutoverReport,
      sourcePlanRevision
    });

    expect(cutoverReport.cutoverStatus).toBe('passed');
    expect(cutoverReport.productionDefaultCutoverActive).toBe(true);
    expect(cutoverReport.legacyAuthoritativePathExited).toBe(false);
    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE12_LEGACY_AUTHORITATIVE_PATH_EXIT_CHECKPOINT_REQUIRED',
      parent_stage_status: 'running',
      production_default_cutover_active: true,
      legacy_authoritative_path_exited: false,
      expected_checkpoint_id: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
      actual_checkpoint_id: null,
      invalid_fields: ['checkpoint_id']
    });
  });

  it('continues to legacy authoritative path exit only after Stage 11 cutover passes and supplies authoritative Stage 12 checkpoint', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' }), capability({ capabilityId: 'promoted.beta.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 2,
      completeSupportedCapabilityIds: ['promoted.alpha.v1', 'promoted.beta.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const cutoverReport = productionDefaultCutoverReport({ qaObservationReport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      stage11ActivateProductionDefaultCutoverReport: cutoverReport,
      stage12ExitLegacyAuthoritativePathCheckpoint: stage12ExitLegacyAuthoritativePathCheckpoint(),
      sourcePlanRevision
    });

    expect(report.selectionFailure).toBeNull();
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
      parent_stage_id: 'stage12',
      next_atomic_step: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_NEXT_ATOMIC_STEP,
      selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory'
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID);
  });

  it('does not continue to legacy exit when Stage 11 cutover evidence is stale', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const staleCutoverReport: Step37ActivateProductionDefaultCutoverReport = {
      ...productionDefaultCutoverReport({ qaObservationReport }),
      sourceRuntimeQaObservationAuditHash: 'fnv1a_stale_stage10'
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      stage11ActivateProductionDefaultCutoverReport: staleCutoverReport,
      stage11ActivateProductionDefaultCutoverCheckpoint: stage11ActivateProductionDefaultCutoverCheckpoint(),
      stage12ExitLegacyAuthoritativePathCheckpoint: stage12ExitLegacyAuthoritativePathCheckpoint(),
      sourcePlanRevision
    });

    expect(staleCutoverReport.cutoverStatus).toBe('passed');
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('does not continue to legacy exit when Stage 11 report content changes without refreshing its report hash', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const staleCutoverReport: Step37ActivateProductionDefaultCutoverReport = {
      ...productionDefaultCutoverReport({ qaObservationReport }),
      observedProbeIds: ['probe.promoted_alpha_v1', 'probe.unreviewed_extra']
    };
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      stage11ActivateProductionDefaultCutoverReport: staleCutoverReport,
      stage11ActivateProductionDefaultCutoverCheckpoint: stage11ActivateProductionDefaultCutoverCheckpoint(),
      stage12ExitLegacyAuthoritativePathCheckpoint: stage12ExitLegacyAuthoritativePathCheckpoint(),
      sourcePlanRevision
    });

    expect(staleCutoverReport.cutoverStatus).toBe('passed');
    expect(report.nextCheckpoint).toMatchObject({
      checkpoint_id: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID
    });
    expect(report.nextCheckpoint?.checkpoint_id).not.toBe(STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID);
    expect(report.selectionFailure).toBeNull();
  });

  it('fails closed when Stage 12 checkpoint identity is present but not authoritative', () => {
    const support = supportSummary([capability({ capabilityId: 'promoted.alpha.v1' })]);
    const application = supportPromotionApplicationReport({
      completeSupportedCount: 1,
      completeSupportedCapabilityIds: ['promoted.alpha.v1']
    });
    const promotedSupport = buildStep37PromotedSupportSummary({
      supportSummary: support,
      promotionApplicationReport: application
    });
    const exitAudit = stage4ExitAuditReport({ supportSummary: promotedSupport, application });
    const entryAudit = stage5EntryAuditReport({ supportSummary: promotedSupport, exitAudit });
    const exactLock = exactCapabilityLockReport({ supportSummary: promotedSupport, entryAudit });
    const composedSchema = composedDslSchemaReport({ exactLock });
    const draftReport = capabilityDslDraftReport({ composedSchema });
    const normalizeReport = normalizeCapabilityDslDraftReport({ draftReport, composedSchema, exactLock });
    const compileReport = compiledRuntimeIrReport({ normalizeReport, supportSummary: promotedSupport });
    const runtimeConsumptionReport = consumedRuntimeIrReport({ compileReport, supportSummary: promotedSupport });
    const qaObservationReport = observedRuntimeQaReport({ runtimeConsumptionReport });
    const cutoverReport = productionDefaultCutoverReport({ qaObservationReport });
    const report = buildStep37RemainingCompleteSupportedInventory({
      supportSummary: promotedSupport,
      supportPromotionApplicationReport: application,
      stage4ExitAuditReport: exitAudit,
      stage5EntryAuditReport: entryAudit,
      stage5ExactCapabilityLockReport: exactLock,
      stage6ComposedDslSchemaReport: composedSchema,
      stage6CapabilityDslDraftReport: draftReport,
      stage7NormalizeCapabilityDslDraftReport: normalizeReport,
      stage8CompileNormalizedCapabilityDslReport: compileReport,
      stage9ConsumeCompiledRuntimeIrReport: runtimeConsumptionReport,
      stage10ObserveRuntimeConsumedIrWithQaReport: qaObservationReport,
      stage11ActivateProductionDefaultCutoverReport: cutoverReport,
      stage12ExitLegacyAuthoritativePathCheckpoint: stage12ExitLegacyAuthoritativePathCheckpoint({
        checkpoint_id: 'stage12.exit_legacy_path_typo',
        parent_stage_id: 'stage11'
      }),
      sourcePlanRevision
    });

    expect(report.nextCheckpoint).toBeNull();
    expect(report.selectionFailure).toMatchObject({
      error_code: 'STAGE12_LEGACY_AUTHORITATIVE_PATH_EXIT_CHECKPOINT_REQUIRED',
      expected_checkpoint_id: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
      actual_checkpoint_id: 'stage12.exit_legacy_path_typo',
      invalid_fields: expect.arrayContaining(['checkpoint_id', 'parent_stage_id'])
    });
  });

  it('requires committed closure history to have traceable source revisions instead of stale memory labels', () => {
    expect(() =>
      buildStep37RemainingCompleteSupportedInventory({
        supportSummary: supportSummary([capability({ capabilityId: 'traceable.v1' })]),
        committedCapabilityClosures: [{ capabilityId: 'traceable.v1', checkpointId: 'checkpoint', sourceRevision: '   ' }],
        sourcePlanRevision
      })
    ).toThrow('STEP37_REMAINING_INVENTORY_FIELD_REQUIRED field="committedCapabilityClosures[traceable.v1].sourceRevision"');
  });

  it('keeps state derivation specific to the capability facts rather than a broad incomplete bucket', () => {
    expect(
      deriveStep37RemainingCapabilityState({
        capability: capability({ capabilityId: 'legacy.v1', legacyBacked: true, classification: 'CONDITIONAL_LEGACY_BACKED' }),
        sameRunObserved: false
      })
    ).toBe('legacy_backed');
    expect(
      deriveStep37RemainingCapabilityState({
        capability: capability({ capabilityId: 'unsupported.v1', registered: false, classification: 'UNSUPPORTED' }),
        sameRunObserved: false
      })
    ).toBe('unsupported_unregistered');
    expect(
      deriveStep37RemainingCapabilityState({
        capability: capability({ capabilityId: 'observed.v1' }),
        sameRunObserved: true
      })
    ).toBe('same_run_observed_only');
  });
});

function supportSummary(capabilities: DeepSeekRunAndGunProfileCapabilitySupport[]): DeepSeekRunAndGunProfileSupportSummary {
  return {
    profileId: 'DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1',
    profileVersion: 'v1',
    summary: {
      requirementCount: capabilities.length,
      capabilityClusterCount: 1,
      requiredCapabilityCount: capabilities.length,
      registeredCapabilityCount: capabilities.filter((item) => item.registered).length,
      completeSupportedCount: capabilities.filter((item) => item.completeSupported).length,
      legacyBackedCapabilityCount: capabilities.filter((item) => item.legacyBacked).length
    },
    capabilities
  };
}

function capability(
  overrides: Partial<DeepSeekRunAndGunProfileCapabilitySupport> & { capabilityId: string }
): DeepSeekRunAndGunProfileCapabilitySupport {
  const evidenceDimensions = overrides.evidenceDimensions ?? {
    schema_expressible: true,
    normalized: true,
    compiled: true,
    runtime_consumed: true,
    qa_observed: false
  };
  return {
    capabilityId: overrides.capabilityId,
    registered: overrides.registered ?? true,
    classification: overrides.classification ?? 'DEFERRED',
    evidenceDimensions,
    missingEvidenceDimensions: overrides.missingEvidenceDimensions ?? missingEvidence(evidenceDimensions),
    missingSupportEvidencePrerequisites: overrides.missingSupportEvidencePrerequisites ?? [],
    completeSupported: overrides.completeSupported ?? Object.values(evidenceDimensions).every((value) => value),
    legacyBacked: overrides.legacyBacked ?? false
  };
}

function allEvidence(value: boolean): DeepSeekRunAndGunProfileCapabilitySupport['evidenceDimensions'] {
  return {
    schema_expressible: value,
    normalized: value,
    compiled: value,
    runtime_consumed: value,
    qa_observed: value
  };
}

function missingEvidence(
  evidence: DeepSeekRunAndGunProfileCapabilitySupport['evidenceDimensions']
): DeepSeekRunAndGunProfileCapabilitySupport['missingEvidenceDimensions'] {
  return (['schema_expressible', 'normalized', 'compiled', 'runtime_consumed', 'qa_observed'] as const).filter(
    (dimension) => !evidence[dimension]
  );
}

function supportPromotionCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
    parent_stage_id: 'stage4',
    next_atomic_step: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 4 package inventory is exhausted with same-run observed package receipts, but static completeSupported remains 0/59; support promotion must audit whether observed package evidence can become closure authority before Stage 5 entry.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage4ExitAuditCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
    parent_stage_id: 'stage4',
    next_atomic_step: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 4 complete support was promoted from same-run package receipts; audit Stage 4 exit before any Stage 5 entry.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage5EntryAuditCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
    parent_stage_id: 'stage5',
    next_atomic_step: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 4 exit audit passed after complete support promotion; audit Stage 5 entry before exact lock, production cutover, or legacy exit.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage5ExactLockCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
    parent_stage_id: 'stage5',
    next_atomic_step: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 5 entry audit passed after complete support promotion; build the exact capability lock from complete-supported packages before composed schema or cutover.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage6ComposedDslSchemaCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
    parent_stage_id: 'stage6',
    next_atomic_step: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 5 exact capability lock passed; compose the DSL schema from that lock before model request, runtime consumption, cutover, or legacy exit.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage6CapabilityDslDraftCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
    parent_stage_id: 'stage6',
    next_atomic_step: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 6 composed DSL schema identity was produced from the exact capability lock; generate a capability DSL draft against that schema before normalization, runtime consumption, cutover, or legacy exit.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage7NormalizeCapabilityDslDraftCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
    parent_stage_id: 'stage7',
    next_atomic_step: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 6 capability DSL draft was produced from the composed schema; normalize the draft before compiler, runtime consumption, cutover, or legacy exit.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage8CompileNormalizedCapabilityDslCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
    parent_stage_id: 'stage8',
    next_atomic_step: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason: 'Stage 7 normalized canonical Game DSL was produced; compile it before runtime consumption, QA, cutover, or legacy exit.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage9ConsumeCompiledRuntimeIrCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
    parent_stage_id: 'stage9',
    next_atomic_step: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 8 compiled normalized capability DSL into runtime IR; consume the compiled runtime IR before QA, cutover, or legacy exit.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage10ObserveRuntimeConsumedIrWithQaCheckpoint(
  overrides: Partial<Step37CheckpointInventoryItem> = {}
): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
    parent_stage_id: 'stage10',
    next_atomic_step: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 9 consumed the compiled runtime IR through the runtime loader; observe that runtime-consumed IR with QA before cutover or legacy exit.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage11ActivateProductionDefaultCutoverCheckpoint(
  overrides: Partial<Step37CheckpointInventoryItem> = {}
): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
    parent_stage_id: 'stage11',
    next_atomic_step: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 10 observed runtime-consumed IR with QA; activate production default cutover only after the QA-observed runtime path is authoritative.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage12ExitLegacyAuthoritativePathCheckpoint(overrides: Partial<Step37CheckpointInventoryItem> = {}): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
    parent_stage_id: 'stage12',
    next_atomic_step: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_NEXT_ATOMIC_STEP,
    status: 'unmet',
    unmet_reason:
      'Stage 11 activated production default cutover; exit the legacy authoritative path only after the cutover report is fresh and authoritative.',
    source_plan_revision: sourcePlanRevision,
    ...overrides
  };
}

function stage4ExitAuditReport(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  application: Step37SupportPromotionApplicationReport;
}): Step37Stage4ExitAuditReport {
  return buildStep37Stage4ExitAuditReport({
    supportSummary: input.supportSummary,
    promotionApplicationReport: input.application,
    sourceSupportViewPath: 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json',
    sourceSupportViewHash: 'fnv1a_support_view',
    expectedSupportViewHash: 'fnv1a_support_view'
  });
}

function stage5EntryAuditReport(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  exitAudit: Step37Stage4ExitAuditReport;
}): Step37Stage5EntryAuditReport {
  return buildStep37Stage5EntryAuditReport({
    supportSummary: input.supportSummary,
    stage4ExitAuditReport: input.exitAudit,
    sourceStage4ExitAuditPath: 'docs/plans/step37-stage4-exit-audit-after-support-promotion.v0.1.json',
    sourceStage4ExitAuditHash: input.exitAudit.auditHash,
    expectedStage4ExitAuditHash: input.exitAudit.auditHash
  });
}

function exactCapabilityLockReport(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  entryAudit: Step37Stage5EntryAuditReport;
}): Step37ExactCapabilityLockReport {
  const completeSupportedCapabilityIds = input.supportSummary.capabilities
    .filter((capability) => capability.completeSupported)
    .map((capability) => capability.capabilityId)
    .sort();
  const capabilityLock = {
    artifactKind: 'gameplay_capability_lock' as const,
    schemaVersion: 'gameplay_capability_lock.v0.1' as const,
    profileId: input.supportSummary.profileId,
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    capabilityIds: completeSupportedCapabilityIds,
    packages: completeSupportedCapabilityIds.map((capabilityId) => ({
      capabilityId,
      packageVersion: '1.0.0',
      packageHash: `fnv1a_${capabilityId.replace(/[^A-Za-z0-9]+/g, '_')}`
    })),
    lockHash: 'fnv1a_driver_fixture_exact_lock'
  };

  return {
    artifactKind: 'step37_exact_capability_lock_from_complete_supported_packages',
    schemaVersion: 'step37_exact_capability_lock_from_complete_supported_packages.v0.1',
    checkpointId: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
    parentStageId: 'stage5',
    sourceStage5EntryAuditPath: 'docs/plans/step37-stage5-entry-audit-after-stage4-exit.v0.1.json',
    sourceStage5EntryAuditHash: input.entryAudit.auditHash,
    expectedStage5EntryAuditHash: input.entryAudit.auditHash,
    stage5EntryAuditHashMatches: true,
    sourceStage4ExitAuditHash: input.entryAudit.sourceStage4ExitAuditHash,
    sourceSupportViewHash: input.entryAudit.sourceSupportViewHash,
    sourceInventoryHash: input.entryAudit.sourceInventoryHash,
    profileId: input.supportSummary.profileId,
    profileVersion: input.supportSummary.profileVersion,
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    stage5EntryStatus: input.entryAudit.stage5EntryStatus,
    stage5EntryConditionsMet: input.entryAudit.stage5EntryConditionsMet,
    stage5EntryNextCheckpointId: input.entryAudit.nextCheckpointId,
    requiredCapabilityCount: input.supportSummary.summary.requiredCapabilityCount,
    registeredCapabilityCount: input.supportSummary.summary.registeredCapabilityCount,
    completeSupportedCount: input.supportSummary.summary.completeSupportedCount,
    completeSupportedCapabilityIds,
    packageCount: completeSupportedCapabilityIds.length,
    packageCapabilityIds: completeSupportedCapabilityIds,
    selectedCapabilityIds: completeSupportedCapabilityIds,
    resolutionStatus: 'resolved',
    resolutionDiagnostics: [],
    capabilityLock,
    lockHash: capabilityLock.lockHash,
    exactLockStatus: 'passed',
    exactLockProduced: true,
    parentStageStatusAfterLock: 'complete',
    composedSchemaProduced: false,
    productionDefaultCutoverActive: false,
    legacyAuthoritativePathExited: false,
    finalClosureNotBlocked: false,
    globalExitConditionsMet: false,
    nextCheckpointId: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
    blockers: [],
    auditHash: 'fnv1a_driver_fixture_stage5_exact_lock'
  };
}

function composedDslSchemaReport(input: { exactLock: Step37ExactCapabilityLockReport }): Step37ComposedDslSchemaReport {
  return buildStep37ComposedDslSchemaReport({
    exactCapabilityLockReport: input.exactLock,
    sourceExactCapabilityLockPath: 'docs/plans/step37-exact-capability-lock-from-complete-supported-packages.v0.1.json',
    sourceExactCapabilityLockAuditHash: input.exactLock.auditHash,
    expectedExactCapabilityLockAuditHash: input.exactLock.auditHash
  });
}

function capabilityDslDraftReport(input: { composedSchema: Step37ComposedDslSchemaReport }): Step37CapabilityDslDraftReport {
  return buildStep37CapabilityDslDraftReport({
    composedSchemaReport: input.composedSchema,
    sourceComposedSchemaPath: 'docs/plans/step37-composed-dsl-schema-from-exact-capability-lock.v0.1.json',
    sourceComposedSchemaAuditHash: input.composedSchema.auditHash,
    expectedComposedSchemaAuditHash: input.composedSchema.auditHash
  });
}

function normalizeCapabilityDslDraftReport(input: {
  draftReport: Step37CapabilityDslDraftReport;
  composedSchema: Step37ComposedDslSchemaReport;
  exactLock: Step37ExactCapabilityLockReport;
}): Step37NormalizeCapabilityDslDraftReport {
  return buildStep37NormalizeCapabilityDslDraftReport({
    capabilityDslDraftReport: input.draftReport,
    composedSchemaReport: input.composedSchema,
    exactCapabilityLockReport: input.exactLock,
    sourceCapabilityDslDraftPath: 'docs/plans/step37-capability-dsl-draft-from-composed-schema.v0.1.json',
    sourceCapabilityDslDraftAuditHash: input.draftReport.auditHash,
    expectedCapabilityDslDraftAuditHash: input.draftReport.auditHash
  });
}

function compiledRuntimeIrReport(input: {
  normalizeReport: Step37NormalizeCapabilityDslDraftReport;
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
}): Step37CompileNormalizedCapabilityDslReport {
  const completeSupportedCapabilityIds = input.supportSummary.capabilities
    .filter((capability) => capability.completeSupported)
    .map((capability) => capability.capabilityId)
    .sort();
  const compileReadyCanonicalGameDsl = { stage: 'stage8', capabilityIds: completeSupportedCapabilityIds };
  const compilationReport = { stage: 'compilation', status: 'compiled' };
  const capabilityIr = { stage: 'capability_ir' };
  const runtimePlan = { stage: 'runtime_plan' };
  const runtimeSystemManifest = { stage: 'runtime_system_manifest' };
  const sceneIrAuthorityReport = { stage: 'scene_ir_authority_report' };
  const payloadWithoutHash: Omit<Step37CompileNormalizedCapabilityDslReport, 'auditHash'> = {
    artifactKind: 'step37_compiled_runtime_ir_from_normalized_capability_dsl' as const,
    schemaVersion: 'step37_compiled_runtime_ir_from_normalized_capability_dsl.v0.1' as const,
    checkpointId: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
    parentStageId: 'stage8' as const,
    sourceNormalizedCapabilityDslPath: 'docs/plans/step37-normalized-capability-dsl-from-draft.v0.1.json',
    sourceNormalizedCapabilityDslAuditHash: input.normalizeReport.auditHash,
    expectedNormalizedCapabilityDslAuditHash: input.normalizeReport.auditHash,
    normalizedCapabilityDslAuditHashMatches: true,
    sourceNormalizedCanonicalDslHash: input.normalizeReport.canonicalDslHash,
    sourceNormalizationReportHash: input.normalizeReport.normalizationReportHash,
    sourceNormalizationLockHash: input.normalizeReport.normalizationLockHash,
    sourceNormalizationLockProfileId: input.normalizeReport.normalizationLockProfileId,
    sourceCapabilityDslDraftAuditHash: input.normalizeReport.sourceCapabilityDslDraftAuditHash,
    sourceCapabilityDslDraftHash: input.normalizeReport.sourceCapabilityDslDraftHash,
    sourceComposedSchemaAuditHash: input.normalizeReport.sourceComposedSchemaAuditHash,
    sourceComposedSchemaHash: input.normalizeReport.sourceComposedSchemaHash,
    sourceExactCapabilityLockAuditHash: input.normalizeReport.sourceExactCapabilityLockAuditHash,
    sourceExactCapabilityLockHash: input.normalizeReport.sourceExactCapabilityLockHash,
    sourceExactLockProfileId: input.normalizeReport.sourceExactLockProfileId,
    requiredCapabilityCount: input.supportSummary.summary.requiredCapabilityCount,
    completeSupportedCount: completeSupportedCapabilityIds.length,
    packageCount: completeSupportedCapabilityIds.length,
    completeSupportedCapabilityIds,
    normalizedCapabilityIds: completeSupportedCapabilityIds,
    compileReadyCapabilityIds: completeSupportedCapabilityIds,
    compileAdapterStatus: 'applied' as const,
    compileAdapterActions: [
      {
        kind: 'weapon_default_straight_single_compile_contract_completed' as const,
        capabilityIds: ['weapon.default_straight_single.v1'],
        path: '/systems/config_cfg_weapon_default_straight_single_v1',
        beforeHash: 'fnv1a_before',
        afterHash: 'fnv1a_after',
        reason: 'fixture compile adapter action'
      }
    ],
    compileReadyCanonicalGameDsl: compileReadyCanonicalGameDsl as unknown as Step37CompileNormalizedCapabilityDslReport['compileReadyCanonicalGameDsl'],
    compileReadyCanonicalDslHash: hashStableJson(compileReadyCanonicalGameDsl),
    compilationReport: compilationReport as unknown as Step37CompileNormalizedCapabilityDslReport['compilationReport'],
    compilationReportHash: hashStableJson(compilationReport),
    capabilityIr: capabilityIr as unknown as Step37CompileNormalizedCapabilityDslReport['capabilityIr'],
    capabilityIrHash: hashStableJson(capabilityIr),
    runtimePlan: runtimePlan as unknown as Step37CompileNormalizedCapabilityDslReport['runtimePlan'],
    runtimePlanHash: hashStableJson(runtimePlan),
    runtimeSystemManifest: runtimeSystemManifest as unknown as Step37CompileNormalizedCapabilityDslReport['runtimeSystemManifest'],
    runtimeSystemManifestHash: hashStableJson(runtimeSystemManifest),
    sceneIrAuthorityReport: sceneIrAuthorityReport as unknown as Step37CompileNormalizedCapabilityDslReport['sceneIrAuthorityReport'],
    sceneIrAuthorityReportHash: hashStableJson(sceneIrAuthorityReport),
    compileStatus: 'passed' as const,
    normalized: true,
    compiled: true,
    runtimeConsumed: false,
    qaObserved: false,
    productionDefaultCutoverActive: false,
    legacyAuthoritativePathExited: false,
    finalClosureNotBlocked: false,
    globalExitConditionsMet: false as const,
    parentStageStatusAfterCompile: 'running' as const,
    nextCheckpointId: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
    outputRefs: {
      capabilityIr: 'capability-ir.json' as const,
      runtimePlan: 'runtime-plan.generated.json' as const,
      runtimeSystemManifest: 'runtime-system-manifest.json' as const
    },
    blockers: []
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function consumedRuntimeIrReport(input: {
  compileReport: Step37CompileNormalizedCapabilityDslReport;
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
}): Step37ConsumeCompiledRuntimeIrReport {
  const completeSupportedCapabilityIds = input.supportSummary.capabilities
    .filter((capability) => capability.completeSupported)
    .map((capability) => capability.capabilityId)
    .sort();
  const runtimeLoaderPlan = {
    artifactKind: 'phaser_runtime_loader_plan' as const,
    schemaVersion: 'phaser_runtime_loader_plan.v0.1' as const,
    runtimeFamily: 'phaser_2d_action_arcade.v1' as const,
    profileId: input.supportSummary.profileId,
    capabilityLockRef: 'gameplay_capability_lock.json',
    capabilityLockHash: input.compileReport.sourceExactCapabilityLockHash ?? 'fnv1a_driver_fixture_exact_lock',
    compatibilityMode: {
      selection: 'universal_composition' as const,
      selectedBy: 'profile_compiler_version' as const,
      selectorValue: 'step37-driver-fixture',
      universalTemplatePath: 'templates/phaser/universal-2d-action' as const
    },
    loadOrder: completeSupportedCapabilityIds.map((capabilityId, index) => ({
      systemId: `system.${capabilityId.replace(/[^A-Za-z0-9]+/g, '_')}`,
      capabilityId,
      version: 'v1',
      phase: 'gameplay' as const,
      dependencies: [],
      services: ['qa_observer' as const],
      config: {},
      configHash: `fnv1a_config_${index}`,
      patchableProperties: [`config.${index}`],
      qaProbeIds: [`probe.${capabilityId.replace(/[^A-Za-z0-9]+/g, '_')}`]
    })),
    updateLoopSystemIds: completeSupportedCapabilityIds.map((capabilityId) => `system.${capabilityId.replace(/[^A-Za-z0-9]+/g, '_')}`),
    planHash: 'fnv1a_driver_fixture_runtime_loader_plan'
  };
  const bindingReport = {
    artifactKind: 'capability_runtime_binding_report' as const,
    schemaVersion: 'capability_runtime_binding_report.v0.1' as const,
    runtimeFamily: 'phaser_2d_action_arcade.v1' as const,
    profileId: input.supportSummary.profileId,
    capabilityLockRef: runtimeLoaderPlan.capabilityLockRef,
    capabilityLockHash: runtimeLoaderPlan.capabilityLockHash,
    status: 'bound_pending_qa' as const,
    modules: runtimeLoaderPlan.loadOrder.map((entry) => ({
      systemId: entry.systemId,
      capabilityId: entry.capabilityId,
      phase: entry.phase,
      status: 'bound_pending_qa' as const,
      configHash: entry.configHash,
      patchableProperties: entry.patchableProperties,
      qaProbeIds: entry.qaProbeIds
    })),
    reportHash: 'fnv1a_driver_fixture_binding_report'
  };
  const runtimeLoaderReport = {
    artifactKind: 'phaser_runtime_loader_report' as const,
    schemaVersion: 'phaser_runtime_loader_report.v0.1' as const,
    status: 'ready' as const,
    runtimeFamily: 'phaser_2d_action_arcade.v1' as const,
    profileId: input.supportSummary.profileId,
    capabilityLockRef: runtimeLoaderPlan.capabilityLockRef,
    capabilityLockHash: runtimeLoaderPlan.capabilityLockHash,
    planHash: runtimeLoaderPlan.planHash,
    bindingReportHash: bindingReport.reportHash,
    plan: runtimeLoaderPlan,
    bindingReport,
    issues: []
  };
  const payloadWithoutHash: Omit<Step37ConsumeCompiledRuntimeIrReport, 'auditHash'> = {
    artifactKind: 'step37_runtime_consumption_from_compiled_runtime_ir' as const,
    schemaVersion: 'step37_runtime_consumption_from_compiled_runtime_ir.v0.1' as const,
    checkpointId: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
    parentStageId: 'stage9' as const,
    sourceCompiledRuntimeIrPath: 'docs/plans/step37-compiled-runtime-ir-from-normalized-capability-dsl.v0.1.json',
    sourceCompiledRuntimeIrAuditHash: input.compileReport.auditHash,
    expectedCompiledRuntimeIrAuditHash: input.compileReport.auditHash,
    compiledRuntimeIrAuditHashMatches: true,
    sourceCapabilityIrHash: input.compileReport.capabilityIrHash,
    sourceRuntimePlanHash: input.compileReport.runtimePlanHash,
    sourceRuntimeSystemManifestHash: input.compileReport.runtimeSystemManifestHash,
    sourceSceneIrAuthorityReportHash: input.compileReport.sceneIrAuthorityReportHash,
    sourceExactCapabilityLockHash: input.compileReport.sourceExactCapabilityLockHash,
    sourceExactLockProfileId: input.compileReport.sourceExactLockProfileId,
    compileStatus: input.compileReport.compileStatus,
    compileNextCheckpointId: input.compileReport.nextCheckpointId,
    runtimeLoaderReport,
    runtimeLoaderReportHash: hashStableJson(runtimeLoaderReport),
    runtimeLoaderStatus: 'ready' as const,
    runtimeLoaderPlanHash: runtimeLoaderPlan.planHash,
    runtimeBindingReportHash: bindingReport.reportHash,
    runtimeBindingStatus: 'bound_pending_qa' as const,
    outputRefs: {
      capabilityIr: 'capability-ir.json',
      runtimePlan: 'runtime-plan.generated.json',
      runtimeSystemManifest: 'runtime-system-manifest.json'
    },
    requiredCapabilityCount: input.compileReport.requiredCapabilityCount,
    completeSupportedCount: completeSupportedCapabilityIds.length,
    packageCount: completeSupportedCapabilityIds.length,
    completeSupportedCapabilityIds,
    runtimeSystemCapabilityIds: completeSupportedCapabilityIds,
    runtimeSystemIds: runtimeLoaderPlan.loadOrder.map((entry) => entry.systemId).sort(),
    runtimeConsumptionStatus: 'passed' as const,
    normalized: true,
    compiled: true,
    runtimeConsumed: true,
    qaObserved: false,
    productionDefaultCutoverActive: false,
    legacyAuthoritativePathExited: false,
    finalClosureNotBlocked: false,
    globalExitConditionsMet: false as const,
    parentStageStatusAfterRuntimeConsumption: 'running' as const,
    nextCheckpointId: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
    blockers: []
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function observedRuntimeQaReport(input: {
  runtimeConsumptionReport: Step37ConsumeCompiledRuntimeIrReport;
}): Step37ObserveRuntimeConsumedIrWithQaReport {
  const bindingReport = input.runtimeConsumptionReport.runtimeLoaderReport?.bindingReport;
  if (bindingReport === undefined) {
    throw new Error('driver fixture requires a runtime binding report');
  }
  const qaObservedPayload = {
    artifactKind: bindingReport.artifactKind,
    schemaVersion: bindingReport.schemaVersion,
    runtimeFamily: bindingReport.runtimeFamily,
    profileId: bindingReport.profileId,
    capabilityLockRef: bindingReport.capabilityLockRef,
    capabilityLockHash: bindingReport.capabilityLockHash,
    status: 'qa_observed' as const,
    modules: bindingReport.modules.map((module) => ({ ...module, status: 'qa_observed' as const }))
  };
  const qaObservedBindingReport = { ...qaObservedPayload, reportHash: hashStableJson(qaObservedPayload) };
  const payloadWithoutHash: Omit<Step37ObserveRuntimeConsumedIrWithQaReport, 'auditHash'> = {
    artifactKind: 'step37_runtime_qa_observation_from_consumed_runtime_ir',
    schemaVersion: 'step37_runtime_qa_observation_from_consumed_runtime_ir.v0.1',
    checkpointId: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
    parentStageId: 'stage10',
    sourceRuntimeConsumptionPath: 'docs/plans/step37-runtime-consumption-from-compiled-runtime-ir.v0.1.json',
    sourceRuntimeConsumptionAuditHash: input.runtimeConsumptionReport.auditHash,
    expectedRuntimeConsumptionAuditHash: input.runtimeConsumptionReport.auditHash,
    runtimeConsumptionAuditHashMatches: true,
    sourceRuntimeLoaderReportHash: input.runtimeConsumptionReport.runtimeLoaderReportHash,
    sourceRuntimeLoaderPlanHash: input.runtimeConsumptionReport.runtimeLoaderPlanHash,
    sourceRuntimeBindingReportHash: input.runtimeConsumptionReport.runtimeBindingReportHash,
    sourceRuntimeBindingStatus: input.runtimeConsumptionReport.runtimeBindingStatus,
    qaObservedBindingReport,
    qaObservedBindingReportHash: hashStableJson(qaObservedBindingReport),
    requiredRuntimeModuleCount: bindingReport.modules.length,
    observedRuntimeModuleCount: bindingReport.modules.length,
    requiredRuntimeSystemIds: bindingReport.modules.map((module) => module.systemId).sort(),
    observedRuntimeSystemIds: bindingReport.modules.map((module) => module.systemId).sort(),
    observedCapabilityIds: bindingReport.modules.map((module) => module.capabilityId).sort(),
    observedProbeIds: bindingReport.modules.flatMap((module) => module.qaProbeIds).sort(),
    qaObservationStatus: 'passed',
    normalized: true,
    compiled: true,
    runtimeConsumed: true,
    qaObserved: true,
    productionDefaultCutoverActive: false,
    legacyAuthoritativePathExited: false,
    finalClosureNotBlocked: false,
    globalExitConditionsMet: false,
    parentStageStatusAfterQaObservation: 'running',
    nextCheckpointId: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
    blockers: []
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function productionDefaultCutoverReport(input: {
  qaObservationReport: Step37ObserveRuntimeConsumedIrWithQaReport;
}): Step37ActivateProductionDefaultCutoverReport {
  return buildStep37ActivateProductionDefaultCutoverReport({
    runtimeQaObservationReport: input.qaObservationReport,
    sourceRuntimeQaObservationPath: 'docs/plans/step37-runtime-qa-observation-from-consumed-runtime-ir.v0.1.json',
    sourceRuntimeQaObservationAuditHash: input.qaObservationReport.auditHash,
    expectedRuntimeQaObservationAuditHash: input.qaObservationReport.auditHash
  });
}

function supportPromotionApplicationReport(
  overrides: Partial<Step37SupportPromotionApplicationReport> = {}
): Step37SupportPromotionApplicationReport {
  return {
    artifactKind: 'step37_support_promotion_complete_supported_view',
    schemaVersion: 'step37_support_promotion_complete_supported_view.v0.1',
    checkpointId: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
    sourceInventoryPath: 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json',
    sourceInventoryHash: 'fnv1a_inventory',
    expectedInventoryHash: 'fnv1a_inventory',
    inventoryHashMatches: true,
    supportSummaryConsumer: 'buildStep37PromotedSupportSummary',
    supportPromotionInputStatus: 'ready',
    applicationStatus: 'applied',
    requiredCapabilityCount: overrides.completeSupportedCapabilityIds?.length ?? 0,
    registeredCapabilityCount: overrides.completeSupportedCapabilityIds?.length ?? 0,
    promotionEligibleCount: overrides.completeSupportedCapabilityIds?.length ?? 0,
    completeSupportedCount: overrides.completeSupportedCapabilityIds?.length ?? 0,
    completeSupportedCapabilityIds: [],
    blockedCapabilityIds: [],
    blockers: [],
    stage5EntryAllowed: false,
    ...overrides
  };
}
