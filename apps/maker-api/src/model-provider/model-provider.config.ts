import type { DeepSeekClientConfig } from './model-provider.types.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const DEFAULT_TIMEOUT_MS = 30_000;
const ENV_FILE_NAME = '.env';

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readDeepSeekConfig(env: NodeJS.ProcessEnv = process.env): DeepSeekClientConfig {
  const fileEnv = readNearestEnvFile(env);

  return {
    apiKey: readEnvValue('DEEPSEEK_API_KEY', env, fileEnv),
    baseUrl: readEnvValue('DEEPSEEK_BASE_URL', env, fileEnv) ?? DEFAULT_BASE_URL,
    defaultModel: readEnvValue('DEEPSEEK_DSL_MODEL', env, fileEnv) ?? DEFAULT_MODEL,
    defaultTimeoutMs: readPositiveInteger(readEnvValue('DEEPSEEK_TIMEOUT_MS', env, fileEnv), DEFAULT_TIMEOUT_MS)
  };
}

function readEnvValue(key: string, env: NodeJS.ProcessEnv, fileEnv: Map<string, string>): string | undefined {
  return env[key] ?? fileEnv.get(key);
}

/** Loads local model provider settings when the API is started outside an exported shell env. */
function readNearestEnvFile(env: NodeJS.ProcessEnv): Map<string, string> {
  const path = findNearestEnvPath(env);

  if (path === null) {
    return new Map();
  }

  return parseEnv(readFileSync(path, 'utf8'));
}

function findNearestEnvPath(env: NodeJS.ProcessEnv): string | null {
  const starts = [env.INIT_CWD, process.cwd()].filter((value): value is string => value !== undefined && value.length > 0);

  for (const start of starts) {
    let current = resolve(start);

    while (true) {
      const candidate = resolve(current, ENV_FILE_NAME);

      if (existsSync(candidate)) {
        return candidate;
      }

      const parent = dirname(current);

      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  return null;
}

function parseEnv(content: string): Map<string, string> {
  const entries = new Map<string, string>();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    entries.set(trimmed.slice(0, equalsIndex).trim(), trimmed.slice(equalsIndex + 1).trim());
  }

  return entries;
}
