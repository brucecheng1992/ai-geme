import { z } from 'zod';

import { DeclarativeJsonObjectSchema, type DeclarativeJsonValue } from './declarative-json.js';
import {
  GameplayCapabilityPackageContractSchema,
  validateGameplayCapabilityPackage,
  validateGameplayCapabilityPackages,
  type GameplayCapabilityPackageContract,
  type GameplayCapabilityPackageValidationReport
} from './package-contract.js';
import {
  buildPhaserRuntimeSystemLoaderPlan,
  PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
  PhaserRuntimeSystemManifestSchema,
  type PhaserRuntimeSystemManifest
} from './phaser-runtime-loader.js';
import {
  buildCapabilityRuntimeQaPlan,
  CAPABILITY_RUNTIME_QA_PLAN_KIND,
  CAPABILITY_RUNTIME_QA_PLAN_SCHEMA_VERSION,
  type CapabilityRuntimeQaPlan,
  type ProfileQaScenarioProbe
} from './capability-qa-probes.js';
import {
  GAMEPLAY_CAPABILITY_LOCK_KIND,
  GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION,
  type GameplayCapabilityLock
} from './capability-lock.js';
import { GameplayCapabilityIdSchema, GameplayProfileIdSchema, RuntimeFamilyIdSchema } from './registry.js';
import { hashStableJson } from './stable-json.js';

export const GAMEPLAY_PROFILE_RECIPE_CONTRACT_VERSION = 'gameplay-profile-recipe.v0.1';
export const GAMEPLAY_PROFILE_COMPILATION_REPORT_KIND = 'gameplay_profile_compilation_report';
export const GAMEPLAY_PROFILE_COMPILATION_REPORT_SCHEMA_VERSION = 'gameplay_profile_compilation_report.v0.1';
export const RESOLVED_CAPABILITY_GRAPH_KIND = 'resolved_capability_graph';
export const RESOLVED_CAPABILITY_GRAPH_SCHEMA_VERSION = 'resolved_capability_graph.v0.1';
export const COMPOSED_GAME_DSL_SCHEMA_KIND = 'composed_game_dsl_schema';
export const COMPOSED_GAME_DSL_SCHEMA_VERSION = 'composed_game_dsl_schema.v0.1';
export const PROFILE_CAPABILITY_IR_COMPILER_PLAN_KIND = 'capability_ir_compiler_plan';
export const PROFILE_CAPABILITY_IR_COMPILER_PLAN_SCHEMA_VERSION = 'capability_ir_compiler_plan.profile.v0.1';
export const CAPABILITY_QA_PLAN_KIND = CAPABILITY_RUNTIME_QA_PLAN_KIND;
export const CAPABILITY_QA_PLAN_SCHEMA_VERSION = CAPABILITY_RUNTIME_QA_PLAN_SCHEMA_VERSION;
export const GENERATION_CAPABILITY_CONTEXT_KIND = 'generation_capability_context';
export const GENERATION_CAPABILITY_CONTEXT_SCHEMA_VERSION = 'generation_capability_context.v0.1';

type DeclarativeJsonObject = { [key: string]: DeclarativeJsonValue };

export const GameplayProfileRecipeSchema = z
  .strictObject({
    contractVersion: z.literal(GAMEPLAY_PROFILE_RECIPE_CONTRACT_VERSION),
    id: GameplayProfileIdSchema,
    runtimeFamily: RuntimeFamilyIdSchema,
    requiredCapabilities: z.array(GameplayCapabilityIdSchema).min(1).max(120),
    optionalCapabilities: z.array(GameplayCapabilityIdSchema).max(120).default([]),
    defaults: DeclarativeJsonObjectSchema.default({}),
    constraints: z.array(z.string().min(1).max(240)).max(80).default([]),
    acceptance: z
      .strictObject({
        requiredEvidence: z.array(z.string().min(1).max(160)).max(80).default([])
      })
      .default({ requiredEvidence: [] })
  })
  .superRefine((recipe, ctx) => {
    const seen = new Set<string>();
    for (const capabilityId of [...recipe.requiredCapabilities, ...recipe.optionalCapabilities]) {
      if (seen.has(capabilityId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['capabilities'],
          message: `Capability ${capabilityId} is declared more than once in the profile recipe.`
        });
      }
      seen.add(capabilityId);
    }
  });

