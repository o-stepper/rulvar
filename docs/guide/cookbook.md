---
title: Cookbook
description: Seven production-shaped recipes over the public Rulvar API, each backed by a runnable integration test in the repository, from evidence-preserving research to isolated tool execution.
---

# Cookbook

Seven recipes for the situations production orchestration actually meets, each a thin composition over the public API and each backed by a runnable integration test in [`examples/src`](https://github.com/o-stepper/rulvar/tree/main/examples/src) (the `cookbook-*.ts` files plus `cookbook.test.ts`). Like the [example patterns](/guide/examples), the recipes are **compositions, never engine flags**: everything below journals, replays, and budgets exactly like ordinary code, because it is ordinary code.

::: tip Run the recipes
The examples package is private and not published; run it from a repository clone:

```bash
git clone https://github.com/o-stepper/rulvar.git
cd rulvar
pnpm install
pnpm build
pnpm vitest run examples/src/cookbook.test.ts
```

Every recipe runs through the full engine on `FakeAdapter` with zero live calls; the isolated tools recipe spawns a local stdio child process, still with zero model traffic.
:::

| Recipe | Reach for it when | Built on |
| --- | --- | --- |
| Evidence-preserving research | The final report must carry the specialists' citations, not a summary of a summary | `exposeChildResultTools`, `finishValidation`, `acceptance` |
| Strict all-children-success | A run must never present a failed child as complete success | `acceptance: all-ok`, the typed `fail_run` error |
| Partial-result recovery | Enough successes should land even when one child fails, without losing WHY it failed | `acceptance: minSuccessful`, `get_child_result` |
| Resume and replay verification | You change engine versions or adapters and want proof replay stays free | `engine.resume`, a durable store |
| Bounded-budget orchestration | Spend must be capped per run and per orchestrator, refusals included | `budgetUsd`, `budget.capUsd`, spawn admission |
| Long HITL suspension | A worker needs a human decision that may take days | escalation flavor B, `onEscalation`, journaled deadlines |
| Isolated tool execution | Tools should run outside the engine process and writes outside the host checkout | `mcp` stdio, worktree isolation |

## Evidence-preserving research

The digest an `await` returns is a 400 character wake signal, so an unguarded synthesis step can drop the specialists' citations and still settle `ok`. The recipe composes three released contracts so it cannot: the orchestrator pages the full child reports before synthesizing, the finish must carry the required sections and preserve the children's citations (with the fabrication guard on), and every child must have settled `ok`.

From [`cookbook-evidence-research.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-evidence-research.ts):

```ts
import {
  evidencePreservedValidator,
  requiredSectionsValidator,
  type OrchestrateOptions,
} from "@rulvar/core";

export function evidenceResearchOptions(spec: {
  sections: string[];
  minShare?: number;
}): OrchestrateOptions {
  return {
    exposeChildResultTools: true,
    acceptance: { childPolicy: "all-ok" },
    finishValidation: {
      validators: [
        requiredSectionsValidator({ sections: spec.sections }),
        evidencePreservedValidator({ requireKnown: true }),
      ],
      maxRepairs: 1,
    },
  };
}
```

The test drives the full loop: the child reports three citations, the orchestrator reads the full report through `get_child_result`, its first lossy synthesis (one citation kept, two invented) is rejected with both defect kinds named, and the repaired finish lands as `completion: 'complete'` with the verdicts journaled.

## Strict all-children-success

Run status `ok` proves that `finish` validated, nothing more. The acceptance policy makes child success part of the contract, and the recipe shows the whole read path: an accepted run returns the envelope, a violated policy fails the run with the typed `fail_run` error, and a small helper extracts the child status counts from the public `outcome.error` without disturbing any other error handling. From [`cookbook-strict-success.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-strict-success.ts):

```ts
import type { WireError } from "@rulvar/core";

export function explainStrictFailure(error: WireError | undefined) {
  if (error?.code !== "fail_run") return undefined;
  const data = error.data as
    | { source?: string; childStatusCounts?: Record<string, number>; degradedReasons?: string[] }
    | undefined;
  if (data?.source !== "orchestrator_acceptance") return undefined;
  return {
    childStatusCounts: data.childStatusCounts ?? {},
    degradedReasons: data.degradedReasons ?? [],
  };
}
```

The CLI equivalent is `rulvar run --strict`, which turns a partial completion into a nonzero exit without any parsing.

## Partial-result recovery

`{ minSuccessful: N }` accepts the run once enough children succeeded and names every degraded child in `degradedReasons`; with the evidence tools on, the orchestrator can read the failed child's error message and respawn a narrowed replacement instead of losing the run. In the test, the db scan fails on a huge table; the orchestrator reads exactly that reason through `get_child_result`, respawns a scan of only the small tables, and the run settles as an honest `completion: 'partial'` with `{ ok: 2, error: 1 }`. See [`cookbook-partial-recovery.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-partial-recovery.ts).

## Resume and replay verification

The journal is the source of truth: resuming a terminal run on a completely fresh engine must reproduce the value from the journal alone. The recipe is the verification harness for that claim over any durable store; run it whenever you change engine versions or adapters. From [`cookbook-resume-replay.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-resume-replay.ts):

```ts
import type { Engine, Workflow } from "@rulvar/core";

export async function runThenResume<A, R>(
  first: Engine,
  fresh: Engine,
  workflow: Workflow<A, R>,
  args: A,
  runId: string,
) {
  const firstOutcome = await first.run(workflow, args, { runId }).result;
  // Arguments are not journaled: the host supplies the SAME args, and
  // the binding gate refuses a mismatch instead of re-running quietly.
  const resumedOutcome = await fresh.resume(runId, workflow, { args }).result;
  return {
    identicalValue:
      JSON.stringify(firstOutcome.value) === JSON.stringify(resumedOutcome.value),
  };
}
```

The test asserts the two facts the report alone cannot show: the fresh adapter received **zero** calls, and the journal file did not change **by a byte** across the resume.

## Bounded-budget orchestration

Two layers bound the spend. The root ceiling (`RunOptions.budgetUsd`) is frozen into RunMeta and covers the orchestrator and every child; the orchestrator's own sub-account cap declares its at-cap policy up front. A spawn the remaining budget cannot fund is refused by admission as a typed tool error the model sees and works around; the run keeps going. From [`cookbook-bounded-budget.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-bounded-budget.ts):

```ts
import { orchestrate, type Engine } from "@rulvar/core";
import { boundedBudgetOptions } from "./cookbook-bounded-budget.js";

declare const engine: Engine;
const handle = orchestrate(
  engine,
  "count every bag the budget allows",
  boundedBudgetOptions({ orchestratorCapUsd: 1, finalizeReserveUsd: 0.05 }),
  { budgetUsd: 1 }, // the root ceiling over the WHOLE tree, frozen into RunMeta
);
```

The test's journal shows exactly `['admit', 'reject']` spawn admission verdicts: the first child fit under the remaining budget, the second declared a ceiling the root could no longer fund, and the refusal reached the model as a tool error, never a crash.

## Long HITL suspension

A worker that discovers the task is bigger than approved escalates instead of guessing. Flavor B parks the run on the durable approval machinery with a **journaled** deadline: the suspension survives process restarts (a resume re-arms the timer from the journal entry, not from config), the engine's `onEscalation` hook is the live decision channel racing that deadline, and the default decision applies when nobody answers, so silence never auto approves a bigger scope. Nothing paid is lost either way: the report carries cost to date and the salvage refs. From [`cookbook-hitl-suspension.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-hitl-suspension.ts):

```ts
import { defineWorkflow, isEscalated, type Ctx } from "@rulvar/core";

export const migrationWithApproval = defineWorkflow(
  { name: "migration-with-approval" },
  async (ctx: Ctx, args: { task: string }) => {
    const result = await ctx.agent(`Perform the migration: ${args.task}.`, {
      result: "full",
      escalation: {
        flavor: "B",
        deadlineMs: 7 * 24 * 60 * 60 * 1000,
        defaultDecision: { kind: "cancel", reason: "the approval window expired" },
      },
    });
    if (isEscalated(result)) {
      return { done: false, scopeDelta: result.escalation.scopeDelta };
    }
    return { done: result.status === "ok", output: String(result.output ?? "") };
  },
);
```

The test verifies the durable trail: the suspension entry with its deadline, the external resolution that closed it, and the journaled decision, plus the salvage transcript ref on the returned outcome.

## Isolated tool execution

Two boundaries exist today, and one honest limit. Out of process: `mcp({ transport: 'stdio' })` serves tools from a child process; the test proves the tool ran under a **different pid** and that `source.close()` releases the child (the host owns the source lifecycle exactly like a connection pool). Filesystem: a worktree isolated profile gives a child agent its own checkout, and its writes come back as a `patch` artifact for the caller to apply or discard. The honest limit, stated as loudly here as in [Tools](/guide/tools): in-process tools are ordinary function calls with full host capabilities, an execution convenience, never a sandbox for hostile or model generated code; hard CPU, memory, and network limits remain host territory. See [`cookbook-isolated-tools.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-isolated-tools.ts).

## Next steps

- [Orchestration modes](/guide/orchestration-modes) for the contracts the first three recipes compose: acceptance, finish validation, and the evidence tools.
- [Budgets](/guide/budgets) for the full ceiling and admission model behind the bounded-budget recipe.
- [Durability](/guide/durability) for the journal semantics the resume recipe verifies.
- [Example patterns](/guide/examples) for the quality patterns (adversarial panel, judge panel, loop until dry, completeness critic) that compose with everything here.
