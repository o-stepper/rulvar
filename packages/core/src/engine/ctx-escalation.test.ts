import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { isEscalated, type AgentResult, type EscalatedResult } from '../runtime/agent-loop.js';
import type { EscalationDecision, EscalationReport } from '../runtime/escalation.js';
import { AgentCallError, createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter, type RecordedEvents } from './test-harness.js';

const ESCALATE_ARGS = {
  kind: 'scope_bigger',
  scopeDelta: 'the migration spans nine services, not one',
  revisedEstimate: { usd: 40, turns: 90 },
  blockers: ['schema ownership unclear'],
};

function escalatingAdapter() {
  return scriptedAdapter((_req, call) =>
    call === 0
      ? { toolCall: { name: 'escalate', args: ESCALATE_ARGS } }
      : { text: 'finished normally instead' },
  );
}

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

describe('terminal escalated status (M3-T07, BREAKING)', () => {
  it('without opt-in the escalate tool does not exist and the status is unproducible', async () => {
    const adapter = escalatingAdapter();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('do the migration', { result: 'full' }),
    );
    // No toolset was declared: the wire request carries no tools, the
    // scripted tool call maps to no runtime, and the loop finishes on the
    // next turn with a plain ok.
    expect(adapter.calls[0]?.tools).toBeUndefined();
    expect(result.status).toBe('ok');
  });

  it('a plain value-form call opting in without an onEscalation hook is a ConfigError', async () => {
    const adapter = escalatingAdapter();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    await expect(createCtx(internals).agent('go', { escalation: {} })).rejects.toThrow(ConfigError);
    expect(adapter.calls).toHaveLength(0);
  });

  it("flavor 'B' without an explicit deadlineMs is a ConfigError before any call", async () => {
    const adapter = escalatingAdapter();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    await expect(
      createCtx(internals).agent('go', { escalation: { flavor: 'B' }, result: 'full' }),
    ).rejects.toThrow(ConfigError);
    expect(adapter.calls).toHaveLength(0);
  });

  it('flavor A: the worker terminates escalated with a runtime-completed, validated report', async () => {
    const adapter = escalatingAdapter();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('do the migration', {
        escalation: {},
        result: 'full',
      }),
    );
    expect(result.status).toBe('escalated');
    expect(isEscalated(result)).toBe(true);
    expect(result.output).toBeNull();
    expect(result.escalation).toMatchObject({
      kind: 'scope_bigger',
      scopeDelta: ESCALATE_ARGS.scopeDelta,
      revisedEstimate: { usd: 40, turns: 90 },
      blockers: ['schema ownership unclear'],
      proposedDecomposition: [],
    });
    // Runtime-filled, never model-filled.
    expect(result.escalation?.costToDate).toEqual({ usd: result.costUsd, turns: 1 });
    expect(result.escalation?.salvage.transcriptRef).toBe(result.transcriptRef);
    // Exactly one live call: escalating ended the loop.
    expect(adapter.calls).toHaveLength(1);

    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((e) => e.kind === 'agent' && e.status === 'escalated');
    expect(terminal).toBeDefined();
    expect(terminal?.escalation).toEqual(result.escalation);
    expect(terminal?.value).toBeUndefined();
    expect(terminal?.usage).toEqual(result.usage);
  });

  it('model-authored costToDate or salvage is rejected at validation', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCall: {
              name: 'escalate',
              args: { ...ESCALATE_ARGS, costToDate: { usd: 0, turns: 0 } },
            },
          }
        : { text: 'corrected course' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('go', { escalation: {}, result: 'full' }),
    );
    // The invalid escalation became an error tool result; the model saw
    // it and finished normally.
    expect(result.status).toBe('ok');
    expect(result.output).toBe('corrected course');
    expect(adapter.calls).toHaveLength(2);
  });

  it('a replayed escalated entry yields the byte-identical report with zero adapter calls', async () => {
    const adapter = escalatingAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const live = fullResult(
      await createCtx(internals).agent('do the migration', { escalation: {}, result: 'full' }),
    );
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = escalatingAdapter();
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('do the migration', { escalation: {}, result: 'full' }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayed.status).toBe('escalated');
    expect(replayed.escalation).toEqual(live.escalation);
    // Usage folds into the budget ledger exactly once: the resumed seed
    // already carries the paid work.
    expect(resumed.budget.spent().usage.inputTokens).toBe(10);
  });

  it('value form with a hook: the decision journals once and never re-evaluates on replay', async () => {
    const decisions: EscalationDecision[] = [];
    const seen: EscalatedResult<unknown>[] = [];
    const adapter = escalatingAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      onEscalation: (result) => {
        seen.push(result);
        const decision: EscalationDecision = { kind: 'retry', amendedPrompt: 'narrower scope' };
        decisions.push(decision);
        return decision;
      },
    });
    await expect(
      createCtx(internals).agent('do the migration', { escalation: {} }),
    ).rejects.toThrow(AgentCallError);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.escalation.kind).toBe('scope_bigger');
    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    const decisionEntry = entries.find((e) => e.kind === 'decision');
    expect(decisionEntry?.value).toMatchObject({
      decisionType: 'escalation.decision',
      countsAgainstLimit: true,
      decision: { kind: 'retry', amendedPrompt: 'narrower scope' },
    });
    // Ordering: terminal escalated strictly before the decision entry.
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'escalated');
    expect((terminal?.seq ?? -1) < (decisionEntry?.seq ?? -1)).toBe(true);

    // Replay: the decision is read from the entry, the hook stays cold.
    const prior = await store.load('test-run');
    const { internals: resumed } = makeInternals({
      adapters: [escalatingAdapter()],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      onEscalation: () => {
        throw new Error('the hook must not re-evaluate a journaled decision');
      },
    });
    await expect(createCtx(resumed).agent('do the migration', { escalation: {} })).rejects.toThrow(
      AgentCallError,
    );
  });

  it('crash between the report and the decision pays for the decision live exactly once', async () => {
    // Process A journals the terminal escalated entry with NO decision
    // (result: 'full' has its own channel).
    const { internals, store } = makeInternals({
      adapters: [escalatingAdapter()],
      routing: { loop: 'fake:model' },
    });
    await createCtx(internals).agent('do the migration', { escalation: {}, result: 'full' });
    await internals.replayer.flush();
    const prior = await store.load('test-run');
    expect(prior.some((e) => e.kind === 'decision')).toBe(false);

    // First resume: replays escalated, pays the decision live once.
    let hookCalls = 0;
    const { internals: first, store: firstStore } = makeInternals({
      adapters: [escalatingAdapter()],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      store: undefined,
      onEscalation: () => {
        hookCalls += 1;
        return { kind: 'accept' };
      },
    });
    await expect(createCtx(first).agent('do the migration', { escalation: {} })).rejects.toThrow(
      AgentCallError,
    );
    await first.replayer.flush();
    expect(hookCalls).toBe(1);

    // Second resume: both entries replay; zero live decisions. The store
    // of the first resume holds only its own appends; the durable journal
    // is the concatenation.
    const firstAppends = await firstStore.load('test-run');
    const secondPrior = [...prior, ...firstAppends].sort((a, b) => a.seq - b.seq);
    const { internals: second } = makeInternals({
      adapters: [escalatingAdapter()],
      routing: { loop: 'fake:model' },
      priorEntries: secondPrior,
      onEscalation: () => {
        hookCalls += 1;
        return { kind: 'accept' };
      },
    });
    await expect(createCtx(second).agent('do the migration', { escalation: {} })).rejects.toThrow(
      AgentCallError,
    );
    expect(hookCalls).toBe(1);
  });

  it('an escalated child inside settled parallel is a settled outcome; siblings never abort', async () => {
    const adapter = scriptedAdapter((req, call) => {
      const prompt = JSON.stringify(req.messages[0]);
      if (prompt.includes('escalate-me') && call < 2) {
        return { toolCall: { name: 'escalate', args: ESCALATE_ARGS } };
      }
      return { text: 'sibling finished' };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const settled = await ctx.parallel(
      [
        () => ctx.agent('escalate-me', { escalation: {}, result: 'full' }),
        () => ctx.agent('just work'),
      ] as Array<() => Promise<unknown>>,
      { settle: true },
    );
    // The full-form branch resolves with the EscalatedResult as a VALUE;
    // the sibling completes untouched.
    const first = settled[0] as { status: string; value?: AgentResult<unknown> };
    expect(first.status).toBe('ok');
    expect((first.value as AgentResult<unknown>).status).toBe('escalated');
    expect(settled[1]).toEqual({ status: 'ok', value: 'sibling finished' });
  });

  it('a value-form escalated branch maps to the settled escalated outcome', async () => {
    const adapter = scriptedAdapter((req, call) => {
      const prompt = JSON.stringify(req.messages[0]);
      if (prompt.includes('escalate-me') && call < 2) {
        return { toolCall: { name: 'escalate', args: ESCALATE_ARGS } };
      }
      return { text: 'sibling finished' };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      onEscalation: () => ({ kind: 'accept' }),
    });
    const ctx = createCtx(internals);
    const settled = await ctx.parallel(
      [() => ctx.agent('escalate-me', { escalation: {} }), () => ctx.agent('just work')],
      { settle: true },
    );
    expect(settled[0]?.status).toBe('escalated');
    const escalatedBranch = settled[0] as { result: EscalatedResult<unknown> };
    expect(escalatedBranch.result.escalation.kind).toBe('scope_bigger');
    expect(settled[1]).toEqual({ status: 'ok', value: 'sibling finished' });
  });

  it('flavor B: suspension with deadlineAt, live decision first-wins, terminal after resolution', async () => {
    const adapter = escalatingAdapter();
    const { internals, events: recorded } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      onEscalation: () => ({ kind: 'decompose', children: [{ title: 'part one' }] }),
    });
    const events: RecordedEvents = recorded;
    const result = fullResult(
      await createCtx(internals).agent('do the migration', {
        escalation: { flavor: 'B', deadlineMs: 60_000 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('escalated');
    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    const suspended = entries.find((e) => e.kind === 'approval');
    const resolution = entries.find((e) => e.kind === 'resolution');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'escalated');
    const decisionEntry = entries.find((e) => e.kind === 'decision');
    expect(suspended?.deadlineAt).toBeDefined();
    expect(suspended?.value).toMatchObject({ toolName: 'escalate' });
    expect(resolution?.resolution?.by).toBe('external');
    expect(resolution?.resolution?.value).toMatchObject({ kind: 'decompose' });
    // Ordering: suspension < resolution < terminal escalated < decision.
    expect((suspended?.seq ?? 99) < (resolution?.seq ?? -1)).toBe(true);
    expect((resolution?.seq ?? 99) < (terminal?.seq ?? -1)).toBe(true);
    expect((terminal?.seq ?? 99) < (decisionEntry?.seq ?? -1)).toBe(true);
    expect(events.ofType('approval:pending')).toHaveLength(1);
  });

  it('flavor B: the deadline timer applies the defaultDecision by a timeout resolution', async () => {
    const adapter = escalatingAdapter();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('do the migration', {
        escalation: {
          flavor: 'B',
          deadlineMs: 40,
          defaultDecision: { kind: 'cancel', reason: 'nobody answered' },
        },
        result: 'full',
      }),
    );
    expect(result.status).toBe('escalated');
    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    const resolution = entries.find((e) => e.kind === 'resolution');
    expect(resolution?.resolution?.by).toBe('timeout');
    expect(resolution?.resolution?.value).toMatchObject({ kind: 'cancel' });
    const decisionEntry = entries.find((e) => e.kind === 'decision');
    expect(decisionEntry?.value).toMatchObject({
      decisionType: 'escalation.decision',
      decision: { kind: 'cancel', reason: 'nobody answered' },
    });
  });

  it('the in-run minSpend gate re-prompts an early scope_bigger with keep working', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'escalate', args: ESCALATE_ARGS } }
        : { text: 'kept working and finished' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('go', {
        escalation: { minSpendUsd: 5 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.output).toBe('kept working and finished');
    const secondRequest = adapter.calls[1];
    const toolResult = secondRequest?.messages
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .find((part) => part.type === 'tool-result');
    expect((toolResult as { result: { error: string } } | undefined)?.result.error).toContain(
      'keep working',
    );
  });

  it('exempt kinds pass the minSpend gate with countsAgainstLimit false', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCall: {
              name: 'escalate',
              args: {
                kind: 'blocked_with_evidence',
                scopeDelta: 'the upstream API returns 500 on every call',
                revisedEstimate: { usd: 1, turns: 2 },
              },
            },
          }
        : { text: 'unreachable' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      onEscalation: () => ({ kind: 'accept' }),
    });
    await expect(
      createCtx(internals).agent('go', { escalation: { minSpendUsd: 5 } }),
    ).rejects.toThrow(AgentCallError);
    await internals.replayer.flush();
    const decisionEntry = internals.replayer.snapshot().find((e) => e.kind === 'decision');
    expect(decisionEntry?.value).toMatchObject({ countsAgainstLimit: false });
  });
});

/** Report shape sanity for the exported types. */
describe('escalation type exports (M3-T07)', () => {
  it('isEscalated narrows to EscalatedResult', () => {
    const report: EscalationReport = {
      kind: 'scope_different',
      scopeDelta: 'x',
      revisedEstimate: { usd: 0, turns: 0 },
      blockers: [],
      proposedDecomposition: [],
      costToDate: { usd: 0, turns: 0 },
      salvage: { transcriptRef: 't', artifacts: [] },
    };
    const result: AgentResult<string> = {
      status: 'escalated',
      output: null,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: 0,
      turns: 1,
      servedBy: 'fake:model',
      transcriptRef: 't',
      escalation: report,
    };
    if (isEscalated(result)) {
      const narrowed: EscalatedResult<string> = result;
      expect(narrowed.escalation.kind).toBe('scope_different');
    } else {
      throw new Error('expected narrowing');
    }
  });
});
