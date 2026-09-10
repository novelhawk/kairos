import loadLibqalculate from 'libqalculate-wasm';

interface QalculateModule {
  calculate(calculation: string, timeout: number, optionFlags: number): {
    input: string;
    output: string;
    messages: string[];
  };
}

let qalculateInstance: QalculateModule | null = null;
let loadPromise: Promise<QalculateModule | null> | null = null;

/**
 * Loads and initializes the libqalculate WebAssembly module.
 */
export async function getQalculate(): Promise<QalculateModule | null> {
  if (qalculateInstance) return qalculateInstance;

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const instance = await loadLibqalculate({
          locateFile: (path: string) => {
            if (typeof window !== 'undefined') {
              return `/${path}`;
            }
            return path;
          },
        });
        qalculateInstance = instance as QalculateModule;
        return qalculateInstance;
      } catch (err) {
        console.warn('Failed to load libqalculate-wasm:', err);
        return null;
      }
    })();
  }

  return loadPromise;
}

/**
 * Normalizes human and timer notation into unambiguous unit expressions for Qalculate.
 * e.g.
 * - "5:00" -> "(5 min) + (00 s)"
 * - "30:00" -> "(30 min) + (00 s)"
 * - "1:30:00" -> "(1 hours) + (30 min) + (00 s)"
 * - "08:00 - 03:00" -> "((8 hours) + (0 min)) - ((3 hours) + (0 min))"
 * - "1h - 15m" -> "(1 hours) - (15 min)"
 * - "30m" -> "(30 min)"
 */
export function normalizeDurationExpression(input: string): string {
  let expr = input.trim();
  if (!expr) return '';

  const hasOperators = /[-+*\/]|to|until/i.test(expr);

  if (!hasOperators) {
    // Standalone colon format
    const hmsMatch = expr.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
    if (hmsMatch) {
      expr = `(${hmsMatch[1]} hours) + (${hmsMatch[2]} min) + (${hmsMatch[3]} s)`;
    } else {
      const msMatch = expr.match(/^(\d{1,4}):(\d{2})$/);
      if (msMatch) {
        expr = `(${msMatch[1]} min) + (${msMatch[2]} s)`;
      }
    }
  } else {
    // Multi-part with operators (e.g. "08:00 - 03:00", "17:30 - 09:00", "8:00 to 12:30")
    expr = expr.replace(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g, (_m, h, min, sec) => {
      if (sec !== undefined) {
        return `((${parseInt(h, 10)} hours) + (${parseInt(min, 10)} min) + (${parseInt(sec, 10)} s))`;
      }
      return `((${parseInt(h, 10)} hours) + (${parseInt(min, 10)} min))`;
    });
    expr = expr.replace(/\bto\b|\buntil\b/gi, '-');
  }

  // Handle adjacent duration units without operator (e.g. "1h 30m" -> "1h + 30m")
  expr = expr.replace(/(\b(?:d|days?|h|hours?|hrs?|m|mins?|minutes?|s|secs?|seconds?))\s+(\d)/gi, '$1 + $2');

  // Normalize duration units to avoid unit ambiguity in Qalculate (m -> min, h -> hours, s -> s, d -> days)
  expr = expr
    .replace(/(\d+(?:\.\d+)?)\s*d(?:ays?)?(?!\w)/gi, '($1 days)')
    .replace(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?(?!\w)/gi, '($1 hours)')
    .replace(/(\d+(?:\.\d+)?)\s*m(?:inutes?|ins?)?(?!\w)/gi, '($1 min)')
    .replace(/(\d+(?:\.\d+)?)\s*s(?:econds?|ecs?)?(?!\w)/gi, '($1 s)');

  return expr;
}

/**
 * Cleans HTML tags, whitespace, and formatting from Qalculate output.
 */
function cleanOutput(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u202F\u00A0]/g, ' ') // non-breaking spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Uses Qalculate WASM to calculate an expression and convert it to total seconds.
 */
export async function evaluateWithQalculate(input: string): Promise<number | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const qalc = await getQalculate();
    if (!qalc) return null;

    const normalized = normalizeDurationExpression(trimmed);

    // First try converting normalized expression directly to seconds: (expression) to s
    const toSecondsQuery = `(${normalized}) to s`;
    const resSec = qalc.calculate(toSecondsQuery, 300, 0);

    if (resSec?.output && (!resSec.messages || resSec.messages.length === 0 || !resSec.messages.some(m => m.toLowerCase().includes('error')))) {
      const clean = cleanOutput(resSec.output);
      // Look for number before "s" or "seconds" (e.g., "300 s", "18000 s")
      const match = clean.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*(?:s|seconds?)?$/i);
      if (match) {
        const val = Math.abs(parseFloat(match[1]));
        if (!isNaN(val)) {
          return Math.round(val);
        }
      }
    }

    // Try evaluating normalized expression as-is
    const resRaw = qalc.calculate(normalized, 300, 0);
    if (resRaw?.output) {
      const clean = cleanOutput(resRaw.output);
      // Check if pure number
      const numMatch = clean.match(/^([+-]?\d+(?:\.\d+)?)$/);
      if (numMatch) {
        const val = Math.abs(parseFloat(numMatch[1]));
        if (!isNaN(val)) return Math.round(val);
      }

      // Check for compound units: e.g. "5 h", "30 min", "1 h + 30 min", "5:00:00"
      const timeRegex = /(?:(\d+(?:\.\d+)?)\s*(?:d|days?))?\s*(?:(\d+(?:\.\d+)?)\s*(?:h|hours?|hrs?))?\s*(?:(\d+(?:\.\d+)?)\s*(?:m|min(?:utes?)?|mins?))?\s*(?:(\d+(?:\.\d+)?)\s*(?:s|sec(?:onds?)?|secs?))?/i;
      const match = clean.match(timeRegex);
      if (match && (match[1] || match[2] || match[3] || match[4])) {
        const d = parseFloat(match[1] || '0');
        const h = parseFloat(match[2] || '0');
        const m = parseFloat(match[3] || '0');
        const s = parseFloat(match[4] || '0');
        return Math.round(d * 86400 + h * 3600 + m * 60 + s);
      }
    }
  } catch (err) {
    console.debug('Qalculate evaluation error:', err);
  }

  return null;
}
