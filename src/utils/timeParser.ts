export interface ParsedDuration {
  input: string;
  totalSeconds: number;
  formatted: string;
  isValid: boolean;
  error?: string;
}

export type TokenType =
  | 'TIME_VALUE'
  | 'NUMBER'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: number;
  pos: number;
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/**
 * Character-by-character scanner (Lexer) for duration math expressions.
 * Converts characters into structured tokens without regexes.
 */
export function tokenizeDuration(input: string): { tokens: Token[]; error?: string } {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    if (isWhitespace(ch)) {
      i++;
      continue;
    }

    const startPos = i;

    if (ch === '+') {
      tokens.push({ type: 'PLUS', value: 0, pos: startPos });
      i++;
      continue;
    }
    if (ch === '-') {
      tokens.push({ type: 'MINUS', value: 0, pos: startPos });
      i++;
      continue;
    }
    if (ch === '*' || ch === 'x' || ch === 'X') {
      tokens.push({ type: 'STAR', value: 0, pos: startPos });
      i++;
      continue;
    }
    if (ch === '/') {
      tokens.push({ type: 'SLASH', value: 0, pos: startPos });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: 0, pos: startPos });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: 0, pos: startPos });
      i++;
      continue;
    }

    // Number or decimal digit
    if (isDigit(ch) || (ch === '.' && i + 1 < n && isDigit(input[i + 1]))) {
      let numStr = '';
      while (i < n && (isDigit(input[i]) || input[i] === '.')) {
        if (input[i] === '.' && numStr.includes('.')) break;
        numStr += input[i];
        i++;
      }

      // Check if followed by colon ':'
      if (i < n && input[i] === ':') {
        i++; // skip ':'
        let minStr = '';
        while (i < n && isDigit(input[i])) {
          minStr += input[i];
          i++;
        }
        if (minStr.length === 0) {
          return { tokens: [], error: `Expected digits after ':' at position ${i + 1}` };
        }

        // Check if followed by second colon ':' (HH:MM:SS)
        if (i < n && input[i] === ':') {
          i++; // skip second ':'
          let secStr = '';
          while (i < n && isDigit(input[i])) {
            secStr += input[i];
            i++;
          }
          if (secStr.length === 0) {
            return { tokens: [], error: `Expected digits after second ':' at position ${i + 1}` };
          }

          const hours = parseFloat(numStr);
          const minutes = parseFloat(minStr);
          const seconds = parseFloat(secStr);
          const totalSec = hours * 3600 + minutes * 60 + seconds;
          tokens.push({ type: 'TIME_VALUE', value: totalSec, pos: startPos });
          continue;
        } else {
          // HH:MM format
          const hours = parseFloat(numStr);
          const minutes = parseFloat(minStr);
          const totalSec = hours * 3600 + minutes * 60;
          tokens.push({ type: 'TIME_VALUE', value: totalSec, pos: startPos });
          continue;
        }
      }

      // Check for unit suffix (e.g. 1h, 30m, 45s, 1.5hours)
      let unitCheckPos = i;
      while (unitCheckPos < n && isWhitespace(input[unitCheckPos])) {
        unitCheckPos++;
      }

      if (unitCheckPos < n && isAlpha(input[unitCheckPos])) {
        let unitStr = '';
        i = unitCheckPos;
        while (i < n && isAlpha(input[i])) {
          unitStr += input[i].toLowerCase();
          i++;
        }

        const numVal = parseFloat(numStr);
        let multiplier: number | null = null;

        if (unitStr === 's' || unitStr === 'sec' || unitStr === 'secs' || unitStr === 'second' || unitStr === 'seconds') {
          multiplier = 1;
        } else if (unitStr === 'm' || unitStr === 'min' || unitStr === 'mins' || unitStr === 'minute' || unitStr === 'minutes') {
          multiplier = 60;
        } else if (unitStr === 'h' || unitStr === 'hr' || unitStr === 'hrs' || unitStr === 'hour' || unitStr === 'hours') {
          multiplier = 3600;
        } else if (unitStr === 'd' || unitStr === 'day' || unitStr === 'days') {
          multiplier = 86400;
        }

        if (multiplier !== null) {
          tokens.push({ type: 'TIME_VALUE', value: numVal * multiplier, pos: startPos });
          continue;
        } else {
          return { tokens: [], error: `Unknown unit '${unitStr}' at position ${unitCheckPos + 1}` };
        }
      }

      // Pure numeric scalar
      const numVal = parseFloat(numStr);
      tokens.push({ type: 'NUMBER', value: numVal, pos: startPos });
      continue;
    }

    return { tokens: [], error: `Unexpected character '${ch}' at position ${i + 1}` };
  }

  tokens.push({ type: 'EOF', value: 0, pos: i });
  return { tokens };
}

