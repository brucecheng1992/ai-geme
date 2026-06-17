import { cloneSemanticPatchJsonValue } from '../semantic-editing/document-hash.js';
import {
  createFixBlankPreviewRepairHandlers,
  isSemanticId,
  parseSemanticId,
  type SemanticPatchOperation,
  type SemanticPatchPlannerHandler,
  type SemanticPatchPlannerHandlers
} from '../semantic-editing/index.js';
import type { CreateLiveSemanticEditHandlersOptions } from './types.js';

type PathResolution = {
  parent: Record<string, unknown> | unknown[];
  key: string;
  exists: boolean;
  value: unknown;
};

export function createLiveSemanticEditHandlers(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandlers {
  return {
    ...createFixBlankPreviewRepairHandlers({
      document: options.document,
      scenePath: options.scenePath
    }),
    move_entity: createMoveEntityHandler(options),
    adjust_camera: createAdjustCameraHandler(options),
    bind_asset: createBindAssetHandler(options),
    configure_feedback: createConfigureFeedbackHandler(options),
    configure_boss: createConfigureBossHandler(options),
    modify_rule: createModifyRuleHandler(options)
  };
}

function createMoveEntityHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    const x = readFiniteNumber(intent.payload.x, 'move_entity x');
    const y = readFiniteNumber(intent.payload.y, 'move_entity y');
    const scenePath = resolveScenePath(intent.payload.sceneTarget, options.scenePath);
    const entityPath = resolveEntityPath({ entityId: intent.target, targetPath: target.path, scenePath });
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(entityPath, `move_entity target ${intent.target}`);
    planner.ensureObjectContainer(`${entityPath}/components`);
    const transformPath = `${entityPath}/components/transform`;
    const existingTransform = planner.getValue(transformPath);
    const transform = {
      ...(isPlainRecord(existingTransform) ? existingTransform : {}),
      x,
      y
    };
    planner.setValue(transformPath, transform);
    return planner.operations;
  };
}

function createAdjustCameraHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent }) => {
    const follow = readSemanticEntityId(intent.payload.follow, 'adjust_camera follow');
    const scenePath = resolveScenePath(intent.target, options.scenePath);
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(scenePath, `adjust_camera target ${intent.target}`);
    const cameraPath = `${scenePath}/camera`;
    const existingCamera = planner.getValue(cameraPath);
    const camera = {
      ...(isPlainRecord(existingCamera) ? existingCamera : {}),
      id: isPlainRecord(existingCamera) && typeof existingCamera.id === 'string' ? existingCamera.id : 'camera:main',
      follow
    };
    planner.setValue(cameraPath, camera);
    return planner.operations;
  };
}

function createBindAssetHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    const asset = readSemanticAssetId(intent.payload.asset, 'bind_asset asset');
    const scenePath = resolveScenePath(intent.payload.sceneTarget, options.scenePath);
    const entityPath = resolveEntityPath({ entityId: intent.target, targetPath: target.path, scenePath });
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(entityPath, `bind_asset target ${intent.target}`);
    planner.ensureObjectContainer(`${entityPath}/components`);
    planner.ensureObjectContainer(`${entityPath}/components/sprite`);
    planner.setValue(`${entityPath}/components/sprite/asset`, asset);
    return planner.operations;
  };
}

function createConfigureFeedbackHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    if (target.kind !== 'project') {
      throw new Error(`configure_feedback target must be a project semantic id: ${intent.target}`);
    }

    const payload = readConfigureFeedbackPayload(intent.payload);
    const planner = createLiveDocumentOperationPlanner(options.document);

    if (payload.cameraShake !== undefined) {
      planner.ensureObjectContainer('/feedback');
      planner.setValue('/feedback/cameraShake', payload.cameraShake);
    }
    if (payload.hitFlash !== undefined) {
      planner.ensureObjectContainer('/feedback');
      planner.setValue('/feedback/hitFlash', payload.hitFlash);
    }
    if (payload.invulnerabilityFrames !== undefined) {
      planner.assertObject('/player', 'configure_feedback player');
      planner.setValue('/player/invulnerabilityFrames', payload.invulnerabilityFrames);
    }
    if (payload.explosion !== undefined) {
      planner.ensureObjectContainer('/effects');
      planner.setValue('/effects/explosion', payload.explosion);
    }
    if (payload.audioEvents !== undefined) {
      planner.ensureObjectContainer('/audio');
      planner.ensureObjectContainer('/audio/events');
      for (const [eventKey, binding] of Object.entries(payload.audioEvents)) {
        planner.setValue(`/audio/events/${eventKey}`, binding);
      }
    }
    if (payload.warningBanner !== undefined) {
      planner.assertObject('/ui', 'configure_feedback ui');
      planner.setValue('/ui/warningBanner', payload.warningBanner);
    }

    return planner.operations;
  };
}

function createConfigureBossHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    if (target.kind !== 'entity') {
      throw new Error(`configure_boss target must be a boss entity semantic id: ${intent.target}`);
    }

    const bossPath = validateBossPath(target.path);
    const payload = readConfigureBossPayload(intent.payload);
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(bossPath, `configure_boss target ${intent.target}`);
    if (payload.health !== undefined) {
      planner.setValue(`${bossPath}/health`, payload.health);
    }
    if (payload.healthBar !== undefined) {
      planner.ensureObjectContainer(`${bossPath}/healthBar`);
      planner.setValue(`${bossPath}/healthBar/enabled`, payload.healthBar.enabled);
    }
    if (payload.phases !== undefined) {
      planner.setValue(`${bossPath}/phases`, payload.phases);
    }
    if (payload.intro !== undefined) {
      planner.ensureObjectContainer(`${bossPath}/intro`);
      planner.setValue(`${bossPath}/intro/warningEnabled`, payload.intro.warningEnabled);
      if (payload.intro.warningText !== undefined) {
        planner.setValue(`${bossPath}/intro/warningText`, payload.intro.warningText);
      }
      if (payload.intro.audioEvent !== undefined) {
        planner.setValue(`${bossPath}/intro/audioEvent`, payload.intro.audioEvent);
      }
    }
    if (payload.defeat !== undefined) {
      planner.ensureObjectContainer(`${bossPath}/defeat`);
      planner.setValue(`${bossPath}/defeat/explosionEffect`, payload.defeat.explosionEffect);
      if (payload.defeat.audioEvent !== undefined) {
        planner.setValue(`${bossPath}/defeat/audioEvent`, payload.defeat.audioEvent);
      }
    }

    return planner.operations;
  };
}

const liveEditRuleEffectTypes = ['damage', 'destroy', 'score_add', 'heal', 'knockback', 'end_game'] as const;
const liveEditRuleEffectKeys = new Set(['type', 'value']);
const liveEditBossAttackPatterns = ['spread_shot', 'charge', 'summon_minions', 'laser_burst', 'ground_slam'] as const;
const liveEditAudioEventKeys = [
  'shoot',
  'enemyHit',
  'enemyDefeated',
  'playerHit',
  'pickupCollected',
  'weaponPickup',
  'shieldPickup',
  'bossIntro',
  'bossDefeated',
  'explosion',
  'warning'
] as const;
const configureFeedbackPayloadKeys = new Set([
  'cameraShake',
  'hitFlash',
  'invulnerabilityFrames',
  'explosion',
  'audioEvents',
  'warningBanner'
]);
const cameraShakeKeys = new Set(['enabled', 'intensity', 'durationMs']);
const hitFlashKeys = new Set(['enabled', 'durationMs', 'flashCount']);
const invulnerabilityFrameKeys = new Set(['durationMs', 'flashEnabled']);
const explosionKeys = new Set(['enabled', 'scale', 'durationMs', 'audioEvent', 'cameraShake']);
const audioEventBindingKeys = new Set(['assetRef', 'volume', 'enabled']);
const warningBannerKeys = new Set(['enabled', 'text', 'durationMs']);
const configureBossPayloadKeys = new Set(['health', 'healthBar', 'phases', 'intro', 'defeat']);
const bossHealthBarKeys = new Set(['enabled']);
const bossPhaseKeys = new Set(['healthThresholdPct', 'attacks']);
const bossIntroKeys = new Set(['warningEnabled', 'warningText', 'audioEvent']);
const bossDefeatKeys = new Set(['explosionEffect', 'audioEvent']);

