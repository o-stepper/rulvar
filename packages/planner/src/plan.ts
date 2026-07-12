/**
 * The plan agent and the self-repair loop (M6-T05): mode (b), the
 * flagship hybrid. plan() asks a planner model
 * (role 'plan') to write a script against the API card and the profile
 * card, lints it with eslint-plugin-rulvar, self-repairs up to
 * repairRounds rounds from the JSON diagnostics, and compiles the
 * accepted draft with compileScript. runPlanned composes plan-then-run.
 *
 * Determinism: the planner conversation itself is an ordinary journaled
 * run whose runId derives from the goal, so re-planning the same goal
 * against the same store REPLAYS the unchanged prefix for free
 * (invariant I1; the M6-T05 acceptance).
 */
import { createHash } from 'node:crypto';

import type { CompiledWorkflow, Engine, Json, ModelSpec, RunHandle } from '@rulvar/core';
import { defineWorkflow, ScriptRejected } from '@rulvar/core';
import { Linter } from 'eslint';
import { toJsonDiagnostics, workflowsConfig } from 'eslint-plugin-rulvar';

import { apiCard } from './api-card.js';
import { compileScript, scriptDiagnosticsOf } from './compile.js';

/** One repair-loop diagnostic: lint and compile findings share the shape. */
export interface PlanDiagnostic {
  ruleId: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface PlanOptions {
  /** The planner model; otherwise the chain resolves role 'plan'. */
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /** Self-repair rounds from JSON diagnostics; default 3 (Appendix A). */
  repairRounds?: number;
}

export interface PlanResult {
  source: string;
  workflow: CompiledWorkflow;
  /** Diagnostics of the ACCEPTED draft: advisories only, never errors. */
  lint: PlanDiagnostic[];
}

/** The deterministic planner runId: one goal, one journal. */
export function planRunIdOf(goal: string): string {
  return `plan-${createHash('sha256').update(goal, 'utf8').digest('hex').slice(0, 24)}`;
}

/**
 * The model may fence the script; the extractor takes the first fenced
 * block when one exists, else the whole reply, and is deterministic.
 */
export function extractScript(reply: string): string {
  const fence = /```(?:[a-zA-Z]*)?\n([\s\S]*?)```/.exec(reply);
  return (fence?.[1] ?? reply).trim();
}

/**
 * Lints a script BODY with the workflows preset plus compileScript.
 * The body is wrapped in an async function for parsing (top-level
 * return/await are legal in the dialect); reported lines shift back so
 * they index into the body source.
 */
export function lintScript(source: string): {
  diagnostics: PlanDiagnostic[];
  errors: PlanDiagnostic[];
  workflow?: CompiledWorkflow;
} {
  const diagnostics: PlanDiagnostic[] = [];
  const linter = new Linter();
  const wrapped = `async function rulvarWorkflowBody() {\n${source}\n}\n`;
  const messages = linter.verify(
    wrapped,
    [{ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } }, workflowsConfig],
    { filename: 'workflow-body.js' },
  );
  for (const lint of toJsonDiagnostics(messages)) {
    const diagnostic: PlanDiagnostic = {
      ruleId: lint.ruleId,
      message: lint.message,
      severity: lint.severity,
      line: Math.max(1, lint.line - 1),
      column: lint.column,
    };
    diagnostics.push(diagnostic);
  }
  let workflow: CompiledWorkflow | undefined;
  try {
    workflow = compileScript(source);
  } catch (error) {
    if (!(error instanceof ScriptRejected)) {
      throw error;
    }
    for (const rejection of scriptDiagnosticsOf(error)) {
      diagnostics.push({
        ruleId: `compile/${rejection.ruleId}`,
        message: rejection.message,
        severity: 'error',
        ...(rejection.line === undefined ? {} : { line: rejection.line }),
        ...(rejection.column === undefined ? {} : { column: rejection.column }),
      });
    }
  }
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  const result: {
    diagnostics: PlanDiagnostic[];
    errors: PlanDiagnostic[];
    workflow?: CompiledWorkflow;
  } = { diagnostics, errors };
  if (errors.length === 0 && workflow !== undefined) {
    result.workflow = workflow;
  }
  return result;
}

