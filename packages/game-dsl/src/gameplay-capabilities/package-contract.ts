import { z } from 'zod';

import { DeclarativeJsonObjectSchema, SafeDeclarativeJsonValueSchema } from './declarative-json.js';
import { GameplayCapabilityIdSchema, GameplayCapabilityVersionSchema, RuntimeFamilyIdSchema } from './ids.js';
import { hashStableJson } from './stable-json.js';

export const GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION = 'gameplay-capability-package.v1';
export const GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_KIND = 'capability_package_validation_report';
export const GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_SCHEMA_VERSION = 'capability_package_validation_report.v0.1';

export const CAPABILITY_COMPLETENESS_STATUSES = [
  'SCHEMA_ONLY',
  'SCHEMA_AND_IR',
  'RUNTIME_WITHOUT_QA',
  'COMPLETE_EXPERIMENTAL',
  'COMPLETE_SUPPORTED'
] as const;

export const GameplayCapabilityPackageStatusSchema = z.enum(['experimental', 'supported', 'deprecated', 'disabled']);
export const CapabilityCompletenessSchema = z.enum(CAPABILITY_COMPLETENESS_STATUSES);
export const PackageVersionSchema = z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9_.-]+)?$/);
const JsonPointerSchema = z.string().regex(/^\/(?:[^/~]|~0|~1)+(?:\/(?:[^/~]|~0|~1)+)*$/);
const DescriptorIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{2,120}$/);

export const GameplayCapabilityManifestSchema = z
  .strictObject({
    id: GameplayCapabilityIdSchema,
    packageVersion: PackageVersionSchema,
    capabilityVersion: GameplayCapabilityVersionSchema,
    status: GameplayCapabilityPackageStatusSchema,
    description: z.string().min(1).max(300),
    owners: z.array(z.string().min(1).max(80)).min(1).max(12),
    runtimeFamilies: z.array(RuntimeFamilyIdSchema).min(1).max(8),
    contractVersion: z.literal(GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION)
  })
  .superRefine((manifest, ctx) => {
    const idVersion = manifest.id.split('.').at(-1);
    if (manifest.capabilityVersion !== idVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['capabilityVersion'],
        message: `capabilityVersion ${manifest.capabilityVersion} must match manifest id suffix ${idVersion ?? '<missing>'}.`
      });
    }
  });

const CapabilityDependencySchema = z.strictObject({
  capabilityId: GameplayCapabilityIdSchema,
  range: z.string().min(1).max(80)
});

const CapabilityConflictSchema = z.strictObject({
  capabilityId: GameplayCapabilityIdSchema,
  reason: z.string().min(1).max(200)
});

const CapabilityProvidedInterfaceSchema = z.strictObject({
  id: DescriptorIdSchema,
  version: GameplayCapabilityVersionSchema
});

const RuntimeSystemDescriptorSchema = z.strictObject({
  id: DescriptorIdSchema,
  version: GameplayCapabilityVersionSchema,
  phase: z.enum(['bootstrap', 'scene', 'physics', 'input', 'gameplay', 'feedback', 'ui', 'telemetry']),
  dependencies: z.array(DescriptorIdSchema).max(20)
});

const CapabilityPatchDescriptorSchema = z.strictObject({
  id: DescriptorIdSchema,
  policy: z.enum(['hot_runtime_patch', 'warm_restart', 'regeneration_required', 'unsupported']),
  ownedPaths: z.array(JsonPointerSchema).min(1).max(40)
});

const AmendmentOperationDescriptorSchema = z.strictObject({
  operation: z.string().min(1).max(120),
  executionPolicy: z.enum(['hot_runtime_patch', 'warm_restart', 'regeneration_required', 'unsupported'])
});

export const CapabilityQaActionDescriptorSchema = z.strictObject({
  id: DescriptorIdSchema,
  kind: z.enum(['input', 'wait', 'spawn_entity', 'set_state', 'runtime_event']),
  target: z.string().min(1).max(160),
  parameters: DeclarativeJsonObjectSchema.default({})
});

export const CapabilityQaObservationDescriptorSchema = z.strictObject({
  id: DescriptorIdSchema,
  kind: z.enum(['runtime_event', 'state_probe', 'position_delta', 'camera_scroll', 'render_fidelity', 'amendment_effect']),
  runtimeSystemId: DescriptorIdSchema,
  ref: z.string().min(1).max(160)
});

