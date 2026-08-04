---
'@rulvar/core': minor
---

Split the critical-path synthesize wall by purpose (RV1604). The claim-consistency judge dispatches under role 'synthesize', so `reduceCriticalPath` folded its wall into `synthesisMs` and one number conflated two different tails: the eighteenth comparison benchmark's harness had to annotate a 54-second `synthesisMs` by hand because the run had skipped synthesis (`synthesis_skipped_by_valid_draft`) and the bucket was entirely the judge and its extract phase. `CriticalPath` (and the clipped `postFanIn` breakdown) now carry `finalCompositionMs` (synthesize spans that are not the judge) and `semanticJudgeMs` (spans dispatched under the exported `CLAIM_JUDGE_LABEL`, which the orchestrator's judge invocation now uses as its label constant); `synthesisMs` stays their exact sum, so existing consumers read the same number they always did.
