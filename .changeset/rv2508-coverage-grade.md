---
'@rulvar/core': minor
'@rulvar/cli': minor
---

The claim-coverage grade sees a declined judge and a zero denominator (RV2508). `claimCoverageOf` never read `judgeDeclined`, the RV2106 degradation where the claim judge is refused ADMISSION and never dispatched, so a pass that judged nothing was graded by the counts of a pass that did not happen; over a draft carrying no citing sentence it graded `'full'`, the strongest word in the vocabulary. The vacuous `'full'` at a zero denominator was the same failure at its extreme: RV1702 exists to stop a consumer inferring semantic health from emptiness, and an empty set graded stronger than a bounded subset.

`ClaimCoverageGrade` gains two words. `'judge-declined'` ranks with `'judge-failed'` and above everything the counts could say, below it only because a failure at least had an invocation to fail and the two causes are worth telling apart. `'vacuous'` sits below `'partial'`: no subset was chosen because there was no set. `ClaimCoverageInput` gains `judgeDeclined?: true`; the orchestrator already spreads that flag into the meta it grades, so no call site changes and every existing meta grades the same unless it carried one of the two states. The CLI's `--strict` exits nonzero on `'judge-declined'` exactly as on `'judge-failed'` (nothing was judged either way) and prints `'vacuous'` to stderr while keeping the exit, because citing nothing breaks no contract the pass declares.

Consumers with an exhaustive `switch` over `ClaimCoverageGrade` will see a type error until they handle the two new members. That is the intended shape of the change: both states existed before and were silently folded into words that did not describe them.
