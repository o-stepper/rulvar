/**
 * rulvar plan end to end (M6-T11): the host config
 * supplies the FakeAdapter planner plus the sandbox runner; the CLI
 * loads @rulvar/planner dynamically, self-repairs the draft, and either
 * prints it (--dry-run) or runs it in the worker sandbox.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

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

function writePlanProject(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-plan-'));
  writeFileSync(
    join(cwd, 'rulvar.config.mjs'),
    `import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING)};
import { WorkerSandboxRunner } from ${JSON.stringify(PLANNER)};

const BAD = ['\\u0060\\u0060\\u0060js', 'const t = Date.now();', "const facts = await agent('collect facts');", 'return { t, facts };', '\\u0060\\u0060\\u0060'].join('\\n');
const GOOD = ['\\u0060\\u0060\\u0060js', 'const t = now();', "const facts = await agent('collect facts');", 'return { t, facts };', '\\u0060\\u0060\\u0060'].join('\\n');

export default {
  engineOptions: {
    adapters: [
      new FakeAdapter({
        agents: {
          '*': (call) =>
            call.prompt.includes('GOAL:')
              ? call.prompt.includes('DIAGNOSTICS (JSON)')
                ? GOOD
                : BAD
              : 'the collected facts',
        },
      }),
    ],
    defaults: { routing: { plan: FAKE_MODEL_REF, loop: FAKE_MODEL_REF } },
    runners: { sandbox: new WorkerSandboxRunner({ workerUrl: new URL(${JSON.stringify(WORKER)}) }) },
  },
};
`,
  );
  return cwd;
}

describe('rulvar plan (M6-T11)', () => {
  it('plans with --dry-run: prints the repaired script without running it', async () => {
    const cwd = writePlanProject();
    const io = scriptedIo();
    const code = await runCli(
      ['plan', 'collect the facts', '--dry-run', '--planning-budget-usd', '1'],
      { cwd, io },
    );
    expect(code).toBe(0);
    const source = io.outLines.join('\n');
    expect(source).toContain('const t = now();');
    expect(source).not.toContain('Date.now');
    expect(io.errLines.join('\n')).toContain('accepted with 0 advisory diagnostic(s)');
  });

  it('plans and runs the script in the worker sandbox', async () => {
    const cwd = writePlanProject();
    const io = scriptedIo();
    const code = await runCli(
      ['plan', 'collect the facts', '--planning-budget-usd', '1', '--budget-usd', '1'],
      { cwd, io },
    );
    expect(code).toBe(0);
    expect(io.errLines.join('\n')).toContain('status: ok');
    const value = JSON.parse(io.outLines.join('\n')) as { t: number; facts: string };
    expect(value.facts).toBe('the collected facts');
    expect(typeof value.t).toBe('number');
  });

  it('plans and runs unbounded only behind the explicit --allow-unbounded waiver', async () => {
    const cwd = writePlanProject();
    const io = scriptedIo();
    const code = await runCli(['plan', 'collect the facts', '--allow-unbounded'], { cwd, io });
    expect(code).toBe(0);
    expect(io.errLines.join('\n')).toContain('status: ok');
  });

  it('rejects a missing goal with usage', async () => {
    const cwd = writePlanProject();
    const io = scriptedIo();
    const code = await runCli(['plan'], { cwd, io });
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain('usage: rulvar plan');
  });
});
