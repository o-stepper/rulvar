/**
 * rulvar kb gate e2e (M12-T04): the inbox-to-claim flow. An ungated
 * proposal can never become a claim (the attestation is mandatory by
 * construction, non-proposals and duplicates reject), and gated claims
 * carry the origin provenance plus the typed template statement.
 */
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  FileModelKnowledgeStore,
  JsonlFileStore,
  type AgentProfile,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type Usage,
} from '@rulvar/core';
import { emptyPlan, orchestratePlanned, planHash } from '@rulvar/plan';

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

interface ScriptedTurn {
  text?: string;
  toolCall?: { name: string; args: unknown };
}

const CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 200_000,
  maxOutputTokens: 4_096,
  pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
};

const USAGE: Usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };

function scriptedAdapter(
  script: (req: ChatRequest) => ScriptedTurn,
): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id: 'fake',
    calls,
    caps: () => CAPS,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      const call = calls.length;
      calls.push(req);
      const turn = script(req);
      if (turn.text !== undefined) {
        yield { type: 'text-delta', text: turn.text };
      }
      if (turn.toolCall !== undefined) {
        const id = `id-${String(call)}`;
        yield { type: 'tool-call-start', id, name: turn.toolCall.name };
        yield { type: 'tool-call-end', id, args: turn.toolCall.args };
      }
      yield { type: 'finish', finish: { reason: 'stop' }, usage: USAGE };
    },
  };
}

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function lastToolResult<T>(req: ChatRequest, marker: (value: T) => boolean): T | undefined {
  let found: T | undefined;
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const value = part.result as T;
        if (marker(value)) {
          found = value;
        }
      }
    }
  }
  return found;
}

const PROFILES: Record<string, AgentProfile> = {
  worker: {
    description: 'laddered judging worker',
    taskClass: 'judging',
    model: {
      ladder: {
        rungs: [{ model: 'fake:model', effort: 'medium' as const, maxTurns: 6, maxTokens: 1024 }],
        startTier: 0,
        escalateOn: ['error' as const],
      },
    },
  },
};

/** One plan run journaling a kb_propose proposal; returns its address. */
async function produceRun(dir: string): Promise<{ runId: string; entryRef: number }> {
  let phase = 0;
  const adapter = scriptedAdapter((req) => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'verdict: incorrect' };
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: planHash(emptyPlan()) },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'judge the claim' } }],
            rationale: 'one judged task',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    if (phase === 3) {
      return { toolCall: { name: 'plan_view', args: {} } };
    }
    if (phase === 4) {
      const view = lastToolResult<{ nodes?: Array<{ logicalTaskId: string }> }>(req, (value) =>
        Array.isArray(value?.nodes),
      );
      return {
        toolCall: {
          name: 'kb_propose',
          args: {
            subject: { tier: 0 },
            taskClass: 'judging',
            polarity: 'weakness',
            trigger: 'error',
            logicalTaskId: view?.nodes?.[0]?.logicalTaskId ?? '',
            note: 'kept missing planted arithmetic errors',
          },
        },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'proposed' } } };
  });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: new JsonlFileStore({ dir }) },
    defaults: {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    },
  });
  const handle = orchestratePlanned(engine, 'observe the ladder', {
    budget: { capUsd: 5, finalizeReserveUsd: 1 },
    plan: { kbPropose: true },
  });
  const outcome = await handle.result;
  expect(outcome.status).toBe('ok');
  const entries = await new JsonlFileStore({ dir }).load(handle.runId);
  const opEntry = entries.find(
    (entry) =>
      entry.kind === 'ledger.op' &&
      ((entry.value as { op?: { op?: string } }).op?.op ?? '') === 'observation_add',
  );
  expect(opEntry).toBeDefined();
  return { runId: handle.runId, entryRef: opEntry!.seq };
}

