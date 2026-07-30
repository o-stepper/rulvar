---
'@rulvar/core': minor
'@rulvar/store-conformance': minor
---

Duplicate quota rules are refused at construction in every reference limiter (RV704). `snapshotQuotaRules`, the shared construction chokepoint of `memoryQuotaLimiter`, `SqliteQuotaLimiter`, and `PostgresQuotaLimiter`, now throws a typed `ConfigError` naming both indexes and the canonical `quotaRuleKey` when a rule set contains two identical rules. Before the refusal, the same duplicated configuration admitted differently per storage: the memory reference buckets by rule index, so each copy counted independently and the full cap admitted, while the store references bucket by rule key, so one shared bucket was debited once per matching copy and half the cap admitted (a cap-4 set granted 4 in memory and 2 on sqlite), breaking storage parity with a configuration nothing had refused. `@rulvar/store-conformance` gains `quotaRulesConformance`, the executable construction contract any limiter implementation can register.
