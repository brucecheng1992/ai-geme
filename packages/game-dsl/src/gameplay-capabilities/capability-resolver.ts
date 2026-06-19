import { z } from 'zod';

import {
  GameplayCapabilityPackageContractSchema,
  validateGameplayCapabilityPackage,
  validateGameplayCapabilityPackages,
  type GameplayCapabilityPackageContract,
  type GameplayCapabilityPackageValidationReport
} from './package-contract.js';
import { GameplayCapabilityIdSchema, RuntimeFamilyIdSchema } from './registry.js';
import {
  GAMEPLAY_CAPABILITY_LOCK_KIND,
  GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION,
  GameplayCapabilityLockSchema,
  type GameplayCapabilityLock
} from './capability-lock.js';
import { hashStableJson } from './stable-json.js';

export const GAMEPLAY_CAPABILITY_RESOLUTION_REPORT_KIND = 'gameplay_capability_resolution_report';
export const GAMEPLAY_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION = 'gameplay_capability_resolution_report.v0.1';

export type CapabilityResolutionDiagnostic = {
  code:
    | 'MISSING_CAPABILITY'
    | 'VERSION_CONFLICT'
    | 'INCOMPATIBLE_CAPABILITIES'
    | 'DEPENDENCY_CYCLE'
    | 'RUNTIME_FAMILY_MISMATCH'
    | 'INCOMPLETE_PACKAGE';
  requestedBy: string[];
  capabilityId: string;
  explanation: string;
  remediation: string[];
};

export type CapabilityRequiresOneOf = {
  ownerCapabilityId: string;
  groupId: string;
  options: Array<{ capabilityId: string; range: string; reason: string }>;
};

export type GameplayCapabilityResolutionReport = {
  artifactKind: typeof GAMEPLAY_CAPABILITY_RESOLUTION_REPORT_KIND;
  schemaVersion: typeof GAMEPLAY_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION;
  status: 'resolved' | 'blocked';
  runtimeFamily?: string;
  requestedCapabilityIds: string[];
  selectedCapabilityIds: string[];
  deferredOptionalCapabilityIds: string[];
  lock?: GameplayCapabilityLock;
  diagnostics: CapabilityResolutionDiagnostic[];
};

type ResolverCandidate = {
  contract: GameplayCapabilityPackageContract;
  report: GameplayCapabilityPackageValidationReport;
};

type QueueItem = {
  capabilityId: string;
  requestedBy: string[];
  range?: string;
};

