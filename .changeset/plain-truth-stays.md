---
'@rulvar/core': patch
---

Three truths the ninth comparison audit caught, fixed with a tombstone (RV2905). Two guide pages still claimed "the current release enforces only the in-process tool executor" (one adding that subprocess and container "fail at registration") after that class was fixed on the architecture page: both now state the seam, a non-inprocess executor tag is a typed ConfigError at spawn time until a matching ToolExecutorProvider is registered under `EngineOptions.executors`, and `@rulvar/executor` ships both references. The roles.ts header now says its firing predicates cover six OF THE SEVEN invocation roles ('synthesize' is dispatched explicitly by the orchestrator, never by the trigger protocol). And because the executor claim already returned once after being fixed, the docs lint gains a tombstone sentinel forbidding it everywhere the lint reads, docs prose and source comments alike.
