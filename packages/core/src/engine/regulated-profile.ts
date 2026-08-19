/**
 * The regulated run profile (RV4009, the fifth comparison experiment;
 * previously gated behind its own word and confirmed with plan 40).
 *
 * Every assurance posture this codebase grew across the comparison
 * arcs is an OPT-IN knob, which is correct for a library and lethal
 * for an unreviewed config: the 2026-08-12 run armed every gate to
 * observe, and the fifth run's harness gated on error findings alone.
 * `compileRegulatedProfile` is the one-call composition: it takes the
 * host's ordinary options, REFUSES any field that loosens the
 * regulated floor (typed, naming the field), fills what is absent,
 * and returns the compiled options plus a profile hash over the
 * enforced posture. The hash rides RunOptions.configFingerprint, so
 * the existing genesis recording and resume assertion machinery
 * (RV3210) pin it with zero new meta surface.
 *
 * DATA, not engine semantics (the M5-T07 doctrine): the engine gains
 * no strategy enum and no behavioral branch; a host that wants the
 * posture applies the compiled options like any others. The floor
 * binds what flows through CreateEngineOptions / RunOptions /
 * OrchestrateOptions; construction-side postures the options cannot
 * see (MCP source `drift: 'refuse'` and bounds, the AI SDK bridge's
 * `providerExecutedTools: 'deny'`) are named in the docs checklist
 * beside this function, because a hash must not imply what it cannot
 * verify.
 */
import { createHash } from 'node:crypto';

import { ConfigError } from '../l0/errors.js';
import { jcsSerialize } from '../l0/jcs.js';
import type { OrchestrateOptions } from '../orchestrator/orchestrate.js';
import type { CreateEngineOptions, RunOptions } from './engine.js';

/** What compileRegulatedProfile returns: apply verbatim. */
export interface RegulatedProfile {
  engine: CreateEngineOptions;
  run: RunOptions;
  orchestrate?: OrchestrateOptions;
  /**
   * sha256 over the enforced posture map (version marker included),
   * already composed into run.configFingerprint, so genesis records
   * it and ResumeOptions.configFingerprint asserts it back with the
   * RV3210 machinery; no new meta surface.
   */
  profileHash: string;
}

const REGULATED_VERSION = 1;

function refuse(field: string, requirement: string): never {
  throw new ConfigError(
    `compileRegulatedProfile: ${field} ${requirement}; the regulated floor is ` +
      'non-loosenable, so drop the field to inherit the floor or meet it explicitly',
  );
}

