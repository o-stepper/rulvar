---
'@rulvar/core': minor
'@rulvar/anthropic': minor
'@rulvar/evals': minor
---

Pre-wire continuation reservation, the self-describing fault kit, and the run-id surface (RV1013 + RV1014, PR VII closing the fourteenth plan)

- Pre-wire continuation admission (RV1013, opt-in). Post-hoc settlement is accounting, not admission: a hard provider RPM cap needs each `pause_turn` continuation reserved BEFORE its egress. With `quota: { reserveContinuations: true }` the engine admits every provider-side continuation through the new adapter-side `StreamHooks` seam (`ProviderAdapter.stream` gains an optional third parameter; the Anthropic adapter honors it): under a 2-request window the third wire of one absorbed dispatch never leaves and the denial rides the provider-429 machinery verbatim, the main settlement stops re-adding individually admitted segments (the window is never double-counted), and a granted admission whose wire never left is RELEASED back to the window through the new optional `QuotaLimiter.release(reservationId)` (implemented by `memoryQuotaLimiter`; a release returns exactly what admission consumed, and unknown or expired ids are no-ops). Adapters unaware of the hook keep the documented post-hoc semantics byte for byte, and the default stays post-hoc. The midstream-versus-finish usage confirmation now fires only when a finish CLAIM exists: an error-terminal absorption (a segment denial, a transport cut) no longer manufactures an invariant violation that shadows the real wire error.
- The self-describing kit (RV1014). `runFaultInjection` refuses an empty `only` selection typed (a gate that runs zero scenarios used to report `allMatched: true`), and the report carries `requested` and `selected` counts so the gate can never quietly shrink. The audit scenario grows the RV1007 arcs (a page-only long-context tier and a `NaN` scalar are findings, never silent passes), completing kit coverage of every real defect of the fourteenth plan on its real path.
- The run-id boundary surface (`assertSafeRunId`, `MAX_RUN_ID_LENGTH`) is now exported from `@rulvar/core`, so hosts can pre-validate ids before `engine.run`.
