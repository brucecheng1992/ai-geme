import { describe, expect, it } from 'vitest';

import {
  validateGameplayCapabilityPackage,
  validateGameplayCapabilityPackages,
  type GameplayCapabilityPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/package-contract.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  createDefaultStraightSingleWeaponPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/default-straight-single-weapon-package.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/default-straight-single-weapon-runtime-module.js';
import {
  WEAPON_DEATH_RESET_PACKAGE_REQUIRED_EVIDENCE_ID,
  WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
  createWeaponDeathResetPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-death-reset-package.js';
import {
  WEAPON_DEATH_RESET_EVENT_TYPE,
  WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
  WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-death-reset-runtime-module.js';
import {
  CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID,
  CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
  createCameraSideFollowPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-side-follow-package.js';
import {
  CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-side-follow-runtime-module.js';
import {
  COLLISION_PLATFORM_PACKAGE_REQUIRED_EVIDENCE_ID,
  COLLISION_PLATFORM_REQUIRED_PROBE_ID,
  createCollisionPlatformPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/collision-platform-package.js';
import {
  COLLISION_PLATFORM_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/collision-platform-runtime-module.js';
import {
  COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID,
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  createCombatProjectilePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-projectile-package.js';
import {
  COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-projectile-runtime-module.js';
import {
  COMBAT_AIRBORNE_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
  COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
  createCombatAirborneFirePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-airborne-fire-package.js';
import {
  COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-airborne-fire-runtime-module.js';
import {
  MOVEMENT_CROUCH_PACKAGE_REQUIRED_EVIDENCE_ID,
  MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
  createMovementCrouchPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-crouch-package.js';
import {
  MOVEMENT_CROUCH_HEIGHT_SCALE,
  MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-crouch-runtime-module.js';
import {
  MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID,
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  createMovementRunJumpPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-run-jump-package.js';
import {
  MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-run-jump-runtime-module.js';
import {
  SPAWN_STATIC_PACKAGE_REQUIRED_EVIDENCE_ID,
  SPAWN_STATIC_REQUIRED_PROBE_ID,
  createSpawnStaticPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-static-package.js';
import {
  SPAWN_STATIC_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-static-runtime-module.js';
import {
  SPAWN_ENEMY_WAVE_PACKAGE_REQUIRED_EVIDENCE_ID,
  SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
  createSpawnEnemyWavePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-enemy-wave-package.js';
import {
  SPAWN_ENEMY_WAVE_ORDERED_EVENT_TYPE,
  SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-enemy-wave-runtime-module.js';
import {
  HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_REQUIRED_EVIDENCE_ID,
  HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
  createHealthPlayerHealthPointsPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/health-player-health-points-package.js';
import {
  HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/health-player-health-points-runtime-module.js';
import {
  HEALTH_DAMAGE_INVULNERABILITY_PACKAGE_REQUIRED_EVIDENCE_ID,
  HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
  createHealthDamageInvulnerabilityPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/health-damage-invulnerability-package.js';
import {
  HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/health-damage-invulnerability-runtime-module.js';
import {
  PICKUP_COLLECTIBLE_PACKAGE_REQUIRED_EVIDENCE_ID,
  PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
  createPickupCollectiblePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/pickup-collectible-package.js';
import {
  PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE,
  PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID,
  PICKUP_COLLECTIBLE_STATE_CHANGED_EVENT_TYPE
} from '../../packages/game-dsl/src/gameplay-capabilities/pickup-collectible-runtime-module.js';
import {
  FIXED_PROMPT_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
  FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
  createFixedPromptBindingPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/fixed-prompt-binding-package.js';
import {
  FIXED_PROMPT_BINDING_EVENT_TYPE,
  FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/fixed-prompt-binding-runtime-module.js';
import {
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_REQUIRED_EVIDENCE_ID,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
  createProfileDeepSeekRunAndGunValidationPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/profile-deepseek-run-and-gun-validation-package.js';
import {
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/profile-deepseek-run-and-gun-validation-runtime-module.js';

describe('Gameplay capability package contract', () => {
  it('accepts a complete supported package and keeps hashes deterministic', () => {
    const contract = createPackageContract();
    const first = validateGameplayCapabilityPackage(contract);
    const second = validateGameplayCapabilityPackage(structuredClone(contract));

    expect(first.status).toBe('valid');
    expect(first.completeness).toBe('COMPLETE_SUPPORTED');
    expect(first.supportEligible).toBe(true);
    expect(first.manifestHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(first.packageHash).toBe(second.packageHash);
  });

  it('accepts the default straight single weapon package prerequisite contract', () => {
    const contract = createDefaultStraightSingleWeaponPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.default_straight_single.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.default_straight_single.v1',
      severity: 'required',
      observations: expect.arrayContaining([expect.objectContaining({ runtimeSystemId: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID })])
    });
  });

  it('accepts the weapon death reset package-owned QA contract', () => {
    const contract = createWeaponDeathResetPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === WEAPON_DEATH_RESET_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.death_reset.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: WEAPON_DEATH_RESET_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.death_reset.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
          parameters: expect.objectContaining({
            previousWeaponId: WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
            initialWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID,
          ref: WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE
        }),
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID,
          ref: WEAPON_DEATH_RESET_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the camera side follow package-owned QA contract', () => {
    const contract = createCameraSideFollowPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'camera.side_follow.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'camera.side_follow.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'camera_scroll', runtimeSystemId: CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID, ref: 'camera.side_follow.active' })]
    });
  });

  it('accepts the collision platform package-owned QA contract', () => {
    const contract = createCollisionPlatformPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COLLISION_PLATFORM_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'collision.platform.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COLLISION_PLATFORM_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COLLISION_PLATFORM_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'collision.platform.v1',
      severity: 'required',
      observations: [
        expect.objectContaining({ kind: 'state_probe', runtimeSystemId: COLLISION_PLATFORM_RUNTIME_SYSTEM_ID, ref: 'collision.platform.grounded' })
      ]
    });
  });

  it('accepts the combat projectile package-owned QA contract', () => {
    const contract = createCombatProjectilePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COMBAT_PROJECTILE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'combat.projectile.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'combat.projectile.v1',
      severity: 'required',
      observations: [expect.objectContaining({ runtimeSystemId: COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID, ref: 'projectile.spawned' })]
    });
  });

  it('accepts the combat airborne fire package-owned QA contract', () => {
    const contract = createCombatAirborneFirePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'combat.airborne_fire.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COMBAT_AIRBORNE_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'combat.airborne_fire.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: 'combat.airborne_fire.fired', parameters: expect.objectContaining({ airborne: true }) })],
      observations: [expect.objectContaining({ runtimeSystemId: COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID, ref: 'combat.airborne_fire.fired' })]
    });
  });

  it('accepts the movement run jump package-owned QA contract', () => {
    const contract = createMovementRunJumpPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'movement.run_jump.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'movement.run_jump.v1',
      severity: 'required',
      observations: [expect.objectContaining({ runtimeSystemId: MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID, ref: 'player.jumped' })]
    });
  });

  it('accepts the movement crouch package-owned QA contract', () => {
    const contract = createMovementCrouchPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === MOVEMENT_CROUCH_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'movement.crouch.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: MOVEMENT_CROUCH_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'movement.crouch.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: 'movement.crouch.entered',
          parameters: expect.objectContaining({ action: 'crouch', crouching: true, heightScale: MOVEMENT_CROUCH_HEIGHT_SCALE })
        })
      ],
      observations: [expect.objectContaining({ runtimeSystemId: MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID, ref: 'movement.crouch.entered' })]
    });
  });

  it('accepts the spawn static package-owned QA contract', () => {
    const contract = createSpawnStaticPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === SPAWN_STATIC_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'spawn.static.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([SPAWN_STATIC_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: SPAWN_STATIC_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'spawn.static.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'state_probe', runtimeSystemId: SPAWN_STATIC_RUNTIME_SYSTEM_ID, ref: 'spawn.static.triggered' })]
    });
  });

  it('accepts the spawn enemy wave package-owned QA contract with ordered gate evidence', () => {
    const contract = createSpawnEnemyWavePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'spawn.enemy_wave.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: SPAWN_ENEMY_WAVE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'spawn.enemy_wave.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'state_probe', runtimeSystemId: SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID, ref: SPAWN_ENEMY_WAVE_ORDERED_EVENT_TYPE })],
      assertions: [
        expect.objectContaining({
          id: `${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}.assertion.ordered_wave`,
          expected: { orderedWaveSequence: true, gateTriggered: true, waveSpawned: true, sequenceIndex: 0 }
        })
      ]
    });
  });

  it('accepts the health player health points package-owned QA contract', () => {
    const contract = createHealthPlayerHealthPointsPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'health.player_health_points.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'health.player_health_points.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'state_probe', runtimeSystemId: HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID, ref: 'health.player_health.current' })]
    });
  });

  it('accepts the health damage invulnerability package-owned QA contract', () => {
    const contract = createHealthDamageInvulnerabilityPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'health.damage_invulnerability.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: HEALTH_DAMAGE_INVULNERABILITY_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'health.damage_invulnerability.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: 'health.damage_invulnerability.blocked',
          parameters: expect.objectContaining({ invulnerable: true, damagePrevented: true })
        })
      ],
      observations: expect.arrayContaining([
        expect.objectContaining({ runtimeSystemId: HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID, ref: 'health.damage_invulnerability.activated' }),
        expect.objectContaining({ runtimeSystemId: HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID, ref: 'health.damage_invulnerability.blocked' })
      ]),
      assertions: expect.arrayContaining([
        expect.objectContaining({
          id: 'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.window_activated',
          observationId: 'health.damage_invulnerability.v1.window.browser_qa.v1.observation.window_activated'
        }),
        expect.objectContaining({
          id: 'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.damage_blocked',
          observationId: 'health.damage_invulnerability.v1.window.browser_qa.v1.observation.damage_blocked'
        })
      ])
    });
  });

  it('accepts the pickup collectible package-owned QA contract', () => {
    const contract = createPickupCollectiblePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'pickup.collectible.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: PICKUP_COLLECTIBLE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'pickup.collectible.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE,
          parameters: expect.objectContaining({ action: 'collect', pickupCollected: true, pickupConsumed: true, pickupStateChanged: true })
        })
      ],
      observations: expect.arrayContaining([
        expect.objectContaining({ runtimeSystemId: PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID, ref: PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE }),
        expect.objectContaining({ runtimeSystemId: PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID, ref: PICKUP_COLLECTIBLE_STATE_CHANGED_EVENT_TYPE })
      ]),
      assertions: expect.arrayContaining([
        expect.objectContaining({
          id: 'pickup.collectible.v1.collection.browser_qa.v1.assertion.collected',
          expected: { pickupCollected: true }
        }),
        expect.objectContaining({
          id: 'pickup.collectible.v1.collection.browser_qa.v1.assertion.state_changed',
          expected: { pickupConsumed: true, pickupStateChanged: true }
        })
      ])
    });
  });

  it('accepts the fixed prompt binding package-owned artifact QA contract', () => {
    const contract = createFixedPromptBindingPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'metadata.fixed_prompt_binding.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: FIXED_PROMPT_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'metadata.fixed_prompt_binding.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: FIXED_PROMPT_BINDING_EVENT_TYPE })],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID,
          ref: FIXED_PROMPT_BINDING_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the DeepSeek run-and-gun validation profile package-owned artifact QA contract', () => {
    const contract = createProfileDeepSeekRunAndGunValidationPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'profile.deepseek_run_and_gun_validation.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID]);
    expect(contract.dsl.ownedPaths).toEqual(['/profile/id', '/profile/runtime_family']);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'profile.deepseek_run_and_gun_validation.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE })],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID,
          ref: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE
        })
      ]
    });
  });

  it('does not let manifest.status supported bypass missing QA and evidence', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: { probes: [], requiredEvidence: [] }
    });

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PACKAGE_SCHEMA_INVALID'
        })
      ])
    );
  });

  it('rejects supported packages that parse but are not complete supported', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('movement.run_jump.v1.qa.optional', { severity: 'optional' })],
        requiredEvidence: [{ id: 'movement.run_jump.v1.evidence.optional', artifactKind: 'capability_qa_report', required: false }]
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
    expect(report.completeness).toBe('RUNTIME_WITHOUT_QA');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SUPPORTED_PACKAGE_INCOMPLETE'
        })
      ])
    );
  });

  it('rejects manifest capability version drift and extra arbitrary fields', () => {
    const versionDrift = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      manifest: { ...createPackageContract().manifest, capabilityVersion: 'v2' }
    });
    const arbitraryScript = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      runtime: {
        ...createPackageContract().runtime,
        systems: [{ ...createPackageContract().runtime.systems[0], script: 'Math.random()' }]
      }
    });

    expect(versionDrift.status).toBe('invalid');
    expect(versionDrift.issues.some((issue) => issue.path.endsWith('capabilityVersion'))).toBe(true);
    expect(arbitraryScript.status).toBe('invalid');
    expect(arbitraryScript.issues.some((issue) => issue.path.includes('runtime.systems.0'))).toBe(true);
  });

  it('rejects patch descriptors without owned paths or outside the package DSL ownership', () => {
    const emptyPatchPaths = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      patch: { descriptors: [{ id: 'movement.run_jump.v1.patch.move_speed', policy: 'warm_restart', ownedPaths: [] }] }
    });
    const outsidePatchPath = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      patch: { descriptors: [{ id: 'movement.run_jump.v1.patch.enemy_speed', policy: 'warm_restart', ownedPaths: ['/entities/components/enemy.speed'] }] }
    });

    expect(emptyPatchPaths.status).toBe('invalid');
    expect(emptyPatchPaths.issues.some((issue) => issue.path.includes('patch.descriptors.0.ownedPaths'))).toBe(true);
    expect(outsidePatchPath.status).toBe('invalid');
    expect(outsidePatchPath.issues.some((issue) => issue.path.includes('patch.descriptors.0.ownedPaths.0'))).toBe(true);
  });

  it('rejects non-json defaults and executable-looking defaults keys', () => {
    const functionDefault = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      defaults: { value: () => 1 }
    });
    const scriptKeyDefault = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      defaults: { nested: { script: 'Math.random()' } }
    });

    expect(functionDefault.status).toBe('invalid');
    expect(functionDefault.issues.some((issue) => issue.path.includes('defaults.value'))).toBe(true);
    expect(scriptKeyDefault.status).toBe('invalid');
    expect(scriptKeyDefault.issues.some((issue) => issue.path.includes('defaults.nested.script'))).toBe(true);
  });

  it('requires capability-owned QA probes and required evidence', () => {
    const foreignProbe = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('other.capability.v1.qa.required', { capabilityId: 'other.capability.v1' })],
        requiredEvidence: [{ id: 'movement.run_jump.v1.evidence.runtime', artifactKind: 'capability_qa_report', required: true }]
      }
    });
    const foreignEvidence = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('movement.run_jump.v1.qa.required')],
        requiredEvidence: [{ id: 'other.capability.v1.evidence.runtime', artifactKind: 'capability_qa_report', required: true }]
      }
    });

    expect(foreignProbe.status).toBe('invalid');
    expect(foreignProbe.issues.some((issue) => issue.path.includes('qa.probes.0.id'))).toBe(true);
    expect(foreignEvidence.status).toBe('invalid');
    expect(foreignEvidence.issues.some((issue) => issue.path.includes('qa.requiredEvidence.0.id'))).toBe(true);
  });

  it('rejects owned DSL path overlap across packages', () => {
    const first = createPackageContract();
    const second = createPackageContract({
      id: 'movement.wall_jump.v1',
      ownedPath: '/entities/components/movement.run_jump'
    });
    const report = validateGameplayCapabilityPackages([first, second]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OWNED_DSL_PATH_CONFLICT',
          path: 'dsl.ownedPaths'
        })
      ])
    );
  });

  it('rejects parent-child owned DSL path overlap across packages', () => {
    const first = createPackageContract({
      ownedPath: '/entities/components'
    });
    const second = createPackageContract({
      id: 'movement.wall_jump.v1',
      ownedPath: '/entities/components/movement.wall_jump'
    });
    const report = validateGameplayCapabilityPackages([first, second]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OWNED_DSL_PATH_CONFLICT'
        })
      ])
    );
  });

  it('rejects duplicate package IDs in a package set', () => {
    const report = validateGameplayCapabilityPackages([createPackageContract(), createPackageContract({ ownedPath: '/entities/components/movement.run_jump.alt' })]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUPLICATE_PACKAGE_ID',
          path: 'manifest.id'
        })
      ])
    );
  });

  it('keeps experimental complete packages out of production support eligibility', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      manifest: { ...createPackageContract().manifest, status: 'experimental' }
    });

    expect(report.status).toBe('valid');
    expect(report.completeness).toBe('COMPLETE_EXPERIMENTAL');
    expect(report.supportEligible).toBe(false);
  });
});

