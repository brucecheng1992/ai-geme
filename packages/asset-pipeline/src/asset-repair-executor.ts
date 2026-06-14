import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AssetRepairPlan, AssetRepairPlanItem } from './asset-repair-plan.types.js';
import type {
  AssetRepairBlacklistedCandidate,
  AssetRepairExecutionInput,
  AssetRepairExecutionResult,
  AssetRepairExecutionStatus,
  AssetRepairReportItem,
  AssetRepairReportSection
} from './asset-repair-executor.types.js';
import { resolveLocalAssetPack } from './local-asset-pack-provider.js';
import { AssetResolutionReportSchema, buildAssetResolutionReport, buildTemplateSemanticFit, type AssetResolutionCandidate, type AssetResolutionReport } from './resolution-report.js';
import { AssetManifestSchema, AssetPlanSchema, summarizeManifestAssets, type AssetManifest, type AssetManifestAsset, type AssetPlan, type AssetPlanItem } from './schemas.js';
import { renderTemplateSvg } from './template-svg-provider.js';

type ExecutableRepairItem = AssetRepairPlanItem & { strictness: 'hard'; action: 'blacklist_candidate_then_reresolve' | 'force_template_svg_fallback' };

/**
 * Executes one explicit, project-local asset repair attempt.
 * It is intentionally not called by the generation pipeline; callers must opt in.
 */
export async function executeAssetRepairPlan(input: AssetRepairExecutionInput): Promise<AssetRepairExecutionResult> {
  if (!input.repairPlan.triggered) {
    return {
      status: 'not_triggered',
      attempts: 0,
      repairedRequirementIds: [],
      blacklistedCandidates: []
    };
  }

  const executableItems = input.repairPlan.items.filter(isExecutableHardRepairItem);
  const project = await readRepairProject(input.projectDir);
  assertRepairProjectIdentity(input.repairPlan, project);

  if (executableItems.length === 0) {
    const report = buildNoActionRepairReport(project.report, input.repairPlan);
    await writeJson(join(input.projectDir, 'asset_resolution_report.json'), report);
    return {
      status: 'no_action',
      attempts: 0,
      repairedRequirementIds: [],
      blacklistedCandidates: [],
      report
    };
  }

  const maxAttempts = Math.min(input.repairPlan.maxAttempts, 1);
  if (maxAttempts < 1) {
    return {
      status: 'failed',
      attempts: 0,
      repairedRequirementIds: [],
      blacklistedCandidates: []
    };
  }

  const assetsDir = join(input.projectDir, 'public', 'assets');
  await mkdir(assetsDir, { recursive: true });

  const blacklistedCandidates = buildBlacklistedCandidates(executableItems);
  const stagingAssetsDir = blacklistedCandidates.length === 0 ? undefined : await mkdtemp(join(tmpdir(), 'agm-asset-repair-'));

  try {
    const localResolution =
      blacklistedCandidates.length === 0 || stagingAssetsDir === undefined
        ? { candidates: [] as AssetResolutionCandidate[], selection: undefined }
        : await resolveLocalAssetPack({
            plan: project.plan,
            projectAssetsDir: stagingAssetsDir,
            packsDir: input.assetPacksDir,
            blacklist: { candidates: blacklistedCandidates },
            enableMixed: false
          });
    const replacementById = new Map(localResolution.selection?.manifestAssets.map((asset) => [asset.id, asset]) ?? []);
    const planById = new Map(project.plan.items.map((item) => [item.id, item]));
    const repairedIds = new Set(executableItems.map((item) => item.requirementId));
    const nextAssets: AssetManifestAsset[] = [];
    const reportItems: AssetRepairReportItem[] = [];

    for (const asset of project.manifest.assets) {
      if (!repairedIds.has(asset.id)) {
        nextAssets.push(asset);
        continue;
      }

      const repairItem = executableItems.find((item) => item.requirementId === asset.id);
      const planItem = planById.get(asset.id);
      if (repairItem === undefined || planItem === undefined) {
        nextAssets.push(asset);
        continue;
      }

      const replacement = repairItem.action === 'force_template_svg_fallback' ? undefined : replacementById.get(asset.id);
      const repairedAsset = replacement ?? (await writeTemplateFallbackAsset(planItem, assetsDir));
      if (replacement !== undefined && stagingAssetsDir !== undefined) {
        await copyFile(join(stagingAssetsDir, `${replacement.id}.svg`), join(assetsDir, `${replacement.id}.svg`));
      }

      nextAssets.push(repairedAsset);
      reportItems.push(buildRepairReportItem(repairItem, asset, repairedAsset));
    }

    const manifest = AssetManifestSchema.parse({
      version: 'asset-manifest-v0.1',
      projectId: project.plan.projectId,
      strict: true,
      assets: nextAssets,
      summary: summarizeManifestAssets(nextAssets)
    });
    const status: AssetRepairExecutionStatus = reportItems.length > 0 ? 'repaired' : 'no_action';
    const repairedRequirementIds = reportItems.map((item) => item.requirementId);
    const report = buildRepairedResolutionReport({
      plan: project.plan,
      manifest,
      candidates: mergeRepairCandidates(project.report.candidates, localResolution.candidates, blacklistedCandidates),
      repairPlan: input.repairPlan,
      status,
      blacklistedCandidates,
      repairedRequirementIds,
      reportItems
    });

    await writeJson(join(input.projectDir, 'asset_manifest.json'), manifest);
    await writeJson(join(input.projectDir, 'public', 'asset_manifest.json'), manifest);
    await writeJson(join(input.projectDir, 'asset_resolution_report.json'), report);

    return {
      status,
      attempts: 1,
      repairedRequirementIds,
      blacklistedCandidates,
      manifest,
      report
    };
  } finally {
    if (stagingAssetsDir !== undefined) {
      await rm(stagingAssetsDir, { recursive: true, force: true });
    }
  }
}

