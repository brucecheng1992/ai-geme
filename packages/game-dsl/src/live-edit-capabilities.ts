import { isEndToEndLiveEditStatus, type LiveEditCapabilityStatus } from './live-edit-capability-status.js';

export type LiveEditRuntimeCapabilityInventory = {
  hot: readonly string[];
  assetSwap: readonly string[];
  warmRestart: readonly string[];
  rebuildRequired: readonly string[];
};

export type LiveEditCapabilityRuntimeMode = 'hot' | 'asset-swap' | 'warm-restart' | 'rebuild-required' | 'not-listed';

export interface LiveEditCapabilityExposure {
  key: string;
  label: string;
  examples: readonly string[];
  dslPaths: readonly string[];
  dslSchema: boolean;
  promptContext: boolean;
  artifactContract: boolean;
  resolver: boolean;
  runtimeCapabilityList: boolean;
  parserMapping: boolean;
  semanticPatchShape: boolean;
  runtimePatchAdapter: boolean;
  phaserRuntimeBehavior: boolean;
  acceptRejectUndoTested: boolean;
  contractTests: boolean;
  status: LiveEditCapabilityStatus;
  diagnostic: string;
  blockedFallbacks: readonly string[];
  notes?: string;
  nextAction?: string;
}

export type LiveEditCapabilityExposureSummary = Pick<
  LiveEditCapabilityExposure,
  'key' | 'label' | 'status' | 'diagnostic' | 'blockedFallbacks'
> & {
  runtimeCapabilityMode: LiveEditCapabilityRuntimeMode;
  registrySupportedEndToEnd: boolean;
  supportedEndToEnd: boolean;
};

const supportedBooleans = {
  dslSchema: true,
  promptContext: true,
  artifactContract: true,
  resolver: false,
  runtimeCapabilityList: true,
  parserMapping: true,
  semanticPatchShape: true,
  runtimePatchAdapter: true,
  phaserRuntimeBehavior: true,
  acceptRejectUndoTested: true,
  contractTests: true
} as const;

function supported(input: {
  key: string;
  label: string;
  examples: readonly string[];
  dslPaths: readonly string[];
  diagnostic: string;
  notes?: string;
}): LiveEditCapabilityExposure {
  return {
    ...supportedBooleans,
    ...input,
    status: 'supported-live-edit',
    blockedFallbacks: []
  };
}

function notExposed(input: {
  key: string;
  label: string;
  examples: readonly string[];
  dslPaths: readonly string[];
  status?: LiveEditCapabilityStatus;
  dslSchema?: boolean;
  promptContext?: boolean;
  artifactContract?: boolean;
  resolver?: boolean;
  runtimeCapabilityList?: boolean;
  diagnostic: string;
  blockedFallbacks?: readonly string[];
  notes?: string;
  nextAction?: string;
}): LiveEditCapabilityExposure {
  return {
    dslSchema: input.dslSchema ?? false,
    promptContext: input.promptContext ?? false,
    artifactContract: input.artifactContract ?? false,
    resolver: input.resolver ?? false,
    runtimeCapabilityList: input.runtimeCapabilityList ?? false,
    parserMapping: false,
    semanticPatchShape: false,
    runtimePatchAdapter: false,
    phaserRuntimeBehavior: false,
    acceptRejectUndoTested: false,
    contractTests: false,
    status: input.status ?? 'known-not-exposed',
    blockedFallbacks: input.blockedFallbacks ?? [],
    key: input.key,
    label: input.label,
    examples: input.examples,
    dslPaths: input.dslPaths,
    diagnostic: input.diagnostic,
    notes: input.notes,
    nextAction: input.nextAction
  };
}

/**
 * Canonical exposure matrix for Workbench live editing. A runtime capability
 * path being listed here only means the system knows the domain; `status`
 * remains the source of truth for whether Workbench may claim live-edit support.
 */
