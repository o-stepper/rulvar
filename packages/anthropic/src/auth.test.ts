/**
 * Production auth surface (v1.14 review P2-2): the official SDK client
 * injects without casts under strict TypeScript, sdkOptions forwards
 * every SDK credential mode with maxRetries forced to 0, conflicting
 * construction options fail typed before any network I/O, and the
 * bearer modes (env ANTHROPIC_AUTH_TOKEN, an AccessTokenProvider) reach
 * a canonical finish against a synthetic endpoint. Assertions only ever
 * inspect header PRESENCE and scheme, never credential values.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Anthropic from '@anthropic-ai/sdk';
import { ConfigError, type ChatEvent, type ChatRequest } from '@rulvar/core';
import { anthropic } from './adapter.js';

const helloReq = (): ChatRequest => ({
  model: 'claude-sonnet-5',
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
  maxOutputTokens: 16,
});

const SSE_BODY = [
  'event: message_start',
  'data: {"type":"message_start","message":{"id":"msg_synthetic","usage":{"input_tokens":3,"output_tokens":1}}}',
  '',
  'event: content_block_start',
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
  '',
  'event: content_block_delta',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}',
  '',
  'event: content_block_stop',
  'data: {"type":"content_block_stop","index":0}',
  '',
  'event: message_delta',
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}',
  '',
  'event: message_stop',
  'data: {"type":"message_stop"}',
  '',
  '',
].join('\n');

interface CapturedAuth {
  hasXApiKey: boolean;
  authorizationScheme: string | undefined;
}

async function withSyntheticEndpoint(
  fn: (baseURL: string, captured: CapturedAuth[]) => Promise<void>,
): Promise<void> {
  const captured: CapturedAuth[] = [];
  const server = createServer((req, res) => {
    const authorization = req.headers.authorization;
    captured.push({
      hasXApiKey: req.headers['x-api-key'] !== undefined,
      authorizationScheme:
        typeof authorization === 'string' ? authorization.split(' ')[0] : undefined,
    });
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(SSE_BODY);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${String(port)}`, captured);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  }
}

async function drain(stream: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe('anthropic() production auth surface', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a preconstructed official client without casts (strict TS)', () => {
    const client = new Anthropic({ apiKey: 'sentinel-key', maxRetries: 0 });
    const adapter = anthropic({ client });
    expect(adapter.id).toBe('anthropic');
  });

  it('rejects an injected official client whose SDK autoretries are enabled', () => {
    // The SDK default is maxRetries 2; under the core's RetryPolicy that
    // would double-retry.
    const client = new Anthropic({ apiKey: 'sentinel-key' });
    expect(() => anthropic({ client })).toThrow(ConfigError);
    expect(() => anthropic({ client })).toThrow(/maxRetries 2/);
  });

  it('rejects client combined with construction options, typed and before I/O', () => {
    const client = new Anthropic({ apiKey: 'sentinel-key', maxRetries: 0 });
    expect(() => anthropic({ client, apiKey: 'sentinel-key' })).toThrow(ConfigError);
    expect(() => anthropic({ client, sdkOptions: {} })).toThrow(ConfigError);
  });

  it('rejects the same field set both top-level and in sdkOptions', () => {
    expect(() =>
      anthropic({ apiKey: 'sentinel-key', sdkOptions: { apiKey: 'sentinel-key' } }),
    ).toThrow(ConfigError);
    expect(() =>
      anthropic({ baseURL: 'http://127.0.0.1:1', sdkOptions: { baseURL: 'http://127.0.0.1:1' } }),
    ).toThrow(ConfigError);
  });

  it('inherits env bearer auth implicitly: ANTHROPIC_AUTH_TOKEN, no x-api-key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', undefined);
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'synthetic-bearer-sentinel');
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({ baseURL });
      const events = await drain(adapter.stream(helloReq()));
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.some((event) => event.type === 'text-delta')).toBe(true);
      const last = events.at(-1);
      expect(last?.type).toBe('finish');
      if (last?.type !== 'finish') {
        throw new Error('unreachable');
      }
      expect(last.finish).toEqual({ reason: 'stop' });
    });
  });

  it('reaches a canonical finish through an AccessTokenProvider via sdkOptions', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', undefined);
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    let minted = 0;
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({
        baseURL,
        sdkOptions: {
          credentials: () => {
            minted += 1;
            return Promise.resolve({ token: 'synthetic-provider-token', expiresAt: null });
          },
        },
      });
      const events = await drain(adapter.stream(helloReq()));
      expect(minted).toBeGreaterThanOrEqual(1);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      const last = events.at(-1);
      expect(last?.type).toBe('finish');
      if (last?.type !== 'finish') {
        throw new Error('unreachable');
      }
      expect(last.finish).toEqual({ reason: 'stop' });
      expect(last.usage.outputTokens).toBe(2);
    });
  });
});
