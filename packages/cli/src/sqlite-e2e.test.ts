/**
 * M5 exit criterion: the CLI works end to end against SqliteStore, not
 * only JsonlFileStore (docs/10, section 3.6). The host config supplies a
 * SqliteStore as engineOptions.stores.journal; the CLI's engine assembly
 * honors it (JsonlFileStore is only the default fallback), so run /
 * runs ls / inspect all round-trip against sqlite through the same
 * command paths the JsonlFileStore e2e suite exercises.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { runCli } from './cli-main.js';
import type { CliIo } from './io.js';

const CORE = pathToFileURL(resolve(import.meta.dirname, '../../core/dist/index.js')).href;
const TESTING = pathToFileURL(resolve(import.meta.dirname, '../../testing/dist/index.js')).href;
const SQLITE = pathToFileURL(resolve(import.meta.dirname, '../../store-sqlite/dist/index.js')).href;

interface ScriptedIo extends CliIo {
  out: (line: string) => void;
  err: (line: string) => void;
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

/** A project whose host config backs the engine with a SqliteStore. */
function writeSqliteProject(): { cwd: string; dbPath: string } {
  const cwd = mkdtempSync(join(tmpdir(), 'lurker-cli-sqlite-'));
  const dbPath = join(cwd, 'journal.db');
  writeFileSync(
    join(cwd, 'lurker.config.mjs'),
    `import { defineWorkflow } from ${JSON.stringify(CORE)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING)};
import { SqliteStore } from ${JSON.stringify(SQLITE)};

const gated = defineWorkflow({ name: 'gated' }, async (ctx, args) => {
  const analysis = await ctx.agent('analyze ' + String(args.item));
  const approval = await ctx.awaitExternal('editor-approval', { prompt: 'ship it?' });
  return { analysis, approved: approval.approved, item: args.item };
});

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'sqlite analysis' } })],
    stores: { journal: new SqliteStore({ path: ${JSON.stringify(dbPath)} }) },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { gated },
};
`,
    'utf8',
  );
  return { cwd, dbPath };
}

function runIdOf(io: ScriptedIo): string {
  const line = io.errLines.find((entry) => entry.startsWith('runId: '));
  expect(line).toBeDefined();
  return (line as string).slice('runId: '.length);
}

describe('CLI end to end against SqliteStore (M5 exit)', () => {
  it('run/suspend, runs ls, resume, inspect all round-trip on sqlite', async () => {
    const { cwd } = writeSqliteProject();

    // run, exhaust input: the run suspends into the sqlite-backed journal.
    const first = scriptedIo([]);
    expect(await runCli(['run', 'gated', '--args', '{"item":42}'], { cwd, io: first })).toBe(0);
    const runId = runIdOf(first);
    expect(first.errLines.some((l) => l.includes('status: suspended'))).toBe(true);

    // runs ls reads the sqlite meta table.
    const ls = scriptedIo();
    expect(await runCli(['runs', 'ls'], { cwd, io: ls })).toBe(0);
    expect(ls.outLines.find((l) => l.startsWith(runId))).toContain('workflow=gated');

    // resume against the sqlite journal completes the run.
    const second = scriptedIo(['{"approved":true}']);
    expect(await runCli(['resume', runId, '--args', '{"item":42}'], { cwd, io: second })).toBe(0);
    const value = JSON.parse(second.outLines.join('\n')) as Record<string, unknown>;
    expect(value).toEqual({ analysis: 'sqlite analysis', approved: true, item: 42 });

    // inspect renders the sqlite-loaded journal summary and cost view.
    const inspect = scriptedIo();
    expect(await runCli(['inspect', runId], { cwd, io: inspect })).toBe(0);
    const text = inspect.outLines.join('\n');
    expect(text).toContain('workflow: gated');
    expect(text).toContain('open suspensions: 0');
    expect(text).toContain('cost: $0.0000');
  });
});
