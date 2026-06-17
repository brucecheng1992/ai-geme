export type SemanticAmendmentProposalCardAction = {
  id: string;
  label: string;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
};

export type SemanticAmendmentProposalCardView = {
  id: string;
  title: string;
  summary: string;
  statusLabel: string;
  statusTone: 'ready' | 'pending' | 'blocked' | 'failed' | 'accepted' | 'neutral';
  modeLabel: string;
  reviewState: string;
  detailRows: Array<{ label: string; value: string }>;
  plannedChanges: string[];
  missingCapabilities: string[];
  rejectedUnsafeFallbacks: string[];
  candidateRunId?: string;
  failureReason?: string;
  actions: SemanticAmendmentProposalCardAction[];
};

const baseButtonClass =
  'inline-flex min-h-8 items-center justify-center rounded-lg border px-3 text-[11px] font-black transition disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';

export function SemanticAmendmentProposalCard({ card }: { card: SemanticAmendmentProposalCardView }) {
  return (
    <article className="grid gap-2 rounded-lg border border-[#312b22] bg-[#fffef9] p-3 text-xs font-bold text-[#302b24] shadow-[3px_3px_0_rgba(21,19,15,0.08)] [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="m-0 text-sm font-black leading-tight text-[#15130f]">{card.title}</h4>
          <p className="m-0 mt-1 leading-snug text-[#69645d]">{card.summary}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClass(card.statusTone)}`}>{card.statusLabel}</span>
      </div>

      <dl className="m-0 grid gap-1">
        <DetailRow label="Mode" value={card.modeLabel} />
        <DetailRow label="Review" value={card.reviewState} />
        {card.detailRows.map((row) => (
          <DetailRow key={`${card.id}:${row.label}`} label={row.label} value={row.value} />
        ))}
        {card.candidateRunId === undefined ? null : <DetailRow label="Candidate" value={card.candidateRunId} />}
      </dl>

      <CompactList title="Planned changes" items={card.plannedChanges} tone="neutral" />
      <CompactList title="Missing capabilities" items={card.missingCapabilities} tone="failed" />
      <CompactList title="Blocked fallbacks" items={card.rejectedUnsafeFallbacks} tone="blocked" />

      {card.failureReason === undefined ? null : (
        <p className="m-0 rounded-lg border border-[#f2a39b] bg-[#ffe2dc] px-2.5 py-2 text-[#c93d35]">{card.failureReason}</p>
      )}

      {card.actions.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#ead9ba] pt-2">
          {card.actions.map((action) => (
            <button className={`${baseButtonClass} ${buttonToneClass(action.tone ?? 'secondary')}`} disabled={action.disabled} key={action.id} type="button" onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
      <dt className="font-black uppercase text-[#6f6558]">{label}</dt>
      <dd className="m-0 text-[#302b24]">{value}</dd>
    </div>
  );
}

function CompactList({ title, items, tone }: { title: string; items: string[]; tone: 'neutral' | 'blocked' | 'failed' }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-1">
      <h5 className="m-0 text-[10px] font-black uppercase text-[#6f6558]">{title}</h5>
      <ul className="m-0 grid list-none gap-1 p-0">
        {items.map((item) => (
          <li className={`rounded-lg border px-2.5 py-1.5 ${listItemClass(tone)}`} key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusClass(tone: SemanticAmendmentProposalCardView['statusTone']): string {
  if (tone === 'ready') {
    return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
  }
  if (tone === 'pending') {
    return 'border-[#f2ca83] bg-[#fff1d6] text-[#8a5b13]';
  }
  if (tone === 'blocked') {
    return 'border-[#d0b993] bg-[#ece1ce] text-[#69645d]';
  }
  if (tone === 'failed') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }
  if (tone === 'accepted') {
    return 'border-[#c9dbff] bg-[#e9f0ff] text-[#1d57a7]';
  }
  return 'border-[#d0b993] bg-[#fff7e8] text-[#69645d]';
}

function listItemClass(tone: 'neutral' | 'blocked' | 'failed'): string {
  if (tone === 'blocked') {
    return 'border-[#f2ca83] bg-[#fff1d6] text-[#8a5b13]';
  }
  if (tone === 'failed') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }
  return 'border-[#ead9ba] bg-[#fffaf0] text-[#302b24]';
}

function buttonToneClass(tone: NonNullable<SemanticAmendmentProposalCardAction['tone']>): string {
  if (tone === 'primary') {
    return 'border-[#15130f] bg-[#15130f] text-[#fffaf0] hover:bg-[#2b261d] hover:shadow-[3px_3px_0_#ffb13b]';
  }
  if (tone === 'danger') {
    return 'border-[#c93d35] bg-[#fffef9] text-[#c93d35] hover:bg-[#ffe2dc] hover:shadow-[3px_3px_0_#f2a39b]';
  }
  return 'border-[#15130f] bg-[#fffef9] text-[#15130f] hover:bg-[#fff7e8] hover:shadow-[3px_3px_0_#ffb13b]';
}
