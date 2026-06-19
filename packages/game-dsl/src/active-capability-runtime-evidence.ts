import { z } from 'zod';

import {
  CapabilityRuntimePlanSchema,
  type CapabilityRuntimePlan
} from './canonical-capability-runtime-compiler.js';
import { DeclarativeJsonObjectSchema, type DeclarativeJsonValue } from './gameplay-capabilities/declarative-json.js';
import { GameplayCapabilityLockSchema, type GameplayCapabilityLock } from './gameplay-capabilities/capability-lock.js';
import type { CapabilityQaReport, CapabilityRuntimeQaPlan } from './gameplay-capabilities/capability-qa-probes.js';
import {
  PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
  PhaserRuntimeSystemManifestSchema,
  type PhaserRuntimeLoaderPlan,
  type PhaserRuntimeSystemManifest
} from './gameplay-capabilities/phaser-runtime-loader.js';
import { GameplayCapabilityIdSchema } from './gameplay-capabilities/registry.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { GenerationPathReceiptSchema, type GenerationPathReceipt } from './generation-path-receipt.js';

export const RUNTIME_MODULE_LOAD_RECEIPT_KIND = 'runtime_module_load_receipt';
export const RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION = 'runtime_module_load_receipt.v0.1';
export const CAPABILITY_OWNED_TELEMETRY_EVIDENCE_KIND = 'capability_owned_telemetry_evidence';
export const CAPABILITY_OWNED_TELEMETRY_EVIDENCE_SCHEMA_VERSION = 'capability_owned_telemetry_evidence.v0.1';
export const CAPABILITY_PATH_BUILD_REPORT_KIND = 'capability_path_build_report';
export const CAPABILITY_PATH_BUILD_REPORT_SCHEMA_VERSION = 'capability_path_build_report.v0.1';
export const ACTIVE_CAPABILITY_COMPOSED_GAMEPLAY_REALIZATION_REPORT_KIND = 'active_capability_composed_gameplay_realization_report';
export const ACTIVE_CAPABILITY_COMPOSED_GAMEPLAY_REALIZATION_REPORT_SCHEMA_VERSION =
  'active_capability_composed_gameplay_realization_report.v0.1';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);
const HashLikeSchema = z.string().min(1);
const RuntimeSystemIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{2,160}$/);
const RuntimeVersionSchema = z.string().regex(/^v[1-9][0-9]*$/);
const ActiveIdentitySchema = z.strictObject({
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  selectedPath: z.literal('capability_composed_v1'),
  executionMode: z.literal('active'),
  profileId: z.string().min(1),
  runtimeFamily: z.literal(PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY),
  capabilityLockHash: HashLikeSchema,
  runtimeManifestHash: HashLikeSchema,
  runtimePlanHash: HashLikeSchema,
  loaderPlanHash: HashLikeSchema
});

const RuntimeModuleLoadEntrySchema = z.strictObject({
  order: z.number().int().min(0),
  systemId: RuntimeSystemIdSchema,
  capabilityId: GameplayCapabilityIdSchema,
  packageVersion: z.string().min(1),
  packageHash: HashLikeSchema,
  version: RuntimeVersionSchema,
  phase: z.enum(['bootstrap', 'scene', 'physics', 'input', 'gameplay', 'feedback', 'ui', 'telemetry'])
});

export const RuntimeModuleLifecycleEventSchema = z.strictObject({
  order: z.number().int().min(0),
  phase: z.enum(['install', 'start', 'update', 'dispose']),
  systemId: RuntimeSystemIdSchema,
  capabilityId: GameplayCapabilityIdSchema,
  version: RuntimeVersionSchema,
  deltaMs: z.number().int().positive().optional()
});

export const RuntimeModuleLoadReceiptSchema = z
  .strictObject({
    artifactKind: z.literal(RUNTIME_MODULE_LOAD_RECEIPT_KIND),
    schemaVersion: z.literal(RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION),
    identity: ActiveIdentitySchema,
    status: z.enum(['loaded', 'failed']),
    loadOrder: z.array(RuntimeModuleLoadEntrySchema).min(1).max(240),
    lifecycleEvents: z.array(RuntimeModuleLifecycleEventSchema).min(1).max(1200),
    issues: z.array(z.string().min(1)),
    receiptHash: HashLikeSchema
  })
  .superRefine((receipt, ctx) => {
    if (receipt.status === 'loaded' && receipt.issues.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['issues'], message: 'loaded runtime receipts must not contain issues.' });
    }
    if (receipt.status === 'failed' && receipt.issues.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['issues'], message: 'failed runtime receipts must include at least one issue.' });
    }
    if (receipt.receiptHash !== hashRuntimeModuleLoadReceiptPayload(receipt)) {
      ctx.addIssue({ code: 'custom', path: ['receiptHash'], message: 'receiptHash must match the deterministic runtime module load receipt payload.' });
    }
    for (const invariant of runtimeLoadReceiptSchemaInvariants(receipt)) {
      ctx.addIssue({ code: 'custom', path: ['lifecycleEvents'], message: invariant });
    }
  });

