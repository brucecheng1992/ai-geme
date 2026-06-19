import { z } from 'zod';

import { GameAmendmentIrSchema, type GameAmendmentOperation } from '../amendments/semantic-amendment-schema.js';
import {
  GameplayCapabilityPackageContractSchema,
  validateGameplayCapabilityPackage,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  resolveGameplayCapabilityGraph,
  type GameplayCapabilityResolutionReport
} from './capability-resolver.js';
import { GameplayCapabilityLockSchema } from './capability-lock.js';
import { hashStableJson } from './stable-json.js';

export const CAPABILITY_AMENDMENT_EXECUTION_PLAN_KIND = 'capability_amendment_execution_plan';
export const CAPABILITY_AMENDMENT_EXECUTION_PLAN_SCHEMA_VERSION = 'capability_amendment_execution_plan.v0.1';
export const CAPABILITY_LOCK_PROMOTION_RESULT_KIND = 'capability_lock_promotion_result';
export const CAPABILITY_LOCK_PROMOTION_RESULT_SCHEMA_VERSION = 'capability_lock_promotion_result.v0.1';

export type CapabilityAmendmentDiagnostic = {
  code:
    | 'AMENDMENT_IR_INVALID'
    | 'ACTIVE_LOCK_INVALID'
    | 'PACKAGE_INVALID'
    | 'RESOLUTION_BLOCKED'
    | 'OPERATION_OWNER_MISSING'
    | 'OPERATION_OWNER_NOT_LOCKED'
    | 'OPERATION_OWNER_AMBIGUOUS'
    | 'OPERATION_UNSUPPORTED'
    | 'REMOVE_DEPENDENCY_BLOCKED';
  operationId?: string;
  capabilityId?: string;
  message: string;
};

export type CapabilityAmendmentOperationRoute = {
  operationId: string;
  operation: GameAmendmentOperation['operation'];
  operationKey: string;
  ownerCapabilityId: string;
  packageVersion: string;
  compilerId: string;
  executionPolicy: 'hot_runtime_patch' | 'warm_restart' | 'regeneration_required' | 'unsupported';
  patchDescriptorIds: string[];
};

export type CapabilityLockDiff = {
  beforeLockHash: string;
  afterLockHash: string;
  addedCapabilityIds: string[];
  removedCapabilityIds: string[];
  changedPackageVersions: Array<{ capabilityId: string; beforePackageVersion: string; afterPackageVersion: string }>;
};

export type CapabilityAmendmentExecutionPlan = {
  artifactKind: typeof CAPABILITY_AMENDMENT_EXECUTION_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_EXECUTION_PLAN_SCHEMA_VERSION;
  status: 'routed' | 'blocked';
  proposalId?: string;
  runtimeFamily?: string;
  amendmentIrHash?: string;
  executionMode?: 'hot_runtime_patch' | 'dsl_patch_warm_restart' | 'candidate_regeneration' | 'unsupported_capability';
  operationRoutes: CapabilityAmendmentOperationRoute[];
  ownerCapabilityPackages: Array<{ capabilityId: string; packageVersion: string; compilerId: string }>;
  beforeLock?: z.infer<typeof GameplayCapabilityLockSchema>;
  afterLock?: z.infer<typeof GameplayCapabilityLockSchema>;
  lockDiff?: CapabilityLockDiff;
  resolverReport?: GameplayCapabilityResolutionReport;
  provenance?: {
    proposalId: string;
    deepSeekInvocationIds: string[];
    amendmentIrHash: string;
    beforeLockHash: string;
    afterLockHash: string;
    ownerCapabilityPackages: string[];
  };
  diagnostics: CapabilityAmendmentDiagnostic[];
};

export type CapabilityLockPromotionResult = {
  artifactKind: typeof CAPABILITY_LOCK_PROMOTION_RESULT_KIND;
  schemaVersion: typeof CAPABILITY_LOCK_PROMOTION_RESULT_SCHEMA_VERSION;
  decision: 'accept' | 'reject';
  promoted: boolean;
  activeLock: z.infer<typeof GameplayCapabilityLockSchema>;
  reason: string;
};

