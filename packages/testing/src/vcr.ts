/**
 * VCR cassettes at the adapter boundary (M5-T04): `record` wraps
 * live adapters and captures
 * request/event pairs into a redacted JSONL cassette keyed by a hash of
 * the canonical wire-contract request; `replay` serves recorded streams
 * back with `onMiss: 'throw'` (hermetic CI) or `'passthrough'` (mixed
 * live/recorded development runs). Because the boundary speaks the L0
 * wire contract, cassettes are vendor-neutral by construction.
 *
 * Redaction happens at record time and secrets MUST never reach the
 * committed cassette bytes: the built-in policy masks authorization
 * material (bearer tokens, api-key-shaped strings) in every stored
 * string, and a `redact` hook composes on top. The request HASH is
 * computed over the raw canonical request (minus the engine-populated
 * `providerOptions.rulvar` telemetry namespace, which is never
 * identity), so replay matching is redaction-independent while stored
 * bytes stay clean. Cassettes record the hashVersion they were produced
 * under (DEF-6).
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
  ConfigError,
  CURRENT_HASH_VERSION,
  usageViolations,
  type ChatEvent,
  type ChatRequest,
  type Effort,
  type FinishInfo,
  type ModelCaps,
  type ProviderAdapter,
  type Usage,
} from '@rulvar/core';

/** One recorded exchange; a cassette is one JSON header line plus rows. */
export interface VcrRow {
  adapterId: string;
  provider?: string;
  /**
   * The recording adapter's declared usageSemantics snapshot (v1.30.0
   * review P2): replay restores it on the rebuilt adapter, so the
   * fresh journal of a replayed run carries the same provenance stamp
   * the recorded run got. Absent when the recording adapter declared
   * none, and in every cassette recorded before v1.31.0, whose
   * replays therefore stamp nothing (documented historical laxity; an
   * unstamped entry reads as recorded before the stamp existed).
   */
  usageSemantics?: string;
  /**
   * Zero based per `(adapterId, requestHash)` call counter, claimed
   * synchronously when the recorded `stream()` call was made
   * (v1.31.0 review P2): rows are appended in COMPLETION order, so
   * without this number two concurrent identical live calls that
   * finish out of order would swap callers at replay, which hands
   * occurrences out in caller order. Replay sorts same hash rows by
   * it when every row of the group carries one; absent in cassettes
   * recorded before v1.32.0, whose same hash rows keep file order.
   * An aborted or failed call claims a number but appends no row, so
   * gaps in the numbering are valid. An appending `record()` session
   * seeds its counters past the numbers already on disk, so the
   * numbering continues across sequential sessions; a duplicate
   * number inside a fully numbered group refuses replay as ambiguous
   * (v1.32.0 review P2). The numbering ends at
   * `Number.MAX_SAFE_INTEGER`: a session refuses with a typed
   * ConfigError to claim a number past it, before dispatching the
   * provider and before touching the file (v1.33.0 review P3).
   */
  occurrence?: number;
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
export interface VcrHeader {
  v: 1;
  kind: 'rulvar-vcr';
  hashVersion: number;
  recordedAt: string;
}

export type RedactFn = (value: string) => string;

/**
 * Built-in redaction: authorization material never reaches cassette
 * bytes. Deliberately aggressive; compose a
 * custom hook for payload-specific secrets.
 */
export function defaultRedact(value: string): string {
  return value
    .replace(/\b(sk|pk|rk)-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]')
    .replace(
      /\b(api[-_]?key|authorization|x-api-key)(["':\s=]+)((?!Bearer\b)[^\s"',;]+)/gi,
      '$1$2[REDACTED]',
    );
}

function walkStrings(value: unknown, fn: RedactFn): unknown {
  if (typeof value === 'string') {
    return fn(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => walkStrings(item, fn));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        walkStrings(item, fn),
      ]),
    );
  }
  return value;
}

/** Deterministic canonical JSON: sorted keys, no whitespace. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
  return `{${entries.join(',')}}`;
}

/**
 * The cassette key: a hash of the canonical wire-contract request. The
 * engine-populated telemetry namespace is excluded (never identity);
 * everything else the adapter would send keys the
 * row.
 */
export function requestHash(req: ChatRequest): string {
  const { providerOptions, ...rest } = req;
  const filtered =
    providerOptions === undefined
      ? {}
      : Object.fromEntries(
          Object.entries(providerOptions).filter(([namespace]) => namespace !== 'rulvar'),
        );
  const withoutTelemetry =
    Object.keys(filtered).length === 0 ? rest : { ...rest, providerOptions: filtered };
  return createHash('sha256').update(canonicalJson(withoutTelemetry), 'utf8').digest('hex');
}

/** The terminal vocabulary of the adapter contract: finish or error. */
function isTerminalEvent(event: ChatEvent): boolean {
  return event.type === 'finish' || event.type === 'error';
}

