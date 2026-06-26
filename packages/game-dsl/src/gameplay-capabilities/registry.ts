import { z } from 'zod';

import { isRuntimeGenreExecutable, RuntimeGenreRegistry, type RuntimeGenreCapability } from '../runtime-capabilities.js';
import {
  FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
  createFixedPromptBindingPackageContract
} from './fixed-prompt-binding-package.js';
import {
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
  createProfileDeepSeekRunAndGunValidationPackageContract
} from './profile-deepseek-run-and-gun-validation-package.js';
import {
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
  createArtifactLineageNoManualPatchPackageContract
} from './artifact-lineage-no-manual-patch-package.js';
import {
  ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
  createArtifactNoHiddenScriptPackageContract
} from './artifact-no-hidden-script-package.js';
import {
  CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
  createCameraSideFollowPackageContract
} from './camera-side-follow-package.js';
import {
  COLLISION_PLATFORM_REQUIRED_PROBE_ID,
  createCollisionPlatformPackageContract
} from './collision-platform-package.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  createDefaultStraightSingleWeaponPackageContract
} from './default-straight-single-weapon-package.js';
import {
  WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
  createWeaponDeathResetPackageContract
} from './weapon-death-reset-package.js';
import {
  WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
  createWeaponRapidFirePackageContract
} from './weapon-rapid-fire-package.js';
import {
  WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
  createWeaponSpreadShotPackageContract
} from './weapon-spread-shot-package.js';
import {
  WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
  createWeaponReplacementRulePackageContract
} from './weapon-replacement-rule-package.js';
import {
  COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
  createCombatAirborneFirePackageContract
} from './combat-airborne-fire-package.js';
import {
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  createCombatProjectilePackageContract
} from './combat-projectile-package.js';
import {
  MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
  createMovementCrouchPackageContract
} from './movement-crouch-package.js';
import {
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  createMovementRunJumpPackageContract
} from './movement-run-jump-package.js';
import {
  SPAWN_STATIC_REQUIRED_PROBE_ID,
  createSpawnStaticPackageContract
} from './spawn-static-package.js';
import {
  SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
  createSpawnEnemyWavePackageContract
} from './spawn-enemy-wave-package.js';
import {
  HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
  createHealthPlayerHealthPointsPackageContract
} from './health-player-health-points-package.js';
import {
  HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
  createHealthDamageInvulnerabilityPackageContract
} from './health-damage-invulnerability-package.js';
import {
  PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
  createPickupCollectiblePackageContract
} from './pickup-collectible-package.js';
import { validateGameplayCapabilityPackage } from './package-contract.js';
import { hashStableJson } from './stable-json.js';

export const GAMEPLAY_CAPABILITY_REGISTRY_VERSION = 'gameplay-capability-registry.v0.1';
export const GAMEPLAY_CAPABILITY_REGISTRY_SNAPSHOT_KIND = 'capability_registry_snapshot';
export const GAMEPLAY_CAPABILITY_REGISTRY_SNAPSHOT_SCHEMA_VERSION = 'capability_registry_snapshot.v0.1';
export const GAMEPLAY_CAPABILITY_INVENTORY_REPORT_KIND = 'capability_inventory_report';
export const GAMEPLAY_CAPABILITY_INVENTORY_REPORT_SCHEMA_VERSION = 'capability_inventory_report.v0.1';

export const GAMEPLAY_CAPABILITY_SUPPORT_STATUSES = ['complete_supported', 'runtime_backed', 'contract_seeded', 'planned', 'blocked'] as const;
export const GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS = [
  'schema_expressible',
  'normalized',
  'compiled',
  'runtime_consumed',
  'qa_observed'
] as const;
export const GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_PREREQUISITES = [
  'dslSchema',
  'normalizer',
  'irCompiler',
  'runtimeModule',
  'amendmentOperations',
  'capabilityOwnedQa',
  'artifactEvidence',
  'renderContract',
  'requiredProbeIds',
  'requiredProbesVerified'
] as const;
export const GAMEPLAY_CAPABILITY_DERIVED_SUPPORT_CLASSIFICATIONS = [
  'COMPLETE_SUPPORTED',
  'CONDITIONAL_LEGACY_BACKED',
  'UNSUPPORTED',
  'DEFERRED',
  'CONTRACT_SEEDED'
] as const;
export const GAMEPLAY_CAPABILITY_DOMAINS = [
  'artifact',
  'asset',
  'audio',
  'camera',
  'collision',
  'combat',
  'enemy',
  'feedback',
  'goal',
  'hazard',
  'health',
  'metadata',
  'movement',
  'physics',
  'pickup',
  'profile',
  'rules',
  'scene',
  'spawn',
  'telemetry',
  'ui',
  'weapon'
] as const;

const CompleteSupportedEvidenceKeys = [
  'dslSchema',
  'normalizer',
  'irCompiler',
  'runtimeModule',
  'amendmentOperations',
  'capabilityOwnedQa',
  'artifactEvidence',
  'renderContract'
] as const;

export const GameplayCapabilityIdSchema = z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\.v[1-9][0-9]*$/);
export const GameplayCapabilityVersionSchema = z.string().regex(/^v[1-9][0-9]*$/);
export const GameplayCapabilityStatusSchema = z.enum(GAMEPLAY_CAPABILITY_SUPPORT_STATUSES);
export const GameplayCapabilityDomainSchema = z.enum(GAMEPLAY_CAPABILITY_DOMAINS);
export const GameplayProfileIdSchema = z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*\.v[1-9][0-9]*$/);
export const RuntimeFamilyIdSchema = z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*\.v[1-9][0-9]*$/);

export const GameplayCapabilityEvidenceSchema = z.strictObject({
  dslSchema: z.boolean(),
  normalizer: z.boolean(),
  irCompiler: z.boolean(),
  runtimeModule: z.boolean(),
  amendmentOperations: z.boolean(),
  capabilityOwnedQa: z.boolean(),
  artifactEvidence: z.boolean(),
  renderContract: z.boolean()
});

export const GameplayCapabilitySupportEvidenceDimensionsSchema = z.strictObject({
  schema_expressible: z.boolean(),
  normalized: z.boolean(),
  compiled: z.boolean(),
  runtime_consumed: z.boolean(),
  qa_observed: z.boolean()
});

export const GameplayCapabilityDerivedSupportClassificationSchema = z.enum(GAMEPLAY_CAPABILITY_DERIVED_SUPPORT_CLASSIFICATIONS);

export const GameplayCapabilityQaEvidenceSchema = z.strictObject({
  requiredProbeIds: z.array(z.string().min(1)).max(40),
  requiredProbesVerified: z.boolean()
});

