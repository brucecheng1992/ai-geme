import { describe, expect, it } from 'vitest';

import { inferAssetSemanticConstraint } from '../../packages/asset-pipeline/src/index.js';
import { buildSemanticExtractionTrace, validateAndNormalizeRawGameDsl, type VisualConcept } from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

type SemanticTermCase = {
  term: string;
  entityKind: 'enemy' | 'projectile';
  expectedConcept: VisualConcept;
  assetRole: 'enemy' | 'projectile';
};

const semanticTermCases: SemanticTermCase[] = [
  ...actorTerms('cat', ['cat', 'kitten', 'kitty', 'feline', '小猫', '猫咪', '猫猫', '猫']),
  ...actorTerms('dog', ['dog', 'puppy', 'canine', '小狗', '狗狗', '狗']),
  ...actorTerms('alien', ['alien', 'extraterrestrial', 'ufo', 'ufo creature', '外星人', '外星怪物', '异星人', '异星怪物']),
  ...actorTerms('tank', ['tank', 'turret', 'armored vehicle', 'armoured vehicle', '坦克', '战车', '装甲车']),
  ...actorTerms('human_character', ['human', 'person', '人类', '人']),
  ...projectileTerms('fishbone', ['fishbone', 'fish bone', 'fish_bone', '鱼骨', '鱼骨头', '鱼骨子弹', '鱼骨头子弹'])
];

describe('Semantic natural language vocabulary', () => {
  it('maps a 20-50 term vocabulary through DSL semantic model, trace, and asset taxonomy', () => {
    expect(semanticTermCases.length).toBeGreaterThanOrEqual(20);
    expect(semanticTermCases.length).toBeLessThanOrEqual(50);

    for (const [index, testCase] of semanticTermCases.entries()) {
      const { entityId, semanticModel } = normalizeShooterTermCase(testCase, index);
      const profile = semanticModel?.entities.find((entity) => entity.entityId === entityId);
      const trace = buildSemanticExtractionTrace({
        originalPrompt: `玩家输入：做一个 ${testCase.term} 射击目标的小游戏`,
        semanticModel
      });
      const traceEntry = trace.entries.find((entry) => entry.entityId === entityId);
      const assetSemantic = inferAssetSemanticConstraint({ role: testCase.assetRole, subject: testCase.term });

      expect(profile).toMatchObject({ concept: testCase.expectedConcept, strictness: testCase.expectedConcept === 'fishbone' ? 'medium' : 'hard' });
      expect(traceEntry).toMatchObject({
        visualConcept: testCase.expectedConcept,
        extractionSource: 'manual_prompt',
        inferred: false
      });
      expect(assetSemantic.expectedConcept).toBe(testCase.expectedConcept);
    }
  });
});

function actorTerms(expectedConcept: VisualConcept, terms: string[]): SemanticTermCase[] {
  return terms.map((term) => ({ term, entityKind: 'enemy', expectedConcept, assetRole: 'enemy' }));
}

function projectileTerms(expectedConcept: VisualConcept, terms: string[]): SemanticTermCase[] {
  return terms.map((term) => ({ term, entityKind: 'projectile', expectedConcept, assetRole: 'projectile' }));
}

function normalizeShooterTermCase(testCase: SemanticTermCase, index: number) {
  const rawDsl = createShooterRawDsl();
  const entityId = `${testCase.entityKind}_${index}`;

  if (testCase.entityKind === 'projectile') {
    rawDsl.entities = rawDsl.entities.map((entity) => (entity.kind === 'projectile' ? { ...entity, id: entityId, label: testCase.term } : entity));
    rawDsl.player.actions = rawDsl.player.actions.map((action) => ({ ...action, spawns: entityId }));
    rawDsl.rules.collisions = rawDsl.rules.collisions.map((collision) => ({ ...collision, source: entityId }));
  } else {
    rawDsl.entities = rawDsl.entities.map((entity) => (entity.kind === 'enemy' ? { ...entity, id: entityId, label: testCase.term } : entity));
    rawDsl.rules.collisions = rawDsl.rules.collisions.map((collision) => ({ ...collision, target: entityId }));
  }

  const normalized = validateAndNormalizeRawGameDsl(rawDsl);
  expect(normalized.ok).toBe(true);
  if (!normalized.ok) {
    throw new Error('semantic vocabulary fixture failed to normalize');
  }

  return { entityId, semanticModel: normalized.ir.semanticModel };
}
