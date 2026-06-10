import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LocalWorkspaceService, WorkspacePathError } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

describe('LocalWorkspaceService', () => {
  const root = resolve('/tmp/ai-game-maker-test-root');

  it('resolves canonical workspace directories inside the configured root', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(workspace.getRootDir()).toBe(root);
    expect(workspace.getLocalDataDir()).toBe(resolve(root, 'local-data'));
    expect(workspace.getGeneratedProjectsDir()).toBe(resolve(root, 'generated-projects'));
  });

  it('resolves project, run, QA, telemetry, and model output paths inside local-data', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(workspace.getProjectDir('proj_20260609_153000_abcd')).toBe(
      resolve(root, 'local-data/projects/proj_20260609_153000_abcd')
    );
    expect(workspace.getRunDir('run_20260609_153000_0001')).toBe(
      resolve(root, 'local-data/runs/run_20260609_153000_0001')
    );
    expect(workspace.getQaReportPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'local-data/qa-reports/proj_20260609_153000_abcd/run_20260609_153000_0001.json')
    );
    expect(workspace.getTelemetryPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'local-data/telemetry/proj_20260609_153000_abcd/run_20260609_153000_0001.jsonl')
    );
    expect(workspace.getModelOutputPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001', 'brief.raw.json')).toBe(
      resolve(root, 'local-data/model-outputs/proj_20260609_153000_abcd/run_20260609_153000_0001/brief.raw.json')
    );
    expect(workspace.getBuildLogPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'local-data/build-logs/proj_20260609_153000_abcd/run_20260609_153000_0001.log')
    );
    expect(workspace.getRepairReportPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001')).toBe(
      resolve(root, 'local-data/repair-reports/proj_20260609_153000_abcd/run_20260609_153000_0001.json')
    );
    expect(workspace.getGeneratedProjectDir('proj_20260609_153000_abcd')).toBe(
      resolve(root, 'generated-projects/proj_20260609_153000_abcd')
    );
  });

  it('rejects unsafe identifiers before resolving paths', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(() => workspace.getProjectDir('../escape')).toThrow(WorkspacePathError);
    expect(() => workspace.getRunDir('run/escape')).toThrow(WorkspacePathError);
    expect(() =>
      workspace.getModelOutputPath('proj_20260609_153000_abcd', 'run_20260609_153000_0001', '../brief.raw.json')
    ).toThrow(WorkspacePathError);
  });

  it('rejects absolute paths outside the workspace root', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(() => workspace.assertInsideWorkspace(resolve(root, 'local-data/projects'))).not.toThrow();
    expect(() => workspace.assertInsideWorkspace(resolve('/tmp/outside-workspace'))).toThrow(WorkspacePathError);
  });

  it('rejects relative paths passed to assertInsideWorkspace', () => {
    const workspace = new LocalWorkspaceService(root);

    expect(() => workspace.assertInsideWorkspace('local-data/projects')).toThrow(WorkspacePathError);
  });
});
