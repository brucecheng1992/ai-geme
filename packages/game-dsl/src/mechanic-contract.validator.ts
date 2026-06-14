import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import type { DslValidationIssue } from './validation.types.js';

type DslEntity = RawGameDsl['entities'][number];
type DslCollision = RawGameDsl['rules']['collisions'][number];

const noMovement = new Set(['static']);

/**
 * Validates that a DSL keeps its genre's base gameplay loop inside the current
 * P0 template envelope.
 *
 * The prompt may describe mixed ideas, but the validator only accepts objective
 * combinations that the selected Phaser template can currently realize without
 * dropping semantics.
 */
export function validateMechanicContract(raw: RawGameDsl): DslValidationIssue[] {
  if (raw.game.genre === 'collector') {
    return validateCollector(raw);
  }

  if (raw.game.genre === 'dodger') {
    return validateDodger(raw);
  }

  if (raw.game.genre === 'side_scrolling_run_and_gun') {
    return validateSideScrollingRunAndGun(raw);
  }

  return validateShooter(raw);
}

export function validateObjectiveReachability(raw: RawGameDsl): DslValidationIssue[] {
  if (raw.game.genre === 'shooter') {
    return validateShooterObjectiveReachability(raw);
  }

  if (raw.objectives.win.type !== 'target_score') {
    return [];
  }

  const scoreKind = raw.game.genre === 'collector' ? 'collectible' : 'enemy';
  const reachable = maxReachableScoreForKind(raw, scoreKind) >= (raw.objectives.win.target ?? 1);

  return reachable
    ? []
    : [{ code: 'UNREACHABLE_OBJECTIVE', path: 'objectives.win.target', message: 'target_score cannot be reached from scoring rules' }];
}

function validateShooterObjectiveReachability(raw: RawGameDsl): DslValidationIssue[] {
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const hitCollision = projectile && enemy ? findCollision(raw, projectile.id, enemy.id, 'projectile_hit') : undefined;
  const enemyCount = enemy?.count ?? 1;

  if (raw.objectives.win.type === 'enemy_cleared') {
    return (raw.objectives.win.target ?? enemyCount) <= enemyCount
      ? []
      : [
          {
            code: 'UNREACHABLE_OBJECTIVE',
            path: 'objectives.win.target',
            message: 'enemy_cleared target cannot exceed primary enemy count'
          }
        ];
  }

  if (raw.objectives.win.type !== 'target_score') {
    return [];
  }

  const reachableScore = enemyCount * scoreAddValue(hitCollision);
  return reachableScore >= (raw.objectives.win.target ?? 1)
    ? []
    : [
        {
          code: 'UNREACHABLE_OBJECTIVE',
          path: 'objectives.win.target',
          message: 'target_score cannot be reached from primary shooter enemy wave'
        }
      ];
}

function validateCollector(raw: RawGameDsl): DslValidationIssue[] {
  const collectible = raw.entities.find((entity) => entity.kind === 'collectible');
  const collectCollision = collectible ? findCollision(raw, raw.player.id, collectible.id, 'overlap') : undefined;
  const scoreValue = scoreAddValue(collectCollision);
  const loseAllowed = raw.objectives.lose.type === 'none' || raw.objectives.lose.type === 'time_up';

  return mechanicIssues([
    [canMove(raw), 'player.can_move'],
    [collectible !== undefined, 'collectible.exists'],
    [collectCollision !== undefined, 'collision.player_collects_item'],
    [scoreValue > 0, 'score.changed'],
    [raw.objectives.win.type === 'target_score', 'win.target_score'],
    [loseAllowed, 'lose.none_or_time_up']
  ]);
}

function validateDodger(raw: RawGameDsl): DslValidationIssue[] {
  const hazard = raw.entities.find((entity) => entity.kind === 'hazard');
  const hazardCollision = hazard ? findCollision(raw, raw.player.id, hazard.id, 'overlap') : undefined;
  const damagesOrEnds = hazardCollision?.effects.some((effect) => effect.type === 'damage' || effect.type === 'end_game') === true;
  const loseAllowed = raw.objectives.lose.type === 'player_health_zero' || raw.objectives.lose.type === 'time_up';

  return mechanicIssues([
    [canMove(raw), 'player.can_move'],
    [hazard !== undefined, 'hazard.exists'],
    [hazard !== undefined, 'hazard.spawn'],
    [hazardCollision !== undefined, 'collision.player_hits_hazard'],
    [damagesOrEnds, 'player.damaged_or_game_lost'],
    [raw.objectives.win.type === 'survive_duration', 'win.survive_duration'],
    [loseAllowed, 'lose.player_health_zero_or_time_up']
  ]);
}

