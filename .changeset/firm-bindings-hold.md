---
'@rulvar/core': minor
---

`ResumeOptions.bodyHash: 'warn' | 'refuse'` (RV3001): the opt-in pin for hosts that treat an edited workflow body as a different workflow. Under the default `'warn'` an in-process body-hash mismatch keeps the historical design byte for byte: the loud `RULVAR_RESUME_HASH_MISMATCH` warning fires and the resume proceeds, because the journal decides replay versus live per content keys and reports orphans honestly. Under `'refuse'` the same mismatch is a typed `ConfigError` raised before ownership, meta writes, or any append, so a refused resume mutates nothing durable. Name mismatches and compiled-source mismatches remain hard errors under either value, and any other value refuses typed before any store read.
