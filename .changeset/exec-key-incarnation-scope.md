---
'@rulvar/core': minor
'@rulvar/store-conformance': minor
---

Scope the isolated-executor idempotency key to the run incarnation (RV403, the eighth-experiment review). A fresh run stamps the additive optional `RunMeta.execKeyDerivation` field (version 2) at genesis and every resume segment carries it verbatim; version 2 keys bind the run's generation token, so a `deleteRun`-then-recreate of the same explicit runId never reuses the deleted incarnation's keys against a long-lived external dedup store, while a crash-and-resume redispatch inside one incarnation keeps its key exactly as before. Runs recorded without the stamp derive the original genesis-free version 1 keys for their whole life, across resume and upgrade, so external dedup state accumulated for them stays valid; a recorded derivation the engine does not know, or a version 2 stamp whose store dropped the genesis token, is a typed resume refusal when executors are configured, never a silent fallback. The store conformance kit now checks the field's round trip alongside `genesis`.
