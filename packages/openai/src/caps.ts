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
   * The model accepts wire `reasoning.effort: "max"` (GPT-5.6 Sol per
   * the official model docs). When false, canonical max downmaps to
   * wire xhigh; the downmap is recorded in providerMetadata and the
   * journal identity keeps max, so caps accept the full canonical set
   * either way.
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
 * uncached input. Only Sol accepts wire reasoning effort `max`.
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

const GPT_56_TERRA: OpenAiModelInfo = responses(1_050_000, 128_000, {
  inputUsdPerMTok: 2.5,
  outputUsdPerMTok: 15,
  cacheReadUsdPerMTok: 0.25,
  cacheWriteUsdPerMTok: 3.125,
  tiers: GPT_56_TIERS,
});

const GPT_56_LUNA: OpenAiModelInfo = responses(1_050_000, 128_000, {
  inputUsdPerMTok: 1,
  outputUsdPerMTok: 6,
  cacheReadUsdPerMTok: 0.1,
  cacheWriteUsdPerMTok: 1.25,
  tiers: GPT_56_TIERS,
});

/** Static seed table of the current model set. */
export const OPENAI_MODELS: Record<string, OpenAiModelInfo> = {
  'gpt-5.6-sol': GPT_56_SOL,
  'gpt-5.6-terra': GPT_56_TERRA,
  'gpt-5.6-luna': GPT_56_LUNA,
  // The published alias routes to Sol. It is an exact alias ONLY: it is
  // never a snapshot prefix, so a sibling like 'gpt-5.6-luna' can only
  // ever match its own row (v1.17.0 review P1-1).
  'gpt-5.6': GPT_56_SOL,
  'gpt-5.5': responses(400_000, 128_000, {
    inputUsdPerMTok: 10,
    outputUsdPerMTok: 40,
    cacheReadUsdPerMTok: 1,
  }),
  'gpt-5.5-pro': responses(400_000, 128_000, {
    inputUsdPerMTok: 40,
    outputUsdPerMTok: 160,
    cacheReadUsdPerMTok: 4,
  }),
  'gpt-5.4': responses(272_000, 100_000, {
    inputUsdPerMTok: 6,
    outputUsdPerMTok: 24,
    cacheReadUsdPerMTok: 0.6,
  }),
  'gpt-5.4-mini': responses(272_000, 100_000, {
    inputUsdPerMTok: 1.2,
    outputUsdPerMTok: 4.8,
    cacheReadUsdPerMTok: 0.12,
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
  pricingVersion: 'openai-2026-07-18',
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
