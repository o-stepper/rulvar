---
'@rulvar/core': patch
---

A resumed dynamic orchestration now honors the documented mode (c) contract after a budget cancelled root. Recovery is orchestration scoped instead of attempt scoped: journaled spawn decisions recover across root attempts (they live at the orchestrate call's own stable scope), recovered children re dispatch pinned to their journaled child scope so settled ones replay by content key for free and only dangling ones rerun, prior attempt handles alias to the recovered records so a restored transcript's await and cancel calls keep working, and the rerun root boots from the cancelled attempt's last turn boundary checkpoint instead of re planning from scratch. A regenerated turn that diverges from a lost one decides fresh (the recovered verdict binds only when the incoming spec matches the journaled one). Previously the rerun derived its recovery scope from the new dispatch seq, saw nothing, re decided every spawn, and re paid completed children.
