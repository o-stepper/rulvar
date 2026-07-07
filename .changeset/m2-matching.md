---
'@lurker/core': minor
---

M2-T03/T04: scoped forward-matching and the kinds/grammar freeze. The
JournalMatcher (per-scope insertion-stable cursors, first unconsumed
match wins, cache/never per-call modes, orphan reporting) integrated into
the Replayer with seeded seq/ordinal spaces and the resume ledger fold;
ctx.agent/step/now/random/uuid replay journaled results byte-identically
with zero adapter calls, dangling running entries redispatch with the
terminal referencing the original dispatch, and replayed lifecycle events
carry replayed: true. Kinds registry v2 payload validators enforce the
docs/03 shapes on engine-written entries; the scope grammar gains a
parser with round-trip guarantees. The interim disposition is round-1;
the full DEF-1 table plugs in with M2-T06.
