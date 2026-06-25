import { z } from 'zod';

import { CAPABILITY_GAME_IR_CONTRACT_VERSION, type CapabilityDrivenGameIr } from './capability-ir.js';
import { DeclarativeJsonObjectSchema, type DeclarativeJsonValue } from './declarative-json.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID,
  isDefaultStraightSingleWeaponFireResult,
  isDefaultStraightSingleWeaponRuntimeState
} from './default-straight-single-weapon-runtime-module.js';
import { GameplayCapabilityIdSchema } from './registry.js';
import { hashStableJson } from './stable-json.js';

export const PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY = 'phaser_2d_action_arcade.v1';
export const PHASER_RUNTIME_SYSTEM_MANIFEST_KIND = 'phaser_runtime_system_manifest';
export const PHASER_RUNTIME_SYSTEM_MANIFEST_SCHEMA_VERSION = 'phaser_runtime_system_manifest.v0.1';
export const PHASER_RUNTIME_LOADER_PLAN_KIND = 'phaser_runtime_loader_plan';
export const PHASER_RUNTIME_LOADER_PLAN_SCHEMA_VERSION = 'phaser_runtime_loader_plan.v0.1';
export const PHASER_RUNTIME_LOADER_REPORT_KIND = 'phaser_runtime_loader_report';
export const PHASER_RUNTIME_LOADER_REPORT_SCHEMA_VERSION = 'phaser_runtime_loader_report.v0.1';
export const CAPABILITY_RUNTIME_BINDING_REPORT_KIND = 'capability_runtime_binding_report';
export const CAPABILITY_RUNTIME_BINDING_REPORT_SCHEMA_VERSION = 'capability_runtime_binding_report.v0.1';

export const PHASER_RUNTIME_PHASES = ['bootstrap', 'scene', 'physics', 'input', 'gameplay', 'feedback', 'ui', 'telemetry'] as const;
export const PHASER_RUNTIME_SERVICE_IDS = [
  'physics_body',
  'entity_registry',
  'input',
  'projectile',
  'damage',
  'goal',
  'asset_binding',
  'telemetry',
  'runtime_patch',
  'event_bus',
  'scheduler',
  'qa_observer'
] as const;

const RuntimeSystemIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{2,120}$/);
const RuntimeVersionSchema = z.string().regex(/^v[1-9][0-9]*$/);
const RuntimePhaseSchema = z.enum(PHASER_RUNTIME_PHASES);
const RuntimeServiceIdSchema = z.enum(PHASER_RUNTIME_SERVICE_IDS);
type DeclarativeJsonObject = { [key: string]: DeclarativeJsonValue };

const RuntimePatchablePropertySchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,119}$/);

export const PhaserRuntimePatchDescriptorSchema = z.strictObject({
  patchableProperties: z.array(RuntimePatchablePropertySchema).min(1).max(80),
  snapshotStrategy: z.enum(['module_snapshot', 'service_observer']),
  applyStrategy: z.literal('module_apply_patch'),
  revertStrategy: z.enum(['previous_snapshot', 'reject_without_apply']),
  verificationEvent: RuntimeSystemIdSchema
});

export const PhaserRuntimeSystemModuleDescriptorSchema = z.strictObject({
  id: RuntimeSystemIdSchema,
  version: RuntimeVersionSchema,
  capabilityId: GameplayCapabilityIdSchema,
  runtimeFamily: z.literal(PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY),
  phase: RuntimePhaseSchema,
  dependencies: z.array(RuntimeSystemIdSchema).max(40),
  services: z.array(RuntimeServiceIdSchema).max(20),
  authoritativeConfig: z.enum(['capability_ir', 'template_default']),
  patch: PhaserRuntimePatchDescriptorSchema.optional(),
  qaProbeIds: z.array(RuntimeSystemIdSchema).max(40)
});

export const PhaserRuntimeKernelManifestSchema = z.strictObject({
  id: RuntimeSystemIdSchema,
  version: RuntimeVersionSchema,
  runtimeFamily: z.literal(PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY),
  templateBoundary: z.literal('universal_kernel'),
  profileBranching: z.literal('forbidden'),
  defaultGameplayObjects: z.literal('forbidden'),
  services: z.array(RuntimeServiceIdSchema).min(1).max(40)
});

export const PhaserRuntimeCompatibilityModeSchema = z.strictObject({
  selection: z.enum(['universal_composition', 'legacy_template']),
  selectedBy: z.enum(['feature_flag', 'profile_compiler_version']),
  selectorValue: z.string().min(1).max(120),
  universalTemplatePath: z.literal('templates/phaser/universal-2d-action'),
  legacyTemplatePath: z.string().min(1).max(240).optional()
});

