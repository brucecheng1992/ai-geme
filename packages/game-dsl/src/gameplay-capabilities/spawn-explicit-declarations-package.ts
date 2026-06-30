import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  SPAWN_EXPLICIT_DECLARATIONS_CAPABILITY_ID,
  SPAWN_EXPLICIT_DECLARATIONS_ENEMY_WAVE_SYSTEM_ID,
  SPAWN_EXPLICIT_DECLARATIONS_EVENT_TYPE,
  SPAWN_EXPLICIT_DECLARATIONS_PROFILE_ID,
  SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_DECLARATION_COUNT,
  SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_FAMILY,
  SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_SYSTEM_ID,
  SPAWN_EXPLICIT_DECLARATIONS_SCHEMA_VERSION,
  SPAWN_EXPLICIT_DECLARATIONS_STATIC_SYSTEM_ID
} from './spawn-explicit-declarations-runtime-module.js';

export const SPAWN_EXPLICIT_DECLARATIONS_PACKAGE_VERSION = '1.0.0';
export const SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_PROBE_ID =
  'spawn.explicit_declarations.v1.verify_explicit_declarations.browser_qa.v1';
export const SPAWN_EXPLICIT_DECLARATIONS_PACKAGE_REQUIRED_EVIDENCE_ID =
  'spawn.explicit_declarations.v1.evidence.capability_qa_report.v1';

export function createSpawnExplicitDeclarationsPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: SPAWN_EXPLICIT_DECLARATIONS_CAPABILITY_ID,
      packageVersion: SPAWN_EXPLICIT_DECLARATIONS_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Explicit spawn declarations capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'spawn.explicit_declarations.schema',
      ownedPaths: ['/runtime/spawnDeclarations', '/capability_configs/spawn_explicit_declarations'],
      normalizerId: 'spawn.explicit_declarations.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'spawn.explicit_declarations.ir',
      ownedNodeKinds: ['runtime_system.spawn.explicit_declarations']
    },
    runtime: {
      families: [SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_FAMILY],
      systems: [
        {
          id: SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: ['runtime_manifest', 'spawn.static', 'spawn.enemy_wave']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifySpawnManifest:explicit_declarations', executionPolicy: 'regeneration_required' }],
      compilerId: 'spawn.explicit_declarations.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'spawn.explicit_declarations.patch.manifest_declarations',
          policy: 'regeneration_required',
          ownedPaths: ['/runtime/spawnDeclarations', '/capability_configs/spawn_explicit_declarations']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_PROBE_ID,
          capabilityId: SPAWN_EXPLICIT_DECLARATIONS_CAPABILITY_ID,
          prerequisites: [
            'runtime manifest is available',
            'spawn static package is registered',
            'spawn enemy-wave package is registered',
            'implicit spawn fallback is forbidden'
          ],
          actions: [
            {
              id: `${SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_PROBE_ID}.action.verify_declarations`,
              kind: 'runtime_event',
              target: SPAWN_EXPLICIT_DECLARATIONS_EVENT_TYPE,
              parameters: {
                profileId: SPAWN_EXPLICIT_DECLARATIONS_PROFILE_ID,
                requiredDeclarationCount: SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_DECLARATION_COUNT,
                staticSystemId: SPAWN_EXPLICIT_DECLARATIONS_STATIC_SYSTEM_ID,
                enemyWaveSystemId: SPAWN_EXPLICIT_DECLARATIONS_ENEMY_WAVE_SYSTEM_ID
              }
            }
          ],
          observations: [
            {
              id: `${SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_PROBE_ID}.observation.explicit_declarations`,
              kind: 'state_probe',
              runtimeSystemId: SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_SYSTEM_ID,
              ref: SPAWN_EXPLICIT_DECLARATIONS_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_PROBE_ID}.assertion.explicit_declarations`,
              observationId: `${SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_PROBE_ID}.observation.explicit_declarations`,
              comparator: 'exists',
              expected: {
                spawnExplicitDeclarationsVerified: true,
                spawnExplicitDeclarationsSchemaVersion: SPAWN_EXPLICIT_DECLARATIONS_SCHEMA_VERSION,
                spawnExplicitDeclarationsProfileId: SPAWN_EXPLICIT_DECLARATIONS_PROFILE_ID,
                spawnExplicitDeclarationsRuntimeFamily: SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_FAMILY,
                spawnExplicitDeclarationsRuntimeManifestBound: true,
                spawnExplicitDeclarationsCapabilityLockBound: true,
                spawnExplicitDeclarationsDeclarationCount: SPAWN_EXPLICIT_DECLARATIONS_REQUIRED_DECLARATION_COUNT,
                spawnExplicitDeclarationsStaticDeclared: true,
                spawnExplicitDeclarationsEnemyWaveDeclared: true,
                spawnExplicitDeclarationsNoImplicitFallback: true,
                spawnExplicitDeclarationsHiddenSpawnDetected: false
              },
              message: 'spawn explicit declarations evidence verifies manifest-bound static and enemy-wave declarations with no implicit fallback'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: SPAWN_EXPLICIT_DECLARATIONS_PACKAGE_REQUIRED_EVIDENCE_ID,
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
      { capabilityId: 'runtime.manifest_binding.v1', range: '^v1' },
      { capabilityId: 'spawn.static.v1', range: '^v1' },
      { capabilityId: 'spawn.enemy_wave.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'spawn.explicit_declarations.service', version: 'v1' }],
    defaults: {
      event: SPAWN_EXPLICIT_DECLARATIONS_EVENT_TYPE,
      profileId: SPAWN_EXPLICIT_DECLARATIONS_PROFILE_ID,
      runtimeFamily: SPAWN_EXPLICIT_DECLARATIONS_RUNTIME_FAMILY,
      requiredStateFields: [
        'spawnExplicitDeclarationsVerified',
        'spawnExplicitDeclarationsSchemaVersion',
        'spawnExplicitDeclarationsProfileId',
        'spawnExplicitDeclarationsRuntimeFamily',
        'spawnExplicitDeclarationsRuntimeManifestBound',
        'spawnExplicitDeclarationsCapabilityLockBound',
        'spawnExplicitDeclarationsDeclarationCount',
        'spawnExplicitDeclarationsStaticDeclared',
        'spawnExplicitDeclarationsEnemyWaveDeclared',
        'spawnExplicitDeclarationsNoImplicitFallback',
        'spawnExplicitDeclarationsHiddenSpawnDetected'
      ]
    },
    diagnostics: {
      source: 'stage37.spawn_explicit_declarations_package_slice'
    }
  };
}
