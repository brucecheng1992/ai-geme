import type { ReactNode } from 'react';

const cellClass = 'border-b border-[#ead9ba] px-2 py-2 align-top text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]';
const sectionHeadingClass = 'm-0 text-[12px] font-black uppercase text-[#6f6558]';

export function ResolverV2Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3">
      <dt className="text-[11px] font-black uppercase text-[#6f6558]">{label}</dt>
      <dd className="m-0 mt-1 text-xs font-bold text-[#15130f] [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export function ResolverV2CompactList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-2" aria-label={title}>
      <h4 className="m-0 text-[11px] font-black uppercase text-[#6f6558]">{title}</h4>
      <ul className="m-0 grid list-none gap-2 p-0">
        {items.map((item, index) => (
          <li className="rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]" key={`${title}:${index}`}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ResolverV2Table(input: { title: string; headers: string[]; rows: Array<Array<string | ReactNode>>; empty: string }) {
  return (
    <section className="grid gap-2" aria-label={input.title}>
      <h3 className={sectionHeadingClass}>{input.title}</h3>
      {input.rows.length === 0 ? (
        <p className="m-0 text-sm font-bold text-[#69645d]">{input.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr>
                {input.headers.map((header) => (
                  <th className="border-b border-[#d8c7a6] px-2 py-1 text-xs font-black text-[#15130f]" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {input.rows.map((row, rowIndex) => (
                <tr key={`${input.title}:${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td className={cellClass} key={`${input.title}:${rowIndex}:${cellIndex}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function resolverV2StatusClass(status: string): string {
  if (status === 'ready' || status === 'resolved' || status === 'info' || status === 'true') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 text-xs font-black text-[#208a4d]';
  }

  if (status === 'blocked' || status === 'unresolved' || status === 'error' || status === 'false') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 text-xs font-black text-[#c93d35]';
  }

  return 'rounded-full border border-[#f2ca83] bg-[#fff1d6] px-2 py-0.5 text-xs font-black text-[#8a5b13]';
}
