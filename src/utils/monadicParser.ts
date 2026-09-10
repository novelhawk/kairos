/**
 * Monadic Parser Combinators
 *
 * Provides pure monadic primitives:
 * - return/result (unit)
 * - bind (sequencing >>=)
 * - zero (empty failure)
 * - plus/alt (deterministic choice +++)
 * - standard combinators: sat, char, string, many, many1, chainl1, token, etc.
 */

export class Parser<T> {
  readonly run: (inp: string) => Array<[T, string]>;

  constructor(run: (inp: string) => Array<[T, string]>) {
    this.run = run;
  }

  /**
   * Monadic bind (>>=): Sequentially compose two actions, passing
   * any produced value to the second action.
   */
  bind<U>(f: (val: T) => Parser<U>): Parser<U> {
    return new Parser((inp) => {
      const results = this.run(inp);
      const out: Array<[U, string]> = [];
      for (const [val, rest] of results) {
        for (const next of f(val).run(rest)) {
          out.push(next);
        }
      }
      return out;
    });
  }

  /**
   * Functor map (fmap): Transform the result of a parser.
   */
  map<U>(f: (val: T) => U): Parser<U> {
    return this.bind((val) => result(f(val)));
  }

  /**
   * Deterministic choice / alternative (+++):
   * Tries the first parser; if it succeeds, returns its results;
   * otherwise tries the second parser.
   */
  alt(p: Parser<T>): Parser<T> {
    return new Parser((inp) => {
      const r = this.run(inp);
      if (r.length > 0) return r;
      return p.run(inp);
    });
  }
}

/**
 * Result / Return (unit): A parser that succeeds without consuming input.
 */
export function result<T>(v: T): Parser<T> {
  return new Parser((inp) => [[v, inp]]);
}

/**
 * Zero: A parser that always fails.
 */
export function zero<T>(): Parser<T> {
  return new Parser(() => []);
}

/**
 * Item: Consumes the first character of input.
 */
export const item: Parser<string> = new Parser((inp) => {
  if (inp.length === 0) return [];
  return [[inp[0], inp.slice(1)]];
});

/**
 * Satisfy: Parses a character satisfying a predicate.
 */
export function sat(pred: (c: string) => boolean): Parser<string> {
  return item.bind((c) => (pred(c) ? result(c) : zero()));
}

/**
 * Parses a specific character.
 */
export function char(c: string): Parser<string> {
  return sat((x) => x === c);
}

/**
 * Parses a specific character (case-insensitive).
 */
export function charCI(c: string): Parser<string> {
  const lower = c.toLowerCase();
  const upper = c.toUpperCase();
  return sat((x) => x === lower || x === upper);
}

/**
 * Parses a specific string.
 */
export function string(str: string): Parser<string> {
  if (str.length === 0) return result('');
  return char(str[0]).bind(() =>
    string(str.slice(1)).bind(() =>
      result(str)
    )
  );
}

/**
 * Parses a specific string (case-insensitive).
 */
export function stringCI(str: string): Parser<string> {
  if (str.length === 0) return result('');
  return charCI(str[0]).bind(() =>
    stringCI(str.slice(1)).bind(() =>
      result(str)
    )
  );
}

/**
 * Combines an array of parsers with choice (alt / +++).
 */
export function altMany<T>(parsers: Array<Parser<T>>): Parser<T> {
  if (parsers.length === 0) return zero();
  return parsers.reduce((acc, p) => acc.alt(p));
}

/**
 * Repetition (0 or more times).
 */
export function many<T>(p: Parser<T>): Parser<T[]> {
  return many1(p).alt(result<T[]>([]));
}

/**
 * Repetition (1 or more times).
 */
export function many1<T>(p: Parser<T>): Parser<T[]> {
  return p.bind((x) =>
    many(p).bind((xs) =>
      result([x, ...xs])
    )
  );
}

/**
 * Left-associative operator chaining (chainl1 from Hutton & Meijer):
 * Parses one or more occurrences of `p`, separated by `op`.
 */
export function chainl1<T>(p: Parser<T>, op: Parser<(a: T, b: T) => T>): Parser<T> {
  const rest = (x: T): Parser<T> =>
    op.bind((f) =>
      p.bind((y) =>
        rest(f(x, y))
      )
    ).alt(result(x));

  return p.bind(rest);
}

// Character predicates
export const isDigit = (c: string): boolean => c >= '0' && c <= '9';
export const isAlpha = (c: string): boolean => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
export const isSpace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';

export const digit: Parser<string> = sat(isDigit);
export const digits: Parser<string> = many1(digit).map((ds) => ds.join(''));
export const nat: Parser<number> = digits.map((s) => parseInt(s, 10));

/**
 * Parses an integer or floating-point number.
 */
export const decimal: Parser<number> = digits.bind((intPart) =>
  char('.').bind(() =>
    digits.bind((fracPart) =>
      result(parseFloat(`${intPart}.${fracPart}`))
    )
  ).alt(result(parseFloat(intPart)))
);

/**
 * Consumes zero or more whitespace characters.
 */
export const spaces: Parser<string> = many(sat(isSpace)).map((cs) => cs.join(''));

/**
 * Discards leading and trailing whitespace around parser `p`.
 */
export function token<T>(p: Parser<T>): Parser<T> {
  return spaces.bind(() =>
    p.bind((v) =>
      spaces.bind(() =>
        result(v)
      )
    )
  );
}

/**
 * Parses a symbolic token (with optional surrounding whitespace).
 */
export function symbol(s: string): Parser<string> {
  return token(stringCI(s));
}
