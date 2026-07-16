/**
 * Live-test opt-in gate and the bounded live smoke.
 *
 * A provider key in the environment is not an opt-in: key-gated live
 * tests spend provider budget, so they additionally require the explicit
 * RULVAR_LIVE_TESTS=1 switch (the repository's `pnpm test:live` sets it
 * for its child run only). runLiveSmoke drains one adapter stream per
 * attempt and classifies the terminal event: a typed retryable error
 * (429 rate limit, 529 overload, transport) is retried a bounded number
 * of times with linear backoff; a non-retryable error (authentication,
 * invalid model, invalid request) fails immediately with the typed
 * WireError intact; a stream that ends without any terminal event is the
 * adapter-contract violation it is (provider SPI: exactly one terminal
 * event per stream) and is never retried. A stream that THROWS
 * propagates unchanged: adapters surface failures as typed error events,
 * so a raw throw is itself a contract violation the caller must see.
 */
import type { ChatEvent, ChatRequest, ProviderAdapter, WireError } from '@rulvar/core';

/**
 * True only when `RULVAR_LIVE_TESTS` is exactly `'1'` AND every named
 * environment key is set to a non-empty value. Gate live tests as
 * `it.skipIf(!liveTestEnabled('ANTHROPIC_API_KEY'))(...)` so an
 * unrelated key in the shell never triggers a paid provider call from
 * an ordinary test run.
 */
export function liveTestEnabled(...requiredEnvKeys: string[]): boolean {
  if (process.env.RULVAR_LIVE_TESTS !== '1') {
    return false;
  }
  return requiredEnvKeys.every((key) => {
    const value = process.env[key];
    return value !== undefined && value !== '';
  });
}

export interface RunLiveSmokeOptions {
  /** Total attempts including the first (default 3, minimum 1). */
  attempts?: number;
  /**
   * Backoff before retry n (1-based) is `baseDelayMs * n` (default
   * 2000). Pass 0 to retry without sleeping (unit tests).
   */
  baseDelayMs?: number;
}

/**
 * The classified result of a bounded live smoke. `attempts` is how many
 * streams were actually opened; only `'exhausted'` reaches the
 * configured bound.
 */
export type LiveSmokeOutcome =
  | { status: 'ok'; attempts: number; events: ChatEvent[] }
  | { status: 'failed'; attempts: number; error: WireError; events: ChatEvent[] }
  | { status: 'exhausted'; attempts: number; errors: WireError[] }
  | { status: 'no-terminal'; attempts: number; events: ChatEvent[] };

/**
 * Drains `adapter.stream(req)` with a bounded retry policy and classifies
 * the outcome instead of throwing:
 *
 * - `'ok'`: a `finish` event arrived (the events of the successful
 *   attempt are included for further assertions).
 * - `'failed'`: a terminal error with `retryable: false`; never retried,
 *   diagnostics preserved.
 * - `'exhausted'`: every attempt ended in a `retryable: true` error; the
 *   per-attempt errors are preserved in order.
 * - `'no-terminal'`: the stream ended with neither `finish` nor `error`,
 *   which violates the provider SPI; never retried (spending again on a
 *   misbehaving adapter is wrong).
 *
 * Retries only ever follow typed retryable errors, so a live smoke never
 * converts a real adapter failure into a pass and never spends more than
 * `attempts` calls.
 */
export async function runLiveSmoke(
  adapter: Pick<ProviderAdapter, 'stream'>,
  req: ChatRequest,
  options?: RunLiveSmokeOptions,
): Promise<LiveSmokeOutcome> {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const baseDelayMs = options?.baseDelayMs ?? 2000;
  const retryableErrors: WireError[] = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const events: ChatEvent[] = [];
    for await (const event of adapter.stream(req)) {
      events.push(event);
    }
    if (events.some((event) => event.type === 'finish')) {
      return { status: 'ok', attempts: attempt, events };
    }
    const errorEvent = events.find(
      (event): event is Extract<ChatEvent, { type: 'error' }> => event.type === 'error',
    );
    if (errorEvent === undefined) {
      return { status: 'no-terminal', attempts: attempt, events };
    }
    if (!errorEvent.error.retryable) {
      return { status: 'failed', attempts: attempt, error: errorEvent.error, events };
    }
    retryableErrors.push(errorEvent.error);
    if (attempt < attempts && baseDelayMs > 0) {
      await delay(baseDelayMs * attempt);
    }
  }
  return { status: 'exhausted', attempts, errors: retryableErrors };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
