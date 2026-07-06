---
'@lurker/core': minor
---

M1-T04/T05: journal write path and model router core. JournalEntry form
with the kinds registry v2 and hashVersion (written as 2 from day one),
IdentityInput records per spawn kind with content-key derivation (sha256
over RFC 8785 JCS; reproduces the docs/03 worked example byte-identically),
the scope-path grammar, ordinal assignment, the per-run serialized append
queue with the JSON-serializability check, the budget-ledger fold,
JournalStore/LeasableStore/TranscriptStore SPI types, InMemoryStore (loud
one-time resume-disabled warning) and InMemoryTranscriptStore; the
per-engine adapter registry (duplicate adapterId is a ConfigError), strict
ModelRef parsing, the per-invocation resolution chain with role effort
defaults, CanonicalModelSpec canonicalization, visible caps scrubbing
(effort and sampling parameters), and structured-output tier selection
with the strict-compatibility predicate.
