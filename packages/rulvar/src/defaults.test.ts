/**
 * recommendedDefaults floors (v1.17.0 review P1-2): the strong-model
 * allowlists must admit the models the product actually recommends.
 * rulvar.com recommends GPT-5.6 Sol as the OpenAI orchestrator, so the
 * exact model and its published exact alias are admitted for
 * orchestrate and plan; the weaker siblings Terra and Luna are not, and
 * a floored-out model still fails before any provider call.
 */
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  InMemoryStore,
  orchestrate,
  type Engine,
  type ModelRef,
  type ProviderAdapter,
} from '@rulvar/core';
import { FakeAdapter, fakeToolCalls } from '@rulvar/testing';

import { recommendedDefaults } from './defaults.js';

const STRONG_SET = [
  'anthropic:claude-fable-5',
  'anthropic:claude-opus-4-8',
  'anthropic:claude-opus-4-7',
  'openai:gpt-5.6-sol',
  'openai:gpt-5.6',
  'openai:gpt-5.5',
];

/** A scripted fake wearing the 'openai' adapter id, counting its calls. */
function fakeOpenAi(turn?: () => unknown): { adapter: ProviderAdapter; calls: () => number } {
  let calls = 0;
  const fake = new FakeAdapter({
    agents: {
      '*': () => {
        calls += 1;
        // Default script: the orchestrator model immediately finishes.
        return turn === undefined
          ? fakeToolCalls({ name: 'finish', args: { result: { done: true } } })
          : turn();
      },
    },
  });
  return {
    adapter: {
      id: 'openai',
      provider: 'openai',
      caps: () => fake.caps(),
      stream: (req, signal) => fake.stream(req, signal),
    },
    calls: () => calls,
  };
}

function engineWith(orchestrateModel: ModelRef): { engine: Engine; calls: () => number } {
  const { adapter, calls } = fakeOpenAi();
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: new InMemoryStore() },
    defaults: {
      routing: {
        loop: { model: orchestrateModel },
        orchestrate: { model: orchestrateModel, effort: 'high' },
      },
      roleFloors: recommendedDefaults.floors,
    },
  });
  return { engine, calls };
}

describe('recommendedDefaults floors (v1.17.0 review P1-2)', () => {
  it('pins the documented strong set for orchestrate and plan', () => {
    expect(recommendedDefaults.floors.byRole?.orchestrate?.allow).toEqual(STRONG_SET);
    expect(recommendedDefaults.floors.byRole?.plan?.allow).toEqual(STRONG_SET);
  });

  it('admits an explicit Sol orchestrator and calls the adapter exactly once', async () => {
    const { engine, calls } = engineWith('openai:gpt-5.6-sol');
    const outcome = await orchestrate(engine, 'collect the facts').result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ done: true });
    expect(calls()).toBe(1);
  });

  it('admits the published exact alias as well', async () => {
    const { engine, calls } = engineWith('openai:gpt-5.6');
    const outcome = await orchestrate(engine, 'collect the facts').result;
    expect(outcome.status).toBe('ok');
    expect(calls()).toBe(1);
  });

  it('still floors out weak or sibling orchestrator models with zero provider calls', async () => {
    const weakModels: ModelRef[] = [
      'openai:gpt-5.4-mini',
      'openai:gpt-5.6-luna',
      'openai:gpt-5.6-terra',
    ];
    for (const weak of weakModels) {
      const { engine, calls } = engineWith(weak);
      const outcome = await orchestrate(engine, 'collect the facts').result;
      expect(outcome.status, weak).toBe('error');
      expect(outcome.error?.message, weak).toContain('floored out');
      expect(calls(), weak).toBe(0);
    }
  });

  it('leaves loop and extract unfloored for the Terra and Luna workers', async () => {
    // The landing quickstart routes loop at Terra and extract at Luna;
    // the floors constrain only the control-plane roles.
    const { adapter, calls } = fakeOpenAi(() => 'worked');
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: {
        routing: {
          loop: { model: 'openai:gpt-5.6-terra' },
          extract: { model: 'openai:gpt-5.6-luna' },
        },
        roleFloors: recommendedDefaults.floors,
      },
    });
    const wf = defineWorkflow({ name: 'worker-roles' }, async (ctx) => await ctx.agent('do it'));
    const outcome = await engine.run(wf, null, { name: 'worker-roles' }).result;
    expect(outcome.status).toBe('ok');
    expect(calls()).toBeGreaterThan(0);
  });
});