/**
 * Recursive Descent Parser & Evaluator for mathematical duration expressions.
 */
export function evaluateDurationTokens(tokens: Token[]): { result?: number; error?: string } {
  let idx = 0;

  function current(): Token {
    return tokens[idx] || { type: 'EOF', value: 0, pos: 0 };
  }

  function advance(): Token {
    const t = current();
    idx++;
    return t;
  }

  function parsePrimary(): number {
    const tok = current();

    // Unary plus
    if (tok.type === 'PLUS') {
      advance();
      return parsePrimary();
    }

    // Unary minus
    if (tok.type === 'MINUS') {
      advance();
      return -parsePrimary();
    }

    // Parentheses
    if (tok.type === 'LPAREN') {
      advance();
      const val = parseExpression();
      if (current().type !== 'RPAREN') {
        throw new Error("Expected closing parenthesis ')'");
      }
      advance();
      return val;
    }

    // Time value (including composite consecutive time values like "1h 30m 15s")
    if (tok.type === 'TIME_VALUE') {
      let total = advance().value;
      while (current().type === 'TIME_VALUE') {
        total += advance().value;
      }
      return total;
    }

    // Scalar number
    if (tok.type === 'NUMBER') {
      return advance().value;
    }

    throw new Error(`Unexpected token '${tok.type}' at position ${tok.pos + 1}`);
  }

  function parseTerm(): number {
    let left = parsePrimary();

    while (current().type === 'STAR' || current().type === 'SLASH') {
      const op = current().type;
      advance();
      const right = parsePrimary();

      if (op === 'STAR') {
        left = left * right;
      } else {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        left = left / right;
      }
    }

    return left;
  }

  function parseExpression(): number {
    let left = parseTerm();

    while (current().type === 'PLUS' || current().type === 'MINUS') {
      const op = current().type;
      advance();
      const right = parseTerm();

      if (op === 'PLUS') {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  try {
    if (tokens.length === 0 || (tokens.length === 1 && tokens[0].type === 'EOF')) {
      throw new Error('Empty expression');
    }

    const res = parseExpression();

    if (current().type !== 'EOF') {
      throw new Error(`Unexpected trailing input at position ${current().pos + 1}`);
    }

    if (isNaN(res) || !isFinite(res)) {
      throw new Error('Invalid calculation result');
    }

    return { result: res };
  } catch (err: any) {
    return { error: err?.message || 'Invalid syntax' };
  }
}

/**
 * Formats seconds into clean structured breakdown and clock format.
 * e.g. "7h 10m 00s (07:10:00)" or "30m 00s (00:30:00)"
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
 * Evaluates duration expression using Tokenizer and Recursive Descent Parser.
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

  const { tokens, error: tokenError } = tokenizeDuration(trimmed);
  if (tokenError) {
    return {
      input,
      totalSeconds: 0,
      formatted: tokenError,
      isValid: false,
      error: tokenError,
    };
  }

  const { result, error: parseError } = evaluateDurationTokens(tokens);
  if (parseError || result === undefined) {
    return {
      input,
      totalSeconds: 0,
      formatted: parseError || 'Invalid expression',
      isValid: false,
      error: parseError || 'Invalid expression',
    };
  }

  if (result < 0) {
    return {
      input,
      totalSeconds: 0,
      formatted: 'Duration cannot be negative',
      isValid: false,
      error: 'Duration cannot be negative',
    };
  }

  const rounded = Math.round(result);
  return {
    input,
    totalSeconds: rounded,
    formatted: formatDurationHuman(rounded),
    isValid: true,
  };
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