export function routeCapabilityOwnedAmendment(input: {
  amendmentIr: unknown;
  activeLock: unknown;
  packages: readonly unknown[];
  runtimeFamily: string;
  requestedCapabilityChanges?: {
    add?: readonly string[];
    remove?: readonly string[];
    allowedVersionChanges?: readonly string[];
  };
}): CapabilityAmendmentExecutionPlan {
  const amendmentIr = GameAmendmentIrSchema.safeParse(input.amendmentIr);
  const activeLock = GameplayCapabilityLockSchema.safeParse(input.activeLock);
  const packageMap = buildAmendmentPackageMap(input.packages);
  const diagnostics: CapabilityAmendmentDiagnostic[] = [
    ...zodDiagnostics('AMENDMENT_IR_INVALID', amendmentIr),
    ...zodDiagnostics('ACTIVE_LOCK_INVALID', activeLock),
    ...packageMap.diagnostics
  ];

  if (!amendmentIr.success || !activeLock.success) {
    return blockedPlan({ diagnostics });
  }

  const requestedAdditions = [...(input.requestedCapabilityChanges?.add ?? [])].sort();
  const requestedRemovals = [...(input.requestedCapabilityChanges?.remove ?? [])].sort();
  const requestedCapabilities = [
    ...activeLock.data.capabilityIds.filter((capabilityId) => !requestedRemovals.includes(capabilityId)),
    ...requestedAdditions
  ];
  const resolverReport = resolveGameplayCapabilityGraph({
    requestedCapabilities,
    packages: input.packages,
    runtimeFamily: input.runtimeFamily,
    activeLock: activeLock.data,
    allowedVersionChanges: input.requestedCapabilityChanges?.allowedVersionChanges,
    allowedCapabilityRemovals: requestedRemovals
  });
  if (resolverReport.status !== 'resolved' || resolverReport.lock === undefined) {
    diagnostics.push(
      ...resolverReport.diagnostics.map((diagnostic): CapabilityAmendmentDiagnostic => ({
        code: 'RESOLUTION_BLOCKED',
        capabilityId: diagnostic.capabilityId,
        message: `${diagnostic.code}: ${diagnostic.explanation}`
      }))
    );
  }

  const afterLock = resolverReport.lock ?? activeLock.data;
  for (const removedCapabilityId of requestedRemovals) {
    if (afterLock.capabilityIds.includes(removedCapabilityId)) {
      diagnostics.push({
        code: 'REMOVE_DEPENDENCY_BLOCKED',
        capabilityId: removedCapabilityId,
        message: `Requested removal ${removedCapabilityId} is still required by the resolved capability graph.`
      });
    }
  }

  const lockedPackageMap = buildLockedPackageMap(afterLock, packageMap.packages, diagnostics);
  const operationRoutes = amendmentIr.data.operations.flatMap((operation): CapabilityAmendmentOperationRoute[] => {
    const route = routeOperationToPackage({
      operation,
      afterLock,
      lockedPackageMap,
      diagnostics
    });
    return route === undefined ? [] : [route];
  });
  const ownerCapabilityPackages = uniqueOwnerPackages(operationRoutes);
  const lockDiff = buildCapabilityLockDiff(activeLock.data, afterLock);
  const amendmentIrHash = hashStableJson(amendmentIr.data);
  const executionMode = diagnostics.length > 0 ? 'unsupported_capability' : aggregateExecutionMode(operationRoutes);

  return {
    artifactKind: CAPABILITY_AMENDMENT_EXECUTION_PLAN_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_EXECUTION_PLAN_SCHEMA_VERSION,
    status: diagnostics.length === 0 ? 'routed' : 'blocked',
    proposalId: amendmentIr.data.proposalId,
    runtimeFamily: input.runtimeFamily,
    amendmentIrHash,
    executionMode,
    operationRoutes,
    ownerCapabilityPackages,
    beforeLock: activeLock.data,
    afterLock,
    lockDiff,
    resolverReport,
    provenance: {
      proposalId: amendmentIr.data.proposalId,
      deepSeekInvocationIds: amendmentIr.data.modelInvocationIds,
      amendmentIrHash,
      beforeLockHash: activeLock.data.lockHash,
      afterLockHash: afterLock.lockHash,
      ownerCapabilityPackages: ownerCapabilityPackages.map((owner) => `${owner.capabilityId}@${owner.packageVersion}`)
    },
    diagnostics
  };
}

