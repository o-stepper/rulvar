---
'@rulvar/core': patch
---

A capped orchestrator dispatches its own agent with estCost equal to its effectiveCap, and the forced-finish agent with the finalize reserve (docs/07 section 12.2 as amended): layer 2 makes those the true admission worst cases. Without the hints the default reserve priced the model's full maxOutputTokens (about one dollar on strong tiers) and the commitment rode the whole ancestor chain for the orchestrator's lifetime, so small run ceilings sat at zero admission remainder and every child spawn died with a budget rejection. Found live by the M12 checkpoint: no orchestrated child was ever admitted under the case ceilings, and both A/B arms measured a self-solving orchestrator instead of agentType selection.