async function readRepairProject(projectDir: string): Promise<{ plan: AssetPlan; manifest: AssetManifest; report: AssetResolutionReport }> {
  const plan = AssetPlanSchema.parse(JSON.parse(await readFile(join(projectDir, 'asset_plan.json'), 'utf8')));
  const manifest = AssetManifestSchema.parse(JSON.parse(await readFile(join(projectDir, 'public', 'asset_manifest.json'), 'utf8')));
  const report = AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(projectDir, 'asset_resolution_report.json'), 'utf8')));
  return { plan, manifest, report };
}

function assertRepairProjectIdentity(repairPlan: AssetRepairPlan, project: { plan: AssetPlan; manifest: AssetManifest; report: AssetResolutionReport }): void {
  const artifacts = [
    { label: 'asset_plan.json', projectId: project.plan.projectId },
    { label: 'public/asset_manifest.json', projectId: project.manifest.projectId },
    { label: 'asset_resolution_report.json', projectId: project.report.projectId }
  ];
  const mismatch = artifacts.find((artifact) => artifact.projectId !== repairPlan.projectId);
  if (mismatch !== undefined) {
    throw new Error(
      `Asset repair project identity mismatch: repair plan ${repairPlan.projectId} does not match ${mismatch.label} ${mismatch.projectId}.`
    );
  }
}

async function writeTemplateFallbackAsset(planItem: AssetPlanItem, assetsDir: string): Promise<AssetManifestAsset> {
  await writeFile(join(assetsDir, `${planItem.id}.svg`), renderTemplateSvg(planItem), 'utf8');
  return {
    id: planItem.id,
    loadKey: `agm.${planItem.id}`,
    role: planItem.role,
    type: 'image',
    format: planItem.format,
    path: `assets/${planItem.id}.svg`,
    source: 'template_svg',
    required: planItem.required,
    status: 'ready',
    size: planItem.size,
    semanticFit: buildTemplateSemanticFit(planItem)
  };
}

function isExecutableHardRepairItem(item: AssetRepairPlanItem): item is ExecutableRepairItem {
  return item.strictness === 'hard' && (item.action === 'blacklist_candidate_then_reresolve' || item.action === 'force_template_svg_fallback');
}

function buildBlacklistedCandidates(items: ExecutableRepairItem[]): AssetRepairBlacklistedCandidate[] {
  return items.flatMap((item) => {
    if (item.action !== 'blacklist_candidate_then_reresolve' || item.packId === undefined) {
      return [];
    }

    return [
      {
        packId: item.packId,
        assetId: item.requirementId,
        role: item.role,
        reason: item.reason
      }
    ];
  });
}

function buildRepairReportItem(item: ExecutableRepairItem, before: AssetManifestAsset, after: AssetManifestAsset): AssetRepairReportItem {
  return {
    requirementId: item.requirementId,
    role: item.role,
    action: item.action,
    before: snapshotAsset(before),
    after: snapshotAsset(after),
    reason: item.reason
  };
}

