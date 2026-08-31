---
'@rulvar/core': patch
'@rulvar/cli': patch
---

The host surface hardens on two seams (RV4803, RV4805). The price table is now
SNAPSHOTTED at `createEngine`: pricing resolution used to read the caller's live
object on every debit, so a host mutating its table mid-run silently changed
what wires cost after the strict gates had judged the original; the clone severs
the alias (a rates update is a new engine with a bumped `pricingVersion`), and a
table the structured clone cannot take refuses typed at construction. The HTTP
shell's `POST /runs` body gains the regulated posture subset of `RunOptions`
(`budgetPolicy`, `maxInFlightExposureUsd`, `configFingerprint`, `scope`,
`scopePolicy`), so a remote caller can start a run under the immutable lifetime
ceiling and the bounded execution scope; authentication, price tables, adapters,
stores, and secrets stay with the host process by doctrine and never enter the
body.
