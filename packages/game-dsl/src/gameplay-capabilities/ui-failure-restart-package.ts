import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  UI_FAILURE_RESTART_CAPABILITY_ID,
  UI_FAILURE_RESTART_EVENT_TYPE,
  UI_FAILURE_RESTART_FAILURE_TEXT,
  UI_FAILURE_RESTART_INPUT,
  UI_FAILURE_RESTART_PROFILE_ID,
  UI_FAILURE_RESTART_PROMPT_TEXT,
  UI_FAILURE_RESTART_RESTART_EVENT_TYPE,
  UI_FAILURE_RESTART_RUNTIME_FAMILY,
  UI_FAILURE_RESTART_RUNTIME_SYSTEM_ID,
  UI_FAILURE_RESTART_SCHEMA_VERSION
} from './ui-failure-restart-runtime-module.js';

export const UI_FAILURE_RESTART_PACKAGE_VERSION = '1.0.0';
export const UI_FAILURE_RESTART_REQUIRED_PROBE_ID = 'ui.failure_restart.v1.restart_from_failure.browser_qa.v1';
export const UI_FAILURE_RESTART_PACKAGE_REQUIRED_EVIDENCE_ID = 'ui.failure_restart.v1.evidence.capability_qa_report.v1';

export function createUiFailureRestartPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: UI_FAILURE_RESTART_CAPABILITY_ID,
      packageVersion: UI_FAILURE_RESTART_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Failure-screen restart capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [UI_FAILURE_RESTART_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'ui.failure_restart.schema',
      ownedPaths: ['/ui/failureRestart', '/capability_configs/ui_failure_restart'],
      normalizerId: 'ui.failure_restart.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'ui.failure_restart.ir',
      ownedNodeKinds: ['runtime_system.ui.failure_restart']
    },
    runtime: {
      families: [UI_FAILURE_RESTART_RUNTIME_FAMILY],
      systems: [
        {
          id: UI_FAILURE_RESTART_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'feedback',
          dependencies: ['health.player_health_points', 'rules.retry_count']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetFailureRestart:restart_from_failure_screen', executionPolicy: 'regeneration_required' }],
      compilerId: 'ui.failure_restart.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'ui.failure_restart.patch.failure_restart',
          policy: 'regeneration_required',
          ownedPaths: ['/ui/failureRestart', '/capability_configs/ui_failure_restart']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: UI_FAILURE_RESTART_REQUIRED_PROBE_ID,
          capabilityId: UI_FAILURE_RESTART_CAPABILITY_ID,
          prerequisites: [
            'player health reaches zero with no retries remaining',
            'failure screen and restart prompt are visible',
            'restart input is accepted from the failure screen',
            'runtime emits restart and post-restart reset state'
          ],
          actions: [
            {
              id: `${UI_FAILURE_RESTART_REQUIRED_PROBE_ID}.action.restart_from_failure`,
              kind: 'runtime_event',
              target: UI_FAILURE_RESTART_EVENT_TYPE,
              parameters: {
                input: UI_FAILURE_RESTART_INPUT,
                restartEvent: UI_FAILURE_RESTART_RESTART_EVENT_TYPE,
                failureText: UI_FAILURE_RESTART_FAILURE_TEXT,
                promptText: UI_FAILURE_RESTART_PROMPT_TEXT
              }
            }
          ],
          observations: [
            {
              id: `${UI_FAILURE_RESTART_REQUIRED_PROBE_ID}.observation.failure_restart_state`,
              kind: 'state_probe',
              runtimeSystemId: UI_FAILURE_RESTART_RUNTIME_SYSTEM_ID,
              ref: UI_FAILURE_RESTART_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${UI_FAILURE_RESTART_REQUIRED_PROBE_ID}.assertion.failure_restart_verified`,
              observationId: `${UI_FAILURE_RESTART_REQUIRED_PROBE_ID}.observation.failure_restart_state`,
              comparator: 'exists',
              expected: {
                failureRestartVerified: true,
                failureRestartSchemaVersion: UI_FAILURE_RESTART_SCHEMA_VERSION,
                failureRestartProfileId: UI_FAILURE_RESTART_PROFILE_ID,
                failureRestartRuntimeFamily: UI_FAILURE_RESTART_RUNTIME_FAMILY,
                failureRestartNoRetriesRemaining: true,
                failureRestartFailureScreenShown: true,
                failureRestartFailureText: UI_FAILURE_RESTART_FAILURE_TEXT,
                failureRestartPromptVisible: true,
                failureRestartPromptText: UI_FAILURE_RESTART_PROMPT_TEXT,
                failureRestartInputReceived: true,
                failureRestartInput: UI_FAILURE_RESTART_INPUT,
                failureRestartGameRestarted: true,
                failureRestartRestartEventType: UI_FAILURE_RESTART_RESTART_EVENT_TYPE,
                failureRestartStateReset: true,
                failureRestartPlayerHealthReset: true,
                failureRestartRetryCountReset: true,
                failureRestartFailureScreenCleared: true
              },
              message:
                'failure restart evidence verifies no retries remaining, visible failure prompt, restart input, restart event, and reset state'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: UI_FAILURE_RESTART_PACKAGE_REQUIRED_EVIDENCE_ID,
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
      { capabilityId: 'health.player_health_points.v1', range: '^v1' },
      { capabilityId: 'rules.retry_count.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'ui.failure_restart.service', version: 'v1' }],
    defaults: {
      failureRestartEvent: UI_FAILURE_RESTART_EVENT_TYPE,
      restartEvent: UI_FAILURE_RESTART_RESTART_EVENT_TYPE,
      failureText: UI_FAILURE_RESTART_FAILURE_TEXT,
      promptText: UI_FAILURE_RESTART_PROMPT_TEXT,
      input: UI_FAILURE_RESTART_INPUT,
      requiredStateFields: [
        'failureRestartVerified',
        'failureRestartSchemaVersion',
        'failureRestartProfileId',
        'failureRestartRuntimeFamily',
        'failureRestartNoRetriesRemaining',
        'failureRestartFailureScreenShown',
        'failureRestartFailureText',
        'failureRestartPromptVisible',
        'failureRestartPromptText',
        'failureRestartInputReceived',
        'failureRestartInput',
        'failureRestartGameRestarted',
        'failureRestartRestartEventType',
        'failureRestartStateReset',
        'failureRestartPlayerHealthReset',
        'failureRestartRetryCountReset',
        'failureRestartFailureScreenCleared'
      ]
    },
    diagnostics: {
      source: 'stage37.ui_failure_restart_package_slice'
    }
  };
}
