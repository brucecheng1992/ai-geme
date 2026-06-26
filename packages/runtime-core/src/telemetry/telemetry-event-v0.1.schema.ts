import { z } from 'zod';

export const TelemetryEventTypeSchema = z.enum([
  'game.ready',
  'game.started',
  'input.received',
  'player.moved',
  'player.jumped',
  'movement.crouch.entered',
  'player.fired',
  'projectile.spawned',
  'collision.detected',
  'enemy.fired',
  'enemy.hit',
  'enemy.cleared',
  'item.spawned',
  'item.collected',
  'pickup.collectible.collected',
  'pickup.collectible.state_changed',
  'pickup.weapon_supply.verified',
  'provider.deepseek_authoritative_draft.validated',
  'review.oracle_final_gate.approved',
  'spawn.enemy_wave.ordered',
  'enemy.flying_right_entry.verified',
  'enemy.patrol_infantry.verified',
  'feedback.victory_declaration.verified',
  'generation.fallback_policy_fail_closed.verified',
  'goal.boss_unlock.verified',
  'hazard.spawned',
  'hazard.falling_area.verified',
  'hazard.timed_explosion.verified',
  'player.damaged',
  'health.damage_invulnerability.activated',
  'health.damage_invulnerability.blocked',
  'checkpoint.reached',
  'level.segment.completed',
  'score.changed',
  'survival_time.changed',
  'objective.completed',
  'game.won',
  'game.lost',
  'game.restarted'
]);

/** Runtime authoritative telemetry event; DSL 和模型输出不能伪造该结果。 */
export const TelemetryEventSchema = z.object({
  type: TelemetryEventTypeSchema,
  timestamp_ms: z.number().int().min(0),
  frame: z.number().int().min(0),
  payload: z.record(z.string(), z.unknown()).optional()
});

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
