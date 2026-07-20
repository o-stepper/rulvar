/**
 * Canonical-to-wire mapping for the July 2026 Anthropic Messages API
 * (M1-T12): request building (system split, tools with strict, the
 * output_config umbrella, adaptive thinking, cache_control compilation),
 * the SSE-to-ChatEvent stream mapper with pause_turn absorption, the full
 * stop-reason table, and usage normalization under the Usage invariant.
 *
 * Adapter contract: https://docs.rulvar.com/guide/adapter-authors.
 * Pure functions; the adapter glue in adapter.ts owns the SDK client.
 */
import {
  isStrictCompatibleSchema,
  type CacheHint,
  type CanonicalId,
  type ChatEvent,
  type ChatRequest,
  type FinishInfo,
  type Usage,
  type WireError,
} from '@rulvar/core';

/** Bijective canonical-to-wire tool-call id map. */
export class IdMap {
  private readonly toWire = new Map<CanonicalId, string>();
  private readonly toCanonical = new Map<string, CanonicalId>();
  private readonly mint: () => CanonicalId;

  constructor(mint: () => CanonicalId) {
    this.mint = mint;
  }

  canonicalFor(wireId: string): CanonicalId {
    const existing = this.toCanonical.get(wireId);
    if (existing !== undefined) {
      return existing;
    }
    const canonical = this.mint();
    this.toCanonical.set(wireId, canonical);
    this.toWire.set(canonical, wireId);
    return canonical;
  }

  wireFor(canonicalId: CanonicalId): string {
    const existing = this.toWire.get(canonicalId);
    if (existing !== undefined) {
      return existing;
    }
    // A canonical id minted outside this provider: the wire id sent in
    // replayed history only needs to pair tool_use with tool_result.
    const wireId = `toolu_${canonicalId}`;
    this.toWire.set(canonicalId, wireId);
    this.toCanonical.set(wireId, canonicalId);
    return wireId;
  }
}

/** A raw Messages API content block, structurally typed. */
export type Block = Record<string, unknown>;

/**
 * Keywords the constrained-decoding schema validator rejects with a
 * live 400 ("For 'integer' type, property 'minimum' is not
 * supported"): every numeric bound plus, asymmetrically, maxItems
 * (minItems, the string bounds, pattern, format, enum and const all
 * pass). The validator guards exactly two wire positions: tools sent
 * with strict: true and output_config.format json_schema; plain tools
 * accept full JSON Schema. Probed live on claude-sonnet-5, 2026-07-11.
 * The engine still validates tool args and
 * structured output against the UNSCRUBBED schema, so the dropped
 * keywords stay enforced; only the model-side hint is lost.
 */
const CONSTRAINED_DECODING_UNSUPPORTED = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'maxItems',
]);

/** Keywords whose value is a map of property NAMES to schemas. */
const SCHEMA_MAP_KEYWORDS = new Set(['properties', 'patternProperties', '$defs', 'definitions']);
/** Keywords whose value is a schema or an array of schemas. */
const SCHEMA_VALUE_KEYWORDS = new Set([
  'items',
  'prefixItems',
  'additionalProperties',
  'additionalItems',
  'propertyNames',
  'contains',
  'anyOf',
  'oneOf',
  'allOf',
  'not',
  'if',
  'then',
  'else',
]);

/**
 * Returns a deep copy of the schema with the unsupported keywords
 * removed at SCHEMA positions only: a property literally named
 * "minimum" (a key inside `properties`) survives. The input is never
 * mutated; unrecognized keywords are copied through untouched.
 */
