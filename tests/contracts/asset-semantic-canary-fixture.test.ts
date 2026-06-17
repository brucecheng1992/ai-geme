import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { inferAssetSemanticConstraint, LocalAssetPackSchema } from '../../packages/asset-pipeline/src/index.js';

const fixturePath = join('tests', 'fixtures', 'asset-semantic-canary.briefs.json');
const assetPackRoot = join('assets', 'asset-packs');
const supportedCanonicalConcepts = new Set(['cat', 'dog', 'alien', 'tank', 'space', 'battlefield', 'fishbone']);
const forbiddenExpansionConcepts = new Set(['rabbit', 'robot', 'bird', 'slime', 'asteroid']);
const step8bPromotedIds = [
  'cat_fishbone_alien_shooter',
  'kitten_extraterrestrial_shooter',
  'orange_cat_starfield_alien_shooter',
  'armored_vehicle_vs_tank',
  'cat_space_alien_fishbone'
];
const step8cCanaryV02Ids = [
  'tank_battlefield_shooter',
  'tank_fishbone_battlefield_shooter',
  'cat_vs_tank_space_shooter',
  'alien_vs_alien_space_shooter'
];

const OverallStatusSchema = z.enum(['PLAYABLE', 'PLAYABLE_WITH_FALLBACK_ASSETS', 'PLAYABLE_WITH_ART_WARNINGS', 'NEEDS_ASSET_REPAIR', 'QA_FAILED']);
const AssetCanaryExpectedCoreSchema = z.strictObject({
  role: z.enum(['player', 'enemy', 'projectile', 'background']),
  concept: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  strictness: z.enum(['hard', 'medium', 'soft']),
  allowFallbackGenerated: z.boolean(),
  forbiddenConcepts: z.array(z.string().regex(/^[a-z][a-z0-9_]{1,39}$/)).optional()
});
const AssetCanaryBriefSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  brief: z.string().trim().min(1),
  category: z.enum(['supported_core_semantic', 'generic_shooter', 'mixed_core_semantic', 'medium_theme_semantic']),
  expectedUnsupported: z.boolean().optional(),
  unsupportedReason: z.string().trim().min(1).optional(),
  expect: z.strictObject({
    disallowOverall: z.array(OverallStatusSchema).min(1),
    hardMismatchAllowed: z.boolean(),
    requiredAssetMissingAllowed: z.boolean(),
    assetLoadFailureAllowed: z.boolean(),
    placeholderAllowed: z.boolean(),
    allowedOverall: z.array(OverallStatusSchema).optional(),
    expectedCore: z.array(AssetCanaryExpectedCoreSchema).optional(),
    preferredPack: z
      .strictObject({
        packId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
        soft: z.boolean(),
        roles: z.array(z.enum(['player', 'enemy', 'projectile', 'background'])).optional()
      })
      .optional(),
    notes: z.string().trim().min(1).optional()
  })
});
const AssetCanaryBriefsSchema = z.array(AssetCanaryBriefSchema).min(1);

