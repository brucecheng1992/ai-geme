import { formatAssetSemanticFitSummary, type AssetSemanticStatus, type QaAssetSemanticSummary } from './workbench-api.js';

type AssetSemanticListProps = {
  assets: QaAssetSemanticSummary[];
};

export function AssetSemanticList({ assets }: AssetSemanticListProps) {
  return (
    <div className="grid gap-2">
      <div className="text-[11px] font-extrabold uppercase text-[#69645d]">Asset semantics</div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {assets.map((asset) => (
          <li className="rounded-lg border border-[#d0b993] bg-[#fffaf0] p-2.5 text-sm leading-snug text-[#302b24]" key={asset.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-[#15130f]">{asset.id}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${semanticStatusClass(asset.semantic_status)}`}>
                {asset.semantic_status}
              </span>
            </div>
            <div className="mt-1 text-xs font-bold text-[#69645d]">{asset.role}</div>
            <div className="mt-1 text-xs font-bold text-[#302b24] [overflow-wrap:anywhere]">{formatAssetSemanticFitSummary(asset)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function semanticStatusClass(status: AssetSemanticStatus): string {
  if (status === 'FAILED') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }

  if (status === 'WARNING') {
    return 'border-[#f2ca83] bg-[#fff1d6] text-[#8a5b13]';
  }

  return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
}
