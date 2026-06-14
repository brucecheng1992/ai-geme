import {
  formatArtAssetMetadataValidationJson,
  formatArtAssetMetadataValidationText,
  getArtAssetMetadataValidationExitCode,
  validateArtAssetMetadataFiles
} from '../packages/asset-pipeline/src/index.js';

type MetadataValidationCliOptions = {
  targets: string[];
  json: boolean;
  checkPaths: boolean;
  projectRoot?: string;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options === 'help') {
    printHelp();
    return;
  }

  const result = await validateArtAssetMetadataFiles({
    targets: options.targets,
    checkPaths: options.checkPaths,
    projectRoot: options.projectRoot
  });

  process.stdout.write(options.json ? formatArtAssetMetadataValidationJson(result) : formatArtAssetMetadataValidationText(result));
  process.exitCode = getArtAssetMetadataValidationExitCode(result);
}

function parseArgs(args: string[]): MetadataValidationCliOptions | 'help' {
  const options: MetadataValidationCliOptions = {
    targets: [],
    json: false,
    checkPaths: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--check-paths') {
      options.checkPaths = true;
    } else if (arg === '--project-root') {
      options.projectRoot = requireValue(args, (index += 1), arg);
    } else if (arg === '--help') {
      return 'help';
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown argument: ${arg}`);
    } else {
      options.targets.push(arg);
    }
  }

  return {
    ...options,
    targets: options.targets.length > 0 ? options.targets : ['assets/metadata']
  };
}

function printHelp(): void {
  process.stdout.write(`Usage: npm run metadata:validate -- [options] [file-or-directory ...]

Options:
  --json                  Print deterministic JSON for CI.
  --check-paths           Check technical.source_path and technical.thumbnail_path exist.
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

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Metadata validation command failed: ${message}\n`);
  process.exitCode = 2;
});
