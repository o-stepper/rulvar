---
'@rulvar/core': minor
---

The host rejection becomes legible at the span level (RV3702, the third comparison experiment's arc). The third comparison run's reader saw the repair round's composition span end `cancelled` with both wires fine and had nothing to name the layer split. The finish contract's final rejection now aborts with the exported `FINISH_REJECTION_ABORT_REASON`, and the settle layer stamps `hostRejected: true` onto the terminal agent entry (a policy field, replay carries it) and the live `agent:end` event; a defective throwing validator aborts with its own distinct reason and never stamps, because a host defect is not a verdict on the candidate. Both surfaces of the critical path cut count the stamps as `hostRejectedSpans` (unconditional, zero when none), and the invocation table's rows carry the flag, so a reader can tell a document refused by host validation from a provider failure without a journal dig.