export function resolveGameplayCapabilityGraph(input: {
  requestedCapabilities: readonly string[];
  packages: readonly unknown[];
  runtimeFamily: string;
  activeLock?: unknown;
  allowedVersionChanges?: readonly string[];
  allowedCapabilityRemovals?: readonly string[];
  requiresOneOf?: readonly CapabilityRequiresOneOf[];
}): GameplayCapabilityResolutionReport {
  const diagnostics: CapabilityResolutionDiagnostic[] = [];
  const runtimeFamily = RuntimeFamilyIdSchema.safeParse(input.runtimeFamily);
  const requestedCapabilities = parseCapabilityIds(input.requestedCapabilities, diagnostics);
  const activeLock = input.activeLock === undefined ? undefined : GameplayCapabilityLockSchema.safeParse(input.activeLock);
  const candidates = buildCandidateMap(input.packages);
  const selected = new Map<string, ResolverCandidate>();
  const deferredOptionalCapabilityIds = new Set<string>();
  const queue: QueueItem[] = requestedCapabilities.map((capabilityId) => ({ capabilityId, requestedBy: ['profile_request'] }));
  const allowedVersionChanges = new Set(input.allowedVersionChanges ?? []);
  const allowedCapabilityRemovals = new Set(input.allowedCapabilityRemovals ?? []);

  if (!runtimeFamily.success) {
    pushDiagnostic(diagnostics, {
      code: 'RUNTIME_FAMILY_MISMATCH',
      capabilityId: '<runtime>',
      requestedBy: ['profile_request'],
      explanation: `Runtime family ${input.runtimeFamily} is not a valid runtime family id.`,
      remediation: ['Use a versioned runtime family id such as phaser_2d_action_arcade.v1.']
    });
  }

  if (activeLock !== undefined && !activeLock.success) {
    pushDiagnostic(diagnostics, {
      code: 'VERSION_CONFLICT',
      capabilityId: '<lock>',
      requestedBy: ['active_lock'],
      explanation: 'The active gameplay capability lock is invalid and cannot be reused.',
      remediation: ['Regenerate a valid gameplay_capability_lock.json before resolving amendments.']
    });
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (selected.has(item.capabilityId)) {
      continue;
    }
    const candidate = selectCandidate({
      capabilityId: item.capabilityId,
      range: item.range,
      requestedBy: item.requestedBy,
      candidates,
      runtimeFamily: runtimeFamily.success ? runtimeFamily.data : input.runtimeFamily,
      activeLock: activeLock?.success === true ? activeLock.data : undefined,
      allowedVersionChanges,
      diagnostics,
      required: true
    });
    if (candidate === undefined) {
      continue;
    }
    selected.set(item.capabilityId, candidate);

    for (const dependency of candidate.contract.dependencies) {
      queue.push({
        capabilityId: dependency.capabilityId,
        range: dependency.range,
        requestedBy: [candidate.contract.manifest.id]
      });
    }

    for (const dependency of candidate.contract.optionalDependencies) {
      const optionalCandidate = selectCandidate({
        capabilityId: dependency.capabilityId,
        range: dependency.range,
        requestedBy: [candidate.contract.manifest.id],
        candidates,
        runtimeFamily: runtimeFamily.success ? runtimeFamily.data : input.runtimeFamily,
        activeLock: activeLock?.success === true ? activeLock.data : undefined,
        allowedVersionChanges,
        diagnostics,
        required: false
      });
      if (optionalCandidate === undefined) {
        deferredOptionalCapabilityIds.add(dependency.capabilityId);
        continue;
      }
      if (!selected.has(dependency.capabilityId)) {
        selected.set(dependency.capabilityId, optionalCandidate);
        queue.push({ capabilityId: dependency.capabilityId, range: dependency.range, requestedBy: [candidate.contract.manifest.id] });
      }
    }
  }

  applyRequiresOneOf({
    requiresOneOf: input.requiresOneOf ?? [],
    selected,
    candidates,
    runtimeFamily: runtimeFamily.success ? runtimeFamily.data : input.runtimeFamily,
    activeLock: activeLock?.success === true ? activeLock.data : undefined,
    allowedVersionChanges,
    diagnostics
  });
  closeSelectedDependencyClosure({
    selected,
    candidates,
    runtimeFamily: runtimeFamily.success ? runtimeFamily.data : input.runtimeFamily,
    activeLock: activeLock?.success === true ? activeLock.data : undefined,
    allowedVersionChanges,
    deferredOptionalCapabilityIds,
    diagnostics
  });

  for (const candidate of selected.values()) {
    for (const conflict of candidate.contract.conflictsWith) {
      if (selected.has(conflict.capabilityId)) {
        pushDiagnostic(diagnostics, {
          code: 'INCOMPATIBLE_CAPABILITIES',
          capabilityId: candidate.contract.manifest.id,
          requestedBy: [conflict.capabilityId],
          explanation: `${candidate.contract.manifest.id} conflicts with ${conflict.capabilityId}: ${conflict.reason}`,
          remediation: [`Remove either ${candidate.contract.manifest.id} or ${conflict.capabilityId} from the requested capability set.`]
        });
      }
    }
  }

  for (const cycle of findDependencyCycles(selected)) {
    pushDiagnostic(diagnostics, {
      code: 'DEPENDENCY_CYCLE',
      capabilityId: cycle[0],
      requestedBy: cycle.slice(1),
      explanation: `Capability dependency cycle detected: ${cycle.join(' -> ')}.`,
      remediation: ['Break the dependency cycle before DSL generation.']
    });
  }

  const selectedPackages = [...selected.values()].sort(compareCandidates);
  const selectedPackageSetReport = validateGameplayCapabilityPackages(selectedPackages.map((candidate) => candidate.contract));
  for (const issue of selectedPackageSetReport.issues) {
    pushDiagnostic(diagnostics, {
      code: 'INCOMPLETE_PACKAGE',
      capabilityId: issue.packageId ?? '<package_set>',
      requestedBy: ['selected_package_set'],
      explanation: `Selected package set is invalid: ${issue.message}`,
      remediation: ['Resolve package ownership conflicts before writing gameplay_capability_lock.json.']
    });
  }
  if (activeLock?.success === true) {
    const selectedIds = new Set(selectedPackages.map((candidate) => candidate.contract.manifest.id));
    for (const lockedCapabilityId of activeLock.data.capabilityIds) {
      if (!selectedIds.has(lockedCapabilityId) && !allowedCapabilityRemovals.has(lockedCapabilityId)) {
        pushDiagnostic(diagnostics, {
          code: 'VERSION_CONFLICT',
          capabilityId: lockedCapabilityId,
          requestedBy: ['active_lock'],
          explanation: `Active lock contains ${lockedCapabilityId}, but the new resolution would remove it without explicit removal permission.`,
          remediation: [`Pass an explicit allowedCapabilityRemovals entry for ${lockedCapabilityId} or keep it in the requested capability graph.`]
        });
      }
    }
  }
  const lock =
    diagnostics.length === 0 && runtimeFamily.success
      ? buildGameplayCapabilityLock({
          runtimeFamily: runtimeFamily.data,
          selectedPackages
        })
      : undefined;

  return {
    artifactKind: GAMEPLAY_CAPABILITY_RESOLUTION_REPORT_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION,
    status: diagnostics.length === 0 ? 'resolved' : 'blocked',
    runtimeFamily: runtimeFamily.success ? runtimeFamily.data : undefined,
    requestedCapabilityIds: requestedCapabilities,
    selectedCapabilityIds: selectedPackages.map((entry) => entry.contract.manifest.id),
    deferredOptionalCapabilityIds: [...deferredOptionalCapabilityIds].sort(),
    ...(lock === undefined ? {} : { lock }),
    diagnostics
  };
}

