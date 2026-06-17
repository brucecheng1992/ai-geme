import { NormalizedGameIrSchema, type NormalizedGameIr } from '../../game-dsl/src/index.js';
import { AssetPlanItemSchema, AssetPlanSchema, type AssetPlan, type AssetPlanItem } from './schemas.js';
import { inferAssetSemanticConstraint } from './taxonomy.js';

export function buildAssetPlanFromIr(projectId: string, input: NormalizedGameIr): AssetPlan {
  const ir = NormalizedGameIrSchema.parse(input);
  const params = asRecord(ir.template_params.params) ?? {};
  const world = asRecord(params.world);
  const style = asRecord(params.style);
  const styleTheme = readOptionalString(world, 'visual_theme') ?? readOptionalString(style, 'visualTheme');
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
      ir.semanticModel,
      undefined,
      styleTheme,
      itemView
    ),
    createItem('player', 'player_character', readLabel(player, 'Player'), { w: 64, h: 64 }, ir.semanticModel, readSourceEntityId(player), undefined, itemView)
  ];

  if (ir.game.genre === 'collector') {
    const collectible = asRecord(params.collectible);
    items.push(createItem('collectible', 'collectible', readLabel(collectible, 'Collectible'), { w: 48, h: 48 }, ir.semanticModel, readSourceEntityId(collectible)));
  }

  if (ir.game.genre === 'dodger') {
    const hazard = asRecord(params.hazard);
    items.push(createItem('hazard', 'hazard', readLabel(hazard, 'Hazard'), { w: 64, h: 64 }, ir.semanticModel, readSourceEntityId(hazard)));

    const collectible = asRecord(params.collectible);
    if (collectible !== undefined) {
      items.push(createItem('collectible', 'collectible', readLabel(collectible, 'Collectible'), { w: 40, h: 40 }, ir.semanticModel, readSourceEntityId(collectible)));
    }
  }

  if (ir.game.genre === 'shooter') {
    const enemy = asRecord(params.enemy);
    const projectile = asRecord(params.projectile);
    items.push(createItem('enemy', 'enemy', readLabel(enemy, 'Enemy'), { w: 64, h: 64 }, ir.semanticModel, readSourceEntityId(enemy)));
    items.push(createItem('projectile', 'projectile', readLabel(projectile, 'Projectile'), { w: 32, h: 32 }, ir.semanticModel, readSourceEntityId(projectile)));
  }

  if (ir.game.genre === 'side_scrolling_run_and_gun') {
    const assetLabels = asRecord(params.assetLabels);
    const enemy = asRecord(assetLabels?.enemy);
    const projectile = asRecord(assetLabels?.projectile);
    const pickup = asRecord(assetLabels?.pickup);
    items.push(createItem('enemy', 'enemy', readLabel(enemy, 'Enemy'), { w: 64, h: 64 }, ir.semanticModel, readSourceEntityId(enemy), undefined, itemView));
    items.push(createItem('projectile', 'projectile', readLabel(projectile, 'Projectile'), { w: 32, h: 24 }, ir.semanticModel, readSourceEntityId(projectile), undefined, itemView));
    items.push(createItem('tileset', 'tileset', 'side view terrain tileset', { w: 256, h: 128 }, ir.semanticModel, undefined, styleTheme, itemView));
    items.push(createItem('pickup', 'pickup', readLabel(pickup, 'Pickup'), { w: 40, h: 40 }, ir.semanticModel, readSourceEntityId(pickup), undefined, itemView));
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
  semanticModel?: NormalizedGameIr['semanticModel'],
  semanticEntityId?: string,
  styleTheme?: string,
  view: AssetPlanItem['view'] = 'top_down'
): AssetPlanItem {
  const semantic = semanticFromModel(role, semanticModel, semanticEntityId) ?? inferAssetSemanticConstraint({ role, subject, styleTheme });
  return AssetPlanItemSchema.parse({
    id,
    role,
    subject,
    semantic,
    view,
    size,
    format: 'svg',
    required: true,
    provider_priority: ['local_asset_pack', 'template_svg', 'placeholder']
  });
}

function semanticFromModel(role: AssetPlanItem['role'], semanticModel: NormalizedGameIr['semanticModel'] | undefined, entityId: string | undefined): AssetPlanItem['semantic'] | undefined {
  const profileRole = profileRoleForAssetRole(role);
  if (profileRole === undefined || semanticModel === undefined) {
    return undefined;
  }

  const candidates = semanticModel.entities.filter((entity) => entity.role === profileRole);
  const profile = entityId === undefined ? (candidates.length === 1 ? candidates[0] : undefined) : candidates.find((entity) => entity.entityId === entityId);
  if (profile === undefined) {
    return undefined;
  }

  return {
    expectedConcept: profile.concept,
    expectedAnyTags: profile.tags,
    forbiddenTags: forbiddenTagsForConcept(profile.concept),
    strictness: profile.strictness
  };
}

function forbiddenTagsForConcept(concept: string): string[] {
  const tagsByConcept: Record<string, string[]> = {
    cat: ['dog', 'puppy', 'canine', 'tank', 'vehicle', 'spaceship', 'robot', 'turret'],
    dog: ['cat', 'kitten', 'feline', 'tank', 'vehicle', 'spaceship', 'robot', 'turret'],
    alien: ['tank', 'vehicle', 'soldier', 'turret'],
    human_character: ['tank', 'vehicle', 'spaceship', 'robot', 'turret'],
    tank: ['cat', 'kitten', 'feline', 'alien', 'extraterrestrial'],
    fishbone: ['shell', 'tank_bullet', 'missile', 'alien', 'extraterrestrial']
  };
  return tagsByConcept[concept] ?? [];
}

function profileRoleForAssetRole(role: AssetPlanItem['role']): NonNullable<NormalizedGameIr['semanticModel']>['entities'][number]['role'] | undefined {
  if (role === 'player_character') {
    return 'player';
  }
  if (role === 'enemy' || role === 'projectile' || role === 'collectible' || role === 'hazard') {
    return role;
  }
  return undefined;
}

function readLabel(record: Record<string, unknown> | undefined, fallback: string): string {
  return typeof record?.label === 'string' && record.label.trim().length > 0 ? record.label : fallback;
}

function readOptionalString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readSourceEntityId(record: Record<string, unknown> | undefined): string | undefined {
  return readOptionalString(record, 'sourceEntityId');
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
