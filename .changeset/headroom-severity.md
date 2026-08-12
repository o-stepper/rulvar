---
'@rulvar/core': minor
---

The ceiling headroom floor can block (RV3310). RV3208's `ceiling-headroom-thin` finding was always a warning, and the 2026-08-12 comparison harness threw on error findings only: its declared 2 percent floor held against a 2.857 percent plan and the class nobody gated on never spoke. `orchestrator.ceilingHeadroomSeverity: 'error'` makes a breached floor blocking for exactly such hosts; the default 'warning' keeps RV3208 byte for byte, and the literal fails closed at intake. The orchestration guide gains the assurance posture section: the polarity flip (`stage: 'final'`, `onFound: 'fail'`, `coverageTarget` with `onLowCoverage: 'fail'`, declared criticals, run facts, a 10 percent headroom floor at error severity) for runs whose output a consumer acts on, beside what the terminal then proves.