export const PhaserRuntimeSystemManifestSchema = z.strictObject({
  artifactKind: z.literal(PHASER_RUNTIME_SYSTEM_MANIFEST_KIND),
  schemaVersion: z.literal(PHASER_RUNTIME_SYSTEM_MANIFEST_SCHEMA_VERSION),
  runtimeFamily: z.literal(PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY),
  kernel: PhaserRuntimeKernelManifestSchema,
  compatibilityMode: PhaserRuntimeCompatibilityModeSchema,
  systems: z.array(PhaserRuntimeSystemModuleDescriptorSchema).min(1).max(240)
});

const RuntimeSystemConfigSchema = z.strictObject({
  id: RuntimeSystemIdSchema,
  capabilityId: GameplayCapabilityIdSchema,
  config: DeclarativeJsonObjectSchema
});

const CapabilityDrivenGameIrRuntimeSliceSchema = z.strictObject({
  contractVersion: z.literal(CAPABILITY_GAME_IR_CONTRACT_VERSION),
  runtimeFamily: z.literal(PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY),
  profileId: z.string().min(1).max(120),
  capabilityLockRef: z.string().min(1).max(240),
  runtimeSystemConfigs: z.array(RuntimeSystemConfigSchema).max(240),
  entityComponents: z.array(z.unknown()),
  rules: z.array(z.unknown()),
  goals: z.array(z.unknown()),
  assetRequirements: z.array(z.unknown()),
  telemetryRequirements: z.array(z.unknown()),
  assetManifestRef: z.string().min(1).max(240),
  telemetryPlanRef: z.string().min(1).max(240),
  qaPlanRef: z.string().min(1).max(240)
});

const PhaserRuntimeCapabilityLockSchema = z.strictObject({
  ref: z.string().min(1).max(240),
  hash: z.string().min(1).max(160),
  capabilityIds: z.array(GameplayCapabilityIdSchema).min(1).max(400)
});

export type PhaserRuntimePhase = z.infer<typeof RuntimePhaseSchema>;
export type PhaserRuntimeSystemModuleDescriptor = z.infer<typeof PhaserRuntimeSystemModuleDescriptorSchema>;
export type PhaserRuntimeSystemManifest = z.infer<typeof PhaserRuntimeSystemManifestSchema>;
export type PhaserRuntimeCapabilityLock = z.infer<typeof PhaserRuntimeCapabilityLockSchema>;
export type PhaserRuntimeSystemConfig = z.infer<typeof RuntimeSystemConfigSchema>;

export type PhaserRuntimeLoaderIssue = {
  code:
    | 'RUNTIME_IR_INVALID'
    | 'RUNTIME_MANIFEST_INVALID'
    | 'RUNTIME_CAPABILITY_LOCK_INVALID'
    | 'RUNTIME_CAPABILITY_LOCK_MISMATCH'
    | 'RUNTIME_CAPABILITY_LOCK_MISSING'
    | 'RUNTIME_COMPATIBILITY_MODE_LEGACY'
    | 'RUNTIME_SYSTEM_CONFIG_DUPLICATE'
    | 'RUNTIME_MODULE_DUPLICATE'
    | 'RUNTIME_MODULE_DEFAULT_ENTITY_FORBIDDEN'
    | 'RUNTIME_MODULE_MISSING'
    | 'RUNTIME_MODULE_CAPABILITY_MISMATCH'
    | 'RUNTIME_MODULE_DEPENDENCY_MISSING'
    | 'RUNTIME_MODULE_CYCLE'
    | 'RUNTIME_PATCH_DESCRIPTOR_MISSING'
    | 'RUNTIME_PATCH_PROPERTY_UNSUPPORTED'
    | 'RUNTIME_BINDING_OBSERVATION_MISSING'
    | 'RUNTIME_BINDING_OBSERVATION_UNDECLARED';
  path: string;
  message: string;
  systemId?: string;
  capabilityId?: string;
};

export type PhaserRuntimeLoaderPlanEntry = {
  systemId: string;
  capabilityId: string;
  version: string;
  phase: PhaserRuntimePhase;
  dependencies: string[];
  services: string[];
  config: DeclarativeJsonObject;
  configHash: string;
  patchableProperties: string[];
  qaProbeIds: string[];
};

export type PhaserRuntimeLoaderPlan = {
  artifactKind: typeof PHASER_RUNTIME_LOADER_PLAN_KIND;
  schemaVersion: typeof PHASER_RUNTIME_LOADER_PLAN_SCHEMA_VERSION;
  runtimeFamily: typeof PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY;
  profileId: string;
  capabilityLockRef: string;
  capabilityLockHash: string;
  compatibilityMode: z.infer<typeof PhaserRuntimeCompatibilityModeSchema>;
  loadOrder: PhaserRuntimeLoaderPlanEntry[];
  updateLoopSystemIds: string[];
  planHash: string;
};

