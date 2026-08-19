/**
 * @rulvar/bridge-ai-sdk (M9-T01): wraps any Vercel AI SDK LanguageModelV4
 * as a ProviderAdapter for the long tail of providers (Google, Bedrock,
 * Vertex) without coupling the core to the ai-sdk release cycle.
 *
 * Adapter contract: https://docs.rulvar.com/guide/adapter-authors
 * This is documented as the highest-churn package in the set: it tracks the
 * @ai-sdk/provider major line (^4) and checks specificationVersion at
 * runtime so a transitive provider-package major cannot mis-wire silently.
 */
import { APICallError } from '@ai-sdk/provider';
import type {
  JSONValue,
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4FinishReason,
  LanguageModelV4FunctionTool,
  LanguageModelV4Message,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4ToolChoice,
  LanguageModelV4Usage,
  SharedV4FileDataData,
  SharedV4FileDataUrl,
  SharedV4ProviderMetadata,
  SharedV4ProviderOptions,
  SharedV4Warning,
} from '@ai-sdk/provider';
import {
  ConfigError,
  createCanonicalIdMinter,
  type CanonicalId,
  type ChatEvent,
  type ChatRequest,
  type Effort,
  type FinishInfo,
  type ModelCaps,
  type Msg,
  type ProviderAdapter,
  type Usage,
  type WireError,
} from '@rulvar/core';

/**
 * Conservative capability set for a model the bridge cannot introspect:
 * the LanguageModelV4 interface exposes no capability discovery, so the
 * defaults mirror the openaiCompatible factory posture except
 * structuredOutput, where responseFormat json IS the V4-native
 * mechanism every ai-sdk provider accepts. Callers SHOULD supply caps for
 * anything beyond this.
 */
const CONSERVATIVE_BRIDGE_CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: true,
  supportsParallelTools: false,
  reasoningEfforts: [],
  contextWindow: 8_192,
  maxOutputTokens: 4_096,
};

/**
 * Canonical effort to V4 reasoning effort. Canonical 'max' has no V4
 * equivalent and downmaps to 'xhigh' (the documented lossy downmap
 * pattern); the downmap is recorded in providerMetadata.
 * Identity always keeps the requested canonical effort.
 */
const EFFORT_TO_V4: Record<Effort, 'low' | 'medium' | 'high' | 'xhigh'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'xhigh',
};

/**
 * Keys of the bridge's providerOptions namespace that would contradict a
 * canonical ChatRequest field. Canonical fields always win; a namespaced
 * option silently contradicting one is a typed ConfigError.
 */
const CANONICAL_CONFLICT_KEYS: readonly string[] = [
  'prompt',
  'maxOutputTokens',
  'stopSequences',
  'responseFormat',
  'tools',
  'toolChoice',
  'reasoning',
  'abortSignal',
];

/** Transport knobs the bridge lifts from its namespace into V4 call options. */
const LIFTED_OPTION_KEYS = [
  'temperature',
  'topP',
  'topK',
  'seed',
  'presencePenalty',
  'frequencyPenalty',
  'headers',
] as const;

export interface BridgeAiSdkOptions {
  /**
   * Adapter id (the left segment of ModelRef). Defaults to the wrapped
   * model's `provider` string; pass an explicit id to register several
   * bridged models of the same provider side by side.
   */
  id?: string;
  /**
   * Provider family for provider-raw retention and projection. Defaults
   * to the wrapped model's `provider` string, so
   * two bridged models of one provider share retained blocks.
   */
  provider?: string;
  /** Per-model capability overrides merged over the conservative defaults. */
  caps?: (model: string) => ModelCaps | Partial<ModelCaps>;
  /**
   * Provider-executed tool policy (RV1806). The wrapped provider can
   * run tools SERVER-SIDE (web search, code execution, computer use):
   * those calls never pass the engine's ToolDef registry, risk
   * classes, ask rules, or approvals, and their effects happen on
   * provider infrastructure regardless of any engine permission chain.
   * The default 'deny' fails the turn with a typed terminal error the
   * moment a provider-executed exchange appears, because a policy
   * surface that cannot see a call must not silently absorb it.
   * 'allow' opts in: the exchange is retained for prompt
   * reconstruction exactly as before, and the finish metadata
   * additionally names every provider-executed call
   * (`providerExecutedTools: [{ toolName, toolCallId }]`) so the
   * journaled record of the turn says what the provider ran.
   */
  providerExecutedTools?: 'allow' | 'deny';
}

