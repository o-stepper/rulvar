---
'@rulvar/core': minor
'@rulvar/evals': minor
'@rulvar/store-conformance': minor
---

`RunOptions.budgetPolicy: 'segment' | 'immutable-lifetime'` (RV3902, the fourth comparison experiment): the regulated posture the docs used to promise by accident is now a real, opt-in invariant. Default `'segment'` is today's behavior byte for byte. Under `'immutable-lifetime'` the posture is recorded in `RunMeta` at genesis (only the non-default is written; the store conformance kit holds stores to the round-trip) and restored on every resume, and a resume carrying ANY applying `ResumeOptions.run` override refuses with a typed `ConfigError` before ownership, meta writes, or any append, raising and lowering alike; the empty `run: {}` object stays the documented no-op, a bare resume stays a pure replay, and a store that drops the field degrades to `'segment'` (the door works again), never to an invented refusal. The fault kit gains the `budget-policy-immutable` scenario (typed refusal, zero wires, zero durable mutations, bare replay intact); two mutation probes pin the refusal gate and the genesis recording. The source TSDoc sweep retires the last `immutable after start` comments (engine, budget, termination, orchestrate, plan), and the docs doctrine pins now scan `docs/api` too.
