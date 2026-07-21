---
'@rulvar/core': minor
---

Validate the persisted `KnowledgeSnapshot` on every `FileModelKnowledgeStore` read (v1.36.0 review P2-6). The old read checked only that `version` was a number, `hash` a string, and `claims` an array, so a hand edited or torn `rulvar.models.json` could forge a negative or fractional `version` and a mismatched `hash`, and a `null` or partial claim flowed on to crash the card render with an untyped `TypeError`. The read now requires a nonnegative integer `version`, a lowercase sha256 `hash` that MATCHES `knowledgeHash(claims)`, and structurally sound claims (a persisted snapshot may hold non active statuses), refusing any inconsistency as a typed `ConfigError` that names the offending path. `commit` reads first, so it refuses to append onto a corrupt base.
