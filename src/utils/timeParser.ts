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
    // If 10 digits, it's seconds; if 13 digits, milliseconds
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
