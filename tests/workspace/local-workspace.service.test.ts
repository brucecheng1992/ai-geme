import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LocalWorkspaceService, WorkspacePathError } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

describe('LocalWorkspaceService', () => {
  const root = resolve('/tmp/ai-game-maker-test-root');

  it('resolves canonical workspace directories inside the configured root', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(workspace.getRootDir()).toBe(root);
    expect(workspace.getLocalDataDir()).toBe(resolve(root, 'data/local-data'));
    expect(workspace.getGeneratedProjectsDir()).toBe(resolve(root, 'data/generated-projects'));
  });

  it('resolves project, run, QA, telemetry, and model output paths inside data/local-data', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(workspace.getProjectDir('proj_20260609_153000_abcd')).toBe(
      resolve(root, 'data/local-data/projects/proj_20260609_153000_abcd')
    );
    expect(workspace.getRunDir('run_20260609_153000_0001')).toBe(
      resolve(root, 'data/local-data/runs/run_20260609_153000_0001')
    );
    expect(workspace.getQaReportPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'data/local-data/qa-reports/proj_20260609_153000_abcd/run_20260609_153000_0001.json')
    );
    expect(workspace.getTelemetryPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'data/local-data/telemetry/proj_20260609_153000_abcd/run_20260609_153000_0001.jsonl')
    );
    expect(workspace.getModelOutputPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001', 'brief.raw.json')).toBe(
      resolve(root, 'data/local-data/model-outputs/proj_20260609_153000_abcd/run_20260609_153000_0001/brief.raw.json')
    );
    expect(
      workspace.getResultRawDslPath(
        'proj_20260609_153000_abcd',
        'run_20260609_153000_0001',
        new Date('2026-06-10T05:06:07.089Z')
      )
    ).toBe(
      resolve(
        root,
        'data/local-data/result/2026/06/10/2026-06-10T05-06-07-089Z__proj_20260609_153000_abcd__run_20260609_153000_0001__raw-game-dsl.json'
      )
    );
    expect(workspace.getBuildLogPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'data/local-data/build-logs/proj_20260609_153000_abcd/run_20260609_153000_0001.log')
    );
    expect(workspace.getRepairReportPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'data/local-data/repair-reports/proj_20260609_153000_abcd/run_20260609_153000_0001.json')
    );
    expect(workspace.getSemanticAmendmentDir('proj_20260609_153000_abcd', 'run_20260609_153000_0001', 'amend_20260618_000000_abcd')).toBe(
      resolve(root, 'data/local-data/model-outputs/proj_20260609_153000_abcd/run_20260609_153000_0001/semantic-amendments/amend_20260618_000000_abcd')
    );
    expect(
      workspace.getSemanticAmendmentArtifactPath(
        'proj_20260609_153000_abcd',
        'run_20260609_153000_0001',
        'amend_20260618_000000_abcd',
        'proposal.json'
      )
    ).toBe(
      resolve(
        root,
        'data/local-data/model-outputs/proj_20260609_153000_abcd/run_20260609_153000_0001/semantic-amendments/amend_20260618_000000_abcd/proposal.json'
      )
    );
    expect(
      workspace.getSemanticAmendmentReviewArtifactPath(
        'proj_20260609_153000_abcd',
        'run_20260609_153000_0001',
        'amend_20260618_000000_abcd',
        'preview_state.json'
      )
    ).toBe(
      resolve(
        root,
        'data/local-data/model-outputs/proj_20260609_153000_abcd/run_20260609_153000_0001/semantic-amendments/amend_20260618_000000_abcd/review/preview_state.json'
      )
    );
    expect(
      workspace.getSemanticAmendmentCandidateArtifactPath(
        'proj_20260609_153000_abcd',
        'run_20260609_153000_0001',
        'amend_20260618_000000_abcd',
        'candidate_dsl.json'
      )
    ).toBe(
      resolve(
        root,
        'data/local-data/model-outputs/proj_20260609_153000_abcd/run_20260609_153000_0001/semantic-amendments/amend_20260618_000000_abcd/candidate/candidate_dsl.json'
      )
    );
    expect(workspace.getGeneratedProjectDir('proj_20260609_153000_abcd')).toBe(
      resolve(root, 'data/generated-projects/proj_20260609_153000_abcd')
    );
  });

  it('rejects unsafe identifiers before resolving paths', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(() => workspace.getProjectDir('../escape')).toThrow(WorkspacePathError);
    expect(() => workspace.getRunDir('run/escape')).toThrow(WorkspacePathError);
    expect(() =>
      workspace.getModelOutputPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001', '../brief.raw.json')
    ).toThrow(WorkspacePathError);
    expect(() =>
      workspace.getSemanticAmendmentArtifactPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001', '../amend_escape', 'proposal.json')
    ).toThrow(WorkspacePathError);
    expect(() =>
      workspace.getSemanticAmendmentReviewArtifactPath(
        'proj_20260609_153000_abcd',
        'run_20260609_153000_0001',
        'amend_20260618_000000_abcd',
        '../preview_state.json'
      )
    ).toThrow(WorkspacePathError);
    expect(() =>
      workspace.getSemanticAmendmentCandidateArtifactPath(
        'proj_20260609_153000_abcd',
        'run_20260609_153000_0001',
        'amend_20260618_000000_abcd',
        '../candidate_dsl.json'
      )
    ).toThrow(WorkspacePathError);
  });

  it('rejects absolute paths outside the workspace root', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(() => workspace.assertInsideWorkspace(resolve(root, 'data/local-data/projects'))).not.toThrow();
    expect(() => workspace.assertInsideWorkspace(resolve('/tmp/outside-workspace'))).toThrow(WorkspacePathError);
  });

  it('rejects relative paths passed to assertInsideWorkspace', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(() => workspace.assertInsideWorkspace('data/local-data/projects')).toThrow(WorkspacePathError);
  });
});
