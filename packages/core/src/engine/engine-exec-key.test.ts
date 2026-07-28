/**
 * Incarnation scoping of the isolated-executor idempotency key (RV403,
 * the eighth-experiment review): RunMeta.execKeyDerivation records which
 * key derivation a run uses for its whole life. A fresh run stamps
 * version 2, whose key includes the generation token (RunMeta.genesis),
 * so a deleteRun-then-recreate of the same explicit runId never reuses
 * keys against a long-lived external dedup store; a run recorded without
 * the field keeps deriving version 1 (genesis-free) keys forever, across
 * resume and upgrade, so external dedup state for already-started runs
 * stays valid.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { IsolatedExecRequest, ToolExecutorProvider } from '../l0/spi/executor.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { deriveExecIdempotencyKey } from '../runtime/executor.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

/** An external tool: dispatch routes to the registered provider. */
const charge = tool({
  name: 'charge',
  description: 'charges the customer (a real side effect)',
  parameters: {},
  executor: 'subprocess',
  executorSpec: { command: 'unused' },
  execute: () => Promise.reject(new Error('must not run in process')),
});

/** One agent, one charge; the adapter is stateless across runs. */
const charger = defineWorkflow({ name: 'charger' }, async (ctx) => {
  await ctx.agent('charge the customer once', { tools: [charge] });
  return 'done';
});

const chargeOnceAdapter = () =>
  scriptedAdapter((req) =>
    req.messages.some((m) => m.role === 'tool')
      ? { text: 'done' }
      : { toolCalls: [{ name: 'charge', args: {} }] },
  );

/** Records the idempotency key handed to each dispatch. */
function recordingExecutor(keys: string[]): { subprocess: ToolExecutorProvider } {
  return {
    subprocess: {
      run: (request: IsolatedExecRequest): Promise<Json> => {
        keys.push(request.ctx.idempotencyKey);
        return Promise.resolve({ ok: true });
      },
    },
  };
}

/**
 * A LONG-LIVED external dedup store, the topology the incarnation key
 * exists for: it outlives deleteRun, serves repeats of a seen key from
 * cache, and only a fresh key executes the effect.
 */
function dedupExecutor(
  cache: Map<string, Json>,
  effects: string[],
  keys: string[],
): { subprocess: ToolExecutorProvider } {
  return {
    subprocess: {
      run: (request: IsolatedExecRequest): Promise<Json> => {
        const key = request.ctx.idempotencyKey;
        keys.push(key);
        const seen = cache.get(key);
        if (seen !== undefined) {
          return Promise.resolve(seen);
        }
        effects.push(request.tool);
        const result: Json = { ok: true, effect: effects.length };
        cache.set(key, result);
        return Promise.resolve(result);
      },
    },
  };
}

