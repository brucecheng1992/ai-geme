import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  WEAPON_REPLACEMENT_RULE_CAPABILITY_ID,
  WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID
} from './weapon-replacement-rule-runtime-module.js';

export const WEAPON_REPLACEMENT_RULE_PACKAGE_VERSION = '1.0.0';
export const WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID = 'weapon.replacement_rule.v1.replace.browser_qa.v1';
export const WEAPON_REPLACEMENT_RULE_PACKAGE_REQUIRED_EVIDENCE_ID = 'weapon.replacement_rule.v1.evidence.capability_qa_report.v1';

export function createWeaponReplacementRulePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: WEAPON_REPLACEMENT_RULE_CAPABILITY_ID,
      packageVersion: WEAPON_REPLACEMENT_RULE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Weapon pickup replacement rule capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'weapon.replacement_rule.schema',
      ownedPaths: ['/capability_configs/weapon_replacement_rule'],
      normalizerId: 'weapon.replacement_rule.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'weapon.replacement_rule.ir',
      ownedNodeKinds: ['runtime_system.weapon.replacement_rule']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['pickup.collectible', 'weapon.default_straight_single', 'weapon.rapid_fire']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetWeaponPickupReplacementRule:replace_current', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'weapon.replacement_rule.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'weapon.replacement_rule.patch.replace_current',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/weapon_replacement_rule']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
          capabilityId: WEAPON_REPLACEMENT_RULE_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'player has the previous weapon equipped',
            'weapon pickup is collectable',
            'replacement weapon is configured'
          ],
          actions: [
            {
              id: `${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}.action.collect_weapon_pickup`,
              kind: 'runtime_event',
              target: WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
              parameters: {
                ownerEntityId: 'player',
                action: 'collect_weapon_pickup',
                previousWeaponId: WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
                replacementWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID
              }
            }
          ],
          observations: [
            {
              id: `${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}.observation.pickup_collected`,
              kind: 'runtime_event',
              runtimeSystemId: WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID,
              ref: WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE
            },
            {
              id: `${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}.observation.replaced_weapon`,
              kind: 'state_probe',
              runtimeSystemId: WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID,
              ref: WEAPON_REPLACEMENT_RULE_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}.assertion.pickup_collected`,
              observationId: `${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}.observation.pickup_collected`,
              comparator: 'exists',
              expected: {
                pickupCollected: true
              },
              message: 'weapon replacement rule observes weapon pickup collection'
            },
            {
              id: `${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}.assertion.replaced_weapon`,
              observationId: `${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}.observation.replaced_weapon`,
              comparator: 'exists',
              expected: {
                weaponReplaced: true,
                previousWeaponId: WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
                currentWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
                replacementWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID
              },
              message: 'weapon replacement rule observes current weapon replacement after pickup'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: WEAPON_REPLACEMENT_RULE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [
      { capabilityId: 'pickup.collectible.v1', range: '^1.0.0' },
      { capabilityId: 'weapon.default_straight_single.v1', range: '^1.0.0' },
      { capabilityId: 'weapon.rapid_fire.v1', range: '^1.0.0' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'weapon.replacement_rule.service', version: 'v1' }],
    defaults: {
      replacementPolicy: 'replace_current',
      pickupEvent: WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      replacementEvent: WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
      previousWeaponId: WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
      replacementWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
      requiredStateFields: ['pickupCollected', 'weaponReplaced', 'previousWeaponId', 'currentWeaponId', 'replacementWeaponId']
    },
    diagnostics: {
      source: 'stage37.weapon_replacement_rule_package_owned_qa_slice'
    }
  };
}
