/**
 * The canonical CLI grammar as data (v1.16.2 review P3-1): one
 * structure generates the help block, every per-command usage line,
 * and the docs contract test, so the three surfaces can never drift
 * apart again. Parsing goes through parseCommand, which converts
 * node:util parseArgs failures into the fail-loud ConfigError grammar
 * the CLI documents (v1.16.2 review P2-1): nothing is ignored; unknown
 * flags, duplicate value flags, mutually exclusive pairs, and wrong
 * positional arity all fail naming the canonical usage.
 */
import { parseArgs } from 'node:util';

import { ConfigError } from '@rulvar/core';

export interface FlagGrammar {
  /** Long option name without the leading dashes, e.g. 'budget-usd'. */
  name: string;
  /** Value placeholder, e.g. 'N'; absent means a boolean flag. */
  placeholder?: string;
  /** Required flags render without brackets; the command enforces them. */
  required?: boolean;
  /** Flags sharing a group render as [--a X | --b Y] and are mutually exclusive. */
  exclusiveGroup?: string;
}

export interface CommandGrammar {
  /** The command path as typed, e.g. 'run' or 'kb gate'. */
  command: string;
  /** Positional placeholders; the arity is EXACT (nothing extra rides along). */
  positionals: string[];
  flags: FlagGrammar[];
  /** Trailing usage note, e.g. '(no aliases in v1)'. */
  note?: string;
}

const ARGS = { name: 'args', placeholder: 'JSON' } as const;
const STORE = { name: 'store', placeholder: 'PATH' } as const;

/**
 * Every command of the canonical grammar (no aliases in v1). The help
 * block, the per-command usage errors, and the docs grammar block in
 * docs/guide/cli.md all derive from this table; the docs contract test
 * compares them literally.
 */
export const GRAMMAR: {
  readonly run: CommandGrammar;
  readonly resume: CommandGrammar;
  readonly 'runs ls': CommandGrammar;
  readonly inspect: CommandGrammar;
  readonly plan: CommandGrammar;
  readonly 'kb list': CommandGrammar;
  readonly 'kb inbox': CommandGrammar;
  readonly 'kb gate': CommandGrammar;
  readonly 'kb sweep': CommandGrammar;
} = {
  run: {
    command: 'run',
    positionals: ['<file|name>'],
    flags: [
      ARGS,
      STORE,
      { name: 'budget-usd', placeholder: 'N' },
      { name: 'profile', placeholder: 'NAME' },
    ],
  },
  resume: {
    command: 'resume',
    positionals: ['<runId>'],
    flags: [ARGS, STORE],
  },
  'runs ls': { command: 'runs ls', positionals: [], flags: [STORE], note: '(no aliases in v1)' },
  inspect: { command: 'inspect', positionals: ['<runId>'], flags: [STORE] },
  plan: {
    command: 'plan',
    positionals: ['"<goal>"'],
    flags: [{ name: 'dry-run' }],
  },
  'kb list': { command: 'kb list', positionals: [], flags: [] },
  'kb inbox': { command: 'kb inbox', positionals: [], flags: [STORE] },
  'kb gate': {
    command: 'kb gate',
    positionals: ['<runId>', '<entryRef>'],
    flags: [
      { name: 'approver', placeholder: 'NAME', required: true },
      { name: 'ruled-out', placeholder: 'a,b,c', required: true },
      { name: 'contrast-run', placeholder: 'runId#seq', exclusiveGroup: 'contrast' },
      {
        name: 'contrast-eval',
        placeholder: 'reportId:caseId[,caseId...]',
        exclusiveGroup: 'contrast',
      },
      { name: 'confidence', placeholder: 'high|medium|low' },
      STORE,
    ],
  },
  'kb sweep': {
    command: 'kb sweep',
    positionals: [],
    flags: [],
    note: '(configuration lives in rulvar.config.mjs)',
  },
};

/** The kb dispatch line: subcommands carry their own grammar entries. */
export const KB_FAMILY_USAGE = 'usage: rulvar kb <list | inbox | gate | sweep> (no aliases in v1)';

function renderFlags(flags: FlagGrammar[]): string[] {
  const tokens: string[] = [];
  const renderedGroups = new Set<string>();
  for (const flag of flags) {
    if (flag.exclusiveGroup !== undefined) {
      if (renderedGroups.has(flag.exclusiveGroup)) {
        continue;
      }
      renderedGroups.add(flag.exclusiveGroup);
      const members = flags
        .filter((candidate) => candidate.exclusiveGroup === flag.exclusiveGroup)
        .map((member) => `--${member.name} ${member.placeholder ?? ''}`.trim());
      tokens.push(`[${members.join(' | ')}]`);
      continue;
    }
    const body =
      flag.placeholder === undefined ? `--${flag.name}` : `--${flag.name} ${flag.placeholder}`;
    tokens.push(flag.required === true ? body : `[${body}]`);
  }
  return tokens;
}

