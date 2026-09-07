---
title: Cookbook
description: Eight production-shaped recipes over the public Rulvar API, each backed by a runnable integration test in the repository, from evidence-preserving research to isolated tool execution.
---

# Cookbook

Eight recipes for the situations production orchestration actually meets, each a thin composition over the public API and each backed by a runnable integration test in [`examples/src`](https://github.com/o-stepper/rulvar/tree/main/examples/src) (the `cookbook-*.ts` files plus `cookbook.test.ts`). Like the [example patterns](/guide/examples), the recipes are **compositions, never engine flags**: everything below journals, replays, and budgets exactly like ordinary code, because it is ordinary code.

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
| Research fan out | A roster of specialists must read the task, cite a spread of sources, and end salvageable instead of rejected | `researchFanOut`, `childBrief`, `evidenceContract.distribution`, `synthesis` |
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

## Research fan out

The tenth comparison experiment assembled its fan out by hand and paid for every seam: the frozen question sat in a directory the research profile ignored and the coordinator copied the harness role strings into every spawn, so no specialist ever read the task; the specialists ran a model class below the coordinator's; the call cap sat a quarter below the template with no extension to convert the unspent money; an `all-ok` acceptance with no salvage arm and no spare seat rejected the whole run on one specialist's surplus bookkeeping call at 22 percent of the budget; and the task's demand for citations across implementation, tests, docs, and examples could not be declared, so the specialists cited documentation alone. 1.253.0 closes the product side of every seam (RV4905, RV4907, RV4908, with RV4902 and RV4903 underneath), and the recipe is the same setup assembled right, from public options only. The walk through follows [`cookbook-fan-out.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-fan-out.ts); the pieces it composes are documented under [partial child salvage and profile templates](/guide/orchestration-modes#partial-child-salvage-and-profile-templates).

The spec names what the harness got wrong, one field each: the frozen question as a path inside the readable root, the specialists as a role map that shares one model class, the money per specialist, and the spread of evidence the task demands.

```ts
import type { EvidenceCategory, ModelSpec } from "@rulvar/core";

export interface FanOutSpec {
  /** The confined repository root the specialists read; the frozen question lives under it. */
  root: string;
  /** Root relative path of the frozen question; every segment must be listable by the research tools. */
  questionFile: string;
  /** Extra basenames the research tools skip, merged over the always on list. */
  ignore?: string[];
  /** Specialist agentType to its role brief: the task specific half of every child's card. */
  roles: Record<string, string>;
  /** One model class for every specialist; absent, the `loop` routing entry serves all of them. */
  specialistModel?: ModelSpec;
  /** Declared money per specialist, in USD: the profile's `estCost` and the extension's headroom floor. */
  budgetUsd: number;
  /** The evidence floor and the spread of sources the task demands. */
  evidence: {
    minEntries: number;
    distribution?: Partial<Record<EvidenceCategory, number>>;
  };
  /** Deterministic instruction lines for the synthesis that composes the deliverable. */
  synthesisInstructions?: string;
}
```

The question is checked before anything is built. The research tools' walk skips every basename in `ignore`, the always on `.git` and `node_modules`, and every dot entry, so a question under a skipped directory is one `list_files` and `search_files` never show, which is the harness's exact seam (`experiments` was in its ignore list, and the file was there). The recipe refuses such a path and then reads the file, so a missing question fails at assembly instead of in four specialists.

```ts
const TOOLSET_ALWAYS_IGNORED = [".git", "node_modules"];

declare const spec: { questionFile: string; ignore?: string[] };
const ignored = new Set([...TOOLSET_ALWAYS_IGNORED, ...(spec.ignore ?? [])]);
for (const segment of spec.questionFile.split("/")) {
  if (ignored.has(segment) || segment.startsWith(".")) {
    throw new Error(
      `the frozen question '${spec.questionFile}' would be invisible to the research tools: ` +
        `'${segment}' is ignored or hidden`,
    );
  }
}
```

One `researchFanOut()` kit is built per role, so every specialist owns its evidence pool (one kit backs one profile, and children spawned from the same registered profile share its pool). The preset merges `RESEARCH_FAN_OUT_LIMITS` under the caller's limits: the research template's `maxTurns: 24`, `maxToolCalls: 48`, `toolUnits.max: 64` (a read or a search costs 2 units, a listing 1, bookkeeping 0), `maxCallsPerTool` of 12 listings, 20 searches, and 30 reads, and on top of them `finalizationWindow: { reserveCalls: 6, reserveForEvidenceDeficit: true, onSurplus: 'answer' }`, `finalizationReserve: { maxOutputTokens: 8000 }`, and `toolBudgetExtension: { increment: 12, maxExtensions: 3, coverEvidenceDeficit: true }` with `minHeadroomUsd` set to a tenth of `budgetUsd`; `estCost` is the declared money. Its `acceptance` is `all-ok` with both salvage arms, `requireEvidenceFloor: true` because a contract is declared, `minSpawnedChildren` equal to the roster, and `onUnreachable: 'notify'`. No default moved: without the preset `onSurplus` is `'limit'`, `onUnreachable` is `'continue'`, and both salvage arms stay opt in; the preset is the recommended way to turn them on.

```ts
import { researchFanOut, type AgentProfile, type OrchestrateAcceptance } from "@rulvar/core";

declare const spec: {
  root: string;
  roles: Record<string, string>;
  budgetUsd: number;
  evidence: { minEntries: number };
};
const roles = Object.entries(spec.roles);
const profiles: Record<string, AgentProfile> = {};
let acceptance: OrchestrateAcceptance | undefined;
for (const [name, role] of roles) {
  const kit = researchFanOut({
    root: spec.root,
    budgetUsd: spec.budgetUsd,
    children: roles.length,
    description: role,
    evidenceContract: { minEntries: spec.evidence.minEntries },
  });
  profiles[name] = kit.profile;
  acceptance = kit.acceptance;
}
```

The orchestrate options close the other seams. `childBrief: 'goal'` joins the goal (the question, then the run discipline and the roster) to every spawn prompt before admission, so the journaled spec, the identity, and the dispatch carry one prompt and the coordination prompt says the brief is automatic. `maxSpawns` is one seat above the roster, so a replacement stays possible where the harness forbade it. The acceptance is the preset's with `onUnreachable` raised to `'degrade'`: a policy the forecast declares unreachable settles as `completion: 'partial'` with the shortfall named, so the synthesis still composes over the settled children instead of the run dying rejected after a paid composition. The synthesis is `mode: 'single'` with `context: 'full'` (every specialist's full output rides the prompt, not the 400 character digests) and `policyFacts: true`, and its `instructions` shape the deliverable a judge reads.

