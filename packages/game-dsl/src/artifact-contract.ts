import { z } from 'zod';

import { RawGameDslSchema, type RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import { validateRawGameDsl } from './dsl-validator.js';

export const GAME_DSL_ARTIFACT_KIND = 'game_dsl';
export const GAME_DSL_SCHEMA_VERSION = 'game_dsl.v1';
export const DSL_VALIDATION_REPORT_ARTIFACT_KIND = 'dsl_validation_report';
export const DSL_VALIDATION_REPORT_SCHEMA_VERSION = 'dsl_validation_report.v1';

const DslIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const CriticalFieldSchema = z.never();
const StableGenreSchema = z.enum([
  'top_down_shooter',
  'vertical_shooter',
  'side_scrolling_platformer',
  'side_scrolling_run_and_gun',
  'dodger_collector',
  'breakout'
]);
const CoordinateSystemSchema = z.enum(['top_down_2d', 'vertical_scroll_2d', 'side_view_2d', 'grid_2d']);
const ControllerSchema = z.enum(['eight_direction_shoot', 'vertical_shooter', 'run_jump', 'run_jump_shoot', 'paddle', 'dodge_collect']);
const CapabilitySchema = z.enum([
  'top_down_camera',
  'side_view_camera',
  'vertical_scroll_camera',
  'eight_direction_movement',
  'projectile_combat',
  'enemy_waves',
  'collectibles',
  'hazards',
  'gravity_platformer_physics',
  'run_jump_controller',
  'multi_direction_shooting',
  'platforms_terrain_collision',
  'enemy_spawn_triggers',
  'checkpoint_or_lives_system',
  'paddle_ball_physics',
  'brick_collision_grid'
]);

const GameDslBaseObjectSchema = z.strictObject({
  id: DslIdSchema,
  label: z.string().min(1).max(80).optional(),
  unexpectedCriticalField: CriticalFieldSchema.optional()
});

const MovementSchema = z.strictObject({
  type: z.enum(['static', 'eight_direction', 'horizontal', 'vertical', 'chase_player', 'move_left', 'move_right', 'fall_down', 'patrol']),
  speedPxPerSec: z.number().int().min(0).max(2000).optional()
});

const PlayerSchema = GameDslBaseObjectSchema.extend({
  controller: ControllerSchema,
  health: z.strictObject({ max: z.number().int().min(1).max(20) }),
  physics: z.strictObject({ maxSpeed: z.number().int().min(1).max(2000) }),
  render: z.strictObject({ scale: z.number().min(0.1).max(5) }),
  movement: MovementSchema,
  actions: z
    .array(
      z.strictObject({
        id: DslIdSchema,
        type: z.enum(['shoot_projectile', 'collect', 'jump', 'move', 'restart']),
        projectileRef: DslIdSchema.optional(),
        cooldownMs: z.number().int().min(0).max(5000).optional()
      })
    )
    .max(8)
    .default([])
});

const EnemyTypeSchema = GameDslBaseObjectSchema.extend({
  health: z.strictObject({ max: z.number().int().min(1).max(50) }),
  physics: z.strictObject({ speed: z.number().int().min(0).max(2000) }),
  damage: z.number().int().min(0).max(50).optional(),
  movement: MovementSchema,
  projectileRef: DslIdSchema.optional()
});

const ProjectileSchema = GameDslBaseObjectSchema.extend({
  damage: z.number().int().min(1).max(50),
  speed: z.number().int().min(1).max(2000),
  speedPxPerSec: z.number().int().min(1).max(2000)
});

const PickupSchema = GameDslBaseObjectSchema.extend({
  kind: z.enum(['health', 'score', 'weapon', 'powerup']),
  value: z.number().int().min(1).max(9999).optional()
});

const BossSchema = EnemyTypeSchema.extend({
  phases: z.number().int().min(1).max(8)
});

const WaveSchema = z.strictObject({
  id: DslIdSchema,
  enemyTypeRef: DslIdSchema.optional(),
  projectileRef: DslIdSchema.optional(),
  pickupRef: DslIdSchema.optional(),
  trigger: z.enum(['start', 'timer', 'enter_segment', 'reach_x', 'score']),
  count: z.number().int().min(1).max(100).optional(),
  x: z.number().int().min(0).max(20000).optional()
});

const TerrainSchema = z.strictObject({
  id: DslIdSchema,
  kind: z.enum(['platform', 'ground', 'slope', 'wall', 'brick']),
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000),
  width: z.number().int().min(8).max(4000),
  height: z.number().int().min(8).max(2000)
});

const LevelSchema = z.strictObject({
  id: DslIdSchema,
  structure: z.enum(['arena', 'vertical_scroll', 'side_scrolling_stage', 'breakout_grid']),
  waves: z.record(DslIdSchema, WaveSchema),
  terrain: z.array(TerrainSchema).max(120).optional(),
  segments: z.array(z.strictObject({ id: DslIdSchema, startX: z.number().int().min(0), endX: z.number().int().min(1) })).max(24).optional()
});

