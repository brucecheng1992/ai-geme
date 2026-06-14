import { NormalizedGameIrSchema, type NormalizedGameIr } from '../../game-dsl/src/index.js';
import { AssetPlanItemSchema, AssetPlanSchema, type AssetPlan, type AssetPlanItem } from './schemas.js';
import { inferAssetSemanticConstraint } from './taxonomy.js';

export function buildAssetPlanFromIr(projectId: string, input: NormalizedGameIr): AssetPlan {
  const ir = NormalizedGameIrSchema.parse(input);
  const params = asRecord(ir.template_params.params) ?? {};
  const world = asRecord(params.world);
  const styleTheme = readOptionalString(world, 'visual_theme');
  const player = asRecord(params.player);
  const itemView = ir.game.camera === 'side_view' ? 'side_view' : 'top_down';
  const items: AssetPlanItem[] = [
    createItem(
      'background_main',
      'background',
      `${ir.metadata.title} ${ir.game.genre} background`,
      {
        w: ir.world.width,
        h: ir.world.height
      },
      styleTheme,
      itemView
    ),
    createItem('player', 'player_character', readLabel(player, 'Player'), { w: 64, h: 64 }, undefined, itemView)
  ];

  if (ir.game.genre === 'collector') {
    const collectible = asRecord(params.collectible);
    items.push(createItem('collectible', 'collectible', readLabel(collectible, 'Collectible'), { w: 48, h: 48 }));
  }

  if (ir.game.genre === 'dodger') {
    const hazard = asRecord(params.hazard);
    items.push(createItem('hazard', 'hazard', readLabel(hazard, 'Hazard'), { w: 64, h: 64 }));

    const collectible = asRecord(params.collectible);
    if (collectible !== undefined) {
      items.push(createItem('collectible', 'collectible', readLabel(collectible, 'Collectible'), { w: 40, h: 40 }));
    }
  }

  if (ir.game.genre === 'shooter') {
    const enemy = asRecord(params.enemy);
    const projectile = asRecord(params.projectile);
    items.push(createItem('enemy', 'enemy', readLabel(enemy, 'Enemy'), { w: 64, h: 64 }));
    items.push(createItem('projectile', 'projectile', readLabel(projectile, 'Projectile'), { w: 32, h: 32 }));
  }

  if (ir.game.genre === 'side_scrolling_run_and_gun') {
    const enemy = firstRecord(params.enemyTypes) ?? asRecord(params.enemy);
    const projectile = firstRecord(params.projectiles) ?? asRecord(params.projectile);
    const pickup = firstRecord(params.pickups);
    items.push(createItem('enemy', 'enemy', readLabel(enemy, 'Enemy'), { w: 64, h: 64 }, undefined, itemView));
    items.push(createItem('projectile', 'projectile', readLabel(projectile, 'Projectile'), { w: 32, h: 24 }, undefined, itemView));
    items.push(createItem('tileset', 'tileset', 'side view terrain tileset', { w: 256, h: 128 }, styleTheme, itemView));
    items.push(createItem('pickup', 'pickup', readLabel(pickup, 'Pickup'), { w: 40, h: 40 }, undefined, itemView));
  }

  return AssetPlanSchema.parse({
    version: 'asset-plan-v0.1',
    projectId,
    style: {
      visual_theme: `${ir.game.genre}_${ir.game.difficulty}`,
      camera: ir.game.camera
    },
    items
  });
}

function createItem(
  id: string,
  role: AssetPlanItem['role'],
  subject: string,
  size: AssetPlanItem['size'],
  styleTheme?: string,
  view: AssetPlanItem['view'] = 'top_down'
): AssetPlanItem {
  return AssetPlanItemSchema.parse({
    id,
    role,
    subject,
    semantic: inferAssetSemanticConstraint({ role, subject, styleTheme }),
    view,
    size,
    format: 'svg',
    required: true,
    provider_priority: ['local_asset_pack', 'template_svg', 'placeholder']
  });
}

function firstRecord(value: unknown): Record<string, unknown> | undefined {
  return Array.isArray(value) ? asRecord(value[0]) : undefined;
}

function readLabel(record: Record<string, unknown> | undefined, fallback: string): string {
  return typeof record?.label === 'string' && record.label.trim().length > 0 ? record.label : fallback;
}

function readOptionalString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
