import { describe, expect, it } from 'vitest';

import {
  GenerationScopePlanSchema,
  buildGenerationScopePlan
} from '../../packages/game-dsl/src/index.js';

describe('Step37 GenerationScopePlan', () => {
  it('separates requested play time from engineering QA budget for long-form ranges', () => {
    const plan = buildGenerationScopePlan({
      requestedPlayTime: { mode: 'range', min_sec: 480, max_sec: 720 }
    });

    expect(GenerationScopePlanSchema.parse(plan)).toEqual(plan);
    expect(plan).toMatchObject({
      schemaVersion: 'step37.generation-scope-plan.v1',
      deliveryMode: 'staged',
      requestedPlayTime: { mode: 'range', min_sec: 480, max_sec: 720 },
      qaProbeWindowSec: 120,
      fullCompletionVerification: 'checkpoint_scenarios',
      preservesRequestedPlayTime: true
    });
    expect(plan.plannedContentStages).toBeGreaterThan(1);
  });

  it('does not rewrite short target, endless or unspecified intent into fake durations', () => {
    expect(buildGenerationScopePlan({ requestedPlayTime: { mode: 'target', target_sec: 5 } })).toMatchObject({
      deliveryMode: 'single_pass',
      requestedPlayTime: { mode: 'target', target_sec: 5 },
      qaProbeWindowSec: 10
    });
    expect(buildGenerationScopePlan({ requestedPlayTime: { mode: 'endless' } })).toMatchObject({
      deliveryMode: 'endless_system',
      requestedPlayTime: { mode: 'endless' },
      fullCompletionVerification: 'endless_invariant_suite'
    });
    expect(buildGenerationScopePlan({ requestedPlayTime: { mode: 'unspecified' } })).toMatchObject({
      deliveryMode: 'single_pass',
      requestedPlayTime: { mode: 'unspecified' }
    });
  });
});
