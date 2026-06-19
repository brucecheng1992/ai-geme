import { z } from 'zod';

import { hashStableJson } from './stable-json.js';
import { DeclarativeJsonObjectSchema, SafeDeclarativeJsonValueSchema } from './declarative-json.js';
import {
  findGameplayCapability,
  GameplayCapabilityIdSchema,
  GameplayCapabilityRegistry,
  GameplayProfileIdSchema,
  type GameplayCapabilityRegistry as GameplayCapabilityRegistryContract
} from './registry.js';

export const CAPABILITY_GAME_DSL_CONTRACT_VERSION = 'capability-game-dsl.v0.1';
export const CAPABILITY_GAME_DSL_VALIDATION_REPORT_KIND = 'capability_game_dsl_validation_report';
export const CAPABILITY_GAME_DSL_VALIDATION_REPORT_SCHEMA_VERSION = 'capability_game_dsl_validation_report.v0.1';
export const LEGACY_DSL_ADAPTER_REPORT_KIND = 'legacy_dsl_adapter_report';
export const LEGACY_DSL_ADAPTER_REPORT_SCHEMA_VERSION = 'legacy_dsl_adapter_report.v0.1';

export const CapabilityDslNodeKinds = ['component', 'behavior', 'condition', 'action', 'goal'] as const;
export type CapabilityDslNodeKind = (typeof CapabilityDslNodeKinds)[number];

const StableDslIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_.-]{1,79}$/)
  .refine((value) => value.split(/[.-]/).every((segment) => !/^\d+$/.test(segment)), 'stable IDs cannot be raw array-index refs');

const CapabilityTypedNodeSchema = z.strictObject({
  id: StableDslIdSchema,
  type: GameplayCapabilityIdSchema,
  config: SafeDeclarativeJsonValueSchema
});

const StableSelectorSchema = z.strictObject({
  id: StableDslIdSchema.optional(),
  role: StableDslIdSchema.optional(),
  tags: z.array(StableDslIdSchema).optional()
});

const EntitySchema = z.strictObject({
  id: StableDslIdSchema,
  role: StableDslIdSchema.optional(),
  tags: z.array(StableDslIdSchema).optional(),
  components: z.array(CapabilityTypedNodeSchema).max(80),
  behaviors: z.array(CapabilityTypedNodeSchema).max(80)
});

const RuleSchema = z.strictObject({
  id: StableDslIdSchema,
  when: z.strictObject({
    event: z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/),
    sourceSelector: StableSelectorSchema.optional()
  }),
  conditions: z.array(CapabilityTypedNodeSchema).max(40),
  actions: z.array(CapabilityTypedNodeSchema).min(1).max(40)
});

export const CapabilityBackedGameDslSchema = z.strictObject({
  contractVersion: z.literal(CAPABILITY_GAME_DSL_CONTRACT_VERSION),
  profile: z.strictObject({ id: GameplayProfileIdSchema }),
  capabilities: z.array(GameplayCapabilityIdSchema).min(1).max(120),
  scenes: z.array(z.strictObject({ id: StableDslIdSchema, tags: z.array(StableDslIdSchema).optional() })).max(40),
  entities: z.array(EntitySchema).max(200),
  rules: z.array(RuleSchema).max(200),
  goals: z.array(CapabilityTypedNodeSchema).max(40),
  assets: DeclarativeJsonObjectSchema,
  ui: DeclarativeJsonObjectSchema,
  metadata: DeclarativeJsonObjectSchema
});

export type CapabilityBackedGameDsl = z.infer<typeof CapabilityBackedGameDslSchema>;
export type CapabilityTypedNode = z.infer<typeof CapabilityTypedNodeSchema>;

export type CapabilityDslSchemaFragment = {
  capabilityId: string;
  nodeKinds: CapabilityDslNodeKind[];
  configSchema: z.ZodType<unknown>;
};

