import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { ProjectRequestError } from '../../apps/maker-api/src/projects/project-request.error.js';
import { PromptCoachService } from '../../apps/maker-api/src/projects/prompt-coach.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

describe('PromptCoachService', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let coach: PromptCoachService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-prompt-coach-'));
    workspace = new LocalWorkspaceService(root);
    coach = new PromptCoachService(workspace);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('prepares a deterministic prompt optimization report and artifacts without applying it', async () => {
    const input = {
      projectId: 'proj_20260615_prompt',
      originalPrompt: '  做一个多人 3D 小猫射击游戏，带在线排行榜  ',
      supportedDslVersion: 'v1' as const
    };

    const first = await coach.prepare(input);
    const second = await coach.prepare(input);

    expect(first).toEqual(second);
    expect(first.report).toMatchObject({
      reportVersion: 'prompt_optimization_report.v1',
      projectId: input.projectId,
      optimizationId: 'opt_proj_20260615_prompt_c36cfeeeefcd',
      originalPrompt: '做一个多人 3D 小猫射击游戏，带在线排行榜',
      supportedDslVersion: 'v1',
      capabilitiesUsed: ['deterministic-whitespace-normalization', 'dsl-friendly-brief-structure', 'unsupported-request-detection'],
      status: 'prepared',
      applied: false,
      strategy: 'mock-v1',
      mode: 'mock'
    });
    expect(first.report.optimizedPrompt).not.toBe(first.report.originalPrompt);
    expect(first.report.optimizedPrompt).toContain(first.report.originalPrompt);
    expect(first.report.optimizedPrompt).toContain('DSL-friendly constraints');
    expect(first.report.dslFitWarnings).toEqual(['complex_3d_request_detected', 'multiplayer_request_detected', 'online_leaderboard_request_detected']);
    expect(first.report.unsupportedRequests).toEqual(['complex_3d', 'multiplayer', 'online_leaderboard']);
    expect(first.report.suggestedQuestions).toEqual([
      'What is the player objective in one sentence?',
      'Which 2D camera style should the game use?',
      'What obstacle, enemy, or collectible should appear first?'
    ]);
    expect(first.artifacts).toEqual([
      {
        id: 'promptOptimizationReport',
        artifactRoot: 'model-output',
        path: 'prompt-optimizations/opt_proj_20260615_prompt_c36cfeeeefcd/prompt_optimization_report.json',
        format: 'json'
      },
      {
        id: 'optimizedPrompt',
        artifactRoot: 'model-output',
        path: 'prompt-optimizations/opt_proj_20260615_prompt_c36cfeeeefcd/optimized_prompt.txt',
        format: 'txt'
      }
    ]);
    expect(JSON.stringify(first)).not.toContain(root);
    for (const artifact of first.artifacts) {
      expect(artifact.path).not.toContain('..');
      expect(artifact.path.startsWith('/')).toBe(false);
    }

    const reportRaw = await readFile(
      workspace.getProjectPromptOptimizationArtifactPath(input.projectId, first.report.optimizationId, 'prompt_optimization_report.json'),
      'utf8'
    );
    const optimizedRaw = await readFile(
      workspace.getProjectPromptOptimizationArtifactPath(input.projectId, first.report.optimizationId, 'optimized_prompt.txt'),
      'utf8'
    );
    expect(JSON.parse(reportRaw)).toEqual(first.report);
    expect(optimizedRaw).toBe(`${first.report.optimizedPrompt}\n`);
    await expect(readFile(workspace.getModelOutputPath(input.projectId, 'run_20260615_prompt', 'game_dsl.json'), 'utf8')).rejects.toThrow();
  });

  it('rejects empty original prompts at the boundary', async () => {
    await expect(
      coach.prepare({
        projectId: 'proj_20260615_prompt',
        originalPrompt: '   ',
        supportedDslVersion: 'v1'
      })
    ).rejects.toThrow('originalPrompt is required.');
  });

  it('uses runId to keep same-prompt optimizations from sharing an artifact path', async () => {
    const first = await coach.prepare({
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt_a',
      originalPrompt: 'cat shooter',
      supportedDslVersion: 'v1'
    });
    const second = await coach.prepare({
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt_b',
      originalPrompt: 'cat shooter',
      supportedDslVersion: 'v1'
    });

    expect(first.report.optimizationId).not.toBe(second.report.optimizationId);
    expect(first.artifacts[0].path).not.toBe(second.artifacts[0].path);
    expect(first.report.runId).toBe('run_20260615_prompt_a');
    expect(second.report.runId).toBe('run_20260615_prompt_b');
  });

  it('rejects llm mode when no explicit LLM client is configured', async () => {
    await expect(
      coach.prepare({
        projectId: 'proj_20260615_prompt',
        originalPrompt: 'cat shooter',
        supportedDslVersion: 'v1',
        mode: 'llm'
      })
    ).rejects.toThrow('Prompt Coach LLM mode is not configured.');
  });

  it('normalizes successful llm output before writing artifacts', async () => {
    const llmCoach = new PromptCoachService(workspace, {
      llm: {
        enabled: true,
        modelProfile: 'test-profile',
        async optimize() {
          return {
            ok: true,
            json: {
              optimizedPrompt: '  Use a 2D cat shooter with clear waves.  ',
              intentSummary: '  cat shooter brief  ',
              dslFitWarnings: ['z_warning', '', 'a_warning', 'z_warning'],
              unsupportedRequests: ['multiplayer', '', 'complex_3d', 'multiplayer'],
              suggestedQuestions: ['  Which enemy appears first?  ', '', 'What is the win condition?'],
              capabilitiesUsed: ['llm-json-prompt-coaching', 'llm-json-prompt-coaching', 'dsl-friendly-brief-structure']
            }
          };
        }
      }
    });

    const prepared = await llmCoach.prepare({
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt_a',
      originalPrompt: 'cat shooter',
      supportedDslVersion: 'v1',
      mode: 'llm'
    });

    expect(prepared.report).toMatchObject({
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt_a',
      originalPrompt: 'cat shooter',
      optimizedPrompt: 'Use a 2D cat shooter with clear waves.',
      intentSummary: 'cat shooter brief',
      dslFitWarnings: ['a_warning', 'z_warning'],
      unsupportedRequests: ['complex_3d', 'multiplayer'],
      suggestedQuestions: ['What is the win condition?', 'Which enemy appears first?'],
      capabilitiesUsed: ['dsl-friendly-brief-structure', 'llm-json-prompt-coaching'],
      mode: 'llm',
      strategy: 'llm-v1',
      modelProfile: 'test-profile',
      status: 'prepared',
      applied: false
    });
    expect(JSON.stringify(prepared.report)).not.toContain('secret');
    expect(JSON.stringify(prepared.report)).not.toContain(root);

    const reportRaw = await readFile(
      workspace.getProjectPromptOptimizationArtifactPath(prepared.report.projectId, prepared.report.optimizationId, 'prompt_optimization_report.json'),
      'utf8'
    );
    const optimizedRaw = await readFile(
      workspace.getProjectPromptOptimizationArtifactPath(prepared.report.projectId, prepared.report.optimizationId, 'optimized_prompt.txt'),
      'utf8'
    );
    expect(JSON.parse(reportRaw)).toEqual(prepared.report);
    expect(optimizedRaw).toBe('Use a 2D cat shooter with clear waves.\n');
    await expect(readFile(workspace.getModelOutputPath(prepared.report.projectId, prepared.report.runId ?? 'run_missing', 'game_dsl.json'), 'utf8')).rejects.toThrow();
  });

  it('rejects invalid llm JSON without writing success artifacts', async () => {
    const llmCoach = new PromptCoachService(workspace, {
      llm: {
        enabled: true,
        async optimize() {
          return { ok: false, code: 'MODEL_JSON_PARSE_FAILED', message: 'invalid json from fake model' };
        }
      }
    });

    await expect(
      llmCoach.prepare({
        projectId: 'proj_20260615_prompt',
        runId: 'run_20260615_prompt_a',
        originalPrompt: 'cat shooter',
        supportedDslVersion: 'v1',
        mode: 'llm'
      })
    ).rejects.toThrow('Prompt Coach LLM mode is unavailable.');

    await expect(
      readFile(
        workspace.getProjectPromptOptimizationArtifactPath('proj_20260615_prompt', 'opt_proj_20260615_prompt_3e8038c56587', 'prompt_optimization_report.json'),
        'utf8'
      )
    ).rejects.toThrow();
  });

  it('rejects schema-invalid or dangerous llm payloads before writing success artifacts', async () => {
    const llmCoach = new PromptCoachService(workspace, {
      llm: {
        enabled: true,
        async optimize() {
          return {
            ok: true,
            json: {
              optimizedPrompt: '```ts\nconsole.log("game")\n```',
              intentSummary: 'cat shooter',
              dslFitWarnings: [],
              unsupportedRequests: [],
              suggestedQuestions: [],
              capabilitiesUsed: [],
              game_dsl: { genre: 'top_down_shooter' }
            }
          };
        }
      }
    });

    await expect(
      llmCoach.prepare({
        projectId: 'proj_20260615_prompt',
        runId: 'run_20260615_prompt_a',
        originalPrompt: 'cat shooter',
        supportedDslVersion: 'v1',
        mode: 'llm'
      })
    ).rejects.toThrow('Prompt Coach LLM output failed validation.');

    await expect(
      readFile(
        workspace.getProjectPromptOptimizationArtifactPath('proj_20260615_prompt', 'opt_proj_20260615_prompt_3e8038c56587', 'optimized_prompt.txt'),
        'utf8'
      )
    ).rejects.toThrow();
  });

  it('rejects dangerous llm array values before writing success artifacts', async () => {
    const llmCoach = new PromptCoachService(workspace, {
      llm: {
        enabled: true,
        async optimize() {
          return {
            ok: true,
            json: {
              optimizedPrompt: 'Use a 2D cat shooter.',
              intentSummary: 'cat shooter',
              dslFitWarnings: ['api key should go here'],
              unsupportedRequests: ['/Users/local/path'],
              suggestedQuestions: ['What is the win condition?'],
              capabilitiesUsed: ['authorization: Bearer secret']
            }
          };
        }
      }
    });

    await expect(
      llmCoach.prepare({
        projectId: 'proj_20260615_prompt',
        runId: 'run_20260615_prompt_a',
        originalPrompt: 'cat shooter',
        supportedDslVersion: 'v1',
        mode: 'llm'
      })
    ).rejects.toThrow('Prompt Coach LLM output failed validation.');
  });

  it('rejects generic env, bearer, raw provider, and local path text from llm output', async () => {
    const llmCoach = new PromptCoachService(workspace, {
      llm: {
        enabled: true,
        async optimize() {
          return {
            ok: true,
            json: {
              optimizedPrompt: 'Use a 2D cat shooter.',
              intentSummary: 'cat shooter',
              dslFitWarnings: ['OPENAI_API_KEY leaked through process.env.OPENAI_API_KEY'],
              unsupportedRequests: ['raw provider output at C:\\Users\\provider-output.json'],
              suggestedQuestions: ['Bearer abc.def token'],
              capabilitiesUsed: []
            }
          };
        }
      }
    });

    await expect(
      llmCoach.prepare({
        projectId: 'proj_20260615_prompt',
        runId: 'run_20260615_prompt_a',
        originalPrompt: 'cat shooter',
        supportedDslVersion: 'v1',
        mode: 'llm'
      })
    ).rejects.toThrow('Prompt Coach LLM output failed validation.');
  });

  it('does not expose provider failure messages through api-facing errors', async () => {
    const llmCoach = new PromptCoachService(workspace, {
      llm: {
        enabled: true,
        async optimize() {
          return {
            ok: false,
            code: 'MODEL_PROVIDER_FAILED',
            message: 'OPENAI_API_KEY leaked through process.env.OPENAI_API_KEY with Bearer abc.def token at C:\\Users\\provider.json'
          };
        }
      }
    });

    try {
      await llmCoach.prepare({
        projectId: 'proj_20260615_prompt',
        runId: 'run_20260615_prompt_a',
        originalPrompt: 'cat shooter',
        supportedDslVersion: 'v1',
        mode: 'llm'
      });
      throw new Error('Expected Prompt Coach LLM provider failure to reject.');
    } catch (error) {
      const serialized = JSON.stringify(error);
      expect(error).toBeInstanceOf(ProjectRequestError);
      expect(serialized).toContain('Prompt Coach LLM mode is unavailable.');
      expect(serialized).not.toContain('OPENAI_API_KEY');
      expect(serialized).not.toContain('process.env');
      expect(serialized).not.toContain('Bearer');
      expect(serialized).not.toContain('C:\\Users');
    }
  });

  it('uses normalized llm payload to keep repeated same-prompt artifacts auditable', async () => {
    let callCount = 0;
    const llmCoach = new PromptCoachService(workspace, {
      llm: {
        enabled: true,
        async optimize() {
          callCount += 1;
          return {
            ok: true,
            json: {
              optimizedPrompt: callCount === 1 ? 'Use a 2D cat shooter.' : 'Use a 2D cat shooter with three waves.',
              intentSummary: 'cat shooter',
              dslFitWarnings: [],
              unsupportedRequests: [],
              suggestedQuestions: ['What is the win condition?'],
              capabilitiesUsed: ['llm-json-prompt-coaching']
            }
          };
        }
      }
    });

    const first = await llmCoach.prepare({
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt_a',
      originalPrompt: 'cat shooter',
      supportedDslVersion: 'v1',
      mode: 'llm'
    });
    const second = await llmCoach.prepare({
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt_a',
      originalPrompt: 'cat shooter',
      supportedDslVersion: 'v1',
      mode: 'llm'
    });

    expect(second.report.optimizationId).not.toBe(first.report.optimizationId);
    expect(second.artifacts[0].path).not.toBe(first.artifacts[0].path);
  });
});
