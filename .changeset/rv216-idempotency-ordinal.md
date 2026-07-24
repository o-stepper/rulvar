---
'@rulvar/core': patch
---

Bind the isolated-executor idempotency key to the logical invocation, not just the arguments (v1.59.x review P0.4). The key was `sha256(runId, tool, args)`, so two intentionally separate out-of-process tool calls in one run with byte-identical arguments received the same key, and an external system deduplicating on it would silently drop the second intended effect. The key now folds in the containing agent entry's journal seq and the call's ordinal within that agent's tool loop; both are journal- and checkpoint-stable, so distinct calls (different ordinals, or different agents) never collide, while an at-least-once crash-resume of the same logical call reuses the same agent entry and the restored ordinal and therefore the same key. `deriveExecIdempotencyKey` and the internal `ToolRuntime.executeExternal` gain the invocation parameters; the key never enters run identity (no content key or toolset hash), so journals stay byte-identical.
