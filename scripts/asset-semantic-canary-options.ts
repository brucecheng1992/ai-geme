import {
  readAssetSemanticRepairConfig,
  type AssetSemanticRepairConfig
} from '../apps/maker-api/src/projects/generation-pipeline.service.js';

export type AssetSemanticCanaryCliOptions = {
  fixturePath: string;
  outputRoot: string;
  includeUnsupported: boolean;
  allowNetwork: boolean;
  repairEnabled: boolean;
  caseId?: string;
  limit?: number;
  timestamp: string;
};

export function parseAssetSemanticCanaryArgs(args: string[], timestamp = compactTimestamp(new Date())): AssetSemanticCanaryCliOptions | 'help' {
  const options: AssetSemanticCanaryCliOptions = {
    fixturePath: 'tests/fixtures/asset-semantic-canary.briefs.json',
    outputRoot: 'artifacts/asset-semantic-canary',
    includeUnsupported: false,
    allowNetwork: false,
    repairEnabled: false,
    timestamp
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--include-unsupported') {
      options.includeUnsupported = true;
    } else if (arg === '--allow-network') {
      options.allowNetwork = true;
    } else if (arg === '--repair-enabled') {
      options.repairEnabled = true;
    } else if (arg === '--case') {
      options.caseId = requireValue(args, (index += 1), arg);
    } else if (arg === '--limit') {
      options.limit = parsePositiveInteger(requireValue(args, (index += 1), arg), arg);
    } else if (arg === '--fixture') {
      options.fixturePath = requireValue(args, (index += 1), arg);
    } else if (arg === '--output-root') {
      options.outputRoot = requireValue(args, (index += 1), arg);
    } else if (arg === '--timestamp') {
      options.timestamp = requireValue(args, (index += 1), arg);
    } else if (arg === '--help') {
      return 'help';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

export function resolveCanaryAssetSemanticRepairConfig(
  options: AssetSemanticCanaryCliOptions,
  env: NodeJS.ProcessEnv = process.env
): AssetSemanticRepairConfig {
  const envConfig = readAssetSemanticRepairConfig(env);
  if (!options.repairEnabled) {
    return envConfig;
  }

  return {
    ...envConfig,
    enabled: true,
    maxAttempts: 1
  };
}

export function printAssetSemanticCanaryHelp(): void {
  console.log(`Usage: npm run qa:asset-semantic:canary -- [options]

Options:
  --include-unsupported   Run expectedUnsupported canaries instead of skipping them.
  --repair-enabled        Enable semantic asset repair for this canary run.
  --case <id>             Run one canary case by id.
  --limit <n>             Run the first n selected canaries for smoke checks.
  --allow-network         Allow npm install to use the network. Default adds --offline.
  --fixture <path>        Fixture path. Defaults to tests/fixtures/asset-semantic-canary.briefs.json.
  --output-root <path>    Output root. Defaults to artifacts/asset-semantic-canary.
  --timestamp <value>     Override output timestamp for repeatable local runs.
`);
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Expected a value after ${flag}`);
  }
  return value;
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer after ${flag}`);
  }

  return parsed;
}

function compactTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
