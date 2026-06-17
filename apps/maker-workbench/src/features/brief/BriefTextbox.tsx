import type { BriefTextboxDraftStatus, BriefTextboxMode } from './briefTextboxSchema.js';

export type BriefTextboxProps = {
  text: string;
  language: string;
  mode: BriefTextboxMode;
  status: BriefTextboxDraftStatus;
  disabled?: boolean;
  canSubmit?: boolean;
  onTextChange: (text: string) => void;
  onLanguageChange: (language: string) => void;
  onSubmit?: () => void;
};

const fieldClass =
  'min-w-0 rounded-lg border border-[#bba98c] bg-[#fffefa] px-3 py-2.5 text-sm text-[#15130f] outline-none transition focus:border-[#f3763d] focus:shadow-[0_0_0_3px_rgba(255,177,59,0.28)] disabled:border-[#d8c7a6] disabled:bg-[#eee7dc] disabled:text-[#8b8172]';

export function BriefTextbox({
  text,
  language,
  mode,
  status,
  disabled = false,
  canSubmit = false,
  onTextChange,
  onLanguageChange,
  onSubmit
}: BriefTextboxProps) {
  const label = mode === 'new_game' ? 'New game message' : 'Modify current game';
  const placeholder =
    mode === 'new_game'
      ? 'Describe the game you want to generate...'
      : 'Tell the current game what to change, for example: 把玩家速度改成 320';

  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm font-bold text-[#69645d]">
        {label}
        <textarea
          className={`${fieldClass} min-h-24 resize-y`}
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key !== 'Enter' ||
              event.shiftKey ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.nativeEvent.isComposing
            ) {
              return;
            }

            event.preventDefault();
            if (canSubmit) {
              onSubmit?.();
            }
          }}
          placeholder={placeholder}
          rows={4}
          value={text}
        />
      </label>

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
