/**
 * Canonical-to-wire mapping for the OpenAI Responses API (M1-T13): manual
 * item replay only (store: false plus reasoning.encrypted_content, with
 * reasoning items echoed verbatim between function calls), flattened
 * strict function tools, text.format json_schema, the typed SSE catalog
 * mapped to ChatEvent, effort mapping with the documented lossy max
 * downmap, and usage normalization.
 *
 * Owning spec: docs/04-model-layer-spec.md, section "@lurker/openai
 * (Responses API)". Pure functions; adapter.ts owns the SDK client.
 */
import {
  ConfigError,
  isStrictCompatibleSchema,
  type CanonicalId,
  type ChatEvent,
  type ChatRequest,
  type Effort,
  type FinishInfo,
  type Usage,
  type WireError,
} from '@lurker/core';

/** Bijective canonical-to-wire (call_*) id map (docs/04, section 1.2). */
export class OpenAiIdMap {
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
    const wireId = `call_${canonicalId}`;
    this.toWire.set(canonicalId, wireId);
    this.toCanonical.set(wireId, canonicalId);
    return wireId;
  }
}

/**
 * Canonical-to-wire effort (docs/04, sections 3.3 and 5.5): low through
 * xhigh pass through; canonical max downmaps to xhigh (documented lossy;
 * recorded in providerMetadata); provider 'none' is reachable only via
 * providerOptions.openai.reasoningEffort.
 */
export function mapOpenAiEffort(effort: Effort): { wire: string; downmapped: boolean } {
  if (effort === 'max') {
    return { wire: 'xhigh', downmapped: true };
  }
  return { wire: effort, downmapped: false };
}

type Item = Record<string, unknown>;

/**
 * Builds Responses API params. Manual item replay ONLY: store: false plus
 * include reasoning.encrypted_content; previous_response_id and the
 * Conversations API place state server-side, break replay identity, and
 * are REJECTED as a typed ConfigError (docs/04, section 5.1). Role
 * 'system' messages project into top-level instructions on every request.
 */
