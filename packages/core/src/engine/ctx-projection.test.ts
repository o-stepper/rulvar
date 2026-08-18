/**
 * Per-role provider mixing inside one agent (M4-T02 acceptance): the loop
 * runs on one provider while extract and finalize run on another, and
 * each sees a valid wire history: retained provider-raw blocks ride only
 * to their own provider, everything else passes through unchanged
 * (M4-T02).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ChatRequest } from '../l0/messages.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const clock = tool({
  name: 'clock',
  description: 'tells the time',
  parameters: {},
  execute: () => Promise.resolve('12:00'),
});

const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });

const thinkingBlock = { type: 'thinking', thinking: 'let me check', signature: 'sig-abc' };

function rawProviders(req: ChatRequest | undefined): string[] {
  return (req?.messages ?? []).flatMap((m) =>
    m.parts.filter((p) => p.type === 'provider-raw').map((p) => p.provider),
  );
}

describe('mixed-provider agent (M4-T02 acceptance)', () => {
  it('retains thinking blocks to the loop provider and projects them away from extract', async () => {
    // The loop provider ships a retention payload with its tool turn.
    const anth = scriptedAdapter(
      (_req, call) =>
        call === 0
          ? {
              toolCall: { name: 'clock', args: {} },
              providerMetadata: { anth: { retainedParts: [thinkingBlock] } },
            }
          : { text: 'the verdict is pass' },
      { id: 'anth', provider: 'anthropic' },
    );
    const oai = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }), {
      id: 'oai',
      provider: 'openai',
    });
    const { internals } = makeInternals({
      adapters: [anth, oai],
      routing: { loop: 'anth:model-a', extract: 'oai:model-b' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('judge the time', {
      tools: [clock],
      schema: verdictSchema,
    });
    expect(result).toEqual({ verdict: 'pass' });

    // The loop's second request echoes the retained block to its own
    // provider, at the head of the assistant turn.
    expect(anth.calls).toHaveLength(2);
    const echoed = anth.calls[1];
    expect(rawProviders(echoed)).toEqual(['anthropic']);
    const assistantTurn = echoed?.messages.find((m) => m.role === 'assistant');
    expect(assistantTurn?.parts[0]).toEqual({
      type: 'provider-raw',
      provider: 'anthropic',
      block: thinkingBlock,
    });
    // Tool-call and tool-result pairing survived projection untouched.
    const callPart = assistantTurn?.parts.find((p) => p.type === 'tool-call');
    const resultPart = echoed?.messages
      .flatMap((m) => m.parts)
      .find((p) => p.type === 'tool-result');
    expect(callPart?.type === 'tool-call' && resultPart?.type === 'tool-result').toBe(true);
    expect(callPart && 'id' in callPart ? callPart.id : undefined).toBe(
      resultPart && 'id' in resultPart ? resultPart.id : undefined,
    );

    // The extract invocation on the OTHER provider sees the same
    // transcript WITHOUT the foreign raw block.
    expect(oai.calls).toHaveLength(1);
    expect(rawProviders(oai.calls[0])).toEqual([]);
    const extractAssistant = oai.calls[0]?.messages.find((m) => m.role === 'assistant');
    expect(extractAssistant?.parts.map((p) => p.type)).toEqual(['tool-call']);
  });

  it('finalize on another provider also sees a projected history; same-family adapters share it', async () => {
    const anth = scriptedAdapter(
      (_req, call) =>
        call === 0
          ? {
              toolCall: { name: 'clock', args: {} },
              providerMetadata: { anth: { retainedParts: [thinkingBlock] } },
            }
          : { text: 'raw notes' },
      { id: 'anth', provider: 'anthropic' },
    );
    // A second adapter of the SAME family (custom id): retained blocks
    // must ride to it (family granularity).
    const anthEu = scriptedAdapter(() => ({ text: 'synthesis from the same family' }), {
      id: 'anth-eu',
      provider: 'anthropic',
    });
    const { internals } = makeInternals({
      adapters: [anth, anthEu],
      routing: { loop: 'anth:model-a' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('research the time', {
      tools: [clock],
      routing: { finalize: 'anth-eu:model-b' },
    });
    expect(result).toBe('synthesis from the same family');
    expect(anthEu.calls).toHaveLength(1);
    expect(rawProviders(anthEu.calls[0])).toEqual(['anthropic']);
  });
});

describe('the retention scope key (RV4007)', () => {
  it('two accounts of one family stop sharing provider-raw blocks', async () => {
    const anthProd = scriptedAdapter(
      (_req, call) =>
        call === 0
          ? {
              toolCall: { name: 'clock', args: {} },
              providerMetadata: { 'anth-prod': { retainedParts: [thinkingBlock] } },
            }
          : { text: 'raw notes' },
      { id: 'anth-prod', provider: 'anthropic', scopeKey: 'acct-prod' },
    );
    const anthStaging = scriptedAdapter(() => ({ text: 'synthesis from the other account' }), {
      id: 'anth-staging',
      provider: 'anthropic',
      scopeKey: 'acct-staging',
    });
    const { internals } = makeInternals({
      adapters: [anthProd, anthStaging],
      routing: { loop: 'anth-prod:model-a' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('research the time', {
      tools: [clock],
      routing: { finalize: 'anth-staging:model-b' },
    });
    expect(result).toBe('synthesis from the other account');
    // The prod account's own second turn still echoes its block.
    expect(anthProd.calls).toHaveLength(2);
    expect(rawProviders(anthProd.calls[1])).toEqual(['anthropic#acct-prod']);
    // The staging account of the SAME family sees none of it: cache
    // handles and thinking blocks minted under one account are not
    // portable to another.
    expect(anthStaging.calls).toHaveLength(1);
    expect(rawProviders(anthStaging.calls[0])).toEqual([]);
  });

  it('one declared scopeKey beside an undeclared same-family adapter also separates', async () => {
    const anth = scriptedAdapter(
      (_req, call) =>
        call === 0
          ? {
              toolCall: { name: 'clock', args: {} },
              providerMetadata: { anth: { retainedParts: [thinkingBlock] } },
            }
          : { text: 'raw notes' },
      { id: 'anth', provider: 'anthropic' },
    );
    const anthScoped = scriptedAdapter(() => ({ text: 'scoped account synthesis' }), {
      id: 'anth-scoped',
      provider: 'anthropic',
      scopeKey: 'acct-b',
    });
    const { internals } = makeInternals({
      adapters: [anth, anthScoped],
      routing: { loop: 'anth:model-a' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('research the time', {
      tools: [clock],
      routing: { finalize: 'anth-scoped:model-b' },
    });
    expect(result).toBe('scoped account synthesis');
    expect(rawProviders(anthScoped.calls[0])).toEqual([]);
  });
});