describe('incarnation-scoped exec idempotency keys (RV403)', () => {
  it('stamps derivation 2 into RunMeta at a fresh genesis', async () => {
    const store = new InMemoryStore();
    const keys: string[] = [];
    const engine = createEngine({
      adapters: [chargeOnceAdapter()],
      defaults: { routing: { loop: 'fake:model' } },
      stores: { journal: store },
      executors: recordingExecutor(keys),
    });
    const outcome = await engine.run(charger, undefined, { runId: 'exec-key-fresh' }).result;
    expect(outcome.status).toBe('ok');
    expect(keys).toHaveLength(1);
    const meta = await store.getMeta('exec-key-fresh');
    expect(meta?.genesis).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(meta?.execKeyDerivation).toBe(2);
  });

  it('never reuses keys after deleteRun and recreate of the same runId', async () => {
    const store = new InMemoryStore();
    // The external dedup store OUTLIVES the run: deleteRun cannot reach it.
    const cache = new Map<string, Json>();
    const effects: string[] = [];
    const keys: string[] = [];
    const engine = createEngine({
      adapters: [chargeOnceAdapter()],
      defaults: { routing: { loop: 'fake:model' } },
      stores: { journal: store },
      executors: dedupExecutor(cache, effects, keys),
    });
    const first = await engine.run(charger, undefined, { runId: 'exec-key-recreated' }).result;
    expect(first.status).toBe('ok');
    expect(effects).toHaveLength(1);

    await store.delete('exec-key-recreated');

    // The recreated incarnation intends a NEW effect. Its key must not
    // collide with the deleted incarnation's, or the external dedup
    // falsely suppresses the effect and serves the stale result.
    const second = await engine.run(charger, undefined, { runId: 'exec-key-recreated' }).result;
    expect(second.status).toBe('ok');
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
    expect(effects).toHaveLength(2);
  });

  it('keeps version 1 keys for a run recorded without the derivation field', async () => {
    const store = new InMemoryStore();
    // A run started by pre-RV403 code: genesis exists, the derivation
    // field does not, and the journal is empty (crashed before the
    // first append), so resume re-executes the workflow live.
    await store.putMeta({
      runId: 'exec-key-legacy',
      status: 'running',
      updatedAt: new Date(1_700_000_000_000).toISOString(),
      segments: 1,
      genesis: 'G'.repeat(26),
      workflowName: 'charger',
    });
    const keys: string[] = [];
    const engine = createEngine({
      adapters: [chargeOnceAdapter()],
      defaults: { routing: { loop: 'fake:model' } },
      stores: { journal: store },
      executors: recordingExecutor(keys),
    });
    const outcome = await engine.resume('exec-key-legacy', charger).result;
    expect(outcome.status).toBe('ok');
    expect(keys).toHaveLength(1);
    // The dispatch derived the genesis-free version 1 key: the exact
    // five-part function of the agent's journal seq and the first live
    // ordinal, byte-identical to what pre-RV403 engines derive.
    const entries = await store.load('exec-key-legacy');
    const agentSeq = entries.find((entry) => entry.kind === 'agent')?.seq;
    expect(agentSeq).toBeDefined();
    expect(keys[0]).toBe(
      deriveExecIdempotencyKey('exec-key-legacy', agentSeq as number, 1, 'charge', {}),
    );
    // And the resume segment wrote the recorded ABSENCE back verbatim:
    // a legacy run never gains a derivation marker retroactively.
    const meta = await store.getMeta('exec-key-legacy');
    expect(meta?.execKeyDerivation).toBeUndefined();
  });

  it('refuses to resume a derivation newer than this engine supports', async () => {
    const store = new InMemoryStore();
    await store.putMeta({
      runId: 'exec-key-next',
      status: 'running',
      updatedAt: new Date(1_700_000_000_000).toISOString(),
      segments: 1,
      genesis: 'G'.repeat(26),
      workflowName: 'charger',
      execKeyDerivation: 3,
    });
    const keys: string[] = [];
    const engine = createEngine({
      adapters: [chargeOnceAdapter()],
      defaults: { routing: { loop: 'fake:model' } },
      stores: { journal: store },
      executors: recordingExecutor(keys),
    });
    await expect(engine.resume('exec-key-next', charger).result).rejects.toThrow(ConfigError);
    await expect(engine.resume('exec-key-next', charger).result).rejects.toThrow(
      /exec idempotency key derivation/,
    );
    expect(keys).toHaveLength(0);
  });

  it('fails closed when derivation 2 is recorded but the store dropped genesis', async () => {
    const store = new InMemoryStore();
    await store.putMeta({
      runId: 'exec-key-torn',
      status: 'running',
      updatedAt: new Date(1_700_000_000_000).toISOString(),
      segments: 1,
      workflowName: 'charger',
      execKeyDerivation: 2,
    });
    const keys: string[] = [];
    const engine = createEngine({
      adapters: [chargeOnceAdapter()],
      defaults: { routing: { loop: 'fake:model' } },
      stores: { journal: store },
      executors: recordingExecutor(keys),
    });
    await expect(engine.resume('exec-key-torn', charger).result).rejects.toThrow(ConfigError);
    await expect(engine.resume('exec-key-torn', charger).result).rejects.toThrow(/genesis/);
    expect(keys).toHaveLength(0);
  });
});