const AssetsSchema = z.strictObject({
  requiredRoles: z.array(z.string().min(1).max(80)).min(1).max(40),
  style: z.strictObject({
    visualTheme: z.string().min(1).max(120),
    camera: z.enum(['top_down', 'side_view'])
  })
});

const WinLoseSchema = z.strictObject({
  win: z.enum(['enemy_cleared', 'target_score', 'survive_duration', 'reach_exit', 'break_all_bricks']),
  lose: z.enum(['player_health_zero', 'time_up', 'lives_zero', 'none']),
  target: z.number().int().min(1).max(99999).optional(),
  lives: z.number().int().min(1).max(9).optional(),
  checkpoints: z.array(z.number().int().min(0).max(20000)).max(20).optional()
});

export const GameDslArtifactSchema = z.strictObject({
  artifactKind: z.literal(GAME_DSL_ARTIFACT_KIND),
  schemaVersion: z.literal(GAME_DSL_SCHEMA_VERSION),
  dslId: DslIdSchema,
  runId: z.string().min(1).max(120),
  intentPlanRef: z.strictObject({
    artifact: z.literal('intent_plan.json'),
    normalizedGenre: StableGenreSchema,
    matchedAlias: z.string().min(1).max(80).optional()
  }),
  genre: StableGenreSchema,
  requiredCapabilities: z.array(CapabilitySchema).min(1).max(24),
  ipPolicy: z.strictObject({
    protectedNamesAllowed: z.boolean(),
    sourceAliases: z.array(z.string().min(1).max(80)).max(20)
  }),
  world: z.strictObject({
    width: z.number().int().min(320).max(24000),
    height: z.number().int().min(240).max(24000),
    coordinateSystem: CoordinateSystemSchema,
    gravity: z.number().int().min(0).max(4000).optional(),
    visualTheme: z.string().min(1).max(120)
  }),
  camera: z.strictObject({
    mode: z.enum(['fixed', 'follow_player', 'follow_player_x', 'vertical_scroll']),
    targetRef: DslIdSchema.optional()
  }),
  player: PlayerSchema,
  enemyTypes: z.record(DslIdSchema, EnemyTypeSchema),
  projectiles: z.record(DslIdSchema, ProjectileSchema),
  level: LevelSchema,
  assets: AssetsSchema,
  winLose: WinLoseSchema,
  sourceDsl: RawGameDslSchema,
  pickups: z.record(DslIdSchema, PickupSchema).optional(),
  bosses: z.record(DslIdSchema, BossSchema).optional()
});

export type GameDslArtifact = z.infer<typeof GameDslArtifactSchema>;
export type StableGameGenre = GameDslArtifact['genre'];

export type DslValidationReport = z.infer<typeof DslValidationReportSchema>;
export type DslValidationReportIssue = DslValidationReport['errors'][number];

export const DslValidationReportSchema = z.strictObject({
  artifactKind: z.literal(DSL_VALIDATION_REPORT_ARTIFACT_KIND),
  schemaVersion: z.literal(DSL_VALIDATION_REPORT_SCHEMA_VERSION),
  runId: z.string().min(1).max(120),
  validatedArtifact: z.strictObject({
    artifactKind: z.literal(GAME_DSL_ARTIFACT_KIND),
    schemaVersion: z.literal(GAME_DSL_SCHEMA_VERSION),
    dslId: DslIdSchema
  }),
  status: z.enum(['valid', 'invalid']),
  errorCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  errors: z.array(z.strictObject({ code: z.string().min(1), path: z.string().min(1), message: z.string().min(1) })),
  warnings: z.array(z.strictObject({ code: z.string().min(1), path: z.string().min(1), message: z.string().min(1) })),
  normalizedDefaults: z.array(z.strictObject({ path: z.string().min(1), value: z.unknown(), reason: z.string().min(1) })),
  semanticChecks: z.array(z.strictObject({ name: z.string().min(1), status: z.enum(['passed', 'failed']), message: z.string().optional() })),
  requiredCapabilities: z.array(CapabilitySchema)
});

export type GameDslArtifactValidationResult =
  | { ok: true; artifact: GameDslArtifact; report: DslValidationReport }
  | { ok: false; candidate: unknown; report: DslValidationReport };

const genreContracts: Record<
  StableGameGenre,
  {
    coordinateSystem: GameDslArtifact['world']['coordinateSystem'];
    controller: GameDslArtifact['player']['controller'];
    capabilities: GameDslArtifact['requiredCapabilities'];
    levelStructure: GameDslArtifact['level']['structure'];
    requiresCombat: boolean;
    requiresCollectibles: boolean;
    requiresTerrain: boolean;
  }