export const CapabilityOwnedTelemetryEvidenceSchema = z
  .strictObject({
    artifactKind: z.literal(CAPABILITY_OWNED_TELEMETRY_EVIDENCE_KIND),
    schemaVersion: z.literal(CAPABILITY_OWNED_TELEMETRY_EVIDENCE_SCHEMA_VERSION),
    identity: ActiveIdentitySchema,
    status: z.enum(['observed', 'blocked']),
    eventType: z.literal('enemy.fired'),
    eventCount: z.number().int().min(0),
    producer: z.strictObject({
      source: z.literal('runtime_module'),
      systemId: RuntimeSystemIdSchema,
      capabilityId: GameplayCapabilityIdSchema,
      version: RuntimeVersionSchema
    }),
    trigger: z.strictObject({
      kind: z.literal('runtime_update_loop'),
      lifecycleEventOrder: z.number().int().min(0)
    }),
    entity: z.strictObject({
      entityId: z.string().min(1),
      role: z.literal('enemy')
    }),
    payload: DeclarativeJsonObjectSchema,
    payloadHash: HashLikeSchema,
    moduleLoadReceiptHash: HashLikeSchema,
    issues: z.array(z.string().min(1)),
    evidenceHash: HashLikeSchema
  })
  .superRefine((evidence, ctx) => {
    if (evidence.status === 'observed' && evidence.issues.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['issues'], message: 'observed telemetry evidence must not contain issues.' });
    }
    if (evidence.status === 'blocked' && evidence.issues.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['issues'], message: 'blocked telemetry evidence must include at least one issue.' });
    }
    if (evidence.eventCount <= 0 && evidence.status === 'observed') {
      ctx.addIssue({ code: 'custom', path: ['eventCount'], message: 'observed telemetry evidence must include at least one event.' });
    }
    if (evidence.payloadHash !== hashStableJson(evidence.payload)) {
      ctx.addIssue({ code: 'custom', path: ['payloadHash'], message: 'payloadHash must match the telemetry payload.' });
    }
    if (evidence.evidenceHash !== hashCapabilityOwnedTelemetryEvidencePayload(evidence)) {
      ctx.addIssue({ code: 'custom', path: ['evidenceHash'], message: 'evidenceHash must match the deterministic telemetry evidence payload.' });
    }
  });

export const CapabilityPathBuildReportSchema = z
  .strictObject({
    artifactKind: z.literal(CAPABILITY_PATH_BUILD_REPORT_KIND),
    schemaVersion: z.literal(CAPABILITY_PATH_BUILD_REPORT_SCHEMA_VERSION),
    identity: ActiveIdentitySchema,
    status: z.enum(['passed', 'failed']),
    command: z.string().min(1),
    exitCode: z.number().int().min(0),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    reportHash: HashLikeSchema
  })
  .superRefine((report, ctx) => {
    if (report.status === 'passed' && report.exitCode !== 0) {
      ctx.addIssue({ code: 'custom', path: ['exitCode'], message: 'passed build reports must have exitCode 0.' });
    }
    if (report.status === 'failed' && report.exitCode === 0) {
      ctx.addIssue({ code: 'custom', path: ['exitCode'], message: 'failed build reports must have a non-zero exitCode.' });
    }
    if (report.reportHash !== hashCapabilityPathBuildReportPayload(report)) {
      ctx.addIssue({ code: 'custom', path: ['reportHash'], message: 'reportHash must match the deterministic build report payload.' });
    }
  });

export const ActiveCapabilityComposedGameplayRealizationReportSchema = z
  .strictObject({
    artifactKind: z.literal(ACTIVE_CAPABILITY_COMPOSED_GAMEPLAY_REALIZATION_REPORT_KIND),
    schemaVersion: z.literal(ACTIVE_CAPABILITY_COMPOSED_GAMEPLAY_REALIZATION_REPORT_SCHEMA_VERSION),
    identity: ActiveIdentitySchema,
    status: z.enum(['passed', 'blocked']),
    generationPathReceiptHash: HashLikeSchema,
    exactCapabilityLockHash: HashLikeSchema,
    runtimeManifestHash: HashLikeSchema,
    runtimePlanHash: HashLikeSchema,
    runtimeModuleLoadReceiptHash: HashLikeSchema,
    enemyFiredEvidenceHash: HashLikeSchema,
    capabilityQaPlanHash: HashLikeSchema,
    capabilityQaReportHash: HashLikeSchema,
    buildReportHash: HashLikeSchema,
    loadedSystemIds: z.array(RuntimeSystemIdSchema).min(1),
    lockedPackageRefs: z.array(
      z.strictObject({
        capabilityId: GameplayCapabilityIdSchema,
        packageVersion: z.string().min(1),
        packageHash: HashLikeSchema
      })
    ).min(1),
    enemyFired: z.strictObject({
      eventCount: z.number().int().min(0),
      producerSystemId: RuntimeSystemIdSchema,
      producerCapabilityId: GameplayCapabilityIdSchema,
      enemyEntityId: z.string().min(1)
    }),
    capabilityQa: z.strictObject({
      status: z.enum(['passed', 'failed', 'passed_with_optional_failures']),
      boundTelemetryEvidenceHash: HashLikeSchema.optional(),
      requiredProbeIds: z.array(RuntimeSystemIdSchema)
    }),
    build: z.strictObject({
      status: z.enum(['passed', 'failed']),
      command: z.string().min(1)
    }),
    evidenceRefs: z.array(
      z.strictObject({
        artifactKind: z.string().min(1),
        hash: HashLikeSchema
      })
    ).min(1),
    blockers: z.array(z.string().min(1)),
    reportHash: HashLikeSchema
  })
  .superRefine((report, ctx) => {
    if (report.status === 'passed' && report.blockers.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['blockers'], message: 'passed realization reports must not contain blockers.' });
    }
    if (report.status === 'blocked' && report.blockers.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['blockers'], message: 'blocked realization reports must include at least one blocker.' });
    }
    if (report.reportHash !== hashActiveCapabilityComposedGameplayRealizationReportPayload(report)) {
      ctx.addIssue({
        code: 'custom',
        path: ['reportHash'],
        message: 'reportHash must match the deterministic active capability-composed gameplay realization report payload.'
      });
    }
    if (report.status === 'passed') {
      if (report.enemyFired.eventCount <= 0) {
        ctx.addIssue({ code: 'custom', path: ['enemyFired', 'eventCount'], message: 'passed reports must include at least one enemy.fired event.' });
      }
      if (report.capabilityQa.status !== 'passed') {
        ctx.addIssue({ code: 'custom', path: ['capabilityQa', 'status'], message: 'passed reports require capability QA to pass.' });
      }
      if (report.capabilityQa.boundTelemetryEvidenceHash === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['capabilityQa', 'boundTelemetryEvidenceHash'],
          message: 'passed reports must bind capability QA to telemetry evidence.'
        });
      }
      if (report.build.status !== 'passed') {
        ctx.addIssue({ code: 'custom', path: ['build', 'status'], message: 'passed reports require capability path build to pass.' });
      }
      for (const artifactKind of requiredActiveEvidenceKinds()) {
        if (!report.evidenceRefs.some((ref) => ref.artifactKind === artifactKind)) {
          ctx.addIssue({ code: 'custom', path: ['evidenceRefs'], message: `passed reports must include ${artifactKind} evidence.` });
        }
      }
      for (const evidenceRefIssue of activeEvidenceRefHashIssues(report)) {
        ctx.addIssue({ code: 'custom', path: ['evidenceRefs'], message: evidenceRefIssue });
      }
    }
  });

