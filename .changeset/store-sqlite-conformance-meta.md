---
'@rulvar/store-sqlite': minor
'@rulvar/store-conformance': minor
'@rulvar/planner': patch
---

`SqliteStore` implements the exact lookup capability (`getMeta` as a primary key query) and narrows `status`, `statuses`, and `name` in SQL over the JSON payload behind new expression indexes (created idempotently, so existing database files gain them on the next open), so a selective `listRuns` reads only the matching rows instead of decoding the whole catalog; the tags containment check stays in JS over the reduced set with unchanged semantics. The conformance kit checks the `genesis` round trip, that a `statuses` filter never drops a matching meta (supersets stay allowed), and that a store exposing `getMeta` agrees with `listRuns` and resolves `undefined` for a missing run. The planner's deterministic plan lookup reads one meta through the capability instead of scanning the catalog.
