import {
  ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
  ENEMY_BOSS_LIFECYCLE_MAX_HEALTH
} from './enemy-boss-lifecycle-runtime-module.js';
import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  UI_HUD_BOSS_HEALTH_CAPABILITY_ID,
  UI_HUD_BOSS_HEALTH_CURRENT,
  UI_HUD_BOSS_HEALTH_EVENT_TYPE,
  UI_HUD_BOSS_HEALTH_LABEL_TEXT,
  UI_HUD_BOSS_HEALTH_PROFILE_ID,
  UI_HUD_BOSS_HEALTH_RATIO,
  UI_HUD_BOSS_HEALTH_RUNTIME_FAMILY,
  UI_HUD_BOSS_HEALTH_RUNTIME_SYSTEM_ID,
  UI_HUD_BOSS_HEALTH_SCHEMA_VERSION
} from './ui-hud-boss-health-runtime-module.js';

export const UI_HUD_BOSS_HEALTH_PACKAGE_VERSION = '1.0.0';
export const UI_HUD_BOSS_HEALTH_REQUIRED_PROBE_ID = 'ui.hud_boss_health.v1.boss_health_hud.browser_qa.v1';
export const UI_HUD_BOSS_HEALTH_PACKAGE_REQUIRED_EVIDENCE_ID = 'ui.hud_boss_health.v1.evidence.capability_qa_report.v1';

export function createUiHudBossHealthPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: UI_HUD_BOSS_HEALTH_CAPABILITY_ID,
      packageVersion: UI_HUD_BOSS_HEALTH_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Boss health HUD capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [UI_HUD_BOSS_HEALTH_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'ui.hud_boss_health.schema',
      ownedPaths: ['/ui/hud/bossHealth', '/capability_configs/ui_hud_boss_health'],
      normalizerId: 'ui.hud_boss_health.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'ui.hud_boss_health.ir',
      ownedNodeKinds: ['runtime_system.ui.hud_boss_health']
    },
    runtime: {
      families: [UI_HUD_BOSS_HEALTH_RUNTIME_FAMILY],
      systems: [
        {
          id: UI_HUD_BOSS_HEALTH_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'feedback',
          dependencies: ['enemy.boss_lifecycle']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetBossHealthHud:bind_to_boss_lifecycle', executionPolicy: 'regeneration_required' }],
      compilerId: 'ui.hud_boss_health.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'ui.hud_boss_health.patch.boss_health_hud',
          policy: 'regeneration_required',
          ownedPaths: ['/ui/hud/bossHealth', '/capability_configs/ui_hud_boss_health']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: UI_HUD_BOSS_HEALTH_REQUIRED_PROBE_ID,
          capabilityId: UI_HUD_BOSS_HEALTH_CAPABILITY_ID,
          prerequisites: [
            'boss lifecycle package evidence is present for the current run',
            'boss entity health is initialized',
            'HUD boss-health component is visible during the boss encounter',
            'HUD current/max health is bound to the boss lifecycle state'
          ],
          actions: [
            {
              id: `${UI_HUD_BOSS_HEALTH_REQUIRED_PROBE_ID}.action.verify_boss_health_hud`,
              kind: 'runtime_event',
              target: UI_HUD_BOSS_HEALTH_EVENT_TYPE,
              parameters: {
                bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
                labelText: UI_HUD_BOSS_HEALTH_LABEL_TEXT,
                currentHealth: UI_HUD_BOSS_HEALTH_CURRENT,
                maxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
                ratio: UI_HUD_BOSS_HEALTH_RATIO
              }
            }
          ],
          observations: [
            {
              id: `${UI_HUD_BOSS_HEALTH_REQUIRED_PROBE_ID}.observation.boss_health_hud_state`,
              kind: 'state_probe',
              runtimeSystemId: UI_HUD_BOSS_HEALTH_RUNTIME_SYSTEM_ID,
              ref: UI_HUD_BOSS_HEALTH_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${UI_HUD_BOSS_HEALTH_REQUIRED_PROBE_ID}.assertion.boss_health_hud_verified`,
              observationId: `${UI_HUD_BOSS_HEALTH_REQUIRED_PROBE_ID}.observation.boss_health_hud_state`,
              comparator: 'exists',
              expected: {
                hudBossHealthVisible: true,
                hudBossHealthSchemaVersion: UI_HUD_BOSS_HEALTH_SCHEMA_VERSION,
                hudBossHealthProfileId: UI_HUD_BOSS_HEALTH_PROFILE_ID,
                hudBossHealthRuntimeFamily: UI_HUD_BOSS_HEALTH_RUNTIME_FAMILY,
                hudBossHealthBossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
                hudBossHealthCurrent: UI_HUD_BOSS_HEALTH_CURRENT,
                hudBossHealthMax: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
                hudBossHealthRatio: UI_HUD_BOSS_HEALTH_RATIO,
                hudBossHealthLabelVisible: true,
                hudBossHealthLabelText: UI_HUD_BOSS_HEALTH_LABEL_TEXT,
                hudBossHealthBarVisible: true,
                hudBossHealthBarValueMatchesBoss: true,
                hudBossHealthBoundToBossLifecycle: true,
                hudBossHealthUpdatesOnDamage: true
              },
              message:
                'boss health HUD evidence verifies visible HUD state, boss entity binding, current/max health, ratio, label, and damage updates'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: UI_HUD_BOSS_HEALTH_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'enemy.boss_lifecycle.v1', range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'ui.hud_boss_health.service', version: 'v1' }],
    defaults: {
      bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
      currentHealth: UI_HUD_BOSS_HEALTH_CURRENT,
      maxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
      ratio: UI_HUD_BOSS_HEALTH_RATIO,
      labelText: UI_HUD_BOSS_HEALTH_LABEL_TEXT,
      hudEvent: UI_HUD_BOSS_HEALTH_EVENT_TYPE,
      requiredStateFields: [
        'hudBossHealthVisible',
        'hudBossHealthSchemaVersion',
        'hudBossHealthProfileId',
        'hudBossHealthRuntimeFamily',
        'hudBossHealthBossEntityId',
        'hudBossHealthCurrent',
        'hudBossHealthMax',
        'hudBossHealthRatio',
        'hudBossHealthLabelVisible',
        'hudBossHealthLabelText',
        'hudBossHealthBarVisible',
        'hudBossHealthBarValueMatchesBoss',
        'hudBossHealthBoundToBossLifecycle',
        'hudBossHealthUpdatesOnDamage'
      ]
    },
    diagnostics: {
      source: 'stage37.ui_hud_boss_health_package_slice'
    }
  };
}