export type RuntimeModuleLifecycleEvent = z.infer<typeof RuntimeModuleLifecycleEventSchema>;
export type RuntimeModuleLoadReceipt = z.infer<typeof RuntimeModuleLoadReceiptSchema>;
export type CapabilityOwnedTelemetryEvidence = z.infer<typeof CapabilityOwnedTelemetryEvidenceSchema>;
export type CapabilityPathBuildReport = z.infer<typeof CapabilityPathBuildReportSchema>;
export type ActiveCapabilityComposedGameplayRealizationReport = z.infer<typeof ActiveCapabilityComposedGameplayRealizationReportSchema>;

export function buildRuntimeModuleLoadReceipt(input: {
  projectId: string;
  runId: string;
  profileId: string;
  capabilityLock: GameplayCapabilityLock;
  runtimeManifest: PhaserRuntimeSystemManifest;
  runtimePlan: CapabilityRuntimePlan;
  loaderPlan: PhaserRuntimeLoaderPlan;
  lifecycleEvents: readonly { phase: RuntimeModuleLifecycleEvent['phase']; systemId: string; deltaMs?: number }[];
}): RuntimeModuleLoadReceipt {
  const identity = buildActiveIdentity({
    projectId: input.projectId,
    runId: input.runId,
    profileId: input.profileId,
    capabilityLockHash: input.capabilityLock.lockHash,
    runtimeManifest: input.runtimeManifest,
    runtimePlan: input.runtimePlan,
    loaderPlan: input.loaderPlan
  });
  const descriptorById = new Map(input.runtimeManifest.systems.map((system) => [system.id, system]));
  const lockedPackageByCapabilityId = new Map(input.capabilityLock.packages.map((pkg) => [pkg.capabilityId, pkg]));
  const loadOrder = input.loaderPlan.loadOrder.map((entry, order) => ({
    order,
    systemId: entry.systemId,
    capabilityId: entry.capabilityId,
    packageVersion: lockedPackageByCapabilityId.get(entry.capabilityId)?.packageVersion ?? '<missing>',
    packageHash: lockedPackageByCapabilityId.get(entry.capabilityId)?.packageHash ?? '<missing>',
    version: entry.version,
    phase: entry.phase
  }));
  const lifecycleEvents = input.lifecycleEvents.map((event, order) => {
    const descriptor = descriptorById.get(event.systemId);
    return {
      order,
      phase: event.phase,
      systemId: event.systemId,
      capabilityId: descriptor?.capabilityId ?? 'telemetry.gameplay_events.v1',
      version: descriptor?.version ?? 'v1',
      ...(event.deltaMs === undefined ? {} : { deltaMs: event.deltaMs })
    };
  });
  const issues = buildRuntimeModuleLoadIssues({ identity, loadOrder, lifecycleEvents, loaderPlan: input.loaderPlan, runtimeManifest: input.runtimeManifest });
  const payload: Omit<RuntimeModuleLoadReceipt, 'receiptHash'> = {
    artifactKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND,
    schemaVersion: RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
    identity,
    status: issues.length === 0 ? 'loaded' : 'failed',
    loadOrder,
    lifecycleEvents,
    issues
  };
  return RuntimeModuleLoadReceiptSchema.parse({ ...payload, receiptHash: hashStableJson(payload) });
}