function selectCandidate(input: {
  capabilityId: string;
  range?: string;
  requestedBy: string[];
  candidates: ReadonlyMap<string, ResolverCandidate[]>;
  runtimeFamily: string;
  activeLock?: z.infer<typeof GameplayCapabilityLockSchema>;
  allowedVersionChanges: ReadonlySet<string>;
  diagnostics: CapabilityResolutionDiagnostic[];
  required: boolean;
}): ResolverCandidate | undefined {
  const candidates = input.candidates.get(input.capabilityId) ?? [];
  if (candidates.length === 0) {
    if (input.required) {
      pushDiagnostic(input.diagnostics, {
        code: 'MISSING_CAPABILITY',
        capabilityId: input.capabilityId,
        requestedBy: input.requestedBy,
        explanation: `No package candidate exists for capability ${input.capabilityId}.`,
        remediation: [`Install or implement a package for ${input.capabilityId}.`]
      });
    }
    return undefined;
  }

  const rangeMatched = candidates.filter((candidate) => capabilityVersionMatches(candidate.contract.manifest.capabilityVersion, input.range));
  if (rangeMatched.length === 0) {
    if (input.required) {
      pushDiagnostic(input.diagnostics, {
        code: 'VERSION_CONFLICT',
        capabilityId: input.capabilityId,
        requestedBy: input.requestedBy,
        explanation: `No package for ${input.capabilityId} satisfies version range ${input.range ?? '*'}.`,
        remediation: [`Choose a capability package version that satisfies ${input.range ?? '*'}.`]
      });
    }
    return undefined;
  }

  const runtimeMatched = rangeMatched.filter((candidate) => candidate.contract.manifest.runtimeFamilies.includes(input.runtimeFamily));
  if (runtimeMatched.length === 0) {
    if (input.required) {
      pushDiagnostic(input.diagnostics, {
        code: 'RUNTIME_FAMILY_MISMATCH',
        capabilityId: input.capabilityId,
        requestedBy: input.requestedBy,
        explanation: `${input.capabilityId} has packages, but none support runtime family ${input.runtimeFamily}.`,
        remediation: [`Use a package for ${input.runtimeFamily} or choose a compatible runtime family.`]
      });
    }
    return undefined;
  }

  const complete = runtimeMatched.filter((candidate) => candidate.report.supportEligible);
  if (complete.length === 0) {
    if (input.required) {
      pushDiagnostic(input.diagnostics, {
        code: 'INCOMPLETE_PACKAGE',
        capabilityId: input.capabilityId,
        requestedBy: input.requestedBy,
        explanation: `${input.capabilityId} has no COMPLETE_SUPPORTED package candidate.`,
        remediation: ['Complete the package contract, runtime module, amendment operations, QA probes, and required evidence.']
      });
    }
    return undefined;
  }

  const activePackage = input.activeLock?.packages.find((entry) => entry.capabilityId === input.capabilityId);
  if (activePackage !== undefined && !input.allowedVersionChanges.has(input.capabilityId)) {
    const pinned = complete.find((candidate) => {
      const packageHash = candidate.report.packageHash ?? hashStableJson(candidate.contract);
      return candidate.contract.manifest.packageVersion === activePackage.packageVersion && packageHash === activePackage.packageHash;
    });
    if (pinned === undefined) {
      pushDiagnostic(input.diagnostics, {
        code: 'VERSION_CONFLICT',
        capabilityId: input.capabilityId,
        requestedBy: ['active_lock', ...input.requestedBy],
        explanation: `Active lock pins ${input.capabilityId}@${activePackage.packageVersion}, but that exact package hash is unavailable.`,
        remediation: [`Provide the locked package or create an explicit capability upgrade candidate for ${input.capabilityId}.`]
      });
      return undefined;
    }
    return pinned;
  }

  return [...complete].sort(compareCandidatesByVersion).at(0);
}

