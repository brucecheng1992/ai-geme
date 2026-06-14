import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PipelineArtifactIndexSchema,
  buildInvalidDslPipelineArtifactIndex,
  buildValidPipelineArtifactIndex,
  writePipelineArtifactIndex
} from '../../apps/maker-api/src/projects/pipeline-artifact-index.js';

const projectId = 'proj_20260615_artifacts';
const runId = 'run_20260615_artifacts';

describe('Pipeline artifact index contract', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-artifact-index-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('builds deterministic valid-path artifact refs without absolute paths or report payloads', async () => {
    const index = buildValidPipelineArtifactIndex({
      projectId,
      runId,
      compileFiles: [
        'public/assets/player.svg',
        'asset_plan.json',
        'public/asset_manifest.json',
        'asset_resolution_report.json',
        'shooter/src/asset-manifest.generated.json',
        'asset_pipeline_report.json',
        'pipeline_artifact_index.json'
      ],
      buildLogPresent: true,
      qaReportPresent: true
    });
    const second = buildValidPipelineArtifactIndex({
      projectId,
      runId,
      compileFiles: [...index.artifacts.filter((artifact) => artifact.artifactRoot === 'generated-project').map((artifact) => artifact.path)].reverse(),
      buildLogPresent: true,
      qaReportPresent: true
    });

    expect(index).toEqual(second);
    expect(index).toMatchObject({
      indexVersion: 'pipeline-artifact-index-v0.1',
      projectId,
      runId
    });
    expect(index.artifacts.map((artifact) => artifact.id)).toEqual([
      'gameDsl',
      'gameDslCandidate',
      'dslValidationReport',
      'runtimeCapabilityReport',
      'assetPlan',
      'publicAssetManifest',
      'phaserPreviewManifest',
      'assetResolutionReport',
      'assetPipelineReport',
      'buildLog',
      'qaReport',
      'pipelineArtifactIndex'
    ]);
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gameDsl', status: 'present', artifactRoot: 'model-output', path: 'game_dsl.json' }),
        expect.objectContaining({ id: 'gameDslCandidate', status: 'skipped', reason: 'valid_dsl_path_uses_game_dsl_json' }),
        expect.objectContaining({ id: 'publicAssetManifest', status: 'present', artifactRoot: 'generated-project', path: 'public/asset_manifest.json' }),
        expect.objectContaining({ id: 'phaserPreviewManifest', status: 'present', path: 'shooter/src/asset-manifest.generated.json' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'present', path: 'asset_pipeline_report.json' }),
        expect.objectContaining({ id: 'buildLog', status: 'present', artifactRoot: 'build-log', path: `${runId}.log` }),
        expect.objectContaining({ id: 'qaReport', status: 'present', artifactRoot: 'qa-report', path: `${runId}.json` }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', artifactRoot: 'model-output', path: 'pipeline_artifact_index.json' })
      ])
    );
    expect(JSON.stringify(index)).not.toContain('asset-pipeline-report-v0.1');
    for (const artifact of index.artifacts) {
      expect(isAbsolute(artifact.path)).toBe(false);
      expect(artifact.path).not.toContain('..');
    }
  });

  it('marks downstream artifacts skipped on invalid DSL without consulting stale generated-project files', async () => {
    const index = buildInvalidDslPipelineArtifactIndex({ projectId, runId });

    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gameDsl', status: 'skipped', reason: 'invalid_dsl_path_uses_game_dsl_candidate_json' }),
        expect.objectContaining({ id: 'gameDslCandidate', status: 'present', path: 'game_dsl.candidate.json' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'present', path: 'dsl_validation_report.json' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'skipped', reason: 'dsl_validation_failed_before_compile' }),
        expect.objectContaining({ id: 'qaReport', status: 'skipped', reason: 'dsl_validation_failed_before_qa' })
      ])
    );
  });

  it('writes a parseable index file with a stable trailing newline', async () => {
    const index = buildInvalidDslPipelineArtifactIndex({ projectId, runId });
    const path = join(root, 'pipeline_artifact_index.json');

    await writePipelineArtifactIndex(path, index);

    const raw = await readFile(path, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(PipelineArtifactIndexSchema.parse(JSON.parse(raw))).toEqual(index);
    await writeFile(path, raw, 'utf8');
  });

  it('rejects unsafe artifact paths at the schema boundary', () => {
    const index = buildInvalidDslPipelineArtifactIndex({ projectId, runId });
    const ref = index.artifacts[0];

    for (const path of ['/abs.json', '../escape.json', 'nested/../escape.json', 'assets\\player.svg', 'C:/tmp/file.json']) {
      expect(() =>
        PipelineArtifactIndexSchema.parse({
          ...index,
          artifacts: [{ ...ref, path }]
        })
      ).toThrow();
    }
  });
});