export type CapabilityRuntimeBindingModule = {
  systemId: string;
  capabilityId: string;
  phase: PhaserRuntimePhase;
  status: 'bound_pending_qa' | 'qa_observed';
  configHash: string;
  patchableProperties: string[];
  qaProbeIds: string[];
};

export type CapabilityRuntimeBindingReport = {
  artifactKind: typeof CAPABILITY_RUNTIME_BINDING_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_RUNTIME_BINDING_REPORT_SCHEMA_VERSION;
  runtimeFamily: typeof PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY;
  profileId: string;
  capabilityLockRef: string;
  capabilityLockHash: string;
  status: 'bound_pending_qa' | 'qa_observed';
  modules: CapabilityRuntimeBindingModule[];
  observedByQaProbeId?: string;
  reportHash: string;
};

export type PhaserRuntimeLoaderReport = {
  artifactKind: typeof PHASER_RUNTIME_LOADER_REPORT_KIND;
  schemaVersion: typeof PHASER_RUNTIME_LOADER_REPORT_SCHEMA_VERSION;
  status: 'ready' | 'invalid';
  runtimeFamily?: typeof PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY;
  profileId?: string;
  capabilityLockRef?: string;
  capabilityLockHash?: string;
  planHash?: string;
  bindingReportHash?: string;
  plan?: PhaserRuntimeLoaderPlan;
  bindingReport?: CapabilityRuntimeBindingReport;
  issues: PhaserRuntimeLoaderIssue[];
};

export type RuntimeCapabilityPatch = {
  systemId: string;
  property: string;
  value: DeclarativeJsonObject | string | number | boolean | null;
};

export type RuntimePatchAcknowledgement = {
  status: 'accepted' | 'rejected';
  systemId: string;
  property: string;
  verificationEvent?: string;
  snapshotStrategy?: z.infer<typeof PhaserRuntimePatchDescriptorSchema>['snapshotStrategy'];
  applyStrategy?: z.infer<typeof PhaserRuntimePatchDescriptorSchema>['applyStrategy'];
  revertStrategy?: z.infer<typeof PhaserRuntimePatchDescriptorSchema>['revertStrategy'];
  issues: PhaserRuntimeLoaderIssue[];
};

export type PhaserRuntimeCapabilityActionRequest = {
  systemId: string;
  capabilityId: string;
  action: string;
  input: DeclarativeJsonValue;
};

export type PhaserRuntimeCapabilityActionBlockedReason =
  | 'module_not_in_plan'
  | 'module_missing'
  | 'module_identity_mismatch'
  | 'module_not_installed'
  | 'capability_mismatch'
  | 'action_unavailable'
  | 'action_blocked'
  | 'action_threw'
  | 'invalid_action_result';

export type PhaserRuntimeCapabilityActionResult =
  | {
      status: 'observed';
      systemId: string;
      capabilityId: string;
      action: string;
      runtimeState: DeclarativeJsonObject;
      result: DeclarativeJsonObject;
    }
  | {
      status: 'blocked';
      reason: PhaserRuntimeCapabilityActionBlockedReason;
      systemId: string;
      capabilityId: string;
      action: string;
      runtimeState?: DeclarativeJsonObject;
      result?: DeclarativeJsonObject;
    };

export type PhaserRuntimeSystemModule<TConfig = DeclarativeJsonObject> = {
  id: string;
  install?: (context: { systemId: string }, config: TConfig) => void | Promise<void>;
  start?: (context: { systemId: string }) => void | Promise<void>;
  update?: (context: { systemId: string }, deltaMs: number) => void;
  applyPatch?: (patch: RuntimeCapabilityPatch) => RuntimePatchAcknowledgement;
  snapshot?: () => DeclarativeJsonObject;
  dispose?: () => void | Promise<void>;
};

