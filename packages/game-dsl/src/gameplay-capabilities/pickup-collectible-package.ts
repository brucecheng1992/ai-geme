import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  PICKUP_COLLECTIBLE_CAPABILITY_ID,
  PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE,
  PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID,
  PICKUP_COLLECTIBLE_SOURCE_REF,
  PICKUP_COLLECTIBLE_STATE_CHANGED_EVENT_TYPE
} from './pickup-collectible-runtime-module.js';

export const PICKUP_COLLECTIBLE_PACKAGE_VERSION = '1.0.0';
export const PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID = 'pickup.collectible.v1.collection.browser_qa.v1';
export const PICKUP_COLLECTIBLE_PACKAGE_REQUIRED_EVIDENCE_ID = 'pickup.collectible.v1.evidence.capability_qa_report.v1';

export function createPickupCollectiblePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: PICKUP_COLLECTIBLE_CAPABILITY_ID,
      packageVersion: PICKUP_COLLECTIBLE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Pickup collection capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'pickup.collectible.schema',
      ownedPaths: ['/pickups'],
      normalizerId: 'pickup.collectible.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'pickup.collectible.ir',
      ownedNodeKinds: ['runtime_system.pickup.collectible']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: ['collision.platform'] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetPickupCollectible:collection_policy', executionPolicy: 'warm_restart' }],
      compilerId: 'pickup.collectible.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'pickup.collectible.patch.collection_policy',
          policy: 'warm_restart',
          ownedPaths: ['/pickups']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
          capabilityId: PICKUP_COLLECTIBLE_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player overlaps an active pickup', 'pickup collection mutates runtime state'],
          actions: [
            {
              id: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.action.collect`,
              kind: 'runtime_event',
              target: PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE,
              parameters: {
                ownerEntityId: 'player',
                action: 'collect',
                pickupCollected: true,
                pickupConsumed: true,
                pickupStateChanged: true
              }
            }
          ],
          observations: [
            {
              id: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.observation.collected`,
              kind: 'runtime_event',
              runtimeSystemId: PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID,
              ref: PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE
            },
            {
              id: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.observation.state_changed`,
              kind: 'state_probe',
              runtimeSystemId: PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID,
              ref: PICKUP_COLLECTIBLE_STATE_CHANGED_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.assertion.collected`,
              observationId: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.observation.collected`,
              comparator: 'exists',
              expected: { pickupCollected: true },
              message: 'pickup collectible package observes the player collect an active pickup'
            },
            {
              id: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.assertion.state_changed`,
              observationId: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.observation.state_changed`,
              comparator: 'exists',
              expected: { pickupConsumed: true, pickupStateChanged: true },
              message: 'pickup collectible package observes pickup consumption and resulting runtime state change'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: PICKUP_COLLECTIBLE_PACKAGE_REQUIRED_EVIDENCE_ID,
          artifactKind: 'capability_qa_report',
          required: true
        }
      ]
    },
    render: {
      assetRoles: [{ role: 'pickup', required: false }],
      sceneBindings: [],
      fallbackPolicy: 'optional_assets_allowed'
    },
    dependencies: [{ capabilityId: 'collision.platform.v1', range: '^1.0.0' }],
    optionalDependencies: [{ capabilityId: 'health.player_health_points.v1', range: '^1.0.0' }],
    conflictsWith: [],
    provides: [{ id: 'pickup.collectible.service', version: 'v1' }],
    defaults: {
      collectedEvent: PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE,
      stateChangedEvent: PICKUP_COLLECTIBLE_STATE_CHANGED_EVENT_TYPE,
      sourceRef: PICKUP_COLLECTIBLE_SOURCE_REF,
      requiredStateFields: ['pickupCollected', 'pickupConsumed', 'pickupStateChanged']
    },
    diagnostics: {
      source: 'stage37.pickup_collectible_package_owned_qa_slice'
    }
  };
}
