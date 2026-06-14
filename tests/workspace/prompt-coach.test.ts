import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

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
      strategy: 'mock-v1'
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
});
