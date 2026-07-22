---
'@rulvar/store-sqlite': patch
---

Commit the fence check and the mutation it guards as one immediate transaction. The store checked the lease row in one autocommit statement and mutated in the next, so a takeover landing between them (reachable across two processes) let a superseded holder append a visible journal entry despite the moved epoch, extend the successor's lease with its own ttl, or delete the successor's live lease outright. All three were demonstrated against the published 1.44.0. The check and the insert, extension, or deletion now share one `BEGIN IMMEDIATE` transaction (the shape `acquire` always had), and the renew and release mutations additionally pin `owner` and `epoch` in their `WHERE` clauses as defense in depth. The cross-instance tests shim the interleave and prove a takeover can no longer land mid-call. The fenced run state RFC on the docs site records the full audit this fix came out of.