export const GameplayCapabilityDescriptorSchema = z
  .strictObject({
    id: GameplayCapabilityIdSchema,
    version: GameplayCapabilityVersionSchema,
    domain: GameplayCapabilityDomainSchema,
    status: GameplayCapabilityStatusSchema,
    label: z.string().min(1).max(120),
    runtimeFamilies: z.array(RuntimeFamilyIdSchema).min(1).max(8),
    profiles: z.array(GameplayProfileIdSchema).max(20),
    legacyRuntimeCapabilities: z.array(z.string().min(1).max(120)).max(20),
    evidence: GameplayCapabilityEvidenceSchema,
    qa: GameplayCapabilityQaEvidenceSchema,
    blockers: z.array(z.string().min(1).max(200)).max(20),
    notes: z.array(z.string().min(1).max(300)).max(20)
  })
  .superRefine((descriptor, ctx) => {
    const idDomain = descriptor.id.split('.')[0];
    if (idDomain !== descriptor.domain) {
      ctx.addIssue({
        code: 'custom',
        path: ['domain'],
        message: `capability domain ${descriptor.domain} must match id prefix ${idDomain}.`
      });
    }

    const idVersion = descriptor.id.split('.').at(-1);
    if (idVersion !== descriptor.version) {
      ctx.addIssue({
        code: 'custom',
        path: ['version'],
        message: `capability version ${descriptor.version} must match id suffix ${idVersion ?? '<missing>'}.`
      });
    }

    if (descriptor.status !== 'complete_supported') {
      return;
    }

    const supportEvidence = deriveGameplayCapabilitySupportEvidenceDimensions(descriptor);
    for (const dimension of getMissingGameplayCapabilitySupportEvidenceDimensions(supportEvidence)) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: `complete_supported capability requires ${dimension} support evidence.`
      });
    }

    for (const key of CompleteSupportedEvidenceKeys) {
      if (!descriptor.evidence[key]) {
        ctx.addIssue({
          code: 'custom',
          path: ['evidence', key],
          message: `complete_supported capability requires ${key} evidence.`
        });
      }
    }
    if (descriptor.qa.requiredProbeIds.length === 0 || !descriptor.qa.requiredProbesVerified) {
      ctx.addIssue({
        code: 'custom',
        path: ['qa'],
        message: 'complete_supported capability requires verified required QA probes.'
      });
    }
    if (descriptor.blockers.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['blockers'],
        message: 'complete_supported capability cannot keep unresolved blockers.'
      });
    }
  });

export type GameplayCapabilitySupportStatus = z.infer<typeof GameplayCapabilityStatusSchema>;
export type GameplayCapabilitySupportEvidenceDimension = (typeof GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS)[number];
export type GameplayCapabilitySupportEvidencePrerequisite = (typeof GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_PREREQUISITES)[number];
export type GameplayCapabilitySupportEvidenceDimensions = z.infer<typeof GameplayCapabilitySupportEvidenceDimensionsSchema>;
export type GameplayCapabilityDerivedSupportClassification = z.infer<typeof GameplayCapabilityDerivedSupportClassificationSchema>;
export type GameplayCapabilityDomain = z.infer<typeof GameplayCapabilityDomainSchema>;
export type GameplayCapabilityEvidence = z.infer<typeof GameplayCapabilityEvidenceSchema>;
export type GameplayCapabilityQaEvidence = z.infer<typeof GameplayCapabilityQaEvidenceSchema>;
export type GameplayCapabilityDescriptor = z.infer<typeof GameplayCapabilityDescriptorSchema>;

export type GameplayCapabilityRegistryIssue = {
  code:
    | 'CAPABILITY_SCHEMA_INVALID'
    | 'DUPLICATE_CAPABILITY_ID'
    | 'DUPLICATE_LEGACY_RUNTIME_CAPABILITY'
    | 'UNKNOWN_GAMEPLAY_PROFILE'
    | 'LEGACY_PROFILE_MEMBERSHIP_MISMATCH';
  path: string;
  message: string;
};

export type GameplayCapabilityRegistry = {
  registryVersion: typeof GAMEPLAY_CAPABILITY_REGISTRY_VERSION;
  entries: GameplayCapabilityDescriptor[];
};

export type GameplayCapabilityRegistryValidationResult =
  | { ok: true; registry: GameplayCapabilityRegistry }
  | { ok: false; issues: GameplayCapabilityRegistryIssue[] };

export type GameplayCapabilityRegistrySnapshot = {
  artifactKind: typeof GAMEPLAY_CAPABILITY_REGISTRY_SNAPSHOT_KIND;
  schemaVersion: typeof GAMEPLAY_CAPABILITY_REGISTRY_SNAPSHOT_SCHEMA_VERSION;
  registryVersion: typeof GAMEPLAY_CAPABILITY_REGISTRY_VERSION;
  capabilityCount: number;
  capabilityIds: string[];
  entries: GameplayCapabilityDescriptor[];
  summary: Record<GameplayCapabilitySupportStatus, number>;
  snapshotHash: string;
};

export type GameplayCapabilityInventoryReport = {
  artifactKind: typeof GAMEPLAY_CAPABILITY_INVENTORY_REPORT_KIND;
  schemaVersion: typeof GAMEPLAY_CAPABILITY_INVENTORY_REPORT_SCHEMA_VERSION;
  registryVersion: typeof GAMEPLAY_CAPABILITY_REGISTRY_VERSION;
  capabilityCount: number;
  statusCounts: Record<GameplayCapabilitySupportStatus, number>;
  domainCounts: Record<GameplayCapabilityDomain, number>;
  derivedClassificationCounts: Record<GameplayCapabilityDerivedSupportClassification, number>;
  completeSupportedCapabilityIds: string[];
  runtimeBackedCapabilityIds: string[];
  incompleteRuntimeBackedCapabilityIds: string[];
  blockedCapabilityIds: string[];
  supportEvidence: GameplayCapabilityInventorySupportEvidence[];
};

export type GameplayCapabilityInventorySupportEvidence = {
  capabilityId: string;
  declaredStatus: GameplayCapabilitySupportStatus;
  derivedClassification: GameplayCapabilityDerivedSupportClassification;
  evidenceDimensions: GameplayCapabilitySupportEvidenceDimensions;
  missingEvidenceDimensions: GameplayCapabilitySupportEvidenceDimension[];
  missingSupportEvidencePrerequisites: GameplayCapabilitySupportEvidencePrerequisite[];
  completeSupported: boolean;
  legacyBacked: boolean;
};

