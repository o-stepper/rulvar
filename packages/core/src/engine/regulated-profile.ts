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
 * OrchestrateOptions, and since RV4101 it also walks the
 * CONSTRUCTIONS those options reach (adapters, tool sources in named
 * toolsets and profiles). A construction exposing
 * `describeRegulatedPosture()` has its posture judged by field name
 * (an MCP source's drift must be 'refuse' with every discovery bound
 * declared; the AI SDK bridge must keep providerExecutedTools
 * 'deny'), the sorted descriptors enter the hashed map under
 * `construction`, and constructions exposing nothing are COUNTED
 * there as `unrecognized`, so the hash names its own blind spot
 * instead of implying totality (the RV4009 rule "a hash must not
 * imply what it cannot verify", now with the verifiable part
 * verified). The between-compile-and-use window is held as well
 * (RV4102): the compiled options carry re-asserting wrappers whose
 * risk seams re-judge the descriptor on every use, and the
 * cross-process half was always held by the RV3210 fingerprint
 * assertion.
 */
import { createHash } from 'node:crypto';

import { ConfigError } from '../l0/errors.js';
import { jcsSerialize } from '../l0/jcs.js';
import type {
  AiSdkBridgeRegulatedPosture,
  McpSourceRegulatedPosture,
  RegulatedPostureDescriptor,
} from '../l0/spi/regulated-posture.js';
import type { OrchestrateOptions } from '../orchestrator/orchestrate.js';
import type { ToolsOption } from '../tools/toolset-hash.js';
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

// 2 since RV4101: the hashed map gained the `construction` key (the
// sorted attested descriptors plus the unrecognized count), so the
// meaning of the map changed and a v1 hash must never collide with a
// v2 reading of the same options.
const REGULATED_VERSION = 2;

function refuse(field: string, requirement: string): never {
  throw new ConfigError(
    `compileRegulatedProfile: ${field} ${requirement}; the regulated floor is ` +
      'non-loosenable, so drop the field to inherit the floor or meet it explicitly',
  );
}

/**
 * Judges one construction's descriptor against the floor (RV4101) and
 * returns the normalized shape that enters the hashed posture map.
 * Shared by the compile walk and the use-time re-assertion (RV4102),
 * so a posture that loosens AFTER compile refuses with the same
 * field-named error it would have refused with at compile time.
 */
function judgeDescriptor(raw: unknown): RegulatedPostureDescriptor {
  const descriptor = raw as Partial<RegulatedPostureDescriptor> | null | undefined;
  if (
    descriptor === null ||
    typeof descriptor !== 'object' ||
    descriptor.regulatedPosture !== 1 ||
    typeof descriptor.name !== 'string' ||
    descriptor.name === ''
  ) {
    refuse(
      'construction',
      'exposes describeRegulatedPosture() with an unrecognized shape (need ' +
        'regulatedPosture: 1, a non-empty string name, and a known kind)',
    );
  }
  if (descriptor.kind === 'mcp-source') {
    const mcpPosture = descriptor as McpSourceRegulatedPosture;
    if (mcpPosture.drift !== 'refuse') {
      refuse(
        `construction['${descriptor.name}'].drift`,
        "must be 'refuse' (RV1516): under a rekey posture a listChanged notification " +
          'imports a changed tool list beneath the regulated run',
      );
    }
    const bounds = mcpPosture.bounds as McpSourceRegulatedPosture['bounds'] | undefined;
    if (bounds === undefined || bounds.declared !== true) {
      refuse(
        `construction['${descriptor.name}'].bounds`,
        'must declare every discovery bound (maxTools, maxPages, maxSchemaBytes, ' +
          'timeouts.discoveryMs; RV1808): an unbounded sweep against a remote registry ' +
          'is an availability decision someone should have made on purpose',
      );
    }
    return {
      regulatedPosture: 1,
      kind: 'mcp-source',
      name: descriptor.name,
      drift: 'refuse',
      bounds: {
        declared: true,
        ...(typeof bounds.maxTools === 'number' ? { maxTools: bounds.maxTools } : {}),
        ...(typeof bounds.maxPages === 'number' ? { maxPages: bounds.maxPages } : {}),
        ...(typeof bounds.maxSchemaBytes === 'number'
          ? { maxSchemaBytes: bounds.maxSchemaBytes }
          : {}),
        ...(typeof bounds.discoveryMs === 'number' ? { discoveryMs: bounds.discoveryMs } : {}),
      },
    };
  }
  if (descriptor.kind === 'ai-sdk-bridge') {
    const bridgePosture = descriptor as AiSdkBridgeRegulatedPosture;
    if (bridgePosture.providerExecutedTools !== 'deny') {
      refuse(
        `construction['${descriptor.name}'].providerExecutedTools`,
        "must be 'deny': a provider-executed tool runs outside the permission chain " +
          'and the journal',
      );
    }
    return {
      regulatedPosture: 1,
      kind: 'ai-sdk-bridge',
      name: descriptor.name,
      providerExecutedTools: 'deny',
    };
  }
  refuse(
    `construction['${descriptor.name}']`,
    `attests an unrecognized kind '${String((descriptor as { kind?: unknown }).kind)}'; ` +
      "this floor can judge 'mcp-source' and 'ai-sdk-bridge'",
  );
}

