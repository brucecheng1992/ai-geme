import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  UI_WIN_FAILURE_TRANSITIONS_CAPABILITY_ID,
  UI_WIN_FAILURE_TRANSITIONS_EVENT_TYPE,
  UI_WIN_FAILURE_TRANSITIONS_FAILURE_TEXT,
  UI_WIN_FAILURE_TRANSITIONS_FAILURE_TRIGGER,
  UI_WIN_FAILURE_TRANSITIONS_PROFILE_ID,
  UI_WIN_FAILURE_TRANSITIONS_RUNTIME_FAMILY,
  UI_WIN_FAILURE_TRANSITIONS_RUNTIME_SYSTEM_ID,
  UI_WIN_FAILURE_TRANSITIONS_SCHEMA_VERSION,
  UI_WIN_FAILURE_TRANSITIONS_WIN_TEXT,
  UI_WIN_FAILURE_TRANSITIONS_WIN_TRIGGER
} from './ui-win-failure-transitions-runtime-module.js';

export const UI_WIN_FAILURE_TRANSITIONS_PACKAGE_VERSION = '1.0.0';
export const UI_WIN_FAILURE_TRANSITIONS_REQUIRED_PROBE_ID =
  'ui.win_failure_transitions.v1.terminal_ui.browser_qa.v1';
export const UI_WIN_FAILURE_TRANSITIONS_PACKAGE_REQUIRED_EVIDENCE_ID =
  'ui.win_failure_transitions.v1.evidence.capability_qa_report.v1';

export function createUiWinFailureTransitionsPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: UI_WIN_FAILURE_TRANSITIONS_CAPABILITY_ID,
      packageVersion: UI_WIN_FAILURE_TRANSITIONS_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Win/failure terminal UI transitions capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [UI_WIN_FAILURE_TRANSITIONS_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'ui.win_failure_transitions.schema',
      ownedPaths: ['/ui/winFailureTransitions', '/winLose/uiTransitions', '/capability_configs/ui_win_failure_transitions'],
      normalizerId: 'ui.win_failure_transitions.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'ui.win_failure_transitions.ir',
      ownedNodeKinds: ['runtime_system.ui.win_failure_transitions']
    },
    runtime: {
      families: [UI_WIN_FAILURE_TRANSITIONS_RUNTIME_FAMILY],
      systems: [
        {
          id: UI_WIN_FAILURE_TRANSITIONS_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'feedback',
          dependencies: ['feedback.victory_declaration', 'ui.failure_restart', 'rules.state_transition_graph']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetWinFailureTransitions:terminal_ui_states', executionPolicy: 'regeneration_required' }],
      compilerId: 'ui.win_failure_transitions.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'ui.win_failure_transitions.patch.terminal_ui_states',
          policy: 'regeneration_required',
          ownedPaths: ['/ui/winFailureTransitions', '/winLose/uiTransitions', '/capability_configs/ui_win_failure_transitions']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: UI_WIN_FAILURE_TRANSITIONS_REQUIRED_PROBE_ID,
          capabilityId: UI_WIN_FAILURE_TRANSITIONS_CAPABILITY_ID,
          prerequisites: [
            'victory declaration dependency evidence is present for the current run',
            'failure restart dependency evidence is present for the current run',
            'state transition graph dependency evidence is present for the current run',
            'runtime emits terminal UI transition state for both win and failure outcomes'
          ],
          actions: [
            {
              id: `${UI_WIN_FAILURE_TRANSITIONS_REQUIRED_PROBE_ID}.action.verify_terminal_ui_transitions`,
              kind: 'runtime_event',
              target: UI_WIN_FAILURE_TRANSITIONS_EVENT_TYPE,
              parameters: {
                winTrigger: UI_WIN_FAILURE_TRANSITIONS_WIN_TRIGGER,
                failureTrigger: UI_WIN_FAILURE_TRANSITIONS_FAILURE_TRIGGER,
                winText: UI_WIN_FAILURE_TRANSITIONS_WIN_TEXT,
                failureText: UI_WIN_FAILURE_TRANSITIONS_FAILURE_TEXT
              }
            }
          ],
          observations: [
            {
              id: `${UI_WIN_FAILURE_TRANSITIONS_REQUIRED_PROBE_ID}.observation.terminal_ui_state`,
              kind: 'state_probe',
              runtimeSystemId: UI_WIN_FAILURE_TRANSITIONS_RUNTIME_SYSTEM_ID,
              ref: UI_WIN_FAILURE_TRANSITIONS_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${UI_WIN_FAILURE_TRANSITIONS_REQUIRED_PROBE_ID}.assertion.terminal_ui_transitions_verified`,
              observationId: `${UI_WIN_FAILURE_TRANSITIONS_REQUIRED_PROBE_ID}.observation.terminal_ui_state`,
              comparator: 'exists',
              expected: {
                winFailureTransitionsVerified: true,
                winFailureTransitionsSchemaVersion: UI_WIN_FAILURE_TRANSITIONS_SCHEMA_VERSION,
                winFailureTransitionsProfileId: UI_WIN_FAILURE_TRANSITIONS_PROFILE_ID,
                winFailureTransitionsRuntimeFamily: UI_WIN_FAILURE_TRANSITIONS_RUNTIME_FAMILY,
                winFailureTransitionsWinScreenShown: true,
                winFailureTransitionsWinText: UI_WIN_FAILURE_TRANSITIONS_WIN_TEXT,
                winFailureTransitionsWinTrigger: UI_WIN_FAILURE_TRANSITIONS_WIN_TRIGGER,
                winFailureTransitionsFailureScreenShown: true,
                winFailureTransitionsFailureText: UI_WIN_FAILURE_TRANSITIONS_FAILURE_TEXT,
                winFailureTransitionsFailureTrigger: UI_WIN_FAILURE_TRANSITIONS_FAILURE_TRIGGER,
                winFailureTransitionsTerminalStatesDistinct: true,
                winFailureTransitionsNoImplicitFallback: true,
                winFailureTransitionsInputLockedOnTerminal: true
              },
              message:
                'terminal UI evidence verifies distinct win and failure UI transitions bound to explicit terminal states'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: UI_WIN_FAILURE_TRANSITIONS_PACKAGE_REQUIRED_EVIDENCE_ID,
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
      { capabilityId: 'feedback.victory_declaration.v1', range: '^v1' },
      { capabilityId: 'ui.failure_restart.v1', range: '^v1' },
      { capabilityId: 'rules.state_transition_graph.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'ui.win_failure_transitions.service', version: 'v1' }],
    defaults: {
      winTrigger: UI_WIN_FAILURE_TRANSITIONS_WIN_TRIGGER,
      failureTrigger: UI_WIN_FAILURE_TRANSITIONS_FAILURE_TRIGGER,
      winText: UI_WIN_FAILURE_TRANSITIONS_WIN_TEXT,
      failureText: UI_WIN_FAILURE_TRANSITIONS_FAILURE_TEXT,
      transitionEvent: UI_WIN_FAILURE_TRANSITIONS_EVENT_TYPE,
      requiredStateFields: [
        'winFailureTransitionsVerified',
        'winFailureTransitionsSchemaVersion',
        'winFailureTransitionsProfileId',
        'winFailureTransitionsRuntimeFamily',
        'winFailureTransitionsWinScreenShown',
        'winFailureTransitionsWinText',
        'winFailureTransitionsWinTrigger',
        'winFailureTransitionsFailureScreenShown',
        'winFailureTransitionsFailureText',
        'winFailureTransitionsFailureTrigger',
        'winFailureTransitionsTerminalStatesDistinct',
        'winFailureTransitionsNoImplicitFallback',
        'winFailureTransitionsInputLockedOnTerminal'
      ]
    },
    diagnostics: {
      source: 'stage37.ui_win_failure_transitions_package_slice'
    }
  };
}