/**
 * Bijective map between engine-minted CanonicalIds and the wrapped
 * provider's wire tool-call ids. V4 accepts
 * arbitrary strings as toolCallId, so a canonical id minted outside this
 * provider is used verbatim as its own wire id.
 */
class BridgeIdMap {
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
    this.toWire.set(canonicalId, canonicalId);
    this.toCanonical.set(canonicalId, canonicalId);
    return canonicalId;
  }
}

/**
 * Wraps a Vercel AI SDK LanguageModelV4 as a ProviderAdapter. The bridge
 * MUST check specificationVersion at runtime and
 * fail with a typed ConfigError on mismatch. The published interface names
 * the version V4; the wire literal carried by @ai-sdk/provider ^4 is 'v4'.
 */
export function bridgeAiSdk(
  model: LanguageModelV4,
  options: BridgeAiSdkOptions = {},
): ProviderAdapter {
  const version = (model as { specificationVersion?: unknown }).specificationVersion;
  if (version !== 'v4') {
    throw new ConfigError(
      `bridgeAiSdk requires a LanguageModelV4 (specificationVersion 'v4'); ` +
        `received ${JSON.stringify(version)}. A mismatched @ai-sdk/provider major ` +
        `cannot be bridged.`,
      { data: { received: typeof version === 'string' ? version : null } },
    );
  }
  const id = options.id ?? model.provider;
  if (id === undefined || id === '') {
    throw new ConfigError('bridgeAiSdk requires a non-empty adapter id (model.provider was empty)');
  }
  const family = options.provider ?? model.provider;
  const providerExecutedTools = options.providerExecutedTools ?? 'deny';
  if (providerExecutedTools !== 'allow' && providerExecutedTools !== 'deny') {
    throw new ConfigError(
      "bridgeAiSdk options.providerExecutedTools must be 'allow' or 'deny' when given",
    );
  }
  const ids = new BridgeIdMap(createCanonicalIdMinter());

  return {
    id,
    provider: family,

    // The construction-side posture attestation (RV4101): a pure
    // snapshot of the seam decision this adapter was constructed
    // under. compileRegulatedProfile refuses 'allow' on the regulated
    // floor, because a provider-executed tool runs outside the
    // permission chain and the journal.
    describeRegulatedPosture: () => ({
      regulatedPosture: 1,
      kind: 'ai-sdk-bridge',
      name: id,
      providerExecutedTools,
    }),

    caps(wireModel: string): ModelCaps {
      const overrides = options.caps?.(wireModel);
      return overrides === undefined
        ? CONSERVATIVE_BRIDGE_CAPS
        : { ...CONSERVATIVE_BRIDGE_CAPS, ...overrides };
    },

    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      if (req.model !== model.modelId) {
        // The V4 model instance is bound to one modelId at construction;
        // a diverging ModelRef would silently hit the wrong model.
        throw new ConfigError(
          `bridgeAiSdk adapter '${id}' wraps model '${model.modelId}' but was asked for '${req.model}'; ` +
            `register one bridgeAiSdk adapter per wrapped model`,
        );
      }
      const built = buildCallOptions(req, { adapterId: id, family, ids, signal });

      let result: Awaited<ReturnType<LanguageModelV4['doStream']>>;
      try {
        result = await model.doStream(built.callOptions);
      } catch (thrown) {
        if (signal?.aborted === true) {
          return;
        }
        yield { type: 'error', error: aiSdkErrorToWire(thrown) };
        return;
      }

      const mapper = new StreamMapper(id, ids, built.effortDownmapped, providerExecutedTools);
      try {
        for await (const part of iterateStream(result.stream)) {
          for (const event of mapper.map(part)) {
            yield event;
          }
          if (mapper.terminal) {
            return;
          }
        }
      } catch (thrown) {
        if (signal?.aborted === true) {
          return;
        }
        yield { type: 'error', error: aiSdkErrorToWire(thrown) };
        return;
      }
      if (!mapper.terminal) {
        if (signal?.aborted === true) {
          // A requested cancellation is never a provider fault, even
          // when the aborted transport surfaces as a clean drain rather
          // than a throw (the v1.27.0 review P1 posture, mirrored from
          // the two catch paths above).
          return;
        }
        // Exactly one terminal event per stream:
        // a V4 stream draining without a finish part is a provider fault.
        yield {
          type: 'error',
          error: {
            code: 'agent',
            message: `bridged model '${model.modelId}' ended its stream without a finish part`,
            retryable: true,
            data: { kind: 'transport' },
          },
        };
      }
    },
  };
}