export type GameplayProfileRuntimeStatus = {
  profileId: string;
  runtimeGenre: string;
  runtimeSupportStatus: RuntimeGenreCapability['status'];
  runtimeExecutable: boolean;
  runtimeTemplateId?: string;
  runtimeTemplateManifestId?: string;
  qaProfile?: string;
  activeRequirementCapabilityIds: string[];
  gameplayCapabilityIds: string[];
  declaredProfileCapabilityIds: string[];
  completeSupportedCapabilityIds: string[];
  incompleteCapabilityIds: string[];
  missingRegistryCapabilityAliases: string[];
  profileSupportStatus: 'capability_complete_supported' | 'active_profile_supported' | 'legacy_runtime_supported' | 'unsupported';
};

const phaser2dActionArcade = 'phaser_2d_action_arcade.v1';
const topDownActionArcade = 'phaser_2d_top_down_arcade.v1';

const falseEvidence: GameplayCapabilityEvidence = {
  dslSchema: false,
  normalizer: false,
  irCompiler: false,
  runtimeModule: false,
  amendmentOperations: false,
  capabilityOwnedQa: false,
  artifactEvidence: false,
  renderContract: false
};

const legacyRuntimeEvidence: GameplayCapabilityEvidence = {
  dslSchema: true,
  normalizer: true,
  irCompiler: true,
  runtimeModule: true,
  amendmentOperations: false,
  capabilityOwnedQa: false,
  artifactEvidence: true,
  renderContract: true
};

const contractSeedEvidence: GameplayCapabilityEvidence = {
  ...falseEvidence,
  dslSchema: true,
  artifactEvidence: true
};

const canonicalNormalizationEvidence: GameplayCapabilityEvidence = {
  ...falseEvidence,
  dslSchema: true,
  normalizer: true
};

const canonicalCompilerEvidence: GameplayCapabilityEvidence = {
  ...canonicalNormalizationEvidence,
  irCompiler: true
};

const canonicalRuntimeLoaderEvidence: GameplayCapabilityEvidence = {
  ...canonicalCompilerEvidence,
  runtimeModule: true
};

const noVerifiedQa: GameplayCapabilityQaEvidence = { requiredProbeIds: [], requiredProbesVerified: false };

