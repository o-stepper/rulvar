---
'@rulvar/cli': minor
---

Validate `createWorker` timers and make the TTL match promise executable (v1.35.0 review P2). `ttlMs` and `pollMs` must be integers between 1 and 2147483647 ms, refused typed at construction (an overflow or non finite cadence collapsed to the 1 ms interval floor and stormed the store). A store exposing the optional `leaseTtlMs` capability is verified against the worker ttl, a mismatch is a `ConfigError`, and an omitted `ttlMs` adopts the store's value.