async function* iterateStream(
  stream: ReadableStream<LanguageModelV4StreamPart>,
): AsyncGenerator<LanguageModelV4StreamPart> {
  const reader = stream.getReader();
  let drained = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        drained = true;
        return;
      }
      yield value;
    }
  } finally {
    if (!drained) {
      // Early exit (a terminal event, the consumer's break, an abort):
      // cancel tears the provider transport down; abandoning the
      // undrained body would hold the connection open until GC. Fire
      // and forget so cleanup can never stall the generator's return.
      void reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }
}

interface BuildContext {
  adapterId: string;
  family: string;
  ids: BridgeIdMap;
  signal?: AbortSignal;
}

interface BuiltCall {
  callOptions: LanguageModelV4CallOptions;
  effortDownmapped: boolean;
}

function buildCallOptions(req: ChatRequest, context: BuildContext): BuiltCall {
  const callOptions: LanguageModelV4CallOptions = {
    prompt: mapMessages(req.messages, context),
  };
  if (req.maxOutputTokens !== undefined) {
    callOptions.maxOutputTokens = req.maxOutputTokens;
  }
  if (req.stopSequences !== undefined) {
    callOptions.stopSequences = req.stopSequences;
  }
  if (req.tools !== undefined && req.tools.length > 0) {
    callOptions.tools = req.tools.map((tool): LanguageModelV4FunctionTool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    }));
  }
  if (req.toolChoice !== undefined) {
    callOptions.toolChoice = mapToolChoice(req.toolChoice);
  }
  if (req.schema !== undefined) {
    // The router chose the native tier (caps.structuredOutput); V4's
    // responseFormat json is that native mechanism.
    callOptions.responseFormat = { type: 'json', schema: req.schema };
  }
  let effortDownmapped = false;
  if (req.effort !== undefined) {
    callOptions.reasoning = EFFORT_TO_V4[req.effort];
    effortDownmapped = req.effort === 'max';
  }
  if (context.signal !== undefined) {
    callOptions.abortSignal = context.signal;
  }
  // cacheHint is ignored silently: V4 exposes no cache-breakpoint surface
  // (adapters for providers without caching MUST ignore the hint silently).
  applyNamespacedOptions(req, callOptions, context.adapterId);
  return { callOptions, effortDownmapped };
}

function applyNamespacedOptions(
  req: ChatRequest,
  callOptions: LanguageModelV4CallOptions,
  adapterId: string,
): void {
  const ns = req.providerOptions?.[adapterId];
  if (ns === undefined) {
    return;
  }
  for (const key of CANONICAL_CONFLICT_KEYS) {
    if (key in ns) {
      throw new ConfigError(
        `providerOptions.${adapterId}.${key} contradicts a canonical ChatRequest field; ` +
          `canonical fields always win`,
      );
    }
  }
  for (const key of LIFTED_OPTION_KEYS) {
    if (ns[key] !== undefined) {
      (callOptions as Record<string, unknown>)[key] = ns[key];
    }
  }
  if (ns.providerOptions !== undefined) {
    // The inner object is the V4 provider-namespaced passthrough, for
    // example { google: {...} } on a bridged Google model.
    callOptions.providerOptions = ns.providerOptions as SharedV4ProviderOptions;
  }
}

