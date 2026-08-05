/**
 * The operational host reference, executed (RV1705): the four
 * behaviors the eighteenth comparison benchmark's operational
 * acceptance demanded a host PROVE, each run through the full engine
 * on FakeAdapter with zero live calls.
 */
import { describe, expect, it } from 'vitest';

import {
  defineWorkflow,
  ExternalRegistry,
  InMemoryStore,
  tool,
  type ChatRequest,
  type Json,
} from '@rulvar/core';
import { FakeAdapter, fakeToolCalls, FAKE_MODEL_REF } from '@rulvar/testing';
import { memoryEffectLedger } from '@rulvar/executor';

import { decisionChainOf, guardedEffectTool, tenantHost } from './operational-host.js';

const ROUTING = { loop: FAKE_MODEL_REF } as const;

/** The error tool results the model has been shown, flattened. */
function errorResultsIn(req: ChatRequest): string[] {
  return req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'tool-result' && part.isError === true)
    .map((part) => JSON.stringify((part as { result: unknown }).result));
}

describe('the operational host reference (RV1705)', () => {
  it('a cross-tenant tool name does not exist in the tenant registry, and the refusal reaches the model', async () => {
    const alphaReads: string[] = [];
    const betaFired: string[] = [];
    const alphaRead = tool({
      name: 'alpha-read',
      description: "reads the alpha tenant's own data",
      risk: 'read',
      parameters: { type: 'object' },
      execute: () => {
        alphaReads.push('read');
        return Promise.resolve('alpha data');
      },
    });
    let turn = 0;
    const seenErrors: string[] = [];
    const adapter = new FakeAdapter({
      agents: {
        '*': (call) => {
          seenErrors.push(...errorResultsIn(call.req));
          turn += 1;
          if (turn === 1) {
            // The model tries the OTHER tenant's effect tool by name.
            return fakeToolCalls({ name: 'beta-effect', args: {} });
          }
          if (turn === 2) {
            return fakeToolCalls({ name: 'alpha-read', args: {} });
          }
          return 'tenant task finished';
        },
      },
    });
    const engine = tenantHost({
      tenantId: 'alpha',
      adapter,
      routing: ROUTING,
      tools: [alphaRead],
    });
    const wf = defineWorkflow({ name: 'tenant-flow' }, async (ctx) =>
      ctx.agent('perform the tenant task', { agentType: 'alpha-worker' }),
    );
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(alphaReads).toEqual(['read']);
    expect(betaFired).toEqual([]);
    expect(seenErrors.join('\n')).toContain('beta-effect');
  });

  it('a revoked approval never executes: the deny lands pre-effect and the ledger stays empty', async () => {
    const store = new InMemoryStore({ quiet: true });
    const effects = { fired: [] as string[] };
    const ledger = memoryEffectLedger();
    let turn = 0;
    const adapter = new FakeAdapter({
      agents: {
        '*': () => {
          turn += 1;
          return turn === 1
            ? fakeToolCalls({ name: 'ship-report', args: { idempotencyKey: 'report-7' } })
            : 'stopped: the approval was revoked';
        },
      },
    });
    const engine = tenantHost({
      tenantId: 'alpha',
      adapter,
      routing: ROUTING,
      tools: [guardedEffectTool('ship-report', effects, ledger)],
      store,
    });
    const wf = defineWorkflow({ name: 'guarded-flow' }, async (ctx) =>
      ctx.agent('ship the tenant report', { agentType: 'alpha-worker' }),
    );
    const handle = engine.run(wf, undefined, { runId: 'revoked-run' });
    const off = handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      void handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), {
        decision: 'deny',
        reason: 'revoked by the security desk',
      });
    });
    const outcome = await handle.result;
    off();
    expect(outcome.status).toBe('ok');
    expect(effects.fired).toEqual([]);
    expect(ledger.intents()).toEqual([]);
    expect(ledger.entries()).toEqual([]);
    // RV1801: the refusal is auditable from the fold alone: the
    // canonical resolution payload carries who denied and the deny
    // itself, with its reason, on the live journal.
    const chain = await decisionChainOf(store, 'revoked-run');
    const denyRow = chain.find((row) => row.kind === 'resolution');
    expect(denyRow?.by).toBe('external');
    expect(denyRow?.value).toEqual({
      decision: 'deny',
      reason: 'revoked by the security desk',
    });
  });

  it('a redelivered attempt cannot duplicate the effect, and a replay performs no work at all', async () => {
    const effects = { fired: [] as string[] };
    const ledger = memoryEffectLedger();
    const store = new InMemoryStore({ quiet: true });
    let turn = 0;
    const adapter = new FakeAdapter({
      agents: {
        '*': () => {
          turn += 1;
          if (turn <= 2) {
            // The same logical effect delivered twice: same idempotency key.
            return fakeToolCalls({ name: 'ship-report', args: { idempotencyKey: 'report-9' } });
          }
          return 'shipped exactly once';
        },
      },
    });
    const makeWorkflow = () =>
      defineWorkflow({ name: 'redelivery-flow' }, async (ctx) =>
        ctx.agent('ship the tenant report', { agentType: 'alpha-worker' }),
      );
    const engine = tenantHost({
      tenantId: 'alpha',
      adapter,
      routing: ROUTING,
      tools: [guardedEffectTool('ship-report', effects, ledger)],
      store,
    });
    const handle = engine.run(makeWorkflow(), undefined, { runId: 'redelivery-run' });
    const off = handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      void handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), { decision: 'allow' });
    });
    const outcome = await handle.result;
    off();
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('shipped exactly once');
    // Both attempts recorded, ONE external effect.
    expect(effects.fired).toEqual(['report-9']);
    expect(ledger.intents()).toHaveLength(2);
    expect(ledger.entries()).toHaveLength(2);

    // Replay on an adapter that refuses to serve: zero live calls, the
    // effect count untouched (never pay twice, never fire twice).
    const deadAdapter = new FakeAdapter({
      agents: {
        '*': () => {
          throw new Error('replay must not reach the model');
        },
      },
    });
    const replayEngine = tenantHost({
      tenantId: 'alpha',
      adapter: deadAdapter,
      routing: ROUTING,
      tools: [guardedEffectTool('ship-report', effects, ledger)],
      store,
    });
    const replayed = await replayEngine.resume('redelivery-run', makeWorkflow()).result;
    expect(replayed.status).toBe('ok');
    expect(effects.fired).toEqual(['report-9']);
  });

  it('the audit reconstructs the decision chain: approvals before their resolutions, references intact', async () => {
    const store = new InMemoryStore({ quiet: true });
    const effects = { fired: [] as string[] };
    const ledger = memoryEffectLedger();
    let turn = 0;
    const adapter = new FakeAdapter({
      agents: {
        '*': () => {
          turn += 1;
          return turn === 1
            ? fakeToolCalls({ name: 'ship-report', args: { idempotencyKey: 'audit-1' } })
            : 'audited';
        },
      },
    });
    const engine = tenantHost({
      tenantId: 'alpha',
      adapter,
      routing: ROUTING,
      tools: [guardedEffectTool('ship-report', effects, ledger)],
      store,
    });
    const wf = defineWorkflow({ name: 'audited-flow' }, async (ctx) =>
      ctx.agent('ship the tenant report', { agentType: 'alpha-worker' }),
    );
    const handle = engine.run(wf, undefined, { runId: 'audited-run' });
    handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      void handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), { decision: 'allow' });
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const chain = await decisionChainOf(store, 'audited-run');
    expect(chain.length).toBeGreaterThan(0);
    const seqs = chain.map((row) => row.seq);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    // The ask itself, carrying WHAT was asked: the tool, its input, its risk.
    const approval = chain.find((row) => row.kind === 'approval');
    expect(approval).toBeDefined();
    const asked = approval?.value as Json as {
      toolName?: string;
      risk?: string;
      input?: { idempotencyKey?: string };
    };
    expect(asked.toolName).toBe('ship-report');
    expect(asked.risk).toBe('write');
    expect(asked.input?.idempotencyKey).toBe('audit-1');
    // The resolution that closed it, referencing the ask by seq.
    const resolution = chain.find(
      (row) => row.kind === 'resolution' && row.target === approval?.seq,
    );
    expect(resolution).toBeDefined();
    expect(chain.indexOf(approval as (typeof chain)[number])).toBeLessThan(
      chain.indexOf(resolution as (typeof chain)[number]),
    );
    // The settle decision closes the chain after the resolution.
    const settle = chain.find((row) => row.decisionType === 'run_settle');
    expect(settle).toBeDefined();
    expect(settle && resolution && settle.seq > resolution.seq).toBe(true);
    // RV1801: on a LIVE journal the canonical resolution payload feeds
    // the fold: who resolved and the decision value itself ride the row.
    expect(resolution?.by).toBe('external');
    expect(resolution?.value).toEqual({ decision: 'allow' });
    // Fold-to-journal parity: every canonical payload field the engine
    // journaled is exactly what the chain row reports, no more, no less.
    const entries = await store.load('audited-run');
    let canonicalResolutions = 0;
    for (const journaled of entries) {
      const row = chain.find((candidate) => candidate.seq === journaled.seq);
      if (journaled.kind === 'resolution' && journaled.resolution !== undefined) {
        canonicalResolutions += 1;
        expect(row?.by).toBe(journaled.resolution.by);
        expect(row?.target).toBe(journaled.resolution.target);
        expect(row?.decisionRef).toBe(journaled.resolution.decisionRef);
        expect(row?.value).toEqual(journaled.resolution.value);
      }
      if (journaled.kind === 'abandon' && journaled.abandon !== undefined) {
        expect(row?.target).toBe(journaled.abandon.target);
        expect(row?.authorizedBy).toBe(journaled.abandon.authorizedBy);
      }
    }
    // The parity loop above must not have been vacuous.
    expect(canonicalResolutions).toBeGreaterThan(0);
  });
});
