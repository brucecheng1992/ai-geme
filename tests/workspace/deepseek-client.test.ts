import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DeepSeekClient } from '../../apps/maker-api/src/model-provider/deepseek.client.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

const params = {
  system: 'Return JSON only.',
  user: { idea: 'cat shooter' },
  projectId: 'proj_20260609_153000_abcd',
  runId: 'run_20260609_153000_abcd',
  outputName: 'brief.raw.json'
};

describe('DeepSeekClient', () => {
  let root: string;
  let workspace: LocalWorkspaceService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-model-'));
    workspace = new LocalWorkspaceService(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes raw model output and parses JSON content', async () => {
    let requestBody: unknown;
    const client = new DeepSeekClient(
      workspace,
      { apiKey: 'test-key', baseUrl: 'https://example.test', defaultModel: 'deepseek-test', defaultTimeoutMs: 1000 },
      async (_input, init) => {
        requestBody = JSON.parse(init?.body?.toString() ?? '{}') as unknown;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"ok":true}' } }]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
    );

    const result = await client.generateJson(params);

    expect(result).toMatchObject({ ok: true, json: { ok: true } });
    expect(requestBody).toMatchObject({
      model: 'deepseek-test',
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' }
    });
    if (result.ok) {
      const raw = JSON.parse(await readFile(result.rawOutputPath, 'utf8')) as unknown;
      expect(raw).toEqual({
        status: 200,
        body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] })
      });
    }
  });

  it('retries once for empty content and then reports MODEL_EMPTY_CONTENT', async () => {
    let calls = 0;
    const client = new DeepSeekClient(
      workspace,
      { apiKey: 'test-key', baseUrl: 'https://example.test', defaultModel: 'deepseek-test', defaultTimeoutMs: 1000 },
      async () => {
        calls += 1;
        return new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 });
      }
    );

    await expect(client.generateJson(params)).resolves.toMatchObject({ ok: false, code: 'MODEL_EMPTY_CONTENT' });
    expect(calls).toBe(2);
  });

  it('maps invalid message JSON and still writes successful raw response', async () => {
    const invalidJsonClient = new DeepSeekClient(
      workspace,
      { apiKey: 'test-key', baseUrl: 'https://example.test', defaultModel: 'deepseek-test', defaultTimeoutMs: 1000 },
      async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), { status: 200 })
    );
    const result = await invalidJsonClient.generateJson(params);

    expect(result).toMatchObject({ ok: false, code: 'MODEL_JSON_PARSE_FAILED' });
    if (!result.ok && result.rawOutputPath !== undefined) {
      await expect(readFile(result.rawOutputPath, 'utf8')).resolves.toContain('not json');
    }
  });

  it('maps non-JSON rate limit and provider failures from HTTP status', async () => {
    const rateLimitedClient = new DeepSeekClient(
      workspace,
      { apiKey: 'test-key', baseUrl: 'https://example.test', defaultModel: 'deepseek-test', defaultTimeoutMs: 1000 },
      async () => new Response('too many requests', { status: 429 })
    );
    await expect(rateLimitedClient.generateJson(params)).resolves.toMatchObject({ ok: false, code: 'MODEL_RATE_LIMITED' });

    const failedClient = new DeepSeekClient(
      workspace,
      { apiKey: 'test-key', baseUrl: 'https://example.test', defaultModel: 'deepseek-test', defaultTimeoutMs: 1000 },
      async () => new Response('bad gateway', { status: 502 })
    );
    await expect(failedClient.generateJson(params)).resolves.toMatchObject({
      ok: false,
      code: 'MODEL_PROVIDER_FAILED',
      message: 'Model provider failed with HTTP 502'
    });
  });

  it('writes non-JSON successful provider responses before reporting failure', async () => {
    const client = new DeepSeekClient(
      workspace,
      { apiKey: 'test-key', baseUrl: 'https://example.test', defaultModel: 'deepseek-test', defaultTimeoutMs: 1000 },
      async () => new Response('not provider json', { status: 200 })
    );
    const result = await client.generateJson(params);

    expect(result).toMatchObject({ ok: false, code: 'MODEL_PROVIDER_FAILED' });
    if (!result.ok && result.rawOutputPath !== undefined) {
      await expect(readFile(result.rawOutputPath, 'utf8')).resolves.toContain('not provider json');
    }
  });

  it('maps timeout and missing key failures', async () => {
    const timeoutClient = new DeepSeekClient(
      workspace,
      { apiKey: 'test-key', baseUrl: 'https://example.test', defaultModel: 'deepseek-test', defaultTimeoutMs: 1 },
      async (_input, init) => {
        await new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
        throw new Error('unreachable');
      }
    );
    await expect(timeoutClient.generateJson(params)).resolves.toMatchObject({ ok: false, code: 'MODEL_TIMEOUT' });

    const missingKeyClient = new DeepSeekClient(workspace, {
      apiKey: '   ',
      baseUrl: 'https://example.test',
      defaultModel: 'deepseek-test',
      defaultTimeoutMs: 1000
    });
    await expect(missingKeyClient.generateJson(params)).resolves.toMatchObject({ ok: false, code: 'MODEL_NOT_AVAILABLE' });
  });
});