export function buildPhaserRuntimeSystemLoaderPlan(input: {
  gameIr: CapabilityDrivenGameIr | unknown;
  manifest: PhaserRuntimeSystemManifest | unknown;
  capabilityLock: PhaserRuntimeCapabilityLock | unknown;
}): PhaserRuntimeLoaderReport {
  const ir = CapabilityDrivenGameIrRuntimeSliceSchema.safeParse(input.gameIr);
  const manifest = PhaserRuntimeSystemManifestSchema.safeParse(input.manifest);
  const lock = PhaserRuntimeCapabilityLockSchema.safeParse(input.capabilityLock);
  const issues: PhaserRuntimeLoaderIssue[] = [
    ...zodIssues('RUNTIME_IR_INVALID', ir),
    ...zodIssues('RUNTIME_MANIFEST_INVALID', manifest),
    ...zodIssues('RUNTIME_CAPABILITY_LOCK_INVALID', lock)
  ];

  if (!ir.success || !manifest.success || !lock.success) {
    return invalidLoaderReport(issues);
  }

  if (manifest.data.compatibilityMode.selection === 'legacy_template') {
    issues.push({
      code: 'RUNTIME_COMPATIBILITY_MODE_LEGACY',
      path: 'manifest.compatibilityMode.selection',
      message: 'Modular runtime loader requires explicit universal_composition mode; legacy_template cannot be used as an implicit fallback.'
    });
  }

  if (ir.data.capabilityLockRef !== lock.data.ref) {
    issues.push({
      code: 'RUNTIME_CAPABILITY_LOCK_MISMATCH',
      path: 'capabilityLock.ref',
      message: `IR capability lock ref ${ir.data.capabilityLockRef} does not match provided lock ref ${lock.data.ref}.`
    });
  }

  const manifestModuleMap = new Map<string, PhaserRuntimeSystemModuleDescriptor>();
  for (const system of manifest.data.systems) {
    if (manifestModuleMap.has(system.id)) {
      issues.push({
        code: 'RUNTIME_MODULE_DUPLICATE',
        path: `manifest.systems.${system.id}`,
        systemId: system.id,
        capabilityId: system.capabilityId,
        message: `Runtime module ${system.id} is declared more than once.`
      });
    }
    if (system.authoritativeConfig === 'template_default') {
      issues.push({
        code: 'RUNTIME_MODULE_DEFAULT_ENTITY_FORBIDDEN',
        path: `manifest.systems.${system.id}.authoritativeConfig`,
        systemId: system.id,
        capabilityId: system.capabilityId,
        message: `Runtime module ${system.id} cannot create template-default gameplay objects on the universal path.`
      });
    }
    manifestModuleMap.set(system.id, system);
  }

  const runtimeConfigMap = new Map<string, PhaserRuntimeSystemConfig>();
  for (const config of ir.data.runtimeSystemConfigs) {
    if (runtimeConfigMap.has(config.id)) {
      issues.push({
        code: 'RUNTIME_SYSTEM_CONFIG_DUPLICATE',
        path: `gameIr.runtimeSystemConfigs.${config.id}`,
        systemId: config.id,
        capabilityId: config.capabilityId,
        message: `Runtime system config ${config.id} is emitted more than once.`
      });
    }
    if (!lock.data.capabilityIds.includes(config.capabilityId)) {
      issues.push({
        code: 'RUNTIME_CAPABILITY_LOCK_MISSING',
        path: `gameIr.runtimeSystemConfigs.${config.id}.capabilityId`,
        systemId: config.id,
        capabilityId: config.capabilityId,
        message: `Runtime config ${config.id} uses ${config.capabilityId}, which is not present in the capability lock.`
      });
    }
    runtimeConfigMap.set(config.id, config);
  }

  const requestedModules: Array<{ descriptor: PhaserRuntimeSystemModuleDescriptor; config: PhaserRuntimeSystemConfig }> = [];
  for (const config of runtimeConfigMap.values()) {
    const descriptor = manifestModuleMap.get(config.id);
    if (descriptor === undefined) {
      issues.push({
        code: 'RUNTIME_MODULE_MISSING',
        path: `manifest.systems.${config.id}`,
        systemId: config.id,
        capabilityId: config.capabilityId,
        message: `Runtime system ${config.id} has no available module descriptor.`
      });
      continue;
    }
    if (descriptor.capabilityId !== config.capabilityId) {
      issues.push({
        code: 'RUNTIME_MODULE_CAPABILITY_MISMATCH',
        path: `manifest.systems.${config.id}.capabilityId`,
        systemId: config.id,
        capabilityId: config.capabilityId,
        message: `Runtime system ${config.id} is configured by ${config.capabilityId}, but module descriptor is owned by ${descriptor.capabilityId}.`
      });
      continue;
    }
    requestedModules.push({ descriptor, config });
  }

  const requestedIds = new Set(requestedModules.map((entry) => entry.descriptor.id));
  for (const entry of requestedModules) {
    for (const dependencyId of entry.descriptor.dependencies) {
      if (!requestedIds.has(dependencyId)) {
        issues.push({
          code: 'RUNTIME_MODULE_DEPENDENCY_MISSING',
          path: `manifest.systems.${entry.descriptor.id}.dependencies.${dependencyId}`,
          systemId: entry.descriptor.id,
          capabilityId: entry.descriptor.capabilityId,
          message: `Runtime system ${entry.descriptor.id} requires ${dependencyId}, but the dependency is not present in IR runtimeSystemConfigs.`
        });
      }
    }
  }

  const loadOrder = sortRuntimeModules(requestedModules);
  issues.push(...loadOrder.issues);
  if (issues.length > 0) {
    return invalidLoaderReport(issues, ir.data, lock.data);
  }

  const plan = buildLoaderPlan({
    runtimeFamily: ir.data.runtimeFamily,
    profileId: ir.data.profileId,
    capabilityLockRef: lock.data.ref,
    capabilityLockHash: lock.data.hash,
    compatibilityMode: manifest.data.compatibilityMode,
    loadOrder: loadOrder.entries
  });
  const bindingReport = buildBindingReportFromPlan(plan);

  return {
    artifactKind: PHASER_RUNTIME_LOADER_REPORT_KIND,
    schemaVersion: PHASER_RUNTIME_LOADER_REPORT_SCHEMA_VERSION,
    status: 'ready',
    runtimeFamily: ir.data.runtimeFamily,
    profileId: ir.data.profileId,
    capabilityLockRef: lock.data.ref,
    capabilityLockHash: lock.data.hash,
    planHash: plan.planHash,
    bindingReportHash: bindingReport.reportHash,
    plan,
    bindingReport,
    issues: []
  };
}

