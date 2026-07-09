import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import {
  BATCH_001_MAX_IMAGES,
  BATCH_001_TASK_DEFINITIONS,
  evaluateBatch001Gate,
  getBatch001RequestedImageCount
} from '../../scripts/art-task-batch-001.js';

const execFileAsync = promisify(execFile);

describe('ArtTask Batch 001 live gate', () => {
  it('skips when live batch flags are missing', async () => {
    const result = await execFileAsync('npx', ['tsx', 'scripts/art-task-batch-001.ts'], {
      env: {
        ...process.env,
        RUN_MINIMAX_LIVE_TESTS: '0',
        RUN_REAL_2D_ASSET_BATCH: '0',
        MINIMAX_API_KEY: ''
      }
    });

    expect(result.stdout).toContain('Skipping real 2D asset Batch 001');
    expect(result.stderr).toBe('');
  });

  it('requires an API key only after both live flags are enabled', () => {
    expect(
      evaluateBatch001Gate({
        RUN_MINIMAX_LIVE_TESTS: '1',
        RUN_REAL_2D_ASSET_BATCH: '0',
        MINIMAX_API_KEY: ''
      })
    ).toEqual({
      status: 'skip',
      message: 'Skipping real 2D asset Batch 001'
    });
    expect(
      evaluateBatch001Gate({
        RUN_MINIMAX_LIVE_TESTS: '0',
        RUN_REAL_2D_ASSET_BATCH: '1',
        MINIMAX_API_KEY: ''
      })
    ).toEqual({
      status: 'skip',
      message: 'Skipping real 2D asset Batch 001'
    });
    expect(
      evaluateBatch001Gate({
        RUN_MINIMAX_LIVE_TESTS: '1',
        RUN_REAL_2D_ASSET_BATCH: '1',
        MINIMAX_API_KEY: ''
      })
    ).toEqual({
      status: 'error',
      message: 'Batch 001 requires MINIMAX_API_KEY when live batch flags are enabled.'
    });
  });

  it('defines the expected task count and stays within the image cap', () => {
    expect(BATCH_001_TASK_DEFINITIONS.map((definition) => definition.id)).toEqual([
      'player_character_concept',
      'enemy_concept',
      'scene_background',
      'skill_icon_slash',
      'skill_icon_guard',
      'skill_icon_burst',
      'ui_concept'
    ]);
    expect(BATCH_001_TASK_DEFINITIONS).toHaveLength(7);
    expect(getBatch001RequestedImageCount()).toBe(12);
    expect(getBatch001RequestedImageCount()).toBeLessThanOrEqual(BATCH_001_MAX_IMAGES);
  });
});
