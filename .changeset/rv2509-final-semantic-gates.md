---
'@rulvar/core': minor
---

The semantic gate reaches the FINAL artifact, and every verdict names the document it read (RV2509). The claim-consistency pass runs strictly before the synthesis by design, so that a draft contradicting its own pool never pays for a composition. The cost of that ordering was never stated: the verdict describes the DRAFT, the synthesis then rewrites it, and the terminal reported the cleared verdict beside the replaced document with nothing to tell them apart. The twenty-fifth comparison run's judge cleared a draft its synthesis replaced three times over.

`OrchestrateClaimConsistencyMeta` gains `judgedStage` (`'draft'` or `'final'`) and `judgedHash`, stamped at the one assembly every exit path of the pass passes through, so a `coverage: 'full'` can never be read as a claim about the shipped artifact when it was rendered over a draft that no longer exists. The acceptance envelope gains `draftToFinal` (`draftHash`, `finalHash`, `rewritten`, and `claimsJudgedOn`) whenever a synthesis is configured: `claimConsistencyMeta.judgedHash === draftToFinal.finalHash` is the machine test for "this verdict is about the document I received", and it works under the DEFAULT setting, where the answer is usually no.

`claimConsistency.stage` moves or duplicates the gate. `'draft'` is the default and is byte identical to the historical behavior. `'final'` runs the pass after the synthesis over the artifact the run settles on, so an armed `onFound: 'fail'` stops a run whose composition contradicts the pool it was composed from. `'both'` keeps the cheap pre-synthesis gate and adds a second judge over the final; the terminal then reports the final pass in `claimConsistencyMeta`, because the shipped document is what a consumer gates on, and the earlier verdict in the new `claimConsistencyDraftMeta`. A stage past `'draft'` without a synthesis is a `ConfigError`, since there the draft IS the final.

The two invocations of `'both'` stay separable: the final judge carries its own telemetry label and a declined admission journals under its own key, so one run can honestly record two different degradations instead of the second reusing the first's arithmetic.