> = {
  top_down_shooter: {
    coordinateSystem: 'top_down_2d',
    controller: 'eight_direction_shoot',
    capabilities: ['top_down_camera', 'eight_direction_movement', 'projectile_combat', 'enemy_waves'],
    levelStructure: 'arena',
    requiresCombat: true,
    requiresCollectibles: false,
    requiresTerrain: false
  },
  vertical_shooter: {
    coordinateSystem: 'vertical_scroll_2d',
    controller: 'vertical_shooter',
    capabilities: ['vertical_scroll_camera', 'projectile_combat', 'enemy_waves'],
    levelStructure: 'vertical_scroll',
    requiresCombat: true,
    requiresCollectibles: false,
    requiresTerrain: false
  },
  side_scrolling_platformer: {
    coordinateSystem: 'side_view_2d',
    controller: 'run_jump',
    capabilities: ['side_view_camera', 'gravity_platformer_physics', 'run_jump_controller', 'platforms_terrain_collision'],
    levelStructure: 'side_scrolling_stage',
    requiresCombat: false,
    requiresCollectibles: true,
    requiresTerrain: true
  },
  side_scrolling_run_and_gun: {
    coordinateSystem: 'side_view_2d',
    controller: 'run_jump_shoot',
    capabilities: [
      'side_view_camera',
      'gravity_platformer_physics',
      'run_jump_controller',
      'multi_direction_shooting',
      'projectile_combat',
      'enemy_spawn_triggers',
      'platforms_terrain_collision',
      'checkpoint_or_lives_system'
    ],
    levelStructure: 'side_scrolling_stage',
    requiresCombat: true,
    requiresCollectibles: false,
    requiresTerrain: true
  },
  dodger_collector: {
    coordinateSystem: 'top_down_2d',
    controller: 'dodge_collect',
    capabilities: ['top_down_camera', 'eight_direction_movement', 'collectibles', 'hazards'],
    levelStructure: 'arena',
    requiresCombat: false,
    requiresCollectibles: true,
    requiresTerrain: false
  },
  breakout: {
    coordinateSystem: 'grid_2d',
    controller: 'paddle',
    capabilities: ['paddle_ball_physics', 'brick_collision_grid'],
    levelStructure: 'breakout_grid',
    requiresCombat: false,
    requiresCollectibles: false,
    requiresTerrain: true
  }
};

export function buildGameDslArtifact(input: {
  rawDsl: RawGameDsl;
  runId: string;
  intentPlan: { normalizedGenre: string; matchedAlias?: string };
}): GameDslArtifact {
  const genre = toStableGenre(input.rawDsl, input.intentPlan.normalizedGenre);
  const contract = genreContracts[genre];
  const enemyTypes = buildEnemyTypes(input.rawDsl);
  const projectiles = buildProjectiles(input.rawDsl);
  const pickups = buildPickups(input.rawDsl);

  return {
    artifactKind: GAME_DSL_ARTIFACT_KIND,
    schemaVersion: GAME_DSL_SCHEMA_VERSION,
    dslId: stableDslId(input.runId),
    runId: input.runId,
    intentPlanRef: {
      artifact: 'intent_plan.json',
      normalizedGenre: genre,
      ...(input.intentPlan.matchedAlias === undefined ? {} : { matchedAlias: input.intentPlan.matchedAlias })
    },
    genre,
    requiredCapabilities: [...contract.capabilities],
    ipPolicy: {
      protectedNamesAllowed: false,
      sourceAliases: input.intentPlan.matchedAlias === undefined ? [] : [input.intentPlan.matchedAlias]
    },
    world: {
      width: input.rawDsl.world.width,
      height: input.rawDsl.world.height,
      coordinateSystem: input.rawDsl.world.coordinateSystem ?? contract.coordinateSystem,
      ...(input.rawDsl.world.gravity !== undefined ? { gravity: input.rawDsl.world.gravity } : contract.coordinateSystem === 'side_view_2d' ? { gravity: 1200 } : {}),
      visualTheme: input.rawDsl.world.visual_theme
    },
    camera: {
      mode: input.rawDsl.camera?.mode ?? defaultCameraMode(genre),
      targetRef: input.rawDsl.player.id
    },
    player: {
      id: input.rawDsl.player.id,
      label: input.rawDsl.player.label,
      controller: genre === 'side_scrolling_platformer' ? contract.controller : input.rawDsl.player.controller ?? contract.controller,
      health: { max: input.rawDsl.player.health ?? 3 },
      physics: { maxSpeed: input.rawDsl.player.movement.speed_px_per_sec ?? 240 },
      render: { scale: 1 },
      movement: toArtifactMovement(input.rawDsl.player.movement),
      actions: input.rawDsl.player.actions.map((action) => ({
        id: action.id,
        type: action.type,
        ...(action.spawns !== undefined ? { projectileRef: action.spawns } : {}),
        ...(action.cooldown_ms !== undefined ? { cooldownMs: action.cooldown_ms } : {})
      }))
    },
    enemyTypes,
    projectiles,
    level: buildLevel(input.rawDsl, genre),
    assets: {
      requiredRoles: buildAssetRoles(input.rawDsl, pickups),
      style: {
        visualTheme: input.rawDsl.world.visual_theme,
        camera: input.rawDsl.game.camera
      }
    },
    winLose: {
      win: input.rawDsl.winLose?.win ?? input.rawDsl.objectives.win.type,
      lose: input.rawDsl.winLose?.lose ?? input.rawDsl.objectives.lose.type,
      target: input.rawDsl.objectives.win.target,
      lives: input.rawDsl.winLose?.lives,
      checkpoints: input.rawDsl.winLose?.checkpoints
    },
    sourceDsl: input.rawDsl,
    ...(Object.keys(pickups).length > 0 ? { pickups } : {})
  };
}

