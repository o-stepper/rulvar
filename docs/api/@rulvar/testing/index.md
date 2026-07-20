[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/testing

# @rulvar/testing

The Rulvar test harness: `createTestEngine` and the deterministic
`FakeAdapter` for fast typed unit tests, VCR cassettes with secret
redaction, replay-strict runs that fail on any unexpected live call, and
matchers for Vitest and Jest. Also exports `record`, `replay`, and
`replayRun`.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add -D @rulvar/testing
```

## Documentation

- [Testing](https://docs.rulvar.com/guide/testing)
- [API reference](https://docs.rulvar.com/api/%40rulvar/testing/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Classes

| Class | Description |
| ------ | ------ |
| [FakeAdapter](/api/@rulvar/testing/classes/FakeAdapter.md) | @rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for fast, fully typed, zero-network unit tests through the real engine. Matchers live at '@rulvar/testing/matchers'. VCR cassettes and replay-strict arrive with M5/M2. |
| [VcrMissError](/api/@rulvar/testing/classes/VcrMissError.md) | Typed hermetic-miss error; onMiss: 'throw' raises it on any request without a servable row. `recordedOccurrences` above zero means the hash WAS recorded but every occurrence is already consumed (replay serves each recorded exchange once, in recorded order); absent or zero means the request was never recorded at all (v1.29.0 review P2). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CreateTestEngineOptions](/api/@rulvar/testing/interfaces/CreateTestEngineOptions.md) | - |
| [FakeAdapterOptions](/api/@rulvar/testing/interfaces/FakeAdapterOptions.md) | - |
| [FakeCall](/api/@rulvar/testing/interfaces/FakeCall.md) | What a responder sees about the call. |
| [FakeToolCallsValue](/api/@rulvar/testing/interfaces/FakeToolCallsValue.md) | Marker value: the model answers this turn with tool calls (M3). |
| [FakeWireErrorValue](/api/@rulvar/testing/interfaces/FakeWireErrorValue.md) | Marker value: the stream terminates with this typed wire error (M3). |
| [ReplayRunOptions](/api/@rulvar/testing/interfaces/ReplayRunOptions.md) | - |
| [RunLiveSmokeOptions](/api/@rulvar/testing/interfaces/RunLiveSmokeOptions.md) | - |
| [TestEngine](/api/@rulvar/testing/interfaces/TestEngine.md) | - |
| [TestRunHandle](/api/@rulvar/testing/interfaces/TestRunHandle.md) | A RunHandle that records its own event stream for the matchers. |
| [VcrCassette](/api/@rulvar/testing/interfaces/VcrCassette.md) | - |
| [VcrHeader](/api/@rulvar/testing/interfaces/VcrHeader.md) | The first line of every cassette file: format and hash provenance. |
| [VcrRow](/api/@rulvar/testing/interfaces/VcrRow.md) | One recorded exchange; a cassette is one JSON header line plus rows. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [FakeResponder](/api/@rulvar/testing/type-aliases/FakeResponder.md) | A static string (plain text output), a static value (structured output), or a function of the call. Thrown errors become terminal error events. fakeToolCalls() and fakeWireError() values script tool-calling turns and typed wire failures (M3). |
| [LiveSmokeOutcome](/api/@rulvar/testing/type-aliases/LiveSmokeOutcome.md) | The classified result of a bounded live smoke. `attempts` is how many streams were actually opened; only `'exhausted'` reaches the configured bound. |
| [RedactFn](/api/@rulvar/testing/type-aliases/RedactFn.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_LIVE\_SMOKE\_ATTEMPTS](/api/@rulvar/testing/variables/DEFAULT_LIVE_SMOKE_ATTEMPTS.md) | Default total `runLiveSmoke` attempts including the first. |
| [FAKE\_MODEL](/api/@rulvar/testing/variables/FAKE_MODEL.md) | @rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for fast, fully typed, zero-network unit tests through the real engine. Matchers live at '@rulvar/testing/matchers'. VCR cassettes and replay-strict arrive with M5/M2. |
| [FAKE\_MODEL\_REF](/api/@rulvar/testing/variables/FAKE_MODEL_REF.md) | @rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for fast, fully typed, zero-network unit tests through the real engine. Matchers live at '@rulvar/testing/matchers'. VCR cassettes and replay-strict arrive with M5/M2. |
| [MAX\_LIVE\_SMOKE\_ATTEMPTS](/api/@rulvar/testing/variables/MAX_LIVE_SMOKE_ATTEMPTS.md) | Hard ceiling on `runLiveSmoke` attempts. The helper's whole contract is a bounded spend, so it refuses configurations that are not. |
| [MAX\_LIVE\_SMOKE\_DELAY\_MS](/api/@rulvar/testing/variables/MAX_LIVE_SMOKE_DELAY_MS.md) | Hard ceiling on every scheduled backoff: Node's maximum timer delay (2^31 - 1 ms). Anything above it would not sleep longer, it would be clamped to 1 ms with a TimeoutOverflowWarning, so both `baseDelayMs` and the largest scheduled delay, `baseDelayMs * (attempts - 1)`, are validated against this bound before any stream opens. |

## Functions

| Function | Description |
| ------ | ------ |
| [createTestEngine](/api/@rulvar/testing/functions/createTestEngine.md) | - |
| [defaultRedact](/api/@rulvar/testing/functions/defaultRedact.md) | Built-in redaction: authorization material never reaches cassette bytes. Deliberately aggressive; compose a custom hook for payload-specific secrets. |
| [fakeToolCalls](/api/@rulvar/testing/functions/fakeToolCalls.md) | Scripts a tool-calling turn from a responder. |
| [fakeWireError](/api/@rulvar/testing/functions/fakeWireError.md) | Scripts a typed wire failure (e.g. a retryable rate limit). |
| [liveTestEnabled](/api/@rulvar/testing/functions/liveTestEnabled.md) | True only when `RULVAR_LIVE_TESTS` is exactly `'1'` AND every named environment key is set to a non-empty value. Gate live tests as `it.skipIf(!liveTestEnabled('ANTHROPIC_API_KEY'))(...)` so an unrelated key in the shell never triggers a paid provider call from an ordinary test run. |
| [readCassette](/api/@rulvar/testing/functions/readCassette.md) | Parses a cassette file (one header line plus one JSON row per line). The header must declare cassette format `v: 1`: the format version gates parsing itself, while hashVersion (whose support window is checked by replay) only gates request identity and never substitutes for it, so a future incompatible format refuses loudly instead of being read as v1. Every documented header field (kind, v, an integer hashVersion, a date string recordedAt) and row field (adapterId, model, requestHash, request, caps, events, an optional string provider, an optional nonempty usageSemantics, an optional nonnegative integer occurrence) is checked here, and the nested structures are validated in depth (v1.30.0 review P3): the request must be a plain object, every event must be a member of the canonical ChatEvent vocabulary with its required payload and Usage numeric invariants, and caps must carry every ModelCaps field (with the optional pricing table checked when present). Unknown extra FIELDS are tolerated for forward compatibility. Event stream SEMANTICS (one trailing terminal per row) and adapter consistency across rows (provider, usageSemantics, caps agreement) are deliberately not checked at read time; `replay` enforces them before serving anything (v1.29.0 review P3), so reading never blocks inspecting a well formed file. Parse and shape failures throw a typed ConfigError naming the cassette path and line (v1.28.0 review P3). |
| [record](/api/@rulvar/testing/functions/record.md) | Wraps live adapters for recording: every stream that completes with exactly one terminal event (finish or error) appends one redacted row to the cassette JSONL. A stream that ends without a terminal (a requested abort or a truncated read), throws, or violates the adapter contract (a second terminal, data after the terminal) appends nothing, so a cassette row is always the record of one completed exchange (v1.28.0 review P2). Every call also claims a per `(adapterId, requestHash)` occurrence number synchronously in the `stream()` call itself and persists it on the completed row, so replay can restore the caller to response association even when concurrent identical calls completed out of order (v1.31.0 review P2). A later `record()` call on the same cassette file is an appending session: the existing file is read and validated first (a target that was never a cassette, a header whose hashVersion is not the one this build records under, and a file whose occurrence numbering is already ambiguous all refuse with a typed ConfigError), and every hash counter is seeded past the numbers already on disk, so the numbering continues where the file left off instead of restarting at zero (v1.32.0 review P2). One recorder session may be active on a cassette at a time: two concurrently constructed recorders seed identically and claim colliding numbers, which replay refuses as ambiguous instead of silently serving either order. The wrapped adapters are drop-in: same ids, providers, caps, and event streams. |
| [replay](/api/@rulvar/testing/functions/replay.md) | Builds replay adapters from a cassette. `onMiss: 'throw'` is the hermetic CI mode; `'passthrough'` forwards unrecorded requests to the matching live adapter in `adapters` (a development convenience only). |
| [replayRun](/api/@rulvar/testing/functions/replayRun.md) | - |
| [requestHash](/api/@rulvar/testing/functions/requestHash.md) | The cassette key: a hash of the canonical wire-contract request. The engine-populated telemetry namespace is excluded (never identity); everything else the adapter would send keys the row. |
| [runLiveSmoke](/api/@rulvar/testing/functions/runLiveSmoke.md) | Drains `adapter.stream(req)` with a bounded retry policy and classifies the outcome instead of throwing: |
