import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const dirs = [
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

await Promise.all(dirs.map((dir) => mkdir(resolve(root, dir), { recursive: true })));

console.log('maker setup complete');