export type GameplayProfileRecipe = z.infer<typeof GameplayProfileRecipeSchema>;

export type ResolvedCapabilityGraph = {
  artifactKind: typeof RESOLVED_CAPABILITY_GRAPH_KIND;
  schemaVersion: typeof RESOLVED_CAPABILITY_GRAPH_SCHEMA_VERSION;
  profileId: string;
  runtimeFamily: string;
  status: 'resolved' | 'blocked';
  requiredCapabilityIds: string[];
  selectedCapabilityIds: string[];
  optionalSelectedCapabilityIds: string[];
  deferredCapabilityIds: string[];
  dependencyEdges: Array<{ from: string; to: string; range: string }>;
  graphHash: string;
};

export type ComposedGameDslSchemaArtifact = {
  artifactKind: typeof COMPOSED_GAME_DSL_SCHEMA_KIND;
  schemaVersion: typeof COMPOSED_GAME_DSL_SCHEMA_VERSION;
  profileId: string;
  capabilityIds: string[];
  schemaFragmentIds: string[];
  ownedDslPaths: string[];
  supportedDslNodeKinds: string[];
  schemaHash: string;
};

export type ProfileCapabilityIrCompilerPlan = {
  artifactKind: typeof PROFILE_CAPABILITY_IR_COMPILER_PLAN_KIND;
  schemaVersion: typeof PROFILE_CAPABILITY_IR_COMPILER_PLAN_SCHEMA_VERSION;
  profileId: string;
  compilerOrder: Array<{ capabilityId: string; compilerId: string; ownedNodeKinds: string[] }>;
  planHash: string;
};

export type CapabilityQaPlan = CapabilityRuntimeQaPlan;

export type GenerationCapabilityContext = {
  artifactKind: typeof GENERATION_CAPABILITY_CONTEXT_KIND;
  schemaVersion: typeof GENERATION_CAPABILITY_CONTEXT_SCHEMA_VERSION;
  profileId: string;
  runtimeFamily: string;
  supportedCapabilities: string[];
  deferredCapabilities: string[];
  supportedDslNodeKinds: string[];
  supportedOperations: string[];
  compatibilityConstraints: string[];
  defaults: DeclarativeJsonObject;
  prohibitedUnsupportedFallbacks: string[];
  contextHash: string;
};

export type GameplayProfileDerivedSupport = {
  graphResolved: boolean;
  allRequiredPackagesComplete: boolean;
  runtimeManifestComplete: boolean;
  qaPlanComplete: boolean;
  referenceAcceptancePassed: boolean;
  supported: boolean;
};

export type GameplayProfileCompilationArtifacts = {
  resolvedCapabilityGraph: ResolvedCapabilityGraph;
  gameplayCapabilityLock: GameplayCapabilityLock;
  composedGameDslSchema: ComposedGameDslSchemaArtifact;
  capabilityIrCompilerPlan: ProfileCapabilityIrCompilerPlan;
  runtimeSystemManifest: PhaserRuntimeSystemManifest;
  capabilityQaPlan: CapabilityQaPlan;
  generationCapabilityContext: GenerationCapabilityContext;
};

export type GameplayProfileCompilationIssue = {
  code:
    | 'PROFILE_RECIPE_INVALID'
    | 'PROFILE_PACKAGE_SET_INVALID'
    | 'PROFILE_REQUIRED_CAPABILITY_MISSING'
    | 'PROFILE_REQUIRED_CAPABILITY_UNSUPPORTED'
    | 'PROFILE_DEPENDENCY_UNRESOLVED'
    | 'PROFILE_CAPABILITY_CONFLICT'
    | 'PROFILE_RUNTIME_MANIFEST_INVALID'
    | 'PROFILE_RUNTIME_FAMILY_MISMATCH'
    | 'PROFILE_RUNTIME_LOADER_INVALID'
    | 'PROFILE_RUNTIME_SYSTEM_MISSING'
    | 'PROFILE_QA_PLAN_INCOMPLETE'
    | 'PROFILE_REFERENCE_ACCEPTANCE_MISSING'
    | 'PROFILE_DEFAULTS_INVALID';
  path: string;
  message: string;
  capabilityId?: string;
};

