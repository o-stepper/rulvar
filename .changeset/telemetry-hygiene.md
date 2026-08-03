---
'@rulvar/core': minor
---

Reject invisible format characters in dossier text and split the retry namespaces on the result surface (RV1509, RV1510). The fifth PR of the eighteenth plan.

The format-character lint (RV1509). The seventeenth comparison run's answer carried five U+200B characters immediately before hidden-file citations, and every configured check passed: the citation pattern's boundary class simply excluded the invisible byte from the match, so the extracted citations were clean while the LITERAL text was not byte-identical to any repository path. `formatCharacterValidator` rejects the whole Unicode format category (`Cf`) with each distinct character's codepoint, first index, occurrence count, and a visible-context excerpt, so the repair turn can find the exact bytes; `allow` admits named characters for content that legitimately needs them (bidi marks in RTL prose), each entry itself required to be a single `Cf` character.

The retry namespaces (RV1510). The same benchmark exported one conflated "retries" number, and 17 pre-wire quota denials read as 17 provider retries. The agent result (and `agent:end`) now carries `quotaDenials` beside `transportRetries`: pre-wire limiter denials split by dimension (`requests` versus `tokens`, classified by the limiter's own reason vocabulary) with the recovered-episode count. A denial never reached the provider and never billed; provider retry attempts stay in `transportRetries`, and the journaled `providerCalls` records keep the wire cardinality the invoice sums. Live telemetry only, the `transportRetries` rule exactly: never journaled, absent on a replayed result, absent means "zero or unknown".