export function buildResponsesParams(
  req: ChatRequest,
  ids: OpenAiIdMap,
): { params: Record<string, unknown>; effortDownmapped: boolean } {
  const openaiOptions = req.providerOptions?.openai ?? {};
  for (const forbidden of ['previous_response_id', 'previousResponseId', 'conversation']) {
    if (openaiOptions[forbidden] !== undefined) {
      throw new ConfigError(
        `providerOptions.openai.${forbidden} is rejected: server-side conversation state is ` +
          'incompatible with content-addressed journal determinism (docs/04, section 5.1)',
      );
    }
  }

  const instructions: string[] = [];
  const input: Item[] = [];
  for (const msg of req.messages) {
    if (msg.role === 'system') {
      for (const part of msg.parts) {
        if (part.type === 'text') {
          instructions.push(part.text);
        }
      }
      continue;
    }
    const content: Item[] = [];
    const flushContent = (): void => {
      if (content.length > 0) {
        input.push({
          role: msg.role === 'tool' ? 'user' : msg.role,
          content: content.splice(0),
        });
      }
    };
    for (const part of msg.parts) {
      switch (part.type) {
        case 'text':
          content.push({
            type: msg.role === 'assistant' ? 'output_text' : 'input_text',
            text: part.text,
          });
          break;
        case 'image':
          content.push({
            type: 'input_image',
            image_url:
              typeof part.data === 'string'
                ? part.data
                : `data:${part.mediaType};base64,${Buffer.from(part.data).toString('base64')}`,
          });
          break;
        case 'tool-call':
          flushContent();
          input.push({
            type: 'function_call',
            call_id: ids.wireFor(part.id),
            name: part.name,
            arguments: JSON.stringify(part.args ?? {}),
          });
          break;
        case 'tool-result':
          flushContent();
          input.push({
            type: 'function_call_output',
            call_id: ids.wireFor(part.id),
            output:
              typeof part.result === 'string' ? part.result : JSON.stringify(part.result ?? null),
          });
          break;
        case 'provider-raw':
          // Reasoning items (including encrypted_content) and any
          // auxiliary state items are echoed VERBATIM between function
          // calls; id plus summary alone are insufficient (docs/04,
          // section 5.1).
          if (part.provider === 'openai') {
            flushContent();
            input.push(part.block as Item);
          }
          break;
      }
    }
    flushContent();
  }

  const params: Record<string, unknown> = {
    model: req.model,
    input,
    store: false,
    include: ['reasoning.encrypted_content'],
  };
  if (instructions.length > 0) {
    params.instructions = instructions.join('\n\n');
  }
  if (req.maxOutputTokens !== undefined) {
    params.max_output_tokens = req.maxOutputTokens;
  }

  if (req.tools !== undefined) {
    // Flattened function tools: top-level type/name/parameters/strict, no
    // nested wrapper. Explicit strict, never the silent server fallback
    // (docs/04, section 5.2).
    params.tools = req.tools.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: isStrictCompatibleSchema(tool.parameters),
    }));
    if (req.toolChoice === 'required') {
      params.tool_choice = 'required';
    } else if (typeof req.toolChoice === 'object') {
      params.tool_choice = { type: 'function', name: req.toolChoice.name };
    } else if (req.toolChoice === 'auto') {
      params.tool_choice = 'auto';
    } else if (req.toolChoice === 'none') {
      // Explicit none with the tools param PRESENT: function-call items
      // in the input need their definitions, and finalize and extract
      // project tool-bearing histories (docs/04, section 8.4 as amended
      // in M4-T01).
      params.tool_choice = 'none';
    }
  }

  if (req.schema !== undefined) {
    const text: Item = {
      format: {
        type: 'json_schema',
        name: 'output',
        schema: req.schema,
        strict: isStrictCompatibleSchema(req.schema),
      },
    };
    if (typeof openaiOptions.verbosity === 'string') {
      text.verbosity = openaiOptions.verbosity;
    }
    params.text = text;
  } else if (typeof openaiOptions.verbosity === 'string') {
    params.text = { verbosity: openaiOptions.verbosity };
  }

  let effortDownmapped = false;
  const explicitEffort = openaiOptions.reasoningEffort;
  if (typeof explicitEffort === 'string') {
    // Provider 'none' (and any explicit provider-level effort) is
    // reachable only through the namespace (docs/04, section 3.3).
    params.reasoning = { effort: explicitEffort };
  } else if (req.effort !== undefined) {
    const mapped = mapOpenAiEffort(req.effort);
    effortDownmapped = mapped.downmapped;
    params.reasoning = { effort: mapped.wire };
  }

  for (const key of ['temperature', 'top_p'] as const) {
    if (openaiOptions[key] !== undefined) {
      params[key] = openaiOptions[key];
    }
  }

  return { params, effortDownmapped };
}

/** Raw Responses SSE events, structurally typed. */
export type ResponsesStreamEvent = Record<string, unknown> & { type: string };

/** Normalizes Responses usage: input_tokens already includes cached reads. */
export function normalizeOpenAiUsage(raw: Record<string, unknown> | undefined): Usage {
  const inputDetails = raw?.input_tokens_details as Record<string, unknown> | undefined;
  const outputDetails = raw?.output_tokens_details as Record<string, unknown> | undefined;
  const usage: Usage = {
    inputTokens: typeof raw?.input_tokens === 'number' ? raw.input_tokens : 0,
    outputTokens: typeof raw?.output_tokens === 'number' ? raw.output_tokens : 0,
    cacheReadTokens:
      typeof inputDetails?.cached_tokens === 'number' ? inputDetails.cached_tokens : 0,
    // Responses prompt caching is implicit prefix caching: no write premium.
    cacheWriteTokens: 0,
  };
  const reasoning = outputDetails?.reasoning_tokens;
  if (typeof reasoning === 'number' && reasoning > 0) {
    usage.reasoningTokens = reasoning;
  }
  return usage;
}

