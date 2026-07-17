/**
 * Production auth surface (v1.14 review P2-2): the official SDK client
 * injects without casts under strict TypeScript, sdkOptions forwards
 * workload-identity federation with maxRetries forced to 0, conflicting
 * auth modes fail typed before any network I/O, and a synthetic WIF run
 * performs exactly one token exchange plus one Responses API request
 * carrying the short-lived bearer, reaching a canonical finish. The
 * fake fetch only ever compares the Authorization header against the
 * test's own synthetic sentinel; nothing credential-shaped is printed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import OpenAI from 'openai';
import { ConfigError, type ChatEvent, type ChatRequest } from '@rulvar/core';
import { openai } from './adapter.js';

const helloReq = (): ChatRequest => ({
  model: 'gpt-5.4-mini',
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
  maxOutputTokens: 16,
});

const RESPONSES_SSE = [
  'event: response.output_text.delta',
  'data: {"type":"response.output_text.delta","delta":"ok"}',
  '',
  'event: response.completed',
  'data: {"type":"response.completed","response":{"id":"resp_synthetic","usage":{"input_tokens":3,"output_tokens":2},"output":[]}}',
  '',
  '',
].join('\n');

async function drain(stream: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe('openai() production auth surface', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a preconstructed official client without casts (strict TS)', () => {
    const client = new OpenAI({ apiKey: 'sentinel-key', maxRetries: 0 });
    const adapter = openai({ client });
    expect(adapter.id).toBe('openai');
  });

  it('rejects an injected official client whose SDK autoretries are enabled', () => {
    // The SDK default is maxRetries 2; under the core's RetryPolicy that
    // would double-retry.
    const client = new OpenAI({ apiKey: 'sentinel-key' });
    expect(() => openai({ client })).toThrow(ConfigError);
    expect(() => openai({ client })).toThrow(/maxRetries 2/);
  });

  it('rejects client combined with construction options, typed and before I/O', () => {
    const client = new OpenAI({ apiKey: 'sentinel-key', maxRetries: 0 });
    expect(() => openai({ client, apiKey: 'sentinel-key' })).toThrow(ConfigError);
    expect(() => openai({ client, sdkOptions: {} })).toThrow(ConfigError);
  });

  it('rejects conflicting auth modes and duplicated fields, typed and before I/O', () => {
    vi.stubEnv('OPENAI_API_KEY', undefined);
    const workloadIdentity = {
      identityProviderId: 'idp_synthetic',
      serviceAccountId: 'sa_synthetic',
      provider: { tokenType: 'jwt' as const, getToken: () => Promise.resolve('synthetic-jwt') },
    };
    expect(() => openai({ apiKey: 'sentinel-key', sdkOptions: { workloadIdentity } })).toThrow(
      ConfigError,
    );
    expect(() =>
      openai({ apiKey: 'sentinel-key', sdkOptions: { apiKey: 'sentinel-key' } }),
    ).toThrow(ConfigError);
    expect(() =>
      openai({ baseURL: 'http://127.0.0.1:1', sdkOptions: { baseURL: 'http://127.0.0.1:1' } }),
    ).toThrow(ConfigError);
    // Inside sdkOptions the SDK's own mutual exclusion applies, still
    // typed and still before any network I/O.
    expect(() => openai({ sdkOptions: { apiKey: 'sentinel-key', workloadIdentity } })).toThrow(
      /mutually exclusive/,
    );
  });

  it('runs workload identity: one token exchange, one bearer API call, canonical finish', async () => {
    vi.stubEnv('OPENAI_API_KEY', undefined);
    let exchanges = 0;
    let apiCalls = 0;
    let bearerMatchesExchange = false;
    const fakeFetch: typeof fetch = (input, init) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('https://auth.openai.com/')) {
        exchanges += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: 'synthetic-wif-access-token',
              issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
              token_type: 'Bearer',
              expires_in: 3600,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
      apiCalls += 1;
      const headers = new Headers(init?.headers);
      bearerMatchesExchange = headers.get('authorization') === 'Bearer synthetic-wif-access-token';
      return Promise.resolve(
        new Response(RESPONSES_SSE, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      );
    };
    const adapter = openai({
      sdkOptions: {
        workloadIdentity: {
          identityProviderId: 'idp_synthetic',
          serviceAccountId: 'sa_synthetic',
          provider: {
            tokenType: 'jwt',
            getToken: () => Promise.resolve('synthetic-subject-jwt'),
          },
        },
        fetch: fakeFetch,
      },
    });
    const events = await drain(adapter.stream(helloReq()));
    expect(exchanges).toBe(1);
    expect(apiCalls).toBe(1);
    expect(bearerMatchesExchange).toBe(true);
    expect(events.some((event) => event.type === 'text-delta')).toBe(true);
    const last = events.at(-1);
    expect(last?.type).toBe('finish');
    if (last?.type !== 'finish') {
      throw new Error('unreachable');
    }
    expect(last.finish).toEqual({ reason: 'stop' });
    expect(last.usage.outputTokens).toBe(2);
  });
});
