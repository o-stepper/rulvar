/**
 * FakeAdapter (M1-T14): a REAL ProviderAdapter that resolves calls from
 * declared patterns instead of the network, behind the same seam as live
 * adapters, so unit tests run through the full engine: journal, scheduler,
 * budget layers, and event stream. Calls cost zero USD.
 */
import {
  createCanonicalIdMinter,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type Usage,
  type WireError,
} from '@rulvar/core';

/** What a responder sees about the call. */
export interface FakeCall {
  prompt: string;
  agentType?: string;
  label?: string;
  req: ChatRequest;
}

/**
 * A static string (plain text output), a static value (structured output),
 * or a function of the call. Thrown errors become terminal error events.
 * fakeToolCalls() and fakeWireError() values script tool-calling turns and
 * typed wire failures (M3).
 */
export type FakeResponder = string | ((call: FakeCall) => unknown) | object;

/** Marker value: the model answers this turn with tool calls (M3). */
export interface FakeToolCallsValue {
  __fake: 'tool-calls';
  calls: Array<{ name: string; args: unknown }>;
}

/** Scripts a tool-calling turn from a responder. */
export function fakeToolCalls(
  ...calls: Array<{ name: string; args: unknown }>
): FakeToolCallsValue {
  return { __fake: 'tool-calls', calls };
}

/** Marker value: the stream terminates with this typed wire error (M3). */
export interface FakeWireErrorValue {
  __fake: 'wire-error';
  error: WireError;
}

/** Scripts a typed wire failure (e.g. a retryable rate limit). */
export function fakeWireError(error: WireError): FakeWireErrorValue {
  return { __fake: 'wire-error', error };
}

function isFakeToolCalls(value: unknown): value is FakeToolCallsValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __fake?: unknown }).__fake === 'tool-calls'
  );
}

function isFakeWireError(value: unknown): value is FakeWireErrorValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __fake?: unknown }).__fake === 'wire-error'
  );
}

export interface FakeAdapterOptions {
  /**
   * Patterns match on agentType, label, or a regex over the prompt; '*'
   * is the fallback.
   */
  agents: Record<string, FakeResponder>;
}

export const FAKE_MODEL = 'fake-model';
export const FAKE_MODEL_REF = 'fake:fake-model';

const FAKE_CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: true,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 1_000_000,
  maxOutputTokens: 64_000,
  // Zero cost by construction: priced at zero, never unpriced noise.
  pricing: { inputUsdPerMTok: 0, outputUsdPerMTok: 0 },
};

function lastUserText(req: ChatRequest): string {
  for (let i = req.messages.length - 1; i >= 0; i -= 1) {
    const msg = req.messages[i];
    if (msg?.role !== 'user') {
      continue;
    }
    return msg.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n');
  }
  return '';
}

export class FakeAdapter implements ProviderAdapter {
  readonly id = 'fake' as const;
  private readonly agents: Record<string, FakeResponder>;
  private readonly mintId = createCanonicalIdMinter();
  /** Every request this adapter served, in order. */
  readonly calls: FakeCall[] = [];

  constructor(options: FakeAdapterOptions) {
    this.agents = options.agents;
  }

  caps(this: void): ModelCaps {
    return FAKE_CAPS;
  }

  private match(call: FakeCall): FakeResponder | undefined {
    let fallback: FakeResponder | undefined;
    for (const [pattern, responder] of Object.entries(this.agents)) {
      if (pattern === '*') {
        fallback = responder;
        continue;
      }
      if (call.agentType === pattern || call.label === pattern) {
        return responder;
      }
      try {
        if (new RegExp(pattern).test(call.prompt)) {
          return responder;
        }
      } catch {
        // A pattern that is not a valid regex matches by name only.
      }
    }
    return fallback;
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
    const telemetry = (req.providerOptions?.rulvar ?? {}) as {
      agentType?: string;
      label?: string;
    };
    const call: FakeCall = {
      prompt: lastUserText(req),
      req,
      ...(telemetry.agentType === undefined || telemetry.agentType === ''
        ? {}
        : { agentType: telemetry.agentType }),
      ...(telemetry.label === undefined ? {} : { label: telemetry.label }),
    };
    this.calls.push(call);

    const responder = this.match(call);
    if (responder === undefined) {
      yield {
        type: 'error',
        error: {
          code: 'agent',
          message:
            `FakeAdapter: no pattern matches agentType='${call.agentType ?? ''}' ` +
            `label='${call.label ?? ''}' prompt='${call.prompt.slice(0, 80)}'; add a '*' fallback`,
          retryable: false,
          data: { kind: 'terminal' },
        },
      };
      return;
    }

    let value: unknown;
    try {
      value = typeof responder === 'function' ? await responder(call) : responder;
    } catch (thrown) {
      yield {
        type: 'error',
        error: {
          code: 'agent',
          message: thrown instanceof Error ? thrown.message : String(thrown),
          retryable: false,
          data: { kind: 'terminal' },
        },
      };
      return;
    }

    if (isFakeWireError(value)) {
      yield { type: 'error', error: value.error };
      return;
    }
    if (isFakeToolCalls(value)) {
      const usage: Usage = {
        inputTokens: Math.max(1, Math.ceil(call.prompt.length / 4)),
        outputTokens: Math.max(1, value.calls.length * 8),
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      };
      for (const toolCall of value.calls) {
        const id = this.mintId();
        yield { type: 'tool-call-start', id, name: toolCall.name };
        yield { type: 'tool-call-end', id, args: toolCall.args };
      }
      yield { type: 'finish', finish: { reason: 'tool-calls' }, usage };
      return;
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    const usage: Usage = {
      inputTokens: Math.max(1, Math.ceil(call.prompt.length / 4)),
      outputTokens: Math.max(1, Math.ceil(text.length / 4)),
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    // Honor the structured-output tier the runtime selected: a pinned
    // toolChoice (forced-tool) answers with the tool call; native and
    // prompt tiers answer with text.
    const forcedName = typeof req.toolChoice === 'object' ? req.toolChoice.name : undefined;
    if (forcedName !== undefined) {
      let args: unknown = value;
      if (typeof value === 'string') {
        try {
          args = JSON.parse(value);
        } catch {
          args = { text: value };
        }
      }
      const id = this.mintId();
      yield { type: 'tool-call-start', id, name: forcedName };
      yield { type: 'tool-call-end', id, args };
      yield { type: 'finish', finish: { reason: 'tool-calls' }, usage };
      return;
    }
    yield { type: 'text-delta', text };
    yield { type: 'finish', finish: { reason: 'stop' }, usage };
  }
}
