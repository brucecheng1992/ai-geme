import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QaStatusPanel } from '../../apps/maker-workbench/src/QaStatusPanel.js';
import type { QaReport } from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench QA status panel', () => {
  it('separates gameplay QA from render fidelity expected and observed evidence', () => {
    const markup = renderToStaticMarkup(createElement(QaStatusPanel, { report: makeQaReport() }));

    expect(markup).toContain('Overall');
    expect(markup).toContain('Runtime');
    expect(markup).toContain('Render fidelity');
    expect(markup).toContain('VISUALLY_DEGRADED');
    expect(markup).toContain('Expected: QA screenshot is non-blank.');
    expect(markup).toContain('Observed: Screenshot metrics: nonBackground=0.02, varied=0.01.');
    expect(markup).toContain('Missing: Runtime scene structure is bound.');
    expect(markup).not.toContain('Visual QA failed');
    expect(markup).not.toContain('/Users/');
  });
});

function makeQaReport(): QaReport {
  return {
    status: 'PASSED',
    runtime_status: 'PASSED',
    asset_semantic_status: 'WARNING',
    overall_status: 'PLAYABLE_WITH_ART_WARNINGS',
    visual_status: 'PASSED',
    observed_events: ['game.ready'],
    missing_events: [],
    missing_any_groups: [],
    console_errors: [],
    render_fidelity: {
      status: 'VISUALLY_DEGRADED',
      reason: 'Render fidelity degraded by runtime scene structure.',
      expected: ['QA screenshot is non-blank.', 'Runtime scene structure is bound.'],
      observed: ['Screenshot metrics: nonBackground=0.02, varied=0.01.'],
      missing: ['Runtime scene structure is bound.']
    },
    asset_report: {
      semantic_status: 'WARNING',
      required: [],
      ready: [],
      fallback_used: [],
      placeholder_used: [],
      missing: [],
      assets: [],
      semantic_issues: [],
      failures: []
    }
  };
}