export function promoteCapabilityLockForAmendment(input: {
  activeLock: unknown;
  plan: CapabilityAmendmentExecutionPlan;
  decision: 'accept' | 'reject';
}): CapabilityLockPromotionResult {
  const activeLock = GameplayCapabilityLockSchema.parse(input.activeLock);
  if (input.decision === 'reject') {
    return {
      artifactKind: CAPABILITY_LOCK_PROMOTION_RESULT_KIND,
      schemaVersion: CAPABILITY_LOCK_PROMOTION_RESULT_SCHEMA_VERSION,
      decision: 'reject',
      promoted: false,
      activeLock,
      reason: 'Rejected amendment leaves active capability lock unchanged.'
    };
  }
  if (input.plan.status !== 'routed' || input.plan.afterLock === undefined) {
    return {
      artifactKind: CAPABILITY_LOCK_PROMOTION_RESULT_KIND,
      schemaVersion: CAPABILITY_LOCK_PROMOTION_RESULT_SCHEMA_VERSION,
      decision: 'accept',
      promoted: false,
      activeLock,
      reason: 'Blocked amendment plan cannot promote a capability lock.'
    };
  }
  return {
    artifactKind: CAPABILITY_LOCK_PROMOTION_RESULT_KIND,
    schemaVersion: CAPABILITY_LOCK_PROMOTION_RESULT_SCHEMA_VERSION,
    decision: 'accept',
    promoted: true,
    activeLock: input.plan.afterLock,
    reason: 'Accepted amendment promotes candidate capability lock atomically.'
  };
}

function routeOperationToPackage(input: {
  operation: GameAmendmentOperation;
  afterLock: z.infer<typeof GameplayCapabilityLockSchema>;
  lockedPackageMap: ReadonlyMap<string, GameplayCapabilityPackageContract>;
  diagnostics: CapabilityAmendmentDiagnostic[];
}): CapabilityAmendmentOperationRoute | undefined {
  const operationKey = operationKeyForAmendmentOperation(input.operation);
  const requiredOwnerIds = input.operation.requiresCapabilities.filter((requirement) => requirement.required).map((requirement) => requirement.capabilityId);
  const unlockedRequiredOwnerIds = requiredOwnerIds.filter((capabilityId) => !input.afterLock.capabilityIds.includes(capabilityId));
  if (unlockedRequiredOwnerIds.length > 0) {
    for (const capabilityId of unlockedRequiredOwnerIds) {
      input.diagnostics.push({
        code: 'OPERATION_OWNER_NOT_LOCKED',
        operationId: input.operation.id,
        capabilityId,
        message: `Required owner capability ${capabilityId} is not present in the candidate capability lock.`
      });
    }
    return undefined;
  }
  const requiredOwnerMatches = requiredOwnerIds.flatMap((capabilityId) => {
    const contract = input.lockedPackageMap.get(capabilityId);
    if (contract === undefined) {
      input.diagnostics.push({
        code: 'OPERATION_OWNER_MISSING',
        operationId: input.operation.id,
        capabilityId,
        message: `Required owner capability ${capabilityId} is locked but its exact package is unavailable.`
      });
      return [];
    }
    if (!supportsOperation(contract, operationKey)) {
      input.diagnostics.push({
        code: 'OPERATION_UNSUPPORTED',
        operationId: input.operation.id,
        capabilityId,
        message: `Required owner capability ${capabilityId} does not support operation ${operationKey}.`
      });
      return [];
    }
    return [contract];
  });
  if (requiredOwnerIds.length > 0 && requiredOwnerMatches.length !== requiredOwnerIds.length) {
    return undefined;
  }
  const genericOwnerMatches = [...input.lockedPackageMap.values()].filter((contract) => supportsOperation(contract, operationKey));
  const ownerMatches = uniqueContractsById(requiredOwnerMatches.length > 0 ? requiredOwnerMatches : genericOwnerMatches);
  if (ownerMatches.length > 1) {
    input.diagnostics.push({
      code: 'OPERATION_OWNER_AMBIGUOUS',
      operationId: input.operation.id,
      message: `Operation ${operationKey} is supported by multiple locked capability packages: ${ownerMatches.map((owner) => owner.manifest.id).join(', ')}.`
    });
    return undefined;
  }
  const owner = ownerMatches[0];
  if (owner === undefined) {
    input.diagnostics.push({
      code: 'OPERATION_OWNER_MISSING',
      operationId: input.operation.id,
      message: `No capability package owns amendment operation ${operationKey}; field-first fallback is forbidden.`
    });
    return undefined;
  }
  if (!input.afterLock.capabilityIds.includes(owner.manifest.id)) {
    input.diagnostics.push({
      code: 'OPERATION_OWNER_NOT_LOCKED',
      operationId: input.operation.id,
      capabilityId: owner.manifest.id,
      message: `Owner capability ${owner.manifest.id} is not present in the candidate capability lock.`
    });
    return undefined;
  }
  const operationDescriptor = owner.amendments.supportedOperations.find((descriptor) => descriptor.operation === operationKey);
  if (operationDescriptor === undefined || operationDescriptor.executionPolicy === 'unsupported') {
    input.diagnostics.push({
      code: 'OPERATION_UNSUPPORTED',
      operationId: input.operation.id,
      capabilityId: owner.manifest.id,
      message: `Owner capability ${owner.manifest.id} does not support operation ${operationKey}.`
    });
    return undefined;
  }
  return {
    operationId: input.operation.id,
    operation: input.operation.operation,
    operationKey,
    ownerCapabilityId: owner.manifest.id,
    packageVersion: owner.manifest.packageVersion,
    compilerId: owner.amendments.compilerId,
    executionPolicy: operationDescriptor.executionPolicy,
    patchDescriptorIds: owner.patch.descriptors.map((descriptor) => descriptor.id).sort()
  };
}

