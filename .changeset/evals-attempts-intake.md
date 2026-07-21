---
'@rulvar/evals': minor
---

Validate the CAS rebase `attempts` of `commitEvalMeasured` and `flipStaleOnCanaryDrift` as positive integers before the first store read (v1.35.0 review P2). Unvalidated, NaN or a nonpositive count skipped the loop entirely and surfaced the generic `unreachable` Error instead of a typed refusal, while a fraction over ran by an attempt.