export function buildCapabilityOwnedTelemetryEvidence(input: {
  projectId: string;
  runId: string;
  profileId: string;
  capabilityLock: GameplayCapabilityLock;
  runtimeManifest: PhaserRuntimeSystemManifest;
  runtimePlan: CapabilityRuntimePlan;
  loaderPlan: PhaserRuntimeLoaderPlan;
  moduleLoadReceipt: RuntimeModuleLoadReceipt;
  event: {
    type: 'enemy.fired';
    producerSystemId: string;
    enemyEntityId: string;
    payload: Record<string, DeclarativeJsonValue>;
  };
}): CapabilityOwnedTelemetryEvidence {
  const identity = buildActiveIdentity({
    projectId: input.projectId,
    runId: input.runId,
    profileId: input.profileId,
    capabilityLockHash: input.capabilityLock.lockHash,
    runtimeManifest: input.runtimeManifest,
    runtimePlan: input.runtimePlan,
    loaderPlan: input.loaderPlan
  });
  const loadedModule = input.moduleLoadReceipt.loadOrder.find((entry) => entry.systemId === input.event.producerSystemId);
  const updateEvent = input.moduleLoadReceipt.lifecycleEvents.find(
    (event) => event.systemId === input.event.producerSystemId && event.phase === 'update'
  );
  const payload = DeclarativeJsonObjectSchema.parse(input.event.payload);
  const issues = [
    ...identityBlockers('telemetry_identity', identity, input.moduleLoadReceipt.identity),
    ...(input.moduleLoadReceipt.status === 'loaded' ? [] : ['runtime_module_load_not_loaded']),
    ...(loadedModule === undefined ? [`telemetry_producer_not_loaded:${input.event.producerSystemId}`] : []),
    ...(updateEvent === undefined ? [`telemetry_trigger_not_reachable:${input.event.producerSystemId}`] : []),
    ...(input.capabilityLock.capabilityIds.includes(loadedModule?.capabilityId ?? '') ? [] : [`telemetry_producer_not_locked:${loadedModule?.capabilityId ?? '<missing>'}`]),
    ...(payload.enemyEntityId === input.event.enemyEntityId ? [] : ['telemetry_enemy_entity_mismatch'])
  ].sort();
  const payloadBase: Omit<CapabilityOwnedTelemetryEvidence, 'evidenceHash'> = {
    artifactKind: CAPABILITY_OWNED_TELEMETRY_EVIDENCE_KIND,
    schemaVersion: CAPABILITY_OWNED_TELEMETRY_EVIDENCE_SCHEMA_VERSION,
    identity,
    status: issues.length === 0 ? 'observed' : 'blocked',
    eventType: 'enemy.fired',
    eventCount: issues.length === 0 ? 1 : 0,
    producer: {
      source: 'runtime_module',
      systemId: input.event.producerSystemId,
      capabilityId: loadedModule?.capabilityId ?? 'telemetry.gameplay_events.v1',
      version: loadedModule?.version ?? 'v1'
    },
    trigger: {
      kind: 'runtime_update_loop',
      lifecycleEventOrder: updateEvent?.order ?? 0
    },
    entity: {
      entityId: input.event.enemyEntityId,
      role: 'enemy'
    },
    payload,
    payloadHash: hashStableJson(payload),
    moduleLoadReceiptHash: input.moduleLoadReceipt.receiptHash,
    issues
  };
  return CapabilityOwnedTelemetryEvidenceSchema.parse({ ...payloadBase, evidenceHash: hashStableJson(payloadBase) });
}

export function buildCapabilityPathBuildReport(input: {
  projectId: string;
  runId: string;
  profileId: string;
  capabilityLock: GameplayCapabilityLock;
  runtimeManifest: PhaserRuntimeSystemManifest;
  runtimePlan: CapabilityRuntimePlan;
  loaderPlan: PhaserRuntimeLoaderPlan;
  command: string;
  exitCode: number;
  evidenceRefs: readonly string[];
}): CapabilityPathBuildReport {
  const identity = buildActiveIdentity({
    projectId: input.projectId,
    runId: input.runId,
    profileId: input.profileId,
    capabilityLockHash: input.capabilityLock.lockHash,
    runtimeManifest: input.runtimeManifest,
    runtimePlan: input.runtimePlan,
    loaderPlan: input.loaderPlan
  });
  const payload: Omit<CapabilityPathBuildReport, 'reportHash'> = {
    artifactKind: CAPABILITY_PATH_BUILD_REPORT_KIND,
    schemaVersion: CAPABILITY_PATH_BUILD_REPORT_SCHEMA_VERSION,
    identity,
    status: input.exitCode === 0 ? 'passed' : 'failed',
    command: input.command,
    exitCode: input.exitCode,
    evidenceRefs: [...input.evidenceRefs].sort()
  };
  return CapabilityPathBuildReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) });
}

