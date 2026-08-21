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
import {
  createEngine,
  executionScopeDigest,
  executionScopeKey,
  normalizeExecutionScope,
} from './engine.js';
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

describe('scope dimensions v2 (RV4205)', () => {
  const FULL = {
    tenant: 'acme',
    legalDomain: 'eu-gdpr',
    region: 'eu-central-1',
    providerAccount: 'ant-prod-7',
  };

  it('the named dimensions normalize, key, and digest deterministically', () => {
    const copy = normalizeExecutionScope(FULL, 'RunOptions.scope');
    expect(copy).toEqual(FULL);
    expect(executionScopeKey(copy)).toBe(
      '{"legalDomain":"eu-gdpr","providerAccount":"ant-prod-7",' +
        '"region":"eu-central-1","tenant":"acme"}',
    );
    expect(executionScopeDigest(copy)).toMatch(/^[0-9a-f]{64}$/);
    expect(
      executionScopeDigest({
        providerAccount: 'ant-prod-7',
        region: 'eu-central-1',
        legalDomain: 'eu-gdpr',
        tenant: 'acme',
      }),
    ).toBe(executionScopeDigest(copy));
  });

  it('the drop default is PINNED: an unknown field silently leaves the copy (RV4107 bytes)', () => {
    const copy = normalizeExecutionScope(
      { tenant: 'acme', platformTeam: 'core' },
      'RunOptions.scope',
    );
    expect(copy).toEqual({ tenant: 'acme' });
    expect('platformTeam' in copy).toBe(false);
  });

  it("scopePolicy.unknown 'reject' refuses the unknown field by name", () => {
    expect(() =>
      normalizeExecutionScope({ tenant: 'acme', platformTeam: 'core' }, 'RunOptions.scope', {
        unknown: 'reject',
      }),
    ).toThrow(/platformTeam is not a scope dimension/);
    expect(() =>
      normalizeExecutionScope({ tenant: 'acme', region: 'eu-central-1' }, 'RunOptions.scope', {
        unknown: 'reject',
      }),
    ).not.toThrow();
  });

  it('the genesis decision and the invoice carry the digest', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-scope-digest-'));
    const store = new JsonlFileStore({ dir });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(wf, undefined, {
      runId: 'SC-DIGEST',
      budgetUsd: 5,
      scope: FULL,
    }).result;
    expect(outcome.status).toBe('ok');
    const entries = await store.load('SC-DIGEST');
    const decision = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'execution_scope',
    );
    const digest = (decision?.value as { scopeDigest?: string } | undefined)?.scopeDigest;
    expect(digest).toBe(executionScopeDigest(FULL));
    const invoice = invoiceFromJournal(entries, () => 0.01);
    expect(invoice.executionScope).toEqual(FULL);
    expect(invoice.executionScopeDigest).toBe(digest);
  });

  it('RunOptions.scopePolicy governs the run intake: reject refuses, garbage refuses', () => {
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
      defaults: { routing: { loop: 'fake:model' } },
    });
    // The refusal is a construction-time ConfigError, before any run
    // handle exists, exactly like every other RunOptions intake rule.
    expect(() =>
      engine.run(wf, undefined, {
        budgetUsd: 5,
        scope: { tenant: 'acme', platformTeam: 'core' } as object,
        scopePolicy: { unknown: 'reject' },
      }),
    ).toThrow(/platformTeam is not a scope dimension/);
    expect(() =>
      engine.run(wf, undefined, {
        budgetUsd: 5,
        scope: { tenant: 'acme' },
        scopePolicy: { unknown: 'sometimes' } as never,
      }),
    ).toThrow(/scopePolicy\.unknown must be 'drop' or 'reject'/);
  });
});

