/**
 * M9-T01 live smoke (opt-in, spends budget): a real LanguageModelV4 from
 * @ai-sdk/google streams through the bridge. Runs only with
 * RULVAR_LIVE_TESTS=1 AND GOOGLE_GENERATIVE_AI_API_KEY set (a key alone
 * is never an opt-in); CI never runs it. Use `pnpm test:live`.
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { liveTestEnabled, runLiveSmoke } from '@rulvar/testing';
import { describe, expect, it } from 'vitest';

import { bridgeAiSdk } from './bridge.js';

describe('bridgeAiSdk live smoke', () => {
  it.skipIf(!liveTestEnabled('GOOGLE_GENERATIVE_AI_API_KEY'))(
    'streams one small Google call through the bridge (opt-in via RULVAR_LIVE_TESTS=1)',
    async () => {
      const google = createGoogleGenerativeAI({});
      const adapter = bridgeAiSdk(google.languageModel('gemini-2.5-flash'));
      // Bounded retry so a transient overload gets a second chance while
      // a non-retryable error fails immediately with the typed
      // diagnostics intact (v1.13 review P3-1).
      const outcome = await runLiveSmoke(adapter, {
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
        maxOutputTokens: 64,
      });
      if (outcome.status !== 'ok') {
        throw new Error(`live smoke did not reach finish: ${JSON.stringify(outcome)}`);
      }
      expect(outcome.events.some((event) => event.type === 'text-delta')).toBe(true);
    },
    90_000,
  );
});