export function buildActiveCapabilityComposedGameplayRealizationReport(input: {
  generationPathReceipt: GenerationPathReceipt;
  capabilityLock: GameplayCapabilityLock;
  runtimeManifest: PhaserRuntimeSystemManifest;
  runtimePlan: CapabilityRuntimePlan;
  loaderPlan: PhaserRuntimeLoaderPlan;
  moduleLoadReceipt: RuntimeModuleLoadReceipt;
  telemetryEvidence: CapabilityOwnedTelemetryEvidence;
  capabilityQaPlan: CapabilityRuntimeQaPlan;
  capabilityQaReport: CapabilityQaReport;
  buildReport: CapabilityPathBuildReport;
}): ActiveCapabilityComposedGameplayRealizationReport {
  const generationPathReceipt = GenerationPathReceiptSchema.parse(input.generationPathReceipt);
  const capabilityLock = GameplayCapabilityLockSchema.parse(input.capabilityLock);
  const runtimeManifest = PhaserRuntimeSystemManifestSchema.parse(input.runtimeManifest);
  const runtimePlan = CapabilityRuntimePlanSchema.parse(input.runtimePlan);
  const moduleLoadReceipt = RuntimeModuleLoadReceiptSchema.parse(input.moduleLoadReceipt);
  const telemetryEvidence = CapabilityOwnedTelemetryEvidenceSchema.parse(input.telemetryEvidence);
  const buildReport = CapabilityPathBuildReportSchema.parse(input.buildReport);
  const identity = buildActiveIdentity({
    projectId: runtimePlan.projectId,
    runId: runtimePlan.runId,
    profileId: runtimePlan.profileId,
    capabilityLockHash: capabilityLock.lockHash,
    runtimeManifest,
    runtimePlan,
    loaderPlan: input.loaderPlan
  });
  const qaTelemetryBinding = input.capabilityQaReport.requiredResults
    .flatMap((result) => result.observationRefs ?? [])
    .includes(telemetryEvidence.evidenceHash);
  const blockers = [
    ...(generationPathReceipt.selectedPath === 'capability_composed_v1' ? [] : ['generation_path_not_active_capability_composed']),
    ...(generationPathReceipt.projectId === identity.projectId ? [] : ['generation_path_project_mismatch']),
    ...(generationPathReceipt.runId === identity.runId ? [] : ['generation_path_run_mismatch']),
    ...(generationPathReceipt.profileId === identity.profileId ? [] : ['generation_path_profile_mismatch']),
    ...(generationPathReceipt.receiptHash === hashStableJson(stripUndefined({ ...generationPathReceipt, receiptHash: undefined })) ? [] : ['generation_path_receipt_hash_invalid']),
    ...(capabilityLock.lockHash === recomputeGameplayCapabilityLockHash(capabilityLock) ? [] : ['exact_capability_lock_hash_invalid']),
    ...(input.loaderPlan.planHash === hashPhaserRuntimeLoaderPlanPayload(input.loaderPlan) ? [] : ['loader_plan_hash_invalid']),
    ...(runtimePlan.source.capabilityLockHash === capabilityLock.lockHash ? [] : ['runtime_plan_lock_mismatch']),
    ...manifestCapabilityOwnerBlockers(capabilityLock, runtimeManifest),
    ...manifestPackageRefBlockers(capabilityLock, runtimeManifest, moduleLoadReceipt),
    ...identityBlockers('module_load_identity', identity, moduleLoadReceipt.identity),
    ...(moduleLoadReceipt.status === 'loaded' ? [] : ['runtime_module_load_not_loaded']),
    ...identityBlockers('telemetry_identity', identity, telemetryEvidence.identity),
    ...(telemetryEvidence.moduleLoadReceiptHash === moduleLoadReceipt.receiptHash ? [] : ['enemy_fired_module_load_receipt_hash_mismatch']),
    ...(telemetryEvidence.status === 'observed' ? [] : ['enemy_fired_not_observed']),
    ...(telemetryEvidence.producer.source === 'runtime_module' ? [] : ['enemy_fired_not_runtime_module_owned']),
    ...(capabilityLock.capabilityIds.includes(telemetryEvidence.producer.capabilityId) ? [] : ['enemy_fired_producer_not_locked']),
    ...(moduleLoadReceipt.loadOrder.some((entry) => entry.systemId === telemetryEvidence.producer.systemId) ? [] : ['enemy_fired_producer_not_loaded']),
    ...(input.capabilityQaPlan.capabilityLockHash === capabilityLock.lockHash ? [] : ['capability_qa_plan_lock_mismatch']),
    ...(input.capabilityQaPlan.planHash === hashCapabilityRuntimeQaPlanPayload(input.capabilityQaPlan) ? [] : ['capability_qa_plan_hash_invalid']),
    ...(input.capabilityQaReport.planHash === input.capabilityQaPlan.planHash ? [] : ['capability_qa_report_plan_mismatch']),
    ...(input.capabilityQaReport.reportHash === hashCapabilityQaReportPayload(input.capabilityQaReport) ? [] : ['capability_qa_report_hash_invalid']),
    ...(input.capabilityQaReport.status === 'passed' ? [] : ['capability_qa_not_passed']),
    ...(input.capabilityQaReport.missingRequiredProbeIds.length === 0 ? [] : ['capability_qa_missing_required_probe']),
    ...(qaTelemetryBinding ? [] : ['capability_qa_not_bound_to_enemy_fired_evidence']),
    ...identityBlockers('build_identity', identity, buildReport.identity),
    ...(buildReport.status === 'passed' ? [] : ['capability_path_build_not_passed'])
  ].sort();
  const payload: Omit<ActiveCapabilityComposedGameplayRealizationReport, 'reportHash'> = {
    artifactKind: ACTIVE_CAPABILITY_COMPOSED_GAMEPLAY_REALIZATION_REPORT_KIND,
    schemaVersion: ACTIVE_CAPABILITY_COMPOSED_GAMEPLAY_REALIZATION_REPORT_SCHEMA_VERSION,
    identity,
    status: blockers.length === 0 ? 'passed' : 'blocked',
    generationPathReceiptHash: generationPathReceipt.receiptHash,
    exactCapabilityLockHash: capabilityLock.lockHash,
    runtimeManifestHash: identity.runtimeManifestHash,
    runtimePlanHash: runtimePlan.planHash,
    runtimeModuleLoadReceiptHash: moduleLoadReceipt.receiptHash,
    enemyFiredEvidenceHash: telemetryEvidence.evidenceHash,
    capabilityQaPlanHash: input.capabilityQaPlan.planHash,
    capabilityQaReportHash: input.capabilityQaReport.reportHash,
    buildReportHash: buildReport.reportHash,
    loadedSystemIds: moduleLoadReceipt.loadOrder.map((entry) => entry.systemId).sort(),
    lockedPackageRefs: moduleLoadReceipt.loadOrder
      .map((entry) => ({
        capabilityId: entry.capabilityId,
        packageVersion: entry.packageVersion,
        packageHash: entry.packageHash
      }))
      .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId)),
    enemyFired: {
      eventCount: telemetryEvidence.eventCount,
      producerSystemId: telemetryEvidence.producer.systemId,
      producerCapabilityId: telemetryEvidence.producer.capabilityId,
      enemyEntityId: telemetryEvidence.entity.entityId
    },
    capabilityQa: {
      status: input.capabilityQaReport.status,
      ...(qaTelemetryBinding ? { boundTelemetryEvidenceHash: telemetryEvidence.evidenceHash } : {}),
      requiredProbeIds: input.capabilityQaReport.requiredResults.map((result) => result.probeId).sort()
    },
    build: {
      status: buildReport.status,
      command: buildReport.command
    },
    evidenceRefs: [
      { artifactKind: generationPathReceipt.artifactKind, hash: generationPathReceipt.receiptHash },
      { artifactKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND, hash: moduleLoadReceipt.receiptHash },
      { artifactKind: CAPABILITY_OWNED_TELEMETRY_EVIDENCE_KIND, hash: telemetryEvidence.evidenceHash },
      { artifactKind: 'capability_qa_report', hash: input.capabilityQaReport.reportHash },
      { artifactKind: CAPABILITY_PATH_BUILD_REPORT_KIND, hash: buildReport.reportHash }
    ].sort((left, right) => `${left.artifactKind}:${left.hash}`.localeCompare(`${right.artifactKind}:${right.hash}`)),
    blockers
  };
  return ActiveCapabilityComposedGameplayRealizationReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) });
}