export type GameplayProfileCompilationReport = {
  artifactKind: typeof GAMEPLAY_PROFILE_COMPILATION_REPORT_KIND;
  schemaVersion: typeof GAMEPLAY_PROFILE_COMPILATION_REPORT_SCHEMA_VERSION;
  status: 'compiled' | 'blocked';
  profileId?: string;
  runtimeFamily?: string;
  support: GameplayProfileDerivedSupport;
  artifacts?: GameplayProfileCompilationArtifacts;
  issues: GameplayProfileCompilationIssue[];
};

type SelectedPackage = {
  contract: GameplayCapabilityPackageContract;
  report: GameplayCapabilityPackageValidationReport;
};

export function compileGameplayProfileRecipe(input: {
  recipe: unknown;
  packages: readonly unknown[];
  runtimeManifest: unknown;
  referenceAcceptance?: { passed: boolean; evidenceRefs?: readonly string[] };
  profileQaScenarios?: readonly ProfileQaScenarioProbe[];
  step33RenderFidelityEvidenceRefs?: readonly string[];
  step34AmendmentVerificationRefs?: readonly string[];
  userValues?: unknown;
  acceptedAmendmentValues?: unknown;
}): GameplayProfileCompilationReport {
  const recipe = GameplayProfileRecipeSchema.safeParse(input.recipe);
  const runtimeManifest = PhaserRuntimeSystemManifestSchema.safeParse(input.runtimeManifest);
  const userValues = DeclarativeJsonObjectSchema.safeParse(input.userValues ?? {});
  const acceptedAmendmentValues = DeclarativeJsonObjectSchema.safeParse(input.acceptedAmendmentValues ?? {});
  const packageSet = validateGameplayCapabilityPackages(input.packages);
  const issues: GameplayProfileCompilationIssue[] = [
    ...recipeIssues(recipe),
    ...packageSet.issues.map((issue): GameplayProfileCompilationIssue => ({
      code: 'PROFILE_PACKAGE_SET_INVALID',
      path: issue.path,
      capabilityId: issue.packageId,
      message: issue.message
    })),
    ...runtimeManifestIssues(runtimeManifest),
    ...defaultsIssues('userValues', userValues),
    ...defaultsIssues('acceptedAmendmentValues', acceptedAmendmentValues)
  ];

  if (!recipe.success || !runtimeManifest.success || !userValues.success || !acceptedAmendmentValues.success) {
    return blockedReport({ recipe: recipe.success ? recipe.data : undefined, issues });
  }

  if (runtimeManifest.data.runtimeFamily !== recipe.data.runtimeFamily) {
    issues.push({
      code: 'PROFILE_RUNTIME_FAMILY_MISMATCH',
      path: 'runtimeManifest.runtimeFamily',
      message: `Profile recipe runtime family ${recipe.data.runtimeFamily} does not match runtime manifest ${runtimeManifest.data.runtimeFamily}.`
    });
  }

  const packages = buildPackageMap(input.packages);
  const selected = resolveProfilePackages(recipe.data, packages, issues);
  const selectedCapabilities = [...selected.keys()].sort();
  const requiredPackageIds = new Set(recipe.data.requiredCapabilities);
  const allRequiredPackagesComplete = recipe.data.requiredCapabilities.every((capabilityId) => selected.get(capabilityId)?.report.supportEligible === true);

  for (const selectedPackage of selected.values()) {
    for (const conflict of selectedPackage.contract.conflictsWith) {
      if (selected.has(conflict.capabilityId)) {
        issues.push({
          code: 'PROFILE_CAPABILITY_CONFLICT',
          path: `packages.${selectedPackage.contract.manifest.id}.conflictsWith`,
          capabilityId: selectedPackage.contract.manifest.id,
          message: `${selectedPackage.contract.manifest.id} conflicts with ${conflict.capabilityId}: ${conflict.reason}`
        });
      }
    }
  }

  const runtimeModuleIds = new Set(runtimeManifest.data.systems.map((system) => system.id));
  for (const selectedPackage of selected.values()) {
    if (!selectedPackage.contract.manifest.runtimeFamilies.includes(recipe.data.runtimeFamily)) {
      issues.push({
        code: 'PROFILE_RUNTIME_FAMILY_MISMATCH',
        path: `packages.${selectedPackage.contract.manifest.id}.manifest.runtimeFamilies`,
        capabilityId: selectedPackage.contract.manifest.id,
        message: `${selectedPackage.contract.manifest.id} does not support runtime family ${recipe.data.runtimeFamily}.`
      });
    }
    for (const system of selectedPackage.contract.runtime.systems) {
      if (!runtimeModuleIds.has(system.id)) {
        issues.push({
          code: 'PROFILE_RUNTIME_SYSTEM_MISSING',
          path: `runtimeManifest.systems.${system.id}`,
          capabilityId: selectedPackage.contract.manifest.id,
          message: `Runtime manifest is missing system ${system.id} for ${selectedPackage.contract.manifest.id}.`
        });
      }
    }
  }

  const runtimeLoaderReport = buildProfileRuntimeLoaderReport({
    recipe: recipe.data,
    selectedPackages: [...selected.values()],
    runtimeManifest: runtimeManifest.data
  });
  issues.push(
    ...runtimeLoaderReport.issues.map((issue): GameplayProfileCompilationIssue => ({
      code: 'PROFILE_RUNTIME_LOADER_INVALID',
      path: issue.path,
      capabilityId: issue.capabilityId,
      message: issue.message
    }))
  );

  const graphBlockingIssues = issues.filter((issue) =>
    [
      'PROFILE_PACKAGE_SET_INVALID',
      'PROFILE_REQUIRED_CAPABILITY_MISSING',
      'PROFILE_REQUIRED_CAPABILITY_UNSUPPORTED',
      'PROFILE_DEPENDENCY_UNRESOLVED',
      'PROFILE_CAPABILITY_CONFLICT'
    ].includes(issue.code)
  );
  const graphResolved = graphBlockingIssues.length === 0;
  const selectedPackages = [...selected.values()].sort(compareSelectedPackages);
  const gameplayCapabilityLock = buildGameplayCapabilityLock(recipe.data, selectedPackages);
  const qaPlan = buildCapabilityRuntimeQaPlan({
    profileId: recipe.data.id,
    capabilityLock: gameplayCapabilityLock,
    packages: selectedPackages.map((entry) => entry.contract),
    profileScenarios: input.profileQaScenarios,
    step33RenderFidelityEvidenceRefs: input.step33RenderFidelityEvidenceRefs,
    step34AmendmentVerificationRefs: input.step34AmendmentVerificationRefs
  });
  if (qaPlan.status !== 'ready') {
    issues.push({
      code: 'PROFILE_QA_PLAN_INCOMPLETE',
      path: 'capabilityQaPlan',
      message: qaPlan.diagnostics.map((diagnostic) => diagnostic.message).join('; ') || 'Capability QA plan is blocked.'
    });
  }
  const suppliedReferenceEvidence = new Set(input.referenceAcceptance?.evidenceRefs ?? []);
  const referenceAcceptancePassed =
    input.referenceAcceptance?.passed === true && recipe.data.acceptance.requiredEvidence.every((evidenceRef) => suppliedReferenceEvidence.has(evidenceRef));
  if (!referenceAcceptancePassed) {
    issues.push({
      code: 'PROFILE_REFERENCE_ACCEPTANCE_MISSING',
      path: 'referenceAcceptance',
      message: 'Profile support requires passed reference acceptance evidence matching recipe acceptance requirements.'
    });
  }

  const runtimeManifestComplete = runtimeManifest.success && runtimeLoaderReport.status === 'ready' && issues.every((issue) => !issue.code.startsWith('PROFILE_RUNTIME_'));
  const support: GameplayProfileDerivedSupport = {
    graphResolved,
    allRequiredPackagesComplete,
    runtimeManifestComplete,
    qaPlanComplete: qaPlan.status === 'ready',
    referenceAcceptancePassed,
    supported: graphResolved && allRequiredPackagesComplete && runtimeManifestComplete && qaPlan.status === 'ready' && referenceAcceptancePassed
  };

  if (issues.length > 0) {
    return {
      artifactKind: GAMEPLAY_PROFILE_COMPILATION_REPORT_KIND,
      schemaVersion: GAMEPLAY_PROFILE_COMPILATION_REPORT_SCHEMA_VERSION,
      status: 'blocked',
      profileId: recipe.data.id,
      runtimeFamily: recipe.data.runtimeFamily,
      support,
      issues
    };
  }

  const artifacts: GameplayProfileCompilationArtifacts = {
    resolvedCapabilityGraph: buildResolvedCapabilityGraph(recipe.data, selectedPackages, selectedCapabilities, graphResolved),
    gameplayCapabilityLock,
    composedGameDslSchema: buildComposedGameDslSchema(recipe.data.id, selectedPackages),
    capabilityIrCompilerPlan: buildProfileCapabilityIrCompilerPlan(recipe.data.id, selectedPackages),
    runtimeSystemManifest: runtimeManifest.data,
    capabilityQaPlan: qaPlan,
    generationCapabilityContext: buildGenerationCapabilityContext({
      recipe: recipe.data,
      selectedPackages,
      selectedCapabilityIds: selectedCapabilities,
      deferredCapabilityIds: deferredOptionalCapabilities(recipe.data, packages),
      userValues: userValues.data,
      acceptedAmendmentValues: acceptedAmendmentValues.data
    })
  };

  return {
    artifactKind: GAMEPLAY_PROFILE_COMPILATION_REPORT_KIND,
    schemaVersion: GAMEPLAY_PROFILE_COMPILATION_REPORT_SCHEMA_VERSION,
    status: 'compiled',
    profileId: recipe.data.id,
    runtimeFamily: recipe.data.runtimeFamily,
    support,
    artifacts,
    issues: []
  };
}

