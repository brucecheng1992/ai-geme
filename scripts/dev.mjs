import { execFile, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PORT_RELEASE_TIMEOUT_MS = 5_000;
const PORT_RELEASE_POLL_MS = 200;

const processes = [
  {
    label: 'maker-api',
    command: 'npm',
    args: ['run', '--workspace', '@ai-game-maker/maker-api', 'start'],
    port: 3000,
    url: 'http://localhost:3000'
  },
  {
    label: 'maker-workbench',
    command: 'npm',
    args: ['run', '--workspace', '@ai-game-maker/maker-workbench', 'dev'],
    port: 5173,
    url: 'http://localhost:5173'
  }
];

const children = new Map();
let isShuttingDown = false;

function prefixOutput(label, chunk, stream) {
  const lines = chunk.toString().split(/\r?\n/);

  for (const line of lines) {
    if (line.length > 0) {
      stream.write(`[${label}] ${line}\n`);
    }
  }
}

function stopAll(signal = 'SIGTERM') {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children.values()) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

async function findListeningPids(port) {
  try {
    const { stdout } = await execFileAsync('lsof', ['-nP', '-ti', `tcp:${port}`, '-sTCP:LISTEN']);
    const pids = stdout
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter(Number.isInteger);

    return [...new Set(pids)];
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
      return [];
    }

    throw error;
  }
}

async function waitForPortRelease(port, timeoutMs = PORT_RELEASE_TIMEOUT_MS) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if ((await findListeningPids(port)).length === 0) {
      return true;
    }

    await sleep(PORT_RELEASE_POLL_MS);
  }

  return (await findListeningPids(port)).length === 0;
}

function killPid(pid, signal) {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') {
      throw error;
    }
  }
}

async function stopExistingService(processConfig) {
  const pids = await findListeningPids(processConfig.port);

  if (pids.length === 0) {
    return;
  }

  console.log(`Stopping existing ${processConfig.label} service on port ${processConfig.port}: pid ${pids.join(', ')}`);

  for (const pid of pids) {
    killPid(pid, 'SIGTERM');
  }

  if (await waitForPortRelease(processConfig.port)) {
    return;
  }

  const remainingPids = await findListeningPids(processConfig.port);

  for (const pid of remainingPids) {
    killPid(pid, 'SIGKILL');
  }

  if (!(await waitForPortRelease(processConfig.port))) {
    throw new Error(`Port ${processConfig.port} is still in use after stopping ${processConfig.label}.`);
  }
}

async function stopExistingServices() {
  for (const processConfig of processes) {
    await stopExistingService(processConfig);
  }
}

console.log('Starting AI Game Maker local dev services...');

await stopExistingServices();

for (const processConfig of processes) {
  console.log(`- ${processConfig.label}: ${processConfig.url}`);

  const child = spawn(processConfig.command, processConfig.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  children.set(processConfig.label, child);

  child.stdout.on('data', (chunk) => prefixOutput(processConfig.label, chunk, process.stdout));
  child.stderr.on('data', (chunk) => prefixOutput(processConfig.label, chunk, process.stderr));

  child.on('error', (error) => {
    console.error(`[${processConfig.label}] failed to start: ${error.message}`);
    stopAll();
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    children.delete(processConfig.label);

    if (isShuttingDown) {
      return;
    }

    const exitReason = signal === null ? `code ${code ?? 0}` : `signal ${signal}`;
    console.error(`[${processConfig.label}] exited unexpectedly with ${exitReason}`);
    stopAll();
    process.exitCode = code === null || code === 0 ? 1 : code;
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopAll(signal);
  });
}
