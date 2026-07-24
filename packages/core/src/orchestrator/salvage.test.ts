/**
 * Partial-child salvage (RV-210 close-out). Reproduced on published
 * 1.54.0: a limit child's digest said only 'terminal status limit',
 * get_child_result served the same bare line, and
 * acceptance.acceptPartialChildren was a silently ignored word, so the
 * whole run rejected even when the child had recorded progress. These
 * tests pin the contract: the digest carries the partial, the evidence
 * tool pages the full report, salvage counts a partial-bearing limit
 * child as a success for both policies (completion 'partial', the
 * salvaged children listed on the envelope, ONE journaled decision), a
 * bare limit child still rejects, the coordination prompt line appears
 * only when the option is on, and an engine-level resume replays the
 * identical envelope with zero live calls.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError, FailRunError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { progressReportTool } from '../tools/progress.js';
import { tool } from '../tools/tool.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const ROUTING = { loop: 'fake:model', orchestrate: 'fake:model' } as const;

const REPORT = {
  facts: ['moon-fact: the cache doubles at dawn'],
  evidence: ['cache.ts:12'],
  questions: ['who resets it?'],
};

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number; handles?: number[] };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
        if (Array.isArray(result?.handles)) {
          handles.push(...result.handles.filter((h): h is number => typeof h === 'number'));
        }
      }
    }
  }
  return handles;
}

const noop = () =>
  tool({
    name: 'noop',
    description: 'does nothing',
    parameters: z.strictObject({}),
    execute: () => Promise.resolve('noop'),
  });

/** The stuck worker: reports on its first turn, then burns into the cap. */
const PROFILES = {
  solid: { description: 'settles ok' },
  stuck: {
    description: 'reports then burns out',
    tools: [progressReportTool(), noop()],
    limits: { maxTurns: 8, maxToolCalls: 2 },
  },
  bare: {
    description: 'burns out silently',
    tools: [noop()],
    limits: { maxTurns: 8, maxToolCalls: 2 },
  },
};

/**
 * Coordination: spawn solid + the given stuck profile, await both,
 * finish. The stuck worker reports on turn one (unless bare), then
 * noops into its cap. Captures the first orchestrator prompt and the
 * digest text the finish turn saw.
 */
