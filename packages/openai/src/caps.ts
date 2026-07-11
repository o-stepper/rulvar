/**
 * Capability table for the July 2026 OpenAI model family (M1-T13). Seed
 * values; pricing is the adapter-reported fallback only (docs/04, section
 * "Pricing"). `api` selects Responses (first class) versus the Chat
 * Completions degraded path (docs/04, section 5.6); degraded-path
 * selection is a caps fact, visible in events, never silent.
 */
import type { Effort, ModelCaps } from '@rulvar/core';

const REASONING_EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh'];

export interface OpenAiModelInfo {
  caps: ModelCaps;
  api: 'responses' | 'chat';
  /** Reasoning models reject non-default sampling parameters (docs/04, section 5.1). */
  reasoning: boolean;
}

function responses(
  contextWindow: number,
  maxOutputTokens: number,
  pricing: { in: number; out: number; cacheRead: number },
): OpenAiModelInfo {
  return {
    caps: {
      structuredOutput: 'native',
      supportsTemperature: false,
      supportsParallelTools: true,
      // Canonical max downmaps to wire xhigh; identity keeps max
      // (docs/04, section 3.3), so caps accept the full canonical set.
      reasoningEfforts: [...REASONING_EFFORTS, 'max'],
      contextWindow,
      maxOutputTokens,
      pricing: {
        inputUsdPerMTok: pricing.in,
        outputUsdPerMTok: pricing.out,
        cacheReadUsdPerMTok: pricing.cacheRead,
      },
    },
    api: 'responses',
    reasoning: true,
  };
}

/** Static seed table; docs/04 section 5 names the current model set. */
export const OPENAI_MODELS: Record<string, OpenAiModelInfo> = {
  'gpt-5.5': responses(400_000, 128_000, { in: 10, out: 40, cacheRead: 1 }),
  'gpt-5.5-pro': responses(400_000, 128_000, { in: 40, out: 160, cacheRead: 4 }),
  'gpt-5.4': responses(272_000, 100_000, { in: 6, out: 24, cacheRead: 0.6 }),
  'gpt-5.4-mini': responses(272_000, 100_000, { in: 1.2, out: 4.8, cacheRead: 0.12 }),
};

/** Unknown OpenAI models are assumed current-generation Responses models. */
export function openAiModelInfo(model: string): OpenAiModelInfo {
  const exact = OPENAI_MODELS[model];
  if (exact !== undefined) {
    return exact;
  }
  for (const [name, info] of Object.entries(OPENAI_MODELS)) {
    if (model.startsWith(`${name}-`)) {
      return info;
    }
  }
  return responses(272_000, 100_000, { in: 6, out: 24, cacheRead: 0.6 });
}
