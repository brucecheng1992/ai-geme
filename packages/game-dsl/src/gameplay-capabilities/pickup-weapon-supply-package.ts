import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  PICKUP_WEAPON_SUPPLY_CAPABILITY_ID,
  PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
  PICKUP_WEAPON_SUPPLY_NODE_ID,
  PICKUP_WEAPON_SUPPLY_PICKUP_ID,
  PICKUP_WEAPON_SUPPLY_RUNTIME_SYSTEM_ID,
  PICKUP_WEAPON_SUPPLY_WEAPON_ID
} from './pickup-weapon-supply-runtime-module.js';

export const PICKUP_WEAPON_SUPPLY_PACKAGE_VERSION = '1.0.0';
export const PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID = 'pickup.weapon_supply.v1.supply.browser_qa.v1';
export const PICKUP_WEAPON_SUPPLY_PACKAGE_REQUIRED_EVIDENCE_ID = 'pickup.weapon_supply.v1.evidence.capability_qa_report.v1';

export function createPickupWeaponSupplyPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: PICKUP_WEAPON_SUPPLY_CAPABILITY_ID,
      packageVersion: PICKUP_WEAPON_SUPPLY_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Weapon supply pickup capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'pickup.weapon_supply.schema',
      ownedPaths: ['/capability_configs/weapon_supply_node'],
      normalizerId: 'pickup.weapon_supply.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'pickup.weapon_supply.ir',
      ownedNodeKinds: ['runtime_system.pickup.weapon_supply']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: PICKUP_WEAPON_SUPPLY_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['pickup.collectible', 'weapon.default_straight_single']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetWeaponSupply:node_grant', executionPolicy: 'regeneration_required' }],
      compilerId: 'pickup.weapon_supply.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'pickup.weapon_supply.patch.node_grant',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/weapon_supply_node']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
          capabilityId: PICKUP_WEAPON_SUPPLY_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'weapon supply node is configured',
            'player collects the supply pickup',
            'weapon grant state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}.action.collect_weapon_supply`,
              kind: 'runtime_event',
              target: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
              parameters: {
                supplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
                pickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
                weaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
                action: 'collect_weapon_supply'
              }
            }
          ],
          observations: [
            {
              id: `${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}.observation.weapon_supply_state`,
              kind: 'runtime_event',
              runtimeSystemId: PICKUP_WEAPON_SUPPLY_RUNTIME_SYSTEM_ID,
              ref: PICKUP_WEAPON_SUPPLY_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}.assertion.weapon_supply_verified`,
              observationId: `${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}.observation.weapon_supply_state`,
              comparator: 'exists',
              expected: {
                weaponSupplyAvailable: true,
                weaponSupplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
                weaponSupplyPickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
                weaponSupplyWeaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
                weaponSupplyCollected: true,
                weaponSupplyConsumed: true,
                weaponSupplyGranted: true
              },
              message: 'weapon supply evidence verifies that collecting the configured supply pickup grants the expected weapon'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: PICKUP_WEAPON_SUPPLY_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [
      { capabilityId: 'pickup.collectible.v1', range: '^v1' },
      { capabilityId: 'weapon.default_straight_single.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'pickup.weapon_supply.service', version: 'v1' }],
    defaults: {
      supplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
      pickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
      weaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
      supplyEvent: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
      requiredStateFields: [
        'weaponSupplyAvailable',
        'weaponSupplyNodeId',
        'weaponSupplyPickupId',
        'weaponSupplyWeaponId',
        'weaponSupplyCollected',
        'weaponSupplyConsumed',
        'weaponSupplyGranted'
      ]
    },
    diagnostics: {
      source: 'stage37.pickup_weapon_supply_package_slice'
    }
  };
}