export type CapabilityDslValidationIssue = {
  code:
    | 'BASE_SCHEMA_INVALID'
    | 'DUPLICATE_STABLE_ID'
    | 'UNKNOWN_CAPABILITY'
    | 'CAPABILITY_NOT_DECLARED'
    | 'SCHEMA_FRAGMENT_MISSING'
    | 'SCHEMA_FRAGMENT_DUPLICATE'
    | 'CONFIG_SCHEMA_INVALID';
  path: string;
  message: string;
  capabilityId?: string;
};

export type CapabilityDslOwnedNode = {
  path: string;
  nodeKind: CapabilityDslNodeKind;
  id: string;
  type: string;
  ownerCapabilityId?: string;
  status: 'owned' | 'invalid';
};

export type CapabilityDslValidationReport = {
  artifactKind: typeof CAPABILITY_GAME_DSL_VALIDATION_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_GAME_DSL_VALIDATION_REPORT_SCHEMA_VERSION;
  contractVersion: typeof CAPABILITY_GAME_DSL_CONTRACT_VERSION;
  status: 'valid' | 'invalid';
  pass1: 'passed' | 'failed';
  pass2: 'passed' | 'failed' | 'skipped';
  profileId?: string;
  declaredCapabilities: string[];
  ownedNodes: CapabilityDslOwnedNode[];
  issues: CapabilityDslValidationIssue[];
  dslHash?: string;
};

export type LegacyDslAdapterMapping = {
  legacyPath: string;
  capabilityPath: string;
  capabilityId: string;
  status: 'mapped' | 'unsupported' | 'deferred';
};

export type LegacyDslAdapterReport = {
  artifactKind: typeof LEGACY_DSL_ADAPTER_REPORT_KIND;
  schemaVersion: typeof LEGACY_DSL_ADAPTER_REPORT_SCHEMA_VERSION;
  status: 'valid' | 'invalid';
  mappings: LegacyDslAdapterMapping[];
  errors: Array<{ path: string; message: string }>;
  reportHash: string;
};