export function mergeGameplayProfileDefaults(input: {
  capabilityDefaults?: DeclarativeJsonObject;
  profileDefaults?: DeclarativeJsonObject;
  acceptedAmendmentValues?: DeclarativeJsonObject;
  userValues?: DeclarativeJsonObject;
}): DeclarativeJsonObject {
  return deepMergeObjects(
    input.capabilityDefaults ?? {},
    input.profileDefaults ?? {},
    input.acceptedAmendmentValues ?? {},
    input.userValues ?? {}
  );
}

function buildProfileRuntimeLoaderReport(input: {
  recipe: GameplayProfileRecipe;
  selectedPackages: readonly SelectedPackage[];
  runtimeManifest: PhaserRuntimeSystemManifest;
}) {
  const capabilityIds = input.selectedPackages.map((entry) => entry.contract.manifest.id).sort();
  const capabilityLockRef = 'gameplay_capability_lock.json';
  const capabilityLockHash = hashStableJson({
    profileId: input.recipe.id,
    runtimeFamily: input.recipe.runtimeFamily,
    capabilityIds
  });
  const runtimeFamily =
    input.recipe.runtimeFamily === PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY ? PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY : input.recipe.runtimeFamily;

  return buildPhaserRuntimeSystemLoaderPlan({
    gameIr: {
      contractVersion: 'capability-game-ir.v0.1',
      runtimeFamily,
      profileId: input.recipe.id,
      capabilityLockRef,
      runtimeSystemConfigs: input.selectedPackages.flatMap((entry) =>
        entry.contract.runtime.systems.map((system) => ({
          id: system.id,
          capabilityId: entry.contract.manifest.id,
          config: {}
        }))
      ),
      entityComponents: [],
      rules: [],
      goals: [],
      assetRequirements: [],
      telemetryRequirements: [],
      assetManifestRef: 'asset_manifest.json',
      telemetryPlanRef: 'telemetry_plan.json',
      qaPlanRef: 'capability_qa_plan.json'
    },
    manifest: input.runtimeManifest,
    capabilityLock: {
      ref: capabilityLockRef,
      hash: capabilityLockHash,
      capabilityIds
    }
  });
}

