---
'@rulvar/store-conformance': minor
---

New mandatory obligation A5, monotonic seq: three new checks reject stores that persist duplicate or stale seqs. `a5-monotonic-seq` (a duplicate or stale append rejects with code `journal_order_violation` and never becomes visible, while the true next seq still lands), `a5-stale-tail-race` (two writers appending the same next seq: exactly one persists, the loser observes the typed conflict, reload shows a strictly increasing order), and `a5-stale-replayer-fencing` (the same race driven through two kernel Replayers from one loaded tail). The `CommunityMemoryStore` walkthrough listing gains the guard in step with `docs/guide/store-authors.md`. Third-party stores that pass the previous kit but accept duplicate seqs will fail the new checks until they add the guard; the obligation is documented in `guide/stores` and `guide/store-authors`.
