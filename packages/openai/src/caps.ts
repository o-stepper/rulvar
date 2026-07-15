/**
 * Capability table for the July 2026 OpenAI model family (M1-T13). Seed
 * values; pricing is the adapter-reported fallback only. `api` selects
 * Responses (first class) versus the Chat Completions degraded path;
 * degraded-path selection is a caps fact, visible in events, never silent.
 */
import type { Effort, ModelCaps, Pricing } from '@rulvar/core';

const REASONING_EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh'];

export interface OpenAiModelInfo {
  caps: ModelCaps;
  api: 'responses' | 'chat';
  /** Reasoning models reject non-default sampling parameters. */
  reasoning: boolean;
}

function responses(
  contextWindow: number,
  maxOutputTokens: number,
  pricing?: Pricing,
): OpenAiModelInfo {
  return {
    caps: {
      structuredOutput: 'native',
      supportsTemperature: false,
      supportsParallelTools: true,
      // Canonical max downmaps to wire xhigh; identity keeps max,
      // so caps accept the full canonical set.
      reasoningEfforts: [...REASONING_EFFORTS, 'max'],
      contextWindow,
      maxOutputTokens,
      ...(pricing === undefined ? {} : { pricing }),
    },
    api: 'responses',
    reasoning: true,
  };
}

/**
 * GPT-5.6 Sol (developers.openai.com/api/docs/models/gpt-5.6-sol):
 * prompts strictly above 272K input tokens price the FULL request at
 * 2x input and 1.5x output; cache writes bill at 1.25x uncached input.
 */
const GPT_56_SOL: OpenAiModelInfo = responses(1_050_000, 128_000, {
  inputUsdPerMTok: 5,
  outputUsdPerMTok: 30,
  cacheReadUsdPerMTok: 0.5,
  cacheWriteUsdPerMTok: 6.25,
  tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
});

/** Static seed table of the current model set. */
export const OPENAI_MODELS: Record<string, OpenAiModelInfo> = {
  'gpt-5.6-sol': GPT_56_SOL,
  // The published alias routes to Sol.
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
export function openAiModelInfo(model: string): OpenAiModelInfo {
  const exact = OPENAI_MODELS[model];
  if (exact !== undefined) {
    return exact;
  }
  // Longest matching prefix wins: a dated 'gpt-5.5-pro-...' snapshot must
  // resolve to 'gpt-5.5-pro', never to the shorter 'gpt-5.5'.
  let best: { name: string; info: OpenAiModelInfo } | undefined;
  for (const [name, info] of Object.entries(OPENAI_MODELS)) {
    if (model.startsWith(`${name}-`) && (best === undefined || name.length > best.name.length)) {
      best = { name, info };
    }
  }
  if (best !== undefined) {
    return best.info;
  }
  return responses(272_000, 100_000);
}
