import type { NormalizedGameIr } from '../../../../packages/game-dsl/src/index.js';

export type RuntimeCompileInput = {
  projectId: string;
  runId: string;
  ir: NormalizedGameIr;
};

export type RuntimeCompileResult = {
  ok: true;
  projectId: string;
  outputDir: string;
  distDir: string;
  templateId: 'collector_v1' | 'dodger_v1' | 'shooter_v1';
  files: string[];
};

export type BuildInput = {
  projectId: string;
  runId: string;
  projectDir: string;
};

export type BuildResult =
  | {
      ok: true;
      projectId: string;
      distDir: string;
      logPath: string;
    }
  | {
      ok: false;
      projectId: string;
      logPath: string;
      message: string;
    };

export type CommandRunner = (cmd: string, args: string[], options: { cwd: string }) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