function createPackageContract(input: { id?: string; ownedPath?: string } = {}): GameplayCapabilityPackageContract {
  const id = input.id ?? 'movement.run_jump.v1';
  const ownedPath = input.ownedPath ?? '/entities/components/movement.run_jump';
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Run and jump movement capability.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: 'gameplay-capability-package.v1'
    },
    dsl: {
      schemaFragmentId: `${id}.schema`,
      ownedPaths: [ownedPath],
      normalizerId: `${id}.normalizer`,
      migrations: []
    },
    ir: {
      compilerId: `${id}.ir`,
      ownedNodeKinds: ['component.movement.run_jump']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: `${id}.system`, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'warm_restart' }],
      compilerId: `${id}.amendments`
    },
    patch: {
      descriptors: [{ id: `${id}.patch.move_speed`, policy: 'warm_restart', ownedPaths: [ownedPath] }]
    },
    qa: {
      probes: [createQaProbe(`${id}.qa.required`, { capabilityId: id, runtimeSystemId: `${id}.system`, message: 'player x increases after move input' })],
      requiredEvidence: [{ id: `${id}.evidence.runtime`, artifactKind: 'capability_qa_report', required: true }]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: `${id}.service`, version: 'v1' }],
    defaults: {},
    diagnostics: {}
  };
}

function createQaProbe(
  id: string,
  input: {
    capabilityId?: string;
    runtimeSystemId?: string;
    severity?: 'required' | 'optional';
    message?: string;
  } = {}
): GameplayCapabilityPackageContract['qa']['probes'][number] {
  const capabilityId = input.capabilityId ?? 'movement.run_jump.v1';
  const runtimeSystemId = input.runtimeSystemId ?? 'movement.run_jump.v1.system';
  return {
    id,
    capabilityId,
    severity: input.severity ?? 'required',
    prerequisites: ['runtime scene started'],
    actions: [{ id: `${id}.action.move_right`, kind: 'input', target: 'player', parameters: { control: 'right', durationMs: 240 } }],
    observations: [{ id: `${id}.observation.player_x`, kind: 'position_delta', runtimeSystemId, ref: 'player.x' }],
    assertions: [
      {
        id: `${id}.assertion.player_x_increased`,
        observationId: `${id}.observation.player_x`,
        comparator: 'increased',
        message: input.message ?? 'player x increases after move input'
      }
    ]
  };
}
