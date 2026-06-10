import { access, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

const root = resolve('.');
const requiredDirectories = [
  'local-data/projects',
  'local-data/runs',
  'local-data/logs',
  'local-data/artifacts',
  'local-data/qa-reports',
  'local-data/telemetry',
  'local-data/model-outputs',
  'local-data/build-logs',
  'local-data/repair-reports',
  'generated-projects'
];
const requiredEnvKeys = [
  'PORT',
  'WORKBENCH_ORIGIN',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_DSL_MODEL',
  'DEEPSEEK_REVIEW_MODEL',
  'LOCAL_WORKSPACE_ROOT',
  'PLAYWRIGHT_BROWSER',
  'QA_TIMEOUT_MS',
  'MAX_REPAIR_ATTEMPTS'
];
const requiredPorts = [
  { label: 'maker-api', port: 3000 },
  { label: 'maker-workbench', port: 5173 }
];

const failures = [];
const warnings = [];

function pass(message) {
  console.log(`PASS ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.warn(`WARN ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseEnv(content) {
  const entries = new Map();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    entries.set(key, value);
  }

  return entries;
}

async function readEnvFile(path) {
  const content = await readFile(path, 'utf8');
  return parseEnv(content);
}

async function checkPortAvailable(port) {
  return await new Promise((resolveAvailability) => {
    const server = createServer();

    server.once('error', () => resolveAvailability(false));
    server.once('listening', () => {
      server.close(() => resolveAvailability(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

function checkNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);

  if (major >= 20) {
    pass(`Node.js ${process.versions.node}`);
    return;
  }

  fail(`Node.js ${process.versions.node} is below required major version 20`);
}

async function checkInstalledDependencies() {
  const nodeModulesExists = await pathExists(resolve(root, 'node_modules'));
  const packageLockExists = await pathExists(resolve(root, 'package-lock.json'));

  if (nodeModulesExists && packageLockExists) {
    pass('npm dependencies are installed');
    return;
  }

  fail('npm dependencies are missing; run npm install');
}

async function checkDirectories() {
  for (const directory of requiredDirectories) {
    if (await pathExists(resolve(root, directory))) {
      pass(`${directory} exists`);
    } else {
      fail(`${directory} is missing; run npm run maker:setup`);
    }
  }
}

async function checkEnvFiles() {
  const examplePath = resolve(root, '.env.example');

  if (!(await pathExists(examplePath))) {
    fail('.env.example is missing');
    return;
  }

  const exampleEntries = await readEnvFile(examplePath);
  const missingExampleKeys = requiredEnvKeys.filter((key) => !exampleEntries.has(key));

  if (missingExampleKeys.length === 0) {
    pass('.env.example contains required keys');
  } else {
    fail(`.env.example is missing keys: ${missingExampleKeys.join(', ')}`);
  }

  const envPath = resolve(root, '.env');

  if (!(await pathExists(envPath))) {
    warn('.env is missing; model calls will remain disabled until configured');
    return;
  }

  const envEntries = await readEnvFile(envPath);
  const missingEnvKeys = requiredEnvKeys.filter((key) => !envEntries.has(key));

  if (missingEnvKeys.length > 0) {
    warn(`.env is missing keys: ${missingEnvKeys.join(', ')}`);
  } else {
    pass('.env contains required key names');
  }

  const apiKey = envEntries.get('DEEPSEEK_API_KEY');

  if (apiKey === undefined || apiKey.length === 0 || apiKey === 'your_deepseek_api_key') {
    warn('DEEPSEEK_API_KEY is not configured with a non-placeholder value');
  } else {
    pass('DEEPSEEK_API_KEY is configured');
  }
}

async function checkPorts() {
  for (const { label, port } of requiredPorts) {
    if (await checkPortAvailable(port)) {
      pass(`${label} port ${port} is available`);
    } else {
      fail(`${label} port ${port} is already in use`);
    }
  }
}

console.log('Running AI Game Maker local doctor...');

checkNodeVersion();
await checkInstalledDependencies();
await checkDirectories();
await checkEnvFiles();
await checkPorts();

console.log(`Doctor complete: ${failures.length} failure(s), ${warnings.length} warning(s)`);

if (failures.length > 0) {
  process.exitCode = 1;
}