function buildActiveIdentity(input: {
  projectId: string;
  runId: string;
  profileId: string;
  capabilityLockHash: string;
  runtimeManifest: PhaserRuntimeSystemManifest;
  runtimePlan: CapabilityRuntimePlan;
  loaderPlan: PhaserRuntimeLoaderPlan;
}): z.infer<typeof ActiveIdentitySchema> {
  return ActiveIdentitySchema.parse({
    projectId: input.projectId,
    runId: input.runId,
    selectedPath: 'capability_composed_v1',
    executionMode: 'active',
    profileId: input.profileId,
    runtimeFamily: PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
    capabilityLockHash: input.capabilityLockHash,
    runtimeManifestHash: hashStableJson(input.runtimeManifest),
    runtimePlanHash: input.runtimePlan.planHash,
    loaderPlanHash: hashPhaserRuntimeLoaderPlanPayload(input.loaderPlan)
  });
}

function buildRuntimeModuleLoadIssues(input: {
  identity: z.infer<typeof ActiveIdentitySchema>;
  loadOrder: z.infer<typeof RuntimeModuleLoadEntrySchema>[];
  lifecycleEvents: z.infer<typeof RuntimeModuleLifecycleEventSchema>[];
  loaderPlan: PhaserRuntimeLoaderPlan;
  runtimeManifest: PhaserRuntimeSystemManifest;
}): string[] {
  const systemIds = input.loadOrder.map((entry) => entry.systemId);
  const systemIdSet = new Set(systemIds);
  const updateLoopSystemIds = new Set(input.loaderPlan.updateLoopSystemIds);
  const manifestSystemById = new Map(input.runtimeManifest.systems.map((system) => [system.id, system]));
  return uniqueSortedStrings([
    ...(input.loaderPlan.capabilityLockHash === input.identity.capabilityLockHash ? [] : ['loader_plan_lock_mismatch']),
    ...(input.loaderPlan.planHash === hashPhaserRuntimeLoaderPlanPayload(input.loaderPlan) ? [] : ['loader_plan_hash_invalid']),
    ...input.loadOrder.flatMap((entry) => {
      const manifestSystem = manifestSystemById.get(entry.systemId);
      return [
        ...(manifestSystem === undefined ? [`loader_plan_manifest_system_missing:${entry.systemId}`] : []),
        ...(manifestSystem !== undefined && manifestSystem.capabilityId !== entry.capabilityId ? [`loader_plan_manifest_capability_mismatch:${entry.systemId}`] : [])
      ];
    }),
    ...input.runtimeManifest.systems.filter((system) => !systemIdSet.has(system.id)).map((system) => `loader_plan_manifest_system_not_loaded:${system.id}`),
    ...input.lifecycleEvents.filter((event) => !systemIdSet.has(event.systemId)).map((event) => `runtime_module_unplanned_lifecycle:${event.systemId}`),
    ...input.loadOrder
      .filter((entry) => entry.packageVersion === '<missing>' || entry.packageHash === '<missing>')
      .map((entry) => `runtime_module_package_not_locked:${entry.capabilityId}`),
    ...runtimeLifecycleInvariantMessages(input.loadOrder, input.lifecycleEvents),
    ...systemIds.flatMap((systemId) => {
      const installed = hasLifecycle(input.lifecycleEvents, systemId, 'install');
      const started = hasLifecycle(input.lifecycleEvents, systemId, 'start');
      const disposed = hasLifecycle(input.lifecycleEvents, systemId, 'dispose');
      const updated = !updateLoopSystemIds.has(systemId) || hasLifecycle(input.lifecycleEvents, systemId, 'update');
      return [
        ...(installed ? [] : [`runtime_module_not_installed:${systemId}`]),
        ...(started ? [] : [`runtime_module_not_started:${systemId}`]),
        ...(updated ? [] : [`runtime_module_not_updated:${systemId}`]),
        ...(disposed ? [] : [`runtime_module_not_disposed:${systemId}`])
      ];
    })
  ]);
}

