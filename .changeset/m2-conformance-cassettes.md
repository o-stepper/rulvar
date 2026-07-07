---
'@lurker/core': minor
'@lurker/testing': minor
'@lurker/store-conformance': minor
---

M2-T11/T12: the executable store conformance kit and the M2 gating
cassettes with frozen fixtures.

@lurker/store-conformance ships its first real API: journalStoreConformance
(A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4
opaque payload with read-side-only normalization, meta separation, the
golden fold-state fixture with a frozen reference hash, the decide-once
oracle, and the abandon-derived-skip fixture) and leasableStoreConformance
(typed LeaseHeldError on held acquire, monotonic fencing epochs,
stale-epoch appends rejected and invisible, released leases fenced from
renew and append, optional ttl/renew-cadence timing checks), plus
registerConformance for Vitest/Jest and the stableStringify fold-state
hasher. InMemoryStore and JsonlFileStore pass; deliberately broken stores
(reordering, normalizing, tearing, fencing-less) fail loudly.

@lurker/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
abandon-covered hanging dispatch derives skipped instead of redispatching,
abandon-covered operations contribute a zero ledger increment, the resume
report lists covered entries as skipped (never orphaned), and an abandon
over an already-resolved suspension folds to a noop with already_resolved
(first-closing-wins per target, both closer kinds).

@lurker/testing ships the M2 cassette suite over committed frozen
fixtures: the DEF-1 synthetic subset (abandon-subtree, memoize-classifier,
v1-journal-on-v2), the DEF-4 set (timeout-vs-live-race,
class-decision-fanout, abandon-then-crash-then-resume,
abandon-vs-resolution-race, offline-invalid-then-valid,
double-abandon-idempotent), the DEF-6 six IDs (resume-v1-on-engine-v2,
resume-v1-with-inserted-call, suspended-v1-resolves-on-v2,
reject-version-too-old via deriverV0Synthetic, reject-version-from-future,
effort-defaults-shift), the mandatory mixed-version scenarios
(ordinal-space split, forward-cursor preference, cross-version
resolution, the compatibility and never-pay-twice-through-upgrade
lemmas), and KeyDeriver contract tests against the frozen v2 golden
identities including the docs/03 worked example. Fixture regeneration is
deliberate: scripts/record-m2-cassettes.mjs rebuilds, and CI write
protection (scripts/check-frozen-fixtures.mjs plus fixtures.sha256)
fails any fixture diff shipped without the explicit bump token (the
hyphenated compound of hashVersion and bump) in a changeset.
