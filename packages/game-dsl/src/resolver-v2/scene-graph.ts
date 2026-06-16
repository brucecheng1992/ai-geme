import { createResolverV2Diagnostic } from './diagnostics.js';
import { compareCodeUnits, hasOwn, isPlainRecord, sortedKeys } from './reference-extractor-shared.js';
import {
  readComponentKeys,
  readEntityReferenceTarget,
  isResolverV2EntitySemanticId,
  readParentTarget,
  readSceneBounds,
  readSemanticIdForKind,
  readSpawnTransform,
  readTransformSummary,
  readVisibility,
  type ResolverV2ParentTarget,
  type ResolverV2SceneBounds
} from './scene-graph-rules.js';
import type {
  ResolverV2Diagnostic,
  ResolverV2SceneGraph,
  ResolverV2SceneGraphEdge,
  ResolverV2SceneGraphNode,
  ResolverV2SceneGraphResult
} from './types.js';

type SceneGraphEdgeDraft = Omit<ResolverV2SceneGraphEdge, 'id'>;

type EntityGraphRecord = {
  sceneKey: string;
  semanticId: string;
  nodeId: string;
  path: string;
} & Partial<ResolverV2ParentTarget>;

type SceneEntityLookup = Map<string, Map<string, EntityGraphRecord>>;

type MutableSceneGraphState = {
  nodes: ResolverV2SceneGraphNode[];
  edgeDrafts: SceneGraphEdgeDraft[];
  diagnostics: ResolverV2Diagnostic[];
  usedNodeIds: Set<string>;
  entityLookupByScene: SceneEntityLookup;
  entityRecords: EntityGraphRecord[];
  seenEntityIds: Map<string, EntityGraphRecord>;
  duplicateEntityIds: Set<string>;
};

/**
 * Extracts a deterministic scene graph summary from SSOT-like `/scenes` data.
 */
export function extractResolverV2SceneGraph(document: unknown): ResolverV2SceneGraphResult {
  const state = createSceneGraphState();

  try {
    collectSceneGraph(document, state);
    connectEntityParentEdges(state);
    diagnoseEntityParentCycles(state);
  } catch (cause) {
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_REFERENCE_EXTRACTION_FAILED',
        message: 'Resolver V2 scene graph extraction failed for an unsupported document shape.',
        cause
      })
    );
  }

  return {
    graph: {
      nodes: [...state.nodes].sort(compareSceneGraphNodes),
      edges: finalizeSceneGraphEdges(state.edgeDrafts)
    },
    diagnostics: [...state.diagnostics].sort(compareDiagnostics)
  };
}

function createSceneGraphState(): MutableSceneGraphState {
  return {
    nodes: [],
    edgeDrafts: [],
    diagnostics: [],
    usedNodeIds: new Set(),
    entityLookupByScene: new Map(),
    entityRecords: [],
    seenEntityIds: new Map(),
    duplicateEntityIds: new Set()
  };
}

function collectSceneGraph(document: unknown, state: MutableSceneGraphState): void {
  if (!isPlainRecord(document)) {
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'INVALID_RESOLVER_DOCUMENT',
        message: 'Resolver V2 document must be an object.'
      })
    );
    return;
  }

  const scenes = document.scenes;
  if (scenes === undefined) {
    return;
  }

  if (!isPlainRecord(scenes)) {
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_REFERENCE_EXTRACTION_FAILED',
        message: 'Resolver V2 scenes must be an object.',
        sourcePath: '/scenes'
      })
    );
    return;
  }

  for (const sceneKey of sortedKeys(scenes)) {
    collectSceneNode(scenes[sceneKey], sceneKey, state);
  }
}

function collectSceneNode(sceneValue: unknown, sceneKey: string, state: MutableSceneGraphState): void {
  const scenePath = `/scenes/${sceneKey}`;
  if (!isPlainRecord(sceneValue)) {
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 scene must be an object.',
        sourcePath: scenePath
      })
    );
    return;
  }

  const sceneId = readSemanticIdForKind({
    value: sceneValue.id,
    fallbackId: `scene:${sceneKey}`,
    expectedKind: 'scene',
    sourcePath: scenePath,
    fieldPath: `${scenePath}/id`,
    diagnostics: state.diagnostics
  });
  const sceneNodeId = reserveNodeId(`scene_node:${sceneId}`, state.usedNodeIds);
  const sceneNode: ResolverV2SceneGraphNode = {
    id: sceneNodeId,
    kind: 'scene',
    semanticId: sceneId,
    path: scenePath,
    sceneId,
    metadata: { sceneKey }
  };
  state.nodes.push(sceneNode);

  const sceneBounds = readSceneBounds(sceneValue, scenePath, state.diagnostics);
  collectSceneEntities(sceneValue, sceneKey, sceneId, sceneNodeId, state);
  collectSceneCamera(sceneValue, sceneKey, sceneId, sceneNodeId, state);
  collectSceneSpawns(sceneValue, sceneKey, sceneId, sceneNodeId, sceneBounds, state);
}