function runtimeLoadReceiptSchemaInvariants(receipt: Omit<RuntimeModuleLoadReceipt, 'receiptHash'> | RuntimeModuleLoadReceipt): string[] {
  if (receipt.status !== 'loaded') {
    return [];
  }
  return runtimeLifecycleInvariantMessages(receipt.loadOrder, receipt.lifecycleEvents);
}

function runtimeLifecycleInvariantMessages(
  loadOrder: readonly z.infer<typeof RuntimeModuleLoadEntrySchema>[],
  lifecycleEvents: readonly z.infer<typeof RuntimeModuleLifecycleEventSchema>[]
): string[] {
  return uniqueSortedStrings(
    loadOrder.flatMap((entry) => {
      const installOrder = lifecycleOrder(lifecycleEvents, entry.systemId, 'install');
      const startOrder = lifecycleOrder(lifecycleEvents, entry.systemId, 'start');
      const updateOrder = lifecycleOrder(lifecycleEvents, entry.systemId, 'update');
      const disposeOrder = lifecycleOrder(lifecycleEvents, entry.systemId, 'dispose');
      return [
        ...(installOrder === undefined ? [`loaded receipt missing install for ${entry.systemId}`] : []),
        ...(startOrder === undefined ? [`loaded receipt missing start for ${entry.systemId}`] : []),
        ...(entry.phase === 'bootstrap' || updateOrder !== undefined ? [] : [`loaded receipt missing update for ${entry.systemId}`]),
        ...(disposeOrder === undefined ? [`loaded receipt missing dispose for ${entry.systemId}`] : []),
        ...(installOrder !== undefined && startOrder !== undefined && installOrder < startOrder
          ? []
          : [`loaded receipt lifecycle order invalid for ${entry.systemId}: install must precede start`]),
        ...(startOrder !== undefined && updateOrder !== undefined && startOrder < updateOrder
          ? []
          : entry.phase === 'bootstrap'
            ? []
            : [`loaded receipt lifecycle order invalid for ${entry.systemId}: start must precede update`]),
        ...(updateOrder !== undefined && disposeOrder !== undefined && updateOrder < disposeOrder
          ? []
          : entry.phase === 'bootstrap' && startOrder !== undefined && disposeOrder !== undefined && startOrder < disposeOrder
            ? []
            : [`loaded receipt lifecycle order invalid for ${entry.systemId}: runtime work must precede dispose`])
      ];
    })
  );
}

function lifecycleOrder(
  events: readonly z.infer<typeof RuntimeModuleLifecycleEventSchema>[],
  systemId: string,
  phase: z.infer<typeof RuntimeModuleLifecycleEventSchema>['phase']
): number | undefined {
  return events.find((event) => event.systemId === systemId && event.phase === phase)?.order;
}

function hasLifecycle(
  events: readonly z.infer<typeof RuntimeModuleLifecycleEventSchema>[],
  systemId: string,
  phase: z.infer<typeof RuntimeModuleLifecycleEventSchema>['phase']
): boolean {
  return events.some((event) => event.systemId === systemId && event.phase === phase);
}

function manifestCapabilityOwnerBlockers(lock: GameplayCapabilityLock, manifest: PhaserRuntimeSystemManifest): string[] {
  const locked = new Set(lock.capabilityIds);
  const manifestCapabilityIds = new Set(manifest.systems.map((system) => system.capabilityId));
  return uniqueSortedStrings([
    ...[...locked].filter((capabilityId) => !manifestCapabilityIds.has(capabilityId)).map((capabilityId) => `runtime_manifest_missing_capability:${capabilityId}`),
    ...[...manifestCapabilityIds].filter((capabilityId) => !locked.has(capabilityId)).map((capabilityId) => `runtime_manifest_extra_capability:${capabilityId}`)
  ]);
}

