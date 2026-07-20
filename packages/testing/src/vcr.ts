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
 * Wraps live adapters for recording: every stream that completes with
 * exactly one terminal event (finish or error) appends one redacted
 * row to the cassette JSONL. A stream that ends without a terminal
 * (a requested abort or a truncated read), throws, or violates the
 * adapter contract (a second terminal, data after the terminal)
 * appends nothing, so a cassette row is always the record of one
 * completed exchange (v1.28.0 review P2). The wrapped adapters are
 * drop-in: same ids, providers, caps, and event streams.
 */
export function record(options: {
  adapters: ProviderAdapter[];
  cassette: string;
  redact?: RedactFn;
}): ProviderAdapter[] {
  const redact: RedactFn = options.redact
    ? (value) => defaultRedact(options.redact ? options.redact(value) : value)
    : defaultRedact;
  if (!existsSync(options.cassette)) {
    writeFileSync(options.cassette, `${headerLine()}\n`, 'utf8');
  }
  return options.adapters.map((adapter) => ({
    ...adapter,
    id: adapter.id,
    ...(adapter.provider === undefined ? {} : { provider: adapter.provider }),
    caps: (model) => adapter.caps(model),
    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
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
      // (v1.28.0 review P2).
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
            requestHash: requestHash(req),
            request: walkStrings(JSON.parse(JSON.stringify(req)), redact),
            events: walkStrings(JSON.parse(JSON.stringify(events)), redact) as ChatEvent[],
            caps: adapter.caps(req.model),
            model: req.model,
          };
          appendFileSync(options.cassette, `${JSON.stringify(row)}\n`, 'utf8');
        }
      }
    },
  }));
}

/**
 * Typed hermetic-miss error; onMiss: 'throw' raises it on any request
 * without a servable row. `recordedOccurrences` above zero means the
 * hash WAS recorded but every occurrence is already consumed (replay
 * serves each recorded exchange once, in file order); absent or zero
 * means the request was never recorded at all (v1.29.0 review P2).
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
            'a replay serves each recorded exchange once, in file order'
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
      return typeof event.id === 'string' && event.id !== ''
        ? undefined
        : `${at}.id must be a nonempty string`;
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
 * string provider, an optional nonempty usageSemantics) is checked
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
 * Repeated hashes replay in file order (v1.29.0 review P2): rows
 * sharing a `(adapterId, requestHash)` key form an ordered occurrence
 * list, and every `stream()` call consumes exactly one occurrence,
 * allocated synchronously inside the call itself, so two concurrent
 * identical requests can never be served the same recorded exchange.
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
 * historical laxity).
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
  const byAdapter = new Map<string, Map<string, VcrRow[]>>();
  for (const row of rows) {
    const forAdapter = byAdapter.get(row.adapterId) ?? new Map<string, VcrRow[]>();
    const occurrences = forAdapter.get(row.requestHash) ?? [];
    occurrences.push(row);
    forAdapter.set(row.requestHash, occurrences);
    byAdapter.set(row.adapterId, forAdapter);
  }
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
    // One cursor per hash, shared by every run on this adapter set:
    // occurrences are consumed once each, in file order.
    const cursors = new Map<string, number>();
    return {
      id: adapterId,
      ...(someRow?.provider === undefined ? {} : { provider: someRow.provider }),
      ...(someRow?.usageSemantics === undefined ? {} : { usageSemantics: someRow.usageSemantics }),
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