export const CapabilityQaAssertionDescriptorSchema = z.strictObject({
  id: DescriptorIdSchema,
  observationId: DescriptorIdSchema,
  comparator: z.enum(['exists', 'equals', 'increased', 'decreased', 'changed', 'within_tolerance', 'minimum_count']),
  expected: SafeDeclarativeJsonValueSchema.optional(),
  tolerance: z.number().finite().nonnegative().optional(),
  message: z.string().min(1).max(240)
});

export const CapabilityQaProbeDescriptorSchema = z.strictObject({
  id: DescriptorIdSchema,
  capabilityId: GameplayCapabilityIdSchema,
  prerequisites: z.array(z.string().min(1).max(200)).min(1).max(40),
  actions: z.array(CapabilityQaActionDescriptorSchema).min(1).max(80),
  observations: z.array(CapabilityQaObservationDescriptorSchema).min(1).max(80),
  assertions: z.array(CapabilityQaAssertionDescriptorSchema).min(1).max(80),
  severity: z.enum(['required', 'optional']),
}).superRefine((probe, ctx) => {
  const observations = new Set(probe.observations.map((observation) => observation.id));
  probe.assertions.forEach((assertion, index) => {
    if (!observations.has(assertion.observationId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['assertions', index, 'observationId'],
        message: `QA assertion ${assertion.id} references unknown observation ${assertion.observationId}.`
      });
    }
  });
});

const CapabilityEvidenceRequirementSchema = z.strictObject({
  id: DescriptorIdSchema,
  artifactKind: z.string().min(1).max(120),
  required: z.boolean()
});

const CapabilityAssetRoleSchema = z.strictObject({
  role: z.string().min(1).max(80),
  required: z.boolean()
});

const CapabilitySceneBindingSchema = z.strictObject({
  id: DescriptorIdSchema,
  nodeKind: z.string().min(1).max(80)
});

const CapabilityDslMigrationSchema = z.strictObject({
  from: GameplayCapabilityVersionSchema,
  to: GameplayCapabilityVersionSchema,
  migrationId: DescriptorIdSchema
});

export const GameplayCapabilityPackageContractSchema = z
  .strictObject({
    manifest: GameplayCapabilityManifestSchema,
    dsl: z.strictObject({
      schemaFragmentId: DescriptorIdSchema,
      ownedPaths: z.array(JsonPointerSchema).min(1).max(80),
      normalizerId: DescriptorIdSchema,
      migrations: z.array(CapabilityDslMigrationSchema).max(20)
    }),
    ir: z.strictObject({
      compilerId: DescriptorIdSchema,
      ownedNodeKinds: z.array(z.string().min(1).max(80)).min(1).max(80)
    }),
    runtime: z.strictObject({
      families: z.array(RuntimeFamilyIdSchema).min(1).max(8),
      systems: z.array(RuntimeSystemDescriptorSchema).min(1).max(40)
    }),
    amendments: z.strictObject({
      supportedOperations: z.array(AmendmentOperationDescriptorSchema).min(1).max(80),
      compilerId: DescriptorIdSchema
    }),
    patch: z.strictObject({
      descriptors: z.array(CapabilityPatchDescriptorSchema).min(1).max(80)
    }),
    qa: z.strictObject({
      probes: z.array(CapabilityQaProbeDescriptorSchema).min(1).max(80),
      requiredEvidence: z.array(CapabilityEvidenceRequirementSchema).min(1).max(80)
    }),
    render: z.strictObject({
      assetRoles: z.array(CapabilityAssetRoleSchema).max(40),
      sceneBindings: z.array(CapabilitySceneBindingSchema).max(40),
      fallbackPolicy: z.enum(['not_applicable', 'required_assets_fail_closed', 'optional_assets_allowed'])
    }),
    dependencies: z.array(CapabilityDependencySchema).max(40),
    optionalDependencies: z.array(CapabilityDependencySchema).max(40),
    conflictsWith: z.array(CapabilityConflictSchema).max(40),
    provides: z.array(CapabilityProvidedInterfaceSchema).max(40),
    defaults: DeclarativeJsonObjectSchema,
    diagnostics: z.record(z.string(), z.string().min(1).max(300))
  })
  .superRefine((contract, ctx) => {
    for (const runtimeFamily of contract.runtime.families) {
      if (!contract.manifest.runtimeFamilies.includes(runtimeFamily)) {
        ctx.addIssue({
          code: 'custom',
          path: ['runtime', 'families'],
          message: `runtime family ${runtimeFamily} is not declared by manifest.runtimeFamilies.`
        });
      }
    }
    const overlappingOwnedPaths = findOverlappingJsonPointers(contract.dsl.ownedPaths);
    if (overlappingOwnedPaths !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['dsl', 'ownedPaths'],
        message: `overlapping owned DSL paths ${overlappingOwnedPaths.left} and ${overlappingOwnedPaths.right}.`
      });
    }
    contract.patch.descriptors.forEach((descriptor, descriptorIndex) => {
      descriptor.ownedPaths.forEach((ownedPath, ownedPathIndex) => {
        if (!isJsonPointerOwnedBy(ownedPath, contract.dsl.ownedPaths)) {
          ctx.addIssue({
            code: 'custom',
            path: ['patch', 'descriptors', descriptorIndex, 'ownedPaths', ownedPathIndex],
            message: `patch path ${ownedPath} must be within package DSL owned paths.`
          });
        }
      });
    });
    contract.qa.probes.forEach((probe, index) => {
      if (probe.capabilityId !== contract.manifest.id) {
        ctx.addIssue({
          code: 'custom',
          path: ['qa', 'probes', index, 'capabilityId'],
          message: `QA probe ${probe.id} capabilityId ${probe.capabilityId} must match ${contract.manifest.id}.`
        });
      }
      if (!probe.id.startsWith(`${contract.manifest.id}.`)) {
        ctx.addIssue({
          code: 'custom',
          path: ['qa', 'probes', index, 'id'],
          message: `QA probe ${probe.id} must be owned by ${contract.manifest.id}.`
        });
      }
    });
    contract.qa.requiredEvidence.forEach((evidence, index) => {
      if (!evidence.id.startsWith(`${contract.manifest.id}.`)) {
        ctx.addIssue({
          code: 'custom',
          path: ['qa', 'requiredEvidence', index, 'id'],
          message: `QA evidence ${evidence.id} must be owned by ${contract.manifest.id}.`
        });
      }
    });
  });

