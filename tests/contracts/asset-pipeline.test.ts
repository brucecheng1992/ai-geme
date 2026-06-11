import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AssetManifestSchema,
  buildAssetPlanFromIr,
  validateGeneratedProjectAssets,
  writeAssetArtifacts
} from '../../packages/asset-pipeline/src/index.js';
import { validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createDodgerRawDsl, createShooterRawDsl } from './fixtures.js';

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

    expect(plan.items.map((item) => item.id)).toEqual(['background_main', 'player', 'enemy', 'projectile']);
    expect(plan.items.every((item) => item.provider_priority.includes('template_svg'))).toBe(true);
    expect(JSON.stringify(plan)).not.toContain('../');
    expect(JSON.stringify(plan)).not.toContain('http://');
  });

  it('writes template SVG assets and validates the generated manifest files', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await writeAssetArtifacts({ projectId, projectDir: root, ir: normalized.ir });

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

  it('selects the Kenney shooter tank pack before lower-priority local shooter packs', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
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
    await expect(validateGeneratedProjectAssets({ projectId, projectDir: root })).resolves.toMatchObject({ ok: true });
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
