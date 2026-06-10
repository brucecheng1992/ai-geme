import { isProjectStatus, isRunStepStatus, type JobEventRecord, type ProjectRecord, type RunRecord } from './project-state.types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function assertProjectRecord(value: unknown): asserts value is ProjectRecord {
  if (!isRecord(value)) {
    throw new Error('project.json is not an object');
  }

  for (const key of ['project_id', 'created_at', 'updated_at', 'idea', 'language', 'latest_run_id']) {
    if (!isString(value[key])) {
      throw new Error(`project.json is missing string field: ${key}`);
    }
  }

  if (!isProjectStatus(value.status)) {
    throw new Error('project.json has invalid status');
  }
}

export function assertRunRecord(value: unknown): asserts value is RunRecord {
  if (!isRecord(value)) {
    throw new Error('run.json is not an object');
  }

  for (const key of ['run_id', 'project_id', 'created_at', 'updated_at']) {
    if (!isString(value[key])) {
      throw new Error(`run.json is missing string field: ${key}`);
    }
  }

  if (!isProjectStatus(value.status)) {
    throw new Error('run.json has invalid status');
  }

  if (!Array.isArray(value.steps)) {
    throw new Error('run.json is missing steps array');
  }

  for (const step of value.steps) {
    if (!isRecord(step) || !isString(step.name) || !isRunStepStatus(step.status)) {
      throw new Error('run.json has invalid step record');
    }
  }
}

export function assertJobEventRecord(value: unknown): asserts value is JobEventRecord {
  if (!isRecord(value)) {
    throw new Error('events.jsonl line is not an object');
  }

  for (const key of ['timestamp', 'type', 'message']) {
    if (!isString(value[key])) {
      throw new Error(`events.jsonl line is missing string field: ${key}`);
    }
  }
}
