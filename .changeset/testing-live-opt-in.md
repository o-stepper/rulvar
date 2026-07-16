---
'@rulvar/testing': minor
---

Add the live-test opt-in gate and the bounded live smoke. `liveTestEnabled(...keys)` is true only when `RULVAR_LIVE_TESTS=1` AND every named environment key is present, so a provider key alone never triggers a paid call from an ordinary test run. `runLiveSmoke(adapter, req, options?)` drains one adapter stream per attempt and classifies the terminal event: `finish` passes, a typed retryable error (429 rate limit, 529 overload, transport) retries with linear backoff up to the attempt bound, a non-retryable error fails immediately with the typed `WireError` intact, a stream without any terminal event is reported as the adapter-contract violation it is, and a thrown stream propagates unchanged. Rulvar's own key-gated live suites (Anthropic, OpenAI, ai-sdk bridge, the umbrella example) now require the explicit opt-in and run via the documented `pnpm test:live` command, which reports which suites will fire and never prints key values.
