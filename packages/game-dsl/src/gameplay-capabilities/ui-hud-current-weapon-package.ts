import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  UI_HUD_CURRENT_WEAPON_CAPABILITY_ID,
  UI_HUD_CURRENT_WEAPON_EVENT_TYPE,
  UI_HUD_CURRENT_WEAPON_LABEL_TEXT,
  UI_HUD_CURRENT_WEAPON_PROFILE_ID,
  UI_HUD_CURRENT_WEAPON_RUNTIME_FAMILY,
  UI_HUD_CURRENT_WEAPON_RUNTIME_SYSTEM_ID,
  UI_HUD_CURRENT_WEAPON_SCHEMA_VERSION,
  UI_HUD_CURRENT_WEAPON_SLOT,
  UI_HUD_CURRENT_WEAPON_WEAPON_ID
} from './ui-hud-current-weapon-runtime-module.js';

export const UI_HUD_CURRENT_WEAPON_PACKAGE_VERSION = '1.0.0';
export const UI_HUD_CURRENT_WEAPON_REQUIRED_PROBE_ID = 'ui.hud_current_weapon.v1.current_weapon_hud.browser_qa.v1';
export const UI_HUD_CURRENT_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID =
  'ui.hud_current_weapon.v1.evidence.capability_qa_report.v1';

export function createUiHudCurrentWeaponPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: UI_HUD_CURRENT_WEAPON_CAPABILITY_ID,
      packageVersion: UI_HUD_CURRENT_WEAPON_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Current weapon HUD capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [UI_HUD_CURRENT_WEAPON_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'ui.hud_current_weapon.schema',
      ownedPaths: ['/ui/hud/currentWeapon', '/capability_configs/ui_hud_current_weapon'],
      normalizerId: 'ui.hud_current_weapon.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'ui.hud_current_weapon.ir',
      ownedNodeKinds: ['runtime_system.ui.hud_current_weapon']
    },
    runtime: {
      families: [UI_HUD_CURRENT_WEAPON_RUNTIME_FAMILY],
      systems: [
        {
          id: UI_HUD_CURRENT_WEAPON_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'feedback',
          dependencies: ['weapon.default_straight_single']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetCurrentWeaponHud:bind_to_current_weapon', executionPolicy: 'regeneration_required' }],
      compilerId: 'ui.hud_current_weapon.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'ui.hud_current_weapon.patch.current_weapon_hud',
          policy: 'regeneration_required',
          ownedPaths: ['/ui/hud/currentWeapon', '/capability_configs/ui_hud_current_weapon']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: UI_HUD_CURRENT_WEAPON_REQUIRED_PROBE_ID,
          capabilityId: UI_HUD_CURRENT_WEAPON_CAPABILITY_ID,
          prerequisites: [
            'default weapon package evidence is present for the current run',
            'player current weapon state is initialized',
            'HUD current-weapon component is visible',
            'HUD current-weapon value is bound to the current weapon state'
          ],
          actions: [
            {
              id: `${UI_HUD_CURRENT_WEAPON_REQUIRED_PROBE_ID}.action.verify_current_weapon_hud`,
              kind: 'runtime_event',
              target: UI_HUD_CURRENT_WEAPON_EVENT_TYPE,
              parameters: {
                weaponId: UI_HUD_CURRENT_WEAPON_WEAPON_ID,
                slot: UI_HUD_CURRENT_WEAPON_SLOT,
                labelText: UI_HUD_CURRENT_WEAPON_LABEL_TEXT
              }
            }
          ],
          observations: [
            {
              id: `${UI_HUD_CURRENT_WEAPON_REQUIRED_PROBE_ID}.observation.current_weapon_hud_state`,
              kind: 'state_probe',
              runtimeSystemId: UI_HUD_CURRENT_WEAPON_RUNTIME_SYSTEM_ID,
              ref: UI_HUD_CURRENT_WEAPON_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${UI_HUD_CURRENT_WEAPON_REQUIRED_PROBE_ID}.assertion.current_weapon_hud_verified`,
              observationId: `${UI_HUD_CURRENT_WEAPON_REQUIRED_PROBE_ID}.observation.current_weapon_hud_state`,
              comparator: 'exists',
              expected: {
                hudCurrentWeaponVisible: true,
                hudCurrentWeaponSchemaVersion: UI_HUD_CURRENT_WEAPON_SCHEMA_VERSION,
                hudCurrentWeaponProfileId: UI_HUD_CURRENT_WEAPON_PROFILE_ID,
                hudCurrentWeaponRuntimeFamily: UI_HUD_CURRENT_WEAPON_RUNTIME_FAMILY,
                hudCurrentWeaponWeaponId: UI_HUD_CURRENT_WEAPON_WEAPON_ID,
                hudCurrentWeaponExpectedWeaponId: UI_HUD_CURRENT_WEAPON_WEAPON_ID,
                hudCurrentWeaponSlot: UI_HUD_CURRENT_WEAPON_SLOT,
                hudCurrentWeaponLabelVisible: true,
                hudCurrentWeaponLabelText: UI_HUD_CURRENT_WEAPON_LABEL_TEXT,
                hudCurrentWeaponIconVisible: true,
                hudCurrentWeaponBoundToWeaponState: true,
                hudCurrentWeaponMatchesCurrentWeapon: true
              },
              message: 'current weapon HUD evidence verifies visible HUD state bound to the current weapon state'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: UI_HUD_CURRENT_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'weapon.default_straight_single.v1', range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'ui.hud_current_weapon.service', version: 'v1' }],
    defaults: {
      currentWeaponId: UI_HUD_CURRENT_WEAPON_WEAPON_ID,
      slot: UI_HUD_CURRENT_WEAPON_SLOT,
      labelText: UI_HUD_CURRENT_WEAPON_LABEL_TEXT,
      hudEvent: UI_HUD_CURRENT_WEAPON_EVENT_TYPE,
      requiredStateFields: [
        'hudCurrentWeaponVisible',
        'hudCurrentWeaponSchemaVersion',
        'hudCurrentWeaponProfileId',
        'hudCurrentWeaponRuntimeFamily',
        'hudCurrentWeaponWeaponId',
        'hudCurrentWeaponExpectedWeaponId',
        'hudCurrentWeaponSlot',
        'hudCurrentWeaponLabelVisible',
        'hudCurrentWeaponLabelText',
        'hudCurrentWeaponIconVisible',
        'hudCurrentWeaponBoundToWeaponState',
        'hudCurrentWeaponMatchesCurrentWeapon'
      ]
    },
    diagnostics: {
      source: 'stage37.ui_hud_current_weapon_package_slice'
    }
  };
}