/**
 * Maps the typed Responses SSE stream to ChatEvents per the docs/04
 * section 5.4 table. Canonical parts come from the typed output array,
 * never the output_text aggregate. Raw output items ride
 * finish.providerMetadata.openai.outputItems so the runtime can retain
 * reasoning items as provider-raw parts.
 */
export async function mapResponsesStream(
  stream: AsyncIterable<ResponsesStreamEvent>,
  ids: OpenAiIdMap,
  emit: (event: ChatEvent) => void,
  options?: { effortDownmapped?: boolean },
): Promise<void> {
  const callIdByItemId = new Map<string, string>();

  for await (const event of stream) {
    switch (event.type) {
      case 'response.output_item.added': {
        const item = event.item as Item | undefined;
        if (item?.type === 'function_call') {
          const callId = (item.call_id ?? item.id) as string;
          if (typeof item.id === 'string') {
            callIdByItemId.set(item.id, callId);
          }
          emit({
            type: 'tool-call-start',
            id: ids.canonicalFor(callId),
            name: (item.name as string | undefined) ?? '',
          });
        }
        break;
      }
      case 'response.function_call_arguments.delta': {
        const itemId = event.item_id as string | undefined;
        const callId = itemId === undefined ? undefined : callIdByItemId.get(itemId);
        if (callId !== undefined) {
          emit({
            type: 'tool-call-delta',
            id: ids.canonicalFor(callId),
            argsTextDelta: (event.delta as string | undefined) ?? '',
          });
        }
        break;
      }
      case 'response.output_item.done': {
        const item = event.item as Item | undefined;
        if (item?.type === 'function_call') {
          const callId = (item.call_id ?? item.id) as string;
          let args: unknown = {};
          try {
            args =
              typeof item.arguments === 'string' && item.arguments !== ''
                ? JSON.parse(item.arguments)
                : {};
          } catch {
            args = { __unparsed: item.arguments };
          }
          emit({ type: 'tool-call-end', id: ids.canonicalFor(callId), args });
        }
        break;
      }
      case 'response.output_text.delta':
        emit({ type: 'text-delta', text: (event.delta as string | undefined) ?? '' });
        break;
      case 'response.reasoning_summary_text.delta':
      case 'response.reasoning_text.delta':
        emit({ type: 'reasoning-delta', text: (event.delta as string | undefined) ?? '' });
        break;
      case 'response.completed':
      case 'response.incomplete': {
        const response = event.response as Item | undefined;
        const usage = normalizeOpenAiUsage(response?.usage as Record<string, unknown> | undefined);
        emit({ type: 'usage', usage });
        let finish: FinishInfo = { reason: 'stop' };
        if (event.type === 'response.incomplete') {
          const details = response?.incomplete_details as Item | undefined;
          finish =
            details?.reason === 'max_output_tokens'
              ? { reason: 'max-tokens' }
              : details?.reason === 'content_filter'
                ? { reason: 'refusal', refusal: { provider: 'openai' } }
                : { reason: 'context-window-exceeded' };
        } else {
          const outputItems = (response?.output as Item[] | undefined) ?? [];
          const sawFunctionCall = outputItems.some((item) => item.type === 'function_call');
          const refusalPart = outputItems.some(
            (item) =>
              Array.isArray(item.content) &&
              (item.content as Item[]).some((part) => part.type === 'refusal'),
          );
          if (refusalPart) {
            finish = { reason: 'refusal', refusal: { provider: 'openai' } };
          } else if (sawFunctionCall) {
            finish = { reason: 'tool-calls' };
          }
        }
        const meta: Record<string, unknown> = {
          outputItems: response?.output ?? [],
        };
        if (typeof response?.id === 'string') {
          meta.responseId = response.id;
        }
        if (options?.effortDownmapped === true) {
          meta.effortDownmapped = 'max->xhigh';
        }
        emit({ type: 'finish', finish, usage, providerMetadata: { openai: meta } });
        return;
      }
      case 'response.failed': {
        const response = event.response as Item | undefined;
        const error = response?.error as Item | undefined;
        emit({
          type: 'error',
          error: {
            code: 'agent',
            message: (error?.message as string | undefined) ?? 'response.failed',
            retryable: false,
            data: { kind: 'transport' },
          },
        });
        return;
      }
      case 'error': {
        emit({
          type: 'error',
          error: {
            code: 'agent',
            message: (event.message as string | undefined) ?? 'stream error',
            retryable: false,
            data: { kind: 'transport' },
          },
        });
        return;
      }
      default:
        // created / in_progress / content_part / output_text.done /
        // reasoning_summary_part boundaries are internal assembly.
        break;
    }
  }
}

