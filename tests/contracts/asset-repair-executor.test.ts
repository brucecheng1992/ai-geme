import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AssetManifestSchema,
  AssetResolutionReportSchema,
  buildAssetPlanFromIr,
  buildAssetRepairPlan,
  executeAssetRepairPlan,
  type AssetManifest,
  type AssetPlan,
  type AssetResolutionReport
} from '../../packages/asset-pipeline/src/index.js';
import { validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

const projectId = 'proj_20260612_repair_executor_001';
const createdAt = '2026-06-12T07:00:00.000Z';

describe('Asset repair executor', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-repair-executor-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('blacklists the selected local candidate and rewrites failed hard semantic assets to template SVG fallback', async () => {
    const plan = createShooterPlan();
    const badManifest = await writeBadLocalPackArtifacts(root, plan);
    const badReport = await readResolutionReport(root);
    const repairPlan = buildAssetRepairPlan({
      qaReport: {
        project_id: projectId,
        overall_status: 'NEEDS_ASSET_REPAIR',
        asset_semantic_status: 'FAILED'
      },
      manifest: badManifest,
      resolutionReport: badReport,
      createdAt,
      maxAttempts: 3
    });

    const result = await executeAssetRepairPlan({ projectDir: root, repairPlan });

    expect(result).toMatchObject({
      status: 'repaired',
      attempts: 1,
      repairedRequirementIds: ['player', 'enemy'],
      blacklistedCandidates: [
        { packId: 'kenney-tiny-shooter-tanks', assetId: 'player', role: 'player_character' },
        { packId: 'kenney-tiny-shooter-tanks', assetId: 'enemy', role: 'enemy' }
      ]
    });

    const publicManifest = await readManifest(join(root, 'public/asset_manifest.json'));
    const rootManifest = await readManifest(join(root, 'asset_manifest.json'));
    const player = publicManifest.assets.find((asset) => asset.id === 'player');
    const enemy = publicManifest.assets.find((asset) => asset.id === 'enemy');

    expect(rootManifest).toEqual(publicManifest);
    expect(player).toMatchObject({
      id: 'player',
      loadKey: 'agm.player',
      source: 'template_svg',
      semanticFit: {
        status: 'fallback_generated',
        strictness: 'hard',
        expectedConcept: 'cat'
      }
    });
    expect(player).not.toHaveProperty('sourcePack');
    expect(enemy).toMatchObject({
      id: 'enemy',
      loadKey: 'agm.enemy',
      source: 'template_svg',
      semanticFit: {
        status: 'fallback_generated',
        strictness: 'hard',
        expectedConcept: 'alien'
      }
    });
    expect(enemy).not.toHaveProperty('sourcePack');
    await expect(readFile(join(root, 'public/assets/player.svg'), 'utf8')).resolves.toContain('<svg');
    await expect(readFile(join(root, 'public/assets/enemy.svg'), 'utf8')).resolves.toContain('<svg');

    const repairedReport = await readResolutionReport(root);
    expect(repairedReport.summary).toMatchObject({
      selectedProvider: 'template_svg',
      fallbackUsed: true,
      reason: 'Asset repair applied project-local semantic fixes; see repair section for per-asset actions.'
    });
    expect(repairedReport.summary).not.toHaveProperty('selectedPackId');
    expect(repairedReport.repair).toMatchObject({
      version: 'asset-repair-v0.1',
      planVersion: 'asset-repair-plan-v0.1',
      status: 'repaired',
      attempts: 1
    });
    expect(repairedReport.repair?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: 'player',
          action: 'blacklist_candidate_then_reresolve',
          before: { source: 'local_asset_pack', packId: 'kenney-tiny-shooter-tanks', path: 'assets/player.svg', semanticFitStatus: 'mismatch' },
          after: { source: 'template_svg', path: 'assets/player.svg', semanticFitStatus: 'fallback_generated' }
        }),
        expect.objectContaining({
          requirementId: 'enemy',
          action: 'blacklist_candidate_then_reresolve',
          after: { source: 'template_svg', path: 'assets/enemy.svg', semanticFitStatus: 'fallback_generated' }
        })
      ])
    );
    expect(repairedReport.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packId: 'kenney-tiny-shooter-tanks',
          status: 'rejected',
          reason: 'hard_semantic_mismatch',
          assetRejections: expect.arrayContaining([
            expect.objectContaining({ assetId: 'player', role: 'player_character' }),
            expect.objectContaining({ assetId: 'enemy', role: 'enemy' })
          ])
        })
      ])
    );
    expect(repairedReport.candidates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ packId: 'kenney-tiny-shooter-tanks', status: 'selected' })])
    );
  });

  it('stages local rerresolve results and only copies repaired requirement files', async () => {
    const plan = createShooterPlan();
    const badManifest = await writeBadLocalPackArtifacts(root, plan);
    const badReport = await readResolutionReport(root);
    const assetPacksDir = join(root, 'asset-packs');
    await writeSemanticLocalPack(assetPacksDir, 'agm-repair-cats', plan);
    const projectilePath = join(root, 'public/assets/projectile.svg');
    const projectileBefore = '<svg xmlns="http://www.w3.org/2000/svg" data-test="projectile-before"></svg>';
    await writeFile(projectilePath, projectileBefore, 'utf8');
    const manifestBefore = await readManifest(join(root, 'public/asset_manifest.json'));
    const projectileManifestBefore = manifestBefore.assets.find((asset) => asset.id === 'projectile');
    const repairPlan = buildAssetRepairPlan({
      qaReport: {
        project_id: projectId,
        overall_status: 'NEEDS_ASSET_REPAIR',
        asset_semantic_status: 'FAILED'
      },
      manifest: badManifest,
      resolutionReport: badReport,
      createdAt,
      maxAttempts: 1
    });

    const result = await executeAssetRepairPlan({ projectDir: root, repairPlan, assetPacksDir });

    expect(result).toMatchObject({ status: 'repaired', attempts: 1, repairedRequirementIds: ['player', 'enemy'] });
    expect(await readFile(projectilePath, 'utf8')).toBe(projectileBefore);
    const publicManifest = await readManifest(join(root, 'public/asset_manifest.json'));
    expect(publicManifest.assets.find((asset) => asset.id === 'projectile')).toEqual(projectileManifestBefore);
    expect(publicManifest.assets.find((asset) => asset.id === 'player')).toMatchObject({
      id: 'player',
      loadKey: 'agm.player',
      source: 'local_asset_pack',
      sourcePack: 'agm-repair-cats',
      semanticFit: { status: 'exact', strictness: 'hard', expectedConcept: 'cat' }
    });
    expect(publicManifest.assets.find((asset) => asset.id === 'enemy')).toMatchObject({
      id: 'enemy',
      loadKey: 'agm.enemy',
      source: 'local_asset_pack',
      sourcePack: 'agm-repair-cats',
      semanticFit: { status: 'exact', strictness: 'hard', expectedConcept: 'alien' }
    });
  });

  it('writes a no-action repair audit section for triggered plans without executable hard items', async () => {
    const plan = createShooterPlan();
    await writeBadLocalPackArtifacts(root, plan);
    const reportBefore = await readFile(join(root, 'asset_resolution_report.json'), 'utf8');
    const manifestStatBefore = await stat(join(root, 'public/asset_manifest.json'));

    const result = await executeAssetRepairPlan({
      projectDir: root,
      repairPlan: {
        version: 'asset-repair-plan-v0.1',
        projectId,
        createdAt,
        triggered: true,
        trigger: 'needs_asset_repair',
        maxAttempts: 1,
        items: [
          {
            requirementId: 'projectile',
            role: 'projectile',
            semanticFitStatus: 'mismatch',
            strictness: 'medium',
            action: 'no_action',
            reason: 'Medium semantic mismatch is intentionally ignored by Step 6b.'
          }
        ],
        ignored: []
      }
    });

    expect(result).toMatchObject({ status: 'no_action', attempts: 0, repairedRequirementIds: [] });
    expect(await readFile(join(root, 'asset_resolution_report.json'), 'utf8')).not.toBe(reportBefore);
    const report = await readResolutionReport(root);
    expect(report.repair).toMatchObject({
      version: 'asset-repair-v0.1',
      status: 'no_action',
      attempts: 0,
      maxAttempts: 1,
      repairedRequirementIds: [],
      items: []
    });
    await expect(readFile(join(root, 'asset_manifest.json'), 'utf8')).rejects.toThrow();
    expect((await stat(join(root, 'public/asset_manifest.json'))).mtimeMs).toBe(manifestStatBefore.mtimeMs);
  });

  it('rejects repair plans whose project id does not match the project artifacts', async () => {
    const plan = createShooterPlan();
    const manifest = await writeBadLocalPackArtifacts(root, plan);
    const badReport = await readResolutionReport(root);
    const reportBefore = await readFile(join(root, 'asset_resolution_report.json'), 'utf8');
    const repairPlan = buildAssetRepairPlan({
      qaReport: {
        project_id: projectId,
        overall_status: 'NEEDS_ASSET_REPAIR',
        asset_semantic_status: 'FAILED'
      },
      manifest,
      resolutionReport: badReport,
      createdAt,
      maxAttempts: 1
    });

    await expect(
      executeAssetRepairPlan({
        projectDir: root,
        repairPlan: { ...repairPlan, projectId: 'proj_other' }
      })
    ).rejects.toThrow('Asset repair project identity mismatch');

    expect(await readFile(join(root, 'asset_resolution_report.json'), 'utf8')).toBe(reportBefore);
    await expect(readFile(join(root, 'asset_manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('does not rewrite artifacts when the repair plan is not triggered', async () => {
    const plan = createShooterPlan();
    const manifest = await writeBadLocalPackArtifacts(root, plan);
    const reportBefore = await readFile(join(root, 'asset_resolution_report.json'), 'utf8');
    const manifestStatBefore = await stat(join(root, 'public/asset_manifest.json'));

    const result = await executeAssetRepairPlan({
      projectDir: root,
      repairPlan: {
        version: 'asset-repair-plan-v0.1',
        projectId,
        createdAt,
        triggered: false,
        trigger: 'none',
        maxAttempts: 1,
        items: [],
        ignored: []
      }
    });

    expect(result).toMatchObject({ status: 'not_triggered', attempts: 0, repairedRequirementIds: [] });
    await expect(readFile(join(root, 'asset_manifest.json'), 'utf8')).rejects.toThrow();
    expect(await readFile(join(root, 'asset_resolution_report.json'), 'utf8')).toBe(reportBefore);
    expect((await stat(join(root, 'public/asset_manifest.json'))).mtimeMs).toBe(manifestStatBefore.mtimeMs);
    expect(manifest.assets.find((asset) => asset.id === 'player')?.source).toBe('local_asset_pack');
  });
});

function createShooterPlan(): AssetPlan {
  const normalized = validateAndNormalizeRawGameDsl(createShooterRawDsl());
  expect(normalized.ok).toBe(true);
  if (!normalized.ok) {
    throw new Error('test shooter DSL should normalize');
  }

  return buildAssetPlanFromIr(projectId, normalized.ir);
}

async function writeBadLocalPackArtifacts(projectDir: string, plan: AssetPlan): Promise<AssetManifest> {
  await mkdir(join(projectDir, 'public/assets'), { recursive: true });
  await writeFile(join(projectDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  const assets = plan.items.map((item) => {
    const hardMismatch =
      item.id === 'player' || item.id === 'enemy'
        ? {
            status: 'mismatch' as const,
            confidence: 0,
            strictness: 'hard' as const,
            expectedConcept: item.semantic?.expectedConcept,
            expectedAnyTags: item.semantic?.expectedAnyTags,
            actualTags: ['tank', 'vehicle', 'turret'],
            missingTags: item.semantic?.expectedAnyTags,
            conflictingTags: ['tank', 'vehicle'],
            reason: `Local asset semantic tags do not satisfy expected ${item.semantic?.expectedConcept}.`
          }
        : {
            status: 'exact' as const,
            confidence: 1,
            strictness: item.semantic?.strictness,
            expectedConcept: item.semantic?.expectedConcept,
            expectedAnyTags: item.semantic?.expectedAnyTags,
            actualTags: item.semantic?.expectedAnyTags,
            reason: `Local asset semantic tags exactly match expected ${item.semantic?.expectedConcept ?? item.id}.`
          };

    return {
      id: item.id,
      loadKey: `agm.${item.id}`,
      role: item.role,
      type: 'image' as const,
      format: 'svg' as const,
      path: `assets/${item.id}.svg`,
      source: 'local_asset_pack' as const,
      sourcePack: 'kenney-tiny-shooter-tanks',
      licenseId: 'CC0-1.0',
      licenseName: 'Creative Commons CC0 1.0 Universal',
      attribution: 'Kenney Tanks by Kenney Vleugels',
      sourceUrl: 'https://kenney.nl/assets/tanks',
      required: item.required,
      status: 'ready' as const,
      size: item.size,
      semanticFit: hardMismatch
    };
  });
  const manifest = AssetManifestSchema.parse({
    version: 'asset-manifest-v0.1',
    projectId,
    strict: true,
    assets,
    summary: {
      required: assets.filter((asset) => asset.required).length,
      ready: assets.length,
      fallback_used: 0,
      missing: 0,
      placeholder_used: 0
    }
  });

  for (const asset of manifest.assets) {
    await writeFile(join(projectDir, 'public', asset.path), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
  }
  await writeFile(join(projectDir, 'public/asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(projectDir, 'asset_resolution_report.json'), `${JSON.stringify(createBadResolutionReport(plan, manifest), null, 2)}\n`, 'utf8');

  return manifest;
}

async function writeSemanticLocalPack(packsDir: string, packId: string, plan: AssetPlan): Promise<void> {
  const packDir = join(packsDir, packId);
  await mkdir(packDir, { recursive: true });
  for (const item of plan.items) {
    await writeFile(join(packDir, `${item.id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" data-pack="${packId}" data-id="${item.id}"></svg>`, 'utf8');
  }

  await writeFile(
    join(packDir, 'pack.json'),
    `${JSON.stringify(
      {
        version: 'local-asset-pack-v0.1',
        id: packId,
        label: 'Repair Cats',
        priority: 100,
        license: {
          id: 'CC0-1.0',
          name: 'Creative Commons CC0 1.0 Universal',
          attribution: 'Repair test pack',
          sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
        },
        style: { genres: ['shooter'], camera: 'top_down', tags: ['repair', 'semantic'] },
        assets: plan.items.map((item) => ({
          id: item.id,
          role: item.role,
          file: `${item.id}.svg`,
          format: 'svg',
          semantic:
            item.semantic === undefined
              ? undefined
              : {
                  subjectTags: uniqueTags([item.semantic.expectedConcept, ...item.semantic.expectedAnyTags]),
                  themeTags: [],
                  forbiddenTags: []
                }
        }))
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

function createBadResolutionReport(plan: AssetPlan, manifest: AssetManifest): AssetResolutionReport {
  const planById = new Map(plan.items.map((item) => [item.id, item]));
  return AssetResolutionReportSchema.parse({
    version: 'asset-resolution-report-v0.1',
    projectId,
    summary: {
      selectedProvider: 'local_asset_pack',
      selectedPackId: 'kenney-tiny-shooter-tanks',
      fallbackUsed: false,
      reason: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
    },
    assets: manifest.assets.map((asset) => ({
      id: asset.id,
      role: asset.role,
      selected: {
        source: asset.source,
        sourcePack: asset.sourcePack,
        path: asset.path,
        status: asset.status
      },
      expectedSemantic: planById.get(asset.id)?.semantic,
      semanticFit: asset.semanticFit
    })),
    candidates: [
      {
        packId: 'kenney-tiny-shooter-tanks',
        status: 'selected',
        reason: 'selected',
        message: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
      }
    ]
  });
}

async function readManifest(path: string): Promise<AssetManifest> {
  return AssetManifestSchema.parse(JSON.parse(await readFile(path, 'utf8')));
}

async function readResolutionReport(projectDir: string): Promise<AssetResolutionReport> {
  return AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(projectDir, 'asset_resolution_report.json'), 'utf8')));
}

function uniqueTags(tags: readonly string[]): string[] {
  return [...new Set(tags)];
}
