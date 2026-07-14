# Rulvar examples

Runnable reference implementations of the four documented quality
patterns; the rendered walk-through is
[docs.rulvar.com/guide/examples](https://docs.rulvar.com/guide/examples).
Each file is a real `defineWorkflow`, not a snippet, and each doubles as
an integration test that runs through the full engine on `FakeAdapter`
with zero live calls (`src/index.test.ts`). These patterns are RECIPES
over the public `ctx` API, never engine flags: the library ships no
"adversarial", "judge", "loop", or "critic" mode (see
[Orchestration modes](https://docs.rulvar.com/guide/orchestration-modes)).

| Pattern             | File                         | Shape                                                                                        |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Adversarial panel   | `src/adversarial-panel.ts`   | N independent skeptics prompted to refute; majority-survives over `ctx.parallel`             |
| Judge panel         | `src/judge-panel.ts`         | N attempts from different angles, each scored; the top wins                                  |
| Loop-until-dry      | `src/loop-until-dry.ts`      | keep finding until K consecutive empty rounds; a dry-streak counter, not `while (count < N)` |
| Completeness critic | `src/completeness-critic.ts` | draft, then "what is missing?" drives revision passes; one `ctx.phase` per stage             |

Alongside the patterns, `src/journals.test.ts` replays every dogfood
journal under `../journals/` replay-strict against its shipped workflow,
with zero live calls. The journals are frozen fixtures locked by
`../fixtures.sha256`; re-record them deliberately with
`RECORD_DOGFOOD=1 pnpm vitest run examples/src/journals.test.ts`, then
refresh the lock with `node scripts/check-frozen-fixtures.mjs --update`.

Run everything from a repository clone:

```bash
pnpm install
pnpm build
pnpm vitest run examples/src
```

To use a pattern in your own project, copy the workflow file and install
the runtime and `zod`: `pnpm add @rulvar/core zod` (or the umbrella,
`pnpm add @rulvar/rulvar zod`).

Not published: this package is `private` and exists only as the teaching
and integration-test corpus.
