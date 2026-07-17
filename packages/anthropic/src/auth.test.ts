/**
 * Production auth surface (v1.14 review P2-2, v1.15 review P2-2, v1.16
 * review P3): the official SDK client injects without casts under
 * strict TypeScript, sdkOptions forwards every SDK credential mode with
 * maxRetries forced to 0, conflicting construction options fail typed
 * before any network I/O, the bearer modes (env ANTHROPIC_AUTH_TOKEN,
 * an AccessTokenProvider) reach a canonical finish against a synthetic
 * endpoint, and structured auth beats ambient env credentials with
 * explicit `apiKey: null`/`authToken: null` counting as absence, not as
 * a chosen credential. Assertions only ever inspect header PRESENCE and
 * scheme, never credential values.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('lets a credentials provider win over ambient env keys (v1.15 review P2-2)', async () => {
    // On v1.15.0 this exact configuration called the provider ZERO
    // times and sent x-api-key from the environment: the SDK lets any
    // apiKey, an env-read one included, beat the token provider. The
    // adapter now suppresses ambient env credentials whenever
    // structured auth is configured and no apiKey/authToken is set.
    vi.stubEnv('ANTHROPIC_API_KEY', 'sentinel-env-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'sentinel-env-bearer');
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
      expect(minted).toBe(1);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.at(-1)?.type).toBe('finish');
      // No credential value, ambient or minted, may surface in events.
      const serialized = JSON.stringify(events);
      expect(serialized).not.toContain('sentinel-env-key');
      expect(serialized).not.toContain('sentinel-env-bearer');
      expect(serialized).not.toContain('synthetic-provider-token');
    });
  });

  it('treats an explicit authToken: null as absent for suppression (v1.16 review P3)', async () => {
    // The SDK types allow `authToken?: string | null`. On v1.16.0 a
    // typed null here defeated the === undefined suppression check, so
    // this exact configuration called the provider ZERO times and sent
    // x-api-key from the ambient environment.
    vi.stubEnv('ANTHROPIC_API_KEY', 'sentinel-env-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    let minted = 0;
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({
        baseURL,
        sdkOptions: {
          authToken: null,
          credentials: () => {
            minted += 1;
            return Promise.resolve({ token: 'synthetic-provider-token', expiresAt: null });
          },
        },
      });
      const events = await drain(adapter.stream(helloReq()));
      expect(minted).toBe(1);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.at(-1)?.type).toBe('finish');
      const serialized = JSON.stringify(events);
      expect(serialized).not.toContain('sentinel-env-key');
      expect(serialized).not.toContain('synthetic-provider-token');
    });
  });

  it('treats an explicit apiKey: null as absent for suppression', async () => {
    // Without suppression the SDK would read ANTHROPIC_AUTH_TOKEN and,
    // with any authToken set, never even build the provider token
    // cache: the ambient bearer would authenticate instead of the
    // configured provider.
    vi.stubEnv('ANTHROPIC_API_KEY', undefined);
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'sentinel-env-bearer');
    let minted = 0;
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({
        baseURL,
        sdkOptions: {
          apiKey: null,
          credentials: () => {
            minted += 1;
            return Promise.resolve({ token: 'synthetic-provider-token', expiresAt: null });
          },
        },
      });
      const events = await drain(adapter.stream(helloReq()));
      expect(minted).toBe(1);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.at(-1)?.type).toBe('finish');
      const serialized = JSON.stringify(events);
      expect(serialized).not.toContain('sentinel-env-bearer');
      expect(serialized).not.toContain('synthetic-provider-token');
    });
  });

  it('lets the provider win with both fields explicitly null and both env vars set', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sentinel-env-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'sentinel-env-bearer');
    let minted = 0;
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({
        baseURL,
        sdkOptions: {
          apiKey: null,
          authToken: null,
          credentials: () => {
            minted += 1;
            return Promise.resolve({ token: 'synthetic-provider-token', expiresAt: null });
          },
        },
      });
      const events = await drain(adapter.stream(helloReq()));
      expect(minted).toBe(1);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.at(-1)?.type).toBe('finish');
    });
  });

  it('keeps verbatim SDK precedence when an apiKey is set next to structured auth', async () => {
    // An EXPLICIT apiKey beside a provider is the caller's choice: no
    // suppression, and per the SDK's own precedence the key wins.
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    let minted = 0;
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({
        baseURL,
        sdkOptions: {
          apiKey: 'sentinel-explicit-key',
          credentials: () => {
            minted += 1;
            return Promise.resolve({ token: 'synthetic-provider-token', expiresAt: null });
          },
        },
      });
      const events = await drain(adapter.stream(helloReq()));
      expect(minted).toBe(0);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(true);
      expect(events.at(-1)?.type).toBe('finish');
    });
  });

  it('keeps verbatim SDK precedence when an authToken is set next to structured auth', async () => {
    // An EXPLICIT bearer beside a provider is the caller's choice: no
    // suppression, and per the SDK's own precedence any set authToken
    // means the provider token cache is never built, so the explicit
    // bearer authenticates and the provider is not called.
    vi.stubEnv('ANTHROPIC_API_KEY', undefined);
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    let minted = 0;
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({
        baseURL,
        sdkOptions: {
          authToken: 'sentinel-explicit-bearer',
          credentials: () => {
            minted += 1;
            return Promise.resolve({ token: 'synthetic-provider-token', expiresAt: null });
          },
        },
      });
      const events = await drain(adapter.stream(helloReq()));
      expect(minted).toBe(0);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.at(-1)?.type).toBe('finish');
      expect(JSON.stringify(events)).not.toContain('sentinel-explicit-bearer');
    });
  });

  it('applies the same env suppression to a profile, verified end to end', async () => {
    // A hermetic file-backed profile: user_oauth with no client_id
    // treats the stored access token as static, so no network beyond
    // the API call itself. The ambient env key must not beat it.
    vi.stubEnv('ANTHROPIC_API_KEY', 'sentinel-env-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    const configDir = mkdtempSync(join(tmpdir(), 'rulvar-anthropic-profile-'));
    mkdirSync(join(configDir, 'configs'), { recursive: true });
    mkdirSync(join(configDir, 'credentials'), { recursive: true });
    writeFileSync(
      join(configDir, 'configs', 'smoke.json'),
      JSON.stringify({ authentication: { type: 'user_oauth' } }),
    );
    // The SDK refuses group/world-readable credential files.
    writeFileSync(
      join(configDir, 'credentials', 'smoke.json'),
      JSON.stringify({ type: 'oauth_token', access_token: 'synthetic-profile-token' }),
      { mode: 0o600 },
    );
    vi.stubEnv('ANTHROPIC_CONFIG_DIR', configDir);
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({ baseURL, sdkOptions: { profile: 'smoke' } });
      const events = await drain(adapter.stream(helloReq()));
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.at(-1)?.type).toBe('finish');
      expect(JSON.stringify(events)).not.toContain('synthetic-profile-token');
    });
  });

  it('keeps a profile winning over the ambient env key with authToken: null passed', async () => {
    // Same scaffolding as above; the explicit null must not disable the
    // structured-auth protection. (The SDK additionally skips both env
    // reads whenever a profile is named, so this locks two layers.)
    vi.stubEnv('ANTHROPIC_API_KEY', 'sentinel-env-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    const configDir = mkdtempSync(join(tmpdir(), 'rulvar-anthropic-profile-'));
    mkdirSync(join(configDir, 'configs'), { recursive: true });
    mkdirSync(join(configDir, 'credentials'), { recursive: true });
    writeFileSync(
      join(configDir, 'configs', 'smoke.json'),
      JSON.stringify({ authentication: { type: 'user_oauth' } }),
    );
    writeFileSync(
      join(configDir, 'credentials', 'smoke.json'),
      JSON.stringify({ type: 'oauth_token', access_token: 'synthetic-profile-token' }),
      { mode: 0o600 },
    );
    vi.stubEnv('ANTHROPIC_CONFIG_DIR', configDir);
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({ baseURL, sdkOptions: { profile: 'smoke', authToken: null } });
      const events = await drain(adapter.stream(helloReq()));
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(false);
      expect(captured[0]?.authorizationScheme).toBe('Bearer');
      expect(events.at(-1)?.type).toBe('finish');
      expect(JSON.stringify(events)).not.toContain('synthetic-profile-token');
    });
  });

  it('inherits env key auth implicitly: ANTHROPIC_API_KEY, x-api-key, no bearer', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sentinel-env-key');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({ baseURL });
      const events = await drain(adapter.stream(helloReq()));
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(true);
      expect(captured[0]?.authorizationScheme).toBeUndefined();
      expect(events.at(-1)?.type).toBe('finish');
      expect(JSON.stringify(events)).not.toContain('sentinel-env-key');
    });
  });

  it('keeps the plain apiKey path on x-api-key', async () => {
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    await withSyntheticEndpoint(async (baseURL, captured) => {
      const adapter = anthropic({ baseURL, apiKey: 'sentinel-key' });
      const events = await drain(adapter.stream(helloReq()));
      expect(captured).toHaveLength(1);
      expect(captured[0]?.hasXApiKey).toBe(true);
      expect(events.at(-1)?.type).toBe('finish');
    });
  });
});
