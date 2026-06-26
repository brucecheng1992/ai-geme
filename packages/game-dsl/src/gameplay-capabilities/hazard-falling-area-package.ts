import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  HAZARD_FALLING_AREA_BOSS_PHASE_ID,
  HAZARD_FALLING_AREA_CAPABILITY_ID,
  HAZARD_FALLING_AREA_DAMAGE,
  HAZARD_FALLING_AREA_EVENT_TYPE,
  HAZARD_FALLING_AREA_HAZARD_ID,
  HAZARD_FALLING_AREA_PATTERN_ID,
  HAZARD_FALLING_AREA_RUNTIME_SYSTEM_ID,
  HAZARD_FALLING_AREA_TELEGRAPH_MS
} from './hazard-falling-area-runtime-module.js';

export const HAZARD_FALLING_AREA_PACKAGE_VERSION = '1.0.0';
export const HAZARD_FALLING_AREA_REQUIRED_PROBE_ID = 'hazard.falling_area.v1.area.browser_qa.v1';
export const HAZARD_FALLING_AREA_PACKAGE_REQUIRED_EVIDENCE_ID = 'hazard.falling_area.v1.evidence.capability_qa_report.v1';

export function createHazardFallingAreaPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: HAZARD_FALLING_AREA_CAPABILITY_ID,
      packageVersion: HAZARD_FALLING_AREA_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Boss phase-2 falling hazard area capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'hazard.falling_area.schema',
      ownedPaths: ['/capability_configs/falling_area_hazard'],
      normalizerId: 'hazard.falling_area.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'hazard.falling_area.ir',
      ownedNodeKinds: ['runtime_system.hazard.falling_area']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: HAZARD_FALLING_AREA_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['enemy.boss_phase_transition', 'collision.damage_affinity_matrix']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetFallingAreaHazard:phase2_from_above', executionPolicy: 'regeneration_required' }],
      compilerId: 'hazard.falling_area.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'hazard.falling_area.patch.phase2_from_above',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/falling_area_hazard']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
          capabilityId: HAZARD_FALLING_AREA_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'boss phase 2 hazard attack pattern is active',
            'falling hazard area state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}.action.verify_falling_area`,
              kind: 'runtime_event',
              target: HAZARD_FALLING_AREA_EVENT_TYPE,
              parameters: {
                hazardId: HAZARD_FALLING_AREA_HAZARD_ID,
                bossPhaseId: HAZARD_FALLING_AREA_BOSS_PHASE_ID,
                patternId: HAZARD_FALLING_AREA_PATTERN_ID,
                dropsFromAbove: true,
                damage: HAZARD_FALLING_AREA_DAMAGE
              }
            }
          ],
          observations: [
            {
              id: `${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}.observation.falling_area_state`,
              kind: 'runtime_event',
              runtimeSystemId: HAZARD_FALLING_AREA_RUNTIME_SYSTEM_ID,
              ref: HAZARD_FALLING_AREA_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}.assertion.falling_area_verified`,
              observationId: `${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}.observation.falling_area_state`,
              comparator: 'exists',
              expected: {
                fallingAreaActive: true,
                fallingAreaHazardId: HAZARD_FALLING_AREA_HAZARD_ID,
                fallingAreaBossPhaseId: HAZARD_FALLING_AREA_BOSS_PHASE_ID,
                fallingAreaPatternId: HAZARD_FALLING_AREA_PATTERN_ID,
                fallingAreaDropsFromAbove: true,
                fallingAreaArmed: true,
                fallingAreaDamagesPlayer: true,
                fallingAreaDamage: HAZARD_FALLING_AREA_DAMAGE,
                fallingAreaTelegraphMs: HAZARD_FALLING_AREA_TELEGRAPH_MS
              },
              message: 'falling hazard area evidence verifies phase-2 hazards drop from above and damage the player'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: HAZARD_FALLING_AREA_PACKAGE_REQUIRED_EVIDENCE_ID,
          artifactKind: 'capability_qa_report',
          required: true
        }
      ]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'hazard.falling_area.service', version: 'v1' }],
    defaults: {
      hazardId: HAZARD_FALLING_AREA_HAZARD_ID,
      bossPhaseId: HAZARD_FALLING_AREA_BOSS_PHASE_ID,
      patternId: HAZARD_FALLING_AREA_PATTERN_ID,
      telegraphMs: HAZARD_FALLING_AREA_TELEGRAPH_MS,
      damage: HAZARD_FALLING_AREA_DAMAGE,
      fallingAreaEvent: HAZARD_FALLING_AREA_EVENT_TYPE,
      requiredStateFields: [
        'fallingAreaActive',
        'fallingAreaHazardId',
        'fallingAreaBossPhaseId',
        'fallingAreaPatternId',
        'fallingAreaDropsFromAbove',
        'fallingAreaArmed',
        'fallingAreaDamagesPlayer',
        'fallingAreaDamage',
        'fallingAreaTelegraphMs'
      ]
    },
    diagnostics: {
      source: 'stage37.hazard_falling_area_package_slice'
    }
  };
}
