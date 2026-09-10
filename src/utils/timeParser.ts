import * as chrono from 'chrono-node';
import { create, all } from 'mathjs';
import { evaluateWithQalculate, normalizeDurationExpression } from './qalculateEngine';

const math = create(all);

export interface ParsedDuration {
  input: string;
  totalSeconds: number;
  formatted: string;
  isValid: boolean;
  error?: string;
  engine?: string;
}

/**
 * Formats seconds into a clean, human-readable breakdown and clock format.
 * e.g. "5h 00m 00s (05:00:00)" or "5m 00s (00:05:00)"
 */
export function formatDurationHuman(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s (00:00:00)';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  let breakdown = '';
  let clock = '';

  if (days > 0) {
    breakdown = `${days}d ${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    clock = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (hours > 0) {
    breakdown = `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    breakdown = `${minutes}m ${pad(seconds)}s`;
    clock = `00:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${breakdown} (${clock})`;
}

/**
 * Fast synchronous parser using chrono-node, mathjs, and pattern normalization.
 */
export function parseFastSyncDuration(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  // 1. Try Chrono for natural language date/time ranges (e.g. "8am to 5pm", "8:00 to 17:30")
  try {
    const chronoResults = chrono.parse(raw);
    if (chronoResults.length > 0 && chronoResults[0].end) {
      const start = chronoResults[0].start.date();
      const end = chronoResults[0].end.date();
      const diffSec = Math.abs(Math.floor((end.getTime() - start.getTime()) / 1000));
      if (diffSec > 0) {
        return diffSec;
      }
    }
  } catch {
    // ignore
  }

  // 2. Normalize expressions with duration-aware preprocessor
  const expr = normalizeDurationExpression(raw);

  // Evaluate with mathjs
  try {
    const result = math.evaluate(expr);
    if (result && typeof result === 'object' && 'isUnit' in result) {
      const sec = Math.abs(Math.round((result as any).toNumber('second')));
      if (!isNaN(sec) && sec >= 0) return sec;
    } else if (typeof result === 'number') {
      const sec = Math.abs(Math.round(result));
      if (!isNaN(sec) && sec >= 0) return sec;
    }
  } catch {
    // ignore
  }

  // Fallback to basic duration regex
  return parseDurationToSeconds(input);
}

/**
 * Parses duration intelligently using Qalculate WASM with fast fallback.
 */
export async function parseSmartDurationAsync(input: string): Promise<ParsedDuration> {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      input,
      totalSeconds: 0,
      formatted: 'Enter a duration (e.g., 30m, 30:00, 08:00-03:00)',
      isValid: false,
    };
  }

  // Try Qalculate! WASM first
  try {
    const qalcSec = await evaluateWithQalculate(trimmed);
    if (qalcSec !== null && qalcSec > 0) {
      return {
        input,
        totalSeconds: qalcSec,
        formatted: formatDurationHuman(qalcSec),
        isValid: true,
        engine: 'Qalculate!',
      };
    }
  } catch {
    // fallback
  }

  // Fallback to fast multi-engine parser
  const fallbackSec = parseFastSyncDuration(trimmed);
  if (fallbackSec !== null && fallbackSec > 0) {
    return {
      input,
      totalSeconds: fallbackSec,
      formatted: formatDurationHuman(fallbackSec),
      isValid: true,
      engine: 'Smart Parser',
    };
  }

  return {
    input,
    totalSeconds: 0,
    formatted: 'Invalid duration expression',
    isValid: false,
    error: 'Could not parse duration',
  };
}

/**
 * Parses duration string or number into total seconds.
 * Supports: "300", "300s", "5m", "1h", "1h30m", "1d2h30m45s", "90s", "PT5M"
 */
export function parseDurationToSeconds(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const str = String(input).trim();
  if (!str) return null;

  // Pure number of seconds
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Math.floor(parseFloat(str));
  }

  // Regex for composite duration (e.g. 1d 2h 30m 45s)
  const regex = /(?:(\d+(?:\.\d+)?)\s*d(?:ays?)?)?\s*(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:inutes?|ins?)?)?\s*(?:(\d+(?:\.\d+)?)\s*s(?:econds?|ecs?)?)?/i;
  const match = str.match(regex);
  if (match && (match[1] || match[2] || match[3] || match[4])) {
    const days = parseFloat(match[1] || '0');
    const hours = parseFloat(match[2] || '0');
    const minutes = parseFloat(match[3] || '0');
    const seconds = parseFloat(match[4] || '0');
    return Math.floor(days * 86400 + hours * 3600 + minutes * 60 + seconds);
  }

  return null;
}

/**
 * Parses timestamp or ISO date string into Unix milliseconds.
 */
export function parseDateToMs(input: string | number | null | undefined): number | null {
  if (!input) return null;
  const str = String(input).trim();
  if (!str) return null;

  // Numeric epoch timestamp (seconds or milliseconds)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return str.length <= 10 ? num * 1000 : num;
  }

  // Parse ISO / Date string
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return null;
}

export interface TimeDisplay {
  isNegative: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  hasDays: boolean;
}

/**
 * Formats time difference in milliseconds into structured countdown components.
 */
export function formatTimeDifference(deltaMs: number): TimeDisplay {
  const isNegative = deltaMs < 0;
  const totalSeconds = Math.floor(Math.abs(deltaMs) / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const sign = isNegative ? '-' : '';

  let formatted = '';
  const hasDays = days > 0;

  if (hasDays) {
    formatted = `${sign}${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    formatted = `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return {
    isNegative,
    days,
    hours,
    minutes,
    seconds,
    formatted,
    hasDays,
  };
}