/** Projects SDK/API errors into the retryable WireError vocabulary. */
export function openAiErrorToWire(error: unknown): WireError {
  const record = error as {
    status?: number;
    message?: string;
    headers?: Headers | Record<string, string>;
  };
  const status = typeof record.status === 'number' ? record.status : undefined;
  const message = typeof record.message === 'string' ? record.message : String(error);
  if (status === 429) {
    let retryAfterMs: number | undefined;
    const headers = record.headers;
    if (headers !== undefined && headers !== null) {
      const value =
        typeof (headers as Headers).get === 'function'
          ? ((headers as Headers).get('retry-after') ?? undefined)
          : (headers as Record<string, string>)['retry-after'];
      if (value !== undefined) {
        retryAfterMs = Number(value) * 1000;
      }
    }
    return {
      code: 'agent',
      message,
      retryable: true,
      data: {
        kind: 'rate-limit',
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        status: 429,
      },
    };
  }
  const retryable = status === undefined || status >= 500;
  return {
    code: 'agent',
    message,
    retryable,
    data: { kind: 'transport', ...(status === undefined ? {} : { status }) },
  };
}

/**
 * The Chat Completions degraded path (docs/04, section 5.6): delta-patched
 * chunk assembly instead of typed SSE, nested function tools with explicit
 * strict where supported, response_format instead of text.format, no
 * reasoning item replay. Selected by caps (api: 'chat'), visible in
 * events, never silent.
 */
export function buildChatCompletionsParams(
  req: ChatRequest,
  ids: OpenAiIdMap,
): Record<string, unknown> {
  const messages: Item[] = [];
  for (const msg of req.messages) {
    if (msg.role === 'system') {
      const text = msg.parts
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('\n\n');
      messages.push({ role: 'system', content: text });
      continue;
    }
    if (msg.role === 'assistant') {
      const text = msg.parts
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');
      const toolCalls = msg.parts
        .filter((part) => part.type === 'tool-call')
        .map((part) => {
          const call = part as { id: CanonicalId; name: string; args: unknown };
          return {
            id: ids.wireFor(call.id),
            type: 'function',
            function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
          };
        });
      const item: Item = { role: 'assistant' };
      if (text !== '') {
        item.content = text;
      }
      if (toolCalls.length > 0) {
        item.tool_calls = toolCalls;
      }
      messages.push(item);
      continue;
    }
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        messages.push({
          role: 'tool',
          tool_call_id: ids.wireFor(part.id),
          content:
            typeof part.result === 'string' ? part.result : JSON.stringify(part.result ?? null),
        });
      } else if (part.type === 'text') {
        messages.push({ role: 'user', content: part.text });
      }
    }
  }

  const params: Record<string, unknown> = { model: req.model, messages };
  if (req.maxOutputTokens !== undefined) {
    params.max_completion_tokens = req.maxOutputTokens;
  }
  if (req.stopSequences !== undefined) {
    params.stop = req.stopSequences;
  }
  if (req.tools !== undefined) {
    params.tools = req.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        // Non-strict by default on this dialect: compensate with explicit
        // strict where the schema allows (docs/04, section 5.6).
        strict: isStrictCompatibleSchema(tool.parameters),
      },
    }));
    if (req.toolChoice === 'required') {
      params.tool_choice = 'required';
    } else if (typeof req.toolChoice === 'object') {
      params.tool_choice = { type: 'function', function: { name: req.toolChoice.name } };
    } else if (req.toolChoice === 'none') {
      // Explicit none with the tools param present (docs/04, section 8.4
      // as amended in M4-T01).
      params.tool_choice = 'none';
    }
  }
  if (req.schema !== undefined) {
    params.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'output',
        schema: req.schema,
        strict: isStrictCompatibleSchema(req.schema),
      },
    };
  }
  return params;
}