const fixedPromptBindingPackageReport = validateGameplayCapabilityPackage(createFixedPromptBindingPackageContract());
const fixedPromptBindingPackageEvidence: GameplayCapabilityEvidence = fixedPromptBindingPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const fixedPromptBindingPackageQa: GameplayCapabilityQaEvidence = fixedPromptBindingPackageReport.supportEligible
  ? { requiredProbeIds: [FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const profileDeepSeekRunAndGunValidationPackageReport = validateGameplayCapabilityPackage(createProfileDeepSeekRunAndGunValidationPackageContract());
const profileDeepSeekRunAndGunValidationPackageEvidence: GameplayCapabilityEvidence = profileDeepSeekRunAndGunValidationPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const profileDeepSeekRunAndGunValidationPackageQa: GameplayCapabilityQaEvidence = profileDeepSeekRunAndGunValidationPackageReport.supportEligible
  ? { requiredProbeIds: [PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const artifactLineageNoManualPatchPackageReport = validateGameplayCapabilityPackage(createArtifactLineageNoManualPatchPackageContract());
const artifactLineageNoManualPatchPackageEvidence: GameplayCapabilityEvidence = artifactLineageNoManualPatchPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const artifactLineageNoManualPatchPackageQa: GameplayCapabilityQaEvidence = artifactLineageNoManualPatchPackageReport.supportEligible
  ? { requiredProbeIds: [ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const artifactNoHiddenScriptPackageReport = validateGameplayCapabilityPackage(createArtifactNoHiddenScriptPackageContract());
const artifactNoHiddenScriptPackageEvidence: GameplayCapabilityEvidence = artifactNoHiddenScriptPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const artifactNoHiddenScriptPackageQa: GameplayCapabilityQaEvidence = artifactNoHiddenScriptPackageReport.supportEligible
  ? { requiredProbeIds: [ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const cameraSideFollowPackageReport = validateGameplayCapabilityPackage(createCameraSideFollowPackageContract());
const cameraSideFollowPackageEvidence: GameplayCapabilityEvidence = cameraSideFollowPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const cameraSideFollowPackageQa: GameplayCapabilityQaEvidence = cameraSideFollowPackageReport.supportEligible
  ? { requiredProbeIds: [CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const collisionPlatformPackageReport = validateGameplayCapabilityPackage(createCollisionPlatformPackageContract());
const collisionPlatformPackageEvidence: GameplayCapabilityEvidence = collisionPlatformPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const collisionPlatformPackageQa: GameplayCapabilityQaEvidence = collisionPlatformPackageReport.supportEligible
  ? { requiredProbeIds: [COLLISION_PLATFORM_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const defaultStraightSingleWeaponPackageReport = validateGameplayCapabilityPackage(createDefaultStraightSingleWeaponPackageContract());
const defaultStraightSingleWeaponPackageEvidence: GameplayCapabilityEvidence = defaultStraightSingleWeaponPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const defaultStraightSingleWeaponPackageQa: GameplayCapabilityQaEvidence = defaultStraightSingleWeaponPackageReport.supportEligible
  ? { requiredProbeIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const weaponDeathResetPackageReport = validateGameplayCapabilityPackage(createWeaponDeathResetPackageContract());
const weaponDeathResetPackageEvidence: GameplayCapabilityEvidence = weaponDeathResetPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const weaponDeathResetPackageQa: GameplayCapabilityQaEvidence = weaponDeathResetPackageReport.supportEligible
  ? { requiredProbeIds: [WEAPON_DEATH_RESET_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const weaponRapidFirePackageReport = validateGameplayCapabilityPackage(createWeaponRapidFirePackageContract());
const weaponRapidFirePackageEvidence: GameplayCapabilityEvidence = weaponRapidFirePackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const weaponRapidFirePackageQa: GameplayCapabilityQaEvidence = weaponRapidFirePackageReport.supportEligible
  ? { requiredProbeIds: [WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const weaponSpreadShotPackageReport = validateGameplayCapabilityPackage(createWeaponSpreadShotPackageContract());
const weaponSpreadShotPackageEvidence: GameplayCapabilityEvidence = weaponSpreadShotPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const weaponSpreadShotPackageQa: GameplayCapabilityQaEvidence = weaponSpreadShotPackageReport.supportEligible
  ? { requiredProbeIds: [WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const weaponReplacementRulePackageReport = validateGameplayCapabilityPackage(createWeaponReplacementRulePackageContract());
const weaponReplacementRulePackageEvidence: GameplayCapabilityEvidence = weaponReplacementRulePackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const weaponReplacementRulePackageQa: GameplayCapabilityQaEvidence = weaponReplacementRulePackageReport.supportEligible
  ? { requiredProbeIds: [WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const combatAirborneFirePackageReport = validateGameplayCapabilityPackage(createCombatAirborneFirePackageContract());
const combatAirborneFirePackageEvidence: GameplayCapabilityEvidence = combatAirborneFirePackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const combatAirborneFirePackageQa: GameplayCapabilityQaEvidence = combatAirborneFirePackageReport.supportEligible
  ? { requiredProbeIds: [COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const combatProjectilePackageReport = validateGameplayCapabilityPackage(createCombatProjectilePackageContract());
const combatProjectilePackageEvidence: GameplayCapabilityEvidence = combatProjectilePackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const combatProjectilePackageQa: GameplayCapabilityQaEvidence = combatProjectilePackageReport.supportEligible
  ? { requiredProbeIds: [COMBAT_PROJECTILE_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const movementCrouchPackageReport = validateGameplayCapabilityPackage(createMovementCrouchPackageContract());
const movementCrouchPackageEvidence: GameplayCapabilityEvidence = movementCrouchPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const movementCrouchPackageQa: GameplayCapabilityQaEvidence = movementCrouchPackageReport.supportEligible
  ? { requiredProbeIds: [MOVEMENT_CROUCH_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const movementRunJumpPackageReport = validateGameplayCapabilityPackage(createMovementRunJumpPackageContract());
const movementRunJumpPackageEvidence: GameplayCapabilityEvidence = movementRunJumpPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const movementRunJumpPackageQa: GameplayCapabilityQaEvidence = movementRunJumpPackageReport.supportEligible
  ? { requiredProbeIds: [MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const spawnStaticPackageReport = validateGameplayCapabilityPackage(createSpawnStaticPackageContract());
const spawnStaticPackageEvidence: GameplayCapabilityEvidence = spawnStaticPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const spawnStaticPackageQa: GameplayCapabilityQaEvidence = spawnStaticPackageReport.supportEligible
  ? { requiredProbeIds: [SPAWN_STATIC_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const spawnEnemyWavePackageReport = validateGameplayCapabilityPackage(createSpawnEnemyWavePackageContract());
const spawnEnemyWavePackageEvidence: GameplayCapabilityEvidence = spawnEnemyWavePackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const spawnEnemyWavePackageQa: GameplayCapabilityQaEvidence = spawnEnemyWavePackageReport.supportEligible
  ? { requiredProbeIds: [SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const healthPlayerHealthPointsPackageReport = validateGameplayCapabilityPackage(createHealthPlayerHealthPointsPackageContract());
const healthPlayerHealthPointsPackageEvidence: GameplayCapabilityEvidence = healthPlayerHealthPointsPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const healthPlayerHealthPointsPackageQa: GameplayCapabilityQaEvidence = healthPlayerHealthPointsPackageReport.supportEligible
  ? { requiredProbeIds: [HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const healthDamageInvulnerabilityPackageReport = validateGameplayCapabilityPackage(createHealthDamageInvulnerabilityPackageContract());
const healthDamageInvulnerabilityPackageEvidence: GameplayCapabilityEvidence = healthDamageInvulnerabilityPackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const healthDamageInvulnerabilityPackageQa: GameplayCapabilityQaEvidence = healthDamageInvulnerabilityPackageReport.supportEligible
  ? { requiredProbeIds: [HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;
const pickupCollectiblePackageReport = validateGameplayCapabilityPackage(createPickupCollectiblePackageContract());
const pickupCollectiblePackageEvidence: GameplayCapabilityEvidence = pickupCollectiblePackageReport.supportEligible
  ? {
      ...canonicalRuntimeLoaderEvidence,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    }
  : canonicalRuntimeLoaderEvidence;
const pickupCollectiblePackageQa: GameplayCapabilityQaEvidence = pickupCollectiblePackageReport.supportEligible
  ? { requiredProbeIds: [PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID], requiredProbesVerified: false }
  : noVerifiedQa;

const contractCompilerEvidence: GameplayCapabilityEvidence = {
  ...contractSeedEvidence,
  normalizer: true,
  irCompiler: true
};

const contractRuntimeLoaderEvidence: GameplayCapabilityEvidence = {
  ...contractCompilerEvidence,
  runtimeModule: true
};

const defaultGameplayCapabilityDescriptors: GameplayCapabilityDescriptor[] = [
  planned(
    'artifact.lineage_no_manual_patch.v1',
    'artifact',
    'Artifact lineage without manual patch',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    artifactLineageNoManualPatchPackageEvidence,
    artifactLineageNoManualPatchPackageQa
  ),
  planned(
    'artifact.no_hidden_script.v1',
    'artifact',
    'Artifact runtime manifest without hidden script',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    artifactNoHiddenScriptPackageEvidence,
    artifactNoHiddenScriptPackageQa
  ),
  runtimeBacked('camera.top_down_follow.v1', 'camera', 'Top-down follow camera', [topDownActionArcade], ['collector.v1', 'dodger.v1', 'shooter.v1'], ['top_down_camera']),
  runtimeBacked('movement.eight_direction.v1', 'movement', 'Eight-direction movement', [topDownActionArcade], ['collector.v1', 'dodger.v1', 'shooter.v1'], [
    'eight_direction_movement'
  ]),
  runtimeBacked(
    'pickup.collectible.v1',
    'pickup',
    'Collectible pickup',
    [topDownActionArcade, phaser2dActionArcade],
    ['collector.v1', 'dodger.v1'],
    ['collectibles'],
    pickupCollectiblePackageEvidence,
    pickupCollectiblePackageQa
  ),
  runtimeBacked('hazard.contact_damage.v1', 'hazard', 'Contact hazard damage', [topDownActionArcade], ['dodger.v1'], ['hazards']),
  contractSeeded(
    'metadata.fixed_prompt_binding.v1',
    'metadata',
    'Fixed prompt metadata binding',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    fixedPromptBindingPackageEvidence,
    fixedPromptBindingPackageQa
  ),
  planned(
    'combat.airborne_fire.v1',
    'combat',
    'Airborne fire permission',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    combatAirborneFirePackageEvidence,
    combatAirborneFirePackageQa
  ),
  planned(
    'combat.projectile.v1',
    'combat',
    'Projectile combat',
    [topDownActionArcade, phaser2dActionArcade],
    ['shooter.v1', 'side_scrolling_run_and_gun.v1'],
    ['projectile_combat', 'multi_direction_shooting'],
    combatProjectilePackageEvidence,
    combatProjectilePackageQa
  ),
  planned(
    'spawn.enemy_wave.v1',
    'spawn',
    'Ordered enemy wave spawning',
    [phaser2dActionArcade, topDownActionArcade],
    ['side_scrolling_run_and_gun.v1', 'shooter.v1'],
    ['enemy_waves'],
    spawnEnemyWavePackageEvidence,
    spawnEnemyWavePackageQa
  ),
  planned(
    'camera.side_follow.v1',
    'camera',
    'Side-scrolling follow camera',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1', 'side_scrolling_platformer.v1'],
    ['side_view_camera'],
    cameraSideFollowPackageEvidence,
    cameraSideFollowPackageQa
  ),
  runtimeBacked('physics.gravity_platformer.v1', 'physics', 'Gravity platformer physics', [phaser2dActionArcade], ['side_scrolling_run_and_gun.v1', 'side_scrolling_platformer.v1'], [
    'gravity_platformer_physics'
  ]),
  planned(
    'movement.crouch.v1',
    'movement',
    'Crouch action state',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    movementCrouchPackageEvidence,
    movementCrouchPackageQa
  ),
  planned(
    'movement.run_jump.v1',
    'movement',
    'Run and jump controller',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1', 'side_scrolling_platformer.v1'],
    ['run_jump_controller'],
    movementRunJumpPackageEvidence,
    movementRunJumpPackageQa
  ),
  planned(
    'collision.platform.v1',
    'collision',
    'Platform terrain collision',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1', 'side_scrolling_platformer.v1'],
    ['platform_collision', 'terrain_collision', 'platforms_terrain_collision'],
    collisionPlatformPackageEvidence,
    collisionPlatformPackageQa
  ),
  planned(
    'spawn.static.v1',
    'spawn',
    'Static and trigger-based spawning',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    ['enemy_spawn', 'enemy_spawn_triggers'],
    spawnStaticPackageEvidence,
    spawnStaticPackageQa
  ),
  runtimeBacked('rules.restart_loop.v1', 'rules', 'Restart and checkpoint loop', [phaser2dActionArcade], ['side_scrolling_run_and_gun.v1'], [
    'restart_loop',
    'checkpoint_or_lives_system'
  ]),
  contractSeeded(
    'health.damage_invulnerability.v1',
    'health',
    'Damage and invulnerability window',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    healthDamageInvulnerabilityPackageEvidence,
    healthDamageInvulnerabilityPackageQa
  ),
  planned(
    'health.player_health_points.v1',
    'health',
    'Player health points',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    ['player_health'],
    healthPlayerHealthPointsPackageEvidence,
    healthPlayerHealthPointsPackageQa
  ),
  contractSeeded('weapon.cooldown.v1', 'weapon', 'Weapon cooldown', [topDownActionArcade, phaser2dActionArcade], ['shooter.v1', 'side_scrolling_run_and_gun.v1'], []),
  planned(
    'weapon.death_reset.v1',
    'weapon',
    'Weapon reset on death',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    weaponDeathResetPackageEvidence,
    weaponDeathResetPackageQa
  ),
  planned(
    'weapon.default_straight_single.v1',
    'weapon',
    'Default straight single-shot weapon',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    defaultStraightSingleWeaponPackageEvidence,
    defaultStraightSingleWeaponPackageQa
  ),
  planned(
    'weapon.rapid_fire.v1',
    'weapon',
    'Rapid-fire weapon',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    weaponRapidFirePackageEvidence,
    weaponRapidFirePackageQa
  ),
  planned(
    'weapon.replacement_rule.v1',
    'weapon',
    'Weapon pickup replacement rule',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    weaponReplacementRulePackageEvidence,
    weaponReplacementRulePackageQa
  ),
  planned(
    'weapon.spread_shot.v1',
    'weapon',
    'Spread-shot weapon',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    weaponSpreadShotPackageEvidence,
    weaponSpreadShotPackageQa
  ),
  contractSeeded('goal.destroy_target.v1', 'goal', 'Destroy target goal', [phaser2dActionArcade], ['side_scrolling_run_and_gun.v1'], []),
  contractSeeded('scene.parallax_background.v1', 'scene', 'Parallax background scene layers', [phaser2dActionArcade], ['side_scrolling_run_and_gun.v1'], []),
  contractSeeded('asset.sprite_binding.v1', 'asset', 'Sprite asset binding', [topDownActionArcade, phaser2dActionArcade], ['collector.v1', 'dodger.v1', 'shooter.v1', 'side_scrolling_run_and_gun.v1'], []),
  contractSeeded('telemetry.gameplay_events.v1', 'telemetry', 'Gameplay telemetry events', [topDownActionArcade, phaser2dActionArcade], ['collector.v1', 'dodger.v1', 'shooter.v1', 'side_scrolling_run_and_gun.v1'], []),
  planned('camera.vertical_scroll.v1', 'camera', 'Vertical scroll camera', [phaser2dActionArcade], ['vertical_shooter.v1'], ['vertical_scroll_camera']),
  planned('enemy.vertical_shooter_pattern.v1', 'enemy', 'Vertical shooter enemy pattern', [phaser2dActionArcade], ['vertical_shooter.v1'], [
    'vertical_shooter_enemy_patterns'
  ]),
  contractSeeded(
    'profile.deepseek_run_and_gun_validation.v1',
    'profile',
    'DeepSeek run-and-gun validation profile binding',
    [phaser2dActionArcade],
    ['side_scrolling_run_and_gun.v1'],
    [],
    profileDeepSeekRunAndGunValidationPackageEvidence,
    profileDeepSeekRunAndGunValidationPackageQa
  ),
  planned('physics.paddle_ball.v1', 'physics', 'Paddle and ball physics', [phaser2dActionArcade], ['breakout.v1'], ['paddle_ball_physics']),
  planned('collision.brick_grid.v1', 'collision', 'Breakout brick collision grid', [phaser2dActionArcade], ['breakout.v1'], ['brick_collision_grid']),
  planned('movement.tilemap_maze_navigation.v1', 'movement', 'Tilemap maze navigation', [phaser2dActionArcade], ['maze_chase.v1'], ['tilemap_maze_navigation']),
  planned('enemy.chaser_pathfinding.v1', 'enemy', 'Chaser pathfinding', [phaser2dActionArcade], ['maze_chase.v1'], ['chaser_pathfinding']),
  planned('goal.reach_exit.v1', 'goal', 'Reach exit goal', [phaser2dActionArcade], ['side_scrolling_platformer.v1'], []),
  planned('pickup.drop_collect.v1', 'pickup', 'Drop and collect pickup loop', [phaser2dActionArcade], ['side_scrolling_run_and_gun.v1', 'side_scrolling_platformer.v1'], [])
];

export const GameplayCapabilityRegistry = createGameplayCapabilityRegistry(defaultGameplayCapabilityDescriptors);
export const GAMEPLAY_CAPABILITY_REGISTRY = GameplayCapabilityRegistry.entries;

export function validateGameplayCapabilityRegistry(entries: readonly unknown[]): GameplayCapabilityRegistryValidationResult {
  const issues: GameplayCapabilityRegistryIssue[] = [];
  const parsedEntries: GameplayCapabilityDescriptor[] = [];
  const seenCapabilityIds = new Set<string>();
  const seenLegacyAliases = new Map<string, string>();
  const knownProfileIds = buildKnownRuntimeProfileIds(RuntimeGenreRegistry);

  entries.forEach((entry, index) => {
    const parsed = GameplayCapabilityDescriptorSchema.safeParse(entry);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          code: 'CAPABILITY_SCHEMA_INVALID',
          path: ['entries', String(index), ...issue.path.map(String)].join('.'),
          message: issue.message
        });
      }
      return;
    }

    if (seenCapabilityIds.has(parsed.data.id)) {
      issues.push({
        code: 'DUPLICATE_CAPABILITY_ID',
        path: `entries.${index}.id`,
        message: `Duplicate gameplay capability id: ${parsed.data.id}.`
      });
    }
    seenCapabilityIds.add(parsed.data.id);

    for (const profile of parsed.data.profiles) {
      if (!knownProfileIds.has(profile)) {
        issues.push({
          code: 'UNKNOWN_GAMEPLAY_PROFILE',
          path: `entries.${index}.profiles`,
          message: `Unknown gameplay profile ${profile}; profile membership must match RuntimeGenreRegistry.dslProfile.`
        });
      }
    }

    for (const legacyAlias of parsed.data.legacyRuntimeCapabilities) {
      const ownerId = seenLegacyAliases.get(legacyAlias);
      if (ownerId !== undefined && ownerId !== parsed.data.id) {
        issues.push({
          code: 'DUPLICATE_LEGACY_RUNTIME_CAPABILITY',
          path: `entries.${index}.legacyRuntimeCapabilities`,
          message: `Legacy runtime capability ${legacyAlias} is mapped by both ${ownerId} and ${parsed.data.id}.`
        });
      }
      seenLegacyAliases.set(legacyAlias, parsed.data.id);

      const expectedProfiles = RuntimeGenreRegistry.filter((runtimeGenre) => runtimeGenre.requiredCapabilities.includes(legacyAlias)).map(runtimeProfileId);
      for (const expectedProfile of expectedProfiles) {
        if (!parsed.data.profiles.includes(expectedProfile)) {
          issues.push({
            code: 'LEGACY_PROFILE_MEMBERSHIP_MISMATCH',
            path: `entries.${index}.profiles`,
            message: `Capability ${parsed.data.id} maps legacy runtime capability ${legacyAlias}, but is missing profile ${expectedProfile}.`
          });
        }
      }
    }

    parsedEntries.push(parsed.data);
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    registry: {
      registryVersion: GAMEPLAY_CAPABILITY_REGISTRY_VERSION,
      entries: [...parsedEntries].sort(compareCapabilities)
    }
  };
}

export function createGameplayCapabilityRegistry(entries: readonly unknown[] = defaultGameplayCapabilityDescriptors): GameplayCapabilityRegistry {
  const result = validateGameplayCapabilityRegistry(entries);
  if (result.ok) {
    return result.registry;
  }
  throw new Error(`Invalid gameplay capability registry: ${result.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`);
}

export function findGameplayCapability(id: string, registry: GameplayCapabilityRegistry = GameplayCapabilityRegistry): GameplayCapabilityDescriptor | undefined {
  return registry.entries.find((entry) => entry.id === id);
}

export function isCompleteSupportedGameplayCapability(capability: GameplayCapabilityDescriptor): boolean {
  return isCompleteSupportedEvidenceDimensions(deriveGameplayCapabilitySupportEvidenceDimensions(capability));
}

export function listCompleteSupportedGameplayCapabilities(registry: GameplayCapabilityRegistry = GameplayCapabilityRegistry): GameplayCapabilityDescriptor[] {
  return registry.entries.filter(isCompleteSupportedGameplayCapability);
}

export function buildGameplayCapabilityRegistrySnapshot(registry: GameplayCapabilityRegistry = GameplayCapabilityRegistry): GameplayCapabilityRegistrySnapshot {
  const entries = [...registry.entries].sort(compareCapabilities);
  const payload: Omit<GameplayCapabilityRegistrySnapshot, 'snapshotHash'> = {
    artifactKind: GAMEPLAY_CAPABILITY_REGISTRY_SNAPSHOT_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_REGISTRY_SNAPSHOT_SCHEMA_VERSION,
    registryVersion: registry.registryVersion,
    capabilityCount: entries.length,
    capabilityIds: entries.map((entry) => entry.id),
    entries,
    summary: countCapabilitiesByStatus(entries)
  };

  return {
    ...payload,
    snapshotHash: hashStableJson(payload)
  };
}

export function buildGameplayCapabilityInventoryReport(registry: GameplayCapabilityRegistry = GameplayCapabilityRegistry): GameplayCapabilityInventoryReport {
  const entries = [...registry.entries].sort(compareCapabilities);
  const runtimeBackedCapabilityIds = entries.filter((entry) => entry.status === 'runtime_backed').map((entry) => entry.id);
  const supportEvidence = entries.map(buildGameplayCapabilityInventorySupportEvidence);

  return {
    artifactKind: GAMEPLAY_CAPABILITY_INVENTORY_REPORT_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_INVENTORY_REPORT_SCHEMA_VERSION,
    registryVersion: registry.registryVersion,
    capabilityCount: entries.length,
    statusCounts: countCapabilitiesByStatus(entries),
    domainCounts: countCapabilitiesByDomain(entries),
    derivedClassificationCounts: countCapabilitiesByDerivedClassification(entries),
    completeSupportedCapabilityIds: entries.filter(isCompleteSupportedGameplayCapability).map((entry) => entry.id),
    runtimeBackedCapabilityIds,
    incompleteRuntimeBackedCapabilityIds: runtimeBackedCapabilityIds,
    blockedCapabilityIds: entries.filter((entry) => entry.status === 'blocked').map((entry) => entry.id),
    supportEvidence
  };
}

export function listGameplayProfileRuntimeStatuses(input: {
  runtimeGenres?: readonly RuntimeGenreCapability[];
  registry?: GameplayCapabilityRegistry;
} = {}): GameplayProfileRuntimeStatus[] {
  const runtimeGenres = input.runtimeGenres ?? RuntimeGenreRegistry;
  const registry = input.registry ?? GameplayCapabilityRegistry;
  const legacyAliasOwner = buildLegacyAliasOwnerMap(registry.entries);

  return runtimeGenres.map((runtimeGenre) => {
    const profileId = runtimeProfileId(runtimeGenre);
    const legacyGameplayCapabilityIds: string[] = [];
    const missingRegistryCapabilityAliases: string[] = [];
    for (const legacyAlias of runtimeGenre.requiredCapabilities) {
      const ownerId = legacyAliasOwner.get(legacyAlias);
      if (ownerId === undefined) {
        missingRegistryCapabilityAliases.push(legacyAlias);
        continue;
      }
      if (!legacyGameplayCapabilityIds.includes(ownerId)) {
        legacyGameplayCapabilityIds.push(ownerId);
      }
    }

    const activeRequirementCapabilityIds = uniqueSortedStrings(legacyGameplayCapabilityIds);
    const declaredProfileCapabilityIds = registry.entries.filter((entry) => entry.profiles.includes(profileId)).map((entry) => entry.id);
    const gameplayCapabilityIds = uniqueSortedStrings([...activeRequirementCapabilityIds, ...declaredProfileCapabilityIds]);
    const capabilities = gameplayCapabilityIds.flatMap((id) => {
      const capability = findGameplayCapability(id, registry);
      return capability === undefined ? [] : [capability];
    });
    const activeRequirementCapabilities = activeRequirementCapabilityIds.flatMap((id) => {
      const capability = findGameplayCapability(id, registry);
      return capability === undefined ? [] : [capability];
    });
    const completeSupportedCapabilityIds = capabilities.filter(isCompleteSupportedGameplayCapability).map((entry) => entry.id);
    const incompleteCapabilityIds = capabilities.filter((entry) => !isCompleteSupportedGameplayCapability(entry)).map((entry) => entry.id);
    const runtimeExecutable = isRuntimeGenreExecutable(runtimeGenre);
    const activeRequirementsResolved = runtimeExecutable && activeRequirementCapabilityIds.length > 0 && missingRegistryCapabilityAliases.length === 0;
    const activeRequirementsComplete =
      activeRequirementsResolved && activeRequirementCapabilities.every(isCompleteSupportedGameplayCapability);

    return {
      profileId,
      runtimeGenre: runtimeGenre.genre,
      runtimeSupportStatus: runtimeGenre.status,
      runtimeExecutable,
      ...(runtimeGenre.templateId === undefined ? {} : { runtimeTemplateId: runtimeGenre.templateId }),
      ...(runtimeGenre.runtimeTemplateManifestId === undefined ? {} : { runtimeTemplateManifestId: runtimeGenre.runtimeTemplateManifestId }),
      ...(runtimeGenre.qaProfile === undefined ? {} : { qaProfile: runtimeGenre.qaProfile }),
      activeRequirementCapabilityIds,
      gameplayCapabilityIds,
      declaredProfileCapabilityIds,
      completeSupportedCapabilityIds,
      incompleteCapabilityIds,
      missingRegistryCapabilityAliases,
      profileSupportStatus: activeRequirementsComplete
        ? 'capability_complete_supported'
        : activeRequirementsResolved
          ? 'active_profile_supported'
          : 'unsupported'
    };
  });
}

function runtimeBacked(
  id: string,
  domain: GameplayCapabilityDomain,
  label: string,
  runtimeFamilies: string[],
  profiles: string[],
  legacyRuntimeCapabilities: string[],
  evidence: GameplayCapabilityEvidence = legacyRuntimeEvidence,
  qa: GameplayCapabilityQaEvidence = noVerifiedQa
): GameplayCapabilityDescriptor {
  return descriptor({ id, domain, label, runtimeFamilies, profiles, legacyRuntimeCapabilities, status: 'runtime_backed', evidence, qa });
}

function contractSeeded(
  id: string,
  domain: GameplayCapabilityDomain,
  label: string,
  runtimeFamilies: string[],
  profiles: string[],
  legacyRuntimeCapabilities: string[],
  evidence: GameplayCapabilityEvidence = contractSeedEvidence,
  qa: GameplayCapabilityQaEvidence = noVerifiedQa
): GameplayCapabilityDescriptor {
  return descriptor({ id, domain, label, runtimeFamilies, profiles, legacyRuntimeCapabilities, status: 'contract_seeded', evidence, qa });
}

function planned(
  id: string,
  domain: GameplayCapabilityDomain,
  label: string,
  runtimeFamilies: string[],
  profiles: string[],
  legacyRuntimeCapabilities: string[],
  evidence: GameplayCapabilityEvidence = falseEvidence,
  qa: GameplayCapabilityQaEvidence = noVerifiedQa
): GameplayCapabilityDescriptor {
  return descriptor({ id, domain, label, runtimeFamilies, profiles, legacyRuntimeCapabilities, status: 'planned', evidence, qa });
}

function descriptor(input: {
  id: string;
  domain: GameplayCapabilityDomain;
  label: string;
  runtimeFamilies: string[];
  profiles: string[];
  legacyRuntimeCapabilities: string[];
  status: GameplayCapabilitySupportStatus;
  evidence: GameplayCapabilityEvidence;
  qa?: GameplayCapabilityQaEvidence;
}): GameplayCapabilityDescriptor {
  return {
    id: input.id,
    version: input.id.split('.').at(-1) ?? 'v1',
    domain: input.domain,
    status: input.status,
    label: input.label,
    runtimeFamilies: input.runtimeFamilies,
    profiles: input.profiles,
    legacyRuntimeCapabilities: input.legacyRuntimeCapabilities,
    evidence: input.evidence,
    qa: input.qa ?? noVerifiedQa,
    blockers: input.status === 'complete_supported' ? [] : ['Step 35 package contract and capability-owned QA are not complete yet.'],
    notes: []
  };
}

function compareCapabilities(left: GameplayCapabilityDescriptor, right: GameplayCapabilityDescriptor): number {
  return left.id.localeCompare(right.id);
}

function countCapabilitiesByStatus(entries: readonly GameplayCapabilityDescriptor[]): Record<GameplayCapabilitySupportStatus, number> {
  return GAMEPLAY_CAPABILITY_SUPPORT_STATUSES.reduce(
    (counts, status) => ({
      ...counts,
      [status]: entries.filter((entry) => entry.status === status).length
    }),
    {} as Record<GameplayCapabilitySupportStatus, number>
  );
}

function countCapabilitiesByDomain(entries: readonly GameplayCapabilityDescriptor[]): Record<GameplayCapabilityDomain, number> {
  return GAMEPLAY_CAPABILITY_DOMAINS.reduce(
    (counts, domain) => ({
      ...counts,
      [domain]: entries.filter((entry) => entry.domain === domain).length
    }),
    {} as Record<GameplayCapabilityDomain, number>
  );
}

function buildLegacyAliasOwnerMap(entries: readonly GameplayCapabilityDescriptor[]): Map<string, string> {
  const ownerByAlias = new Map<string, string>();
  for (const entry of entries) {
    for (const legacyAlias of entry.legacyRuntimeCapabilities) {
      ownerByAlias.set(legacyAlias, entry.id);
    }
  }
  return ownerByAlias;
}

export function deriveGameplayCapabilitySupportEvidenceDimensions(capability: unknown): GameplayCapabilitySupportEvidenceDimensions {
  const capabilityRecord = isRecord(capability) ? capability : {};
  const evidence = isRecord(capabilityRecord.evidence) ? capabilityRecord.evidence : {};
  const qa = isRecord(capabilityRecord.qa) ? capabilityRecord.qa : {};

  return {
    schema_expressible: evidence.dslSchema === true,
    normalized: evidence.normalizer === true,
    compiled: evidence.irCompiler === true,
    runtime_consumed: evidence.runtimeModule === true,
    qa_observed:
      evidence.amendmentOperations === true &&
      evidence.capabilityOwnedQa === true &&
      evidence.artifactEvidence === true &&
      evidence.renderContract === true &&
      Array.isArray(qa.requiredProbeIds) &&
      qa.requiredProbeIds.length > 0 &&
      qa.requiredProbesVerified === true
  };
}

export function isCompleteSupportedEvidenceDimensions(evidence: unknown): evidence is GameplayCapabilitySupportEvidenceDimensions {
  const parsed = GameplayCapabilitySupportEvidenceDimensionsSchema.safeParse(evidence);
  return parsed.success && GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS.every((dimension) => parsed.data[dimension]);
}

export function getMissingGameplayCapabilitySupportEvidenceDimensions(input: unknown): GameplayCapabilitySupportEvidenceDimension[] {
  const evidence = GameplayCapabilitySupportEvidenceDimensionsSchema.safeParse(input).success
    ? GameplayCapabilitySupportEvidenceDimensionsSchema.parse(input)
    : deriveGameplayCapabilitySupportEvidenceDimensions(input);

  return GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS.filter((dimension) => !evidence[dimension]);
}

export function getMissingGameplayCapabilitySupportEvidencePrerequisites(input: unknown): GameplayCapabilitySupportEvidencePrerequisite[] {
  const capabilityRecord = isRecord(input) ? input : {};
  const evidence = isRecord(capabilityRecord.evidence) ? capabilityRecord.evidence : {};
  const qa = isRecord(capabilityRecord.qa) ? capabilityRecord.qa : {};
  const prerequisiteReady: Record<GameplayCapabilitySupportEvidencePrerequisite, boolean> = {
    dslSchema: evidence.dslSchema === true,
    normalizer: evidence.normalizer === true,
    irCompiler: evidence.irCompiler === true,
    runtimeModule: evidence.runtimeModule === true,
    amendmentOperations: evidence.amendmentOperations === true,
    capabilityOwnedQa: evidence.capabilityOwnedQa === true,
    artifactEvidence: evidence.artifactEvidence === true,
    renderContract: evidence.renderContract === true,
    requiredProbeIds: Array.isArray(qa.requiredProbeIds) && qa.requiredProbeIds.length > 0,
    requiredProbesVerified: qa.requiredProbesVerified === true
  };

  return GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_PREREQUISITES.filter((prerequisite) => !prerequisiteReady[prerequisite]);
}

export function deriveGameplayCapabilitySupportClassification(
  capability: GameplayCapabilityDescriptor
): GameplayCapabilityDerivedSupportClassification {
  if (isCompleteSupportedGameplayCapability(capability)) {
    return 'COMPLETE_SUPPORTED';
  }
  if (capability.status === 'runtime_backed') {
    return 'CONDITIONAL_LEGACY_BACKED';
  }
  if (capability.status === 'contract_seeded') {
    return 'CONTRACT_SEEDED';
  }
  if (capability.status === 'planned') {
    return 'DEFERRED';
  }
  return 'UNSUPPORTED';
}

function buildGameplayCapabilityInventorySupportEvidence(capability: GameplayCapabilityDescriptor): GameplayCapabilityInventorySupportEvidence {
  const evidenceDimensions = deriveGameplayCapabilitySupportEvidenceDimensions(capability);
  return {
    capabilityId: capability.id,
    declaredStatus: capability.status,
    derivedClassification: deriveGameplayCapabilitySupportClassification(capability),
    evidenceDimensions,
    missingEvidenceDimensions: getMissingGameplayCapabilitySupportEvidenceDimensions(evidenceDimensions),
    missingSupportEvidencePrerequisites: getMissingGameplayCapabilitySupportEvidencePrerequisites(capability),
    completeSupported: isCompleteSupportedEvidenceDimensions(evidenceDimensions),
    legacyBacked: capability.status === 'runtime_backed'
  };
}

function countCapabilitiesByDerivedClassification(
  entries: readonly GameplayCapabilityDescriptor[]
): Record<GameplayCapabilityDerivedSupportClassification, number> {
  return GAMEPLAY_CAPABILITY_DERIVED_SUPPORT_CLASSIFICATIONS.reduce(
    (counts, classification) => ({
      ...counts,
      [classification]: entries.filter((entry) => deriveGameplayCapabilitySupportClassification(entry) === classification).length
    }),
    {} as Record<GameplayCapabilityDerivedSupportClassification, number>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildKnownRuntimeProfileIds(runtimeGenres: readonly RuntimeGenreCapability[]): Set<string> {
  return new Set(runtimeGenres.map(runtimeProfileId));
}

function runtimeProfileId(runtimeGenre: RuntimeGenreCapability): string {
  return runtimeGenre.dslProfile ?? `${runtimeGenre.genre}.${runtimeGenre.version}`;
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
