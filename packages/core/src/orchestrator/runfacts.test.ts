/**
 * The execution self-facts surfaces (RV1503, the eighteenth
 * improvement plan). The seventeenth comparison run graded the entire
 * dossier `live-observed: no` while its own harness had just watched
 * 118 wire requests settle, because no surface ever showed the
 * composing root what its run actually executed. These tests pin the
 * two opt-ins: `executionFacts` (replay-stable per-child facts on the
 * await digests and the child result page) and `synthesis.runFacts`
 * (the aggregate RUN FACTS line in the single-mode synthesis prompt),
 * and the byte-identity of both surfaces when the opt-ins are off.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError } from '../l0/errors.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';

import { makeOrchestratorWorkflow } from './orchestrate.js';
import { citedValueValidator, evidenceGradeValidator } from './finish-validators.js';

const PROFILES = { worker: { description: 'reads one span' } };

const WORKER_TURN: ScriptedTurn = {
  text: 'The span reads fine (`src/a.ts:5`).',
  usage: { inputTokens: 100, outputTokens: 7 },
  providerMetadata: { fake: { responseId: 'resp-1' } },
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

function textOf(req: ChatRequest): string {
  return req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function toolResultsOf(req: ChatRequest, name: string): unknown[] {
  return req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'tool-result' && part.name === name)
    .map((part) => (part as { result: unknown }).result);
}

const EXPECTED_FACTS = {
  wireRequests: 1,
  wireIdsMissing: 0,
  inputTokens: 100,
  outputTokens: 7,
};

/** Spawns one worker, awaits it, optionally pages it, then finishes. */
function factsHarness(options?: { readChild?: boolean }) {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return WORKER_TURN;
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read it' } },
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    if (options?.readChild === true && orchTurn === 3) {
      return {
        toolCall: { name: 'get_child_result', args: { handle: handlesIn(req)[0] ?? 1 } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft text' } } };
  });
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'final text' } } }),
    { id: 'strong' },
  );
  const { internals, events } = makeInternals({
    adapters: [coordination, synthesis],
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
    profiles: PROFILES,
  });
  return { internals, events, coordination, synthesis };
}

describe('execution self-facts (RV1503)', () => {
  it('await digests carry replay-stable facts under the executionFacts opt-in', async () => {
    const { internals, coordination } = factsHarness();
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('read the span', {
        acceptance: { childPolicy: 'all-ok' },
        executionFacts: true,
      }),
      undefined,
    );
    const finishRequest = coordination.calls.at(-1);
    const awaited = (
      finishRequest === undefined ? [] : toolResultsOf(finishRequest, 'await_all')
    )[0] as { facts?: unknown }[] | undefined;
    expect(awaited).toHaveLength(1);
    expect(awaited?.[0]?.facts).toEqual(EXPECTED_FACTS);
  });

  it('keeps the await digests byte identical without the opt-in', async () => {
    const { internals, coordination } = factsHarness();
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('read the span', {
        acceptance: { childPolicy: 'all-ok' },
      }),
      undefined,
    );
    const finishRequest = coordination.calls.at(-1);
    const awaited = (
      finishRequest === undefined ? [] : toolResultsOf(finishRequest, 'await_all')
    )[0] as Record<string, unknown>[] | undefined;
    expect(awaited).toHaveLength(1);
    expect(awaited?.[0] !== undefined && 'facts' in awaited[0]).toBe(false);
  });

  it('the child result page carries the same facts under the opt-in', async () => {
    const { internals, coordination } = factsHarness({ readChild: true });
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('read the span', {
        acceptance: { childPolicy: 'all-ok' },
        exposeChildResultTools: true,
        executionFacts: true,
      }),
      undefined,
    );
    const finishRequest = coordination.calls.at(-1);
    const page = (
      finishRequest === undefined ? [] : toolResultsOf(finishRequest, 'get_child_result')
    )[0] as { facts?: unknown } | undefined;
    expect(page?.facts).toEqual(EXPECTED_FACTS);
  });

  it('folds the aggregate RUN FACTS line into the synthesis prompt under runFacts', async () => {
    const { internals, synthesis } = factsHarness();
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('read the span', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { runFacts: true },
      }),
      undefined,
    );
    expect(synthesis.calls).toHaveLength(1);
    const prompt = synthesis.calls[0] === undefined ? '' : textOf(synthesis.calls[0]);
    expect(prompt).toContain('RUN FACTS: ');
    const line = prompt.split('\n').find((row) => row.startsWith('RUN FACTS: ')) ?? '';
    const parsed = JSON.parse(line.slice('RUN FACTS: '.length, line.indexOf('} (') + 1)) as Record<
      string,
      unknown
    >;
    expect(parsed).toEqual({
      scope: 'settled-children-only',
      runId: internals.runId,
      children: 1,
      byStatus: { ok: 1 },
      ...EXPECTED_FACTS,
    });
    // The line says what the facts are and are not, and WHOSE facts
    // they are (RV1807): the child-only scope is part of the quoted
    // bytes, so the composing model cannot honestly print them as the
    // whole workflow's totals.
    expect(line).toContain(`live-observed by run ${internals.runId}`);
    expect(line).toContain('production evidence it is not');
    expect(line).toContain('settled children ONLY');
    expect(line).toContain("the whole run's totals are the terminal envelope and invoice");
  });

  it('the line the engine writes passes the grade the engine ships (RV2501)', async () => {
    // The composition the 1.226.0 comparison run could not satisfy:
    // the RUN FACTS line ends in the `live-observed` register, the
    // synthesis is told to reproduce run facts only from it, and the
    // default evidence-grade validator then rejected every quote of
    // it because the line named no artifact at all. The line now
    // carries its own run id in the same sentence, so quoting it is
    // not a validator failure, and the cited-value sibling stays
    // satisfied because the sentence carries no source citation.
    const { internals, synthesis } = factsHarness();
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('read the span', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { runFacts: true },
      }),
      undefined,
    );
    const prompt = synthesis.calls[0] === undefined ? '' : textOf(synthesis.calls[0]);
    const line = prompt.split('\n').find((row) => row.startsWith('RUN FACTS: ')) ?? '';
    expect(line).not.toBe('');
    const judged = { result: line, text: line, runId: internals.runId };
    expect(evidenceGradeValidator().validate(judged).ok).toBe(true);
    expect(citedValueValidator({ resolve: () => 'unused' }).validate(judged).ok).toBe(true);
    // The contrast: the same bytes judged without the run id are
    // exactly the failure the comparison run died on.
    const blind = evidenceGradeValidator().validate({ result: line, text: line });
    expect(blind.ok).toBe(false);
    if (blind.ok) {
      return;
    }
    expect(blind.reasons[0]).toContain('live-observed');
  });

  it('keeps the synthesis prompt byte identical without runFacts', async () => {
    const withOut = factsHarness();
    await executeWorkflow(
      withOut.internals,
      makeOrchestratorWorkflow('read the span', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: {},
      }),
      undefined,
    );
    const prompt =
      withOut.synthesis.calls[0] === undefined ? '' : textOf(withOut.synthesis.calls[0]);
    expect(prompt).not.toContain('RUN FACTS:');
  });

  it('refuses non-boolean opt-ins, fail closed', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', { executionFacts: 'yes' as unknown as boolean }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        synthesis: { runFacts: 1 as unknown as boolean },
      }),
    ).toThrow(ConfigError);
  });
});
