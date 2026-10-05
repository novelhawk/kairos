import { createSignal, createEffect, onCleanup, Index, Show } from 'solid-js';

export interface CountdownUnitProps {
  value: number;
  animate?: boolean;
  padLength?: number;
}

interface DigitSlotProps {
  digit: string;
  animate?: boolean;
}

function DigitSlot(props: DigitSlotProps) {
  const [current, setCurrent] = createSignal(props.digit);
  const [prev, setPrev] = createSignal<string | null>(null);
  let timeoutId: number | null = null;

  createEffect(() => {
    const newDigit = props.digit;
    if (props.animate === false) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setCurrent(newDigit);
      setPrev(null);
      return;
    }

    if (newDigit !== current()) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      setPrev(current());
      setCurrent(newDigit);

      timeoutId = window.setTimeout(() => {
        setPrev(null);
        timeoutId = null;
      }, 350);
    }
  });

  onCleanup(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });

  return (
    <span class="relative inline-flex items-center justify-center h-[1.15em] w-[0.58em] overflow-hidden select-none font-mono tabular-nums leading-none">
      <Show
        when={prev() !== null && props.animate !== false}
        fallback={
          <span class="absolute inset-0 flex items-center justify-center">
            {current()}
          </span>
        }
      >
        {/* Outgoing Digit (slides down out) */}
        <span class="absolute inset-0 flex items-center justify-center animate-digit-slide-out pointer-events-none">
          {prev()}
        </span>

        {/* Incoming Digit (slides in from top) */}
        <span class="absolute inset-0 flex items-center justify-center animate-digit-slide-in">
          {current()}
        </span>
      </Show>
    </span>
  );
}

export function CountdownUnit(props: CountdownUnitProps) {
  const minPad = () => props.padLength ?? 2;
  const digits = () => {
    const absVal = Math.max(0, Math.floor(Math.abs(props.value)));
    const str = isNaN(absVal) ? '0' : absVal.toString();
    return str.padStart(minPad(), '0').split('');
  };

  return (
    <span class="inline-flex items-center font-mono tabular-nums select-none">
      <Index each={digits()}>
        {(digit) => <DigitSlot digit={digit()} animate={props.animate} />}
      </Index>
    </span>
  );
}

export function Separator(props: { label?: string }) {
  return (
    <span class="inline-flex items-center justify-center px-[0.06em] opacity-60 font-mono select-none leading-none">
      {props.label || ':'}
    </span>
  );
}
