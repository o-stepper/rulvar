---
'@lurker/core': minor
---

M1-T06/T07/T08/T09: agent runtime v1 (single subagent loop, structured
output in three tiers with client validation and the bounded re-prompt,
typed AgentResult with the ok/error/limit/cancelled/skipped vocabulary,
ModelRetry declaration, UsageLimits with the normative merge and defaults,
typed refusal handling, Usage-invariant verification at the adapter
boundary); ctx primitives (defineWorkflow with the errorPolicy literal
generic, ctx.agent overloads including result: 'full', ctx.parallel with
Settled and abortSiblings semantics, ctx.pipeline with up to six stages
and onItemError drop/throw/collect, ctx.step with useMemo-style deps
keying, ctx.phase cost attribution, ctx.log, ctx.budget, and the
deterministic now/random/uuid shims journaled as rand entries); the
per-run FIFO semaphore scheduler; and the three-layer budget (admission
reserves, the per-turn guard, the AbortSignal ceiling with usageApprox,
immutable B0, BudgetExhaustedError thrown uniformly by every ctx
primitive, run.dropped evidence for every silent loss).