type LiveEditRuleEffectType = (typeof liveEditRuleEffectTypes)[number];
type LiveEditAudioEventKey = (typeof liveEditAudioEventKeys)[number];
type LiveEditBossAttackPattern = (typeof liveEditBossAttackPatterns)[number];

type LiveEditRuleEffect = {
  type: LiveEditRuleEffectType;
  value?: number;
};

type LiveEditCameraShakeConfig = {
  enabled: boolean;
  intensity: number;
  durationMs: number;
};

type LiveEditHitFlashConfig = {
  enabled: boolean;
  durationMs: number;
  flashCount?: number;
};

type LiveEditInvulnerabilityFramesConfig = {
  durationMs: number;
  flashEnabled: boolean;
};

type LiveEditExplosionConfig = {
  enabled: boolean;
  scale: number;
  durationMs: number;
  audioEvent?: 'explosion' | 'bossDefeated';
  cameraShake?: LiveEditCameraShakeConfig;
};

type LiveEditAudioEventBinding = {
  assetRef?: `asset:${string}`;
  volume: number;
  enabled: boolean;
};

type LiveEditWarningBannerConfig = {
  enabled: boolean;
  text: string;
  durationMs: number;
};

type LiveEditBossHealthBarConfig = {
  enabled: boolean;
};

type LiveEditBossPhaseConfig = {
  healthThresholdPct: number;
  attacks: LiveEditBossAttackPattern[];
};

type LiveEditBossIntroConfig = {
  warningEnabled: boolean;
  warningText?: string;
  audioEvent?: 'bossIntro' | 'warning';
};

type LiveEditBossDefeatConfig = {
  explosionEffect: boolean;
  audioEvent?: 'bossDefeated' | 'explosion';
};

type ConfigureFeedbackPayload = {
  cameraShake?: LiveEditCameraShakeConfig;
  hitFlash?: LiveEditHitFlashConfig;
  invulnerabilityFrames?: LiveEditInvulnerabilityFramesConfig;
  explosion?: LiveEditExplosionConfig;
  audioEvents?: Partial<Record<LiveEditAudioEventKey, LiveEditAudioEventBinding>>;
  warningBanner?: LiveEditWarningBannerConfig;
};

type ConfigureBossPayload = {
  health?: number;
  healthBar?: LiveEditBossHealthBarConfig;
  phases?: LiveEditBossPhaseConfig[];
  intro?: LiveEditBossIntroConfig;
  defeat?: LiveEditBossDefeatConfig;
};

function createModifyRuleHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    if (target.kind !== 'rule') {
      throw new Error(`modify_rule target must be a rule semantic id: ${intent.target}`);
    }

    const rulePath = validateCollisionRulePath(target.path);
    const effects = readRuleEffects(intent.payload.effects, 'modify_rule effects');
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(rulePath, `modify_rule target ${intent.target}`);
    planner.setValue(`${rulePath}/effects`, effects);
    return planner.operations;
  };
}

