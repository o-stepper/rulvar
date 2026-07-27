---
'@rulvar/core': minor
'@rulvar/planner': minor
'@rulvar/cli': minor
'@rulvar/anthropic': patch
---

Three fail-closed fixes from the cycle 83 sweep, plus the dependency refresh.

**Engine.** A typed error thrown out of `ProviderAdapter.stream()` now keeps its own class instead of being laundered into a retryable transport fault. A `ConfigError` (a bridged model id that does not match the wrapped model, an unsupported role, a namespaced option contradicting a canonical field) used to be retried through the whole backoff ladder and then trigger transport failover, so a misconfigured primary silently served the run from a fallback model the caller never asked for while the real fault vanished behind a generic message. Typed errors that ARE retryable by class (a lost lease) keep retrying exactly as before, and an untyped throw is still a retryable transport fault.

**Planner sandbox.** The realm scrub replaced `Date.now` and `Math.random`, which left three ambient sources open: a bare `new Date()` never consults `Date.now` (V8 reads the system clock directly), `performance.now()` is a second live clock, and WebCrypto (`crypto.randomUUID()`, `crypto.getRandomValues()`) is raw entropy. Those are the first idioms a machine-written script reaches for, and each silently produced a run that could not reproduce on replay. All of them now draw from the same seeded stream: zero-argument `new Date()` and `Date()` take the logical clock, `performance.now()` is that clock minus the segment base, `crypto.randomUUID()` is the journaled uuid shim, and `crypto.getRandomValues()` fills from the seed. Passing a timestamp or a date string to `Date` stays a pure conversion.

**Server.** A tracked run whose segment REJECTS instead of settling (the genesis ownership boot refusing a run another process owns, a withheld settlement whose durable write failed) was reported as `running` for the life of the process, its SSE connections never closed, and neither retention nor the settled cap could release it. `GET /runs/:id` now answers `status: "error"` with the typed wire error, connected streams close with a comment naming the failure, a late subscriber gets that comment instead of an empty stream, and the tracked run becomes eligible for retention like any other terminal run.

**Dependencies.** `@anthropic-ai/sdk` moves to `^0.115.0` (the only shipped floor its caret was blocking); in-range minors refresh across the workspace. The four majors stay held: eslint 10 and `@eslint/js` 10, `@types/node` 26 against the Node 22.12 floor, and TypeScript 7. The tsdown resolution is pinned at 0.22.3 because it generates the frozen `.d.ts` artifacts, including the published `@rulvar/compat` tarball that must repack byte identical.
