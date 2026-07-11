# Community guide: writing a ProviderAdapter

- Status: Ready for implementation
- Version: 0.2.0-docs
- Date: 2026-07-10
- Purpose: the community walkthrough for building a third-party ProviderAdapter against the frozen adapter seam: wire mapping requirements, the Usage invariant checklist, and VCR-based contract tests (M9-T03).

## 1. What you are implementing

A ProviderAdapter turns one provider's wire dialect into the canonical vocabulary: `ChatRequest` in, a stream of `ChatEvent` out. It is one of the six SPI seams frozen at 1.0 (02-architecture.md, section "SPI seams and the 1.0 freeze"); the contract is owned by 04-model-layer-spec.md. This guide is informative; where it restates a rule, the owning spec wins.

```ts
export interface ProviderAdapter {
  id: string;                                   // left segment of ModelRef 'adapterId:model'
  provider?: string;                            // provider family for provider-raw retention; default = id
  caps(model: string): ModelCaps;
  refreshCaps?(): Promise<void>;
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  countTokens?(req: ChatRequest): Promise<number>;
}
```

Before writing one from scratch, check the shipped surfaces: `openaiCompatible` covers any Chat Completions dialect with an explicit id and caps override (docs/04, section 6), and `bridgeAiSdk` wraps any Vercel AI SDK LanguageModelV4 (docs/04, section 7). A new adapter is worth building when the provider speaks neither.

Reference implementations, smallest first: `@rulvar/bridge-ai-sdk` (one file over an existing abstraction), `@rulvar/openai`, `@rulvar/anthropic` (full first-class adapters with caps tables, pause_turn absorption, and retention).

## 2. Wire mapping requirements

The core absorbs NO provider quirks; your adapter absorbs ALL of them invisibly (docs/04, section 1). The mapping obligations:

- Message parts are ordered; preserve part order in both directions.
- Canonical tool-call ids: the library mints ULIDs; your adapter keeps a bijective map between canonical ids and your wire ids (`toolu_*`, `call_*`) in both directions for the lifetime of a canonical history. The canonical history never contains a wire id. Copy the small IdMap class from any shipped adapter.
- Exactly one terminal event per stream: `finish` or `error`. A stream that drains without either is a provider fault your adapter surfaces as a retryable transport error. An abort via the signal is the one exception: return without a terminal event.
- Tool arguments arrive as streamed JSON text: assemble and parse them; emit `tool-call-end` with parsed args. Unparseable arguments are a typed transport error, never a silent `{}`.
- Typed refusal: a content-filter or refusal stop MUST surface as `finish: { reason: 'refusal', refusal: { provider, stopDetails } }`, never as a silently null output.
- providerOptions namespacing: read ONLY your own namespace (`req.providerOptions[yourId]`); ignore unknown namespaces without error; never let a namespaced option silently contradict a canonical field (typed ConfigError instead). Report provider-specific response facts under your namespace in `finish.providerMetadata`.
- provider-raw retention: blocks the provider needs back verbatim (thinking blocks with signatures, encrypted reasoning items) ship via `finish.providerMetadata[<id>].retainedParts`; on projection, reinsert retained blocks for same-family targets and omit foreign ones. The family tag is `ProviderAdapter.provider`, not the adapter id.
- cacheHint compiles best effort into your provider's cache mechanism; providers without one ignore it silently. It never changes response semantics.
- Retries belong to the core: disable SDK autoretries (`max_retries: 0` or equivalent); surface retry-after and rate-limit headers as typed retryable WireErrors with `retryAfterMs` in data; never sleep inside the adapter.
- Effort mapping: map canonical effort (`low | medium | high | xhigh | max`) to your wire per a documented table; a lossy downmap is recorded in providerMetadata; identity always keeps the requested canonical effort. Efforts you cannot serve stay OUT of `caps.reasoningEfforts` so the router scrubs them visibly (docs/04, sections 3.3 and 3.4).

## 3. The Usage invariant checklist

The core verifies usage at the adapter boundary (docs/04, section 1.6). Before publishing, confirm every line:

- `inputTokens` is the FULL prompt size, including cache reads AND cache writes. Providers that report non-cached input separately are normalized by addition.
- `cacheReadTokens` and `cacheWriteTokens` are always present (0 when the provider has no cache).
- `outputTokens` covers everything billed as output, including reasoning where the provider folds it in; `reasoningTokens` is the optional breakdown.
- The terminal `finish` event carries the authoritative totals; incremental `usage` events MAY repeat and MAY be partial.
- When a stream aborts at the budget ceiling, delta-accumulated usage is what the engine journals (with `usageApprox: true`); emit incremental usage where your wire provides it so that approximation is tight.
- Unpriced models are legitimate (`caps.pricing` absent): they surface as unpriced in CostReport, never as silent zeros.

## 4. Capabilities

`caps(model)` feeds the router: structured-output tier selection (`native | forced-tool | prompt`), temperature scrubbing, parallel-tool gating, effort scrubbing, context and output budgets. When you cannot introspect the target (gateways, long-tail hosts), be conservative and let callers override: the `openaiCompatible` posture is `structuredOutput: 'prompt'`, `supportsTemperature: true`, `supportsParallelTools: false`, empty `reasoningEfforts`, no pricing, with a caps callback for anything better.