export type CapabilityCompleteness = z.infer<typeof CapabilityCompletenessSchema>;
export type CapabilityQaActionDescriptor = z.infer<typeof CapabilityQaActionDescriptorSchema>;
export type CapabilityQaObservationDescriptor = z.infer<typeof CapabilityQaObservationDescriptorSchema>;
export type CapabilityQaAssertionDescriptor = z.infer<typeof CapabilityQaAssertionDescriptorSchema>;
export type CapabilityQaProbeDescriptor = z.infer<typeof CapabilityQaProbeDescriptorSchema>;
export type GameplayCapabilityManifest = z.infer<typeof GameplayCapabilityManifestSchema>;
export type GameplayCapabilityPackageContract = z.infer<typeof GameplayCapabilityPackageContractSchema>;

export type GameplayCapabilityPackageValidationIssue = {
  code: 'PACKAGE_SCHEMA_INVALID' | 'SUPPORTED_PACKAGE_INCOMPLETE' | 'OWNED_DSL_PATH_CONFLICT' | 'DUPLICATE_PACKAGE_ID';
  packageId?: string;
  path: string;
  message: string;
};

export type GameplayCapabilityPackageValidationReport = {
  artifactKind: typeof GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_KIND;
  schemaVersion: typeof GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_SCHEMA_VERSION;
  contractVersion: typeof GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION;
  status: 'valid' | 'invalid';
  packageId?: string;
  packageVersion?: string;
  completeness: CapabilityCompleteness;
  supportEligible: boolean;
  manifestHash?: string;
  packageHash?: string;
  issues: GameplayCapabilityPackageValidationIssue[];
};

export type GameplayCapabilityPackageSetValidationReport = {
  artifactKind: typeof GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_KIND;
  schemaVersion: typeof GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_SCHEMA_VERSION;
  contractVersion: typeof GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION;
  status: 'valid' | 'invalid';
  packageCount: number;
  reports: GameplayCapabilityPackageValidationReport[];
  issues: GameplayCapabilityPackageValidationIssue[];
};

export function validateGameplayCapabilityPackage(input: unknown): GameplayCapabilityPackageValidationReport {
  const parsed = GameplayCapabilityPackageContractSchema.safeParse(input);
  if (!parsed.success) {
    return {
      artifactKind: GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_KIND,
      schemaVersion: GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_SCHEMA_VERSION,
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
      status: 'invalid',
      completeness: 'SCHEMA_ONLY',
      supportEligible: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'PACKAGE_SCHEMA_INVALID',
        path: issue.path.map(String).join('.') || '<root>',
        message: issue.message
      }))
    };
  }

  const contract = parsed.data;
  const completeness = deriveGameplayCapabilityPackageCompleteness(contract);
  const issues: GameplayCapabilityPackageValidationIssue[] = [];
  if (contract.manifest.status === 'supported' && completeness !== 'COMPLETE_SUPPORTED') {
    issues.push({
      code: 'SUPPORTED_PACKAGE_INCOMPLETE',
      packageId: contract.manifest.id,
      path: 'manifest.status',
      message: `supported package ${contract.manifest.id} is ${completeness}, not COMPLETE_SUPPORTED.`
    });
  }

  return {
    artifactKind: GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_SCHEMA_VERSION,
    contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
    status: issues.length === 0 ? 'valid' : 'invalid',
    packageId: contract.manifest.id,
    packageVersion: contract.manifest.packageVersion,
    completeness,
    supportEligible: completeness === 'COMPLETE_SUPPORTED' && issues.length === 0,
    manifestHash: hashStableJson(contract.manifest),
    packageHash: hashStableJson(contract),
    issues
  };
}

