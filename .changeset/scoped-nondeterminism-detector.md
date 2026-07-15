---
'@rulvar/core': minor
---

Scope the dev-mode bare-nondeterminism detector to the workflow's async context.

The `RULVAR_BARE_DATE_NOW` / `RULVAR_BARE_MATH_RANDOM` detector patched `Date.now` and `Math.random` per execute inside a process-global window and restored them on exit. Anything on the event loop during that window (host code, telemetry, code entirely unrelated to the run) could trigger a false warning, and two overlapping runs could race the patch/restore pair, leaving a stale patched global installed forever that then warned outside any run. The published Quickstart reproduced a false `RULVAR_BARE_DATE_NOW` this way.

The globals are now patched once per process (dev mode only, never restored) and attribution rides an `AsyncLocalStorage` store entered around the workflow body: only code inside a run's own async context can warn, at most once per run per global. Host code running concurrently with a run, engine internals awaiting the result, and other runs are structurally silent; the `node_modules` exemption for provider SDKs and installed dependencies stays as the secondary check. Direct `Date.now()` / `Math.random()` inside workflow code still warns exactly as before.
