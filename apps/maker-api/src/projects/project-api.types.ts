import type { JobEventRecord, ProjectRecord, ProjectStatus, RunRecord } from './project-state.types.js';
import type { QaReport } from '../qa/qa.types.js';
import type { DslRepairReport } from '../repair/dsl-repair.types.js';

export type GenerateProjectRequest = {
  idea: string;
  language: string;
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
