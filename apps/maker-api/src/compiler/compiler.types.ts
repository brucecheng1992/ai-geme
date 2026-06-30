import type {
  AuthorityBundle,
  NormalizedGameIr,
  RawGameDsl,
  UnsupportedRuntimeCapability
} from '../../../../packages/game-dsl/src/index.js';

export type RuntimeCompileInput = {
  projectId: string;
  runId: string;
  ir: NormalizedGameIr;
  rawDsl?: RawGameDsl;
  semanticTraceContext?: {
    originalPrompt?: string;
    brief?: unknown;
  };
  authorityBundle: AuthorityBundle;
};

export type RuntimeCompileSuccess = {
  ok: true;
  projectId: string;
  outputDir: string;
  distDir: string;
  templateId: 'collector_v1' | 'dodger_v1' | 'shooter_v1' | 'side_scrolling_run_and_gun.v1';
  files: string[];
};

export type RuntimeCompileUnsupported = {
  ok: false;
  code: 'RUNTIME_UNSUPPORTED';
  projectId: string;
  templateId: string;
  unsupportedCapabilities: UnsupportedRuntimeCapability[];
};

export type RuntimeCompileResult = RuntimeCompileSuccess | RuntimeCompileUnsupported;

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