export const liveEditCapabilityExposureRegistry = [
  supported({
    key: 'player.speed',
    label: 'Player speed',
    examples: ['提高玩家速度', 'player speed increase'],
    dslPaths: ['/player/physics/maxSpeed'],
    diagnostic: 'Player speed is an end-to-end Workbench live-edit field.'
  }),
  supported({
    key: 'player.health',
    label: 'Player health',
    examples: ['增加玩家血量', 'player hp more'],
    dslPaths: ['/player/health/max'],
    diagnostic: 'Player health is an end-to-end Workbench live-edit field.'
  }),
  supported({
    key: 'player.scale',
    label: 'Player scale',
    examples: ['玩家变大一点', 'make player bigger'],
    dslPaths: ['/player/render/scale'],
    diagnostic: 'Player scale is an end-to-end Workbench live-edit field.'
  }),
  supported({
    key: 'player.label',
    label: 'Player concept',
    examples: ['把玩家角色改成小猫'],
    dslPaths: ['/player/label'],
    diagnostic: 'Player concept edits are supported through validated warm restart.'
  }),
  supported({
    key: 'enemy.speed',
    label: 'Enemy speed',
    examples: ['敌人速度增加', 'enemy speed higher'],
    dslPaths: ['/enemyTypes/*/physics/speed'],
    diagnostic: 'Enemy speed is an end-to-end Workbench live-edit field.'
  }),
  supported({
    key: 'enemy.health',
    label: 'Enemy health',
    examples: ['敌人血量增加', 'enemy health higher'],
    dslPaths: ['/enemyTypes/*/health/max'],
    diagnostic: 'Enemy health is an end-to-end Workbench live-edit field.'
  }),
  supported({
    key: 'enemy.label',
    label: 'Enemy concept',
    examples: ['把敌人从外星人修改成猫'],
    dslPaths: ['/enemyTypes/*/label'],
    diagnostic: 'Enemy concept edits are supported through validated warm restart.'
  }),
  supported({
    key: 'enemy.count',
    label: 'Enemy count',
    examples: ['增加敌人数量', 'increase wave count'],
    dslPaths: ['/level/waves/*/count'],
    diagnostic: 'Enemy count edits are supported through validated warm restart.'
  }),
  supported({
    key: 'projectile.speed',
    label: 'Projectile speed',
    examples: ['子弹速度提高', 'projectile speed increase'],
    dslPaths: ['/projectiles/*/speed'],
    diagnostic: 'Projectile speed is an end-to-end Workbench live-edit field.'
  }),
  supported({
    key: 'projectile.damage',
    label: 'Projectile damage',
    examples: ['提高子弹伤害', 'bullet damage stronger'],
    dslPaths: ['/projectiles/*/damage'],
    diagnostic: 'Projectile damage is an end-to-end Workbench live-edit field.'
  }),
  supported({
    key: 'world.width',
    label: 'World width',
    examples: ['扩大世界宽度', 'make world wider'],
    dslPaths: ['/world/width'],
    diagnostic: 'World width edits are supported through validated warm restart.'
  }),
  notExposed({
    key: 'pickups.enabled',
    label: 'Pickup drops',
    examples: ['开启补给掉落', '增加武器掉落'],
    dslPaths: ['/pickups'],
    dslSchema: true,
    promptContext: true,
    artifactContract: true,
    runtimeCapabilityList: true,
    diagnostic: 'Pickup concepts are known, but pickup drop behavior is not exposed as a Workbench live-edit field.',
    blockedFallbacks: ['enemy.count', 'projectile.damage'],
    nextAction: 'Step 30.2 Pickups Editable Contract'
  }),
  notExposed({
    key: 'pickups.dropRate',
    label: 'Pickup drop rate',
    examples: ['提高补给掉落概率'],
    dslPaths: ['/pickups', '/pickups/dropRate'],
    promptContext: true,
    runtimeCapabilityList: true,
    diagnostic: 'Pickup drop rate is not currently mapped to parser, patch, runtime adapter, and tests.',
    blockedFallbacks: ['enemy.count']
  }),
  notExposed({
    key: 'pickups.weapon',
    label: 'Weapon pickup',
    examples: ['让敌人掉落散弹', '加入激光武器掉落'],
    dslPaths: ['/pickups', '/pickups/items/*/effect/weaponRef'],
    promptContext: true,
    runtimeCapabilityList: true,
    diagnostic: 'Weapon pickup semantics are known, but Workbench cannot live-edit weapon drop behavior yet.',
    blockedFallbacks: ['enemy.count', 'projectile.damage'],
    nextAction: 'Step 30.2 Pickups Editable Contract'
  }),
  notExposed({
    key: 'pickups.shield',
    label: 'Shield pickup',
    examples: ['增加护盾补给'],
    dslPaths: ['/pickups', '/pickups/items/*/effect/type'],
    promptContext: true,
    runtimeCapabilityList: true,
    diagnostic: 'Shield pickup semantics are not yet productized as live-edit patches.',
    blockedFallbacks: ['player.health']
  }),
  notExposed({
    key: 'bosses.enabled',
    label: 'Boss encounter',
    examples: ['增加关底 Boss'],
    dslPaths: ['/bosses'],
    status: 'warm-restart-only',
    promptContext: true,
    artifactContract: true,
    runtimeCapabilityList: true,
    diagnostic: 'Bosses are listed as warm restart placeholders, not live-editable runtime patch behavior.',
    blockedFallbacks: ['enemy.count'],
    nextAction: 'Step 30.3 Bosses Editable Contract'
  }),
  notExposed({
    key: 'bosses.health',
    label: 'Boss health',
    examples: ['让 Boss 血量更高'],
    dslPaths: ['/bosses', '/bosses/items/*/health'],
    promptContext: true,
    artifactContract: true,
    runtimeCapabilityList: true,
    diagnostic: 'Boss health is not mapped to a boss-specific live-edit patch contract yet.',
    blockedFallbacks: ['enemy.health']
  }),
  notExposed({
    key: 'bosses.healthBar',
    label: 'Boss health bar',
    examples: ['显示 Boss 血条'],
    dslPaths: ['/bosses', '/bosses/items/*/healthBar/enabled'],
    promptContext: true,
    runtimeCapabilityList: true,
    diagnostic: 'Boss health bars are not productized as live-edit runtime behavior yet.'
  }),
  notExposed({
    key: 'bosses.attackPatterns',
    label: 'Boss attack patterns',
    examples: ['Boss 有三种攻击模式'],
    dslPaths: ['/bosses', '/bosses/items/*/phases/*/attacks'],
    promptContext: true,
    runtimeCapabilityList: true,
    diagnostic: 'Boss attack pattern requests need structured enum slots before live-edit support can be claimed.',
    blockedFallbacks: ['enemy.count', 'projectile.damage']
  }),
  notExposed({
    key: 'bosses.introWarning',
    label: 'Boss intro warning',
    examples: ['Boss 登场时显示 WARNING'],
    dslPaths: ['/bosses', '/bosses/items/*/intro/warningEnabled'],
    promptContext: true,
    runtimeCapabilityList: true,
    diagnostic: 'Boss intro warnings are known but not bound to parser, patch, runtime adapter, and tests.'
  }),
  notExposed({
    key: 'bosses.defeatEffect',
    label: 'Boss defeat effect',
    examples: ['Boss 死亡大爆炸'],
    dslPaths: ['/bosses', '/bosses/items/*/defeat/explosionEffect'],
    promptContext: true,
    runtimeCapabilityList: true,
    diagnostic: 'Boss defeat effects are not exposed as live-edit feedback runtime behavior.'
  }),
  notExposed({
    key: 'audio.events.pickupCollected',
    label: 'Pickup audio event',
    examples: ['获得武器时播放提示音'],
    dslPaths: ['/audio/events/pickupCollected'],
    status: 'resolver-only',
    promptContext: true,
    resolver: true,
    diagnostic: 'Audio assets can be resolved, but pickup audio event binding is not a live-edit field.',
    blockedFallbacks: ['projectile.damage']
  }),
  notExposed({
    key: 'audio.events.explosion',
    label: 'Explosion audio event',
    examples: ['爆炸音效更强'],
    dslPaths: ['/audio/events/explosion'],
    status: 'resolver-only',
    promptContext: true,
    resolver: true,
    diagnostic: 'Audio resolver support does not imply live-editable explosion event binding.',
    blockedFallbacks: ['projectile.damage']
  }),
  notExposed({
    key: 'audio.events.warning',
    label: 'Warning audio event',
    examples: ['播放警告提示音'],
    dslPaths: ['/audio/events/warning'],
    status: 'resolver-only',
    promptContext: true,
    resolver: true,
    diagnostic: 'Warning audio event binding is resolver-known but not live-editable.'
  }),
  notExposed({
    key: 'feedback.cameraShake',
    label: 'Camera shake',
    examples: ['屏幕震动', 'Boss 登场时屏幕震动'],
    dslPaths: ['/feedback/cameraShake'],
    promptContext: true,
    diagnostic: 'Camera shake is not currently exposed as a live-edit runtime feedback contract.',
    blockedFallbacks: ['world.width'],
    nextAction: 'Step 30.4 Runtime Feedback Effects Contract'
  }),
  notExposed({
    key: 'feedback.hitFlash',
    label: 'Hit flash',
    examples: ['玩家受击后闪烁'],
    dslPaths: ['/feedback/hitFlash'],
    promptContext: true,
    diagnostic: 'Hit flash is recognized as a future feedback concept, but it is not live-editable yet.',
    blockedFallbacks: ['player.health']
  }),
  notExposed({
    key: 'player.invulnerabilityFrames',
    label: 'Player invulnerability frames',
    examples: ['玩家受击后短暂无敌'],
    dslPaths: ['/player/invulnerabilityFrames'],
    promptContext: true,
    diagnostic: 'Invulnerability frames require collision lifecycle support before live-edit exposure.',
    blockedFallbacks: ['player.health']
  }),
  notExposed({
    key: 'effects.explosion',
    label: 'Explosion visual effect',
    examples: ['击败 Boss 时触发大爆炸'],
    dslPaths: ['/effects/explosion'],
    promptContext: true,
    diagnostic: 'Explosion visual effects are not equivalent to audio or projectile damage live-edit fields.',
    blockedFallbacks: ['projectile.damage']
  }),
  notExposed({
    key: 'collision.effects',
    label: 'Collision-triggered effects',
    examples: ['碰撞触发效果'],
    dslPaths: ['/rules/collisions/*/effects'],
    status: 'schema-only',
    dslSchema: true,
    artifactContract: true,
    resolver: true,
    diagnostic: 'Collision effects exist in schema/rules, but Workbench live-edit runtime hooks are not productized.'
  }),
  notExposed({
    key: 'hazards.damage',
    label: 'Hazard damage',
    examples: ['陷阱伤害更高'],
    dslPaths: ['/hazards/*/damage'],
    promptContext: true,
    diagnostic: 'Hazard damage is a known gameplay concept, but not a Workbench live-edit field.',
    blockedFallbacks: ['enemy.health', 'projectile.damage']
  }),
  notExposed({
    key: 'hazards.movement',
    label: 'Moving hazards',
    examples: ['加入会移动的陷阱'],
    dslPaths: ['/hazards/*/movement'],
    status: 'requires-generator-gate',
    promptContext: true,
    diagnostic: 'Moving hazards likely require generator/runtime source gate before live-edit support.',
    blockedFallbacks: ['enemy.count']
  }),
  notExposed({
    key: 'obstacles.platforms',
    label: 'Platforms and obstacles',
    examples: ['加平台', '添加障碍物'],
    dslPaths: ['/level/terrain', '/obstacles'],
    status: 'requires-generator-gate',
    promptContext: true,
    diagnostic: 'Platforms and obstacles require generator/runtime gate before live-edit exposure.',
    blockedFallbacks: ['world.width', 'enemy.count']
  })
] as const satisfies readonly LiveEditCapabilityExposure[];

