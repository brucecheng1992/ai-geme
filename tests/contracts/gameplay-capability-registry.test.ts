import { describe, expect, it } from 'vitest';

import {
  buildGameplayCapabilityInventoryReport,
  buildGameplayCapabilityRegistrySnapshot,
  createGameplayCapabilityRegistry,
  findGameplayCapability,
  GameplayCapabilityRegistry,
  deriveGameplayCapabilitySupportEvidenceDimensions,
  getMissingGameplayCapabilitySupportEvidencePrerequisites,
  isCompleteSupportedGameplayCapability,
  isRuntimeGenreExecutable,
  listGameplayProfileRuntimeStatuses,
  RuntimeGenreRegistry,
  validateGameplayCapabilityRegistry,
  type GameplayCapabilityDescriptor,
  type RuntimeGenreCapability
} from '../../packages/game-dsl/src/index.js';

describe('Gameplay capability registry', () => {
  it('keeps capability IDs unique, sorted, and conservatively statused', () => {
    const ids = GameplayCapabilityRegistry.entries.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
    expect(findGameplayCapability('camera.side_follow.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['side_view_camera']
    });
    expect(findGameplayCapability('collision.platform.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['platform_collision', 'terrain_collision', 'platforms_terrain_collision']
    });
    expect(findGameplayCapability('movement.run_jump.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['run_jump_controller']
    });
    expect(findGameplayCapability('spawn.static.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['enemy_spawn', 'enemy_spawn_triggers']
    });
    expect(GameplayCapabilityRegistry.entries.some(isCompleteSupportedGameplayCapability)).toBe(false);
  });

  it('rejects duplicate capability IDs', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const result = validateGameplayCapabilityRegistry([base, { ...base }]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'DUPLICATE_CAPABILITY_ID',
            path: 'entries.1.id'
          })
        ])
      );
    }
  });

  it('rejects invalid IDs and version drift', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const badId = validateGameplayCapabilityRegistry([{ ...base, id: 'movement.run_jump' }]);
    const badVersion = validateGameplayCapabilityRegistry([{ ...base, id: 'movement.run_jump.v2', version: 'v1' }]);
    const badDomain = validateGameplayCapabilityRegistry([{ ...base, domain: 'combat' }]);

    expect(badId.ok).toBe(false);
    expect(badVersion.ok).toBe(false);
    expect(badDomain.ok).toBe(false);
    if (!badId.ok) {
      expect(badId.issues.some((issue) => issue.code === 'CAPABILITY_SCHEMA_INVALID' && issue.path.endsWith('.id'))).toBe(true);
    }
    if (!badVersion.ok) {
      expect(badVersion.issues.some((issue) => issue.code === 'CAPABILITY_SCHEMA_INVALID' && issue.path.endsWith('.version'))).toBe(true);
    }
    if (!badDomain.ok) {
      expect(badDomain.issues.some((issue) => issue.code === 'CAPABILITY_SCHEMA_INVALID' && issue.path.endsWith('.domain'))).toBe(true);
    }
  });

  it('audits profile membership against RuntimeGenreRegistry profile IDs and legacy aliases', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const unknownProfile = validateGameplayCapabilityRegistry([{ ...base, profiles: ['unknown_profile.v1'] }]);
    const missingLegacyProfile = validateGameplayCapabilityRegistry([{ ...base, profiles: [] }]);

    expect(unknownProfile.ok).toBe(false);
    if (!unknownProfile.ok) {
      expect(unknownProfile.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UNKNOWN_GAMEPLAY_PROFILE'
          })
        ])
      );
    }

    expect(missingLegacyProfile.ok).toBe(false);
    if (!missingLegacyProfile.ok) {
      expect(missingLegacyProfile.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'LEGACY_PROFILE_MEMBERSHIP_MISMATCH'
          })
        ])
      );
    }
  });

  it('rejects complete supported capabilities without verified capability-owned QA', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const result = validateGameplayCapabilityRegistry([
      {
        ...base,
        status: 'complete_supported',
        evidence: {
          dslSchema: true,
          normalizer: true,
          irCompiler: true,
          runtimeModule: true,
          amendmentOperations: true,
          capabilityOwnedQa: false,
          artifactEvidence: true,
          renderContract: true
        },
        qa: { requiredProbeIds: [], requiredProbesVerified: false },
        blockers: []
      }
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.message).join('\n')).toContain('complete_supported capability requires capabilityOwnedQa evidence');
      expect(result.issues.map((issue) => issue.message).join('\n')).toContain('complete_supported capability requires verified required QA probes');
    }
  });

  it('builds deterministic snapshot and inventory report artifacts', () => {
    const first = buildGameplayCapabilityRegistrySnapshot();
    const second = buildGameplayCapabilityRegistrySnapshot();
    const inventory = buildGameplayCapabilityInventoryReport();

    expect(first).toEqual(second);
    expect(first.artifactKind).toBe('capability_registry_snapshot');
    expect(first.snapshotHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(inventory.artifactKind).toBe('capability_inventory_report');
    expect(inventory.completeSupportedCapabilityIds).toEqual([]);
    expect(inventory.incompleteRuntimeBackedCapabilityIds).toEqual(inventory.runtimeBackedCapabilityIds);
  });

  it('scopes default straight weapon runtime evidence without completing M3 weapon support', () => {
    const defaultWeapon = findGameplayCapability('weapon.default_straight_single.v1');

    if (defaultWeapon === undefined) {
      throw new Error('Expected weapon.default_straight_single.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(defaultWeapon)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(defaultWeapon.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(defaultWeapon.qa).toEqual({
      requiredProbeIds: ['weapon.default_straight_single.v1.fire.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(defaultWeapon)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(defaultWeapon)).toBe(false);

    for (const capabilityId of ['weapon.spread_shot.v1', 'weapon.rapid_fire.v1', 'weapon.replacement_rule.v1', 'weapon.death_reset.v1']) {
      const capability = findGameplayCapability(capabilityId);
      if (capability === undefined) {
        throw new Error(`Expected ${capabilityId} in registry.`);
      }
      expect(deriveGameplayCapabilitySupportEvidenceDimensions(capability)).toMatchObject({
        runtime_consumed: false,
        qa_observed: false
      });
    }
  });

  it('scopes collision platform package-owned QA without static support promotion', () => {
    const collision = findGameplayCapability('collision.platform.v1');

    if (collision === undefined) {
      throw new Error('Expected collision.platform.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(collision)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(collision.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(collision.qa).toEqual({
      requiredProbeIds: ['collision.platform.v1.grounded.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(collision)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(collision)).toBe(false);
  });

  it('scopes spawn static package-owned QA without static support promotion', () => {
    const spawnStatic = findGameplayCapability('spawn.static.v1');

    if (spawnStatic === undefined) {
      throw new Error('Expected spawn.static.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(spawnStatic)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(spawnStatic.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(spawnStatic.qa).toEqual({
      requiredProbeIds: ['spawn.static.v1.triggered.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(spawnStatic)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(spawnStatic)).toBe(false);
  });

  it('derives profile runtime status from RuntimeGenreRegistry instead of a second supported list', () => {
    const statuses = listGameplayProfileRuntimeStatuses();
    const executableGenres = RuntimeGenreRegistry.filter(isRuntimeGenreExecutable).map((entry) => entry.genre);

    expect(statuses.filter((status) => status.runtimeExecutable).map((status) => status.runtimeGenre)).toEqual(executableGenres);
    for (const status of statuses) {
      const runtimeGenre = RuntimeGenreRegistry.find((entry) => entry.genre === status.runtimeGenre);
      expect(runtimeGenre).toBeDefined();
      if (runtimeGenre !== undefined) {
        expect(status.runtimeSupportStatus).toBe(runtimeGenre.status);
        expect(status.runtimeExecutable).toBe(isRuntimeGenreExecutable(runtimeGenre));
      }
    }

    expect(statuses.find((status) => status.runtimeGenre === 'side_scrolling_run_and_gun')).toMatchObject({
      runtimeSupportStatus: 'supported',
      profileSupportStatus: 'active_profile_supported',
      activeRequirementCapabilityIds: expect.arrayContaining(['health.player_health_points.v1']),
      declaredProfileCapabilityIds: expect.arrayContaining(['health.damage_invulnerability.v1'])
    });
    expect(statuses.find((status) => status.runtimeGenre === 'side_scrolling_platformer')).toMatchObject({
      runtimeSupportStatus: 'unsupported',
      profileSupportStatus: 'unsupported',
      declaredProfileCapabilityIds: expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1']),
      incompleteCapabilityIds: expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1'])
    });
  });

  it('marks active runtime requirements complete without hiding planned profile-owned gaps', () => {
    const platformerRuntime = RuntimeGenreRegistry.find((entry) => entry.genre === 'side_scrolling_platformer');
    if (platformerRuntime === undefined) {
      throw new Error('expected side_scrolling_platformer runtime registry entry');
    }

    const legacyRequiredAliases = new Set(platformerRuntime.requiredCapabilities);
    const registry = createGameplayCapabilityRegistry(
      GameplayCapabilityRegistry.entries.map((entry) =>
        entry.legacyRuntimeCapabilities.some((alias) => legacyRequiredAliases.has(alias)) ? completeCapability(entry) : entry
      )
    );
    const [status] = listGameplayProfileRuntimeStatuses({
      registry,
      runtimeGenres: [
        {
          ...platformerRuntime,
          status: 'supported',
          missingCapabilities: [],
          implementedCapabilities: [...platformerRuntime.requiredCapabilities],
          templateId: 'phaser/universal_platformer_test.v1',
          qaProfile: 'platformer_capability_smoke'
        } satisfies RuntimeGenreCapability
      ]
    });

    expect(status.runtimeExecutable).toBe(true);
    expect(status.profileSupportStatus).toBe('capability_complete_supported');
    expect(status.activeRequirementCapabilityIds).toEqual(
      expect.arrayContaining(['camera.side_follow.v1', 'collision.platform.v1', 'movement.run_jump.v1', 'physics.gravity_platformer.v1'])
    );
    expect(status.declaredProfileCapabilityIds).toEqual(expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1']));
    expect(status.incompleteCapabilityIds).toEqual(expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1']));
    expect(status.completeSupportedCapabilityIds).toEqual(
      expect.arrayContaining(['camera.side_follow.v1', 'collision.platform.v1', 'movement.run_jump.v1', 'physics.gravity_platformer.v1'])
    );
  });
});

function cloneCapability(id: string): GameplayCapabilityDescriptor {
  const capability = findGameplayCapability(id);
  if (capability === undefined) {
    throw new Error(`Missing test capability ${id}`);
  }
  return JSON.parse(JSON.stringify(capability)) as GameplayCapabilityDescriptor;
}

function completeCapability(capability: GameplayCapabilityDescriptor): GameplayCapabilityDescriptor {
  return {
    ...JSON.parse(JSON.stringify(capability)),
    status: 'complete_supported',
    evidence: {
      dslSchema: true,
      normalizer: true,
      irCompiler: true,
      runtimeModule: true,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    },
    qa: { requiredProbeIds: [`probe.${capability.id}`], requiredProbesVerified: true },
    blockers: []
  } as GameplayCapabilityDescriptor;
}