export function validateCapabilityBackedGameDsl(input: {
  dsl: unknown;
  registry?: GameplayCapabilityRegistryContract;
  schemaFragments: readonly CapabilityDslSchemaFragment[];
}): CapabilityDslValidationReport {
  const parsed = CapabilityBackedGameDslSchema.safeParse(input.dsl);
  if (!parsed.success) {
    return {
      artifactKind: CAPABILITY_GAME_DSL_VALIDATION_REPORT_KIND,
      schemaVersion: CAPABILITY_GAME_DSL_VALIDATION_REPORT_SCHEMA_VERSION,
      contractVersion: CAPABILITY_GAME_DSL_CONTRACT_VERSION,
      status: 'invalid',
      pass1: 'failed',
      pass2: 'skipped',
      declaredCapabilities: [],
      ownedNodes: [],
      issues: parsed.error.issues.map((issue) => ({
        code: 'BASE_SCHEMA_INVALID',
        path: issue.path.map(String).join('.') || '<root>',
        message: issue.message
      }))
    };
  }

  const dsl = parsed.data;
  const registry = input.registry ?? GameplayCapabilityRegistry;
  const { fragments: fragmentByCapabilityAndKind, duplicateIssues } = buildFragmentMap(input.schemaFragments);
  const declaredCapabilitySet = new Set(dsl.capabilities);
  const issues: CapabilityDslValidationIssue[] = [...duplicateIssues];
  const ownedNodes: CapabilityDslOwnedNode[] = [];

  for (const capabilityId of dsl.capabilities) {
    if (findGameplayCapability(capabilityId, registry) === undefined) {
      issues.push({
        code: 'UNKNOWN_CAPABILITY',
        path: 'capabilities',
        capabilityId,
        message: `Capability ${capabilityId} is not registered.`
      });
    }
  }

  for (const duplicate of findDuplicateStableIds(dsl)) {
    issues.push({
      code: 'DUPLICATE_STABLE_ID',
      path: duplicate.path,
      message: `Duplicate stable id ${duplicate.id}.`
    });
  }

  for (const node of collectCapabilityDslNodes(dsl)) {
    const nodeIssuesBefore = issues.length;
    if (!declaredCapabilitySet.has(node.node.type)) {
      issues.push({
        code: 'CAPABILITY_NOT_DECLARED',
        path: node.path,
        capabilityId: node.node.type,
        message: `Node ${node.node.id} uses ${node.node.type}, but it is not listed in capabilities.`
      });
    }
    if (findGameplayCapability(node.node.type, registry) === undefined) {
      issues.push({
        code: 'UNKNOWN_CAPABILITY',
        path: node.path,
        capabilityId: node.node.type,
        message: `Node ${node.node.id} uses unregistered capability ${node.node.type}.`
      });
    }
    const fragment = fragmentByCapabilityAndKind.get(fragmentKey(node.node.type, node.nodeKind));
    if (fragment === undefined) {
      issues.push({
        code: 'SCHEMA_FRAGMENT_MISSING',
        path: node.path,
        capabilityId: node.node.type,
        message: `No ${node.nodeKind} schema fragment is registered for ${node.node.type}.`
      });
    } else {
      const config = fragment.configSchema.safeParse(node.node.config);
      if (!config.success) {
        for (const issue of config.error.issues) {
          issues.push({
            code: 'CONFIG_SCHEMA_INVALID',
            path: [node.path, 'config', ...issue.path.map(String)].join('/'),
            capabilityId: node.node.type,
            message: issue.message
          });
        }
      }
    }
    ownedNodes.push({
      path: node.path,
      nodeKind: node.nodeKind,
      id: node.node.id,
      type: node.node.type,
      ownerCapabilityId: nodeIssuesBefore === issues.length ? node.node.type : undefined,
      status: nodeIssuesBefore === issues.length ? 'owned' : 'invalid'
    });
  }

  return {
    artifactKind: CAPABILITY_GAME_DSL_VALIDATION_REPORT_KIND,
    schemaVersion: CAPABILITY_GAME_DSL_VALIDATION_REPORT_SCHEMA_VERSION,
    contractVersion: CAPABILITY_GAME_DSL_CONTRACT_VERSION,
    status: issues.length === 0 ? 'valid' : 'invalid',
    pass1: 'passed',
    pass2: issues.length === 0 ? 'passed' : 'failed',
    profileId: dsl.profile.id,
    declaredCapabilities: [...dsl.capabilities].sort(),
    ownedNodes,
    issues,
    dslHash: hashStableJson(dsl)
  };
}

export function buildLegacyDslAdapterReport(mappings: readonly LegacyDslAdapterMapping[]): LegacyDslAdapterReport {
  const stableMappings = [...mappings].sort((left, right) => `${left.legacyPath}:${left.capabilityPath}`.localeCompare(`${right.legacyPath}:${right.capabilityPath}`));
  const errors = stableMappings.flatMap((mapping, index) => {
    const mappingErrors: Array<{ path: string; message: string }> = [];
    if (!mapping.legacyPath.startsWith('/')) {
      mappingErrors.push({ path: `mappings.${index}.legacyPath`, message: 'legacyPath must be a JSON pointer.' });
    }
    if (!mapping.capabilityPath.startsWith('/')) {
      mappingErrors.push({ path: `mappings.${index}.capabilityPath`, message: 'capabilityPath must be a JSON pointer.' });
    }
    if (findGameplayCapability(mapping.capabilityId) === undefined) {
      mappingErrors.push({ path: `mappings.${index}.capabilityId`, message: `Unknown capability ${mapping.capabilityId}.` });
    }
    return mappingErrors;
  });
  const stableErrors = [...errors].sort((left, right) => `${left.path}:${left.message}`.localeCompare(`${right.path}:${right.message}`));
  return {
    artifactKind: LEGACY_DSL_ADAPTER_REPORT_KIND,
    schemaVersion: LEGACY_DSL_ADAPTER_REPORT_SCHEMA_VERSION,
    status: stableErrors.length === 0 ? 'valid' : 'invalid',
    mappings: stableMappings,
    errors: stableErrors,
    reportHash: hashStableJson({ mappings: stableMappings, errors: stableErrors })
  };
}

