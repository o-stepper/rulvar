/**
 * Judge panel (recipe; see
 * https://docs.rulvar.com/guide/orchestration-modes). N independent
 * attempts are generated from different angles, each scored by a judge,
 * and the highest-scoring attempt wins. The judge floor (a role quality
 * floor; see https://docs.rulvar.com/guide/model-routing) is a router
 * constraint the host configures; the panel itself is prompt-shaped
 * composition over ctx.parallel and ctx.agent.
 */
import { z } from 'zod';

import { defineWorkflow, type Ctx, type Workflow } from '@rulvar/core';

const scoreSchema = z.strictObject({
  score: z.number(),
  rationale: z.string(),
});

export interface JudgeArgs {
  task: string;
  angles?: string[];
}

export interface JudgeResult {
  task: string;
  winner: { angle: string; attempt: string; score: number };
  ranking: Array<{ angle: string; score: number }>;
}

const DEFAULT_ANGLES = ['mvp-first', 'risk-first', 'user-first'];

/**
 * Generates one attempt per angle in parallel, judges each, and returns
 * the top-scoring attempt with the full ranking. Attempts are
 * independent agent scopes; the judge is an ordinary judged invocation
 * (journaled, budgeted, VCR-recordable like any agent call).
 */
export const judgePanel: Workflow<JudgeArgs, JudgeResult> = defineWorkflow(
  { name: 'judge-panel' },
  async (ctx: Ctx, args: JudgeArgs) => {
    const angles = args.angles ?? DEFAULT_ANGLES;
    const scored = await ctx.parallel(
      angles.map((angle) => async () => {
        const attempt = String(
          await ctx.agent(`Solve, ${angle}: ${args.task}`, { label: `attempt-${angle}` }),
        );
        const judged = await ctx.agent(
          `Score this attempt from 0 to 10 for the task "${args.task}".\n\nAttempt: ${attempt}`,
          { schema: scoreSchema, label: `judge-${angle}` },
        );
        return { angle, attempt, score: judged.score };
      }),
    );
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const winner = ranked[0] ?? { angle: angles[0] ?? '', attempt: '', score: 0 };
    return {
      task: args.task,
      winner,
      ranking: ranked.map(({ angle, score }) => ({ angle, score })),
    };
  },
);