function resolveProfilePackages(
  recipe: GameplayProfileRecipe,
  packages: ReadonlyMap<string, SelectedPackage>,
  issues: GameplayProfileCompilationIssue[]
): Map<string, SelectedPackage> {
  const selected = new Map<string, SelectedPackage>();
  for (const capabilityId of recipe.requiredCapabilities) {
    const selectedPackage = packages.get(capabilityId);
    if (selectedPackage === undefined) {
      issues.push({
        code: 'PROFILE_REQUIRED_CAPABILITY_MISSING',
        path: 'recipe.requiredCapabilities',
        capabilityId,
        message: `Required capability ${capabilityId} has no package contract.`
      });
      continue;
    }
    if (!selectedPackage.report.supportEligible) {
      issues.push({
        code: 'PROFILE_REQUIRED_CAPABILITY_UNSUPPORTED',
        path: `packages.${capabilityId}`,
        capabilityId,
        message: `Required capability ${capabilityId} is not COMPLETE_SUPPORTED.`
      });
      continue;
    }
    selected.set(capabilityId, selectedPackage);
  }

  for (const capabilityId of recipe.optionalCapabilities) {
    const selectedPackage = packages.get(capabilityId);
    if (selectedPackage?.report.supportEligible === true) {
      selected.set(capabilityId, selectedPackage);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const selectedPackage of [...selected.values()]) {
      for (const dependency of selectedPackage.contract.dependencies) {
        if (selected.has(dependency.capabilityId)) {
          continue;
        }
        const dependencyPackage = packages.get(dependency.capabilityId);
        if (dependencyPackage?.report.supportEligible === true) {
          selected.set(dependency.capabilityId, dependencyPackage);
          changed = true;
          continue;
        }
        issues.push({
          code: 'PROFILE_DEPENDENCY_UNRESOLVED',
          path: `packages.${selectedPackage.contract.manifest.id}.dependencies`,
          capabilityId: selectedPackage.contract.manifest.id,
          message: `${selectedPackage.contract.manifest.id} requires ${dependency.capabilityId} (${dependency.range}), but no supported package is selected.`
        });
      }
    }
  }

  return selected;
}

