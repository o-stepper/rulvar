---
'@rulvar/core': minor
---

The cost report gains the byScope rollup (RV3805). The children versus whole workflow cut used to require hand-aggregating invoice rows (the third comparison analysis did exactly that to say the children cost $2.75 of the $5.58 run); `CostReport.byScope` now carries one addressable row per journal scope under the same net inclusion policy as `totalUsd`, so the rows sum to it, on both builders through one rule (`scopeBucket`): the root's OWN scope is the empty string by construction, present data rather than an absence, so it folds under the named `root` bucket; children keep their scope strings verbatim; and `unknown` stays reserved for a scope that is truly missing, the RV3604 fallback. Live accumulation and the pure journal fold agree by construction, abandoned subtrees contribute zero exactly like the net total, and one mutation probe holds the parity.