function createLiveDocumentOperationPlanner(document: unknown) {
  const shadow = cloneSemanticPatchJsonValue(document);
  const operations: SemanticPatchOperation[] = [];

  return {
    operations,
    getValue(path: string): unknown {
      const resolved = resolvePath(shadow, path, false);
      return resolved.exists ? cloneSemanticPatchJsonValue(resolved.value) : undefined;
    },
    assertObject(path: string, label: string): void {
      const resolved = resolvePath(shadow, path, false);
      if (!resolved.exists || !isPlainRecord(resolved.value)) {
        throw new Error(`${label} must exist as an object in the live edit document.`);
      }
    },
    ensureObjectContainer(path: string): void {
      const resolved = resolvePath(shadow, path, true);
      if (resolved.exists) {
        if (!isPlainRecord(resolved.value)) {
          throw new Error(`live edit expected object container at ${path}.`);
        }
        return;
      }

      operations.push({ op: 'add', path, value: {} });
      writeResolvedObjectValue(resolved, path, {});
    },
    setValue(path: string, value: unknown): void {
      const resolved = resolvePath(shadow, path, true);
      const clonedValue = cloneSemanticPatchJsonValue(value);
      operations.push({
        op: resolved.exists ? 'set' : 'add',
        path,
        value: clonedValue
      });
      writeResolvedObjectValue(resolved, path, cloneSemanticPatchJsonValue(value));
    }
  };
}

function writeResolvedObjectValue(resolved: PathResolution, path: string, value: unknown): void {
  if (Array.isArray(resolved.parent)) {
    throw new Error(`live edit does not support writing array elements directly: ${path}`);
  }

  resolved.parent[resolved.key] = value;
}

function resolvePath(document: unknown, path: string, createParents: boolean): PathResolution {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error('live edit does not support root document replacement.');
  }

  let current: unknown = document;
  const parentSegments = segments.slice(0, -1);
  let currentPath = '';
  for (const segment of parentSegments) {
    assertSafePathSegment(segment, path);
    currentPath = `${currentPath}/${segment}`;
    if (Array.isArray(current)) {
      current = readExistingArraySegment(current, segment, currentPath);
      continue;
    }

    if (!isPlainRecord(current)) {
      throw new Error(`live edit parent path is not an object: ${path}`);
    }

    if (!hasOwn(current, segment)) {
      if (!createParents) {
        throw new Error(`live edit parent path is missing: ${path}`);
      }
      current[segment] = {};
    }

    const child = current[segment];
    if (!isPlainRecord(child) && !Array.isArray(child)) {
      throw new Error(`live edit parent path is not an object: ${currentPath}`);
    }
    current = child;
  }

  const key = segments[segments.length - 1];
  if (key === undefined) {
    throw new Error(`live edit path is empty: ${path}`);
  }
  assertSafePathSegment(key, path);

  if (Array.isArray(current)) {
    const index = parseExistingArrayIndex(key, current.length);
    if (index === null) {
      throw new Error(`live edit array path is missing: ${path}`);
    }
    return {
      parent: current,
      key: String(index),
      exists: Object.prototype.hasOwnProperty.call(current, index),
      value: current[index]
    };
  }

  if (!isPlainRecord(current)) {
    throw new Error(`live edit parent path is not an object: ${path}`);
  }

  return {
    parent: current,
    key,
    exists: hasOwn(current, key),
    value: current[key]
  };
}

function resolveScenePath(value: unknown, explicitScenePath?: string): string {
  if (explicitScenePath !== undefined) {
    return validateScenePath(explicitScenePath);
  }

  const sceneTarget = typeof value === 'string' ? value : 'scene:main';
  const parsed = parseSemanticId(sceneTarget);
  if (parsed?.kind !== 'scene') {
    throw new Error(`live edit scene target must be a scene semantic id: ${sceneTarget}`);
  }

  return `/scenes/${parsed.name}`;
}

function resolveEntityPath(input: { entityId: string; targetPath: string; scenePath: string }): string {
  const parsed = parseSemanticId(input.entityId);
  if (parsed?.kind !== 'entity') {
    throw new Error(`live edit entity target must be an entity semantic id: ${input.entityId}`);
  }

  const targetPrefix = `${input.scenePath}/entities/`;
  if (input.targetPath.startsWith(targetPrefix) && !input.targetPath.slice(targetPrefix.length).includes('/')) {
    return validateEntityPath(input.targetPath, input.scenePath);
  }

  return `${input.scenePath}/entities/${parsed.name}`;
}

