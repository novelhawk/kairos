import { createSignal, createEffect, onCleanup, For } from 'solid-js';
import { Check, AlertCircle, Timer } from 'lucide-solid';
import { addSecondsToDuration, type ParsedDuration } from '../utils/timeParser';

export interface DurationFieldProps {
  value: string;
  onChange: (value: string) => void;
  parsed: ParsedDuration;
  class?: string;
}

const QUICK_ACTIONS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '30m', seconds: 30 * 60 },
  { label: '45m', seconds: 45 * 60 },
  { label: '1h', seconds: 60 * 60 },
];

export function DurationField(props: DurationFieldProps) {
  const [isShiftPressed, setIsShiftPressed] = createSignal<boolean>(false);

  // Listen to keyboard Shift modifier on desktop
  createEffect(() => {
    if (typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    const onBlur = () => {
      setIsShiftPressed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    onCleanup(() => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    });
  });

  const isSubtract = () => isShiftPressed();

  const handleAction = (seconds: number, e: MouseEvent) => {
    const shouldSubtract = e.shiftKey || isSubtract();
    const delta = shouldSubtract ? -seconds : seconds;
    const updated = addSecondsToDuration(props.value, delta);
    props.onChange(updated);
  };

  return (
    <div
      class={`bg-surface-container border border-outline-variant rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm ${props.class || ''}`}
    >
      {/* Top: Header with Label & Live Duration Preview */}
      <div class="flex items-center justify-between px-3.5 py-2 bg-surface-container-high/60 border-b border-outline-variant/60 select-none">
        <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          <Timer class="w-3.5 h-3.5 text-primary" />
          <span>Duration</span>
        </div>

        <div
          class={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium transition-colors max-w-[65%] truncate ${
            props.parsed.isValid
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-error/10 text-error border border-error/20'
          }`}
          title={props.parsed.isValid ? `Parsed: ${props.parsed.formatted}` : props.parsed.error || props.parsed.formatted}
        >
          {props.parsed.isValid ? (
            <Check class="w-3 h-3 shrink-0" />
          ) : (
            <AlertCircle class="w-3 h-3 shrink-0" />
          )}
          <span class="truncate">
            {props.parsed.isValid
              ? props.parsed.formatted
              : props.parsed.error || props.parsed.formatted}
          </span>
        </div>
      </div>

      {/* Middle: Duration Input Field */}
      <div class="px-3.5 py-2.5">
        <input
          type="text"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          placeholder="e.g. 25m, 1h, 08:00 - 00:30"
          class="w-full bg-transparent text-lg sm:text-xl font-mono font-semibold text-on-surface placeholder:text-on-surface-variant/40 outline-none border-none focus:outline-none focus:ring-0"
        />
      </div>

      {/* Bottom: Relative Quick Action Buttons */}
      <div class="grid grid-cols-5 gap-1 p-1.5 bg-surface-container-low/60 border-t border-outline-variant/60 items-center">
        <For each={QUICK_ACTIONS}>
          {(action) => (
            <button
              type="button"
              onClick={(e) => handleAction(action.seconds, e)}
              class={`py-1 px-1 text-xs font-mono font-medium text-center hover:bg-surface-container-highest active:scale-95 rounded-lg transition-all cursor-pointer select-none truncate ${
                isSubtract()
                  ? 'text-error/90 hover:text-error'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title={`${isSubtract() ? 'Subtract' : 'Add'} ${action.label} (Hold Shift to subtract)`}
            >
              {isSubtract() ? `-${action.label}` : `+${action.label}`}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
