import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ChatEvent, ChatRequest } from '../l0/messages.js';
import type { ModelCaps, ProviderAdapter } from '../l0/spi/provider.js';
import { isStrictCompatibleSchema, selectStructuredOutputTier, tierWithinCaps } from './caps.js';
import {
  buildAdapterRegistry,
  parseModelRef,
  resolveModelInvocation,
  ROLE_EFFORT_DEFAULTS,
} from './router.js';

function caps(overrides?: Partial<ModelCaps>): ModelCaps {
  return {
    structuredOutput: 'native',
    supportsTemperature: false,
    supportsParallelTools: true,
    reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    ...overrides,
  };
}

function fakeAdapter(id: string, modelCaps: ModelCaps = caps()): ProviderAdapter {
  return {
    id,
    caps: () => modelCaps,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(_req: ChatRequest): AsyncIterable<ChatEvent> {
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    },
  };
}

describe('adapter registry and ModelRef (M1-T05; docs/04 section 8.1)', () => {
  it('rejects a duplicate adapterId with ConfigError', () => {
    expect(() => buildAdapterRegistry([fakeAdapter('a'), fakeAdapter('a')])).toThrow(ConfigError);
    const registry = buildAdapterRegistry([fakeAdapter('a'), fakeAdapter('b')]);
    expect([...registry.keys()]).toEqual(['a', 'b']);
  });

  it('parses strictly adapterId:model, splitting on the first colon only', () => {
    expect(parseModelRef('anthropic:claude-fable-5')).toEqual({
      adapterId: 'anthropic',
      model: 'claude-fable-5',
    });
    expect(parseModelRef('ollama:llama3:8b')).toEqual({ adapterId: 'ollama', model: 'llama3:8b' });
    expect(() => parseModelRef(':model')).toThrow(ConfigError);
    expect(() => parseModelRef('adapter:')).toThrow(ConfigError);
  });
});