describe('Asset semantic canary brief fixture', () => {
  it('parses the fixture JSON and keeps ids unique', async () => {
    const briefs = await readCanaryBriefs();
    const ids = briefs.map((brief) => brief.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(briefs.every((brief) => brief.brief.trim().length > 0)).toBe(true);
  });

  it('keeps semantic expectations inside the canary v0.2 taxonomy baseline', async () => {
    const briefs = await readCanaryBriefs();

    for (const brief of briefs) {
      const unsupportedConcepts = (brief.expect.expectedCore ?? [])
        .map((expected) => expected.concept)
        .filter((concept) => !supportedCanonicalConcepts.has(concept));

      if (brief.expectedUnsupported === true) {
        expect(brief.unsupportedReason).toBeTruthy();
      }

      expect(unsupportedConcepts).toEqual([]);

      for (const expected of brief.expect.expectedCore ?? []) {
        if (forbiddenExpansionConcepts.has(expected.concept)) {
          expect(brief.expectedUnsupported).toBe(true);
        }
      }
    }
  });

  it('matches current taxonomy inference for supported canary concepts', () => {
    expect(inferAssetSemanticConstraint({ role: 'player_character', subject: '小猫' }).expectedConcept).toBe('cat');
    expect(inferAssetSemanticConstraint({ role: 'enemy', subject: '小狗' }).expectedConcept).toBe('dog');
    expect(inferAssetSemanticConstraint({ role: 'enemy', subject: '异星人' }).expectedConcept).toBe('alien');
    expect(inferAssetSemanticConstraint({ role: 'player_character', subject: '坦克' }).expectedConcept).toBe('tank');
    expect(inferAssetSemanticConstraint({ role: 'player_character', subject: '装甲车' }).expectedConcept).toBe('tank');
    expect(inferAssetSemanticConstraint({ role: 'background', subject: 'background', styleTheme: '星空' }).expectedConcept).toBe('space');
    expect(inferAssetSemanticConstraint({ role: 'background', subject: 'background', styleTheme: '战场' }).expectedConcept).toBe('battlefield');
    expect(inferAssetSemanticConstraint({ role: 'projectile', subject: '鱼骨头子弹' })).toMatchObject({
      expectedConcept: 'fishbone',
      strictness: 'medium'
    });
  });

  it('promotes taxonomy v0.2 canaries into the default runnable fixture set', async () => {
    const briefs = await readCanaryBriefs();

    expect(briefs.filter((brief) => brief.expectedUnsupported === true)).toEqual([]);
    expect(briefs.filter((brief) => brief.unsupportedReason !== undefined)).toEqual([]);
    expect(briefs.filter((brief) => step8bPromotedIds.includes(brief.id)).map((brief) => brief.id)).toEqual(step8bPromotedIds);
  });

  it('expands the Step 8c canary fixture pack to a small v0.2 set', async () => {
    const briefs = await readCanaryBriefs();
    const ids = briefs.map((brief) => brief.id);
    const step8cBriefs = briefs.filter((brief) => step8cCanaryV02Ids.includes(brief.id));
    const concepts = new Set(step8cBriefs.flatMap((brief) => brief.expect.expectedCore ?? []).map((expected) => expected.concept));

    expect(briefs).toHaveLength(18);
    expect(briefs.length).toBeGreaterThanOrEqual(5);
    expect(briefs.length).toBeLessThanOrEqual(20);
    expect(ids.filter((id) => step8cCanaryV02Ids.includes(id))).toEqual(step8cCanaryV02Ids);
    expect(step8cBriefs.every((brief) => brief.expect.notes?.includes('Step 8c'))).toBe(true);
    expect(concepts).toEqual(new Set(['tank', 'battlefield', 'fishbone', 'cat', 'space', 'alien']));
  });

  it('references only known local packs in preferredPack expectations', async () => {
    const [briefs, knownPackIndexes] = await Promise.all([readCanaryBriefs(), readKnownLocalPackIndexes()]);

    for (const brief of briefs) {
      if (brief.expect.preferredPack !== undefined) {
        const coveredRoles = knownPackIndexes.get(brief.expect.preferredPack.packId);
        expect(coveredRoles).toBeDefined();
        expect(brief.expect.preferredPack.roles?.filter((role) => !coveredRoles?.has(role)) ?? []).toEqual([]);
      }
    }
  });

  it('keeps the v0.2 pack focused on semantic QA expectations rather than runner behavior', async () => {
    const briefs = await readCanaryBriefs();

    expect(briefs).toHaveLength(18);
    expect(briefs.flatMap((brief) => brief.expect.disallowOverall)).toContain('NEEDS_ASSET_REPAIR');
    expect(briefs.flatMap((brief) => brief.expect.disallowOverall)).toContain('QA_FAILED');
    expect(briefs.every((brief) => brief.expect.hardMismatchAllowed === false)).toBe(true);
    expect(briefs.every((brief) => brief.expect.requiredAssetMissingAllowed === false)).toBe(true);
    expect(briefs.every((brief) => brief.expect.assetLoadFailureAllowed === false)).toBe(true);
    expect(briefs.every((brief) => brief.expect.placeholderAllowed === false)).toBe(true);

    for (const brief of briefs) {
      const allowedOverall = new Set(brief.expect.allowedOverall ?? []);
      const conflictingOverall = brief.expect.disallowOverall.filter((status) => allowedOverall.has(status));
      expect(conflictingOverall).toEqual([]);
    }
  });
});

async function readCanaryBriefs(): Promise<z.infer<typeof AssetCanaryBriefsSchema>> {
  const rawFixture = await readFile(fixturePath, 'utf8');
  return AssetCanaryBriefsSchema.parse(JSON.parse(rawFixture));
}

async function readKnownLocalPackIndexes(): Promise<Map<string, Set<string>>> {
  const packDirs = await readdir(assetPackRoot, { withFileTypes: true });
  const packIndexes = new Map<string, Set<string>>();

  for (const packDir of packDirs) {
    if (!packDir.isDirectory()) {
      continue;
    }

    const rawPack = await readFile(join(assetPackRoot, packDir.name, 'pack.json'), 'utf8');
    const pack = LocalAssetPackSchema.parse(JSON.parse(rawPack));
    packIndexes.set(pack.id, new Set(pack.assets.map((asset) => canaryRoleFromAssetRole(asset.role))));
  }

  return packIndexes;
}

function canaryRoleFromAssetRole(role: string): string {
  return role === 'player_character' ? 'player' : role;
}
