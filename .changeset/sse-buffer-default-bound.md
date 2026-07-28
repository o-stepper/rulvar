---
'@rulvar/cli': minor
---

The SSE replay buffer of `createServer` is finite by default (RV409): an absent `maxBufferedEventsPerRun` now resolves to the exported `DEFAULT_MAX_BUFFERED_EVENTS_PER_RUN` (50,000 events per run) instead of unbounded, with the already established drop semantics past the bound (oldest events dropped in chunks, the retained window never below seven eighths of the bound, replays carrying `x-rulvar-events-dropped` and a leading SSE comment naming the first retained seq; the journal remains the durable record). Migration: a deployment that relied on the historical unbounded buffer sets an explicit huge bound, for example `Number.MAX_SAFE_INTEGER`; nothing changes for servers that already configured the option, and the option's domain (a positive safe integer, typed `ConfigError` otherwise) is unchanged.
