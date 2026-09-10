import type { JSX } from 'solid-js';
import { Show } from 'solid-js';

interface CountdownUnitProps {
  value: number;
  animate?: boolean;
}

export function CountdownUnit(props: CountdownUnitProps) {
  const safeVal = () => {
    const v = Math.min(99, Math.max(0, Math.floor(Math.abs(props.value))));
    return isNaN(v) ? 0 : v;
  };

  const pad = () => safeVal().toString().padStart(2, '0');

  return (
    <Show
      when={props.animate !== false}
      fallback={
        <span class="inline-block tabular-nums font-mono select-none text-center">
          {pad()}
        </span>
      }
    >
      <span class="countdown-unit select-none font-mono">
        <span
          style={{
            '--value': safeVal(),
          } as JSX.CSSProperties}
        />
      </span>
    </Show>
  );
}

export function Separator(props: { label?: string }) {
  return (
    <span class="inline-flex items-center justify-center px-[0.06em] opacity-60 font-mono select-none leading-none">
      {props.label || ':'}
    </span>
  );
}