function manifestPackageRefBlockers(lock: GameplayCapabilityLock, manifest: PhaserRuntimeSystemManifest, receipt: RuntimeModuleLoadReceipt): string[] {
  const lockPackageByCapabilityId = new Map(lock.packages.map((pkg) => [pkg.capabilityId, pkg]));
  const receiptEntryBySystemId = new Map(receipt.loadOrder.map((entry) => [entry.systemId, entry]));
  const systemIds = new Set<string>();
  return uniqueSortedStrings(
    manifest.systems.flatMap((system) => {
      const duplicate = systemIds.has(system.id);
      systemIds.add(system.id);
      const lockedPackage = lockPackageByCapabilityId.get(system.capabilityId);
      const receiptEntry = receiptEntryBySystemId.get(system.id);
      return [
        ...(duplicate ? [`runtime_manifest_duplicate_system:${system.id}`] : []),
        ...(lockedPackage === undefined ? [`runtime_manifest_package_not_locked:${system.capabilityId}`] : []),
        ...(receiptEntry === undefined ? [`runtime_manifest_system_not_loaded:${system.id}`] : []),
        ...(receiptEntry !== undefined && receiptEntry.capabilityId === system.capabilityId ? [] : [`runtime_manifest_capability_mismatch:${system.id}`]),
        ...(lockedPackage !== undefined && receiptEntry !== undefined && receiptEntry.packageVersion === lockedPackage.packageVersion
          ? []
          : [`runtime_manifest_package_version_mismatch:${system.capabilityId}`]),
        ...(lockedPackage !== undefined && receiptEntry !== undefined && receiptEntry.packageHash === lockedPackage.packageHash
          ? []
          : [`runtime_manifest_package_hash_mismatch:${system.capabilityId}`])
      ];
    })
  );
}

function requiredActiveEvidenceKinds(): string[] {
  return [
    'generation_path_receipt',
    RUNTIME_MODULE_LOAD_RECEIPT_KIND,
    CAPABILITY_OWNED_TELEMETRY_EVIDENCE_KIND,
    'capability_qa_report',
    CAPABILITY_PATH_BUILD_REPORT_KIND
  ];
}

function activeEvidenceRefHashIssues(report: ActiveCapabilityComposedGameplayRealizationReport): string[] {
  const expectedRefs = [
    { artifactKind: 'generation_path_receipt', hash: report.generationPathReceiptHash },
    { artifactKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND, hash: report.runtimeModuleLoadReceiptHash },
    { artifactKind: CAPABILITY_OWNED_TELEMETRY_EVIDENCE_KIND, hash: report.enemyFiredEvidenceHash },
    { artifactKind: 'capability_qa_report', hash: report.capabilityQaReportHash },
    { artifactKind: CAPABILITY_PATH_BUILD_REPORT_KIND, hash: report.buildReportHash }
  ];
  return expectedRefs.flatMap((expected) => {
    const match = report.evidenceRefs.find((ref) => ref.artifactKind === expected.artifactKind);
    if (match === undefined) {
      return [];
    }
    return match.hash === expected.hash ? [] : [`${expected.artifactKind} evidenceRef hash must match report field`];
  });
}

function identityBlockers(prefix: string, left: z.infer<typeof ActiveIdentitySchema>, right: z.infer<typeof ActiveIdentitySchema>): string[] {
  return (Object.keys(left) as Array<keyof typeof left>).flatMap((key) => (left[key] === right[key] ? [] : [`${prefix}_${String(key)}_mismatch`]));
}

function recomputeGameplayCapabilityLockHash(lock: GameplayCapabilityLock): string {
  const { lockHash: _lockHash, ...payload } = lock;
  return hashStableJson(payload);
}

function hashRuntimeModuleLoadReceiptPayload(receipt: Omit<RuntimeModuleLoadReceipt, 'receiptHash'> | RuntimeModuleLoadReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt as RuntimeModuleLoadReceipt;
  return hashStableJson(stripUndefined(payload));
}

function hashCapabilityOwnedTelemetryEvidencePayload(
  evidence: Omit<CapabilityOwnedTelemetryEvidence, 'evidenceHash'> | CapabilityOwnedTelemetryEvidence
): string {
  const { evidenceHash: _evidenceHash, ...payload } = evidence as CapabilityOwnedTelemetryEvidence;
  return hashStableJson(stripUndefined(payload));
}

function hashCapabilityPathBuildReportPayload(report: Omit<CapabilityPathBuildReport, 'reportHash'> | CapabilityPathBuildReport): string {
  const { reportHash: _reportHash, ...payload } = report as CapabilityPathBuildReport;
  return hashStableJson(stripUndefined(payload));
}

function hashPhaserRuntimeLoaderPlanPayload(plan: PhaserRuntimeLoaderPlan): string {
  const { planHash: _planHash, ...payload } = plan;
  return hashStableJson(stripUndefined(payload));
}

function hashCapabilityRuntimeQaPlanPayload(plan: CapabilityRuntimeQaPlan): string {
  const { planHash: _planHash, ...payload } = plan;
  return hashStableJson(stripUndefined(payload));
}

function hashCapabilityQaReportPayload(report: CapabilityQaReport): string {
  const { reportHash: _reportHash, ...payload } = report;
  return hashStableJson(stripUndefined(payload));
}

function hashActiveCapabilityComposedGameplayRealizationReportPayload(
  report: Omit<ActiveCapabilityComposedGameplayRealizationReport, 'reportHash'> | ActiveCapabilityComposedGameplayRealizationReport
): string {
  const { reportHash: _reportHash, ...payload } = report as ActiveCapabilityComposedGameplayRealizationReport;
  return hashStableJson(stripUndefined(payload));
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, stripUndefined(child)])
  );
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
