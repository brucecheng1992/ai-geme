import type { JobEventRecord, ProjectRecord, ProjectStatus, RunRecord } from './project-state.types.js';
import type { QaReport } from '../qa/qa.types.js';
import type { DslRepairReport } from '../repair/dsl-repair.types.js';
import type { GameDslArtifact, LiveEditCapabilities, LiveUpdatePlan, PatchValidationReport, RuntimeApplyReport, RuntimeCapabilityReport } from '../../../../packages/game-dsl/src/index.js';
import type { EditAuditRecord, LiveVersionRecord, PatchHistoryRecord } from './dsl-live-edit.service.js';
import type { PipelineArtifactIndex } from './pipeline-artifact-index.js';
import type { PipelineAcceptanceReport } from './pipeline-acceptance-report.js';
import type { PromptOptimizationArtifactRef, PromptOptimizationReport } from './prompt-coach.contract.js';

export type GenerateProjectRequest = {
  idea: string;
  language: string;
  promptOptimizationProjectId?: string;
  promptOptimizationId?: string;
};

export type GenerateProjectResponse = {
  ok: true;
  project_id: string;
  run_id: string;
  status: ProjectStatus;
};

export type ProjectStatusResponse = {
  ok: true;
  project: ProjectRecord;
  latest_run: RunRecord;
};

export type RunEventsResponse = {
  ok: true;
  events: JobEventRecord[];
};

export type QaReportResponse = {
  ok: true;
  qa_report: QaReport;
};

export type RepairReportResponse = {
  ok: true;
  repair_report: DslRepairReport;
};

export type BuildLogResponse = {
  ok: true;
  build_log: string;
};

export type PipelineArtifactsResponse = {
  ok: true;
  pipeline_artifact_index: PipelineArtifactIndex;
};

export type PipelineAcceptanceResponse = {
  ok: true;
  pipeline_acceptance_report: PipelineAcceptanceReport;
};

export type PreparePromptOptimizationRequest = {
  originalPrompt?: string;
  runId?: string;
  mode?: 'mock' | 'llm';
};

export type PreparePromptOptimizationResponse = {
  ok: true;
  report: PromptOptimizationReport;
  artifacts: PromptOptimizationArtifactRef[];
};

export type PrepareDeterministicPatchResponse = {
  ok: true;
  patch_id: string;
  status: LiveUpdatePlan['status'];
  apply_mode: LiveUpdatePlan['applyMode'];
  runtime_patch?: NonNullable<LiveUpdatePlan['runtimePatch']>;
  validation_report: PatchValidationReport;
  live_update_plan: LiveUpdatePlan;
  live_update_plan_ref: RuntimeApplyReport['liveUpdatePlanRef'];
  artifact_refs: Record<string, string>;
};

export type LiveCurrentResponse = {
  ok: true;
  current_version: LiveVersionRecord;
  game_dsl: GameDslArtifact;
  runtime_capability_report: RuntimeCapabilityReport;
  live_edit_capabilities: LiveEditCapabilities;
  patch_history: PatchHistoryRecord[];
  edit_audit_log: EditAuditRecord[];
};

export type PrepareLiveEditRequest = {
  intent?: string;
  op?: 'replace';
  path?: string;
  value?: unknown;
};

export type RuntimeApplyResultResponse = {
  ok: true;
  patch_id: string;
  status: RuntimeApplyReport['status'];
  apply_mode: RuntimeApplyReport['applyMode'];
  version_id?: string;
  runtime_apply_report: RuntimeApplyReport;
};
