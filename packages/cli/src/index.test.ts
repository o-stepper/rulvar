/**
 * CLI e2e (M5-T01 acceptance): the run/suspend/resume round-trip over
 * the real command paths against FakeAdapter, engine assembly from the
 * host config convention, runs ls, and the inspect journal summary.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  JsonlFileStore,
  RUN_SETTLE_DECISION_TYPE,
  type JournalEntry,
  type RunMeta,
} from '@rulvar/core';

import type { CliIo } from './io.js';
import { runCli } from './cli-main.js';
import { reportDryRun, reportOutcome, strictExitCode } from './drive.js';

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

// A completion envelope carrying rejected finish candidates (RV2507),
// reported through the documented lift so the settle persists them and
// an offline reader finds them (RV2605). Both rows carry the SAME hash:
// the model served one document twice.
const refused = defineWorkflow({ name: 'refused' }, async (ctx) => {
  await ctx.agent('compose the deliverable');
  return {
    completion: 'complete',
    childStatusCounts: { ok: 1 },
    rejectedFinishCandidates: [
      {
        callId: 'call-a',
        verdict: 'repair',
        hash: 'b'.repeat(64),
        chars: 5207,
        failed: [{ name: 'evidence-grade', reasons: ['two sentences'] }],
      },
      {
        callId: 'call-b',
        verdict: 'rejected',
        hash: 'b'.repeat(64),
        chars: 5207,
        failed: [{ name: 'evidence-grade', reasons: ['two sentences'] }],
      },
    ],
  };
});

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'analysis complete' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { review, echo, refused },
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

  it('inspect names the logical run and what the contract refused (RV2605)', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    expect(await runCli(['run', 'refused'], { cwd, io })).toBe(0);
    const runId = runIdOf(io);
    const inspect = scriptedIo();
    expect(await runCli(['inspect', runId], { cwd, io: inspect })).toBe(0);
    const text = inspect.outLines.join('\n');
    // One segment, and the entry count that produced it: `entries: N`
    // alone says nothing about where a resumed run's boundaries are.
    expect(text).toMatch(/segments: 1 \(ok after \d+\)/);
    expect(text).not.toContain('entries after the last settle');
    // Two rows, one document: the reading that used to need an
    // external script over the whole agent transcript.
    expect(text).toContain('rejected finish candidates: 2 (1 distinct document(s))');
    expect(text).toContain('repair call-a: 5207 chars, sha256 bbbbbbbbbbbb, failed evidence-grade');
    expect(text).toContain('rejected call-b: 5207 chars, sha256 bbbbbbbbbbbb, failed');
  });

  it('inspect names the children a journal already holds (RV2702)', async () => {
    // The post-mortem case: a run that crossed its ceiling mid-roster
    // left the live roster in the process that died, and the journal
    // holds every ingredient. The entries are hand-built here because
    // the shape under test is the JOURNAL's, not this fixture's.
    const cwd = writeFixtureProject();
    const store = new JsonlFileStore({ dir: join(cwd, '.rulvar') });
    const base = {
      hashVersion: 2,
      ordinal: 0,
      spanId: 's',
      startedAt: new Date(1_700_000_000_000).toISOString(),
    } as const;
    await store.append('ROSTER', {
      ...base,
      seq: 0,
      scope: '',
      key: '',
      kind: 'decision',
      status: 'ok',
      value: {
        decisionType: 'spawn-admission',
        origin: 'spawn_agent',
        orchestratorScope: '',
        childScope: 'agent:0',
        spawnOrdinal: 0,
        name: 'worker',
        decision: { verdict: { kind: 'admit' } },
      },
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('ROSTER', {
      ...base,
      seq: 1,
      scope: 'agent:0',
      key: 'k1',
      kind: 'agent',
      status: 'running',
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('ROSTER', {
      ...base,
      seq: 2,
      scope: 'agent:0',
      key: 'k1',
      kind: 'agent',
      status: 'ok',
      ref: 1,
      costAttribution: { agentType: 'worker', role: 'loop' },
      evidence: { recordedEntries: 0, minEntries: 2, met: false },
    } as unknown as Parameters<typeof store.append>[1]);
    await store.putMeta({ runId: 'ROSTER', status: 'exhausted', segments: 1, updatedAt: 'x' });

    const inspect = scriptedIo();
    expect(await runCli(['inspect', 'ROSTER'], { cwd, io: inspect })).toBe(0);
    const text = inspect.outLines.join('\n');
    expect(text).toContain('children under agent:0: 1 admitted, 1 settled (ok 1)');
    // The child that looks healthiest and is not, named by the handle
    // the orchestrator's own turns used.
    expect(text).toContain('settled ok below their declared evidence floor: 1 (handle 1)');
    // Nothing was abandoned here, and the report says nothing (RV2804).
    expect(text).not.toContain('ABANDONED');

    // The same roster with the branch discarded: the provider billed
    // this child and the run kept none of it, so a reader counting
    // settled children is counting work that was thrown away.
    await store.append('ROSTER', {
      ...base,
      seq: 3,
      scope: '',
      key: '',
      kind: 'abandon',
      status: 'ok',
      ref: 1,
      abandon: { target: 1, authorizedBy: 0, reason: 'a better branch won' },
    } as unknown as Parameters<typeof store.append>[1]);
    const after = scriptedIo();
    expect(await runCli(['inspect', 'ROSTER'], { cwd, io: after })).toBe(0);
    expect(after.outLines.join('\n')).toContain('on branches the run ABANDONED: 1 (handle 1)');
  });

  it('inspect --candidates renders the chain and --candidate-bytes answers by name (RV4207)', async () => {
    // The sixth comparison experiment's auditor dug a rejected
    // composition out of a binary transcript blob by hand; the chain
    // and the recovery path are now one command each. The journal is
    // hand-built because the shape under test is the JOURNAL's.
    const cwd = writeFixtureProject();
    const store = new JsonlFileStore({ dir: join(cwd, '.rulvar') });
    const base = {
      hashVersion: 2,
      ordinal: 0,
      spanId: 's',
      startedAt: new Date(1_700_000_000_000).toISOString(),
    } as const;
    const rejectedHash = 'a'.repeat(64);
    const acceptedHash = 'b'.repeat(64);
    await store.append('CHAIN', {
      ...base,
      seq: 1,
      scope: 'agent:1',
      key: 'k1',
      kind: 'agent',
      status: 'running',
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('CHAIN', {
      ...base,
      seq: 2,
      scope: 'agent:1',
      key: 'fv-a',
      kind: 'decision',
      status: 'ok',
      value: {
        decisionType: 'orchestrator_finish_validation',
        callId: 'call-a',
        verdict: 'repair',
        failed: [{ name: 'wants-marker', reasons: ['no MARKER'] }],
        repairsUsed: 0,
        maxRepairs: 1,
        candidateHash: rejectedHash,
        candidateChars: 18,
        bytesUnavailableReason: 'hash-only-persistence',
      },
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('CHAIN', {
      ...base,
      seq: 3,
      scope: 'agent:1',
      key: 'fv-b',
      kind: 'decision',
      status: 'ok',
      value: {
        decisionType: 'orchestrator_finish_validation',
        callId: 'call-b',
        verdict: 'accepted',
        failed: [],
        repairsUsed: 1,
        maxRepairs: 1,
        candidateHash: acceptedHash,
        candidateChars: 24,
      },
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('CHAIN', {
      ...base,
      seq: 4,
      scope: 'agent:1',
      key: 'k1',
      kind: 'agent',
      status: 'ok',
      ref: 1,
      endedAt: new Date(1_700_000_010_000).toISOString(),
      costAttribution: { role: 'synthesize', label: 'final-composition' },
    } as unknown as Parameters<typeof store.append>[1]);
    await store.putMeta({ runId: 'CHAIN', status: 'ok', segments: 1, updatedAt: 'x' });

    const chain = scriptedIo();
    expect(await runCli(['inspect', 'CHAIN', '--candidates'], { cwd, io: chain })).toBe(0);
    const text = chain.outLines.join('\n');
    expect(text).toContain('finish candidates: 2 across 1 synthesis span(s)');
    expect(text).toContain(`seq 2 repair: sha256 ${rejectedHash.slice(0, 12)}, 18 chars`);
    expect(text).toContain('failed wants-marker');
    expect(text).toContain('bytes unavailable: hash-only-persistence');
    expect(text).toContain(`seq 3 accepted: sha256 ${acceptedHash.slice(0, 12)}, 24 chars`);
    expect(text).toContain('recover bytes: rulvar inspect');

    // Bytes absent BY POLICY answer by name, not by mystery.
    const byPolicy = scriptedIo();
    expect(
      await runCli(['inspect', 'CHAIN', '--candidate-bytes', rejectedHash], {
        cwd,
        io: byPolicy,
      }),
    ).toBe(1);
    expect(byPolicy.errLines.join('\n')).toContain('has no retained bytes');
    expect(byPolicy.errLines.join('\n')).toContain('hash-only-persistence');

    // An unknown hash names the remedy.
    const unknown = scriptedIo();
    expect(
      await runCli(['inspect', 'CHAIN', '--candidate-bytes', 'c'.repeat(64)], {
        cwd,
        io: unknown,
      }),
    ).toBe(1);
    expect(unknown.errLines.join('\n')).toContain('no finish candidate with hash');
  });

  it('inspect prints the observed calibration and names the unpaired sides (RV3103)', async () => {
    // The RV3003 fold in operator output: one dispatch carrying both
    // the RV806 verdict and the RV3002 counter, one carrying the
    // verdict only (a journal written before the counter shipped).
    const cwd = writeFixtureProject();
    const store = new JsonlFileStore({ dir: join(cwd, '.rulvar') });
    const base = {
      hashVersion: 2,
      ordinal: 0,
      spanId: 's',
      startedAt: new Date(1_700_000_000_000).toISOString(),
    } as const;
    await store.append('CAL', {
      ...base,
      seq: 0,
      scope: 'agent:0',
      key: 'k1',
      kind: 'agent',
      status: 'running',
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('CAL', {
      ...base,
      seq: 1,
      scope: 'agent:0',
      key: 'k1',
      kind: 'agent',
      status: 'ok',
      ref: 0,
      costAttribution: { agentType: 'worker', role: 'loop' },
      evidence: { recordedEntries: 4, minEntries: 2, met: true },
      toolBudget: { used: 6, cap: 20 },
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('CAL', {
      ...base,
      seq: 2,
      scope: 'agent:1',
      key: 'k2',
      kind: 'agent',
      status: 'running',
    } as unknown as Parameters<typeof store.append>[1]);
    await store.append('CAL', {
      ...base,
      seq: 3,
      scope: 'agent:1',
      key: 'k2',
      kind: 'agent',
      status: 'ok',
      ref: 2,
      costAttribution: { agentType: 'worker', role: 'loop' },
      evidence: { recordedEntries: 1, minEntries: 1, met: true },
    } as unknown as Parameters<typeof store.append>[1]);
    await store.putMeta({ runId: 'CAL', status: 'ok', segments: 1, updatedAt: 'x' });

    const inspect = scriptedIo();
    expect(await runCli(['inspect', 'CAL'], { cwd, io: inspect })).toBe(0);
    const text = inspect.outLines.join('\n');
    expect(text).toContain(
      'observed tool calls per recorded evidence entry: 1.50 ' +
        '(6 executed calls over 4 entries across 1 paired dispatch)',
    );
    expect(text).toContain(
      'declared evidence contracts with no journaled call counter: 1 ' +
        '(a journal written before the counter shipped records no rate)',
    );

    // The vacuum contrast (RV1209 in operator output): a journal
    // carrying neither side prints no calibration lines at all.
    const io = scriptedIo();
    expect(await runCli(['run', 'refused'], { cwd, io })).toBe(0);
    const bare = scriptedIo();
    expect(await runCli(['inspect', runIdOf(io)], { cwd, io: bare })).toBe(0);
    const bareText = bare.outLines.join('\n');
    expect(bareText).not.toContain('observed tool calls per recorded evidence entry');
    expect(bareText).not.toContain('declared evidence contracts with no journaled call counter');
  });

  it('inspect prints the completion the last settle recorded (RV2703)', async () => {
    // The offline half: `lastRunSettle` has carried the semantic claim
    // since the persisted-terminal tail, and inspect printed the
    // acceptance DECISION only, so a run that died before acceptance
    // (or was resumed past it) showed a reader nothing.
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    expect(await runCli(['run', 'refused'], { cwd, io })).toBe(0);
    const runId = runIdOf(io);
    const inspect = scriptedIo();
    expect(await runCli(['inspect', runId], { cwd, io: inspect })).toBe(0);
    expect(inspect.outLines.join('\n')).toContain(
      'completion: complete (the last settle claims the work is complete)',
    );
  });

  it('inspect says nothing about refused candidates when a run had none (RV2605)', async () => {
    // The vacuum contrast: absence is NOT RECORDED, and an ordinary run
    // prints exactly what it printed before.
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"x"}'], { cwd, io });
    const runId = runIdOf(io);
    const inspect = scriptedIo();
    expect(await runCli(['inspect', runId], { cwd, io: inspect })).toBe(0);
    const text = inspect.outLines.join('\n');
    expect(text).not.toContain('rejected finish candidates');
    expect(text).toMatch(/segments: 1 \(ok after \d+\)/);
    // A workflow that claims no completion prints no completion line
    // (RV2703): absence is NOT RECORDED, never an incomplete run.
    expect(text).not.toContain('completion:');
    // And a run that spawned no children has no roster, not an empty
    // one (RV2702).
    expect(text).not.toContain('children under');
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

  it('cost-audit verifies the one-denominator contract and flags a moving roster (RV1910)', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"x"}', '--store', '.rulvar'], { cwd, io });
    const runId = runIdOf(io);

    const clean = scriptedIo();
    expect(await runCli(['cost-audit', runId, '--store', '.rulvar'], { cwd, io: clean })).toBe(0);
    const cleanText = clean.outLines.join('\n');
    expect(cleanText).toContain('cost audit (one denominator)');
    expect(cleanText).toContain('[pass] roster-closed');
    expect(cleanText).toContain('[pass] settle-is-billing-boundary');
    expect(cleanText).toContain('[pass] wires-match');
    // The RV2008 lane: the fixture run journals incremental rows and
    // they agree with the terminal set.
    expect(cleanText).toContain('[pass] incremental-rows-match');
    // The RV4002 lane: a journal that proves no repair prints no
    // repairs line, so pre-RV4002 journals and repair-free runs render
    // byte for byte.
    expect(cleanText).not.toContain('repairs:');

    const jsonIo = scriptedIo();
    expect(
      await runCli(['cost-audit', runId, '--store', '.rulvar', '--json'], { cwd, io: jsonIo }),
    ).toBe(0);
    const parsedAudit = JSON.parse(jsonIo.outLines.join('\n')) as { verdict?: string };
    expect(parsedAudit.verdict).toBe('one-denominator');

    // Poison the journal with a straggler the pre-RV1904 lifecycle
    // allowed: a running agent entry with no terminal, appended after
    // the settle. The audit must flag it instead of averaging over it.
    const journalPath = join(cwd, '.rulvar', `${runId}.jsonl`);
    const lines = readFileSync(journalPath, 'utf8').trim().split('\n');
    const parsedLines = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const runningTemplate = parsedLines.find(
      (entry) => entry.kind === 'agent' && entry.status === 'running',
    );
    expect(runningTemplate).toBeDefined();
    const maxSeq = Math.max(...parsedLines.map((entry) => entry.seq as number));
    const straggler = {
      ...runningTemplate,
      seq: maxSeq + 1,
      scope: 'agent:99',
      key: 'f'.repeat(typeof runningTemplate!.key === 'string' ? runningTemplate!.key.length : 8),
      ordinal: 0,
    };
    writeFileSync(journalPath, `${lines.join('\n')}\n${JSON.stringify(straggler)}\n`, 'utf8');

    const divergent = scriptedIo();
    expect(await runCli(['cost-audit', runId, '--store', '.rulvar'], { cwd, io: divergent })).toBe(
      1,
    );
    const divergentText = divergent.outLines.join('\n');
    expect(divergentText).toContain('cost audit (DIVERGENT)');
    expect(divergentText).toContain('[FAIL] roster-closed');
    expect(divergentText).toContain('[FAIL] settle-is-billing-boundary');

    // Poison an incremental row's usage (RV2008): the terminal set and
    // the row lane now disagree, and the audit names the agent.
    const poisoned = readFileSync(journalPath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const entry = JSON.parse(line) as {
          kind?: string;
          value?: { decisionType?: string; record?: { usage?: { outputTokens?: number } } };
        };
        if (
          entry.kind === 'decision' &&
          entry.value?.decisionType === 'provider-call' &&
          entry.value.record?.usage !== undefined
        ) {
          entry.value.record.usage.outputTokens = 999_999;
        }
        return JSON.stringify(entry);
      })
      .join('\n');
    writeFileSync(journalPath, `${poisoned}\n`, 'utf8');
    const rowsDiverge = scriptedIo();
    expect(
      await runCli(['cost-audit', runId, '--store', '.rulvar'], { cwd, io: rowsDiverge }),
    ).toBe(1);
    expect(rowsDiverge.outLines.join('\n')).toContain('[FAIL] incremental-rows-match');
  });

  it('cost-audit prints the open intent lane when a wire has unknown outcome (RV4006)', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"x"}', '--store', '.rulvar'], { cwd, io });
    const runId = runIdOf(io);
    const clean = scriptedIo();
    expect(await runCli(['cost-audit', runId, '--store', '.rulvar'], { cwd, io: clean })).toBe(0);
    expect(clean.outLines.join('\n')).not.toContain('open intents:');
    // The crash window, reconstructed: an intent with no receipt and
    // no terminal for its dispatch.
    const journalPath = join(cwd, '.rulvar', `${runId}.jsonl`);
    const lines = readFileSync(journalPath, 'utf8').trim().split('\n');
    const maxSeq = Math.max(...lines.map((line) => (JSON.parse(line) as { seq: number }).seq));
    const orphan = JSON.stringify({
      seq: maxSeq + 1,
      kind: 'decision',
      scope: '',
      key: 'pi:99999:1:1',
      status: 'ok',
      spanId: 'crash-window',
      site: 'provider-intent',
      value: {
        decisionType: 'provider-intent',
        agentRef: 99999,
        ordinal: 1,
        attempt: 1,
        servedBy: 'fake:model',
        requestFingerprint: 'f'.repeat(64),
      },
    });
    writeFileSync(journalPath, `${lines.join('\n')}\n${orphan}\n`, 'utf8');
    const audited = scriptedIo();
    expect(await runCli(['cost-audit', runId, '--store', '.rulvar'], { cwd, io: audited })).toBe(0);
    const text = audited.outLines.join('\n');
    expect(text).toContain('open intents: 1 wire(s) with unknown outcome (RV4006)');
    expect(text).toContain('agent 99999');
    expect(text).toContain('fingerprint ffffffffffffffff');
    const jsonIo = scriptedIo();
    expect(
      await runCli(['cost-audit', runId, '--store', '.rulvar', '--json'], { cwd, io: jsonIo }),
    ).toBe(0);
    const parsed = JSON.parse(jsonIo.outLines.join('\n')) as {
      invoice?: { openIntents?: { count?: number } };
    };
    expect(parsed.invoice?.openIntents?.count).toBe(1);
  });

  it('cost-audit prints the workflow repair ledger when the journal proves one (RV4002)', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"x"}', '--store', '.rulvar'], { cwd, io });
    const runId = runIdOf(io);
    // Append the fifth experiment's shape as journaled decisions: one
    // draft-gate rejection (three validators) and the sectional
    // acceptance that healed it. Decisions only, so every audit check
    // stays green and the exit code stays 0.
    const journalPath = join(cwd, '.rulvar', `${runId}.jsonl`);
    const lines = readFileSync(journalPath, 'utf8').trim().split('\n');
    const parsedLines = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const maxSeq = Math.max(...parsedLines.map((entry) => entry.seq as number));
    const gate = (seq: number, key: string, value: Record<string, unknown>): string =>
      JSON.stringify({ seq, kind: 'decision', scope: '', key, status: 'ok', value });
    const appended = [
      gate(maxSeq + 1, 'draft-gate:call-1', {
        decisionType: 'orchestrator_draft_gate',
        callId: 'call-1',
        verdict: 'rejected',
        failed: [
          { name: 'contract-words', reasons: ['too short'] },
          { name: 'word-count', reasons: ['too short'] },
          { name: 'evidence-grade', reasons: ['no run id'] },
        ],
      }),
      gate(maxSeq + 2, 'draft-gate-accept:call-2', {
        decisionType: 'orchestrator_draft_gate',
        callId: 'call-2',
        verdict: 'accepted',
        spliced: true,
        sections: ['## Verdict'],
      }),
    ];
    writeFileSync(journalPath, `${lines.join('\n')}\n${appended.join('\n')}\n`, 'utf8');
    const audited = scriptedIo();
    expect(await runCli(['cost-audit', runId, '--store', '.rulvar'], { cwd, io: audited })).toBe(0);
    const text = audited.outLines.join('\n');
    expect(text).toContain('repairs: total 1 | draft 1 | composition 0 | semantic 0');
    expect(text).toContain('draft @' + String(maxSeq + 1));
    expect(text).toContain('validators contract-words, word-count, evidence-grade');
    expect(text).toContain('sections ## Verdict');
    const jsonIo = scriptedIo();
    expect(
      await runCli(['cost-audit', runId, '--store', '.rulvar', '--json'], { cwd, io: jsonIo }),
    ).toBe(0);
    const parsed = JSON.parse(jsonIo.outLines.join('\n')) as {
      repairs?: { draft?: number; total?: number };
    };
    expect(parsed.repairs?.draft).toBe(1);
    expect(parsed.repairs?.total).toBe(1);
  });

  it('cost-audit --all sweeps the catalog and exits 1 when any run diverges (RV2209)', async () => {
    const cwd = writeFixtureProject();
    const first = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"a"}', '--store', '.rulvar'], {
      cwd,
      io: first,
    });
    const green = runIdOf(first);
    const second = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"b"}', '--store', '.rulvar'], {
      cwd,
      io: second,
    });
    const broken = runIdOf(second);

    // Two green runs: one summary row each, exit 0.
    const clean = scriptedIo();
    expect(await runCli(['cost-audit', '--all', '--store', '.rulvar'], { cwd, io: clean })).toBe(0);
    const cleanText = clean.outLines.join('\n');
    expect(cleanText).toContain('cost audit: 2 runs, 0 divergent');
    expect(cleanText).toContain(`${green}: one denominator | checks 6/6`);

    // Break the second journal the pre-RV1904 way (the benchmark
    // recovery shape): a running agent straggler appended after the
    // settle. The sweep must carry one green and one divergent row and
    // exit 1; averaging over the catalog is exactly what it exists to
    // refuse.
    const journalPath = join(cwd, '.rulvar', `${broken}.jsonl`);
    const lines = readFileSync(journalPath, 'utf8').trim().split('\n');
    const parsedLines = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const runningTemplate = parsedLines.find(
      (entry) => entry.kind === 'agent' && entry.status === 'running',
    );
    expect(runningTemplate).toBeDefined();
    const maxSeq = Math.max(...parsedLines.map((entry) => entry.seq as number));
    const straggler = {
      ...runningTemplate,
      seq: maxSeq + 1,
      scope: 'agent:99',
      key: 'f'.repeat(typeof runningTemplate!.key === 'string' ? runningTemplate!.key.length : 8),
      ordinal: 0,
    };
    writeFileSync(journalPath, `${lines.join('\n')}\n${JSON.stringify(straggler)}\n`, 'utf8');

    const swept = scriptedIo();
    expect(await runCli(['cost-audit', '--all', '--store', '.rulvar'], { cwd, io: swept })).toBe(1);
    const sweptText = swept.outLines.join('\n');
    expect(sweptText).toContain('cost audit: 2 runs, 1 divergent');
    expect(sweptText).toContain(`${green}: one denominator | checks 6/6`);
    expect(sweptText).toContain(
      `${broken}: DIVERGENT | checks 4/6 (failed roster-closed, settle-is-billing-boundary)`,
    );

    // JSON: the per-run shapes ride under runs, the sweep verdict on
    // top, and the exit code is the same 1.
    const jsonIo = scriptedIo();
    expect(
      await runCli(['cost-audit', '--all', '--store', '.rulvar', '--json'], { cwd, io: jsonIo }),
    ).toBe(1);
    const parsedSweep = JSON.parse(jsonIo.outLines.join('\n')) as {
      verdict: string;
      divergent: number;
      runs: Array<{ runId: string; verdict: string }>;
    };
    expect(parsedSweep.verdict).toBe('divergent');
    expect(parsedSweep.divergent).toBe(1);
    expect(parsedSweep.runs).toHaveLength(2);
    expect(parsedSweep.runs.find((run) => run.runId === broken)?.verdict).toBe('divergent');

    // The ambiguous forms refuse typed: a runId beside --all, and
    // neither.
    const both = scriptedIo();
    expect(
      await runCli(['cost-audit', green, '--all', '--store', '.rulvar'], { cwd, io: both }),
    ).toBe(1);
    expect(both.errLines.join('\n')).toContain('--all audits every run of the store');
    const neither = scriptedIo();
    expect(await runCli(['cost-audit', '--store', '.rulvar'], { cwd, io: neither })).toBe(1);
    expect(neither.errLines.join('\n')).toContain('name a runId, or audit the whole store');
  });

  it('cost-audit surfaces the orphaned receipt lane on every form (RV3501)', async () => {
    const cwd = writeFixtureProject();
    const first = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"a"}', '--store', '.rulvar'], {
      cwd,
      io: first,
    });
    const orphanedRun = runIdOf(first);
    const second = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":"b"}', '--store', '.rulvar'], {
      cwd,
      io: second,
    });
    const green = runIdOf(second);

    // The vacuum contrast first: a journal without the lane prints
    // nothing about it, in text and JSON alike.
    const before = scriptedIo();
    expect(
      await runCli(['cost-audit', orphanedRun, '--store', '.rulvar'], { cwd, io: before }),
    ).toBe(0);
    expect(before.outLines.join('\n')).not.toContain('orphaned receipts');
    const beforeJson = scriptedIo();
    expect(
      await runCli(['cost-audit', orphanedRun, '--store', '.rulvar', '--json'], {
        cwd,
        io: beforeJson,
      }),
    ).toBe(0);
    expect(beforeJson.outLines.join('\n')).not.toContain('orphanedReceipts');

    // Poison the journal into the RV3405 crash shape: a receipt row
    // whose response id no terminal record covers, beside the covered
    // row of the SAME ordinal and usage (a resume redispatch reuses the
    // ordinal, so the incremental lane still matches the terminal set
    // and all six checks stay green).
    const journalPath = join(cwd, '.rulvar', `${orphanedRun}.jsonl`);
    const lines = readFileSync(journalPath, 'utf8').trim().split('\n');
    const parsedLines = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const receiptTemplate = parsedLines.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'provider-call',
    );
    expect(receiptTemplate).toBeDefined();
    const maxSeq = Math.max(...parsedLines.map((entry) => entry.seq as number));
    const templateValue = receiptTemplate!.value as Record<string, unknown> & {
      record?: Record<string, unknown>;
    };
    const orphan = {
      ...receiptTemplate,
      seq: maxSeq + 1,
      key: 'e'.repeat(typeof receiptTemplate!.key === 'string' ? receiptTemplate!.key.length : 8),
      value: {
        ...templateValue,
        record: { ...(templateValue.record ?? {}), responseId: 'resp-orphaned-rv3501' },
      },
    };
    writeFileSync(journalPath, `${lines.join('\n')}\n${JSON.stringify(orphan)}\n`, 'utf8');

    // The single run text: still one denominator, all checks green,
    // exit 0 (the lane never moves the verdict), and the lane printed
    // with one line per receipt.
    const text = scriptedIo();
    expect(await runCli(['cost-audit', orphanedRun, '--store', '.rulvar'], { cwd, io: text })).toBe(
      0,
    );
    const textOut = text.outLines.join('\n');
    expect(textOut).toContain('cost audit (one denominator)');
    expect(textOut).not.toContain('[FAIL]');
    expect(textOut).toContain('orphaned receipts: $');
    expect(textOut).toContain(
      '| wires 1 | paid wires the settled terminal does not cover (RV3405), outside the settled totals',
    );
    expect(textOut).toContain('id resp-orphaned-rv3501');

    // The JSON form carries the lane verbatim under invoice.
    const jsonIo = scriptedIo();
    expect(
      await runCli(['cost-audit', orphanedRun, '--store', '.rulvar', '--json'], {
        cwd,
        io: jsonIo,
      }),
    ).toBe(0);
    const parsedAudit = JSON.parse(jsonIo.outLines.join('\n')) as {
      verdict: string;
      invoice: {
        orphanedReceipts?: {
          usd: number;
          wireRequests: number;
          rows: Array<{ responseId?: string }>;
        };
      };
    };
    expect(parsedAudit.verdict).toBe('one-denominator');
    expect(parsedAudit.invoice.orphanedReceipts?.wireRequests).toBe(1);
    expect(typeof parsedAudit.invoice.orphanedReceipts?.usd).toBe('number');
    expect(parsedAudit.invoice.orphanedReceipts?.rows[0]?.responseId).toBe('resp-orphaned-rv3501');

    // The sweep: exit 0 (an orphan is not a divergence), the carrying
    // count on the header, the suffix on the carrying row only.
    const swept = scriptedIo();
    expect(await runCli(['cost-audit', '--all', '--store', '.rulvar'], { cwd, io: swept })).toBe(0);
    expect(swept.outLines.join('\n')).toContain(
      'cost audit: 2 runs, 0 divergent, 1 carrying orphaned receipts',
    );
    const orphanRow = swept.outLines.find((line) => line.includes(`${orphanedRun}:`));
    expect(orphanRow).toBeDefined();
    expect(orphanRow).toContain(' | orphaned $');
    expect(orphanRow).toContain('(1)');
    const greenRow = swept.outLines.find((line) => line.includes(`${green}:`));
    expect(greenRow).toBeDefined();
    expect(greenRow).not.toContain('orphaned');

    // The sweep JSON reuses the per run shape, lane included on the
    // carrying run and absent on the green one.
    const sweepJson = scriptedIo();
    expect(
      await runCli(['cost-audit', '--all', '--store', '.rulvar', '--json'], {
        cwd,
        io: sweepJson,
      }),
    ).toBe(0);
    const parsedSweep = JSON.parse(sweepJson.outLines.join('\n')) as {
      runs: Array<{ runId: string; invoice: { orphanedReceipts?: { wireRequests: number } } }>;
    };
    expect(
      parsedSweep.runs.find((run) => run.runId === orphanedRun)?.invoice.orphanedReceipts
        ?.wireRequests,
    ).toBe(1);
    expect(
      parsedSweep.runs.find((run) => run.runId === green)?.invoice.orphanedReceipts,
    ).toBeUndefined();
  });

  it('invoice exports the reconciliation rows and totals for a stored run (P1.3)', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo(['{"approved":true}']);
    await runCli(['run', 'review', '--args', '{"item":3}'], { cwd, io });
    const runId = runIdOf(io);

    const text = scriptedIo();
    expect(await runCli(['invoice', runId], { cwd, io: text })).toBe(0);
    const lines = text.outLines.join('\n');
    expect(lines).toContain(`run ${runId}: invoice (ok)`);
    // FakeAdapter is priced at zero by construction; the gross/net
    // split still renders.
    expect(lines).toContain('gross: $0.0000 | net: $0.0000 | abandoned: $0.0000');
    // FakeAdapter surfaces no provider ids, so every dispatched call
    // reconciles as missing-provider-id instead of silently matching.
    expect(lines).toContain('[missing-provider-id]');
    // The text form mirrors the export's declared pricing basis: this
    // run's provider calls fully cover its usage, so the rows are
    // additive (RV504/RV511).
    expect(lines).toContain(
      'pricing basis: per-call (rows are additive: every provider call priced per request; ' +
        'allocatedUsd agrees and sums to gross)',
    );
    // No price table is configured in this fixture, so no pin exists
    // (RV407 gates on the configured table) and the export says the
    // current table priced it.
    expect(lines).toContain('pricing rates: current table (no snapshot in the journal)');

    const json = scriptedIo();
    expect(await runCli(['invoice', runId, '--json'], { cwd, io: json })).toBe(0);
    const parsed = JSON.parse(json.outLines.join('\n')) as {
      totalUsd: number;
      netUsd: number;
      pricingBasis: string;
      rowUsdNonAdditive: boolean;
      rows: Array<{
        ordinal: number;
        outcome: string;
        reconciliation: string;
        allocatedUsd: number;
      }>;
      reconciliationFailures: number;
    };
    expect(parsed.totalUsd).toBe(0);
    expect(parsed.pricingBasis).toBe('per-call');
    // The run's provider calls fully cover its usage: additive rows
    // (RV504).
    expect(parsed.rowUsdNonAdditive).toBe(false);
    expect(parsed.rows.length).toBeGreaterThan(0);
    expect(parsed.rows.every((row) => row.outcome === 'ok')).toBe(true);
    // The additive column is always present and sums to the gross total.
    expect(parsed.rows.every((row) => typeof row.allocatedUsd === 'number')).toBe(true);
    expect(parsed.rows.reduce((acc, row) => acc + row.allocatedUsd, 0)).toBe(parsed.totalUsd);
    expect(parsed.reconciliationFailures).toBe(parsed.rows.length);
    const provenance = (parsed as unknown as { pricing?: { source?: string } }).pricing;
    expect(provenance?.source).toBe('current-table');

    const missing = scriptedIo();
    expect(await runCli(['invoice', 'missing-run'], { cwd, io: missing })).toBe(1);
    expect(missing.errLines.join('\n')).toContain("run 'missing-run' not found");
  });

  it('invoice reproduces the settled numbers after the config table changes (RV407)', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-pricing-'));
    const configWith = (version: string, inputRate: number): string =>
      `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const echo = defineWorkflow({ name: 'echo' }, async (ctx, args) => {
  return await ctx.agent('echo ' + String(args?.value ?? 'missing'));
});

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'echoed' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    pricing: {
      pricingVersion: ${JSON.stringify(version)},
      models: { [FAKE_MODEL_REF]: { inputUsdPerMTok: ${String(inputRate)}, outputUsdPerMTok: ${String(inputRate)} } },
    },
  },
  workflows: { echo },
};
`;
    writeFileSync(join(cwd, 'rulvar.config.mjs'), configWith('v-a', 1000), 'utf8');
    const io = scriptedIo();
    await runCli(['run', 'echo', '--args', '{"value":1}'], { cwd, io });
    const runId = runIdOf(io);

    const first = scriptedIo();
    expect(await runCli(['invoice', runId, '--json'], { cwd, io: first })).toBe(0);
    const settled = JSON.parse(first.outLines.join('\n')) as {
      totalUsd: number;
      pricing?: { source?: string; pricingVersion?: string };
    };
    expect(settled.totalUsd).toBeGreaterThan(0);
    expect(settled.pricing?.source).toBe('composed');
    expect(settled.pricing?.pricingVersion).toBe('v-a');

    // The live table moves 1000x. The settle pin wins: the invoice
    // reproduces the numbers the run settled with, and says which
    // version priced it.
    writeFileSync(join(cwd, 'rulvar.config.mjs'), configWith('v-b', 1_000_000), 'utf8');
    const second = scriptedIo();
    expect(await runCli(['invoice', runId, '--json'], { cwd, io: second })).toBe(0);
    const repriced = JSON.parse(second.outLines.join('\n')) as {
      totalUsd: number;
      pricing?: { source?: string; pricingVersion?: string };
    };
    expect(repriced.totalUsd).toBe(settled.totalUsd);
    expect(repriced.pricing?.source).toBe('composed');
    expect(repriced.pricing?.pricingVersion).toBe('v-a');
  });

  it('invoice and inspect compose the pins with the current table and declare every pinned version (RV611)', async () => {
    // A run suspended mid-flight: two segments settled under two table
    // versions, then a tail the crashed third segment journaled but never
    // settled. Seeded directly through the store the CLI reads, because
    // only a crash produces this shape and the shape is exactly what
    // inspect and invoice exist to report honestly.
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-pin-compose-'));
    writeFileSync(
      join(cwd, 'rulvar.config.mjs'),
      `import { FakeAdapter } from ${JSON.stringify(TESTING_DIST)};

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'echoed' } })],
    pricing: {
      pricingVersion: 'v-live',
      models: { 'fake:fake-model': { inputUsdPerMTok: 1000, outputUsdPerMTok: 0 } },
    },
  },
  workflows: {},
};
`,
      'utf8',
    );
    const store = new JsonlFileStore({ dir: join(cwd, '.rulvar') });
    const runId = 'pin-compose-run';
    const usageOf = (seq: number): JournalEntry => ({
      hashVersion: 2,
      spanId: 's0',
      startedAt: '2026-07-29T00:00:00.000Z',
      seq,
      scope: '',
      key: `agent:${String(seq)}`,
      ordinal: 0,
      kind: 'agent',
      status: 'ok',
      servedBy: 'fake:fake-model',
      usage: { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
    const settleOf = (
      seq: number,
      segment: number,
      rate: number,
      version: string,
    ): JournalEntry => ({
      hashVersion: 2,
      spanId: 's0',
      startedAt: '2026-07-29T00:00:00.000Z',
      seq,
      scope: '',
      key: `run-settle:${String(segment)}`,
      ordinal: 0,
      kind: 'decision',
      status: 'ok',
      value: {
        decisionType: RUN_SETTLE_DECISION_TYPE,
        runStatus: 'suspended',
        segment,
        pricing: [
          { model: 'fake:fake-model', rates: { inputUsdPerMTok: rate, outputUsdPerMTok: 0 } },
        ],
        pricingVersion: version,
      },
    });
    await store.append(runId, usageOf(0));
    await store.append(runId, settleOf(1, 1, 10, 'v-a'));
    await store.append(runId, usageOf(2));
    await store.append(runId, settleOf(3, 2, 100, 'v-b'));
    await store.append(runId, usageOf(4));
    await store.putMeta({ runId, status: 'suspended', updatedAt: '2026-07-29T00:00:01.000Z' });

    // Segment one at its own pin (10) plus segment two at its own pin
    // (100) plus the tail at the CURRENT table (1000): the engine's
    // composition. The raw last-pin fold said 210, silently pricing the
    // tail at rates the run's own settle would never apply.
    const io = scriptedIo();
    expect(await runCli(['invoice', runId, '--json'], { cwd, io })).toBe(0);
    const parsed = JSON.parse(io.outLines.join('\n')) as {
      totalUsd: number;
      pricing?: {
        source?: string;
        pricingVersion?: string;
        currentPricingVersion?: string;
        pinnedThroughSeq?: number;
        segments?: Array<{ fromSeq: number; settleSeq: number; pricingVersion?: string }>;
      };
    };
    expect(parsed.totalUsd).toBe(1110);
    expect(parsed.pricing?.source).toBe('composed');
    expect(parsed.pricing?.pricingVersion).toBe('v-b');
    // The composition's second half is named too (RV706): the tail past
    // the last pin priced at the CLI's own configured table, and the
    // export says which version that is instead of leaving the current
    // table anonymous while every pin declares itself.
    expect(parsed.pricing?.currentPricingVersion).toBe('v-live');
    expect(parsed.pricing?.pinnedThroughSeq).toBe(3);
    expect(parsed.pricing?.segments?.map((segment) => segment.pricingVersion)).toEqual([
      'v-a',
      'v-b',
    ]);
    expect(
      parsed.pricing?.segments?.map((segment) => [segment.fromSeq, segment.settleSeq]),
    ).toEqual([
      [0, 1],
      [1, 3],
    ]);

    const text = scriptedIo();
    expect(await runCli(['invoice', runId], { cwd, io: text })).toBe(0);
    expect(text.outLines).toContain(
      'pricing rates: run-settle pins composed with the current table (v-a, v-b; current v-live)',
    );

    const inspected = scriptedIo();
    expect(await runCli(['inspect', runId], { cwd, io: inspected })).toBe(0);
    expect(inspected.outLines).toContain('cost: $1110.0000');
    expect(inspected.outLines).toContain(
      'pricing: run-settle pins composed with the current table (v-a, v-b; current v-live)',
    );
  });

  it('preflight prints the synthesis projection line (v1.71 review)', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-preflight-synth-'));
    writeFileSync(
      join(cwd, 'rulvar.config.mjs'),
      `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const pipeline = defineWorkflow({ name: 'pipeline' }, async (ctx) => ctx.agent('go'));

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'done' } })],
    defaults: {
      routing: { loop: FAKE_MODEL_REF, orchestrate: FAKE_MODEL_REF, synthesize: FAKE_MODEL_REF },
    },
  },
  workflows: { pipeline },
  preflight: {
    orchestrator: {
      limits: { maxTurns: 2 },
      estInputTokens: 1000,
      synthesis: { limits: { maxTurns: 3 }, estInputTokens: 500 },
    },
  },
};
`,
      'utf8',
    );

    const text = scriptedIo();
    expect(await runCli(['preflight', 'pipeline', '--budget-usd', '1.2'], { cwd, io: text })).toBe(
      0,
    );
    const lines = text.outLines.join('\n');
    expect(lines).toContain('synthesis: servedBy=fake:fake-model projectedTurns=3');
    expect(lines).toContain('runCeiling: requests=5');
  });

  it('preflight lints the effective config without a store or a dispatch (P2.2)', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-preflight-'));
    writeFileSync(
      join(cwd, 'rulvar.config.mjs'),
      `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const pipeline = defineWorkflow({ name: 'pipeline' }, async (ctx) => ctx.agent('go'));

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'done' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF } },
  },
  workflows: { pipeline },
  preflight: {
    spawns: [
      { label: 'ingest', estCost: 0.5 },
      { label: 'normalize', estCost: 0.5 },
      { label: 'risk', estCost: 0.5 },
      { label: 'compliance', estCost: 0.5 },
      { label: 'pricing', estCost: 0.5 },
      {
        label: 'audit',
        estCost: 0.5,
        limits: { maxToolCalls: 40, toolUnits: { max: 10, costs: { web_search: 5 } } },
      },
    ],
  },
};
`,
      'utf8',
    );

    const text = scriptedIo();
    expect(await runCli(['preflight', 'pipeline', '--budget-usd', '1.2'], { cwd, io: text })).toBe(
      0,
    );
    const lines = text.outLines.join('\n');
    expect(lines).toContain('zero provider dispatches');
    expect(lines).toContain('admission: 2 of 6 admitted');
    expect(lines).toContain('DENY  risk');
    expect(lines).toContain('tool web_search: ceiling=2 (toolUnits)');
    expect(lines).toContain('projectedTurns=11'); // audit: 10 weighted executions + the final turn
    expect(lines).toContain('runCeiling: requests=171'); // five 32-turn loops + audit's 11
    expect(lines).toContain('warning weighted-units-bind-first');
    expect(lines).toContain('warning partial-admission');
    // The linter neither creates a store nor dispatches: no .rulvar
    // directory appears and the fake adapter records zero calls.
    expect(existsSync(join(cwd, '.rulvar'))).toBe(false);

    const json = scriptedIo();
    expect(
      await runCli(['preflight', 'pipeline', '--budget-usd', '1.2', '--json'], { cwd, io: json }),
    ).toBe(0);
    const report = JSON.parse(json.outLines.join('\n')) as {
      admission: { admitted: number; denied: number };
      spawns: Array<{ label: string }>;
      findings: Array<{ code: string; severity: string }>;
    };
    expect(report.admission).toMatchObject({ admitted: 2, denied: 4 });
    expect(report.spawns.map((spawn) => spawn.label)).toContain('audit');
    expect(report.findings.some((f) => f.code === 'partial-admission')).toBe(true);

    // --spawns overrides the declared wave from the command line.
    const overridden = scriptedIo();
    expect(
      await runCli(
        [
          'preflight',
          'pipeline',
          '--budget-usd',
          '1.2',
          '--spawns',
          '[{"label":"solo","estCost":0.5}]',
          '--json',
        ],
        { cwd, io: overridden },
      ),
    ).toBe(0);
    const soloReport = JSON.parse(overridden.outLines.join('\n')) as {
      admission: { admitted: number; denied: number };
    };
    expect(soloReport.admission).toMatchObject({ admitted: 1, denied: 0 });

    // An error finding exits 1: strip the routing so the role is unrouted.
    writeFileSync(
      join(cwd, 'rulvar.config.mjs'),
      `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter } from ${JSON.stringify(TESTING_DIST)};

const pipeline = defineWorkflow({ name: 'pipeline' }, async (ctx) => ctx.agent('go'));

export default {
  engineOptions: { adapters: [new FakeAdapter({ agents: { '*': 'done' } })] },
  workflows: { pipeline },
  preflight: { spawns: [{ label: 'orphan' }] },
};
`,
      'utf8',
    );
    const failing = scriptedIo();
    expect(await runCli(['preflight', 'pipeline'], { cwd, io: failing })).toBe(1);
    expect(failing.outLines.join('\n')).toContain('error unrouted-role');

    // A typo'd target fails exactly like run instead of linting nothing.
    const missing = scriptedIo();
    expect(await runCli(['preflight', 'nope'], { cwd, io: missing })).toBe(1);
    expect(missing.errLines.join('\n')).toContain("no workflow named 'nope'");
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

  it('replay verifies reproducibility: gates pass on a stable run, fail typed on drift (RV-209)', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-replay-'));
    const configOf = (
      extraAgentCall: boolean,
    ): string => `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const stable = defineWorkflow({ name: 'stable' }, async (ctx) => {
  const analysis = await ctx.agent('analyze');
${extraAgentCall ? "  await ctx.agent('extra pass');\n" : ''}  const stamp = await ctx.random();
  return { analysis, stamp };
});

const drifty = defineWorkflow({ name: 'drifty' }, async (ctx) => {
  const analysis = await ctx.agent('analyze');
  return { analysis, stamp: Math.random() };
});

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'analysis complete' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { stable, drifty },
};
`;
    writeFileSync(join(cwd, 'rulvar.config.mjs'), configOf(false), 'utf8');

    // A journaled-random run replays byte for byte: both gates PASS.
    const stableRun = scriptedIo();
    expect(await runCli(['run', 'stable'], { cwd, io: stableRun })).toBe(0);
    const stableId = runIdOf(stableRun);
    const verify = scriptedIo();
    expect(
      await runCli(['replay', stableId, '--assert-no-live', '--compare-output-hash'], {
        cwd,
        io: verify,
      }),
    ).toBe(0);
    const verifyErr = verify.errLines.join('\n');
    expect(verifyErr).toContain('assert-no-live: PASS');
    expect(verifyErr).toContain('compare-output-hash: PASS');

    // A bare Math.random in the RESULT: the replay pays nothing
    // (assert-no-live PASS) yet produces a different output, so the
    // digest gate fails and the warning is localized to the config file.
    const driftyRun = scriptedIo();
    expect(await runCli(['run', 'drifty'], { cwd, io: driftyRun })).toBe(0);
    const driftyId = runIdOf(driftyRun);
    const gate = scriptedIo();
    expect(
      await runCli(['replay', driftyId, '--assert-no-live', '--compare-output-hash'], {
        cwd,
        io: gate,
      }),
    ).toBe(1);
    const gateErr = gate.errLines.join('\n');
    expect(gateErr).toContain('assert-no-live: PASS');
    expect(gateErr).toContain('compare-output-hash: FAIL');
    expect(gateErr).toMatch(
      /determinism: bare-math-random \(workflow\) at .*rulvar\.config\.mjs:\d+:\d+/,
    );

    // Code drift: the registered workflow gains an extra paid call, so
    // the replay is no longer pure and --assert-no-live catches it.
    writeFileSync(join(cwd, 'rulvar.config.mjs'), configOf(true), 'utf8');
    const drift = scriptedIo();
    expect(await runCli(['replay', stableId, '--assert-no-live'], { cwd, io: drift })).toBe(1);
    expect(drift.errLines.join('\n')).toContain('assert-no-live: FAIL');
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

describe('CLI diagnostics withhold --args and sanitize terminal text (v1.24.1 review P2-1)', () => {
  // Harmless stand-in for a private value that must never reach stderr.
  const SENTINEL = 'SENTINEL_PRIVATE_VALUE_7Q4';
  // Built from codepoints so no control byte lives in this source file.
  const ESC = String.fromCharCode(0x1b);
  const BEL = String.fromCharCode(0x07);
  const cleanLines = (lines: string[]): boolean =>
    lines.every((line) => !line.includes(ESC) && !line.includes(BEL) && !line.includes('\n'));

  it.each([
    ['invalid JSON', `{"apiKey":"${SENTINEL}","broken":`, 'not valid JSON'],
    ['overflow JSON', `{"token":"${SENTINEL}","n":1e400}`, 'not representable as canonical JSON'],
  ])('%s --args is refused without echoing the value', async (_label, args, reason) => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    expect(await runCli(['run', 'echo', '--args', args, '--store', '.rulvar'], { cwd, io })).toBe(
      1,
    );
    const err = io.errLines.join('\n');
    expect(err).toContain(reason);
    expect(err).not.toContain(SENTINEL);
    expect(io.outLines.join('\n')).not.toContain(SENTINEL);
    // Still refused before config/store/adapter loads.
    expect(existsSync(join(cwd, '.rulvar'))).toBe(false);
  });

  it('control bytes in --args never reach stderr', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    const hostile = `${ESC}]0;pwned${BEL}{`;
    expect(
      await runCli(['run', 'echo', '--args', hostile, '--store', '.rulvar'], { cwd, io }),
    ).toBe(1);
    expect(io.errLines.join('\n')).toContain('not valid JSON');
    expect(io.errLines.join('\n')).not.toContain('pwned');
    expect(cleanLines(io.errLines)).toBe(true);
  });

  it('a hostile resume runId renders sanitized in the error line', async () => {
    const cwd = writeFixtureProject();
    mkdirSync(join(cwd, '.rulvar'));
    const io = scriptedIo();
    expect(await runCli(['resume', `bad${ESC}[31mid`, '--store', '.rulvar'], { cwd, io })).toBe(1);
    // The CSI sequence is stripped, the visible text survives.
    expect(io.errLines.join('\n')).toContain("run 'badid' not found");
    expect(cleanLines(io.errLines)).toBe(true);
  });

  it('an unknown command with control bytes is reported without them', async () => {
    const io = scriptedIo();
    expect(await runCli([`${ESC}[31mfake`], { cwd: writeFixtureProject(), io })).toBe(1);
    expect(io.errLines.join('\n')).toContain("unknown command 'fake'");
    expect(cleanLines(io.errLines)).toBe(true);
  });

  it('reportOutcome sanitizes provider and workflow authored text, keeping exit semantics', () => {
    const io = scriptedIo();
    const hostile = {
      status: 'error',
      value: undefined,
      error: { code: 'error', message: `boom${ESC}]0;own${BEL} and${ESC}[2Jmore` },
      dropped: [],
      pending: [{ key: `external:${ESC}[31mred`, entryRef: 3 }],
      cost: {
        totalUsd: 0.5,
        byModel: { [`fake:${ESC}[7mmodel`]: 0.5 },
        byPhase: { [`phase${ESC}[0m`]: 0.5 },
        unpriced: [{ model: `mystery${ESC}[8m` }],
      },
    };
    expect(reportOutcome(hostile as unknown as Parameters<typeof reportOutcome>[0], io)).toBe(1);
    const err = io.errLines.join('\n');
    expect(err).toContain('error: boom and');
    expect(err).toContain('pending: external:red (entry 3)');
    expect(err).toContain('by model fake:model');
    expect(err).toContain('unpriced models: mystery');
    // The provenance line rides every summary (RV3311): local
    // accounting must never read as a bill.
    expect(err).toContain('billing basis:');
    expect(err).toContain('never a provider statement');
    expect(cleanLines(io.errLines)).toBe(true);
  });

  it('reportDryRun sanitizes preview details and stop messages', async () => {
    const io = scriptedIo();
    const outcome = {
      status: 'error',
      error: { code: 'journal_miss', message: `live call${ESC}]2;t${BEL} here` },
      pending: [],
      dropped: [],
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, unpriced: [] },
    };
    const preview = {
      hits: 1,
      misses: 1,
      reruns: 0,
      skipped: 0,
      orphaned: [],
      invalidResolutions: [{ seq: 2, detail: `bad${ESC}[31m shape` }],
    };
    const handle = { result: Promise.resolve(outcome), preview: Promise.resolve(preview) };
    expect(await reportDryRun(handle as unknown as Parameters<typeof reportDryRun>[0], io)).toBe(0);
    const err = io.errLines.join('\n');
    expect(err).toContain('invalid resolution at seq 2: bad shape');
    expect(err).toContain('stopped at the first would-be-live call: live call here');
    expect(cleanLines(io.errLines)).toBe(true);
  });
});

describe('--strict refuses a partial acceptance envelope (v1.40.0 improvement plan)', () => {
  // Built from codepoints so no control byte lives in this source file.
  const ESC = String.fromCharCode(0x1b);
  const BEL = String.fromCharCode(0x07);
  const cleanLines = (lines: string[]): boolean =>
    lines.every((line) => !line.includes(ESC) && !line.includes(BEL) && !line.includes('\n'));
  const okOutcome = (value: unknown) =>
    ({
      status: 'ok',
      value,
      dropped: [],
      pending: [],
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, unpriced: [] },
    }) as unknown as Parameters<typeof strictExitCode>[0];

  it('a complete envelope and a plain value both keep exit 0', () => {
    const io = scriptedIo();
    expect(
      strictExitCode(
        okOutcome({
          result: 1,
          completion: 'complete',
          childStatusCounts: { ok: 2 },
          degradedReasons: [],
        }),
        0,
        io,
      ),
    ).toBe(0);
    expect(strictExitCode(okOutcome({ answer: 42 }), 0, io)).toBe(0);
    expect(strictExitCode(okOutcome('a plain string value'), 0, io)).toBe(0);
    expect(io.errLines).toHaveLength(0);
  });

  it('a partial envelope exits 1 and prints the sanitized reasons', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      okOutcome({
        result: 1,
        completion: 'partial',
        childStatusCounts: { ok: 1, error: 1 },
        degradedReasons: [`child agent:9 settled 'error'${ESC}[31m`],
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    const err = io.errLines.join('\n');
    expect(err).toContain("strict: the orchestration acceptance reports completion 'partial'");
    expect(err).toContain("child agent:9 settled 'error'");
    expect(cleanLines(io.errLines)).toBe(true);
  });

  it('a nonzero base exit and an errored status pass through unchanged', () => {
    const io = scriptedIo();
    expect(
      strictExitCode({ ...okOutcome({ completion: 'partial' }), status: 'error' }, 1, io),
    ).toBe(1);
    expect(io.errLines).toHaveLength(0);
  });
});

describe('--strict binds the verdict to the shipped document (RV3207)', () => {
  const okOutcome = (value: unknown) =>
    ({
      status: 'ok',
      value,
      dropped: [],
      pending: [],
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, unpriced: [] },
    }) as unknown as Parameters<typeof strictExitCode>[0];
  const fullMeta = {
    draftCitingSentences: 3,
    truncated: false,
    coveredCitingSentences: 3,
    judgeInvoked: true,
    coverage: 'full',
  };
  const envelope = (judgedStage: string, rewritten: boolean) =>
    okOutcome({
      result: 1,
      completion: 'complete',
      childStatusCounts: { ok: 2 },
      degradedReasons: [],
      claimConsistencyMeta: { ...fullMeta, judgedStage },
      draftToFinal: { draftHash: 'a'.repeat(64), finalHash: 'b'.repeat(64), rewritten },
    });

  it('a draft-stage verdict over a rewritten draft exits 1 naming the remedy', () => {
    // The 2026-08-11 experiment run verbatim: judgedStage 'draft',
    // repair rewrote the composition, strict read green.
    const io = scriptedIo();
    const code = strictExitCode(envelope('draft', true), 0, io);
    expect(code).toBe(1);
    const err = io.errLines.join('\n');
    expect(err).toContain('the synthesis rewrote that draft');
    expect(err).toContain("claimConsistency.stage 'final'");
  });

  it('an unchanged draft or a final-stage verdict keeps exit 0', () => {
    const io = scriptedIo();
    expect(strictExitCode(envelope('draft', false), 0, io)).toBe(0);
    expect(strictExitCode(envelope('final', true), 0, io)).toBe(0);
    expect(io.errLines).toHaveLength(0);
  });

  it('an envelope with no draftToFinal bridge stays out of scope', () => {
    const io = scriptedIo();
    expect(
      strictExitCode(
        okOutcome({
          result: 1,
          completion: 'complete',
          childStatusCounts: { ok: 2 },
          degradedReasons: [],
          claimConsistencyMeta: { ...fullMeta, judgedStage: 'draft' },
        }),
        0,
        io,
      ),
    ).toBe(0);
    expect(io.errLines).toHaveLength(0);
  });
});

describe('--strict reads the claim-coverage grade (RV1702)', () => {
  const okOutcome = (value: unknown) =>
    ({
      status: 'ok',
      value,
      dropped: [],
      pending: [],
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, unpriced: [] },
    }) as unknown as Parameters<typeof strictExitCode>[0];
  const completeWith = (claimConsistencyMeta: Record<string, unknown>) =>
    okOutcome({
      result: 1,
      completion: 'complete',
      childStatusCounts: { ok: 2 },
      degradedReasons: [],
      claimConsistencyMeta,
    });

  it('full coverage keeps exit 0 silently; absent meta stays out of scope', () => {
    const io = scriptedIo();
    expect(
      strictExitCode(
        completeWith({
          draftCitingSentences: 3,
          truncated: false,
          coveredCitingSentences: 3,
          judgeInvoked: true,
          coverage: 'full',
        }),
        0,
        io,
      ),
    ).toBe(0);
    expect(strictExitCode(okOutcome({ completion: 'complete' }), 0, io)).toBe(0);
    expect(io.errLines).toHaveLength(0);
  });

  it("judge-failed exits 1: completion 'complete' is mechanical, not semantic green", () => {
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 3,
        truncated: false,
        coveredCitingSentences: 3,
        judgeInvoked: true,
        judgeFailed: true,
        coverage: 'judge-failed',
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain("claim coverage 'judge-failed'");
  });

  it('judge-declined exits 1 too: a judge refused admission judged nothing (RV2508)', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 3,
        truncated: false,
        coveredCitingSentences: 3,
        judgeInvoked: false,
        judgeDeclined: true,
        coverage: 'judge-declined',
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain("claim coverage 'judge-declined'");
    expect(io.errLines.join('\n')).toContain('refused admission and never dispatched');
  });

  it('a declined judge in an unstamped meta still grades and exits (RV2508)', () => {
    // The grade is derived, not trusted: a meta persisted without the
    // coverage field grades through claimCoverageOf, and the declined
    // flag must survive that path too.
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 3,
        truncated: false,
        coveredCitingSentences: 3,
        judgeInvoked: false,
        judgeDeclined: true,
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain("claim coverage 'judge-declined'");
  });

  it('vacuous keeps the exit and says so: nothing cited is nothing verified (RV2508)', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 0,
        truncated: false,
        coveredCitingSentences: 0,
        judgeInvoked: false,
        coverage: 'vacuous',
      }),
      0,
      io,
    );
    expect(code).toBe(0);
    expect(io.errLines.join('\n')).toContain("claim coverage 'vacuous'");
    expect(io.errLines.join('\n')).toContain('verified nothing');
  });

  it('a stamped lowCoverage block exits 1 with the ratios printed (RV1809)', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 122,
        truncated: true,
        coveredCitingSentences: 36,
        judgeInvoked: true,
        coverage: 'partial',
        lowCoverage: { coverageRatio: 0.295, coverageFloor: 0.8 },
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    const err = io.errLines.join('\n');
    expect(err).toContain('below the declared floor');
    expect(err).toContain('coverage 0.295 under floor 0.8');
  });

  it('critical-uncovered exits 1 even from a legacy meta without the stamped grade', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 5,
        truncated: false,
        coveredCitingSentences: 4,
        criticalUncovered: ['packages/never/read.ts:7'],
        criticalUncoveredTotal: 1,
        judgeInvoked: false,
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain("claim coverage 'critical-uncovered'");
  });

  it('partial coverage prints its visibility line and keeps the exit', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 144,
        truncated: true,
        coveredCitingSentences: 40,
        judgeInvoked: true,
        coverage: 'partial',
      }),
      0,
      io,
    );
    expect(code).toBe(0);
    expect(io.errLines.join('\n')).toContain("claim coverage 'partial'");
  });

  it('an unknown stamped grade falls back to the counts', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      completeWith({
        draftCitingSentences: 2,
        truncated: false,
        coveredCitingSentences: 2,
        judgeInvoked: true,
        judgeFailed: true,
        coverage: 'certified-fresh',
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain("claim coverage 'judge-failed'");
  });
});

describe('--strict reads the deliverable verdict (RV2604)', () => {
  // The twenty-fifth comparison run: four ok children, a declared finish
  // contract that refused all three syntheses, a run that settled on
  // unvalidated output, and a harness that read `status: 'ok'` and could
  // not tell. Completion answers for the CHILDREN; this field answers
  // for the artifact.
  const outcomeWith = (extra: Record<string, unknown>) =>
    ({
      status: 'ok',
      value: {
        result: 1,
        completion: 'complete',
        childStatusCounts: { ok: 4 },
        degradedReasons: [],
      },
      dropped: [],
      pending: [],
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, unpriced: [] },
      ...extra,
    }) as unknown as Parameters<typeof strictExitCode>[0];

  it('a refused artifact exits 1 even under a complete completion', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      outcomeWith({ deliverableAccepted: false, resultAvailable: true }),
      0,
      io,
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain(
      'the declared finish contract did not accept the artifact',
    );
  });

  it('an accepted artifact keeps exit 0', () => {
    const io = scriptedIo();
    expect(
      strictExitCode(
        outcomeWith({ deliverableAccepted: true, resultAvailable: true, acceptedArtifactRef: 41 }),
        0,
        io,
      ),
    ).toBe(0);
    expect(io.errLines).toHaveLength(0);
  });

  it('an ABSENT verdict is left alone: nothing declared a contract', () => {
    // The vacuum contrast, and the reason the check reads `=== false`.
    // A host that declares no `finishValidation` is its own judge, and
    // absence means NOT RECORDED (RV1209), never a refusal.
    const io = scriptedIo();
    expect(strictExitCode(outcomeWith({ resultAvailable: true }), 0, io)).toBe(0);
    expect(io.errLines).toHaveLength(0);
  });

  it('a missing artifact is named in the same refusal', () => {
    const io = scriptedIo();
    const code = strictExitCode(
      outcomeWith({ deliverableAccepted: false, resultAvailable: false }),
      0,
      io,
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain('carries no artifact at all');
  });

  it('the verdict is read before any coverage grade', () => {
    // A coverage grade over an artifact the contract rejected answers a
    // question nobody should still be asking: the refusal that names the
    // contract is the one a reader needs.
    const io = scriptedIo();
    const code = strictExitCode(
      outcomeWith({
        deliverableAccepted: false,
        resultAvailable: true,
        value: {
          result: 1,
          completion: 'complete',
          childStatusCounts: { ok: 4 },
          degradedReasons: [],
          claimConsistencyMeta: {
            contradictions: [],
            pairsJudged: 0,
            draftCitingSentences: 2,
            truncated: false,
            coveredCitingSentences: 0,
            judgeInvoked: true,
            judgeFailed: true,
            coverage: 'judge-failed',
          },
        },
      }),
      0,
      io,
    );
    expect(code).toBe(1);
    const err = io.errLines.join('\n');
    expect(err).toContain('the declared finish contract did not accept the artifact');
    expect(err).not.toContain('claim coverage');
  });
});

describe('the human report says what the terminal claims (RV2703)', () => {
  // `--strict` has read these fields since RV2604, but strict is the
  // MACHINE gate. A person who does not pass the flag saw `status: ok`
  // for a degraded run, for a run whose contract refused every
  // candidate it was handed, and for a clean one, with no line between
  // them.
  const outcomeWith = (extra: Record<string, unknown>) =>
    ({
      status: 'ok',
      dropped: [],
      pending: [],
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, unpriced: [] },
      ...extra,
    }) as unknown as Parameters<typeof reportOutcome>[0];

  it('names an incomplete completion and every degradation behind it', () => {
    const io = scriptedIo();
    expect(
      reportOutcome(
        outcomeWith({ completion: 'partial', degradedReasons: ['w2 settled error'] }),
        io,
      ),
    ).toBe(0);
    const err = io.errLines.join('\n');
    expect(err).toContain('status: ok');
    expect(err).toContain('completion: partial (the work is NOT complete)');
    expect(err).toContain('degraded: w2 settled error');
  });

  it('names a refused deliverable, and the missing artifact beside it', () => {
    const io = scriptedIo();
    reportOutcome(
      outcomeWith({ completion: 'complete', deliverableAccepted: false, resultAvailable: false }),
      io,
    );
    const err = io.errLines.join('\n');
    expect(err).toContain('deliverable: REFUSED by the declared finish contract');
    expect(err).toContain('the terminal carries no artifact');
  });

  it('counts the refused candidates and the distinct documents among them', () => {
    const io = scriptedIo();
    reportOutcome(
      outcomeWith({
        completion: 'complete',
        rejectedFinishCandidates: [
          { callId: 'a', verdict: 'repair', hash: 'b'.repeat(64), chars: 10, failed: [] },
          { callId: 'b', verdict: 'rejected', hash: 'b'.repeat(64), chars: 10, failed: [] },
        ],
      }),
      io,
    );
    expect(io.errLines.join('\n')).toContain(
      'rejected finish candidates: 2 (1 distinct document(s))',
    );
  });

  it('names what the children produced when nothing ever judged them', () => {
    // RV2602 put the roster on the envelope; this is the surface a human
    // reads it from. The run died before acceptance, so this is the only
    // account of work that was already paid for.
    const io = scriptedIo();
    expect(
      reportOutcome(
        outcomeWith({
          status: 'exhausted',
          childrenAtFailure: {
            spawned: 4,
            settled: 3,
            statusCounts: { ok: 2, error: 1 },
            belowFloorOkChildren: ['n1'],
            unsettled: ['n4'],
          },
        }),
        io,
      ),
    ).toBe(1);
    const err = io.errLines.join('\n');
    expect(err).toContain('children at failure: 4 spawned, 3 settled (ok 2, error 1)');
    expect(err).toContain('no acceptance verdict was ever rendered');
    expect(err).toContain('settled ok below their declared evidence floor: 1');
    expect(err).toContain('still running when the run gave up: 1');
  });

  it('a terminal that claims nothing prints nothing: absence is NOT RECORDED', () => {
    // The vacuum contrast (RV1209). A host that declares no finish
    // contract is its own judge, and a workflow that makes no completion
    // claim is not an incomplete run: the report stays byte-identical to
    // what it printed before.
    const io = scriptedIo();
    expect(reportOutcome(outcomeWith({ value: { ok: true } }), io)).toBe(0);
    const err = io.errLines.join('\n');
    expect(err).not.toContain('completion:');
    expect(err).not.toContain('deliverable:');
    expect(err).not.toContain('children at failure');
  });
});

describe('runs audit (fenced run state RFC, phase 3)', () => {
  const strandedEntry = {
    hashVersion: 2,
    seq: 0,
    scope: '',
    key: 'stranded-agent',
    ordinal: 0,
    kind: 'agent',
    status: 'running',
    spanId: 's',
    startedAt: new Date(1_700_000_000_000).toISOString(),
  } as const;

  it('names divergences, repairs the sound ones, and exits by catalog cleanliness', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    expect(await runCli(['run', 'echo', '--args', '{"value":1}'], { cwd, io })).toBe(0);
    const runId = runIdOf(io);

    const clean = scriptedIo();
    expect(await runCli(['runs', 'audit'], { cwd, io: clean })).toBe(0);
    expect(clean.errLines.some((line) => line.includes('every run is consistent'))).toBe(true);

    // The crash residue (the settle reached the journal, the meta write
    // did not) plus the F1 stranded residue (a dangling dispatch under
    // a terminal meta) on a second run.
    const store = new JsonlFileStore({ dir: join(cwd, '.rulvar') });
    const meta = (await store.getMeta(runId)) as RunMeta;
    await store.putMeta({ ...meta, status: 'running' });
    await store.append('STRANDED', strandedEntry);
    await store.putMeta({ runId: 'STRANDED', status: 'cancelled', segments: 1, updatedAt: 'x' });

    const listOnly = scriptedIo();
    expect(await runCli(['runs', 'audit'], { cwd, io: listOnly })).toBe(1);
    expect(listOnly.outLines.some((line) => line.startsWith(`${runId} meta-behind`))).toBe(true);
    expect(listOnly.outLines.some((line) => line.startsWith('STRANDED stranded'))).toBe(true);

    const repair = scriptedIo();
    expect(await runCli(['runs', 'audit', '--repair'], { cwd, io: repair })).toBe(0);
    expect(repair.errLines.some((line) => line.includes('every divergence repaired'))).toBe(true);
    expect((await store.getMeta(runId))?.status).toBe('ok');
    expect((await store.getMeta('STRANDED'))?.status).toBe('running');

    const after = scriptedIo();
    expect(await runCli(['runs', 'audit'], { cwd, io: after })).toBe(0);
  });

  it('suspect verdicts are reported, never rewritten, and hold the exit at 1', async () => {
    const cwd = writeFixtureProject();
    const store = new JsonlFileStore({ dir: join(cwd, '.rulvar') });
    await store.append('SUSPECT', {
      ...strandedEntry,
      key: 'gate',
      kind: 'external',
      status: 'suspended',
    } as never);
    await store.putMeta({ runId: 'SUSPECT', status: 'ok', segments: 1, updatedAt: 'x' });

    const repair = scriptedIo();
    expect(await runCli(['runs', 'audit', '--repair'], { cwd, io: repair })).toBe(1);
    expect(repair.outLines.some((line) => line.startsWith('SUSPECT suspect'))).toBe(true);
    expect(repair.errLines.some((line) => line.includes('divergence(s) remain'))).toBe(true);
    expect((await store.getMeta('SUSPECT'))?.status).toBe('ok');
  });
});

describe('inspect acceptance and quota rendering (RV806)', () => {
  it('prints the acceptance verdict, salvage, evidence verdicts, and window-labeled quota drift', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-inspect-'));
    writeFileSync(join(cwd, 'rulvar.config.mjs'), 'export default { workflows: {} };\n', 'utf8');
    const storeDir = join(cwd, '.rulvar');
    mkdirSync(storeDir, { recursive: true });
    const entryBase = {
      hashVersion: 2,
      spanId: 's0',
      startedAt: '2026-07-30T00:00:00.000Z',
      scope: 'orchestrator',
      ordinal: 0,
      kind: 'decision',
      status: 'ok',
    };
    const entries = [
      {
        ...entryBase,
        seq: 0,
        key: 'acceptance',
        value: {
          decisionType: 'orchestrator_acceptance',
          verdict: 'accepted',
          completion: 'partial',
          childPolicy: 'all-ok',
          childStatusCounts: { ok: 1, limit: 1 },
          degradedReasons: ['child w2 accepted as partial'],
          salvagedPartialChildren: ['w2'],
          children: [
            { child: 'w1', status: 'ok' },
            {
              child: 'w2',
              status: 'limit',
              salvage: 'partial',
              evidence: { recordedEntries: 1, minEntries: 2, met: false, waivedBySalvage: true },
            },
          ],
        },
      },
      {
        ...entryBase,
        seq: 1,
        key: 'quota-drift:requests:openai:gpt-5.6-terra',
        value: {
          decisionType: 'quota_drift',
          provider: 'openai',
          model: 'gpt-5.6-terra',
          dimension: 'requests',
          declaredPerMinute: 500,
          reportedPerMinute: 300,
        },
      },
    ];
    writeFileSync(
      join(storeDir, 'ACC1.jsonl'),
      entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
      'utf8',
    );
    writeFileSync(
      join(storeDir, 'ACC1.meta.json'),
      JSON.stringify({
        runId: 'ACC1',
        status: 'ok',
        updatedAt: '2026-07-30T00:00:01.000Z',
        workflowName: 'collect',
      }),
      'utf8',
    );

    const io = scriptedIo();
    expect(await runCli(['inspect', 'ACC1', '--store', storeDir], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    // RV4403: the child roster verdict prints under its own axis
    // name, and the old "gate on the pair" advice is gone (it invited
    // gating on a green pair over a rejected deliverable).
    expect(text).toContain(
      'children: accepted (completion partial; the child roster verdict, one axis of five, ' +
        'never the deliverable or the semantic verdict)',
    );
    expect(text).not.toContain('acceptance: accepted');
    expect(text).not.toContain('gate on the status and completion PAIR');
    expect(text).toContain('salvaged partial: w2');
    expect(text).toContain('evidence w2: 1 of 2 (below floor, waived by salvage)');
    expect(text).not.toContain('evidence w1');
    expect(text).toContain(
      'quota drift: openai:gpt-5.6-terra requests declared 500/min vs provider 300/min (per-minute window, not cumulative)',
    );
  });

  it('one command reports the logical run: segments, both time conventions, the wires (RV4409)', async () => {
    // The seventh comparison experiment reconstructed exactly this by
    // external script: a genesis segment dying on a timeout, an
    // operator gap, a resume segment, 151 entries, 109 wires.
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-logical-'));
    writeFileSync(join(cwd, 'rulvar.config.mjs'), 'export default { workflows: {} };\n', 'utf8');
    const storeDir = join(cwd, '.rulvar');
    mkdirSync(storeDir, { recursive: true });
    const entryBase = {
      hashVersion: 2,
      spanId: 's0',
      scope: '',
      ordinal: 0,
      status: 'ok',
    };
    const stamp = (offsetSeconds: number): string =>
      new Date(Date.parse('2026-08-21T20:00:00.000Z') + offsetSeconds * 1000).toISOString();
    const entries: unknown[] = [];
    let seq = 0;
    // Segment 1: 96 entries over 2100 s of active wall, 70 wires.
    for (let i = 0; i < 95; i += 1) {
      const isWire = i < 70;
      entries.push({
        ...entryBase,
        seq: (seq += 1),
        key: `w1-${String(i)}`,
        kind: isWire ? 'decision' : 'fact',
        startedAt: stamp((i * 2100) / 94),
        value: isWire ? { decisionType: 'provider-call', record: {} } : {},
      });
    }
    entries.push({
      ...entryBase,
      seq: (seq += 1),
      key: 'settle-1',
      kind: 'decision',
      startedAt: stamp(2100),
      value: { decisionType: 'run_settle', runStatus: 'exhausted', segment: 1 },
    });
    // The operator gap: 334 s. Segment 2: 55 entries over 197 s, 39 wires.
    for (let i = 0; i < 54; i += 1) {
      const isWire = i < 39;
      entries.push({
        ...entryBase,
        seq: (seq += 1),
        key: `w2-${String(i)}`,
        kind: isWire ? 'decision' : 'fact',
        startedAt: stamp(2434 + (i * 197) / 53),
        value: isWire ? { decisionType: 'provider-call', record: {} } : {},
      });
    }
    entries.push({
      ...entryBase,
      seq: (seq += 1),
      key: 'settle-2',
      kind: 'decision',
      startedAt: stamp(2631),
      value: { decisionType: 'run_settle', runStatus: 'ok', segment: 2 },
    });
    expect(entries).toHaveLength(151);
    writeFileSync(
      join(storeDir, 'LOGICAL1.jsonl'),
      entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
      'utf8',
    );
    writeFileSync(
      join(storeDir, 'LOGICAL1.meta.json'),
      JSON.stringify({
        runId: 'LOGICAL1',
        status: 'ok',
        updatedAt: '2026-08-21T21:00:00.000Z',
        workflowName: 'aster',
      }),
      'utf8',
    );
    const io = scriptedIo();
    expect(await runCli(['inspect', 'LOGICAL1', '--store', storeDir], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    expect(text).toContain('segments: 2 (exhausted after 96, ok after 55)');
    expect(text).toContain('logical run: active 2297.0 s, calendar 2631.0 s, operator gap 334.0 s');
    expect(text).toContain('segment 1: exhausted after 96 entries; active 2100.0 s');
    expect(text).toContain('segment 2: ok after 55 entries; active 197.0 s');
    expect(text).toContain('logical wires: 109 provider calls across the whole run');
  });

  it("prints the five terminal axes side by side over the seventh run's shape (RV4403)", async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-axes-'));
    writeFileSync(join(cwd, 'rulvar.config.mjs'), 'export default { workflows: {} };\n', 'utf8');
    const storeDir = join(cwd, '.rulvar');
    mkdirSync(storeDir, { recursive: true });
    const entryBase = {
      hashVersion: 2,
      spanId: 's0',
      startedAt: '2026-08-22T00:00:00.000Z',
      scope: '',
      ordinal: 0,
      kind: 'decision',
      status: 'ok',
    };
    const entries = [
      {
        ...entryBase,
        seq: 0,
        key: 'acceptance',
        value: {
          decisionType: 'orchestrator_acceptance',
          verdict: 'accepted',
          completion: 'complete',
          children: [],
        },
      },
      {
        ...entryBase,
        seq: 1,
        key: 'settle',
        value: {
          decisionType: 'run_settle',
          runStatus: 'exhausted',
          segment: 1,
          completion: 'complete',
          deliverableAccepted: false,
          resultAvailable: false,
          claimConsistencyMeta: {
            judgeInvoked: true,
            coverage: 'partial',
            judgedStage: 'final',
            judgedHash: 'c'.repeat(64),
            findings: 0,
          },
          citationAuditMeta: {
            sampled: 24,
            supported: 8,
            partial: 6,
            unsupported: 10,
            auditedHash: 'c'.repeat(64),
          },
          semanticTerminalVerdict: {
            verdict: 'findings',
            coverage: 'partial',
            contradictions: 0,
            unsupportedCitations: 10,
            partialCitations: 6,
            semanticRepairRounds: 0,
            judgeFailures: [],
          },
        },
      },
    ];
    writeFileSync(
      join(storeDir, 'AXES1.jsonl'),
      entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
      'utf8',
    );
    writeFileSync(
      join(storeDir, 'AXES1.meta.json'),
      JSON.stringify({
        runId: 'AXES1',
        status: 'exhausted',
        updatedAt: '2026-08-22T00:00:01.000Z',
        workflowName: 'aster',
      }),
      'utf8',
    );

    const io = scriptedIo();
    expect(await runCli(['inspect', 'AXES1', '--store', storeDir], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    // The one line where no axis can stand in for another: the
    // seventh run read green children over a rejected deliverable.
    expect(text).toContain(
      'axes: terminal exhausted | execution complete | children accepted | ' +
        'deliverable rejected | semantic findings',
    );
    expect(text).toContain('deliverable: rejected (no accepted artifact stands');
    expect(text).toContain(
      'semantic: findings (0 contradiction(s), 10 unsupported / 6 partial citation(s); ' +
        'coverage partial)',
    );
    expect(text).toContain('citation audit: 8 supported, 6 partial, 10 unsupported of 24 sampled');
  });
});

describe('rates verification age surfaces (RV814)', () => {
  const configWithDate = (date: string | undefined): string =>
    `import { defineWorkflow } from ${JSON.stringify(CORE_DIST)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING_DIST)};

const echo = defineWorkflow({ name: 'echo' }, async (ctx) => ctx.agent('echo'));

export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'echoed' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF } },
    pricing: {
      pricingVersion: 'v-dated',
      models: { [FAKE_MODEL_REF]: { inputUsdPerMTok: 3, outputUsdPerMTok: 15${
        date === undefined ? '' : `, ratesVerifiedAt: ${JSON.stringify(date)}`
      } } },
    },
  },
  workflows: { echo },
  preflight: { spawns: [{ label: 'digger', estInputTokens: 1000 }] },
};
`;

  it('invoice names the verification date and age of the rates that priced the run', async () => {
    // The twelfth experiment's red observable: the founder read the
    // invoice while doubting the rates and NOTHING said the seed was
    // last verified 12 days earlier. The date rides the pinned row, so
    // the age line survives any later table rewrite.
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-rates-age-'));
    const date = new Date(Date.now() - 12 * 86_400_000).toISOString().slice(0, 10);
    writeFileSync(join(cwd, 'rulvar.config.mjs'), configWithDate(date), 'utf8');
    const io = scriptedIo();
    await runCli(['run', 'echo'], { cwd, io });
    const runId = runIdOf(io);

    const text = scriptedIo();
    expect(await runCli(['invoice', runId], { cwd, io: text })).toBe(0);
    expect(text.outLines).toContain(`rates verified: fake:fake-model ${date} (age 12d)`);
  });

  it('invoice prints no verification line when no applicable row names a date', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-rates-undated-'));
    writeFileSync(join(cwd, 'rulvar.config.mjs'), configWithDate(undefined), 'utf8');
    const io = scriptedIo();
    await runCli(['run', 'echo'], { cwd, io });
    const runId = runIdOf(io);

    const text = scriptedIo();
    expect(await runCli(['invoice', runId], { cwd, io: text })).toBe(0);
    expect(text.outLines.some((line) => line.startsWith('rates verified:'))).toBe(false);
  });

  it('preflight shows the serving row date and age on the spawn line', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-cli-rates-preflight-'));
    const date = new Date(Date.now() - 12 * 86_400_000).toISOString().slice(0, 10);
    writeFileSync(join(cwd, 'rulvar.config.mjs'), configWithDate(date), 'utf8');
    const io = scriptedIo();
    expect(await runCli(['preflight', 'echo', '--budget-usd', '1'], { cwd, io })).toBe(0);
    const spawnLine = io.outLines.find((line) => line.startsWith("spawn 'digger'"));
    expect(spawnLine).toContain(`ratesVerified=${date} (age 12d)`);
  });
});

describe('rulvar effects (RV4506, plan 45)', () => {
  const seedEffectsJournal = async (cwd: string): Promise<void> => {
    const store = new JsonlFileStore({ dir: join(cwd, '.rulvar') });
    const base = {
      hashVersion: 2,
      ordinal: 0,
      spanId: 's',
      startedAt: '2026-08-24T10:00:00.000Z',
    } as const;
    const decision = (seq: number, value: Record<string, unknown>): Promise<void> =>
      store.append('FX', {
        ...base,
        seq,
        scope: 'effects',
        key: typeof value.opId === 'string' ? value.opId : String(seq),
        kind: 'decision',
        status: 'ok',
        value: value as never,
      });
    await store.append('FX', {
      ...base,
      seq: 0,
      scope: 'run',
      key: 'a0',
      kind: 'approval',
      status: 'suspended',
      deadlineAt: '2026-08-24T12:00:00.000Z',
      value: { flavor: 'approval', toolName: 'payout', effectLogicalKey: 'pay-1' },
    });
    await store.append('FX', {
      ...base,
      seq: 1,
      scope: 'run',
      key: 'r1',
      kind: 'resolution',
      status: 'ok',
      ref: 0,
      resolution: { target: 0, by: 'external', value: { decision: 'allow' } },
    });
    await decision(2, { decisionType: 'effect_epoch', opId: 'epoch-1', generation: 'gen-1' });
    await decision(3, {
      decisionType: 'effect_intent',
      opId: 'intent-1',
      logicalKey: 'pay-1',
      approvalRef: 0,
      epochRef: 2,
      effectClass: 'monetary',
      capabilityRow: 'idempotency-key',
      argumentsHash: 'deadbeef',
      budgets: {
        attempts: 3,
        lookups: 5,
        receiptWaitMs: 60000,
        reconcileBy: '2026-08-24T00:00:00.000Z',
      },
    });
    await decision(4, {
      decisionType: 'effect_attempt',
      opId: 'attempt-1',
      intentRef: 3,
      ordinal: 1,
      notAfter: '2026-08-24T10:05:00.000Z',
      idempotencyKey: 'pay-1#epoch2',
    });
    await decision(5, {
      decisionType: 'effect_outcome',
      opId: 'outcome-1',
      intentRef: 3,
      attemptRef: 4,
      outcome: 'accepted',
    });
    await decision(6, {
      decisionType: 'effect_receipt',
      opId: 'receipt-1',
      intentRef: 3,
      verification: 'verified',
      transferId: 't-1',
      amount: 100,
    });
    await decision(7, {
      decisionType: 'effect_terminal',
      opId: 'confirm-1',
      intentRef: 3,
      terminal: 'confirmed',
      causalRef: 6,
    });
    await store.append('FX', {
      ...base,
      seq: 8,
      scope: 'run',
      key: 'a8',
      kind: 'approval',
      status: 'suspended',
      deadlineAt: '2026-08-24T12:00:00.000Z',
      value: { flavor: 'approval', toolName: 'payout', effectLogicalKey: 'pay-2' },
    });
    await store.append('FX', {
      ...base,
      seq: 9,
      scope: 'run',
      key: 'r9',
      kind: 'resolution',
      status: 'ok',
      ref: 8,
      resolution: { target: 8, by: 'external', value: { decision: 'allow' } },
    });
    await decision(10, {
      decisionType: 'effect_intent',
      opId: 'intent-2',
      logicalKey: 'pay-2',
      approvalRef: 8,
      epochRef: 2,
      effectClass: 'monetary',
      capabilityRow: 'neither',
      argumentsHash: 'feedface',
      budgets: {
        attempts: 3,
        lookups: 5,
        receiptWaitMs: 60000,
        reconcileBy: '2026-08-24T00:00:00.000Z',
      },
    });
  };

  it('effects ls prints the fold report: epoch, machines, effective states', async () => {
    const cwd = writeFixtureProject();
    await seedEffectsJournal(cwd);
    const io = scriptedIo();
    expect(await runCli(['effects', 'ls', 'FX'], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    expect(text).toContain("effects FX: epoch 'gen-1' seq 2 restoration 0 clean");
    expect(text).toContain('seq 3  pay-1  confirmed  monetary/idempotency-key');
    expect(text).toContain('attempts 1/3');
    expect(text).toContain('seq 10  pay-2  intent  monetary/neither');
  });

  it('effects show prints one machine in full: budgets, attempts, receipts', async () => {
    const cwd = writeFixtureProject();
    await seedEffectsJournal(cwd);
    const io = scriptedIo();
    expect(await runCli(['effects', 'show', 'FX', '3'], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    expect(text).toContain("intent seq 3 'pay-1' (monetary, idempotency-key) consumed");
    expect(text).toContain(
      'budgets: attempts 3, lookups 5, receiptWaitMs 60000, reconcileBy 2026-08-24T00:00:00.000Z',
    );
    expect(text).toContain('state confirmed (terminal seq 7)');
    expect(text).toContain('attempt 1 seq 4: accepted key=pay-1#epoch2');
    expect(text).toContain('receipt seq 6: verified transferId=t-1 amount=100');
  });

  it('effects sweep refuses the non-leasable store without the explicit acknowledgment', async () => {
    const cwd = writeFixtureProject();
    await seedEffectsJournal(cwd);
    const refused = scriptedIo();
    expect(await runCli(['effects', 'sweep', 'FX'], { cwd, io: refused })).toBe(1);
    expect(refused.errLines.join('\n')).toContain('singleProcess');
    const io = scriptedIo();
    expect(await runCli(['effects', 'sweep', 'FX', '--single-process'], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    // The pay-2 intent crossed its reconcileBy: the sweep quarantines
    // it with the state recorded; the confirmed machine is untouched.
    expect(text).toContain('swept 1: quarantined 1');
    expect(text).toContain('quarantined seq 10');
    const after = scriptedIo();
    expect(await runCli(['effects', 'ls', 'FX'], { cwd, io: after })).toBe(0);
    expect(after.outLines.join('\n')).toContain('seq 10  pay-2  quarantined');
  });

  it('the effects family fails loudly on an unknown sub-command', async () => {
    const cwd = writeFixtureProject();
    const io = scriptedIo();
    expect(await runCli(['effects', 'nope'], { cwd, io })).toBe(1);
    expect(io.errLines.join('\n')).toContain('usage: rulvar effects <ls | show | sweep>');
  });
});
