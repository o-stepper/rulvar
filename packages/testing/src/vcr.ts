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
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
} from '@rulvar/core';

/** One recorded exchange; a cassette is one JSON header line plus rows. */
export interface VcrRow {
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

function headerLine(): string {
  return JSON.stringify({
    v: 1,
    kind: 'rulvar-vcr',
    hashVersion: CURRENT_HASH_VERSION,
    recordedAt: new Date().toISOString(),
  } satisfies VcrHeader);
}

/**
 * Wraps live adapters for recording: every completed stream appends one
 * redacted row to the cassette JSONL. The wrapped adapters are drop-in:
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
      // is delivered. The append therefore lives in a finally block so
      // a consumer that stops at the terminal still commits the row; a
      // thrown wire failure keeps the previous no row semantics.
      let thrown = false;
      try {
        for await (const event of adapter.stream(req, signal)) {
          events.push(event);
          yield event;
        }
      } catch (error) {
        thrown = true;
        throw error;
      } finally {
        if (!thrown) {
          const row: VcrRow = {
            adapterId: adapter.id,
            ...(adapter.provider === undefined ? {} : { provider: adapter.provider }),
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

/** Typed hermetic-miss error; onMiss: 'throw' raises it on any unrecorded request. */
export class VcrMissError extends Error {
  readonly requestHash: string;
  constructor(adapterId: string, hash: string) {
    super(
      `VCR miss: adapter '${adapterId}' received a request with no recorded row ` +
        `(hash ${hash.slice(0, 12)}); onMiss: 'throw' keeps cassette tests hermetic`,
    );
    this.name = 'VcrMissError';
    this.requestHash = hash;
  }
}

export interface VcrCassette {
  header: VcrHeader;
  rows: VcrRow[];
}

/** Parses a cassette file (one header line plus one JSON row per line). */
export function readCassette(path: string): VcrCassette {
  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '');
  const header = JSON.parse(lines[0] ?? '{}') as VcrHeader;
  if (header.kind !== 'rulvar-vcr') {
    throw new ConfigError(`${path} is not a rulvar VCR cassette`);
  }
  const rows = lines.slice(1).map((line) => JSON.parse(line) as VcrRow);
  return { header, rows };
}

/**
 * Builds replay adapters from a cassette. `onMiss: 'throw'` is the
 * hermetic CI mode; `'passthrough'` forwards unrecorded requests to the
 * matching live adapter in `adapters` (a development convenience only).
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
  if (
    typeof header.hashVersion !== 'number' ||
    header.hashVersion < oldestSupported ||
    header.hashVersion > CURRENT_HASH_VERSION
  ) {
    throw new ConfigError(
      `${options.cassette} was recorded under hashVersion ${String(header.hashVersion)}, ` +
        `outside the supported window [${oldestSupported}, ${CURRENT_HASH_VERSION}]; ` +
        'record the cassette again on a current engine',
    );
  }
  const byAdapter = new Map<string, Map<string, VcrRow>>();
  for (const row of rows) {
    const forAdapter = byAdapter.get(row.adapterId) ?? new Map<string, VcrRow>();
    forAdapter.set(row.requestHash, row);
    byAdapter.set(row.adapterId, forAdapter);
  }
  const live = new Map((options.adapters ?? []).map((adapter) => [adapter.id, adapter]));
  const adapterIds = new Set<string>([...byAdapter.keys(), ...live.keys()]);
  return [...adapterIds].map((adapterId) => {
    const recorded = byAdapter.get(adapterId) ?? new Map<string, VcrRow>();
    const passthrough = live.get(adapterId);
    const someRow = [...recorded.values()][0];
    const capsByModel = new Map<string, ModelCaps>();
    for (const row of recorded.values()) {
      capsByModel.set(row.model, row.caps);
    }
    return {
      id: adapterId,
      ...(someRow?.provider === undefined ? {} : { provider: someRow.provider }),
      caps: (model: string): ModelCaps => {
        const snapshot = capsByModel.get(model) ?? passthrough?.caps(model);
        if (snapshot === undefined) {
          throw new ConfigError(
            `VCR replay adapter '${adapterId}' has no caps snapshot for model '${model}'`,
          );
        }
        return snapshot;
      },
      async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
        const hash = requestHash(req);
        const row = recorded.get(hash);
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
        throw new VcrMissError(adapterId, hash);
      },
    };
  });
}