export function scrubForConstrainedDecoding(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((entry) => scrubForConstrainedDecoding(entry));
  }
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (CONSTRAINED_DECODING_UNSUPPORTED.has(key)) {
      continue;
    }
    if (SCHEMA_MAP_KEYWORDS.has(key) && value !== null && typeof value === 'object') {
      const map: Record<string, unknown> = {};
      for (const [name, sub] of Object.entries(value as Record<string, unknown>)) {
        map[name] = scrubForConstrainedDecoding(sub);
      }
      out[key] = map;
      continue;
    }
    if (SCHEMA_VALUE_KEYWORDS.has(key)) {
      out[key] = scrubForConstrainedDecoding(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

const CACHE_BREAKPOINT_CAP = 4;

function cacheControl(ttl?: '5m' | '1h'): Block {
  return ttl === '1h' ? { type: 'ephemeral', ttl: '1h' } : { type: 'ephemeral' };
}

/**
 * Builds Messages API params from a ChatRequest. cacheHint compiles into
 * cache_control breakpoints; beyond the provider cap of 4 the DEEPEST
 * breakpoints are kept and the shallowest dropped, deterministically.
 */
export function buildAnthropicParams(
  req: ChatRequest,
  options: {
    ids: IdMap;
    maxOutputTokens: number;
    thinkingForm: 'adaptive' | 'enabled-budget';
  },
): Record<string, unknown> {
  const systemBlocks: Block[] = [];
  const messages: Block[] = [];

  for (const msg of req.messages) {
    if (msg.role === 'system') {
      for (const part of msg.parts) {
        if (part.type === 'text') {
          systemBlocks.push({ type: 'text', text: part.text });
        }
      }
      continue;
    }
    const content: Block[] = [];
    for (const part of msg.parts) {
      switch (part.type) {
        case 'text':
          content.push({ type: 'text', text: part.text });
          break;
        case 'image':
          content.push({
            type: 'image',
            source:
              typeof part.data === 'string' && part.data.startsWith('http')
                ? { type: 'url', url: part.data }
                : {
                    type: 'base64',
                    media_type: part.mediaType,
                    data:
                      typeof part.data === 'string'
                        ? part.data
                        : Buffer.from(part.data).toString('base64'),
                  },
          });
          break;
        case 'tool-call':
          content.push({
            type: 'tool_use',
            id: options.ids.wireFor(part.id),
            name: part.name,
            input: part.args ?? {},
          });
          break;
        case 'tool-result':
          content.push({
            type: 'tool_result',
            tool_use_id: options.ids.wireFor(part.id),
            content:
              typeof part.result === 'string' ? part.result : JSON.stringify(part.result ?? null),
            ...(part.isError === true ? { is_error: true } : {}),
          });
          break;
        case 'provider-raw':
          // Retention is unconditional; projection sends anthropic blocks
          // to anthropic targets byte-exact and never strips client-side.
          if (part.provider === 'anthropic') {
            content.push(part.block as Block);
          }
          break;
      }
    }
    messages.push({ role: msg.role === 'tool' ? 'user' : msg.role, content });
  }

  const params: Record<string, unknown> = {
    model: req.model,
    max_tokens: req.maxOutputTokens ?? options.maxOutputTokens,
    messages,
  };
  if (systemBlocks.length > 0) {
    params.system = systemBlocks;
  }
  if (req.stopSequences !== undefined) {
    params.stop_sequences = req.stopSequences;
  }

  if (req.tools !== undefined) {
    params.tools = req.tools.map((tool) => {
      // Strict tool use is a top-level field on the tool definition, never
      // on tool_choice; strict schemas need additionalProperties: false
      // and full required. Strict engages the
      // constrained-decoding validator, so the wire copy is scrubbed;
      // non-strict tools keep the full schema as model-side hints.
      const strict = isStrictCompatibleSchema(tool.parameters);
      return {
        name: tool.name,
        description: tool.description,
        input_schema: strict ? scrubForConstrainedDecoding(tool.parameters) : tool.parameters,
        ...(strict ? { strict: true } : {}),
      };
    });
    if (req.toolChoice === 'required') {
      params.tool_choice = { type: 'any' };
    } else if (typeof req.toolChoice === 'object') {
      params.tool_choice = { type: 'tool', name: req.toolChoice.name };
    } else if (req.toolChoice === 'auto') {
      params.tool_choice = { type: 'auto' };
    } else if (req.toolChoice === 'none') {
      // Explicit none with the tools param PRESENT: tool-use history
      // without tool definitions is rejected by the API, and finalize
      // and extract project such histories (M4-T01).
      params.tool_choice = { type: 'none' };
    }
  }

  const anthropicOptions = req.providerOptions?.anthropic ?? {};

  // The output_config umbrella: effort passthrough (including max), the
  // native structured-output format, task_budget via providerOptions.
  // The deprecated top-level output_format is
  // never used.
  const outputConfig: Block = {};
  if (req.effort !== undefined) {
    outputConfig.effort = req.effort;
  }
  if (req.schema !== undefined) {
    // The format schema always passes the constrained-decoding
    // validator, strict-shaped or not: scrub unconditionally.
    outputConfig.format = { type: 'json_schema', schema: scrubForConstrainedDecoding(req.schema) };
  }
  if (anthropicOptions.task_budget !== undefined) {
    outputConfig.task_budget = anthropicOptions.task_budget;
  }
  if (Object.keys(outputConfig).length > 0) {
    params.output_config = outputConfig;
  }

  // Current models accept only adaptive thinking; explicit disabled is a
  // 400 on Fable 5, so disabling means omitting the field.
  // The enabled/budget form stays available to the 4.6
  // generation through providerOptions.
  if (anthropicOptions.thinking !== undefined) {
    params.thinking = anthropicOptions.thinking;
  } else if (options.thinkingForm === 'adaptive') {
    const display = anthropicOptions.thinkingDisplay;
    params.thinking =
      typeof display === 'string' ? { type: 'adaptive', display } : { type: 'adaptive' };
  }

  // Sampling parameters reach the wire only through providerOptions and
  // only for models whose caps allow them; the router scrubs the rest.
  for (const key of ['temperature', 'top_p', 'top_k'] as const) {
    if (anthropicOptions[key] !== undefined) {
      params[key] = anthropicOptions[key];
    }
  }

  applyCacheHint(params, req.cacheHint);
  return params;
}

function applyCacheHint(params: Record<string, unknown>, hint?: CacheHint): void {
  if (hint === undefined || hint.breakpoints.length === 0) {
    return;
  }
  // Render order is tools, then system, then messages; keep the DEEPEST
  // breakpoints when over the cap.
  const kept = hint.breakpoints.slice(-CACHE_BREAKPOINT_CAP);
  const tools = params.tools as Block[] | undefined;
  const system = params.system as Block[] | undefined;
  const messages = params.messages as Block[];
  for (const breakpoint of kept) {
    const control = cacheControl(breakpoint.ttl);
    if (breakpoint.after === 'tools') {
      const last = tools?.[tools.length - 1];
      if (last !== undefined) {
        last.cache_control = control;
      }
    } else if (breakpoint.after === 'system') {
      const last = system?.[system.length - 1];
      if (last !== undefined) {
        last.cache_control = control;
      }
    } else {
      const message = messages[breakpoint.after.messageIndex];
      const content = message?.content as Block[] | undefined;
      const last = content?.[content.length - 1];
      if (last !== undefined) {
        last.cache_control = control;
      }
    }
  }
}

/** Raw Messages API stream events, structurally typed. */
export type AnthropicStreamEvent = Record<string, unknown> & { type: string };

export interface MappedStop {
  finish?: FinishInfo;
  pauseTurn: boolean;
}

/**
 * The stop-reason table. pause_turn never surfaces as
 * a canonical finish: the adapter continues internally.
 */
export function mapStopReason(
  stopReason: string | null | undefined,
  stopDetails: Record<string, unknown> | null | undefined,
): MappedStop {
  switch (stopReason) {
    case 'end_turn':
    case 'stop_sequence':
      return { finish: { reason: 'stop' }, pauseTurn: false };
    case 'tool_use':
      return { finish: { reason: 'tool-calls' }, pauseTurn: false };
    case 'max_tokens':
      return { finish: { reason: 'max-tokens' }, pauseTurn: false };
    case 'model_context_window_exceeded':
      return { finish: { reason: 'context-window-exceeded' }, pauseTurn: false };
    case 'refusal': {
      const refusal: FinishInfo = {
        reason: 'refusal',
        refusal: {
          provider: 'anthropic',
          ...(stopDetails === null || stopDetails === undefined
            ? {}
            : {
                stopDetails: {
                  ...(typeof stopDetails.type === 'string' ? { type: stopDetails.type } : {}),
                  ...(typeof stopDetails.category === 'string'
                    ? { category: stopDetails.category }
                    : {}),
                  ...(typeof stopDetails.explanation === 'string'
                    ? { explanation: stopDetails.explanation }
                    : {}),
                },
              }),
        },
      };
      return { finish: refusal, pauseTurn: false };
    }
    case 'pause_turn':
      return { pauseTurn: true };
    default:
      return { finish: { reason: 'stop' }, pauseTurn: false };
  }
}

/**
 * Normalizes Messages API usage under the Usage invariant: Anthropic
 * reports input_tokens EXCLUDING cache reads and writes, so the canonical
 * inputTokens is the sum of all three.
 */
export function normalizeAnthropicUsage(raw: Record<string, unknown> | undefined): Usage {
  const input = typeof raw?.input_tokens === 'number' ? raw.input_tokens : 0;
  const output = typeof raw?.output_tokens === 'number' ? raw.output_tokens : 0;
  const cacheRead =
    typeof raw?.cache_read_input_tokens === 'number' ? raw.cache_read_input_tokens : 0;
  const cacheWrite =
    typeof raw?.cache_creation_input_tokens === 'number' ? raw.cache_creation_input_tokens : 0;
  return {
    inputTokens: input + cacheRead + cacheWrite,
    outputTokens: output,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
  };
}

export interface TurnMapping {
  /** Assistant content blocks collected verbatim (pause_turn continuation). */
  assistantContent: Block[];
  pauseTurn: boolean;
  finished: boolean;
}

/**
 * Maps one Messages API stream into ChatEvents, yielding each canonical
 * event AS the corresponding provider event is consumed: the consumer's
 * pull drives the provider read (natural backpressure, no buffering, no
 * detached work). The generator's RETURN value carries the accumulated
 * turn state the adapter needs for pause_turn continuation. Yields an
 * early usage event from message_start (the input side is known
 * immediately) and exactly one terminal finish unless the turn paused
 * (pause_turn) or errored. `carryRetained` holds thinking blocks from
 * earlier pause_turn continuations of the same turn so the terminal
 * finish ships the whole turn's retention payload (M4-T02).
 */
export async function* mapAnthropicStream(
  stream: AsyncIterable<AnthropicStreamEvent>,
  ids: IdMap,
  options?: { carryRetained?: Block[] },
): AsyncGenerator<ChatEvent, TurnMapping> {
  const mapping: TurnMapping = {
    assistantContent: [],
    pauseTurn: false,
    finished: false,
  };

  let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  let stopReason: string | undefined;
  let stopSequence: string | undefined;
  let stopDetails: Record<string, unknown> | undefined;
  let responseId: string | undefined;
  const openBlocks = new Map<
    number,
    {
      kind: 'text' | 'thinking' | 'tool_use' | 'other';
      canonicalId?: CanonicalId;
      json: string;
      block: Block;
    }
  >();

  for await (const event of stream) {
    switch (event.type) {
      case 'message_start': {
        const message = event.message as Record<string, unknown> | undefined;
        responseId = typeof message?.id === 'string' ? message.id : undefined;
        usage = normalizeAnthropicUsage(message?.usage as Record<string, unknown> | undefined);
        yield { type: 'usage', usage: { ...usage } };
        break;
      }
      case 'content_block_start': {
        const index = event.index as number;
        const block = event.content_block as Block;
        const type = block.type as string;
        if (type === 'tool_use') {
          const wireId = block.id as string;
          const canonicalId = ids.canonicalFor(wireId);
          openBlocks.set(index, { kind: 'tool_use', canonicalId, json: '', block: { ...block } });
          yield { type: 'tool-call-start', id: canonicalId, name: block.name as string };
        } else if (type === 'thinking' || type === 'redacted_thinking') {
          openBlocks.set(index, { kind: 'thinking', json: '', block: { ...block } });
        } else if (type === 'text') {
          openBlocks.set(index, { kind: 'text', json: '', block: { ...block, text: '' } });
        } else {
          openBlocks.set(index, { kind: 'other', json: '', block: { ...block } });
        }
        break;
      }
      case 'content_block_delta': {
        const index = event.index as number;
        const delta = event.delta as Block;
        const open = openBlocks.get(index);
        if (open === undefined) {
          break;
        }
        if (delta.type === 'text_delta') {
          const text = delta.text as string;
          open.block.text = `${(open.block.text as string) ?? ''}${text}`;
          yield { type: 'text-delta', text };
        } else if (delta.type === 'thinking_delta') {
          const text = delta.thinking as string;
          open.block.thinking = `${(open.block.thinking as string) ?? ''}${text}`;
          yield { type: 'reasoning-delta', text };
        } else if (delta.type === 'input_json_delta') {
          const partial = delta.partial_json as string;
          open.json += partial;
          if (open.canonicalId !== undefined) {
            yield { type: 'tool-call-delta', id: open.canonicalId, argsTextDelta: partial };
          }
        } else if (delta.type === 'signature_delta') {
          open.block.signature = `${(open.block.signature as string) ?? ''}${delta.signature as string}`;
        }
        break;
      }
      case 'content_block_stop': {
        const index = event.index as number;
        const open = openBlocks.get(index);
        if (open === undefined) {
          break;
        }
        openBlocks.delete(index);
        if (open.kind === 'tool_use' && open.canonicalId !== undefined) {
          let args: unknown = {};
          try {
            args = open.json === '' ? {} : JSON.parse(open.json);
          } catch {
            args = { __unparsed: open.json };
          }
          open.block.input = args;
          yield { type: 'tool-call-end', id: open.canonicalId, args };
        }
        mapping.assistantContent.push(open.block);
        break;
      }
      case 'message_delta': {
        const delta = event.delta as Record<string, unknown> | undefined;
        if (typeof delta?.stop_reason === 'string') {
          stopReason = delta.stop_reason;
        }
        if (typeof delta?.stop_sequence === 'string') {
          stopSequence = delta.stop_sequence;
        }
        if (delta?.stop_details !== undefined && delta.stop_details !== null) {
          stopDetails = delta.stop_details as Record<string, unknown>;
        }
        const deltaUsage = event.usage as Record<string, unknown> | undefined;
        if (typeof deltaUsage?.output_tokens === 'number') {
          usage = { ...usage, outputTokens: deltaUsage.output_tokens };
        }
        break;
      }
      case 'message_stop': {
        const mapped = mapStopReason(stopReason, stopDetails);
        if (mapped.pauseTurn) {
          mapping.pauseTurn = true;
          return mapping;
        }
        const providerMetadata: Record<string, unknown> = { anthropic: {} };
        const meta = providerMetadata.anthropic as Record<string, unknown>;
        if (responseId !== undefined) {
          meta.responseId = responseId;
        }
        if (stopSequence !== undefined) {
          meta.stopSequence = stopSequence;
        }
        // Retention transport: thinking blocks
        // with signatures MUST be echoed byte-exact back to Anthropic
        // targets; ship the whole turn's blocks (earlier pause_turn
        // continuations included) in stream order.
        const retained = [
          ...(options?.carryRetained ?? []),
          ...mapping.assistantContent.filter(
            (block) => block.type === 'thinking' || block.type === 'redacted_thinking',
          ),
        ];
        if (retained.length > 0) {
          meta.retainedParts = retained;
        }
        yield {
          type: 'finish',
          finish: mapped.finish ?? { reason: 'stop' },
          usage,
          providerMetadata,
        };
        mapping.finished = true;
        return mapping;
      }
      default:
        break;
    }
  }
  return mapping;
}

/**
 * Projects an SDK/API error into the retryable WireError vocabulary:
 * 429 rate limits surface retryAfterMs and the x-ratelimit-* buckets; 529
 * overloaded and 5xx are retryable transport; everything else is terminal
 * transport. Adapters never sleep internally.
 */
export function anthropicErrorToWire(error: unknown): WireError {
  const record = error as {
    status?: number;
    message?: string;
    headers?: Record<string, string> | Headers;
  };
  const status = typeof record.status === 'number' ? record.status : undefined;
  const message = typeof record.message === 'string' ? record.message : String(error);
  const headerGet = (name: string): string | undefined => {
    const headers = record.headers;
    if (headers === undefined || headers === null) {
      return undefined;
    }
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name) ?? undefined;
    }
    return (headers as Record<string, string>)[name];
  };

  if (status === 429) {
    const retryAfter = headerGet('retry-after');
    const buckets: Record<string, string> = {};
    for (const name of [
      'x-ratelimit-limit-requests',
      'x-ratelimit-remaining-requests',
      'x-ratelimit-limit-input-tokens',
      'x-ratelimit-remaining-input-tokens',
      'x-ratelimit-limit-output-tokens',
      'x-ratelimit-remaining-output-tokens',
    ]) {
      const value = headerGet(name);
      if (value !== undefined) {
        buckets[name] = value;
      }
    }
    return {
      code: 'agent',
      message,
      retryable: true,
      data: {
        kind: 'rate-limit',
        ...(retryAfter === undefined ? {} : { retryAfterMs: Number(retryAfter) * 1000 }),
        ...(Object.keys(buckets).length > 0 ? { buckets } : {}),
        status: 429,
      },
    };
  }
  // 529 overloaded_error is a distinct retryable class alongside 500.
  const retryable = status === undefined || status === 529 || status >= 500;
  return {
    code: 'agent',
    message,
    retryable,
    data: { kind: 'transport', ...(status === undefined ? {} : { status }) },
  };
}
