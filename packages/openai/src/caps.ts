/**
 * Capability table for the July 2026 OpenAI model family (M1-T13). Seed
 * values; pricing is the adapter-reported fallback only. `api` selects
 * Responses (first class) versus the Chat Completions degraded path;
 * degraded-path selection is a caps fact, visible in events, never silent.
 */
import type { Effort, ModelCaps, ModelRef, PriceTable, Pricing } from '@rulvar/core';

const REASONING_EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh'];

export interface OpenAiModelInfo {
  caps: ModelCaps;
  api: 'responses' | 'chat';
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

function responses(
  contextWindow: number,
  maxOutputTokens: number,
  pricing?: Pricing,
  options?: { wireMaxEffort?: boolean },
): OpenAiModelInfo {
  return {
    caps: {
      structuredOutput: 'native',
      supportsTemperature: false,
      supportsParallelTools: true,
      reasoningEfforts: [...REASONING_EFFORTS, 'max'],
      contextWindow,
      maxOutputTokens,
      ...(pricing === undefined ? {} : { pricing }),
    },
    api: 'responses',
    reasoning: true,
    wireMaxEffort: options?.wireMaxEffort === true,
  };
}

const GPT_56_TIERS = [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }];

/**
 * GPT-5.6 Sol, Terra, and Luna are three sibling models, not snapshots
 * of one model (developers.openai.com/api/docs/models/gpt-5.6-sol,
 * .../gpt-5.6-terra, .../gpt-5.6-luna; rates verified 2026-07-18). All
 * three: prompts strictly above 272K input tokens price the FULL
 * request at 2x input and 1.5x output; cache writes bill at 1.25x
 * uncached input. All three accept wire reasoning effort `max`
 * (v1.20.0 review P2-3; verified live per sibling 2026-07-18: a
 * Responses call with `reasoning.effort: "max"` returns HTTP 200 with
 * the effort echoed on Terra and Luna alike, and the API's own 400
 * validator for an invalid effort enumerates `max` among the supported
 * values, so acceptance is enforcement, not silence). Earlier families
 * keep the conservative downmap until verified the same way.
 */
const GPT_56_SOL: OpenAiModelInfo = responses(
  1_050_000,
  128_000,
  {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 30,
    cacheReadUsdPerMTok: 0.5,
    cacheWriteUsdPerMTok: 6.25,
    tiers: GPT_56_TIERS,
  },
  { wireMaxEffort: true },
);

const GPT_56_TERRA: OpenAiModelInfo = responses(
  1_050_000,
  128_000,
  {
    inputUsdPerMTok: 2.5,
    outputUsdPerMTok: 15,
    cacheReadUsdPerMTok: 0.25,
    cacheWriteUsdPerMTok: 3.125,
    tiers: GPT_56_TIERS,
  },
  { wireMaxEffort: true },
);

const GPT_56_LUNA: OpenAiModelInfo = responses(
  1_050_000,
  128_000,
  {
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 6,
    cacheReadUsdPerMTok: 0.1,
    cacheWriteUsdPerMTok: 1.25,
    tiers: GPT_56_TIERS,
  },
  { wireMaxEffort: true },
);

/** Static seed table of the current model set. */
export const OPENAI_MODELS: Record<string, OpenAiModelInfo> = {
  'gpt-5.6-sol': GPT_56_SOL,
  'gpt-5.6-terra': GPT_56_TERRA,
  'gpt-5.6-luna': GPT_56_LUNA,
  // The published alias routes to Sol. It is an exact alias ONLY: it is
  // never a snapshot prefix, so a sibling like 'gpt-5.6-luna' can only
  // ever match its own row (v1.17.0 review P1-1).
  'gpt-5.6': GPT_56_SOL,
  // Pre-5.6 rows per the official table (rates re-verified 2026-07-18,
  // v1.18.0 review P1-6: the provider dropped these prices when the 5.6
  // family shipped). These families report no cache_write_tokens and
  // bill no write premium, so the rows deliberately carry no
  // cacheWriteUsdPerMTok. gpt-5.5-pro lists NO cached-input rate at all:
  // the row omits it, and a cached read, should the API ever report one
  // there, bills at the full input rate (conservative), never a
  // fabricated discount.
  'gpt-5.5': responses(400_000, 128_000, {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 30,
    cacheReadUsdPerMTok: 0.5,
  }),
  'gpt-5.5-pro': responses(400_000, 128_000, {
    inputUsdPerMTok: 30,
    outputUsdPerMTok: 180,
  }),
  'gpt-5.4': responses(272_000, 100_000, {
    inputUsdPerMTok: 2.5,
    outputUsdPerMTok: 15,
    cacheReadUsdPerMTok: 0.25,
  }),
  'gpt-5.4-mini': responses(272_000, 100_000, {
    inputUsdPerMTok: 0.75,
    outputUsdPerMTok: 4.5,
    cacheReadUsdPerMTok: 0.075,
  }),
};

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
export const OPENAI_PRICING: PriceTable = {
  // The -r2 suffix is a same-day revision: the 2026-07-18 snapshot
  // shipped with stale pre-5.6 rows (v1.18.0 review P1-6), and the
  // corrected table needs a DISTINCT version string so a resumed run
  // that priced under the stale rows surfaces the drift instead of
  // silently reinterpreting past spend.
  pricingVersion: 'openai-2026-07-18-r2',
  models: ((): Record<ModelRef, Pricing> => {
    const models: Record<ModelRef, Pricing> = {};
    for (const [name, info] of Object.entries(OPENAI_MODELS)) {
      if (info.caps.pricing !== undefined) {
        models[`openai:${name}`] = info.caps.pricing;
      }
    }
    return models;
  })(),
};

/**
 * The documented snapshot grammar: `<exact model>-YYYY-MM-DD`. Nothing
 * else inherits a table row (v1.17.0 review P1-1): a general prefix
 * matcher let the 'gpt-5.6' family alias capture the SIBLING models
 * 'gpt-5.6-terra' and 'gpt-5.6-luna' and price them as Sol, which is
 * worse than no price at all. An unknown sibling or preview suffix now
 * falls through to conservative unpriced caps.
 */
const DATED_SNAPSHOT = /^(?<base>.+)-\d{4}-\d{2}-\d{2}$/u;

export function openAiModelInfo(model: string): OpenAiModelInfo {
  const exact = OPENAI_MODELS[model];
  if (exact !== undefined) {
    return exact;
  }
  const snapshot = DATED_SNAPSHOT.exec(model)?.groups?.base;
  if (snapshot !== undefined) {
    const base = OPENAI_MODELS[snapshot];
    if (base !== undefined) {
      return base;
    }
  }
  return responses(272_000, 100_000);
}
