import type { BriefTextboxDraftStatus, BriefTextboxMode } from './briefTextboxSchema.js';

export type BriefTextboxProps = {
  text: string;
  language: string;
  target: string;
  mode: BriefTextboxMode;
  status: BriefTextboxDraftStatus;
  disabled?: boolean;
  onTextChange: (text: string) => void;
  onLanguageChange: (language: string) => void;
  onTargetChange: (target: string) => void;
  onModeChange: (mode: BriefTextboxMode) => void;
};

const fieldClass =
  'min-w-0 rounded-lg border border-[#bba98c] bg-[#fffefa] px-3 py-2.5 text-sm text-[#15130f] outline-none transition focus:border-[#f3763d] focus:shadow-[0_0_0_3px_rgba(255,177,59,0.28)] disabled:border-[#d8c7a6] disabled:bg-[#eee7dc] disabled:text-[#8b8172]';

export function BriefTextbox({
  text,
  language,
  target,
  mode,
  status,
  disabled = false,
  onTextChange,
  onLanguageChange,
  onTargetChange,
  onModeChange
}: BriefTextboxProps) {
  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm font-bold text-[#69645d]">
        Idea
        <textarea
          className={`${fieldClass} min-h-24 resize-y`}
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          rows={4}
          value={text}
        />
      </label>

      <div className="grid gap-3">
        <label className="grid gap-2 text-sm font-bold text-[#69645d]">
          Mode
          <select className={fieldClass} disabled={disabled} value={mode} onChange={(event) => onModeChange(event.target.value as BriefTextboxMode)}>
            <option value="new_game">new_game</option>
            <option value="edit_current_game">edit_current_game</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-[#69645d]">
          Semantic target
          <input
            className={fieldClass}
            disabled={disabled}
            onChange={(event) => onTargetChange(event.target.value)}
            value={target}
          />
        </label>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-3 max-sm:grid-cols-1">
        <label className="mb-0 grid gap-2 text-sm font-bold text-[#69645d]">
          Language
          <select className={fieldClass} disabled={disabled} value={language} onChange={(event) => onLanguageChange(event.target.value)}>
            <option value="zh">zh</option>
            <option value="en">en</option>
          </select>
        </label>
        <span className={statusClass(status)}>{status}</span>
      </div>
    </div>
  );
}

function statusClass(status: BriefTextboxDraftStatus): string {
  if (status === 'preview_ready' || status === 'valid') {
    return 'inline-flex min-h-9 items-center justify-center rounded-full border border-[#91d49b] bg-[#dff3df] px-3 text-xs font-black text-[#208a4d]';
  }

  if (status === 'invalid' || status === 'preview_failed') {
    return 'inline-flex min-h-9 items-center justify-center rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-3 text-xs font-black text-[#c93d35]';
  }

  return 'inline-flex min-h-9 items-center justify-center rounded-full border border-[#f2ca83] bg-[#fff1d6] px-3 text-xs font-black text-[#8a5b13]';
}
