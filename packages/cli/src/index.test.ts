/**
 * CLI e2e (M5-T01 acceptance): the run/suspend/resume round-trip over
 * the real command paths against FakeAdapter, engine assembly from the
 * host config convention, runs ls, and the inspect journal summary.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
  const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-'));
  writeFileSync(
    join(cwd, 'rulvar.config.mjs'),
    `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const review = defineWorkflow({ name: 'review' }, async (ctx, args) => {
  const analysis = await ctx.agent('analyze item ' + String(args.item));
  const approval = await ctx.awaitExternal('editor-approval', {
    prompt: 'publish the analysis?',
  });
  return { analysis, approved: approval.approved, item: args.item };
});

const echo = defineWorkflow({ name: 'echo' }, async (ctx, args) => {
  return await ctx.agent('echo ' + String(args?.value ?? 'missing'));
});

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'analysis complete' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { review, echo },
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

describe('rulvar CLI (M5-T01)', () => {
  it('prints help and rejects unknown commands (no aliases in v1)', async () => {
    const help = scriptedIo();
    expect(await runCli(['--help'], { cwd: process.cwd(), io: help })).toBe(0);
    expect(help.outLines.join('\n')).toContain('rulvar run <file|name>');

    const unknown = scriptedIo();
    expect(await runCli(['launch'], { cwd: process.cwd(), io: unknown })).toBe(1);
    expect(unknown.errLines.join('\n')).toContain("unknown command 'launch'");

    const alias = scriptedIo();
    expect(await runCli(['runs', 'list'], { cwd: process.cwd(), io: alias })).toBe(1);
  });

  it('run resolves an external interactively and completes in one invocation', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo(['{"approved":true}']);
    const code = await runCli(['run', 'review', '--args', '{"item":7}', '--store', '.rulvar'], {
      cwd,
      io,
    });
    expect(code).toBe(0);
    const value = JSON.parse(io.outLines.join('\n')) as Record<string, unknown>;
    expect(value).toEqual({ analysis: 'analysis complete', approved: true, item: 7 });
    expect(io.errLines.some((line) => line.includes('status: ok'))).toBe(true);
  });

  it('interactive tool approval creates exactly one continuation (split-brain regression)', async () => {
    // v1.10 deep E2E review: driveRun resolves the approval on the
    // SETTLED handle and then resumes; the approved tool must execute
    // once, one terminal agent entry lands, and every seq stays unique.
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-'));
    const markerPath = join(cwd, 'deploys.log');
    writeFileSync(
      join(cwd, 'rulvar.config.mjs'),
      `import { appendFileSync } from 'node:fs';
import { defineWorkflow, tool } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF, fakeToolCalls } from ${JSON.stringify(TESTING_DIST)};

const deploy = tool({
  name: 'deploy',
  description: 'deploys the site',
  parameters: { type: 'object' },
  needsApproval: true,
  execute: async (input) => {
    appendFileSync(${JSON.stringify(markerPath)}, JSON.stringify(input) + '\\n');
    return 'deployed';
  },
});

const guarded = defineWorkflow({ name: 'guarded' }, async (ctx) =>
  ctx.agent('ship it', { tools: [deploy] }),
);

let turns = 0;
export default {
  engineOptions: {
    adapters: [
      new FakeAdapter({
        agents: {
          '*': () => {
            turns += 1;
            return turns === 1
              ? fakeToolCalls({ name: 'deploy', args: { site: 'prod' } })
              : 'released';
          },
        },
      }),
    ],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { guarded },
};
`,
      'utf8',
    );

    const io = scriptedIo(['allow']);
    const code = await runCli(['run', 'guarded', '--store', '.rulvar'], { cwd, io });
    expect(code).toBe(0);
    expect(JSON.parse(io.outLines.join('\n'))).toBe('released');
    expect(io.errLines.some((line) => line.includes('status: ok'))).toBe(true);

    // The execution marker: exactly one tool execution.
    const markers = readFileSync(markerPath, 'utf8').trim().split('\n');
    expect(markers).toEqual(['{"site":"prod"}']);

    // The journal: unique strictly increasing seqs, one approval, one
    // resolution, ONE terminal agent entry, so usage is counted once.
    const runId = runIdOf(io);
    const lines = readFileSync(join(cwd, '.rulvar', `${runId}.jsonl`), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { seq: number; kind: string; status: string });
    const seqs = lines.map((entry) => entry.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(seqs.every((seq, i) => i === 0 || seq > (seqs[i - 1] ?? Number.NaN))).toBe(true);
    expect(lines.filter((entry) => entry.kind === 'approval')).toHaveLength(1);
    expect(lines.filter((entry) => entry.kind === 'resolution')).toHaveLength(1);
    expect(
      lines.filter(
        (entry) =>
          entry.kind === 'agent' && entry.status !== 'running' && entry.status !== 'suspended',
      ),
    ).toHaveLength(1);
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
    // (the amended resume grammar).
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
    writeFileSync(join(cwd, 'rulvar.config.mjs'), 'export default { workflows: {} };\n', 'utf8');
    const resume = scriptedIo();
    // Correct args pass the args gate; the registration check then fires.
    expect(await runCli(['resume', runId, '--args', '{"item":2}'], { cwd, io: resume })).toBe(1);
    expect(resume.errLines.join('\n')).toContain('register it under that name');
  });

  it('runs a workflow from a file target with its own engineOptions', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-file-'));
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

describe('resume args safety and the dry-run preview (v1.23.0 review)', () => {
  const journalOf = (cwd: string, runId: string): string =>
    readFileSync(join(cwd, '.rulvar', `${runId}.jsonl`), 'utf8');
  const metaOf = (cwd: string, runId: string): string =>
    readFileSync(join(cwd, '.rulvar', `${runId}.meta.json`), 'utf8');

  async function completedEchoRun(cwd: string): Promise<string> {
    const io = scriptedIo();
    const code = await runCli(
      ['run', 'echo', '--args', '{"value":"CHECK"}', '--store', '.rulvar'],
      { cwd, io },
    );
    expect(code).toBe(0);
    return runIdOf(io);
  }

  it('same-args resume is a pure replay: journal and meta stay byte-identical', async () => {
    const cwd = writeFixtureProject();
    const runId = await completedEchoRun(cwd);
    const journalBefore = journalOf(cwd, runId);
    const io = scriptedIo();
    const code = await runCli(
      ['resume', runId, '--args', '{"value":"CHECK"}', '--store', '.rulvar'],
      { cwd, io },
    );
    expect(code).toBe(0);
    // Byte-identical journal = zero live calls AND unchanged cost (the
    // cost report folds from exactly these entries).
    expect(journalOf(cwd, runId)).toBe(journalBefore);
    expect(JSON.parse(io.outLines.join('\n'))).toBe('analysis complete');
    expect(io.errLines.some((line) => line.includes('warning'))).toBe(false);
  });

  it('missing args on an args run refuse before the engine, mutating nothing', async () => {
    const cwd = writeFixtureProject();
    const runId = await completedEchoRun(cwd);
    const journalBefore = journalOf(cwd, runId);
    const metaBefore = metaOf(cwd, runId);
    const io = scriptedIo();
    const code = await runCli(['resume', runId, '--store', '.rulvar'], { cwd, io });
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain('was started WITH args');
    expect(io.errLines.join('\n')).toContain('--allow-args-change');
    expect(journalOf(cwd, runId)).toBe(journalBefore);
    expect(metaOf(cwd, runId)).toBe(metaBefore);
  });

  it('mismatched args refuse without the flag and proceed loudly with it', async () => {
    const cwd = writeFixtureProject();
    const runId = await completedEchoRun(cwd);
    const journalBefore = journalOf(cwd, runId);
    const refused = scriptedIo();
    expect(
      await runCli(['resume', runId, '--args', '{"value":"OTHER"}', '--store', '.rulvar'], {
        cwd,
        io: refused,
      }),
    ).toBe(1);
    expect(refused.errLines.join('\n')).toContain('does not match the args');
    expect(journalOf(cwd, runId)).toBe(journalBefore);

    const forced = scriptedIo();
    expect(
      await runCli(
        [
          'resume',
          runId,
          '--args',
          '{"value":"OTHER"}',
          '--allow-args-change',
          '--store',
          '.rulvar',
        ],
        { cwd, io: forced },
      ),
    ).toBe(0);
    expect(forced.errLines.join('\n')).toContain('changed args');
    // The changed args made the call a genuine new operation.
    expect(journalOf(cwd, runId).trim().split('\n').length).toBeGreaterThan(
      journalBefore.trim().split('\n').length,
    );
  });

  it('a no-args run resumes bare silently; added args need the flag', async () => {
    const cwd = writeFixtureProject();
    const first = scriptedIo();
    expect(await runCli(['run', 'echo', '--store', '.rulvar'], { cwd, io: first })).toBe(0);
    const runId = runIdOf(first);
    const journalBefore = journalOf(cwd, runId);

    const bare = scriptedIo();
    expect(await runCli(['resume', runId, '--store', '.rulvar'], { cwd, io: bare })).toBe(0);
    expect(bare.errLines.some((line) => line.includes('warning'))).toBe(false);
    expect(journalOf(cwd, runId)).toBe(journalBefore);

    const added = scriptedIo();
    expect(
      await runCli(['resume', runId, '--args', '{"value":"NEW"}', '--store', '.rulvar'], {
        cwd,
        io: added,
      }),
    ).toBe(1);
    expect(added.errLines.join('\n')).toContain('was started WITHOUT args');
    expect(journalOf(cwd, runId)).toBe(journalBefore);
  });

  it('dry-run prints the preview and leaves journal and meta byte-identical', async () => {
    const cwd = writeFixtureProject();
    const runId = await completedEchoRun(cwd);
    const journalBefore = journalOf(cwd, runId);
    const metaBefore = metaOf(cwd, runId);

    const clean = scriptedIo();
    expect(
      await runCli(
        ['resume', runId, '--args', '{"value":"CHECK"}', '--dry-run', '--store', '.rulvar'],
        { cwd, io: clean },
      ),
    ).toBe(0);
    const cleanErr = clean.errLines.join('\n');
    expect(cleanErr).toContain('dry-run preview');
    expect(cleanErr).toMatch(/hits: [1-9]/u);
    expect(cleanErr).toContain('misses: 0');
    expect(cleanErr).toContain('would settle: ok');
    expect(journalOf(cwd, runId)).toBe(journalBefore);
    expect(metaOf(cwd, runId)).toBe(metaBefore);

    // A preview with deliberately dropped args reports the miss instead
    // of paying for it, and still mutates nothing.
    const missing = scriptedIo();
    expect(
      await runCli(['resume', runId, '--dry-run', '--allow-args-change', '--store', '.rulvar'], {
        cwd,
        io: missing,
      }),
    ).toBe(0);
    expect(missing.errLines.join('\n')).toContain('stopped at the first would-be-live call');
    expect(journalOf(cwd, runId)).toBe(journalBefore);
    expect(metaOf(cwd, runId)).toBe(metaBefore);

    // The args gate runs before a preview too.
    const gated = scriptedIo();
    expect(
      await runCli(['resume', runId, '--dry-run', '--store', '.rulvar'], { cwd, io: gated }),
    ).toBe(1);
    expect(gated.errLines.join('\n')).toContain('was started WITH args');
  });

  it('legacy metas without the binding demand explicit acknowledgment', async () => {
    const cwd = writeFixtureProject();
    const runId = await completedEchoRun(cwd);
    // Simulate a run recorded before rulvar 1.24.0.
    const metaPath = join(cwd, '.rulvar', `${runId}.meta.json`);
    const legacy = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, unknown>;
    delete legacy.argsProvided;
    delete legacy.argsHash;
    writeFileSync(metaPath, JSON.stringify(legacy), 'utf8');
    const journalBefore = journalOf(cwd, runId);

    const refused = scriptedIo();
    expect(await runCli(['resume', runId, '--store', '.rulvar'], { cwd, io: refused })).toBe(1);
    expect(refused.errLines.join('\n')).toContain('predates the args binding');
    expect(journalOf(cwd, runId)).toBe(journalBefore);

    const withArgs = scriptedIo();
    expect(
      await runCli(['resume', runId, '--args', '{"value":"CHECK"}', '--store', '.rulvar'], {
        cwd,
        io: withArgs,
      }),
    ).toBe(0);
    expect(withArgs.errLines.join('\n')).toContain('cannot be verified');
    expect(journalOf(cwd, runId)).toBe(journalBefore);

    const acknowledged = scriptedIo();
    expect(
      await runCli(['resume', runId, '--allow-args-change', '--store', '.rulvar'], {
        cwd,
        io: acknowledged,
      }),
    ).toBe(0);
  });
});

describe('resume args safety hardening (v1.24.0 review P2-1)', () => {
  const journalOf = (cwd: string, runId: string): string =>
    readFileSync(join(cwd, '.rulvar', `${runId}.jsonl`), 'utf8');
  const metaPathOf = (cwd: string, runId: string): string =>
    join(cwd, '.rulvar', `${runId}.meta.json`);

  async function completedEchoRun(cwd: string): Promise<string> {
    const io = scriptedIo();
    expect(
      await runCli(['run', 'echo', '--args', '{"value":"CHECK"}', '--store', '.rulvar'], {
        cwd,
        io,
      }),
    ).toBe(0);
    return runIdOf(io);
  }

  // A JSON number that overflows JavaScript's finite range parses to
  // Infinity, which cannot be canonicalized, so genesis would record the
  // binding WITHOUT a hash and the resume gate would soften to a warning
  // that lets changed args through. The CLI refuses such --args at parse
  // time, before any config, store, or adapter loads.
  it.each([
    ['a positive overflow', ['run', 'echo', '--args', '1e400', '--store', '.rulvar']],
    ['a negative overflow', ['run', 'echo', '--args=-1e400', '--store', '.rulvar']],
    ['a nested overflow', ['run', 'echo', '--args', '{"limit":1e400}', '--store', '.rulvar']],
  ])('%s in --args is refused at parse time, starting nothing', async (_label, argv) => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    expect(await runCli(argv, { cwd, io })).toBe(1);
    expect(io.errLines.join('\n')).toContain('not representable as canonical JSON');
    // Refused before config/store/adapter: no run started, no store dir.
    expect(io.errLines.some((line) => line.startsWith('runId: '))).toBe(false);
    expect(existsSync(join(cwd, '.rulvar'))).toBe(false);
  });

  it('a large but finite --args number is accepted and gets a hash', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    // 1e308 is finite (1e309 would overflow to Infinity).
    expect(
      await runCli(['run', 'echo', '--args', '1e308', '--store', '.rulvar'], { cwd, io }),
    ).toBe(0);
    const runId = runIdOf(io);
    const inspected = scriptedIo();
    expect(await runCli(['inspect', runId, '--store', '.rulvar'], { cwd, io: inspected })).toBe(0);
    const out = inspected.outLines.join('\n');
    expect(out).toContain('args at genesis: provided (hash ');
    expect(out).not.toContain('no hash');
  });

  it('an unverifiable no-hash binding refuses supplied args without the flag, allows with it', async () => {
    // A run an in-process host recorded with non-JCS genesis args:
    // argsProvided true, argsHash absent. The CLI cannot verify supplied
    // --args against it, so a bare supplied resume is a typed refusal,
    // not the soft warning the JSON-overflow bypass relied on.
    const cwd = writeFixtureProject();
    const runId = await completedEchoRun(cwd);
    const metaPath = metaPathOf(cwd, runId);
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, unknown>;
    meta.argsProvided = true;
    delete meta.argsHash;
    writeFileSync(metaPath, JSON.stringify(meta), 'utf8');
    const journalBefore = journalOf(cwd, runId);

    const refused = scriptedIo();
    expect(
      await runCli(['resume', runId, '--args', '{"value":"CHECK"}', '--store', '.rulvar'], {
        cwd,
        io: refused,
      }),
    ).toBe(1);
    expect(refused.errLines.join('\n')).toContain('no verifiable hash');
    expect(journalOf(cwd, runId)).toBe(journalBefore);

    const forced = scriptedIo();
    expect(
      await runCli(
        [
          'resume',
          runId,
          '--args',
          '{"value":"CHECK"}',
          '--allow-args-change',
          '--store',
          '.rulvar',
        ],
        { cwd, io: forced },
      ),
    ).toBe(0);
    expect(forced.errLines.join('\n')).toContain('cannot be verified');
    // Matching args with the flag is still a pure replay.
    expect(journalOf(cwd, runId)).toBe(journalBefore);
  });
});