export function validateGameDslArtifact(input: unknown): GameDslArtifactValidationResult {
  const parsed = GameDslArtifactSchema.safeParse(input);
  const schemaErrors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        code: classifySchemaIssue(issue),
        path: issue.path.map(String).join('.') || '<root>',
        message: issue.message
      }));
  const artifact = parsed.success ? parsed.data : undefined;
  const semantic = artifact === undefined ? { issues: [], checks: [] } : validateGameDslSemantics(artifact);
  const errors = [...schemaErrors, ...semantic.issues];
  const report = buildDslValidationReport({
    runId: readRunId(input),
    dslId: readDslId(input),
    errors,
    warnings: [],
    normalizedDefaults: [],
    semanticChecks: semantic.checks,
    requiredCapabilities: artifact?.requiredCapabilities ?? []
  });

  return artifact !== undefined && errors.length === 0 ? { ok: true, artifact, report } : { ok: false, candidate: input, report };
}

export function buildDslValidationReport(input: {
  runId: string;
  dslId: string;
  errors: DslValidationReportIssue[];
  warnings: DslValidationReportIssue[];
  normalizedDefaults: DslValidationReport['normalizedDefaults'];
  semanticChecks: DslValidationReport['semanticChecks'];
  requiredCapabilities: GameDslArtifact['requiredCapabilities'];
}): DslValidationReport {
  return {
    artifactKind: DSL_VALIDATION_REPORT_ARTIFACT_KIND,
    schemaVersion: DSL_VALIDATION_REPORT_SCHEMA_VERSION,
    runId: input.runId,
    validatedArtifact: {
      artifactKind: GAME_DSL_ARTIFACT_KIND,
      schemaVersion: GAME_DSL_SCHEMA_VERSION,
      dslId: input.dslId
    },
    status: input.errors.length === 0 ? 'valid' : 'invalid',
    errorCount: input.errors.length,
    warningCount: input.warnings.length,
    errors: input.errors,
    warnings: input.warnings,
    normalizedDefaults: input.normalizedDefaults,
    semanticChecks: input.semanticChecks,
    requiredCapabilities: input.requiredCapabilities
  };
}

function validateGameDslSemantics(artifact: GameDslArtifact): {
  issues: DslValidationReportIssue[];
  checks: DslValidationReport['semanticChecks'];
} {
  const issues: DslValidationReportIssue[] = [];
  const checks: DslValidationReport['semanticChecks'] = [];
  const contract = genreContracts[artifact.genre];
  const ids = collectArtifactIds(artifact);

  addCheck(checks, 'source_dsl_validation', validateRawSourceDsl(artifact, issues));
  addCheck(checks, 'source_projection_consistency', validateSourceProjectionConsistency(artifact, issues));
  addCheck(checks, 'stable_ids', validateStableMapIds(artifact, issues));
  addCheck(checks, 'duplicate_ids', validateDuplicateIds(ids, issues));
  addCheck(checks, 'projectile_references', validateProjectileReferences(artifact, issues));
  addCheck(checks, 'enemy_type_references', validateEnemyTypeReferences(artifact, issues));
  addCheck(checks, 'camera_target_reference', validateCameraTargetReference(artifact, issues));
  addCheck(checks, 'genre_coordinate_system', assertSemantic(issues, artifact.world.coordinateSystem === contract.coordinateSystem, 'GENRE_CONTRACT_MISMATCH', 'world.coordinateSystem', `${artifact.genre} requires ${contract.coordinateSystem}`));
  addCheck(checks, 'genre_controller', assertSemantic(issues, artifact.player.controller === contract.controller, 'GENRE_CONTRACT_MISMATCH', 'player.controller', `${artifact.genre} requires ${contract.controller}`));
  addCheck(checks, 'genre_required_capabilities', validateRequiredCapabilities(artifact, contract.capabilities, issues));
  addCheck(checks, 'genre_level_structure', assertSemantic(issues, artifact.level.structure === contract.levelStructure, 'GENRE_CONTRACT_MISMATCH', 'level.structure', `${artifact.genre} requires ${contract.levelStructure}`));
  addCheck(checks, 'genre_required_fields', validateGenreRequiredFields(artifact, contract, issues));
  addCheck(checks, 'ip_alias_leakage', validateIpAliasLeakage(artifact, issues));

  return { issues, checks };
}

