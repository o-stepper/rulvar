/**
 * The output-truncated abort class (v1.9.0 follow-up review): a
 * schema-less turn that ends at its output token allowance (finish
 * reason 'max-tokens') without visible output settles 'limit' with
 * abortClass 'output-truncated' and memoizes like no-progress, never ok
 * ''. Non-empty partial text keeps settling ok, and a routed finalize
 * invocation owns the check because its synthesis, not the loop turn,
 * is the schema-less answer.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import type { ResolvedInvocation } from '../model/router.js';
import { runAgent, type AgentResult } from '../runtime/agent-loop.js';
import { mergeUsageLimits } from '../runtime/usage-limits.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { createCtx, defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

/** A model whose whole allowance went to reasoning: no visible output. */
function truncatedTurn(): ScriptedTurn {
  return {
    text: '',
    finish: 'max-tokens',
    usage: { inputTokens: 40, outputTokens: 1_600, cacheReadTokens: 0, cacheWriteTokens: 0 },
  };
}

const loopResolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

const finalizeResolved: ResolvedInvocation = {
  ref: 'strong:big',
  adapterId: 'strong',
  model: 'big',
  canonical: { kind: 'model', model: 'strong:big' },
  scrubs: [],
};

describe('output-truncated abort class (v1.9.0 follow-up review)', () => {
  it('an empty max-tokens turn settles limit with the typed abort, never ok with an empty value', async () => {
    const adapter = scriptedAdapter(truncatedTurn);
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('write the workflow script', {
        limits: { maxOutputTokensPerTurn: 1_600 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('output-truncated');
    expect(result.error?.kind).toBe('terminal');
    expect(result.errorMessage).toContain('output token allowance');
    expect(result.errorMessage).toContain('https://docs.rulvar.com/guide/agents#output-truncation');
    // Exactly one provider call, dispatched at the requested cap.
    expect(adapter.calls).toHaveLength(1);
    expect(adapter.calls[0]?.maxOutputTokens).toBe(1_600);

    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((e) => e.kind === 'agent' && e.status === 'limit');
    // The engine stamp: paid work replays on every resume.
    expect(terminal?.memoizeOutcome).toBe(true);
    expect(terminal?.error?.data).toMatchObject({ abortClass: 'output-truncated' });
  });

  it('replays without live calls on resume, regardless of user memoize policy', async () => {
    const adapter = scriptedAdapter(truncatedTurn);
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const live = fullResult(
      await createCtx(internals).agent('write the workflow script', {
        memoizeOutcome: false,
        result: 'full',
      }),
    );
    expect(live.abortClass).toBe('output-truncated');
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = scriptedAdapter(truncatedTurn);
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('write the workflow script', {
        memoizeOutcome: false,
        result: 'full',
      }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayed.status).toBe('limit');
    expect(replayed.abortClass).toBe('output-truncated');
    expect(replayed.errorMessage).toContain('output token allowance');
  });

  it('non-empty partial max-tokens text keeps settling ok', async () => {
    const adapter = scriptedAdapter(() => ({
      text: 'partial but useful text',
      finish: 'max-tokens',
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(await createCtx(internals).agent('summarize', { result: 'full' }));
    expect(result.status).toBe('ok');
    expect(result.output).toBe('partial but useful text');
    expect(result.abortClass).toBeUndefined();
  });

  it('whitespace-only visible text counts as empty', async () => {
    const adapter = scriptedAdapter(() => ({ text: ' \n\t ', finish: 'max-tokens' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(await createCtx(internals).agent('draft it', { result: 'full' }));
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('output-truncated');
  });

  it('an empty max-tokens loop turn defers to a routed finalize, whose synthesis is the answer', async () => {
    const loopAdapter = scriptedAdapter(truncatedTurn);
    const finalizeAdapter = scriptedAdapter(() => ({ text: 'synthesized answer' }), {
      id: 'strong',
    });
    const result = await runAgent({
      prompt: 'research and summarize',
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      finalize: { adapter: finalizeAdapter, resolved: finalizeResolved },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('synthesized answer');
    expect(finalizeAdapter.calls).toHaveLength(1);
  });

  it('an empty max-tokens finalize synthesis is the same typed abort', async () => {
    const loopAdapter = scriptedAdapter(() => ({ text: 'raw notes' }));
    const finalizeAdapter = scriptedAdapter(truncatedTurn, { id: 'strong' });
    const result = await runAgent({
      prompt: 'research and summarize',
      adapter: loopAdapter,
      resolved: loopResolved,
      limits: mergeUsageLimits(),
      finalize: { adapter: finalizeAdapter, resolved: finalizeResolved },
    });
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('output-truncated');
    expect(result.error?.kind).toBe('terminal');
    expect(result.errorMessage).toContain('finalize invocation');
  });

  it('a workflow never settles ok on the truncation; resume is provider-free and byte-identical', async () => {
    const wf = defineWorkflow({ name: 'planner-like' }, async (ctx) => {
      return await ctx.agent('draft the script', { onError: 'throw' });
    });
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-truncated-'));
    tempDirs.push(dir);
    const store = new JsonlFileStore({ dir });

    const first = createEngine({
      adapters: [scriptedAdapter(truncatedTurn)],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' }, limits: { maxOutputTokensPerTurn: 1_600 } },
    });
    const outcome = await first.run(wf, undefined, { runId: 'TRUNC1' }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.value).toBeUndefined();
    expect(outcome.error?.message).toContain('output token allowance');
    expect(outcome.error?.data).toMatchObject({
      kind: 'terminal',
      abortClass: 'output-truncated',
    });
    const before = await store.load('TRUNC1');

    const resumeAdapter = scriptedAdapter(() => ({ text: 'MUST NOT RUN' }));
    const second = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' }, limits: { maxOutputTokensPerTurn: 1_600 } },
    });
    const handle = second.resume('TRUNC1', wf);
    const resumed = await handle.result;
    expect(resumed.status).toBe('error');
    expect(resumed.error?.data).toMatchObject({ abortClass: 'output-truncated' });
    expect(resumeAdapter.calls).toHaveLength(0);
    const preview = await handle.preview;
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
    // The clean resume of the settled truncation appends nothing.
    expect(await store.load('TRUNC1')).toEqual(before);
  });
});
