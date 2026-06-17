import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import type { LiveVersionRecord } from './dsl-live-edit.service.js';
import { ProjectRequestError } from './project-request.error.js';
import type { RunStoreService } from './run-store.service.js';
import { GameDslArtifactSchema, type GameDslArtifact } from '../../../../packages/game-dsl/src/index.js';

const LiveCurrentVersionFileSchema = z.strictObject({
  versionId: z.string().min(1),
  baseVersionId: z.string().min(1).optional(),
  dslId: z.string().min(1),
  dslArtifactPath: z.string().min(1),
  updatedAt: z.string().min(1)
});

export async function assertRunBelongsToProject(runStore: RunStoreService, projectId: string, runId: string): Promise<void> {
  const run = await runStore.readRun(runId);
  if (run.project_id !== projectId) {
    throw new ProjectRequestError(`run does not belong to project: ${runId}`);
  }
}

export async function readCurrentGameDsl(workspace: LocalWorkspaceService, projectId: string, runId: string): Promise<GameDslArtifact> {
  const liveVersion = await readLiveCurrentVersionIfPresent(workspace, projectId, runId);
  const dslPath = liveVersion?.dslArtifactPath ?? workspace.getModelOutputPath(projectId, runId, 'game_dsl.json');
  workspace.assertInsideWorkspace(dslPath);

  let artifact: GameDslArtifact;
  try {
    artifact = GameDslArtifactSchema.parse(JSON.parse(await readFile(dslPath, 'utf8')));
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) {
      throw new NotFoundException('Game DSL artifact not found for semantic amendment planning.');
    }
    throw error;
  }

  if (artifact.runId !== runId) {
    throw new ProjectRequestError(`game DSL artifact identity does not match run: ${projectId}/${runId}`);
  }
  if (liveVersion !== undefined && artifact.dslId !== liveVersion.dslId) {
    throw new ProjectRequestError(`live current DSL id does not match artifact: ${projectId}/${runId}`);
  }

  return artifact;
}

export async function readLiveCurrentVersionIfPresent(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string
): Promise<LiveVersionRecord | undefined> {
  try {
    return LiveCurrentVersionFileSchema.parse(JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')));
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) {
      return undefined;
    }
    throw error;
  }
}

export async function readRequiredLiveCurrentVersion(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string
): Promise<LiveVersionRecord> {
  const liveVersion = await readLiveCurrentVersionIfPresent(workspace, projectId, runId);
  if (liveVersion === undefined) {
    throw new ProjectRequestError('live current version is required for semantic amendment accept/undo.');
  }
  return liveVersion;
}

export async function restoreLiveVersion(input: {
  workspace: LocalWorkspaceService;
  projectId: string;
  runId: string;
  version: LiveVersionRecord;
  updatedAt: string;
}): Promise<LiveVersionRecord> {
  input.workspace.assertInsideWorkspace(input.version.dslArtifactPath);
  const artifact = GameDslArtifactSchema.parse(JSON.parse(await readFile(input.version.dslArtifactPath, 'utf8')));
  if (artifact.runId !== input.runId || artifact.dslId !== input.version.dslId) {
    throw new ProjectRequestError(`undo checkpoint DSL identity does not match run: ${input.projectId}/${input.runId}`);
  }
  const restored: LiveVersionRecord = {
    ...input.version,
    updatedAt: input.updatedAt
  };
  const currentVersionPath = input.workspace.getLiveCurrentVersionPath(input.projectId, input.runId);
  await mkdir(dirname(currentVersionPath), { recursive: true });
  await writeFile(currentVersionPath, `${JSON.stringify(restored, null, 2)}\n`, 'utf8');
  return restored;
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}
