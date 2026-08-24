---
'@rulvar/effects': minor
'@rulvar/core': minor
'@rulvar/store-conformance': minor
'@rulvar/store-sqlite': minor
'@rulvar/store-postgres': minor
---

The reconciler, the trust envelope, and the whole kill point kit (RV4505, plan 45, rfcs/effects.md sections 3.1, 7, 8, 9). The sweep makes "every intent deterministically reaches confirmed, compensated, or quarantined" true: crossing `reconcileBy` quarantines whatever state with the state recorded, receipt waits and attempt budgets quarantine on exhaustion, lookups are bounded SEPARATELY through journaled `effect_probe` rows (countable from the journal alone, crash-proof), pre-terminal conflicting receipts quarantine, and effect authorizations past their deadline refuse durably instead of waiting forever. Receipt verification runs a declared trust envelope: issuer identity, per-class content bindings, key validity windows, revocation from its time forward, and the host's signature check; every failure classifies unverified, which routes to unknown. The post-restore reconciliation (kill 25) quarantines provider effects the journal cannot reconstruct by name (or the whole range without authoritative enumeration), and a restoration epoch stays undispatchable until the new `effect_reconciliation_complete` decision cites it. Section 9 telemetry folds effective dispositions (the compensated overlay included), pressure, duplicate classification, and open incidents. The kit exports all thirty `effects.kill.*` rows as named conformance checks parameterized by a store factory (ambiguous acks and restoration generations injected through delegating proxies, so any store qualifies), registered over the in-memory reference store in single-process posture and over the REAL sqlite and postgres stores in their own packages.