```ts
import type { OrchestrateAcceptance, OrchestrateOptions } from "@rulvar/core";

declare const acceptance: OrchestrateAcceptance;
declare const roleNames: string[];
const options: OrchestrateOptions = {
  profiles: roleNames,
  maxSpawns: roleNames.length + 1,
  childBrief: "goal",
  acceptance: { ...acceptance, onUnreachable: "degrade" },
  exposeChildResultTools: true,
  synthesis: {
    mode: "single",
    context: "full",
    policyFacts: true,
    instructions: "Return one self contained Markdown RFC and preserve every citation.",
  },
};
```

Assembled, a run is three calls: the recipe, an engine with the profiles registered and a `synthesize` routing entry (the synthesis invocation runs under its own routing key), and `orchestrate` under a root ceiling. The specialists and the coordinator share one model class here, which is what makes the result a reading of the assembly rather than of a model mix.

```ts
import { createEngine, orchestrate } from "@rulvar/core";
import { openai } from "@rulvar/openai";
import { assembleFanOut } from "./cookbook-fan-out.js";

const fanOut = assembleFanOut({
  root: ".",
  questionFile: "benchmark-question.md",
  ignore: ["dist", "coverage"],
  roles: {
    "integration-architecture": "Own the target architecture and the API mapping.",
    "reliability-economics": "Own replay identity, budgets, and pricing.",
    "security-operations": "Own trust boundaries, permissions, and operations.",
    "verification-migration": "Own determinism, evals, and the migration plan.",
  },
  specialistModel: { model: "openai:gpt-5.6-sol", effort: "xhigh" },
  budgetUsd: 2,
  evidence: { minEntries: 4, distribution: { implementation: 2, tests: 1, docs: 1, examples: 1 } },
  synthesisInstructions: "Return one self contained Markdown RFC and preserve every citation.",
});
const engine = createEngine({
  adapters: [openai()],
  defaults: {
    routing: {
      loop: { model: "openai:gpt-5.6-sol", effort: "xhigh" },
      orchestrate: { model: "openai:gpt-5.6-sol", effort: "xhigh" },
      synthesize: { model: "openai:gpt-5.6-sol", effort: "xhigh" },
    },
    profiles: fanOut.profiles,
  },
});
const handle = orchestrate(engine, fanOut.goal, fanOut.options, { budgetUsd: 12 });
```