function mapToolChoice(choice: NonNullable<ChatRequest['toolChoice']>): LanguageModelV4ToolChoice {
  if (choice === 'auto') {
    return { type: 'auto' };
  }
  if (choice === 'none') {
    return { type: 'none' };
  }
  if (choice === 'required') {
    return { type: 'required' };
  }
  return { type: 'tool', toolName: choice.name };
}

type AssistantContent = Extract<LanguageModelV4Message, { role: 'assistant' }>['content'];
type UserContent = Extract<LanguageModelV4Message, { role: 'user' }>['content'];
type ToolContent = Extract<LanguageModelV4Message, { role: 'tool' }>['content'];

function mapMessages(messages: Msg[], context: BuildContext): LanguageModelV4Prompt {
  const prompt: LanguageModelV4Prompt = [];
  for (const message of messages) {
    if (message.role === 'system') {
      const text = message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
      prompt.push({ role: 'system', content: text });
      continue;
    }
    if (message.role === 'user') {
      const content: UserContent = [];
      for (const part of message.parts) {
        if (part.type === 'text') {
          content.push({ type: 'text', text: part.text });
        } else if (part.type === 'image') {
          content.push({ type: 'file', mediaType: part.mediaType, data: toFileData(part.data) });
        }
      }
      prompt.push({ role: 'user', content });
      continue;
    }
    if (message.role === 'assistant') {
      const content: AssistantContent = [];
      for (const part of message.parts) {
        if (part.type === 'text') {
          content.push({ type: 'text', text: part.text });
        } else if (part.type === 'tool-call') {
          content.push({
            type: 'tool-call',
            toolCallId: context.ids.wireFor(part.id),
            toolName: part.name,
            input: unwrapUnparsedArgs(part.args),
          });
        } else if (part.type === 'provider-raw' && part.provider === context.family) {
          const reinserted = reinsertRetained(part.block);
          if (reinserted !== undefined) {
            content.push(reinserted);
          }
        }
      }
      prompt.push({ role: 'assistant', content });
      continue;
    }
    // role 'tool'
    const content: ToolContent = [];
    for (const part of message.parts) {
      if (part.type === 'tool-result') {
        content.push({
          type: 'tool-result',
          toolCallId: context.ids.wireFor(part.id),
          toolName: part.name,
          output:
            part.isError === true
              ? { type: 'error-text', value: stringifyResult(part.result) }
              : { type: 'json', value: part.result as JSONValue },
        });
      }
    }
    prompt.push({ role: 'tool', content });
  }
  return prompt;
}

/**
 * Transforms a retained stream part (shipped through finish
 * providerMetadata retainedParts and lifted into a provider-raw part by
 * the runtime) back into its V4 prompt-part shape.
 * Response-side providerMetadata becomes prompt-side providerOptions.
 */
function reinsertRetained(block: unknown): AssistantContent[number] | undefined {
  if (typeof block !== 'object' || block === null) {
    return undefined;
  }
  const record = block as Record<string, unknown>;
  const meta = record.providerMetadata as SharedV4ProviderOptions | undefined;
  const withMeta = meta === undefined ? {} : { providerOptions: meta };
  switch (record.type) {
    case 'reasoning':
      return { type: 'reasoning', text: record.text as string, ...withMeta };
    case 'custom':
      return { type: 'custom', kind: record.kind as `${string}.${string}`, ...withMeta };
    case 'file':
      return {
        type: 'file',
        mediaType: record.mediaType as string,
        data: record.data as SharedV4FileDataData | SharedV4FileDataUrl,
        ...withMeta,
      };
    case 'reasoning-file':
      return {
        type: 'reasoning-file',
        mediaType: record.mediaType as string,
        data: record.data as SharedV4FileDataData | SharedV4FileDataUrl,
        ...withMeta,
      };
    case 'tool-call':
      return {
        type: 'tool-call',
        toolCallId: record.toolCallId as string,
        toolName: record.toolName as string,
        input: record.input,
        providerExecuted: true,
        ...withMeta,
      };
    case 'tool-result':
      return {
        type: 'tool-result',
        toolCallId: record.toolCallId as string,
        toolName: record.toolName as string,
        // Retention recorded isError; honoring it on reinsertion keeps a
        // failed provider-executed exchange failed in the model's view.
        output:
          record.isError === true
            ? { type: 'error-json', value: record.result as JSONValue }
            : { type: 'json', value: record.result as JSONValue },
        ...withMeta,
      };
    default:
      return undefined;
  }
}

