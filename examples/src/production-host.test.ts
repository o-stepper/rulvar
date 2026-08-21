/**
 * The production host reference, executed (RV4307): composite identity
 * with normalization on every genesis surface, fail-closed provider
 * account routing, the regulated v4 compile with the host's own
 * contract, and the production gate refusing what nothing judged. All
 * on FakeAdapter, zero live calls: Fake/VCR evidence by design, and
 * the dossier says so.
 */
import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  createEngine,
  defineWorkflow,
  executionScopeDigest,
  invoiceFromJournal,
  JsonlFileStore,
  semanticTerminalVerdictOf,
  type TerminalEnvelope,
} from '@rulvar/core';
import { FakeAdapter, FAKE_MODEL_REF } from '@rulvar/testing';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  productionGate,
  productionRegulatedProfile,
  productionRunOptions,
  providerAccountAdapter,
} from './production-host.js';

const RAW_SCOPE = {
  tenant: '  Acme  ',
  region: ' EU-West-1 ',
  providerAccount: 'ant-prod-7',
  project: 'vela-audit',
};
const CANONICAL = {
  tenant: 'acme',
  region: 'eu-west-1',
  providerAccount: 'ant-prod-7',
  project: 'vela-audit',
};

describe('the production host reference (RV4307)', () => {
  it('one composite identity on every surface, and the raw resupply asserts true on resume', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-production-host-'));
    const store = new JsonlFileStore({ dir });
    const makeEngine = () =>
      createEngine({
        adapters: [new FakeAdapter({ agents: { '*': 'the answer' } })],
        stores: { journal: store },
        defaults: { routing: { loop: FAKE_MODEL_REF } },
      });
    const wf = defineWorkflow({ name: 'production-flow' }, async (ctx) => ctx.agent('one turn'));
    const outcome = await makeEngine().run(wf, undefined, {
      runId: 'PROD-IDENTITY',
      ...productionRunOptions({ budgetUsd: 5, scope: RAW_SCOPE }),
    }).result;
    expect(outcome.status).toBe('ok');
    const entries = await store.load('PROD-IDENTITY');
    const genesis = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'execution_scope',
    );
    const value = genesis?.value as { scope?: unknown; scopeDigest?: string; normalize?: unknown };
    expect(value.scope).toEqual(CANONICAL);
    expect(value.scopeDigest).toBe(executionScopeDigest(CANONICAL));
    expect(value.normalize).toEqual(
      productionRunOptions({ budgetUsd: 5, scope: RAW_SCOPE }).scopePolicy?.normalize,
    );
    // The FinOps join: the invoice header carries the same digest.
    const invoice = invoiceFromJournal(entries, () => 0.01);
    expect(invoice.executionScopeDigest).toBe(executionScopeDigest(CANONICAL));
    // Resume with the RAW values the deployment supplied originally:
    // the RECORDED table normalizes them before comparison.
    const resumed = await makeEngine().resume('PROD-IDENTITY', wf, { scope: RAW_SCOPE }).result;
    expect(resumed.status).toBe('ok');
  });

  it('provider account routing is fail closed: the recorded identity picks the adapter or nothing does', () => {
    const antProd = new FakeAdapter({ agents: { '*': 'ant' } });
    const oaiProd = new FakeAdapter({ agents: { '*': 'oai' } });
    const accounts = { 'ant-prod-7': antProd, 'oai-prod-2': oaiProd };
    expect(providerAccountAdapter(CANONICAL, accounts)).toBe(antProd);
    expect(providerAccountAdapter({ ...CANONICAL, providerAccount: 'oai-prod-2' }, accounts)).toBe(
      oaiProd,
    );
    expect(() =>
      providerAccountAdapter({ ...CANONICAL, providerAccount: 'shadow-acct' }, accounts),
    ).toThrow(/no adapter is registered for providerAccount 'shadow-acct'/);
    expect(() => providerAccountAdapter({ tenant: 'acme' }, accounts)).toThrow(
      /requires scope\.providerAccount/,
    );
  });

  it('the regulated v4 compile takes the host contract and hashes the enforced posture', () => {
    const profile = productionRegulatedProfile({
      engine: {
        adapters: [new FakeAdapter({ agents: { '*': 'x' } })],
        defaults: { routing: { loop: FAKE_MODEL_REF } },
      },
      budgetUsd: 25,
      scope: RAW_SCOPE,
      resolve: () => 'the cited line, verbatim',
      judgeModel: 'fake:fake-model',
      validators: [{ name: 'host-contract', validate: () => ({ ok: true }) }],
    });
    expect(profile.run.configFingerprint).toMatch(/^regulated:4:[0-9a-f]{64}$/);
    // The floor filled the plan 42 knobs the host left absent (RV4303).
    expect(profile.orchestrate?.finishValidation?.candidatePersistence).toBe('hash-only');
    expect(profile.orchestrate?.citationAudit?.resolver).toBe(2);
    // And the identity discipline rode through: the compiled scope is
    // canonical, the table preserved under the pinned 'reject'.
    expect(profile.run.scope).toEqual(CANONICAL);
    expect(profile.run.scopePolicy).toMatchObject({ unknown: 'reject' });
    // A loosened posture refuses typed by name: the dossier's promotion
    // checklist points here.
    expect(() =>
      productionRegulatedProfile({
        engine: { adapters: [], defaults: { routing: { loop: FAKE_MODEL_REF } } },
        budgetUsd: 25,
        scope: RAW_SCOPE,
        resolve: 'not a resolver' as never,
        judgeModel: 'fake:fake-model',
        validators: [{ name: 'host-contract', validate: () => ({ ok: true }) }],
      }),
    ).toThrow(ConfigError);
  });

  it('the production gate refuses what nothing judged and passes only clean', () => {
    const unjudged = { semanticTerminalVerdict: undefined } as unknown as TerminalEnvelope;
    const refusal = productionGate(unjudged);
    expect(refusal.ok).toBe(false);
    expect(refusal.reason).toMatch(/not-judged/);
    const clean = semanticTerminalVerdictOf({
      claimConsistencyMeta: { coverage: 'full', findings: 0, judgedHash: 'a'.repeat(64) },
    });
    expect(
      productionGate({ semanticTerminalVerdict: clean } as unknown as TerminalEnvelope),
    ).toEqual({ ok: true });
    const waived = semanticTerminalVerdictOf({
      claimConsistencyMeta: { coverage: 'partial', findings: 0 },
      claimCoverageWaiver: { principal: 'owner', reason: 'gap', coverage: 'partial' },
    });
    const gate = productionGate({
      semanticTerminalVerdict: waived,
    } as unknown as TerminalEnvelope);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/waived by owner/);
  });
});
