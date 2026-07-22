/**
 * The canonical grammar contract (v1.16.2 review P2-1 + P3-1): nothing
 * undocumented is accepted and nothing accepted is ignored. Unknown
 * flags, duplicate value flags, exclusive pairs, and wrong positional
 * arity fail loudly with the canonical usage, before any config,
 * store, or adapter loads; help and per-command usage render from the
 * same structure.
 */
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { ConfigError } from '@rulvar/core';

import type { CliIo } from './io.js';
import { HELP, runCli } from './cli-main.js';
import {
  docsGrammarLines,
  GRAMMAR,
  helpCommandLines,
  parseBudgetValue,
  parseCommand,
  usageOf,
} from './grammar.js';

interface ScriptedIo extends CliIo {
  outLines: string[];
  errLines: string[];
}

function scriptedIo(): ScriptedIo {
  const io: ScriptedIo = {
    outLines: [],
    errLines: [],
    isTTY: false,
    out: (line) => io.outLines.push(line),
    err: (line) => io.errLines.push(line),
    prompt: () => Promise.resolve(undefined),
  };
  return io;
}

const CORE_DIST = pathToFileURL(resolve(import.meta.dirname, '../../core/dist/index.js')).href;
const TESTING_DIST = pathToFileURL(
  resolve(import.meta.dirname, '../../testing/dist/index.js'),
).href;

/** A fixture project whose adapter counts every provider call into calls.log. */
function writeFixtureProject(): { cwd: string; callCount: () => number } {
  const cwd = mkdtempSync(join(tmpdir(), 'rulvar-grammar-'));
  const counter = join(cwd, 'calls.log');
  writeFileSync(
    join(cwd, 'rulvar.config.mjs'),
    `import { appendFileSync } from 'node:fs';
import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const wf = defineWorkflow({ name: 'wf' }, async (ctx) => await ctx.agent('do work'));

export default {
  engineOptions: {
    adapters: [
      new FakeAdapter({
        agents: {
          '*': () => {
            appendFileSync(${JSON.stringify(counter)}, 'x');
            return 'worked';
          },
        },
      }),
    ],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { wf },
};
`,
    'utf8',
  );
  return {
    cwd,
    callCount: () => (existsSync(counter) ? statSync(counter).size : 0),
  };
}

/** Every journal, meta, and transcript byte under the default store. */
function storeBytes(cwd: string): Map<string, string> {
  const dir = join(cwd, '.rulvar');
  const bytes = new Map<string, string>();
  if (!existsSync(dir)) {
    return bytes;
  }
  for (const file of readdirSync(dir, { recursive: true }) as string[]) {
    const path = join(dir, file);
    if (statSync(path).isFile()) {
      bytes.set(file, readFileSync(path, 'latin1'));
    }
  }
  return bytes;
}