export function acknowledgePhaserRuntimePatch(input: {
  manifest: PhaserRuntimeSystemManifest | unknown;
  patch: RuntimeCapabilityPatch;
}): RuntimePatchAcknowledgement {
  const manifest = PhaserRuntimeSystemManifestSchema.safeParse(input.manifest);
  if (!manifest.success) {
    return {
      status: 'rejected',
      systemId: input.patch.systemId,
      property: input.patch.property,
      issues: zodIssues('RUNTIME_MANIFEST_INVALID', manifest)
    };
  }

  const moduleDescriptor = manifest.data.systems.find((system) => system.id === input.patch.systemId);
  if (moduleDescriptor?.patch === undefined) {
    return {
      status: 'rejected',
      systemId: input.patch.systemId,
      property: input.patch.property,
      issues: [
        {
          code: 'RUNTIME_PATCH_DESCRIPTOR_MISSING',
          path: `manifest.systems.${input.patch.systemId}.patch`,
          systemId: input.patch.systemId,
          message: `Runtime system ${input.patch.systemId} does not declare a hot patch descriptor.`
        }
      ]
    };
  }

  if (!moduleDescriptor.patch.patchableProperties.includes(input.patch.property)) {
    return {
      status: 'rejected',
      systemId: input.patch.systemId,
      property: input.patch.property,
      issues: [
        {
          code: 'RUNTIME_PATCH_PROPERTY_UNSUPPORTED',
          path: `manifest.systems.${input.patch.systemId}.patch.patchableProperties`,
          systemId: input.patch.systemId,
          capabilityId: moduleDescriptor.capabilityId,
          message: `Runtime system ${input.patch.systemId} does not support hot patch property ${input.patch.property}.`
        }
      ]
    };
  }

  return {
    status: 'accepted',
    systemId: input.patch.systemId,
    property: input.patch.property,
    verificationEvent: moduleDescriptor.patch.verificationEvent,
    snapshotStrategy: moduleDescriptor.patch.snapshotStrategy,
    applyStrategy: moduleDescriptor.patch.applyStrategy,
    revertStrategy: moduleDescriptor.patch.revertStrategy,
    issues: []
  };
}

