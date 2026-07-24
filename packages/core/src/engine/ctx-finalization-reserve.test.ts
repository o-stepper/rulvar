/**
 * The guaranteed finalization turn (the experiment-review P1.1).
 * Reproduced on published 1.59.4: a tool batch crossing maxToolCalls
 * mid-batch dropped its tail SILENTLY (dangling tool calls without
 * results), the model never got a final summary turn, and the 'limit'
 * terminal named no limiter. The contract under
 * limits.finalizationReserve: the batch tail closes with typed
 * skipped-call error results naming the limiter, the model gets exactly
 * ONE summary turn with tools withheld, the summary becomes the limit
 * result's output (typed when a ridden schema parses), the terminal
 * error names the exact limiter with its counts, and the journaled
 * value replays. Without the reserve every byte stays as before.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Msg } from '../l0/messages.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import { validateUsageLimits } from '../runtime/usage-limits.js';
import { ConfigError } from '../l0/errors.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { progressReportTool } from '../tools/progress.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

const probe = (executed: string[]) =>
  tool({
    name: 'probe',
    description: 'reads one evidence source',
    parameters: z.strictObject({ target: z.string() }),
    execute: (input) => {
      executed.push(input.target);
      return Promise.resolve(`evidence from ${input.target}`);
    },
  });

/** Turn 0: one probe. Turn 1: a batch of four against a budget of two. */
const batchingAdapter = (finalText: string) =>
  scriptedAdapter((_req, call) => {
    if (call === 0) {
      return { toolCall: { name: 'probe', args: { target: 'a' } } };
    }
    if (call === 1) {
      return {
        toolCalls: [
          { name: 'probe', args: { target: 'b' } },
          { name: 'probe', args: { target: 'c' } },
          { name: 'probe', args: { target: 'd' } },
          { name: 'probe', args: { target: 'e' } },
        ],
      };
    }
    return { text: finalText };
  });

const transcriptMessages = async (
  transcripts: InMemoryTranscriptStore,
  ref: string,
): Promise<Msg[]> => {
  const blob = await transcripts.get(ref);
  expect(blob).not.toBeNull();
  const decoded = JSON.parse(new TextDecoder().decode(blob ?? new Uint8Array())) as {
    messages: Msg[];
  };
  return decoded.messages;
};

const danglingToolCalls = (messages: Msg[]): number => {
  const calls: string[] = [];
  const results: string[] = [];
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-call') {
        calls.push(part.id);
      }
      if (part.type === 'tool-result') {
        results.push(part.id);
      }
    }
  }
  return calls.filter((id) => !results.includes(id)).length;
};