function collectSceneEntities(
  scene: Record<string, unknown>,
  sceneKey: string,
  sceneId: string,
  sceneNodeId: string,
  state: MutableSceneGraphState
): void {
  const entities = scene.entities;
  if (entities === undefined) {
    return;
  }

  const entitiesPath = `/scenes/${sceneKey}/entities`;
  if (!isPlainRecord(entities)) {
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_REFERENCE_EXTRACTION_FAILED',
        message: 'Resolver V2 scene entities must be an object.',
        sourceId: sceneId,
        sourcePath: entitiesPath
      })
    );
    return;
  }

  const sceneEntities = getSceneEntityLookup(sceneKey, state);
  for (const entityKey of sortedKeys(entities)) {
    collectEntityNode(entities[entityKey], {
      entityKey,
      sceneKey,
      sceneId,
      sceneNodeId,
      sceneEntities,
      state
    });
  }
}

function collectEntityNode(
  entityValue: unknown,
  input: {
    entityKey: string;
    sceneKey: string;
    sceneId: string;
    sceneNodeId: string;
    sceneEntities: Map<string, EntityGraphRecord>;
    state: MutableSceneGraphState;
  }
): void {
  const entityPath = `/scenes/${input.sceneKey}/entities/${input.entityKey}`;
  if (!isPlainRecord(entityValue)) {
    input.state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 entity must be an object.',
        sourceId: input.sceneId,
        sourcePath: entityPath
      })
    );
    return;
  }

  const entityId = readSemanticIdForKind({
    value: entityValue.id,
    fallbackId: `entity:${input.entityKey}`,
    expectedKind: 'entity',
    sourcePath: entityPath,
    fieldPath: `${entityPath}/id`,
    diagnostics: input.state.diagnostics
  });
  const entityNodeId = reserveNodeId(`entity_node:${input.sceneKey}:${entityId}`, input.state.usedNodeIds);
  const componentKeys = readComponentKeys(entityValue);
  const transform = readTransformSummary(entityValue, entityPath, input.state.diagnostics);
  const visible = readVisibility(entityValue, entityPath, input.state.diagnostics);
  const node: ResolverV2SceneGraphNode = {
    id: entityNodeId,
    kind: 'entity',
    semanticId: entityId,
    path: entityPath,
    sceneId: input.sceneId,
    ...(transform === undefined ? {} : { transform }),
    ...(visible === undefined ? {} : { visible }),
    metadata: {
      entityKey: input.entityKey,
      ...(componentKeys === undefined ? {} : { componentKeys })
    }
  };
  input.state.nodes.push(node);
  input.state.edgeDrafts.push({
    kind: 'scene_contains_entity',
    from: input.sceneNodeId,
    to: entityNodeId,
    path: entityPath
  });

  const parent = readParentTarget(entityValue, entityPath, entityId, input.state.diagnostics);
  const record: EntityGraphRecord = {
    sceneKey: input.sceneKey,
    semanticId: entityId,
    nodeId: entityNodeId,
    path: entityPath,
    ...(parent === undefined ? {} : parent)
  };
  input.state.entityRecords.push(record);
  registerEntityRecord(record, input.sceneEntities, input.state);
}

