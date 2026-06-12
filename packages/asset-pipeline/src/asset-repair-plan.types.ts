import type { AssetResolutionReport } from './resolution-report.js';
import type { AssetManifest, AssetManifestAsset, AssetSemanticFit, AssetSemanticFitStatus } from './schemas.js';

export type AssetRepairPlanTrigger = 'none' | 'needs_asset_repair' | 'asset_semantic_failed' | 'hard_semantic_mismatch' | 'hard_semantic_unknown';
export type AssetRepairAction = 'blacklist_candidate_then_reresolve' | 'force_template_svg_fallback' | 'no_action';
export type AssetRepairStrictness = 'hard' | 'medium' | 'soft';

export type AssetRepairPlan = {
  version: 'asset-repair-plan-v0.1';
  projectId: string;
  createdAt: string;
  triggered: boolean;
  trigger: AssetRepairPlanTrigger;
  maxAttempts: number;
  items: AssetRepairPlanItem[];
  ignored: AssetRepairPlanIgnoredItem[];
};

export type AssetRepairPlanItem = {
  requirementId: string;
  role: string;
  assetId?: string;
  source?: string;
  packId?: string;
  expectedConcept?: string;
  semanticFitStatus?: string;
  strictness?: AssetRepairStrictness;
  actualTags?: string[];
  missingTags?: string[];
  conflictingTags?: string[];
  selectedPath?: string;
  semanticFitReason?: string;
  action: AssetRepairAction;
  reason: string;
};

export type AssetRepairPlanIgnoredItem = {
  requirementId?: string;
  role?: string;
  semanticFitStatus?: string;
  strictness?: AssetRepairStrictness;
  reason: string;
};

export type AssetRepairPlannerQaReport = {
  project_id?: string;
  overall_status?: 'PLAYABLE' | 'PLAYABLE_WITH_FALLBACK_ASSETS' | 'PLAYABLE_WITH_ART_WARNINGS' | 'NEEDS_ASSET_REPAIR' | 'QA_FAILED';
  asset_semantic_status?: 'PASSED' | 'WARNING' | 'FAILED';
  asset_report?: {
    semantic_status?: 'PASSED' | 'WARNING' | 'FAILED';
    assets?: Array<{
      id: string;
      role: string;
      source: AssetManifestAsset['source'];
      source_pack?: string;
      semantic_status?: 'PASSED' | 'WARNING' | 'FAILED';
      semantic_fit?: AssetSemanticFit;
    }>;
    semantic_issues?: Array<{
      severity: 'warning' | 'failure';
      asset_id: string;
      role: string;
      semantic_fit_status: AssetSemanticFitStatus;
      strictness?: AssetRepairStrictness;
      expected_concept?: string;
      reason: string;
    }>;
  };
};

export type BuildAssetRepairPlanInput = {
  qaReport: AssetRepairPlannerQaReport;
  manifest: AssetManifest;
  resolutionReport: AssetResolutionReport;
  createdAt?: string;
  maxAttempts?: number;
};