function snapshotAsset(asset: AssetManifestAsset): NonNullable<AssetRepairReportItem['before']> {
  return {
    source: asset.source,
    packId: asset.sourcePack,
    path: asset.path,
    semanticFitStatus: asset.semanticFit?.status
  };
}

function buildRepairedResolutionReport(input: {
  plan: AssetPlan;
  manifest: AssetManifest;
  candidates: AssetResolutionCandidate[];
  repairPlan: AssetRepairPlan;
  status: AssetRepairExecutionStatus;
  blacklistedCandidates: AssetRepairBlacklistedCandidate[];
  repairedRequirementIds: string[];
  reportItems: AssetRepairReportItem[];
}): AssetResolutionReport {
  const report = buildAssetResolutionReport({
    plan: input.plan,
    manifest: input.manifest,
    candidates: input.candidates
  });
  return AssetResolutionReportSchema.parse({
    ...report,
    summary: buildRepairSummary(report, input.manifest),
    repair: {
      version: 'asset-repair-v0.1',
      planVersion: input.repairPlan.version,
      status: input.status,
      attempts: input.status === 'repaired' ? 1 : 0,
      maxAttempts: Math.min(input.repairPlan.maxAttempts, 1),
      blacklistedCandidates: input.blacklistedCandidates,
      repairedRequirementIds: input.repairedRequirementIds,
      items: input.reportItems
    } satisfies AssetRepairReportSection
  });
}

function buildNoActionRepairReport(report: AssetResolutionReport, repairPlan: AssetRepairPlan): AssetResolutionReport {
  return AssetResolutionReportSchema.parse({
    ...report,
    repair: buildRepairSection({
      repairPlan,
      status: 'no_action',
      blacklistedCandidates: [],
      repairedRequirementIds: [],
      reportItems: []
    })
  });
}

function buildRepairSummary(report: AssetResolutionReport, manifest: AssetManifest): AssetResolutionReport['summary'] {
  const fallbackUsed = manifest.assets.some((asset) => asset.source === 'template_svg');
  const localPackIds = [...new Set(manifest.assets.map((asset) => asset.sourcePack).filter((packId): packId is string => packId !== undefined))];
  if (!fallbackUsed && localPackIds.length === 1) {
    return report.summary;
  }

  return {
    selectedProvider: fallbackUsed ? 'template_svg' : report.summary.selectedProvider,
    selectedPackId: fallbackUsed || localPackIds.length !== 1 ? undefined : report.summary.selectedPackId,
    fallbackUsed,
    reason: 'Asset repair applied project-local semantic fixes; see repair section for per-asset actions.'
  };
}

function buildRepairSection(input: {
  repairPlan: AssetRepairPlan;
  status: AssetRepairExecutionStatus;
  blacklistedCandidates: AssetRepairBlacklistedCandidate[];
  repairedRequirementIds: string[];
  reportItems: AssetRepairReportItem[];
}): AssetRepairReportSection {
  return {
    version: 'asset-repair-v0.1',
    planVersion: input.repairPlan.version,
    status: input.status,
    attempts: input.status === 'repaired' ? 1 : 0,
    maxAttempts: Math.min(input.repairPlan.maxAttempts, 1),
    blacklistedCandidates: input.blacklistedCandidates,
    repairedRequirementIds: input.repairedRequirementIds,
    items: input.reportItems
  };
}

function mergeRepairCandidates(
  existing: AssetResolutionCandidate[],
  next: AssetResolutionCandidate[],
  blacklistedCandidates: AssetRepairBlacklistedCandidate[]
): AssetResolutionCandidate[] {
  const blacklistedPackIds = new Set(blacklistedCandidates.map((candidate) => candidate.packId));
  return mergeCandidates(
    existing.filter((candidate) => !(candidate.status === 'selected' && blacklistedPackIds.has(candidate.packId))),
    next
  );
}

function mergeCandidates(existing: AssetResolutionCandidate[], next: AssetResolutionCandidate[]): AssetResolutionCandidate[] {
  const byKey = new Map(existing.map((candidate) => [candidateKey(candidate), candidate]));
  for (const candidate of next) {
    byKey.set(candidateKey(candidate), candidate);
  }
  return [...byKey.values()];
}

function candidateKey(candidate: AssetResolutionCandidate): string {
  return `${candidate.packId}:${candidate.status}:${candidate.reason}`;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
