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

  it('prices only exact names and dated snapshots, never other suffixes (RV3303)', () => {
    // The 2026-08-12 comparison run's counterexample: under the old
    // prefix matcher a preview suffix of a known name inherited the
    // known row, promotional pricing included, while this table's own
    // contract says pricing stays ABSENT for an unknown model. The
    // openai grammar (v1.17.0 review P1-1) already refuses this class.
    const preview = anthropicModelInfo('claude-sonnet-5-preview');
    expect(preview.caps.pricing).toBeUndefined();
    expect(preview.caps.contextWindow).toBe(400_000);
    // A dated snapshot of a name the table does NOT carry is a sibling,
    // not a snapshot: it must not land on the shorter known base.
    const sibling = anthropicModelInfo('claude-sonnet-5-mini-20270101');
    expect(sibling.caps.pricing).toBeUndefined();
    // The documented grammar keeps resolving: exact base plus YYYYMMDD.
    const dated = anthropicModelInfo('claude-sonnet-5-20270101');
    expect(dated.caps.pricing).toBeDefined();
    expect(dated.caps.pricing).toEqual(anthropicModelInfo('claude-sonnet-5').caps.pricing);
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

describe('refreshCaps pagination bounds (RV2904)', () => {
  // The ninth comparison run's adversarial audit found models.list the
  // one pagination in the tree the MCP cycle doctrine (RV1602/RV1808)
  // had not reached: a server echoing or recycling last_id spun the
  // sweep forever, comfortably inside every timeout.
  const noMessages = {
    create: (): Promise<unknown> => Promise.reject(new Error('not a messages test')),
    countTokens: (): Promise<{ input_tokens: number }> => Promise.resolve({ input_tokens: 0 }),
  };
  const pagedClient = (
    pages: Array<{ data?: unknown[]; has_more?: boolean; last_id?: string }>,
    calls: Array<string | undefined> = [],
  ): AnthropicClientLike =>
    ({
      messages: noMessages,
      models: {
        list: (params?: { after_id?: string }): Promise<unknown> => {
          calls.push(params?.after_id);
          const page = pages[Math.min(calls.length - 1, pages.length - 1)];
          return Promise.resolve({ data: [], has_more: false, ...page });
        },
      },
    }) as unknown as AnthropicClientLike;

  it('refuses a cursor echoed back, unconditionally', async () => {
    const adapter = anthropic({ client: pagedClient([{ has_more: true, last_id: 'A' }]) });
    await expect(adapter.refreshCaps?.()).rejects.toThrow(
      /returned the cursor it was queried with \('A'\)/,
    );
  });

  it('refuses a revisited cursor however long the period', async () => {
    const adapter = anthropic({
      client: pagedClient([
        { has_more: true, last_id: 'A' },
        { has_more: true, last_id: 'B' },
        { has_more: true, last_id: 'A' },
      ]),
    });
    await expect(adapter.refreshCaps?.()).rejects.toThrow(/already visited \('A'\)/);
  });

  it('fails closed past the declared capsMaxPages instead of truncating', async () => {
    const endless = Array.from({ length: 8 }, (_, index) => ({
      has_more: true,
      last_id: `c${String(index + 1)}`,
    }));
    const adapter = anthropic({ client: pagedClient(endless), capsMaxPages: 3 });
    await expect(adapter.refreshCaps?.()).rejects.toThrow(/over the declared capsMaxPages 3/);
  });

  it('a finite sweep inside the cap merges every page', async () => {
    const calls: Array<string | undefined> = [];
    const adapter = anthropic({
      client: pagedClient(
        [
          {
            data: [{ id: 'claude-sonnet-5', max_input_tokens: 900_000, max_tokens: 90_000 }],
            has_more: true,
            last_id: 'p1',
          },
          {
            data: [{ id: 'claude-opus-5', max_input_tokens: 800_000, max_tokens: 64_000 }],
            has_more: false,
          },
        ],
        calls,
      ),
      capsMaxPages: 2,
    });
    await adapter.refreshCaps?.();
    expect(calls).toEqual([undefined, 'p1']);
    expect(adapter.caps('claude-sonnet-5').maxOutputTokens).toBe(90_000);
    expect(adapter.caps('claude-opus-5').maxOutputTokens).toBe(64_000);
  });

  it('refuses a non-positive capsMaxPages at construction, fail closed', () => {
    expect(() => anthropic({ client: pagedClient([]), capsMaxPages: 0 })).toThrow(
      /capsMaxPages must be a positive integer/,
    );
    expect(() => anthropic({ client: pagedClient([]), capsMaxPages: 1.5 })).toThrow(
      /capsMaxPages must be a positive integer/,
    );
  });
});

describe('describeRegulatedPosture (RV4204)', () => {
  const mockClient: AnthropicClientLike = {
    messages: {
      create: () => Promise.reject(new Error('unused')),
      countTokens: () => Promise.resolve({ input_tokens: 0 }),
    },
    models: { list: () => Promise.resolve({ data: [] }) },
  };

  it('attests the official transport and the caps bound', () => {
    expect(anthropic({ apiKey: 'k', capsMaxPages: 4 }).describeRegulatedPosture?.()).toEqual({
      regulatedPosture: 1,
      kind: 'model-adapter',
      name: 'anthropic',
      transport: 'official',
      capsBound: { declared: true, maxPages: 4 },
    });
    expect(anthropic({ apiKey: 'k' }).describeRegulatedPosture?.()).toMatchObject({
      transport: 'official',
      capsBound: { declared: false },
    });
  });

  it('a declared base URL attests as a pinned egress origin', () => {
    expect(
      anthropic({
        apiKey: 'k',
        baseURL: 'https://proxy.corp.example:8443/v1/anthropic',
      }).describeRegulatedPosture?.(),
    ).toMatchObject({
      transport: 'custom-base-url',
      baseUrlOrigin: 'https://proxy.corp.example:8443',
    });
  });

  it('a preconstructed client attests honestly as one', () => {
    expect(anthropic({ client: mockClient }).describeRegulatedPosture?.()).toMatchObject({
      transport: 'preconstructed-client',
    });
  });
});
