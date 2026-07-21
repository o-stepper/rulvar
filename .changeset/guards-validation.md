---
'@rulvar/plan': minor
---

Validate `RevisionGuards` limits at construction (v1.34.0 review P2-3). The streak and oscillation limits must be positive integers, the stall replan cap a nonnegative integer, and `maxAbandonedNetUsdFraction` a fraction in (0, 1]; anything else, NaN included, is a typed `ConfigError` before any revision is judged. Unvalidated, a NaN limit inverted the machinery: the dropped and oscillation guards tripped immediately while the stall cap never tripped at all.
