/**
 * Verifier lane (recipe; see
 * https://docs.rulvar.com/guide/examples). A synthesis repeats its
 * specialists' strongest claims the loudest, so a wrong strong claim
 * is the expensive one. The verifier lane routes each specialist's
 * strongest claims to a SEPARATE verifier agent with a mandate to
 * refute them against the cited sources BEFORE synthesis; the
 * synthesis then builds only on claims that survived, and names what
 * fell. Pin the verifier to a stronger model than the specialists
 * (the per-call `model` option here, or an agent profile, with role
 * quality floors underneath; see
 * https://docs.rulvar.com/guide/model-routing): a claim that got past
 * one model needs a better skeptic, not another believer.
 */
import { z } from 'zod';

import { defineWorkflow, type Ctx, type ModelRef, type Workflow } from '@rulvar/core';

const reportSchema = z.strictObject({
  claims: z.array(
    z.strictObject({
      claim: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      evidence: z.string(),
    }),
  ),
});

const verdictSchema = z.strictObject({
  verdict: z.enum(['confirmed', 'refuted']),
  reason: z.string(),
});

export interface VerifierLaneArgs {
  task: string;
  lanes?: string[];
  /** How many of each specialist's strongest claims meet the verifier. */
  strongestPerLane?: number;
  /** Pin the verifier to a stronger model than the specialists. */
  verifierModel?: ModelRef;
}

export interface VerifiedClaim {
  lane: string;
  claim: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
  verdict: 'confirmed' | 'refuted';
  reason: string;
}

export interface VerifierLaneResult {
  task: string;
  synthesis: string;
  confirmed: VerifiedClaim[];
  refuted: VerifiedClaim[];
}

const DEFAULT_LANES = ['correctness', 'security', 'operations'];
const SEVERITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/**
 * Fans specialists out over the lanes, picks each report's strongest
 * claims in plain code (severity order, then report order), sends
 * every picked claim to the verifier with the refute mandate, and
 * synthesizes from the survivors. The refuted claims still reach the
 * synthesis prompt as named refutations, so the final report can say
 * what was checked and dropped instead of silently thinning.
 */
export const verifierLane: Workflow<VerifierLaneArgs, VerifierLaneResult> = defineWorkflow(
  { name: 'verifier-lane' },
  async (ctx: Ctx, args: VerifierLaneArgs) => {
    const lanes = args.lanes ?? DEFAULT_LANES;
    const strongest = args.strongestPerLane ?? 1;
    const reports = await ctx.parallel(
      lanes.map((lane) => async () => {
        const report = await ctx.agent(
          `You are the ${lane} specialist. Report your claims on: ${args.task}. ` +
            `Cite the source for every claim in its evidence field.`,
          { schema: reportSchema, label: `specialist-${lane}` },
        );
        return { lane, claims: report.claims };
      }),
    );
    const picked = reports.flatMap(({ lane, claims }) =>
      [...claims]
        .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
        .slice(0, strongest)
        .map((entry) => ({ lane, ...entry })),
    );
    const verified = await ctx.parallel(
      picked.map((finding) => async () => {
        const verifyOpts = { schema: verdictSchema, label: `verify-${finding.lane}` };
        const ruled = await ctx.agent(
          `You are the verifier. Try to REFUTE this ${finding.lane} claim against the ` +
            `cited sources before it reaches the synthesis; confirm only what survives ` +
            `your best attempt to break it.\n\nClaim: ${finding.claim}\n` +
            `Evidence: ${finding.evidence}`,
          args.verifierModel === undefined
            ? verifyOpts
            : { ...verifyOpts, model: args.verifierModel },
        );
        return { ...finding, verdict: ruled.verdict, reason: ruled.reason };
      }),
    );
    const confirmed = verified.filter((entry) => entry.verdict === 'confirmed');
    const refuted = verified.filter((entry) => entry.verdict === 'refuted');
    const synthesis = String(
      await ctx.agent(
        `Synthesize the final report for "${args.task}" from the CONFIRMED claims ` +
          `only:\n${JSON.stringify(confirmed)}\n\nThese claims were checked and ` +
          `REFUTED; do not assert them, name them as dropped:\n` +
          `${JSON.stringify(refuted.map(({ claim, reason }) => ({ claim, reason })))}`,
        { label: 'synthesis' },
      ),
    );
    return { task: args.task, synthesis, confirmed, refuted };
  },
);