function toFileData(data: Uint8Array | string): SharedV4FileDataData | SharedV4FileDataUrl {
  if (typeof data === 'string' && (/^https?:/i.test(data) || data.startsWith('data:'))) {
    return { type: 'url', url: new URL(data) };
  }
  return { type: 'data', data };
}

function stringifyResult(result: unknown): string {
  return typeof result === 'string' ? result : (JSON.stringify(result) ?? 'null');
}

/**
 * Projects tool-call arguments back into the V4 prompt. The adapter
 * parse-failure wrapper ({__unparsed: raw} and nothing else) projects as
 * the ORIGINAL raw text the model wrote, mirroring the openai wire's
 * guard from the v1.74 experiment review: re-encoding the internal
 * wrapper showed the live model {"__unparsed":"..."} as its own past
 * call and taught it to imitate that shape.
 */
function unwrapUnparsedArgs(args: unknown): unknown {
  if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
    const keys = Object.keys(args);
    const raw = (args as { __unparsed?: unknown }).__unparsed;
    if (keys.length === 1 && keys[0] === '__unparsed' && typeof raw === 'string') {
      return raw;
    }
  }
  return args;
}

/** Accumulated reasoning segment awaiting retention at reasoning-end. */
interface ReasoningAccumulator {
  text: string;
  providerMetadata?: SharedV4ProviderMetadata;
}

/**
 * Maps the V4 stream-part vocabulary onto ChatEvents, assembling tool
 * arguments, normalizing usage under the Usage invariant, and collecting
 * the turn's retention payload (reasoning parts with their signatures,
 * custom blocks, generated files, provider-executed tool exchanges) for
 * finish providerMetadata retainedParts.
 */
class StreamMapper {
  terminal = false;

  private readonly adapterId: string;
  private readonly ids: BridgeIdMap;
  private readonly effortDownmapped: boolean;
  private readonly providerExecutedPolicy: 'allow' | 'deny';
  private readonly startedToolWireIds = new Set<string>();
  private readonly providerExecutedWireIds = new Set<string>();
  /** Provider-executed calls seen under 'allow' (RV1806), by wire id. */
  private readonly providerExecutedSeen = new Map<string, string>();
  private readonly reasoning = new Map<string, ReasoningAccumulator>();
  private readonly retained: unknown[] = [];
  private warnings: SharedV4Warning[] = [];
  private response: Record<string, unknown> | undefined;

  constructor(
    adapterId: string,
    ids: BridgeIdMap,
    effortDownmapped: boolean,
    providerExecutedPolicy: 'allow' | 'deny' = 'deny',
  ) {
    this.adapterId = adapterId;
    this.ids = ids;
    this.effortDownmapped = effortDownmapped;
    this.providerExecutedPolicy = providerExecutedPolicy;
  }

  /**
   * The deny arm (RV1806): a provider-executed exchange under the
   * default policy fails the turn typed. The refusal cannot un-run a
   * tool the provider already executed server-side; it refuses to
   * CONTINUE a turn the engine's permission chain cannot see, and the
   * journaled terminal names the tool that ran.
   */
  private denyProviderExecuted(toolName: string): ChatEvent[] {
    this.terminal = true;
    return [
      {
        type: 'error',
        error: {
          code: 'agent',
          message:
            `the bridged provider executed tool '${toolName}' server-side; provider-executed ` +
            "tools bypass the engine's ToolDef registry, risk classes, and approvals, and are " +
            "refused by default. Opt in with bridgeAiSdk(model, { providerExecutedTools: 'allow' })",
          retryable: false,
          data: { kind: 'terminal', providerExecutedTool: toolName },
        },
      },
    ];
  }

