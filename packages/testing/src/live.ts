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
 * WireError intact. The provider SPI requires exactly one terminal event
 * per stream, as its final event: a stream with no terminal is
 * `'no-terminal'`, one with multiple terminals or a terminal followed by
 * more events is `'contract-violation'`, and neither is ever retried
 * (spending again cannot repair a broken adapter contract). A stream
 * that THROWS propagates unchanged: adapters surface failures as typed
 * error events, so a raw throw is itself a contract violation the caller
 * must see. Options are validated before any stream is opened; invalid
 * values reject with ConfigError instead of being clamped or defaulted.
 */
import { ConfigError } from '@rulvar/core';
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

/** Default total `runLiveSmoke` attempts including the first. */
export const DEFAULT_LIVE_SMOKE_ATTEMPTS = 3;

/**
 * Hard ceiling on `runLiveSmoke` attempts. The helper's whole contract
 * is a bounded spend, so it refuses configurations that are not.
 */
export const MAX_LIVE_SMOKE_ATTEMPTS = 10;

export interface RunLiveSmokeOptions {
  /**
   * Total attempts including the first: an integer from 1 to
   * {@link MAX_LIVE_SMOKE_ATTEMPTS} (default 3). Anything else, NaN and
   * Infinity included, rejects with ConfigError before any stream opens.
   */
  attempts?: number;
  /**
   * Backoff before retry n (1-based) is `baseDelayMs * n`: a
   * non-negative integer (default 2000). Pass 0 to retry without
   * sleeping (unit tests). Anything else rejects with ConfigError
   * before any stream opens.
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
  | { status: 'no-terminal'; attempts: number; events: ChatEvent[] }
  | {
      status: 'contract-violation';
      attempts: number;
      reason: 'multiple-terminals' | 'terminal-not-final';
      events: ChatEvent[];
    };

type TerminalEvent = Extract<ChatEvent, { type: 'finish' } | { type: 'error' }>;

/**
 * Drains `adapter.stream(req)` with a bounded retry policy and classifies
 * the outcome instead of throwing:
 *
 * - `'ok'`: the stream ended on a single terminal `finish` (the events of
 *   the successful attempt are included for further assertions).
 * - `'failed'`: a terminal error with `retryable: false`; never retried,
 *   diagnostics preserved.
 * - `'exhausted'`: every attempt ended in a `retryable: true` error; the
 *   per-attempt errors are preserved in order.
 * - `'no-terminal'`: the stream ended with neither `finish` nor `error`,
 *   which violates the provider SPI; never retried (spending again on a
 *   misbehaving adapter is wrong).
 * - `'contract-violation'`: the stream carried more than one terminal
 *   event (`'multiple-terminals'`, e.g. an error followed by a finish) or
 *   its single terminal was not the final event
 *   (`'terminal-not-final'`). Equally an SPI violation, equally never
 *   retried, and never reported as a pass.
 *
 * Retries only ever follow a well-formed stream whose single final
 * terminal is a typed retryable error, so a live smoke never converts a
 * real adapter failure or a malformed stream into a pass and never
 * spends more than `attempts` calls. Options are validated first:
 * invalid `attempts` or `baseDelayMs` reject with ConfigError before any
 * adapter call.
 */
export async function runLiveSmoke(
  adapter: Pick<ProviderAdapter, 'stream'>,
  req: ChatRequest,
  options?: RunLiveSmokeOptions,
): Promise<LiveSmokeOutcome> {
  const attempts = validatedAttempts(options?.attempts);
  const baseDelayMs = validatedBaseDelayMs(options?.baseDelayMs);
  const retryableErrors: WireError[] = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const events: ChatEvent[] = [];
    for await (const event of adapter.stream(req)) {
      events.push(event);
    }
    const terminals = events.filter(
      (event): event is TerminalEvent => event.type === 'finish' || event.type === 'error',
    );
    const terminal = terminals[0];
    if (terminal === undefined) {
      return { status: 'no-terminal', attempts: attempt, events };
    }
    if (terminals.length > 1) {
      return {
        status: 'contract-violation',
        attempts: attempt,
        reason: 'multiple-terminals',
        events,
      };
    }
    if (terminal !== events.at(-1)) {
      return {
        status: 'contract-violation',
        attempts: attempt,
        reason: 'terminal-not-final',
        events,
      };
    }
    if (terminal.type === 'finish') {
      return { status: 'ok', attempts: attempt, events };
    }
    if (!terminal.error.retryable) {
      return { status: 'failed', attempts: attempt, error: terminal.error, events };
    }
    retryableErrors.push(terminal.error);
    if (attempt < attempts && baseDelayMs > 0) {
      await delay(baseDelayMs * attempt);
    }
  }
  return { status: 'exhausted', attempts, errors: retryableErrors };
}

function validatedAttempts(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_LIVE_SMOKE_ATTEMPTS;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_LIVE_SMOKE_ATTEMPTS) {
    throw new ConfigError(
      `runLiveSmoke attempts must be an integer from 1 to ${MAX_LIVE_SMOKE_ATTEMPTS}, got ${String(value)}`,
    );
  }
  return value;
}

function validatedBaseDelayMs(value: number | undefined): number {
  if (value === undefined) {
    return 2000;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ConfigError(
      `runLiveSmoke baseDelayMs must be a non-negative integer, got ${String(value)}`,
    );
  }
  return value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