function collectSceneCamera(
  scene: Record<string, unknown>,
  sceneKey: string,
  sceneId: string,
  sceneNodeId: string,
  state: MutableSceneGraphState
): void {
  const camera = scene.camera;
  if (camera === undefined) {
    return;
  }

  const cameraPath = `/scenes/${sceneKey}/camera`;
  if (!isPlainRecord(camera)) {
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 scene camera must be an object.',
        sourceId: sceneId,
        sourcePath: cameraPath
      })
    );
    return;
  }

  const cameraId = readSemanticIdForKind({
    value: camera.id,
    fallbackId: `camera:${sceneKey}`,
    expectedKind: 'camera',
    sourcePath: cameraPath,
    fieldPath: `${cameraPath}/id`,
    diagnostics: state.diagnostics
  });
  const cameraNodeId = reserveNodeId(`camera_node:${sceneKey}:${cameraId}`, state.usedNodeIds);
  state.nodes.push({
    id: cameraNodeId,
    kind: 'camera',
    semanticId: cameraId,
    path: cameraPath,
    sceneId,
    metadata: { sceneKey }
  });
  state.edgeDrafts.push({
    kind: 'scene_has_camera',
    from: sceneNodeId,
    to: cameraNodeId,
    path: cameraPath
  });

  if (!hasOwn(camera, 'follow')) {
    return;
  }

  const targetId = readEntityReferenceTarget({
    value: camera.follow,
    sourceId: cameraId,
    sourcePath: cameraPath,
    fieldPath: `${cameraPath}/follow`,
    diagnostics: state.diagnostics,
    diagnoseWrongKind: true
  });
  if (targetId === undefined) {
    return;
  }

  const target = state.entityLookupByScene.get(sceneKey)?.get(targetId);
  if (target === undefined) {
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_CAMERA_TARGET_NOT_FOUND',
        message: 'Resolver V2 camera follow target was not found in the scene graph.',
        sourceId: cameraId,
        sourcePath: cameraPath,
        fieldPath: `${cameraPath}/follow`,
        targetId,
        expectedTargetKind: 'entity'
      })
    );
    return;
  }

  state.edgeDrafts.push({
    kind: 'camera_follows_entity',
    from: cameraNodeId,
    to: target.nodeId,
    path: `${cameraPath}/follow`
  });
}

function collectSceneSpawns(
  scene: Record<string, unknown>,
  sceneKey: string,
  sceneId: string,
  sceneNodeId: string,
  bounds: ResolverV2SceneBounds | undefined,
  state: MutableSceneGraphState
): void {
  collectSpawnContainer({
    value: scene.spawn,
    containerPath: `/scenes/${sceneKey}/spawn`,
    sceneKey,
    sceneId,
    sceneNodeId,
    bounds,
    state
  });
  collectSpawnContainer({
    value: scene.spawns,
    containerPath: `/scenes/${sceneKey}/spawns`,
    sceneKey,
    sceneId,
    sceneNodeId,
    bounds,
    state
  });
}

function collectSpawnContainer(input: {
  value: unknown;
  containerPath: string;
  sceneKey: string;
  sceneId: string;
  sceneNodeId: string;
  bounds: ResolverV2SceneBounds | undefined;
  state: MutableSceneGraphState;
}): void {
  if (input.value === undefined) {
    return;
  }

  if (!isPlainRecord(input.value)) {
    input.state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 scene spawns must be an object.',
        sourceId: input.sceneId,
        sourcePath: input.containerPath
      })
    );
    return;
  }

  for (const spawnKey of sortedKeys(input.value)) {
    collectSpawnNode(input.value[spawnKey], spawnKey, input);
  }
}

function collectSpawnNode(
  spawnValue: unknown,
  spawnKey: string,
  input: {
    containerPath: string;
    sceneKey: string;
    sceneId: string;
    sceneNodeId: string;
    bounds: ResolverV2SceneBounds | undefined;
    state: MutableSceneGraphState;
  }
): void {
  const spawnPath = `${input.containerPath}/${spawnKey}`;
  if (!isPlainRecord(spawnValue)) {
    input.state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 spawn point must be an object.',
        sourceId: input.sceneId,
        sourcePath: spawnPath
      })
    );
    return;
  }

  const spawnNodeId = reserveNodeId(`spawn_node:${input.sceneKey}:${spawnKey}`, input.state.usedNodeIds);
  const transform = readSpawnTransform(spawnValue, spawnPath, input.bounds, input.state.diagnostics);
  input.state.nodes.push({
    id: spawnNodeId,
    kind: 'spawn',
    path: spawnPath,
    sceneId: input.sceneId,
    ...(transform === undefined ? {} : { transform }),
    metadata: { sceneKey: input.sceneKey }
  });
  input.state.edgeDrafts.push({
    kind: 'scene_has_spawn',
    from: input.sceneNodeId,
    to: spawnNodeId,
    path: spawnPath
  });

  validateSpawnTarget(spawnValue, spawnKey, spawnPath, input.sceneId, input.sceneKey, input.state);
}