function buildResolvedCapabilityGraph(
  recipe: GameplayProfileRecipe,
  selectedPackages: readonly SelectedPackage[],
  selectedCapabilityIds: readonly string[],
  graphResolved: boolean
): ResolvedCapabilityGraph {
  const payload: Omit<ResolvedCapabilityGraph, 'graphHash'> = {
    artifactKind: RESOLVED_CAPABILITY_GRAPH_KIND,
    schemaVersion: RESOLVED_CAPABILITY_GRAPH_SCHEMA_VERSION,
    profileId: recipe.id,
    runtimeFamily: recipe.runtimeFamily,
    status: graphResolved ? 'resolved' : 'blocked',
    requiredCapabilityIds: [...recipe.requiredCapabilities].sort(),
    selectedCapabilityIds: [...selectedCapabilityIds].sort(),
    optionalSelectedCapabilityIds: recipe.optionalCapabilities.filter((capabilityId) => selectedCapabilityIds.includes(capabilityId)).sort(),
    deferredCapabilityIds: deferredOptionalCapabilities(recipe, new Map(selectedPackages.map((entry) => [entry.contract.manifest.id, entry]))),
    dependencyEdges: selectedPackages
      .flatMap((entry) =>
        entry.contract.dependencies.map((dependency) => ({
          from: entry.contract.manifest.id,
          to: dependency.capabilityId,
          range: dependency.range
        }))
      )
      .sort(compareDependencyEdges)
  };
  return { ...payload, graphHash: hashStableJson(payload) };
}