export function validateGameplayCapabilityPackages(packages: readonly unknown[]): GameplayCapabilityPackageSetValidationReport {
  const reports = packages.map(validateGameplayCapabilityPackage);
  const issues = reports.flatMap((report) => report.issues);
  const ownedPathOwners: Array<{ owner: string; path: string }> = [];
  const packageIds = new Set<string>();

  packages.forEach((candidate) => {
    const parsed = GameplayCapabilityPackageContractSchema.safeParse(candidate);
    if (!parsed.success) {
      return;
    }
    if (packageIds.has(parsed.data.manifest.id)) {
      issues.push({
        code: 'DUPLICATE_PACKAGE_ID',
        packageId: parsed.data.manifest.id,
        path: 'manifest.id',
        message: `Duplicate gameplay capability package id ${parsed.data.manifest.id}.`
      });
    }
    packageIds.add(parsed.data.manifest.id);

    for (const ownedPath of parsed.data.dsl.ownedPaths) {
      const conflict = ownedPathOwners.find((existing) => existing.owner !== parsed.data.manifest.id && jsonPointersOverlap(existing.path, ownedPath));
      if (conflict !== undefined) {
        issues.push({
          code: 'OWNED_DSL_PATH_CONFLICT',
          packageId: parsed.data.manifest.id,
          path: 'dsl.ownedPaths',
          message: `DSL paths ${conflict.path} and ${ownedPath} overlap between ${conflict.owner} and ${parsed.data.manifest.id}.`
        });
      }
      ownedPathOwners.push({ owner: parsed.data.manifest.id, path: ownedPath });
    }
  });

  return {
    artifactKind: GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_PACKAGE_VALIDATION_REPORT_SCHEMA_VERSION,
    contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
    status: issues.length === 0 ? 'valid' : 'invalid',
    packageCount: packages.length,
    reports,
    issues
  };
}

export function deriveGameplayCapabilityPackageCompleteness(contract: GameplayCapabilityPackageContract): CapabilityCompleteness {
  const hasDsl = contract.dsl.ownedPaths.length > 0 && contract.dsl.schemaFragmentId.length > 0 && contract.dsl.normalizerId.length > 0;
  const hasIr = contract.ir.ownedNodeKinds.length > 0 && contract.ir.compilerId.length > 0;
  const hasRuntime = contract.runtime.systems.length > 0;
  const hasAmendments = contract.amendments.supportedOperations.length > 0 && contract.patch.descriptors.length > 0;
  const requiredProbes = contract.qa.probes.filter((probe) => probe.severity === 'required');
  const hasQa = requiredProbes.length > 0 && contract.qa.requiredEvidence.some((evidence) => evidence.required);
  const hasRender = contract.render.fallbackPolicy.length > 0;

  if (!hasDsl || !hasIr) {
    return 'SCHEMA_ONLY';
  }
  if (!hasRuntime) {
    return 'SCHEMA_AND_IR';
  }
  if (!hasAmendments || !hasQa || !hasRender) {
    return 'RUNTIME_WITHOUT_QA';
  }
  return contract.manifest.status === 'supported' ? 'COMPLETE_SUPPORTED' : 'COMPLETE_EXPERIMENTAL';
}

function findOverlappingJsonPointers(values: readonly string[]): { left: string; right: string } | undefined {
  for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < values.length; rightIndex += 1) {
      if (jsonPointersOverlap(values[leftIndex], values[rightIndex])) {
        return { left: values[leftIndex], right: values[rightIndex] };
      }
    }
  }
  return undefined;
}

function isJsonPointerOwnedBy(path: string, ownedPaths: readonly string[]): boolean {
  return ownedPaths.some((ownedPath) => path === ownedPath || path.startsWith(`${ownedPath}/`));
}

function jsonPointersOverlap(left: string, right: string): boolean {
  return isJsonPointerOwnedBy(left, [right]) || isJsonPointerOwnedBy(right, [left]);
}