function validateStableMapIds(artifact: GameDslArtifact, issues: DslValidationReportIssue[]): boolean {
  const before = issues.length;
  for (const [collectionPath, collection] of [
    ['enemyTypes', artifact.enemyTypes],
    ['projectiles', artifact.projectiles],
    ['pickups', artifact.pickups],
    ['bosses', artifact.bosses],
    ['level.waves', artifact.level.waves]
  ] as const) {
    if (collection === undefined) {
      continue;
    }
    for (const [key, value] of Object.entries(collection)) {
      if (value.id !== key) {
        issues.push({
          code: 'STABLE_ID_REQUIRED',
          path: `${collectionPath}.${key}.id`,
          message: `Object map key "${key}" must match stable id "${value.id}".`
        });
      }
    }
  }

  return issues.length === before;
}

function validateDuplicateIds(ids: Array<[string, string]>, issues: DslValidationReportIssue[]): boolean {
  const before = issues.length;
  const seen = new Map<string, string>();
  for (const [path, id] of ids) {
    const firstPath = seen.get(id);
    if (firstPath !== undefined) {
      issues.push({ code: 'DUPLICATE_ID', path, message: `Duplicate id "${id}" already used at ${firstPath}.` });
      continue;
    }
    seen.set(id, path);
  }

  return issues.length === before;
}

function validateProjectileReferences(artifact: GameDslArtifact, issues: DslValidationReportIssue[]): boolean {
  const before = issues.length;
  for (const [index, action] of artifact.player.actions.entries()) {
    if (action.projectileRef !== undefined && artifact.projectiles[action.projectileRef] === undefined) {
      issues.push({ code: 'UNRESOLVED_PROJECTILE_REFERENCE', path: `player.actions.${index}.projectileRef`, message: `Unknown projectile id "${action.projectileRef}".` });
    }
  }
  for (const [waveId, wave] of Object.entries(artifact.level.waves)) {
    if (wave.projectileRef !== undefined && artifact.projectiles[wave.projectileRef] === undefined) {
      issues.push({ code: 'UNRESOLVED_PROJECTILE_REFERENCE', path: `level.waves.${waveId}.projectileRef`, message: `Unknown projectile id "${wave.projectileRef}".` });
    }
  }
  for (const [enemyTypeId, enemyType] of Object.entries(artifact.enemyTypes)) {
    if (enemyType.projectileRef !== undefined && artifact.projectiles[enemyType.projectileRef] === undefined) {
      issues.push({ code: 'UNRESOLVED_PROJECTILE_REFERENCE', path: `enemyTypes.${enemyTypeId}.projectileRef`, message: `Unknown projectile id "${enemyType.projectileRef}".` });
    }
  }

  return issues.length === before;
}

function validateEnemyTypeReferences(artifact: GameDslArtifact, issues: DslValidationReportIssue[]): boolean {
  const before = issues.length;
  for (const [waveId, wave] of Object.entries(artifact.level.waves)) {
    if (wave.enemyTypeRef !== undefined && artifact.enemyTypes[wave.enemyTypeRef] === undefined) {
      issues.push({ code: 'UNRESOLVED_ENEMY_TYPE_REFERENCE', path: `level.waves.${waveId}.enemyTypeRef`, message: `Unknown enemyType id "${wave.enemyTypeRef}".` });
    }
  }

  return issues.length === before;
}

function validateCameraTargetReference(artifact: GameDslArtifact, issues: DslValidationReportIssue[]): boolean {
  if (artifact.camera.targetRef === undefined || artifact.camera.targetRef === artifact.player.id) {
    return true;
  }

  const knownIds = new Set(collectArtifactIds(artifact).map(([, id]) => id));
  if (knownIds.has(artifact.camera.targetRef)) {
    return true;
  }

  issues.push({ code: 'UNRESOLVED_CAMERA_TARGET_REFERENCE', path: 'camera.targetRef', message: `Unknown camera target id "${artifact.camera.targetRef}".` });
  return false;
}

function validateRequiredCapabilities(
  artifact: GameDslArtifact,
  required: GameDslArtifact['requiredCapabilities'],
  issues: DslValidationReportIssue[]
): boolean {
  const missing = required.filter((capability) => !artifact.requiredCapabilities.includes(capability));
  if (missing.length === 0) {
    return true;
  }

  issues.push({ code: 'GENRE_CONTRACT_MISMATCH', path: 'requiredCapabilities', message: `Missing required capabilities: ${missing.join(', ')}.` });
  return false;
}

