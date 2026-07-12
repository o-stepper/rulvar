[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/testing

# @rulvar/testing

## Classes

| Class | Description |
| ------ | ------ |
| [FakeAdapter](/api/@rulvar/testing/classes/FakeAdapter.md) | @rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for fast, fully typed, zero-network unit tests through the real engine. Matchers live at '@rulvar/testing/matchers'. VCR cassettes and replay-strict arrive with M5/M2. |
| [VcrMissError](/api/@rulvar/testing/classes/VcrMissError.md) | Typed hermetic-miss error; onMiss: 'throw' raises it on any unrecorded request. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CassetteFixture](/api/@rulvar/testing/interfaces/CassetteFixture.md) | One cassette fixture file: id, provenance note, and the journal. |
| [CreateTestEngineOptions](/api/@rulvar/testing/interfaces/CreateTestEngineOptions.md) | - |
| [FakeAdapterOptions](/api/@rulvar/testing/interfaces/FakeAdapterOptions.md) | - |
| [FakeCall](/api/@rulvar/testing/interfaces/FakeCall.md) | What a responder sees about the call. |
| [FakeToolCallsValue](/api/@rulvar/testing/interfaces/FakeToolCallsValue.md) | Marker value: the model answers this turn with tool calls (M3). |
| [FakeWireErrorValue](/api/@rulvar/testing/interfaces/FakeWireErrorValue.md) | Marker value: the stream terminates with this typed wire error (M3). |
| [ReplayRunOptions](/api/@rulvar/testing/interfaces/ReplayRunOptions.md) | - |
| [TestEngine](/api/@rulvar/testing/interfaces/TestEngine.md) | - |
| [TestRunHandle](/api/@rulvar/testing/interfaces/TestRunHandle.md) | A RunHandle that records its own event stream for the matchers. |
| [VcrCassette](/api/@rulvar/testing/interfaces/VcrCassette.md) | - |
| [VcrRow](/api/@rulvar/testing/interfaces/VcrRow.md) | One recorded exchange; a cassette is one JSON header line plus rows. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [FakeResponder](/api/@rulvar/testing/type-aliases/FakeResponder.md) | A static string (plain text output), a static value (structured output), or a function of the call. Thrown errors become terminal error events. fakeToolCalls() and fakeWireError() values script tool-calling turns and typed wire failures (M3). |
| [RedactFn](/api/@rulvar/testing/type-aliases/RedactFn.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [FAKE\_MODEL](/api/@rulvar/testing/variables/FAKE_MODEL.md) | @rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for fast, fully typed, zero-network unit tests through the real engine. Matchers live at '@rulvar/testing/matchers'. VCR cassettes and replay-strict arrive with M5/M2. |
| [FAKE\_MODEL\_REF](/api/@rulvar/testing/variables/FAKE_MODEL_REF.md) | @rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for fast, fully typed, zero-network unit tests through the real engine. Matchers live at '@rulvar/testing/matchers'. VCR cassettes and replay-strict arrive with M5/M2. |
| [M6\_ORCH\_GOAL](/api/@rulvar/testing/variables/M6_ORCH_GOAL.md) | - |
| [M6\_ORCH\_PROFILES](/api/@rulvar/testing/variables/M6_ORCH_PROFILES.md) | - |
| [M6\_ORCH\_RUN\_ID](/api/@rulvar/testing/variables/M6_ORCH_RUN_ID.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [buildFrozenV1JournalRaw](/api/@rulvar/testing/functions/buildFrozenV1JournalRaw.md) | The frozen v1 journal: a round-1 JSONL file with kinds agent, step, rand, external, approval and the legacy `v: 1` field (no hashVersion member). Returned as raw JSON-ready objects, one per line. |
| [buildM2CassetteFixtures](/api/@rulvar/testing/functions/buildM2CassetteFixtures.md) | - |
| [buildV2GoldenIdentity](/api/@rulvar/testing/functions/buildV2GoldenIdentity.md) | v2 golden identity fixtures: worked examples per spawn kind (M2-T12). The keys freeze the hashVersion 2 profile; the v1 members freeze the effort-insensitive projection and the incomparable domain. |
| [createTestEngine](/api/@rulvar/testing/functions/createTestEngine.md) | - |
| [defaultRedact](/api/@rulvar/testing/functions/defaultRedact.md) | Built-in redaction: authorization material never reaches cassette bytes. Deliberately aggressive; compose a custom hook for payload-specific secrets. |
| [fakeToolCalls](/api/@rulvar/testing/functions/fakeToolCalls.md) | Scripts a tool-calling turn from a responder. |
| [fakeWireError](/api/@rulvar/testing/functions/fakeWireError.md) | Scripts a typed wire failure (e.g. a retryable rate limit). |
| [handlesInRequest](/api/@rulvar/testing/functions/handlesInRequest.md) | Extracts spawn handles from the tool results the model saw. |
| [normalizeM6Entries](/api/@rulvar/testing/functions/normalizeM6Entries.md) | Fixes wall clock and spans; everything else is deterministic already. |
| [readCassette](/api/@rulvar/testing/functions/readCassette.md) | Parses a cassette file (one header line plus one JSON row per line). |
| [record](/api/@rulvar/testing/functions/record.md) | Wraps live adapters for recording: every completed stream appends one redacted row to the cassette JSONL. The wrapped adapters are drop-in: same ids, providers, caps, and event streams. |
| [recordLiveCassettes](/api/@rulvar/testing/functions/recordLiveCassettes.md) | - |
| [recordOrchestratorCrash](/api/@rulvar/testing/functions/recordOrchestratorCrash.md) | Phase 1: record the pre-crash journal. The transcripts store carries the boundary checkpoint the resume restores from; the recorder keeps it in memory because the cassette pins only journal bytes (checkpoint blobs are engine-internal at-least-once state). |
| [replay](/api/@rulvar/testing/functions/replay.md) | Builds replay adapters from a cassette. `onMiss: 'throw'` is the hermetic CI mode; `'passthrough'` forwards unrecorded requests to the matching live adapter in `adapters` (a development convenience only). |
| [replayRun](/api/@rulvar/testing/functions/replayRun.md) | - |
| [requestHash](/api/@rulvar/testing/functions/requestHash.md) | The cassette key: a hash of the canonical wire-contract request. The engine-populated telemetry namespace is excluded (never identity); everything else the adapter would send keys the row. |