function applyRequiresOneOf(input: {
  requiresOneOf: readonly CapabilityRequiresOneOf[];
  selected: Map<string, ResolverCandidate>;
  candidates: ReadonlyMap<string, ResolverCandidate[]>;
  runtimeFamily: string;
  activeLock?: z.infer<typeof GameplayCapabilityLockSchema>;
  allowedVersionChanges: ReadonlySet<string>;
  diagnostics: CapabilityResolutionDiagnostic[];
}): void {
  for (const requirement of input.requiresOneOf) {
    if (!input.selected.has(requirement.ownerCapabilityId)) {
      continue;
    }
    const existing = requirement.options.find((option) => input.selected.has(option.capabilityId));
    if (existing !== undefined) {
      continue;
    }
    const sortedOptions = [...requirement.options].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
    let selectedOption: ResolverCandidate | undefined;
    for (const option of sortedOptions) {
      selectedOption = selectCandidate({
        capabilityId: option.capabilityId,
        range: option.range,
        requestedBy: [requirement.ownerCapabilityId, requirement.groupId],
        candidates: input.candidates,
        runtimeFamily: input.runtimeFamily,
        activeLock: input.activeLock,
        allowedVersionChanges: input.allowedVersionChanges,
        diagnostics: input.diagnostics,
        required: false
      });
      if (selectedOption !== undefined) {
        input.selected.set(option.capabilityId, selectedOption);
        break;
      }
    }
    if (selectedOption === undefined) {
      pushDiagnostic(input.diagnostics, {
        code: 'MISSING_CAPABILITY',
        capabilityId: requirement.ownerCapabilityId,
        requestedBy: [requirement.groupId],
        explanation: `${requirement.ownerCapabilityId} requires one of: ${sortedOptions.map((option) => option.capabilityId).join(', ')}.`,
        remediation: sortedOptions.map((option) => `Install a supported package for ${option.capabilityId}.`)
      });
    }
  }
}

