---
'@rulvar/core': patch
'@rulvar/cli': patch
'@rulvar/openai': patch
'@rulvar/plan': patch
'@rulvar/store-conformance': patch
'@rulvar/testing': patch
---

Guarantee matrix and exactly-once claim hygiene (RV508); no runtime behavior changes. The isolated-executor guide now carries the guarantee matrix stating flatly who provides what: the library's layers give at-least-once execution with attempt binding and intent-before-effect, exactly-once effect execution is promised by NO library layer, and what IS exactly-once is pay and replay (the never-pay-twice invariant). The two claims the ninth comparison experiment's judge caught are rewritten to the precise statements ("each ran once" became attempt counting under a stable idempotency key; the approvals guide now says continuation is a run-level guarantee, not an effect-level one, with the at-least-once window named); `ctx.step` docs state the same window for effectful steps; a `ResolutionBy` note says the field records a channel, never a verified principal (identity, signatures, and separation of duties are host IAM). The worker header now points at the shipped `SqliteQuotaLimiter` and `PostgresQuotaLimiter` instead of denying that cross-process limiters exist. A new docs-lint sentinel forbids "exactly once" claims in the hand-written docs and in package source comments outside a vetted (file, heading anchor) allowlist (the durability pay doctrine and the guarantee matrix), and every remaining occurrence in doc prose and source comments was rewritten to the precise wording; string literals are deliberately out of scope (tool descriptions enter the toolset hash).
