import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

for (const dir of ['data/local-data', 'data/generated-projects']) {
  await rm(resolve('.', dir), { recursive: true, force: true });
}

console.log('maker local data cleaned');