function validateGenreRequiredFields(
  artifact: GameDslArtifact,
  contract: (typeof genreContracts)[StableGameGenre],
  issues: DslValidationReportIssue[]
): boolean {
  const before = issues.length;
  if (contract.requiresCombat && (Object.keys(artifact.projectiles).length === 0 || Object.keys(artifact.enemyTypes).length === 0)) {
    issues.push({ code: 'GENRE_CONTRACT_MISMATCH', path: 'projectiles', message: `${artifact.genre} requires projectile combat and enemy types.` });
  }
  if (contract.requiresCollectibles && Object.keys(artifact.pickups ?? {}).length === 0 && !artifact.requiredCapabilities.includes('collectibles')) {
    issues.push({ code: 'GENRE_CONTRACT_MISMATCH', path: 'pickups', message: `${artifact.genre} requires collectible or pickup semantics.` });
  }
  if (contract.requiresTerrain && (artifact.level.terrain?.length ?? 0) === 0) {
    issues.push({ code: 'GENRE_CONTRACT_MISMATCH', path: 'level.terrain', message: `${artifact.genre} requires terrain fields.` });
  }

  return issues.length === before;
}

function validateIpAliasLeakage(artifact: GameDslArtifact, issues: DslValidationReportIssue[]): boolean {
  if (artifact.ipPolicy.protectedNamesAllowed) {
    return true;
  }

  const aliases = artifact.ipPolicy.sourceAliases.map((alias) => alias.toLowerCase());
  if (aliases.length === 0) {
    return true;
  }

  for (const [path, value] of collectProtectedNames(artifact)) {
    const lower = value.toLowerCase();
    const leaked = aliases.find((alias) => lower.includes(alias));
    if (leaked !== undefined) {
      issues.push({ code: 'IP_ALIAS_LEAKAGE', path, message: `Protected source alias "${leaked}" leaked into editable entity name.` });
    }
  }

  return !issues.some((issue) => issue.code === 'IP_ALIAS_LEAKAGE');
}

function assertSemantic(issues: DslValidationReportIssue[], ok: boolean, code: string, path: string, message: string): boolean {
  if (!ok) {
    issues.push({ code, path, message });
  }

  return ok;
}

function addCheck(checks: DslValidationReport['semanticChecks'], name: string, ok: boolean): void {
  checks.push({ name, status: ok ? 'passed' : 'failed' });
}

function collectArtifactIds(artifact: GameDslArtifact): Array<[string, string]> {
  return [
    ['dslId', artifact.dslId],
    ['level.id', artifact.level.id],
    ['player.id', artifact.player.id],
    ...artifact.player.actions.map((action, index) => [`player.actions.${index}.id`, action.id] as [string, string]),
    ...Object.entries(artifact.enemyTypes).map(([key, value]) => [`enemyTypes.${key}.id`, value.id] as [string, string]),
    ...Object.entries(artifact.projectiles).map(([key, value]) => [`projectiles.${key}.id`, value.id] as [string, string]),
    ...Object.entries(artifact.pickups ?? {}).map(([key, value]) => [`pickups.${key}.id`, value.id] as [string, string]),
    ...Object.entries(artifact.bosses ?? {}).map(([key, value]) => [`bosses.${key}.id`, value.id] as [string, string]),
    ...Object.entries(artifact.level.waves).map(([key, value]) => [`level.waves.${key}.id`, value.id] as [string, string]),
    ...(artifact.level.terrain ?? []).map((terrain, index) => [`level.terrain.${index}.id`, terrain.id] as [string, string]),
    ...(artifact.level.segments ?? []).map((segment, index) => [`level.segments.${index}.id`, segment.id] as [string, string])
  ];
}

function validateRawSourceDsl(artifact: GameDslArtifact, issues: DslValidationReportIssue[]): boolean {
  const result = validateRawGameDsl(artifact.sourceDsl);
  if (result.ok) {
    return true;
  }

  for (const issue of result.issues) {
    issues.push({
      code: issue.code,
      path: `sourceDsl.${issue.path}`,
      message: issue.message
    });
  }

  return false;
}

function validateSourceProjectionConsistency(artifact: GameDslArtifact, issues: DslValidationReportIssue[]): boolean {
  const before = issues.length;
  const expected = buildGameDslArtifact({
    rawDsl: artifact.sourceDsl,
    runId: artifact.runId,
    intentPlan: {
      normalizedGenre: artifact.intentPlanRef.normalizedGenre,
      matchedAlias: artifact.intentPlanRef.matchedAlias
    }
  });

  for (const [path, actual, expectedValue] of projectionComparisons(artifact, expected)) {
    if (canonicalJson(actual) !== canonicalJson(expectedValue)) {
      issues.push({
        code: 'SOURCE_PROJECTION_MISMATCH',
        path,
        message: `Top-level artifact projection must match sourceDsl-derived ${path}.`
      });
    }
  }

  return issues.length === before;
}

