import type {
  AssetRepairAction,
  AssetRepairPlan,
  AssetRepairPlanIgnoredItem,
  AssetRepairPlanItem,
  AssetRepairPlannerQaReport,
  AssetRepairPlanTrigger,
  AssetRepairStrictness,
  BuildAssetRepairPlanInput
} from './asset-repair-plan.types.js';
import type { AssetManifestAsset, AssetSemanticFitStatus } from './schemas.js';

type RepairCandidate = {
  requirementId: string;
  role: string;
  assetId?: string;
  source?: AssetManifestAsset['source'];
  packId?: string;
  expectedConcept?: string;
  semanticFitStatus?: AssetSemanticFitStatus;
  strictness?: AssetRepairStrictness;
  actualTags?: string[];
  missingTags?: string[];
  conflictingTags?: string[];
  selectedPath?: string;
  reason?: string;
};

/**
 * Builds an audit-only repair plan from existing QA and asset artifacts.
 * Step 6a deliberately does not mutate manifests, blacklist packs, or rerun resolution.
 */
export function buildAssetRepairPlan(input: BuildAssetRepairPlanInput): AssetRepairPlan {
  const candidates = collectRepairCandidates(input);
  const actionable = candidates.filter(shouldRepairCandidate);
  const ignored = candidates.filter(shouldIgnoreCandidate).map(toIgnoredItem);
  const trigger = resolveRepairTrigger(input.qaReport, actionable);
  const items = actionable.map(toRepairItem);

  return {
    version: 'asset-repair-plan-v0.1',
    projectId: input.qaReport.project_id ?? input.manifest.projectId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    triggered: trigger !== 'none',
    trigger,
    maxAttempts: input.maxAttempts ?? 1,
    items: items.length > 0 ? items : buildStatusOnlyItems(trigger),
    ignored
  };
}

function collectRepairCandidates(input: BuildAssetRepairPlanInput): RepairCandidate[] {
  const manifestById = new Map(input.manifest.assets.map((asset) => [asset.id, asset]));
  const reportById = new Map(input.resolutionReport.assets.map((asset) => [asset.id, asset]));
  const qaAssetById = new Map((input.qaReport.asset_report?.assets ?? []).map((asset) => [asset.id, asset]));
  const qaIssueById = new Map((input.qaReport.asset_report?.semantic_issues ?? []).map((issue) => [issue.asset_id, issue]));
  const ids = [...new Set([...manifestById.keys(), ...reportById.keys(), ...qaAssetById.keys(), ...qaIssueById.keys()])];

  return ids.map((id) => {
    const manifestAsset = manifestById.get(id);
    const reportAsset = reportById.get(id);
    const qaAsset = qaAssetById.get(id);
    const qaIssue = qaIssueById.get(id);
    const fit = manifestAsset?.semanticFit ?? reportAsset?.semanticFit ?? qaAsset?.semantic_fit;
    const expectedSemantic = reportAsset?.expectedSemantic;
    const strictness = fit?.strictness ?? expectedSemantic?.strictness ?? qaIssue?.strictness;
    const semanticFitStatus = fit?.status ?? qaIssue?.semantic_fit_status;

    return {
      requirementId: id,
      role: manifestAsset?.role ?? reportAsset?.role ?? qaAsset?.role ?? qaIssue?.role ?? 'unknown',
      assetId: manifestAsset?.id ?? reportAsset?.id ?? qaAsset?.id,
      source: manifestAsset?.source ?? reportAsset?.selected.source ?? qaAsset?.source,
      packId: manifestAsset?.sourcePack ?? reportAsset?.selected.sourcePack ?? qaAsset?.source_pack,
      expectedConcept: fit?.expectedConcept ?? expectedSemantic?.expectedConcept ?? qaIssue?.expected_concept,
      semanticFitStatus,
      strictness,
      actualTags: fit?.actualTags,
      missingTags: fit?.missingTags,
      conflictingTags: fit?.conflictingTags,
      selectedPath: reportAsset?.selected.path ?? manifestAsset?.path,
      reason: fit?.reason ?? qaIssue?.reason
    };
  });
}

