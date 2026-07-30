---
'@rulvar/core': minor
'@rulvar/cli': minor
'@rulvar/executor': minor
---

The pricing composition's second half names itself, and the effect-ledger quarantine is byte-true (RV706, RV707). `InvoicePricingProvenance` gains optional `currentPricingVersion`: on composed exports it is the version of the caller's current table, the one that priced everything past `pinnedThroughSeq` (on current-table exports, the whole fold), so an invoice folded across a rotation now names both halves of the composition where the pinned segments already declared theirs; `rulvar invoice` and `rulvar inspect` fill it from the configured table and extend their text suffix to `pins composed with the current table (v-a, v-b; current v-live)`, byte for byte unchanged when the config declares no version. The executor ledger's torn-tail quarantine row now carries `bytesBase64` and `sha256` of the exact torn bytes alongside the lossy `bytes` string kept for old readers (two different byte tails used to collapse into one indistinguishable row), and the repair's parseable decision is made on the bytes, strict UTF-8 before `JSON.parse`: the lossy decode could make a fragment with invalid bytes inside a string literal parse, and the repair then terminated a line of invalid bytes in place, manufacturing exactly the corruption the fail-closed scan refuses.