function closeSelectedDependencyClosure(input: {
  selected: Map<string, ResolverCandidate>;
  candidates: ReadonlyMap<string, ResolverCandidate[]>;
  runtimeFamily: string;
  activeLock?: z.infer<typeof GameplayCapabilityLockSchema>;
  allowedVersionChanges: ReadonlySet<string>;
  deferredOptionalCapabilityIds: Set<string>;
  diagnostics: CapabilityResolutionDiagnostic[];
}): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of [...input.selected.values()]) {
      for (const dependency of candidate.contract.dependencies) {
        if (input.selected.has(dependency.capabilityId)) {
          continue;
        }
        const dependencyCandidate = selectCandidate({
          capabilityId: dependency.capabilityId,
          range: dependency.range,
          requestedBy: [candidate.contract.manifest.id],
          candidates: input.candidates,
          runtimeFamily: input.runtimeFamily,
          activeLock: input.activeLock,
          allowedVersionChanges: input.allowedVersionChanges,
          diagnostics: input.diagnostics,
          required: true
        });
        if (dependencyCandidate !== undefined) {
          input.selected.set(dependency.capabilityId, dependencyCandidate);
          changed = true;
        }
      }
      for (const dependency of candidate.contract.optionalDependencies) {
        if (input.selected.has(dependency.capabilityId)) {
          continue;
        }
        const dependencyCandidate = selectCandidate({
          capabilityId: dependency.capabilityId,
          range: dependency.range,
          requestedBy: [candidate.contract.manifest.id],
          candidates: input.candidates,
          runtimeFamily: input.runtimeFamily,
          activeLock: input.activeLock,
          allowedVersionChanges: input.allowedVersionChanges,
          diagnostics: input.diagnostics,
          required: false
        });
        if (dependencyCandidate === undefined) {
          input.deferredOptionalCapabilityIds.add(dependency.capabilityId);
          continue;
        }
        input.selected.set(dependency.capabilityId, dependencyCandidate);
        changed = true;
      }
    }
  }
}

function buildCandidateMap(packages: readonly unknown[]): Map<string, ResolverCandidate[]> {
  const candidates = new Map<string, ResolverCandidate[]>();
  for (const candidate of packages) {
    const parsed = GameplayCapabilityPackageContractSchema.safeParse(candidate);
    if (!parsed.success) {
      continue;
    }
    const report = validateGameplayCapabilityPackage(parsed.data);
    const list = candidates.get(parsed.data.manifest.id) ?? [];
    list.push({ contract: parsed.data, report });
    candidates.set(parsed.data.manifest.id, list.sort(compareCandidatesByVersion));
  }
  return candidates;
}

function buildGameplayCapabilityLock(input: { runtimeFamily: string; selectedPackages: readonly ResolverCandidate[] }): GameplayCapabilityLock {
  const packages = input.selectedPackages.map((candidate) => ({
    capabilityId: candidate.contract.manifest.id,
    packageVersion: candidate.contract.manifest.packageVersion,
    packageHash: candidate.report.packageHash ?? hashStableJson(candidate.contract)
  }));
  const payload: Omit<GameplayCapabilityLock, 'lockHash'> = {
    artifactKind: GAMEPLAY_CAPABILITY_LOCK_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION,
    profileId: 'resolved_capability_graph',
    runtimeFamily: input.runtimeFamily,
    capabilityIds: packages.map((entry) => entry.capabilityId),
    packages
  };
  return { ...payload, lockHash: hashStableJson(payload) };
}

function findDependencyCycles(selected: ReadonlyMap<string, ResolverCandidate>): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(capabilityId: string, path: string[]): void {
    if (visiting.has(capabilityId)) {
      const cycleStart = path.indexOf(capabilityId);
      cycles.push([...path.slice(cycleStart), capabilityId]);
      return;
    }
    if (visited.has(capabilityId)) {
      return;
    }
    visiting.add(capabilityId);
    const candidate = selected.get(capabilityId);
    if (candidate !== undefined) {
      for (const dependency of candidate.contract.dependencies) {
        if (selected.has(dependency.capabilityId)) {
          visit(dependency.capabilityId, [...path, dependency.capabilityId]);
        }
      }
    }
    visiting.delete(capabilityId);
    visited.add(capabilityId);
  }

  for (const capabilityId of [...selected.keys()].sort()) {
    visit(capabilityId, [capabilityId]);
  }
  return cycles;
}

