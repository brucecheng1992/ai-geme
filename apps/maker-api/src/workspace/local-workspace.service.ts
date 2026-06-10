import { isAbsolute, relative, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

import { GENERATED_PROJECTS_DIR, LOCAL_DATA_DIR, LOCAL_DATA_SUBDIRS } from './local-workspace.constants.js';

const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SAFE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export class WorkspacePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspacePathError';
  }
}

export class LocalWorkspaceService {
  private readonly rootDir: string;

  constructor(rootDir = process.env.LOCAL_WORKSPACE_ROOT ?? findWorkspaceRoot(process.cwd())) {
    this.rootDir = resolve(rootDir);
  }

  getRootDir(): string {
    return this.rootDir;
  }

  getLocalDataDir(): string {
    return this.resolveInsideWorkspace(LOCAL_DATA_DIR);
  }

  getGeneratedProjectsDir(): string {
    return this.resolveInsideWorkspace(GENERATED_PROJECTS_DIR);
  }

  getGeneratedProjectDir(projectId: string): string {
    return this.resolveInsideWorkspace(GENERATED_PROJECTS_DIR, this.assertSafeSegment(projectId, 'projectId'));
  }

  getGeneratedProjectDistDir(projectId: string): string {
    return this.resolveInsideWorkspace(GENERATED_PROJECTS_DIR, this.assertSafeSegment(projectId, 'projectId'), 'dist');
  }

  getProjectDir(projectId: string): string {
    return this.resolveInsideWorkspace(LOCAL_DATA_DIR, LOCAL_DATA_SUBDIRS.projects, this.assertSafeSegment(projectId, 'projectId'));
  }

  getRunDir(runId: string): string {
    return this.resolveInsideWorkspace(LOCAL_DATA_DIR, LOCAL_DATA_SUBDIRS.runs, this.assertSafeSegment(runId, 'runId'));
  }

  getQaReportPath(projectId: string, runId: string): string {
    return this.resolveInsideWorkspace(
      LOCAL_DATA_DIR,
      LOCAL_DATA_SUBDIRS.qaReports,
      this.assertSafeSegment(projectId, 'projectId'),
      `${this.assertSafeSegment(runId, 'runId')}.json`
    );
  }

  getQaScreenshotPath(projectId: string, runId: string): string {
    return this.resolveInsideWorkspace(
      GENERATED_PROJECTS_DIR,
      this.assertSafeSegment(projectId, 'projectId'),
      'qa',
      'screenshot.png'
    );
  }

  getTelemetryPath(projectId: string, runId: string): string {
    return this.resolveInsideWorkspace(
      LOCAL_DATA_DIR,
      LOCAL_DATA_SUBDIRS.telemetry,
      this.assertSafeSegment(projectId, 'projectId'),
      `${this.assertSafeSegment(runId, 'runId')}.jsonl`
    );
  }

  getModelOutputPath(projectId: string, runId: string, name: string): string {
    return this.resolveInsideWorkspace(
      LOCAL_DATA_DIR,
      LOCAL_DATA_SUBDIRS.modelOutputs,
      this.assertSafeSegment(projectId, 'projectId'),
      this.assertSafeSegment(runId, 'runId'),
      this.assertSafeFileName(name, 'name')
    );
  }

  getBuildLogPath(projectId: string, runId: string): string {
    return this.resolveInsideWorkspace(
      LOCAL_DATA_DIR,
      LOCAL_DATA_SUBDIRS.buildLogs,
      this.assertSafeSegment(projectId, 'projectId'),
      `${this.assertSafeSegment(runId, 'runId')}.log`
    );
  }

  getRepairReportPath(projectId: string, runId: string): string {
    return this.resolveInsideWorkspace(
      LOCAL_DATA_DIR,
      LOCAL_DATA_SUBDIRS.repairReports,
      this.assertSafeSegment(projectId, 'projectId'),
      `${this.assertSafeSegment(runId, 'runId')}.json`
    );
  }

  assertInsideWorkspace(absPath: string): void {
    if (!isAbsolute(absPath)) {
      throw new WorkspacePathError(`Expected an absolute workspace path, received: ${absPath}`);
    }

    const normalizedPath = resolve(absPath);
    const pathFromRoot = relative(this.rootDir, normalizedPath);

    if (pathFromRoot === '') {
      return;
    }

    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      throw new WorkspacePathError(`Path escapes workspace root: ${normalizedPath}`);
    }
  }

  private resolveInsideWorkspace(...segments: string[]): string {
    const absPath = resolve(this.rootDir, ...segments);
    this.assertInsideWorkspace(absPath);
    return absPath;
  }

  private assertSafeSegment(value: string, label: string): string {
    if (!SAFE_SEGMENT_PATTERN.test(value)) {
      throw new WorkspacePathError(`${label} contains unsafe path characters: ${value}`);
    }

    return value;
  }

  private assertSafeFileName(value: string, label: string): string {
    if (!SAFE_FILE_NAME_PATTERN.test(value) || value.includes('..')) {
      throw new WorkspacePathError(`${label} contains unsafe file name characters: ${value}`);
    }

    return value;
  }
}

function findWorkspaceRoot(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    const packageJsonPath = resolve(current, 'package.json');

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { workspaces?: unknown };
        if (Array.isArray(packageJson.workspaces)) {
          return current;
        }
      } catch {
        return current;
      }
    }

    const parent = resolve(current, '..');
    if (parent === current) {
      return resolve(startDir);
    }

    current = parent;
  }
}
