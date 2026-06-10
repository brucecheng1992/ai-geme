export const API_BASE = 'http://localhost:3000';

export type ProjectStatus = {
  ok: true;
  project: {
    project_id: string;
    idea: string;
    language: string;
    status: string;
    latest_run_id: string;
    title?: string;
    genre?: string;
    preview_url?: string;
  };
  latest_run: {
    run_id: string;
    status: string;
    steps: Array<{ name: string; status: string }>;
  };
};

export type RunEvents = { ok: true; events: Array<{ timestamp: string; type: string; message: string }> };
export type QaReport = {
  status?: string;
  visual_status?: string;
  observed_events?: string[];
  missing_events?: string[];
  missing_any_groups?: string[][];
  console_errors?: string[];
  code?: string;
};
export type RepairReport = { status?: string; message?: string; attempts?: Array<{ attempt: number; reason: string }> };

export type DashboardData = {
  project?: ProjectStatus;
  events: RunEvents['events'];
  qaReport?: QaReport;
  repairReport?: RepairReport;
  buildLog?: string;
};

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function optionalJson<T>(url: string): Promise<T | undefined> {
  try {
    return await requestJson<T>(url);
  } catch {
    return undefined;
  }
}

export function countEvents(events: string[]): Array<[string, number]> {
  return [...events.reduce((counts, event) => counts.set(event, (counts.get(event) ?? 0) + 1), new Map<string, number>())];
}

export function fallbackSteps(status: string | undefined): Array<{ name: string; status: string }> {
  return [{ name: 'Run', status: status ?? 'PENDING' }];
}

export function shouldLoadBuildLog(status: string | undefined): boolean {
  return hasReached(status, ['BUILDING', 'BUILD_FAILED', 'PREVIEW_ARTIFACT_MISSING', 'PREVIEW_READY', 'QA_RUNNING', 'QA_FAILED', 'PLAYABLE']);
}

export function shouldLoadQaReport(status: string | undefined): boolean {
  return hasReached(status, ['QA_RUNNING', 'QA_FAILED', 'PLAYABLE']);
}

export function shouldLoadRepairReport(status: string | undefined): boolean {
  return hasReached(status, ['REPAIR_REQUIRED', 'REPAIR_RUNNING', 'REPAIR_FAILED']);
}

function hasReached(status: string | undefined, candidates: string[]): boolean {
  return status !== undefined && candidates.includes(status);
}
