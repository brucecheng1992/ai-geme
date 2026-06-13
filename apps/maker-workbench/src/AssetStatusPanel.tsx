import { AssetSemanticList } from './AssetSemanticList.js';
import type { ArtAssetWorkbenchPreview, ArtAssetWorkbenchPreviewAsset, ArtAssetWorkbenchPreviewDiagnostic, QaAssetReport } from './workbench-api.js';

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';

type AssetStatusPanelProps = {
  report?: QaAssetReport;
  preview?: ArtAssetWorkbenchPreview;
};

export function AssetStatusPanel({ report, preview }: AssetStatusPanelProps) {
  const summary = report?.manifest_summary;
  const runtime = report?.runtime;
  const failures = report?.failures ?? [];
  const semanticIssues = report?.semantic_issues ?? [];
  const semanticAssets = report?.assets ?? [];

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
            <AssetMetric label="Semantic" value={semanticIssues.length} tone={report.semantic_status === 'FAILED' ? 'bad' : report.semantic_status === 'WARNING' ? 'warn' : 'neutral'} />
            <AssetMetric label="Placeholder" value={summary?.placeholder_used ?? report.placeholder_used.length} tone={report.placeholder_used.length ? 'warn' : 'neutral'} />
            <AssetMetric label="Missing" value={summary?.missing ?? report.missing.length} tone={report.missing.length ? 'bad' : 'neutral'} />
          </div>

          <div className="grid gap-2">
            <AssetList title="Required" values={report.required} />
            <AssetList title="Runtime loaded" values={runtime?.loaded ?? []} />
          </div>

          {semanticAssets.length > 0 ? <AssetSemanticList assets={semanticAssets} /> : null}

          {preview !== undefined ? <ArtAssetPreview preview={preview} /> : null}

          {semanticIssues.length > 0 ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {semanticIssues.map((issue) => (
                <li className="rounded-lg border border-[#f2ca83] bg-[#fff1d6] p-3 text-sm leading-snug text-[#6b4b16]" key={`${issue.asset_id}-${issue.semantic_fit_status}`}>
                  <div className="mb-1 font-black text-[#8a5b13]">{`${issue.severity.toUpperCase()} ${issue.semantic_fit_status}`}</div>
                  <div>{issue.reason}</div>
                  <div className="mt-1 text-xs font-bold text-[#8a5b13]">{formatSemanticIssueScope(issue)}</div>
                </li>
              ))}
            </ul>
          ) : null}

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

function ArtAssetPreview({ preview }: { preview: ArtAssetWorkbenchPreview }) {
  const diagnostics = [...preview.diagnostics.bridge.items, ...preview.diagnostics.resolver.items];

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-extrabold uppercase text-[#69645d]">Small library preview</div>
        <span className={`rounded-full border px-2 py-1 text-xs font-extrabold ${preview.ok ? 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]' : 'border-[#f2ca83] bg-[#fff1d6] text-[#8a5b13]'}`}>
          {preview.ok ? 'Ready' : 'Diagnostics'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
        <AssetMetric label="Assets" value={preview.asset_count} />
        <AssetMetric label="Bridge" value={preview.diagnostics.bridge.matched_count} tone={preview.diagnostics.bridge.ok ? 'neutral' : 'warn'} />
        <AssetMetric label="Diagnostics" value={diagnostics.length} tone={diagnostics.length > 0 ? 'warn' : 'neutral'} />
      </div>
      <div className="grid max-h-72 gap-2 overflow-auto pr-1">
        {preview.assets.map((asset) => (
          <PreviewAssetRow asset={asset} key={asset.asset_id} />
        ))}
      </div>
      {diagnostics.length > 0 ? (
        <ul className="m-0 grid list-none gap-2 p-0">
          {diagnostics.map((diagnostic, index) => (
            <PreviewDiagnostic diagnostic={diagnostic} index={index} key={`${diagnostic.source}-${diagnostic.code}-${diagnostic.assetId ?? index}`} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function PreviewAssetRow({ asset }: { asset: ArtAssetWorkbenchPreviewAsset }) {
  return (
    <div className="rounded-lg border border-[#d0b993] bg-[#fffaf0] p-2.5 text-sm leading-snug text-[#302b24]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-black text-[#15130f] [overflow-wrap:anywhere]">{asset.title}</div>
          <div className="text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]">{asset.asset_id}</div>
        </div>
        <span className="rounded-full border border-[#c9dbff] bg-[#e9f0ff] px-2 py-1 text-xs font-extrabold text-[#1d57a7]">{asset.asset_type}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {asset.semantic.tags.slice(0, 5).map((tag) => (
          <span className="rounded-full border border-[#d0b993] bg-[#fffefa] px-2 py-1 text-xs font-extrabold text-[#69645d]" key={`${asset.asset_id}-${tag}`}>
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-2 grid gap-1 text-xs font-bold text-[#69645d]">
        <div>{`roles: ${asset.gameplay.role.join(', ') || 'none'}`}</div>
        <div className="[overflow-wrap:anywhere]">{`thumbnail: ${asset.technical.thumbnail_path}`}</div>
      </div>
    </div>
  );
}

function PreviewDiagnostic({ diagnostic, index }: { diagnostic: ArtAssetWorkbenchPreviewDiagnostic; index: number }) {
  return (
    <li className="rounded-lg border border-[#f2ca83] bg-[#fff1d6] p-3 text-sm leading-snug text-[#6b4b16]">
      <div className="mb-1 font-black text-[#8a5b13]">{`${diagnostic.source.toUpperCase()} ${diagnostic.code}`}</div>
      <div>{diagnostic.message}</div>
      <div className="mt-1 text-xs font-bold text-[#8a5b13]">{formatPreviewDiagnosticScope(diagnostic, index)}</div>
    </li>
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

  if (report.semantic_status === 'FAILED') {
    return 'Semantic repair';
  }

  if (report.semantic_status === 'WARNING') {
    return 'Art warning';
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
  if (label === 'Semantic repair') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }
  if (label === 'Art warning') {
    return 'border-[#f2ca83] bg-[#fff1d6] text-[#8a5b13]';
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

function formatSemanticIssueScope(issue: NonNullable<QaAssetReport['semantic_issues']>[number]): string {
  const chunks = [`asset: ${issue.asset_id}`, `role: ${issue.role}`];
  if (issue.strictness !== undefined) {
    chunks.push(`strictness: ${issue.strictness}`);
  }
  if (issue.expected_concept !== undefined) {
    chunks.push(`expected: ${issue.expected_concept}`);
  }
  return chunks.join(' | ');
}

function formatPreviewDiagnosticScope(diagnostic: ArtAssetWorkbenchPreviewDiagnostic, index: number): string {
  const chunks = [`item: ${index + 1}`];
  if (diagnostic.assetId !== undefined) {
    chunks.push(`asset: ${diagnostic.assetId}`);
  }
  if (diagnostic.jsonPath !== undefined) {
    chunks.push(`path: ${diagnostic.jsonPath}`);
  }
  if (diagnostic.safePath !== undefined) {
    chunks.push(`file: ${diagnostic.safePath}`);
  }
  return chunks.join(' | ');
}
