import type {
  SemanticPatchDiffApplySummary,
  SemanticPatchDiffValidationSummary,
  SemanticPatchDiffViewModel
} from '@ai-game-maker/game-dsl';

import { SemanticPatchDiffOperationList } from './SemanticPatchDiffOperationList.js';

export type SemanticPatchDiffPanelProps = {
  viewModel: SemanticPatchDiffViewModel;
  title?: string;
  compact?: boolean;
};

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const sectionHeadingClass = 'm-0 text-[12px] font-black uppercase text-[#6f6558]';
const metadataLabelClass = 'text-[11px] font-black uppercase text-[#6f6558]';
const metadataValueClass = 'text-xs font-bold text-[#15130f] [overflow-wrap:anywhere]';

export function SemanticPatchDiffPanel({
  viewModel,
  title = 'Semantic Patch Diff',
  compact = false
}: SemanticPatchDiffPanelProps) {
  return (
    <article className={`${panelClass} ${compact ? 'grid gap-3' : 'grid gap-4'}`} aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className={eyebrowClass}>Semantic Editing</p>
          <h2 className={headingClass}>{title}</h2>
        </div>
        <span className={statusClass(viewModel.patch.valid ? 'valid' : 'invalid')}>
          {viewModel.patch.valid ? 'valid patch' : 'invalid patch'}
        </span>
      </header>

      <section className="grid gap-2" aria-labelledby="semantic-patch-diff-metadata">
        <h3 className={sectionHeadingClass} id="semantic-patch-diff-metadata">
          Patch Metadata
        </h3>
        <dl className="m-0 grid gap-2 md:grid-cols-2">
          {renderMetadataItem('Patch ID', viewModel.patch.id)}
          {renderMetadataItem('Intent ID', viewModel.patch.intentId)}
          {renderMetadataItem('Target', viewModel.patch.target)}
          {renderMetadataItem('Status', viewModel.patch.status)}
          {renderMetadataItem('Before Hash', viewModel.patch.beforeHash)}
          {renderMetadataItem('After Hash', viewModel.patch.afterHash)}
          {renderMetadataItem('Operations', String(viewModel.patch.operationCount))}
        </dl>
      </section>

      {renderValidation(viewModel.validation)}
      <SemanticPatchDiffOperationList operations={viewModel.operations} />
      {renderApplySummary('Apply Summary', viewModel.apply)}
      {renderApplySummary('Rollback Summary', viewModel.rollback)}
      {renderTrace(viewModel.trace)}
      {renderWarnings(viewModel.warnings)}
    </article>
  );
}

function renderMetadataItem(label: string, value: string | undefined) {
  return (
    <div className="min-w-0 rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3" key={label}>
      <dt className={metadataLabelClass}>{label}</dt>
      <dd className={`m-0 mt-1 ${metadataValueClass}`}>{value ?? 'none'}</dd>
    </div>
  );
}

function renderValidation(validation: SemanticPatchDiffValidationSummary | undefined) {
  if (validation === undefined) {
    return null;
  }

  return (
    <section className="grid gap-2" aria-labelledby="semantic-patch-diff-validation">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={sectionHeadingClass} id="semantic-patch-diff-validation">
          Validation
        </h3>
        <span className={statusClass(validation.ok ? 'valid' : 'invalid')}>{validation.ok ? 'validation ok' : 'validation failed'}</span>
        <span className="text-xs font-bold text-[#69645d]">
          {validation.errorCount} errors / {validation.warningCount} warnings
        </span>
      </div>
      {renderIssueList('Errors', validation.errors)}
      {renderIssueList('Warnings', validation.warnings)}
    </section>
  );
}

function renderIssueList(title: string, issues: SemanticPatchDiffValidationSummary['errors']) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-1">
      <h4 className="m-0 text-[11px] font-black uppercase text-[#6f6558]">{title}</h4>
      <ul className="m-0 grid list-none gap-2 p-0">
        {issues.map((issue, index) => (
          <li className="rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d]" key={`${issue.code}:${index}`}>
            <span className="font-black text-[#15130f]">{issue.code}</span>
            {issue.guardId ? <span> · Guard: {issue.guardId}</span> : null}
            {issue.path ? <span> · Path: {issue.path}</span> : null}
            {issue.operationIndex === undefined ? null : <span> · Operation: {issue.operationIndex}</span>}
            {issue.target ? <span> · Target: {issue.target}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderApplySummary(title: string, summary: SemanticPatchDiffApplySummary | undefined) {
  if (summary === undefined) {
    return null;
  }

  return (
    <section className="grid gap-2" aria-label={title}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={sectionHeadingClass}>{title}</h3>
        <span className={statusClass(summary.ok ? 'valid' : 'invalid')}>{summary.ok ? 'ok' : 'failed'}</span>
      </div>
      <dl className="m-0 grid gap-2 md:grid-cols-2">
        {renderMetadataItem('Before Hash', summary.beforeHash)}
        {renderMetadataItem('After Hash', summary.afterHash)}
        {renderMetadataItem('Applied Patch ID', summary.appliedPatchId)}
        {renderMetadataItem('Rollback Patch ID', summary.rollbackPatchId)}
        {renderMetadataItem('Error Code', summary.errorCode)}
        {renderMetadataItem('Error Path', summary.errorPath)}
        {renderMetadataItem('Operation Index', summary.operationIndex === undefined ? undefined : String(summary.operationIndex))}
      </dl>
    </section>
  );
}

function renderTrace(trace: SemanticPatchDiffViewModel['trace']) {
  if (trace === undefined || trace.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-2" aria-labelledby="semantic-patch-diff-trace">
      <h3 className={sectionHeadingClass} id="semantic-patch-diff-trace">
        Trace Summary
      </h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {trace.map((event) => (
          <li className="rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d]" key={event.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={statusClass(event.severity)}>{event.severity}</span>
              <span className="font-black text-[#15130f]">{event.type}</span>
              <span>{event.at}</span>
            </div>
            <div className="mt-1 [overflow-wrap:anywhere]">
              Intent: {event.intentId ?? 'none'} · Patch: {event.patchId ?? 'none'} · Target: {event.target ?? 'none'} · Kind:{' '}
              {event.kind ?? 'none'}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function renderWarnings(warnings: string[]) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-2" aria-labelledby="semantic-patch-diff-warnings">
      <h3 className={sectionHeadingClass} id="semantic-patch-diff-warnings">
        Warnings
      </h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {warnings.map((warning, index) => (
          <li className="rounded-lg border border-[#f2ca83] bg-[#fff1d6] p-3 text-xs font-bold text-[#8a5b13] [overflow-wrap:anywhere]" key={`${warning}:${index}`}>
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusClass(status: string): string {
  if (status === 'valid' || status === 'ok' || status === 'info' || status === 'set' || status === 'add' || status === 'replace') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 text-xs font-black text-[#208a4d]';
  }

  if (status === 'invalid' || status === 'failed' || status === 'error' || status === 'remove') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 text-xs font-black text-[#c93d35]';
  }

  return 'rounded-full border border-[#f2ca83] bg-[#fff1d6] px-2 py-0.5 text-xs font-black text-[#8a5b13]';
}
