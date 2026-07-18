/**
 * The engine's own wall clock, captured at MODULE LOAD, which always
 * precedes the dev-mode bare-Date.now patch: the patch installs inside
 * InProcessRunner.execute, and nothing can execute before this module
 * graph has loaded. Engine internals that need real time use this
 * binding instead of reading the global later: a later read (a second
 * engine created after a run, a ULID minted mid-run) captures the
 * PATCHED wrapper, and inside a run's async context with frames outside
 * node_modules (workspace dists, monorepo consumers, this repo's own
 * tests) that produced false RULVAR_BARE_DATE_NOW warnings from the
 * engine's own code (v1.18.0 review P2-6). The dev-mode guard stays
 * exactly as sharp for workflow code, which keeps calling the global.
 */
export const realNow: () => number = Date.now.bind(globalThis);