export function observePhaserRuntimeBindingReport(input: {
  bindingReport: CapabilityRuntimeBindingReport;
  observedModuleIds: readonly string[];
  qaProbeId: string;
}): { report: CapabilityRuntimeBindingReport; issues: PhaserRuntimeLoaderIssue[] } {
  const observed = new Set(input.observedModuleIds);
  const missingIssues = input.bindingReport.modules
    .filter((module) => !observed.has(module.systemId))
    .map((module): PhaserRuntimeLoaderIssue => ({
      code: 'RUNTIME_BINDING_OBSERVATION_MISSING',
      path: `bindingReport.modules.${module.systemId}`,
      systemId: module.systemId,
      capabilityId: module.capabilityId,
      message: `QA probe ${input.qaProbeId} did not observe runtime module ${module.systemId}.`
    }));
  const undeclaredIssues = input.bindingReport.modules
    .filter((module) => observed.has(module.systemId) && !module.qaProbeIds.includes(input.qaProbeId))
    .map((module): PhaserRuntimeLoaderIssue => ({
      code: 'RUNTIME_BINDING_OBSERVATION_UNDECLARED',
      path: `bindingReport.modules.${module.systemId}.qaProbeIds`,
      systemId: module.systemId,
      capabilityId: module.capabilityId,
      message: `QA probe ${input.qaProbeId} is not declared for runtime module ${module.systemId}.`
    }));
  const issues = [...missingIssues, ...undeclaredIssues];

  const modules = input.bindingReport.modules.map((module) => ({
    ...module,
    status: observed.has(module.systemId) && issues.length === 0 ? ('qa_observed' as const) : ('bound_pending_qa' as const)
  }));
  const status = issues.length === 0 ? 'qa_observed' : 'bound_pending_qa';
  const payload: Omit<CapabilityRuntimeBindingReport, 'reportHash'> = {
    artifactKind: CAPABILITY_RUNTIME_BINDING_REPORT_KIND,
    schemaVersion: CAPABILITY_RUNTIME_BINDING_REPORT_SCHEMA_VERSION,
    runtimeFamily: input.bindingReport.runtimeFamily,
    profileId: input.bindingReport.profileId,
    capabilityLockRef: input.bindingReport.capabilityLockRef,
    capabilityLockHash: input.bindingReport.capabilityLockHash,
    status,
    modules,
    ...(status === 'qa_observed' ? { observedByQaProbeId: input.qaProbeId } : {})
  };
  return { report: { ...payload, reportHash: hashStableJson(payload) }, issues };
}

export function createPhaserRuntimeModuleSession(input: {
  plan: PhaserRuntimeLoaderPlan;
  modules: Record<string, PhaserRuntimeSystemModule>;
}): {
  installAll: () => Promise<void>;
  startAll: () => Promise<void>;
  update: (deltaMs: number) => void;
  dispatchCapabilityAction: (request: PhaserRuntimeCapabilityActionRequest) => PhaserRuntimeCapabilityActionResult;
  snapshot: () => Record<string, DeclarativeJsonObject>;
  dispose: () => Promise<void>;
} {
  const installed = new Set<string>();
  const started = new Set<string>();
  const planEntryById = new Map(input.plan.loadOrder.map((entry) => [entry.systemId, entry]));
  let installCompleted = false;
  let disposed = false;

  return {
    async installAll() {
      assertSessionOpen(disposed);
      for (const entry of input.plan.loadOrder) {
        if (installed.has(entry.systemId)) {
          continue;
        }
        const module = requiredModule(input.modules, entry.systemId);
        await module.install?.({ systemId: entry.systemId }, entry.config);
        installed.add(entry.systemId);
      }
      installCompleted = true;
    },
    async startAll() {
      assertSessionOpen(disposed);
      for (const entry of input.plan.loadOrder) {
        if (started.has(entry.systemId)) {
          continue;
        }
        const module = requiredModule(input.modules, entry.systemId);
        await module.start?.({ systemId: entry.systemId });
        started.add(entry.systemId);
      }
    },
    update(deltaMs: number) {
      assertSessionOpen(disposed);
      for (const systemId of input.plan.updateLoopSystemIds) {
        requiredModule(input.modules, systemId).update?.({ systemId }, deltaMs);
      }
    },
    dispatchCapabilityAction(request) {
      assertSessionOpen(disposed);
      const entry = planEntryById.get(request.systemId);
      if (entry === undefined) {
        return blockedCapabilityAction(request, 'module_not_in_plan');
      }
      if (entry.capabilityId !== request.capabilityId) {
        return blockedCapabilityAction(request, 'capability_mismatch');
      }

      const module = input.modules[request.systemId];
      if (module === undefined) {
        return blockedCapabilityAction(request, 'module_missing');
      }
      if (module.id !== request.systemId) {
        return blockedCapabilityAction(request, 'module_identity_mismatch');
      }
      if (!installCompleted || !installed.has(request.systemId)) {
        return blockedCapabilityAction(request, 'module_not_installed');
      }

      const runtimeState = module.snapshot?.() ?? {};
      if (!isSupportedCapabilityActionRequest(request)) {
        return blockedCapabilityAction(request, 'action_unavailable', { runtimeState });
      }

      const action = readRuntimeModuleAction(module, request.action);
      if (action === undefined) {
        return blockedCapabilityAction(request, 'action_unavailable', { runtimeState });
      }

      let rawResult: unknown;
      try {
        rawResult = action(request.input);
      } catch {
        return blockedCapabilityAction(request, 'action_threw', { runtimeState });
      }

      const result = DeclarativeJsonObjectSchema.safeParse(rawResult);
      if (!result.success) {
        return blockedCapabilityAction(request, 'invalid_action_result', { runtimeState });
      }
      if (!isValidCapabilityActionResult(request, runtimeState, result.data)) {
        return blockedCapabilityAction(request, 'invalid_action_result', { runtimeState });
      }
      if (result.data.status === 'blocked') {
        return blockedCapabilityAction(request, 'action_blocked', { runtimeState, result: result.data });
      }

      return {
        status: 'observed',
        systemId: request.systemId,
        capabilityId: request.capabilityId,
        action: request.action,
        runtimeState,
        result: result.data
      };
    },
    snapshot() {
      assertSessionOpen(disposed);
      return Object.fromEntries(
        input.plan.loadOrder.map((entry) => [entry.systemId, requiredModule(input.modules, entry.systemId).snapshot?.() ?? {}])
      );
    },
    async dispose() {
      if (disposed) {
        return;
      }
      for (const entry of [...input.plan.loadOrder].reverse()) {
        await requiredModule(input.modules, entry.systemId).dispose?.();
      }
      installed.clear();
      started.clear();
      installCompleted = false;
      disposed = true;
    }
  };
}

