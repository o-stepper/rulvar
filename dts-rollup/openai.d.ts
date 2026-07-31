import OpenAI, { ClientOptions } from "openai";
import { CanonicalId, ChatEvent, ChatRequest, Effort, InvoiceRow, JournalEntry, ModelCaps, ModelRef, PriceTable, Pricing, ProviderAdapter, Usage, WireError } from "@rulvar/core";

//#region src/caps.d.ts
interface OpenAiModelInfo {
  caps: ModelCaps;
  api: "responses" | "chat";
  /** Reasoning models reject non-default sampling parameters. */
  reasoning: boolean;
  /**
  * The model accepts wire `reasoning.effort: "max"` (the whole GPT-5.6
  * family per the official model guidance, each sibling verified live
  * 2026-07-18). When false, canonical max downmaps to wire xhigh; the
  * downmap is recorded in providerMetadata and the journal identity
  * keeps max, so caps accept the full canonical set either way. Flip
  * this to true ONLY on a per-model live verification, never from the
  * family page alone.
  */
  wireMaxEffort: boolean;
}
/** Static seed table of the current model set. */
declare const OPENAI_MODELS: Record<string, OpenAiModelInfo>;
/**
* Unknown OpenAI models are assumed current-generation Responses models
* with conservative transport caps and NO pricing: a fabricated price row
* silently misprices every model newer than this table (it priced
* gpt-5.6-sol as gpt-5.4 before the 5.6 entries landed). Hosts price an
* unrecognized hosted model via a versioned createEngine({ pricing }) row;
* until then its usage surfaces in CostReport.unpriced and a run ceiling
* warns that it cannot bound the model.
*/
/**
* The seed pricing rows as a versioned price table, keyed by full
* ModelRef under the adapter's fixed id 'openai' (long-context tiers
* included; the 'gpt-5.6' alias carries the same row as its Sol
* target). Pass it to createEngine({ pricing }) so the run journals a
* concrete pricingVersion instead of 'unpriced': the versioned table
* wins over the caps fallback by rule, and a later table revision
* surfaces as explicit configuration drift on resume rather than a
* silent reinterpretation.
*/
declare const OPENAI_PRICING: PriceTable;
declare function openAiModelInfo(model: string): OpenAiModelInfo;
//#endregion
//#region src/adapter.d.ts
/** The client sub-surface the adapter consumes; injectable for tests. */
interface OpenAiClientLike {
  responses: {
    create(params: Record<string, unknown>, opts?: {
      signal?: AbortSignal;
    }): Promise<unknown>;
  };
  chat: {
    completions: {
      create(params: Record<string, unknown>, opts?: {
        signal?: AbortSignal;
      }): Promise<unknown>;
    };
  };
}
/**
* Official SDK construction options forwarded verbatim to
* `new OpenAI(...)`, minus `maxRetries`: Rulvar owns retries and
* wall-clock, so SDK autoretries stay disabled no matter what is passed
* here. This is the production surface for auth beyond a plain API key,
* `workloadIdentity` federation included, plus `fetch`, `timeout`, and
* `defaultHeaders`. The SDK's own rules still apply inside it, e.g.
* `sdkOptions.apiKey` and `sdkOptions.workloadIdentity` are mutually
* exclusive and rejected typed at construction.
*/
type OpenAiSdkOptions = Omit<ClientOptions, "maxRetries">;
interface OpenAiAdapterOptions {
  /** Shorthand for `sdkOptions.apiKey`; setting both is a ConfigError. */
  apiKey?: string;
  /** Shorthand for `sdkOptions.baseURL`; setting both is a ConfigError. */
  baseURL?: string;
  /** Official SDK construction options; see `OpenAiSdkOptions`. */
  sdkOptions?: OpenAiSdkOptions;
  /**
  * A preconstructed client instead of the construction options above
  * (combining them is a ConfigError): the official `OpenAI` instance
  * (production; it must be constructed with `maxRetries: 0`) or a
  * structural `OpenAiClientLike` mock (tests).
  */
  client?: OpenAI | OpenAiClientLike;
}
/** Creates the first-class OpenAI adapter (id 'openai'); maxRetries 0. */
declare function openai(options?: OpenAiAdapterOptions): ProviderAdapter;
//#endregion
//#region src/compatible.d.ts
/**
* Gateways cannot be introspected reliably: when caps are not supplied
* the factory assumes the most conservative capability set. Callers
* SHOULD supply caps for anything beyond it; the
* window and output floors here are deliberately small so an unprobed
* endpoint is never overcommitted. Absent pricing is legitimate for
* local models: they surface as unpriced in CostReport.
*/
declare const CONSERVATIVE_COMPATIBLE_CAPS: ModelCaps;
interface OpenAiCompatibleConfig {
  /** Explicit adapter id, e.g. 'ollama', 'vllm', 'openrouter'. */
  id: string;
  baseURL: string;
  apiKey?: string;
  /** Per-model capability overrides merged over the conservative set. */
  caps?: (model: string) => ModelCaps | Partial<ModelCaps>;
  /** Test seam: a preconstructed client; production uses the openai SDK. */
  client?: OpenAiClientLike;
}
/** Creates a Chat Completions dialect adapter for a compatible endpoint. */
declare function openaiCompatible(cfg: OpenAiCompatibleConfig): ProviderAdapter;
//#endregion
//#region src/audit.d.ts
/**
* The exact inverse of the v1.19.0 double count for one usage:
* subtracts `cacheWriteTokens` back out of `inputTokens` and leaves
* every other field untouched. A usage without cache writes is returned
* unchanged (v1.19.0 recorded those correctly). Throws a typed
* ConfigError when the arithmetic cannot be the v1.19.0 shape (the
* recorded input has no room for the subtraction), which means the
* usage was NOT recorded by the affected adapter; do not guess.
*/
declare function undoV1190CacheDoubleCount(usage: Usage): Usage;
/** One journal's sidecar reconciliation; see auditV1190CacheJournal. */
interface V1190CacheAudit {
  /** Entries whose usage carried the affected shape and were inverted. */
  affectedEntries: number;
  /** The fold as recorded (what reports and budgets saw). */
  recordedUsd: number;
  /** The fold with every affected usage inverted to the true wire shape. */
  correctedUsd: number;
}
/**
* Folds a journal twice with the SAME price function: once as recorded
* and once with every affected OpenAI usage passed through
* `undoV1190CacheDoubleCount`, returning both totals and the affected
* entry count. An entry (or per-model slice) counts as affected when it
* was served by the `openai` adapter, carries cache writes, and has no
* `usageSemantics` stamp; stamped entries are already correct and fold
* identically in both totals. The journal itself is never touched.
* `recordedUsd - correctedUsd` is the exact overcharge IF the journal
* was recorded by v1.19.0; for a v1.20.0 journal the same shape folds
* to a smaller `correctedUsd` that does NOT correspond to any real
* charge, so version provenance stays the caller's responsibility.
*/
declare function auditV1190CacheJournal(entries: readonly JournalEntry[], priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined): V1190CacheAudit;
//#endregion
//#region src/reconcile.d.ts
/** The four billing components a provider statement itemizes. */
type BillingComponent = "input" | "cached-input" | "cache-write" | "output";
/**
* One normalized per-request row of a usage/billing export. `usd` is
* the row's billed dollars where the export carries amounts;
* `componentsUsd` its per-component split where it carries one; `usage`
* the provider-reported token counts where it carries those. A row must
* carry at least one of the three, and every row needs the provider's
* response id, the join key.
*/
interface StatementRequestRow {
  responseId: string;
  /** Provider-side model name (without the adapter prefix); optional. */
  model?: string;
  usd?: number;
  componentsUsd?: Partial<Record<BillingComponent, number>>;
  usage?: {
    inputTokens?: number;
    cachedInputTokens?: number;
    cacheWriteTokens?: number;
    outputTokens?: number;
  };
}
/** One per-model per-component total: the Spend categories shape. */
interface StatementCategoryRow {
  model: string;
  component: BillingComponent;
  usd: number;
}
/** A normalized provider export: never a headline total. */
type ProviderStatement = {
  kind: "requests";
  rows: readonly StatementRequestRow[];
} | {
  kind: "categories";
  rows: readonly StatementCategoryRow[];
};
interface ReconcileStatementOptions {
  /** Our rate card, the same resolution the engine prices with. */
  pricingOf: (servedBy: ModelRef) => Pricing | undefined;
  /**
  * Per-component divergence threshold in USD. The default 0.005
  * absorbs the dashboard's 3-decimal rounding (at most 0.0005 per
  * figure) with an order of margin, while any real rate-card
  * divergence on a run worth reconciling sits orders above it.
  */
  componentToleranceUsd?: number;
  /**
  * Totals threshold for a per-request export that carries row dollars
  * but no per-component split; default 0.01.
  */
  totalToleranceUsd?: number;
  /** Provider-side model name of a served ref; default strips the adapter prefix. */
  modelOf?: (servedBy: ModelRef) => string;
  /**
  * How provider-reported token counts weigh on the verdict (RV903).
  * 'verdict' (default): any token disagreement between the export and
  * our recorded usage is a divergence, because our counts ARE the
  * provider's own wire-reported numbers, so an export that disagrees
  * with them describes a different request than the wire served, and
  * dollars derived from either cannot be trusted to mean the same
  * thing. 'informational' preserves the pre-v1.126 dollar-only
  * verdict for exports whose token semantics legitimately differ from
  * the wire's (a different cache accounting, rounded aggregates):
  * mismatches are still counted and sampled, but only dollar deltas
  * decide.
  */
  tokenComparison?: "verdict" | "informational";
}
/** One (model, component) line of the reconciliation. */
interface ComponentDelta {
  model: string;
  component: BillingComponent;
  /** Our token base for the component, from the invoice rows' usage. */
  ourTokens: number;
  /** Our dollars, from the shared price decomposition (priceComponentsOf). */
  ourUsd: number;
  /** The statement's dollars; absent when the export does not carry this line. */
  statementUsd?: number;
  deltaUsd?: number;
  /** statementUsd over ourTokens, per MTok: the rate the provider ACTUALLY applied. */
  impliedUsdPerMTok?: number;
  /** ourUsd over ourTokens, per MTok: our effective rate over the same base, tier mix included. */
  effectiveUsdPerMTok?: number;
  divergent: boolean;
}
interface StatementCoverage {
  /** Invoice rows carrying usage or dollars: the billable set. */
  billableRows: number;
  rowsWithResponseId: number;
  /** Requests mode: rows the export covered. Categories mode: equals billableRows (totals claim the set). */
  matchedRows: number;
  unmatchedRows: number;
  /** First unmatched response ids (at most 20), requests mode. */
  unmatchedIdSample: string[];
  /** Statement rows matching nothing of ours: ids (requests) or model names (categories). */
  statementOnlyRows: number;
  statementOnlyIdSample: string[];
  complete: boolean;
}
interface StatementReconciliation {
  mode: "requests" | "categories";
  coverage: StatementCoverage;
  totals: {
    ourUsd: number;
    statementUsd?: number;
    deltaUsd?: number;
  };
  /** Every (model, component) line, models sorted, components in canonical order. */
  components: ComponentDelta[];
  /** The lines beyond tolerance, largest |delta| first: the named divergences. */
  divergent: ComponentDelta[];
  /**
  * Token disagreements between the export and our recorded usage
  * (requests mode). Under the default tokenComparison 'verdict' any
  * mismatch makes the verdict 'divergence'; under 'informational' the
  * count and sample still report, advisory only (RV903).
  */
  tokenMismatches: number;
  tokenMismatchSample: Array<{
    responseId: string;
    field: string;
    ours: number;
    statement: number;
  }>;
  /** Models the rate card does not cover: declared, excluded from divergence. */
  unpricedModels: string[];
  /** Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. */
  usageUnknownRows: number;
  componentToleranceUsd: number;
  verdict: "match" | "divergence" | "partial-coverage" | "no-overlap";
}
/**
* Reconciles the invoice against a normalized provider export. Pure and
* journal-free; see the module doc for the contract. Throws a typed
* ConfigError on inputs that cannot be evidence: an empty statement (a
* headline total with no rows), a request row without a response id, a
* duplicate response id (an ambiguous join), a request export whose
* rows carry neither dollars, components, nor usage, any non-finite or
* negative dollar amount, any non-integer or negative token count, or
* a non-finite or negative tolerance (RV903: a statement that cannot
* be summed must refuse loudly, never verdict 'match' on NaN totals).
*/
declare function reconcileStatement(invoice: {
  rows: readonly InvoiceRow[];
}, statement: ProviderStatement, options: ReconcileStatementOptions): StatementReconciliation;
//#endregion
//#region src/wire.d.ts
/** Bijective canonical-to-wire (call_*) id map. */
declare class OpenAiIdMap {
  private readonly toWire;
  private readonly toCanonical;
  private readonly mint;
  constructor(mint: () => CanonicalId);
  canonicalFor(wireId: string): CanonicalId;
  wireFor(canonicalId: CanonicalId): string;
}
/**
* Canonical-to-wire effort: low through xhigh pass through. Canonical
* max passes through unchanged on models whose caps declare wire max
* support (the whole GPT-5.6 family, each sibling verified live
* 2026-07-18; v1.20.0 review P2-3); elsewhere it downmaps to xhigh
* (documented lossy; recorded in providerMetadata). Provider 'none' is
* reachable only via providerOptions.openai.reasoningEffort.
*/
declare function mapOpenAiEffort(effort: Effort, options?: {
  wireMaxEffort?: boolean;
}): {
  wire: string;
  downmapped: boolean;
};
/**
* Builds Responses API params. Manual item replay ONLY: store: false plus
* include reasoning.encrypted_content; previous_response_id and the
* Conversations API place state server-side, break replay identity, and
* are REJECTED as a typed ConfigError. Role
* 'system' messages project into top-level instructions on every request.
*/
declare function buildResponsesParams(req: ChatRequest, ids: OpenAiIdMap, options?: {
  wireMaxEffort?: boolean;
}): {
  params: Record<string, unknown>;
  effortDownmapped: boolean;
};
/** Raw Responses SSE events, structurally typed. */
type ResponsesStreamEvent = Record<string, unknown> & {
  type: string;
};
/**
* Normalizes Responses usage into the canonical Usage invariant, where
* `inputTokens` is the FULL prompt. On the OpenAI wire `input_tokens`
* is ALREADY that full count: `input_tokens_details.cached_tokens` and
* `input_tokens_details.cache_write_tokens` (GPT-5.6 and later
* families) are priced SUBSETS of it, never additional tokens, so both
* pass through untouched and nothing is added. Verified on the live
* wire 2026-07-18: two identical long prompts report the SAME
* `input_tokens` while the details flip from write to read, and
* `total_tokens` equals `input_tokens + output_tokens` on both calls.
* Adding writes on top (the v1.19.0 reading of the field) double-billed
* every written token at 1x + 1.25x and inflated budget debits
* (v1.19.0 review P1-1). Contrast with the Anthropic adapter, whose
* wire genuinely EXCLUDES both cache counts from `input_tokens`, so
* that adapter adds them; the two wires differ, the canonical Usage
* invariant does not.
*
* Numeric hygiene is deliberately NOT this function's job: any `number`
* the wire (or an injected client) reports passes through, and the core
* enforces the full telemetry invariant at the adapter boundary for
* every adapter uniformly, failing the call loud on non-finite,
* negative, or fractional counts while accounting only sanitized values
* (`usageViolations`/`sanitizeUsage` in @rulvar/core; v1.20.0 review
* P1-1). Real wires report whole nonnegative integers; a violation here
* means a broken transport, never plausible provider data.
*/
declare function normalizeOpenAiUsage(raw: Record<string, unknown> | undefined): Usage;
/**
* Maps the typed Responses SSE stream to ChatEvents, yielding each
* canonical event AS the corresponding provider event is consumed: the
* consumer's pull drives the provider read (natural backpressure, no
* buffering, no detached work). Canonical parts come from the typed
* output array, never the output_text aggregate. Raw output items ride
* finish.providerMetadata.openai.outputItems so the runtime can retain
* reasoning items as provider-raw parts.
*
* A stream that drains without any response terminal event
* (`response.completed`, `response.incomplete`, `response.failed`, or
* `error`) is a truncated wire read: the mapper fails closed with one
* retryable transport error instead of ending silently, unless
* `options.signal` shows the caller requested the abort (the documented
* exception that ends a stream without a terminal event).
*/
declare function mapResponsesStream(stream: AsyncIterable<ResponsesStreamEvent>, ids: OpenAiIdMap, options?: {
  effortDownmapped?: boolean;
  signal?: AbortSignal;
}): AsyncGenerator<ChatEvent, void>;
/** Projects SDK/API errors into the retryable WireError vocabulary. */
declare function openAiErrorToWire(error: unknown): WireError;
/**
* The Chat Completions degraded path: delta-patched
* chunk assembly instead of typed SSE, nested function tools with explicit
* strict where supported, response_format instead of text.format, no
* reasoning item replay. Selected by caps (api: 'chat'), visible in
* events, never silent.
*/
declare function buildChatCompletionsParams(req: ChatRequest, ids: OpenAiIdMap): Record<string, unknown>;
/**
* Delta-patched chunk assembly for the degraded path; yields each
* canonical event as its chunk is consumed (same live-streaming contract
* as mapResponsesStream).
*
* The chat dialect has no explicit terminal frame at this layer: the
* only completion signal is a `finish_reason` on the last choice chunk.
* A stream that drains without one is a truncated wire read, so the
* mapper fails closed with one retryable transport error (after
* forwarding any usage the provider did report, which was still paid
* for) instead of synthesizing a `stop` finish, unless `options.signal`
* shows the caller requested the abort.
*/
declare function mapChatCompletionsStream(stream: AsyncIterable<Record<string, unknown>>, ids: OpenAiIdMap, options?: {
  signal?: AbortSignal;
}): AsyncGenerator<ChatEvent, void>;
//#endregion
export { type BillingComponent, CONSERVATIVE_COMPATIBLE_CAPS, type ComponentDelta, OPENAI_MODELS, OPENAI_PRICING, type OpenAiAdapterOptions, type OpenAiClientLike, type OpenAiCompatibleConfig, OpenAiIdMap, type OpenAiModelInfo, type OpenAiSdkOptions, type ProviderStatement, type ReconcileStatementOptions, type ResponsesStreamEvent, type StatementCategoryRow, type StatementCoverage, type StatementReconciliation, type StatementRequestRow, type V1190CacheAudit, auditV1190CacheJournal, buildChatCompletionsParams, buildResponsesParams, mapChatCompletionsStream, mapOpenAiEffort, mapResponsesStream, normalizeOpenAiUsage, openAiErrorToWire, openAiModelInfo, openai, openaiCompatible, reconcileStatement, undoV1190CacheDoubleCount };