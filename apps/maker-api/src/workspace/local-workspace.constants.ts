export const LOCAL_DATA_DIR = 'local-data';
export const GENERATED_PROJECTS_DIR = 'generated-projects';

export const LOCAL_DATA_SUBDIRS = {
  projects: 'projects',
  runs: 'runs',
  qaReports: 'qa-reports',
  telemetry: 'telemetry',
  modelOutputs: 'model-outputs',
  buildLogs: 'build-logs',
  repairReports: 'repair-reports'
} as const;