function validateScenePath(path: string): string {
  const segments = path.split('/');
  if (segments.length !== 3 || segments[0] !== '' || segments[1] !== 'scenes') {
    throw new Error('live edit scenePath must be an SSOT scene path.');
  }
  assertSafePathSegment(segments[2] ?? '', path);
  return path;
}

function validateEntityPath(path: string, scenePath: string): string {
  const prefix = `${scenePath}/entities/`;
  if (!path.startsWith(prefix)) {
    throw new Error('live edit entity path must be inside the selected scene.');
  }
  assertSafePathSegment(path.slice(prefix.length), path);
  return path;
}

function validateCollisionRulePath(path: string): string {
  const segments = path.split('/');
  if (segments.length !== 4 || segments[0] !== '' || segments[1] !== 'rules' || segments[2] !== 'collisions') {
    throw new Error('modify_rule target must be a collision rule path.');
  }

  const index = segments[3] ?? '';
  if (!/^\d+$/.test(index)) {
    throw new Error('modify_rule collision rule path must use a numeric index.');
  }
  assertSafePathSegment(index, path);
  return path;
}

function validateBossPath(path: string): string {
  const segments = path.split('/');
  if (segments.length !== 4 || segments[0] !== '' || segments[1] !== 'bosses' || segments[2] !== 'items') {
    throw new Error('configure_boss target must be a boss item path.');
  }

  const index = segments[3] ?? '';
  if (!/^\d+$/.test(index)) {
    throw new Error('configure_boss boss path must use a numeric index.');
  }
  assertSafePathSegment(index, path);
  return path;
}

function readFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function readSemanticEntityId(value: unknown, label: string): `entity:${string}` {
  if (typeof value !== 'string' || !isSemanticId(value) || parseSemanticId(value)?.kind !== 'entity') {
    throw new Error(`${label} must be an entity semantic id.`);
  }
  return value as `entity:${string}`;
}

function readSemanticAssetId(value: unknown, label: string): `asset:${string}` {
  if (typeof value !== 'string' || !isSemanticId(value) || parseSemanticId(value)?.kind !== 'asset') {
    throw new Error(`${label} must be an asset semantic id.`);
  }
  return value as `asset:${string}`;
}

function readConfigureFeedbackPayload(value: unknown): ConfigureFeedbackPayload {
  if (!isPlainRecord(value)) {
    throw new Error('configure_feedback payload must be an object.');
  }
  assertOnlyKnownKeys(value, configureFeedbackPayloadKeys, 'configure_feedback payload');

  const payload: ConfigureFeedbackPayload = {};
  if (value.cameraShake !== undefined) {
    payload.cameraShake = readCameraShakeConfig(value.cameraShake, 'configure_feedback cameraShake');
  }
  if (value.hitFlash !== undefined) {
    payload.hitFlash = readHitFlashConfig(value.hitFlash, 'configure_feedback hitFlash');
  }
  if (value.invulnerabilityFrames !== undefined) {
    payload.invulnerabilityFrames = readInvulnerabilityFramesConfig(
      value.invulnerabilityFrames,
      'configure_feedback invulnerabilityFrames'
    );
  }
  if (value.explosion !== undefined) {
    payload.explosion = readExplosionConfig(value.explosion, 'configure_feedback explosion');
  }
  if (value.audioEvents !== undefined) {
    payload.audioEvents = readAudioEventBindings(value.audioEvents, 'configure_feedback audioEvents');
  }
  if (value.warningBanner !== undefined) {
    payload.warningBanner = readWarningBannerConfig(value.warningBanner, 'configure_feedback warningBanner');
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('configure_feedback payload must include at least one feedback field.');
  }
  return payload;
}