function headerLine(): string {
  return JSON.stringify({
    v: 1,
    kind: 'rulvar-vcr',
    hashVersion: CURRENT_HASH_VERSION,
    recordedAt: new Date().toISOString(),
  } satisfies VcrHeader);
}

/**
 * Groups rows by `(adapterId, requestHash)` and orders every fully
 * numbered group by its recorded occurrence numbers. Same hash rows
 * sit in the file in COMPLETION order; when every row of a group
 * carries the occurrence number claimed at stream call time, the
 * group is served in that order instead, so concurrent identical
 * calls that finished out of order still replay to the callers that
 * made them (v1.31.0 review P2). A group with any unnumbered row
 * (recorded before v1.32.0) keeps file order, and gaps in the
 * numbering (an aborted or failed call claims a number but appends
 * no row) are valid. A DUPLICATE number inside a fully numbered
 * group refuses the whole cassette: it means two recorder sessions
 * wrote the file concurrently (the documented contract is one active
 * recorder per cassette), and serving either order would silently
 * hand a caller the wrong exchange (v1.32.0 review P2). Both replay
 * and an appending record session group through here, so the refusal
 * fires before anything is served or appended.
 */
function groupRows(rows: VcrRow[], cassette: string): Map<string, Map<string, VcrRow[]>> {
  const byAdapter = new Map<string, Map<string, VcrRow[]>>();
  for (const row of rows) {
    const forAdapter = byAdapter.get(row.adapterId) ?? new Map<string, VcrRow[]>();
    const occurrences = forAdapter.get(row.requestHash) ?? [];
    occurrences.push(row);
    forAdapter.set(row.requestHash, occurrences);
    byAdapter.set(row.adapterId, forAdapter);
  }
  for (const [adapterId, forAdapter] of byAdapter) {
    for (const [hash, occurrences] of forAdapter) {
      if (!occurrences.every((row) => row.occurrence !== undefined)) {
        continue;
      }
      occurrences.sort((a, b) => (a.occurrence ?? 0) - (b.occurrence ?? 0));
      for (let index = 1; index < occurrences.length; index += 1) {
        const number = occurrences[index]?.occurrence;
        if (number !== undefined && number === occurrences[index - 1]?.occurrence) {
          throw new ConfigError(
            `${cassette} records occurrence ${String(number)} twice for adapter ` +
              `'${adapterId}' hash ${hash.slice(0, 12)}; two recorder sessions likely wrote ` +
              'this cassette concurrently, so the replay order would be ambiguous; record ' +
              'the cassette again',
          );
        }
      }
    }
  }
  return byAdapter;
}

/**
 * Wraps live adapters for recording: every stream that completes with
 * exactly one terminal event (finish or error) appends one redacted
 * row to the cassette JSONL. A stream that ends without a terminal
 * (a requested abort or a truncated read), throws, or violates the
 * adapter contract (a second terminal, data after the terminal)
 * appends nothing, so a cassette row is always the record of one
 * completed exchange (v1.28.0 review P2). Every call also claims a
 * per `(adapterId, requestHash)` occurrence number synchronously in
 * the `stream()` call itself and persists it on the completed row,
 * so replay can restore the caller to response association even when
 * concurrent identical calls completed out of order (v1.31.0 review
 * P2). A later `record()` call on the same cassette file is an
 * appending session: the existing file is read and validated first
 * (a target that was never a cassette, a header whose hashVersion is
 * not the one this build records under, and a file whose occurrence
 * numbering is already ambiguous all refuse with a typed
 * ConfigError), and every hash counter is seeded past the numbers
 * already on disk, so the numbering continues where the file left
 * off instead of restarting at zero (v1.32.0 review P2). One
 * recorder session may be active on a cassette at a time: two
 * concurrently constructed recorders seed identically and claim
 * colliding numbers, which replay refuses as ambiguous instead of
 * silently serving either order. The numbering ends at
 * `Number.MAX_SAFE_INTEGER`: a group that already numbers it refuses
 * the appending session at construction, and a session whose counter
 * would pass it refuses that call before dispatching the provider,
 * both with a typed ConfigError and without touching the file,
 * because the next float increment would stall at 2 ** 53 and
 * silently duplicate one unsafe number on every following row
 * (v1.33.0 review P3). The wrapped adapters are drop-in:
 * same ids, providers, caps, and event streams.
 */
