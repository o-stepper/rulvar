/**
 * CLI e2e (M5-T01 acceptance): the run/suspend/resume round-trip over
 * the real command paths against FakeAdapter, engine assembly from the
 * host config convention, runs ls, and the inspect journal summary
 * (docs/06, section 10.5; docs/02, section 8.1).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { CliIo } from './io.js';
import { runCli } from './cli-main.js';

interface ScriptedIo extends CliIo {
  outLines: string[];
  errLines: string[];
}

function scriptedIo(answers: string[] = []): ScriptedIo {
  const queue = [...answers];
  const io: ScriptedIo = {
    outLines: [],
    errLines: [],
    isTTY: false,
    out: (line) => io.outLines.push(line),
    err: (line) => io.errLines.push(line),
    prompt: () => Promise.resolve(queue.shift()),
  };
  return io;
}

const CORE_DIST = pathToFileURL(resolve(import.meta.dirname, '../../core/dist/index.js')).href;
const TESTING_DIST = pathToFileURL(
  resolve(import.meta.dirname, '../../testing/dist/index.js'),
).href;

/** Writes the host config convention into a temp working directory. */
function writeFixtureProject(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'lurker-cli-'));
  writeFileSync(
    join(cwd, 'lurker.config.mjs'),
    `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const review = defineWorkflow({ name: 'review' }, async (ctx, args) => {
  const analysis = await ctx.agent('analyze item ' + String(args.item));
  const approval = await ctx.awaitExternal('editor-approval', {
    prompt: 'publish the analysis?',
  });
  return { analysis, approved: approval.approved, item: args.item };
});

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'analysis complete' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { review },
};
`,
    'utf8',
  );
  return cwd;
}

function runIdOf(io: ScriptedIo): string {
  const line = io.errLines.find((entry) => entry.startsWith('runId: '));
  expect(line).toBeDefined();
  return (line as string).slice('runId: '.length);
}

describe('lurker CLI (M5-T01)', () => {
  it('prints help and rejects unknown commands (no aliases in v1)', async () => {
    const help = scriptedIo();
    expect(await runCli(['--help'], { cwd: process.cwd(), io: help })).toBe(0);
    expect(help.outLines.join('\n')).toContain('lurker run <file|name>');

    const unknown = scriptedIo();
    expect(await runCli(['launch'], { cwd: process.cwd(), io: unknown })).toBe(1);
    expect(unknown.errLines.join('\n')).toContain("unknown command 'launch'");

    const alias = scriptedIo();
    expect(await runCli(['runs', 'list'], { cwd: process.cwd(), io: alias })).toBe(1);
  });

  it('run resolves an external interactively and completes in one invocation', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo(['{"approved":true}']);
    const code = await runCli(['run', 'review', '--args', '{"item":7}', '--store', '.lurker'], {
      cwd,
      io,
    });
    expect(code).toBe(0);
    const value = JSON.parse(io.outLines.join('\n')) as Record<string, unknown>;
    expect(value).toEqual({ analysis: 'analysis complete', approved: true, item: 7 });
    expect(io.errLines.some((line) => line.includes('status: ok'))).toBe(true);
  });

  it('run/suspend/exit then resume completes the round-trip (acceptance)', async () => {
    const cwd = writeFixtureProject();

    // First invocation: input exhausted, the run stays suspended.
    const first = scriptedIo([]);
    const firstCode = await runCli(['run', 'review', '--args', '{"item":9}'], { cwd, io: first });
    expect(firstCode).toBe(0);
    const runId = runIdOf(first);
    expect(first.errLines.some((line) => line.includes('status: suspended'))).toBe(true);
    expect(first.errLines.some((line) => line.includes('pending: editor-approval'))).toBe(true);

    // runs ls sees the suspended run with its workflow binding.
    const ls = scriptedIo();
    expect(await runCli(['runs', 'ls'], { cwd, io: ls })).toBe(0);
    const lsLine = ls.outLines.find((line) => line.startsWith(runId));
    expect(lsLine).toContain('suspended');
    expect(lsLine).toContain('workflow=review');

    // Second process: resume, resolve interactively, complete. The
    // replayed prefix pays zero adapter calls by construction; the CLI
    // surface only shows the terminal outcome.
    // Original args are not journaled in v1: the host re-supplies them
    // (the amended resume grammar, docs/06 section 10.5).
    const second = scriptedIo(['{"approved":true}']);
    const secondCode = await runCli(['resume', runId, '--args', '{"item":9}'], {
      cwd,
      io: second,
    });
    expect(secondCode).toBe(0);
    const value = JSON.parse(second.outLines.join('\n')) as Record<string, unknown>;
    expect(value).toEqual({ analysis: 'analysis complete', approved: true, item: 9 });

    // Third invocation is idempotent ops: inspect renders the summary
    // without payload parsing, listing kinds and zero open suspensions.
    const inspect = scriptedIo();
    expect(await runCli(['inspect', runId], { cwd, io: inspect })).toBe(0);
    const text = inspect.outLines.join('\n');
    expect(text).toContain(`run ${runId}:`);
    expect(text).toContain('workflow: review');
    expect(text).toContain('agent: 2');
    expect(text).toContain('external: 1');
    expect(text).toContain('resolution: 1');
    expect(text).toContain('open suspensions: 0');
    // The cost view (M5-T03): FakeAdapter prices at zero by
    // construction, so the fold reports $0 with no unpriced noise.
    expect(text).toContain('cost: $0.0000');
    expect(text).toContain('fake:fake-model: $0.0000');
    expect(text).not.toContain('unpriced:');
  });

  it('inspect shows an open suspension while the run is parked', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo([]);
    await runCli(['run', 'review', '--args', '{"item":1}'], { cwd, io });
    const runId = runIdOf(io);
    const inspect = scriptedIo();
    expect(await runCli(['inspect', runId], { cwd, io: inspect })).toBe(0);
    expect(inspect.outLines.join('\n')).toContain('open suspensions: 1');
  });

  it('rejects a resume whose workflow is not registered', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo([]);
    await runCli(['run', 'review', '--args', '{"item":2}'], { cwd, io });
    const runId = runIdOf(io);
    writeFileSync(join(cwd, 'lurker.config.mjs'), 'export default { workflows: {} };\n', 'utf8');
    const resume = scriptedIo();
    expect(await runCli(['resume', runId], { cwd, io: resume })).toBe(1);
    expect(resume.errLines.join('\n')).toContain('register it under that name');
  });

  it('runs a workflow from a file target with its own engineOptions', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'lurker-cli-file-'));
    writeFileSync(
      join(cwd, 'wf.mjs'),
      `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};
export const engineOptions = {
  adapters: [new FakeAdapter({ agents: { '*': 'from the file' } })],
  defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
};
export default defineWorkflow({ name: 'from-file' }, async (ctx) => ctx.agent('go'));
`,
      'utf8',
    );
    const io = scriptedIo();
    const code = await runCli(['run', 'wf.mjs'], { cwd, io });
    expect(code).toBe(0);
    expect(io.outLines.join('\n')).toContain('from the file');
  });
});
