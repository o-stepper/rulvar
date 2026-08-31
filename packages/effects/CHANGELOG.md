# @rulvar/effects

## 1.252.0

### Patch Changes

- Updated dependencies [3ccb6cf]
- Updated dependencies [52d807f]
- Updated dependencies [517ed00]
- Updated dependencies [a7e589d]
- Updated dependencies [76e95eb]
  - @rulvar/core@1.252.0
  - @rulvar/store-conformance@1.252.0

## 1.251.0

### Patch Changes

- Updated dependencies [e7e829c]
- Updated dependencies [5982be8]
- Updated dependencies [7c58fb2]
- Updated dependencies [b3e465a]
- Updated dependencies [c4e5d6a]
- Updated dependencies [c6fc3da]
- Updated dependencies [c6fc3da]
- Updated dependencies [0ae8b85]
- Updated dependencies [7932936]
- Updated dependencies [7932936]
- Updated dependencies [88da0ed]
- Updated dependencies [06c0e85]
  - @rulvar/core@1.251.0
  - @rulvar/store-conformance@1.251.0

## 1.250.0

### Minor Changes

- 565c13b: The @rulvar/effects package is born (RV4504, plan 45, rfcs/effects.md sections 4.4, 6, 8, 11): the effect adapter seam that cannot send without an attempt record (dispatch receives the seq of the attempt appended BEFORE the call), the provider capability matrix types, and the crash-window dispatcher whose recovery is licensed exclusively by provider-side fencing: the idempotency-key row re-dispatches under the same key and lets the provider dedupe, the conditional-create row leans on the unique natural key, the acceptance-closing row closes the ambiguous ATTEMPT identity (so the fresh attempt stays legal while the stale one is refused at the provider), and the 'neither' row quarantines every ambiguous window with the possible late stale send named in the record. From a revocation or expiry position recovery is reconcile-only on every row: a found receipt confirms (a revocation then opens the compensation decision path as a linked incident; an expiry opens none, because it bounds the grant, not the past), a closed negative cancels with the proof on the record, and anything unresolvable quarantines. Provider fakes enforce exactly the fencing their row claims, including the deliberately stalled predecessor of kill point 17, where elapsed time licenses nothing. In core, the `cancelled-before-dispatch` legality widens per RFC section 4.7 row 2 (every attempt provably failed also proves no effect) and the writer gains `refresh()`. Kill points 4, 5, 6, 7, 8, 14, 15, 17, 27, 28, 29 are pinned by tests.
- c6d197b: The reconciler, the trust envelope, and the whole kill point kit (RV4505, plan 45, rfcs/effects.md sections 3.1, 7, 8, 9). The sweep makes "every intent deterministically reaches confirmed, compensated, or quarantined" true: crossing `reconcileBy` quarantines whatever state with the state recorded, receipt waits and attempt budgets quarantine on exhaustion, lookups are bounded SEPARATELY through journaled `effect_probe` rows (countable from the journal alone, crash-proof), pre-terminal conflicting receipts quarantine, and effect authorizations past their deadline refuse durably instead of waiting forever. Receipt verification runs a declared trust envelope: issuer identity, per-class content bindings, key validity windows, revocation from its time forward, and the host's signature check; every failure classifies unverified, which routes to unknown. The post-restore reconciliation (kill 25) quarantines provider effects the journal cannot reconstruct by name (or the whole range without authoritative enumeration), and a restoration epoch stays undispatchable until the new `effect_reconciliation_complete` decision cites it. Section 9 telemetry folds effective dispositions (the compensated overlay included), pressure, duplicate classification, and open incidents. The kit exports all thirty `effects.kill.*` rows as named conformance checks parameterized by a store factory (ambiguous acks and restoration generations injected through delegating proxies, so any store qualifies), registered over the in-memory reference store in single-process posture and over the REAL sqlite and postgres stores in their own packages.

### Patch Changes

- Updated dependencies [0e240b9]
- Updated dependencies [6fe585e]
- Updated dependencies [c5eb19c]
- Updated dependencies [565c13b]
- Updated dependencies [c6d197b]
- Updated dependencies [c9d9729]
- Updated dependencies [fed9db6]
- Updated dependencies [df9ed76]
- Updated dependencies [3020912]
- Updated dependencies [d8d598d]
  - @rulvar/core@1.250.0
  - @rulvar/store-conformance@1.250.0