export function findLiveEditCapabilityExposure(key: string): LiveEditCapabilityExposure | undefined {
  return liveEditCapabilityExposureRegistry.find((entry) => entry.key === key);
}

export function listLiveEditCapabilityExposuresByStatus(status: LiveEditCapabilityStatus): LiveEditCapabilityExposure[] {
  return liveEditCapabilityExposureRegistry.filter((entry) => entry.status === status);
}

export function isLiveEditCapabilitySupportedEndToEnd(key: string): boolean {
  const exposure = findLiveEditCapabilityExposure(key);
  return exposure !== undefined && isEndToEndLiveEditStatus(exposure.status);
}

export function classifyLiveEditCapabilityRuntimeMode(
  exposure: LiveEditCapabilityExposure,
  inventory: LiveEditRuntimeCapabilityInventory
): LiveEditCapabilityRuntimeMode {
  if (isAnyPathListed(exposure.dslPaths, inventory.hot)) {
    return 'hot';
  }
  if (isAnyPathListed(exposure.dslPaths, inventory.assetSwap)) {
    return 'asset-swap';
  }
  if (isAnyPathListed(exposure.dslPaths, inventory.warmRestart)) {
    return 'warm-restart';
  }
  if (isAnyPathListed(exposure.dslPaths, inventory.rebuildRequired)) {
    return 'rebuild-required';
  }
  return 'not-listed';
}

