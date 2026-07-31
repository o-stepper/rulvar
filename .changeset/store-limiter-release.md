---
'@rulvar/store-sqlite': minor
'@rulvar/store-postgres': minor
---

Both store limiters implement the optional `QuotaLimiter.release` (RV1103 + RV1104, the SPI method from RV1013): a cancelled admission returns exactly what it consumed, the admitted requests and the token estimate, to the window, from any process sharing the file (`SqliteQuotaLimiter`) or any host sharing the schema (`PostgresQuotaLimiter`, under the same advisory lock and generation fence as every admission). Unknown, expired, and repeated ids are no-ops; a rolled-over window already aged the estimate out; a released id settles nothing afterwards; verdicts mirror `memoryQuotaLimiter` exactly. Both reservation tables grew a `requests` column, migrated in place on boot (sqlite: a serialized `ALTER` under `BEGIN IMMEDIATE`; postgres: `ADD COLUMN IF NOT EXISTS` under the boot lock) defaulting to 1, the single request every engine admission reserves, so pre-release reservations release exactly what their admission consumed.
