---
'@rulvar/store-sqlite': minor
---

Validate `SqliteStoreOptions.ttlMs` as an integer between 1 and 2147483647 ms BEFORE the database opens, and expose the configured value as the readonly `leaseTtlMs` capability (v1.35.0 review P2). Unvalidated, zero or a negative made every lease born expired so a second owner could take over immediately, NaN failed the first acquire with a raw sqlite error, and Infinity never expired.
