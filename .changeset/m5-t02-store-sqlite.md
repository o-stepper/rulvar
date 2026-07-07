---
'@lurker/store-sqlite': minor
---

M5-T02 SqliteStore: the first real surface of @lurker/store-sqlite.
`SqliteStore` implements JournalStore AND LeasableStore with fencing
epochs over the builtin node:sqlite driver (zero native dependencies;
requires a Node.js line with node:sqlite unflagged, 22.13+/23.4+). It
passes the full @lurker/store-conformance suites: A1-A4 store
obligations, meta separation, the golden fold fixture, the decide-once
oracle, the abandon-derived skip, lease exclusivity (typed
LeaseHeldError), monotonic fencing epochs with stale-append rejection
and invisibility, release fencing, and wall-clock ttl expiry with the
renew-at-ttl/3 cadence. The lease ttl defaults to the Appendix A interim
reference for this store (60000 ms; the committed value is an M8
decision), and an injectable clock supports expiry tests. This is the
reference implementation for community stores (docs/03, section 12.6).
