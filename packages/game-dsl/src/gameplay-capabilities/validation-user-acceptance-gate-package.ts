import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  REVIEW_ORACLE_FINAL_GATE_CAPABILITY_ID,
  REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID
} from './review-oracle-final-gate-runtime-module.js';
import {
  VALIDATION_USER_ACCEPTANCE_GATE_CAPABILITY_ID,
  VALIDATION_USER_ACCEPTANCE_GATE_DECISION,
  VALIDATION_USER_ACCEPTANCE_GATE_EVENT_TYPE,
  VALIDATION_USER_ACCEPTANCE_GATE_EVIDENCE_KIND,
  VALIDATION_USER_ACCEPTANCE_GATE_FINAL_ORACLE_STATUS,
  VALIDATION_USER_ACCEPTANCE_GATE_PROFILE_ID,
  VALIDATION_USER_ACCEPTANCE_GATE_RUNTIME_FAMILY,
  VALIDATION_USER_ACCEPTANCE_GATE_RUNTIME_SYSTEM_ID
} from './validation-user-acceptance-gate-runtime-module.js';

export const VALIDATION_USER_ACCEPTANCE_GATE_PACKAGE_VERSION = '1.0.0';
export const VALIDATION_USER_ACCEPTANCE_GATE_REQUIRED_PROBE_ID = 'validation.user_acceptance_gate.v1.acceptance.browser_qa.v1';
export const VALIDATION_USER_ACCEPTANCE_GATE_PACKAGE_REQUIRED_EVIDENCE_ID =
  'validation.user_acceptance_gate.v1.evidence.user_acceptance_gate.v1';

export function createValidationUserAcceptanceGatePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: VALIDATION_USER_ACCEPTANCE_GATE_CAPABILITY_ID,
      packageVersion: VALIDATION_USER_ACCEPTANCE_GATE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Step37 user acceptance gate package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [VALIDATION_USER_ACCEPTANCE_GATE_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'validation.user_acceptance_gate.schema',
      ownedPaths: ['/validation/userAcceptanceGate'],
      normalizerId: 'validation.user_acceptance_gate.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'validation.user_acceptance_gate.ir',
      ownedNodeKinds: ['runtime_system.validation.user_acceptance_gate']
    },
    runtime: {
      families: [VALIDATION_USER_ACCEPTANCE_GATE_RUNTIME_FAMILY],
      systems: [
        {
          id: VALIDATION_USER_ACCEPTANCE_GATE_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: [REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID]
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'RecordUserAcceptanceGate:accepted', executionPolicy: 'regeneration_required' }],
      compilerId: 'validation.user_acceptance_gate.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'validation.user_acceptance_gate.patch.acceptance_binding',
          policy: 'regeneration_required',
          ownedPaths: ['/validation/userAcceptanceGate']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: VALIDATION_USER_ACCEPTANCE_GATE_REQUIRED_PROBE_ID,
          capabilityId: VALIDATION_USER_ACCEPTANCE_GATE_CAPABILITY_ID,
          prerequisites: [
            'Final Oracle gate is approved for the reviewed candidate',
            'User acceptance decision is available for the current checkpoint',
            'User acceptance is bound to the accepted candidate commit',
            'User acceptance is bound to the accepted Skill revision'
          ],
          actions: [
            {
              id: `${VALIDATION_USER_ACCEPTANCE_GATE_REQUIRED_PROBE_ID}.action.verify_user_acceptance`,
              kind: 'runtime_event',
              target: VALIDATION_USER_ACCEPTANCE_GATE_EVENT_TYPE,
              parameters: {
                evidenceKind: VALIDATION_USER_ACCEPTANCE_GATE_EVIDENCE_KIND,
                expectedDecision: VALIDATION_USER_ACCEPTANCE_GATE_DECISION,
                expectedFinalOracleGateStatus: VALIDATION_USER_ACCEPTANCE_GATE_FINAL_ORACLE_STATUS,
                profileId: VALIDATION_USER_ACCEPTANCE_GATE_PROFILE_ID
              }
            }
          ],
          observations: [
            {
              id: `${VALIDATION_USER_ACCEPTANCE_GATE_REQUIRED_PROBE_ID}.observation.accepted`,
              kind: 'runtime_event',
              runtimeSystemId: VALIDATION_USER_ACCEPTANCE_GATE_RUNTIME_SYSTEM_ID,
              ref: VALIDATION_USER_ACCEPTANCE_GATE_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${VALIDATION_USER_ACCEPTANCE_GATE_REQUIRED_PROBE_ID}.assertion.user_acceptance_bound_to_candidate_and_skill`,
              observationId: `${VALIDATION_USER_ACCEPTANCE_GATE_REQUIRED_PROBE_ID}.observation.accepted`,
              comparator: 'exists',
              expected: {
                userAcceptanceGateAccepted: true,
                userAcceptanceAcceptedCommitShaPresent: true,
                userAcceptanceAcceptedSkillRevisionPresent: true,
                userAcceptanceResultMatchesAcceptedCommit: true,
                userAcceptanceResultMatchesAcceptedSkillRevision: true,
                userAcceptanceCheckpointMatched: true,
                userAcceptanceReceiptIdPresent: true,
                userAcceptanceAcceptedCommitIsNotReceipt: true,
                userAcceptanceFinalOracleGateApproved: true,
                userAcceptanceDecision: VALIDATION_USER_ACCEPTANCE_GATE_DECISION,
                userAcceptanceBlockingFindingCount: 0
              },
              message: 'User acceptance gate must be accepted and bound to the reviewed candidate commit and Skill revision'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: VALIDATION_USER_ACCEPTANCE_GATE_PACKAGE_REQUIRED_EVIDENCE_ID,
          artifactKind: VALIDATION_USER_ACCEPTANCE_GATE_EVIDENCE_KIND,
          required: true
        }
      ]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [{ capabilityId: REVIEW_ORACLE_FINAL_GATE_CAPABILITY_ID, range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'validation.user_acceptance_gate.service', version: 'v1' }],
    defaults: {
      evidenceKind: VALIDATION_USER_ACCEPTANCE_GATE_EVIDENCE_KIND,
      profileId: VALIDATION_USER_ACCEPTANCE_GATE_PROFILE_ID,
      validationEvent: VALIDATION_USER_ACCEPTANCE_GATE_EVENT_TYPE,
      requiredStateFields: [
        'userAcceptanceDecision',
        'userAcceptanceCandidateCommitSha',
        'userAcceptanceAcceptedCommitSha',
        'userAcceptanceCandidateSkillRevision',
        'userAcceptanceAcceptedSkillRevision',
        'userAcceptanceCheckpointId',
        'userAcceptanceExpectedCheckpointId',
        'userAcceptanceReceiptId',
        'userAcceptanceFinalOracleGateStatus',
        'userAcceptanceBlockingFindingCount'
      ]
    },
    diagnostics: {
      source: 'stage37.validation_user_acceptance_gate_package_slice'
    }
  };
}
