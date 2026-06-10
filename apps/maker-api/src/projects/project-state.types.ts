export const PROJECT_STATUSES = [
  'CREATED',
  'BRIEF_GENERATING',
  'BRIEF_GENERATED',
  'DSL_GENERATING',
  'DSL_GENERATED',
  'DSL_VALIDATING',
  'DSL_VALIDATED',
  'DSL_VALIDATION_FAILED',
  'IR_NORMALIZING',
  'IR_NORMALIZED',
  'RUNTIME_CHECKING',
  'RUNTIME_SUPPORTED',
  'RUNTIME_UNSUPPORTED',
  'COMPILING',
  'COMPILED',
  'BUILDING',
  'BUILD_FAILED',
  'PREVIEW_ARTIFACT_MISSING',
  'PREVIEW_READY',
  'QA_RUNNING',
  'QA_FAILED',
  'REPAIR_REQUIRED',
  'REPAIR_RUNNING',
  'REPAIR_FAILED',
  'PLAYABLE',
  'FAILED'
] as const;

export const RUN_STEP_STATUSES = ['PENDING', 'RUNNING', 'DONE', 'FAILED'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type RunStepStatus = (typeof RUN_STEP_STATUSES)[number];

export type ProjectRecord = {
  project_id: string;
  created_at: string;
  updated_at: string;
  idea: string;
  language: string;
  status: ProjectStatus;
  latest_run_id: string;
  title?: string;
  genre?: string;
  preview_url?: string;
};

export type RunStepRecord = {
  name: string;
  status: RunStepStatus;
};

export type RunRecord = {
  run_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  status: ProjectStatus;
  steps: RunStepRecord[];
};

export type JobEventRecord = {
  timestamp: string;
  type: string;
  message: string;
};

export type CreateProjectInput = {
  projectId: string;
  runId: string;
  idea: string;
  language: string;
  createdAt?: string;
};

export type CreateRunInput = {
  projectId: string;
  runId: string;
  createdAt?: string;
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && PROJECT_STATUSES.includes(value as ProjectStatus);
}

export function isRunStepStatus(value: unknown): value is RunStepStatus {
  return typeof value === 'string' && RUN_STEP_STATUSES.includes(value as RunStepStatus);
}