function readConfigureBossPayload(value: unknown): ConfigureBossPayload {
  if (!isPlainRecord(value)) {
    throw new Error('configure_boss payload must be an object.');
  }
  assertOnlyKnownKeys(value, configureBossPayloadKeys, 'configure_boss payload');

  const payload: ConfigureBossPayload = {};
  if (value.health !== undefined) {
    payload.health = readIntegerInRange(value.health, 'configure_boss health', 1, 50);
  }
  if (value.healthBar !== undefined) {
    payload.healthBar = readBossHealthBarConfig(value.healthBar, 'configure_boss healthBar');
  }
  if (value.phases !== undefined) {
    payload.phases = readBossPhases(value.phases, 'configure_boss phases');
  }
  if (value.intro !== undefined) {
    payload.intro = readBossIntroConfig(value.intro, 'configure_boss intro');
  }
  if (value.defeat !== undefined) {
    payload.defeat = readBossDefeatConfig(value.defeat, 'configure_boss defeat');
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('configure_boss payload must include at least one boss field.');
  }
  return payload;
}

function readBossHealthBarConfig(value: unknown, label: string): LiveEditBossHealthBarConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, bossHealthBarKeys, label);

  return {
    enabled: readBoolean(value.enabled, `${label}.enabled`)
  };
}

function readBossPhases(value: unknown, label: string): LiveEditBossPhaseConfig[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new Error(`${label} must contain 1 to 8 phases.`);
  }

  return value.map((phase, index) => readBossPhase(phase, `${label}[${index}]`));
}

function readBossPhase(value: unknown, label: string): LiveEditBossPhaseConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, bossPhaseKeys, label);

  const attacks = readBossAttackPatterns(value.attacks, `${label}.attacks`);
  return {
    healthThresholdPct: readIntegerInRange(value.healthThresholdPct, `${label}.healthThresholdPct`, 1, 100),
    attacks
  };
}

function readBossAttackPatterns(value: unknown, label: string): LiveEditBossAttackPattern[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    throw new Error(`${label} must contain 1 to 4 attack patterns.`);
  }

  const attacks = value.map((attack, index) => readBossAttackPattern(attack, `${label}[${index}]`));
  if (new Set(attacks).size !== attacks.length) {
    throw new Error(`${label} must not contain duplicate attack patterns.`);
  }
  return attacks;
}

function readBossAttackPattern(value: unknown, label: string): LiveEditBossAttackPattern {
  if (!isLiveEditBossAttackPattern(value)) {
    throw new Error(`${label} must be a supported boss attack pattern.`);
  }
  return value;
}

function readBossIntroConfig(value: unknown, label: string): LiveEditBossIntroConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, bossIntroKeys, label);

  const output: LiveEditBossIntroConfig = {
    warningEnabled: readBoolean(value.warningEnabled, `${label}.warningEnabled`)
  };
  if (value.warningText !== undefined) {
    output.warningText = readBoundedText(value.warningText, `${label}.warningText`, 1, 40);
  }
  if (value.audioEvent !== undefined) {
    output.audioEvent = readBossIntroAudioEvent(value.audioEvent, `${label}.audioEvent`);
  }
  return output;
}

function readBossDefeatConfig(value: unknown, label: string): LiveEditBossDefeatConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, bossDefeatKeys, label);

  const output: LiveEditBossDefeatConfig = {
    explosionEffect: readBoolean(value.explosionEffect, `${label}.explosionEffect`)
  };
  if (value.audioEvent !== undefined) {
    output.audioEvent = readBossDefeatAudioEvent(value.audioEvent, `${label}.audioEvent`);
  }
  return output;
}

function readCameraShakeConfig(value: unknown, label: string): LiveEditCameraShakeConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, cameraShakeKeys, label);

  return {
    enabled: readBoolean(value.enabled, `${label}.enabled`),
    intensity: readNumberInRange(value.intensity, `${label}.intensity`, 0, 1),
    durationMs: readIntegerInRange(value.durationMs, `${label}.durationMs`, 0, 5000)
  };
}

function readHitFlashConfig(value: unknown, label: string): LiveEditHitFlashConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, hitFlashKeys, label);

  const output: LiveEditHitFlashConfig = {
    enabled: readBoolean(value.enabled, `${label}.enabled`),
    durationMs: readIntegerInRange(value.durationMs, `${label}.durationMs`, 0, 3000)
  };
  if (value.flashCount !== undefined) {
    output.flashCount = readIntegerInRange(value.flashCount, `${label}.flashCount`, 1, 20);
  }
  return output;
}

