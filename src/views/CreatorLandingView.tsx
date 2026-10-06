import { createSignal, createMemo, For, Show } from 'solid-js';
import { themeConfig, updateThemePreferences } from '../theme/materialTheme';
import { navigate } from '../utils/router';
import {
  parseSmartDuration,
  formatDurationHuman,
  type ParsedDuration,
} from '../utils/timeParser';
import { DurationField } from '../components/DurationField';
import type { CountdownConfig } from '../utils/router';
import { currentRoute } from '../utils/router';
import {
  Timer,
  Calendar,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Play,
  Palette,
  Sun,
  Moon,
  Sliders,
  Zap,
  ZapOff,
} from 'lucide-solid';

type Mode = 'timer' | 'countdown';

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

export interface CreatorLandingViewProps {
  config?: CountdownConfig;
}

export function CreatorLandingView(props?: CreatorLandingViewProps) {
  const initialConfig = () => props?.config || currentRoute().config;

  const [mode, setMode] = createSignal<Mode>('timer');

  // Smart duration text input (populated from config if present, or empty on page load)
  const getInitialDuration = () => {
    const cfg = initialConfig();
    if (cfg.rawDuration) return cfg.rawDuration;
    if (cfg.durationSeconds && cfg.durationSeconds > 0) return formatDurationHuman(cfg.durationSeconds);
    return '';
  };

  const [durationInput, setDurationInput] = createSignal<string>(getInitialDuration());
  const parsedDuration = createMemo<ParsedDuration>(() => parseSmartDuration(durationInput()));

  // End Time field (ISO local string)
  const defaultEndTime = () => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [endTimeInput, setEndTimeInput] = createSignal<string>(defaultEndTime());

  // Sound toggle (initialized from config)
  const [soundEnabled, setSoundEnabled] = createSignal<boolean>(initialConfig().sound ?? false);

  // Animation toggle (initialized from config)
  const [animationEnabled, setAnimationEnabled] = createSignal<boolean>(initialConfig().animate ?? true);

  // Clipboard copy state
  const [copied, setCopied] = createSignal<boolean>(false);


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
    const p = parsedDuration();
    return p.isValid ? p.totalSeconds : 0;
  });

  // Build the launch URL with automatic startTime upon launch
  const buildLaunchUrl = () => {
    const currentMode = mode();
    const params: string[] = [];

    if (currentMode === 'timer') {
      const nowIso = new Date().toISOString();
      params.push(`startTime=${encodeURIComponent(nowIso)}`);
      params.push(`duration=${totalDurationSeconds()}s`);
    } else if (currentMode === 'countdown') {
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

    if (currentMode === 'timer') {
      params.push(`duration=${totalDurationSeconds()}s`);
    } else if (currentMode === 'countdown') {
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
        
        {/* Header */}
        <header class="text-center">
          <h1 class="text-5xl sm:text-6xl font-black tracking-tight text-primary font-mono">
            Kairos
          </h1>
        </header>

        {/* Main Configuration Card */}
        <main class="bg-surface rounded-3xl border border-outline-variant p-6 sm:p-8 shadow-xl space-y-8">
          
          {/* Mode Selector */}
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Mode
            </label>
            <div class="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-2xl border border-outline-variant">
              <button
                type="button"
                onClick={() => setMode('timer')}
                class={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  mode() === 'timer'
                    ? 'bg-primary text-on-primary shadow-md font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <Timer class="w-4 h-4" />
                <span>Timer</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('countdown')}
                class={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  mode() === 'countdown'
                    ? 'bg-primary text-on-primary shadow-md font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <Calendar class="w-4 h-4" />
                <span>Countdown</span>
              </button>
            </div>
          </div>

          {/* Configuration Form */}
          <div class="space-y-6">
            <Show when={mode() === 'timer'}>
              <DurationField
                value={durationInput()}
                onChange={setDurationInput}
                parsed={parsedDuration()}
              />
            </Show>

            <Show when={mode() === 'countdown'}>
              <div>
                <label class="block text-sm font-semibold text-on-surface mb-2">
                  End Time
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
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sound Toggle */}
              <div class="flex items-center justify-between p-3.5 bg-surface-container rounded-2xl border border-outline-variant">
                <div class="flex items-center gap-2.5">
                  <div class={`p-2 rounded-xl ${soundEnabled() ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {soundEnabled() ? <Volume2 class="w-4 h-4" /> : <VolumeX class="w-4 h-4" />}
                  </div>
                  <span class="font-semibold text-sm text-on-surface">Sound</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled())}
                  class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    soundEnabled() ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                  role="switch"
                  aria-checked={soundEnabled()}
                >
                  <span
                    class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled() ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Animation Toggle */}
              <div class="flex items-center justify-between p-3.5 bg-surface-container rounded-2xl border border-outline-variant">
                <div class="flex items-center gap-2.5">
                  <div class={`p-2 rounded-xl ${animationEnabled() ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {animationEnabled() ? <Zap class="w-4 h-4" /> : <ZapOff class="w-4 h-4" />}
                  </div>
                  <span class="font-semibold text-sm text-on-surface">Animation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnimationEnabled(!animationEnabled())}
                  class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    animationEnabled() ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                  role="switch"
                  aria-checked={animationEnabled()}
                >
                  <span
                    class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      animationEnabled() ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Share URL & Launch Section */}
          <div class="pt-4 border-t border-outline-variant space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Share URL
              </label>
              <div class="relative flex items-center">
                <input
                  type="text"
                  readonly
                  value={fullPreviewUrl()}
                  onClick={(e) => e.currentTarget.select()}
                  class="w-full bg-surface-container font-mono text-xs text-on-surface-variant pl-4 pr-11 py-3 rounded-xl border border-outline-variant select-all overflow-ellipsis cursor-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title={copied() ? 'Copied to clipboard!' : 'Copy to clipboard'}
                  aria-label="Copy URL"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high active:scale-95 transition cursor-pointer"
                >
                  {copied() ? <Check class="w-4 h-4 text-primary" /> : <Copy class="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Launch CTA */}
            <button
              type="button"
              onClick={handleLaunch}
              class="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-lg shadow-lg hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Play class="w-5 h-5 fill-current" />
              <span>{mode() === 'timer' ? 'Start Timer' : 'Start Countdown'}</span>
            </button>
          </div>
        </main>

        {/* Theming Section (Landing Page Only) */}
        <section class="bg-surface rounded-3xl border border-outline-variant p-6 sm:p-8 space-y-6">
          <div class="flex items-center gap-2 text-primary">
            <Palette class="w-5 h-5" />
            <h2 class="font-bold text-lg text-on-surface">Theme</h2>
          </div>

          <div class="space-y-4">
            {/* Color Presets */}
            <div>
              <label class="block text-xs font-semibold text-on-surface-variant mb-2">
                Accent
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
                  <span class="text-sm font-medium text-on-surface">Dark Mode</span>
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

      </div>
    </div>
  );
}
