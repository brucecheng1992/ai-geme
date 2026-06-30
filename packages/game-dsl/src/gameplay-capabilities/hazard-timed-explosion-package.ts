import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  HAZARD_TIMED_EXPLOSION_CAPABILITY_ID,
  HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
  HAZARD_TIMED_EXPLOSION_DAMAGE,
  HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
  HAZARD_TIMED_EXPLOSION_HAZARD_ID,
  HAZARD_TIMED_EXPLOSION_RADIUS,
  HAZARD_TIMED_EXPLOSION_RUNTIME_SYSTEM_ID,
  HAZARD_TIMED_EXPLOSION_TIMER_ID,
  HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION
} from './hazard-timed-explosion-runtime-module.js';

export const HAZARD_TIMED_EXPLOSION_PACKAGE_VERSION = '1.0.0';
export const HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID = 'hazard.timed_explosion.v1.explosion.browser_qa.v1';
export const HAZARD_TIMED_EXPLOSION_PACKAGE_REQUIRED_EVIDENCE_ID = 'hazard.timed_explosion.v1.evidence.capability_qa_report.v1';

export function createHazardTimedExplosionPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: HAZARD_TIMED_EXPLOSION_CAPABILITY_ID,
      packageVersion: HAZARD_TIMED_EXPLOSION_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Timed explosion hazard capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'hazard.timed_explosion.schema',
      ownedPaths: ['/capability_configs/timed_explosion_hazard'],
      normalizerId: 'hazard.timed_explosion.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'hazard.timed_explosion.ir',
      ownedNodeKinds: ['runtime_system.hazard.timed_explosion']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: HAZARD_TIMED_EXPLOSION_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['collision.damage_affinity_matrix']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetTimedExplosionHazard:countdown_trigger', executionPolicy: 'regeneration_required' }],
      compilerId: 'hazard.timed_explosion.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'hazard.timed_explosion.patch.countdown_trigger',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/timed_explosion_hazard']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
          capabilityId: HAZARD_TIMED_EXPLOSION_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'timed explosion hazard is armed',
            'countdown-triggered explosion state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}.action.verify_timed_explosion`,
              kind: 'runtime_event',
              target: HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
              parameters: {
                hazardId: HAZARD_TIMED_EXPLOSION_HAZARD_ID,
                timerId: HAZARD_TIMED_EXPLOSION_TIMER_ID,
                countdownMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
                triggerCondition: HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
                damage: HAZARD_TIMED_EXPLOSION_DAMAGE,
                radius: HAZARD_TIMED_EXPLOSION_RADIUS
              }
            }
          ],
          observations: [
            {
              id: `${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}.observation.timed_explosion_state`,
              kind: 'runtime_event',
              runtimeSystemId: HAZARD_TIMED_EXPLOSION_RUNTIME_SYSTEM_ID,
              ref: HAZARD_TIMED_EXPLOSION_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}.assertion.timed_explosion_verified`,
              observationId: `${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}.observation.timed_explosion_state`,
              comparator: 'exists',
              expected: {
                timedExplosionActive: true,
                timedExplosionHazardId: HAZARD_TIMED_EXPLOSION_HAZARD_ID,
                timedExplosionTimerId: HAZARD_TIMED_EXPLOSION_TIMER_ID,
                timedExplosionCountdownMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
                timedExplosionElapsedMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
                timedExplosionTriggerCondition: HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
                timedExplosionTriggeredByTimer: true,
                timedExplosionOccurred: true,
                timedExplosionDamagesPlayer: true,
                timedExplosionDamage: HAZARD_TIMED_EXPLOSION_DAMAGE,
                timedExplosionRadius: HAZARD_TIMED_EXPLOSION_RADIUS
              },
              message: 'timed explosion evidence verifies the countdown condition caused the damaging explosion'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: HAZARD_TIMED_EXPLOSION_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'hazard.timed_explosion.service', version: 'v1' }],
    defaults: {
      hazardId: HAZARD_TIMED_EXPLOSION_HAZARD_ID,
      timerId: HAZARD_TIMED_EXPLOSION_TIMER_ID,
      countdownMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
      triggerCondition: HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
      damage: HAZARD_TIMED_EXPLOSION_DAMAGE,
      radius: HAZARD_TIMED_EXPLOSION_RADIUS,
      timedExplosionEvent: HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      requiredStateFields: [
        'timedExplosionActive',
        'timedExplosionHazardId',
        'timedExplosionTimerId',
        'timedExplosionCountdownMs',
        'timedExplosionElapsedMs',
        'timedExplosionTriggerCondition',
        'timedExplosionTriggeredByTimer',
        'timedExplosionOccurred',
        'timedExplosionDamagesPlayer',
        'timedExplosionDamage',
        'timedExplosionRadius'
      ]
    },
    diagnostics: {
      source: 'stage37.hazard_timed_explosion_package_slice'
    }
  };
}
