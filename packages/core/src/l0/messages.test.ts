import { describe, expect, expectTypeOf, it } from 'vitest';

import { decodeTime } from '../vendor/ulid.js';
import type {
  CanonicalModelSpec,
  ChatEvent,
  Effort,
  FinishInfo,
  ModelRef,
  ModelSpec,
  Msg,
  Part,
  Usage,
} from './messages.js';
import { createCanonicalIdMinter } from './messages.js';

describe('CanonicalId minting (M1-T01)', () => {
  it('mints 26-character Crockford ULIDs', () => {
    const mint = createCanonicalIdMinter();
    const id = mint();
    expect(id).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
  });

  it('mints unique, lexicographically increasing ids within one factory', () => {
    const mint = createCanonicalIdMinter();
    const ids = Array.from({ length: 1000 }, () => mint());
    expect(new Set(ids).size).toBe(1000);
    const sorted = [...ids].sort();
    expect(sorted).toEqual(ids);
  });

  it('embeds the clock time', () => {
    const mint = createCanonicalIdMinter({ now: () => 1_700_000_000_000 });
    expect(decodeTime(mint())).toBe(1_700_000_000_000);
  });

  it('keeps separate factories independent (no module state)', () => {
    const a = createCanonicalIdMinter({ now: () => 1 });
    const b = createCanonicalIdMinter({ now: () => 1 });
    expect(a()).not.toBe(b());
  });
});

describe('wire contract types (M1-T01)', () => {
  it('refusal is a typed finish outcome, never a null projection', () => {
    const finish: FinishInfo = {
      reason: 'refusal',
      refusal: { provider: 'anthropic', stopDetails: { category: 'safety' } },
    };
    if (finish.reason === 'refusal') {
      expectTypeOf(finish.refusal.provider).toEqualTypeOf<string>();
    }
    expect(finish.reason).toBe('refusal');
  });

  it('type-level shape of the L0 contracts', () => {
    expectTypeOf<Effort>().toEqualTypeOf<'low' | 'medium' | 'high' | 'xhigh' | 'max'>();
    expectTypeOf<Msg['role']>().toEqualTypeOf<'system' | 'user' | 'assistant' | 'tool'>();
    expectTypeOf<Part>().toMatchTypeOf<{ type: string }>();
    expectTypeOf<ChatEvent>().toMatchTypeOf<{ type: string }>();
    expectTypeOf<Usage['reasoningTokens']>().toEqualTypeOf<number | undefined>();

    // A bare ModelRef is a valid ModelSpec; a ladder form is too.
    const ref: ModelRef = 'anthropic:claude-fable-5';
    expectTypeOf(ref).toMatchTypeOf<ModelSpec>();
    const canonical: CanonicalModelSpec = {
      kind: 'model',
      model: 'openai:gpt-5.5',
      effort: 'high',
    };
    expect(canonical.kind).toBe('model');

    // 'usage' events carry partial usage; 'finish' carries full usage.
    const partial: ChatEvent = { type: 'usage', usage: { outputTokens: 5 } };
    expect(partial.type).toBe('usage');
  });
});
