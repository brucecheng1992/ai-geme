import { spawn } from 'node:child_process';

const processes = [
  {
    label: 'maker-api',
    command: 'npm',
    args: ['run', '--workspace', '@ai-game-maker/maker-api', 'start'],
    url: 'http://localhost:3000'
  },
  {
    label: 'maker-workbench',
    command: 'npm',
    args: ['run', '--workspace', '@ai-game-maker/maker-workbench', 'dev'],
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

console.log('Starting AI Game Maker local dev services...');

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
