# @rulvar/effects

The effect lane runtime (rfcs/effects.md): the adapter seam that cannot
send without an open attempt record, the provider capability matrix
(`idempotency-key`, qualified `lookup`, `neither`), the crash-window
recovery that is licensed exclusively by provider-side fencing, the
reconciler, receipt verification against a declared trust envelope, and
the kill point conformance kit. Consumption semantics (the fold and the
writer) live in `@rulvar/core`; hosts that do not run effects pay
nothing for this package.

Docs: https://docs.rulvar.com/guide/effects
