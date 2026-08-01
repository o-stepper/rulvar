/**
 * The bounded contradiction pass wired into the orchestrator (RV1302).
 * Reproduced on published 1.149.0: two children crediting one source
 * line with different values both rode into the synthesis prompt, no
 * surface named the disagreement, and the run settled confident. These
 * tests pin the three postures (report, carry, fail), the honest
 * distinction between an absent field and an empty list, the evidence
 * pool the pass judges, and the intake refusals.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError, FailRunError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';

import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'reads one file' } };

const READS_THREE = 'The retry default is `attempts: 3` (`src/retry.ts:33`).';
const READS_FIVE = 'The retry default is `attempts: 5` (`src/retry.ts:33`).';

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

function textOf(req: ChatRequest): string {
  return req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

/**
 * Spawns one worker per scripted child turn, awaits them all, and
 * finishes with a draft that takes one reading without saying so.
 */
function poolAdapter(children: readonly ScriptedTurn[]) {
  let orchTurn = 0;
  return scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      const prompt = textOf(req);
      const index = Number(prompt.slice(prompt.lastIndexOf('read ') + 5).trim());
      return children[index] ?? { text: '' };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCalls: children.map((_, index) => ({
          name: 'spawn_agent',
          args: { agentType: 'worker', prompt: `read ${String(index)}` },
        })),
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft: the default is three' } } };
  });
}