function draftPrompt(goal: string, cards: string): string {
  return [
    'Write the workflow script body for this goal.',
    '',
    `GOAL: ${goal}`,
    '',
    cards,
    '',
    'Reply with ONLY the script body (a fenced code block is accepted).',
  ].join('\n');
}

function repairPrompt(goal: string, source: string, diagnostics: PlanDiagnostic[]): string {
  return [
    'Your previous workflow script was rejected by the linter.',
    '',
    `GOAL: ${goal}`,
    '',
    'PREVIOUS SCRIPT:',
    source,
    '',
    'DIAGNOSTICS (JSON):',
    JSON.stringify(diagnostics, null, 2),
    '',
    'Fix every error and reply with ONLY the corrected script body.',
  ].join('\n');
}

interface PlanArgs {
  goal: string;
  cards: string;
  repairRounds: number;
  model?: ModelSpec;
}

/** The planner conversation as an ordinary journaled workflow. */
const planWorkflow = defineWorkflow(
  { name: 'rulvar-plan' },
  async (
    ctx,
    args: PlanArgs,
  ): Promise<{ source: string; lint: PlanDiagnostic[]; rounds: number }> => {
    let source = '';
    let lastDiagnostics: PlanDiagnostic[] = [];
    for (let round = 0; round <= args.repairRounds; round += 1) {
      const prompt =
        round === 0
          ? draftPrompt(args.goal, args.cards)
          : repairPrompt(args.goal, source, lastDiagnostics);
      const reply = await ctx.agent(prompt, {
        role: 'plan',
        onError: 'throw',
        ...(args.model === undefined ? {} : { model: args.model }),
      });
      source = extractScript(String(reply));
      // Pure recomputation: linting is a deterministic function of the
      // journaled reply, so replay needs no extra entries.
      const outcome = lintScript(source);
      if (outcome.errors.length === 0) {
        return { source, lint: outcome.diagnostics, rounds: round + 1 };
      }
      lastDiagnostics = outcome.diagnostics;
    }
    throw new ScriptRejected(
      `plan: self-repair exhausted after ${String(args.repairRounds + 1)} drafts; ` +
        'the last diagnostics ride in data',
      { data: { diagnostics: lastDiagnostics.map((d) => ({ ...d })) } },
    );
  },
);

export async function plan(engine: Engine, goal: string, o?: PlanOptions): Promise<PlanResult> {
  const repairRounds = o?.repairRounds ?? 3;
  const cards = [apiCard(), '', engine.profileCard(o?.profiles)].join('\n');
  const args: PlanArgs = {
    goal,
    cards,
    repairRounds,
    ...(o?.model === undefined ? {} : { model: o.model }),
  };
  // Resume-or-start on the deterministic runId: a fresh store starts a
  // new journal, a prior planning journal replays its unchanged prefix.
  const handle = engine.resume(planRunIdOf(goal), planWorkflow, { args });
  const outcome = await handle.result;
  if (outcome.status !== 'ok' || outcome.value === undefined) {
    const wire = outcome.error;
    throw new ScriptRejected(
      `plan: the planner run settled '${outcome.status}'${wire === undefined ? '' : `: ${wire.message}`}`,
      { data: { status: outcome.status, ...(wire === undefined ? {} : { error: wire }) } },
    );
  }
  const value = outcome.value as { source: string; lint: PlanDiagnostic[] };
  // The accepted draft compiled inside the run; compile once more here
  // to hand back the CompiledWorkflow value (pure, no model calls).
  const workflow = compileScript(value.source);
  return { source: value.source, workflow, lint: value.lint };
}

/**
 * plan-then-run in one call (amended during M6-T05:
 * the composition is async because planning itself is a run).
 */
export async function runPlanned(
  engine: Engine,
  goal: string,
  args?: Json,
): Promise<RunHandle<unknown>> {
  const planned = await plan(engine, goal);
  return engine.run(planned.workflow, args ?? null);
}
