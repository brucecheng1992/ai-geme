import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  REVIEW_ORACLE_FINAL_GATE_CAPABILITY_ID,
  REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
  REVIEW_ORACLE_FINAL_GATE_EVIDENCE_KIND,
  REVIEW_ORACLE_FINAL_GATE_PROFILE_ID,
  REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID
} from './review-oracle-final-gate-runtime-module.js';

export const REVIEW_ORACLE_FINAL_GATE_PACKAGE_VERSION = '1.0.0';
export const REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID = 'review.oracle_final_gate.v1.final_gate.browser_qa.v1';
export const REVIEW_ORACLE_FINAL_GATE_PACKAGE_REQUIRED_EVIDENCE_ID = 'review.oracle_final_gate.v1.evidence.oracle_final_gate.v1';

export function createReviewOracleFinalGatePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: REVIEW_ORACLE_FINAL_GATE_CAPABILITY_ID,
      packageVersion: REVIEW_ORACLE_FINAL_GATE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Step37 final Oracle gate approval package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'review.oracle_final_gate.schema',
      ownedPaths: ['/review/oracle_final_gate'],
      normalizerId: 'review.oracle_final_gate.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'review.oracle_final_gate.ir',
      ownedNodeKinds: ['runtime_system.review.oracle_final_gate']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: ['step37.final_closure']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'RecordOracleFinalGate:approved', executionPolicy: 'regeneration_required' }],
      compilerId: 'review.oracle_final_gate.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'review.oracle_final_gate.patch.approval_binding',
          policy: 'regeneration_required',
          ownedPaths: ['/review/oracle_final_gate']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID,
          capabilityId: REVIEW_ORACLE_FINAL_GATE_CAPABILITY_ID,
          prerequisites: [
            'Final Oracle gate result is available for the current checkpoint',
            'Oracle approval is bound to the reviewed candidate commit',
            'Oracle approval is bound to the reviewed Skill revision',
            'P0/P1/P2 blocking findings are absent'
          ],
          actions: [
            {
              id: `${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}.action.verify_final_gate`,
              kind: 'runtime_event',
              target: REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
              parameters: {
                evidenceKind: REVIEW_ORACLE_FINAL_GATE_EVIDENCE_KIND,
                profileId: REVIEW_ORACLE_FINAL_GATE_PROFILE_ID
              }
            }
          ],
          observations: [
            {
              id: `${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}.observation.approved`,
              kind: 'runtime_event',
              runtimeSystemId: REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID,
              ref: REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}.assertion.final_gate_bound_to_candidate_and_skill`,
              observationId: `${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}.observation.approved`,
              comparator: 'exists',
              expected: {
                finalOracleGateApproved: true,
                finalOracleReviewedCommitShaPresent: true,
                finalOracleReviewedSkillRevisionPresent: true,
                finalOracleResultMatchesReviewedCommit: true,
                finalOracleResultMatchesReviewedSkillRevision: true,
                finalOracleCheckpointMatched: true,
                finalOracleResultIdPresent: true,
                finalOracleReviewedCommitIsNotReceipt: true,
                finalOracleP0Count: 0,
                finalOracleP1Count: 0,
                finalOracleP2Count: 0
              },
              message: 'Final Oracle gate must be approved and bound to the reviewed candidate commit and Skill revision'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: REVIEW_ORACLE_FINAL_GATE_PACKAGE_REQUIRED_EVIDENCE_ID,
          artifactKind: REVIEW_ORACLE_FINAL_GATE_EVIDENCE_KIND,
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
    provides: [{ id: 'review.oracle_final_gate.service', version: 'v1' }],
    defaults: {
      evidenceKind: REVIEW_ORACLE_FINAL_GATE_EVIDENCE_KIND,
      profileId: REVIEW_ORACLE_FINAL_GATE_PROFILE_ID,
      validationEvent: REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      requiredStateFields: [
        'finalOracleGateApproved',
        'finalOracleReviewedCommitShaPresent',
        'finalOracleReviewedSkillRevisionPresent',
        'finalOracleResultMatchesReviewedCommit',
        'finalOracleResultMatchesReviewedSkillRevision',
        'finalOracleCheckpointMatched',
        'finalOracleResultIdPresent',
        'finalOracleReviewedCommitIsNotReceipt',
        'finalOracleP0Count',
        'finalOracleP1Count',
        'finalOracleP2Count',
        'finalOracleGateStatus',
        'finalOracleCandidateCommitSha',
        'finalOracleReviewedCommitSha',
        'finalOracleCandidateSkillRevision',
        'finalOracleReviewedSkillRevision',
        'finalOracleResultId',
        'finalOracleCheckpointId',
        'finalOracleExpectedCheckpointId'
      ]
    },
    diagnostics: {
      source: 'stage37.review_oracle_final_gate_package_slice'
    }
  };
}
