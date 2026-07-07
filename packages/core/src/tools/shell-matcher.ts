/**
 * Argv-parsing shell matcher (M5-T06; docs/08, section 5): shell
 * allow/ask/deny is matched through a real argv parser, never a string
 * prefix. The composition rule is the entire point: for a compound
 * command the verdict is the strictest across segments, and any
 * unmatched segment yields ask, never a silent allow: `npm test; rm -rf
 * /` MUST yield ask (or deny when rm patterns are denied) even when
 * `npm test` is allow-listed.
 *
 * Matching algorithm (5.2):
 * 1. Lex with a POSIX-like shell lexer: quotes and escapes honored, no
 *    expansion of any kind.
 * 2. Split into segments at `;`, `&&`, `||`, `|`, `&`, and newline.
 * 3. A segment containing command substitution ($(...) or backticks),
 *    process substitution, or a here-doc is unmatchable: ask, always.
 * 4. Leading environment assignments (FOO=bar cmd) are stripped; a
 *    segment of only assignments is treated as unmatched.
 * 5. Redirection operators and their targets are retained as tokens; a
 *    pattern that does not account for them fails to match.
 * 6. Each segment is evaluated deny, then ask, then allow.
 */

export interface ShellSegment {
  /** Argv tokens after lexing and env-assignment stripping. */
  argv: string[];
  /** Substitutions and here-docs make a segment unmatchable (ask). */
  unmatchable: boolean;
}

/**
 * Lexes a command into segments per the docs/08 5.2 algorithm. Quotes
 * and escapes are honored; nothing is expanded; `$(`, backticks, `<(`,
 * `>(`, and `<<` (outside single quotes) poison their segment.
 */
export function lexShellCommand(command: string): ShellSegment[] {
  const segments: ShellSegment[] = [];
  let tokens: string[] = [];
  let current = '';
  let hasCurrent = false;
  let unmatchable = false;

  const pushToken = (): void => {
    if (hasCurrent) {
      tokens.push(current);
      current = '';
      hasCurrent = false;
    }
  };
  const pushSegment = (): void => {
    pushToken();
    if (tokens.length > 0 || unmatchable) {
      segments.push({ argv: stripAssignments(tokens), unmatchable });
    }
    tokens = [];
    unmatchable = false;
  };

  let i = 0;
  while (i < command.length) {
    const ch = command[i];
    const next = command[i + 1];

    // Segment operators (longest first), only outside quotes.
    if (ch === '&' && next === '&') {
      pushSegment();
      i += 2;
      continue;
    }
    if (ch === '|' && next === '|') {
      pushSegment();
      i += 2;
      continue;
    }
    if (ch === ';' || ch === '\n' || ch === '&') {
      pushSegment();
      i += 1;
      continue;
    }
    if (ch === '|') {
      pushSegment();
      i += 1;
      continue;
    }

    // Substitutions and here-docs: the segment becomes unmatchable.
    if (ch === '`') {
      unmatchable = true;
      i += 1;
      continue;
    }
    if (ch === '$' && next === '(') {
      unmatchable = true;
      i += 2;
      continue;
    }
    if ((ch === '<' || ch === '>') && next === '(') {
      unmatchable = true;
      i += 2;
      continue;
    }
    if ((ch === '<' || ch === '>') && next === '&') {
      // '>&' / '<&' are redirection operators (2>&1), not the segment
      // operator '&': they stay inside their token (5.2 step 5).
      current += ch;
      current += '&';
      hasCurrent = true;
      i += 2;
      continue;
    }
    if (ch === '<' && next === '<') {
      unmatchable = true;
      i += 2;
      continue;
    }

    if (ch === "'") {
      // Single quotes: literal until the closing quote.
      const close = command.indexOf("'", i + 1);
      const inner = close === -1 ? command.slice(i + 1) : command.slice(i + 1, close);
      current += inner;
      hasCurrent = true;
      i = close === -1 ? command.length : close + 1;
      continue;
    }
    if (ch === '"') {
      // Double quotes: escapes honored; substitution still poisons.
      let j = i + 1;
      while (j < command.length && command[j] !== '"') {
        const inner = command[j];
        if (inner === '\\' && j + 1 < command.length) {
          current += command[j + 1];
          j += 2;
          continue;
        }
        if (inner === '`' || (inner === '$' && command[j + 1] === '(')) {
          unmatchable = true;
        }
        current += inner;
        j += 1;
      }
      hasCurrent = true;
      i = j === command.length ? j : j + 1;
      continue;
    }
    if (ch === '\\' && next !== undefined) {
      current += next;
      hasCurrent = true;
      i += 2;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      pushToken();
      i += 1;
      continue;
    }
    current += ch;
    hasCurrent = true;
    i += 1;
  }
  pushSegment();
  return segments;
}

/** Leading FOO=bar assignments are stripped before matching (5.2 step 4). */
function stripAssignments(tokens: string[]): string[] {
  let start = 0;
  while (start < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[start])) {
    start += 1;
  }
  return tokens.slice(start);
}

/**
 * Pattern grammar (5.1): literal words match one identical token; `*`
 * matches exactly one token; `**` matches zero or more remaining tokens
 * and may appear only as the final word. A pattern matches only if it
 * consumes the segment's ENTIRE argv.
 */
export function matchArgvPattern(pattern: string, argv: string[]): boolean {
  const words = pattern.split(' ').filter((word) => word !== '');
  for (const [index, word] of words.entries()) {
    if (word === '**' && index !== words.length - 1) {
      return false;
    }
  }
  let i = 0;
  for (const word of words) {
    if (word === '**') {
      return true;
    }
    if (i >= argv.length) {
      return false;
    }
    if (word !== '*' && word !== argv[i]) {
      return false;
    }
    i += 1;
  }
  return i === argv.length;
}

export type ShellVerdict = 'allow' | 'ask' | 'deny';

export interface ShellPatternRules {
  deny?: string[];
  ask?: string[];
  allow?: string[];
}

/** One segment's verdict: deny, then ask, then allow; unmatched = ask. */
function segmentVerdict(segment: ShellSegment, rules: ShellPatternRules): ShellVerdict {
  if (segment.unmatchable) {
    return 'ask';
  }
  if (segment.argv.length === 0) {
    // Only assignments (or empty): treated as unmatched (5.2 step 4).
    return 'ask';
  }
  if ((rules.deny ?? []).some((pattern) => matchArgvPattern(pattern, segment.argv))) {
    return 'deny';
  }
  if ((rules.ask ?? []).some((pattern) => matchArgvPattern(pattern, segment.argv))) {
    return 'ask';
  }
  if ((rules.allow ?? []).some((pattern) => matchArgvPattern(pattern, segment.argv))) {
    return 'allow';
  }
  return 'ask';
}

/**
 * The strictest-across-segments composition (5.3): deny if ANY segment
 * denies; otherwise ask if ANY segment asks or fails to match an allow
 * pattern; otherwise allow.
 */
export function matchShellCommand(command: string, rules: ShellPatternRules): ShellVerdict {
  const segments = lexShellCommand(command);
  if (segments.length === 0) {
    return 'ask';
  }
  let verdict: ShellVerdict = 'allow';
  for (const segment of segments) {
    const v = segmentVerdict(segment, rules);
    if (v === 'deny') {
      return 'deny';
    }
    if (v === 'ask') {
      verdict = 'ask';
    }
  }
  return verdict;
}