/**
 * The use-time re-assertion (RV4102, the RV1608 template). The
 * descriptor is a snapshot, and the window between compile and use is
 * where a construction mutated in-process could walk a moved posture
 * beneath the hash. The compiled options therefore carry this proxy
 * in the original's place: every use of the risk seam (`tools` on a
 * source, `stream` on an adapter) re-reads and re-judges the
 * descriptor first. A loosening refuses with the compile-time
 * field-named error; any other movement (a rename, a bound change, a
 * vanished descriptor) refuses naming the drift. Everything else
 * passes through untouched, so `close()`, `caps()`, and identity
 * fields behave exactly as before. The cross-process half of the
 * window needs no proxy: a mutated construction compiles to a
 * different profile hash, and the RV3210 resume assertion refuses it.
 */
function wrapReasserting<T extends object>(construction: T, frozen: string): T {
  const guard =
    (seam: string, original: (...args: unknown[]) => unknown) =>
    (...args: unknown[]): unknown => {
      const probe = (construction as { describeRegulatedPosture?: () => unknown })
        .describeRegulatedPosture;
      const fresh =
        typeof probe === 'function'
          ? jcsSerialize(judgeDescriptor(probe.call(construction)))
          : undefined;
      if (fresh !== frozen) {
        throw new ConfigError(
          `compileRegulatedProfile: the construction posture moved between compile time ` +
            `and ${seam}() (RV4102): the compiled profile licensed ${frozen}, the ` +
            `construction now reports ${fresh ?? 'no describeRegulatedPosture() at all'}. ` +
            'Recompile the profile deliberately instead of mutating a construction ' +
            'beneath it.',
        );
      }
      return original.apply(construction, args);
    };
  return new Proxy(construction, {
    get(target, prop): unknown {
      const value = Reflect.get(target, prop, target);
      if ((prop === 'tools' || prop === 'stream') && typeof value === 'function') {
        return guard(String(prop), value as (...args: unknown[]) => unknown);
      }
      return value;
    },
  });
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

  // ---- Construction floor (RV4101). The postures the options cannot
  // express live on constructions: an mcp() source's drift and
  // discovery bounds, the AI SDK bridge's provider-executed-tools
  // seam. Walk everything the options reach (adapters, named
  // toolsets, profile toolsets), read the pure descriptors, refuse a
  // loosened posture by field name, and COUNT what exposed nothing:
  // the hashed map then tells the auditor how many constructions it
  // could not see instead of implying totality. A descriptor of an
  // unrecognized shape or kind refuses outright: a construction that
  // claims an attestation this floor cannot judge must not compile
  // into silence. The window between this compile and the run is
  // closed too (RV4102): every attested construction is wrapped so
  // its risk seam re-judges the descriptor on use, and the
  // cross-process half was always held by the RV3210 fingerprint
  // assertion (a mutated construction compiles to a different hash).
  const walked = new Set<object>();
  const attested: RegulatedPostureDescriptor[] = [];
  const reasserted = new Map<object, object>();
  let unrecognized = 0;
  const visit = (construction: unknown): void => {
    if (construction === null || typeof construction !== 'object' || walked.has(construction)) {
      return;
    }
    walked.add(construction);
    const probe = (construction as { describeRegulatedPosture?: unknown }).describeRegulatedPosture;
    if (typeof probe !== 'function') {
      unrecognized += 1;
      return;
    }
    const judged = judgeDescriptor((probe as () => unknown).call(construction));
    attested.push(judged);
    reasserted.set(construction, wrapReasserting(construction, jcsSerialize(judged)));
  };
  for (const adapter of engine.adapters ?? []) {
    visit(adapter);
  }
  const visitTools = (tools: ToolsOption | undefined): void => {
    for (const entry of tools ?? []) {
      if (typeof entry === 'string' || (entry as { kind?: unknown }).kind === 'tool') {
        // A string names a toolset walked from defaults.toolsets
        // below; a static ToolDef is a contract, not a construction.
        continue;
      }
      visit(entry);
    }
  };
  for (const toolset of Object.values(defaults.toolsets ?? {})) {
    visitTools(toolset);
  }
  for (const profile of Object.values(defaults.profiles ?? {})) {
    visitTools(profile.tools);
  }
  // The compiled options carry the re-asserting wrappers in place of
  // the attested originals (RV4102): same identity everywhere one
  // object appeared, strings and static ToolDefs untouched.
  const swap = <T>(value: T): T =>
    typeof value === 'object' && value !== null && reasserted.has(value)
      ? (reasserted.get(value) as T)
      : value;
  if (reasserted.size > 0) {
    if (engine.adapters !== undefined) {
      engine.adapters = engine.adapters.map(swap);
    }
    if (defaults.toolsets !== undefined) {
      defaults.toolsets = Object.fromEntries(
        Object.entries(defaults.toolsets).map(([name, tools]) => [name, tools.map(swap)]),
      );
    }
    if (defaults.profiles !== undefined) {
      defaults.profiles = Object.fromEntries(
        Object.entries(defaults.profiles).map(([name, profile]) => [
          name,
          profile.tools === undefined ? profile : { ...profile, tools: profile.tools.map(swap) },
        ]),
      );
    }
  }
  const postureKeyOf = (entry: RegulatedPostureDescriptor): string => `${entry.kind} ${entry.name}`;
  attested.sort((a, b) =>
    postureKeyOf(a) < postureKeyOf(b) ? -1 : postureKeyOf(a) > postureKeyOf(b) ? 1 : 0,
  );

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
    // The construction postures (RV4101): what attested, sorted for
    // determinism, and how many constructions attested NOTHING, so
    // the hash carries its own blind-spot count.
    construction: { attested, unrecognized },
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
