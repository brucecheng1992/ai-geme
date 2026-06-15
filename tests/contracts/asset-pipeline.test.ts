import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AssetManifestSchema,
  AssetResolutionReportSchema,
  buildAssetPlanFromIr,
  inferAssetSemanticConstraint,
  indexLocalAssetPackMetadata,
  LocalAssetPackSchema,
  validateGeneratedProjectAssets,
  writeAssetArtifacts
} from '../../packages/asset-pipeline/src/index.js';
import { validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createDodgerRawDsl, createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from './fixtures.js';

const projectId = 'proj_20260611_asset_001';

describe('Asset pipeline contracts', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-assets-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('builds an AssetPlan from normalized shooter IR without model-authored paths', () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    const planById = new Map(plan.items.map((item) => [item.id, item]));

    expect(plan.items.map((item) => item.id)).toEqual(['background_main', 'player', 'enemy', 'projectile']);
    expect(planById.get('player')?.semantic).toMatchObject({
      expectedConcept: 'cat',
      expectedAnyTags: ['cat', 'kitten', 'feline'],
      forbiddenTags: ['tank', 'vehicle', 'spaceship', 'robot', 'turret'],
      strictness: 'hard'
    });
    expect(planById.get('enemy')?.semantic).toMatchObject({
      expectedConcept: 'alien',
      expectedAnyTags: ['alien', 'extraterrestrial', 'ufo_creature'],
      forbiddenTags: ['tank', 'vehicle', 'soldier', 'turret'],
      strictness: 'hard'
    });
    expect(plan.items.every((item) => item.provider_priority.includes('template_svg'))).toBe(true);
    expect(JSON.stringify(plan)).not.toContain('../');
    expect(JSON.stringify(plan)).not.toContain('http://');
  });

  it('plans side-scrolling run-and-gun assets by gameplay role and records selected assets by role', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createSideScrollingRunAndGunRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    expect(plan.style).toMatchObject({
      visual_theme: 'side_scrolling_run_and_gun_normal',
      camera: 'side_view'
    });
    expect(plan.items.map((item) => [item.id, item.role, item.view])).toEqual([
      ['background_main', 'background', 'side_view'],
      ['player', 'player_character', 'side_view'],
      ['enemy', 'enemy', 'side_view'],
      ['projectile', 'projectile', 'side_view'],
      ['tileset', 'tileset', 'side_view'],
      ['pickup', 'pickup', 'side_view']
    ]);

    const emptyPacksDir = join(root, 'empty-packs');
    await mkdir(emptyPacksDir, { recursive: true });
    await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir, assetPacksDir: emptyPacksDir });
    const report = AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(root, 'asset_resolution_report.json'), 'utf8')));
    expect(report.selectedAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'player', role: 'player_character' }),
        expect.objectContaining({ id: 'enemy', role: 'enemy' }),
        expect.objectContaining({ id: 'projectile', role: 'projectile' }),
        expect.objectContaining({ id: 'tileset', role: 'tileset' }),
        expect.objectContaining({ id: 'background_main', role: 'background' }),
        expect.objectContaining({ id: 'pickup', role: 'pickup' })
      ])
    );
  });

  it('derives tank semantic constraints for tank shooter briefs', () => {
    const normalized = validateAndNormalizeRawGameDsl(createTankShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    const planById = new Map(plan.items.map((item) => [item.id, item]));

    expect(planById.get('player')?.semantic).toMatchObject({
      expectedConcept: 'tank',
      expectedAnyTags: ['tank', 'vehicle'],
      strictness: 'hard'
    });
    expect(planById.get('enemy')?.semantic).toMatchObject({
      expectedConcept: 'tank',
      expectedAnyTags: ['tank', 'vehicle'],
      strictness: 'hard'
    });
  });

  it('normalizes canary taxonomy v0.2 synonyms without ASCII substring matches', () => {
    for (const subject of ['fishbone', 'fish_bone', 'fish bone', '鱼骨', '鱼骨头', '鱼骨头子弹', '鱼骨子弹']) {
      expect(inferAssetSemanticConstraint({ role: 'projectile', subject })).toMatchObject({
        expectedConcept: 'fishbone',
        expectedAnyTags: ['fishbone', 'projectile'],
        forbiddenTags: expect.arrayContaining(['shell', 'tank_bullet', 'missile', 'alien', 'extraterrestrial']),
        strictness: 'medium'
      });
    }
    expect(inferAssetSemanticConstraint({ role: 'projectile', subject: '鱼骨头' }).expectedConcept).not.toBe('shell');

    for (const subject of ['异星人', '外星怪物', '异星怪物', 'extraterrestrial', 'ufo_creature', 'space_creature', 'space creature']) {
      expect(inferAssetSemanticConstraint({ role: 'enemy', subject })).toMatchObject({
        expectedConcept: 'alien',
        expectedAnyTags: ['alien', 'extraterrestrial', 'ufo_creature'],
        strictness: 'hard'
      });
    }

    expect(inferAssetSemanticConstraint({ role: 'player_character', subject: '英雄' })).toMatchObject({
      expectedConcept: 'human_character',
      expectedAnyTags: ['hero', 'human', 'person'],
      forbiddenTags: expect.arrayContaining(['tank', 'vehicle', 'turret']),
      strictness: 'hard'
    });

    for (const styleTheme of ['星空', '银河', '星海', 'stars', 'starfield', 'star_field', 'star field', 'galaxy', 'cosmic']) {
      expect(inferAssetSemanticConstraint({ role: 'background', subject: 'background', styleTheme })).toMatchObject({
        expectedConcept: 'space',
        expectedAnyTags: ['space', 'stars', 'galaxy', 'cosmic'],
        strictness: 'medium'
      });
    }
    expect(inferAssetSemanticConstraint({ role: 'background', subject: 'background', styleTheme: '星空' }).expectedConcept).not.toBe('battlefield');

    for (const subject of ['装甲车', '战车', 'armored_vehicle', 'armored vehicle', 'armoured_vehicle', 'armoured vehicle', 'turret']) {
      expect(inferAssetSemanticConstraint({ role: 'player_character', subject })).toMatchObject({
        expectedConcept: 'tank',
        expectedAnyTags: ['tank', 'vehicle'],
        strictness: 'hard'
      });
    }

    expect(inferAssetSemanticConstraint({ role: 'player_character', subject: 'Caterpillar' }).expectedConcept).toBe('player');
    expect(inferAssetSemanticConstraint({ role: 'player_character', subject: 'Vehicle' }).expectedConcept).toBe('player');
    expect(inferAssetSemanticConstraint({ role: 'enemy', subject: 'Tankard' }).expectedConcept).toBe('enemy');
    expect(inferAssetSemanticConstraint({ role: 'projectile', subject: 'fish boneless' }).expectedConcept).toBe('projectile');
  });

  it('keeps generic and non-core shooter asset semantics soft instead of inventing hard entity constraints', () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const params = normalized.ir.template_params.params as {
      player: { label: string };
      enemy: { label: string };
      projectile: { label: string };
      world: { visual_theme: string };
    };
    params.player.label = 'Caterpillar';
    params.enemy.label = 'Tankard';
    params.projectile.label = 'Tank Shell';
    params.world.visual_theme = 'deep space stars';
    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    const planById = new Map(plan.items.map((item) => [item.id, item]));

    expect(planById.get('background_main')?.semantic).toMatchObject({
      expectedConcept: 'space',
      expectedAnyTags: ['space', 'stars', 'galaxy', 'cosmic'],
      strictness: 'medium'
    });
    expect(planById.get('player')?.semantic).toMatchObject({
      expectedConcept: 'player',
      expectedAnyTags: ['player'],
      strictness: 'soft'
    });
    expect(planById.get('enemy')?.semantic).toMatchObject({
      expectedConcept: 'enemy',
      expectedAnyTags: ['enemy'],
      strictness: 'soft'
    });
    expect(planById.get('projectile')?.semantic).toMatchObject({
      expectedConcept: 'projectile',
      expectedAnyTags: ['projectile'],
      strictness: 'soft'
    });
  });

  it('writes template SVG assets and validates the generated manifest files', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const params = normalized.ir.template_params.params as { player: { label: string }; enemy: { label: string }; projectile: { label: string } };
    params.player.label = 'Caterpillar';
    params.enemy.label = 'Tankard';
    params.projectile.label = 'Boneless';
    const emptyPacksDir = join(root, 'empty-packs');
    await mkdir(emptyPacksDir, { recursive: true });

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir, assetPacksDir: emptyPacksDir });

    expect(result.manifest.summary).toEqual({ required: 4, ready: 4, fallback_used: 0, missing: 0, placeholder_used: 0 });
    await expect(readFile(join(root, 'asset_plan.json'), 'utf8')).resolves.toContain('"asset-plan-v0.1"');
    await expect(readFile(join(root, 'public/asset_manifest.json'), 'utf8')).resolves.toContain('"asset-manifest-v0.1"');
    await expect(readFile(join(root, 'public/assets/player.svg'), 'utf8')).resolves.toContain('<svg');

    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
  });

  it('selects the tiny local collector pack with license metadata when it fully covers the plan', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCollectorRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });

    expect(result.manifest.assets.map((asset) => [asset.id, asset.source, asset.sourcePack])).toEqual([
      ['background_main', 'local_asset_pack', 'agm-tiny-collector'],
      ['player', 'local_asset_pack', 'agm-tiny-collector'],
      ['collectible', 'local_asset_pack', 'agm-tiny-collector']
    ]);
    expect(result.manifest.assets.every((asset) => asset.licenseId === 'CC0-1.0')).toBe(true);
    await expect(readFile(join(root, 'public/assets/background_main.svg'), 'utf8')).resolves.toContain('Arcade field background');
    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
  });

  it('selects the Kenney tiny dodger tank pack with per-asset source metadata', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createDodgerRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });
    const manifestById = new Map(result.manifest.assets.map((asset) => [asset.id, asset]));

    expect(result.manifest.assets.map((asset) => [asset.id, asset.source, asset.sourcePack])).toEqual([
      ['background_main', 'local_asset_pack', 'kenney-tiny-dodger-tanks'],
      ['player', 'local_asset_pack', 'kenney-tiny-dodger-tanks'],
      ['hazard', 'local_asset_pack', 'kenney-tiny-dodger-tanks'],
      ['collectible', 'local_asset_pack', 'kenney-tiny-dodger-tanks']
    ]);
    expect(manifestById.get('background_main')?.attribution).toBe('AI Game Maker local background');
    expect(manifestById.get('player')?.attribution).toBe('Kenney Tanks by Kenney Vleugels');
    await expect(readFile(join(root, 'public/assets/player.svg'), 'utf8')).resolves.toContain('data:image/png;base64');
    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
  });

  it('uses mixed local assets when a complete shooter pack hard-mismatches some core semantics', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });

    expect(result.manifest.assets.map((asset) => [asset.id, asset.source, asset.sourcePack])).toEqual([
      ['background_main', 'local_asset_pack', 'kenney-tiny-shooter-tanks'],
      ['player', 'runtime_asset', undefined],
      ['enemy', 'template_svg', undefined],
      ['projectile', 'local_asset_pack', 'kenney-tiny-shooter-tanks']
    ]);
    await expect(readFile(join(root, 'public/assets/player.png'))).resolves.toBeInstanceOf(Buffer);
    await expect(readFile(join(root, 'public/assets/enemy.svg'), 'utf8')).resolves.toContain('<svg');
    expect(result.manifest.assets.find((asset) => asset.id === 'player')?.semanticFit).toMatchObject({
      status: 'exact',
      strictness: 'hard',
      expectedConcept: 'cat',
      expectedAnyTags: ['cat', 'kitten', 'feline'],
      actualTags: expect.arrayContaining(['cat', 'kitten', 'feline'])
    });
    expect(result.manifest.assets.find((asset) => asset.id === 'enemy')?.semanticFit).toMatchObject({
      status: 'fallback_generated',
      strictness: 'hard',
      expectedConcept: 'alien',
      expectedAnyTags: ['alien', 'extraterrestrial', 'ufo_creature'],
      actualTags: ['template_svg']
    });

    const report = await readAssetResolutionReport(root);
    expect(report).toMatchObject({
      version: 'asset-resolution-report-v0.1',
      projectId,
      summary: {
        selectedProvider: 'local_mixed_assets',
        fallbackUsed: false,
        fullFallbackUsed: false,
        perRoleFallbackUsed: true,
        reason: 'Selected mixed local assets by role after complete local packs failed.'
      }
    });
    expect(report.assets.find((asset) => asset.id === 'player')).toMatchObject({
      selected: { source: 'runtime_asset', path: 'assets/player.png' },
      semanticFit: {
        status: 'exact',
        strictness: 'hard',
        expectedConcept: 'cat'
      }
    });
    expect(report.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packId: 'kenney-tiny-shooter-tanks',
          status: 'rejected',
          reason: 'hard_semantic_mismatch',
          assetRejections: expect.arrayContaining([
            expect.objectContaining({
              assetId: 'player',
              expectedConcept: 'cat',
              actualTags: expect.arrayContaining(['tank', 'vehicle', 'turret']),
              missingTags: ['cat', 'kitten', 'feline'],
              conflictingTags: expect.arrayContaining(['tank', 'vehicle']),
              reason: 'Hard semantic mismatch: local asset player does not satisfy expected cat.'
            }),
            expect.objectContaining({
              assetId: 'enemy',
              expectedConcept: 'alien',
              actualTags: expect.arrayContaining(['tank', 'vehicle', 'turret']),
              missingTags: ['alien', 'extraterrestrial', 'ufo_creature'],
              conflictingTags: expect.arrayContaining(['tank', 'vehicle']),
              reason: 'Hard semantic mismatch: local asset enemy does not satisfy expected alien.'
            })
          ])
        })
      ])
    );
    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
  });

  it('selects the Kenney shooter tank pack when hard semantic constraints match tank assets', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createTankShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });

    expect(result.manifest.assets.map((asset) => [asset.id, asset.source, asset.sourcePack])).toEqual([
      ['background_main', 'local_asset_pack', 'kenney-tiny-shooter-tanks'],
      ['player', 'local_asset_pack', 'kenney-tiny-shooter-tanks'],
      ['enemy', 'local_asset_pack', 'kenney-tiny-shooter-tanks'],
      ['projectile', 'local_asset_pack', 'kenney-tiny-shooter-tanks']
    ]);
    await expect(readFile(join(root, 'public/assets/enemy.svg'), 'utf8')).resolves.toContain('Kenney grey tank enemy sprite');
    await expect(readFile(join(root, 'public/assets/projectile.svg'), 'utf8')).resolves.toContain('data:image/png;base64');
    expect(result.manifest.assets.find((asset) => asset.id === 'player')?.semanticFit).toMatchObject({
      status: 'exact',
      confidence: 1,
      strictness: 'hard',
      expectedConcept: 'tank',
      actualTags: expect.arrayContaining(['tank', 'vehicle', 'turret'])
    });

    const report = await readAssetResolutionReport(root);
    expect(report).toMatchObject({
      version: 'asset-resolution-report-v0.1',
      projectId,
      summary: {
        selectedProvider: 'local_asset_pack',
        selectedPackId: 'kenney-tiny-shooter-tanks',
        fallbackUsed: false,
        reason: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
      }
    });
    expect(report.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packId: 'kenney-tiny-shooter-tanks',
          status: 'selected',
          reason: 'selected'
        })
      ])
    );
    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
  });

  it('does not select tank-like player art for an explicit hero shooter', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const params = normalized.ir.template_params.params as {
      player: { label: string };
      enemy: { label: string };
      projectile: { label: string };
    };
    params.player.label = '英雄';
    params.enemy.label = 'Enemy';
    params.projectile.label = 'Bullet';

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });
    const player = result.manifest.assets.find((asset) => asset.id === 'player');

    expect(player).toMatchObject({
      id: 'player',
      source: 'template_svg',
      semanticFit: {
        status: 'fallback_generated',
        strictness: 'hard',
        expectedConcept: 'human_character',
        expectedAnyTags: ['hero', 'human', 'person']
      }
    });
    expect(player?.sourcePack).toBeUndefined();
    await expect(readFile(join(root, 'public/assets/player.svg'), 'utf8')).resolves.toContain('<svg');

    const report = await readAssetResolutionReport(root);
    expect(report.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packId: 'kenney-tiny-shooter-tanks',
          status: 'rejected',
          reason: 'hard_semantic_mismatch',
          assetRejections: expect.arrayContaining([
            expect.objectContaining({
              assetId: 'player',
              expectedConcept: 'human_character',
              actualTags: expect.arrayContaining(['tank', 'vehicle', 'turret']),
              missingTags: ['hero', 'human', 'person'],
              conflictingTags: expect.arrayContaining(['tank', 'vehicle', 'turret'])
            })
          ])
        })
      ])
    );
    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
  });

  it('mixes a runtime-safe small library cat with local tank shooter assets for 小猫大战坦克', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCatVsTankShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });
    const manifestById = new Map(result.manifest.assets.map((asset) => [asset.id, asset]));

    expect(result.manifest.assets.map((asset) => [asset.id, asset.source, asset.sourcePack, asset.path])).toEqual([
      ['background_main', 'local_asset_pack', 'kenney-tiny-shooter-tanks', 'assets/background_main.svg'],
      ['player', 'runtime_asset', undefined, 'assets/player.png'],
      ['enemy', 'local_asset_pack', 'kenney-tiny-shooter-tanks', 'assets/enemy.svg'],
      ['projectile', 'template_svg', undefined, 'assets/projectile.svg']
    ]);
    expect(manifestById.get('player')?.format).toBe('png');
    expect(manifestById.get('player')?.renderTransform).toEqual({ rotationDegrees: 180 });
    expect(manifestById.get('player')?.semanticFit).toMatchObject({
      status: 'exact',
      expectedConcept: 'cat',
      expectedAnyTags: ['cat', 'kitten', 'feline'],
      actualTags: expect.arrayContaining(['cat', 'kitten', 'feline'])
    });
    expect(manifestById.get('enemy')?.semanticFit).toMatchObject({
      status: 'exact',
      expectedConcept: 'tank',
      actualTags: expect.arrayContaining(['tank', 'vehicle'])
    });
    await expect(readFile(join(root, 'public/assets/player.png'))).resolves.toBeInstanceOf(Buffer);
    await expect(readFile(join(root, 'public/assets/enemy.svg'), 'utf8')).resolves.toContain('Kenney grey tank enemy sprite');
    await expect(readFile(join(root, 'public/assets/projectile.svg'), 'utf8')).resolves.toContain('<svg');

    const report = await readAssetResolutionReport(root);
    expect(report.summary).toMatchObject({
      selectedProvider: 'local_mixed_assets',
      fallbackUsed: false,
      fullFallbackUsed: false,
      perRoleFallbackUsed: true,
      reason: 'Selected mixed local assets by role after complete local packs failed.'
    });
    expect(report.selectedAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'player',
          role: 'player_character',
          source: 'runtime_asset',
          runtimeContext: 'production_default_runtime',
          conversion: expect.objectContaining({
            status: 'thumbnail_copied',
            outputPath: 'assets/player.png'
          }),
          renderTransform: {
            rotationDegrees: 180
          },
          semanticFit: expect.objectContaining({
            expectedConcept: 'cat',
            actualTags: expect.arrayContaining(['cat', 'kitten', 'feline'])
          })
        }),
        expect.objectContaining({
          id: 'enemy',
          role: 'enemy',
          source: 'local_asset_pack',
          sourcePack: 'kenney-tiny-shooter-tanks',
          semanticFit: expect.objectContaining({
            expectedConcept: 'tank',
            actualTags: expect.arrayContaining(['tank', 'vehicle'])
          })
        }),
        expect.objectContaining({
          id: 'projectile',
          role: 'projectile',
          source: 'template_svg',
          fallbackScope: 'per_role'
        })
      ])
    );
    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
  });

  it('resolves Small Library runtime assets from assetPacksDir when cwd is not the repo root', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCatVsTankShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const originalCwd = process.cwd();
    try {
      process.chdir(join(originalCwd, 'apps/maker-api'));
      const result = await writeAssetArtifacts({
        projectId,
        projectDir: root,
        ir: normalized.ir,
        assetPacksDir: join(originalCwd, 'assets/asset-packs')
      });

      expect(result.manifest.assets.find((asset) => asset.id === 'player')).toMatchObject({
        id: 'player',
        source: 'runtime_asset',
        format: 'png',
        path: 'assets/player.png',
        runtimeContext: 'production_default_runtime',
        renderTransform: {
          rotationDegrees: 180
        },
        semanticFit: expect.objectContaining({
          expectedConcept: 'cat',
          actualTags: expect.arrayContaining(['cat', 'kitten', 'feline'])
        })
      });
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('does not block local pack selection for medium or soft semantic constraints', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const params = normalized.ir.template_params.params as {
      player: { label: string };
      enemy: { label: string };
      projectile: { label: string };
      world: { visual_theme: string };
    };
    params.player.label = 'Caterpillar';
    params.enemy.label = 'Tankard';
    params.projectile.label = 'Tank Shell';
    params.world.visual_theme = 'deep space stars';

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });

    expect(result.manifest.assets.map((asset) => [asset.id, asset.source, asset.sourcePack])).toEqual([
      ['background_main', 'local_asset_pack', 'kenney-tiny-shooter-tanks'],
      ['player', 'local_asset_pack', 'kenney-tiny-shooter-tanks'],
      ['enemy', 'local_asset_pack', 'kenney-tiny-shooter-tanks'],
      ['projectile', 'local_asset_pack', 'kenney-tiny-shooter-tanks']
    ]);
  });

  it('indexes the Kenney shooter tank pack profile and asset semantic metadata', async () => {
    const pack = await readLocalPackFixture('kenney-tiny-shooter-tanks');
    const index = indexLocalAssetPackMetadata(pack);

    expect(pack.profile).toMatchObject({
      version: 'asset-pack-profile-v0.1',
      packId: 'kenney-tiny-shooter-tanks',
      taxonomyVersion: 'asset-taxonomy-v0.1',
      primaryGenre: ['shooter'],
      primaryTheme: ['tank', 'battlefield'],
      subjectCoverageByRole: {
        player_character: ['tank', 'vehicle', 'turret'],
        enemy: ['tank', 'vehicle', 'turret'],
        projectile: ['projectile', 'shell'],
        background: ['battlefield', 'road', 'grassland']
      }
    });
    expect(index.semanticByAssetId.get('player')?.subjectTags).toEqual(expect.arrayContaining(['tank', 'vehicle']));
    expect(index.semanticByAssetId.get('enemy')?.subjectTags).toEqual(expect.arrayContaining(['tank', 'vehicle']));
    expect(index.semanticByAssetId.get('background_main')?.subjectTags).toEqual(expect.arrayContaining(['battlefield', 'road', 'grassland']));
    expect(index.semanticByAssetId.get('projectile')?.subjectTags).toEqual(['projectile', 'shell']);
    expect(index.semanticByAssetId.get('projectile')?.subjectTags).not.toContain('tank');
  });

  it('rejects local asset pack metadata with mismatched profile identity or non-canonical tags', async () => {
    const pack = await readLocalPackFixture('kenney-tiny-shooter-tanks');
    expect(pack.profile).toBeDefined();
    if (pack.profile === undefined) {
      return;
    }

    expect(
      LocalAssetPackSchema.safeParse({
        ...pack,
        profile: { ...pack.profile, packId: 'other-pack' }
      }).success
    ).toBe(false);

    expect(
      LocalAssetPackSchema.safeParse({
        ...pack,
        assets: pack.assets.map((asset) =>
          asset.id === 'player' && asset.semantic !== undefined
            ? { ...asset, semantic: { ...asset.semantic, subjectTags: ['Tank'] } }
            : asset
        )
      }).success
    ).toBe(false);

    expect(
      LocalAssetPackSchema.safeParse({
        ...pack,
        assets: [...pack.assets, { ...pack.assets[0] }]
      }).success
    ).toBe(false);

    expect(
      LocalAssetPackSchema.safeParse({
        ...pack,
        profile: {
          ...pack.profile,
          subjectCoverageByRole: {
            ...pack.profile.subjectCoverageByRole,
            projectile: ['projectile', 'shell', 'tank']
          }
        }
      }).success
    ).toBe(false);
  });

  it('falls back to template SVG assets when no local pack fully covers the plan', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCollectorRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const emptyPacksDir = join(root, 'empty-packs');
    await mkdir(emptyPacksDir, { recursive: true });
    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir, assetPacksDir: emptyPacksDir });

    expect(result.manifest.assets.map((asset) => asset.source)).toEqual(['template_svg', 'template_svg', 'template_svg']);
    expect(result.manifest.assets.some((asset) => asset.sourcePack !== undefined)).toBe(false);
  });

  it('explains style mismatch and incomplete local pack candidates in the resolution report', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCollectorRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const packsDir = join(root, 'diagnostic-packs');
    await writeDiagnosticPack({
      packsDir,
      packId: 'diagnostic-style-pack',
      genres: ['shooter'],
      assets: [{ id: 'player', role: 'player_character', file: 'player.svg' }]
    });
    await writeDiagnosticPack({
      packsDir,
      packId: 'diagnostic-incomplete-pack',
      genres: ['collector'],
      assets: [{ id: 'player', role: 'player_character', file: 'player.svg' }]
    });

    await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir, assetPacksDir: packsDir });

    const report = await readAssetResolutionReport(root);
    expect(report.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packId: 'diagnostic-style-pack',
          status: 'skipped',
          reason: 'style_mismatch',
          expectedStyle: { genre: 'collector', camera: 'top_down' },
          actualStyle: { genres: ['shooter'], camera: 'top_down' }
        }),
        expect.objectContaining({
          packId: 'diagnostic-incomplete-pack',
          status: 'rejected',
          reason: 'incomplete_pack',
          missingAssets: expect.arrayContaining([
            expect.objectContaining({ assetId: 'background_main', expectedRole: 'background', expectedFormat: 'svg', reason: 'missing' }),
            expect.objectContaining({ assetId: 'collectible', expectedRole: 'collectible', expectedFormat: 'svg', reason: 'missing' })
          ])
        })
      ])
    );
  });

  it('rejects local asset pack files that do not match the declared SVG format', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCollectorRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const packsDir = join(root, 'bad-packs');
    const packDir = join(packsDir, 'bad-pack');
    await mkdir(packDir, { recursive: true });
    await writeFile(
      join(packDir, 'pack.json'),
      `${JSON.stringify(
        {
          version: 'local-asset-pack-v0.1',
          id: 'bad-pack',
          label: 'Bad Pack',
          license: {
            id: 'CC0-1.0',
            name: 'Creative Commons CC0 1.0 Universal',
            attribution: 'Invalid local pack',
            sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
          },
          style: { genres: ['collector'], camera: 'top_down', tags: ['bad'] },
          assets: [{ id: 'player', role: 'player_character', file: 'player.png', format: 'svg' }]
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    await expect(writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir, assetPacksDir: packsDir })).rejects.toThrow(
      'asset file must be a relative .svg path inside the local pack'
    );
  });

  it('rejects local asset pack manifest entries without license metadata', () => {
    const parsed = AssetManifestSchema.safeParse({
      version: 'asset-manifest-v0.1',
      projectId,
      strict: true,
      assets: [
        {
          id: 'player',
          loadKey: 'agm.player',
          role: 'player_character',
          type: 'image',
          format: 'svg',
          path: 'assets/player.svg',
          source: 'local_asset_pack',
          required: true,
          status: 'ready',
          size: { w: 64, h: 64 }
        }
      ],
      summary: { required: 1, ready: 1, fallback_used: 0, missing: 0, placeholder_used: 0 }
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects manifest paths that escape the public asset root', () => {
    const parsed = AssetManifestSchema.safeParse({
      version: 'asset-manifest-v0.1',
      projectId,
      strict: true,
      assets: [
        {
          id: 'player',
          loadKey: 'agm.player',
          role: 'player_character',
          type: 'image',
          format: 'svg',
          path: '../player.svg',
          source: 'template_svg',
          required: true,
          status: 'ready',
          size: { w: 64, h: 64 }
        }
      ],
      summary: { required: 1, ready: 1, fallback_used: 0, missing: 0, placeholder_used: 0 }
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a manifest that omits a required asset from asset_plan.json', async () => {
    await mkdir(join(root, 'public/assets'), { recursive: true });
    await writeAssetPlan(root, [
      { id: 'player', role: 'player_character', size: { w: 64, h: 64 } },
      { id: 'enemy', role: 'enemy', size: { w: 64, h: 64 } }
    ]);
    await writeFile(join(root, 'public/assets/player.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    await writeManifest(root, [{ id: 'player', role: 'player_character', size: { w: 64, h: 64 } }]);

    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({
      ok: false,
      code: 'ASSET_MANIFEST_INVALID',
      message: 'Required asset enemy from asset_plan.json is missing from asset_manifest.json.'
    });
  });

  it('rejects a required asset path that resolves to a directory instead of a file', async () => {
    await mkdir(join(root, 'public/assets/player.svg'), { recursive: true });
    await writeAssetPlan(root, [{ id: 'player', role: 'player_character', size: { w: 64, h: 64 } }]);
    await writeManifest(root, [{ id: 'player', role: 'player_character', size: { w: 64, h: 64 } }]);

    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({
      ok: false,
      code: 'ASSET_MISSING',
      message: 'Asset path is not a regular file for player: assets/player.svg'
    });
  });

  it('blocks PLAYABLE when a required core asset uses the placeholder provider', async () => {
    await mkdir(join(root, 'public/assets'), { recursive: true });
    await writeAssetPlan(root, [{ id: 'player', role: 'player_character', size: { w: 64, h: 64 } }]);
    await writeFile(join(root, 'public/assets/player.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    await writeFile(
      join(root, 'public/asset_manifest.json'),
      `${JSON.stringify(
        {
          version: 'asset-manifest-v0.1',
          projectId,
          strict: true,
          assets: [
            {
              id: 'player',
              loadKey: 'agm.player',
              role: 'player_character',
              type: 'image',
              format: 'svg',
              path: 'assets/player.svg',
              source: 'placeholder',
              required: true,
              status: 'ready',
              size: { w: 64, h: 64 }
            }
          ],
          summary: { required: 1, ready: 1, fallback_used: 0, missing: 0, placeholder_used: 1 }
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({
      ok: false,
      code: 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED'
    });
  });
});

type TestAsset = {
  id: string;
  role: 'player_character' | 'enemy' | 'projectile' | 'collectible' | 'hazard' | 'background' | 'ui_panel';
  size: { w: number; h: number };
};

async function writeAssetPlan(projectDir: string, items: TestAsset[]): Promise<void> {
  await writeFile(
    join(projectDir, 'asset_plan.json'),
    `${JSON.stringify(
      {
        version: 'asset-plan-v0.1',
        projectId,
        style: { visual_theme: 'test', camera: 'top_down' },
        items: items.map((item) => ({
          ...item,
          subject: item.id,
          view: 'top_down',
          format: 'svg',
          required: true,
          provider_priority: ['local_asset_pack', 'template_svg', 'placeholder']
        }))
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

async function writeManifest(projectDir: string, assets: TestAsset[]): Promise<void> {
  await writeFile(
    join(projectDir, 'public/asset_manifest.json'),
    `${JSON.stringify(
      {
        version: 'asset-manifest-v0.1',
        projectId,
        strict: true,
        assets: assets.map((asset) => ({
          ...asset,
          loadKey: `agm.${asset.id}`,
          type: 'image',
          format: 'svg',
          path: `assets/${asset.id}.svg`,
          source: 'template_svg',
          required: true,
          status: 'ready'
        })),
        summary: { required: assets.length, ready: assets.length, fallback_used: 0, missing: 0, placeholder_used: 0 }
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

async function readLocalPackFixture(packId: string) {
  const raw = JSON.parse(await readFile(join(process.cwd(), 'assets/asset-packs', packId, 'pack.json'), 'utf8'));
  return LocalAssetPackSchema.parse(raw);
}

async function readAssetResolutionReport(projectDir: string) {
  return AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(projectDir, 'asset_resolution_report.json'), 'utf8')));
}

async function writeDiagnosticPack(input: {
  packsDir: string;
  packId: string;
  genres: Array<'collector' | 'dodger' | 'shooter'>;
  assets: Array<{ id: string; role: TestAsset['role']; file: string }>;
}): Promise<void> {
  const packDir = join(input.packsDir, input.packId);
  await mkdir(packDir, { recursive: true });
  for (const asset of input.assets) {
    await writeFile(join(packDir, asset.file), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
  }
  await writeFile(
    join(packDir, 'pack.json'),
    `${JSON.stringify(
      {
        version: 'local-asset-pack-v0.1',
        id: input.packId,
        label: input.packId,
        license: {
          id: 'CC0-1.0',
          name: 'Creative Commons CC0 1.0 Universal',
          attribution: input.packId,
          sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
        },
        style: { genres: input.genres, camera: 'top_down', tags: ['diagnostic'] },
        assets: input.assets.map((asset) => ({ id: asset.id, role: asset.role, file: asset.file, format: 'svg' }))
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

function createTankShooterRawDsl() {
  const rawDsl = createShooterRawDsl();
  rawDsl.metadata.title = 'Tank Battle';
  rawDsl.player.label = 'Tank';
  rawDsl.entities = rawDsl.entities.map((entity) => (entity.kind === 'enemy' ? { ...entity, id: 'enemy_tank', label: 'Tank' } : entity));
  rawDsl.rules.collisions = rawDsl.rules.collisions.map((collision) => ({ ...collision, target: 'enemy_tank' }));
  return rawDsl;
}

function createCatVsTankShooterRawDsl() {
  const rawDsl = createShooterRawDsl();
  rawDsl.metadata.title = '小猫大战坦克';
  rawDsl.player.label = '小猫';
  rawDsl.entities = [
    { id: 'fishbone', kind: 'projectile', label: '鱼骨头', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
    { id: 'tank', kind: 'enemy', label: '坦克', count: 8, health: 1, movement: { type: 'move_left', speed_px_per_sec: 80 } }
  ];
  rawDsl.player.actions = rawDsl.player.actions.map((action) => ({ ...action, spawns: 'fishbone' }));
  rawDsl.rules.collisions = rawDsl.rules.collisions.map((collision) => ({
    ...collision,
    id: 'fishbone_hits_tank',
    source: 'fishbone',
    target: 'tank'
  }));
  rawDsl.objectives.win = { type: 'enemy_cleared', target: 8 };
  return rawDsl;
}
