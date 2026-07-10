/**
 * lurker kb list e2e over a fixture store (M10-T04; docs/05, 4.4;
 * docs/06, 10.5): full provenance per claim (author, gate, evidence
 * refs, TTL state) for the humans who author ladders, floors, and
 * profiles. No run, no pin; the file store reads directly.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { FileModelKnowledgeStore, type GateRecord, type ModelClaim } from '@lurker/core';

import { runCli } from './cli-main.js';
import type { CliIo } from './io.js';

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

const GATE: GateRecord = {
  kind: 'human',
  approver: 'founder',
  at: '2026-07-10',
  attribution: { ruledOut: ['prompt', 'difficulty'] },
};

function claim(id: string, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model: 'fake:model', effort: 'high' },
    taskClass: 'code-edit',
    polarity: 'strength',
    statement: 'lands small diffs cleanly',
    class: 'human-editorial',
    status: 'active',
    evidence: [{ kind: 'journal', runId: 'seed-run', entryRef: 3 }],
    confidence: 'high',
    observedAt: '2026-07-01',
    expiresAt: '9999-01-01',
    author: { kind: 'human', id: 'founder' },
    ...extra,
  };
}

async function fixtureCwd(): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'lurker-kb-cli-'));
  const store = new FileModelKnowledgeStore({ path: join(cwd, 'lurker.models.json') });
  await store.commit(
    [
      { op: 'add', claim: claim('01KBLIVE00000000000000001'), gate: GATE },
      {
        op: 'add',
        claim: claim('01KBEXPIRED00000000000002', {
          taskClass: 'judging',
          polarity: 'weakness',
          observedAt: '2020-01-01',
          expiresAt: '2020-06-01',
          statement: 'long expired judging note',
          evidence: [
            { kind: 'journal', runId: 'seed-run', entryRef: 9 },
            { kind: 'eval', reportId: 'rep-1', caseIds: ['a', 'b'] },
          ],
        }),
        gate: GATE,
      },
    ],
    0,
  );
  await store.commit(
    [
      {
        op: 'supersede',
        claimId: '01KBLIVE00000000000000001',
        by: claim('01KBHEAD00000000000000003', { statement: 'lands small and medium diffs' }),
        gate: GATE,
      },
    ],
    1,
  );
  return cwd;
}

describe('lurker kb list (M10-T04)', () => {
  it('renders every claim with provenance and TTL state', async () => {
    const cwd = await fixtureCwd();
    const io = scriptedIo();
    expect(await runCli(['kb', 'list'], { cwd, io })).toBe(0);
    const text = io.outLines.join('\n');
    expect(text).toContain('knowledge store: lurker.models.json (version 2, 3 claims)');
    // The maintenance view names models verbatim (only in-run cards are
    // nameless).
    expect(text).toContain('fake:model effort=high :: code-edit strength');
    expect(text).toContain('[superseded]');
    expect(text).toContain('[active TTL EXPIRED] fake:model');
    expect(text).toContain('[active TTL holds] fake:model');
    expect(text).toContain('author=human:founder gate=human (git review)');
    expect(text).toContain('evidence: journal seed-run#9; eval rep-1 [a, b]');
    expect(text).toContain('supersedes: 01KBLIVE00000000000000001');
    expect(text).toContain('long expired judging note');
  });

  it('shows the empty store without failing', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'lurker-kb-cli-'));
    const io = scriptedIo();
    expect(await runCli(['kb', 'list'], { cwd, io })).toBe(0);
    expect(io.outLines.join('\n')).toContain('(version 0, 0 claims)');
  });

  it('rejects unknown subcommands and names the phases of inbox and sweep', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'lurker-kb-cli-'));
    const bad = scriptedIo();
    expect(await runCli(['kb', 'show'], { cwd, io: bad })).toBe(1);
    expect(bad.errLines.join('\n')).toContain('usage: lurker kb <list | inbox | sweep>');
    const inbox = scriptedIo();
    expect(await runCli(['kb', 'inbox'], { cwd, io: inbox })).toBe(1);
    expect(inbox.errLines.join('\n')).toContain('phase 3');
    const sweep = scriptedIo();
    expect(await runCli(['kb', 'sweep'], { cwd, io: sweep })).toBe(1);
    expect(sweep.errLines.join('\n')).toContain('phase 2');
  });
});