function buildGameplayCapabilityLock(recipe: GameplayProfileRecipe, selectedPackages: readonly SelectedPackage[]): GameplayCapabilityLock {
  const packages = selectedPackages.map((entry) => ({
    capabilityId: entry.contract.manifest.id,
    packageVersion: entry.contract.manifest.packageVersion,
    packageHash: entry.report.packageHash ?? hashStableJson(entry.contract)
  }));
  const payload: Omit<GameplayCapabilityLock, 'lockHash'> = {
    artifactKind: GAMEPLAY_CAPABILITY_LOCK_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION,
    profileId: recipe.id,
    runtimeFamily: recipe.runtimeFamily,
    capabilityIds: packages.map((entry) => entry.capabilityId),
    packages
  };
  return { ...payload, lockHash: hashStableJson(payload) };
}

function buildComposedGameDslSchema(profileId: string, selectedPackages: readonly SelectedPackage[]): ComposedGameDslSchemaArtifact {
  const payload: Omit<ComposedGameDslSchemaArtifact, 'schemaHash'> = {
    artifactKind: COMPOSED_GAME_DSL_SCHEMA_KIND,
    schemaVersion: COMPOSED_GAME_DSL_SCHEMA_VERSION,
    profileId,
    capabilityIds: selectedPackages.map((entry) => entry.contract.manifest.id),
    schemaFragmentIds: selectedPackages.map((entry) => entry.contract.dsl.schemaFragmentId).sort(),
    ownedDslPaths: selectedPackages.flatMap((entry) => entry.contract.dsl.ownedPaths).sort(),
    supportedDslNodeKinds: uniqueSortedStrings(selectedPackages.flatMap((entry) => entry.contract.ir.ownedNodeKinds))
  };
  return { ...payload, schemaHash: hashStableJson(payload) };
}

function buildProfileCapabilityIrCompilerPlan(profileId: string, selectedPackages: readonly SelectedPackage[]): ProfileCapabilityIrCompilerPlan {
  const payload: Omit<ProfileCapabilityIrCompilerPlan, 'planHash'> = {
    artifactKind: PROFILE_CAPABILITY_IR_COMPILER_PLAN_KIND,
    schemaVersion: PROFILE_CAPABILITY_IR_COMPILER_PLAN_SCHEMA_VERSION,
    profileId,
    compilerOrder: selectedPackages.map((entry) => ({
      capabilityId: entry.contract.manifest.id,
      compilerId: entry.contract.ir.compilerId,
      ownedNodeKinds: [...entry.contract.ir.ownedNodeKinds].sort()
    }))
  };
  return { ...payload, planHash: hashStableJson(payload) };
}

function buildGenerationCapabilityContext(input: {
  recipe: GameplayProfileRecipe;
  selectedPackages: readonly SelectedPackage[];
  selectedCapabilityIds: readonly string[];
  deferredCapabilityIds: readonly string[];
  userValues: DeclarativeJsonObject;
  acceptedAmendmentValues: DeclarativeJsonObject;
}): GenerationCapabilityContext {
  const capabilityDefaults = deepMergeObjects(...input.selectedPackages.map((entry) => entry.contract.defaults));
  const defaults = mergeGameplayProfileDefaults({
    capabilityDefaults,
    profileDefaults: input.recipe.defaults,
    acceptedAmendmentValues: input.acceptedAmendmentValues,
    userValues: input.userValues
  });
  const payload: Omit<GenerationCapabilityContext, 'contextHash'> = {
    artifactKind: GENERATION_CAPABILITY_CONTEXT_KIND,
    schemaVersion: GENERATION_CAPABILITY_CONTEXT_SCHEMA_VERSION,
    profileId: input.recipe.id,
    runtimeFamily: input.recipe.runtimeFamily,
    supportedCapabilities: [...input.selectedCapabilityIds].sort(),
    deferredCapabilities: [...input.deferredCapabilityIds].sort(),
    supportedDslNodeKinds: uniqueSortedStrings(input.selectedPackages.flatMap((entry) => entry.contract.ir.ownedNodeKinds)),
    supportedOperations: uniqueSortedStrings(input.selectedPackages.flatMap((entry) => entry.contract.amendments.supportedOperations.map((operation) => operation.operation))),
    compatibilityConstraints: [...input.recipe.constraints].sort(),
    defaults,
    prohibitedUnsupportedFallbacks: input.deferredCapabilityIds.map((capabilityId) => `Do not synthesize unsupported fallback for ${capabilityId}.`).sort()
  };
  return { ...payload, contextHash: hashStableJson(payload) };
}

