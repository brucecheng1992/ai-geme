import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  UI_HUD_RETRIES_CAPABILITY_ID,
  UI_HUD_RETRIES_EVENT_TYPE,
  UI_HUD_RETRIES_INITIAL,
  UI_HUD_RETRIES_LABEL_TEXT,
  UI_HUD_RETRIES_PROFILE_ID,
  UI_HUD_RETRIES_REMAINING,
  UI_HUD_RETRIES_RUNTIME_FAMILY,
  UI_HUD_RETRIES_RUNTIME_SYSTEM_ID,
  UI_HUD_RETRIES_SCHEMA_VERSION
} from './ui-hud-retries-runtime-module.js';

export const UI_HUD_RETRIES_PACKAGE_VERSION = '1.0.0';
export const UI_HUD_RETRIES_REQUIRED_PROBE_ID = 'ui.hud_retries.v1.retries_hud.browser_qa.v1';
export const UI_HUD_RETRIES_PACKAGE_REQUIRED_EVIDENCE_ID = 'ui.hud_retries.v1.evidence.capability_qa_report.v1';

export function createUiHudRetriesPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: UI_HUD_RETRIES_CAPABILITY_ID,
      packageVersion: UI_HUD_RETRIES_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Retries HUD capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [UI_HUD_RETRIES_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'ui.hud_retries.schema',
      ownedPaths: ['/ui/hud/retries', '/capability_configs/ui_hud_retries'],
      normalizerId: 'ui.hud_retries.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'ui.hud_retries.ir',
      ownedNodeKinds: ['runtime_system.ui.hud_retries']
    },
    runtime: {
      families: [UI_HUD_RETRIES_RUNTIME_FAMILY],
      systems: [
        {
          id: UI_HUD_RETRIES_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'feedback',
          dependencies: ['rules.retry_count']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetRetriesHud:bind_to_retry_count', executionPolicy: 'regeneration_required' }],
      compilerId: 'ui.hud_retries.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'ui.hud_retries.patch.retries_hud',
          policy: 'regeneration_required',
          ownedPaths: ['/ui/hud/retries', '/capability_configs/ui_hud_retries']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: UI_HUD_RETRIES_REQUIRED_PROBE_ID,
          capabilityId: UI_HUD_RETRIES_CAPABILITY_ID,
          prerequisites: [
            'retry count package evidence is present for the current run',
            'retry count state is initialized',
            'HUD retries component is visible',
            'HUD retries value is bound to the retry count state'
          ],
          actions: [
            {
              id: `${UI_HUD_RETRIES_REQUIRED_PROBE_ID}.action.verify_retries_hud`,
              kind: 'runtime_event',
              target: UI_HUD_RETRIES_EVENT_TYPE,
              parameters: {
                labelText: UI_HUD_RETRIES_LABEL_TEXT,
                initialRetries: UI_HUD_RETRIES_INITIAL,
                remainingRetries: UI_HUD_RETRIES_REMAINING
              }
            }
          ],
          observations: [
            {
              id: `${UI_HUD_RETRIES_REQUIRED_PROBE_ID}.observation.retries_hud_state`,
              kind: 'state_probe',
              runtimeSystemId: UI_HUD_RETRIES_RUNTIME_SYSTEM_ID,
              ref: UI_HUD_RETRIES_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${UI_HUD_RETRIES_REQUIRED_PROBE_ID}.assertion.retries_hud_verified`,
              observationId: `${UI_HUD_RETRIES_REQUIRED_PROBE_ID}.observation.retries_hud_state`,
              comparator: 'exists',
              expected: {
                hudRetriesVisible: true,
                hudRetriesSchemaVersion: UI_HUD_RETRIES_SCHEMA_VERSION,
                hudRetriesProfileId: UI_HUD_RETRIES_PROFILE_ID,
                hudRetriesRuntimeFamily: UI_HUD_RETRIES_RUNTIME_FAMILY,
                hudRetriesInitial: UI_HUD_RETRIES_INITIAL,
                hudRetriesRemaining: UI_HUD_RETRIES_REMAINING,
                hudRetriesConsumed: true,
                hudRetriesLabelVisible: true,
                hudRetriesLabelText: UI_HUD_RETRIES_LABEL_TEXT,
                hudRetriesCounterVisible: true,
                hudRetriesCounterValueMatchesRetryCount: true,
                hudRetriesBoundToRetryCount: true,
                hudRetriesUpdatesOnRetryConsumption: true
              },
              message: 'retries HUD evidence verifies visible HUD state bound to the retry count state'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: UI_HUD_RETRIES_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'rules.retry_count.v1', range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'ui.hud_retries.service', version: 'v1' }],
    defaults: {
      initialRetries: UI_HUD_RETRIES_INITIAL,
      remainingRetries: UI_HUD_RETRIES_REMAINING,
      labelText: UI_HUD_RETRIES_LABEL_TEXT,
      hudEvent: UI_HUD_RETRIES_EVENT_TYPE,
      requiredStateFields: [
        'hudRetriesVisible',
        'hudRetriesSchemaVersion',
        'hudRetriesProfileId',
        'hudRetriesRuntimeFamily',
        'hudRetriesInitial',
        'hudRetriesRemaining',
        'hudRetriesConsumed',
        'hudRetriesLabelVisible',
        'hudRetriesLabelText',
        'hudRetriesCounterVisible',
        'hudRetriesCounterValueMatchesRetryCount',
        'hudRetriesBoundToRetryCount',
        'hudRetriesUpdatesOnRetryConsumption'
      ]
    },
    diagnostics: {
      source: 'stage37.ui_hud_retries_package_slice'
    }
  };
}
