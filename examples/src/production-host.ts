/**
 * The production host reference (RV4307, P2.3; the rendered dossier is
 * https://docs.rulvar.com/guide/production-host). The adoption
 * question this module answers by RUNNING instead of describing: what
 * Rulvar provides, what the host must provide, and what evidence
 * promotes a deployment. Four runnable pieces, each an arrangement of
 * shipped primitives and nothing new: the composite identity with its
 * declarative value normalization (RV4302), provider account routing
 * as a host decision over the scope (RV4205), the regulated floor v4
 * compile (RV4303), and the production acceptance gate (RV4209), the
 * same predicate `rulvar drive --acceptance-policy production` applies.
 * Everything here executes on FakeAdapter with zero live calls, and
 * the dossier labels it accordingly: Fake/VCR evidence, never
 * production proof.
 */
import {
  compileRegulatedProfile,
  productionAcceptable,
  type CreateEngineOptions,
  type ExecutionScope,
  type OrchestrateOptions,
  type ProviderAdapter,
  type RegulatedProfile,
  type RunOptions,
  type ScopeNormalizeTable,
  type SemanticTerminalVerdict,
  type TerminalEnvelope,
} from '@rulvar/core';

/**
 * The composite identity of a production run (RV4205/RV4302): every
 * dimension the deployment routes, bills, or audits by, plus the
 * declarative normalization table that folds host-supplied values onto
 * ONE canonical form before any digest exists. The table is data on
 * purpose (a callback would not be replay stable), it is journaled in
 * the genesis decision, and a resume re-supplying the raw values the
 * run started with asserts true because the RECORDED table normalizes
 * them first.
 */
export const PRODUCTION_SCOPE_NORMALIZE: ScopeNormalizeTable = {
  version: 1,
  fields: {
    tenant: ['trim', 'lowercase'],
    region: ['trim', 'lowercase'],
    providerAccount: ['trim'],
    project: ['trim'],
  },
};

/** The run options of a production run: identity plus its normalization. */
export function productionRunOptions(options: {
  budgetUsd: number;
  scope: ExecutionScope;
}): RunOptions {
  return {
    budgetUsd: options.budgetUsd,
    scope: options.scope,
    // 'reject' is the production posture (RV4205): a dimension the
    // engine cannot record is a dimension nothing downstream can bind.
    scopePolicy: { unknown: 'reject', normalize: PRODUCTION_SCOPE_NORMALIZE },
  };
}

/**
 * Provider account routing is a HOST decision over the recorded scope
 * (RV4205): the engine records `providerAccount` as identity; which
 * concrete adapter (and therefore which billing account and key) that
 * value selects belongs to the host's own configuration. The reference
 * routes fail closed: an account no adapter is registered for refuses
 * typed instead of falling through to a default account someone else
 * pays for.
 */
export function providerAccountAdapter(
  scope: ExecutionScope,
  accounts: Record<string, ProviderAdapter>,
): ProviderAdapter {
  const account = scope.providerAccount;
  if (account === undefined) {
    throw new Error(
      'production routing requires scope.providerAccount: a run with no account identity ' +
        'would bill whatever default the process holds',
    );
  }
  const adapter = accounts[account];
  if (adapter === undefined) {
    throw new Error(
      `no adapter is registered for providerAccount '${account}'; the known accounts are ` +
        Object.keys(accounts).sort().join(', '),
    );
  }
  return adapter;
}

/**
 * The regulated floor v4 (RV4303), compiled from the host's own
 * declarations: the validators are the host's acceptance criteria (the
 * floor refuses their omission rather than inventing them), the
 * citation resolver is the host's pure snapshot function, and the
 * claim judge model is the host's routing decision. What comes back is
 * DATA plus the posture hash: `run.configFingerprint` reads
 * `regulated:4:<profileHash>`, genesis records it, and a resume
 * asserting a different fingerprint refuses before ownership.
 */
export function productionRegulatedProfile(options: {
  engine: CreateEngineOptions;
  budgetUsd: number;
  scope: ExecutionScope;
  resolve: (target: { path: string; line: number }) => string | undefined;
  judgeModel: `${string}:${string}`;
  validators: NonNullable<OrchestrateOptions['finishValidation']>['validators'];
}): RegulatedProfile {
  return compileRegulatedProfile({
    engine: options.engine,
    run: {
      budgetUsd: options.budgetUsd,
      scope: options.scope,
      scopePolicy: { normalize: PRODUCTION_SCOPE_NORMALIZE },
    },
    orchestrate: {
      citationAudit: { resolve: options.resolve },
      claimConsistency: { stage: 'final', judge: { model: options.judgeModel } },
      finishValidation: { validators: options.validators },
    },
  });
}

/**
 * The production gate (RV4209): the ONE predicate a pipeline holds a
 * terminal against, exactly what `rulvar drive --acceptance-policy
 * production` exits on. Fail closed on absence: an envelope with no
 * semantic verdict is a run nothing judged, and a production lane
 * refuses it rather than inheriting a hope.
 */
export function productionGate(envelope: TerminalEnvelope): { ok: boolean; reason?: string } {
  return productionAcceptable(
    envelope.semanticTerminalVerdict as SemanticTerminalVerdict | undefined,
  );
}