function buildLoaderPlan(input: {
  runtimeFamily: typeof PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY;
  profileId: string;
  capabilityLockRef: string;
  capabilityLockHash: string;
  compatibilityMode: z.infer<typeof PhaserRuntimeCompatibilityModeSchema>;
  loadOrder: Array<{ descriptor: PhaserRuntimeSystemModuleDescriptor; config: PhaserRuntimeSystemConfig }>;
}): PhaserRuntimeLoaderPlan {
  const payload: Omit<PhaserRuntimeLoaderPlan, 'planHash'> = {
    artifactKind: PHASER_RUNTIME_LOADER_PLAN_KIND,
    schemaVersion: PHASER_RUNTIME_LOADER_PLAN_SCHEMA_VERSION,
    runtimeFamily: input.runtimeFamily,
    profileId: input.profileId,
    capabilityLockRef: input.capabilityLockRef,
    capabilityLockHash: input.capabilityLockHash,
    compatibilityMode: input.compatibilityMode,
    loadOrder: input.loadOrder.map(({ descriptor, config }) => ({
      systemId: descriptor.id,
      capabilityId: descriptor.capabilityId,
      version: descriptor.version,
      phase: descriptor.phase,
      dependencies: [...descriptor.dependencies].sort(),
      services: [...descriptor.services].sort(),
      config: config.config,
      configHash: hashStableJson(config.config),
      patchableProperties: [...(descriptor.patch?.patchableProperties ?? [])].sort(),
      qaProbeIds: [...descriptor.qaProbeIds].sort()
    })),
    updateLoopSystemIds: input.loadOrder
      .filter(({ descriptor }) => descriptor.phase !== 'bootstrap')
      .map(({ descriptor }) => descriptor.id)
  };
  return { ...payload, planHash: hashStableJson(payload) };
}