export function record(options: {
  adapters: ProviderAdapter[];
  cassette: string;
  redact?: RedactFn;
}): ProviderAdapter[] {
  const redact: RedactFn = options.redact
    ? (value) => defaultRedact(options.redact ? options.redact(value) : value)
    : defaultRedact;
  // An existing cassette is an appending session (v1.32.0 review P2):
  // read and validate it up front, refuse a target that was never a
  // cassette or whose header was recorded under a different
  // hashVersion (appending would mix two identity profiles under one
  // header), and seed every hash counter past the numbers already on
  // disk, so the numbering continues instead of restarting at zero.
  // groupRows also refuses a file whose numbering is already
  // ambiguous, because appending to it could only compound the
  // damage.
  const seeds = new Map<string, Map<string, number>>();
  if (existsSync(options.cassette)) {
    const existing = readCassette(options.cassette);
    if (existing.header.hashVersion !== CURRENT_HASH_VERSION) {
      throw new ConfigError(
        `${options.cassette} was recorded under hashVersion ` +
          `${String(existing.header.hashVersion)} and this build records under ` +
          `${String(CURRENT_HASH_VERSION)}; appending would mix two identity profiles ` +
          'under one header, so record the cassette again from scratch',
      );
    }
    for (const [adapterId, forAdapter] of groupRows(existing.rows, options.cassette)) {
      const forSeeds = new Map<string, number>();
      for (const [hash, rows] of forAdapter) {
        // One pass and no spread: `Math.max(...group)` overflows the
        // call stack once a group holds enough rows for the argument
        // list to exceed the runtime's stack budget (v1.33.0 review
        // P3). A group with no numbered rows seeds 0 (highest stays
        // at the -1 sentinel), same as before.
        let highest = -1;
        for (const row of rows) {
          if (row.occurrence !== undefined && row.occurrence > highest) {
            highest = row.occurrence;
          }
        }
        if (highest >= Number.MAX_SAFE_INTEGER) {
          throw new ConfigError(
            `${options.cassette} already numbers occurrence ` +
              `${String(Number.MAX_SAFE_INTEGER)} for adapter '${adapterId}' hash ` +
              `${hash.slice(0, 12)}; the numbering has reached the safe integer ceiling, ` +
              'so no further exchange for this request can be appended; record a fresh ' +
              'cassette instead',
          );
        }
        forSeeds.set(hash, highest + 1);
      }
      seeds.set(adapterId, forSeeds);
    }
  } else {
    writeFileSync(options.cassette, `${headerLine()}\n`, 'utf8');
  }
  return options.adapters.map((adapter) => {
    // One call counter per request hash, shared by every stream()
    // call on this wrapped adapter and seeded past the numbers an
    // existing cassette already holds (v1.32.0 review P2).
    const occurrences = new Map<string, number>(seeds.get(adapter.id) ?? []);
    return {
      ...adapter,
      id: adapter.id,
      ...(adapter.provider === undefined ? {} : { provider: adapter.provider }),
      caps: (model) => adapter.caps(model),
      stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
        // The occurrence number is claimed HERE, synchronously in the
        // stream() call itself, never at completion: rows are appended
        // in completion order, so two concurrent identical live calls
        // that finish out of order would otherwise swap callers at
        // replay, which hands occurrences out in caller order
        // (v1.31.0 review P2). A generator method would defer this
        // block to the first pull, hence the inner generator shape.
        const hash = requestHash(req);
        const occurrence = occurrences.get(hash) ?? 0;
        // The claim refuses past the safe range BEFORE the provider is
        // dispatched and before anything is appended: the counter
        // reaches 2 ** 53 after a call claims MAX_SAFE_INTEGER, and
        // float addition would stall there, silently writing the same
        // unsafe number on every following row and turning a valid
        // cassette into one readCassette refuses (v1.33.0 review P3).
        if (!Number.isSafeInteger(occurrence)) {
          throw new ConfigError(
            `${options.cassette} has no safe occurrence number left for adapter ` +
              `'${adapter.id}' hash ${hash.slice(0, 12)}; an earlier call in this session ` +
              `claimed ${String(Number.MAX_SAFE_INTEGER)}, so this exchange cannot be ` +
              'numbered; record a fresh cassette instead',
          );
        }
        occurrences.set(hash, occurrence + 1);
        return (async function* (): AsyncIterable<ChatEvent> {
          const events: ChatEvent[] = [];
          // The engine stops consuming at the first terminal event (the
          // adapter contract makes everything after it unreadable), which
          // closes this generator through return() the moment the terminal
          // is delivered. The append therefore lives in a finally block,
          // gated on the terminal count taken BEFORE the yield: a consumer
          // that stops at the terminal still commits the row, while an
          // aborted or truncated stream (no terminal), a thrown wire
          // failure, and a contract violating stream (a second terminal or
          // data after the terminal) append nothing, because a cassette
          // must never replay an exchange that was not observed complete
          // (v1.28.0 review P2). A skipped append leaves a gap in the
          // occurrence numbering, which replay treats as valid.
          let thrown = false;
          let terminals = 0;
          let postTerminal = false;
          try {
            for await (const event of adapter.stream(req, signal)) {
              if (terminals > 0) {
                postTerminal = true;
              }
              if (isTerminalEvent(event)) {
                terminals += 1;
              }
              events.push(event);
              yield event;
            }
          } catch (error) {
            thrown = true;
            throw error;
          } finally {
            if (!thrown && terminals === 1 && !postTerminal) {
              const row: VcrRow = {
                adapterId: adapter.id,
                ...(adapter.provider === undefined ? {} : { provider: adapter.provider }),
                ...(adapter.usageSemantics === undefined
                  ? {}
                  : { usageSemantics: adapter.usageSemantics }),
                occurrence,
                requestHash: hash,
                request: walkStrings(JSON.parse(JSON.stringify(req)), redact),
                events: walkStrings(JSON.parse(JSON.stringify(events)), redact) as ChatEvent[],
                caps: adapter.caps(req.model),
                model: req.model,
              };
              appendFileSync(options.cassette, `${JSON.stringify(row)}\n`, 'utf8');
            }
          }
        })();
      },
    };
  });
}

