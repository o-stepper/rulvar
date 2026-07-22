/**
 * Resume and replay verification (cookbook recipe; the rendered
 * walk-through is https://docs.rulvar.com/guide/cookbook). The journal
 * is the source of truth: resuming a TERMINAL run on a completely fresh
 * engine must reproduce the same value from the journal alone, with
 * zero new provider calls and zero new journal bytes. This recipe is
 * the verification harness for that claim over any durable store; run
 * it against your own workflows whenever you change engine versions or
 * adapters. The CLI equivalent is `rulvar resume <runId>` on a finished
 * run.
 */
import { defineWorkflow, type Ctx, type Engine, type Workflow } from '@rulvar/core';

export interface ResumeReplayReport<R> {
  firstValue: R | undefined;
  resumedValue: R | undefined;
  /** JSON-identical values: the replay reproduced the result. */
  identicalValue: boolean;
}

/** A two step workflow: enough structure for replay to prove itself. */
export const briefThenSummarize: Workflow<{ topic: string }, string> = defineWorkflow(
  { name: 'brief-then-summarize' },
  async (ctx: Ctx, args: { topic: string }) => {
    const brief = await ctx.agent(`Write a two sentence brief on: ${args.topic}`, {
      label: 'briefer',
    });
    const summary = await ctx.agent(`Compress to one sentence:\n${String(brief)}`, {
      label: 'summarizer',
    });
    return String(summary);
  },
);

/**
 * Runs the workflow to terminal on `first`, then resumes the SAME runId
 * on `fresh` (a different engine over the same durable store) and
 * compares the values. Resume takes the SAME args: arguments are not
 * journaled, so the host supplies them and the engine's binding gate
 * refuses a mismatch instead of silently re-running different work. The
 * caller asserts the store level facts that make this a proof: the
 * fresh adapter received zero calls and the journal bytes did not
 * change, which together mean the resumed value came from the journal,
 * not from a re-run.
 */
export async function runThenResume<A, R>(
  first: Engine,
  fresh: Engine,
  workflow: Workflow<A, R>,
  args: A,
  runId: string,
): Promise<ResumeReplayReport<R>> {
  const firstOutcome = await first.run(workflow, args, { runId }).result;
  const resumedOutcome = await fresh.resume(runId, workflow, { args }).result;
  return {
    firstValue: firstOutcome.value,
    resumedValue: resumedOutcome.value,
    identicalValue: JSON.stringify(firstOutcome.value) === JSON.stringify(resumedOutcome.value),
  };
}