function harness(children: readonly ScriptedTurn[]) {
  const coordination = poolAdapter(children);
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({
      toolCall: { name: 'finish', args: { result: 'final: the default is three' } },
    }),
    { id: 'strong' },
  );
  const { internals, events } = makeInternals({
    adapters: [coordination, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { internals, events, coordination, synthesis };
}

const DISPUTED = [{ text: READS_THREE }, { text: READS_FIVE }];

describe('the bounded contradiction pass (RV1302)', () => {
  it('reports a pool contradiction on the acceptance envelope and in a log', async () => {
    const { internals, events } = harness(DISPUTED);
    const wf = makeOrchestratorWorkflow('read the retry policy', {
      acceptance: { childPolicy: 'all-ok' },
      contradictions: {},
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as {
      contradictions?: { anchor: string; key: string; claims: { value: string }[] }[];
    };
    expect(outcome.contradictions).toHaveLength(1);
    const found = outcome.contradictions?.[0];
    expect(found?.anchor).toBe('src/retry.ts:33');
    expect(found?.key).toBe('attempts');
    expect(found?.claims.map((claim) => claim.value)).toEqual(['3', '5']);

    const log = events
      .ofType('log')
      .find((event) => (event as { msg?: string }).msg === 'orchestrator contradiction pass') as
      { data?: { contradictions?: number; onFound?: string } } | undefined;
    expect(log?.data?.contradictions).toBe(1);
    expect(log?.data?.onFound).toBe('report');
  });

  it('distinguishes an unconfigured pass from a pass that found nothing', async () => {
    const agreeing = [{ text: READS_THREE }, { text: READS_THREE }];
    const configured = harness(agreeing);
    const withPass = (await executeWorkflow(
      configured.internals,
      makeOrchestratorWorkflow('read the retry policy', {
        acceptance: { childPolicy: 'all-ok' },
        contradictions: {},
      }),
      undefined,
    )) as Record<string, unknown>;
    // An EMPTY list is a fact: the pass ran and the pool agreed.
    expect(withPass.contradictions).toEqual([]);

    const bare = harness(agreeing);
    const withoutPass = (await executeWorkflow(
      bare.internals,
      makeOrchestratorWorkflow('read the retry policy', {
        acceptance: { childPolicy: 'all-ok' },
      }),
      undefined,
    )) as Record<string, unknown>;
    // An ABSENT field is a different fact: nothing looked.
    expect('contradictions' in withoutPass).toBe(false);
  });

  it('carries the contradictions into the single-mode synthesis prompt', async () => {
    const { internals, synthesis } = harness(DISPUTED);
    const wf = makeOrchestratorWorkflow('read the retry policy', {
      acceptance: { childPolicy: 'all-ok' },
      synthesis: {},
      contradictions: { onFound: 'carry' },
    });
    await executeWorkflow(internals, wf, undefined);
    expect(synthesis.calls).toHaveLength(1);
    const prompt = synthesis.calls[0] === undefined ? '' : textOf(synthesis.calls[0]);
    expect(prompt).toContain('CHILD CONTRADICTIONS:');
    expect(prompt).toContain('src/retry.ts:33');
    expect(prompt).toContain('"value":"5"');
  });

  it('leaves the synthesis prompt byte identical when the pool agrees', async () => {
    const carried = harness([{ text: READS_THREE }, { text: READS_THREE }]);
    await executeWorkflow(
      carried.internals,
      makeOrchestratorWorkflow('read the retry policy', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: {},
        contradictions: { onFound: 'carry' },
      }),
      undefined,
    );
    const bare = harness([{ text: READS_THREE }, { text: READS_THREE }]);
    await executeWorkflow(
      bare.internals,
      makeOrchestratorWorkflow('read the retry policy', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: {},
      }),
      undefined,
    );
    // Node ids are per-run ULIDs; everything else must match byte for
    // byte, because prompt bytes are journal identity.
    const stable = (req: ChatRequest | undefined): string =>
      req === undefined ? '' : textOf(req).replace(/[0-9A-HJKMNP-TV-Z]{26}/gu, 'ID');
    expect(stable(carried.synthesis.calls[0])).toBe(stable(bare.synthesis.calls[0]));
    expect(stable(carried.synthesis.calls[0])).not.toBe('');
  });

  it('fails the run typed BEFORE any synthesis dispatch, with the acceptance snapshot', async () => {
    const { internals, synthesis } = harness(DISPUTED);
    const wf = makeOrchestratorWorkflow('read the retry policy', {
      acceptance: { childPolicy: 'all-ok' },
      synthesis: {},
      contradictions: { onFound: 'fail' },
    });
    const thrown = await executeWorkflow(internals, wf, undefined).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_contradictions');
    expect(data.contradictions).toHaveLength(1);
    // The fan-out work IS complete; the failure is downstream of it.
    expect(data.completion).toBe('complete');
    expect(data.childStatusCounts).toEqual({ ok: 2 });
    // Not one paid synthesis turn was dispatched.
    expect(synthesis.calls).toHaveLength(0);
  });

  it('judges the evidence pool only: a failed child cannot contradict', async () => {
    const { internals } = harness([
      { text: READS_THREE },
      { error: { code: 'agent', message: READS_FIVE, retryable: false } },
    ]);
    const wf = makeOrchestratorWorkflow('read the retry policy', {
      acceptance: { childPolicy: { minSuccessful: 1 } },
      contradictions: { onFound: 'fail' },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as Record<string, unknown>;
    // The dead child's message is not evidence, so nothing disputes it.
    expect(outcome.contradictions).toEqual([]);
  });

  it('re-derives the identical finding on resume, journaling nothing and paying nothing', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const defaults = {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' } as const,
      profiles: PROFILES,
    };
    const wfOpts = {
      acceptance: { childPolicy: 'all-ok' as const },
      contradictions: {},
    };
    const engineA = createEngine({
      adapters: [poolAdapter(DISPUTED)],
      stores: { journal: store, transcripts },
      defaults,
    });
    const first = await engineA.run(
      makeOrchestratorWorkflow('read the retry policy', wfOpts),
      undefined,
      { runId: 'DISPUTE' },
    ).result;
    expect(first.status).toBe('ok');

    const replay = poolAdapter(DISPUTED);
    const engineB = createEngine({
      adapters: [replay],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume(
      'DISPUTE',
      makeOrchestratorWorkflow('read the retry policy', wfOpts),
    ).result;
    expect(resumed.status).toBe('ok');
    expect((resumed.value as Record<string, unknown>).contradictions).toEqual(
      (first.value as Record<string, unknown>).contradictions,
    );
    expect(replay.calls).toHaveLength(0);
    // The pass is a pure fold: it writes no decision of its own.
    const kinds = (await store.load('DISPUTE'))
      .map((entry) => (entry.value as { decisionType?: string } | undefined)?.decisionType)
      .filter((kind): kind is string => kind !== undefined);
    expect(kinds.filter((kind) => kind.includes('contradiction'))).toEqual([]);
  });

  it('refuses carry without a single-mode synthesis, and refuses a bad posture', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', { contradictions: { onFound: 'carry' } }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        synthesis: { mode: 'incremental' },
        contradictions: { onFound: 'carry' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        contradictions: { onFound: 'warn' as unknown as 'report' },
      }),
    ).toThrow(ConfigError);
    expect(() => makeOrchestratorWorkflow('goal', { contradictions: { pattern: '\\d*' } })).toThrow(
      ConfigError,
    );
    expect(() => makeOrchestratorWorkflow('goal', { contradictions: { max: 0 } })).toThrow(
      ConfigError,
    );
  });
});
