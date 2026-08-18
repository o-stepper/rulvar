/**
 * The bounded execution scope (RV4007, the fifth comparison
 * experiment's P0.4): who a run executes for, as the host names it,
 * carried without loss (RunMeta, a genesis journal decision, the
 * invoice header, the export bundle via its meta) and asserted on
 * resume. Attribution only: the library never interprets it, and
 * nothing here is IAM.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { createEngine, executionScopeKey, normalizeExecutionScope } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';
import { invoiceFromJournal } from './invoice.js';

const wf = defineWorkflow({ name: 'scope-smoke' }, async (ctx) => {
  return await ctx.agent('one turn');
});

const SCOPE = { tenant: 'acme', account: 'prod-billing', project: 'vela-audit' };

describe('ExecutionScope intake (RV4007)', () => {
  it('validates own properties, non-empty strings, and refuses an empty scope', () => {
    expect(() => normalizeExecutionScope({}, 'RunOptions.scope')).toThrow(
      /at least one of tenant, account, project/,
    );
    expect(() => normalizeExecutionScope({ tenant: '' }, 'RunOptions.scope')).toThrow(ConfigError);
    expect(() => normalizeExecutionScope({ tenant: 42 }, 'RunOptions.scope')).toThrow(
      /tenant must be a non-empty string/,
    );
    expect(() => normalizeExecutionScope('acme', 'RunOptions.scope')).toThrow(/must be an object/);
    // A prototype member never resolves (the RV1205 doctrine).
    const hostile = Object.create({ tenant: 'smuggled' }) as object;
    expect(() => normalizeExecutionScope(hostile, 'RunOptions.scope')).toThrow(
      /at least one of tenant/,
    );
    // The copy is what gets recorded: later mutation moves nothing.
    const declared = { tenant: 'acme' };
    const copy = normalizeExecutionScope(declared, 'RunOptions.scope');
    declared.tenant = 'evil';
    expect(copy.tenant).toBe('acme');
    expect(executionScopeKey(copy)).toBe('{"tenant":"acme"}');
  });

  it('records the scope at genesis: meta, the journal decision, and the invoice header', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-scope-'));
    const store = new JsonlFileStore({ dir });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(wf, undefined, {
      runId: 'SC-GENESIS',
      budgetUsd: 5,
      scope: SCOPE,
    }).result;
    expect(outcome.status).toBe('ok');
    const meta = (await store.listRuns()).find((row) => row.runId === 'SC-GENESIS');
    expect(meta?.scope).toEqual(SCOPE);
    const entries = await store.load('SC-GENESIS');
    const decision = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'execution_scope',
    );
    expect(decision).toBeDefined();
    expect((decision?.value as { scope?: unknown } | undefined)?.scope).toEqual(SCOPE);
    const invoice = invoiceFromJournal(entries, () => 0.01);
    expect(invoice.executionScope).toEqual(SCOPE);
  });

  it('an unscoped run records nothing anywhere: bytes stay identical', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-scope-off-'));
    const store = new JsonlFileStore({ dir });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    await engine.run(wf, undefined, { runId: 'SC-OFF', budgetUsd: 5 }).result;
    const meta = (await store.listRuns()).find((row) => row.runId === 'SC-OFF');
    expect(meta !== undefined && 'scope' in meta).toBe(false);
    const entries = await store.load('SC-OFF');
    expect(
      entries.some(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'execution_scope',
      ),
    ).toBe(false);
    expect('executionScope' in invoiceFromJournal(entries, () => 0.01)).toBe(false);
  });

  it('resume restores the recorded scope verbatim and refuses a mismatched assertion', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-scope-resume-'));
    const store = new JsonlFileStore({ dir });
    const makeEngine = (): ReturnType<typeof createEngine> =>
      createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
        stores: { journal: store },
        defaults: { routing: { loop: 'fake:model' } },
      });
    await makeEngine().run(wf, undefined, {
      runId: 'SC-RESUME',
      budgetUsd: 5,
      scope: SCOPE,
    }).result;
    // A mismatched assertion refuses before ownership.
    await expect(
      makeEngine().resume('SC-RESUME', wf, { scope: { tenant: 'other' } }).result,
    ).rejects.toThrow(/scope does not match the one run 'SC-RESUME' recorded at genesis/);
    // The matching assertion resumes, and the meta keeps the scope.
    const matched = await makeEngine().resume('SC-RESUME', wf, { scope: SCOPE }).result;
    expect(matched.status).toBe('ok');
    // No assertion also resumes: the recorded identity travels back
    // in verbatim and the resume segment's meta writes preserve it.
    const bare = await makeEngine().resume('SC-RESUME', wf).result;
    expect(bare.status).toBe('ok');
    const meta = (await store.listRuns()).find((row) => row.runId === 'SC-RESUME');
    expect(meta?.scope).toEqual(SCOPE);
  });
});
