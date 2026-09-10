import { createSignal } from 'solid-js';
import { parseDurationToSeconds, parseDateToMs } from './timeParser';

export interface CountdownConfig {
  durationSeconds: number | null;
  rawDuration: string | null;
  startTimeMs: number | null;
  endTimeMs: number | null;
  sound: boolean;
  animate: boolean;
  /** Start time initialized at page load for relative timers (duration without startTime/endTime) */
  sessionStartMs: number;
}

export interface AppRouteState {
  path: 'create' | 'countdown';
  config: CountdownConfig;
}

function parseHashParams(hash: string): Record<string, string> {
  const cleanHash = hash.replace(/^[#/?]+/, '');
  const params: Record<string, string> = {};
  if (!cleanHash) return params;

  // If hash has key=value pairs: e.g. "duration=5m&sound=true"
  if (cleanHash.includes('=')) {
    const pairs = cleanHash.split('&');
    for (const pair of pairs) {
      const [key, val] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key).trim()] = decodeURIComponent(val || '').trim();
      }
    }
  } else {
    // Shorthand direct hash: e.g. "#5m" or "#300"
    params['duration'] = decodeURIComponent(cleanHash).trim();
  }

  return params;
}

function resolveConfig(hash: string): CountdownConfig {
  const params = parseHashParams(hash);

  const rawDuration = params['duration'] || params['d'] || null;
  const durationSeconds = parseDurationToSeconds(rawDuration);

  const rawStart = params['startTime'] || params['start'] || params['st'] || null;
  const startTimeMs = parseDateToMs(rawStart);

  const rawEnd = params['endTime'] || params['end'] || params['et'] || null;
  const endTimeMs = parseDateToMs(rawEnd);

  const rawSound = params['sound'] || params['snd'] || params['audio'] || 'false';
  const sound = rawSound.toLowerCase() === 'true' || rawSound === '1' || rawSound === 'yes';

  const rawAnimate = params['animate'] ?? params['anim'] ?? params['animation'] ?? 'true';
  const animate = !(rawAnimate.toLowerCase() === 'false' || rawAnimate === '0' || rawAnimate === 'no');

  return {
    durationSeconds,
    rawDuration,
    startTimeMs,
    endTimeMs,
    sound,
    animate,
    sessionStartMs: Date.now(),
  };
}

function getCurrentState(): AppRouteState {
  if (typeof window === 'undefined') {
    return {
      path: 'create',
      config: {
        durationSeconds: 300,
        rawDuration: '5m',
        startTimeMs: null,
        endTimeMs: null,
        sound: false,
        animate: true,
        sessionStartMs: Date.now(),
      },
    };
  }

  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash;

  // Check if route is countdown
  let path: 'create' | 'countdown' = 'create';
  if (pathname.endsWith('/countdown') || pathname === '/countdown') {
    path = 'countdown';
  } else if (pathname === '' || pathname === '/' || pathname === '/create' || pathname.endsWith('/create')) {
    path = 'create';
  } else {
    path = 'create';
  }

  return {
    path,
    config: resolveConfig(hash),
  };
}

const [currentRoute, setCurrentRoute] = createSignal<AppRouteState>(getCurrentState());

if (typeof window !== 'undefined') {
  const updateRoute = () => {
    setCurrentRoute(getCurrentState());
  };

  window.addEventListener('popstate', updateRoute);
  window.addEventListener('hashchange', updateRoute);
}

export function navigate(url: string): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', url);
  setCurrentRoute(getCurrentState());
}

export { currentRoute };
