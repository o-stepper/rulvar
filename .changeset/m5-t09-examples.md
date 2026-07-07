---
'@lurker/core': patch
---

M5-T09 examples corpus. A new (unpublished) `examples/` vitest project
ships runnable reference implementations of the documented quality
patterns as recipes over the public `ctx` API, never engine flags:
adversarial panel (N independent skeptics prompted to refute; majority
survives), judge panel (N angled attempts each scored; top wins),
loop-until-dry (keep finding until K consecutive empty rounds), and
completeness critic (draft, then gap-driven revision passes). Each
example is a real `defineWorkflow` and doubles as an integration test
under FakeAdapter with zero live calls, so an example that stops
compiling fails CI like any test. The corpus is registered in the
pnpm workspace and the single Vitest project set; the umbrella marker
package is unchanged (patch to carry the changeset).