describe('rulvar kb gate (M12-T04)', () => {
  it('refuses to assemble a gate without the attestation and writes nothing', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-gate-'));
    const dir = join(cwd, '.rulvar');
    const { runId, entryRef } = await produceRun(dir);

    const io = scriptedIo();
    const code = await runCli(
      ['kb', 'gate', runId, String(entryRef), '--approver', 'founder', '--store', dir],
      { cwd, io },
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain('--ruled-out is required');
    expect(existsSync(join(cwd, 'rulvar.models.json'))).toBe(false);
  });

  it('rejects a non-proposal entry and never births a claim from it', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-gate-'));
    const dir = join(cwd, '.rulvar');
    const { runId } = await produceRun(dir);

    const io = scriptedIo();
    const code = await runCli(
      [
        'kb',
        'gate',
        runId,
        '1',
        '--approver',
        'founder',
        '--ruled-out',
        'prompt,tools',
        '--store',
        dir,
      ],
      { cwd, io },
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain('is not a kb_propose proposal');
    expect(existsSync(join(cwd, 'rulvar.models.json'))).toBe(false);
  });

  it('gates the proposal into a claim with origin, template statement and TTL', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-gate-'));
    const dir = join(cwd, '.rulvar');
    const { runId, entryRef } = await produceRun(dir);

    const io = scriptedIo();
    const code = await runCli(
      [
        'kb',
        'gate',
        runId,
        String(entryRef),
        '--approver',
        'founder',
        '--ruled-out',
        'prompt,tools,difficulty',
        '--contrast-eval',
        'sweep-7:judging-3,judging-5',
        '--confidence',
        'high',
        '--store',
        dir,
      ],
      { cwd, io },
    );
    expect(code).toBe(0);
    expect(io.outLines.join('\n')).toContain('gated: kb-proposal-');

    const store = new FileModelKnowledgeStore({ path: join(cwd, 'rulvar.models.json') });
    const snapshot = await store.current();
    expect(snapshot.claims).toHaveLength(1);
    const claim = snapshot.claims[0];
    expect(claim.class).toBe('human-editorial');
    expect(claim.subject).toEqual({ model: 'fake:model', effort: 'medium' });
    expect(claim.taskClass).toBe('judging');
    expect(claim.polarity).toBe('weakness');
    // The typed template, never the quarantined note.
    expect(claim.statement).toBe('orchestrator-observed weakness on judging: trigger error');
    expect(claim.statement).not.toContain('arithmetic');
    expect(claim.origin).toEqual({ kind: 'kb-proposal', runId, entryRef });
    expect(claim.evidence.length).toBeGreaterThan(0);
    expect(claim.author).toEqual({ kind: 'human', id: 'founder' });
    expect(claim.confidence).toBe('high');
    // Editorial weakness TTL: 45 days from the run's terminal updatedAt.
    expect(Date.parse(claim.expiresAt)).toBeGreaterThan(Date.now());

    // kb list renders the provenance end to end.
    const listIo = scriptedIo();
    expect(await runCli(['kb', 'list'], { cwd, io: listIo })).toBe(0);
    expect(listIo.outLines.join('\n')).toContain(
      `origin: kb-proposal run=${runId}#${String(entryRef)}`,
    );

    // The second gate of the same proposal rejects: supersede is the
    // edit path.
    const dupIo = scriptedIo();
    const dup = await runCli(
      [
        'kb',
        'gate',
        runId,
        String(entryRef),
        '--approver',
        'founder',
        '--ruled-out',
        'prompt',
        '--store',
        dir,
      ],
      { cwd, io: dupIo },
    );
    expect(dup).toBe(1);
    expect(dupIo.errLines.join('\n')).toContain('already gated as claim');
    expect((await store.current()).claims).toHaveLength(1);
  });

  it('rejects gating an expired proposal', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-gate-ttl-'));
    const dir = join(cwd, '.rulvar');
    const { runId, entryRef } = await produceRun(dir);
    const journal = new JsonlFileStore({ dir });
    const meta = (await journal.listRuns()).find((m) => m.runId === runId)!;
    await journal.putMeta({ ...meta, updatedAt: '2026-06-01T00:00:00.000Z' });

    const io = scriptedIo();
    const code = await runCli(
      [
        'kb',
        'gate',
        runId,
        String(entryRef),
        '--approver',
        'founder',
        '--ruled-out',
        'prompt',
        '--store',
        dir,
      ],
      { cwd, io },
    );
    expect(code).toBe(1);
    expect(io.errLines.join('\n')).toContain('the proposal expired');
    expect(existsSync(join(cwd, 'rulvar.models.json'))).toBe(false);
  });
});
