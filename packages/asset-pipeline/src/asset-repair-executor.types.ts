import type { AssetRepairPlan } from './asset-repair-plan.types.js';
import type { AssetManifest, AssetManifestAsset } from './schemas.js';
import type { AssetResolutionReport } from './resolution-report.js';

export type AssetRepairExecutionStatus = 'not_triggered' | 'no_action' | 'repaired' | 'failed';

export type AssetRepairExecutionInput = {
  projectDir: string;
  repairPlan: AssetRepairPlan;
  assetPacksDir?: string;
};

export type AssetRepairExecutionResult = {
  status: AssetRepairExecutionStatus;
  attempts: number;
  repairedRequirementIds: string[];
  blacklistedCandidates: AssetRepairBlacklistedCandidate[];
  manifest?: AssetManifest;
  report?: AssetResolutionReport;
};

export type AssetRepairBlacklistedCandidate = {
  packId: string;
  assetId: string;
  role: string;
  reason: string;
};

export type AssetRepairReportSection = {
  version: 'asset-repair-v0.1';
  planVersion: AssetRepairPlan['version'];
  status: AssetRepairExecutionStatus;
  attempts: number;
  maxAttempts: number;
  blacklistedCandidates: AssetRepairBlacklistedCandidate[];
  repairedRequirementIds: string[];
  items: AssetRepairReportItem[];
};

export type AssetRepairReportItem = {
  requirementId: string;
  role: string;
  action: AssetRepairPlan['items'][number]['action'];
  before?: AssetRepairReportAssetSnapshot;
  after?: AssetRepairReportAssetSnapshot;
  reason: string;
};

export type AssetRepairReportAssetSnapshot = {
  source?: AssetManifestAsset['source'];
  packId?: string;
  path?: string;
  semanticFitStatus?: string;
};