describe('resolution chain (M1-T05; docs/04 section 8.2-8.3)', () => {
  const capsOf = () => caps();

  it('AgentOpts.model overrides all roles at once', () => {
    for (const role of ['loop', 'extract', 'summarize'] as const) {
      const resolved = resolveModelInvocation({
        role,
        call: { model: 'anthropic:claude-fable-5' },
        profile: { model: 'openai:gpt-5.4-mini' },
        engine: { routing: { [role]: 'openai:gpt-5.5' } },
        capsOf,
      });
      expect(resolved.ref).toBe('anthropic:claude-fable-5');
    }
  });

  it('AgentOpts.routing overrides per-role above profile.routing', () => {
    const resolved = resolveModelInvocation({
      role: 'extract',
      call: {
        model: 'anthropic:claude-fable-5',
        routing: { extract: 'openai:gpt-5.4-mini' },
      },
      profile: { routing: { extract: 'openai:gpt-5.5' } },
      capsOf,
    });
    // Per-role routing wins over the all-roles model within the call layer.
    expect(resolved.ref).toBe('openai:gpt-5.4-mini');
  });

  it('falls through call > profile > workflow > engine', () => {
    const resolved = resolveModelInvocation({
      role: 'loop',
      profile: {},
      workflow: {},
      engine: { routing: { loop: 'anthropic:claude-sonnet-5' } },
      capsOf,
    });
    expect(resolved.ref).toBe('anthropic:claude-sonnet-5');

    const fromProfile = resolveModelInvocation({
      role: 'loop',
      profile: { model: 'openai:gpt-5.5' },
      engine: { routing: { loop: 'anthropic:claude-sonnet-5' } },
      capsOf,
    });
    expect(fromProfile.ref).toBe('openai:gpt-5.5');
  });

  it('no resolvable model is a ConfigError', () => {
    expect(() => resolveModelInvocation({ role: 'loop', capsOf })).toThrow(ConfigError);
  });

  it('the explicit AgentOpts.effort field wins over a ModelChoice-carried effort', () => {
    const resolved = resolveModelInvocation({
      role: 'loop',
      call: {
        model: { model: 'anthropic:claude-fable-5', effort: 'low' },
        effort: 'max',
      },
      capsOf,
    });
    expect(resolved.requestedEffort).toBe('max');
    expect(resolved.canonical).toEqual({
      kind: 'model',
      model: 'anthropic:claude-fable-5',
      effort: 'max',
    });
  });

  it('applies role effort defaults: orchestrate/plan high, summarize/extract low', () => {
    expect(ROLE_EFFORT_DEFAULTS).toEqual({
      orchestrate: 'high',
      plan: 'high',
      summarize: 'low',
      extract: 'low',
    });
    const plan = resolveModelInvocation({
      role: 'plan',
      call: { model: 'anthropic:claude-fable-5' },
      capsOf,
    });
    expect(plan.requestedEffort).toBe('high');
    const extract = resolveModelInvocation({
      role: 'extract',
      call: { model: 'anthropic:claude-fable-5' },
      capsOf,
    });
    expect(extract.requestedEffort).toBe('low');
  });

  it('loop with no resolved effort canonicalizes with the effort member absent', () => {
    const resolved = resolveModelInvocation({
      role: 'loop',
      call: { model: 'anthropic:claude-fable-5' },
      capsOf,
    });
    expect(resolved.requestedEffort).toBeUndefined();
    expect(resolved.wireEffort).toBeUndefined();
    expect(resolved.canonical).toEqual({ kind: 'model', model: 'anthropic:claude-fable-5' });
  });

  it('merges providerOptions across layers with higher layers winning per key', () => {
    const resolved = resolveModelInvocation({
      role: 'loop',
      call: {
        model: {
          model: 'anthropic:claude-fable-5',
          providerOptions: { anthropic: { thinkingDisplay: 'summarized' } },
        },
      },
      engine: {
        routing: {
          loop: {
            model: 'anthropic:claude-fable-5',
            providerOptions: { anthropic: { thinkingDisplay: 'omitted', beta: true } },
          },
        },
      },
      capsOf,
    });
    expect(resolved.providerOptions).toEqual({
      anthropic: { thinkingDisplay: 'summarized', beta: true },
    });
  });

  it('rejects a ladder that WINS wire resolution with a ConfigError', () => {
    // Ladder execution is owned by the PlanRunner ladder driver: rung
    // attempts always carry a concrete call-layer override (docs/07, 10).
    expect(() =>
      resolveModelInvocation({
        role: 'loop',
        call: {
          model: {
            ladder: {
              rungs: [{ model: 'openai:gpt-5.4-mini', maxTurns: 4, maxTokens: 1000 }],
              startTier: 0,
              escalateOn: ['error'],
            },
          },
        },
        capsOf,
      }),
    ).toThrow(ConfigError);
  });

  it('lets a concrete call override SHADOW a declared profile ladder', () => {
    // The rung attempt's own resolution: the ladder driver dispatches
    // with a concrete ModelChoice at the call layer (docs/04, 12).
    const resolved = resolveModelInvocation({
      role: 'loop',
      call: { model: { model: 'anthropic:claude-fable-5', effort: 'high' } },
      profile: {
        model: {
          ladder: {
            rungs: [{ model: 'openai:gpt-5.4-mini', effort: 'low', maxTurns: 4, maxTokens: 1000 }],
            startTier: 0,
            escalateOn: ['error'],
          },
        },
      },
      capsOf,
    });
    expect(resolved.ref).toBe('anthropic:claude-fable-5');
    expect(resolved.canonical).toEqual({
      kind: 'model',
      model: 'anthropic:claude-fable-5',
      effort: 'high',
    });
    // And the other direction: a HIGHER ladder shadows a lower model,
    // so the winner check still fires.
    expect(() =>
      resolveModelInvocation({
        role: 'loop',
        call: {
          model: {
            ladder: {
              rungs: [{ model: 'openai:gpt-5.4-mini', maxTurns: 4, maxTokens: 1000 }],
              startTier: 0,
              escalateOn: ['error'],
            },
          },
        },
        profile: { model: 'anthropic:claude-fable-5' },
        capsOf,
      }),
    ).toThrow(/ladder ModelSpec wins wire resolution/);
  });
});

