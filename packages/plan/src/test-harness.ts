/**
 * Package-internal test doubles over the PUBLIC core SPI (mirrors the
 * core-internal harness; @lurker/plan builds exclusively from the public
 * API, its tests included). Not exported from the package index.
 */
import type { ChatEvent, ChatRequest, ModelCaps, ProviderAdapter, Usage } from '@lurker/core';

export interface ScriptedTurn {
  text?: string;
  toolCall?: { name: string; args: unknown };
  /** Park the stream until the abort signal fires (cancel determinism). */
  hangUntilAborted?: boolean;
}

export const TEST_CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 200_000,
  maxOutputTokens: 4_096,
  pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
};

const USAGE: Usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };

/** A minimal scripted adapter over the PUBLIC provider SPI. */
export function scriptedAdapter(
  script: (req: ChatRequest, call: number) => ScriptedTurn,
): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id: 'fake',
    calls,
    caps: () => TEST_CAPS,
    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const call = calls.length;
      calls.push(req);
      const turn = script(req, call);
      if (turn.hangUntilAborted === true) {
        await new Promise<void>((resolve) => {
          if (signal?.aborted === true) {
            resolve();
            return;
          }
          signal?.addEventListener('abort', () => resolve(), { once: true });
        });
        return;
      }
      if (turn.text !== undefined) {
        yield { type: 'text-delta', text: turn.text };
      }
      if (turn.toolCall !== undefined) {
        const id = `id-${String(call)}`;
        yield { type: 'tool-call-start', id, name: turn.toolCall.name };
        yield { type: 'tool-call-end', id, args: turn.toolCall.args };
      }
      yield { type: 'finish', finish: { reason: 'stop' }, usage: USAGE };
    },
  };
}

export function agentTypeOf(req: ChatRequest): string {
  const lurker = (req.providerOptions as { lurker?: { agentType?: string } } | undefined)?.lurker;
  return lurker?.agentType ?? '';
}

/** Extracts the latest tool result matching the marker. */
export function lastToolResult<T>(req: ChatRequest, marker: (value: T) => boolean): T | undefined {
  let found: T | undefined;
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const value = part.result as T;
        if (marker(value)) {
          found = value;
        }
      }
    }
  }
  return found;
}

/** The latest tool ERROR text visible to the model, when any. */
export function lastToolError(req: ChatRequest): string | undefined {
  let found: string | undefined;
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result' && (part as { isError?: boolean }).isError === true) {
        found = JSON.stringify(part.result);
      }
    }
  }
  return found;
}
