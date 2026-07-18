---
'@rulvar/core': patch
'@rulvar/store-sqlite': patch
---

Internal real-time reads bind the wall clock at module load, never the live global, eliminating false `RULVAR_BARE_DATE_NOW` warnings for consumers whose rulvar frames live outside `node_modules` (workspace dists, monorepo checkouts). Two composing defects: `createEngine` captured `Date.now` per call, so an engine created after a previous run had installed the dev-mode patch bound the PATCHED wrapper as its real clock (its `EventBus` then warned from the engine's own frames), and the ULID factory read the live global at every mint, so ids minted mid-run (the orchestrator extension IO, PlanRunner revisions, adapter id maps) routed through the patch too. The engine now uses a module-load `realNow` binding (module load always precedes the first patch install), the vendored ULID factory defaults to its own module-load clock, and `@rulvar/store-sqlite` follows the same convention. The dev-mode guard itself is untouched and stays exactly as sharp for workflow code, which keeps reading the live global.