describe('caps scrubbing (M1-T05; docs/04 sections 3.4 and 8.4)', () => {
  it('scrubs unsupported effort visibly while identity keeps the requested effort', () => {
    const resolved = resolveModelInvocation({
      role: 'loop',
      call: { model: 'openai:gpt-5.5', effort: 'max' },
      capsOf: () => caps({ reasoningEfforts: ['low', 'medium', 'high', 'xhigh'] }),
    });
    expect(resolved.wireEffort).toBeUndefined();
    expect(resolved.requestedEffort).toBe('max');
    expect(resolved.canonical).toEqual({ kind: 'model', model: 'openai:gpt-5.5', effort: 'max' });
    expect(resolved.scrubs).toHaveLength(1);
    expect(resolved.scrubs[0]?.scrubbed).toBe('effort');
  });

  it('removes sampling parameters the model rejects, never silently sending them', () => {
    const resolved = resolveModelInvocation({
      role: 'loop',
      call: {
        model: {
          model: 'anthropic:claude-fable-5',
          providerOptions: { anthropic: { temperature: 0.7, top_p: 0.9, other: 'keep' } },
        },
      },
      capsOf: () => caps({ supportsTemperature: false }),
    });
    expect(resolved.providerOptions).toEqual({ anthropic: { other: 'keep' } });
    expect(resolved.scrubs.some((s) => s.scrubbed === 'sampling')).toBe(true);
  });

  it('keeps sampling parameters when the model supports them', () => {
    const resolved = resolveModelInvocation({
      role: 'loop',
      call: {
        model: {
          model: 'ollama:llama3:8b',
          providerOptions: { ollama: { temperature: 0.2 } },
        },
      },
      capsOf: () => caps({ supportsTemperature: true }),
    });
    expect(resolved.providerOptions).toEqual({ ollama: { temperature: 0.2 } });
    expect(resolved.scrubs).toHaveLength(0);
  });
});

describe('structured-output tier selection (M1-T05; docs/04 section 8.4)', () => {
  const strict = {
    type: 'object',
    additionalProperties: false,
    required: ['verdict'],
    properties: { verdict: { type: 'string' } },
  };
  const loose = { type: 'object', properties: { verdict: { type: 'string' } } };

  it('detects strict-compatible schemas', () => {
    expect(isStrictCompatibleSchema(strict)).toBe(true);
    expect(isStrictCompatibleSchema(loose)).toBe(false);
    expect(isStrictCompatibleSchema({ type: 'string' })).toBe(true);
    expect(
      isStrictCompatibleSchema({
        type: 'object',
        additionalProperties: false,
        required: ['nested'],
        properties: { nested: loose },
      }),
    ).toBe(false);
    expect(isStrictCompatibleSchema({ type: 'array', items: strict })).toBe(true);
  });

  it('selects the declared ceiling, degrading native for non-strict schemas', () => {
    expect(selectStructuredOutputTier(caps({ structuredOutput: 'native' }), strict)).toBe('native');
    expect(selectStructuredOutputTier(caps({ structuredOutput: 'native' }), loose)).toBe(
      'forced-tool',
    );
    expect(selectStructuredOutputTier(caps({ structuredOutput: 'forced-tool' }), strict)).toBe(
      'forced-tool',
    );
    expect(selectStructuredOutputTier(caps({ structuredOutput: 'prompt' }), strict)).toBe('prompt');
  });

  it('orders tiers for caps containment checks', () => {
    expect(tierWithinCaps('prompt', caps({ structuredOutput: 'native' }))).toBe(true);
    expect(tierWithinCaps('native', caps({ structuredOutput: 'prompt' }))).toBe(false);
  });
});