function salvageAdapter(
  stuckProfile: 'stuck' | 'bare',
  captures: { prompt?: string; digest?: string },
) {
  let orchTurn = 0;
  return scriptedAdapter((req): ScriptedTurn => {
    const agentType = agentTypeOf(req);
    if (agentType === 'solid') {
      return { text: 'solid evidence' };
    }
    if (agentType === 'stuck' || agentType === 'bare') {
      const turn = req.messages.filter((msg) => msg.role === 'tool').length;
      if (agentType === 'stuck' && turn === 0) {
        return { toolCall: { name: 'report_progress', args: REPORT } };
      }
      return { toolCall: { name: 'noop', args: {} } };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      const text = req.messages[0]?.parts.find((part) => part.type === 'text');
      captures.prompt = (text as { text?: string } | undefined)?.text ?? '';
      return {
        toolCalls: [
          { name: 'spawn_agent', args: { agentType: 'solid', prompt: 'task A' } },
          { name: 'spawn_agent', args: { agentType: stuckProfile, prompt: 'task B' } },
        ],
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    for (const msg of req.messages) {
      for (const part of msg.parts) {
        if (part.type === 'tool-result' && part.name === 'await_all') {
          captures.digest = JSON.stringify(part.result);
        }
      }
    }
    return { toolCall: { name: 'finish', args: { result: 'the merged report' } } };
  });
}

type Envelope = {
  result: unknown;
  completion: string;
  childStatusCounts: Record<string, number>;
  degradedReasons: string[];
  salvagedPartialChildren?: string[];
};

describe('partial-child salvage (RV-210 close-out)', () => {
  it('all-ok accepts the partial-bearing limit child and lists it on the envelope', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals, store } = makeInternals({
      adapters: [salvageAdapter('stuck', captures)],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', acceptPartialChildren: true },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Envelope;
    expect(outcome.result).toBe('the merged report');
    expect(outcome.completion).toBe('partial');
    expect(outcome.childStatusCounts).toEqual({ ok: 1, limit: 1 });
    expect(outcome.salvagedPartialChildren).toHaveLength(1);
    expect(outcome.degradedReasons).toEqual([expect.stringContaining('accepted as partial')]);
    // The digest the orchestrator saw carries the partial, not a bare
    // status line.
    expect(captures.digest).toContain('moon-fact');
    expect(captures.digest).toContain('partial:');
    // The salvage contract rides the coordination prompt.
    expect(captures.prompt).toContain('Partial salvage is on');
    // ONE journaled decision carries the verdict AND the salvage list.
    const decisions = (await store.load('test-run')).filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.value).toMatchObject({
      verdict: 'accepted',
      completion: 'partial',
      salvagedPartialChildren: outcome.salvagedPartialChildren,
    });
  });

  it('a limit child WITHOUT a partial still rejects, salvage or not', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [salvageAdapter('bare', captures)],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', acceptPartialChildren: true },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      completion?: string;
      salvagedPartialChildren?: string[];
      degradedReasons?: string[];
    };
    expect(data.completion).toBe('rejected');
    expect(data.salvagedPartialChildren).toBeUndefined();
    expect(data.degradedReasons?.[0]).toContain("settled 'limit'");
  });

  it('minSuccessful counts a salvaged child toward the minimum', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [salvageAdapter('stuck', captures)],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: { minSuccessful: 2 }, acceptPartialChildren: true },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Envelope;
    expect(outcome.completion).toBe('partial');
    expect(outcome.salvagedPartialChildren).toHaveLength(1);
  });

  it('without the option the fold is byte-identical to before (no salvage, no prompt line)', async () => {
    const captures: { prompt?: string; digest?: string } = {};
    const { internals } = makeInternals({
      adapters: [salvageAdapter('stuck', captures)],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok' },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as { salvagedPartialChildren?: unknown };
    expect(data.salvagedPartialChildren).toBeUndefined();
    expect(captures.prompt).not.toContain('Partial salvage');
  });

  it('get_child_result pages the FULL partial of a limit child', async () => {
    let orchTurn = 0;
    let pageContent = '';
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const agentType = agentTypeOf(req);
      if (agentType === 'stuck') {
        const turn = req.messages.filter((msg) => msg.role === 'tool').length;
        return turn === 0
          ? { toolCall: { name: 'report_progress', args: REPORT } }
          : { toolCall: { name: 'noop', args: {} } };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'stuck', prompt: 'task B' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      if (orchTurn === 3) {
        return {
          toolCall: { name: 'get_child_result', args: { handle: handlesIn(req)[0] } },
        };
      }
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result' && part.name === 'get_child_result') {
            pageContent = String((part.result as { content?: string }).content ?? '');
          }
        }
      }
      return { toolCall: { name: 'finish', args: { result: pageContent } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('salvage the study', { exposeChildResultTools: true });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as string;
    const page = JSON.parse(outcome) as { error: string; partial: typeof REPORT };
    expect(page.error).toContain('terminal status limit');
    expect(page.partial).toEqual(REPORT);
  });

  it('rejects a non-boolean acceptPartialChildren at intake', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        acceptance: {
          childPolicy: 'all-ok',
          acceptPartialChildren: 'yes' as unknown as boolean,
        },
      }),
    ).toThrow(ConfigError);
  });

  it('an engine-level resume replays the identical salvage envelope from the journaled decision', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const defaults = { routing: ROUTING, profiles: PROFILES };
    const wfOpts = {
      acceptance: { childPolicy: 'all-ok' as const, acceptPartialChildren: true },
    };
    const captures: { prompt?: string; digest?: string } = {};
    const engineA = createEngine({
      adapters: [salvageAdapter('stuck', captures)],
      stores: { journal: store, transcripts },
      defaults,
    });
    const first = await engineA.run(makeOrchestratorWorkflow('collect', wfOpts), undefined, {
      runId: 'SALVAGE',
    }).result;
    expect(first.status).toBe('ok');
    expect((first.value as Envelope).salvagedPartialChildren).toHaveLength(1);

    const replayAdapter = salvageAdapter('stuck', {});
    const engineB = createEngine({
      adapters: [replayAdapter],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume('SALVAGE', makeOrchestratorWorkflow('collect', wfOpts))
      .result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toEqual(first.value);
    // The envelope (verdict, salvage list, completion) rolls forward
    // from the ONE journaled acceptance decision, and since the run
    // already SETTLED ok, the plain-limit stuck child replays too
    // instead of re-dispatching live (the RV-210 cycle finding, fixed):
    // a completed run resumes with ZERO adapter calls.
    expect(replayAdapter.calls).toEqual([]);
  });
});
