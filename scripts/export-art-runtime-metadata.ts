import {
  createRuntimeExportUsageErrorDiagnostic,
  exportRuntimeArtAssetMetadataFromDirectory,
  exportRuntimeArtAssetMetadataFromFile,
  exportRuntimeArtAssetMetadataFromTargets,
  formatRuntimeArtAssetMetadataExportArtifactJson,
  formatRuntimeArtAssetMetadataExportDiagnosticsText,
  formatRuntimeArtAssetMetadataExportResultJson,
  getRuntimeArtAssetMetadataExportExitCode,
  type ExportRuntimeArtAssetMetadataResult
} from '../packages/asset-pipeline/src/index.js';

type MetadataRuntimeExportCliOptions = {
  input?: string;
  mode: 'auto' | 'file' | 'dir';
  json: boolean;
  checkPaths: boolean;
  outputPath?: string;
  projectRoot?: string;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options === 'help') {
    printHelp();
    return;
  }

  const result = await runExport(options);
  writeResult(result, options);
  process.exitCode = getRuntimeArtAssetMetadataExportExitCode(result);
}

function parseArgs(args: string[]): MetadataRuntimeExportCliOptions | 'help' {
  const options: MetadataRuntimeExportCliOptions = {
    mode: 'auto',
    json: false,
    checkPaths: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--check-paths') {
      options.checkPaths = true;
    } else if (arg === '--out') {
      options.outputPath = requireValue(args, (index += 1), arg);
    } else if (arg === '--project-root') {
      options.projectRoot = requireValue(args, (index += 1), arg);
    } else if (arg === '--file') {
      setExplicitInput(options, requireValue(args, (index += 1), arg), 'file', arg);
    } else if (arg === '--dir') {
      setExplicitInput(options, requireValue(args, (index += 1), arg), 'dir', arg);
    } else if (arg === '--help') {
      return 'help';
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown argument: ${arg}`);
    } else {
      setPositionalInput(options, arg);
    }
  }

  if (options.input === undefined) {
    throw new Error('Expected a .asset.json file or directory input.');
  }

  return options;
}

async function runExport(options: MetadataRuntimeExportCliOptions): Promise<ExportRuntimeArtAssetMetadataResult> {
  const exportOptions = {
    checkPaths: options.checkPaths,
    outputPath: options.outputPath,
    projectRoot: options.projectRoot
  };

  if (options.mode === 'file') {
    return exportRuntimeArtAssetMetadataFromFile(options.input!, exportOptions);
  }
  if (options.mode === 'dir') {
    return exportRuntimeArtAssetMetadataFromDirectory(options.input!, exportOptions);
  }
  return exportRuntimeArtAssetMetadataFromTargets([options.input!], exportOptions);
}

function writeResult(result: ExportRuntimeArtAssetMetadataResult, options: MetadataRuntimeExportCliOptions): void {
  if (options.json) {
    process.stdout.write(formatRuntimeArtAssetMetadataExportResultJson(result));
    return;
  }

  if (result.ok) {
    if (options.outputPath === undefined) {
      process.stdout.write(formatRuntimeArtAssetMetadataExportArtifactJson(result.artifact!));
    } else {
      process.stdout.write(formatRuntimeArtAssetMetadataExportDiagnosticsText(result));
    }
    return;
  }

  process.stderr.write(formatRuntimeArtAssetMetadataExportDiagnosticsText(result));
}

function setExplicitInput(options: MetadataRuntimeExportCliOptions, input: string, mode: 'file' | 'dir', flag: string): void {
  if (options.input !== undefined) {
    throw new Error(`Cannot combine ${flag} with another input path.`);
  }
  options.input = input;
  options.mode = mode;
}

function setPositionalInput(options: MetadataRuntimeExportCliOptions, input: string): void {
  if (options.input !== undefined) {
    throw new Error('Expected only one positional input path.');
  }
  if (options.mode !== 'auto') {
    throw new Error('Cannot combine positional input with --file or --dir.');
  }
  options.input = input;
}

function printHelp(): void {
  process.stdout.write(`Usage: npm run metadata:export-runtime -- [options] <file-or-directory>

Options:
  --file <path>           Export one .asset.json file.
  --dir <path>            Export all .asset.json files in a directory.
  --out <path>            Write the runtime-safe JSON artifact to a file.
  --json                  Print deterministic JSON result envelope for CI.
  --check-paths           Pass through Step 2 source_path and thumbnail_path checks.
  --project-root <path>   Root used for --check-paths. Defaults to the current working directory.
  --help                  Show this help.
`);
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Expected a value after ${flag}`);
  }
  return value;
}

function failureResult(message: string): ExportRuntimeArtAssetMetadataResult {
  return {
    ok: false,
    diagnostics: [createRuntimeExportUsageErrorDiagnostic(message)]
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const result = failureResult(message);
  if (process.argv.slice(2).includes('--json')) {
    process.stdout.write(formatRuntimeArtAssetMetadataExportResultJson(result));
  } else {
    process.stderr.write(formatRuntimeArtAssetMetadataExportDiagnosticsText(result));
  }
  process.exitCode = getRuntimeArtAssetMetadataExportExitCode(result);
});