/**
 * Typed hermetic-miss error; onMiss: 'throw' raises it on any request
 * without a servable row. `recordedOccurrences` above zero means the
 * hash WAS recorded but every occurrence is already consumed (replay
 * serves each recorded exchange once, in recorded order); absent or
 * zero means the request was never recorded at all (v1.29.0 review
 * P2).
 */
export class VcrMissError extends Error {
  readonly requestHash: string;
  /** Rows recorded for this hash; absent or 0 = never recorded. */
  readonly recordedOccurrences?: number;
  constructor(adapterId: string, hash: string, recordedOccurrences?: number) {
    super(
      recordedOccurrences !== undefined && recordedOccurrences > 0
        ? `VCR miss: adapter '${adapterId}' exhausted the ` +
            `${String(recordedOccurrences)} recorded occurrence` +
            `${recordedOccurrences === 1 ? '' : 's'} of request hash ${hash.slice(0, 12)}; ` +
            'a replay serves each recorded exchange once, in recorded order'
        : `VCR miss: adapter '${adapterId}' received a request with no recorded row ` +
            `(hash ${hash.slice(0, 12)}); onMiss: 'throw' keeps cassette tests hermetic`,
    );
    this.name = 'VcrMissError';
    this.requestHash = hash;
    if (recordedOccurrences !== undefined) {
      this.recordedOccurrences = recordedOccurrences;
    }
  }
}

