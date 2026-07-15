---
'@rulvar/anthropic': minor
'@rulvar/openai': minor
---

Make the first-class adapters genuinely streaming: every canonical event is yielded AS its provider event is consumed.

Both adapters (and `openaiCompatible`) buffered the complete canonical event stream in an internal array and yielded it only after the provider response finished. Consequences fixed by this change: `agent:stream` was never live; the stream-idle watchdog saw zero events during healthy generation, so any turn longer than `streamIdleTimeoutMs` (default 120s) was falsely severed as idle and retried; a budget or external abort lost ALL partial usage (the journal recorded zero for tokens the provider billed); and every delta of a long response was retained in memory.

- `mapAnthropicStream`, `mapResponsesStream`, and `mapChatCompletionsStream` are now async generators: they yield each `ChatEvent` as the corresponding provider event is consumed, with the consumer's pull as the only pacing (natural backpressure, no queue, no detached work). The Anthropic mapper's return value carries the accumulated `pause_turn` state; `TurnMapping` no longer has the redundant `events` array field. Callers of the old callback signatures (`emit` parameter) must switch to iterating the generator.
- Adapter behavior is preserved: canonical id mapping, thinking/reasoning retention, `pause_turn` continuation and its cap (each segment now streams live before the continuation dispatches), tool argument assembly, typed refusals and errors, exactly one canonical terminal event, the degraded Chat Completions path (visible in `providerMetadata.openai.degradedPath`), abort propagation, usage normalization, and SDK autoretries disabled.
- New regression tests with gated fake SDK clients prove the first `stream().next()` resolves before the provider terminal exists, aborts reach the in-flight provider iterable after the first delta, a paused consumer causes zero read-ahead (lock-step pulls), `pause_turn` segment deltas arrive before the continuation request, and exactly one terminal event survives.
