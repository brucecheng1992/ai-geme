import type { ReactNode } from 'react';

import type { SemanticIndex } from '@ai-game-maker/game-dsl';

import { SemanticPatchDiffPanel } from '../semantic-editing/index.js';
import { SemanticAmendmentProposalCard, type SemanticAmendmentProposalCardView } from '../semantic-amendments/index.js';
import { BriefTextbox } from './BriefTextbox.js';
import { useBriefTextboxDraft } from './useBriefTextboxDraft.js';
import type { BriefTextboxPatchReviewHandoff } from './briefTextboxIntentBridge.js';
import type { BriefTextboxMode } from './briefTextboxSchema.js';

export type BriefTextboxPanelProps = {
  projectId: string;
  runId: string;
  value: string;
  language: string;
  mode: BriefTextboxMode;
  className?: string;
  conversationMessages?: GameConversationMessage[];
  amendmentCards?: SemanticAmendmentProposalCardView[];
  document?: unknown;
  semanticIndex?: SemanticIndex;
  loading?: boolean;
  activityLabel?: string;
  agentStatusMessage?: GameConversationMessage;
  primaryAction?: ReactNode;
  onTextChange: (text: string) => void;
  onLanguageChange: (language: string) => void;
  onSubmitNewGame?: () => void | Promise<void>;
  onSubmitEdit?: (text: string) => BriefTextboxEditSubmitResult | Promise<BriefTextboxEditSubmitResult>;
  onPreviewHandoff?: (handoff: BriefTextboxPatchReviewHandoff) => void;
};

export type BriefTextboxEditSubmitResult = boolean | 'handled' | 'blocked' | 'unhandled';

export type GameConversationMessage = {
  id: string;
  role: 'user' | 'workbench' | 'system';
  title: string;
  body: string;
  meta?: string;
  live?: boolean;
};

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#fffef9] px-4 text-sm font-extrabold text-[#15130f] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fff7e8] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';

export function BriefTextboxPanel({
  projectId,
  runId,
  value,
  language,
  mode,
  className = '',
  conversationMessages = [],
  amendmentCards = [],
  document,
  semanticIndex,
  loading = false,
  activityLabel,
  agentStatusMessage,
  primaryAction,
  onTextChange,
  onLanguageChange,
  onSubmitNewGame,
  onSubmitEdit,
  onPreviewHandoff
}: BriefTextboxPanelProps) {
  const brief = useBriefTextboxDraft({
    text: value,
    language,
    projectId,
    runId,
    document,
    semanticIndex,
    initialMode: mode
  });

  function previewPatch(): void {
    const result = brief.previewPatch();
    if (result.ok) {
      onPreviewHandoff?.(result.handoff);
    }
  }

  async function submitEditMessage(): Promise<void> {
    const text = brief.draft.text.trim();
    const submitResult = (await onSubmitEdit?.(text)) ?? 'unhandled';
    if (submitResult === true || submitResult === 'handled') {
      brief.setText('');
      onTextChange('');
      return;
    }
    if (submitResult === 'blocked') {
      return;
    }

    previewPatch();
  }

  const isEditMode = brief.draft.mode === 'edit_current_game';
  const hasDraftText = brief.draft.text.trim().length > 0;
  const validationErrors = hasDraftText ? brief.validation.errors : [];
  const validationWarnings = brief.validation.warnings.filter((issue) => isEditMode || issue.code !== 'BRIEF_TEXTBOX_NEW_GAME_MODE');
  const canSubmitEdit = isEditMode && brief.validation.ok && hasDraftText && projectId.trim().length > 0 && runId.trim().length > 0;
  const canSubmitNewGame = !isEditMode && brief.validation.ok && hasDraftText && onSubmitNewGame !== undefined;
  const canSubmitCurrentDraft = !loading && (isEditMode ? canSubmitEdit : canSubmitNewGame);
  const editSubmitLabel = activityLabel === 'Sending edit' ? 'Sending edit' : 'Send edit';
  const dialogMessages = agentStatusMessage === undefined ? conversationMessages : [...conversationMessages, agentStatusMessage];

  function submitCurrentDraft(): void {
    if (!canSubmitCurrentDraft) {
      return;
    }

    if (isEditMode) {
      void submitEditMessage();
      return;
    }

    void onSubmitNewGame?.();
  }

  return (
    <section className={`${panelClass} ${className} flex flex-col border-[#312b22] bg-gradient-to-b from-white to-[#fff1d6] shadow-[6px_6px_0_rgba(21,19,15,0.08)]`}>
      <div className={panelHeadingClass}>
        <div>
          <p className={eyebrowClass}>Game</p>
          <h2 className={headingClass}>Conversation</h2>
        </div>
        <span className="rounded-full border border-[#d0b993] bg-[#ece1ce] px-2.5 py-1 text-[11px] font-black text-[#69645d]">
          {brief.validation.draftHash}
        </span>
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3">
        <ConversationHistory messages={dialogMessages} amendmentCards={amendmentCards} />

        <div className="grid shrink-0 gap-3 border-t border-[#ead9ba] pt-3">
          <BriefTextbox
            canSubmit={canSubmitCurrentDraft}
            disabled={loading}
            language={language}
            mode={brief.draft.mode}
            onLanguageChange={onLanguageChange}
            onSubmit={submitCurrentDraft}
            onTextChange={(text) => {
              brief.setText(text);
              onTextChange(text);
            }}
            status={brief.draft.status}
            text={brief.draft.text}
          />

          {isEditMode ? (
            <div className="flex flex-wrap items-center gap-2">
              <button className={secondaryButtonClass} type="button" onClick={() => void submitEditMessage()} disabled={loading || !canSubmitEdit}>
                {editSubmitLabel}
              </button>
              {brief.previewResult === null ? null : (
                <button className={secondaryButtonClass} type="button" onClick={brief.clearPreview} disabled={loading}>
                  Clear Preview
                </button>
              )}
            </div>
          ) : (
            <div>{primaryAction}</div>
          )}
        </div>
      </section>

      <IssueList title="Validation errors" tone="error" items={validationErrors.map((issue) => `${issue.code}: ${issue.message}`)} />
      <IssueList title="Validation warnings" tone="warn" items={validationWarnings.map((issue) => `${issue.code}: ${issue.message}`)} />

      {brief.previewResult === null ? null : (
        <section className="mt-3 grid gap-3">
          {brief.previewResult.ok ? (
            <div className="rounded-lg border border-[#91d49b] bg-[#dff3df] p-3 text-xs font-bold text-[#208a4d] [overflow-wrap:anywhere]">
              Patch preview ready: {brief.previewResult.handoff.patchId}
            </div>
          ) : (
            <div className="rounded-lg border border-[#f2a39b] bg-[#ffe2dc] p-3 text-xs font-bold text-[#c93d35] [overflow-wrap:anywhere]">
              {brief.previewResult.error.code}: {brief.previewResult.error.message}
            </div>
          )}

          <TraceSummary events={brief.previewResult.traceEvents} />
          {brief.previewResult.result?.diff === undefined ? null : (
            <SemanticPatchDiffPanel compact title="Brief Patch Preview" viewModel={brief.previewResult.result.diff} />
          )}
        </section>
      )}
    </section>
  );
}

