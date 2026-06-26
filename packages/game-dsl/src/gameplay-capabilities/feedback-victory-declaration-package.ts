import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  FEEDBACK_VICTORY_DECLARATION_CAPABILITY_ID,
  FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
  FEEDBACK_VICTORY_DECLARATION_OUTCOME,
  FEEDBACK_VICTORY_DECLARATION_RUNTIME_SYSTEM_ID,
  FEEDBACK_VICTORY_DECLARATION_TEXT,
  FEEDBACK_VICTORY_DECLARATION_TRIGGER
} from './feedback-victory-declaration-runtime-module.js';

export const FEEDBACK_VICTORY_DECLARATION_PACKAGE_VERSION = '1.0.0';
export const FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID = 'feedback.victory_declaration.v1.visible.browser_qa.v1';
export const FEEDBACK_VICTORY_DECLARATION_PACKAGE_REQUIRED_EVIDENCE_ID =
  'feedback.victory_declaration.v1.evidence.capability_qa_report.v1';

export function createFeedbackVictoryDeclarationPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: FEEDBACK_VICTORY_DECLARATION_CAPABILITY_ID,
      packageVersion: FEEDBACK_VICTORY_DECLARATION_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Feedback victory declaration capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'feedback.victory_declaration.schema',
      ownedPaths: ['/feedback/victory_declaration'],
      normalizerId: 'feedback.victory_declaration.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'feedback.victory_declaration.ir',
      ownedNodeKinds: ['runtime_system.feedback.victory_declaration']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: FEEDBACK_VICTORY_DECLARATION_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'feedback',
          dependencies: ['enemy.boss_lifecycle']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetVictoryDeclaration:boss_defeated_banner', executionPolicy: 'regeneration_required' }],
      compilerId: 'feedback.victory_declaration.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'feedback.victory_declaration.patch.boss_defeated_banner',
          policy: 'regeneration_required',
          ownedPaths: ['/feedback/victory_declaration']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID,
          capabilityId: FEEDBACK_VICTORY_DECLARATION_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'boss defeat objective is completed',
            'victory declaration feedback state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}.action.verify_victory_declaration`,
              kind: 'runtime_event',
              target: FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
              parameters: {
                trigger: FEEDBACK_VICTORY_DECLARATION_TRIGGER,
                outcome: FEEDBACK_VICTORY_DECLARATION_OUTCOME,
                declarationText: FEEDBACK_VICTORY_DECLARATION_TEXT
              }
            }
          ],
          observations: [
            {
              id: `${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}.observation.victory_declaration_state`,
              kind: 'runtime_event',
              runtimeSystemId: FEEDBACK_VICTORY_DECLARATION_RUNTIME_SYSTEM_ID,
              ref: FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}.assertion.victory_declaration_verified`,
              observationId: `${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}.observation.victory_declaration_state`,
              comparator: 'exists',
              expected: {
                victoryDeclarationShown: true,
                victoryDeclarationText: FEEDBACK_VICTORY_DECLARATION_TEXT,
                victoryDeclarationTrigger: FEEDBACK_VICTORY_DECLARATION_TRIGGER,
                victoryDeclarationOutcome: FEEDBACK_VICTORY_DECLARATION_OUTCOME,
                victoryDeclarationObjectiveCompleted: true
              },
              message: 'victory declaration evidence verifies visible win feedback after the boss-defeat objective'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: FEEDBACK_VICTORY_DECLARATION_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'feedback.victory_declaration.service', version: 'v1' }],
    defaults: {
      trigger: FEEDBACK_VICTORY_DECLARATION_TRIGGER,
      outcome: FEEDBACK_VICTORY_DECLARATION_OUTCOME,
      declarationText: FEEDBACK_VICTORY_DECLARATION_TEXT,
      victoryDeclarationEvent: FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      requiredStateFields: [
        'victoryDeclarationShown',
        'victoryDeclarationText',
        'victoryDeclarationTrigger',
        'victoryDeclarationOutcome',
        'victoryDeclarationObjectiveCompleted'
      ]
    },
    diagnostics: {
      source: 'stage37.feedback_victory_declaration_package_slice'
    }
  };
}