## 5. Template: the adapter skeleton

The skeleton compiles against the public SPI and shows the two halves every adapter has: request compilation and stream mapping. Replace the two TODO functions with your wire dialect.

```ts
import {
  createCanonicalIdMinter,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
} from '@rulvar/core';

const CONSERVATIVE_CAPS: ModelCaps = {
  structuredOutput: 'prompt',
  supportsTemperature: true,
  supportsParallelTools: false,
  reasoningEfforts: [],
  contextWindow: 8_192,
  maxOutputTokens: 4_096,
};

export interface CommunityAdapterOptions {
  id: string;                       // explicit and mandatory, like openaiCompatible
  baseURL: string;
  apiKey?: string;
  caps?: (model: string) => Partial<ModelCaps>;
}

export function communityAdapter(options: CommunityAdapterOptions): ProviderAdapter {
  const mintCanonicalId = createCanonicalIdMinter();
  return {
    id: options.id,
    provider: options.id,
    caps(model) {
      return { ...CONSERVATIVE_CAPS, ...options.caps?.(model) };
    },
    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const wireRequest = compileRequest(req); // TODO: your dialect; SDK autoretries OFF
      try {
        for await (const wireEvent of callProvider(wireRequest, options, signal)) {
          // TODO: map your wire events; mint canonical ids for incoming
          // tool calls via mintCanonicalId(); assemble tool-arg JSON;
          // normalize usage under the invariant; emit exactly one
          // terminal finish with normalized usage.
          yield mapWireEvent(wireEvent, mintCanonicalId);
        }
      } catch (thrown) {
        if (signal?.aborted === true) {
          return; // aborted streams end without a terminal event
        }
        yield { type: 'error', error: toWireError(thrown) }; // 429 => retryable rate-limit with retryAfterMs
      }
    },
  };
}
```

## 6. VCR-based contract tests

Cassettes make your adapter testable forever with one paid run (09-observability-testing-spec.md, section "Tier 2"; the shipped tooling is in @rulvar/testing). The pattern:

1. Record once, with a real key, through the record wrapper: every completed stream appends one redacted row (authorization material never reaches cassette bytes; add a custom `redact` for provider-specific secrets).
2. Commit the cassette JSONL. It carries a hashVersion header (DEF-6).
3. CI replays hermetically: `onMiss: 'throw'` turns any drift into a loud failure with zero live calls.

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, defineWorkflow, InMemoryStore } from '@rulvar/core';
import { record, replay } from '@rulvar/testing';
import { communityAdapter } from './adapter.js';

const CASSETTE = new URL('./contract.cassette.jsonl', import.meta.url).pathname;
const MODEL = 'communityprov:small-1';
const wf = defineWorkflow({ name: 'contract' }, (ctx) => ctx.agent('Reply with the word ok.'));

function engineOver(adapters: ReturnType<typeof replay>) {
  return createEngine({
    adapters,
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: MODEL, extract: MODEL } },
  });
}

describe('communityAdapter contract', () => {
  // Recording leg: run once with a key to (re)produce the cassette.
  it.skipIf(process.env.COMMUNITYPROV_API_KEY === undefined)('records', async () => {
    const live = communityAdapter({
      id: 'communityprov',
      baseURL: 'https://api.communityprov.example',
      apiKey: process.env.COMMUNITYPROV_API_KEY,
    });
    const outcome = await engineOver(record({ adapters: [live], cassette: CASSETTE }))
      .run(wf, undefined)
      .result;
    expect(outcome.status).toBe('ok');
  });

  // Hermetic leg: the committed cassette IS the contract; CI never goes live.
  it('replays hermetically', async () => {
    const outcome = await engineOver(replay({ cassette: CASSETTE, onMiss: 'throw' }))
      .run(wf, undefined)
      .result;
    expect(outcome.status).toBe('ok');
    expect(outcome.usage.inputTokens).toBeGreaterThanOrEqual(
      outcome.usage.cacheReadTokens + outcome.usage.cacheWriteTokens,
    );
  });
});
```

Grow the recorded corpus toward the first-class adapters' coverage: a plain reply, a tool-calling turn, structured output at your declared tier, a refusal, a 429 with retry-after (fault-injection rows), and a max-tokens stop. Scheduled live re-verification against the provider (the cron contract-test pattern of docs/11, section "Cassette tier") is optional for community adapters but recommended for high-churn providers.

## 7. Publishing checklist

- SDK autoretries disabled; retry-after surfaced; no internal sleeps.
- Usage invariant checklist (section 3) fully green; the replay leg asserts it.
- Exactly one terminal event per stream, proven by a drained-stream test.
- Canonical ids minted and mapped bijectively; a two-turn tool round trip replays byte-identically.
- caps() honest: nothing declared that the provider cannot serve; efforts you cannot map stay undeclared so the scrub is visible.
- Committed cassettes redacted (run the kit's default redaction plus your provider's secret shapes) and carrying the hashVersion header.
- README documents your providerOptions namespace, effort mapping table, and any lossy downmaps.