  map(part: LanguageModelV4StreamPart): ChatEvent[] {
    switch (part.type) {
      case 'stream-start':
        this.warnings = part.warnings;
        return [];
      case 'response-metadata': {
        const response: Record<string, unknown> = {};
        if (part.id !== undefined) {
          response.id = part.id;
        }
        if (part.modelId !== undefined) {
          response.modelId = part.modelId;
        }
        if (part.timestamp !== undefined) {
          response.timestamp = part.timestamp.toISOString();
        }
        if (Object.keys(response).length > 0) {
          this.response = response;
        }
        return [];
      }
      case 'text-start':
      case 'text-end':
        return [];
      case 'text-delta':
        return [{ type: 'text-delta', text: part.delta }];
      case 'reasoning-start':
        this.reasoning.set(part.id, {
          text: '',
          ...(part.providerMetadata === undefined
            ? {}
            : { providerMetadata: { ...part.providerMetadata } }),
        });
        return [];
      case 'reasoning-delta': {
        const acc = this.reasoning.get(part.id) ?? { text: '' };
        acc.text += part.delta;
        this.mergeReasoningMeta(acc, part.providerMetadata);
        this.reasoning.set(part.id, acc);
        return [{ type: 'reasoning-delta', text: part.delta }];
      }
      case 'reasoning-end': {
        const acc = this.reasoning.get(part.id);
        if (acc !== undefined) {
          this.mergeReasoningMeta(acc, part.providerMetadata);
          this.retained.push({
            type: 'reasoning',
            text: acc.text,
            ...(acc.providerMetadata === undefined
              ? {}
              : { providerMetadata: acc.providerMetadata }),
          });
          this.reasoning.delete(part.id);
        }
        return [];
      }
      case 'tool-input-start': {
        if (part.providerExecuted === true) {
          if (this.providerExecutedPolicy === 'deny') {
            return this.denyProviderExecuted(part.toolName);
          }
          this.providerExecutedWireIds.add(part.id);
          this.providerExecutedSeen.set(part.id, part.toolName);
          return [];
        }
        this.startedToolWireIds.add(part.id);
        return [
          { type: 'tool-call-start', id: this.ids.canonicalFor(part.id), name: part.toolName },
        ];
      }
      case 'tool-input-delta': {
        if (this.providerExecutedWireIds.has(part.id)) {
          return [];
        }
        return [
          {
            type: 'tool-call-delta',
            id: this.ids.canonicalFor(part.id),
            argsTextDelta: part.delta,
          },
        ];
      }
      case 'tool-input-end':
        return [];
      case 'tool-call': {
        if (part.providerExecuted === true) {
          if (this.providerExecutedPolicy === 'deny') {
            return this.denyProviderExecuted(part.toolName);
          }
          this.providerExecutedWireIds.add(part.toolCallId);
          this.providerExecutedSeen.set(part.toolCallId, part.toolName);
          const parsed = parseToolArgs(part.input);
          this.retained.push({
            type: 'tool-call',
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            // Retention is best effort: unparseable provider-executed
            // arguments keep their raw string form.
            input: parsed.ok ? parsed.value : part.input,
            providerExecuted: true,
            ...(part.providerMetadata === undefined
              ? {}
              : { providerMetadata: part.providerMetadata }),
          });
          return [];
        }
        const events: ChatEvent[] = [];
        const canonical = this.ids.canonicalFor(part.toolCallId);
        if (!this.startedToolWireIds.has(part.toolCallId)) {
          // Non-streaming providers may emit the tool-call part alone;
          // synthesize the start so consumers see a complete sequence.
          events.push({ type: 'tool-call-start', id: canonical, name: part.toolName });
        }
        const parsed = parseToolArgs(part.input);
        events.push({
          type: 'tool-call-end',
          id: canonical,
          // A strict-parse failure ships the first-class wires' wrapper
          // ({__unparsed: raw} and nothing else) so the engine's
          // deterministic second chance can repair it (the v1.74
          // experiment review, P1.5); a terminal error here would
          // destroy the whole paid turn instead.
          args: parsed.ok ? parsed.value : { __unparsed: part.input },
        });
        return events;
      }
      case 'tool-result': {
        if (part.preliminary === true) {
          // Preliminary results replace each other and are always
          // followed by a final one (the V4 contract); retaining every
          // preview would reinsert duplicate results for one call.
          return [];
        }
        // Provider-executed result: retained for round trips, never
        // surfaced as a client tool execution.
        this.retained.push({
          type: 'tool-result',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          result: part.result,
          ...(part.isError === undefined ? {} : { isError: part.isError }),
          ...(part.providerMetadata === undefined
            ? {}
            : { providerMetadata: part.providerMetadata }),
        });
        return [];
      }
      case 'tool-approval-request': {
        this.terminal = true;
        return [
          {
            type: 'error',
            error: {
              code: 'agent',
              message:
                'the bridged provider requested approval for a provider-executed tool call; ' +
                'provider-executed tool approval flows are not supported through bridgeAiSdk',
              retryable: false,
              data: { kind: 'terminal' },
            },
          },
        ];
      }
      case 'custom':
      case 'file':
      case 'reasoning-file':
        this.retained.push(part);
        return [];
      case 'source':
      case 'raw':
        return [];
      case 'finish':
        this.terminal = true;
        return this.mapFinish(part);
      case 'error': {
        this.terminal = true;
        return [{ type: 'error', error: aiSdkErrorToWire(part.error) }];
      }
      default:
        return [];
    }
  }

