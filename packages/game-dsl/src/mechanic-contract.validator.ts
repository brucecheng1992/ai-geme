import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import type { DslValidationIssue } from './validation.types.js';

type DslEntity = RawGameDsl['entities'][number];
type DslCollision = RawGameDsl['rules']['collisions'][number];

const noMovement = new Set(['static']);

export function validateMechanicContract(raw: RawGameDsl): DslValidationIssue[] {
  if (raw.game.genre === 'collector') {
    return validateCollector(raw);
  }

  if (raw.game.genre === 'dodger') {
    return validateDodger(raw);
  }

  return validateShooter(raw);
}

export function validateObjectiveReachability(raw: RawGameDsl): DslValidationIssue[] {
  if (raw.objectives.win.type !== 'target_score') {
    return [];
  }

  const scoreKind = raw.game.genre === 'collector' ? 'collectible' : 'enemy';
  const maxScore = maxReachableScoreForKind(raw, scoreKind);
  const reachable = maxScore >= (raw.objectives.win.target ?? 1);

  return reachable
    ? []
    : [{ code: 'UNREACHABLE_OBJECTIVE', path: 'objectives.win.target', message: 'target_score cannot be reached from scoring rules' }];
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
  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  const fireAction = raw.player.actions.find((action) => action.type === 'shoot_projectile');
  const hitCollision = projectile && enemy ? findCollision(raw, projectile.id, enemy.id, 'projectile_hit') : undefined;
  const damagesEnemy = hitCollision?.effects.some((effect) => effect.type === 'damage' || effect.type === 'destroy') === true;
  const clearsEnemy = hitCollision?.effects.some((effect) => effect.type === 'destroy') === true;
  const scoreValue = scoreAddValue(hitCollision);
  const maxScore = maxReachableScoreForKind(raw, 'enemy');
  const winAllowed = raw.objectives.win.type === 'enemy_cleared' || raw.objectives.win.type === 'target_score';
  const progresses =
    (raw.objectives.win.type === 'enemy_cleared' && clearsEnemy) ||
    (raw.objectives.win.type === 'target_score' && scoreValue > 0 && maxScore >= (raw.objectives.win.target ?? 1));

  return mechanicIssues([
    [canMove(raw), 'player.can_move'],
    [fireAction !== undefined, 'player.can_fire'],
    [projectile !== undefined && fireAction?.spawns === projectile.id, 'projectile.exists'],
    [enemy !== undefined, 'enemy.exists'],
    [hitCollision !== undefined, 'collision.projectile_hits_enemy'],
    [enemy?.health !== undefined && damagesEnemy, 'enemy.can_take_damage'],
    [clearsEnemy, 'enemy.can_be_cleared'],
    [progresses && winAllowed, 'score_or_objective_progress.exists'],
    [raw.objectives.lose.type === 'player_health_zero', 'lose.player_health_zero']
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
