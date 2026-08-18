---
'@rulvar/core': minor
---

The wire capacity of a plan has one exported source (RV4005, the fifth comparison experiment). The run's own terminal answer modeled this runtime's repair round as one extra wire (34 to 35) and multiplied retry share by `1 + r`, losing the decisive correctness point to arithmetic the codebase already states: a triggered round is TWO wires past the plan (its composition PLUS the rejudge, RV3307) and `r` retries over a base of `B` wires multiply totals by `1 + r/B`. `wireCapacityEstimate` prices a declared plan (child, coordination, synthesis, judge, extract wires) into `{ baseWires, repairRoundDeltaWires: 2, mechanicalRepairDeltaWires: 1, wiresWithRound, roundOverheadShare }`, and `retryWireMultiplier` is the retry share formula; golden tests pin the healthy 34/36/5.88-percent example. The budgets guide gains the worked example and two REQUIRED doctrine pins hold the two-invoice round cost and the retry formula on their pages.