function ConversationHistory({ messages, amendmentCards }: { messages: GameConversationMessage[]; amendmentCards: SemanticAmendmentProposalCardView[] }) {
  const hasHistory = messages.length > 0 || amendmentCards.length > 0;

  return (
    <section className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2">
      <h3 className="m-0 px-1 text-[11px] font-black uppercase text-[#6f6558]">History</h3>
      {!hasHistory ? (
        <p className="m-0 px-1 pb-1 text-sm font-bold text-[#69645d]">No conversation yet.</p>
      ) : (
        <ol className="m-0 grid min-h-28 list-none content-start gap-2 overflow-y-auto overscroll-contain p-0 pr-1" role="log">
          {messages.map((message) => (
            <li
              aria-live={message.live ? 'polite' : undefined}
              className={`rounded-lg border p-2 text-xs font-bold [overflow-wrap:anywhere] ${messageClass(message.role)}`}
              key={message.id}
              role={message.live ? 'status' : undefined}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-[#15130f]">{message.title}</span>
                {message.meta === undefined ? null : <span className="rounded-full border border-[#d0b993] bg-[#fff7e8] px-2 py-0.5 text-[10px] font-black text-[#8a5b13]">{message.meta}</span>}
              </div>
              <p className="m-0 mt-1 leading-snug">{message.body}</p>
            </li>
          ))}
          {amendmentCards.map((card) => (
            <li key={card.id}>
              <SemanticAmendmentProposalCard card={card} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function messageClass(role: GameConversationMessage['role']): string {
  if (role === 'user') {
    return 'border-[#c9dbff] bg-[#e9f0ff] text-[#1d57a7]';
  }

  if (role === 'workbench') {
    return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
  }

  return 'border-[#d0b993] bg-[#fffefa] text-[#69645d]';
}

function IssueList({ title, tone, items }: { title: string; tone: 'error' | 'warn'; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  const className =
    tone === 'error'
      ? 'rounded-lg border border-[#f2a39b] bg-[#ffe2dc] p-3 text-xs font-bold text-[#c93d35] [overflow-wrap:anywhere]'
      : 'rounded-lg border border-[#f2ca83] bg-[#fff1d6] p-3 text-xs font-bold text-[#8a5b13] [overflow-wrap:anywhere]';

  return (
    <section className="mt-3 grid gap-2">
      <h3 className="m-0 text-[11px] font-black uppercase text-[#6f6558]">{title}</h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {items.map((item) => (
          <li className={className} key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TraceSummary({ events }: { events: Array<{ draftHash: string; intentId?: string; patchId?: string; status: string }> }) {
  return (
    <section className="grid gap-2">
      <h3 className="m-0 text-[11px] font-black uppercase text-[#6f6558]">Trace</h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {events.map((event, index) => (
          <li className="rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]" key={`${event.status}:${event.draftHash}:${index}`}>
            {event.status} · Draft: {event.draftHash} · Intent: {event.intentId ?? 'none'} · Patch: {event.patchId ?? 'none'}
          </li>
        ))}
      </ul>
    </section>
  );
}
