---
'@rulvar/core': minor
'@rulvar/cli': minor
---

Terminal admission at an exhausted tool budget, the two harness-shape preflight findings, and the degradation mirror (the fifth comparison experiment).

The fifth experiment lost a complete 3984 word answer to terminal tool starvation: the harness set the synthesis tool cap to the child count, the mandatory `get_child_result` reads spent the whole budget, and the ready `finish` was cut BEFORE the terminal interception, so the validators never ran, the funded repair reserve never armed, and the run failed closed with the candidate stranded in the transcript.

- The terminal tool is now exempt from the tool budget in both directions: it never consumed `maxToolCalls` or `toolUnits` below the cap, and an exhausted budget no longer starves it either. An admitted finish validates and, on rejection, feeds the repair grants exactly as below the cap; non-terminal calls beside it are answered with typed skipped results so the continued exchange keeps a well formed history; a batch with only non-terminal calls past the cap settles `limit` byte identically to before.
- New preflight warning `synthesis-terminal-tool-headroom`: `synthesis.exposeChildResultTools` with a `synthesis.limits.maxToolCalls` below one read per possible child (`orchestrator.maxSpawns`) loses evidence access to the reads themselves.
- New preflight warning `draft-gate-below-contract`: a `draftPolicy.minWords` below the contract's own word minimum admits drafts the final validators must reject, so the paid synthesis starts from an underlength base. The preflight input mirrors `finishValidation.draftPolicy` for it.
- The completion lift now mirrors the degradation facts the acceptance envelope already emits: `degradedReasons`, `salvagedPartialChildren`, and `salvagedTerminalOutputChildren` ride `run:end` and the `RunOutcome` under the same shape validation as `completion` and `childStatusCounts`, and the OTel exporter maps them to `rulvar.run.*` attributes. An empty array is the workflow's claim of zero degradation; absence means no claim.
