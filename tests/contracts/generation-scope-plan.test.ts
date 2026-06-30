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
      duration_resolution_gate: {
        verdict: 'PASS',
        explicit_duration_present: true,
        duration_defaulted: false,
        duration_source: 'explicit_user_prompt',
        requested_mode: 'range',
        missing_duration_was_fatal: false,
        generation_failed_due_to_missing_duration: false
      },
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
      duration_resolution_gate: {
        explicit_duration_present: true,
        duration_defaulted: false,
        duration_source: 'explicit_user_prompt',
        resolved_target_sec: 5
      },
      qaProbeWindowSec: 10
    });
    expect(buildGenerationScopePlan({ requestedPlayTime: { mode: 'endless' } })).toMatchObject({
      deliveryMode: 'endless_system',
      requestedPlayTime: { mode: 'endless' },
      duration_resolution_gate: {
        explicit_duration_present: true,
        duration_defaulted: false,
        duration_source: 'explicit_user_prompt',
        resolved_target_sec: null
      },
      fullCompletionVerification: 'endless_invariant_suite'
    });
    expect(buildGenerationScopePlan({ requestedPlayTime: { mode: 'unspecified' } })).toMatchObject({
      deliveryMode: 'single_pass',
      requestedPlayTime: { mode: 'unspecified' },
      duration_resolution_gate: {
        verdict: 'PASS',
        duration_intent_resolved: true,
        explicit_duration_present: false,
        duration_defaulted: true,
        duration_source: 'product_default',
        resolution_status: 'product_default',
        requested_mode: 'unspecified',
        resolved_target_sec: 60,
        default_target_sec: 60,
        missing_duration_was_fatal: false,
        duration_missing_was_fatal: false,
        generation_failed_due_to_missing_duration: false,
        unsupported_required_capabilities: []
      },
      qaProbeWindowSec: 60
    });
  });
});
