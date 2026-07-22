---
'@rulvar/core': minor
'@rulvar/cli': minor
---

Fence the offline resolution append and surface approximate usage (v1.39.0 review)

The CLI server's offline resolution path acquired a store lease but never
threaded it into the Replayer, so the resolution append ran unfenced: if the
process stalled past its lease ttl and a queue worker took the run over, the
stale append could land alongside the new owner's writes. The append now
carries the acquired lease, so a superseded owner is rejected with
LeaseHeldError (HTTP 409) instead of racing the current owner.

Approximate usage is now visible where the run is reported. usageApprox rides
the agent:end and run:end events and the CostReport, and the CLI cost line
marks an estimated total, so a total that includes usage estimated after a
transport cut, a ceiling that severed a stream, or an abort is never shown as
though it were the exact provider charge. The field is present only when true,
so every exact usage report and event is byte for byte unchanged.
