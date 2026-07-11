---
'@rulvar/core': minor
---

M10-T02: the editorial claim path, validated (docs/05, sections "Data model", "The human gate", "Grounding and decay"). The runtime enforcement the T01 types promise:

- A gated op without the attribution attestation is now a RUNTIME error at commit, not only a type error: the human gate requires a non-empty ruledOut checklist over the docs/05 vocabulary, and the eval-confirmed gate rejects as reserved for v2.
- The editorial path is the only committable path in phase 1: eval-measured claims and the metrics block reject until the M11 eval-committer identity ships (the validators already model the identity flag M11 will pass).
- The active-claims cap holds at commit: 8 per (model, taskClass) by default (docs/06, Appendix A), configurable per store; supersede chains keep only the head active, so a supersede never grows the count.
- Statement bounds (200 chars), mandatory evidence and taskClass, date coherence, and the asymmetric TTL table land as pure helpers: `claimExpiry` (eval 90/30, editorial 120/45 days by polarity) and `claimExpired` for the read-path filters of M10-T03.
