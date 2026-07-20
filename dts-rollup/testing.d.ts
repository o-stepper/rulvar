import { a as FAKE_MODEL, c as FakeAdapterOptions, d as FakeToolCallsValue, f as FakeWireErrorValue, i as createTestEngine, l as FakeCall, m as fakeWireError, n as TestEngine, o as FAKE_MODEL_REF, p as fakeToolCalls, r as TestRunHandle, s as FakeAdapter, t as CreateTestEngineOptions, u as FakeResponder } from "./test-engine-DAXwdoOQ.js";
import { AgentProfile, ChatEvent, ChatRequest, InvocationRole, JournalEntry, JournalStore, ModelCaps, ModelSpec, ProviderAdapter, ResumePreview, RunOutcome, WireError, Workflow, createEngine } from "@rulvar/core";

//#region src/replay-strict.d.ts
interface ReplayRunOptions {
  /** The journal to replay: raw entries, or a store plus runId. */
  journal: JournalEntry[] | {
    store: JournalStore;
    runId: string;
  };
  /** 'strict' (default): any live call throws JournalMissError. */
  mode?: "strict";
  /**
  * Identity depends on the resolved model spec, so replays must resolve
  * through the SAME routing as the recording run. Defaults to the
  * createTestEngine fake routing; override for journals recorded against
  * other adapters.
  */
  adapters?: ProviderAdapter[];
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
  /** Escalation hook for value-form workflows (should stay cold on replay). */
  onEscalation?: Parameters<typeof createEngine>[0]["onEscalation"];
}
declare function replayRun<A, R>(wf: Workflow<A, R>, args: A, options: ReplayRunOptions): Promise<{
  outcome: RunOutcome<unknown>;
  preview: ResumePreview;
}>;
//#endregion
//#region src/live.d.ts
/**
* True only when `RULVAR_LIVE_TESTS` is exactly `'1'` AND every named
* environment key is set to a non-empty value. Gate live tests as
* `it.skipIf(!liveTestEnabled('ANTHROPIC_API_KEY'))(...)` so an
* unrelated key in the shell never triggers a paid provider call from
* an ordinary test run.
*/
declare function liveTestEnabled(...requiredEnvKeys: string[]): boolean;
/** Default total `runLiveSmoke` attempts including the first. */
declare const DEFAULT_LIVE_SMOKE_ATTEMPTS = 3;
/**
* Hard ceiling on `runLiveSmoke` attempts. The helper's whole contract
* is a bounded spend, so it refuses configurations that are not.
*/
declare const MAX_LIVE_SMOKE_ATTEMPTS = 10;
/**
* Hard ceiling on every scheduled backoff: Node's maximum timer delay
* (2^31 - 1 ms). Anything above it would not sleep longer, it would be
* clamped to 1 ms with a TimeoutOverflowWarning, so both `baseDelayMs`
* and the largest scheduled delay, `baseDelayMs * (attempts - 1)`, are
* validated against this bound before any stream opens.
*/
declare const MAX_LIVE_SMOKE_DELAY_MS = 2147483647;
interface RunLiveSmokeOptions {
  /**
  * Total attempts including the first: an integer from 1 to
  * {@link MAX_LIVE_SMOKE_ATTEMPTS} (default 3). Anything else, NaN and
  * Infinity included, rejects with ConfigError before any stream opens.
  */
  attempts?: number;
  /**
  * Backoff before retry n (1-based) is `baseDelayMs * n`: a
  * non-negative integer (default 2000). Pass 0 to retry without
  * sleeping (unit tests). The value AND the largest scheduled delay,
  * `baseDelayMs * (attempts - 1)`, must not exceed
  * {@link MAX_LIVE_SMOKE_DELAY_MS} (Node's timer maximum, which would
  * otherwise clamp the sleep to 1 ms). Anything else rejects with
  * ConfigError before any stream opens.
  */
  baseDelayMs?: number;
}
/**
* The classified result of a bounded live smoke. `attempts` is how many
* streams were actually opened; only `'exhausted'` reaches the
* configured bound.
*/
type LiveSmokeOutcome = {
  status: "ok";
  attempts: number;
  events: ChatEvent[];
} | {
  status: "failed";
  attempts: number;
  error: WireError;
  events: ChatEvent[];
} | {
  status: "exhausted";
  attempts: number;
  errors: WireError[];
} | {
  status: "no-terminal";
  attempts: number;
  events: ChatEvent[];
} | {
  status: "contract-violation";
  attempts: number;
  reason: "multiple-terminals" | "terminal-not-final";
  events: ChatEvent[];
};
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
declare function runLiveSmoke(adapter: Pick<ProviderAdapter, "stream">, req: ChatRequest, options?: RunLiveSmokeOptions): Promise<LiveSmokeOutcome>;
//#endregion
//#region src/vcr.d.ts
/** One recorded exchange; a cassette is one JSON header line plus rows. */
interface VcrRow {
  adapterId: string;
  provider?: string;
  requestHash: string;
  /** Redacted canonical request, for humans and drift review. */
  request: unknown;
  /** Redacted event stream, replayed verbatim. */
  events: ChatEvent[];
  /** Caps snapshot for the request's model at record time. */
  caps: ModelCaps;
  model: string;
}
/** The first line of every cassette file: format and hash provenance. */
interface VcrHeader {
  v: 1;
  kind: "rulvar-vcr";
  hashVersion: number;
  recordedAt: string;
}
type RedactFn = (value: string) => string;
/**
* Built-in redaction: authorization material never reaches cassette
* bytes. Deliberately aggressive; compose a
* custom hook for payload-specific secrets.
*/
declare function defaultRedact(value: string): string;
/**
* The cassette key: a hash of the canonical wire-contract request. The
* engine-populated telemetry namespace is excluded (never identity);
* everything else the adapter would send keys the
* row.
*/
declare function requestHash(req: ChatRequest): string;
/**
* Wraps live adapters for recording: every stream that completes with
* exactly one terminal event (finish or error) appends one redacted
* row to the cassette JSONL. A stream that ends without a terminal
* (a requested abort or a truncated read), throws, or violates the
* adapter contract (a second terminal, data after the terminal)
* appends nothing, so a cassette row is always the record of one
* completed exchange (v1.28.0 review P2). The wrapped adapters are
* drop-in: same ids, providers, caps, and event streams.
*/
declare function record(options: {
  adapters: ProviderAdapter[];
  cassette: string;
  redact?: RedactFn;
}): ProviderAdapter[];
/** Typed hermetic-miss error; onMiss: 'throw' raises it on any unrecorded request. */
declare class VcrMissError extends Error {
  readonly requestHash: string;
  constructor(adapterId: string, hash: string);
}
interface VcrCassette {
  header: VcrHeader;
  rows: VcrRow[];
}
/**
* Parses a cassette file (one header line plus one JSON row per line).
* The header must declare cassette format `v: 1`: the format version
* gates parsing itself, while hashVersion (checked by replay) only
* gates request identity and never substitutes for it, so a future
* incompatible format refuses loudly instead of being read as v1.
* Parse and shape failures throw a typed ConfigError naming the
* cassette path and line (v1.28.0 review P3).
*/
declare function readCassette(path: string): VcrCassette;
/**
* Builds replay adapters from a cassette. `onMiss: 'throw'` is the
* hermetic CI mode; `'passthrough'` forwards unrecorded requests to the
* matching live adapter in `adapters` (a development convenience only).
*/
declare function replay(options: {
  cassette: string;
  onMiss: "throw" | "passthrough"; /** Live adapters for the passthrough mode. */
  adapters?: ProviderAdapter[];
}): ProviderAdapter[];
//#endregion
export { type CreateTestEngineOptions, DEFAULT_LIVE_SMOKE_ATTEMPTS, FAKE_MODEL, FAKE_MODEL_REF, FakeAdapter, type FakeAdapterOptions, type FakeCall, type FakeResponder, type FakeToolCallsValue, type FakeWireErrorValue, type LiveSmokeOutcome, MAX_LIVE_SMOKE_ATTEMPTS, MAX_LIVE_SMOKE_DELAY_MS, RedactFn, type ReplayRunOptions, type RunLiveSmokeOptions, type TestEngine, type TestRunHandle, VcrCassette, VcrHeader, VcrMissError, VcrRow, createTestEngine, defaultRedact, fakeToolCalls, fakeWireError, liveTestEnabled, readCassette, record, replay, replayRun, requestHash, runLiveSmoke };