/**
 * The M1 exit-criteria example workflow (docs/10, section 3.2): a review
 * pipeline exercising ctx.agent, ctx.parallel, and ctx.pipeline. Runs
 * against FakeAdapter with zero network (src/example.test.ts) and against
 * both live adapters manually (key-gated in the same test file). Runnable
 * reference per the examples-corpus rules (docs/11, section "Examples
 * corpus").
 */
import { z } from 'zod';
import { defineWorkflow, type Workflow } from '@rulvar/core';

const findingSchema = z.strictObject({
  file: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
});

const verdictSchema = z.strictObject({
  verdict: z.enum(['approve', 'request-changes']),
  reasons: z.array(z.string()),
});

export interface ReviewArgs {
  files: string[];
}

export interface ReviewResult {
  findings: Array<{ file: string; severity: string; summary: string }>;
  verdict: string;
  reasons: string[];
}

/**
 * Fan out one reviewer per file (pipeline), cross-check the two highest
 * level questions in parallel, then synthesize a typed verdict.
 */
export const basicReview: Workflow<ReviewArgs, ReviewResult> = defineWorkflow(
  { name: 'basic-review' },
  async (ctx, args: ReviewArgs) => {
    const findings = await ctx.pipeline(args.files, (file: string) =>
      ctx.agent(`Review the file ${file} and report the most important finding.`, {
        agentType: 'reviewer',
        schema: findingSchema,
        label: `review:${file}`,
      }),
    );

    const [style, risk] = await ctx.parallel([
      () => ctx.agent('Any style concerns across the diff? One sentence.'),
      () => ctx.agent('Any rollout risk? One sentence.'),
    ]);

    const verdict = await ctx.agent(
      `Findings: ${JSON.stringify(findings)}\nStyle: ${style}\nRisk: ${risk}\n` +
        'Decide the review verdict.',
      { agentType: 'judge', schema: verdictSchema },
    );

    return { findings, verdict: verdict.verdict, reasons: verdict.reasons };
  },
);