function validateSpawnTarget(
  spawn: Record<string, unknown>,
  spawnKey: string,
  spawnPath: string,
  sceneId: string,
  sceneKey: string,
  state: MutableSceneGraphState
): void {
  const explicitTarget = hasOwn(spawn, 'entityId')
    ? readEntityReferenceTarget({
        value: spawn.entityId,
        sourceId: sceneId,
        sourcePath: spawnPath,
        fieldPath: `${spawnPath}/entityId`,
        diagnostics: state.diagnostics,
        diagnoseWrongKind: true
      })
    : undefined;
  const sceneEntities = state.entityLookupByScene.get(sceneKey);
  if (explicitTarget !== undefined) {
    if (sceneEntities?.has(explicitTarget) !== true) {
      state.diagnostics.push(
        createResolverV2Diagnostic({
          severity: 'error',
          code: 'RESOLVER_SPAWN_TARGET_NOT_FOUND',
          message: 'Resolver V2 explicit spawn target was not found in the scene graph.',
          sourceId: sceneId,
          sourcePath: spawnPath,
          fieldPath: `${spawnPath}/entityId`,
          targetId: explicitTarget,
          expectedTargetKind: 'entity'
        })
      );
    }
    return;
  }

  if (hasOwn(spawn, 'entityId')) {
    return;
  }

  const inferredCandidate = spawnKey === 'player' && sceneEntities?.has('entity:player') === true ? 'entity:player' : `entity:${spawnKey}`;
  const inferredTarget = readEntityReferenceTarget({
    value: inferredCandidate,
    sourceId: sceneId,
    sourcePath: spawnPath,
    fieldPath: spawnPath,
    diagnostics: state.diagnostics,
    diagnoseWrongKind: true
  });
  if (inferredTarget === undefined) {
    pushInferredSpawnTargetNotFound(sceneId, spawnPath, inferredCandidate, state.diagnostics);
    return;
  }

  if (sceneEntities?.has(inferredTarget) === true) {
    return;
  }

  pushInferredSpawnTargetNotFound(sceneId, spawnPath, inferredTarget, state.diagnostics);
}

function pushInferredSpawnTargetNotFound(
  sceneId: string,
  spawnPath: string,
  targetId: string,
  diagnostics: ResolverV2Diagnostic[]
): void {
  diagnostics.push(
    createResolverV2Diagnostic({
      severity: 'warning',
      code: 'RESOLVER_SPAWN_TARGET_NOT_FOUND',
      message: 'Resolver V2 inferred spawn target was not found in the scene graph.',
      sourceId: sceneId,
      sourcePath: spawnPath,
      targetId,
      expectedTargetKind: 'entity'
    })
  );
}

function connectEntityParentEdges(state: MutableSceneGraphState): void {
  for (const entity of [...state.entityRecords].sort(compareEntityRecords)) {
    if (entity.parentTargetId === undefined || entity.parentFieldPath === undefined) {
      continue;
    }

    const parent = state.entityLookupByScene.get(entity.sceneKey)?.get(entity.parentTargetId);
    if (parent === undefined) {
      state.diagnostics.push(
        createResolverV2Diagnostic({
          severity: 'error',
          code: 'RESOLVER_ENTITY_PARENT_NOT_FOUND',
          message: 'Resolver V2 entity parent target was not found in the scene graph.',
          sourceId: entity.semanticId,
          sourcePath: entity.path,
          fieldPath: entity.parentFieldPath,
          targetId: entity.parentTargetId,
          expectedTargetKind: 'entity'
        })
      );
      continue;
    }

    state.edgeDrafts.push({
      kind: 'entity_parent',
      from: entity.nodeId,
      to: parent.nodeId,
      path: entity.parentFieldPath
    });
    state.edgeDrafts.push({
      kind: 'entity_child',
      from: parent.nodeId,
      to: entity.nodeId,
      path: entity.parentFieldPath
    });
  }
}

