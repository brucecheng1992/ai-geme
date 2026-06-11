import type { QaAssetReport } from './workbench-api.js';

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';

type AssetStatusPanelProps = {
  report?: QaAssetReport;
};

export function AssetStatusPanel({ report }: AssetStatusPanelProps) {
  const summary = report?.manifest_summary;
  const runtime = report?.runtime;
  const failures = report?.failures ?? [];

  return (
    <article className={`${panelClass} min-h-40`}>
      <div className={panelHeadingClass}>
        <div>
          <p className={eyebrowClass}>Assets</p>
          <h2 className={headingClass}>Manifest Status</h2>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${assetHealthClass(report)}`}>{assetHealthLabel(report)}</span>
      </div>

      {report ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
            <AssetMetric label="Required" value={summary?.required ?? report.required.length} />
            <AssetMetric label="Ready" value={summary?.ready ?? report.ready.length} />
            <AssetMetric label="Loaded" value={runtime?.loaded.length ?? 0} />
            <AssetMetric label="Failed" value={runtime?.failed.length ?? 0} tone={runtime?.failed.length ? 'bad' : 'neutral'} />
            <AssetMetric label="Placeholder" value={summary?.placeholder_used ?? report.placeholder_used.length} tone={report.placeholder_used.length ? 'warn' : 'neutral'} />
            <AssetMetric label="Missing" value={summary?.missing ?? report.missing.length} tone={report.missing.length ? 'bad' : 'neutral'} />
          </div>

          <div className="grid gap-2">
            <AssetList title="Required" values={report.required} />
            <AssetList title="Runtime loaded" values={runtime?.loaded ?? []} />
          </div>

          {report.sources !== undefined && report.sources.length > 0 ? (
            <div className="grid gap-2">
              <div className="text-[11px] font-extrabold uppercase text-[#69645d]">Source packs</div>
              {report.sources.map((source) => (
                <div className="rounded-lg border border-[#d0b993] bg-[#fffaf0] p-2.5 text-sm leading-snug text-[#302b24]" key={assetSourceKey(source)}>
                  <div className="font-black text-[#15130f]">{source.source_pack}</div>
                  <div className="font-bold text-[#69645d]">{source.license_id}</div>
                  <a className="font-bold text-[#1d57a7] [overflow-wrap:anywhere]" href={source.source_url} target="_blank" rel="noreferrer">
                    {source.license_name}
                  </a>
                  <div className="mt-1 text-xs font-bold text-[#69645d]">{source.attribution}</div>
                </div>
              ))}
            </div>
          ) : null}

          {failures.length > 0 ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {failures.map((failure, index) => (
                <li className="rounded-lg border border-[#f2a39b] bg-[#ffe2dc] p-3 text-sm leading-snug text-[#6e2a24]" key={`${failure.code}-${index}`}>
                  <div className="mb-1 font-black text-[#c93d35]">{failure.code}</div>
                  <div>{failure.message}</div>
                  <div className="mt-1 text-xs font-bold text-[#8b4a43]">{formatFailureScope(failure.asset_ids, failure.roles)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm font-bold text-[#69645d]">No asset failures</p>
          )}
        </div>
      ) : (
        <p className="m-0 text-sm leading-snug text-[#69645d]">No asset report</p>
      )}
    </article>
  );
}

function AssetMetric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'warn' | 'bad' }) {
  return (
    <div className={`rounded-lg border p-2.5 ${metricToneClass(tone)}`}>
      <div className="text-[11px] font-extrabold uppercase text-[#69645d]">{label}</div>
      <div className="text-2xl font-black leading-none text-[#15130f]">{value}</div>
    </div>
  );
}

function AssetList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-extrabold uppercase text-[#69645d]">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((value) => (
            <span className="rounded-full border border-[#c9dbff] bg-[#e9f0ff] px-2 py-1 text-xs font-extrabold text-[#1d57a7] [overflow-wrap:anywhere]" key={value}>
              {value}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-[#d0b993] bg-[#ece1ce] px-2 py-1 text-xs font-extrabold text-[#69645d]">none</span>
        )}
      </div>
    </div>
  );
}

function assetSourceKey(source: { source_pack: string; license_id: string; attribution: string; source_url: string }): string {
  return `${source.source_pack}:${source.license_id}:${source.attribution}:${source.source_url}`;
}

function assetHealthLabel(report: QaAssetReport | undefined): string {
  if (!report) {
    return 'No report';
  }

  if (report.failures.length > 0 || report.missing.length > 0 || (report.runtime?.failed.length ?? 0) > 0) {
    return 'Blocked';
  }

  if (report.placeholder_used.length > 0 || report.fallback_used.length > 0) {
    return 'Fallback';
  }

  return 'Ready';
}

function assetHealthClass(report: QaAssetReport | undefined): string {
  const label = assetHealthLabel(report);
  if (label === 'Ready') {
    return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
  }
  if (label === 'Blocked') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }
  return 'border-[#d0b993] bg-[#ece1ce] text-[#69645d]';
}

function metricToneClass(tone: 'neutral' | 'warn' | 'bad'): string {
  if (tone === 'bad') {
    return 'border-[#f2a39b] bg-[#ffe2dc]';
  }
  if (tone === 'warn') {
    return 'border-[#f2ca83] bg-[#fff1d6]';
  }
  return 'border-[#d0b993] bg-[#fffaf0]';
}

function formatFailureScope(assetIds: string[], roles: string[]): string {
  const chunks = [];
  if (assetIds.length > 0) {
    chunks.push(`assets: ${assetIds.join(', ')}`);
  }
  if (roles.length > 0) {
    chunks.push(`roles: ${roles.join(', ')}`);
  }
  return chunks.join(' | ') || 'scope: run';
}
