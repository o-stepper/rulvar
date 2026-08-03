/**
 * The evidence entries plumbing (the deferred RV1501 half). The
 * benchmark's decisive finding: the worker RECORDED the correct
 * reading through record_evidence, the composed output paraphrased it
 * away, and the root inverted it at synthesis. The pool of the
 * claim-consistency pass was OUTPUTS only, so the recorded entry could
 * never pair, and nothing about the entries survived resume. Now the
 * loop collects the recorded content (bounded), the terminal journals
 * it beside the evidence verdict, replay restores both, and the claim
 * pool reads a second source per accepted child from the entries, so
 * live and resumed runs pair the draft against what the child actually
 * recorded.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ChatRequest } from '../l0/messages.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { createEngine } from '../engine/engine.js';
import { defineWorkflow } from '../engine/ctx.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { tool } from '../tools/tool.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const recordEvidence = () =>
  tool({
    name: 'record_evidence',
    description: 'records one verified evidence entry',
    parameters: z.strictObject({
      claim: z.string(),
      file: z.string(),
      lines: z.string().optional(),
    }),
    execute: () => Promise.resolve({ recorded: true }),
  });

const CLAIM = 'The ledger write failure turns the tool result into a typed refusal';
const ENTRY_ARGS = { claim: CLAIM, file: 'src/exec.ts', lines: '256-296' };
const DRAFT_INVERTED =
  'draft: an audit-write failure does not turn success into failure, the result is preserved [src/exec.ts:256-296].';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}
function transcriptOf(req: ChatRequest): string {
  return JSON.stringify(req.messages);
}
function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
      }
    }
  }
  return handles;
}

describe('the recorded entry content survives the terminal and replay', () => {
  it('rides the result, the journal terminal, and the replayed result verbatim', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const make = () => {
      const adapter = scriptedAdapter((req): ScriptedTurn => {
        return transcriptOf(req).includes('"recorded":true')
          ? { text: 'done' }
          : { toolCall: { name: 'record_evidence', args: ENTRY_ARGS } };
      });
      return {
        adapter,
        engine: createEngine({
          adapters: [adapter],
          stores: { journal: store, transcripts },
          defaults: { routing: { loop: 'fake:model' } },
        }),
      };
    };
    const wf = defineWorkflow({ name: 'recorder' }, async (ctx) => {
      const result = await ctx.agent('inspect the executor', {
        result: 'full',
        tools: [recordEvidence()],
      });
      return { entries: result.evidenceEntries ?? null };
    });

    const first = await make().engine.run(wf, undefined, { runId: 'ENTRIES' }).result;
    expect(first.status).toBe('ok');
    const expected = [{ claim: CLAIM, citation: 'src/exec.ts:256-296' }];
    expect((first.value as { entries: unknown }).entries).toEqual(expected);
    // The terminal entry carries the content beside the usage.
    const terminal = (await store.load('ENTRIES')).find(
      (entry) => entry.kind === 'agent' && entry.status === 'ok' && entry.ref !== undefined,
    );
    expect(terminal?.evidenceEntries).toEqual(expected);

    // The replayed result restores it with zero adapter calls.
    const { adapter, engine } = make();
    const resumed = await engine.resume('ENTRIES', wf).result;
    expect(resumed.status).toBe('ok');
    expect((resumed.value as { entries: unknown }).entries).toEqual(expected);
    expect(adapter.calls).toHaveLength(0);
  });
});

describe('the claim pool pairs against the recorded entries (RV1501)', () => {
  const JUDGE_FINDS = {
    text: JSON.stringify({
      contradictions: [{ pair: 0, reason: 'the draft inverts the recorded reading' }],
    }),
  };

  function orchestrationPair() {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const make = () => {
      const coordination = scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          // The worker RECORDS the precise reading, then composes a
          // VAGUE output with no anchor at all: only the entries
          // source can pair the draft.
          return transcriptOf(req).includes('"recorded":true')
            ? { text: 'analysis complete.' }
            : { toolCall: { name: 'record_evidence', args: ENTRY_ARGS } };
        }
        const transcript = transcriptOf(req);
        if (!transcript.includes('"handle"')) {
          return {
            toolCall: {
              name: 'spawn_agent',
              args: { agentType: 'worker', prompt: 'inspect the executor' },
            },
          };
        }
        if (!transcript.includes('analysis complete.')) {
          return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
        }
        return { toolCall: { name: 'finish', args: { result: DRAFT_INVERTED } } };
      });
      const judge = scriptedAdapter(() => JUDGE_FINDS, { id: 'judge' });
      return {
        coordination,
        judge,
        engine: createEngine({
          adapters: [coordination, judge],
          stores: { journal: store, transcripts },
          defaults: {
            routing: { loop: 'fake:model', orchestrate: 'fake:model' },
            profiles: {
              worker: { description: 'inspects one span', tools: [recordEvidence()] },
            },
          },
        }),
      };
    };
    const wf = () =>
      makeOrchestratorWorkflow('audit the executor', {
        acceptance: { childPolicy: 'all-ok' },
        claimConsistency: { onFound: 'report', judge: { model: 'judge:model' } },
      });
    return { make, wf };
  }

  it('a vague output pairs through the entries source and the judge rules on it', async () => {
    const { make, wf } = orchestrationPair();
    const outcome = await make().engine.run(wf(), undefined, {
      runId: 'POOL-LIVE',
      budgetUsd: 5,
    }).result;
    expect(outcome.status).toBe('ok');
    const envelope = outcome.value as {
      claimContradictions?: Array<{ anchor: string; reason: string }>;
      claimConsistencyMeta?: { pairs: number; poolChildren: number };
    };
    // The output alone carries no anchor: the single pair exists only
    // because the recorded entry entered the pool.
    expect(envelope.claimConsistencyMeta?.pairs).toBe(1);
    expect(envelope.claimConsistencyMeta?.poolChildren).toBe(1);
    expect(envelope.claimContradictions).toHaveLength(1);
    expect(envelope.claimContradictions?.[0]?.anchor).toBe('src/exec.ts:256-296');
  });

  it('a resumed run re-derives the same pairs from the restored entries, zero calls', async () => {
    const { make, wf } = orchestrationPair();
    const first = await make().engine.run(wf(), undefined, {
      runId: 'POOL-RESUME',
      budgetUsd: 5,
    }).result;
    expect(first.status).toBe('ok');

    const { coordination, judge, engine } = make();
    const resumed = await engine.resume('POOL-RESUME', wf()).result;
    expect(resumed.status).toBe('ok');
    const envelope = resumed.value as {
      claimContradictions?: Array<{ anchor: string }>;
      claimConsistencyMeta?: { pairs: number };
    };
    expect(envelope.claimConsistencyMeta?.pairs).toBe(1);
    expect(envelope.claimContradictions).toHaveLength(1);
    expect(coordination.calls).toHaveLength(0);
    expect(judge.calls).toHaveLength(0);
  });
});
