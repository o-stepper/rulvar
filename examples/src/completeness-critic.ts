/**
 * Completeness critic (recipe; see
 * https://docs.rulvar.com/guide/orchestration-modes). A first pass
 * produces a draft; a critic then asks "what is missing?" and its gaps
 * drive revision passes until the critic reports complete or
 * `maxRevisions` is reached. Prompt-shaped composition over ctx.phase
 * and ctx.agent; the library ships no "critic" mode.
 */
import { z } from 'zod';

import { defineWorkflow, type Ctx, type Workflow } from '@rulvar/core';

const critiqueSchema = z.strictObject({
  complete: z.boolean(),
  gaps: z.array(z.string()),
});

export interface CriticArgs {
  brief: string;
  maxRevisions?: number;
}

export interface CriticResult {
  brief: string;
  draft: string;
  revisions: number;
  outstandingGaps: string[];
}

/**
 * Drafts, then critiques and revises until the critic reports complete
 * or `maxRevisions` is reached. Each stage runs in its own phase so
 * cost attribution (CostReport.byPhase) reads draft vs critique vs
 * revise separately.
 */
export const completenessCritic: Workflow<CriticArgs, CriticResult> = defineWorkflow(
  { name: 'completeness-critic' },
  async (ctx: Ctx, args: CriticArgs) => {
    const maxRevisions = args.maxRevisions ?? 2;
    let draft = String(
      await ctx.phase('draft', () => ctx.agent(`Draft a response to: ${args.brief}`)),
    );
    let revisions = 0;
    let gaps: string[] = [];
    while (revisions < maxRevisions) {
      const critique = await ctx.phase('critique', () =>
        ctx.agent(
          `Review this draft for the brief "${args.brief}". List what is missing; ` +
            `report complete:true only when nothing material remains.\n\nDraft: ${draft}`,
          { schema: critiqueSchema, label: `critic-${revisions + 1}` },
        ),
      );
      gaps = critique.gaps;
      if (critique.complete || critique.gaps.length === 0) {
        break;
      }
      revisions += 1;
      draft = String(
        await ctx.phase('revise', () =>
          ctx.agent(
            `Revise the draft to address these gaps: ${JSON.stringify(critique.gaps)}.\n\n` +
              `Draft: ${draft}`,
            { label: `revise-${revisions}` },
          ),
        ),
      );
    }
    return { brief: args.brief, draft, revisions, outstandingGaps: gaps };
  },
);