function diagnoseEntityParentCycles(state: MutableSceneGraphState): void {
  const parentByNodeId = new Map<string, string>();
  const recordByNodeId = new Map<string, EntityGraphRecord>();
  for (const entity of state.entityRecords) {
    recordByNodeId.set(entity.nodeId, entity);
    if (entity.parentTargetId === undefined) {
      continue;
    }
    const parent = state.entityLookupByScene.get(entity.sceneKey)?.get(entity.parentTargetId);
    if (parent !== undefined) {
      parentByNodeId.set(entity.nodeId, parent.nodeId);
    }
  }

  const reportedCycles = new Set<string>();
  for (const startNodeId of [...parentByNodeId.keys()].sort(compareCodeUnits)) {
    const path: string[] = [];
    const seenAt = new Map<string, number>();
    let current: string | undefined = startNodeId;

    while (current !== undefined) {
      const existingIndex = seenAt.get(current);
      if (existingIndex !== undefined) {
        const cycle = path.slice(existingIndex);
        const cycleKey = [...cycle].sort(compareCodeUnits).join('|');
        if (!reportedCycles.has(cycleKey)) {
          const source = recordByNodeId.get(current) ?? recordByNodeId.get(startNodeId);
          state.diagnostics.push(
            createResolverV2Diagnostic({
              severity: 'error',
              code: 'RESOLVER_ENTITY_PARENT_CYCLE',
              message: 'Resolver V2 entity parent graph contains a cycle.',
              sourceId: source?.semanticId,
              sourcePath: source?.path,
              targetId: cycleKey
            })
          );
          reportedCycles.add(cycleKey);
        }
        break;
      }

      seenAt.set(current, path.length);
      path.push(current);
      current = parentByNodeId.get(current);
    }
  }
}

function registerEntityRecord(
  record: EntityGraphRecord,
  sceneEntities: Map<string, EntityGraphRecord>,
  state: MutableSceneGraphState
): void {
  const seen = state.seenEntityIds.get(record.semanticId);
  if (seen !== undefined && !state.duplicateEntityIds.has(record.semanticId)) {
    state.duplicateEntityIds.add(record.semanticId);
    state.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_DUPLICATE_ENTITY_ID',
        message: 'Resolver V2 scene graph contains duplicate semantic entity ids.',
        sourcePath: record.path,
        targetId: record.semanticId,
        expectedTargetKind: 'entity'
      })
    );
  }

  if (seen === undefined) {
    state.seenEntityIds.set(record.semanticId, record);
  }

  if (isResolverV2EntitySemanticId(record.semanticId) && !sceneEntities.has(record.semanticId)) {
    sceneEntities.set(record.semanticId, record);
  }
}

function getSceneEntityLookup(sceneKey: string, state: MutableSceneGraphState): Map<string, EntityGraphRecord> {
  const existing = state.entityLookupByScene.get(sceneKey);
  if (existing !== undefined) {
    return existing;
  }

  const lookup = new Map<string, EntityGraphRecord>();
  state.entityLookupByScene.set(sceneKey, lookup);
  return lookup;
}

function reserveNodeId(baseId: string, usedNodeIds: Set<string>): string {
  if (!usedNodeIds.has(baseId)) {
    usedNodeIds.add(baseId);
    return baseId;
  }

  let suffix = 1;
  let candidate = `${baseId}:${suffix}`;
  while (usedNodeIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}:${suffix}`;
  }
  usedNodeIds.add(candidate);
  return candidate;
}

function finalizeSceneGraphEdges(edgeDrafts: SceneGraphEdgeDraft[]): ResolverV2SceneGraphEdge[] {
  return [...edgeDrafts].sort(compareSceneGraphEdges).map((edge, index) => ({
    id: `scene_edge:${edge.kind}:${index}`,
    ...edge
  }));
}

function compareSceneGraphNodes(left: ResolverV2SceneGraphNode, right: ResolverV2SceneGraphNode): number {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.id, right.id);
}

function compareSceneGraphEdges(left: SceneGraphEdgeDraft, right: SceneGraphEdgeDraft): number {
  return (
    compareCodeUnits(left.kind, right.kind) ||
    compareCodeUnits(left.path, right.path) ||
    compareCodeUnits(left.from, right.from) ||
    compareCodeUnits(left.to, right.to)
  );
}

function compareDiagnostics(left: ResolverV2Diagnostic, right: ResolverV2Diagnostic): number {
  return (
    compareCodeUnits(left.sourcePath ?? '', right.sourcePath ?? '') ||
    compareCodeUnits(left.fieldPath ?? '', right.fieldPath ?? '') ||
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.targetId ?? '', right.targetId ?? '')
  );
}

function compareEntityRecords(left: EntityGraphRecord, right: EntityGraphRecord): number {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.semanticId, right.semanticId);
}
