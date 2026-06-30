import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  UI_HUD_PLAYER_HEALTH_CAPABILITY_ID,
  UI_HUD_PLAYER_HEALTH_CURRENT,
  UI_HUD_PLAYER_HEALTH_EVENT_TYPE,
  UI_HUD_PLAYER_HEALTH_LABEL_TEXT,
  UI_HUD_PLAYER_HEALTH_MAX,
  UI_HUD_PLAYER_HEALTH_PROFILE_ID,
  UI_HUD_PLAYER_HEALTH_RATIO,
  UI_HUD_PLAYER_HEALTH_RUNTIME_FAMILY,
  UI_HUD_PLAYER_HEALTH_RUNTIME_SYSTEM_ID,
  UI_HUD_PLAYER_HEALTH_SCHEMA_VERSION
} from './ui-hud-player-health-runtime-module.js';

export const UI_HUD_PLAYER_HEALTH_PACKAGE_VERSION = '1.0.0';
export const UI_HUD_PLAYER_HEALTH_REQUIRED_PROBE_ID = 'ui.hud_player_health.v1.player_health_hud.browser_qa.v1';
export const UI_HUD_PLAYER_HEALTH_PACKAGE_REQUIRED_EVIDENCE_ID = 'ui.hud_player_health.v1.evidence.capability_qa_report.v1';

export function createUiHudPlayerHealthPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: UI_HUD_PLAYER_HEALTH_CAPABILITY_ID,
      packageVersion: UI_HUD_PLAYER_HEALTH_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Player health HUD capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [UI_HUD_PLAYER_HEALTH_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'ui.hud_player_health.schema',
      ownedPaths: ['/ui/hud/playerHealth', '/capability_configs/ui_hud_player_health'],
      normalizerId: 'ui.hud_player_health.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'ui.hud_player_health.ir',
      ownedNodeKinds: ['runtime_system.ui.hud_player_health']
    },
    runtime: {
      families: [UI_HUD_PLAYER_HEALTH_RUNTIME_FAMILY],
      systems: [
        {
          id: UI_HUD_PLAYER_HEALTH_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'feedback',
          dependencies: ['health.player_health_points']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetPlayerHealthHud:bind_to_player_health', executionPolicy: 'regeneration_required' }],
      compilerId: 'ui.hud_player_health.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'ui.hud_player_health.patch.player_health_hud',
          policy: 'regeneration_required',
          ownedPaths: ['/ui/hud/playerHealth', '/capability_configs/ui_hud_player_health']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: UI_HUD_PLAYER_HEALTH_REQUIRED_PROBE_ID,
          capabilityId: UI_HUD_PLAYER_HEALTH_CAPABILITY_ID,
          prerequisites: [
            'player health points package evidence is present for the current run',
            'player entity health is initialized',
            'HUD player-health component is visible',
            'HUD current/max health is bound to the player health state'
          ],
          actions: [
            {
              id: `${UI_HUD_PLAYER_HEALTH_REQUIRED_PROBE_ID}.action.verify_player_health_hud`,
              kind: 'runtime_event',
              target: UI_HUD_PLAYER_HEALTH_EVENT_TYPE,
              parameters: {
                ownerEntityId: 'player',
                labelText: UI_HUD_PLAYER_HEALTH_LABEL_TEXT,
                currentHealth: UI_HUD_PLAYER_HEALTH_CURRENT,
                maxHealth: UI_HUD_PLAYER_HEALTH_MAX,
                ratio: UI_HUD_PLAYER_HEALTH_RATIO
              }
            }
          ],
          observations: [
            {
              id: `${UI_HUD_PLAYER_HEALTH_REQUIRED_PROBE_ID}.observation.player_health_hud_state`,
              kind: 'state_probe',
              runtimeSystemId: UI_HUD_PLAYER_HEALTH_RUNTIME_SYSTEM_ID,
              ref: UI_HUD_PLAYER_HEALTH_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${UI_HUD_PLAYER_HEALTH_REQUIRED_PROBE_ID}.assertion.player_health_hud_verified`,
              observationId: `${UI_HUD_PLAYER_HEALTH_REQUIRED_PROBE_ID}.observation.player_health_hud_state`,
              comparator: 'exists',
              expected: {
                hudPlayerHealthVisible: true,
                hudPlayerHealthSchemaVersion: UI_HUD_PLAYER_HEALTH_SCHEMA_VERSION,
                hudPlayerHealthProfileId: UI_HUD_PLAYER_HEALTH_PROFILE_ID,
                hudPlayerHealthRuntimeFamily: UI_HUD_PLAYER_HEALTH_RUNTIME_FAMILY,
                hudPlayerHealthOwnerEntityId: 'player',
                hudPlayerHealthCurrent: UI_HUD_PLAYER_HEALTH_CURRENT,
                hudPlayerHealthMax: UI_HUD_PLAYER_HEALTH_MAX,
                hudPlayerHealthRatio: UI_HUD_PLAYER_HEALTH_RATIO,
                hudPlayerHealthLabelVisible: true,
                hudPlayerHealthLabelText: UI_HUD_PLAYER_HEALTH_LABEL_TEXT,
                hudPlayerHealthBarVisible: true,
                hudPlayerHealthBarValueMatchesPlayerHealth: true,
                hudPlayerHealthBoundToPlayerHealth: true,
                hudPlayerHealthUpdatesOnDamage: true
              },
              message:
                'player health HUD evidence verifies visible HUD state, player health binding, current/max health, ratio, label, and damage updates'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: UI_HUD_PLAYER_HEALTH_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'health.player_health_points.v1', range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'ui.hud_player_health.service', version: 'v1' }],
    defaults: {
      ownerEntityId: 'player',
      currentHealth: UI_HUD_PLAYER_HEALTH_CURRENT,
      maxHealth: UI_HUD_PLAYER_HEALTH_MAX,
      ratio: UI_HUD_PLAYER_HEALTH_RATIO,
      labelText: UI_HUD_PLAYER_HEALTH_LABEL_TEXT,
      hudEvent: UI_HUD_PLAYER_HEALTH_EVENT_TYPE,
      requiredStateFields: [
        'hudPlayerHealthVisible',
        'hudPlayerHealthSchemaVersion',
        'hudPlayerHealthProfileId',
        'hudPlayerHealthRuntimeFamily',
        'hudPlayerHealthOwnerEntityId',
        'hudPlayerHealthCurrent',
        'hudPlayerHealthMax',
        'hudPlayerHealthRatio',
        'hudPlayerHealthLabelVisible',
        'hudPlayerHealthLabelText',
        'hudPlayerHealthBarVisible',
        'hudPlayerHealthBarValueMatchesPlayerHealth',
        'hudPlayerHealthBoundToPlayerHealth',
        'hudPlayerHealthUpdatesOnDamage'
      ]
    },
    diagnostics: {
      source: 'stage37.ui_hud_player_health_package_slice'
    }
  };
}