function validateShooter(raw: RawGameDsl): DslValidationIssue[] {
  const enemies = raw.entities.filter((entity) => entity.kind === 'enemy');
  const projectiles = raw.entities.filter((entity) => entity.kind === 'projectile');
  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  const fireAction = raw.player.actions.find((action) => action.type === 'shoot_projectile');
  const hitCollision = projectile && enemy ? findCollision(raw, projectile.id, enemy.id, 'projectile_hit') : undefined;
  const damagesEnemy = hitCollision?.effects.some((effect) => effect.type === 'damage' || effect.type === 'destroy') === true;
  const clearsEnemy = hitCollision?.effects.some((effect) => effect.type === 'destroy') === true;
  const scoreValue = scoreAddValue(hitCollision);
  const maxScore = (enemy?.count ?? 1) * scoreValue;
  const winAllowed = raw.objectives.win.type === 'enemy_cleared' || raw.objectives.win.type === 'target_score';
  const progresses =
    (raw.objectives.win.type === 'enemy_cleared' && clearsEnemy) ||
    (raw.objectives.win.type === 'target_score' && scoreValue > 0 && maxScore >= (raw.objectives.win.target ?? 1));

  return mechanicIssues([
    [canMove(raw), 'player.can_move'],
    [fireAction !== undefined, 'player.can_fire'],
    [projectile !== undefined && fireAction?.spawns === projectile.id, 'projectile.exists'],
    [enemy !== undefined, 'enemy.exists'],
    [enemies.length === 1, 'enemy.single_primary'],
    [projectiles.length === 1, 'projectile.single_primary'],
    [hitCollision !== undefined, 'collision.projectile_hits_enemy'],
    [enemy?.health !== undefined && damagesEnemy, 'enemy.can_take_damage'],
    [clearsEnemy, 'enemy.can_be_cleared'],
    [progresses && winAllowed, 'score_or_objective_progress.exists'],
    [raw.objectives.lose.type === 'player_health_zero', 'lose.player_health_zero']
  ]);
}

function validateSideScrollingRunAndGun(raw: RawGameDsl): DslValidationIssue[] {
  const fireAction = raw.player.actions.find((action) => action.type === 'shoot_projectile');
  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  const hitCollision = projectile && enemy ? findCollision(raw, projectile.id, enemy.id, 'projectile_hit') : undefined;
  const damagesEnemy = hitCollision?.effects.some((effect) => effect.type === 'damage' || effect.type === 'destroy') === true;
  const hasPlatform = raw.level?.terrain.some((terrain) => terrain.kind === 'platform' || terrain.kind === 'ground') === true;
  const hasSpawnTrigger = (raw.level?.spawns.length ?? 0) > 0;
  const hasCheckpointOrLives = (raw.winLose?.checkpoints?.length ?? 0) > 0 || (raw.winLose?.lives ?? 0) > 0;

  return mechanicIssues([
    [raw.world.coordinateSystem === 'side_view_2d', 'world.side_view_2d'],
    [(raw.world.gravity ?? 0) > 0, 'world.gravity'],
    [raw.camera?.mode === 'follow_player_x', 'camera.side_view_follow_x'],
    [raw.player.controller === 'run_jump_shoot', 'player.run_jump_shoot_controller'],
    [raw.player.aiming?.mode === 'multi_direction' || raw.player.aiming?.mode === 'eight_direction', 'player.multi_direction_aiming'],
    [fireAction !== undefined, 'player.can_fire'],
    [projectile !== undefined && fireAction?.spawns === projectile.id, 'projectile.exists'],
    [enemy !== undefined, 'enemy.exists'],
    [hitCollision !== undefined && damagesEnemy, 'collision.projectile_hits_enemy'],
    [hasPlatform, 'level.platforms_exist'],
    [hasSpawnTrigger, 'level.spawn_triggers_exist'],
    [hasCheckpointOrLives, 'checkpoint_or_lives.exists'],
    [raw.winLose !== undefined, 'win_lose.exists']
  ]);
}

function canMove(raw: RawGameDsl): boolean {
  return !noMovement.has(raw.player.movement.type);
}

function findCollision(raw: RawGameDsl, a: string, b: string, type: DslCollision['type']): DslCollision | undefined {
  return raw.rules.collisions.find((collision) => {
    if (collision.type !== type) {
      return false;
    }

    if (type === 'projectile_hit') {
      return collision.source === a && collision.target === b;
    }

    return (collision.source === a && collision.target === b) || (collision.source === b && collision.target === a);
  });
}

function scoreAddValue(collision: DslCollision | undefined): number {
  return collision?.effects.find((effect) => effect.type === 'score_add')?.value ?? 0;
}

function maxReachableScoreForKind(raw: RawGameDsl, kind: DslEntity['kind']): number {
  return raw.entities
    .filter((entity) => entity.kind === kind)
    .reduce((sum, entity) => {
      const bestScore = raw.rules.collisions
        .filter((rule) => rule.source === entity.id || rule.target === entity.id)
        .reduce((best, collision) => Math.max(best, scoreAddValue(collision)), 0);

      return sum + (entity.count ?? 1) * bestScore;
    }, 0);
}

function mechanicIssues(checks: Array<[boolean, string]>): DslValidationIssue[] {
  return checks
    .filter(([ok]) => !ok)
    .map(([, mechanic]) => ({
      code: 'MECHANIC_CONTRACT_FAILED',
      path: 'game.genre',
      message: `Missing required mechanic: ${mechanic}`
    }));
}
