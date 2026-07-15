---
'@rulvar/core': patch
---

An agent configured with a required terminal tool (the dynamic orchestrator's `finish`) no longer settles ok on a turn that ends without any tool call. Such a turn, including one cut by the output token bound before any call, now consumes the no progress budget and re prompts the model toward the tool, so `orchestrate()` returns ok only after a validated `finish({ result })` was intercepted; a model that never complies terminates as a bounded typed `limit`, never as ok with unproven output. The forced finish exhaustion path keeps synthesizing its documented partial. Ordinary `ctx.agent` calls without a terminal tool are unchanged.
