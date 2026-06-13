import { dirname } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import {
  AssetSemanticCanaryComparisonSummarySchema,
  buildAssetSemanticCanaryComparison,
  parseAssetSemanticCanaryComparisonArgs,
  printAssetSemanticCanaryComparisonHelp,
  renderAssetSemanticCanaryComparisonJson
} from './asset-semantic-canary-comparison.js';
import type { AssetSemanticCanarySummary } from './asset-semantic-canary-report.js';

async function main(): Promise<void> {
  let parsedOptions;
  try {
    parsedOptions = parseAssetSemanticCanaryComparisonArgs(process.argv.slice(2));
  } catch (caught) {
    console.error(errorMessage(caught));
    process.exitCode = 2;
    return;
  }

  if (parsedOptions === 'help') {
    printAssetSemanticCanaryComparisonHelp();
    return;
  }

  try {
    const defaultSummary = await readSummary(parsedOptions.defaultSummaryPath);
    const repairEnabledSummary = await readSummary(parsedOptions.repairEnabledSummaryPath);
    const comparison = buildAssetSemanticCanaryComparison({ defaultSummary, repairEnabledSummary });
    const rendered = renderAssetSemanticCanaryComparisonJson(comparison);

    if (parsedOptions.outPath === undefined) {
      process.stdout.write(rendered);
      return;
    }

    await mkdir(dirname(parsedOptions.outPath), { recursive: true });
    await writeFile(parsedOptions.outPath, rendered, 'utf8');
    console.log(`Asset semantic canary comparison written to ${parsedOptions.outPath}`);
    console.log(
      `ok=${comparison.ok} case.total=${comparison.case_set.total} case.runnable=${comparison.default_run.runnable} case.skipped=${comparison.case_set.skipped} case.experimental=${comparison.case_set.experimental} default.failed=${comparison.default_run.failed} repair.failed=${comparison.repair_enabled_run.failed} failureDiagnosticDelta=${comparison.delta.failure_diagnostic_count}`
    );
  } catch (caught) {
    console.error(errorMessage(caught));
    process.exitCode = 1;
  }
}

async function readSummary(path: string): Promise<AssetSemanticCanarySummary> {
  return AssetSemanticCanaryComparisonSummarySchema.parse(JSON.parse(await readFile(path, 'utf8'))) as AssetSemanticCanarySummary;
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}

void main();
