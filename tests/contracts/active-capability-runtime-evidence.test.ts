import { describe, expect, it } from 'vitest';

import {
  ActiveCapabilityComposedGameplayRealizationReportSchema,
  RuntimeModuleLoadReceiptSchema,
  buildActiveCapabilityComposedGameplayRealizationReport,
  buildCapabilityOwnedTelemetryEvidence,
  buildCapabilityPathBuildReport,
  buildCapabilityRuntimeQaPlan,
  buildGenerationPathReceipt,
  buildPhaserRuntimeSystemLoaderPlan,
  buildRuntimeModuleLoadReceipt,
  compileCanonicalCapabilityDslToRuntimePlan,
  createPhaserRuntimeModuleSession,
  evaluateCapabilityQaReport,
  validateGameplayCapabilityPackage,
  type CapabilityQaProbeResult,
  type CapabilityQaReport,
  type CanonicalGameDslV02,
  type GameplayCapabilityLock,
  type GameplayCapabilityPackageContract,
  type PhaserRuntimeLoaderPlan,
  type PhaserRuntimeSystemModule,
  type RuntimeModuleLoadReceipt,
  type RuntimeModuleLifecycleEvent
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const PROJECT_ID = 'proj_20260619_active_runtime';
const RUN_ID = 'run_20260619_active_runtime';
const PROFILE_ID = 'side_scrolling_run_and_gun.v1';
const ENEMY_ENTITY_ID = 'enemy_grunt';
const PROJECTILE_CAPABILITY_ID = 'combat.projectile.v1';
const PROJECTILE_SYSTEM_ID = `system.${PROJECTILE_CAPABILITY_ID}`;
const CAPABILITY_IDS = [PROJECTILE_CAPABILITY_ID, 'enemy.ranged_attack.v1', 'spawn.static.v1', 'telemetry.gameplay_events.v1'] as const;

describe('Step 37 active capability-composed runtime evidence', () => {
  it('binds active lock, manifest, module load, real enemy.fired, QA, and build evidence to the same run', async () => {
    const fixture = await buildActiveRuntimeFixture();

    expect(ActiveCapabilityComposedGameplayRealizationReportSchema.parse(fixture.realizationReport)).toEqual(fixture.realizationReport);
    expect(fixture.realizationReport).toMatchObject({
      identity: {
        projectId: PROJECT_ID,
        runId: RUN_ID,
        selectedPath: 'capability_composed_v1',
        executionMode: 'active',
        profileId: PROFILE_ID
      },
      status: 'passed',
      exactCapabilityLockHash: fixture.capabilityLock.lockHash,
      runtimeManifestHash: hashStableJson(fixture.runtimeManifest),
      runtimePlanHash: fixture.runtimePlan.planHash,
      runtimeModuleLoadReceiptHash: fixture.moduleLoadReceipt.receiptHash,
      enemyFiredEvidenceHash: fixture.telemetryEvidence.evidenceHash,
      capabilityQaReportHash: fixture.capabilityQaReport.reportHash,
      buildReportHash: fixture.buildReport.reportHash,
      enemyFired: {
        eventCount: 1,
        producerSystemId: PROJECTILE_SYSTEM_ID,
        producerCapabilityId: PROJECTILE_CAPABILITY_ID,
        enemyEntityId: ENEMY_ENTITY_ID
      },
      capabilityQa: {
        status: 'passed',
        boundTelemetryEvidenceHash: fixture.telemetryEvidence.evidenceHash
      },
      build: {
        status: 'passed',
        command: 'npm run typecheck:root'
      },
      blockers: []
    });
    expect(fixture.realizationReport.lockedPackageRefs).toEqual(
      fixture.capabilityLock.packages.map((pkg) => ({
        capabilityId: pkg.capabilityId,
        packageVersion: pkg.packageVersion,
        packageHash: pkg.packageHash
      }))
    );
    expect(fixture.telemetryEvents).toEqual([
      {
        type: 'enemy.fired',
        producerSystemId: PROJECTILE_SYSTEM_ID,
        enemyEntityId: ENEMY_ENTITY_ID,
        payload: {
          enemyEntityId: ENEMY_ENTITY_ID,
          projectileId: 'projectile_active_001',
          source: 'capability_runtime_module'
        }
      }
    ]);
    expect(fixture.moduleLoadReceipt.lifecycleEvents.map((event) => `${event.phase}:${event.systemId}`)).toEqual(
      expect.arrayContaining([`update:${PROJECTILE_SYSTEM_ID}`, `dispose:${PROJECTILE_SYSTEM_ID}`])
    );
  });

  it('blocks telemetry evidence when enemy.fired has no reachable runtime update trigger', async () => {
    const fixture = await buildActiveRuntimeFixture();
    const missingUpdateReceipt = buildRuntimeModuleLoadReceipt({
      projectId: PROJECT_ID,
      runId: RUN_ID,
      profileId: PROFILE_ID,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: fixture.loaderPlan,
      lifecycleEvents: fixture.rawLifecycleEvents.filter(
        (event) => !(event.phase === 'update' && event.systemId === PROJECTILE_SYSTEM_ID)
      )
    });
    const telemetryEvidence = buildCapabilityOwnedTelemetryEvidence({
      projectId: PROJECT_ID,
      runId: RUN_ID,
      profileId: PROFILE_ID,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: fixture.loaderPlan,
      moduleLoadReceipt: missingUpdateReceipt,
      event: fixture.telemetryEvents[0]
    });

    expect(RuntimeModuleLoadReceiptSchema.parse(missingUpdateReceipt)).toEqual(missingUpdateReceipt);
    expect(missingUpdateReceipt.status).toBe('failed');
    expect(missingUpdateReceipt.issues).toContain(`runtime_module_not_updated:${PROJECTILE_SYSTEM_ID}`);
    expect(telemetryEvidence.status).toBe('blocked');
    expect(telemetryEvidence.issues).toEqual(expect.arrayContaining(['runtime_module_load_not_loaded', `telemetry_trigger_not_reachable:${PROJECTILE_SYSTEM_ID}`]));
  });

  it('does not pass active realization when capability QA is not bound to the real enemy.fired evidence', async () => {
    const fixture = await buildActiveRuntimeFixture();
    const qaReportWithoutTelemetryRef = withQaObservationRefs(fixture.capabilityQaReport, []);
    const report = buildActiveCapabilityComposedGameplayRealizationReport({
      generationPathReceipt: fixture.generationPathReceipt,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: fixture.loaderPlan,
      moduleLoadReceipt: fixture.moduleLoadReceipt,
      telemetryEvidence: fixture.telemetryEvidence,
      capabilityQaPlan: fixture.capabilityQaPlan,
      capabilityQaReport: qaReportWithoutTelemetryRef,
      buildReport: fixture.buildReport
    });

    expect(report.status).toBe('blocked');
    expect(report.blockers).toContain('capability_qa_not_bound_to_enemy_fired_evidence');
    expect(report.capabilityQa.boundTelemetryEvidenceHash).toBeUndefined();
  });

  it('does not allow enemy.fired evidence to be spliced across module load receipts', async () => {
    const fixture = await buildActiveRuntimeFixture();
    const firstDisposeIndex = fixture.rawLifecycleEvents.findIndex((event) => event.phase === 'dispose');
    const alternateModuleLoadReceipt = buildRuntimeModuleLoadReceipt({
      projectId: PROJECT_ID,
      runId: RUN_ID,
      profileId: PROFILE_ID,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: fixture.loaderPlan,
      lifecycleEvents: [
        ...fixture.rawLifecycleEvents.slice(0, firstDisposeIndex),
        { phase: 'update', systemId: PROJECTILE_SYSTEM_ID, deltaMs: 8 },
        ...fixture.rawLifecycleEvents.slice(firstDisposeIndex)
      ]
    });
    const report = buildActiveCapabilityComposedGameplayRealizationReport({
      generationPathReceipt: fixture.generationPathReceipt,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: fixture.loaderPlan,
      moduleLoadReceipt: alternateModuleLoadReceipt,
      telemetryEvidence: fixture.telemetryEvidence,
      capabilityQaPlan: fixture.capabilityQaPlan,
      capabilityQaReport: fixture.capabilityQaReport,
      buildReport: fixture.buildReport
    });

    expect(alternateModuleLoadReceipt.status).toBe('loaded');
    expect(alternateModuleLoadReceipt.receiptHash).not.toBe(fixture.moduleLoadReceipt.receiptHash);
    expect(report.status).toBe('blocked');
    expect(report.blockers).toContain('enemy_fired_module_load_receipt_hash_mismatch');
  });

  it('blocks final realization when the loader plan hash is stale', async () => {
    const fixture = await buildActiveRuntimeFixture();
    const report = buildActiveCapabilityComposedGameplayRealizationReport({
      generationPathReceipt: fixture.generationPathReceipt,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: { ...fixture.loaderPlan, planHash: 'fnv1a_stale_loader_plan' },
      moduleLoadReceipt: fixture.moduleLoadReceipt,
      telemetryEvidence: fixture.telemetryEvidence,
      capabilityQaPlan: fixture.capabilityQaPlan,
      capabilityQaReport: fixture.capabilityQaReport,
      buildReport: fixture.buildReport
    });

    expect(report.status).toBe('blocked');
    expect(report.blockers).toContain('loader_plan_hash_invalid');
  });

  it('marks module load receipt failed when loader plan omits a manifest system', async () => {
    const fixture = await buildActiveRuntimeFixture();
    const incompleteLoaderPlan = withLoaderPlanSystemRemoved(fixture.loaderPlan, PROJECTILE_SYSTEM_ID);
    const receipt = buildRuntimeModuleLoadReceipt({
      projectId: PROJECT_ID,
      runId: RUN_ID,
      profileId: PROFILE_ID,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: incompleteLoaderPlan,
      lifecycleEvents: fixture.rawLifecycleEvents.filter((event) => event.systemId !== PROJECTILE_SYSTEM_ID)
    });

    expect(receipt.status).toBe('failed');
    expect(receipt.issues).toContain(`loader_plan_manifest_system_not_loaded:${PROJECTILE_SYSTEM_ID}`);
  });

  it('blocks final realization when a manifest system is bound to the wrong receipt capability', async () => {
    const fixture = await buildActiveRuntimeFixture();
    const enemyPackage = fixture.capabilityLock.packages.find((pkg) => pkg.capabilityId === 'enemy.ranged_attack.v1');
    if (enemyPackage === undefined) {
      throw new Error('Expected enemy package fixture.');
    }
    const mismatchedReceipt = withReceiptCapability(fixture.moduleLoadReceipt, PROJECTILE_SYSTEM_ID, {
      capabilityId: enemyPackage.capabilityId,
      packageVersion: enemyPackage.packageVersion,
      packageHash: enemyPackage.packageHash
    });
    const report = buildActiveCapabilityComposedGameplayRealizationReport({
      generationPathReceipt: fixture.generationPathReceipt,
      capabilityLock: fixture.capabilityLock,
      runtimeManifest: fixture.runtimeManifest,
      runtimePlan: fixture.runtimePlan,
      loaderPlan: fixture.loaderPlan,
      moduleLoadReceipt: mismatchedReceipt,
      telemetryEvidence: fixture.telemetryEvidence,
      capabilityQaPlan: fixture.capabilityQaPlan,
      capabilityQaReport: fixture.capabilityQaReport,
      buildReport: fixture.buildReport
    });

    expect(report.status).toBe('blocked');
    expect(report.blockers).toContain(`runtime_manifest_capability_mismatch:${PROJECTILE_SYSTEM_ID}`);
  });

  it('rejects passed reports whose evidenceRefs hashes do not match the report fields', async () => {
    const fixture = await buildActiveRuntimeFixture();
    const payload = {
      ...fixture.realizationReport,
      evidenceRefs: fixture.realizationReport.evidenceRefs.map((ref) =>
        ref.artifactKind === 'runtime_module_load_receipt' ? { ...ref, hash: 'fnv1a_wrong_receipt' } : ref
      )
    };
    const { reportHash: _reportHash, ...payloadWithoutHash } = payload;
    const tamperedReport = { ...payloadWithoutHash, reportHash: hashStableJson(payloadWithoutHash) };

    expect(() => ActiveCapabilityComposedGameplayRealizationReportSchema.parse(tamperedReport)).toThrow(
      'runtime_module_load_receipt evidenceRef hash must match report field'
    );
  });
});

async function buildActiveRuntimeFixture() {
  const packages = CAPABILITY_IDS.map((capabilityId) => createPackageContract(capabilityId));
  const capabilityLock = createCapabilityLock(packages);
  const canonicalDsl = createCanonicalDsl(capabilityLock);
  const compiled = compileCanonicalCapabilityDslToRuntimePlan({ canonicalDsl, capabilityLock });
  if (compiled.status !== 'compiled') {
    throw new Error(`Expected compiled canonical fixture, got ${compiled.status}`);
  }
  const loaderReport = buildPhaserRuntimeSystemLoaderPlan({
    gameIr: compiled.capabilityIr,
    manifest: compiled.runtimeSystemManifest,
    capabilityLock: {
      ref: 'gameplay_capability_lock.json',
      hash: capabilityLock.lockHash,
      capabilityIds: capabilityLock.capabilityIds
    }
  });
  if (loaderReport.status !== 'ready' || loaderReport.plan === undefined) {
    throw new Error(`Expected ready runtime loader fixture, got ${loaderReport.status}`);
  }

  const rawLifecycleEvents: Array<{ phase: RuntimeModuleLifecycleEvent['phase']; systemId: string; deltaMs?: number }> = [];
  const telemetryEvents: Array<{
    type: 'enemy.fired';
    producerSystemId: string;
    enemyEntityId: string;
    payload: { enemyEntityId: string; projectileId: string; source: string };
  }> = [];
  const modules = Object.fromEntries(
    loaderReport.plan.loadOrder.map((entry): [string, PhaserRuntimeSystemModule] => [
      entry.systemId,
      {
        id: entry.systemId,
        install: () => {
          rawLifecycleEvents.push({ phase: 'install', systemId: entry.systemId });
        },
        start: () => {
          rawLifecycleEvents.push({ phase: 'start', systemId: entry.systemId });
        },
        update: (_context, deltaMs) => {
          rawLifecycleEvents.push({ phase: 'update', systemId: entry.systemId, deltaMs });
          if (entry.systemId === PROJECTILE_SYSTEM_ID) {
            telemetryEvents.push({
              type: 'enemy.fired',
              producerSystemId: entry.systemId,
              enemyEntityId: ENEMY_ENTITY_ID,
              payload: {
                enemyEntityId: ENEMY_ENTITY_ID,
                projectileId: 'projectile_active_001',
                source: 'capability_runtime_module'
              }
            });
          }
        },
        snapshot: () => ({ systemId: entry.systemId, loaded: true }),
        dispose: () => {
          rawLifecycleEvents.push({ phase: 'dispose', systemId: entry.systemId });
        }
      }
    ])
  );

  const session = createPhaserRuntimeModuleSession({ plan: loaderReport.plan, modules });
  await session.installAll();
  await session.startAll();
  session.update(16);
  await session.dispose();

  const moduleLoadReceipt = buildRuntimeModuleLoadReceipt({
    projectId: PROJECT_ID,
    runId: RUN_ID,
    profileId: PROFILE_ID,
    capabilityLock,
    runtimeManifest: compiled.runtimeSystemManifest,
    runtimePlan: compiled.runtimePlan,
    loaderPlan: loaderReport.plan,
    lifecycleEvents: rawLifecycleEvents
  });
  const telemetryEvidence = buildCapabilityOwnedTelemetryEvidence({
    projectId: PROJECT_ID,
    runId: RUN_ID,
    profileId: PROFILE_ID,
    capabilityLock,
    runtimeManifest: compiled.runtimeSystemManifest,
    runtimePlan: compiled.runtimePlan,
    loaderPlan: loaderReport.plan,
    moduleLoadReceipt,
    event: telemetryEvents[0]
  });
  const capabilityQaPlan = buildCapabilityRuntimeQaPlan({ profileId: PROFILE_ID, capabilityLock, packages });
  const capabilityQaReport = evaluateCapabilityQaReport({
    plan: capabilityQaPlan,
    probeResults: capabilityQaPlan.requiredProbes.map((probe): CapabilityQaProbeResult => ({
      probeId: probe.id,
      status: 'passed',
      assertionResults: probe.assertions.map((assertion) => ({ assertionId: assertion.id, status: 'passed' })),
      observationRefs: probe.capabilityId === PROJECTILE_CAPABILITY_ID ? [telemetryEvidence.evidenceHash] : [moduleLoadReceipt.receiptHash]
    }))
  });
  const buildReport = buildCapabilityPathBuildReport({
    projectId: PROJECT_ID,
    runId: RUN_ID,
    profileId: PROFILE_ID,
    capabilityLock,
    runtimeManifest: compiled.runtimeSystemManifest,
    runtimePlan: compiled.runtimePlan,
    loaderPlan: loaderReport.plan,
    command: 'npm run typecheck:root',
    exitCode: 0,
    evidenceRefs: [moduleLoadReceipt.receiptHash, telemetryEvidence.evidenceHash, capabilityQaReport.reportHash]
  });
  const generationPathReceipt = buildGenerationPathReceipt({
    projectId: PROJECT_ID,
    runId: RUN_ID,
    selectedPath: 'capability_composed_v1',
    targetPath: 'capability_composed_v1',
    dslSource: 'model_provider',
    selectionReason: 'Commit 5 active capability-composed reference run evidence.',
    profileId: PROFILE_ID,
    capabilityReadiness: 'ready',
    artifactRefs: [
      { artifactKind: 'gameplay_capability_lock', path: 'gameplay_capability_lock.json' },
      { artifactKind: 'runtime_system_manifest', path: 'runtime-system-manifest.json' },
      { artifactKind: 'runtime_module_load_receipt', path: 'runtime-module-load-receipt.json' },
      { artifactKind: 'capability_owned_telemetry_evidence', path: 'capability-owned-telemetry-evidence.json' }
    ]
  });
  const realizationReport = buildActiveCapabilityComposedGameplayRealizationReport({
    generationPathReceipt,
    capabilityLock,
    runtimeManifest: compiled.runtimeSystemManifest,
    runtimePlan: compiled.runtimePlan,
    loaderPlan: loaderReport.plan,
    moduleLoadReceipt,
    telemetryEvidence,
    capabilityQaPlan,
    capabilityQaReport,
    buildReport
  });

  return {
    capabilityLock,
    runtimeManifest: compiled.runtimeSystemManifest,
    runtimePlan: compiled.runtimePlan,
    loaderPlan: loaderReport.plan,
    rawLifecycleEvents,
    telemetryEvents,
    moduleLoadReceipt,
    telemetryEvidence,
    capabilityQaPlan,
    capabilityQaReport,
    buildReport,
    generationPathReceipt,
    realizationReport
  };
}

function createCanonicalDsl(capabilityLock: GameplayCapabilityLock): CanonicalGameDslV02 {
  return {
    artifactKind: 'canonical_game_dsl',
    schema_version: 'game-dsl.v0.2',
    projectId: PROJECT_ID,
    runId: RUN_ID,
    source: {
      game_brief_hash: 'fnv1a_brief',
      profile_resolution_hash: 'fnv1a_profile',
      capability_lock_hash: capabilityLock.lockHash,
      composed_schema_hash: 'fnv1a_schema',
      draft_hash: 'fnv1a_draft'
    },
    profile: {
      id: PROFILE_ID,
      runtime_family: 'phaser_2d_action_arcade.v1'
    },
    capability_ids: [...capabilityLock.capabilityIds],
    play_time_intent: { mode: 'range', min_sec: 180, max_sec: 420 },
    progression: {
      estimated_total_sec: { min_sec: 180, max_sec: 420 },
      segments: [
        {
          id: 'approach',
          order: 0,
          duration_target_sec: { min_sec: 60, max_sec: 120 },
          capability_ids: ['spawn.static.v1', PROJECTILE_CAPABILITY_ID]
        },
        {
          id: 'pressure',
          order: 1,
          duration_target_sec: { min_sec: 90, max_sec: 180 },
          capability_ids: ['enemy.ranged_attack.v1', PROJECTILE_CAPABILITY_ID]
        },
        {
          id: 'finish',
          order: 2,
          duration_target_sec: { min_sec: 120, max_sec: 240 },
          capability_ids: ['telemetry.gameplay_events.v1', PROJECTILE_CAPABILITY_ID]
        }
      ]
    },
    scenes: [
      {
        id: 'frontline',
        segment_ids: ['approach', 'pressure', 'finish'],
        entity_ids: ['player', ENEMY_ENTITY_ID, 'player_projectile'],
        capability_ids: [...capabilityLock.capabilityIds],
        config: { lanes: 1 }
      }
    ],
    entities: [
      { id: 'player', role: 'player', tags: ['hero'], capability_ids: [], config: { hp: 3 } },
      { id: ENEMY_ENTITY_ID, role: 'enemy', tags: ['ranged'], capability_ids: ['enemy.ranged_attack.v1'], config: { hp: 1 } },
      { id: 'player_projectile', role: 'projectile', tags: ['shot'], capability_ids: [PROJECTILE_CAPABILITY_ID], config: { speed: 420 } }
    ],
    systems: capabilityLock.capabilityIds.map((capabilityId) => ({
      id: capabilityId.replaceAll('.', '_'),
      capability_id: capabilityId,
      source_kind: 'capability_config',
      applies_to_entity_ids: capabilityId === PROJECTILE_CAPABILITY_ID ? [ENEMY_ENTITY_ID] : [],
      source_draft_id: `${capabilityId.replaceAll('.', '_')}_draft`,
      config: { enabled: true }
    })),
    objectives: [
      {
        id: 'destroy_enemy',
        kind: 'destroy_target',
        target: ENEMY_ENTITY_ID,
        success_condition: { targetEntityId: ENEMY_ENTITY_ID },
        capability_ids: ['enemy.ranged_attack.v1', PROJECTILE_CAPABILITY_ID]
      }
    ],
    waves: [
      {
        id: 'wave_alpha',
        segment_id: 'approach',
        enemy_entity_id: ENEMY_ENTITY_ID,
        count: 3,
        spawn: { x: 640, y: 320 },
        capability_ids: ['spawn.static.v1', 'enemy.ranged_attack.v1']
      }
    ],
    pickups: [],
    bosses: [],
    metadata: {
      title: 'Active Runtime Evidence',
      tags: ['run_and_gun']
    }
  };
}

function createCapabilityLock(packages: GameplayCapabilityPackageContract[]): GameplayCapabilityLock {
  const payload = {
    artifactKind: 'gameplay_capability_lock' as const,
    schemaVersion: 'gameplay_capability_lock.v0.1' as const,
    profileId: PROFILE_ID,
    runtimeFamily: 'phaser_2d_action_arcade.v1' as const,
    capabilityIds: packages.map((pkg) => pkg.manifest.id).sort(),
    packages: packages
      .map((pkg) => {
        const report = validateGameplayCapabilityPackage(pkg);
        if (!report.supportEligible || report.packageHash === undefined) {
          throw new Error(`Expected support-eligible package ${pkg.manifest.id}: ${JSON.stringify(report.issues)}`);
        }
        return {
          capabilityId: pkg.manifest.id,
          packageVersion: pkg.manifest.packageVersion,
          packageHash: report.packageHash
        };
      })
      .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId))
  };
  return { ...payload, lockHash: hashStableJson(payload) };
}