  private mergeReasoningMeta(
    acc: ReasoningAccumulator,
    meta: SharedV4ProviderMetadata | undefined,
  ): void {
    if (meta === undefined) {
      return;
    }
    acc.providerMetadata = { ...acc.providerMetadata, ...meta };
  }

  private mapFinish(part: Extract<LanguageModelV4StreamPart, { type: 'finish' }>): ChatEvent[] {
    if (part.finishReason.unified === 'error') {
      // The provenance the stream accumulated before dying (RV401): the
      // failed call is still billable, and its response id is the join
      // key the reconciliation record needs. Same namespaced shape as
      // the normal finish; retained parts are deliberately NOT carried,
      // because a failed turn is discarded, never re-injected.
      const errorBag: Record<string, unknown> = {};
      if (this.response !== undefined) {
        errorBag.response = this.response;
        if (typeof this.response.id === 'string') {
          errorBag.responseId = this.response.id;
        }
      }
      if (this.warnings.length > 0) {
        errorBag.warnings = this.warnings;
      }
      return [
        // The error finish still carries the provider's bill; shipping
        // it as a usage event ahead of the terminal error keeps the
        // failed stream's paid tokens on the meter (the first-class
        // adapters' early-usage posture), instead of billing zero.
        { type: 'usage', usage: mapUsage(part.usage) },
        {
          type: 'error',
          error: {
            code: 'agent',
            message:
              part.finishReason.raw === undefined
                ? 'bridged provider reported an error finish'
                : `bridged provider reported an error finish (${part.finishReason.raw})`,
            retryable: true,
            data: { kind: 'transport' },
          },
          ...(Object.keys(errorBag).length === 0
            ? {}
            : { providerMetadata: { [this.adapterId]: errorBag } }),
        },
      ];
    }
    // Retention is unconditional: a finish landing while a reasoning
    // segment is still open (length truncation mid-reasoning) must not
    // lose the accumulated text or its signature metadata.
    for (const acc of this.reasoning.values()) {
      this.retained.push({
        type: 'reasoning',
        text: acc.text,
        ...(acc.providerMetadata === undefined ? {} : { providerMetadata: acc.providerMetadata }),
      });
    }
    this.reasoning.clear();
    const finish = mapFinishReason(part.finishReason, this.adapterId);
    const usage = mapUsage(part.usage);
    const bag: Record<string, unknown> = {};
    if (this.retained.length > 0) {
      bag.retainedParts = this.retained;
    }
    if (this.warnings.length > 0) {
      bag.warnings = this.warnings;
    }
    if (this.response !== undefined) {
      bag.response = this.response;
      if (typeof this.response.id === 'string') {
        // The flat form the core reconciliation record reads (RV401),
        // beside the AI SDK's own nested shape: first-class adapters
        // ship `responseId`, and a bridge-served invoice row must join
        // the provider statement exactly like theirs.
        bag.responseId = this.response.id;
      }
    }
    if (part.providerMetadata !== undefined) {
      bag.upstream = part.providerMetadata;
    }
    if (this.providerExecutedSeen.size > 0) {
      // The allow arm's visibility half (RV1806): the journaled record
      // of the turn names every provider-executed call, so "what did
      // the provider run" is a metadata read, not a transcript dig.
      bag.providerExecutedTools = [...this.providerExecutedSeen.entries()].map(
        ([toolCallId, toolName]) => ({ toolName, toolCallId }),
      );
    }
    if (this.effortDownmapped) {
      bag.effortDownmap = 'max->xhigh';
    }
    if (part.finishReason.unified === 'other' && part.finishReason.raw !== undefined) {
      bag.finishRaw = part.finishReason.raw;
    }
    const event: ChatEvent = {
      type: 'finish',
      finish,
      usage,
      ...(Object.keys(bag).length === 0 ? {} : { providerMetadata: { [this.adapterId]: bag } }),
    };
    return [event];
  }
}

