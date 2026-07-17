/**
 * Capability-table integrity (the v1.16.1 review P2): five seed rows had
 * gone stale against the provider (Opus 4.8, Sonnet 5, and the review
 * missed Opus 4.7 / Opus 4.6 / Sonnet 4.6), so default routing,
 * compaction thresholds, and the wire max_tokens clamp under-provisioned
 * every run that never called refreshCaps. The committed
 * caps-snapshot.json pins the verified figures: the offline test here
 * fails when src/caps.ts and the snapshot disagree (a caps change is a
 * conscious two-file review), and the live audit compares the snapshot
 * against GET /v1/models so provider-side drift pages the weekly
 * contract workflow instead of rotting silently.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest } from '@rulvar/core';
import { liveTestEnabled } from '@rulvar/testing';
import type { AnthropicClientLike } from './adapter.js';
import { anthropic } from './adapter.js';
import { ANTHROPIC_MODELS, anthropicModelInfo } from './caps.js';
import type { AnthropicStreamEvent } from './wire.js';

interface CapsSnapshot {
  verifiedAt: string;
  sources: string[];
  models: Record<string, { contextWindow: number; maxOutputTokens: number }>;
}

const snapshot = JSON.parse(
  readFileSync(new URL('../caps-snapshot.json', import.meta.url), 'utf8'),
) as CapsSnapshot;

async function* turn(events: AnthropicStreamEvent[]): AsyncIterable<AnthropicStreamEvent> {
  for (const event of events) {
    yield await Promise.resolve(event);
  }
}

const FULL_TURN: AnthropicStreamEvent[] = [
  { type: 'message_start', message: { id: 'm1', usage: { input_tokens: 3 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'ok' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } },
  { type: 'message_stop' },
];

const REQ: ChatRequest = {
  model: 'claude-sonnet-5',
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
};

describe('caps snapshot (v1.16.1 review P2)', () => {
  it('matches the committed verified snapshot row for row', () => {
    const tableIds = Object.keys(ANTHROPIC_MODELS).sort();
    expect(Object.keys(snapshot.models).sort()).toEqual(tableIds);
    for (const [id, row] of Object.entries(snapshot.models)) {
      const caps = ANTHROPIC_MODELS[id]?.caps;
      expect(caps?.contextWindow, `${id} contextWindow`).toBe(row.contextWindow);
      expect(caps?.maxOutputTokens, `${id} maxOutputTokens`).toBe(row.maxOutputTokens);
    }
    expect(snapshot.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snapshot.sources.length).toBeGreaterThan(0);
  });

  it('resolves dated snapshots of the corrected rows to 1M / 128k', () => {
    for (const id of [
      'claude-opus-4-8',
      'claude-opus-4-7',
      'claude-opus-4-6',
      'claude-sonnet-5',
      'claude-sonnet-4-6',
    ]) {
      for (const variant of [id, `${id}-20270101`]) {
        const info = anthropicModelInfo(variant);
        expect(info.caps.contextWindow, variant).toBe(1_000_000);
        expect(info.caps.maxOutputTokens, variant).toBe(128_000);
      }
    }
    // The conservative unknown-model fallback stays put: only rows the
    // table actually names get the verified figures.
    expect(anthropicModelInfo('claude-nova-9').caps.contextWindow).toBe(400_000);
  });

  it('keeps the seed table and pricing intact when refreshCaps fails', async () => {
    const client: AnthropicClientLike = {
      messages: {
        create: () => Promise.reject(new Error('unused')),
        countTokens: () => Promise.resolve({ input_tokens: 0 }),
      },
      models: { list: () => Promise.reject(new Error('models endpoint down')) },
    };
    const adapter = anthropic({ client });
    await expect(adapter.refreshCaps?.()).rejects.toThrow('models endpoint down');
    const caps = adapter.caps('claude-sonnet-5');
    expect(caps.contextWindow).toBe(1_000_000);
    expect(caps.maxOutputTokens).toBe(128_000);
    expect(caps.pricing?.inputUsdPerMTok).toBe(2);
    expect(caps.pricing?.outputUsdPerMTok).toBe(10);
  });

  it('feeds refreshed output caps into the wire max_tokens clamp', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client: AnthropicClientLike = {
      messages: {
        create(params: Record<string, unknown>): Promise<unknown> {
          calls.push(params);
          return Promise.resolve(turn(FULL_TURN));
        },
        countTokens: () => Promise.resolve({ input_tokens: 0 }),
      },
      models: {
        list: () =>
          Promise.resolve({
            data: [{ id: 'claude-sonnet-5', max_input_tokens: 1_000_000, max_tokens: 96_000 }],
            has_more: false,
          }),
      },
    };
    const adapter = anthropic({ client });
    const drainStream = async (): Promise<void> => {
      const events: ChatEvent[] = [];
      for await (const event of adapter.stream(REQ)) {
        events.push(event);
      }
      expect(events.at(-1)?.type).toBe('finish');
    };
    // Before refresh the seed cap is the clamp; after refresh the live
    // figure is, which is what admission and compaction consume through
    // caps() as well.
    await drainStream();
    expect(calls[0]?.max_tokens).toBe(128_000);
    await adapter.refreshCaps?.();
    expect(adapter.caps('claude-sonnet-5').maxOutputTokens).toBe(96_000);
    await drainStream();
    expect(calls[1]?.max_tokens).toBe(96_000);
  });

  it.skipIf(!liveTestEnabled('ANTHROPIC_API_KEY'))(
    'live caps audit: the snapshot matches GET /v1/models (opt-in via RULVAR_LIVE_TESTS=1)',
    async () => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ maxRetries: 0 });
      const live = new Map<string, Record<string, unknown>>();
      for await (const model of client.models.list()) {
        live.set(model.id, model as unknown as Record<string, unknown>);
      }
      for (const [id, row] of Object.entries(snapshot.models)) {
        const matches = [...live.entries()].filter(
          ([liveId]) => liveId === id || liveId.startsWith(`${id}-`),
        );
        expect(matches.length, `no live model matches ${id}`).toBeGreaterThan(0);
        for (const [liveId, model] of matches) {
          expect(model.max_input_tokens, `${liveId} max_input_tokens`).toBe(row.contextWindow);
          expect(model.max_tokens, `${liveId} max_tokens`).toBe(row.maxOutputTokens);
        }
      }
    },
    30_000,
  );
});
