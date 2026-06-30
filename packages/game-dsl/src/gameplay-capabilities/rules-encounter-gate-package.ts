import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  RULES_ENCOUNTER_GATE_CAPABILITY_ID,
  RULES_ENCOUNTER_GATE_ENTRANCE_ID,
  RULES_ENCOUNTER_GATE_EVENT_TYPE,
  RULES_ENCOUNTER_GATE_GATE_ID,
  RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
  RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
  RULES_ENCOUNTER_GATE_WAVE_ID
} from './rules-encounter-gate-runtime-module.js';

export const RULES_ENCOUNTER_GATE_PACKAGE_VERSION = '1.0.0';
export const RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID = 'rules.encounter_gate.v1.close_entrance.browser_qa.v1';
export const RULES_ENCOUNTER_GATE_PACKAGE_REQUIRED_EVIDENCE_ID = 'rules.encounter_gate.v1.evidence.capability_qa_report.v1';

export function createRulesEncounterGatePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: RULES_ENCOUNTER_GATE_CAPABILITY_ID,
      packageVersion: RULES_ENCOUNTER_GATE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Encounter entrance gate closes before the first enemy-core wave starts.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'rules.encounter_gate.schema',
      ownedPaths: ['/capability_configs/encounter_gate', '/level/segments/enemy_core/gates'],
      normalizerId: 'rules.encounter_gate.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'rules.encounter_gate.ir',
      ownedNodeKinds: ['runtime_system.rules.encounter_gate']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['spawn.enemy_wave']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetEncounterGate:close_entrance_before_enemy_wave', executionPolicy: 'regeneration_required' }],
      compilerId: 'rules.encounter_gate.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'rules.encounter_gate.patch.close_entrance_before_wave',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/encounter_gate', '/level/segments/enemy_core/gates']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID,
          capabilityId: RULES_ENCOUNTER_GATE_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'player reaches the enemy-core entrance',
            'encounter entrance gate closes before the first enemy wave is consumed by runtime'
          ],
          actions: [
            {
              id: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.action.enter_enemy_core`,
              kind: 'runtime_event',
              target: RULES_ENCOUNTER_GATE_EVENT_TYPE,
              parameters: {
                gateId: RULES_ENCOUNTER_GATE_GATE_ID,
                entranceId: RULES_ENCOUNTER_GATE_ENTRANCE_ID,
                nextWaveId: RULES_ENCOUNTER_GATE_WAVE_ID,
                sequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX
              }
            }
          ],
          observations: [
            {
              id: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.observation.closed_entrance`,
              kind: 'state_probe',
              runtimeSystemId: RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
              ref: RULES_ENCOUNTER_GATE_EVENT_TYPE
            },
            {
              id: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.observation.ordered_wave`,
              kind: 'runtime_event',
              runtimeSystemId: RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
              ref: 'spawn.enemy_wave.ordered'
            }
          ],
          assertions: [
            {
              id: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.assertion.closed_before_wave`,
              observationId: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.observation.closed_entrance`,
              comparator: 'exists',
              expected: {
                encounterGateClosedEntrance: true,
                encounterGateGateId: RULES_ENCOUNTER_GATE_GATE_ID,
                encounterGateEntranceId: RULES_ENCOUNTER_GATE_ENTRANCE_ID,
                encounterGateClosedBeforeWaveSpawn: true,
                encounterGateWaveSequenceBlockedUntilClosed: true,
                encounterGateSequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
                encounterGateNextWaveId: RULES_ENCOUNTER_GATE_WAVE_ID,
                encounterGatePlayerBacktrackingBlocked: true
              },
              message: 'encounter gate evidence verifies the enemy-core entrance closed before the first wave started'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: RULES_ENCOUNTER_GATE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'spawn.enemy_wave.v1', range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'rules.encounter_gate.service', version: 'v1' }],
    defaults: {
      gateId: RULES_ENCOUNTER_GATE_GATE_ID,
      entranceId: RULES_ENCOUNTER_GATE_ENTRANCE_ID,
      nextWaveId: RULES_ENCOUNTER_GATE_WAVE_ID,
      sequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
      gateClosedEvent: RULES_ENCOUNTER_GATE_EVENT_TYPE,
      requiredStateFields: [
        'encounterGateClosedEntrance',
        'encounterGateGateId',
        'encounterGateEntranceId',
        'encounterGateClosedBeforeWaveSpawn',
        'encounterGateWaveSequenceBlockedUntilClosed',
        'encounterGateSequenceIndex',
        'encounterGateNextWaveId',
        'encounterGatePlayerBacktrackingBlocked'
      ]
    },
    diagnostics: {
      source: 'stage37.rules_encounter_gate_package_slice'
    }
  };
}