function projectionComparisons(artifact: GameDslArtifact, expected: GameDslArtifact): Array<[string, unknown, unknown]> {
  return [
    ['dslId', artifact.dslId, expected.dslId],
    ['intentPlanRef', artifact.intentPlanRef, expected.intentPlanRef],
    ['genre', artifact.genre, expected.genre],
    ['requiredCapabilities', artifact.requiredCapabilities, expected.requiredCapabilities],
    ['ipPolicy', artifact.ipPolicy, expected.ipPolicy],
    ['world', artifact.world, expected.world],
    ['camera', artifact.camera, expected.camera],
    ['player', sourceConsistentPlayer(artifact.player), sourceConsistentPlayer(expected.player)],
    ['enemyTypes', sourceConsistentEnemyTypes(artifact.enemyTypes), sourceConsistentEnemyTypes(expected.enemyTypes)],
    ['projectiles', sourceConsistentProjectiles(artifact.projectiles), sourceConsistentProjectiles(expected.projectiles)],
    ['level', artifact.level, expected.level],
    ['assets', artifact.assets, expected.assets],
    ['winLose', artifact.winLose, expected.winLose],
    ['pickups', artifact.pickups ?? {}, expected.pickups ?? {}],
    ['bosses', artifact.bosses ?? {}, expected.bosses ?? {}]
  ];
}

function sourceConsistentPlayer(player: GameDslArtifact['player']): Omit<GameDslArtifact['player'], 'health' | 'physics' | 'render'> {
  const { health: _health, physics: _physics, render: _render, ...rest } = player;
  return rest;
}

function sourceConsistentEnemyTypes(enemyTypes: GameDslArtifact['enemyTypes']): Record<string, Omit<GameDslArtifact['enemyTypes'][string], 'health' | 'physics'>> {
  return Object.fromEntries(
    Object.entries(enemyTypes).map(([id, enemyType]) => {
      const { health: _health, physics: _physics, ...rest } = enemyType;
      return [id, rest];
    })
  );
}

function sourceConsistentProjectiles(projectiles: GameDslArtifact['projectiles']): Record<string, Omit<GameDslArtifact['projectiles'][string], 'damage' | 'speed' | 'speedPxPerSec'>> {
  return Object.fromEntries(
    Object.entries(projectiles).map(([id, projectile]) => {
      const { damage: _damage, speed: _speed, speedPxPerSec: _speedPxPerSec, ...rest } = projectile;
      return [id, rest];
    })
  );
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function collectProtectedNames(artifact: GameDslArtifact): Array<[string, string]> {
  return [
    ['player.label', artifact.player.label ?? artifact.player.id],
    ...Object.entries(artifact.enemyTypes).map(([key, value]) => [`enemyTypes.${key}.label`, value.label ?? value.id] as [string, string]),
    ...Object.entries(artifact.projectiles).map(([key, value]) => [`projectiles.${key}.label`, value.label ?? value.id] as [string, string]),
    ...Object.entries(artifact.pickups ?? {}).map(([key, value]) => [`pickups.${key}.label`, value.label ?? value.id] as [string, string]),
    ...Object.entries(artifact.bosses ?? {}).map(([key, value]) => [`bosses.${key}.label`, value.label ?? value.id] as [string, string])
  ];
}

function classifySchemaIssue(issue: z.core.$ZodIssue): string {
  if (issue.code === 'unrecognized_keys') {
    return 'UNKNOWN_CRITICAL_FIELD';
  }
  if (issue.code === 'invalid_value') {
    return 'INVALID_ENUM_VALUE';
  }
  if (issue.code === 'too_small' || issue.code === 'too_big') {
    return 'INVALID_NUMBER_RANGE';
  }
  if (issue.path.some((part) => part === 'genre')) {
    return 'NON_NORMALIZED_GENRE';
  }

  return 'SCHEMA_VALIDATION_FAILED';
}

function readRunId(input: unknown): string {
  return input !== null && typeof input === 'object' && 'runId' in input && typeof input.runId === 'string' ? input.runId : 'unknown_run';
}

function readDslId(input: unknown): string {
  return input !== null && typeof input === 'object' && 'dslId' in input && typeof input.dslId === 'string' ? input.dslId : 'invalid_dsl';
}

function toStableGenre(rawDsl: RawGameDsl, normalizedGenre: string): StableGameGenre {
  if (isStableGenre(normalizedGenre)) {
    return normalizedGenre;
  }
  if (rawDsl.game.genre === 'shooter') {
    return 'top_down_shooter';
  }
  if (rawDsl.game.genre === 'collector' || rawDsl.game.genre === 'dodger') {
    return 'dodger_collector';
  }

  return rawDsl.game.genre;
}

function isStableGenre(value: string): value is StableGameGenre {
  return StableGenreSchema.safeParse(value).success;
}

function stableDslId(runId: string): string {
  const suffix = runId.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^run_/, '').slice(0, 31);
  return DslIdSchema.safeParse(`d_${suffix}`).success ? `d_${suffix}` : 'd_generated';
}

