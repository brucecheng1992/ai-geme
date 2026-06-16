import { compareCodeUnits, isPlainRecord } from './reference-extractor-shared.js';
import { ResolverV2TraceEventSchema } from './trace-events.js';
import type { ResolverV2DiagnosticsViewModel } from './diagnostics-view-model-types.js';
import type { ResolverV2IrGateResult, ResolverV2Result } from './types.js';

export function readResolverResult(value: unknown, warnings: string[]): ResolverV2Result | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainRecord(value) || !Array.isArray(value.references) || !Array.isArray(value.diagnostics) || !isPlainRecord(value.summary)) {
    warnings.push('Invalid Resolver V2 resolver result input.');
    return undefined;
  }

  return value as ResolverV2Result;
}

export function readGateResult(value: unknown, warnings: string[]): ResolverV2IrGateResult | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainRecord(value) || !Array.isArray(value.blockers) || !Array.isArray(value.warnings) || !isPlainRecord(value.summary)) {
    warnings.push('Invalid Resolver V2 IR gate result input.');
    return undefined;
  }

  return value as ResolverV2IrGateResult;
}

export function readTraceEvents(
  value: readonly unknown[] | undefined,
  warnings: string[]
): ResolverV2DiagnosticsViewModel['traceEvents'] {
  if (value === undefined) {
    return [];
  }

  const events: ResolverV2DiagnosticsViewModel['traceEvents'] = [];
  for (const event of value) {
    const parsed = ResolverV2TraceEventSchema.safeParse(event);
    if (!parsed.success) {
      warnings.push('Invalid Resolver V2 trace event input.');
      continue;
    }

    events.push({
      id: parsed.data.id,
      type: parsed.data.type,
      at: parsed.data.at,
      severity: parsed.data.severity
    });
  }
  return events;
}

export function toDiagnosticRows(diagnostics: readonly unknown[]): ResolverV2DiagnosticsViewModel['diagnostics'] {
  return diagnostics.flatMap(toDiagnosticRow).sort(compareDiagnostics);
}

export function toBlockerRows(blockers: readonly unknown[]): ResolverV2DiagnosticsViewModel['blockers'] {
  return blockers.flatMap(toBlockerRow).sort(compareBlockers);
}

export function toReferenceRows(references: readonly unknown[]): ResolverV2DiagnosticsViewModel['references'] {
  return references.flatMap(toReferenceRow).sort(compareReferences);
}

export function readAssetRows(value: unknown): ResolverV2DiagnosticsViewModel['assets'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((asset) => {
      if (!isPlainRecord(asset)) {
        return [];
      }

      const id = stringField(asset, 'id');
      const key = stringField(asset, 'key');
      const path = stringField(asset, 'path');
      const kind = stringField(asset, 'kind');
      const sourceKind = stringField(asset, 'sourceKind');
      if (id === undefined || key === undefined || path === undefined || kind === undefined || sourceKind === undefined) {
        return [];
      }

      return [{ id, key, path, kind, sourceKind }];
    })
    .sort(compareAssets);
}

function toDiagnosticRow(diagnostic: unknown): ResolverV2DiagnosticsViewModel['diagnostics'] {
  if (!isPlainRecord(diagnostic)) {
    return [];
  }

  const severity = stringField(diagnostic, 'severity');
  const code = stringField(diagnostic, 'code');
  const message = stringField(diagnostic, 'message');
  if (severity === undefined || code === undefined || message === undefined) {
    return [];
  }

  return [{
    severity,
    code,
    message,
    ...optionalStringField(diagnostic, 'referenceId'),
    ...optionalStringField(diagnostic, 'sourcePath'),
    ...optionalStringField(diagnostic, 'fieldPath'),
    ...optionalStringField(diagnostic, 'targetId'),
    ...optionalStringField(diagnostic, 'expectedTargetKind'),
    ...optionalStringField(diagnostic, 'actualTargetKind')
  }];
}

function toBlockerRow(blocker: unknown): ResolverV2DiagnosticsViewModel['blockers'] {
  if (!isPlainRecord(blocker)) {
    return [];
  }

  const code = stringField(blocker, 'code');
  const message = stringField(blocker, 'message');
  if (code === undefined || message === undefined) {
    return [];
  }

  return [{
    code,
    message,
    ...optionalStringField(blocker, 'diagnosticCode'),
    ...optionalStringField(blocker, 'referenceId'),
    ...optionalStringField(blocker, 'sourcePath'),
    ...optionalStringField(blocker, 'fieldPath'),
    ...optionalStringField(blocker, 'targetId'),
    ...optionalStringField(blocker, 'nodeId')
  }];
}

function toReferenceRow(reference: unknown): ResolverV2DiagnosticsViewModel['references'] {
  if (!isPlainRecord(reference)) {
    return [];
  }

  const id = stringField(reference, 'id');
  const kind = stringField(reference, 'kind');
  const status = stringField(reference, 'status');
  const sourcePath = stringField(reference, 'sourcePath');
  const fieldPath = stringField(reference, 'fieldPath');
  const targetId = stringField(reference, 'targetId');
  if (id === undefined || kind === undefined || status === undefined || sourcePath === undefined || fieldPath === undefined || targetId === undefined) {
    return [];
  }

  return [{ id, kind, status, sourcePath, fieldPath, targetId }];
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function optionalStringField(record: Record<string, unknown>, key: string): Record<string, string> {
  const value = stringField(record, key);
  return value === undefined ? {} : { [key]: value };
}

function compareDiagnostics(
  left: ResolverV2DiagnosticsViewModel['diagnostics'][number],
  right: ResolverV2DiagnosticsViewModel['diagnostics'][number]
): number {
  return (
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.referenceId ?? '', right.referenceId ?? '') ||
    compareCodeUnits(left.sourcePath ?? '', right.sourcePath ?? '') ||
    compareCodeUnits(left.fieldPath ?? '', right.fieldPath ?? '') ||
    compareCodeUnits(left.targetId ?? '', right.targetId ?? '') ||
    compareCodeUnits(left.message, right.message)
  );
}

function compareBlockers(
  left: ResolverV2DiagnosticsViewModel['blockers'][number],
  right: ResolverV2DiagnosticsViewModel['blockers'][number]
): number {
  return (
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.diagnosticCode ?? '', right.diagnosticCode ?? '') ||
    compareCodeUnits(left.referenceId ?? '', right.referenceId ?? '') ||
    compareCodeUnits(left.sourcePath ?? '', right.sourcePath ?? '') ||
    compareCodeUnits(left.fieldPath ?? '', right.fieldPath ?? '') ||
    compareCodeUnits(left.targetId ?? '', right.targetId ?? '') ||
    compareCodeUnits(left.nodeId ?? '', right.nodeId ?? '') ||
    compareCodeUnits(left.message, right.message)
  );
}

function compareReferences(
  left: ResolverV2DiagnosticsViewModel['references'][number],
  right: ResolverV2DiagnosticsViewModel['references'][number]
): number {
  return (
    compareCodeUnits(left.kind, right.kind) ||
    compareCodeUnits(left.sourcePath, right.sourcePath) ||
    compareCodeUnits(left.fieldPath, right.fieldPath) ||
    compareCodeUnits(left.targetId, right.targetId) ||
    compareCodeUnits(left.id, right.id)
  );
}

function compareAssets(
  left: ResolverV2DiagnosticsViewModel['assets'][number],
  right: ResolverV2DiagnosticsViewModel['assets'][number]
): number {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.id, right.id);
}