function shouldRepairCandidate(candidate: RepairCandidate): boolean {
  if (candidate.strictness !== 'hard') {
    return false;
  }

  return candidate.semanticFitStatus === 'mismatch' || candidate.semanticFitStatus === 'unknown' || candidate.semanticFitStatus === undefined;
}

function shouldIgnoreCandidate(candidate: RepairCandidate): boolean {
  if (candidate.semanticFitStatus === 'fallback_generated') {
    return true;
  }

  if (candidate.semanticFitStatus !== 'mismatch' && candidate.semanticFitStatus !== 'unknown') {
    return false;
  }

  return candidate.strictness === 'medium' || candidate.strictness === 'soft';
}

function resolveRepairTrigger(qaReport: AssetRepairPlannerQaReport, actionable: RepairCandidate[]): AssetRepairPlanTrigger {
  if (actionable.some((candidate) => candidate.semanticFitStatus === 'mismatch')) {
    return 'hard_semantic_mismatch';
  }

  if (actionable.some((candidate) => candidate.semanticFitStatus === 'unknown' || candidate.semanticFitStatus === undefined)) {
    return 'hard_semantic_unknown';
  }

  if (qaReport.asset_semantic_status === 'FAILED' || qaReport.asset_report?.semantic_status === 'FAILED') {
    return 'asset_semantic_failed';
  }

  if (qaReport.overall_status === 'NEEDS_ASSET_REPAIR') {
    return 'needs_asset_repair';
  }

  return 'none';
}

function toRepairItem(candidate: RepairCandidate): AssetRepairPlanItem {
  const action: AssetRepairAction =
    candidate.source === 'local_asset_pack' && candidate.packId !== undefined ? 'blacklist_candidate_then_reresolve' : 'force_template_svg_fallback';
  return omitUndefined({
    requirementId: candidate.requirementId,
    role: candidate.role,
    assetId: candidate.assetId,
    source: candidate.source,
    packId: candidate.packId,
    expectedConcept: candidate.expectedConcept,
    semanticFitStatus: candidate.semanticFitStatus,
    strictness: candidate.strictness,
    actualTags: candidate.actualTags,
    missingTags: candidate.missingTags,
    conflictingTags: candidate.conflictingTags,
    selectedPath: candidate.selectedPath,
    semanticFitReason: candidate.reason,
    action,
    reason: buildRepairReason(candidate, action)
  });
}

function buildStatusOnlyItems(trigger: AssetRepairPlanTrigger): AssetRepairPlanItem[] {
  if (trigger !== 'asset_semantic_failed' && trigger !== 'needs_asset_repair') {
    return [];
  }

  return [
    {
      requirementId: 'qa_status',
      role: 'asset_report',
      action: 'no_action',
      reason: 'QA status requested asset repair, but no hard semantic asset evidence was found in the manifest or resolution report.'
    }
  ];
}

function toIgnoredItem(candidate: RepairCandidate): AssetRepairPlanIgnoredItem {
  return omitUndefined({
    requirementId: candidate.requirementId,
    role: candidate.role,
    semanticFitStatus: candidate.semanticFitStatus,
    strictness: candidate.strictness,
    reason:
      candidate.semanticFitStatus === 'fallback_generated'
        ? 'fallback_generated is a semantic-safe deterministic fallback and does not require repair.'
        : `${candidate.strictness ?? 'non-hard'} ${candidate.semanticFitStatus ?? 'missing'} semantic fit is not a hard repair trigger.`
  });
}

function buildRepairReason(candidate: RepairCandidate, action: AssetRepairAction): string {
  const status = candidate.semanticFitStatus ?? 'missing';
  const concept = candidate.expectedConcept === undefined ? 'the hard requirement' : `expected ${candidate.expectedConcept}`;
  const base = `Hard semantic ${status} for ${concept}.`;

  if (action === 'blacklist_candidate_then_reresolve') {
    return `${base} Selected local pack ${candidate.packId} should be blacklisted before rerunning resolution.`;
  }

  return `${base} No selected local pack can be blacklisted, so force deterministic template SVG fallback.`;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
}