function operationKeyForAmendmentOperation(operation: GameAmendmentOperation): string {
  if (operation.operation === 'setComponentProperty' && operation.property !== undefined) {
    return `SetComponentProperty:${operation.property}`;
  }
  return `${operation.operation.slice(0, 1).toUpperCase()}${operation.operation.slice(1)}`;
}

function buildAmendmentPackageMap(packages: readonly unknown[]): {
  packages: Map<string, Array<{ contract: GameplayCapabilityPackageContract; packageHash: string }>>;
  diagnostics: CapabilityAmendmentDiagnostic[];
} {
  const map = new Map<string, Array<{ contract: GameplayCapabilityPackageContract; packageHash: string }>>();
  const diagnostics: CapabilityAmendmentDiagnostic[] = [];
  for (const candidate of packages) {
    const parsed = GameplayCapabilityPackageContractSchema.safeParse(candidate);
    if (!parsed.success) {
      diagnostics.push({
        code: 'PACKAGE_INVALID',
        message: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      });
      continue;
    }
    const report = validateGameplayCapabilityPackage(parsed.data);
    if (!report.supportEligible) {
      diagnostics.push({
        code: 'PACKAGE_INVALID',
        capabilityId: parsed.data.manifest.id,
        message: `Package ${parsed.data.manifest.id} is not support eligible.`
      });
      continue;
    }
    const list = map.get(parsed.data.manifest.id) ?? [];
    list.push({ contract: parsed.data, packageHash: report.packageHash ?? hashStableJson(parsed.data) });
    map.set(parsed.data.manifest.id, list);
  }
  return { packages: map, diagnostics };
}

function buildLockedPackageMap(
  lock: z.infer<typeof GameplayCapabilityLockSchema>,
  candidates: ReadonlyMap<string, Array<{ contract: GameplayCapabilityPackageContract; packageHash: string }>>,
  diagnostics: CapabilityAmendmentDiagnostic[]
): Map<string, GameplayCapabilityPackageContract> {
  const lockedPackages = new Map<string, GameplayCapabilityPackageContract>();
  for (const lockedPackage of lock.packages) {
    const candidate = (candidates.get(lockedPackage.capabilityId) ?? []).find(
      (entry) => entry.contract.manifest.packageVersion === lockedPackage.packageVersion && entry.packageHash === lockedPackage.packageHash
    );
    if (candidate === undefined) {
      diagnostics.push({
        code: 'PACKAGE_INVALID',
        capabilityId: lockedPackage.capabilityId,
        message: `Locked package ${lockedPackage.capabilityId}@${lockedPackage.packageVersion} with hash ${lockedPackage.packageHash} is not present in package candidates.`
      });
      continue;
    }
    lockedPackages.set(lockedPackage.capabilityId, candidate.contract);
  }
  return lockedPackages;
}