export interface VcrCassette {
  header: VcrHeader;
  rows: VcrRow[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const EFFORTS: readonly string[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] satisfies readonly Effort[];
const FINISH_REASONS: readonly string[] = [
  'stop',
  'tool-calls',
  'max-tokens',
  'context-window-exceeded',
  'refusal',
] satisfies readonly FinishInfo['reason'][];
const USAGE_COUNT_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
  'reasoningTokens',
] as const;

/**
 * First shape violation of a recorded caps snapshot, or undefined. The
 * checks mirror what ModelCaps declares (v1.30.0 review P3): before
 * this shipped an empty object passed as a snapshot and the failure
 * surfaced later as an unrelated router or pricing defect.
 */
function capsShapeIssue(caps: Record<string, unknown>): string | undefined {
  if (
    caps.structuredOutput !== 'native' &&
    caps.structuredOutput !== 'forced-tool' &&
    caps.structuredOutput !== 'prompt'
  ) {
    return "caps.structuredOutput must be 'native', 'forced-tool', or 'prompt'";
  }
  for (const field of ['supportsTemperature', 'supportsParallelTools'] as const) {
    if (typeof caps[field] !== 'boolean') {
      return `caps.${field} must be a boolean`;
    }
  }
  const efforts: unknown = caps.reasoningEfforts;
  if (
    !Array.isArray(efforts) ||
    efforts.some((entry) => typeof entry !== 'string' || !EFFORTS.includes(entry))
  ) {
    return 'caps.reasoningEfforts must be an array of canonical efforts';
  }
  for (const field of ['contextWindow', 'maxOutputTokens'] as const) {
    const value = caps[field];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
      return `caps.${field} must be a positive safe integer`;
    }
  }
  if (caps.pricing !== undefined) {
    const pricing: unknown = caps.pricing;
    if (!isPlainObject(pricing)) {
      return 'caps.pricing must be an object when present';
    }
    for (const field of ['inputUsdPerMTok', 'outputUsdPerMTok'] as const) {
      const value = pricing[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return `caps.pricing.${field} must be a nonnegative finite number`;
      }
    }
    for (const field of [
      'cacheReadUsdPerMTok',
      'cacheWriteUsdPerMTok',
      'cacheWrite1hUsdPerMTok',
    ] as const) {
      const value = pricing[field];
      if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
      ) {
        return `caps.pricing.${field} must be a nonnegative finite number when present`;
      }
    }
    const tiers: unknown = pricing.tiers;
    if (tiers !== undefined) {
      if (!Array.isArray(tiers)) {
        return 'caps.pricing.tiers must be an array when present';
      }
      for (const [index, tier] of (tiers as unknown[]).entries()) {
        const path = `caps.pricing.tiers[${String(index)}]`;
        if (!isPlainObject(tier)) {
          return `${path} must be an object`;
        }
        const above = tier.aboveInputTokens;
        if (typeof above !== 'number' || !Number.isSafeInteger(above) || above < 0) {
          return `${path}.aboveInputTokens must be a nonnegative safe integer`;
        }
        for (const field of ['inputMultiplier', 'outputMultiplier'] as const) {
          const value = tier[field];
          if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
            return `${path}.${field} must be a positive finite number`;
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * First shape violation of one recorded event, or undefined. Every
 * element must be a member of the canonical ChatEvent vocabulary with
 * its required payload (v1.30.0 review P3): before this shipped a
 * null element crashed replay with a raw TypeError and a bare
 * `{ type: 'finish' }` reached the engine, which then died on the
 * missing usage instead of refusing the cassette at its boundary.
 * Unknown extra FIELDS on a known event stay tolerated; an unknown
 * event TYPE is refused, because replay would feed it to an engine
 * whose vocabulary provably does not include it (the cassette format
 * version, not leniency here, is the growth path).
 */
function eventShapeIssue(event: unknown, index: number): string | undefined {
  const at = `events[${String(index)}]`;
  if (!isPlainObject(event)) {
    return `${at} must be an object (a canonical ChatEvent)`;
  }
  const type: unknown = event.type;
  switch (type) {
    case 'text-delta':
    case 'reasoning-delta':
      return typeof event.text === 'string' ? undefined : `${at}.text must be a string`;
    case 'tool-call-start':
      if (typeof event.id !== 'string' || event.id === '') {
        return `${at}.id must be a nonempty string`;
      }
      return typeof event.name === 'string' && event.name !== ''
        ? undefined
        : `${at}.name must be a nonempty string`;
    case 'tool-call-delta':
      if (typeof event.id !== 'string' || event.id === '') {
        return `${at}.id must be a nonempty string`;
      }
      return typeof event.argsTextDelta === 'string'
        ? undefined
        : `${at}.argsTextDelta must be a string`;
    case 'tool-call-end':
      if (typeof event.id !== 'string' || event.id === '') {
        return `${at}.id must be a nonempty string`;
      }
      // Any JSON value is a valid args payload, null included; only
      // ABSENCE is refused (v1.31.0 review P3). A live adapter that
      // yielded no serializable args cannot round trip through the
      // cassette, so replaying the row would serve an event that
      // differs from what the adapter emitted.
      return Object.hasOwn(event, 'args')
        ? undefined
        : `${at}.args must be present (the arguments the call ended with)`;
    case 'usage': {
      const usage: unknown = event.usage;
      if (!isPlainObject(usage)) {
        return `${at}.usage must be an object`;
      }
      for (const field of USAGE_COUNT_FIELDS) {
        const value = usage[field];
        if (
          value !== undefined &&
          (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        ) {
          return `${at}.usage.${field} must be a nonnegative safe integer when present`;
        }
      }
      return undefined;
    }
    case 'finish': {
      const finish: unknown = event.finish;
      if (!isPlainObject(finish)) {
        return `${at}.finish must be an object (a typed FinishInfo)`;
      }
      const reason: unknown = finish.reason;
      if (typeof reason !== 'string' || !FINISH_REASONS.includes(reason)) {
        return `${at}.finish.reason must be a canonical finish reason`;
      }
      if (reason === 'refusal') {
        const refusal: unknown = finish.refusal;
        if (!isPlainObject(refusal) || typeof refusal.provider !== 'string') {
          return `${at}.finish.refusal must be an object naming the provider`;
        }
        const stopDetails: unknown = refusal.stopDetails;
        if (stopDetails !== undefined) {
          if (!isPlainObject(stopDetails)) {
            return `${at}.finish.refusal.stopDetails must be an object when present`;
          }
          for (const field of ['type', 'category', 'explanation'] as const) {
            const value = stopDetails[field];
            if (value !== undefined && typeof value !== 'string') {
              return `${at}.finish.refusal.stopDetails.${field} must be a string when present`;
            }
          }
        }
      }
      if (event.providerMetadata !== undefined && !isPlainObject(event.providerMetadata)) {
        return `${at}.providerMetadata must be a plain object when present`;
      }
      const usage: unknown = event.usage;
      if (!isPlainObject(usage)) {
        return `${at}.usage must be an object (the full Usage of the exchange)`;
      }
      const violations = usageViolations(usage as Usage);
      return violations.length === 0
        ? undefined
        : `${at}.usage violates the Usage invariant: ${violations.join('; ')}`;
    }
    case 'error': {
      const error: unknown = event.error;
      if (!isPlainObject(error)) {
        return `${at}.error must be an object (a WireError)`;
      }
      if (typeof error.code !== 'string' || error.code === '') {
        return `${at}.error.code must be a nonempty string`;
      }
      if (typeof error.message !== 'string') {
        return `${at}.error.message must be a string`;
      }
      return typeof error.retryable === 'boolean'
        ? undefined
        : `${at}.error.retryable must be a boolean`;
    }
    default:
      return `${at}.type must be a canonical ChatEvent type; got ${
        typeof type === 'string' ? `'${type}'` : String(type)
      }`;
  }
}

/**
 * Parses a cassette file (one header line plus one JSON row per line).
 * The header must declare cassette format `v: 1`: the format version
 * gates parsing itself, while hashVersion (whose support window is
 * checked by replay) only gates request identity and never
 * substitutes for it, so a future incompatible format refuses loudly
 * instead of being read as v1. Every documented header field (kind,
 * v, an integer hashVersion, a date string recordedAt) and row field
 * (adapterId, model, requestHash, request, caps, events, an optional
 * string provider, an optional nonempty usageSemantics, an optional
 * nonnegative integer occurrence) is checked
 * here, and the nested structures are validated in depth (v1.30.0
 * review P3): the request must be a plain object, every event must
 * be a member of the canonical ChatEvent vocabulary with its
 * required payload and Usage numeric invariants, and caps must carry
 * every ModelCaps field (with the optional pricing table checked
 * when present). Unknown extra FIELDS are tolerated for forward
 * compatibility. Event stream SEMANTICS (one trailing terminal per
 * row) and adapter consistency across rows (provider,
 * usageSemantics, caps agreement) are deliberately not checked at
 * read time; `replay` enforces them before serving anything (v1.29.0
 * review P3), so reading never blocks inspecting a well formed file.
 * Parse and shape failures throw a typed ConfigError naming the
 * cassette path and line (v1.28.0 review P3).
 */
export function readCassette(path: string): VcrCassette {
  const numbered = readFileSync(path, 'utf8')
    .split('\n')
    .map((text, index) => ({ text, lineNo: index + 1 }))
    .filter(({ text }) => text.trim() !== '');
  const parse = (line: { text: string; lineNo: number }): unknown => {
    try {
      return JSON.parse(line.text);
    } catch {
      throw new ConfigError(
        `${path}:${String(line.lineNo)} is not valid JSON; the cassette is corrupt or truncated`,
      );
    }
  };
  const first = numbered[0];
  const headerRaw = (first === undefined ? {} : parse(first)) as {
    v?: unknown;
    kind?: unknown;
    hashVersion?: unknown;
    recordedAt?: unknown;
  };
  if (headerRaw.kind !== 'rulvar-vcr') {
    throw new ConfigError(`${path} is not a rulvar VCR cassette`);
  }
  if (headerRaw.v !== 1) {
    throw new ConfigError(
      `${path} declares cassette format v ${String(headerRaw.v)}; this build reads ` +
        'format v 1 only, so record the cassette again on a matching engine',
    );
  }
  if (typeof headerRaw.hashVersion !== 'number' || !Number.isSafeInteger(headerRaw.hashVersion)) {
    throw new ConfigError(
      `${path} header hashVersion must be an integer (the identity profile version every ` +
        `recorded cassette carries); got ${String(headerRaw.hashVersion)}`,
    );
  }
  if (typeof headerRaw.recordedAt !== 'string' || Number.isNaN(Date.parse(headerRaw.recordedAt))) {
    throw new ConfigError(
      `${path} header recordedAt must be a date string; got ${String(headerRaw.recordedAt)}`,
    );
  }
  const rows = numbered.slice(1).map((line) => {
    const parsed = parse(line);
    const reject = (what: string): never => {
      throw new ConfigError(`${path}:${String(line.lineNo)} is not a VCR row: ${what}`);
    };
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      reject('each row is a JSON object');
    }
    const row = parsed as VcrRow;
    if (typeof row.adapterId !== 'string' || row.adapterId === '') {
      reject('adapterId must be a nonempty string');
    }
    if (typeof row.requestHash !== 'string' || row.requestHash === '') {
      reject('requestHash must be a nonempty string');
    }
    if (typeof row.model !== 'string' || row.model === '') {
      reject('model must be a nonempty string');
    }
    if (row.provider !== undefined && typeof row.provider !== 'string') {
      reject('provider, when present, must be a string');
    }
    if (
      row.usageSemantics !== undefined &&
      (typeof row.usageSemantics !== 'string' || row.usageSemantics === '')
    ) {
      reject('usageSemantics, when present, must be a nonempty string');
    }
    if (
      row.occurrence !== undefined &&
      (typeof row.occurrence !== 'number' ||
        !Number.isSafeInteger(row.occurrence) ||
        row.occurrence < 0)
    ) {
      reject('occurrence, when present, must be a nonnegative safe integer');
    }
    if (typeof row.request !== 'object' || row.request === null || Array.isArray(row.request)) {
      reject('request must be an object (the redacted canonical request)');
    }
    if (typeof row.caps !== 'object' || row.caps === null || Array.isArray(row.caps)) {
      reject('caps must be an object (the model caps snapshot at record time)');
    }
    const capsIssue = capsShapeIssue(row.caps);
    if (capsIssue !== undefined) {
      reject(capsIssue);
    }
    if (!Array.isArray(row.events)) {
      reject('events must be an array');
    }
    const events: readonly unknown[] = row.events;
    for (const [index, event] of events.entries()) {
      const eventIssue = eventShapeIssue(event, index);
      if (eventIssue !== undefined) {
        reject(eventIssue);
      }
    }
    return row;
  });
  return { header: headerRaw as VcrHeader, rows };
}

/**
 * Builds replay adapters from a cassette. `onMiss: 'throw'` is the
 * hermetic CI mode; `'passthrough'` forwards unrecorded requests to the
 * matching live adapter in `adapters` (a development convenience only).
 *
 * Repeated hashes replay as ordered occurrences (v1.29.0 review P2):
 * rows sharing a `(adapterId, requestHash)` key form an ordered
 * occurrence list, and every `stream()` call consumes exactly one
 * occurrence, allocated synchronously inside the call itself, so two
 * concurrent identical requests can never be served the same
 * recorded exchange. The list is sorted by the recorded `occurrence`
 * numbers when every row of the group carries one, so concurrent
 * identical calls whose live completions were appended out of order
 * still replay to the callers that made them (v1.31.0 review P2); a
 * group with any unnumbered row (recorded before v1.32.0) keeps file
 * order. A duplicate occurrence inside a fully numbered group
 * refuses the whole cassette with a typed ConfigError naming the
 * adapter and hash: it means two recorder sessions wrote the file
 * concurrently, and serving either order would hand a caller the
 * wrong exchange (v1.32.0 review P2).
 * A call after the last occurrence is a miss: under `onMiss: 'throw'`
 * it raises a VcrMissError whose `recordedOccurrences` says the hash
 * WAS recorded but is exhausted, and under `'passthrough'` it
 * forwards to the live adapter exactly like a never-recorded request.
 *
 * Before serving anything, replay also enforces what `record` has
 * guaranteed since v1.29.0: every row's event stream ends with
 * exactly one terminal event (finish or error), and all caps
 * snapshots for one `(adapterId, model)` agree, since the replay
 * adapter can only report one caps truth per model. Violations throw
 * a typed ConfigError naming the cassette and row.
 *
 * The rebuilt adapter restores the recorded provider and
 * usageSemantics declarations (v1.30.0 review P2), so the fresh
 * journal of a replayed run carries the same provenance stamp the
 * recorded run got instead of silently reading like an entry from
 * before the stamp existed. All rows of one adapter must agree on
 * both declarations; a conflict refuses with a typed ConfigError
 * before anything is served. A cassette recorded before v1.31.0
 * stores no usageSemantics, so its replays stamp nothing (documented
 * historical laxity). Under `onMiss: 'passthrough'` the recorded
 * declarations must also match the live adapter's, absent versus
 * present included, because a live served miss is journaled under
 * the wrapper's declarations; a mismatch refuses at construction
 * (v1.31.0 review P2). An adapter with no recorded rows keeps the
 * live adapter's own declarations, so the wrapper stays a metadata
 * preserving drop in.
 */
export function replay(options: {
  cassette: string;
  onMiss: 'throw' | 'passthrough';
  /** Live adapters for the passthrough mode. */
  adapters?: ProviderAdapter[];
}): ProviderAdapter[] {
  const { header, rows } = readCassette(options.cassette);
  // A cassette recorded outside the engine's hashVersion support window
  // is stale by construction (journals of the same vintage cannot resume
  // either), so replay refuses loudly instead of silently drifting.
  const oldestSupported = CURRENT_HASH_VERSION - 1;
  if (header.hashVersion < oldestSupported || header.hashVersion > CURRENT_HASH_VERSION) {
    throw new ConfigError(
      `${options.cassette} was recorded under hashVersion ${String(header.hashVersion)}, ` +
        `outside the supported window [${oldestSupported}, ${CURRENT_HASH_VERSION}]; ` +
        'record the cassette again on a current engine',
    );
  }
  rows.forEach((row, index) => {
    const terminals = row.events.filter((event) => isTerminalEvent(event)).length;
    const last = row.events[row.events.length - 1];
    if (terminals !== 1 || last === undefined || !isTerminalEvent(last)) {
      throw new ConfigError(
        `${options.cassette} row ${String(index + 1)} (adapter '${row.adapterId}', hash ` +
          `${row.requestHash.slice(0, 12)}) does not record one completed exchange: expected ` +
          `exactly one trailing terminal event (finish or error), found ${String(terminals)}; ` +
          'record the cassette again on a current engine',
      );
    }
  });
  // Grouping and ordering live in groupRows (shared with an appending
  // record session), which also refuses a duplicate occurrence inside
  // a fully numbered group as ambiguous (v1.32.0 review P2).
  const byAdapter = groupRows(rows, options.cassette);
  const live = new Map((options.adapters ?? []).map((adapter) => [adapter.id, adapter]));
  const adapterIds = new Set<string>([...byAdapter.keys(), ...live.keys()]);
  return [...adapterIds].map((adapterId) => {
    const recorded = byAdapter.get(adapterId) ?? new Map<string, VcrRow[]>();
    const recordedRows = [...recorded.values()].flat();
    const someRow = recordedRows[0];
    const capsByModel = new Map<string, { caps: ModelCaps; canonical: string }>();
    for (const row of recordedRows) {
      const canonical = canonicalJson(row.caps);
      const existing = capsByModel.get(row.model);
      if (existing === undefined) {
        capsByModel.set(row.model, { caps: row.caps, canonical });
      } else if (existing.canonical !== canonical) {
        throw new ConfigError(
          `${options.cassette} carries conflicting caps snapshots for adapter ` +
            `'${adapterId}' model '${row.model}'; a replay adapter reports one caps truth ` +
            'per model, so record the cassette again in one session',
        );
      }
    }
    for (const field of ['provider', 'usageSemantics'] as const) {
      const values = [...new Set(recordedRows.map((row) => row[field]))];
      if (values.length > 1) {
        throw new ConfigError(
          `${options.cassette} carries conflicting ${field} values for adapter '${adapterId}' ` +
            `(${values
              .map((value) => (value === undefined ? 'absent' : `'${value}'`))
              .join(', ')}); a replay adapter reports one declaration per adapter, so record ` +
            'the cassette again in one session',
        );
      }
    }
    const passthrough = live.get(adapterId);
    // The engine journals every response served through this wrapper
    // under the wrapper's own declarations, and under onMiss:
    // 'passthrough' that includes live served misses. The recorded
    // rows and the live adapter must therefore agree on provider and
    // usageSemantics, absent versus present included, or a live
    // response would carry a stale recorded stamp (v1.31.0 review
    // P2). Under onMiss: 'throw' the live adapter only backs caps
    // lookups and never serves, so no agreement is demanded there.
    if (someRow !== undefined && passthrough !== undefined && options.onMiss === 'passthrough') {
      for (const field of ['provider', 'usageSemantics'] as const) {
        if (someRow[field] !== passthrough[field]) {
          const describe = (value: string | undefined): string =>
            value === undefined ? 'absent' : `'${value}'`;
          throw new ConfigError(
            `${options.cassette} records ${field} ${describe(someRow[field])} for adapter ` +
              `'${adapterId}' but the live passthrough adapter declares ` +
              `${describe(passthrough[field])}; the engine journals live served misses under ` +
              'the replay adapter declaration, so replay with a matching adapter or record ' +
              'the cassette again',
          );
        }
      }
    }
    // An adapter with no recorded rows keeps the live adapter's own
    // declarations, so wrapping stays metadata preserving.
    const declared = someRow ?? passthrough;
    // One cursor per hash, shared by every run on this adapter set:
    // occurrences are consumed once each, in recorded order.
    const cursors = new Map<string, number>();
    return {
      id: adapterId,
      ...(declared?.provider === undefined ? {} : { provider: declared.provider }),
      ...(declared?.usageSemantics === undefined
        ? {}
        : { usageSemantics: declared.usageSemantics }),
      caps: (model: string): ModelCaps => {
        const snapshot = capsByModel.get(model)?.caps ?? passthrough?.caps(model);
        if (snapshot === undefined) {
          throw new ConfigError(
            `VCR replay adapter '${adapterId}' has no caps snapshot for model '${model}'`,
          );
        }
        return snapshot;
      },
      stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
        // The occurrence is allocated HERE, synchronously in the
        // stream() call, not at first pull: concurrent identical
        // requests each claim their own row before any of them yields.
        const hash = requestHash(req);
        const occurrences = recorded.get(hash);
        let row: VcrRow | undefined;
        if (occurrences !== undefined) {
          const cursor = cursors.get(hash) ?? 0;
          if (cursor < occurrences.length) {
            cursors.set(hash, cursor + 1);
            row = occurrences[cursor];
          }
        }
        const recordedCount = occurrences?.length;
        // The miss still surfaces lazily (at first pull), matching how
        // a live adapter fails inside its stream.
        return (async function* (): AsyncIterable<ChatEvent> {
          if (row !== undefined) {
            for (const event of row.events) {
              yield event;
            }
            return;
          }
          if (options.onMiss === 'passthrough' && passthrough !== undefined) {
            yield* passthrough.stream(req, signal);
            return;
          }
          throw new VcrMissError(adapterId, hash, recordedCount);
        })();
      },
    };
  });
}
