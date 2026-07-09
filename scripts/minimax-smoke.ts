import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createMiniMaxArtProviderAdapter } from '../packages/asset-pipeline/src/index.js';

const OUTPUT_DIR = join('artifacts', 'minimax-smoke');

async function main(): Promise<void> {
  if (process.env.RUN_MINIMAX_LIVE_TESTS !== '1') {
    console.log('Skipping MiniMax live smoke test because RUN_MINIMAX_LIVE_TESTS is not 1.');
    return;
  }

  if ((process.env.MINIMAX_API_KEY ?? '').trim().length === 0) {
    console.error('MiniMax live smoke test requires MINIMAX_API_KEY when RUN_MINIMAX_LIVE_TESTS=1.');
    process.exitCode = 1;
    return;
  }

  const adapter = createMiniMaxArtProviderAdapter();
  const result = await adapter.generateImage({
    taskId: 'minimax-live-smoke-skill-icon',
    assetType: 'skill_icon',
    prompt: '2D fantasy game skill icon, glowing blue sword slash, clean silhouette, game UI icon, high contrast',
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64'
  });
  const firstBase64 = result.images.find((image) => image.base64 !== undefined)?.base64;
  if (firstBase64 === undefined) {
    console.error('MiniMax live smoke test did not return a base64 image.');
    process.exitCode = 1;
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, `minimax-smoke-${timestampForFilename(new Date())}.jpg`);
  await writeFile(outputPath, Buffer.from(firstBase64, 'base64'));
  console.log(`MiniMax live smoke test wrote ${outputPath}.`);
}

function timestampForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

await main();
