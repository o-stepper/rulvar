---
'@rulvar/anthropic': minor
'@rulvar/core': minor
---

The absorbed pause_turn wire set survives the error arms (RV1805). The Anthropic adapter published the whole segment set (`wireRequests = { count, responseIds }`) only on the successful terminal finish, so an error after absorbed continuations, a `create()` failure, a truncated read, the continuation cap, or a pre-wire segment denial, yielded bare and orphaned exactly the paid wires a per-request statement join needs most (the segments' usage already survives through mid-stream reports; the ids and the count did not). Every error arm now rides the COMPLETED absorbed segments' wire set on its error data, the agent loop's provider call record reads it when the finish that would have named the set never came (a single absorbed segment included, since an errored dispatch has no plain responseId to join by), the invoice row keeps the ids and the count, and a first-segment failure stays a bare error with nothing invented.
