/**
 * rulvar kb inbox e2e (M12-T03): a real plan run with kb_propose lands
 * its quarantined proposal in a JsonlFileStore; the inbox aggregates it
 * from the finished run with full provenance, groups display-only, and
 * expires proposals of runs finished more than fourteen days ago.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  JsonlFileStore,
  type AgentProfile,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type Usage,
} from '@rulvar/core';
import { orchestratePlanned, planHash, emptyPlan } from '@rulvar/plan';

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

/** Runs one plan run that journals a kb_propose proposal into `dir`. */
async function produceRun(dir: string): Promise<string> {
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
  return handle.runId;
}

describe('rulvar kb inbox (M12-T03)', () => {
  it('aggregates the proposal from a finished run with provenance, display-only', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-inbox-'));
    const dir = join(cwd, '.rulvar');
    const runId = await produceRun(dir);

    const io = scriptedIo();
    const code = await runCli(['kb', 'inbox', '--store', dir], { cwd, io });
    expect(code).toBe(0);
    const out = io.outLines.join('\n');
    expect(out).toContain('kb inbox: 1 live proposal in 1 group across 1 finished run');
    // The group header carries the ENGINE-resolved concrete subject.
    expect(out).toContain('fake:model effort=medium :: judging weakness (1 proposal)');
    // The typed template statement a gated claim would carry.
    expect(out).toContain('statement: orchestrator-observed weakness on judging: trigger error');
    // Provenance: the initiating run identity plus the proposal entryRef.
    expect(out).toContain(`run=${runId}`);
    expect(out).toContain('(rulvar-orchestrate)');
    expect(out).toContain('trigger=error');
    // The human review surface shows the quarantined note verbatim.
    expect(out).toContain('note: kept missing planted arithmetic errors');
    // Display-only: the run journal is untouched by the aggregation.
    const before = await new JsonlFileStore({ dir }).load(runId);
    const io2 = scriptedIo();
    await runCli(['kb', 'inbox', '--store', dir], { cwd, io: io2 });
    const after = await new JsonlFileStore({ dir }).load(runId);
    expect(after).toEqual(before);
    expect(io2.outLines).toEqual(io.outLines);
  });

  it('expires proposals of runs finished more than fourteen days ago', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-kb-inbox-ttl-'));
    const dir = join(cwd, '.rulvar');
    const runId = await produceRun(dir);

    // Age the run: rewrite its meta with a stale terminal updatedAt (the
    // age anchor; journal entries carry no wall clock by design).
    const store = new JsonlFileStore({ dir });
    const metas = await store.listRuns();
    const meta = metas.find((m) => m.runId === runId);
    expect(meta).toBeDefined();
    await store.putMeta({ ...meta!, updatedAt: '2026-06-01T00:00:00.000Z' });

    const io = scriptedIo();
    const code = await runCli(['kb', 'inbox', '--store', dir], { cwd, io });
    expect(code).toBe(0);
    const out = io.outLines.join('\n');
    expect(out).toContain('0 live proposals in 0 groups');
    expect(out).toContain('1 expired (older than 14 days)');
  });
});
