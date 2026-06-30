import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  RULES_RETRY_COUNT_AFTER,
  RULES_RETRY_COUNT_BEFORE,
  RULES_RETRY_COUNT_CAPABILITY_ID,
  RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
  RULES_RETRY_COUNT_EVENT_TYPE,
  RULES_RETRY_COUNT_INITIAL_RETRIES,
  RULES_RETRY_COUNT_REMAINING,
  RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID
} from './rules-retry-count-runtime-module.js';

export const RULES_RETRY_COUNT_PACKAGE_VERSION = '1.0.0';
export const RULES_RETRY_COUNT_REQUIRED_PROBE_ID = 'rules.retry_count.v1.consume_retry.browser_qa.v1';
export const RULES_RETRY_COUNT_PACKAGE_REQUIRED_EVIDENCE_ID = 'rules.retry_count.v1.evidence.capability_qa_report.v1';

export function createRulesRetryCountPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: RULES_RETRY_COUNT_CAPABILITY_ID,
      packageVersion: RULES_RETRY_COUNT_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Retry count state and retry consumption capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'rules.retry_count.schema',
      ownedPaths: ['/winLose/retries', '/capability_configs/retry_count'],
      normalizerId: 'rules.retry_count.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'rules.retry_count.ir',
      ownedNodeKinds: ['runtime_system.rules.retry_count']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['health.player_health_points', 'checkpoint_or_lives_system']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetRetryCount:max_retries', executionPolicy: 'regeneration_required' }],
      compilerId: 'rules.retry_count.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'rules.retry_count.patch.max_retries',
          policy: 'regeneration_required',
          ownedPaths: ['/winLose/retries', '/capability_configs/retry_count']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: RULES_RETRY_COUNT_REQUIRED_PROBE_ID,
          capabilityId: RULES_RETRY_COUNT_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'retry count is initialized from runtime plan',
            'player health reaches zero while retries remain',
            'retry count change state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.action.zero_health`,
              kind: 'runtime_event',
              target: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
              parameters: {
                damageEvent: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
                initialRetries: RULES_RETRY_COUNT_INITIAL_RETRIES,
                retryCountBefore: RULES_RETRY_COUNT_BEFORE,
                retryCountAfter: RULES_RETRY_COUNT_AFTER
              }
            }
          ],
          observations: [
            {
              id: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.observation.zero_health`,
              kind: 'runtime_event',
              runtimeSystemId: RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID,
              ref: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE
            },
            {
              id: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.observation.retry_count_changed`,
              kind: 'state_probe',
              runtimeSystemId: RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID,
              ref: RULES_RETRY_COUNT_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.assertion.zero_health`,
              observationId: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.observation.zero_health`,
              comparator: 'exists',
              message: 'retry count package observes the zero-health trigger'
            },
            {
              id: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.assertion.retry_consumed`,
              observationId: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.observation.retry_count_changed`,
              comparator: 'exists',
              expected: {
                retryCountConfigured: true,
                retryCountInitial: RULES_RETRY_COUNT_INITIAL_RETRIES,
                retryCountBefore: RULES_RETRY_COUNT_BEFORE,
                retryCountAfter: RULES_RETRY_COUNT_AFTER,
                retryCountRemaining: RULES_RETRY_COUNT_REMAINING,
                retryCountConsumed: true,
                retryCountDecremented: true,
                retryCountExhausted: false,
                retryCountFailureScreenShown: false
              },
              message: 'retry count package observes configured retry budget and decrement after retry consumption'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: RULES_RETRY_COUNT_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'rules.retry_count.service', version: 'v1' }],
    defaults: {
      retryCountChangedEvent: RULES_RETRY_COUNT_EVENT_TYPE,
      damageEvent: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
      initialRetries: RULES_RETRY_COUNT_INITIAL_RETRIES,
      retryCountBefore: RULES_RETRY_COUNT_BEFORE,
      retryCountAfter: RULES_RETRY_COUNT_AFTER,
      retryCountRemaining: RULES_RETRY_COUNT_REMAINING,
      requiredStateFields: [
        'retryCountConfigured',
        'retryCountInitial',
        'retryCountBefore',
        'retryCountAfter',
        'retryCountRemaining',
        'retryCountConsumed',
        'retryCountDecremented',
        'retryCountExhausted',
        'retryCountFailureScreenShown'
      ]
    },
    diagnostics: {
      source: 'stage37.rules_retry_count_package_slice'
    }
  };
}
