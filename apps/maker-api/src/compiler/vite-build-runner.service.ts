import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { Injectable } from '@nestjs/common';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import type { BuildInput, BuildResult, CommandRunner } from './compiler.types.js';

function defaultCommandRunner(cmd: string, args: string[], options: { cwd: string }): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: options.cwd }, (error, stdout, stderr) => {
      const errorMessage = error instanceof Error ? error.message : '';
      resolve({
        exitCode: !error ? 0 : typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'number' ? error.code : 1,
        stdout,
        stderr: [stderr, errorMessage].filter(Boolean).join('\n')
      });
    });
  });
}

@Injectable()
export class ViteBuildRunnerService {
  constructor(
    private readonly workspace: LocalWorkspaceService,
    private readonly commandRunner: CommandRunner = defaultCommandRunner
  ) {}

  async build(input: BuildInput): Promise<BuildResult> {
    this.workspace.assertInsideWorkspace(input.projectDir);
    if (resolve(input.projectDir) !== this.workspace.getGeneratedProjectDir(input.projectId)) {
      throw new Error(`Build projectDir must match generated project directory for project ${input.projectId}`);
    }
    const logPath = this.workspace.getBuildLogPath(input.projectId, input.runId);
    const install = await this.commandRunner('npm', ['install', '--package-lock=false'], { cwd: input.projectDir });
    const build = install.exitCode === 0 ? await this.commandRunner('npm', ['run', 'build'], { cwd: input.projectDir }) : undefined;
    const log = [
      `$ cd ${input.projectDir}`,
      '$ npm install --package-lock=false',
      install.stdout,
      install.stderr,
      ...(build === undefined ? [] : ['$ npm run build', build.stdout, build.stderr])
    ]
      .filter(Boolean)
      .join('\n');

    await mkdir(dirname(logPath), { recursive: true });
    await writeFile(logPath, log);

    if (install.exitCode !== 0) {
      return { ok: false, projectId: input.projectId, logPath, message: `npm install failed with exit code ${install.exitCode}` };
    }

    if (build === undefined || build.exitCode !== 0) {
      return { ok: false, projectId: input.projectId, logPath, message: `npm run build failed with exit code ${build?.exitCode ?? 1}` };
    }

    return {
      ok: true,
      projectId: input.projectId,
      distDir: this.workspace.getGeneratedProjectDistDir(input.projectId),
      logPath
    };
  }
}
