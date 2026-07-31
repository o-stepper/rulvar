---
'@rulvar/cli': minor
---

The terminal envelope conformance table (RV1106): every terminal path (ok, error, exhausted, cancelled, superseded) drives the real engine, and the envelope is checked fact for fact across the resolved outcome, the run:end event, the HTTP run status body, the SSE replay, and the OTel run span, in one truth table with the surface honesty rules pinned. The red-first fix the table found: `toOtel` now completes its export over every terminal path, the rejecting ones included; a rejecting `result` never fails an export the stream already completed, it only marks a leftover span with the refusal instead of green.