/** The full invocation shape, e.g. `rulvar run <file|name> [--args JSON] ...`. */
export function invocationOf(grammar: CommandGrammar): string {
  const parts = [
    `rulvar ${grammar.command}`,
    ...grammar.positionals,
    ...renderFlags(grammar.flags),
  ];
  if (grammar.note !== undefined) {
    parts.push(grammar.note);
  }
  return parts.join(' ');
}

/** The canonical usage error line for a command. */
export function usageOf(grammar: CommandGrammar): string {
  return `usage: ${invocationOf(grammar)}`;
}

/**
 * The command lines of the help block: every top-level command plus the
 * kb family line, aligned on the flag column. The docs grammar block is
 * the same list verbatim (docs contract test).
 */
export function helpCommandLines(): string[] {
  const top = [GRAMMAR.run, GRAMMAR.resume, GRAMMAR['runs ls'], GRAMMAR.inspect, GRAMMAR.plan];
  const heads = top.map((grammar) => ['rulvar', grammar.command, ...grammar.positionals].join(' '));
  const kbHead = 'rulvar kb <list | inbox | gate | sweep>';
  const width = Math.max(...heads.map((head) => head.length), kbHead.length);
  const lines = top.map((grammar, index) => {
    const tail = renderFlags(grammar.flags).join(' ');
    return tail === '' ? heads[index] : `${heads[index].padEnd(width)} ${tail}`;
  });
  lines.push(kbHead);
  return lines;
}

export interface ParsedCommand {
  positionals: string[];
  /** Value flags as their single string; boolean flags as true when given. */
  values: Record<string, string | boolean | undefined>;
}

function isParseArgsError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS');
}

/**
 * Parses argv against one grammar entry. Everything the grammar does
 * not name is an error: unknown options (raised by parseArgs), value
 * flags given twice, both members of an exclusive group, and any
 * positional beyond the exact arity. Every rejection names the
 * canonical usage and happens before configs, stores, or adapters load.
 */
export function parseCommand(grammar: CommandGrammar, argv: string[]): ParsedCommand {
  const options: Record<string, { type: 'string' | 'boolean'; multiple: true }> = {};
  for (const flag of grammar.flags) {
    options[flag.name] = {
      type: flag.placeholder === undefined ? 'boolean' : 'string',
      multiple: true,
    };
  }
  let raw;
  try {
    raw = parseArgs({ args: argv, allowPositionals: true, options });
  } catch (error) {
    if (isParseArgsError(error)) {
      // The first sentence carries the option name; the rest is
      // parseArgs advice superseded by the canonical usage.
      const summary = error.message.split('.')[0];
      throw new ConfigError(`${summary}; ${usageOf(grammar)}`);
    }
    throw error;
  }
  if (raw.positionals.length < grammar.positionals.length) {
    throw new ConfigError(usageOf(grammar));
  }
  if (raw.positionals.length > grammar.positionals.length) {
    const extra = raw.positionals[grammar.positionals.length];
    throw new ConfigError(`unexpected extra argument '${extra}'; ${usageOf(grammar)}`);
  }
  const values: ParsedCommand['values'] = {};
  const groupMembers = new Map<string, string[]>();
  for (const flag of grammar.flags) {
    const entry = raw.values[flag.name] as string[] | boolean[] | undefined;
    if (entry === undefined) {
      continue;
    }
    if (flag.placeholder !== undefined && entry.length > 1) {
      throw new ConfigError(`--${flag.name} may appear at most once; ${usageOf(grammar)}`);
    }
    values[flag.name] = flag.placeholder === undefined ? true : entry[entry.length - 1];
    if (flag.exclusiveGroup !== undefined) {
      const members = groupMembers.get(flag.exclusiveGroup) ?? [];
      members.push(`--${flag.name}`);
      groupMembers.set(flag.exclusiveGroup, members);
    }
  }
  for (const members of groupMembers.values()) {
    if (members.length > 1) {
      throw new ConfigError(`${members.join(' and ')} are mutually exclusive; ${usageOf(grammar)}`);
    }
  }
  return { positionals: raw.positionals, values };
}

/**
 * Validates a `--...-usd` flag value: a finite dollar amount strictly
 * above zero (0, NaN, Infinity, negatives, and non-numbers all fail),
 * checked at parse time, before any provider work.
 */
export function parseBudgetValue(flagName: string, value: string): number {
  const budget = Number(value);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new ConfigError(`--${flagName} must be a positive number, got '${value}'`);
  }
  return budget;
}