function readInvulnerabilityFramesConfig(value: unknown, label: string): LiveEditInvulnerabilityFramesConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, invulnerabilityFrameKeys, label);

  return {
    durationMs: readIntegerInRange(value.durationMs, `${label}.durationMs`, 0, 10000),
    flashEnabled: readBoolean(value.flashEnabled, `${label}.flashEnabled`)
  };
}

function readExplosionConfig(value: unknown, label: string): LiveEditExplosionConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, explosionKeys, label);

  const output: LiveEditExplosionConfig = {
    enabled: readBoolean(value.enabled, `${label}.enabled`),
    scale: readNumberInRange(value.scale, `${label}.scale`, 0.1, 10),
    durationMs: readIntegerInRange(value.durationMs, `${label}.durationMs`, 50, 5000)
  };
  if (value.audioEvent !== undefined) {
    output.audioEvent = readExplosionAudioEvent(value.audioEvent, `${label}.audioEvent`);
  }
  if (value.cameraShake !== undefined) {
    output.cameraShake = readCameraShakeConfig(value.cameraShake, `${label}.cameraShake`);
  }
  return output;
}

function readAudioEventBindings(value: unknown, label: string): Partial<Record<LiveEditAudioEventKey, LiveEditAudioEventBinding>> {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    throw new Error(`${label} must include at least one audio event binding.`);
  }

  const output: Partial<Record<LiveEditAudioEventKey, LiveEditAudioEventBinding>> = {};
  for (const [eventKey, binding] of entries) {
    if (!isLiveEditAudioEventKey(eventKey)) {
      throw new Error(`${label} has unsupported audio event key: ${eventKey}`);
    }
    output[eventKey] = readAudioEventBinding(binding, `${label}.${eventKey}`);
  }
  return output;
}

function readAudioEventBinding(value: unknown, label: string): LiveEditAudioEventBinding {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, audioEventBindingKeys, label);

  const output: LiveEditAudioEventBinding = {
    volume: readNumberInRange(value.volume, `${label}.volume`, 0, 1),
    enabled: readBoolean(value.enabled, `${label}.enabled`)
  };
  if (value.assetRef !== undefined) {
    output.assetRef = readAudioAssetRef(value.assetRef, `${label}.assetRef`);
  }
  return output;
}

function readWarningBannerConfig(value: unknown, label: string): LiveEditWarningBannerConfig {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyKnownKeys(value, warningBannerKeys, label);

  return {
    enabled: readBoolean(value.enabled, `${label}.enabled`),
    text: readBoundedText(value.text, `${label}.text`, 1, 40),
    durationMs: readIntegerInRange(value.durationMs, `${label}.durationMs`, 0, 5000)
  };
}

function readRuleEffects(value: unknown, label: string): LiveEditRuleEffect[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) {
    throw new Error(`${label} must contain 1 to 6 collision effects.`);
  }

  return value.map((effect, index) => readRuleEffect(effect, `${label}[${index}]`));
}

