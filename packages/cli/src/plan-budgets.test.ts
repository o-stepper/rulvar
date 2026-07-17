/**
 * rulvar plan bounded surface (v1.16.2 review P1-1): planning and
 * execution are separate paid runs with separate immutable ceilings,
 * missing ceilings fail loudly unless explicitly waived, exhaustion of
 * one stage never spills into the other, and exact replay keeps frozen
 * ceilings without provider calls. FakeAdapter reports no pricing, so
 * every spawn reserves the engine's flat $0.50 admission reserve: a
 * ceiling below that exhausts the run BEFORE its first provider call.
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

import { ScriptRejected } from '@rulvar/core';

import { runCli } from './cli-main.js';
import type { CliIo } from './io.js';

const TESTING = pathToFileURL(resolve(import.meta.dirname, '../../testing/dist/index.js')).href;
const PLANNER = pathToFileURL(resolve(import.meta.dirname, '../../planner/dist/index.js')).href;
const WORKER = pathToFileURL(
  resolve(import.meta.dirname, '../../planner/dist/sandbox-worker.js'),
).href;

interface ScriptedIo extends CliIo {
  outLines: string[];
  errLines: string[];
}

function scriptedIo(): ScriptedIo {
  const io: ScriptedIo = {
    outLines: [],
    errLines: [],
    isTTY: false,
    out: (line: string) => io.outLines.push(line),
    err: (line: string) => io.errLines.push(line),
    prompt: () => Promise.resolve(undefined),
  };
  return io;
}

function writePlanProject(): { cwd: string; callCount: () => number } {
  const cwd = mkdtempSync(join(tmpdir(), 'rulvar-plan-budget-'));
  const counter = join(cwd, 'calls.log');
  writeFileSync(
    join(cwd, 'rulvar.config.mjs'),
    `import { appendFileSync } from 'node:fs';
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING)};
import { WorkerSandboxRunner } from ${JSON.stringify(PLANNER)};

const GOOD = ['\\u0060\\u0060\\u0060js', 'const t = now();', "const facts = await agent('collect facts');", 'return { t, facts };', '\\u0060\\u0060\\u0060'].join('\\n');

export default {
  engineOptions: {
    adapters: [
      new FakeAdapter({
        agents: {
          '*': (call) => {
            appendFileSync(${JSON.stringify(counter)}, 'x');
            return call.prompt.includes('GOAL:') ? GOOD : 'the collected facts';
          },
        },
      }),
    ],
    defaults: { routing: { plan: FAKE_MODEL_REF, loop: FAKE_MODEL_REF } },
    runners: { sandbox: new WorkerSandboxRunner({ workerUrl: new URL(${JSON.stringify(WORKER)}) }) },
  },
};
`,
  );
  return {
    cwd,
    callCount: () => (existsSync(counter) ? statSync(counter).size : 0),
  };
}

interface StoredMeta {
  runId: string;
  workflowName?: string;
  status: string;
  budgetUsd?: number;
}

function metas(cwd: string): StoredMeta[] {
  const dir = join(cwd, '.rulvar');
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((file) => file.endsWith('.meta.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as StoredMeta);
}

function planningMeta(cwd: string): StoredMeta | undefined {
  return metas(cwd).find((meta) => meta.workflowName === 'rulvar-plan');
}

function executionMetas(cwd: string): StoredMeta[] {
  return metas(cwd).filter((meta) => meta.workflowName === 'compiled');
}

function planningJournalBytes(cwd: string): string {
  const dir = join(cwd, '.rulvar');
  const file = readdirSync(dir).find((name) => name.startsWith('plan-') && name.endsWith('.jsonl'));
  expect(file).toBeDefined();
  return readFileSync(join(dir, file as string), 'latin1');
}

describe('rulvar plan budgets (v1.16.2 review P1-1)', () => {
  it('records the two given ceilings on the two RunMetas', async () => {
    const { cwd } = writePlanProject();
    const io = scriptedIo();
    const code = await runCli(
      ['plan', 'collect the facts', '--planning-budget-usd', '2', '--budget-usd', '5'],
      { cwd, io },
    );
    expect(code).toBe(0);
    expect(planningMeta(cwd)?.budgetUsd).toBe(2);
    const execution = executionMetas(cwd);
    expect(execution).toHaveLength(1);
    expect(execution[0].budgetUsd).toBe(5);
  });

  it('planning exhaustion never starts execution (zero provider calls)', async () => {
    const { cwd, callCount } = writePlanProject();
    const io = scriptedIo();
    // 0.01 is below the flat $0.50 admission reserve: the planning run
    // exhausts before its first provider call and plan() throws the
    // typed ScriptRejected; no execution run may exist afterward.
    await expect(
      runCli(['plan', 'collect the facts', '--planning-budget-usd', '0.01', '--budget-usd', '5'], {
        cwd,
        io,
      }),
    ).rejects.toThrowError(ScriptRejected);
    expect(callCount()).toBe(0);
    expect(planningMeta(cwd)?.budgetUsd).toBe(0.01);
    expect(executionMetas(cwd)).toHaveLength(0);
  });

  it('execution exhaustion leaves the planning journal byte-identical', async () => {
    const { cwd, callCount } = writePlanProject();
    const dry = scriptedIo();
    expect(
      await runCli(['plan', 'collect the facts', '--dry-run', '--planning-budget-usd', '2'], {
        cwd,
        io: dry,
      }),
    ).toBe(0);
    const planningCalls = callCount();
    expect(planningCalls).toBeGreaterThan(0);
    const journalBefore = planningJournalBytes(cwd);

    // Same goal: the planning run replays its journal (zero new
    // provider calls, frozen ceiling); the execution run exhausts at
    // admission (0.01 < the flat $0.50 reserve) before any call.
    const io = scriptedIo();
    const code = await runCli(
      ['plan', 'collect the facts', '--planning-budget-usd', '2', '--budget-usd', '0.01'],
      { cwd, io },
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain('status: exhausted');
    expect(planningJournalBytes(cwd)).toBe(journalBefore);
    expect(callCount()).toBe(planningCalls);
    const execution = executionMetas(cwd);
    expect(execution).toHaveLength(1);
    expect(execution[0].budgetUsd).toBe(0.01);
    expect(execution[0].status).toBe('exhausted');
  });

  it('--dry-run creates no execution run', async () => {
    const { cwd } = writePlanProject();
    const io = scriptedIo();
    expect(
      await runCli(['plan', 'collect the facts', '--dry-run', '--planning-budget-usd', '1'], {
        cwd,
        io,
      }),
    ).toBe(0);
    expect(planningMeta(cwd)?.budgetUsd).toBe(1);
    expect(executionMetas(cwd)).toHaveLength(0);
  });

  it('exact replay of the planning stage keeps the frozen ceiling and makes no provider calls', async () => {
    const { cwd, callCount } = writePlanProject();
    const first = scriptedIo();
    expect(
      await runCli(
        ['plan', 'collect the facts', '--planning-budget-usd', '2', '--budget-usd', '5'],
        { cwd, io: first },
      ),
    ).toBe(0);
    const callsAfterFirst = callCount();

    // A different requested planning ceiling on the same goal: the
    // recorded ceiling is frozen (RULVAR_PLAN_BUDGET_DRIFT semantics),
    // the planning journal replays without provider calls, and only
    // the fresh execution run spends.
    const second = scriptedIo();
    expect(
      await runCli(
        ['plan', 'collect the facts', '--planning-budget-usd', '9', '--budget-usd', '5'],
        { cwd, io: second },
      ),
    ).toBe(0);
    expect(planningMeta(cwd)?.budgetUsd).toBe(2);
    expect(metas(cwd).filter((meta) => meta.workflowName === 'rulvar-plan')).toHaveLength(1);
    const executionCallsSecond = callCount() - callsAfterFirst;
    expect(executionCallsSecond).toBe(1);
  });

  it('fails loudly on missing, conflicting, and invalid budget flags with zero provider calls', async () => {
    const { cwd, callCount } = writePlanProject();
    const table: Array<[string[], string]> = [
      [['plan', 'goal'], 'set --planning-budget-usd N'],
      [['plan', 'goal', '--planning-budget-usd', '1'], 'set --budget-usd N'],
      [
        ['plan', 'goal', '--dry-run', '--planning-budget-usd', '1', '--budget-usd', '1'],
        '--dry-run never executes the planned workflow',
      ],
      [['plan', 'goal', '--planning-budget-usd', '0'], 'must be a positive number'],
      [
        ['plan', 'goal', '--planning-budget-usd', 'Infinity', '--budget-usd', '1'],
        'must be a positive number',
      ],
      [
        ['plan', 'goal', '--planning-budget-usd', '1', '--planning-budget-usd', '2'],
        'may appear at most once',
      ],
      [['plan', 'goal', '--execution-budget-usd', '1'], "Unknown option '--execution-budget-usd'"],
    ];
    for (const [argv, needle] of table) {
      const io = scriptedIo();
      expect(await runCli(argv, { cwd, io }), argv.join(' ')).toBe(1);
      expect(io.errLines.join('\n'), argv.join(' ')).toContain(needle);
    }
    expect(callCount()).toBe(0);
    expect(metas(cwd)).toHaveLength(0);
  });
});
