import { describe, expect, it } from 'vitest';

import {
  STEP37_REMAINING_INVENTORY_ARTIFACT_KIND,
  STEP37_REMAINING_INVENTORY_SCHEMA_VERSION,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37RemainingCompleteSupportedInventory,
  deriveStep37RemainingCapabilityState,
  type DeepSeekRunAndGunProfileCapabilitySupport,
  type DeepSeekRunAndGunProfileSupportSummary,
  type Step37CommittedCapabilityClosure
} from '../../packages/game-dsl/src/index.js';

const sourcePlanRevision = 'HEAD:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md';

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
    expect(report.registeredCapabilityCount).toBe(48);
    expect(report.staticCompleteSupportedCount).toBe(0);
    expect(report.stateCounts.unsupported_unregistered).toBe(11);
    expect(report.committedClosedCapabilityCount).toBe(47);
    expect(report.capabilities.find((item) => item.capabilityId === 'runtime.module_load_receipt.v1')).toMatchObject({
      closedInCommittedHistory: true,
      closedByCheckpointIds: ['closed.runtime.module_load_receipt.v1']
    });
    expect(report.nextCheckpoint).not.toBeNull();
    expect(report.nextCheckpoint?.checkpoint_id).toBe('stage4.spawn_stop_on_boss_defeat_v1.complete_supported_package_slice');
    expect(report.nextCheckpoint?.next_atomic_step).toBe(
      'Stage 4 spawn.stop_on_boss_defeat.v1 complete-supported package slice implementation atomic step'
    );
    expect(report.checkpointInventory.map((checkpoint) => checkpoint.checkpoint_id)).not.toContain(
      'stage4.runtime_module_load_receipt_v1.complete_supported_package_slice'
    );
    expect(report.checkpointInventory.map((checkpoint) => checkpoint.checkpoint_id)).not.toContain(
      'stage4.runtime_plan_coverage_v1.complete_supported_package_slice'
    );
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
