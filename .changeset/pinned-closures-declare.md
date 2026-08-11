---
'@rulvar/core': minor
---

The config fingerprint (RV3210), the honest answer to `hashWorkflowBody`'s closure blindness the 2026-08-11 experiment confirmed: the body-text hash cannot see captured values, so two byte-identical bodies over different closures pin identically. `RunOptions.configFingerprint` (an opaque host string, at most 512 characters) records in RunMeta at genesis; `ResumeOptions.configFingerprint` asserts it back, and a mismatch refuses the resume typed BEFORE ownership, meta writes, or any append, with no posture knob, because supplying the fingerprint IS the assertion. One-sided states warn instead of failing (`RULVAR_RESUME_FINGERPRINT_UNCHECKED` for a recorded pin the resume ignores, `RULVAR_RESUME_FINGERPRINT_UNRECORDED` for an assertion the run never declared): absence means NOT RECORDED. Runs that declare nothing are byte identical, and the preferred pattern remains closing over nothing and passing config through args.