function readRuleEffect(value: unknown, label: string): LiveEditRuleEffect {
  if (!isPlainRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  assertOnlyRuleEffectKeys(value, label);

  const type = value.type;
  if (!isLiveEditRuleEffectType(type)) {
    throw new Error(`${label}.type must be a supported collision effect type.`);
  }

  const output: LiveEditRuleEffect = { type };
  if (value.value === undefined) {
    return output;
  }

  if (typeof value.value !== 'number' || !Number.isInteger(value.value) || value.value < 0 || value.value > 1000) {
    throw new Error(`${label}.value must be an integer from 0 to 1000.`);
  }

  output.value = value.value;
  return output;
}

function isLiveEditRuleEffectType(value: unknown): value is LiveEditRuleEffectType {
  return typeof value === 'string' && liveEditRuleEffectTypes.includes(value as LiveEditRuleEffectType);
}

function isLiveEditAudioEventKey(value: string): value is LiveEditAudioEventKey {
  return liveEditAudioEventKeys.includes(value as LiveEditAudioEventKey);
}

function isLiveEditBossAttackPattern(value: unknown): value is LiveEditBossAttackPattern {
  return typeof value === 'string' && liveEditBossAttackPatterns.includes(value as LiveEditBossAttackPattern);
}

function readExplosionAudioEvent(value: unknown, label: string): 'explosion' | 'bossDefeated' {
  if (value !== 'explosion' && value !== 'bossDefeated') {
    throw new Error(`${label} must be explosion or bossDefeated.`);
  }
  return value;
}

function readBossIntroAudioEvent(value: unknown, label: string): 'bossIntro' | 'warning' {
  if (value !== 'bossIntro' && value !== 'warning') {
    throw new Error(`${label} must be bossIntro or warning.`);
  }
  return value;
}

function readBossDefeatAudioEvent(value: unknown, label: string): 'bossDefeated' | 'explosion' {
  if (value !== 'bossDefeated' && value !== 'explosion') {
    throw new Error(`${label} must be bossDefeated or explosion.`);
  }
  return value;
}

function readAudioAssetRef(value: unknown, label: string): `asset:${string}` {
  if (typeof value !== 'string' || !/^asset:[a-z][a-z0-9_]{1,39}$/.test(value)) {
    throw new Error(`${label} must be an audio asset semantic reference.`);
  }
  return value as `asset:${string}`;
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

function readNumberInRange(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a number from ${min} to ${max}.`);
  }
  return value;
}

function readIntegerInRange(value: unknown, label: string, min: number, max: number): number {
  const numberValue = readNumberInRange(value, label, min, max);
  if (!Number.isInteger(numberValue)) {
    throw new Error(`${label} must be an integer.`);
  }
  return numberValue;
}

function readBoundedText(value: unknown, label: string, minLength: number, maxLength: number): string {
  if (typeof value !== 'string' || value.length < minLength || value.length > maxLength) {
    throw new Error(`${label} must be a string from ${minLength} to ${maxLength} characters.`);
  }
  return value;
}

function assertOnlyRuleEffectKeys(value: Record<string, unknown>, label: string): void {
  assertOnlyKnownKeys(value, liveEditRuleEffectKeys, label);
}

function assertOnlyKnownKeys(value: Record<string, unknown>, allowedKeys: ReadonlySet<string>, label: string): void {
  const unsupportedKeys = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unsupportedKeys.length > 0) {
    throw new Error(`${label} has unsupported keys: ${unsupportedKeys.join(', ')}`);
  }
}

function assertSafePathSegment(segment: string, path: string): void {
  const forbiddenSegments = new Set(['src', 'dist', 'build', 'apps', 'packages', 'generated', 'phaser']);
  if (
    segment.length === 0 ||
    segment.includes('/') ||
    segment.includes('\\') ||
    segment.includes('\0') ||
    segment === '.' ||
    segment === '..' ||
    segment === '__proto__' ||
    segment === 'prototype' ||
    segment === 'constructor' ||
    forbiddenSegments.has(segment.toLowerCase())
  ) {
    throw new Error(`live edit path has an unsafe segment: ${path}`);
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readExistingArraySegment(array: unknown[], segment: string, path: string): unknown {
  const index = parseExistingArrayIndex(segment, array.length);
  if (index === null || !Object.prototype.hasOwnProperty.call(array, index)) {
    throw new Error(`live edit array path is missing: ${path}`);
  }

  const value = array[index];
  if (!isPlainRecord(value) && !Array.isArray(value)) {
    throw new Error(`live edit array path is not an object: ${path}`);
  }
  return value;
}

function parseExistingArrayIndex(segment: string, length: number): number | null {
  if (!/^(0|[1-9]\d*)$/.test(segment)) {
    return null;
  }

  const index = Number(segment);
  if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
    return null;
  }
  return index;
}
