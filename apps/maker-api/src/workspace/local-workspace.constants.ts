export const LOCAL_DATA_DIR = 'data/local-data';
export const GENERATED_PROJECTS_DIR = 'data/generated-projects';

export const LOCAL_DATA_SUBDIRS = {
  projects: 'projects',
  runs: 'runs',
  qaReports: 'qa-reports',
  telemetry: 'telemetry',
  result: 'result',
  modelOutputs: 'model-outputs',
  buildLogs: 'build-logs',
  repairReports: 'repair-reports'
} as const;