/** Delta-patched chunk assembly for the degraded path. */
export async function mapChatCompletionsStream(
  stream: AsyncIterable<Record<string, unknown>>,
  ids: OpenAiIdMap,
  emit: (event: ChatEvent) => void,
): Promise<void> {
  const pendingCalls = new Map<number, { id: string; name: string; args: string }>();
  let finishReason: string | undefined;
  let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

  for await (const chunk of stream) {
    const choices = chunk.choices as Item[] | undefined;
    const choice = choices?.[0];
    const delta = choice?.delta as Item | undefined;
    if (typeof delta?.content === 'string' && delta.content !== '') {
      emit({ type: 'text-delta', text: delta.content });
    }
    const toolCalls = delta?.tool_calls as Item[] | undefined;
    if (toolCalls !== undefined) {
      for (const call of toolCalls) {
        const index = (call.index as number | undefined) ?? 0;
        const fn = call.function as Item | undefined;
        let pending = pendingCalls.get(index);
        if (pending === undefined) {
          pending = { id: (call.id as string | undefined) ?? `call_${index}`, name: '', args: '' };
          pendingCalls.set(index, pending);
          emit({
            type: 'tool-call-start',
            id: ids.canonicalFor(pending.id),
            name: (fn?.name as string | undefined) ?? '',
          });
        }
        if (typeof fn?.name === 'string') {
          pending.name += fn.name;
        }
        if (typeof fn?.arguments === 'string' && fn.arguments !== '') {
          pending.args += fn.arguments;
          emit({
            type: 'tool-call-delta',
            id: ids.canonicalFor(pending.id),
            argsTextDelta: fn.arguments,
          });
        }
      }
    }
    if (typeof choice?.finish_reason === 'string') {
      finishReason = choice.finish_reason;
    }
    const chunkUsage = chunk.usage as Record<string, unknown> | undefined;
    if (chunkUsage !== undefined && chunkUsage !== null) {
      const promptDetails = chunkUsage.prompt_tokens_details as Record<string, unknown> | undefined;
      usage = {
        inputTokens: typeof chunkUsage.prompt_tokens === 'number' ? chunkUsage.prompt_tokens : 0,
        outputTokens:
          typeof chunkUsage.completion_tokens === 'number' ? chunkUsage.completion_tokens : 0,
        cacheReadTokens:
          typeof promptDetails?.cached_tokens === 'number' ? promptDetails.cached_tokens : 0,
        cacheWriteTokens: 0,
      };
    }
  }

  for (const [, pending] of pendingCalls) {
    let args: unknown = {};
    try {
      args = pending.args === '' ? {} : JSON.parse(pending.args);
    } catch {
      args = { __unparsed: pending.args };
    }
    emit({ type: 'tool-call-end', id: ids.canonicalFor(pending.id), args });
  }
  emit({ type: 'usage', usage });
  const finish: FinishInfo =
    finishReason === 'length'
      ? { reason: 'max-tokens' }
      : finishReason === 'tool_calls'
        ? { reason: 'tool-calls' }
        : finishReason === 'content_filter'
          ? { reason: 'refusal', refusal: { provider: 'openai' } }
          : { reason: 'stop' };
  emit({ type: 'finish', finish, usage, providerMetadata: { openai: { degradedPath: 'chat' } } });
}