describe('the finalization reserve (P1.1)', () => {
  it('without the reserve the published bytes stand: silent tail, no summary turn', async () => {
    const executed: string[] = [];
    const adapter = batchingAdapter('never reached');
    const transcripts = new InMemoryTranscriptStore();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        limits: { maxTurns: 8, maxToolCalls: 3 },
        tools: [probe(executed)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.output).toBeNull();
    expect(result.errorMessage).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(executed).toEqual(['a', 'b', 'c']);
    // No summary turn: the adapter served exactly the two tool turns.
    expect(adapter.calls).toHaveLength(2);
    const messages = await transcriptMessages(transcripts, result.transcriptRef);
    expect(danglingToolCalls(messages)).toBe(2);
  });

  it('the reserve closes the tail with typed skip markers and grants one summary turn', async () => {
    const executed: string[] = [];
    const adapter = batchingAdapter('FINAL REPORT: three sources read');
    const transcripts = new InMemoryTranscriptStore();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        limits: { maxTurns: 8, maxToolCalls: 3, finalizationReserve: {} },
        tools: [probe(executed)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(executed).toEqual(['a', 'b', 'c']);
    // The summary turn happened and its text is the limit result's output.
    expect(adapter.calls).toHaveLength(3);
    expect(result.output).toBe('FINAL REPORT: three sources read');
    // Three tool turns plus the reserve turn.
    expect(result.turns).toBe(3);
    // The terminal names the exact limiter and the skipped count.
    expect(result.errorMessage).toBe(
      'tool budget exhausted: maxToolCalls (3/3); skipped tool calls: 2',
    );
    expect(result.error).toEqual({ kind: 'terminal', retryable: false });
    // The transcript is closed: the skipped calls carry typed markers.
    const messages = await transcriptMessages(transcripts, result.transcriptRef);
    expect(danglingToolCalls(messages)).toBe(0);
    const markers = messages
      .flatMap((msg) => msg.parts)
      .filter(
        (part) =>
          part.type === 'tool-result' &&
          (part.result as { skipped?: boolean } | undefined)?.skipped === true,
      );
    expect(markers).toHaveLength(2);
    for (const marker of markers) {
      expect((marker as { isError?: boolean }).isError).toBe(true);
      expect(marker.type === 'tool-result' ? marker.result : undefined).toEqual({
        error: 'skipped: the tool budget is exhausted; the call was not executed',
        limiter: 'maxToolCalls',
        skipped: true,
      });
    }
    // The reserve request withheld tools and carried the instruction.
    const reserveReq = adapter.calls[2];
    expect(reserveReq?.toolChoice).toBe('none');
    const lastUser = [...(reserveReq?.messages ?? [])].reverse().find((msg) => msg.role === 'user');
    const instruction = (lastUser?.parts ?? [])
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n');
    expect(instruction).toContain('The tool budget is exhausted (maxToolCalls (3/3)).');
    expect(instruction).toContain('Skipped tool calls: 2');
    // Request-only: the durable transcript never carries the instruction.
    const durableTexts = messages
      .flatMap((msg) => msg.parts)
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text);
    expect(durableTexts.some((text) => text.includes('This is the final turn'))).toBe(false);
  });

  it('the toolUnits limiter is named on the marker and the terminal', async () => {
    const executed: string[] = [];
    const adapter = batchingAdapter('units summary');
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        limits: {
          maxTurns: 8,
          toolUnits: { max: 3 },
          finalizationReserve: {},
        },
        tools: [probe(executed)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(executed).toEqual(['a', 'b', 'c']);
    expect(result.output).toBe('units summary');
    expect(result.errorMessage).toBe(
      'tool budget exhausted: toolUnits (3/3); skipped tool calls: 2',
    );
    expect(result.exploration?.toolUnitsUsed).toBe(3);
  });

  it('a cap of zero skips the whole batch and still grants the summary', async () => {
    const executed: string[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'probe', args: { target: 'a' } },
              { name: 'probe', args: { target: 'b' } },
            ],
          }
        : { text: 'nothing was allowed to run' },
    );
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        limits: { maxTurns: 8, maxToolCalls: 0, finalizationReserve: {} },
        tools: [probe(executed)],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(executed).toEqual([]);
    expect(result.output).toBe('nothing was allowed to run');
    expect(result.errorMessage).toBe(
      'tool budget exhausted: maxToolCalls (0/0); skipped tool calls: 2',
    );
  });

  it('finalizationReserve.maxOutputTokens bounds the summary request only', async () => {
    const adapter = batchingAdapter('bounded summary');
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        limits: {
          maxTurns: 8,
          maxToolCalls: 3,
          finalizationReserve: { maxOutputTokens: 7 },
        },
        tools: [probe([])],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.output).toBe('bounded summary');
    expect(adapter.calls[0]?.maxOutputTokens).toBeUndefined();
    expect(adapter.calls[1]?.maxOutputTokens).toBeUndefined();
    expect(adapter.calls[2]?.maxOutputTokens).toBe(7);
  });

  it('a ridden schema validates the summary into TYPED output at the limit', async () => {
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return {
          toolCalls: [
            { name: 'probe', args: { target: 'a' } },
            { name: 'probe', args: { target: 'b' } },
          ],
        };
      }
      return { text: '{"verdict":"partial","sources":1}' };
    });
    // extract resolves to the LOOP model, so the schema rides (no
    // separate extract) and the reserve summary can parse into typed
    // output.
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        // strict: the ride tier stays native; a loose object would route a
        // separate extract phase (the RV-207 forced-tool rule) where the
        // reserve leaves output to the transcript.
        schema: z.strictObject({ verdict: z.string(), sources: z.number() }),
        limits: { maxTurns: 8, maxToolCalls: 1, finalizationReserve: {} },
        tools: [probe([])],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.output).toEqual({ verdict: 'partial', sources: 1 });
  });

  it('an invalid schema summary keeps output null with no re-prompt', async () => {
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return {
          toolCalls: [
            { name: 'probe', args: { target: 'a' } },
            { name: 'probe', args: { target: 'b' } },
          ],
        };
      }
      return { text: 'not json at all' };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        schema: z.strictObject({ verdict: z.string() }),
        limits: { maxTurns: 8, maxToolCalls: 1, finalizationReserve: {} },
        tools: [probe([])],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.output).toBeNull();
    // One bounded attempt: the tool turn plus the single reserve turn.
    expect(adapter.calls).toHaveLength(2);
  });

  it('a failed reserve dispatch keeps the earned limit terminal', async () => {
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return {
          toolCalls: [
            { name: 'probe', args: { target: 'a' } },
            { name: 'probe', args: { target: 'b' } },
          ],
        };
      }
      return {
        error: { code: 'server', message: 'boom', retryable: false, data: { kind: 'transport' } },
      };
    });
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('audit', {
        limits: { maxTurns: 8, maxToolCalls: 1, finalizationReserve: {} },
        tools: [probe([])],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.output).toBeNull();
    expect(result.errorMessage).toBe(
      'tool budget exhausted: maxToolCalls (1/1); skipped tool calls: 1',
    );
    const warned = events
      .ofType('log')
      .some(
        (event) =>
          typeof event.msg === 'string' &&
          event.msg.includes('the finalization reserve turn failed'),
      );
    expect(warned).toBe(true);
  });

  it('the progress partial and the reserve summary coexist on one limit terminal', async () => {
    const REPORT = { facts: ['fact one'], evidence: ['probe:a'], questions: [] };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return { toolCall: { name: 'report_progress', args: REPORT } };
      }
      if (call === 1) {
        return {
          toolCalls: [
            { name: 'probe', args: { target: 'a' } },
            { name: 'probe', args: { target: 'b' } },
          ],
        };
      }
      return { text: 'the final word' };
    });
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const result = fullResult(
      await createCtx(internals).agent('collect', {
        limits: { maxTurns: 8, maxToolCalls: 2, finalizationReserve: {} },
        tools: [progressReportTool(), probe([])],
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.output).toBe('the final word');
    expect(result.partial).toEqual({ ...REPORT });
  });

  it('the journaled value replays: same output, zero live calls, same turns', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const liveAdapter = batchingAdapter('replayable summary');
    const { internals, store } = makeInternals({
      adapters: [liveAdapter],
      routing: { loop: 'fake:model' },
      transcripts,
    });
    const opts = {
      limits: { maxTurns: 8, maxToolCalls: 3, finalizationReserve: {} },
      memoizeOutcome: true,
      result: 'full',
    } as const;
    const live = fullResult(
      await createCtx(internals).agent('audit', { ...opts, tools: [probe([])] }),
    );
    expect(live.status).toBe('limit');
    expect(live.output).toBe('replayable summary');
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = batchingAdapter('replayable summary');
    const replayExecuted: string[] = [];
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      transcripts,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('audit', { ...opts, tools: [probe(replayExecuted)] }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayExecuted).toHaveLength(0);
    expect(replayed.status).toBe('limit');
    expect(replayed.output).toBe('replayable summary');
    expect(replayed.errorMessage).toBe(live.errorMessage);
    expect(replayed.turns).toBe(live.turns);
  });

  it('validateUsageLimits gates the reserve shape at intake', () => {
    expect(() =>
      validateUsageLimits(
        { finalizationReserve: [] as unknown as { maxOutputTokens?: number } },
        'RunOptions.limits',
      ),
    ).toThrow(ConfigError);
    expect(() =>
      validateUsageLimits({ finalizationReserve: { maxOutputTokens: 0 } }, 'RunOptions.limits'),
    ).toThrow(ConfigError);
    expect(() =>
      validateUsageLimits({ finalizationReserve: { maxOutputTokens: 2.5 } }, 'RunOptions.limits'),
    ).toThrow(/finalizationReserve.maxOutputTokens/);
    expect(() =>
      validateUsageLimits({ finalizationReserve: {} }, 'RunOptions.limits'),
    ).not.toThrow();
  });
});
