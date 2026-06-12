import { describe, expect, it } from 'vitest';

import {
  formatAssetSemanticFitSummary,
  getWorkbenchStatusTone,
  resolveWorkbenchDisplayStatus,
  type QaReport
} from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench semantic status helpers', () => {
  it('displays QA overall asset repair status instead of a pure project PLAYABLE status', () => {
    const qaReport: QaReport = {
      status: 'PASSED',
      runtime_status: 'PASSED',
      asset_semantic_status: 'FAILED',
      overall_status: 'NEEDS_ASSET_REPAIR'
    };

    expect(resolveWorkbenchDisplayStatus('PLAYABLE', qaReport)).toBe('NEEDS_ASSET_REPAIR');
    expect(getWorkbenchStatusTone('NEEDS_ASSET_REPAIR')).toBe('bad');
  });

  it('keeps semantic fallback as a warning-toned playable status', () => {
    const qaReport: QaReport = {
      status: 'PASSED',
      runtime_status: 'PASSED',
      asset_semantic_status: 'PASSED',
      overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS'
    };

    expect(resolveWorkbenchDisplayStatus('PLAYABLE', qaReport)).toBe('PLAYABLE_WITH_FALLBACK_ASSETS');
    expect(getWorkbenchStatusTone('PLAYABLE_WITH_FALLBACK_ASSETS')).toBe('warn');
  });

  it('formats per-asset semantic fit summaries for the Assets panel', () => {
    expect(
      formatAssetSemanticFitSummary({
        id: 'player',
        role: 'player_character',
        source: 'local_asset_pack',
        semantic_status: 'FAILED',
        semantic_fit: {
          status: 'mismatch',
          confidence: 0,
          strictness: 'hard',
          expectedConcept: 'cat',
          missingTags: ['cat', 'kitten'],
          conflictingTags: ['tank'],
          reason: 'Local asset semantic tags do not satisfy expected cat.'
        }
      })
    ).toBe('mismatch hard expected cat missing cat, kitten conflict tank');
  });
});