export function compileRegulatedProfile(input: {
  engine: CreateEngineOptions;
  run: RunOptions;
  orchestrate?: OrchestrateOptions;
}): RegulatedProfile {
  const engine = { ...input.engine, defaults: { ...input.engine.defaults } };
  const run = { ...input.run };
  const orchestrate = input.orchestrate === undefined ? undefined : { ...input.orchestrate };

  // ---- Engine floor.
  const defaults = engine.defaults ?? {};
  const permissions = { ...(defaults.permissions ?? {}) };
  if (permissions.strictApprovals === false) {
    refuse('defaults.permissions.strictApprovals', 'must not be false (RV1507 monotonic mode)');
  }
  permissions.strictApprovals = true;
  defaults.permissions = permissions;
  if (defaults.billingReceipts !== undefined && defaults.billingReceipts !== 'intent') {
    refuse('defaults.billingReceipts', "must be 'intent' (RV4006 pre-wire intents)");
  }
  defaults.billingReceipts = 'intent';
  engine.defaults = defaults;
  const determinism = { ...(engine.determinism ?? {}) };
  if (determinism.mode !== undefined && determinism.mode !== 'error') {
    refuse('determinism.mode', "must be 'error'");
  }
  determinism.mode = 'error';
  engine.determinism = determinism;
  // Profiles: no loosened approvals, no unattested imported toolsets.
  for (const [name, profile] of Object.entries(defaults.profiles ?? {})) {
    if (profile.permissions?.strictApprovals === false) {
      refuse(`defaults.profiles.${name}.permissions.strictApprovals`, 'must not be false');
    }
    if (profile.tools !== undefined && profile.toolsetAttestation === undefined) {
      refuse(
        `defaults.profiles.${name}`,
        'declares tools without a toolsetAttestation (pin the resolved hashes)',
      );
    }
  }

  // ---- Run floor.
  if (typeof run.budgetUsd !== 'number') {
    refuse('run.budgetUsd', 'must declare a USD ceiling');
  }
  if (run.strictPricing === false) {
    refuse('run.strictPricing', 'must not be false');
  }
  run.strictPricing = run.strictPricing ?? true;
  if (run.budgetPolicy !== undefined && run.budgetPolicy !== 'immutable-lifetime') {
    refuse('run.budgetPolicy', "must be 'immutable-lifetime' (RV3902)");
  }
  run.budgetPolicy = 'immutable-lifetime';
  if (run.scope === undefined) {
    refuse('run.scope', 'must name the execution scope (RV4007): a regulated run has an owner');
  }

  // ---- Orchestrate floor (when the run is a dynamic orchestration).
  if (orchestrate !== undefined) {
    const budget = { ...(orchestrate.budget ?? {}) };
    if (budget.acceptanceReserve !== undefined && budget.acceptanceReserve !== 'require') {
      refuse('orchestrate.budget.acceptanceReserve', "must be 'require' (RV3907/RV4001)");
    }
    budget.acceptanceReserve = 'require';
    orchestrate.budget = budget;
    if (orchestrate.citationAudit === undefined) {
      refuse(
        'orchestrate.citationAudit',
        'must be declared with the host snapshot resolver (RV4004): entailment is the ' +
          'regulated posture, not an option',
      );
    }
    // Absence is the loosest claim posture there is (RV4103): an
    // orchestration with no claimConsistency runs no claim pass, grades
    // no coverage, and arms no strict-final gate, which is a loosening
    // deeper than any field this floor already refuses. The floor does
    // not autofill it either: the pass needs a judge model and its
    // estimated cost, and a floor that invents billable defaults is a
    // different hazard, so the requirement is a refusal, symmetric with
    // citationAudit above.
    if (orchestrate.claimConsistency === undefined) {
      refuse(
        'orchestrate.claimConsistency',
        "must be declared with stage 'final' or 'both' (RV4103): the claim machinery is " +
          'the regulated posture, and omitting it entirely is the deepest loosening',
      );
    }
    if (orchestrate.claimConsistency !== undefined) {
      const claim = { ...orchestrate.claimConsistency };
      if (claim.coveragePolicy !== undefined && claim.coveragePolicy !== 'strict-final') {
        refuse('orchestrate.claimConsistency.coveragePolicy', "must be 'strict-final' (RV4003)");
      }
      if ((claim.stage ?? 'draft') === 'draft') {
        refuse(
          'orchestrate.claimConsistency.stage',
          "must be 'final' or 'both': the shipped document is what the pass must grade",
        );
      }
      claim.coveragePolicy = 'strict-final';
      orchestrate.claimConsistency = claim;
    }
  }

  const posture = {
    regulated: REGULATED_VERSION,
    strictApprovals: true,
    billingReceipts: 'intent',
    determinism: 'error',
    strictPricing: run.strictPricing === true ? true : run.strictPricing,
    budgetPolicy: 'immutable-lifetime',
    budgetUsd: run.budgetUsd,
    scope: run.scope,
    ...(orchestrate === undefined
      ? {}
      : {
          acceptanceReserve: 'require',
          citationAudit: true,
          ...(orchestrate.claimConsistency === undefined
            ? {}
            : { coveragePolicy: 'strict-final', claimStage: orchestrate.claimConsistency.stage }),
        }),
    ...(run.configFingerprint === undefined ? {} : { hostFingerprint: run.configFingerprint }),
  };
  const profileHash = createHash('sha256').update(jcsSerialize(posture), 'utf8').digest('hex');
  run.configFingerprint = `regulated:${String(REGULATED_VERSION)}:${profileHash}`;
  return {
    engine,
    run,
    ...(orchestrate === undefined ? {} : { orchestrate }),
    profileHash,
  };
}
