import { createSignal, createMemo, createEffect, onCleanup, Show } from 'solid-js';
import type { CountdownConfig } from '../utils/router';
import { formatTimeDifference } from '../utils/timeParser';
import { soundEngine } from '../utils/soundSynthesizer';
import { CountdownUnit, Separator } from '../components/AnimatedDigit';
import { VolumeX, BellRing } from 'lucide-solid';

interface CountdownViewProps {
  config: CountdownConfig;
}

export function CountdownView(props: CountdownViewProps) {
  const [now, setNow] = createSignal<number>(Date.now());
  const [isRinging, setIsRinging] = createSignal<boolean>(false);
  const [hasTriggeredSound, setHasTriggeredSound] = createSignal<boolean>(false);

  // Compute absolute target epoch milliseconds
  const targetMs = createMemo(() => {
    const { endTimeMs, startTimeMs, durationSeconds, sessionStartMs } = props.config;

    if (endTimeMs !== null) {
      return endTimeMs;
    }

    if (startTimeMs !== null && durationSeconds !== null) {
      return startTimeMs + durationSeconds * 1000;
    }

    if (durationSeconds !== null) {
      // Relative timer starting from session start
      return sessionStartMs + durationSeconds * 1000;
    }

    // Default fallback: 5 minutes from session start
    return sessionStartMs + 300 * 1000;
  });

  // Second tick interval
  let intervalId: number | null = null;
  createEffect(() => {
    setNow(Date.now());
    intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    onCleanup(() => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      soundEngine.stopAlarmLoop();
    });
  });

  // Sound alarm trigger
  createEffect(() => {
    const delta = targetMs() - now();
    if (props.config.sound && delta <= 0 && !hasTriggeredSound()) {
      setHasTriggeredSound(true);
      setIsRinging(true);
      soundEngine.startAlarmLoop();
    }
  });

  const time = createMemo(() => {
    const delta = targetMs() - now();
    return formatTimeDifference(delta);
  });

  const handleDismissSound = () => {
    soundEngine.stopAlarmLoop();
    setIsRinging(false);
  };

  return (
    <div class="fixed inset-0 flex flex-col items-center justify-center bg-background text-primary select-none overflow-hidden p-4">
      {/* Big Animated Countdown */}
      <div
        class="countdown-clock flex items-center justify-center font-mono font-bold tracking-tight text-primary text-6xl sm:text-8xl md:text-9xl lg:text-[13vw] leading-none"
        role="timer"
        aria-live="polite"
      >
        {/* Negative Sign */}
        <Show when={time().isNegative}>
          <span class="inline-flex items-center justify-center mr-[0.1em] text-error font-mono leading-none">
            -
          </span>
        </Show>

        {/* Days (if > 0) */}
        <Show when={time().hasDays}>
          <CountdownUnit value={time().days} animate={props.config.animate} />
          <span class="text-[0.4em] opacity-60 ml-[0.05em] mr-[0.1em] self-end mb-[0.25em] font-sans uppercase">
            d
          </span>
          <Separator />
        </Show>

        {/* Hours */}
        <CountdownUnit value={time().hours} animate={props.config.animate} />
        <Separator />

        {/* Minutes */}
        <CountdownUnit value={time().minutes} animate={props.config.animate} />
        <Separator />

        {/* Seconds */}
        <CountdownUnit value={time().seconds} animate={props.config.animate} />
      </div>

      {/* Dismiss sound button (only visible when sound alert is ringing) */}
      <Show when={isRinging()}>
        <div class="absolute bottom-12 sm:bottom-16 flex flex-col items-center">
          <button
            onClick={handleDismissSound}
            class="flex items-center gap-3 px-8 py-4 rounded-full bg-error text-on-error font-semibold text-lg sm:text-xl shadow-2xl hover:opacity-90 active:scale-95 transition-all cursor-pointer ring-4 ring-error/30"
          >
            <BellRing class="w-6 h-6 animate-pulse" />
            <span>Stop Sound</span>
            <VolumeX class="w-6 h-6" />
          </button>
        </div>
      </Show>
    </div>
  );
}
