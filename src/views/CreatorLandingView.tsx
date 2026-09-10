import { createSignal, createMemo, For, Show } from 'solid-js';
import { themeConfig, updateThemePreferences } from '../theme/materialTheme';
import { navigate } from '../utils/router';
import {
  Timer,
  Calendar,
  Volume2,
  VolumeX,
  Sparkles,
  Copy,
  Check,
  Play,
  Palette,
  Sun,
  Moon,
  Info,
  Sliders,
  Zap,
  ZapOff,
} from 'lucide-solid';

type TimerMode = 'duration' | 'endTime';

const PRESET_COLORS = [
  { name: 'Amber', hex: '#FF8811' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Crimson', hex: '#EF4444' },
  { name: 'Emerald', hex: '#10B981' },
];

export function CreatorLandingView() {
  const [mode, setMode] = createSignal<TimerMode>('duration');

  // Duration fields (asks only about duration)
  const [hours, setHours] = createSignal<number>(0);
  const [minutes, setMinutes] = createSignal<number>(5);
  const [seconds, setSeconds] = createSignal<number>(0);

  // End Time field (ISO local string)
  const defaultEndTime = () => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [endTimeInput, setEndTimeInput] = createSignal<string>(defaultEndTime());

  // Sound toggle (default false)
  const [soundEnabled, setSoundEnabled] = createSignal<boolean>(false);

  // Animation toggle (default true)
  const [animationEnabled, setAnimationEnabled] = createSignal<boolean>(true);

  // Clipboard copy state
  const [copied, setCopied] = createSignal<boolean>(false);

  // Quick duration presets
  const applyPresetDuration = (h: number, m: number, s: number) => {
    setHours(h);
    setMinutes(m);
    setSeconds(s);
  };

  // Quick end-time shortcuts
  const addEndTimeMinutes = (mins: number) => {
    const target = new Date(Date.now() + mins * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setEndTimeInput(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  const setEndTimeEndOfDay = () => {
    const target = new Date();
    target.setHours(23, 59, 59, 999);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setEndTimeInput(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T23:59`);
  };

  // Duration in seconds
  const totalDurationSeconds = createMemo(() => {
    const total = hours() * 3600 + minutes() * 60 + seconds();
    return total > 0 ? total : 300;
  });

  // Build the launch URL with automatic startTime upon launch
  const buildLaunchUrl = () => {
    const currentMode = mode();
    const params: string[] = [];

    if (currentMode === 'duration') {
      const nowIso = new Date().toISOString();
      params.push(`startTime=${encodeURIComponent(nowIso)}`);
      params.push(`duration=${totalDurationSeconds()}s`);
    } else if (currentMode === 'endTime') {
      if (endTimeInput()) {
        const iso = new Date(endTimeInput()).toISOString();
        params.push(`endTime=${encodeURIComponent(iso)}`);
      }
    }

    if (soundEnabled()) {
      params.push('sound=true');
    }

    if (!animationEnabled()) {
      params.push('animate=false');
    }

    return `/countdown#${params.join('&')}`;
  };

  // Preview URL for display
  const previewPathWithHash = createMemo(() => {
    const currentMode = mode();
    const params: string[] = [];

    if (currentMode === 'duration') {
      params.push(`duration=${totalDurationSeconds()}s`);
    } else if (currentMode === 'endTime') {
      if (endTimeInput()) {
        const iso = new Date(endTimeInput()).toISOString();
        params.push(`endTime=${encodeURIComponent(iso)}`);
      }
    }

    if (soundEnabled()) {
      params.push('sound=true');
    }

    if (!animationEnabled()) {
      params.push('animate=false');
    }

    return `/countdown#${params.join('&')}`;
  });

  const fullPreviewUrl = createMemo(() => {
    if (typeof window === 'undefined') return previewPathWithHash();
    return `${window.location.origin}${previewPathWithHash()}`;
  });

  const handleCopyLink = async () => {
    try {
      const urlToCopy = typeof window === 'undefined' ? buildLaunchUrl() : `${window.location.origin}${buildLaunchUrl()}`;
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const handleLaunch = () => {
    navigate(buildLaunchUrl());
  };

  return (
    <div class="min-h-screen bg-background text-on-background flex flex-col items-center justify-between py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div class="w-full max-w-3xl flex flex-col gap-8">
        
        {/* Header Branding */}
        <header class="text-center space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles class="w-3.5 h-3.5" />
            <span>Signal-Driven Precision</span>
          </div>
          <h1 class="text-5xl sm:text-6xl font-black tracking-tight text-primary font-mono">
            Kairos
          </h1>
          <p class="text-on-surface-variant text-base sm:text-lg max-w-md mx-auto">
            A distraction-free, zero-bloat countdown & timer. Clean, animated, and instant.
          </p>
        </header>

        {/* Main Configuration Card */}
        <main class="bg-surface rounded-3xl border border-outline-variant p-6 sm:p-8 shadow-xl space-y-8">
          
          {/* Mode Selector Tabs */}
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Countdown Mode
            </label>
            <div class="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-2xl border border-outline-variant">
              <button
                type="button"
                onClick={() => setMode('duration')}
                class={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  mode() === 'duration'
                    ? 'bg-primary text-on-primary shadow-md font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <Timer class="w-4 h-4" />
                <span>Timer Duration</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('endTime')}
                class={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  mode() === 'endTime'
                    ? 'bg-primary text-on-primary shadow-md font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <Calendar class="w-4 h-4" />
                <span>Target Date / Time</span>
              </button>
            </div>
          </div>

          {/* Mode Configuration Form */}
          <div class="space-y-6">
            <Show when={mode() === 'duration'}>
              <div>
                <label class="block text-sm font-semibold text-on-surface mb-2">
                  Duration
                </label>
                
                {/* Duration Inputs: H, M, S */}
                <div class="grid grid-cols-3 gap-3">
                  <div class="flex flex-col">
                    <label class="text-xs text-on-surface-variant mb-1 font-mono">Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={hours()}
                      onInput={(e) => setHours(Math.max(0, parseInt(e.currentTarget.value, 10) || 0))}
                      class="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-xl font-mono text-center font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div class="flex flex-col">
                    <label class="text-xs text-on-surface-variant mb-1 font-mono">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={minutes()}
                      onInput={(e) => setMinutes(Math.max(0, parseInt(e.currentTarget.value, 10) || 0))}
                      class="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-xl font-mono text-center font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div class="flex flex-col">
                    <label class="text-xs text-on-surface-variant mb-1 font-mono">Seconds</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={seconds()}
                      onInput={(e) => setSeconds(Math.max(0, parseInt(e.currentTarget.value, 10) || 0))}
                      class="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-xl font-mono text-center font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Quick Preset Chips */}
                <div class="flex flex-wrap gap-2 mt-4">
                  <span class="text-xs text-on-surface-variant self-center mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(0, 1, 0)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    1m
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(0, 5, 0)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    5m
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(0, 15, 0)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(0, 25, 0)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-primary font-semibold transition cursor-pointer"
                  >
                    25m Pomodoro
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(0, 45, 0)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    45m
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDuration(1, 0, 0)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    1h
                  </button>
                </div>
              </div>
            </Show>

            <Show when={mode() === 'endTime'}>
              <div>
                <label class="block text-sm font-semibold text-on-surface mb-2">
                  Target End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endTimeInput()}
                  onInput={(e) => setEndTimeInput(e.currentTarget.value)}
                  class="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {/* Quick Shortcuts */}
                <div class="flex flex-wrap gap-2 mt-4">
                  <span class="text-xs text-on-surface-variant self-center mr-1">Quick:</span>
                  <button
                    type="button"
                    onClick={() => addEndTimeMinutes(15)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    +15 mins
                  </button>
                  <button
                    type="button"
                    onClick={() => addEndTimeMinutes(60)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    +1 hour
                  </button>
                  <button
                    type="button"
                    onClick={setEndTimeEndOfDay}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    End of Day
                  </button>
                  <button
                    type="button"
                    onClick={() => addEndTimeMinutes(24 * 60)}
                    class="px-3 py-1 text-xs rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition cursor-pointer"
                  >
                    +24 hours
                  </button>
                </div>
              </div>
            </Show>

            {/* Options Row: Sound Toggle & Animation Toggle */}
            <div class="space-y-3">
              {/* Sound Toggle */}
              <div class="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline-variant">
                <div class="flex items-center gap-3">
                  <div class={`p-2.5 rounded-xl ${soundEnabled() ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {soundEnabled() ? <Volume2 class="w-5 h-5" /> : <VolumeX class="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 class="font-semibold text-sm text-on-surface">Audio Chime on Zero</h4>
                    <p class="text-xs text-on-surface-variant">
                      {soundEnabled() ? 'Chime plays with dismiss button at 00:00:00' : 'Silent countdown (continues seamlessly into negatives)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled())}
                  class={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                    soundEnabled() ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                  role="switch"
                  aria-checked={soundEnabled()}
                >
                  <span
                    class={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      soundEnabled() ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Animation Toggle */}
              <div class="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline-variant">
                <div class="flex items-center gap-3">
                  <div class={`p-2.5 rounded-xl ${animationEnabled() ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {animationEnabled() ? <Zap class="w-5 h-5" /> : <ZapOff class="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 class="font-semibold text-sm text-on-surface">Digit Roll Animation</h4>
                    <p class="text-xs text-on-surface-variant">
                      {animationEnabled() ? 'Smooth CSS roll on digit changes' : 'Instant static digits (no animations)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnimationEnabled(!animationEnabled())}
                  class={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                    animationEnabled() ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                  role="switch"
                  aria-checked={animationEnabled()}
                >
                  <span
                    class={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      animationEnabled() ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Shareable Link & Launch Section */}
          <div class="pt-4 border-t border-outline-variant space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Shareable URL Preview
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  value={fullPreviewUrl()}
                  class="flex-1 bg-surface-container font-mono text-xs text-on-surface-variant px-4 py-3 rounded-xl border border-outline-variant select-all overflow-ellipsis"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  class="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-medium text-sm transition cursor-pointer shrink-0"
                >
                  {copied() ? <Check class="w-4 h-4 text-primary" /> : <Copy class="w-4 h-4" />}
                  <span>{copied() ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Launch Countdown CTA */}
            <button
              type="button"
              onClick={handleLaunch}
              class="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-lg shadow-lg hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Play class="w-5 h-5 fill-current" />
              <span>Launch Distraction-Free Countdown</span>
            </button>
          </div>
        </main>

        {/* Theming Section (Landing Page Only) */}
        <section class="bg-surface rounded-3xl border border-outline-variant p-6 sm:p-8 space-y-6">
          <div class="flex items-center gap-2 text-primary">
            <Palette class="w-5 h-5" />
            <h2 class="font-bold text-lg text-on-surface">Material Design Color Theme</h2>
          </div>
          <p class="text-xs text-on-surface-variant">
            Dynamic Material color schemes generated using Google's Material Color Utilities and saved to your device.
          </p>

          <div class="space-y-4">
            {/* Color Presets */}
            <div>
              <label class="block text-xs font-semibold text-on-surface-variant mb-2">
                Theme Seed Color
              </label>
              <div class="flex flex-wrap items-center gap-3">
                <For each={PRESET_COLORS}>
                  {(preset) => (
                    <button
                      type="button"
                      onClick={() => updateThemePreferences({ color: preset.hex })}
                      class={`w-9 h-9 rounded-full transition-transform cursor-pointer border-2 ${
                        themeConfig().color.toLowerCase() === preset.hex.toLowerCase()
                          ? 'scale-110 border-on-surface shadow-md ring-2 ring-primary/40'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ 'background-color': preset.hex }}
                      title={preset.name}
                    />
                  )}
                </For>

                {/* Custom Color Input */}
                <label class="relative w-9 h-9 rounded-full border-2 border-outline flex items-center justify-center overflow-hidden cursor-pointer hover:border-on-surface transition">
                  <input
                    type="color"
                    value={themeConfig().color}
                    onInput={(e) => updateThemePreferences({ color: e.currentTarget.value })}
                    class="absolute -inset-2 w-14 h-14 cursor-pointer opacity-0"
                    title="Custom Color"
                  />
                  <div
                    class="w-full h-full"
                    style={{ 'background-color': themeConfig().color }}
                  />
                </label>
              </div>
            </div>

            {/* Dark / Light Mode & Contrast */}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div class="flex items-center justify-between p-3.5 bg-surface-container rounded-2xl border border-outline-variant">
                <div class="flex items-center gap-2.5">
                  {themeConfig().isDark ? <Moon class="w-4 h-4 text-primary" /> : <Sun class="w-4 h-4 text-primary" />}
                  <span class="text-sm font-medium text-on-surface">Dark Theme</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateThemePreferences({ isDark: !themeConfig().isDark })}
                  class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    themeConfig().isDark ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      themeConfig().isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div class="flex items-center justify-between p-3.5 bg-surface-container rounded-2xl border border-outline-variant">
                <div class="flex items-center gap-2.5">
                  <Sliders class="w-4 h-4 text-primary" />
                  <span class="text-sm font-medium text-on-surface">Contrast: {themeConfig().contrastLevel > 0 ? (themeConfig().contrastLevel === 1 ? 'High' : 'Medium') : 'Standard'}</span>
                </div>
                <div class="flex gap-1">
                  <button
                    type="button"
                    onClick={() => updateThemePreferences({ contrastLevel: 0 })}
                    class={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${themeConfig().contrastLevel === 0 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => updateThemePreferences({ contrastLevel: 0.5 })}
                    class={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${themeConfig().contrastLevel === 0.5 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    0.5
                  </button>
                  <button
                    type="button"
                    onClick={() => updateThemePreferences({ contrastLevel: 1 })}
                    class={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${themeConfig().contrastLevel === 1 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    1.0
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation / Manual Hash Parameters Guide */}
        <footer class="bg-surface/50 rounded-2xl border border-outline-variant/60 p-5 text-xs text-on-surface-variant space-y-2">
          <div class="flex items-center gap-2 text-on-surface font-semibold">
            <Info class="w-4 h-4 text-primary" />
            <span>Direct Hash Parameters</span>
          </div>
          <p>
            You can customize or share countdowns directly in your browser's address bar:
          </p>
          <ul class="list-disc pl-5 space-y-1 font-mono text-[11px]">
            <li><code>/countdown#duration=10m</code> - Start 10-minute countdown relative to page load</li>
            <li><code>/countdown#duration=1h30m&sound=true</code> - 90-minute timer with audio chime on finish</li>
            <li><code>/countdown#duration=5m&animate=false</code> - Static digital display without rolling animation</li>
            <li><code>/countdown#endTime=2026-12-31T23:59:59Z</code> - Countdown to specific UTC ISO date</li>
            <li><code>/countdown#startTime=...&duration=45m</code> - Scheduled window countdown</li>
          </ul>
        </footer>

      </div>
    </div>
  );
}