export function summarizeLiveEditCapabilityExposure(inventory: LiveEditRuntimeCapabilityInventory): LiveEditCapabilityExposureSummary[] {
  return liveEditCapabilityExposureRegistry.map((exposure) => {
    const runtimeCapabilityMode = classifyLiveEditCapabilityRuntimeMode(exposure, inventory);
    const registrySupportedEndToEnd = isEndToEndLiveEditStatus(exposure.status);
    return {
      key: exposure.key,
      label: exposure.label,
      status: exposure.status,
      diagnostic: exposure.diagnostic,
      blockedFallbacks: exposure.blockedFallbacks,
      runtimeCapabilityMode,
      registrySupportedEndToEnd,
      supportedEndToEnd: registrySupportedEndToEnd && runtimeCapabilityMode !== 'not-listed'
    };
  });
}

function isAnyPathListed(paths: readonly string[], patterns: readonly string[]): boolean {
  return paths.some((path) => patterns.some((pattern) => pathMatchesRuntimePattern(path, pattern)));
}

function pathMatchesRuntimePattern(path: string, pattern: string): boolean {
  if (path === pattern || path.startsWith(`${pattern}/`)) {
    return true;
  }

  if (!pattern.includes('*')) {
    return false;
  }

  const pathSegments = path.split('/').slice(1);
  const patternSegments = pattern.split('/').slice(1);
  return pathSegments.length === patternSegments.length && patternSegments.every((segment, index) => segment === '*' || segment === pathSegments[index]);
}