function buildPackageMap(packages: readonly unknown[]): Map<string, SelectedPackage> {
  const packageMap = new Map<string, SelectedPackage>();
  for (const candidate of packages) {
    const parsed = GameplayCapabilityPackageContractSchema.safeParse(candidate);
    if (!parsed.success) {
      continue;
    }
    packageMap.set(parsed.data.manifest.id, {
      contract: parsed.data,
      report: validateGameplayCapabilityPackage(parsed.data)
    });
  }
  return packageMap;
}

function deferredOptionalCapabilities(recipe: GameplayProfileRecipe, packages: ReadonlyMap<string, SelectedPackage>): string[] {
  return recipe.optionalCapabilities.filter((capabilityId) => packages.get(capabilityId)?.report.supportEligible !== true).sort();
}

function blockedReport(input: { recipe?: GameplayProfileRecipe; issues: GameplayProfileCompilationIssue[] }): GameplayProfileCompilationReport {
  return {
    artifactKind: GAMEPLAY_PROFILE_COMPILATION_REPORT_KIND,
    schemaVersion: GAMEPLAY_PROFILE_COMPILATION_REPORT_SCHEMA_VERSION,
    status: 'blocked',
    profileId: input.recipe?.id,
    runtimeFamily: input.recipe?.runtimeFamily,
    support: {
      graphResolved: false,
      allRequiredPackagesComplete: false,
      runtimeManifestComplete: false,
      qaPlanComplete: false,
      referenceAcceptancePassed: false,
      supported: false
    },
    issues: input.issues
  };
}

function recipeIssues(result: { success: true } | { success: false; error: z.ZodError }): GameplayProfileCompilationIssue[] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => ({
    code: 'PROFILE_RECIPE_INVALID',
    path: issue.path.map(String).join('.') || '<root>',
    message: issue.message
  }));
}

function runtimeManifestIssues(result: { success: true } | { success: false; error: z.ZodError }): GameplayProfileCompilationIssue[] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => ({
    code: 'PROFILE_RUNTIME_MANIFEST_INVALID',
    path: issue.path.map(String).join('.') || '<root>',
    message: issue.message
  }));
}

function defaultsIssues(pathPrefix: 'userValues' | 'acceptedAmendmentValues', result: { success: true } | { success: false; error: z.ZodError }): GameplayProfileCompilationIssue[] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => ({
    code: 'PROFILE_DEFAULTS_INVALID',
    path: [pathPrefix, ...issue.path.map(String)].join('.'),
    message: issue.message
  }));
}

function deepMergeObjects(...objects: readonly DeclarativeJsonObject[]): DeclarativeJsonObject {
  const output: DeclarativeJsonObject = {};
  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      const current = output[key];
      output[key] = isDeclarativeJsonObject(current) && isDeclarativeJsonObject(value) ? deepMergeObjects(current, value) : value;
    }
  }
  return output;
}

function isDeclarativeJsonObject(value: DeclarativeJsonValue | undefined): value is DeclarativeJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function compareSelectedPackages(left: SelectedPackage, right: SelectedPackage): number {
  return left.contract.manifest.id.localeCompare(right.contract.manifest.id);
}

function compareDependencyEdges(left: { from: string; to: string; range: string }, right: { from: string; to: string; range: string }): number {
  return `${left.from}:${left.to}:${left.range}`.localeCompare(`${right.from}:${right.to}:${right.range}`);
}
