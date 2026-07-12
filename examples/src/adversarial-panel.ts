/**
 * Adversarial panel (recipe, not an engine flag; see
 * https://docs.rulvar.com/guide/orchestration-modes). A claim is
 * verified by N independent skeptics each PROMPTED to refute it; the
 * claim survives only when a majority fail to refute. Prompt-shaped
 * composition over ctx.parallel and ctx.agent: the library ships no
 * "adversarial" mode.
 *
 * Runnable reference and integration test (examples/*.test.ts on
 * FakeAdapter, zero live calls); the rendered walk-through is
 * https://docs.rulvar.com/guide/examples.
 */
import { z } from 'zod';

import { defineWorkflow, type Ctx, type Workflow } from '@rulvar/core';

const refutationSchema = z.strictObject({
  refuted: z.boolean(),
  reason: z.string(),
});

export interface AdversarialArgs {
  claim: string;
  skeptics?: number;
}

export interface AdversarialResult {
  claim: string;
  survives: boolean;
  refutedCount: number;
  votes: Array<{ refuted: boolean; reason: string }>;
}

/**
 * Runs `skeptics` independent refutation attempts in parallel and
 * decides by majority. Each skeptic is a separate agent scope, so a
 * flake in one never poisons the others; the default-refuted framing
 * lives in the PROMPT, the only place it belongs.
 */
export const adversarialPanel: Workflow<AdversarialArgs, AdversarialResult> = defineWorkflow(
  { name: 'adversarial-panel' },
  async (ctx: Ctx, args: AdversarialArgs) => {
    const skeptics = args.skeptics ?? 3;
    const votes = await ctx.parallel(
      Array.from(
        { length: skeptics },
        (_unused, index) => () =>
          ctx.agent(
            `You are skeptic ${index + 1}. Try to REFUTE this claim; default to refuted:true ` +
              `when uncertain.\n\nClaim: ${args.claim}`,
            { schema: refutationSchema, label: `skeptic-${index + 1}` },
          ),
      ),
    );
    const refutedCount = votes.filter((vote) => vote.refuted).length;
    return {
      claim: args.claim,
      survives: refutedCount * 2 < skeptics,
      refutedCount,
      votes,
    };
  },
);
