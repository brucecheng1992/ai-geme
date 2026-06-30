import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  RULES_STATE_TRANSITION_GRAPH_CAPABILITY_ID,
  RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
  RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
  RULES_STATE_TRANSITION_GRAPH_ID,
  RULES_STATE_TRANSITION_GRAPH_RUNTIME_SYSTEM_ID,
  RULES_STATE_TRANSITION_GRAPH_STATE_COUNT,
  RULES_STATE_TRANSITION_GRAPH_TO_STATE,
  RULES_STATE_TRANSITION_GRAPH_TRANSITION_COUNT,
  RULES_STATE_TRANSITION_GRAPH_TRIGGER
} from './rules-state-transition-graph-runtime-module.js';

export const RULES_STATE_TRANSITION_GRAPH_PACKAGE_VERSION = '1.0.0';
export const RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID =
  'rules.state_transition_graph.v1.verify_explicit_graph.browser_qa.v1';
export const RULES_STATE_TRANSITION_GRAPH_PACKAGE_REQUIRED_EVIDENCE_ID =
  'rules.state_transition_graph.v1.evidence.capability_qa_report.v1';

export function createRulesStateTransitionGraphPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: RULES_STATE_TRANSITION_GRAPH_CAPABILITY_ID,
      packageVersion: RULES_STATE_TRANSITION_GRAPH_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Explicit state transition graph capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'rules.state_transition_graph.schema',
      ownedPaths: ['/stateGraph', '/winLose/stateTransitions', '/capability_configs/state_transition_graph'],
      normalizerId: 'rules.state_transition_graph.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'rules.state_transition_graph.ir',
      ownedNodeKinds: ['runtime_system.rules.state_transition_graph']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: RULES_STATE_TRANSITION_GRAPH_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['runtime_plan', 'win_lose_system']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetStateTransitionGraph:explicit_edges', executionPolicy: 'regeneration_required' }],
      compilerId: 'rules.state_transition_graph.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'rules.state_transition_graph.patch.explicit_edges',
          policy: 'regeneration_required',
          ownedPaths: ['/stateGraph', '/winLose/stateTransitions', '/capability_configs/state_transition_graph']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID,
          capabilityId: RULES_STATE_TRANSITION_GRAPH_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'canonical runtime plan includes explicit state graph nodes',
            'state graph transition evidence is emitted by the runtime'
          ],
          actions: [
            {
              id: `${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}.action.verify_graph`,
              kind: 'runtime_event',
              target: RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
              parameters: {
                graphId: RULES_STATE_TRANSITION_GRAPH_ID,
                fromState: RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
                toState: RULES_STATE_TRANSITION_GRAPH_TO_STATE,
                trigger: RULES_STATE_TRANSITION_GRAPH_TRIGGER
              }
            }
          ],
          observations: [
            {
              id: `${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}.observation.explicit_graph`,
              kind: 'state_probe',
              runtimeSystemId: RULES_STATE_TRANSITION_GRAPH_RUNTIME_SYSTEM_ID,
              ref: RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}.assertion.explicit_graph`,
              observationId: `${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}.observation.explicit_graph`,
              comparator: 'exists',
              expected: {
                stateTransitionGraphDeclared: true,
                stateTransitionGraphId: RULES_STATE_TRANSITION_GRAPH_ID,
                stateTransitionGraphStateCount: RULES_STATE_TRANSITION_GRAPH_STATE_COUNT,
                stateTransitionGraphTransitionCount: RULES_STATE_TRANSITION_GRAPH_TRANSITION_COUNT,
                stateTransitionGraphFromState: RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
                stateTransitionGraphToState: RULES_STATE_TRANSITION_GRAPH_TO_STATE,
                stateTransitionGraphTrigger: RULES_STATE_TRANSITION_GRAPH_TRIGGER,
                stateTransitionGraphTerminalStatesIncluded: true,
                stateTransitionGraphNoImplicitFallback: true,
                stateTransitionGraphReachabilityVerified: true
              },
              message: 'state transition graph evidence verifies explicit states, edges, triggers, terminal states, and no implicit fallback'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: RULES_STATE_TRANSITION_GRAPH_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'rules.state_transition_graph.service', version: 'v1' }],
    defaults: {
      graphId: RULES_STATE_TRANSITION_GRAPH_ID,
      stateCount: RULES_STATE_TRANSITION_GRAPH_STATE_COUNT,
      transitionCount: RULES_STATE_TRANSITION_GRAPH_TRANSITION_COUNT,
      fromState: RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
      toState: RULES_STATE_TRANSITION_GRAPH_TO_STATE,
      trigger: RULES_STATE_TRANSITION_GRAPH_TRIGGER,
      event: RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
      requiredStateFields: [
        'stateTransitionGraphDeclared',
        'stateTransitionGraphId',
        'stateTransitionGraphStateCount',
        'stateTransitionGraphTransitionCount',
        'stateTransitionGraphFromState',
        'stateTransitionGraphToState',
        'stateTransitionGraphTrigger',
        'stateTransitionGraphTerminalStatesIncluded',
        'stateTransitionGraphNoImplicitFallback',
        'stateTransitionGraphReachabilityVerified'
      ]
    },
    diagnostics: {
      source: 'stage37.rules_state_transition_graph_package_slice'
    }
  };
}
