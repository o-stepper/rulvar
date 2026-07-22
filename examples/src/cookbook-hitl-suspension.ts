/**
 * Long HITL suspension (cookbook recipe; the rendered walk-through is
 * https://docs.rulvar.com/guide/cookbook). A worker that discovers the
 * task is bigger than approved escalates instead of guessing; flavor B
 * parks the run on the durable approval machinery with a JOURNALED
 * deadline, so the suspension survives process restarts (a resume
 * re-arms the timer from the journal entry, not from config) and the
 * default decision applies when nobody answers in time. The live
 * decision channel is the engine's `onEscalation` hook; it races the
 * deadline and the first closing resolution wins. Nothing paid is
 * lost either way: the report carries cost to date and the salvage
 * refs (transcript, artifacts).
 */
import { defineWorkflow, isEscalated, type Ctx, type Workflow } from '@rulvar/core';

/** A week: long enough that only the journal can own the deadline. */
export const APPROVAL_WINDOW_MS: number = 7 * 24 * 60 * 60 * 1000;

export interface MigrationOutcome {
  done: boolean;
  output?: string;
  /** Present when the worker escalated; everything a triage queue needs. */
  escalated?: {
    kind: string;
    scopeDelta: string;
    costToDateUsd: number;
    salvageTranscriptRef: string;
  };
}

/**
 * Dispatches the migration worker under the flavor B contract: an
 * escalate call suspends durably until a decision (or the deadline
 * default, here a cancel, so silence never auto approves a bigger
 * scope). The workflow returns a typed outcome either way; acting on an
 * accepted escalation (redispatching with a bigger budget) stays caller
 * policy, exactly where it belongs.
 */
export const migrationWithApproval: Workflow<{ task: string }, MigrationOutcome> = defineWorkflow(
  { name: 'migration-with-approval' },
  async (ctx: Ctx, args: { task: string }) => {
    const result = await ctx.agent(
      `Perform the migration: ${args.task}. When the scope turns out bigger than one ` +
        'service, STOP and call the escalate tool with the revised estimate instead of guessing.',
      {
        result: 'full',
        label: 'migrator',
        escalation: {
          flavor: 'B',
          deadlineMs: APPROVAL_WINDOW_MS,
          defaultDecision: { kind: 'cancel', reason: 'the approval window expired' },
        },
      },
    );
    if (isEscalated(result)) {
      const report = result.escalation;
      return {
        done: false,
        escalated: {
          kind: report.kind,
          scopeDelta: report.scopeDelta,
          costToDateUsd: report.costToDate.usd,
          salvageTranscriptRef: report.salvage.transcriptRef,
        },
      };
    }
    const output =
      typeof result.output === 'string' ? result.output : JSON.stringify(result.output ?? null);
    return { done: result.status === 'ok', output };
  },
);
