import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import {
  buildRuntimeCapabilityReport,
  RuntimeCapabilityReportSchema,
  type GameDslArtifact,
  type LiveEditCapabilities,
  type RuntimeCapabilityReport
} from '../../../../packages/game-dsl/src/index.js';

const liveEditRegistryGenreDirByDslGenre: Partial<Record<GameDslArtifact['genre'], string>> = {
  top_down_shooter: 'shooter',
  side_scrolling_run_and_gun: 'side_scrolling_run_and_gun'
};

const emptyLiveEditCapabilities: LiveEditCapabilities = {
  hot: [],
  assetSwap: [],
  warmRestart: [],
  rebuildRequired: []
};

type GeneratedRuntimeCapabilitiesResolution =
  | { status: 'available'; capabilities: LiveEditCapabilities }
  | { status: 'not-applicable' | 'file-missing' | 'inventory-missing' | 'run-mismatch' };

export async function resolveLiveRuntimeCapabilityReport(input: {
  projectId: string;
  runId: string;
  gameDsl: GameDslArtifact;
  workspace: LocalWorkspaceService;
}): Promise<RuntimeCapabilityReport> {
  const dynamicReport = buildRuntimeCapabilityReport({ runId: input.runId, validatedDsl: input.gameDsl });
  const persistedReport = await readPersistedRuntimeCapabilityReport(input.workspace, input.projectId, input.runId);
  const generatedRuntimeCapabilities = await readGeneratedRuntimeLiveEditCapabilities(input);
  if (generatedRuntimeCapabilities.status === 'available') {
    return withLiveEditCapabilities(dynamicReport, intersectLiveEditCapabilities(dynamicReport.liveEditCapabilities, generatedRuntimeCapabilities.capabilities));
  }
  if (generatedRuntimeCapabilities.status === 'not-applicable') {
    return persistedReport ?? dynamicReport;
  }
  if (generatedRuntimeCapabilities.status === 'inventory-missing') {
    return persistedReport ?? withLiveEditCapabilities(dynamicReport, emptyLiveEditCapabilities);
  }

  return withLiveEditCapabilities(dynamicReport, emptyLiveEditCapabilities);
}

async function readPersistedRuntimeCapabilityReport(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string
): Promise<RuntimeCapabilityReport | undefined> {
  try {
    return RuntimeCapabilityReportSchema.parse(JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8')));
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) {
      return undefined;
    }
    throw error;
  }
}

async function readGeneratedRuntimeLiveEditCapabilities(input: {
  projectId: string;
  runId: string;
  gameDsl: GameDslArtifact;
  workspace: LocalWorkspaceService;
}): Promise<GeneratedRuntimeCapabilitiesResolution> {
  const genreDir = liveEditRegistryGenreDirByDslGenre[input.gameDsl.genre];
  if (genreDir === undefined) {
    return { status: 'not-applicable' };
  }

  try {
    const registry = JSON.parse(
      await readFile(join(input.workspace.getGeneratedProjectDir(input.projectId), genreDir, 'src', 'live-edit-registry.generated.json'), 'utf8')
    );
    if (!isRecord(registry) || registry.runId !== input.runId) {
      return { status: 'run-mismatch' };
    }
    const capabilities = parseLiveEditCapabilities(registry.liveEditCapabilities);
    return capabilities === undefined ? { status: 'inventory-missing' } : { status: 'available', capabilities };
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) {
      return { status: 'file-missing' };
    }
    throw error;
  }
}

function parseLiveEditCapabilities(value: unknown): LiveEditCapabilities | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const hot = parseStringArray(value.hot);
  const assetSwap = parseStringArray(value.assetSwap);
  const warmRestart = parseStringArray(value.warmRestart);
  const rebuildRequired = parseStringArray(value.rebuildRequired);
  if (hot === undefined || assetSwap === undefined || warmRestart === undefined || rebuildRequired === undefined) {
    return undefined;
  }

  return { hot, assetSwap, warmRestart, rebuildRequired };
}

function parseStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function intersectLiveEditCapabilities(left: LiveEditCapabilities, right: LiveEditCapabilities): LiveEditCapabilities {
  return {
    hot: intersectStrings(left.hot, right.hot),
    assetSwap: intersectStrings(left.assetSwap, right.assetSwap),
    warmRestart: intersectStrings(left.warmRestart, right.warmRestart),
    rebuildRequired: intersectStrings(left.rebuildRequired, right.rebuildRequired)
  };
}

function intersectStrings(left: string[], right: string[]): string[] {
  const allowed = new Set(right);
  return left.filter((item) => allowed.has(item));
}

function withLiveEditCapabilities(report: RuntimeCapabilityReport, liveEditCapabilities: LiveEditCapabilities): RuntimeCapabilityReport {
  return RuntimeCapabilityReportSchema.parse({ ...report, liveEditCapabilities });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}