function supportsOperation(contract: GameplayCapabilityPackageContract, operationKey: string): boolean {
  return contract.amendments.supportedOperations.some((descriptor) => descriptor.operation === operationKey);
}

function uniqueContractsById(contracts: readonly GameplayCapabilityPackageContract[]): GameplayCapabilityPackageContract[] {
  const unique = new Map<string, GameplayCapabilityPackageContract>();
  for (const contract of contracts) {
    unique.set(contract.manifest.id, contract);
  }
  return [...unique.values()].sort((left, right) => left.manifest.id.localeCompare(right.manifest.id));
}

function buildCapabilityLockDiff(
  beforeLock: z.infer<typeof GameplayCapabilityLockSchema>,
  afterLock: z.infer<typeof GameplayCapabilityLockSchema>
): CapabilityLockDiff {
  const beforePackages = new Map(beforeLock.packages.map((entry) => [entry.capabilityId, entry]));
  const afterPackages = new Map(afterLock.packages.map((entry) => [entry.capabilityId, entry]));
  return {
    beforeLockHash: beforeLock.lockHash,
    afterLockHash: afterLock.lockHash,
    addedCapabilityIds: afterLock.capabilityIds.filter((capabilityId) => !beforeLock.capabilityIds.includes(capabilityId)).sort(),
    removedCapabilityIds: beforeLock.capabilityIds.filter((capabilityId) => !afterLock.capabilityIds.includes(capabilityId)).sort(),
    changedPackageVersions: afterLock.capabilityIds
      .flatMap((capabilityId) => {
        const beforePackage = beforePackages.get(capabilityId);
        const afterPackage = afterPackages.get(capabilityId);
        if (beforePackage === undefined || afterPackage === undefined || beforePackage.packageVersion === afterPackage.packageVersion) {
          return [];
        }
        return [
          {
            capabilityId,
            beforePackageVersion: beforePackage.packageVersion,
            afterPackageVersion: afterPackage.packageVersion
          }
        ];
      })
      .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId))
  };
}

function aggregateExecutionMode(routes: readonly CapabilityAmendmentOperationRoute[]): CapabilityAmendmentExecutionPlan['executionMode'] {
  if (routes.some((route) => route.executionPolicy === 'regeneration_required')) {
    return 'candidate_regeneration';
  }
  if (routes.some((route) => route.executionPolicy === 'warm_restart')) {
    return 'dsl_patch_warm_restart';
  }
  return 'hot_runtime_patch';
}

function uniqueOwnerPackages(routes: readonly CapabilityAmendmentOperationRoute[]): CapabilityAmendmentExecutionPlan['ownerCapabilityPackages'] {
  const owners = new Map<string, { capabilityId: string; packageVersion: string; compilerId: string }>();
  for (const route of routes) {
    owners.set(route.ownerCapabilityId, {
      capabilityId: route.ownerCapabilityId,
      packageVersion: route.packageVersion,
      compilerId: route.compilerId
    });
  }
  return [...owners.values()].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
}

function blockedPlan(input: { diagnostics: CapabilityAmendmentDiagnostic[] }): CapabilityAmendmentExecutionPlan {
  return {
    artifactKind: CAPABILITY_AMENDMENT_EXECUTION_PLAN_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_EXECUTION_PLAN_SCHEMA_VERSION,
    status: 'blocked',
    operationRoutes: [],
    ownerCapabilityPackages: [],
    diagnostics: input.diagnostics
  };
}

function zodDiagnostics(
  code: 'AMENDMENT_IR_INVALID' | 'ACTIVE_LOCK_INVALID',
  result: { success: true } | { success: false; error: z.ZodError }
): CapabilityAmendmentDiagnostic[] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => ({
    code,
    message: `${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`
  }));
}
