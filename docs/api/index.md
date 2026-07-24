**Rulvar API reference**

***

# Rulvar API reference

## Packages

| Package | Description |
| ------ | ------ |
| [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) | Rulvar first-class provider adapter over @anthropic-ai/sdk. |
| [@rulvar/bridge-ai-sdk](/api/@rulvar/bridge-ai-sdk/index.md) | Rulvar bridge adapter wrapping any Vercel AI SDK LanguageModelV4 as a ProviderAdapter. |
| [@rulvar/cli](/api/@rulvar/cli/index.md) | Rulvar shell: run/resume/runs/inspect/plan/kb commands, TUI progress, createServer, createWorker, OTel exporter. |
| [@rulvar/compat](/api/@rulvar/compat/index.md) | rulvar frozen KeyDeriver profiles for hashVersions outside the support window (DEF-6); independently versioned. |
| [@rulvar/core](/api/@rulvar/core/index.md) | Rulvar core: L0 contracts, journal kernel, ctx primitives, agent runtime, model router, tool system, dynamic orchestrator, InMemory and JSONL stores, event stream. |
| [@rulvar/evals](/api/@rulvar/evals/index.md) | Rulvar evals: eval cases, golden outputs, rubric and judge graders, matrix sweeps, canary fingerprint. |
| [@rulvar/openai](/api/@rulvar/openai/index.md) | Rulvar first-class provider adapter for the OpenAI Responses API, plus the openaiCompatible factory. |
| [@rulvar/plan](/api/@rulvar/plan/index.md) | Rulvar adaptive orchestration extension: PlanRunner, RunLedger, escalation extensions, ModelLadder configuration. |
| [@rulvar/planner](/api/@rulvar/planner/index.md) | Rulvar flagship hybrid mode: plan agent, compileScript, WorkerSandboxRunner, self-repair loop. |
| [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) | Rulvar umbrella package: re-exports @rulvar/core, both first-class adapters, the file store, and the terminal progress renderer. Also installable through the unscoped alias package rulvar, which re-exports this one. |
| [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) | Rulvar executable store conformance kit (DEF-4). |
| [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) | Rulvar PostgreSQL store implementing JournalStore and LeasableStore with a fencing epoch, for multi-process and multi-host deployments. |
| [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) | Rulvar SQLite store implementing JournalStore and LeasableStore with a fencing epoch. |
| [@rulvar/testing](/api/@rulvar/testing/index.md) | Rulvar test harness: createTestEngine, FakeAdapter, VCR cassettes, replay-strict runs, matchers. |
| [eslint-plugin-rulvar](/api/eslint-plugin-rulvar/index.md) | Rulvar determinism lint rules with structural JSON diagnostics for the planner self-repair loop. |