function defaultCameraMode(genre: StableGameGenre): GameDslArtifact['camera']['mode'] {
  if (genre === 'vertical_shooter') {
    return 'vertical_scroll';
  }
  if (genre === 'side_scrolling_platformer' || genre === 'side_scrolling_run_and_gun') {
    return 'follow_player_x';
  }

  return 'follow_player';
}

function toArtifactMovement(movement: RawGameDsl['player']['movement']): GameDslArtifact['player']['movement'] {
  return {
    type: movement.type,
    ...(movement.speed_px_per_sec !== undefined ? { speedPxPerSec: movement.speed_px_per_sec } : {})
  };
}

function buildEnemyTypes(rawDsl: RawGameDsl): GameDslArtifact['enemyTypes'] {
  const explicit = rawDsl.enemyTypes ?? [];
  const fromEntities = rawDsl.entities.filter((entity) => entity.kind === 'enemy' || entity.kind === 'hazard');
  const entries = explicit.length > 0 ? explicit : fromEntities;

  return Object.fromEntries(
    entries.map((entity) => [
      entity.id,
      {
        id: entity.id,
        label: entity.label,
        health: { max: entity.health ?? 1 },
        physics: { speed: entity.movement.speed_px_per_sec ?? 0 },
        damage: 'damage' in entity && typeof entity.damage === 'number' ? entity.damage : undefined,
        movement: toArtifactMovement(entity.movement)
      }
    ])
  );
}

function buildProjectiles(rawDsl: RawGameDsl): GameDslArtifact['projectiles'] {
  const entries = [
    ...rawDsl.entities.filter((entity) => entity.kind === 'projectile'),
    ...(rawDsl.projectiles ?? []).filter((projectile) => !rawDsl.entities.some((entity) => entity.id === projectile.id))
  ];

  return Object.fromEntries(
    entries.map((entity) => [
      entity.id,
      {
        id: entity.id,
        label: entity.label,
        damage: entity.damage ?? 1,
        speed: 'speed_px_per_sec' in entity ? entity.speed_px_per_sec : entity.movement.speed_px_per_sec ?? 480,
        speedPxPerSec: 'speed_px_per_sec' in entity ? entity.speed_px_per_sec : entity.movement.speed_px_per_sec ?? 480
      }
    ])
  );
}

function buildPickups(rawDsl: RawGameDsl): NonNullable<GameDslArtifact['pickups']> {
  if (rawDsl.pickups !== undefined && rawDsl.pickups.length > 0) {
    return Object.fromEntries(rawDsl.pickups.map((pickup) => [pickup.id, { id: pickup.id, label: pickup.label, kind: pickup.kind }]));
  }

  return Object.fromEntries(
    rawDsl.entities
      .filter((entity) => entity.kind === 'collectible')
      .map((entity) => [entity.id, { id: entity.id, label: entity.label, kind: 'score' as const, value: entity.count }])
  );
}

function buildLevel(rawDsl: RawGameDsl, genre: StableGameGenre): GameDslArtifact['level'] {
  const contract = genreContracts[genre];
  const waves = rawDsl.level?.spawns.map((spawn) => ({
    id: spawn.id,
    enemyTypeRef: spawn.enemyType,
    trigger: spawn.trigger,
    x: spawn.x,
    count: spawn.count
  })) ?? buildEntityWaves(rawDsl);

  return {
    id: 'level_main',
    structure: contract.levelStructure,
    waves: Object.fromEntries(waves.map((wave) => [wave.id, wave])),
    ...(rawDsl.level?.terrain !== undefined ? { terrain: rawDsl.level.terrain } : contract.requiresTerrain ? { terrain: [] } : {}),
    ...(rawDsl.level?.segments !== undefined ? { segments: rawDsl.level.segments } : {})
  };
}

function buildEntityWaves(rawDsl: RawGameDsl): GameDslArtifact['level']['waves'][string][] {
  return rawDsl.entities
    .filter((entity) => entity.kind === 'enemy' || entity.kind === 'hazard')
    .map((entity) => ({
      id: `${entity.id}_wave`,
      enemyTypeRef: entity.id,
      trigger: 'start' as const,
      count: entity.count ?? 1
    }));
}

function buildAssetRoles(rawDsl: RawGameDsl, pickups: NonNullable<GameDslArtifact['pickups']>): string[] {
  return [
    'player_character',
    ...(Object.keys(buildEnemyTypes(rawDsl)).length > 0 ? ['enemy'] : []),
    ...(Object.keys(buildProjectiles(rawDsl)).length > 0 ? ['projectile'] : []),
    ...(Object.keys(pickups).length > 0 ? ['collectible'] : []),
    'background'
  ];
}
