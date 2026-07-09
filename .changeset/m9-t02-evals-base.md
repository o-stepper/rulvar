---
'@lurker/evals': minor
---

M9-T02: the @lurker/evals base (docs/09 section 7; docs/11 "Eval CI"; FR-5xx). First real public surface of @lurker/evals, built strictly on the public APIs (L6).

- `EvalCase = { workflow, args, graders[] }` exactly as documented, with `runEvalCase` and `runEvalSuite` runners: the target workflow runs as its own journaled run; latency is derived from run:start and run:end event timestamps (no separate measurement channel); duplicate workflow names disambiguate by ordinal.
- Three grader families: `goldenGrader` (deep JSON equality with diff evidence), `rubricGrader` (named pure criteria, per-criterion verdicts, fraction score against a pass threshold), and `judgeGrader` (an LLM verdict against a schema). The judge runs THROUGH the engine via `GraderContext.judge` as an ordinary journaled, budgeted invocation, so judge calls are VCR-recordable and eval CI replays them deterministically with zero live calls. @lurker/evals ships NO default judge model: weak judge defaults are forbidden by the router quality floors, so `model` is required. Judge invocations are skipped deterministically when the target run did not settle ok.
- `runEvalMatrix` compares configuration cells (profile vs profile, cheap workers vs premium, reviewer on or off): each cell supplies its own engine and the report carries pass-rate, cost, and latency per cell from the existing usage and cost fields. No failure clustering, no vector dependency (EXC registry).
- Acceptance held in-suite: a suite recorded through the VCR adapters replays byte-deterministically (latency excluded as the one wall-clock measurement) from the cassette under onMiss 'throw', and the cassette carries its hashVersion header (DEF-6).
