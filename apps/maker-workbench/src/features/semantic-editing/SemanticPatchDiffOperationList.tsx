import type { SemanticPatchDiffOperationRow, SemanticPatchDiffValuePreview } from '@ai-game-maker/game-dsl';

const sectionHeadingClass = 'm-0 text-[12px] font-black uppercase text-[#6f6558]';
const cellClass = 'border-b border-[#ead9ba] px-2 py-2 align-top text-xs font-bold text-[#69645d]';
const previewClass =
  'm-0 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-[#ead9ba] bg-[#fffaf0] p-2 font-mono text-[11px] leading-snug text-[#302b24] [overflow-wrap:anywhere]';

export type SemanticPatchDiffOperationListProps = {
  operations: SemanticPatchDiffOperationRow[];
};

export function SemanticPatchDiffOperationList({ operations }: SemanticPatchDiffOperationListProps) {
  return (
    <section className="grid gap-2" aria-labelledby="semantic-patch-diff-operations">
      <h3 className={sectionHeadingClass} id="semantic-patch-diff-operations">
        Operations
      </h3>
      {operations.length === 0 ? (
        <p className="m-0 text-sm font-bold text-[#69645d]">No semantic patch operations to preview.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr>
                {['#', 'Operation', 'Path', 'Effect', 'Before', 'After', 'Validation'].map((label) => (
                  <th className="border-b border-[#d8c7a6] px-2 py-1 text-xs font-black text-[#15130f]" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{operations.map(renderOperationRow)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function renderOperationRow(operation: SemanticPatchDiffOperationRow) {
  const validation = operation.validationCodes.length === 0 ? 'none' : operation.validationCodes.join(', ');

  return (
    <tr key={`${operation.index}:${operation.path}`}>
      <td className={cellClass}>{operation.index}</td>
      <td className={cellClass}>
        <span className={statusClass(operation.op)}>{operation.op}</span>
      </td>
      <td className={`${cellClass} [overflow-wrap:anywhere]`}>
        <div>{operation.path}</div>
        {operation.safePath ? null : <div className="mt-1 font-black text-[#c93d35]">Unsafe path</div>}
      </td>
      <td className={cellClass}>{operation.effect}</td>
      <td className={cellClass}>{renderPreview(operation.before)}</td>
      <td className={cellClass}>{renderPreview(operation.after)}</td>
      <td className={`${cellClass} [overflow-wrap:anywhere]`}>{validation}</td>
    </tr>
  );
}

function renderPreview(preview: SemanticPatchDiffValuePreview) {
  return (
    <div className="grid gap-1">
      <pre className={previewClass}>{preview.preview}</pre>
      <span className="text-[11px] font-black uppercase text-[#6f6558]">
        {preview.kind}
        {preview.truncated ? ' / truncated' : ''}
        {preview.redacted ? ' / redacted' : ''}
      </span>
    </div>
  );
}

function statusClass(status: string): string {
  if (status === 'set' || status === 'add' || status === 'replace') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 text-xs font-black text-[#208a4d]';
  }

  if (status === 'remove') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 text-xs font-black text-[#c93d35]';
  }

  return 'rounded-full border border-[#f2ca83] bg-[#fff1d6] px-2 py-0.5 text-xs font-black text-[#8a5b13]';
}
