# rulvar examples

Runnable reference implementations of the documented quality patterns
(docs/00, section "Orchestration modes"; docs/11, section "Examples
corpus"). Each file is a real `defineWorkflow`, not a snippet, and each
doubles as an integration test that runs under FakeAdapter with zero
live calls (`src/index.test.ts`). These patterns are RECIPES over the
public `ctx` API, never engine flags: the library ships no "adversarial",
"judge", "loop", or "critic" mode.

| Pattern             | File                         | Shape                                                                                        |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Adversarial panel   | `src/adversarial-panel.ts`   | N independent skeptics prompted to refute; majority-survives over `ctx.parallel`             |
| Judge panel         | `src/judge-panel.ts`         | N attempts from different angles, each scored; the top wins                                  |
| Loop-until-dry      | `src/loop-until-dry.ts`      | keep finding until K consecutive empty rounds; a dry-streak counter, not `while (count < N)` |
| Completeness critic | `src/completeness-critic.ts` | draft, then "what is missing?" drives revision passes; one `ctx.phase` per stage             |

When an example and the (future) planner API card disagree, the example
is the source of truth (docs/11, section "Examples corpus").

Not published: this package is `private` and exists only as the teaching
and integration-test corpus.
