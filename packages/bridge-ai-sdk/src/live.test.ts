/**
 * M9-T01 live smoke (manual, key-gated): a real LanguageModelV4 from
 * @ai-sdk/google streams through the bridge. Skipped without
 * GOOGLE_GENERATIVE_AI_API_KEY; CI never runs it.
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ChatEvent } from '@lurker/core';
import { describe, expect, it } from 'vitest';

import { bridgeAiSdk } from './bridge.js';

describe('bridgeAiSdk live smoke', () => {
  it.skipIf(process.env.GOOGLE_GENERATIVE_AI_API_KEY === undefined)(
    'streams one small Google call through the bridge (manual, key-gated)',
    async () => {
      const google = createGoogleGenerativeAI({});
      const adapter = bridgeAiSdk(google.languageModel('gemini-2.5-flash'));
      const events: ChatEvent[] = [];
      for await (const event of adapter.stream({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
        maxOutputTokens: 64,
      })) {
        events.push(event);
      }
      const finish = events.find((event) => event.type === 'finish');
      expect(finish).toBeDefined();
      expect(events.some((event) => event.type === 'text-delta')).toBe(true);
    },
    30_000,
  );
});
