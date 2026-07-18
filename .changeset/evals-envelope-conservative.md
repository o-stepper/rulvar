---
'@rulvar/evals': minor
---

`SpendEnvelope` is now provably conservative at the representation boundary. Nearest rounding on both the cap and the debits let any positive ceiling below $0.0000005 round to a zero debit, admitting an unbounded number of authorizations past `maxTotalUsd`. Accounting stays integer micro-USD, but the cap now converts down (floor), every debit converts up (ceil, minimum one micro-USD), and a `maxTotalUsd` below $0.000001 is rejected as a `ConfigError`, so for any admitted sequence the sum of the original ceilings can never exceed `maxTotalUsd` and no positive ceiling ever debits zero. Amounts that are integer micro-USD up to float noise stay exact (0.1 + 0.2 against 0.3 remains a fit). Migration: an envelope constructed with a sub-micro cap now throws instead of admitting everything, and sub-micro ceilings now consume a full micro-USD each.
