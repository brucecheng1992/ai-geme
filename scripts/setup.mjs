import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const dirs = [
  'data/local-data/projects',
  'data/local-data/runs',
  'data/local-data/logs',
  'data/local-data/artifacts',
  'data/local-data/qa-reports',
  'data/local-data/telemetry',
  'data/local-data/result',
  'data/local-data/model-outputs',
  'data/local-data/build-logs',
  'data/local-data/repair-reports',
  'data/generated-projects'
];

await Promise.all(dirs.map((dir) => mkdir(resolve(root, dir), { recursive: true })));

console.log('maker setup complete');