function mapFinishReason(reason: LanguageModelV4FinishReason, adapterId: string): FinishInfo {
  switch (reason.unified) {
    case 'tool-calls':
      return { reason: 'tool-calls' };
    case 'length':
      return { reason: 'max-tokens' };
    case 'content-filter':
      return {
        reason: 'refusal',
        refusal: {
          provider: adapterId,
          stopDetails: { type: reason.raw ?? 'content-filter' },
        },
      };
    default:
      return { reason: 'stop' };
  }
}

/**
 * Normalizes V4 nested usage to the flat Usage under the Usage invariant:
 * inputTokens is the FULL prompt including cache reads and writes.
 * When the provider's total disagrees with the
 * component sum, the larger value wins so the invariant holds by
 * construction.
 */
function mapUsage(usage: LanguageModelV4Usage): Usage {
  const cacheRead = usage.inputTokens.cacheRead ?? 0;
  const cacheWrite = usage.inputTokens.cacheWrite ?? 0;
  const derivedInput = (usage.inputTokens.noCache ?? 0) + cacheRead + cacheWrite;
  const inputTokens = Math.max(usage.inputTokens.total ?? 0, derivedInput);
  const derivedOutput = (usage.outputTokens.text ?? 0) + (usage.outputTokens.reasoning ?? 0);
  const outputTokens = Math.max(usage.outputTokens.total ?? 0, derivedOutput);
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    ...(usage.outputTokens.reasoning === undefined
      ? {}
      : { reasoningTokens: usage.outputTokens.reasoning }),
  };
}

type ParsedArgs = { ok: true; value: unknown } | { ok: false };

function parseToolArgs(input: string): ParsedArgs {
  if (input === '') {
    return { ok: true, value: {} };
  }
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch {
    return { ok: false };
  }
}

/**
 * Projects a thrown value from the wrapped model into a typed WireError.
 * APICallError carries the provider's status and headers: 429 surfaces as
 * a retryable rate-limit with retryAfterMs; 5xx and status-less network
 * failures are retryable transport; other statuses are terminal transport.
 */
export function aiSdkErrorToWire(error: unknown): WireError {
  const record = error as {
    statusCode?: number;
    status?: number;
    message?: string;
    responseHeaders?: Record<string, string>;
    isRetryable?: boolean;
  };
  const status =
    typeof record.statusCode === 'number'
      ? record.statusCode
      : typeof record.status === 'number'
        ? record.status
        : undefined;
  const message = typeof record.message === 'string' ? record.message : String(error);

  if (status === 429) {
    const retryAfter = record.responseHeaders?.['retry-after'];
    return {
      code: 'agent',
      message,
      retryable: true,
      data: {
        kind: 'rate-limit',
        ...(retryAfter === undefined || Number.isNaN(Number(retryAfter))
          ? {}
          : { retryAfterMs: Number(retryAfter) * 1000 }),
        status: 429,
      },
    };
  }
  const retryable = APICallError.isInstance(error)
    ? error.isRetryable
    : status === undefined || status >= 500;
  return {
    code: 'agent',
    message,
    retryable,
    data: { kind: 'transport', ...(status === undefined ? {} : { status }) },
  };
}