function buildBindingReportFromPlan(plan: PhaserRuntimeLoaderPlan): CapabilityRuntimeBindingReport {
  const payload: Omit<CapabilityRuntimeBindingReport, 'reportHash'> = {
    artifactKind: CAPABILITY_RUNTIME_BINDING_REPORT_KIND,
    schemaVersion: CAPABILITY_RUNTIME_BINDING_REPORT_SCHEMA_VERSION,
    runtimeFamily: plan.runtimeFamily,
    profileId: plan.profileId,
    capabilityLockRef: plan.capabilityLockRef,
    capabilityLockHash: plan.capabilityLockHash,
    status: 'bound_pending_qa',
    modules: plan.loadOrder.map((entry) => ({
      systemId: entry.systemId,
      capabilityId: entry.capabilityId,
      phase: entry.phase,
      status: 'bound_pending_qa',
      configHash: entry.configHash,
      patchableProperties: entry.patchableProperties,
      qaProbeIds: entry.qaProbeIds
    }))
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function sortRuntimeModules(
  modules: Array<{ descriptor: PhaserRuntimeSystemModuleDescriptor; config: PhaserRuntimeSystemConfig }>
): {
  entries: Array<{ descriptor: PhaserRuntimeSystemModuleDescriptor; config: PhaserRuntimeSystemConfig }>;
  issues: PhaserRuntimeLoaderIssue[];
} {
  const moduleById = new Map(modules.map((entry) => [entry.descriptor.id, entry]));
  const remainingIds = new Set(moduleById.keys());
  const entries: Array<{ descriptor: PhaserRuntimeSystemModuleDescriptor; config: PhaserRuntimeSystemConfig }> = [];

  while (remainingIds.size > 0) {
    const ready = [...remainingIds]
      .map((id) => moduleById.get(id))
      .filter((entry): entry is { descriptor: PhaserRuntimeSystemModuleDescriptor; config: PhaserRuntimeSystemConfig } => entry !== undefined)
      .filter((entry) => entry.descriptor.dependencies.every((dependencyId) => !remainingIds.has(dependencyId)))
      .sort(compareRuntimeModuleEntries);

    if (ready.length === 0) {
      return {
        entries: [],
        issues: [...remainingIds].sort().map((systemId) => {
          const entry = moduleById.get(systemId);
          return {
            code: 'RUNTIME_MODULE_CYCLE',
            path: `manifest.systems.${systemId}.dependencies`,
            systemId,
            capabilityId: entry?.descriptor.capabilityId,
            message: `Runtime system ${systemId} is part of an unresolved dependency cycle.`
          };
        })
      };
    }

    for (const entry of ready) {
      entries.push(entry);
      remainingIds.delete(entry.descriptor.id);
    }
  }

  return { entries, issues: [] };
}

function compareRuntimeModuleEntries(
  left: { descriptor: PhaserRuntimeSystemModuleDescriptor },
  right: { descriptor: PhaserRuntimeSystemModuleDescriptor }
): number {
  const phaseDelta = PHASER_RUNTIME_PHASES.indexOf(left.descriptor.phase) - PHASER_RUNTIME_PHASES.indexOf(right.descriptor.phase);
  if (phaseDelta !== 0) {
    return phaseDelta;
  }
  return left.descriptor.id.localeCompare(right.descriptor.id);
}

function invalidLoaderReport(
  issues: PhaserRuntimeLoaderIssue[],
  ir?: z.infer<typeof CapabilityDrivenGameIrRuntimeSliceSchema>,
  lock?: PhaserRuntimeCapabilityLock
): PhaserRuntimeLoaderReport {
  return {
    artifactKind: PHASER_RUNTIME_LOADER_REPORT_KIND,
    schemaVersion: PHASER_RUNTIME_LOADER_REPORT_SCHEMA_VERSION,
    status: 'invalid',
    runtimeFamily: ir?.runtimeFamily,
    profileId: ir?.profileId,
    capabilityLockRef: lock?.ref,
    capabilityLockHash: lock?.hash,
    issues
  };
}

function zodIssues(
  code: PhaserRuntimeLoaderIssue['code'],
  result: { success: true } | { success: false; error: z.ZodError }
): PhaserRuntimeLoaderIssue[] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => ({
    code,
    path: issue.path.map(String).join('.') || '<root>',
    message: issue.message
  }));
}

function requiredModule(modules: Record<string, PhaserRuntimeSystemModule>, systemId: string): PhaserRuntimeSystemModule {
  const module = modules[systemId];
  if (module === undefined) {
    throw new Error(`Runtime module ${systemId} is missing from the active session.`);
  }
  return module;
}

function readRuntimeModuleAction(
  module: PhaserRuntimeSystemModule,
  action: string
): ((input: DeclarativeJsonValue) => unknown) | undefined {
  if (action !== 'fire') {
    return undefined;
  }
  const candidate = (module as PhaserRuntimeSystemModule & Record<string, unknown>)[action];
  return typeof candidate === 'function' ? (candidate as (input: DeclarativeJsonValue) => unknown) : undefined;
}

function isSupportedCapabilityActionRequest(request: PhaserRuntimeCapabilityActionRequest): boolean {
  return (
    request.systemId === DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID &&
    request.capabilityId === DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID &&
    request.action === 'fire'
  );
}

function isValidCapabilityActionResult(
  request: PhaserRuntimeCapabilityActionRequest,
  runtimeState: DeclarativeJsonObject,
  result: DeclarativeJsonObject
): boolean {
  if (isSupportedCapabilityActionRequest(request)) {
    return isDefaultStraightSingleWeaponRuntimeState(runtimeState) && isDefaultStraightSingleWeaponFireResult(result);
  }

  return false;
}

function blockedCapabilityAction(
  request: PhaserRuntimeCapabilityActionRequest,
  reason: PhaserRuntimeCapabilityActionBlockedReason,
  details: { runtimeState?: DeclarativeJsonObject; result?: DeclarativeJsonObject } = {}
): PhaserRuntimeCapabilityActionResult {
  return {
    status: 'blocked',
    reason,
    systemId: request.systemId,
    capabilityId: request.capabilityId,
    action: request.action,
    ...details
  };
}

function assertSessionOpen(disposed: boolean): void {
  if (disposed) {
    throw new Error('Runtime module session is already disposed.');
  }
}
