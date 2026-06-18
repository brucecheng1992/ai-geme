import { sanitizeWorkbenchText } from './workbench-display-safety.js';
import { getWorkbenchStatusTone, type AssetSemanticStatus, type QaReport, type RuntimeStatus, type WorkbenchStatusTone } from './workbench-api.js';

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';

type QaStatusPanelProps = {
  report?: QaReport;
};

export function QaStatusPanel({ report }: QaStatusPanelProps) {
  const runtimeStatus = runtimeStatusLabel(report);
  const assetSemanticStatus = assetSemanticStatusLabel(report);
  const renderFidelity = report?.render_fidelity;
  const overallStatus = report?.overall_status ?? report?.status ?? 'No report';
  const missingLabel = (report?.missing_events ?? []).join(', ') || 'none';

  return (
    <article className={panelClass}>
      <div className={panelHeadingClass}>
        <div>
          <p className={eyebrowClass}>Quality</p>
          <h2 className={headingClass}>QA</h2>
        </div>
      </div>
      <div className="mb-3 grid gap-2">
        <StatusLine label="Overall" value={overallStatus} tone={getWorkbenchStatusTone(overallStatus)} />
        <StatusLine label="Runtime" value={runtimeStatus} tone={runtimeTone(runtimeStatus)} />
        <StatusLine label="Asset semantic" value={assetSemanticStatus} tone={assetSemanticTone(assetSemanticStatus)} />
        {renderFidelity === undefined ? null : (
          <StatusLine label="Render fidelity" value={sanitizeWorkbenchText(renderFidelity.status)} tone={renderFidelityTone(renderFidelity.status)} />
        )}
      </div>
      {renderFidelity === undefined ? null : <RenderFidelityEvidence report={renderFidelity} />}
      <p className="m-0 mb-1 text-sm leading-snug text-[#69645d]">{report?.code ?? 'No failure code'}</p>
      <p className="m-0 text-sm leading-snug text-[#69645d]">Missing: {missingLabel}</p>
    </article>
  );
}

function RenderFidelityEvidence({ report }: { report: NonNullable<QaReport['render_fidelity']> }) {
  const expected = report.expected.map(sanitizeWorkbenchText).join(' ');
  const observed = report.observed.map(sanitizeWorkbenchText).join(' ');
  const missing = report.missing.map(sanitizeWorkbenchText).join(' ') || 'none';

  return (
    <div className="mb-3 grid gap-1 rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold leading-snug text-[#69645d]">
      <p className="m-0 text-[#15130f] [overflow-wrap:anywhere]">{sanitizeWorkbenchText(report.reason)}</p>
      <p className="m-0 [overflow-wrap:anywhere]">Expected: {expected}</p>
      <p className="m-0 [overflow-wrap:anywhere]">Observed: {observed}</p>
      <p className="m-0 [overflow-wrap:anywhere]">Missing: {missing}</p>
    </div>
  );
}

function StatusLine({ label, value, tone }: { label: string; value: string; tone: WorkbenchStatusTone }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-2 text-sm font-bold text-[#302b24]">
      <span className="text-[11px] font-extrabold uppercase text-[#69645d]">{label}</span>
      <span className={`min-w-0 rounded-full border px-2.5 py-1 text-xs font-extrabold [overflow-wrap:anywhere] ${statusClass(tone)}`}>{value}</span>
    </div>
  );
}

function runtimeStatusLabel(report: QaReport | undefined): RuntimeStatus | 'No report' {
  if (report?.runtime_status !== undefined) {
    return report.runtime_status;
  }

  if (report?.status === 'PASSED') {
    return 'PASSED';
  }

  if (report?.status === 'QA_FAILED') {
    return 'FAILED';
  }

  return 'No report';
}

function assetSemanticStatusLabel(report: QaReport | undefined): AssetSemanticStatus | 'No report' {
  return report?.asset_semantic_status ?? report?.asset_report?.semantic_status ?? 'No report';
}

function runtimeTone(status: RuntimeStatus | 'No report'): 'neutral' | 'good' | 'bad' {
  if (status === 'PASSED') {
    return 'good';
  }

  if (status === 'FAILED') {
    return 'bad';
  }

  return 'neutral';
}

function assetSemanticTone(status: AssetSemanticStatus | 'No report'): 'neutral' | 'good' | 'warn' | 'bad' {
  if (status === 'PASSED') {
    return 'good';
  }

  if (status === 'WARNING') {
    return 'warn';
  }

  if (status === 'FAILED') {
    return 'bad';
  }

  return 'neutral';
}

function renderFidelityTone(status: string): 'neutral' | 'good' | 'warn' | 'bad' {
  if (status === 'PASSED') {
    return 'good';
  }
  if (status === 'PASSED_WITH_OPTIONAL_FALLBACKS' || status === 'VISUALLY_DEGRADED') {
    return 'warn';
  }
  if (status === 'FAILED') {
    return 'bad';
  }
  return 'neutral';
}

function statusClass(tone: WorkbenchStatusTone): string {
  if (tone === 'good') {
    return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
  }
  if (tone === 'warn') {
    return 'border-[#f2ca83] bg-[#fff1d6] text-[#8a5b13]';
  }
  if (tone === 'bad') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }
  return 'border-[#d0b993] bg-[#ece1ce] text-[#69645d]';
}
