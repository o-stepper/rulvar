---
'@rulvar/core': minor
---

The finalization reserve (the experiment-review P1.1): `limits.finalizationReserve` guarantees the model one bounded summary turn when a tool budget expires, so a research agent that pays for its evidence no longer dies mid-batch without its final report.

Before this, a `maxToolCalls` or `toolUnits` expiry inside a tool batch dropped the batch tail silently (dangling tool calls without results in the transcript), settled `limit` before any further model turn, and named no limiter on the terminal. With the reserve configured (an object; `{}` enables it):

- The batch tail closes explicitly: every call the budget did not admit gets a typed error tool result `{ error: 'skipped: the tool budget is exhausted; the call was not executed', limiter, skipped: true }`, keeping the transcript well formed and the skipped calls visible to the model and to transcript readers.
- The model always gets ONE summary turn on the loop chain (failover, retry policy, quota, and the budget all apply; usage is attributed to the loop role) with tools withheld and a request-only instruction naming the limiter, its counts, and the skipped calls. `finalizationReserve.maxOutputTokens` bounds this turn alone.
- The `limit` terminal names the exact limiter: `error: { kind: 'terminal' }` with an errorMessage such as `tool budget exhausted: maxToolCalls (72/72); skipped tool calls: 3`.
- The summary becomes the limit result's `output` (typed when a ridden schema parses it; one attempt, no re-prompt), the terminal journals the value, and a replayed result restores the same output with zero live calls. The structured terminal partial from `report_progress` still derives beside it.

The reserve fires only for the two tool-budget limiters, never for `maxTurns`, `timeoutMs`, or the exploration aborts. A transport failure on the summary turn keeps the earned `limit` terminal with a `log` warning; host cancellation and the budget ceiling keep their own semantics. Without the field every byte stays as before, exactly like the other opt-in limits.