describe('scope value normalization (RV4302)', () => {
  const TABLE = { version: 1, fields: { region: ['trim', 'lowercase'] } } as const;

  it('validates the declared table: version, dimensions, vocabulary, shapes', () => {
    const at = (normalize: unknown): (() => unknown) => {
      return () =>
        normalizeExecutionScope({ region: 'EU' }, 'RunOptions.scope', {
          normalize: normalize as never,
        });
    };
    expect(at('lowercase')).toThrow(/normalize must be an object/);
    expect(at({ version: 2, fields: { region: ['trim'] } })).toThrow(/version must be 1/);
    expect(at({ version: 1, fields: {} })).toThrow(/at least one scope dimension/);
    expect(at({ version: 1, fields: { platformTeam: ['trim'] } })).toThrow(
      /platformTeam is not a scope dimension/,
    );
    expect(at({ version: 1, fields: { region: [] } })).toThrow(/non-empty array of operations/);
    expect(at({ version: 1, fields: { region: ['uppercase'] } })).toThrow(
      /unknown operation "uppercase"; the vocabulary is trim, lowercase, nfc/,
    );
  });

  it('applies the ops in declared order, after input validation, and only to named fields', () => {
    const copy = normalizeExecutionScope(
      { region: '  EU-West-1  ', tenant: 'Acme' },
      'RunOptions.scope',
      { normalize: TABLE },
    );
    expect(copy).toEqual({ region: 'eu-west-1', tenant: 'Acme' });
    // NFC folds the decomposed sequence onto the composed identity.
    const nfc = normalizeExecutionScope({ tenant: 'café' }, 'RunOptions.scope', {
      normalize: { version: 1, fields: { tenant: ['nfc'] } },
    });
    expect(nfc.tenant).toBe('café');
    // An invalid input still refuses BEFORE any op runs: the table
    // canonicalizes valid declarations, it never launders junk in.
    expect(() =>
      normalizeExecutionScope({ region: 42 }, 'RunOptions.scope', { normalize: TABLE }),
    ).toThrow(/region must be a non-empty string/);
  });

  it('re-validates the result by the same rule: all-whitespace trims to a typed refusal', () => {
    expect(() =>
      normalizeExecutionScope({ region: '   ' }, 'RunOptions.scope', { normalize: TABLE }),
    ).toThrow(/region normalizes to "" under the declared scopePolicy\.normalize table/);
  });

  it('one identity on every surface: genesis decision, digest, invoice, meta, resume', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-scope-normalize-'));
    const store = new JsonlFileStore({ dir });
    const makeEngine = (): ReturnType<typeof createEngine> =>
      createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
        stores: { journal: store },
        defaults: { routing: { loop: 'fake:model' } },
      });
    const outcome = await makeEngine().run(wf, undefined, {
      runId: 'SC-NORM',
      budgetUsd: 5,
      scope: { tenant: 'acme', region: '  EU-West-1  ' },
      scopePolicy: { normalize: TABLE },
    }).result;
    expect(outcome.status).toBe('ok');
    const normalized = { tenant: 'acme', region: 'eu-west-1' };
    const meta = (await store.listRuns()).find((row) => row.runId === 'SC-NORM');
    expect(meta?.scope).toEqual(normalized);
    expect(meta?.scopeNormalize).toEqual(TABLE);
    const entries = await store.load('SC-NORM');
    const decision = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'execution_scope',
    );
    const value = decision?.value as
      { scope?: unknown; scopeDigest?: string; normalize?: unknown } | undefined;
    expect(value?.scope).toEqual(normalized);
    expect(value?.scopeDigest).toBe(executionScopeDigest(normalized));
    expect(value?.normalize).toEqual(TABLE);
    const invoice = invoiceFromJournal(entries, () => 0.01);
    expect(invoice.executionScope).toEqual(normalized);
    expect(invoice.executionScopeDigest).toBe(executionScopeDigest(normalized));
    // Resume with the RAW values the run started with: the RECORDED
    // table shapes the supplied copy before comparison, so the
    // assertion holds without the host re-normalizing anything.
    const resumed = await makeEngine().resume('SC-NORM', wf, {
      scope: { tenant: 'acme', region: '  EU-West-1  ' },
    }).result;
    expect(resumed.status).toBe('ok');
    // A conflicting re-supplied table refuses typed (the args-binding
    // rule): the journal is the table's authority, not the host.
    await expect(
      makeEngine().resume('SC-NORM', wf, {
        scopePolicy: { normalize: { version: 1, fields: { region: ['trim'] } } },
      }).result,
    ).rejects.toThrow(/scopePolicy\.normalize table does not match the one run 'SC-NORM'/);
    // The matching table asserts true, and the resume segment's meta
    // write preserves the recorded table verbatim.
    const matched = await makeEngine().resume('SC-NORM', wf, {
      scopePolicy: { normalize: TABLE },
    }).result;
    expect(matched.status).toBe('ok');
    const after = (await store.listRuns()).find((row) => row.runId === 'SC-NORM');
    expect(after?.scopeNormalize).toEqual(TABLE);
  });

  it('a table supplied over a run that recorded none is asserted UNRECORDED and never applied', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-scope-norm-off-'));
    const store = new JsonlFileStore({ dir });
    const makeEngine = (): ReturnType<typeof createEngine> =>
      createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'answer' }))],
        stores: { journal: store },
        defaults: { routing: { loop: 'fake:model' } },
      });
    await makeEngine().run(wf, undefined, {
      runId: 'SC-NORM-OFF',
      budgetUsd: 5,
      scope: { tenant: 'Acme' },
    }).result;
    // No table recorded, none declared: byte posture pinned.
    const meta = (await store.listRuns()).find((row) => row.runId === 'SC-NORM-OFF');
    expect(meta !== undefined && 'scopeNormalize' in meta).toBe(false);
    const entries = await store.load('SC-NORM-OFF');
    const decision = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'execution_scope',
    );
    expect('normalize' in ((decision?.value ?? {}) as object)).toBe(false);
    // If the supplied lowercase table were APPLIED, 'Acme' would fold
    // to 'acme' and mismatch the recorded 'Acme'; resolving proves the
    // unrecorded table is an unverifiable assertion, never a policy.
    const resumed = await makeEngine().resume('SC-NORM-OFF', wf, {
      scope: { tenant: 'Acme' },
      scopePolicy: { normalize: { version: 1, fields: { tenant: ['lowercase'] } } },
    }).result;
    expect(resumed.status).toBe('ok');
  });
});