The test drives the experiment in miniature on `FakeAdapter`: a temporary repository with the frozen question at its root and one source file per category, four specialists told apart by `agentType` (the goal names every role, so a prompt regex would misroute), each reading the goal first (the question is its opening), then the question file through `read_file`, then recording one verified citation per category in one batch, then reporting; the coordinator spawns the four in one `parallel_agents` call with a declared budget each, awaits them, and finishes with a draft; the synthesis invocation (its label is the exported `FINAL_COMPOSITION_LABEL`) composes the RFC. It asserts the option shape above field by field (the preset's limits with `minHeadroomUsd: 0.1` on a one dollar specialist, `estCost: 1`, the contract with its spread, the acceptance with `onUnreachable: 'degrade'`, `maxSpawns: 5`), and then the completion observed: `completion: 'complete'` with `childStatusCounts` of four `ok`, the settled value equal to the synthesis and never the draft (with `semanticPasses.synthesis.ran` true and every specialist's report inside the synthesis prompt), every roster row of the journaled `orchestrator_acceptance` decision `met` with `byCategory` reading one recorded of one required in all four categories, `childLimitProfile` naming what bound the children (nothing: no cap hit, no window entered, no starvation), and four host side evidence pools of four entries spanning the four categories. A second test holds the guard: the question under an ignored `experiments` directory refuses at assembly, and a missing file fails there with `ENOENT`. What the offline test cannot show is the extension and the window firing, because no fake specialist nears its cap; those limits are asserted as data, and a live rerun of the experiment on this assembly is a separate, paid validation that this page does not claim.

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
  // Arguments are not journaled: the host supplies the SAME args. The
  // engine records the binding (RunMeta.argsHash) and does not enforce
  // it; a host that wants the refusal compares hashRunArgs(args) with
  // the recorded hash first, exactly what the CLI does.
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
  boundedBudgetOptions({ orchestratorCapUsd: 2, finalizeReserveUsd: 0.1 }),
  { budgetUsd: 2 }, // the root ceiling over the WHOLE tree, frozen into RunMeta
);
```

The corpus test prices the fake calls (`capsOverrides.pricing` on `FakeAdapter`), and its two spawns declare the SAME child ceiling. The journal shows exactly `['admit', 'reject']`: the ask that fit the fresh ceiling at genesis is refused after the first child's real spend, because the remainder the second admission read had genuinely been paid out, and the refusal reached the model as a typed tool error, never a crash. The final cost lands above a dollar and under the ceiling, so the bound the test asserts is over money that actually moved.

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

Three boundaries, and one honest limit. Hardened executor: `hardenedToolExecutor()` wraps `subprocessExecutor` so a tool declaring `executor: 'subprocess'` runs OUT of process with a REPLACED environment, and the test proves a hostile tool cannot read a host secret from `process.env` while the per-call scoped token it mints IS injected (the [isolated executor guide](/guide/isolated-executor) covers the full contract and the container adapter that also drops the network and mounts the filesystem read-only). Out of process: `mcp({ transport: 'stdio' })` serves tools from a child process; the test proves the tool ran under a **different pid** and that `source.close()` releases the child (the host owns the source lifecycle exactly like a connection pool). Filesystem: a worktree isolated profile gives a child agent its own checkout, and its writes come back as a `patch` artifact for the caller to apply or discard. The honest limit, stated as loudly here as in [Tools](/guide/tools): in-process tools are ordinary function calls with full host capabilities, an execution convenience, never a sandbox for hostile or model generated code. See [`cookbook-isolated-tools.ts`](https://github.com/o-stepper/rulvar/blob/main/examples/src/cookbook-isolated-tools.ts).

## Next steps

- [Orchestration modes](/guide/orchestration-modes) for the contracts the first three recipes compose: acceptance, finish validation, and the evidence tools.
- [Budgets](/guide/budgets) for the full ceiling and admission model behind the bounded-budget recipe.
- [Durability](/guide/durability) for the journal semantics the resume recipe verifies.
- [Example patterns](/guide/examples) for the quality patterns (adversarial panel, judge panel, loop until dry, completeness critic) that compose with everything here.