describe('canonical CLI grammar (v1.16.2 review P2-1 + P3-1)', () => {
  it('parseCommand rejects everything the grammar does not name', () => {
    expect(() => parseCommand(GRAMMAR.resume, ['r1', '--budget-usd', '1'])).toThrowError(
      /Unknown option '--budget-usd'; usage: rulvar resume <runId> \[--args JSON\] \[--store PATH\]/,
    );
    expect(() => parseCommand(GRAMMAR.resume, ['r1', '--profile', 'fast'])).toThrowError(
      /Unknown option '--profile'/,
    );
    expect(() => parseCommand(GRAMMAR.run, [])).toThrowError(ConfigError);
    expect(() => parseCommand(GRAMMAR.run, ['wf', 'extra'])).toThrowError(
      /unexpected extra argument 'extra'/,
    );
    expect(() =>
      parseCommand(GRAMMAR.run, ['wf', '--budget-usd', '1', '--budget-usd', '2']),
    ).toThrowError(/--budget-usd may appear at most once/);
    expect(() =>
      parseCommand(GRAMMAR['kb gate'], [
        'r1',
        '5',
        '--contrast-run',
        'r2#1',
        '--contrast-eval',
        'rep:c1',
      ]),
    ).toThrowError(/--contrast-run and --contrast-eval are mutually exclusive/);
    // Boolean repeats are idempotent, not conflicting.
    const parsed = parseCommand(GRAMMAR.plan, ['goal', '--dry-run', '--dry-run']);
    expect(parsed.values['dry-run']).toBe(true);
    expect(parsed.positionals).toEqual(['goal']);
  });

  it('run and resume accept --strict (v1.40.0 improvement plan)', () => {
    expect(parseCommand(GRAMMAR.run, ['wf', '--strict']).values.strict).toBe(true);
    expect(parseCommand(GRAMMAR.resume, ['r1', '--strict']).values.strict).toBe(true);
    // Only run and resume settle an outcome; the other commands keep
    // rejecting the flag.
    expect(() => parseCommand(GRAMMAR.inspect, ['r1', '--strict'])).toThrowError(
      /Unknown option '--strict'/,
    );
  });

  it('validates budget values at parse time (0, negatives, NaN, Infinity, text)', () => {
    expect(parseBudgetValue('budget-usd', '2.5')).toBe(2.5);
    for (const bad of ['0', '-1', 'NaN', 'Infinity', 'abc', '']) {
      expect(() => parseBudgetValue('budget-usd', bad)).toThrowError(
        /--budget-usd must be a positive number/,
      );
    }
  });

  it('folds spaced negatives for numeric flags onto the canonical diagnostic (v1.27.0 review P3)', () => {
    // The documented spaced syntax now reaches parseBudgetValue instead
    // of dying on the generic parseArgs ambiguity error.
    const parsed = parseCommand(GRAMMAR.run, ['wf', '--budget-usd', '-1']);
    expect(parsed.values['budget-usd']).toBe('-1');
    expect(() =>
      parseBudgetValue('budget-usd', parsed.values['budget-usd'] as string),
    ).toThrowError(/--budget-usd must be a positive number, got '-1'/);
    // Exotic numeric spellings fold too.
    expect(parseCommand(GRAMMAR.run, ['wf', '--budget-usd', '-1e400']).values['budget-usd']).toBe(
      '-1e400',
    );
    expect(parseCommand(GRAMMAR.run, ['wf', '--budget-usd', '-.5']).values['budget-usd']).toBe(
      '-.5',
    );
    expect(
      parseCommand(GRAMMAR.plan, ['goal', '--planning-budget-usd', '-2']).values[
        'planning-budget-usd'
      ],
    ).toBe('-2');
    // Non numeric flags never fold: a JSON negative still needs the
    // equals form, exactly as documented.
    expect(() => parseCommand(GRAMMAR.run, ['wf', '--args', '-1'])).toThrowError(
      /argument is ambiguous/,
    );
    // A real flag after a numeric flag stays the missing value
    // diagnostic, never a folded value.
    expect(() => parseCommand(GRAMMAR.run, ['wf', '--budget-usd', '--profile'])).toThrowError(
      /argument is ambiguous/,
    );
    // Unknown options are untouched by the fold.
    expect(() => parseCommand(GRAMMAR.run, ['wf', '--nope', '-1'])).toThrowError(
      /Unknown option '--nope'/,
    );
    // The folded form still counts toward the duplicate guard.
    expect(() =>
      parseCommand(GRAMMAR.run, ['wf', '--budget-usd', '-1', '--budget-usd=-2']),
    ).toThrowError(/--budget-usd may appear at most once/);
  });

  it('renders help, usage lines, and the kb gate grammar from one structure', () => {
    for (const line of helpCommandLines()) {
      expect(HELP).toContain(line);
    }
    // The two lines the v1.16.2 review caught missing from HELP.
    expect(HELP).toMatch(/rulvar run .*--profile NAME/);
    expect(HELP).toMatch(/rulvar resume <runId>\s+\[--args JSON\]/);
    expect(usageOf(GRAMMAR.resume)).toBe(
      'usage: rulvar resume <runId> [--args JSON] [--store PATH] [--dry-run] ' +
        '[--allow-args-change] [--strict]',
    );
    expect(usageOf(GRAMMAR['runs ls'])).toBe(
      'usage: rulvar runs ls [--store PATH] (no aliases in v1)',
    );
    expect(usageOf(GRAMMAR['kb gate'])).toBe(
      'usage: rulvar kb gate <runId> <entryRef> --approver NAME --ruled-out a,b,c ' +
        '[--contrast-run runId#seq | --contrast-eval reportId:caseId[,caseId...]] ' +
        '[--confidence high|medium|low] [--store PATH]',
    );
  });

  it('the docs grammar block is the grammar structure, line for line', () => {
    // The golden the v1.16.2 review asked for: help, usage errors, and
    // the documented grammar all derive from GRAMMAR, so the docs
    // fenced block must equal docsGrammarLines() literally.
    const cliGuide = readFileSync(
      resolve(import.meta.dirname, '../../../docs/guide/cli.md'),
      'utf8',
    );
    const fence = /The canonical grammar, with no aliases:\n\n```text\n([\s\S]*?)```/u.exec(
      cliGuide,
    );
    expect(fence).not.toBeNull();
    expect(fence![1].trimEnd().split('\n')).toEqual(docsGrammarLines());
  });

  it('rejects the whole command x flag table with exit 1 and zero provider calls', async () => {
    const { cwd, callCount } = writeFixtureProject();
    const table: Array<[string[], string]> = [
      [['run'], 'usage: rulvar run <file|name>'],
      [['run', 'wf', 'extra'], "unexpected extra argument 'extra'"],
      [['run', 'wf', '--budget-usd', '0'], '--budget-usd must be a positive number'],
      [['run', 'wf', '--budget-usd', '-1'], '--budget-usd must be a positive number'],
      [['run', 'wf', '--budget-usd=-1'], '--budget-usd must be a positive number'],
      [['run', 'wf', '--budget-usd', '-1e400'], '--budget-usd must be a positive number'],
      [['run', 'wf', '--budget-usd', 'NaN'], '--budget-usd must be a positive number'],
      [['run', 'wf', '--budget-usd', 'Infinity'], '--budget-usd must be a positive number'],
      [['run', 'wf', '--budget-usd', '--profile'], 'argument is ambiguous'],
      [['run', 'wf', '--nope', '-1'], "Unknown option '--nope'"],
      [['run', 'wf', '--budget-usd', '1', '--budget-usd', '2'], 'may appear at most once'],
      [['run', 'wf', '--budget-usd', '-1', '--budget-usd=-2'], 'may appear at most once'],
      [['plan', 'goal', '--planning-budget-usd', '-1'], 'must be a positive number'],
      [['plan', 'goal', '--planning-budget-usd=-1'], 'must be a positive number'],
      [['run', 'wf', '--nope'], "Unknown option '--nope'"],
      [['resume'], 'usage: rulvar resume <runId>'],
      [['resume', 'r1', '--budget-usd', '0.01'], "Unknown option '--budget-usd'"],
      [['resume', 'r1', '--profile', 'definitely-missing'], "Unknown option '--profile'"],
      [['resume', 'r1', 'extra'], 'unexpected extra argument'],
      [['runs', 'ls', 'extra'], 'unexpected extra argument'],
      [['inspect'], 'usage: rulvar inspect <runId>'],
      [['inspect', 'r1', 'extra'], 'unexpected extra argument'],
      [['plan'], 'usage: rulvar plan'],
      [['plan', 'goal', 'extra'], 'unexpected extra argument'],
      [['kb', 'list', 'extra'], 'unexpected extra argument'],
      [['kb', 'inbox', 'extra'], 'unexpected extra argument'],
      [['kb', 'inbox', '--nope'], "Unknown option '--nope'"],
      [['kb', 'gate', 'r1'], 'usage: rulvar kb gate'],
      [['kb', 'sweep', '--budget-usd', '1'], "Unknown option '--budget-usd'"],
      [['kb', 'sweep', 'extra'], 'unexpected extra argument'],
    ];
    for (const [argv, needle] of table) {
      const io = scriptedIo();
      expect(await runCli(argv, { cwd, io }), argv.join(' ')).toBe(1);
      expect(io.errLines.join('\n'), argv.join(' ')).toContain(needle);
    }
    expect(callCount()).toBe(0);
  });

  it('resume rejections leave the store byte-identical and the ceiling frozen', async () => {
    const { cwd, callCount } = writeFixtureProject();
    const run = scriptedIo();
    expect(await runCli(['run', 'wf', '--budget-usd', '3'], { cwd, io: run })).toBe(0);
    expect(callCount()).toBe(1);
    const runId = run.errLines
      .find((line) => line.startsWith('runId: '))
      ?.slice('runId: '.length) as string;
    expect(runId).toBeDefined();
    const before = storeBytes(cwd);
    expect(before.size).toBeGreaterThan(0);

    for (const argv of [
      ['resume', runId, '--budget-usd', '0.01'],
      ['resume', runId, '--profile', 'definitely-missing'],
      ['resume', runId, 'extra'],
    ]) {
      const io = scriptedIo();
      expect(await runCli(argv, { cwd, io }), argv.join(' ')).toBe(1);
    }
    expect(storeBytes(cwd)).toEqual(before);
    expect(callCount()).toBe(1);

    // The documented resume grammar keeps working, and the original
    // immutable ceiling survives the valid resume untouched.
    const ok = scriptedIo();
    expect(await runCli(['resume', runId, '--store', '.rulvar'], { cwd, io: ok })).toBe(0);
    const meta = JSON.parse(readFileSync(join(cwd, '.rulvar', `${runId}.meta.json`), 'utf8')) as {
      budgetUsd?: number;
    };
    expect(meta.budgetUsd).toBe(3);
  });
});
