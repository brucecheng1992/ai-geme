import {
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_CAPABILITY_ID,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_EVENT_TYPE,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_SYSTEM_ID
} from './validation-metamorphic-semantic-hash-runtime-module.js';
import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  VALIDATION_REPLAY_STABILITY_BASELINE_TRACE_HASH,
  VALIDATION_REPLAY_STABILITY_CAPABILITY_ID,
  VALIDATION_REPLAY_STABILITY_EVENT_TYPE,
  VALIDATION_REPLAY_STABILITY_FRAME_COUNT,
  VALIDATION_REPLAY_STABILITY_INPUT_TIMELINE_HASH,
  VALIDATION_REPLAY_STABILITY_PROFILE_ID,
  VALIDATION_REPLAY_STABILITY_REPLAY_TRACE_HASH,
  VALIDATION_REPLAY_STABILITY_RUNTIME_FAMILY,
  VALIDATION_REPLAY_STABILITY_RUNTIME_SYSTEM_ID,
  VALIDATION_REPLAY_STABILITY_SCHEMA_VERSION,
  VALIDATION_REPLAY_STABILITY_SEED
} from './validation-replay-stability-runtime-module.js';

export const VALIDATION_REPLAY_STABILITY_PACKAGE_VERSION = '1.0.0';
export const VALIDATION_REPLAY_STABILITY_REQUIRED_PROBE_ID = 'validation.replay_stability.v1.replay.browser_qa.v1';
export const VALIDATION_REPLAY_STABILITY_PACKAGE_REQUIRED_EVIDENCE_ID =
  'validation.replay_stability.v1.evidence.capability_qa_report.v1';

export function createValidationReplayStabilityPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: VALIDATION_REPLAY_STABILITY_CAPABILITY_ID,
      packageVersion: VALIDATION_REPLAY_STABILITY_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Validation replay stability capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [VALIDATION_REPLAY_STABILITY_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'validation.replay_stability.schema',
      ownedPaths: ['/validation/replayStability', '/capability_configs/validation_replay_stability'],
      normalizerId: 'validation.replay_stability.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'validation.replay_stability.ir',
      ownedNodeKinds: ['validation.replay_stability.report']
    },
    runtime: {
      families: [VALIDATION_REPLAY_STABILITY_RUNTIME_FAMILY],
      systems: [
        {
          id: VALIDATION_REPLAY_STABILITY_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: [VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_SYSTEM_ID]
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyReplayStability:deterministic_trace', executionPolicy: 'regeneration_required' }],
      compilerId: 'validation.replay_stability.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'validation.replay_stability.patch.replay_trace',
          policy: 'regeneration_required',
          ownedPaths: ['/validation/replayStability', '/capability_configs/validation_replay_stability']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: VALIDATION_REPLAY_STABILITY_REQUIRED_PROBE_ID,
          capabilityId: VALIDATION_REPLAY_STABILITY_CAPABILITY_ID,
          prerequisites: [
            'metamorphic semantic hash probe passed in the current QA plan',
            'canonical input timeline is available',
            'baseline and replay trace hashes are captured'
          ],
          actions: [
            {
              id: `${VALIDATION_REPLAY_STABILITY_REQUIRED_PROBE_ID}.action.verify_replay_stability`,
              kind: 'runtime_event',
              target: VALIDATION_REPLAY_STABILITY_EVENT_TYPE,
              parameters: {
                replaySeed: VALIDATION_REPLAY_STABILITY_SEED,
                inputTimelineHash: VALIDATION_REPLAY_STABILITY_INPUT_TIMELINE_HASH,
                expectedBaselineTraceHash: VALIDATION_REPLAY_STABILITY_BASELINE_TRACE_HASH,
                expectedReplayTraceHash: VALIDATION_REPLAY_STABILITY_REPLAY_TRACE_HASH,
                expectedFrameCount: VALIDATION_REPLAY_STABILITY_FRAME_COUNT
              }
            }
          ],
          observations: [
            {
              id: `${VALIDATION_REPLAY_STABILITY_REQUIRED_PROBE_ID}.observation.replay_stability`,
              kind: 'runtime_event',
              runtimeSystemId: VALIDATION_REPLAY_STABILITY_RUNTIME_SYSTEM_ID,
              ref: VALIDATION_REPLAY_STABILITY_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${VALIDATION_REPLAY_STABILITY_REQUIRED_PROBE_ID}.assertion.replay_stability`,
              observationId: `${VALIDATION_REPLAY_STABILITY_REQUIRED_PROBE_ID}.observation.replay_stability`,
              comparator: 'exists',
              expected: {
                replayStabilityVerified: true,
                replayStabilitySchemaVersion: VALIDATION_REPLAY_STABILITY_SCHEMA_VERSION,
                replayStabilityProfileId: VALIDATION_REPLAY_STABILITY_PROFILE_ID,
                replayStabilityRuntimeFamily: VALIDATION_REPLAY_STABILITY_RUNTIME_FAMILY,
                replayStabilitySeed: VALIDATION_REPLAY_STABILITY_SEED,
                replayStabilityInputTimelineHash: VALIDATION_REPLAY_STABILITY_INPUT_TIMELINE_HASH,
                replayStabilityBaselineTraceHash: VALIDATION_REPLAY_STABILITY_BASELINE_TRACE_HASH,
                replayStabilityReplayTraceHash: VALIDATION_REPLAY_STABILITY_REPLAY_TRACE_HASH,
                replayStabilityTraceMatched: true,
                replayStabilityFrameCount: VALIDATION_REPLAY_STABILITY_FRAME_COUNT,
                replayStabilityNoNondeterministicDrift: true,
                replayStabilitySamePlan: true
              },
              message: 'replay stability validation proves repeated runtime replays preserve trace hash and plan identity without nondeterministic drift'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: VALIDATION_REPLAY_STABILITY_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: VALIDATION_METAMORPHIC_SEMANTIC_HASH_CAPABILITY_ID, range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'validation.replay_stability.service', version: 'v1' }],
    defaults: {
      replaySeed: VALIDATION_REPLAY_STABILITY_SEED,
      inputTimelineHash: VALIDATION_REPLAY_STABILITY_INPUT_TIMELINE_HASH,
      verificationEvent: VALIDATION_REPLAY_STABILITY_EVENT_TYPE,
      dependencyEvents: [VALIDATION_METAMORPHIC_SEMANTIC_HASH_EVENT_TYPE],
      requiredStateFields: [
        'replayStabilityVerified',
        'replayStabilitySchemaVersion',
        'replayStabilityProfileId',
        'replayStabilityRuntimeFamily',
        'replayStabilitySeed',
        'replayStabilityInputTimelineHash',
        'replayStabilityBaselineTraceHash',
        'replayStabilityReplayTraceHash',
        'replayStabilityTraceMatched',
        'replayStabilityFrameCount',
        'replayStabilityNoNondeterministicDrift',
        'replayStabilitySamePlan'
      ]
    },
    diagnostics: {
      source: 'stage37.validation_replay_stability_package_slice'
    }
  };
}
