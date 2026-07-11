import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';

import { buildAdapterRegistry, ConfigError, type ChatEvent } from '@rulvar/core';
import { CONSERVATIVE_COMPATIBLE_CAPS, openaiCompatible } from './compatible.js';

interface CapturedRequest {
  url: string;
  authorization?: string;
  body: Record<string, unknown>;
}

const captured: CapturedRequest[] = [];

/** A minimal OpenAI-compatible SSE stub in the Ollama/vLLM shape. */
const stub = createServer((req: IncomingMessage, res: ServerResponse) => {
  let body = '';
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString('utf8');
  });
  req.on('end', () => {
    captured.push({
      url: req.url ?? '',
      ...(req.headers.authorization === undefined
        ? {}
        : { authorization: req.headers.authorization }),
      body: JSON.parse(body) as Record<string, unknown>,
    });
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
    });
    const chunk = (payload: unknown): void => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    chunk({
      id: 'c1',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: { role: 'assistant', content: 'local ' } }],
    });
    chunk({
      id: 'c1',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: { content: 'answer' } }],
    });
    chunk({
      id: 'c1',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
    });
    res.write('data: [DONE]\n\n');
    res.end();
  });
});

const listening = new Promise<string>((resolve) => {
  stub.listen(0, '127.0.0.1', () => {
    const address = stub.address() as AddressInfo;
    resolve(`http://127.0.0.1:${address.port}/v1`);
  });
});

afterAll(() => {
  stub.close();
});

describe('openaiCompatible factory (M3-T06)', () => {
  it('requires an explicit id and a baseURL', () => {
    expect(() => openaiCompatible({ id: '', baseURL: 'http://x' })).toThrow(ConfigError);
    expect(() => openaiCompatible({ id: 'ollama', baseURL: '' })).toThrow(ConfigError);
  });

  it('assumes the most conservative caps when unprobed; supplied caps merge over them', () => {
    const bare = openaiCompatible({ id: 'ollama', baseURL: 'http://localhost:11434/v1' });
    expect(bare.caps('llama3')).toEqual(CONSERVATIVE_COMPATIBLE_CAPS);
    expect(bare.caps('llama3').structuredOutput).toBe('prompt');
    expect(bare.caps('llama3').pricing).toBeUndefined();

    const probed = openaiCompatible({
      id: 'vllm',
      baseURL: 'http://localhost:8000/v1',
      caps: () => ({ structuredOutput: 'native', contextWindow: 128_000 }),
    });
    expect(probed.caps('qwen').structuredOutput).toBe('native');
    expect(probed.caps('qwen').contextWindow).toBe(128_000);
    expect(probed.caps('qwen').supportsParallelTools).toBe(false);
  });

  it('two instances with distinct ids register side by side; a duplicate id is a ConfigError', () => {
    const ollama = openaiCompatible({ id: 'ollama', baseURL: 'http://localhost:11434/v1' });
    const vllm = openaiCompatible({ id: 'vllm', baseURL: 'http://localhost:8000/v1' });
    const registry = buildAdapterRegistry([ollama, vllm]);
    expect([...registry.keys()].sort()).toEqual(['ollama', 'vllm']);
    expect(() => buildAdapterRegistry([ollama, ollama])).toThrow(ConfigError);
  });

  it('streams the Chat Completions dialect from a local stub server', async () => {
    const baseURL = await listening;
    const adapter = openaiCompatible({ id: 'stub', baseURL, apiKey: 'test-key' });
    const events: ChatEvent[] = [];
    for await (const event of adapter.stream({
      model: 'stub-model',
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
    })) {
      events.push(event);
    }
    const text = events
      .filter((event) => event.type === 'text-delta')
      .map((event) => (event as { text: string }).text)
      .join('');
    expect(text).toBe('local answer');
    const finish = events.at(-1);
    expect(finish?.type).toBe('finish');
    expect((finish as { finish: { reason: string } }).finish.reason).toBe('stop');
    expect((finish as { usage: { inputTokens: number } }).usage.inputTokens).toBe(7);

    const request = captured.at(-1);
    expect(request?.url).toBe('/v1/chat/completions');
    expect(request?.authorization).toBe('Bearer test-key');
    expect(request?.body.model).toBe('stub-model');
    expect(request?.body.stream).toBe(true);
  });

  it('surfaces endpoint failures as typed retryable wire errors, never throws', async () => {
    const adapter = openaiCompatible({
      id: 'down',
      // Nothing listens here; the SDK connection failure maps to a wire
      // error event (adapters never sleep or retry internally).
      baseURL: 'http://127.0.0.1:9/v1',
    });
    const events: ChatEvent[] = [];
    for await (const event of adapter.stream({
      model: 'x',
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
    })) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('error');
  });
});
