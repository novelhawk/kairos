import {
  Parser,
  result,
  char,
  stringCI,
  altMany,
  many,
  chainl1,
  token,
  symbol,
  nat,
  digits,
  decimal,
  spaces,
  isDigit,
} from './monadicParser.ts';

export interface ParsedDuration {
  input: string;
  totalSeconds: number;
  formatted: string;
  isValid: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Monadic Duration Grammar
// ---------------------------------------------------------------------------

/**
 * Parses colon time format (HH:MM or HH:MM:SS)
 * e.g. "08:00" -> 28,800s, "00:30" -> 1,800s, "01:30:00" -> 5,400s
 */
const timeColon: Parser<number> = nat.bind((h) =>
  char(':').bind(() =>
    digits.bind((mStr) => {
      const m = parseInt(mStr, 10);
      return char(':')
        .bind(() =>
          digits.bind((sStr) => {
            const s = parseInt(sStr, 10);
            return result(h * 3600 + m * 60 + s);
          })
        )
        .alt(result(h * 3600 + m * 60));
    })
  )
);

// Suffix units
const dayUnit: Parser<number> = altMany([
  stringCI('days'),
  stringCI('day'),
  stringCI('d'),
]).map(() => 86400);

const hourUnit: Parser<number> = altMany([
  stringCI('hours'),
  stringCI('hour'),
  stringCI('hrs'),
  stringCI('hr'),
  stringCI('h'),
]).map(() => 3600);

const minuteUnit: Parser<number> = altMany([
  stringCI('minutes'),
  stringCI('minute'),
  stringCI('mins'),
  stringCI('min'),
  stringCI('m'),
]).map(() => 60);

const secondUnit: Parser<number> = altMany([
  stringCI('seconds'),
  stringCI('second'),
  stringCI('secs'),
  stringCI('sec'),
  stringCI('s'),
]).map(() => 1);

const unitSuffix: Parser<number> = altMany([
  secondUnit,
  minuteUnit,
  hourUnit,
  dayUnit,
]);

/**
 * Parses a number followed by a duration unit (e.g. "1.5h", "30 mins", "45s")
 */
const timeSuffixed: Parser<number> = decimal.bind((num) =>
  spaces.bind(() =>
    unitSuffix.bind((mult) =>
      result(num * mult)
    )
  )
);

/**
 * Single duration item (either colon notation or suffixed duration)
 */
const singleDuration: Parser<number> = timeColon.alt(timeSuffixed);

/**
 * Compound duration sequence without operators (e.g. "1h 30m 15s")
 */
const compoundDuration: Parser<number> = singleDuration.bind((first) =>
  many(spaces.bind(() => singleDuration)).bind((rest) =>
    result(rest.reduce((acc, v) => acc + v, first))
  )
);

// Arithmetic operator combinators
const addOp: Parser<(a: number, b: number) => number> = symbol('+')
  .map(() => (a: number, b: number) => a + b)
  .alt(
    symbol('-').map(() => (a: number, b: number) => a - b)
  );

const mulOp: Parser<(a: number, b: number) => number> = symbol('*')
  .alt(symbol('x'))
  .alt(symbol('X'))
  .map(() => (a: number, b: number) => a * b)
  .alt(
    symbol('/').map(() => (a: number, b: number) => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    })
  );

// Mutually recursive grammar using Parser delegation
const factor: Parser<number> = new Parser((inp) => {
  const parenExpr = symbol('(').bind(() =>
    expr.bind((val) =>
      symbol(')').bind(() =>
        result(val)
      )
    )
  );
  return parenExpr
    .alt(token(compoundDuration))
    .alt(token(decimal))
    .run(inp);
});

const term: Parser<number> = chainl1(factor, mulOp);

export const expr: Parser<number> = chainl1(term, addOp);

// ---------------------------------------------------------------------------
// Human Formatting & Helper Utilities
// ---------------------------------------------------------------------------

/**
 * Formats seconds into a clean structured breakdown and clock format.
 * e.g. "7h 10m 00s (07:10:00)" or "30m 00s (00:30:00)" or "45s (00:00:45)"
 */
export function formatDurationHuman(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s (00:00:00)';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  let breakdown = '';
  let clock = '';

  if (days > 0) {
    breakdown = `${days}d ${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    clock = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (hours > 0) {
    breakdown = `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (minutes > 0) {
    breakdown = `${minutes}m ${pad(seconds)}s`;
    clock = `00:${pad(minutes)}:${pad(seconds)}`;
  } else {
    breakdown = `${seconds}s`;
    clock = `00:00:${pad(seconds)}`;
  }

  return `${breakdown} (${clock})`;
}

/**
 * Evaluates duration expression using the Monadic Parser.
 */
export function parseSmartDuration(input: string): ParsedDuration {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      input,
      totalSeconds: 0,
      formatted: 'Enter a duration (e.g., 08:00-00:30, 01:00, 1h - 15m)',
      isValid: false,
    };
  }

  try {
    const results = token(expr).run(trimmed);
    if (results.length === 0) {
      return {
        input,
        totalSeconds: 0,
        formatted: 'Invalid syntax',
        isValid: false,
        error: 'Invalid syntax',
      };
    }

    const [val, rest] = results[0];
    if (rest.trim().length > 0) {
      return {
        input,
        totalSeconds: 0,
        formatted: `Unexpected trailing input: "${rest.trim()}"`,
        isValid: false,
        error: `Unexpected trailing input: "${rest.trim()}"`,
      };
    }

    if (isNaN(val) || !isFinite(val)) {
      return {
        input,
        totalSeconds: 0,
        formatted: 'Invalid calculation result',
        isValid: false,
        error: 'Invalid calculation result',
      };
    }

    if (val < 0) {
      return {
        input,
        totalSeconds: 0,
        formatted: 'Duration cannot be negative',
        isValid: false,
        error: 'Duration cannot be negative',
      };
    }

    const rounded = Math.round(val);
    return {
      input,
      totalSeconds: rounded,
      formatted: formatDurationHuman(rounded),
      isValid: true,
    };
  } catch (err: any) {
    return {
      input,
      totalSeconds: 0,
      formatted: err?.message || 'Calculation error',
      isValid: false,
      error: err?.message || 'Calculation error',
    };
  }
}

/**
 * Parses duration string or number into total seconds for router hash compatibility.
 */
export function parseDurationToSeconds(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const str = String(input).trim();
  if (!str) return null;

  const parsed = parseSmartDuration(str);
  return parsed.isValid ? parsed.totalSeconds : null;
}

/**
 * Parses timestamp or ISO date string into Unix milliseconds.
 */
export function parseDateToMs(input: string | number | null | undefined): number | null {
  if (!input) return null;
  const str = String(input).trim();
  if (!str) return null;

  // Numeric epoch timestamp (seconds or milliseconds)
  if (str.length > 0 && Array.from(str).every(isDigit)) {
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