function parseCapabilityIds(values: readonly string[], diagnostics: CapabilityResolutionDiagnostic[]): string[] {
  const parsedValues: string[] = [];
  for (const value of values) {
    const parsed = GameplayCapabilityIdSchema.safeParse(value);
    if (!parsed.success) {
      pushDiagnostic(diagnostics, {
        code: 'MISSING_CAPABILITY',
        capabilityId: value,
        requestedBy: ['profile_request'],
        explanation: `${value} is not a valid gameplay capability id.`,
        remediation: ['Use a capability id in domain.name.vN format.']
      });
      continue;
    }
    parsedValues.push(parsed.data);
  }
  return [...new Set(parsedValues)].sort();
}

function capabilityVersionMatches(version: string, range: string | undefined): boolean {
  if (range === undefined || range === '*' || range === version) {
    return true;
  }
  const versionNumber = parseCapabilityVersion(version);
  if (range.startsWith('^v')) {
    return versionNumber === parseCapabilityVersion(range.slice(1));
  }
  if (range.startsWith('>=v')) {
    return versionNumber >= parseCapabilityVersion(range.slice(2));
  }
  return false;
}

function parseCapabilityVersion(value: string): number {
  const match = /^v([1-9][0-9]*)$/.exec(value);
  return match === null ? Number.NaN : Number(match[1]);
}

function compareCandidates(left: ResolverCandidate, right: ResolverCandidate): number {
  return left.contract.manifest.id.localeCompare(right.contract.manifest.id) || comparePackageVersionDesc(left.contract.manifest.packageVersion, right.contract.manifest.packageVersion);
}

function compareCandidatesByVersion(left: ResolverCandidate, right: ResolverCandidate): number {
  return comparePackageVersionDesc(left.contract.manifest.packageVersion, right.contract.manifest.packageVersion) || left.contract.manifest.id.localeCompare(right.contract.manifest.id);
}

function comparePackageVersionDesc(left: string, right: string): number {
  return comparePackageVersion(right, left);
}

function comparePackageVersion(left: string, right: string): number {
  const leftVersion = parsePackageVersion(left);
  const rightVersion = parsePackageVersion(right);
  for (const key of ['major', 'minor', 'patch'] as const) {
    const delta = leftVersion[key] - rightVersion[key];
    if (delta !== 0) {
      return delta;
    }
  }
  if (leftVersion.prerelease.length === 0 && rightVersion.prerelease.length === 0) {
    return 0;
  }
  if (leftVersion.prerelease.length === 0) {
    return 1;
  }
  if (rightVersion.prerelease.length === 0) {
    return -1;
  }
  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

function parsePackageVersion(value: string): { major: number; minor: number; patch: number; prerelease: string[] } {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([A-Za-z0-9_.-]+))?$/.exec(value);
  if (match === null) {
    return { major: 0, minor: 0, patch: 0, prerelease: [value] };
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] === undefined ? [] : match[4].split(/[._-]/).filter((part) => part.length > 0)
  };
}

function comparePrerelease(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) {
      return -1;
    }
    if (rightPart === undefined) {
      return 1;
    }
    const leftNumber = numericPrereleaseIdentifier(leftPart);
    const rightNumber = numericPrereleaseIdentifier(rightPart);
    if (leftNumber !== undefined && rightNumber !== undefined) {
      const delta = leftNumber - rightNumber;
      if (delta !== 0) {
        return delta;
      }
      continue;
    }
    if (leftNumber !== undefined) {
      return -1;
    }
    if (rightNumber !== undefined) {
      return 1;
    }
    const delta = leftPart.localeCompare(rightPart);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

function numericPrereleaseIdentifier(value: string): number | undefined {
  return /^[0-9]+$/.test(value) ? Number(value) : undefined;
}

function pushDiagnostic(diagnostics: CapabilityResolutionDiagnostic[], diagnostic: CapabilityResolutionDiagnostic): void {
  const normalized: CapabilityResolutionDiagnostic = {
    ...diagnostic,
    requestedBy: [...new Set(diagnostic.requestedBy)].sort(),
    remediation: [...diagnostic.remediation]
  };
  const key = `${normalized.code}:${normalized.capabilityId}:${normalized.requestedBy.join(',')}:${normalized.explanation}`;
  const exists = diagnostics.some((item) => `${item.code}:${item.capabilityId}:${item.requestedBy.join(',')}:${item.explanation}` === key);
  if (!exists) {
    diagnostics.push(normalized);
  }
}