function buildFragmentMap(schemaFragments: readonly CapabilityDslSchemaFragment[]): {
  fragments: Map<string, CapabilityDslSchemaFragment>;
  duplicateIssues: CapabilityDslValidationIssue[];
} {
  const fragments = new Map<string, CapabilityDslSchemaFragment>();
  const duplicateIssues: CapabilityDslValidationIssue[] = [];
  for (const fragment of schemaFragments) {
    for (const nodeKind of fragment.nodeKinds) {
      const key = fragmentKey(fragment.capabilityId, nodeKind);
      if (fragments.has(key)) {
        duplicateIssues.push({
          code: 'SCHEMA_FRAGMENT_DUPLICATE',
          path: 'schemaFragments',
          capabilityId: fragment.capabilityId,
          message: `Duplicate ${nodeKind} schema fragment for ${fragment.capabilityId}.`
        });
        continue;
      }
      fragments.set(key, fragment);
    }
  }
  return { fragments, duplicateIssues };
}

function fragmentKey(capabilityId: string, nodeKind: CapabilityDslNodeKind): string {
  return `${capabilityId}:${nodeKind}`;
}

function collectCapabilityDslNodes(dsl: CapabilityBackedGameDsl): Array<{ path: string; nodeKind: CapabilityDslNodeKind; node: CapabilityTypedNode }> {
  const nodes: Array<{ path: string; nodeKind: CapabilityDslNodeKind; node: CapabilityTypedNode }> = [];
  dsl.entities.forEach((entity, entityIndex) => {
    entity.components.forEach((node, nodeIndex) => nodes.push({ path: `/entities/${entityIndex}/components/${nodeIndex}`, nodeKind: 'component', node }));
    entity.behaviors.forEach((node, nodeIndex) => nodes.push({ path: `/entities/${entityIndex}/behaviors/${nodeIndex}`, nodeKind: 'behavior', node }));
  });
  dsl.rules.forEach((rule, ruleIndex) => {
    rule.conditions.forEach((node, nodeIndex) => nodes.push({ path: `/rules/${ruleIndex}/conditions/${nodeIndex}`, nodeKind: 'condition', node }));
    rule.actions.forEach((node, nodeIndex) => nodes.push({ path: `/rules/${ruleIndex}/actions/${nodeIndex}`, nodeKind: 'action', node }));
  });
  dsl.goals.forEach((node, nodeIndex) => nodes.push({ path: `/goals/${nodeIndex}`, nodeKind: 'goal', node }));
  return nodes;
}

function findDuplicateStableIds(dsl: CapabilityBackedGameDsl): Array<{ id: string; path: string }> {
  const seen = new Map<string, string>();
  const duplicates: Array<{ id: string; path: string }> = [];
  const visit = (id: string, path: string) => {
    if (seen.has(id)) {
      duplicates.push({ id, path });
      return;
    }
    seen.set(id, path);
  };
  dsl.scenes.forEach((scene, index) => visit(scene.id, `/scenes/${index}/id`));
  dsl.entities.forEach((entity, entityIndex) => {
    visit(entity.id, `/entities/${entityIndex}/id`);
    entity.components.forEach((node, nodeIndex) => visit(node.id, `/entities/${entityIndex}/components/${nodeIndex}/id`));
    entity.behaviors.forEach((node, nodeIndex) => visit(node.id, `/entities/${entityIndex}/behaviors/${nodeIndex}/id`));
  });
  dsl.rules.forEach((rule, ruleIndex) => {
    visit(rule.id, `/rules/${ruleIndex}/id`);
    rule.conditions.forEach((node, nodeIndex) => visit(node.id, `/rules/${ruleIndex}/conditions/${nodeIndex}/id`));
    rule.actions.forEach((node, nodeIndex) => visit(node.id, `/rules/${ruleIndex}/actions/${nodeIndex}/id`));
  });
  dsl.goals.forEach((node, index) => visit(node.id, `/goals/${index}/id`));
  return duplicates;
}