function createPackageContract(capabilityId: string): GameplayCapabilityPackageContract {
  const systemId = `system.${capabilityId}`;
  const ownedPath = `/systems/${capabilityId}`;
  const observationId =
    capabilityId === PROJECTILE_CAPABILITY_ID ? `${capabilityId}.qa.enemy_fired.observation` : `${capabilityId}.qa.loaded.observation`;
  return {
    manifest: {
      id: capabilityId,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: `${capabilityId} active evidence package.`,
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: 'gameplay-capability-package.v1'
    },
    dsl: {
      schemaFragmentId: `${capabilityId}.schema`,
      ownedPaths: [ownedPath],
      normalizerId: `${capabilityId}.normalizer`,
      migrations: []
    },
    ir: {
      compilerId: `${capabilityId}.ir`,
      ownedNodeKinds: [`node.${capabilityId}`]
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: systemId, version: 'v1', phase: capabilityId.startsWith('telemetry.') ? 'telemetry' : 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: `SetCapabilityConfig:${capabilityId}`, executionPolicy: 'hot_runtime_patch' }],
      compilerId: `${capabilityId}.amendments`
    },
    patch: {
      descriptors: [{ id: `${capabilityId}.patch`, policy: 'hot_runtime_patch', ownedPaths: [`${ownedPath}/config`] }]
    },
    qa: {
      probes: [
        {
          id: capabilityId === PROJECTILE_CAPABILITY_ID ? `${capabilityId}.qa.enemy_fired` : `${capabilityId}.qa.loaded`,
          capabilityId,
          prerequisites: [`${capabilityId} runtime module installed`],
          actions: [
            {
              id: capabilityId === PROJECTILE_CAPABILITY_ID ? `${capabilityId}.qa.fire.action` : `${capabilityId}.qa.loaded.action`,
              kind: 'runtime_event',
              target: capabilityId === PROJECTILE_CAPABILITY_ID ? 'enemy.fired' : 'runtime.module.loaded',
              parameters: {}
            }
          ],
          observations: [
            {
              id: observationId,
              kind: capabilityId === PROJECTILE_CAPABILITY_ID ? 'runtime_event' : 'state_probe',
              runtimeSystemId: systemId,
              ref: capabilityId === PROJECTILE_CAPABILITY_ID ? 'enemy.fired' : 'runtime.loaded'
            }
          ],
          assertions: [
            {
              id: capabilityId === PROJECTILE_CAPABILITY_ID ? `${capabilityId}.qa.enemy_fired.assertion` : `${capabilityId}.qa.loaded.assertion`,
              observationId,
              comparator: capabilityId === PROJECTILE_CAPABILITY_ID ? 'minimum_count' : 'exists',
              expected: capabilityId === PROJECTILE_CAPABILITY_ID ? 1 : true,
              message: capabilityId === PROJECTILE_CAPABILITY_ID ? 'enemy.fired is produced by the projectile runtime module.' : 'runtime module loaded.'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [{ id: `${capabilityId}.evidence.runtime`, artifactKind: 'capability_qa_report', required: true }]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [],
    defaults: {},
    diagnostics: {}
  };
}

function withQaObservationRefs(report: CapabilityQaReport, observationRefs: string[]): CapabilityQaReport {
  const { reportHash: _reportHash, ...reportPayload } = report;
  const payload: Omit<CapabilityQaReport, 'reportHash'> = {
    ...reportPayload,
    requiredResults: report.requiredResults.map((result) =>
      result.probeId === `${PROJECTILE_CAPABILITY_ID}.qa.enemy_fired` ? { ...result, observationRefs } : result
    )
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function withReceiptCapability(
  receipt: RuntimeModuleLoadReceipt,
  systemId: string,
  lockedPackage: { capabilityId: string; packageVersion: string; packageHash: string }
): RuntimeModuleLoadReceipt {
  const { receiptHash: _receiptHash, ...receiptPayload } = receipt;
  const payload: Omit<RuntimeModuleLoadReceipt, 'receiptHash'> = {
    ...receiptPayload,
    loadOrder: receipt.loadOrder.map((entry) =>
      entry.systemId === systemId
        ? {
            ...entry,
            capabilityId: lockedPackage.capabilityId,
            packageVersion: lockedPackage.packageVersion,
            packageHash: lockedPackage.packageHash
          }
        : entry
    )
  };
  return RuntimeModuleLoadReceiptSchema.parse({ ...payload, receiptHash: hashStableJson(payload) });
}

function withLoaderPlanSystemRemoved(loaderPlan: PhaserRuntimeLoaderPlan, systemId: string): PhaserRuntimeLoaderPlan {
  const { planHash: _planHash, ...loaderPlanPayload } = loaderPlan;
  const payload: Omit<PhaserRuntimeLoaderPlan, 'planHash'> = {
    ...loaderPlanPayload,
    loadOrder: loaderPlan.loadOrder.filter((entry) => entry.systemId !== systemId),
    updateLoopSystemIds: loaderPlan.updateLoopSystemIds.filter((id) => id !== systemId)
  };
  return { ...payload, planHash: hashStableJson(payload) };
}
