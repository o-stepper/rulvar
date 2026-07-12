/**
 * LLM-judge grader: asks a judge model for a
 * verdict against a schema. The judge runs THROUGH the engine via
 * GraderContext.judge, so judge calls are journaled, budgeted, and
 * VCR-recorded like any other agent call; eval CI replays them
 * deterministically.
 *
 * There is deliberately NO default judge model: weak defaults for judging
 * are forbidden (role quality floors), so `model` is a
 * required option and resolution stays subject to the engine's floors.
 */
import type { Json, JsonSchema, ModelSpec } from '@rulvar/core';
import type { Grader, GraderVerdict } from '../case.js';

/** The default judge verdict shape. */
export const JUDGE_VERDICT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
  required: ['passed'],
  additionalProperties: false,
};

export interface JudgeGraderOptions {
  /** Judge model; required, never defaulted (role quality floors). */
  model: ModelSpec;
  /** What to judge: the criteria prose embedded into the judge prompt. */
  instruction: string;
  name?: string;
  /**
   * Custom verdict schema; requires toVerdict. The default schema is
   * JUDGE_VERDICT_SCHEMA with its boolean `passed`.
   */
  schema?: JsonSchema;
  /** Maps the judge's structured output onto a pass/score pair. */
  toVerdict?: (output: Json) => { passed: boolean; score?: number };
}

function defaultToVerdict(output: Json): { passed: boolean; score?: number } {
  return {
    passed:
      typeof output === 'object' &&
      output !== null &&
      !Array.isArray(output) &&
      (output as { passed?: unknown }).passed === true,
  };
}

function judgePrompt(instruction: string, value: Json | undefined): string {
  return [
    'You are an evaluation judge. Judge the candidate output below against the instruction.',
    '',
    `Instruction: ${instruction}`,
    '',
    'Candidate output (JSON):',
    JSON.stringify(value ?? null),
    '',
    'Return a verdict object matching the response schema.',
  ].join('\n');
}

export function judgeGrader(options: JudgeGraderOptions): Grader {
  const name = options.name ?? 'judge';
  if (options.schema !== undefined && options.toVerdict === undefined) {
    throw new Error(`judgeGrader '${name}': a custom schema requires toVerdict`);
  }
  const toVerdict = options.toVerdict ?? defaultToVerdict;
  const schema = options.schema ?? JUDGE_VERDICT_SCHEMA;
  return {
    name,
    async grade(context): Promise<GraderVerdict> {
      if (context.outcome.status !== 'ok') {
        // Judging a run that did not settle ok would burn judge calls on
        // a case that already failed; skip deterministically.
        return {
          grader: name,
          passed: false,
          details: { skipped: `target run settled '${context.outcome.status}'` },
        };
      }
      const output = await context.judge({
        model: options.model,
        prompt: judgePrompt(options.instruction, context.value),
        schema,
      });
      const verdict = toVerdict(output);
      return {
        grader: name,
        passed: verdict.passed,
        ...(verdict.score === undefined ? {} : { score: verdict.score }),
        details: { output },
      };
    },
  };
}
